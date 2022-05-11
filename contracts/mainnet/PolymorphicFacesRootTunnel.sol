// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "../tunnel/FxBaseRootTunnel.sol";
import "../base/PolymorphicFacesTunnel.sol";
import "./PolymorphicFacesRoot.sol";

contract PolymorphicFacesRootTunnel is FxBaseRootTunnel, PolymorphicFacesTunnel {
    constructor(
        address _checkpointManager,
        address _fxRoot,
        address payable _daoAddress
    )
        FxBaseRootTunnel(_checkpointManager, _fxRoot)
        PolymorphicFacesTunnel(_daoAddress)
    {}

    PolymorphicFacesRoot public facesContract;

    modifier onlyOwner(uint256 tokenId) {
        require(
            facesContract.ownerOf(tokenId) == msg.sender,
            "Only owner can move faces"
        );
        _;
    }

    function _processMessageFromChild(bytes memory data) internal override {
        require(
            address(facesContract) != address(0),
            "faces contract hasn't been set yet"
        );
        (
            uint256 tokenId,
            address ownerAddress,
            uint256 gene,
            bool isNotVirgin,
            uint256 genomeChanges
        ) = _decodeMessage(data);

        facesContract.transferFrom(address(this), ownerAddress, tokenId);

        facesContract.wormholeUpdateGene(
            tokenId,
            gene,
            isNotVirgin,
            genomeChanges
        );
    }

    function moveThroughWormhole(uint256 tokenId)
        public
        override
        onlyOwner(tokenId)
    {
        facesContract.transferFrom(msg.sender, address(this), tokenId);

        _sendMessageToChild(
            abi.encode(
                tokenId,
                msg.sender,
                facesContract.geneOf(tokenId),
                facesContract.isNotVirgin(tokenId),
                facesContract.genomeChanges(tokenId)
            )
        );
    }

    function setFacesContract(address payable contractAddress)
        public
        onlyDAO
    {
        facesContract = PolymorphicFacesRoot(contractAddress);
    }
}
