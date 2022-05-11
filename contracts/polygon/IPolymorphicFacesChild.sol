// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IPolymorphicFacesChild is IERC721 {
    function mintFaceWithInfo(
        uint256 tokenId,
        address ownerAddress,
        uint256 gene
    ) external;

    function setMaticWETHContract(address maticWETHAddress) external;
}
