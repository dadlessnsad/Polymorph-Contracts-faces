// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "../mainnet/PolymorphicFacesRoot.sol";

contract TestContractInteractor {
    PolymorphicFacesRoot public facesTestContract;

    constructor(address payable _facesAddress) {
        facesTestContract = PolymorphicFacesRoot(_facesAddress);
    }

    function triggerGeneChange(uint256 tokenId, uint256 genePosition)
        public
        payable
    {
        facesTestContract.morphGene{value: msg.value}(
            tokenId,
            genePosition
        );
    }

    function triggerRandomize(uint256 tokenId) public payable {
        facesTestContract.randomizeGenome{value: msg.value}(tokenId);
    }

    function triggerMint() public payable {
        facesTestContract.mint{value: msg.value}();
    }

    function triggerBulkBuy(uint256 amount) public payable {
        facesTestContract.bulkBuy{value: msg.value}(amount);
    }
}
