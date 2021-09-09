const { expect } = require("chai");


describe('PolymorphRootOld', () => {
    let DAO;
    let aliceAccount;
    let bobsAccount;
    let deployer;
    let polymorphInstance;
    
    let name = "PolymorphWithGeneChanger"
    let token = "POLY";
    let baseUri = "http://www.kekdao.com/";
    let premintedTokensCount = 5;
    let totalSupply = 20;
    let bulkBuyLimit = 20;
    let polymorphPrice = ethers.utils.parseEther("0.0777");
    let defaultGenomeChangePrice = ethers.utils.parseEther("0.01");
    let randomizeGenomePrice = ethers.utils.parseEther("0.02");
    let arweaveAssetsJSON = 'JSON'
    let polymorphV1Address = "0x75D38741878da8520d1Ae6db298A9BD994A5D241";

    before(async () => {
      const [user, dao, alice, bob] = await ethers.getSigners();

      DAO = dao;
      aliceAccount = alice;
      bobsAccount = bob;
      deployer = user
  
      const PolymorphRoot = await ethers.getContractFactory("PolymorphRoot");
      polymorphInstance = await PolymorphRoot.deploy(name, token, baseUri, DAO.address, premintedTokensCount, defaultGenomeChangePrice, polymorphPrice, totalSupply, randomizeGenomePrice, bulkBuyLimit, arweaveAssetsJSON, polymorphV1Address);
      console.log(`Polymorph instance deployed to: ${polymorphInstance.address}`);
    });

    it(`should premint ${premintedTokensCount} tokens`, async () => {
        const lastToken = await polymorphInstance.lastTokenId();
        const ownerOfTheFirstToken = await polymorphInstance.ownerOf(1);

        expect(deployer.address).eq(ownerOfTheFirstToken, "The preminted tokens were not given to the owner");
        expect(lastToken).eq(premintedTokensCount, "The preminted tokens count is not accurate");

        const geneOfLastToken = await polymorphInstance.geneOf(lastToken);
        expect(geneOfLastToken).not.eq(0, "Gene hasn't been set");
    });

    it(`mint(address) should be disabled`, async () => {
      await expect(polymorphInstance['mint(address)'](deployer.address)).revertedWith("Should not use this one");
    });

    it(`should bulkBuy`, async () => {
        const cost = await polymorphInstance.polymorphPrice();
        const bulkBuyCount = 2
        await polymorphInstance.bulkBuy(bulkBuyCount, { value: cost.mul(20) });
        const lastTokenId = await polymorphInstance.lastTokenId();

        expect(lastTokenId).eq(premintedTokensCount + bulkBuyCount);
    });

    it(`transfer calls mint functionality`, async () => {
      const lastTokenId = await polymorphInstance.lastTokenId();
      await deployer.sendTransaction({to: polymorphInstance.address, value: ethers.utils.parseEther("1")});
      const lastTokenIdAfter = await polymorphInstance.lastTokenId();
      await expect(lastTokenId.add(1)).eq(lastTokenIdAfter);
      const owner = await polymorphInstance.ownerOf(lastTokenIdAfter);

      await expect(owner).eq(deployer.address);
    });

    it('should mint nft with random gene', async () => {
        const kekBalanceBefore = await DAO.getBalance();

        const cost = await polymorphInstance.polymorphPrice();
        await polymorphInstance['mint()']({ value: cost });
        await polymorphInstance['mint()']({ value: cost });

        const kekBalanceAfter = await DAO.getBalance();

        const geneA = await polymorphInstance.geneOf(premintedTokensCount + 1);
        const geneB = await polymorphInstance.geneOf(premintedTokensCount + 2);

        expect(geneA).not.eq(geneB, "The two genes ended up the same");

        expect(kekBalanceAfter).eq(kekBalanceBefore.add(cost.mul(2)), "The dao did not receive correct amount");
    })

    it('should not change the gene on transfer', async () => {
        const bobsAddress = await bobsAccount.address

        const geneBefore = await polymorphInstance.geneOf(3);
        await polymorphInstance.transferFrom(deployer.address, bobsAddress, 3);
        const geneAfter = await polymorphInstance.geneOf(3);

        expect(geneBefore).eq(geneAfter, "The two genes ended up the same");
    });

    it('randomize gene should return excess ether sent', async () => {
      const cost = await polymorphInstance.polymorphPrice();

      await polymorphInstance.connect(aliceAccount)['mint()']({value: cost});

      const tokenId = await polymorphInstance.lastTokenId();

      const randomizeCost = await polymorphInstance.randomizeGenomePrice();
      
      await expect(await polymorphInstance.connect(aliceAccount).randomizeGenome(tokenId, {value: randomizeCost.mul(5)}))
            .to.changeEtherBalance(aliceAccount, randomizeCost.mul(-1));
    });

    it('should evolve gene', async () => {
      const tokenIdForMorphing = 2
      const kekBalanceBefore = await DAO.getBalance();

      const geneBefore = await polymorphInstance.geneOf(tokenIdForMorphing);

      let price = await polymorphInstance.priceForGenomeChange(tokenIdForMorphing);
      expect(price).eq(defaultGenomeChangePrice, "The price was not the default");

      await expect(await polymorphInstance.morphGene(tokenIdForMorphing, 1, { value: price }))
            .to.changeEtherBalance(deployer, price.mul(-1));

      const geneAfter = await polymorphInstance.geneOf(tokenIdForMorphing);
      expect(geneBefore).not.eq(geneAfter, "The gene did not change");      
      
      price = await polymorphInstance.priceForGenomeChange(tokenIdForMorphing);
      expect(price).eq(defaultGenomeChangePrice.mul(2), "The price was not correct");
      
      const kekBalanceAfter = await DAO.getBalance();
      await expect(polymorphInstance.morphGene(tokenIdForMorphing, 0, { value: price })).to.be.reverted;
      const geneAfter2 = await polymorphInstance.geneOf(tokenIdForMorphing);
      const kekBalanceAfter2 = await DAO.getBalance();
      expect(geneAfter2).eq(geneAfter, "The gene did change");
      expect(kekBalanceAfter).eq(kekBalanceAfter2, "The price was paid");

      price = await polymorphInstance.priceForGenomeChange(tokenIdForMorphing);
      expect(price).eq(defaultGenomeChangePrice.mul(2), "The price was not correct");

      await polymorphInstance.morphGene(tokenIdForMorphing, 10, { value: price, gasLimit: 100000 });
      const geneAfter3 = await polymorphInstance.geneOf(tokenIdForMorphing);
      expect(geneAfter2).not.eq(geneAfter3, "The gene did not change");

      price = await polymorphInstance.priceForGenomeChange(tokenIdForMorphing);
      expect(price).eq(defaultGenomeChangePrice.mul(4), "The price was not correct");

      await polymorphInstance.randomizeGenome(2, { value: price });
      const geneAfterReset = await polymorphInstance.geneOf(tokenIdForMorphing);
      expect(geneAfterReset).not.eq(geneAfter3, "The gene did not change");

      price = await polymorphInstance.priceForGenomeChange(tokenIdForMorphing);
      expect(price).eq(defaultGenomeChangePrice, "The price was not the default");
    });

    it('should not morph from a contract interactor', async () => {
        const tokenIdForRandomize = 2
        const geneBefore = await polymorphInstance.geneOf(tokenIdForRandomize);

        await polymorphInstance.randomizeGenome(tokenIdForRandomize, { value: randomizeGenomePrice })

        const geneAfter = await polymorphInstance.geneOf(tokenIdForRandomize);

        expect(geneBefore).not.eq(geneAfter, "Genes did not change for EOW interaction");
        const TestContractInteractor = await ethers.getContractFactory("TestContractInteractor");
        const contractInteractor = await TestContractInteractor.deploy(polymorphInstance.address)
        await polymorphInstance.transferFrom(deployer.address, contractInteractor.address, tokenIdForRandomize);

        await expect(contractInteractor.triggerRandomize(tokenIdForRandomize, { value: randomizeGenomePrice })).to.be.revertedWith("Caller cannot be a contract");
        await expect(contractInteractor.triggerGeneChange(tokenIdForRandomize, 2, { value: randomizeGenomePrice })).to.be.revertedWith("Caller cannot be a contract");
    });

    it('should not morph polymorph that is not yours', async () => {
      const cost = await polymorphInstance.polymorphPrice();

      await polymorphInstance['mint()']({value: cost});
      const tokenId = await polymorphInstance.lastTokenId();

      await expect(polymorphInstance.connect(aliceAccount).randomizeGenome(tokenId)).revertedWith("PolymorphWithGeneChanger: cannot change genome of token that is not own");
      await expect(polymorphInstance.connect(aliceAccount).morphGene(tokenId, 2)).revertedWith("PolymorphWithGeneChanger: cannot change genome of token that is not own");
    });

    it('should not morph  base character', async () => {
      const cost = await polymorphInstance.polymorphPrice();

      await polymorphInstance['mint()']({value: cost});

      const tokenId = await polymorphInstance.lastTokenId();

      const morphCost = await polymorphInstance.priceForGenomeChange(tokenId);

      await expect(polymorphInstance.morphGene(tokenId, 0, {value: morphCost})).revertedWith("Base character not morphable");
    });

    it('morph gene should return excess ether sent', async () => {
      const cost = await polymorphInstance.polymorphPrice();

      await polymorphInstance.connect(aliceAccount)['mint()']({value: cost});

      const tokenId = await polymorphInstance.lastTokenId();

      const morphCost = await polymorphInstance.priceForGenomeChange(tokenId);

      await expect(await polymorphInstance.connect(aliceAccount).morphGene(tokenId, 2, {value: morphCost.mul(5)}))
            .to.changeEtherBalance(aliceAccount, morphCost.mul(-1));
    });

    it('should not morph gene when DAO does not have receive or fallback function', async () => {
      const TestContractInteractor = await ethers.getContractFactory("TestContractInteractor");
      const contractInteractor = await TestContractInteractor.deploy(polymorphInstance.address)

      const MockedPolymorphRoot = await ethers.getContractFactory("PolymorphRoot");
      const mockedPolymorphInstance = await MockedPolymorphRoot.deploy(name, token, baseUri, 
        contractInteractor.address, premintedTokensCount, 
        defaultGenomeChangePrice, polymorphPrice, totalSupply, 
        randomizeGenomePrice, bulkBuyLimit, arweaveAssetsJSON, polymorphV1Address);

      const cost = await mockedPolymorphInstance.polymorphPrice();
      await expect(mockedPolymorphInstance.morphGene(premintedTokensCount, 2)).revertedWith("Address: unable to send value, recipient may have reverted");
    });

    it('should revert if invalid gene position is passed', async () => {
      const cost = await polymorphInstance.polymorphPrice();

      await polymorphInstance['mint()']({value: cost});

      const tokenId = await polymorphInstance.lastTokenId();

      const morphCost = await polymorphInstance.priceForGenomeChange(tokenId);

      await expect(polymorphInstance.morphGene(tokenId, 37, {value: morphCost})).to.not.reverted;
      await expect(polymorphInstance.morphGene(tokenId, 38, {value: morphCost.mul(2)})).revertedWith("Bad gene position");
    });

    it('should not mint when DAO does not have receive or fallback function', async () => {
      const TestContractInteractor = await ethers.getContractFactory("TestContractInteractor");
      const contractInteractor = await TestContractInteractor.deploy(polymorphInstance.address)

      const MockedPolymorphRoot = await ethers.getContractFactory("PolymorphRoot");
      const mockedPolymorphInstance = await MockedPolymorphRoot.deploy(name, token, baseUri, contractInteractor.address, premintedTokensCount, defaultGenomeChangePrice, polymorphPrice, totalSupply, randomizeGenomePrice, bulkBuyLimit, arweaveAssetsJSON, polymorphV1Address);

      const cost = await mockedPolymorphInstance.polymorphPrice();
      await expect(mockedPolymorphInstance['mint()']({value: cost})).revertedWith("Address: unable to send value, recipient may have reverted");
    });

    it('should not mint when msg.sender can not receive excess eth amount back', async () => {
      const TestContractInteractor = await ethers.getContractFactory("TestContractInteractor");
      const contractInteractor = await TestContractInteractor.deploy(polymorphInstance.address)

      const cost = await polymorphInstance.polymorphPrice();
      await expect(contractInteractor.triggerMint({value: cost.mul(2)})).revertedWith("Failed to return excess");
    });

    it('should not randomize gene when DAO does not have receive or fallback function', async () => {
      const TestContractInteractor = await ethers.getContractFactory("TestContractInteractor");
      const contractInteractor = await TestContractInteractor.deploy(polymorphInstance.address)

      const MockedPolymorphRoot = await ethers.getContractFactory("PolymorphRoot");
      const mockedPolymorphInstance = await MockedPolymorphRoot.deploy(name, token, baseUri, 
        contractInteractor.address, premintedTokensCount, 
        defaultGenomeChangePrice, polymorphPrice, totalSupply, 
        randomizeGenomePrice, bulkBuyLimit, arweaveAssetsJSON, polymorphV1Address);

      const cost = await mockedPolymorphInstance.polymorphPrice();
      await expect(mockedPolymorphInstance.randomizeGenome(premintedTokensCount)).revertedWith("Address: unable to send value, recipient may have reverted");
    });

    // TODO: Write cases for require functions in bulk buy
    it('should not bulk buy when DAO does not have receive or fallback function', async () => {
      const TestContractInteractor = await ethers.getContractFactory("TestContractInteractor");
      const contractInteractor = await TestContractInteractor.deploy(polymorphInstance.address)

      const MockedPolymorphRoot = await ethers.getContractFactory("PolymorphRoot");
      const mockedPolymorphInstance = await MockedPolymorphRoot.deploy(name, token, baseUri, contractInteractor.address, premintedTokensCount, defaultGenomeChangePrice, polymorphPrice, totalSupply, randomizeGenomePrice, bulkBuyLimit, arweaveAssetsJSON, polymorphV1Address);

      const cost = await mockedPolymorphInstance.polymorphPrice();
      await expect(mockedPolymorphInstance.bulkBuy(2, {value: cost.mul(3)})).revertedWith("Address: unable to send value, recipient may have reverted");
    });

    it('should not bulk buy when msg.sender can not receive excess eth amount back', async () => {
      const TestContractInteractor = await ethers.getContractFactory("TestContractInteractor");
      const contractInteractor = await TestContractInteractor.deploy(polymorphInstance.address)

      const cost = await polymorphInstance.polymorphPrice();
      await expect(contractInteractor.triggerBulkBuy(2, {value: cost.mul(4)})).revertedWith("Failed to return excess");
    });

    it('should change bulk buy limit', async () => {

      const newBulkBuyLimit = 30;

      const bulkBuyLimitBefore = await polymorphInstance.bulkBuyLimit();
      expect(bulkBuyLimitBefore).eq(bulkBuyLimit, `The bulk buy limiu was not ${bulkBuyLimit} in the beginning`);

      await polymorphInstance.connect(DAO).setBulkBuyLimit(newBulkBuyLimit);

      const bulkBuyLimitAfter = await polymorphInstance.bulkBuyLimit();
      expect(bulkBuyLimitAfter).eq(newBulkBuyLimit, "The bulk buy limit did not change");

      await expect(polymorphInstance.setBulkBuyLimit(newBulkBuyLimit)).revertedWith("Not called from the dao");
    })

    // it('should not morph genome when msg.sender can not receive excess eth amount back', async () => {
    //   const TestContractInteractor = await ethers.getContractFactory("TestContractInteractor");
    //   const contractInteractor = await TestContractInteractor.deploy(polymorphInstance.address)

    //   const cost = await polymorphInstance.polymorphPrice();
    //   await expect(contractInteractor.triggerRandomize(premintedTokensCount, {value: cost.mul(2)})).revertedWith("Failed to return excess");
    // });

    // it('should not randomize genome when msg.sender can not receive excess eth amount back', async () => {
    //   const TestContractInteractor = await ethers.getContractFactory("TestContractInteractor");
    //   const contractInteractor = await TestContractInteractor.deploy(polymorphInstance.address)

    //   const cost = await polymorphInstance.polymorphPrice();
    //   await expect(contractInteractor.triggerGeneChange(premintedTokensCount, 5, {value: cost.mul(2)})).revertedWith("Failed to return excess");
    // });

    // it('should not morph when msg.sender can not receive excess eth amount back', async () => {
    //   const TestContractInteractor = await ethers.getContractFactory("TestContractInteractor");
    //   const contractInteractor = await TestContractInteractor.deploy(polymorphInstance.address);

    //   const cost = await polymorphInstance.polymorphPrice();

    //   await polymorphInstance['mint()']({value: cost});
    //   const tokenId = await polymorphInstance.lastTokenId();
      
    //   await polymorphInstance.transferFrom(deployer.address, contractInteractor.address, tokenId);

    //   const genomeChangeCost = await polymorphInstance.priceForGenomeChange(tokenId);

    //   await expect(contractInteractor.triggerGeneChange(tokenId, 2, {value: genomeChangeCost.mul(2)})).revertedWith("Failed to return excess");
    // });


    it('should change polymorph price', async () => {
        const newPolymorphPrice = ethers.utils.parseEther("0.0877");

        const polymorphPriceBefore = await polymorphInstance.polymorphPrice();
        expect(polymorphPriceBefore).eq(polymorphPrice, `The polymorph price was not ${polymorphPrice} in the beginning`);

        await polymorphInstance.connect(DAO).setPolymorphPrice(newPolymorphPrice);

        const polymorphPriceAfter = await polymorphInstance.polymorphPrice();
        expect(polymorphPriceAfter).eq(newPolymorphPrice, "The polymorph price did not change");

        await expect(polymorphInstance.setPolymorphPrice(newPolymorphPrice)).to.revertedWith("Not called from the dao");
    })

    it('should change max supply', async () => {
        const newMaxSupply = 25;

        const totalSupplyBefore = await polymorphInstance.maxSupply();
        expect(totalSupplyBefore).eq(totalSupply, `The max supply was not ${totalSupply} in the beginning`);

        await polymorphInstance.connect(DAO).setMaxSupply(newMaxSupply);

        const totalSupplyAfter = await polymorphInstance.maxSupply();
        expect(totalSupplyAfter).eq(newMaxSupply, "The max supply did not change");

        await expect(polymorphInstance.setMaxSupply(newMaxSupply)).revertedWith("Not called from the dao");
    })

    it('should change randomizeGenomePrice', async () => {
        const newRandomizeGenomePrice = ethers.utils.parseEther("0.1");

        const randomizeGenomePriceBefore = await polymorphInstance.randomizeGenomePrice();
        expect(randomizeGenomePriceBefore).eq(randomizeGenomePrice, `The randomize genome was not ${randomizeGenomePrice} in the beginning`);

        await polymorphInstance.connect(DAO).changeRandomizeGenomePrice(newRandomizeGenomePrice);

        const randomizeGenomePriceAfter = await polymorphInstance.randomizeGenomePrice();
        expect(randomizeGenomePriceAfter).eq(newRandomizeGenomePrice, "The randomize genome price did not change");

        await expect(polymorphInstance.changeRandomizeGenomePrice(newRandomizeGenomePrice)).revertedWith("Not called from the dao");
    })

    it('should change baseGenomeChangePrice', async () => {
      const newChangeGenomePrice = ethers.utils.parseEther("0.1");

      const changeGenomePriceBefore = await polymorphInstance.baseGenomeChangePrice();
      expect(changeGenomePriceBefore).eq(defaultGenomeChangePrice, `The change genome was not ${defaultGenomeChangePrice} in the beginning`);

      await polymorphInstance.connect(DAO).changeBaseGenomeChangePrice(newChangeGenomePrice);

      const changeGenomePriceAfter = await polymorphInstance.baseGenomeChangePrice();
      expect(changeGenomePriceAfter).eq(newChangeGenomePrice, "The change genome price did not change");

      await expect(polymorphInstance.changeBaseGenomeChangePrice(newChangeGenomePrice)).revertedWith("Not called from the dao");
    });

    it('should not bulk buy more than the limit', async () => {
      const cost = await polymorphInstance.polymorphPrice();
      const limit = await polymorphInstance.bulkBuyLimit();

      await expect(polymorphInstance.bulkBuy(limit + 1), {value: cost.mul(limit + 1)}).revertedWith("Cannot bulk buy more than the preset limit");
  })

    it('should change baseURI', async () => {
        const newBaseURI = "https://universe.xyz.com/";
        const baseURIBefore = await polymorphInstance.baseURI();
        expect(baseURIBefore).eq(baseUri, `The base URI was not ${baseUri} in the beginning`);

        await polymorphInstance.connect(DAO).setBaseURI(newBaseURI);

        const baseURIAfter = await polymorphInstance.baseURI();
        expect(baseURIAfter).eq(newBaseURI, "The baseURI did not change");

        await expect(polymorphInstance.setBaseURI(newBaseURI)).revertedWith("Not called from the dao");
    })

    it('should change arweave assets', async () => {
      const newArweave = "new arweave json";

      const arweaveBefore = await polymorphInstance.arweaveAssetsJSON();
      expect(arweaveBefore).eq(arweaveAssetsJSON, "Arweave isn't the same as when it was deployed");

      await polymorphInstance.connect(DAO).setArweaveAssetsJSON(newArweave);

      const arweaveAfter = await polymorphInstance.arweaveAssetsJSON();
      expect(arweaveAfter).eq(newArweave, "The bulk buy limit did not change");

      await expect(polymorphInstance.setArweaveAssetsJSON(newArweave)).revertedWith("Not called from the dao");
    });

    it('wormholeUpdateGene should revert if not called from tunnel', async() => {
      await expect(polymorphInstance.wormholeUpdateGene(1, 12312312312, true, 2)).to.be.revertedWith("Not called from the tunnel");
    });

    it('burnAndMintNewPolymorph increments contract total burned counter', async() => {
      const PolymorphRoot = await ethers.getContractFactory("PolymorphRoot");
      v1Instance = await PolymorphRoot.deploy(name, token, baseUri, DAO.address, premintedTokensCount, defaultGenomeChangePrice, polymorphPrice, totalSupply, randomizeGenomePrice, bulkBuyLimit, arweaveAssetsJSON, polymorphV1Address);
      v2Instance = await PolymorphRoot.deploy(name, token, baseUri, DAO.address, premintedTokensCount, defaultGenomeChangePrice, polymorphPrice, totalSupply, randomizeGenomePrice, bulkBuyLimit, arweaveAssetsJSON, v1Instance.address);
      const bulkBuyCount = 3
      const burnTokenId = 2

      await v1Instance.bulkBuy(bulkBuyCount, {value: polymorphPrice.mul(bulkBuyCount)});

      const totalBurned = await v2Instance.totalBurnedV1();

      await v1Instance.approve(v2Instance.address, burnTokenId);
      await v2Instance.burnAndMintNewPolymorph(burnTokenId);

      const totalBurnedNew = await v2Instance.totalBurnedV1();

      await expect(+totalBurned + 1).eq(totalBurnedNew);
    });

    it('burnAndMintNewPolymorph increments contract max supply', async() => {
      const PolymorphRoot = await ethers.getContractFactory("PolymorphRoot");
      v1Instance = await PolymorphRoot.deploy(name, token, baseUri, DAO.address, premintedTokensCount, defaultGenomeChangePrice, polymorphPrice, totalSupply, randomizeGenomePrice, bulkBuyLimit, arweaveAssetsJSON, polymorphV1Address);
      v2Instance = await PolymorphRoot.deploy(name, token, baseUri, DAO.address, premintedTokensCount, defaultGenomeChangePrice, polymorphPrice, totalSupply, randomizeGenomePrice, bulkBuyLimit, arweaveAssetsJSON, v1Instance.address);
      const bulkBuyCount = 3
      const burnTokenId = 2

      await v1Instance.bulkBuy(bulkBuyCount, {value: polymorphPrice.mul(bulkBuyCount)});

      const maxSupply = await v2Instance.maxSupply();

      await v1Instance.approve(v2Instance.address, burnTokenId);
      await v2Instance.burnAndMintNewPolymorph(burnTokenId);

      const maxSupplyNew = await v2Instance.maxSupply();

      await expect(+maxSupply + 1).eq(maxSupplyNew);
    });

    it('burnAndMintNewPolymorph increments contract token id counter', async() => {
      const PolymorphRoot = await ethers.getContractFactory("PolymorphRoot");
      v1Instance = await PolymorphRoot.deploy(name, token, baseUri, DAO.address, premintedTokensCount, defaultGenomeChangePrice, polymorphPrice, totalSupply, randomizeGenomePrice, bulkBuyLimit, arweaveAssetsJSON, polymorphV1Address);
      v2Instance = await PolymorphRoot.deploy(name, token, baseUri, DAO.address, premintedTokensCount, defaultGenomeChangePrice, polymorphPrice, totalSupply, randomizeGenomePrice, bulkBuyLimit, arweaveAssetsJSON, v1Instance.address);
      const bulkBuyCount = 3
      const burnTokenId = 2

      await v1Instance.bulkBuy(bulkBuyCount, {value: polymorphPrice.mul(bulkBuyCount)});

      const lastTokenId = await v2Instance.lastTokenId();

      await v1Instance.approve(v2Instance.address, burnTokenId);
      await v2Instance.burnAndMintNewPolymorph(burnTokenId);

      const lastTokenIdNew = await v2Instance.lastTokenId();

      await expect(+lastTokenId + 1).eq(lastTokenIdNew)
    });

    it('burnAndMintNewPolymorph increments all counters at the same time', async() => {
      const PolymorphRoot = await ethers.getContractFactory("PolymorphRoot");
      v1Instance = await PolymorphRoot.deploy(name, token, baseUri, DAO.address, premintedTokensCount, defaultGenomeChangePrice, polymorphPrice, totalSupply, randomizeGenomePrice, bulkBuyLimit, arweaveAssetsJSON, polymorphV1Address);
      v2Instance = await PolymorphRoot.deploy(name, token, baseUri, DAO.address, premintedTokensCount, defaultGenomeChangePrice, polymorphPrice, totalSupply, randomizeGenomePrice, bulkBuyLimit, arweaveAssetsJSON, v1Instance.address);
      const bulkBuyCount = 3
      const burnTokenId = 2

      await v1Instance.bulkBuy(bulkBuyCount, {value: polymorphPrice.mul(bulkBuyCount)});

      const totalBurned = await v2Instance.totalBurnedV1();
      const maxSupply = await v2Instance.maxSupply();
      const lastTokenId = await v2Instance.lastTokenId();

      await v1Instance.approve(v2Instance.address, burnTokenId);
      await v2Instance.burnAndMintNewPolymorph(burnTokenId);

      const totalBurnedNew = await v2Instance.totalBurnedV1();
      const maxSupplyNew = await v2Instance.maxSupply();
      const lastTokenIdNew = await v2Instance.lastTokenId();

      await expect(+totalBurned + 1).eq(totalBurnedNew);
      await expect(+maxSupply + 1).eq(maxSupplyNew);
      await expect(+lastTokenId + 1).eq(lastTokenIdNew)
    });

    it('burnAndMintNewPolymorph mints polymorph with the same gene', async() => {
      const PolymorphRoot = await ethers.getContractFactory("PolymorphRoot");
      v1Instance = await PolymorphRoot.deploy(name, token, baseUri, DAO.address, premintedTokensCount, defaultGenomeChangePrice, polymorphPrice, totalSupply, randomizeGenomePrice, bulkBuyLimit, arweaveAssetsJSON, polymorphV1Address);
      v2Instance = await PolymorphRoot.deploy(name, token, baseUri, DAO.address, premintedTokensCount, defaultGenomeChangePrice, polymorphPrice, totalSupply, randomizeGenomePrice, bulkBuyLimit, arweaveAssetsJSON, v1Instance.address);
      const bulkBuyCount = 3
      const burnTokenId = 2

      await v1Instance.bulkBuy(bulkBuyCount, {value: polymorphPrice.mul(bulkBuyCount)});
      const geneOf = await v1Instance.geneOf(burnTokenId);

      await v1Instance.approve(v2Instance.address, burnTokenId);
      await v2Instance.burnAndMintNewPolymorph(burnTokenId);

      const mintedId = await v2Instance.lastTokenId();
      const newGeneOf = await v2Instance.geneOf(mintedId);

      await expect(geneOf).eq(newGeneOf);
    });

    it(`should not mint more than totalSupply`, async () => {
      const cost = await polymorphInstance.polymorphPrice();
      const lastTokenId = await polymorphInstance.lastTokenId();
      const totalSupply = await polymorphInstance.maxSupply();
      for (let i = 0; i < totalSupply - lastTokenId; i++) {
          await polymorphInstance['mint()']({ value: cost });
      }
      await expect(polymorphInstance['mint()']({ value: cost })).revertedWith("Total supply reached");
    });

    it(`should not bulk buy more than totalSupply`, async () => {
      const cost = await polymorphInstance.polymorphPrice();
      const lastTokenId = await polymorphInstance.lastTokenId();
      const totalSupply = await polymorphInstance.maxSupply();
      for (let i = 0; i < totalSupply - lastTokenId; i++) {
          await polymorphInstance['mint()']({ value: cost });
      }
      await expect(polymorphInstance.bulkBuy(2, { value: cost })).revertedWith("Total supply reached");
    });
});