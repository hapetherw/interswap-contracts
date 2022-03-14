import hre from "hardhat";
import { Deployer } from "./Deployer";
import {setupCommunicators} from "./setupCommunicators";

function sleep(seconds: number) {
    console.log(`Waiting ${seconds} seconds`);
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

export async function deployAll() {
    const childNetworks = ["bscTestnet", "fuji", "rinkeby", "mumbai"]

    // @ts-ignore
    const masterchain = hre.config.masterchain;
    hre.changeNetwork(masterchain);
    console.log(`Switched on ${masterchain}`)
    const deployer = new Deployer();
    const Factory = await deployer.deploy("InterswapFactory", []);
    await sleep(2);
    const MasterLzComm = await deployer.deployMasterLZCommunicator(Factory.address);

    for (const network of childNetworks) {
        hre.changeNetwork(network);
        console.log(`Switched on ${network}`)
        await deployer.deployChildLZCommunicator();
        await sleep(2);
    }

    for (const network of childNetworks.concat(masterchain)) {
        hre.changeNetwork(network);
        console.log(`Switched on ${network}`)
        await setupCommunicators();
        await sleep(2);
    }

}

if (require.main === module) {
    deployAll()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }
