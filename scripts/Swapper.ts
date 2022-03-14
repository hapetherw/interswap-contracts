import hre from "hardhat";
import { loadCommunicators } from "./utils";
import { Deployer } from "./Deployer";

interface Params {
  chainAName: string;
  chainBName: string;
  tokenA: string;
  tokenB: string;
}

export interface AddLiquidityParams extends Params {
  amountA: string;
  amountB: string;
  sourceTokenAsNative?: boolean;
  skipPreDeployment?: boolean;
}

export interface RemoveLiquidityParams extends Params {
  liquidity: string;
}

export interface SwapParams extends Params {
  amountIn: string;
  sourceTokenAsNative: boolean;
}

export class Swapper {
  constructor() {
    console.log(`Swapper is initialized`);
  }

  changeNetwork(network: string) {
    if (hre.network.name !== network) {
      hre.changeNetwork(network);
      console.log(`Swapper: switched on ${network}`);
    }
  }

  async wrapNativeToken(network: string, amount: string) {
    if (hre.network.name !== network) {
      this.changeNetwork(network);
    }
    await hre.run("wrap", { amount });
  }

  async enableToken(token: string, network: string, amount: string) {
    if (hre.network.name !== network) {
      this.changeNetwork(network);
    }
    const json = await loadCommunicators();
    const lzCommunicator = json[network].address;
    console.log("Approving token");
    await hre.run("approve", { token, to: lzCommunicator, amount });
  }

  async createPairContract(pair: Params) {
    const { chainAName, tokenA, chainBName, tokenB } = pair;
    // @ts-ignore
    const chainA = hre.config.networks[chainAName].lzChainId.toString();
    // @ts-ignore
    const chainB = hre.config.networks[chainBName].lzChainId.toString();
    // @ts-ignore
    const masterchain = hre.config.masterchain;
    if (hre.network.name !== masterchain) {
      this.changeNetwork(masterchain);
    }
    const params = {
      tokenA,
      tokenB,
      chainA,
      chainB,
      network: masterchain,
    };
    console.log(`Pre-creating a pair with params: ${Object.values(params)}`);
    await hre.run("createPair", params);
  }

  async preDeployments(pairs: Params[]) {
    for (const pair of pairs) {
      await this.createPairContract(pair); // because of layer zero bug with create2 opcode fee calculations, we deploy all contracts in advance
    }

    for (const pair of pairs) {
      const { chainAName, tokenA, chainBName, tokenB } = pair;
      await this.createLockContract(tokenA, chainAName);
      await this.createLockContract(tokenB, chainBName);
    }
  }

  async createLockContract(token: string, network: string) {
    if (hre.network.name !== network) {
      this.changeNetwork(network);
    }
    await hre.run("createLock", { network, token });
  }

  async addLiquidity(pair: AddLiquidityParams, signer_?: string) {
    const {
      chainAName,
      tokenA,
      chainBName,
      tokenB,
      amountA,
      amountB,
      sourceTokenAsNative,
    } = pair;
    this.changeNetwork(chainAName);
    const deployer = new Deployer();
    const communicator = await deployer.getDeployedChildCommunicatorByNetwork();
    // @ts-ignore
    const destLzChainId = hre.config.networks[chainBName].lzChainId;
    const messageFee = hre.ethers.utils.parseEther("0.05");
    const signers = await hre.ethers.getSigners();
    const signer = signer_ || signers[0].address;

    if (sourceTokenAsNative) {
      const tx = await communicator.addLiquidityETH(
        tokenB,
        destLzChainId,
        amountA,
        amountB,
        {
          value: hre.ethers.BigNumber.from(amountA).add(messageFee),
          gasLimit: 1500000,
        }
      );
      console.log(
        `addLiquidityETH tx is initialized with params: ${tokenB} ${destLzChainId} ${amountA} ${amountB}`
      );
    } else {
      const tx = await communicator.addLiquidity(
        tokenA,
        tokenB,
        destLzChainId,
        amountA,
        amountB,
        { value: messageFee, gasLimit: 1500000 }
      );
      console.log(
        `addLiquidity tx is initialized with params:${tokenA} ${tokenB} ${destLzChainId} ${amountA} ${amountB}`
      );
    }
  }
}
