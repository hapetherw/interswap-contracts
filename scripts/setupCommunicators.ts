import hre, { ethers } from "hardhat"
import {loadCommunicators} from "./utils";

export async function setupCommunicators() {
    const signers = await hre.ethers.getSigners();
    const governance = signers[0].address;
    console.log(`governance: ${governance}`);
    const json = await loadCommunicators();
    const lzChainIds = []
    const communicators = []
    // @ts-ignore
    const masterchain = hre.config.masterchain;
    const currentNetworkCommunicator = hre.network.name === masterchain ? json.masterchain : json[hre.network.name]
    if (!currentNetworkCommunicator) throw Error(`No Communicators for ${hre.network.name}`);
    
    const contractName = currentNetworkCommunicator.isMaster ? "MasterLZCommunicator" : "ChildLZCommunicator";
    const LZCommunicator = await ethers.getContractAt(contractName, currentNetworkCommunicator.address);

    for (const key of Object.keys(json)) {
        lzChainIds.push(json[key].lzChainId);
        communicators.push(json[key].address);
    }

    await LZCommunicator.setLzCommunications(lzChainIds, communicators, {from: governance})   
    console.log(`Communications are setted up for ${currentNetworkCommunicator.address}`) 
}

if (require.main === module) {
  setupCommunicators()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
