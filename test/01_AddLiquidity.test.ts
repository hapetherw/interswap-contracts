import hre from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
const { BN } = require("@openzeppelin/test-helpers");
chai.use(solidity);
const { expect } = chai;
import { BigNumber } from "@ethersproject/bignumber";
import { Swapper, AddLiquidityParams } from "../scripts/Swapper";
import { Deployer } from "../scripts/Deployer";
import { Contract } from "@ethersproject/contracts";
import {
  InterswapFactory,
  InterswapPair,
  RouterMock,
} from "../typechain-types";

export const ether = (amount: number | string): BigNumber => {
  const weiString = hre.ethers.utils.parseEther(amount.toString());
  return BigNumber.from(weiString);
};

export const unlockAccount = async (address: string) => {
  await hre.network.provider.send("hardhat_impersonateAccount", [address]);
  return address;
};

function sleep(seconds: number) {
  console.log(`Waiting ${seconds} seconds`);
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

const WAIT_L0_MESSAGE_SECONDS = 90;

describe("Interswap - Add Liquidity With Native Token", () => {
  const initialParams: AddLiquidityParams = {
    chainAName: "bscTestnet",
    // @ts-ignore
    tokenA: "0x8301f2213c0eed49a7e28ae4c3e91722919b8b47", //hre.config.networks["bscTestnet"]["weth"],
    chainBName: "fuji",
    // @ts-ignore
    tokenB: hre.config.networks["fuji"]["weth"],
    amountA: hre.ethers.utils.parseEther("0.1").toString(),
    amountB: hre.ethers.utils.parseEther("0.001").toString(),
    skipPreDeployment: false,
    sourceTokenAsNative: false,
  };
  let signerAddress: string;
  let deployer: Deployer;
  let swapper: Swapper;

  async function changeNetwork(network: string) {
    if (hre.network.name !== network) {
      hre.changeNetwork(network);
      console.log(`Test: Switched on ${network}`);
    }
  }

  before(async function () {
    const [signer] = await hre.ethers.getSigners();
    signerAddress = signer.address;
    console.log(`Signer address: ${signerAddress}`);
    deployer = new Deployer();
    swapper = new Swapper();
  });

  it("Should successfully addLiquidity according params", async function () {
    const {
      tokenA,
      tokenB,
      chainBName,
      chainAName,
      amountA,
      amountB,
      skipPreDeployment,
      sourceTokenAsNative,
    } = initialParams;
    // @ts-ignore
    const masterchain = hre.config.masterchain;
    changeNetwork(masterchain);
    const MasterLZCommunicator = await deployer.getDeployedMasterCommunicator();
    const factory = await MasterLZCommunicator.factory();
    const Factory = (await hre.ethers.getContractAt(
      "InterswapFactory",
      factory
    )) as InterswapFactory;

    if (!skipPreDeployment) {
      await swapper.preDeployments([initialParams]);
    }
    // @ts-ignore
    const chainA = hre.config.networks[chainAName].lzChainId;
    // @ts-ignore
    const chainB = hre.config.networks[chainBName].lzChainId;

    changeNetwork(masterchain);
    await sleep(10);
    const pairAddr = await Factory.getPair(tokenA, tokenB, chainA, chainB);
    console.log(pairAddr, "pairAddr");
    const Pair = (await hre.ethers.getContractAt(
      "InterswapPair",
      pairAddr
    )) as InterswapPair;
    const lpBalanceBefore = await Pair.balanceOf(signerAddress);
    const reservesBefore = await Pair.getReserves();

    changeNetwork(chainBName);
    // @ts-ignore
    if (tokenB === hre.config.networks[chainBName]["weth"]) await swapper.wrapNativeToken(chainBName, amountB);
    //await sleep(5);
    const DestToken: Contract = await hre.ethers.getContractAt(
      "InterswapERC20",
      tokenB
    );
    const destTokenBalanceBefore = await DestToken.balanceOf(signerAddress);
    await swapper.enableToken(tokenB, chainBName, amountB);
    const comm = await deployer.getDeployedChildCommunicatorByNetwork();
    const masterReceiveContract = await comm.communicators("10001");
    console.log(masterReceiveContract, "masterReceiveContract")

    changeNetwork(chainAName);
    const SourceToken: Contract = await hre.ethers.getContractAt(
      "InterswapERC20",
      tokenA
    );
    const sourceTokenBalanceBefore = sourceTokenAsNative
      ? await hre.ethers.provider.getBalance(signerAddress)
      : await SourceToken.balanceOf(signerAddress);
    if (!sourceTokenAsNative) await swapper.enableToken(tokenA, chainAName, amountA);

    await swapper.addLiquidity(initialParams, signerAddress);
    await sleep(WAIT_L0_MESSAGE_SECONDS);

    changeNetwork(chainAName);
    const sourceTokenBalanceAfter = sourceTokenAsNative
      ? await hre.ethers.provider.getBalance(signerAddress)
      : await SourceToken.balanceOf(signerAddress);

    changeNetwork(chainBName);
    const destTokenBalanceAfter = await DestToken.balanceOf(signerAddress);
    
    changeNetwork(masterchain);
    const lpBalanceAfter = await Pair.balanceOf(signerAddress);
    const reservesAfter = await Pair.getReserves();

    console.log(sourceTokenBalanceBefore.toString(),"sourceTokenBalanceBefore");
    console.log(destTokenBalanceBefore.toString(), "destTokenBalanceBefore");
    console.log(lpBalanceBefore.toString(), "lpBalanceBefore");
    console.log(reservesBefore.toString(), "reservesBefore");
    console.log("");
    console.log(sourceTokenBalanceAfter.toString(), "sourceTokenBalanceAfter");
    console.log(destTokenBalanceAfter.toString(), "destTokenBalanceAfter");
    console.log(lpBalanceAfter.toString(), "lpBalanceAfter");
    console.log(reservesAfter.toString(), "reservesAfter");
  }).timeout(420000); // 7 min timeout
});
