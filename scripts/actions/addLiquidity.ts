import hre, { ethers } from "hardhat";
import { Deployer } from "../Deployer";
import { loadCommunicators } from "../utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { AddLiquidityParams, Swapper } from "../Swapper";
import mockTokens from "../../addresses/mock-tokens";

function sleep(seconds: number) {
  console.log(`Waiting ${seconds} seconds`);
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

const pairs: AddLiquidityParams[] = [
  {
    chainAName: "bscTestnet",
    // @ts-ignore
    tokenA: mockTokens.USDC.bscTestnet,
    chainBName: "fuji",
    tokenB: mockTokens.USDT.fuji,
    amountA: ethers.utils.parseUnits("100000", 6).toString(),
    amountB: ethers.utils.parseUnits("100000", 18).toString(),
    skipPreDeployment: true,
    sourceTokenAsNative: false
  },
];

export async function addLiquidity(pairs: AddLiquidityParams[]) {
  const swapper = new Swapper();
  // @ts-ignore
  const masterchain = hre.config.masterchain;
  const networkName = hre.network.name;
  if (networkName !== masterchain) {
    swapper.changeNetwork(masterchain);
  }
  const [signer] = await hre.ethers.getSigners();
  console.log(signer.address, "signer");
  const governance = signer.address;
  const deployer = new Deployer();

  for (const pair of pairs) {
    const { chainAName, chainBName, tokenA, tokenB, amountA, amountB, sourceTokenAsNative } = pair;
    // @ts-ignore
    const destTokenIsNative = tokenB === hre.config.networks[chainBName]["weth"];
    if (!sourceTokenAsNative) {
      await swapper.enableToken(tokenA, chainAName, amountA);
    }

    if (destTokenIsNative) {
      await swapper.wrapNativeToken(chainBName, amountB);
    }
    //await approveToken(destToken, destNetwork, amountDestDesired);

    swapper.changeNetwork(chainAName);
    const ChildLZCommunicator =
      await deployer.getDeployedChildCommunicatorByNetwork();
    // @ts-ignore
    const destLzChainId = hre.config.networks[chainBName].lzChainId;
    const messageFee = hre.ethers.utils.parseEther("0.05");

    if (sourceTokenAsNative) {
      const tx = await ChildLZCommunicator.addLiquidityETH(
        tokenB,
        destLzChainId,
        amountA,
        amountB,
        {
          from: governance,
          value: hre.ethers.BigNumber.from(amountA).add(messageFee),
          gasLimit: 1500000,
        }
      );
      console.log(
        `addLiquidityETH tx is initialized with params: ${tokenB} ${destLzChainId} ${amountA} ${amountB}`
      );
    } else {
      const tx = await ChildLZCommunicator.addLiquidity(
        tokenA,
        tokenB,
        destLzChainId,
        amountA,
        amountB,
        { from: governance, value: messageFee, gasLimit: 1500000 }
      );
      console.log(
        `addLiquidity tx is initialized with params:${tokenA} ${tokenB} ${destLzChainId} ${amountA} ${amountB}`
      );
    }
    await sleep(10)
  }
}

if (require.main === module) {
  addLiquidity(pairs)
    .then(() => process.exit(0))
    .catch((err) => console.error(err));
}
