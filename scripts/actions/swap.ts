import hre, { ethers } from "hardhat";
import { Deployer } from "../Deployer";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export interface SwapParams {
  sourceNetwork: string;
  destNetwork: string;
  sourceToken: string;
  destToken: string;
  amountIn: string;
}

const pair: SwapParams = {
  sourceNetwork: "bscTestnet",
  // @ts-ignore
  sourceToken: hre.config.networks["bscTestnet"]["weth"],
  destNetwork: "fuji",
  // @ts-ignore
  destToken: hre.config.networks["fuji"]["weth"],
  amountIn: ethers.utils.parseEther("100").toString()
}

export async function swap(pair: SwapParams) {
  const { sourceNetwork, destNetwork, sourceToken, destToken, amountIn } = pair;
  const [signer] = await hre.ethers.getSigners();
  const signerAddr = signer.address;
  const deployer = new Deployer();
  const networkName = hre.network.name;

  if (networkName !== sourceNetwork) {
    hre.changeNetwork(sourceNetwork);
  }

  const ChildLZCommunicator = await deployer.getDeployedChildCommunicatorByNetwork();
  // @ts-ignore
  const destChainId = hre.config.networks[destNetwork].lzChainId;

  // @ts-ignore
  const sourceTokenIsNative = sourceToken === hre.config.networks[sourceNetwork]["weth"];
  if (sourceTokenIsNative) {
    ChildLZCommunicator.swapExactETHForTokens(destToken, destChainId, amountIn, {from: signerAddr})
  } else {
    ChildLZCommunicator.swapExactTokensForTokens(sourceToken, destToken, destChainId, amountIn, {from: signerAddr})
  }
}

if (require.main === module) {
  swap(pair)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
