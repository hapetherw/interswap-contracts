import hre, { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
const { BN } = require("@openzeppelin/test-helpers");
chai.use(solidity);
const { expect } = chai;
import { BigNumber } from "@ethersproject/bignumber";
import { AddLiquidityParams } from "../../scripts/Swapper";
import { Deployer } from "../../scripts/Deployer";
import { MaxUint256 } from "@ethersproject/constants";
import {
  InterswapFactory,
  InterswapPair,
  LayerZeroEndpointMock,
  MasterLZCommunicator,
  ChildLZCommunicator,
  MockToken,
  MockWeth,
  RouterMock,
} from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export const unlockAccount = async (address: string) => {
  await hre.network.provider.send("hardhat_impersonateAccount", [address]);
  return address;
};

function sleep(seconds: number) {
  console.log(`Waiting ${seconds} seconds`);
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

describe("Interswap", () => {
  let deployer: Deployer;
  let aliceAccount: SignerWithAddress,
    bobAccount: SignerWithAddress,
    samAccount: SignerWithAddress,
    alice: string,
    bob: string,
    sam: string;
  let TokenA: MockToken,
    TokenB: MockToken,
    TokenC: MockToken,
    WETHA: MockWeth,
    WETHB: MockWeth,
    Endpoint: LayerZeroEndpointMock,
    Factory: InterswapFactory,
    MasterLZCommunicator: MasterLZCommunicator,
    ChildLZCommunicatorA: ChildLZCommunicator,
    ChildLZCommunicatorB: ChildLZCommunicator;

  const lzIds = {
    masterchain: 1,
    chainA: 2,
    chainB: 3,
  };

  beforeEach(async function () {
    this.signers = await hre.ethers.getSigners();
    aliceAccount = this.signers[0];
    bobAccount = this.signers[1];
    samAccount = this.signers[2];
    alice = aliceAccount.address;
    bob = bobAccount.address;
    sam = samAccount.address;

    deployer = new Deployer();

    TokenA = (await deployer.deploy("MockToken", [
      "USDC",
      "USDC",
      18,
    ])) as MockToken;
    TokenB = (await deployer.deploy("MockToken", [
      "Bitcoin",
      "BTC",
      18,
    ])) as MockToken;
    TokenC = (await deployer.deploy("MockToken", [
      "USDT",
      "USDT",
      6,
    ])) as MockToken;
    WETHA = (await deployer.deploy("MockWeth", [
      "Wrapped BNB",
      "WBNB",
    ])) as MockWeth;
    WETHB = (await deployer.deploy("MockWeth", [
      "Wrapped AVAX",
      "WAVAX",
    ])) as MockWeth;

    Endpoint = (await deployer.deploy(
      "LayerZeroEndpointMock",
      []
    )) as LayerZeroEndpointMock;
    Factory = (await deployer.deploy(
      "InterswapFactory",
      []
    )) as InterswapFactory;
    MasterLZCommunicator = (await deployer.deploy("MasterLZCommunicator", [
      Endpoint.address,
      lzIds.masterchain,
      Factory.address,
    ])) as MasterLZCommunicator;

    ChildLZCommunicatorA = (await deployer.deploy("ChildLZCommunicator", [
      Endpoint.address,
      lzIds.chainA,
      WETHA.address,
      lzIds.masterchain,
    ])) as ChildLZCommunicator;
    ChildLZCommunicatorB = (await deployer.deploy("ChildLZCommunicator", [
      Endpoint.address,
      lzIds.chainB,
      WETHB.address,
      lzIds.masterchain,
    ])) as ChildLZCommunicator;

    await MasterLZCommunicator.setLzCommunications(
      [lzIds.masterchain, lzIds.chainA, lzIds.chainB],
      [
        MasterLZCommunicator.address,
        ChildLZCommunicatorA.address,
        ChildLZCommunicatorB.address,
      ]
    );
    await ChildLZCommunicatorA.setLzCommunications(
      [lzIds.masterchain, lzIds.chainA, lzIds.chainB],
      [
        MasterLZCommunicator.address,
        ChildLZCommunicatorA.address,
        ChildLZCommunicatorB.address,
      ]
    );
    await ChildLZCommunicatorB.setLzCommunications(
      [lzIds.masterchain, lzIds.chainA, lzIds.chainB],
      [
        MasterLZCommunicator.address,
        ChildLZCommunicatorA.address,
        ChildLZCommunicatorB.address,
      ]
    );

    await TokenA.mint(alice, ethers.utils.parseEther("10000000000"));
    await TokenB.mint(alice, ethers.utils.parseEther("10000000000"));
    await TokenC.mint(alice, ethers.utils.parseUnits("10000000000", 6));
    await TokenA.mint(bob, ethers.utils.parseEther("10000000000"));
    await TokenB.mint(bob, ethers.utils.parseEther("10000000000"));
    await TokenC.mint(bob, ethers.utils.parseUnits("10000000000", 6));

    await TokenA.connect(aliceAccount).approve(
      ChildLZCommunicatorA.address,
      MaxUint256
    );
    await TokenB.connect(aliceAccount).approve(
      ChildLZCommunicatorB.address,
      MaxUint256
    );
    await TokenC.connect(aliceAccount).approve(
      ChildLZCommunicatorB.address,
      MaxUint256
    );

    await TokenA.connect(bobAccount).approve(
      ChildLZCommunicatorA.address,
      MaxUint256
    );
    await TokenB.connect(bobAccount).approve(
      ChildLZCommunicatorB.address,
      MaxUint256
    );
    await TokenC.connect(bobAccount).approve(
      ChildLZCommunicatorB.address,
      MaxUint256
    );
  });

  describe("Smoke", async function () {
    it("Should successfully addLiquidity, swap and removeLiquidity", async function () {
      const tokenABalanceBefore = await TokenA.balanceOf(alice);
      const tokenBBalanceBefore = await TokenB.balanceOf(alice);

      const tokenAAmount = ethers.utils.parseEther("100");
      const tokenBAmount = ethers.utils.parseEther("5");
      await ChildLZCommunicatorA.connect(aliceAccount).addLiquidity(
        TokenA.address,
        TokenB.address,
        lzIds.chainB,
        tokenAAmount,
        tokenBAmount
      );

      const pairAddr = await Factory.getPair(
        TokenA.address,
        TokenB.address,
        lzIds.chainA,
        lzIds.chainB
      );
      const Pair = (await ethers.getContractAt(
        "InterswapPair",
        pairAddr
      )) as InterswapPair;
      const lpBalance = await Pair.balanceOf(alice);

      const tokenABalanceAfter = await TokenA.balanceOf(alice);
      const tokenBBalanceAfter = await TokenB.balanceOf(alice);

      expect(tokenABalanceAfter).eq(
        tokenABalanceBefore.sub(tokenAAmount),
        "tokenA balance mismatch"
      );
      expect(tokenBBalanceAfter).eq(
        tokenBBalanceBefore.sub(tokenBAmount),
        "tokenB balance mismatch"
      );
      expect(+lpBalance).gt(0);

      await ChildLZCommunicatorA.connect(aliceAccount).addLiquidity(
        TokenA.address,
        TokenB.address,
        lzIds.chainB,
        tokenAAmount,
        tokenBAmount
      );
      const lpBalanceAfter = await Pair.balanceOf(alice);
      expect(+lpBalanceAfter).gt(+lpBalance);

      const tokenAmount = ethers.utils.parseEther("1");

      const ABalanceBefore = await TokenA.balanceOf(bob);
      const BBalanceBefore = await TokenB.balanceOf(bob);
      const reservesBefore = await Pair.getReserves();
      await ChildLZCommunicatorA.connect(bobAccount).swapExactTokensForTokens(
        TokenA.address,
        TokenB.address,
        lzIds.chainB,
        tokenAmount
      );

      const ABalanceAfter = await TokenA.balanceOf(bob);
      const BBalanceAfter = await TokenB.balanceOf(bob);
      const reservesAfter = await Pair.getReserves();
      
      expect(ABalanceAfter).eq(ABalanceBefore.sub(tokenAmount), "amountIn mismatch");
      expect(BBalanceAfter).gt(BBalanceBefore, "amountOut mismatch");
      expect(reservesAfter[0].add(tokenAmount)).eq(reservesBefore[0], "tokenA reserves mismatch");
      expect(reservesAfter[1]).gt(reservesBefore[1], "tokenB reserves mismatch");

      await Pair.connect(aliceAccount).approve(MasterLZCommunicator.address, MaxUint256);
      await MasterLZCommunicator.connect(aliceAccount).removeLiquidity(TokenA.address, TokenB.address, lzIds.chainA, lzIds.chainB, lpBalanceAfter.div(2), 0, 0, alice);

      const lpBalanceAfterRemove = await Pair.balanceOf(alice);
      console.log(lpBalanceAfterRemove.toString(), "lpBalanceAfterRemove");
      console.log(lpBalanceAfter.toString(), "lpBalanceAfter");
      
      expect(lpBalanceAfter.sub(lpBalanceAfterRemove)).eq(lpBalanceAfter.div(2));
    });

  });
});
