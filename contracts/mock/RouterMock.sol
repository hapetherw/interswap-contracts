pragma solidity ^0.8.11;

contract RouterMock {
    address public addLiquiditytokenA;
    address public addLiquiditytokenB;
    uint16 public addLiquidityChainA;
    uint16 public addLiquidityChainB;
    uint256 public addLiquidityAmountADesired;
    uint256 public addLiquidityAamountBDesired;
    uint256 public addLiquidityAmountAMin;
    uint256 public addLiquidityAmountBMin;
    address public addLiquidityTo;
    uint256 public addLiquidityDeadline;
    uint256 public addLiquidityLastUpdated;

    address public masterLzComm;

    uint256 public amountIn;
    uint256 public amountOutMin;
    address[] public tokensPath;
    uint16[] public chainsPath;
    address public to;
    uint256 public deadline;
    uint256 public swapLastUpdate;

    constructor(address _masterLzComm) {
        masterLzComm = _masterLzComm;
    }

    modifier onlyMasterLzComm() {
        require(msg.sender == masterLzComm, "caller is not governance");
        _;
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint16 chainA,
        uint16 chainB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address _to,
        uint256 _deadline
    )
        external
        onlyMasterLzComm
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        addLiquiditytokenA = tokenA;
        addLiquiditytokenB = tokenB;
        addLiquidityChainA = chainA;
        addLiquidityChainB = chainB;
        addLiquidityAmountADesired = amountADesired;
        addLiquidityAamountBDesired = amountBDesired;
        addLiquidityAmountAMin = amountAMin;
        addLiquidityAmountBMin = amountBMin;
        addLiquidityTo = _to;
        addLiquidityDeadline = _deadline;
        addLiquidityLastUpdated = block.timestamp;
        return (amountADesired, amountBDesired, amountBDesired / 2);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint16 chainA,
        uint16 chainB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address user,
        address to,
        uint256 deadline
    ) external onlyMasterLzComm returns (uint256 amountA, uint256 amountB) {
        return (liquidity / 2, liquidity / 2);
    }

    function swapExactTokensForTokens(
        uint256 _amountIn,
        uint256 _amountOutMin,
        address[] calldata _tokensPath,
        uint16[] calldata _chainsPath,
        address _to,
        uint256 _deadline
    ) external onlyMasterLzComm returns (uint256[] memory) {
        amountIn = _amountIn;
        amountOutMin = _amountOutMin;
        tokensPath = _tokensPath;
        chainsPath = _chainsPath;
        to = _to;
        deadline = _deadline;
        swapLastUpdate = block.timestamp;
        uint256[] memory amounts;
        amounts = new uint256[](2);
        amounts[0] = _amountIn;
        amounts[1] = _amountIn;
        return amounts;
    }
}
