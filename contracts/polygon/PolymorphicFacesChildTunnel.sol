// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "../tunnel/FxBaseChildTunnel.sol";
import "../base/PolymorphicFacesTunnel.sol";
import "../polygon/PolymorphicFacesChild.sol";

contract PolymorphicFacesChildTunnel is FxBaseChildTunnel, PolymorphicFacesTunnel {
    constructor(address _fxChild, address payable _daoAddress)
        FxBaseChildTunnel(_fxChild)
        PolymorphicFacesTunnel(_daoAddress)
    {}

    PolymorphicFacesChild public facesContract;
    uint256 public latestStateId;
    address public latestRootMessageSender;
    bytes public latestData;

    modifier onlyOwner(uint256 tokenId) {
        require(
            facesContract.ownerOf(tokenId) == msg.sender,
            "Only owner can move faces"
        );
        _;
    }

    function _processMessageFromRoot(
        uint256 stateId,
        address sender,
        bytes memory data
    ) internal override {
        latestStateId = stateId;
        latestRootMessageSender = sender;
        latestData = data;

        (
            uint256 tokenId,
            address ownerAddress,
            uint256 gene,
            bool isVirgin,
            uint256 genomeChanges
        ) = _decodeMessage(data);
        //TODO: Maybe check if person has enough MATIC tokens before that?
        facesContract.mintFaceWithInfo(tokenId, ownerAddress, gene);
        facesContract.wormholeUpdateGene(
            tokenId,
            gene,
            isVirgin,
            genomeChanges
        );
    }

    function moveThroughWormhole(uint256 tokenId)
        external
        override
        onlyOwner(tokenId)
    {
        uint256 gene = facesContract.geneOf(tokenId);
        bool isNotVirgin = facesContract.isNotVirgin(tokenId);
        uint256 genomeChanges = facesContract.genomeChanges(tokenId);
        facesContract.burn(tokenId);

        //TODO: Maybe clear gene and genomeChanges
        // It may not be a problem because when we mint on polygon they will be overwritten
        _sendMessageToRoot(
            abi.encode(tokenId, msg.sender, gene, isNotVirgin, genomeChanges)
        );
    }

    function setFacesContract(address payable contractAddress)
        public
        onlyDAO
    {
        facesContract = PolymorphicFacesChild(contractAddress);
    }
}
