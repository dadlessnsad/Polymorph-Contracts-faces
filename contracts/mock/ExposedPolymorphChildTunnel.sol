// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;
import "../polygon/PolymorphicFacesChildTunnel.sol";

// Exposes internal functions so they can be called in tests
contract ExposedPolymorphChildTunnel is PolymorphicFacesChildTunnel {
    constructor(address _fxChild, address payable _daoAddress)
        PolymorphicFacesChildTunnel(_fxChild, _daoAddress)
    {}

    function decodeMessage(bytes memory data)
        public
        pure
        returns (
            uint256 tokenId,
            address facesAddress,
            uint256 gene,
            bool isVirgin,
            uint256 genomeChanges
        )
    {
        return _decodeMessage(data);
    }

    function exposedProcessMessageFromRoot(
        uint256 stateId,
        address rootMessageSender,
        bytes calldata data
    ) external {
        _processMessageFromRoot(stateId, rootMessageSender, data);
    }
}
