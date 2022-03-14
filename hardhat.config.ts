import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-etherscan";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-dependency-compiler";
import "hardhat-gas-reporter";
import { task } from "hardhat/config";
import * as dotenv from "dotenv";
import { loadCommunicators } from "./scripts/utils";
import "hardhat-change-network";
dotenv.config();

const { pk } = require("./secrets.json");

const chainIds = {
  ganache: 1337,
  goerli: 5,
  hardhat: 31337,
  kovan: 42,
  mainnet: 1,
  avalanche: 43114,
  fuji: 43113,
  rinkeby: 4,
  ropsten: 3,
  bscTestnet: 97,
  bsc: 56,
  mumbai: 80001,
  polygon: 137,
};

const INFURA_API_KEY = process.env.INFURA_API_KEY;
const MORALIS_APY_KEY = process.env.MORALIS_APY_KEY;

const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY;
const BSCSCAN_KEY = process.env.BSCSCAN_KEY;
const OPTIMISTICSCAN_KEY = process.env.OPTIMISTICSCAN_KEY;
const HECOSCAN_KEY = process.env.HECOSCAN_KEY;
const FTMSCAN_KEY = process.env.FTMSCAN_KEY;
const ARBISCAN_KEY = process.env.ARBISCAN_KEY;
const POLYGONSCAN_KEY = process.env.POLYGONSCAN_KEY;
const AVALANCHE_KEY = process.env.AVALANCHE_KEY;

const config = {
  defaultNetwork: "hardhat",
  masterchain: "rinkeby",
  networks: {
    hardhat: {
      // blockGasLimit: 10000000,
      // forking: {
      //   url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`
      // }
    },
    // ropsten: {
    //   url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
    //   chainId: chainIds.ropsten,
    //   accounts: [pk],
    //   gasMultiplier: 1.25,
    //   lzChainId: 10009,
    //   weth: "0x0a180A76e4466bF68A7F86fB029BEd3cCcFaAac5",
    //   endpoint: "0x1afBa0F45eaDDc26BB3195473E43762DBfB6E44C",
    // },
    rinkeby: {
      //url: `https://speedy-nodes-nyc.moralis.io/${MORALIS_APY_KEY}/eth/rinkeby`,
      url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
      chainId: chainIds.rinkeby,
      accounts: [pk],
      gasMultiplier: 1.25,
      lzChainId: 10001,
      weth: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
      endpoint: "0x08a65B184A784aC2E53D57af7d89d614C50fbaB0",
    },
    bscTestnet: {
      url: `https://speedy-nodes-nyc.moralis.io/${MORALIS_APY_KEY}/bsc/testnet`,
      chainId: chainIds.bscTestnet,
      lzChainId: 10002,
      weth: "0x094616F0BdFB0b526bD735Bf66Eca0Ad254ca81F",
      endpoint: "0x3d04203B09298A701a1250Ac7b5F94c72371E5bA",
      accounts: [pk],
    },
    bsc: {
      url: `https://speedy-nodes-nyc.moralis.io/${MORALIS_APY_KEY}/bsc/mainnet`,
      chainId: chainIds.bsc,
      lzChainId: 10009,
      weth: "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
      endpoint: "0x1956fB6f2420269663218FDF441697412E735666",
      accounts: [pk],
    },
    fuji: {
      // avalanche testnet
      url: `https://speedy-nodes-nyc.moralis.io/${MORALIS_APY_KEY}/avalanche/testnet`,
      chainId: chainIds.fuji,
      lzChainId: 10006,
      endpoint: "0xe4E9F4766fa70Ea5620f2dc974AD030Ba678a806",
      weth: "0xd00ae08403B9bbb9124bB305C09058E32C39A48c", //0xd00ae08403B9bbb9124bB305C09058E32C39A48c
      accounts: [pk],
    },
    avalanche: {
      url: `https://speedy-nodes-nyc.moralis.io/${MORALIS_APY_KEY}/avalanche/mainnet`,
      chainId: chainIds.avalanche,
      weth: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
      accounts: [pk],
    },
    mumbai: {
      // polygon testnet
      url: `https://speedy-nodes-nyc.moralis.io/${MORALIS_APY_KEY}/polygon/mumbai`,
      chainId: chainIds.mumbai,
      lzChainId: 10009,
      weth: "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
      endpoint: "0xFA98f9DE4444b010AFc0da926b484548b52039Ce",
      accounts: [pk],
    },
    polygon: {
      url: `https://speedy-nodes-nyc.moralis.io/${MORALIS_APY_KEY}/polygon/mainnet`,
      chainId: chainIds.polygon,
      accounts: [pk],
    },
    arbitrum: {
      // rinkeby testnet
      url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
      chainId: chainIds.rinkeby,
      lzChainId: 10010,
      weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      endpoint: "0xcaB30388A8BD98103edAeF2e2f0A518995d70b0F",
      accounts: [pk],
    },
    optimism: {
      // kovan testnet
      url: `https://kovan.infura.io/v3/${INFURA_API_KEY}`,
      chainId: chainIds.kovan,
      lzChainId: 10011,
      weth: "0x4200000000000000000000000000000000000006",
      endpoint: "0xAa78bc609571A8F3dBEA81187577eE0bc4Bd5CcE",
      accounts: [pk],
    },
  },
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_KEY,
      ropsten: ETHERSCAN_KEY,
      rinkeby: ETHERSCAN_KEY,
      goerli: ETHERSCAN_KEY,
      kovan: ETHERSCAN_KEY,
      // binance smart chain
      bsc: BSCSCAN_KEY,
      bscTestnet: BSCSCAN_KEY,
      // huobi eco chain
      heco: HECOSCAN_KEY,
      hecoTestnet: HECOSCAN_KEY,
      // fantom mainnet
      opera: FTMSCAN_KEY,
      ftmTestnet: FTMSCAN_KEY,
      // optimism
      optimisticEthereum: OPTIMISTICSCAN_KEY,
      optimisticKovan: OPTIMISTICSCAN_KEY,
      // polygon
      polygon: POLYGONSCAN_KEY,
      polygonMumbai: POLYGONSCAN_KEY,
      // arbitrum
      arbitrumOne: ARBISCAN_KEY,
      arbitrumTestnet: ARBISCAN_KEY,
      // avalanche
      avalanche: AVALANCHE_KEY,
      avalancheFujiTestnet: AVALANCHE_KEY,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.11",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      }
    ],
  },
  mocha: {
    timeout: 30000,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  dependencyCompiler: {
    // paths: [
    //   '@openzeppelin/contracts/token/ERC20/IERC20.sol',
    // ],
  },
};

