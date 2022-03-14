import hre from "hardhat";
import { CounterMock } from "../typechain-types";
import { Deployer } from "./Deployer";
import {setupCommunicators} from "./setupCommunicators";


export async function deployMock() {
    const childNetworks = ["bscTestnet", "fuji"]
    const deployer = new Deployer();
    const addresses = [];

    for (const network of childNetworks) {
        hre.changeNetwork(network);
        console.log(`Switched on ${network}`)
        // @ts-ignore
        const endpoint = hre.config.networks[network].endpoint
        console.log(endpoint);
        const CounterMock = await deployer.deploy("CounterMock", [endpoint]);
        addresses.push(CounterMock.address);
    }

    hre.changeNetwork(childNetworks[0]);
    const Contract = await hre.ethers.getContractAt("CounterMock", addresses[0]);

    // @ts-ignore
    const destChainId = hre.config.networks[childNetworks[1]].lzChainId;
    console.log(destChainId, 'destChainId');
    await Contract.incrementCounter(destChainId, addresses[1], {value: hre.ethers.utils.parseEther("0.03")})
}

if (require.main === module) {
    deployMock()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }
