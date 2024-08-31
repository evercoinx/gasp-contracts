// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

interface IGaspGame {
    struct Challenge {
        address challenger;
        uint256 number;
        address token;
        uint256 reward;
        uint256 blockNumber;
        bool solved;
    }

    event ChallengeSubmitted(
        uint256 indexed challengeId,
        address indexed challenger,
        uint256 number,
        address indexed token,
        uint256 reward,
        uint256 blockNumber
    );

    event ChallengeSolved(uint256 indexed challengeId, address indexed token, uint256 solverReward, uint256 poolReward);

    event ChallengeRewardClaimed(uint256 indexed challengeId, address indexed token, uint256 challengerReward);

    error ZeroNumber();

    error ZeroReward();

    error ChallengeNotFound(uint256 challengeId);

    error ChallengeAlreadySolved(uint256 challengeId);

    error ChallengeAlreadyExpired(uint256 challengeId, uint256 blockNumber);

    error ChallengeStillActive(uint256 challengeId, uint256 blockNumber);

    error InvalidChallengeProof(uint256 challengeId, uint256 proof);
}
