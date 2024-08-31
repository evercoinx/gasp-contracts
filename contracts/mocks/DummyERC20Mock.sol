// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DummyERC20Mock is Ownable, ERC20 {
    constructor(uint256 initialSupply) Ownable(msg.sender) ERC20("Dummy ERC20", "DERC20") {
        _mint(msg.sender, initialSupply);
    }

    function mint(uint256 amount) external onlyOwner {
        _mint(msg.sender, amount);
    }
}
