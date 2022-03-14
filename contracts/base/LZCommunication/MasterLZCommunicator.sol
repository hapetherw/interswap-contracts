// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.11;

import "../../interfaces/ILayerZeroEndpoint.sol";
import "../../interfaces/ILayerZeroReceiver.sol";
import "../../interfaces/IInterswapFactory.sol";
import "../../interfaces/IInterswapPair.sol";
import "../../libraries/InterswapLibrary.sol";
import "./LZCommunicator.sol";
import "hardhat/console.sol";

contract MasterLZCommunicator is ILayerZeroReceiver, LZCommunicator {
    address public immutable factory;

    constructor(address _endpoint, uint16 _lzChainId, address _factory) LZCommunicator(_endpoint, _lzChainId) {
        if (_factory == address(0)) revert ZeroAddress();
        factory = _factory;
    }

    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _fromAddress,
        uint64,
        bytes calldata _payload
    ) external override {
        require(msg.sender == address(Endpoint));
        address fromAddress = _packedBytesToAddr(_fromAddress);
        // require(
        //     fromAddress == communicators[_srcChainId],
        //     "unauthorized source contract"
        // );

        (
            uint256 method,
            address tokenA,
            uint256 amountA,
            uint16 chainA,
            address tokenB,
            uint256 amountB,
            uint16 chainB,
            address user
        ) = abi.decode(
                _payload,
                (
                    uint256,
                    address,
                    uint256,
                    uint16,
                    address,
                    uint256,
                    uint16,
                    address
                )
            );

        // 1 - swap, 2 - addLiquidity
        if (method == 1) {
            uint256 amountToBeUnlocked = _swapExactTokensForTokens(
                amountA,
                tokenA,
                tokenB,
                chainA,
                chainB,
                user
            );
            console.log(amountToBeUnlocked, "amountToBeUnlocked");
            require(amountToBeUnlocked > 0, "amountToBeUnlocked is 0");

            Payload memory payload;
            payload.method = method;
            payload.chainA = chainA;
            payload.chainB = chainB;
            payload.tokenA = tokenA;
            payload.tokenB = tokenB;
            payload.amountA = amountA;
            payload.amountB = amountToBeUnlocked;
            payload.user = user;

            bytes memory encodedPayload = _encodePayload(payload);
            uint messageFee = Endpoint.estimateFees(chainB, address(this), encodedPayload, false, bytes(""));
            require(address(this).balance >= messageFee, "gas is over on communicator");
            _sendMessage(encodedPayload, chainB, msg.sender, messageFee);
        } else if (method == 2) {
            InterswapLibrary.Tokens memory tokens;
            tokens.tokenA = tokenA;
            tokens.tokenB = tokenB;
            tokens.chainA = chainA;
            tokens.chainB = chainB;
            (amountA, amountB) = _addLiquidity(tokens, amountA, amountB, 0, 0);
            address pair = InterswapLibrary.pairFor(factory, tokens);
            IInterswapPair(pair).mint(user, amountA, amountB);
        } else {
            emit UnexpectedMethod(method);
        }
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint16 chainA,
        uint16 chainB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to
    ) external payable returns (uint256 amountA, uint256 amountB) {
        InterswapLibrary.Tokens memory tokens;
        tokens.tokenA = tokenA;
        tokens.tokenB = tokenB;
        tokens.chainA = chainA;
        tokens.chainB = chainB;
        address pair = InterswapLibrary.pairFor(factory, tokens);
        IInterswapERC20(pair).transferFrom(msg.sender, pair, liquidity); // send liquidity to pair
        (uint256 amount0, uint256 amount1) = IInterswapPair(pair).burn(to);
        (address token0, , , ) = InterswapLibrary.sortTokens(tokens);
        (amountA, amountB) = tokens.tokenA == token0
            ? (amount0, amount1)
            : (amount1, amount0);
        require(amountA >= amountAMin, "INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "INSUFFICIENT_B_AMOUNT");

        bytes memory payload = abi.encode(
            3,
            tokens.tokenA,
            amountA,
            tokens.chainA,
            tokens.tokenB,
            amountB,
            tokens.chainB,
            msg.sender
        );
        console.log(chainA, "chainA");
        _sendMessage(payload, chainA, msg.sender, msg.value / 2);
        _sendMessage(payload, chainB, msg.sender, msg.value / 2);
    }

    /* 
    // internal functions
    */

    function _addLiquidity(
        InterswapLibrary.Tokens memory tokens,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal returns (uint256 amountA, uint256 amountB) {
        // create the pair if it doesn't exist yet
        if (
            IInterswapFactory(factory).getPair(
                tokens.tokenA,
                tokens.tokenB,
                tokens.chainA,
                tokens.chainB
            ) == address(0)
        ) {
            IInterswapFactory(factory).createPair(
                tokens.tokenA,
                tokens.tokenB,
                tokens.chainA,
                tokens.chainB
            );
        }

        (uint112 reserveA, uint112 reserveB) = InterswapLibrary.getReserves(
            factory,
            tokens
        );
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = InterswapLibrary.quote(
                amountADesired,
                reserveA,
                reserveB
            );
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "INSUFFICIENT_B_AMOUNT");
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = InterswapLibrary.quote(
                    amountBDesired,
                    reserveB,
                    reserveA
                );
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, "INSUFFICIENT_A_AMOUNT");
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    // TODO:
    function _swapExactTokensForTokens(
        uint256 _amountIn,
        address _tokenIn,
        address _tokenOut,
        uint16 _chainIn,
        uint16 _chainOut,
        address _to
    ) internal returns (uint256) {
        InterswapLibrary.Tokens memory tokens;
        tokens.tokenA = _tokenIn;
        tokens.tokenB = _tokenOut;
        tokens.chainA = _chainIn;
        tokens.chainB = _chainOut;
        IInterswapPair Pair = IInterswapPair(InterswapLibrary.pairFor(factory, tokens));
        (uint112 reserveIn, uint112 reserveOut, ) = Pair.getReserves();
        uint256 amountOut = InterswapLibrary.getAmountOut(_amountIn, reserveIn, reserveOut);
        Pair.swap(_tokenIn, _amountIn, amountOut, _to);
        return amountOut;
    }

    function hasTokenPair(
        address tokenA,
        address tokenB,
        uint16 chainA,
        uint16 chainB
    ) external view returns (bool status) {
        InterswapLibrary.Tokens memory tokens;
        tokens.tokenA = tokenA;
        tokens.tokenB = tokenB;
        tokens.chainA = chainA;
        tokens.chainB = chainB;
        if (IInterswapFactory(factory).getPair(
                tokens.tokenA,
                tokens.tokenB,
                tokens.chainA,
                tokens.chainB
            ) != address(0)) {
            status = true;
        } else {
            status = false;
        }
    }

    function getSwapPrice(
        address tokenA,
        address tokenB,
        uint16 chainA,
        uint16 chainB
    ) external view returns (uint price0Average, uint price1Average) {
        InterswapLibrary.Tokens memory tokens;
        tokens.tokenA = tokenA;
        tokens.tokenB = tokenB;
        tokens.chainA = chainA;
        tokens.chainB = chainB;
        require(IInterswapFactory(factory).getPair(
                tokens.tokenA,
                tokens.tokenB,
                tokens.chainA,
                tokens.chainB
            ) != address(0), "No pair existed");
        address pair = InterswapLibrary.pairFor(factory, tokens);
        (price0Average, price1Average) = InterswapLibrary.currentPairPrices(pair);
    }
    
}
