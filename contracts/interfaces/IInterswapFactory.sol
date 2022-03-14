// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.11;

interface IInterswapFactory {
    function feeTo() external view returns (address);
    function feeToSetter() external view returns (address);

    function getPair(address tokenA, address tokenB, uint16 chainA, uint16 chainB) external view returns (address pair);
    function allPairs(uint) external view returns (address pair);
    function allPairsLength() external view returns (uint);

    function createPair(address tokenA, address tokenB, uint16 chainA, uint16 chainB) external returns (address pair);
    function setFeeTo(address) external;
    function setFeeToSetter(address) external;
}
