// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.11;

import '../interfaces/IInterswapPair.sol';
import '../base/InterswapPair.sol';
import "hardhat/console.sol";

library InterswapLibrary {

    struct Tokens {
        address tokenA;
        address tokenB; 
        uint16 chainA;
        uint16 chainB;
    }

    // returns sorted token addresses, used to handle return values from pairs sorted in this order
    function sortTokens(Tokens memory tokens) internal pure returns (address token0, address token1, uint16 chain0, uint16 chain1) {
        require(tokens.tokenA != tokens.tokenB, 'InterswapLibrary: IDENTICAL_ADDRESSES');
        (token0, token1, chain0, chain1) = tokens.tokenA < tokens.tokenB ? (tokens.tokenA, tokens.tokenB, tokens.chainA, tokens.chainB) : (tokens.tokenB, tokens.tokenA, tokens.chainB, tokens.chainA);
        require(token0 != address(0), 'InterswapLibrary: ZERO_ADDRESS');
    }

    // calculates the CREATE2 address for a pair without making any external calls
    function pairFor(address factory, Tokens memory tokens) internal pure returns (address pair) {
        (address token0, address token1, uint16 chain0, uint16 chain1) = sortTokens(tokens);
        pair = address(uint160(uint256(keccak256(abi.encodePacked(
                hex'ff',
                factory,
                keccak256(abi.encodePacked(token0, token1, chain0, chain1)),
                keccak256(abi.encodePacked(type(InterswapPair).creationCode))
            )))));
    }

    // fetches and sorts the reserves for a pair
    function getReserves(address factory, Tokens memory tokens) internal view returns (uint112 reserveA, uint112 reserveB) {
        (address token0, , , ) = sortTokens(tokens);
        (uint112 reserve0, uint112 reserve1, ) = IInterswapPair(pairFor(factory, tokens)).getReserves();
        (reserveA, reserveB) = tokens.tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    // given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
    function quote(uint amountA, uint112 reserveA, uint112 reserveB) internal pure returns (uint amountB) {
        require(amountA > 0, 'InterswapLibrary: INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'InterswapLibrary: INSUFFICIENT_LIQUIDITY');
        amountB = amountA * reserveB / reserveA;
    }

    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(uint amountIn, uint112 reserveIn, uint112 reserveOut) internal pure returns (uint amountOut) {
        require(amountIn > 0, 'InterswapLibrary: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'InterswapLibrary: INSUFFICIENT_LIQUIDITY');
        uint amountInWithFee = amountIn * 997;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function currentBlockTimestamp() internal view returns (uint32) {
        return uint32(block.timestamp % 2 ** 32);
    }

    function currentPairPrices(
        address pair
    ) internal view returns (uint price0Average, uint price1Average) {
        uint32 blockTimestamp = currentBlockTimestamp();

        (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) = IInterswapPair(pair).getReserves();
        if (blockTimestampLast != blockTimestamp) {
            uint32 timeElapsed = blockTimestamp - blockTimestampLast;
            if (timeElapsed > 0 && reserve0 != 0 && reserve1 != 0) {
                price0Average = uint((uint224(reserve1) * 2**112) / uint224(reserve0)) / timeElapsed;
                price1Average = uint((uint224(reserve0) * 2**112) / uint224(reserve1)) / timeElapsed;
            }
        }
    }    
}
