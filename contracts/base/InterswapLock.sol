// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.11;

import '../libraries/TransferHelper.sol';
import '../interfaces/IERC20.sol';
import "../interfaces/IWETH.sol";

contract InterswapLock {
    event Lock(uint amount, address user);
    event Unlock(uint amount, address user);

    error ZeroAddress();

    address public token;
    address public lzComm;
    address public admin;

    constructor(address _token, address _admin) {
        if (_token == address(0) || _admin == address(0)) revert ZeroAddress();
        token = _token;
        admin = _admin;
        lzComm = msg.sender;
    }

    modifier onlyLzComm() {
        require(msg.sender == lzComm, 'InterswapLock: caller is not lzComm');
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, 'InterswapLock: caller is not admin');
        _;
    }

    function lock(uint amount, address user) external onlyLzComm {
        emit Lock(amount, user);
    }

    function unlock(uint amount, address user) external onlyLzComm {
        if (amount > 0) {
            TransferHelper.safeTransfer(token, user, amount);
            emit Unlock(amount, user);
        }
    }

    function unlockETH(uint amount, address user) external onlyLzComm {
        if (amount > 0) {
            IWETH(token).withdraw(amount);
            TransferHelper.safeTransferETH(user, amount);
            emit Unlock(amount, user);
        }
    }

    function salvageToken(address _token, address _recipient) external onlyAdmin {
        if (_recipient == address(0)) revert ZeroAddress();
        if (_token != token) {
            uint balance = IERC20(_token).balanceOf(address(this));
            if (balance > 0) {
                TransferHelper.safeTransfer(_token, _recipient, balance);
            }
        }
    }

    function salvageNative(address _recipient) external onlyAdmin {
        if (_recipient == address(0)) revert ZeroAddress();
        uint balance = payable(address(this)).balance;
        if (balance > 0) {
            (bool success, ) = _recipient.call{value:balance}("");
            require(success, "Transfer failed");
        }
    }
}