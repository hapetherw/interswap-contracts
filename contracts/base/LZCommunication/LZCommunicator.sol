// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.11;

import "../../interfaces/ILayerZeroEndpoint.sol";
import "../../interfaces/ILayerZeroReceiver.sol";
import "../../interfaces/IInterswapLock.sol";
import "../InterswapLock.sol";
import "hardhat/console.sol";

contract LZCommunicator {
    mapping(uint16 => address) public communicators;
    ILayerZeroEndpoint public Endpoint;
    address public governance;
    uint16 public immutable lzChainId;

    struct Payload {
        uint method;
        address tokenA;
        address tokenB;
        uint amountA;
        uint amountB;
        uint16 chainA;
        uint16 chainB;
        address user;
    }

    error NoCommunication(uint16 chainId);
    error NoPair();
    error WrongArguments();
    error ZeroAmount();
    error ZeroAddress();

    event CommunicatorChanged(uint16 chainId, address lzComm);
    event UnexpectedMethod(uint256 methodId);

    modifier onlyGovernance() {
        require(msg.sender == governance, "caller is not governance");
        _;
    }

    constructor(address _endpoint, uint16 _lzChainId) {
        if (_endpoint == address(0)) revert ZeroAddress();
        if (_lzChainId == 0) revert ZeroAmount();
        Endpoint = ILayerZeroEndpoint(_endpoint);
        governance = msg.sender;
        lzChainId = _lzChainId;
    }

    function setLzCommunications(
        uint16[] calldata _chainIds,
        address[] calldata _communicators
    ) external onlyGovernance {
        if (_chainIds.length != _communicators.length) revert WrongArguments();
        for (uint256 i = 0; i < _chainIds.length; i++) {
            communicators[_chainIds[i]] = _communicators[i];
            emit CommunicatorChanged(_chainIds[i], _communicators[i]);
        }
    }

    function _sendMessage(
        bytes memory payload,
        uint16 chainId,
        address refundAddress,
        uint messageFee
    ) internal {
        if (communicators[chainId] == address(0)) revert NoCommunication(chainId);
        bytes memory dstLzCommAddress = abi.encodePacked(communicators[chainId]);
        Endpoint.send{value: messageFee}(
            chainId,
            dstLzCommAddress,
            payload,
            payable(refundAddress),
            address(0x0),
            bytes("")
        );
    }

    function _packedBytesToAddr(bytes calldata _b)
        internal
        pure
        returns (address)
    {
        address addr;
        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, sub(_b.offset, 2), add(_b.length, 2))
            addr := mload(sub(ptr, 10))
        }
        return addr;
    }

    function _encodePayload(Payload memory _payload) internal pure returns(bytes memory) {
        bytes memory encoded =  abi.encode(
            _payload.method,
            _payload.tokenA,
            _payload.amountA,
            _payload.chainA,
            _payload.tokenB,
            _payload.amountB,
            _payload.chainB,
            _payload.user
        );
        return encoded;
    }
}
