const etherlime = require('etherlime-lib');
const ethers = require('ethers');
const PolymorphWithGeneChanger = require('../build/PolymorphWithGeneChanger.json');


const deploy = async (network, secret, etherscanApiKey) => {

	const deployer = new etherlime.InfuraPrivateKeyDeployer(secret, network, process.env.API_KEY);
	const gasPrice = 32000000000
	const gasLimit = 4700000

	const tokenName = "Ze Burger";
	const tokenSymbol = "XLBLT";
  const metadataURI ="https://us-central1-Burgermetadata.cloudfunctions.net/images-function?id=";
	const DAOAddress = "0xcb5c05B9916B49adf97cC31a0c7089F3B4Cfa8b1" //TODO: set to DAO address
	const premint = 0
	const geneChangePrice = ethers.utils.parseEther("0.01");
	const polymorphsLimit = 10000
	const randomizePrice = ethers.utils.parseEther("0.01");
	const bulkBuyLimit = 20
	const arweaveContainer = "https://arweave.net/5KDDRA5EE9p-ugifhfchjcjlkhjfckhfjjcljh";

	deployer.defaultOverrides = { gasLimit, gasPrice };
	const result = await deployer.deploy(
		PolymorphWithGeneChanger,
		{},
		tokenName,
		tokenSymbol,
		metadataURI,
		DAOAddress,
		premint,
		geneChangePrice,
		polymorphsLimit,
		randomizePrice,
		bulkBuyLimit,
		arweaveContainer);

};

module.exports = {
	deploy
};
