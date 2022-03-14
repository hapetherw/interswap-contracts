// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.11;

interface IInterswapLock {
    function lock(uint amount, address user) external;
    function unlock(uint amount, address user) external;
    function unlockETH(uint amount, address user) external;
}
