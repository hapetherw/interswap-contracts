import hre, { ethers } from "hardhat";
import { Deployer } from "../Deployer";

export interface RemoveLiquidityParams {
  chainAName: string;
  chainBName: string;
  tokenA: string;
  tokenB: string;
  liquidity: string;
}

const pair: RemoveLiquidityParams = {
  chainAName: "bscTestnet",
  // @ts-ignore
  tokenA: hre.config.networks["bscTestnet"]["weth"],
  chainBName: "fuji",
  // @ts-ignore
  tokenB: hre.config.networks["fuji"]["weth"],
  liquidity: ethers.utils.parseEther("100").toString(),
};

export async function removeLiquidity(pair: RemoveLiquidityParams) {
  const { chainAName, chainBName, tokenA, tokenB, liquidity } = pair;
  const [signer] = await hre.ethers.getSigners();
  const signerAddr = signer.address;
  const deployer = new Deployer();

  const MasterLZCommunicator = await deployer.getDeployedMasterCommunicator();
  // @ts-ignore
  const chainBId = hre.config.networks[chainBName].lzChainId;
  // @ts-ignore
  const chainAId = hre.config.networks[chainAName].lzChainId;
  MasterLZCommunicator.removeLiquidity(
    tokenA,
    tokenB,
    chainAId,
    chainBId,
    liquidity,
    0,
    0,
    signerAddr,
    { from: signerAddr }
  );
}

if (require.main === module) {
  removeLiquidity(pair)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
