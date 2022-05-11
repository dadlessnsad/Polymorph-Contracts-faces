// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IPolymorphicFacesRoot is IERC721 {
    function mint() external payable;

    function bulkBuy(uint256 amount) external payable;

    function setFacesPrice(uint256 newFacesPrice) external;

    function setMaxSupply(uint256 maxSupply) external;

    function setBulkBuyLimit(uint256 bulkBuyLimit) external;
}
