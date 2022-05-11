// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "./IPolymorphicFacesRoot.sol";
import "../base/Polymorph.sol";
import "../base/PolymorphicFacesWithGeneChanger.sol";
//Todo add EIP2981 Royalty Standard

//todo must read from polymorph V2 contract wallet address input should return an amount of V1 Polymorphs burned by that address
contract PolymorphicFacesRoot is PolymorphicFacesWithGeneChanger, IPolymorphicFacesRoot {
    using PolymorphicFacesGeneGenerator for PolymorphicFacesGeneGenerator.Gene;

    struct Params {
        string name;
        string symbol;
        string baseURI;
        address payable _daoAddress;
        uint256 premintedTokensCount;
        uint256 _baseGenomeChangePrice;
        uint256 _facesPrice;
        uint256 _maxSupply;
        uint256 _randomizeGenomePrice;
        uint256 _bulkBuyLimit;          //Todo Bulk Claim limit?
        string _arweaveAssetsJSON;
        address _polymorphV2Address;    //Todo change to v2
    }

    uint256 public facesPrice;
    uint256 public maxSupply;
    uint256 public bulkBuyLimit;

    Polymorph public polymorphV2Contract;   //To check Wallet burn amount
    uint256 public totalBurnedV1;

    // Where should TokenId start
    // uint16 constant private STARTING_TOKEN_ID = 10000;

    event FacesPriceChanged(uint256 newFacesPrice);
    event MaxSupplyChanged(uint256 newMaxSupply);
    event BulkBuyLimitChanged(uint256 newBulkBuyLimit);

    constructor(Params memory params)
        PolymorphicFacesWithGeneChanger(
            params.name,
            params.symbol,
            params.baseURI,
            params._daoAddress,
            params._baseGenomeChangePrice,
            params._randomizeGenomePrice,
            params._arweaveAssetsJSON
        )
    {
        facesPrice = params._facesPrice;
        maxSupply = params._maxSupply;
        bulkBuyLimit = params._bulkBuyLimit;
        arweaveAssetsJSON = params._arweaveAssetsJSON;
        polymorphV2Contract = Polymorph(params._polymorphV2Address);
        geneGenerator.random();
        
        // _tokenId = _tokenId + STARTING_TOKEN_ID;
        _preMint(params.premintedTokensCount);
    }

    //Todo is there a premint for this?
    function _preMint(uint256 amountToMint) internal {
        for (uint256 i = 0; i < amountToMint; i++) {
            _tokenId++;
            _genes[_tokenId] = geneGenerator.random();
            _mint(_msgSender(), _tokenId);
        }
    }

    function mint() public payable override nonReentrant {
        require(_tokenId < maxSupply, "Total supply reached");

        _tokenId++;

        _genes[_tokenId] = geneGenerator.random();

        (bool transferToDaoStatus, ) = daoAddress.call{value: facesPrice}(
            ""
        );
        require(
            transferToDaoStatus,
            "Address: unable to send value, recipient may have reverted"
        );

        uint256 excessAmount = msg.value - facesPrice;
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
            facesPrice,
            FacesEventType.MINT
        );
    }

    //todo Rewrite for Face claim based on how many V1 polymorphs burned
    function burnAndMintNewPolymorph(uint256[] calldata tokenIds) external nonReentrant {
        for(uint256 i = 0; i < tokenIds.length; i++) {
            uint256 currentIdToBurnAndMint = tokenIds[i];
            require(_msgSender() == polymorphV2Contract.ownerOf(currentIdToBurnAndMint));

            uint256 geneToTransfer = polymorphV2Contract.geneOf(currentIdToBurnAndMint);
            polymorphV2Contract.burn(currentIdToBurnAndMint);

            totalBurnedV1++;

            _genes[currentIdToBurnAndMint] = geneToTransfer;

            _mint(_msgSender(), currentIdToBurnAndMint);

            emit TokenMinted(currentIdToBurnAndMint, _genes[currentIdToBurnAndMint]);
            // emit TokenBurnedAndMinted(currentIdToBurnAndMint, _genes[currentIdToBurnAndMint]);
        }
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
            value: facesPrice * amount
        }("");
        require(
            transferToDaoStatus,
            "Address: unable to send value, recipient may have reverted"
        );

        uint256 excessAmount = msg.value - (facesPrice * amount);
        if (excessAmount > 0) {
            (bool returnExcessStatus, ) = _msgSender().call{
                value: excessAmount
            }("");
            require(returnExcessStatus, "Failed to return excess.");
        }

        for (uint256 i = 0; i < amount; i++) {
            _tokenId++;

            _genes[_tokenId] = geneGenerator.random();
            _mint(_msgSender(), _tokenId);

            emit TokenMinted(_tokenId, _genes[_tokenId]);
            emit TokenMorphed(
                _tokenId,
                0,
                _genes[_tokenId],
                facesPrice,
                FacesEventType.MINT
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

    
    function setFacesPrice(uint256 newFacesPrice)
        public
        virtual
        onlyDAO
    {
        facesPrice = newFacesPrice;

        emit FacesPriceChanged(newFacesPrice);
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
