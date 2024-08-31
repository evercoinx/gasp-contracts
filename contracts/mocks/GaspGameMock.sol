// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { GaspGame } from "../GaspGame.sol";

contract GaspGameMock is GaspGame {
    uint256 public value;

    event ValueSet(uint256 value);

    function setValue(uint256 value_) external {
        value = value_;
        emit ValueSet(value_);
    }
}
