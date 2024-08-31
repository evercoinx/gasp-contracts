// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { ContextUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IGaspGame } from "./interfaces/IGaspGame.sol";

contract GaspGame is
    Initializable,
    UUPSUpgradeable,
    ContextUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    IGaspGame
{
    using SafeERC20 for IERC20;

    bytes32 public constant VERSION = "1.0.0";
    uint256 public constant CHALLENGE_TIME_FRAME = 10;

    uint256 public currentChallengeId;
    mapping(uint256 challengeId => Challenge challenge) public challenges;
    mapping(address token => uint256 poolReward) public tokenPoolRewards;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() external initializer {
        UUPSUpgradeable.__UUPSUpgradeable_init();
        ContextUpgradeable.__Context_init();
        AccessControlUpgradeable.__AccessControl_init();
        ReentrancyGuardUpgradeable.__ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function submitChallenge(uint256 number, address token, uint256 reward) external nonReentrant {
        if (number == 0) {
            revert ZeroNumber();
        }
        if (reward == 0) {
            revert ZeroReward();
        }

        uint256 _currentChallengeId = ++currentChallengeId;
        address challenger = _msgSender();

        challenges[_currentChallengeId] = Challenge({
            challenger: challenger,
            number: number,
            token: token,
            reward: reward,
            blockNumber: block.number,
            solved: false
        });
        emit ChallengeSubmitted(_currentChallengeId, challenger, number, token, reward, block.number);

        IERC20(token).safeTransferFrom(challenger, address(this), reward);
    }

    function solveChallenge(uint256 challengeId, uint256 proof) external nonReentrant {
        Challenge storage challenge = challenges[challengeId];
        if (challenge.number == 0) {
            revert ChallengeNotFound(challengeId);
        }
        if (challenge.solved) {
            revert ChallengeAlreadySolved(challengeId);
        }
        if (block.number > challenge.blockNumber + CHALLENGE_TIME_FRAME) {
            revert ChallengeAlreadyExpired(challengeId, block.number);
        }
        if (proof <= 1 || proof >= challenge.number || challenge.number % proof != 0) {
            revert InvalidChallengeProof(challengeId, proof);
        }

        challenge.solved = true;

        uint256 solverReward = challenge.reward / 2;
        uint256 poolReward = challenge.reward - solverReward;

        tokenPoolRewards[challenge.token] += poolReward;
        emit ChallengeSolved(challengeId, challenge.token, solverReward, poolReward);

        IERC20(challenge.token).safeTransfer(_msgSender(), solverReward);
    }

    function claimChallengeReward(uint256 challengeId) external nonReentrant {
        Challenge storage challenge = challenges[challengeId];
        if (challenge.number == 0) {
            revert ChallengeNotFound(challengeId);
        }
        if (challenge.solved) {
            revert ChallengeAlreadySolved(challengeId);
        }
        if (block.number <= challenge.blockNumber + CHALLENGE_TIME_FRAME) {
            revert ChallengeStillActive(challengeId, block.number);
        }

        uint256 poolReward = tokenPoolRewards[challenge.token] / 2;
        tokenPoolRewards[challenge.token] -= poolReward;

        uint256 challengerReward = challenge.reward + poolReward;
        emit ChallengeRewardClaimed(challengeId, challenge.token, challengerReward);

        IERC20(challenge.token).safeTransfer(challenge.challenger, challengerReward);
    }

    // solhint-disable-next-line no-empty-blocks
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
