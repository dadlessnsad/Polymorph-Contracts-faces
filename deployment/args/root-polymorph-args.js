const tokenName = "ZeBurger";
const tokenSymbol = "XLBLT";
const metadataURI ="https://us-central1-Burgermetadata.cloudfunctions.net/images-function?id=";
const DAOAddress = "0xcb5c05B9916B49adf97cC31a0c7089F3B4Cfa8b1";
const premint = 0;
const geneChangePrice = ethers.utils.parseEther("0.01");
const polymorphsLimit = 10000;
const randomizePrice = ethers.utils.parseEther("0.01");
const bulkBuyLimit = 20;
const arweaveContainer ="https://arweave.net/5KDDRA5EE9p-ugifhfchjcjlkhjfckhfjjcljh";
const polymorphV1Address = "0x665E3AD58e232cc8944C613D5e20c3A5C70A10ea";

module.exports = [
  {
    name: tokenName,
    symbol: tokenSymbol,
    baseURI: metadataURI,
    _daoAddress: DAOAddress,
    premintedTokensCount: premint,
    _baseGenomeChangePrice: geneChangePrice,
    _maxSupply: polymorphsLimit,
    _randomizeGenomePrice: randomizePrice,
    _bulkBuyLimit: bulkBuyLimit,
    _arweaveAssetsJSON: arweaveContainer,
    _polymorphV1Address: polymorphV1Address,
  },
];
