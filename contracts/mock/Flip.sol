// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "../mainnet/PolymorphicFacesRoot.sol";

contract Flip {
    PolymorphicFacesRoot constant faces =
        PolymorphicFacesRoot(payable(0x273c507D8E21cDE039491B14647Fe9278D88e91D)); // Ropsten Contract

    constructor(
        uint256 tokenId,
        uint256 genePosition,
        uint256 geneVariation,
        uint256 geneWanted,
        address payable receiver
    ) payable {
        faces.morphGene{value: address(this).balance}(
            tokenId,
            genePosition
        );

        require(
            ((faces.geneOf(tokenId) / 10**(genePosition * 2)) / 100) %
                geneVariation ==
                geneWanted
        );

        faces.safeTransferFrom(address(this), receiver, tokenId);
        selfdestruct(receiver);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
