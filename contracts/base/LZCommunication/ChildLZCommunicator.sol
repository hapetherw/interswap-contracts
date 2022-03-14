// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.11;

import "../../interfaces/ILayerZeroEndpoint.sol";
import "../../interfaces/ILayerZeroReceiver.sol";
import "../../interfaces/IInterswapLock.sol";
import "../../interfaces/IWETH.sol";
import "../InterswapLock.sol";
import "./LZCommunicator.sol";


contract ChildLZCommunicator is ILayerZeroReceiver, LZCommunicator {
    mapping(address => address) public lockContracts;
    uint16 public masterChainId;
    address public immutable WETH;

    constructor(
        address _endpoint,
        uint16 _lzChainId,
        address _weth,
        uint16 _masterChainId
    ) LZCommunicator(_endpoint, _lzChainId) {
        if (_weth == address(0)) revert ZeroAddress();
        WETH = _weth;
        masterChainId = _masterChainId;
    }

    // overrides lzReceive function in ILayerZeroReceiver.
    // automatically invoked on the receiving chain after the source chain calls endpoint.send(...)
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

        // // 1 - swap, 2 - addLiquidity, 3 - removeLiquidity
        if (method == 1) {
            address lockAddress = lockContracts[tokenB];
            if (lockAddress == address(0)) revert NoPair();
            if (tokenB == WETH) {
                IInterswapLock(lockAddress).unlockETH(amountB, user);
            } else {
                IInterswapLock(lockAddress).unlock(amountB, user);
            }
            
        } else if (method == 2) {
            address lockAddress = lockContracts[tokenB];
            if (lockAddress == address(0))
                lockAddress = _deployLockContract(tokenB);
            TransferHelper.safeTransferFrom(tokenB, user, lockAddress, amountB);
            IInterswapLock(lockAddress).lock(amountB, user);
            {
                bytes calldata scopedPayload = _payload;
                uint messageFee = Endpoint.estimateFees(masterChainId, address(this), scopedPayload, false, bytes(""));
                require(address(this).balance >= messageFee, "gas is over on communicator");
                _sendMessage(scopedPayload, masterChainId, msg.sender, messageFee);
            }
        } else if (method == 3) {
            uint amountOut;
            address tokenOut;
            if (chainA == lzChainId) {
                amountOut = amountA;
                tokenOut = tokenA;
            } else {
                amountOut = amountB;
                tokenOut = tokenB;
            }
            address lockAddress = lockContracts[tokenOut];
            if (lockAddress == address(0)) revert NoPair();
            if (tokenOut == WETH) {
                IInterswapLock(lockAddress).unlockETH(amountOut, user);
            } else {
                IInterswapLock(lockAddress).unlock(amountOut, user);
            }
        } else {
            emit UnexpectedMethod(method);
        }
    }

    function swapExactTokensForTokens(
        address sourceToken,
        address destToken,
        uint16 destChain,
        uint256 amountIn
    ) external payable {
        if (amountIn == 0) revert ZeroAmount();
        address lockAddress = lockContracts[sourceToken];
        if (lockAddress == address(0)) revert NoPair();
        TransferHelper.safeTransferFrom(
            sourceToken,
            msg.sender,
            lockAddress,
            amountIn
        );
        IInterswapLock(lockAddress).lock(amountIn, msg.sender);

        Payload memory payload;
        payload.method = 1;
        payload.chainA = lzChainId;
        payload.chainB = destChain;
        payload.tokenA = sourceToken;
        payload.tokenB = destToken;
        payload.amountA = amountIn;
        payload.amountB = 0;
        payload.user = msg.sender;

        _sendMessage(_encodePayload(payload), masterChainId, msg.sender, msg.value);
    }

    function swapExactETHForTokens(
        address destToken,
        uint16 destChain,
        uint256 amountETH
    ) external payable {
        if (amountETH == 0) revert ZeroAmount();
        address lockAddress = lockContracts[WETH];
        if (lockAddress == address(0)) revert NoPair();
        IWETH(WETH).deposit{value: amountETH}();
        assert(IWETH(WETH).transfer(lockAddress, amountETH));
        IInterswapLock(lockAddress).lock(amountETH, msg.sender);

        Payload memory payload;
        payload.method = 1;
        payload.chainA = lzChainId;
        payload.chainB = destChain;
        payload.tokenA = WETH;
        payload.tokenB = destToken;
        payload.amountA = amountETH;
        payload.amountB = 0;
        payload.user = msg.sender;

        bytes memory encodedPayload = _encodePayload(payload);
        uint messageFee = Endpoint.estimateFees(destChain, address(this), encodedPayload, false, bytes(""));
        require(msg.value >= amountETH + messageFee, "not enough msg.value to cover messageFee and amountETH");
        _sendMessage(encodedPayload, destChain, msg.sender, messageFee);
    }

    function addLiquidity(
        address sourceToken,
        address destToken,
        uint16 destChain,
        uint256 amountSourceDesired,
        uint256 amountDestDesired
    ) external payable {
        if (amountSourceDesired == 0 || amountDestDesired == 0)
            revert ZeroAmount();
        address lockAddress = lockContracts[sourceToken];
        if (lockAddress == address(0)) {
            lockAddress = _deployLockContract(sourceToken);
        }

        TransferHelper.safeTransferFrom(
            sourceToken,
            msg.sender,
            lockAddress,
            amountSourceDesired
        );
        IInterswapLock(lockAddress).lock(amountSourceDesired, msg.sender);

        Payload memory payload;
        payload.method = 2;
        payload.chainA = lzChainId;
        payload.chainB = destChain;
        payload.tokenA = sourceToken;
        payload.tokenB = destToken;
        payload.amountA = amountSourceDesired;
        payload.amountB = amountDestDesired;
        payload.user = msg.sender;

        _sendMessage(_encodePayload(payload), destChain, msg.sender, msg.value);
    }

    function addLiquidityETH(
        address destToken,
        uint16 destChain,
        uint256 amountETH,
        uint256 amountDestDesired
    ) external payable {
        if (amountETH == 0 || amountDestDesired == 0)
            revert ZeroAmount();
        address lockAddress = lockContracts[WETH];
        if (lockAddress == address(0)) {
            lockAddress = _deployLockContract(WETH);
        }

        IWETH(WETH).deposit{value: amountETH}();
        assert(IWETH(WETH).transfer(lockAddress, amountETH));
        IInterswapLock(lockAddress).lock(amountETH, msg.sender);

        Payload memory payload;
        payload.method = 2;
        payload.chainA = lzChainId;
        payload.chainB = destChain;
        payload.tokenA = WETH;
        payload.tokenB = destToken;
        payload.amountA = amountETH;
        payload.amountB = amountDestDesired;
        payload.user = msg.sender;

        bytes memory encodedPayload = _encodePayload(payload);
        uint messageFee = Endpoint.estimateFees(destChain, address(this), encodedPayload, false, bytes(""));
        require(msg.value >= amountETH + messageFee, "not enough msg.value to cover messageFee and amountETH");
        _sendMessage(encodedPayload, destChain, msg.sender, messageFee);
    }

    function deployLockContract(address _token) public returns(address) {
        address lockAddress = lockContracts[_token];
        if (lockAddress == address(0)) {
            lockAddress = _deployLockContract(WETH);
        }
        return lockAddress;
    }

    function _deployLockContract(address _token) internal returns (address) {
        address deployedLockAddress;
        bytes memory bytecode = abi.encodePacked(
            type(InterswapLock).creationCode,
            abi.encode(_token, governance)
        );
        // TODO: not sure here, check if salt is ok and enough
        bytes32 salt = keccak256(abi.encodePacked(_token));
        assembly {
            deployedLockAddress := create2(
                0,
                add(bytecode, 32),
                mload(bytecode),
                salt
            )
            if iszero(extcodesize(deployedLockAddress)) {
                revert(0, 0)
            }
        }
        lockContracts[_token] = deployedLockAddress;
        return deployedLockAddress;
    }

    function setLockContract(address _token, address _lockContract)
        external
        onlyGovernance
    {
        if (_lockContract == address(0)) revert ZeroAddress();
        lockContracts[_token] = _lockContract;
    }

    function setMasterChain(uint16 _masterChainId) external onlyGovernance {
        require(
            _masterChainId > 0 && _masterChainId != masterChainId,
            "wrong or old masterchainId"
        );
        masterChainId = _masterChainId;
    }

    receive() external payable {}
}
