import hre from "hardhat";
import {
  MasterLZCommunicator,
  ChildLZCommunicator
} from "../typechain-types";
import { saveJSON, loadCommunicators } from "./utils";

export class Deployer {

  constructor() {
    console.log(`Deployer is initialized`)
  }
  async deploy(
    contractName: string,
    args: any[]
  ): Promise<any> {
    const factory = await hre.ethers.getContractFactory(contractName);
    const [signer] = await hre.ethers.getSigners();
    const Contract = await factory.connect(signer).deploy(...args);
    await Contract.deployed();
    console.log(`Contract ${contractName} is deployed at: ${Contract.address}`);
    return Contract;
  }

  switchNetwork(network: string) {
    if (hre.network.name !== network) {
      hre.changeNetwork(network);
      console.log(`Deployer: switched on ${network}`);
    }
  }

  async deployMasterLZCommunicator(
    factory: string
  ): Promise<MasterLZCommunicator> {
    // @ts-ignore
    const masterchain = hre.config.masterchain;
    this.switchNetwork(masterchain);
    // @ts-ignore
    const {endpoint, lzChainId} = hre.config.networks[masterchain]
    console.log(endpoint, 'endpoint')
    console.log(lzChainId, 'lzChainId')
    const MasterLZCommunicator = await this.deploy(
      "MasterLZCommunicator",
      [endpoint, lzChainId, factory, {gasLimit: 5000000}]
    ); 

    let json: any = {};
    json["masterchain"] = {
      isMaster: true,
      address: MasterLZCommunicator.address,
      chanId: hre.network.config.chainId,
      lzChainId,
    };
    await saveJSON(json, "lz-communications");
    return MasterLZCommunicator;
  }

  async deployChildLZCommunicator(): Promise<ChildLZCommunicator> {
    const networkName = hre.network.name;
    // @ts-ignore
    const {endpoint, lzChainId, weth} = hre.config.networks[networkName]
    // @ts-ignore
    const masterchainId = hre.config.networks[hre.config.masterchain]["lzChainId"]

    console.log(
      `Deploying ChildLZCommunicator to ${networkName} with endpoint: ${endpoint} and masterchainId: ${masterchainId}`
    );
    const LzComm = await this.deploy(
      "ChildLZCommunicator",
      [endpoint, lzChainId, weth, masterchainId]
    );

    let json: any = {};
    json[networkName] = {
      address: LzComm.address,
      chanId: hre.network.config.chainId,
      lzChainId
    };
    await saveJSON(json, "lz-communications");
    return LzComm;
  }

  async getDeployedChildCommunicatorByNetwork(): Promise<ChildLZCommunicator> {
    const json = await loadCommunicators();
    const currentNetworkCommunicator = json[hre.network.name]
    if (!currentNetworkCommunicator) throw Error(`No Communicators for ${hre.network.name}`);
    const LZCommunicator = await hre.ethers.getContractAt("ChildLZCommunicator", currentNetworkCommunicator.address);
    return LZCommunicator as ChildLZCommunicator;
  }

  async getDeployedMasterCommunicator(): Promise<MasterLZCommunicator> {
    // @ts-ignore
    const masterchain = hre.config.masterchain;
    this.switchNetwork(masterchain);
    const json = await loadCommunicators();
    const LZCommunicator = await hre.ethers.getContractAt("MasterLZCommunicator", json["masterchain"].address);
    return LZCommunicator as MasterLZCommunicator;
  }
}
