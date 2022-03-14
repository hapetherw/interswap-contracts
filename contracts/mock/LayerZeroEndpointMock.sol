pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../interfaces/ILayerZeroReceiver.sol";
import "../interfaces/ILayerZeroEndpoint.sol";

// mocked LayerZero endpoint to facilitate same chain testing of two UserApplications
contract LayerZeroEndpointMock is ILayerZeroEndpoint {

    mapping(uint16 => mapping(address => uint64)) public nonceMap;

    constructor(){}

    // send() is the primary function of this mock contract. 
    //   its really the only reason you will use this contract in local testing.
    //
    // The user application on chain A (the source, or "from" chain) sends a message
    // to the communicator. It includes the following information:
    //      _chainId            - the destination chain identifier
    //      _destination        - the destination chain address (in bytes)
    //      _payload            - the custom data to send. ie: you could use abi.encode() to pack some bytes into this argument
    //      _refundAddress      - address to send remainder funds to
    //      _zroPaymentAddress  - 0x0, if set to an address, that is the address LayerZero token will be paid from
    //      txParameters        - optional data passed to the relayer via getPrices()
    function send(
        uint16 _chainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata txParameters
    ) override external payable {

        address destAddr = packedBytesToAddr(_destination);
        uint64 nonce;
        {
            nonce = nonceMap[_chainId][destAddr]++;
        }

        bytes memory bytesSourceUserApplicationAddr = addrToPackedBytes(address(msg.sender)); // cast this address to bytes
        ILayerZeroReceiver(destAddr).lzReceive(_chainId, bytesSourceUserApplicationAddr, nonce, _payload); // invoke lzReceive
    }

    // send() helper function
    function packedBytesToAddr(bytes calldata _b) public view returns (address){
        address addr;
        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, sub(_b.offset, 2 ), add(_b.length, 2))
            addr := mload(sub(ptr,10))
        }
        return addr;
    }

    // send() helper function
    function addrToPackedBytes(address _a) public view returns (bytes memory){
        bytes memory data = abi.encodePacked(_a);
        return data;
    }

    // override from ILayerZeroEndpoint
    function estimateFees(
        uint16 _chainId,
        address userApplication,
        bytes calldata _payload,
        bool payInZRO,
        bytes calldata txParameters
    ) override view external returns(uint totalFee) {
        return 0;
    }

}