task("approve", "approves a token on chain")
  .addParam("token", "token address")
  .addParam("to", "contract to")
  .addParam("amount", "amount of approve")
  .setAction(async (args, hre) => {
    const { to, token, amount } = args;
    const [signer] = await hre.ethers.getSigners();
    const Token = await hre.ethers.getContractAt(
      "InterswapERC20",
      token,
      signer
    );
    await Token.approve(to, amount, {gasLimit: 1000000});
    console.log(`Approved ${token} amount: ${amount}`);
  });

task(
  "createPair",
  "deploy pair contract on masterchain (because LZ does not work with create2 opcode for now)"
)
  .addParam("tokenA", "")
  .addParam("tokenB", "")
  .addParam("chainA", "")
  .addParam("chainB", "")
  .setAction(async (args, hre) => {
    const { tokenA, tokenB, chainA, chainB } = args;
    const [signer] = await hre.ethers.getSigners();
    const json = await loadCommunicators();
    // @ts-ignore
    const masterLzCommunicator = json["masterchain"].address;
    const MasterLZCommunicator = await hre.ethers.getContractAt(
      "MasterLZCommunicator",
      masterLzCommunicator,
      signer
    );
    const factory = await MasterLZCommunicator.factory();
    const Factory = await hre.ethers.getContractAt(
      "InterswapFactory",
      factory,
      signer
    );
    const pairAddr = await Factory.createPair(tokenA, tokenB, chainA, chainB, {
      gasLimit: 1800000,
    });
    console.log(`Pair created at: ${pairAddr}`);
    return pairAddr;
  });

task(
  "createLock",
  "deploy lock contract on masterchain (because LZ does not work with create2 opcode for now)"
)
  .addParam("token", "")
  .setAction(async (args, hre) => {
    const { token } = args;
    const [signer] = await hre.ethers.getSigners();
    const json = await loadCommunicators();
    // @ts-ignore
    const childlzCommunicator = json[hre.network.name].address;
    const ChildLZCommunicator = await hre.ethers.getContractAt(
      "ChildLZCommunicator",
      childlzCommunicator,
      signer
    );
    const lock = await ChildLZCommunicator.deployLockContract(token, {gasLimit: 2000000});
    console.log(
      `Lock contract is deployed for token ${token} on chain ${hre.network.name}: ${lock}`
    );
  });

task("wrap", "wrap native token")
  .addParam("amount", "")
  .setAction(async (args, hre) => {
    const { amount } = args;
    const [signer] = await hre.ethers.getSigners();
    const network = hre.network.name;
    // @ts-ignore
    const wethAddr = hre.config.networks[network]["weth"];
    const WETH = await hre.ethers.getContractAt("IWETH", wethAddr, signer);
    await WETH.deposit({ value: amount, gasLimit: 1000000 });
    console.log(`${amount} tokens wrapped on ${hre.network.name} network`);
  });

export default config;
