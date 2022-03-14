// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.11;

import '../interfaces/IInterswapFactory.sol';
import './InterswapPair.sol';

contract InterswapFactory is IInterswapFactory {
    address public feeTo;
    address public feeToSetter;

    mapping(address => mapping(address => address)) public tokenPair;
    address[] public allPairs;
    mapping(uint => mapping(uint => address)) public chainPair;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint, uint chainA, uint chainB);

    constructor() {
        feeToSetter = msg.sender;
    }

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    function getPair(address tokenA, address tokenB, uint16 chainA, uint16 chainB) external view returns (address pair) {
        if(tokenPair[tokenA][tokenB] == chainPair[chainA][chainB]) {
            pair = tokenPair[tokenA][tokenB];
        } else {
            pair = address(0);
        }
    }

    function createPair(address tokenA, address tokenB, uint16 chainA, uint16 chainB) external returns (address pair) {
        require(tokenA != tokenB, 'Interswap: IDENTICAL_ADDRESSES');
        (address token0, address token1, uint16 chain0, uint16 chain1) = tokenA < tokenB ? (tokenA, tokenB, chainA, chainB) : (tokenB, tokenA, chainB, chainA);
        require(token0 != address(0), 'Interswap: ZERO_ADDRESS');
        require(tokenPair[token0][token1] == address(0), 'Interswap: PAIR_EXISTS'); // single check is sufficient
        bytes memory bytecode = type(InterswapPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1, chainA, chainB));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IInterswapPair(pair).initialize(token0, token1, chain0, chain1);
        tokenPair[token0][token1] = pair;
        tokenPair[token1][token0] = pair; // populate mapping in the reverse direction
        chainPair[chain0][chain1] = pair;
        chainPair[chain1][chain0] = pair;
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length, chainA, chainB);
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, 'Interswap: FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, 'Interswap: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }
}
