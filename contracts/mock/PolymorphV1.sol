// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "../mainnet/IPolymorphRoot.sol";
import "../base/Polymorph.sol";
import "../base/PolymorphWithGeneChanger.sol";

contract PolymorphV1 is PolymorphWithGeneChanger, IPolymorphRoot {
    using PolymorphGeneGenerator for PolymorphGeneGenerator.Gene;

    struct Params {
        string name;
        string symbol;
        string baseURI;
        address payable _daoAddress;
        uint256 premintedTokensCount;
        uint256 _baseGenomeChangePrice;
        uint256 _polymorphPrice;
        uint256 _maxSupply;
        uint256 _randomizeGenomePrice;
        uint256 _bulkBuyLimit;
        string _arweaveAssetsJSON;
        address _polymorphV1Address;
    }

    uint256 public polymorphPrice;
    uint256 public maxSupply;
    uint256 public bulkBuyLimit;

    Polymorph public polymorphV1Contract;
    uint256 public totalBurnedV1;

    event PolymorphPriceChanged(uint256 newPolymorphPrice);
    event MaxSupplyChanged(uint256 newMaxSupply);
    event BulkBuyLimitChanged(uint256 newBulkBuyLimit);

    constructor(Params memory params)
        PolymorphWithGeneChanger(
            params.name,
            params.symbol,
            params.baseURI,
            params._daoAddress,
            params._baseGenomeChangePrice,
            params._randomizeGenomePrice,
            params._arweaveAssetsJSON
        )
    {
        polymorphPrice = params._polymorphPrice;
        maxSupply = params._maxSupply;

        bulkBuyLimit = params._bulkBuyLimit;

        arweaveAssetsJSON = params._arweaveAssetsJSON;
        polymorphV1Contract = Polymorph(params._polymorphV1Address);
        geneGenerator.random();

        _preMint(params.premintedTokensCount);
    }

    function _preMint(uint256 amountToMint) internal {
        for (uint256 i = 0; i < amountToMint; i++) {
            _tokenId += 1;
            _genes[_tokenId] = geneGenerator.random();
            _mint(_msgSender(), _tokenId);
        }
    }

    function mint() public payable override nonReentrant {
        require(_tokenId < maxSupply, "Total supply reached");

        _tokenId += 1;

        _genes[_tokenId] = geneGenerator.random();

        (bool transferToDaoStatus, ) = daoAddress.call{value: polymorphPrice}(
            ""
        );
        require(
            transferToDaoStatus,
            "Address: unable to send value, recipient may have reverted"
        );

        uint256 excessAmount = msg.value - polymorphPrice;
        if (excessAmount > 0) {
            (bool returnExcessStatus, ) = _msgSender().call{
                value: excessAmount
            }("");
            require(returnExcessStatus, "Failed to return excess.");
        }

        _mint(_msgSender(), _tokenId);

        emit TokenMinted(_tokenId, _genes[_tokenId]);
        emit TokenMorphed(
            _tokenId,
            0,
            _genes[_tokenId],
            polymorphPrice,
            PolymorphEventType.MINT
        );
    }

    function bulkBuy(uint256 amount) public payable override nonReentrant {
        require(
            amount <= bulkBuyLimit,
            "Cannot bulk buy more than the preset limit"
        );
        require(
            _tokenId + amount <= maxSupply,
            "Total supply reached"
        );

        (bool transferToDaoStatus, ) = daoAddress.call{
            value: polymorphPrice * amount
        }("");
        require(
            transferToDaoStatus,
            "Address: unable to send value, recipient may have reverted"
        );

        uint256 excessAmount = msg.value - (polymorphPrice * amount);
        if (excessAmount > 0) {
            (bool returnExcessStatus, ) = _msgSender().call{
                value: excessAmount
            }("");
            require(returnExcessStatus, "Failed to return excess.");
        }

        for (uint256 i = 0; i < amount; i++) {
            _tokenId += 1;

            _genes[_tokenId] = geneGenerator.random();
            _mint(_msgSender(), _tokenId);

            emit TokenMinted(_tokenId, _genes[_tokenId]);
            emit TokenMorphed(
                _tokenId,
                0,
                _genes[_tokenId],
                polymorphPrice,
                PolymorphEventType.MINT
            );
        }
    }

    function mint(address to)
        public
        pure
        override(ERC721PresetMinterPauserAutoId)
    {
        revert("Should not use this one");
    }

    function setPolymorphPrice(uint256 newPolymorphPrice)
        public
        virtual
        override
        onlyDAO
    {
        polymorphPrice = newPolymorphPrice;

        emit PolymorphPriceChanged(newPolymorphPrice);
    }

    function setMaxSupply(uint256 _maxSupply) public virtual override onlyDAO {
        maxSupply = _maxSupply;

        emit MaxSupplyChanged(maxSupply);
    }

    function setBulkBuyLimit(uint256 _bulkBuyLimit)
        public
        virtual
        override
        onlyDAO
    {
        bulkBuyLimit = _bulkBuyLimit;

        emit BulkBuyLimitChanged(_bulkBuyLimit);
    }

    receive() external payable {
        mint();
    }
}