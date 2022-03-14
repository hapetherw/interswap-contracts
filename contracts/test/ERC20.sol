// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.11;

import '../base/InterswapERC20.sol';

contract ERC20 is InterswapERC20 {
    constructor(uint _totalSupply) {
        _mint(msg.sender, _totalSupply);
    }
}
