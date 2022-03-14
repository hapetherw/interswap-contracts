import hre from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
const { BN } = require("@openzeppelin/test-helpers");
chai.use(solidity);
const { expect } = chai;
import { BigNumber } from "@ethersproject/bignumber";
import { swap, SwapParams } from "../scripts/actions/swap";
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

describe("Interswap - Add Liquidity With Native Token", () => {
  const initialParams: SwapParams = {
    sourceNetwork: "bscTestnet",
    // @ts-ignore
    sourceToken: "0x8301f2213c0eed49a7e28ae4c3e91722919b8b47", //hre.config.networks["bscTestnet"]["weth"],
    destNetwork: "fuji",
    // @ts-ignore
    destToken: hre.config.networks["fuji"]["weth"],
    amountIn: hre.ethers.utils.parseEther("1").toString(),
  };
  let signerAddress: string;

  async function changeNetwork(network: string) {
    hre.changeNetwork(network);
    console.log(`Test: Switched on ${network}`);
  }

  before(async function () {
    const [signer] = await hre.ethers.getSigners();
    signerAddress = signer.address;
    console.log(`Signer address: ${signerAddress}`);
  });

  it("Should successfully swap tokens according params", async function () {
    const { sourceToken, destToken, destNetwork, sourceNetwork, amountIn } = initialParams;
    const deployer = new Deployer();
    const MasterLZCommunicator = await deployer.getDeployedMasterCommunicator();
    const factory = await MasterLZCommunicator.factory();
    const Factory = (await hre.ethers.getContractAt(
      "InterswapFactory",
      factory
    )) as InterswapFactory;

    // @ts-ignore
    const chainA = hre.config.networks[sourceNetwork].lzChainId;
    // @ts-ignore
    const chainB = hre.config.networks[destNetwork].lzChainId;
    const pairAddr = await Factory.getPair(
      sourceToken,
      destToken,
      chainA,
      chainB
    );
    const Pair = (await hre.ethers.getContractAt(
      "InterswapPair",
      pairAddr
    )) as InterswapPair;
    const lpBalanceBefore = await Pair.balanceOf(signerAddress);
    const reservesBefore = await Pair.getReserves();
    console.log(lpBalanceBefore.toString(), "lpBalanceBefore");
    console.log(reservesBefore.toString(), "reservesBefore");

    changeNetwork(sourceNetwork);
    const SourceToken: Contract = await hre.ethers.getContractAt(
      "InterswapERC20",
      sourceToken
    );

    // @ts-ignore
    const sourceTokenIsNative = sourceToken === hre.config.networks[sourceNetwork]["weth"];
    // @ts-ignore
    const destTokenIsNative = destToken === hre.config.networks[destNetwork]["weth"];

    const tokenABalanceBefore = sourceTokenIsNative
      ? await SourceToken.balanceOf(signerAddress)
      : await hre.ethers.provider.getBalance(signerAddress);
    console.log(tokenABalanceBefore.toString(),"tokenABalanceBefore");

    changeNetwork(destNetwork);
    const DestToken: Contract = await hre.ethers.getContractAt(
      "InterswapERC20",
      destToken
    );
    const tokenBBalanceBefore = destTokenIsNative
      ? await DestToken.balanceOf(signerAddress)
      : await hre.ethers.provider.getBalance(signerAddress);
    console.log(tokenBBalanceBefore.toString(),"tokenBBalanceBefore");

    await swap(initialParams);
    await sleep(WAIT_L0_MESSAGE_SECONDS);

    changeNetwork(sourceNetwork);
    const tokenABalanceAfter = sourceTokenIsNative
      ? await SourceToken.balanceOf(signerAddress)
      : await hre.ethers.provider.getBalance(signerAddress);
    console.log(tokenABalanceAfter.toString(),"tokenABalanceAfter");

    changeNetwork(destNetwork);
    const tokenBBalanceAfter = sourceTokenIsNative
      ? await DestToken.balanceOf(signerAddress)
      : await hre.ethers.provider.getBalance(signerAddress);
    console.log(tokenBBalanceAfter.toString(),"tokenBBalanceAfter");

    expect(tokenABalanceBefore.sub(amountIn)).equal(tokenABalanceAfter);
    expect(tokenBBalanceBefore).to.be.lessThan(tokenBBalanceAfter)

    // @ts-ignore
    changeNetwork(hre.config.masterchain);
    const lpBalanceAfter = await Pair.balanceOf(signerAddress);
    const reservesAfter = await Pair.getReserves();

    expect(lpBalanceAfter).equals(lpBalanceBefore);
    console.log(reservesAfter, "reservesAfter");
  }).timeout(420000); // 7 min timeout
});
