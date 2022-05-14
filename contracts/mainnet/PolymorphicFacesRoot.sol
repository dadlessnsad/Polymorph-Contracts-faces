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
        uint256 _maxSupply;
        uint256 _randomizeGenomePrice;
        uint256 _bulkBuyLimit;
        string _arweaveAssetsJSON;
        address _polymorphV2Address;
    }

    uint256 public maxSupply;
    uint256 public bulkBuyLimit;

    Polymorph public polymorphV2Contract;   
    uint256 public totalBurnedV1;


    mapping(uint256 => bool) public isClaimed;  //Mapping to Track Users claim amount??
    //mapping(address => mapping(uint256 => bool)) userClaimed  ?

    event MaxSupplyChanged(uint256 newMaxSupply);
    event BulkBuyLimitChanged(uint256 newBulkBuyLimit);
    event PolyV2AddressChanged(address newPolyV2Address);

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
        maxSupply = params._maxSupply;
        bulkBuyLimit = params._bulkBuyLimit;
        arweaveAssetsJSON = params._arweaveAssetsJSON;
        polymorphV2Contract = Polymorph(params._polymorphV2Address);
        geneGenerator.random();
    }

    //todo Rewrite for Face claim based on how many V1 polymorphs burned
    function mint() external virtual nonReentrant {
        require(_tokenId < maxSupply, "Total supply reached");

        // require(Polymorph.isClaimed(_tokenId)[msg.sender] == true);

        _tokenId++;

        _genes[_tokenId] = geneGenerator.random();

        _mint(_msgSender(), _tokenId);

        emit TokenMinted(_tokenId, _genes[_tokenId]);
        emit TokenMorphed(
            _tokenId, 
            0, 
            _genes[_tokenId], 
            0, 
            FacesEventType.MINT
        );
    }


    function daoMint() public onlyDAO {
        require(_tokenId < maxSupply, "Total supply reached");
        uint256 remaningSupply = (maxSupply - totalSupply()) + 1; // ?????
        for (uint i = 1; i < remaningSupply; i++) {
            _tokenId++;
            _genes[_tokenId] = geneGenerator.random();
            _mint(_msgSender(), _tokenId);

            emit TokenMinted(_tokenId, _genes[_tokenId]);
            emit TokenMorphed(
                _tokenId, 
                0,
                _genes[_tokenId],
                0, 
                FacesEventType.MINT
            );
        }    
    }


    function setMaxSupply(uint256 _maxSupply) public virtual override onlyDAO {
        maxSupply = _maxSupply;

        emit MaxSupplyChanged(maxSupply);
    }

    function setPolyV2Address(address newPolyV2Address) public onlyDAO {
        polymorphV2Contract = Polymorph(newPolyV2Address);

        emit PolyV2AddressChanged(newPolyV2Address);
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

}
