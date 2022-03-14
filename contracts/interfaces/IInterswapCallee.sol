// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.11;

interface IInterswapCallee {
    function interswapCall(address sender, uint amount0, uint amount1, bytes calldata data) external;
}