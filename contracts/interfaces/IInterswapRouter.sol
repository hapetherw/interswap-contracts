// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.11;

interface IInterswapRouter {
    // Mini version
    function factory() external view returns (address);
    function masterLzComm() external view returns (address);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint16 chainA,
        uint16 chainB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint16 chainA,
        uint16 chainB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address user,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB);

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata tokensPath,
        uint16[] calldata chainsPath,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}