import hre from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
const { BN } = require("@openzeppelin/test-helpers");
chai.use(solidity);
const { expect } = chai;
import { BigNumber } from "@ethersproject/bignumber";
import {
  removeLiquidity,
  RemoveLiquidityParams,
} from "../scripts/actions/removeLiquidity";
import { Deployer } from "../scripts/Deployer";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "@ethersproject/contracts";
import { InterswapFactory, InterswapPair } from "../typechain-types";

export const ether = (amount: number | string): BigNumber => {
  const weiString = hre.ethers.utils.parseEther(amount.toString());
  return BigNumber.from(weiString);
};

export const unlockAccount = async (address: string) => {
  await hre.network.provider.send("hardhat_impersonateAccount", [address]);
  return address;
};

function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

const WAIT_L0_MESSAGE_SECONDS = 5;

describe("Interswap - Remove Liquidity", () => {
  const initialParams: RemoveLiquidityParams = {
    chainAName: "bscTestnet",
    chainBName: "fuji",
    liquidity: hre.ethers.utils.parseEther("1").toString(),
    // @ts-ignore
    tokenA: "0x8301f2213c0eed49a7e28ae4c3e91722919b8b47", //hre.config.networks["bscTestnet"]["weth"],
    // @ts-ignore
    tokenB: hre.config.networks["fuji"]["weth"],
  };
  let signerAddress: string;
  let Signer: SignerWithAddress;

  async function changeNetwork(network: string) {
    hre.changeNetwork(network);
    Signer = (await hre.ethers.getSigners())[0];
    console.log(`Test: Switched on ${network}`);
  }

  before(async function () {
    const [signer] = await hre.ethers.getSigners();
    signerAddress = signer.address;
    console.log(`Signer address: ${signerAddress}`);
    Signer = signer;
  });

  it("Should successfully removeLiquidity according params", async function () {
    const { tokenA, tokenB, chainAName, chainBName } = initialParams;
    // @ts-ignore
    changeNetwork(hre.config.masterchain);
    const deployer = new Deployer();
    const MasterLZCommunicator = await deployer.getDeployedMasterCommunicator();
    const factory = await MasterLZCommunicator.factory();
    const Factory = (await hre.ethers.getContractAt(
      "InterswapFactory",
      factory
    )) as InterswapFactory;

    // @ts-ignore
    const chainAId = hre.config.networks[chainAName].lzChainId;
    // @ts-ignore
    const chainBId = hre.config.networks[chainBName].lzChainId;
    const pairAddr = await Factory.getPair(tokenA, tokenB, chainAId, chainBId);
    const Pair = (await hre.ethers.getContractAt(
      "InterswapPair",
      pairAddr
    )) as InterswapPair;
    const lpBalanceBefore = await Pair.balanceOf(signerAddress);
    const reservesBefore = await Pair.getReserves();
    console.log(lpBalanceBefore.toString(), "lpBalanceBefore");
    console.log(reservesBefore.toString(), "reservesBefore");

    changeNetwork(chainAName);
    // @ts-ignore
    const tokenAIsNative = tokenA === hre.config.networks[chainAName]["weth"];
    // @ts-ignore
    const tokenBIsNative = tokenA === hre.config.networks[chainBName]["weth"];
    const TokenA: Contract = await hre.ethers.getContractAt(
      "InterswapERC20",
      tokenA
    );
    const tokenABalanceBefore = tokenAIsNative
      ? await TokenA.balanceOf(signerAddress)
      : await hre.ethers.provider.getBalance(signerAddress);
    console.log(tokenABalanceBefore.toString(),"tokenABalanceBefore");
    
    
    changeNetwork(chainBName);
    const TokenB: Contract = await hre.ethers.getContractAt(
      "InterswapERC20",
      tokenB
    );
    const tokenBBalanceBefore = tokenBIsNative
      ? await TokenB.balanceOf(signerAddress)
      : await hre.ethers.provider.getBalance(signerAddress);

    console.log(tokenBBalanceBefore.toString(), "tokenBBalanceBefore");
    await removeLiquidity(initialParams);
    await sleep(WAIT_L0_MESSAGE_SECONDS);(initialParams);
    
    changeNetwork(chainAName);
    const tokenABalanceAfter = tokenAIsNative
      ? await TokenA.balanceOf(signerAddress)
      : await hre.ethers.provider.getBalance(signerAddress);
    console.log(tokenABalanceAfter.toString(),"tokenABalanceAfter");

    changeNetwork(chainBName);
    const tokenBBalanceAfter = tokenBIsNative
      ? await TokenB.balanceOf(signerAddress)
      : await hre.ethers.provider.getBalance(signerAddress);
      console.log(tokenBBalanceAfter.toString(),"tokenABalanceAfter");

    // @ts-ignore
    changeNetwork(hre.config.masterchain);
    const lpBalanceAfter = await Pair.balanceOf(signerAddress);
    const reservesAfter = await Pair.getReserves();

    expect(lpBalanceAfter).to.be.greaterThan(lpBalanceBefore);
    expect(tokenABalanceAfter).to.be.greaterThan(tokenABalanceBefore);
    expect(tokenBBalanceAfter).to.be.greaterThan(tokenBBalanceBefore);
    console.log(reservesAfter, "reservesAfter");
  }).timeout(420000); // 7 min timeout
});
