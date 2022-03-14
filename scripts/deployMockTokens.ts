import hre from "hardhat";
import { MockToken } from "../typechain-types";
import { Deployer } from "./Deployer";


export async function deployMockTokens() {
    const symbol = "USDC"
    const name = "Circle USD"
    const decimals = 6
    const user = "0x91A001A46D61E447E2E2b9E38C47d2B2DAD97252"
    const mintAmount = hre.ethers.utils.parseUnits("10000000", decimals)
    const childNetworks = ["bscTestnet", "fuji","rinkeby", "ropsten", "mumbai"]
    const deployer = new Deployer();
    const addresses = [];

    for (const network of childNetworks) {
        hre.changeNetwork(network);
        console.log(`Switched on ${network}`)
        const TokenMock = await deployer.deploy("MockToken", [name, symbol, decimals]);
        addresses.push({
            address: TokenMock.address,
            network
        });
        await TokenMock.mint(user, mintAmount)
        console.log('tokens minted');
    }

    console.log(addresses)
}

if (require.main === module) {
    deployMockTokens()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }
