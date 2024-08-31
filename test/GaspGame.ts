import { loadFixture, mine } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { GaspGame } from "../typechain-types";
import { generateRandomAddress } from "../utils/account";

describe("GaspGame", function () {
    const version = ethers.encodeBytes32String("1.0.0");
    const challengeTimeFrame = 10n;
    const challengeNumbers = [21n, 42n];
    const challengeProofs = [
        [3n, 7n],
        [2n, 6n, 7n, 21n],
    ];
    const challengeReward = ethers.parseUnits("100", 18);

    async function deployFixture() {
        const [deployer, challenger, solver] = await ethers.getSigners();

        const DummyERC20Mock = await ethers.getContractFactory("DummyERC20Mock");
        const dummyERC20Mock = await DummyERC20Mock.deploy(ethers.parseUnits("10000", 18));
        const dummyERC20MockAddress = await dummyERC20Mock.getAddress();

        const GaspGame = await ethers.getContractFactory("GaspGame");
        const gaspGame = await upgrades.deployProxy(GaspGame, [], {
            kind: "uups",
        });
        const gaspGameAddress = await gaspGame.getAddress();

        await dummyERC20Mock.connect(deployer).transfer(challenger.address, challengeReward * 2n);
        const defaultAdminRole = await gaspGame.DEFAULT_ADMIN_ROLE();

        return {
            gaspGame,
            gaspGameAddress,
            dummyERC20Mock,
            dummyERC20MockAddress,
            deployer,
            challenger,
            solver,
            defaultAdminRole,
        };
    }

    describe("Deploy the contract", function () {
        describe("Negative", function () {
            it("Should revert with the right error if reinitialized", async function () {
                const { gaspGame } = await loadFixture(deployFixture);

                const promise = gaspGame.initialize();
                await expect(promise)
                    .to.be.revertedWithCustomError(gaspGame, "InvalidInitialization")
                    .withArgs();
            });
        });

        describe("Positive", function () {
            it("Should return the right version", async function () {
                const { gaspGame } = await loadFixture(deployFixture);

                const currentVersion: string = await gaspGame.VERSION();
                expect(currentVersion).to.equal(version);
            });

            it("Should return the right challenge time frame", async function () {
                const { gaspGame } = await loadFixture(deployFixture);

                const currentChallengeTimeFrame: bigint = await gaspGame.CHALLENGE_TIME_FRAME();
                expect(currentChallengeTimeFrame).to.equal(challengeTimeFrame);
            });

            it("Should return the right current challenge id", async function () {
                const { gaspGame } = await loadFixture(deployFixture);

                const currentChallengeId: bigint = await gaspGame.currentChallengeId();
                expect(currentChallengeId).to.equal(0n);
            });
        });
    });

    describe("Upgrade the contract", function () {
        describe("Negative", function () {
            it("Should revert with the right error if called by a non admin", async function () {
                const { gaspGame, gaspGameAddress, challenger, defaultAdminRole } =
                    await loadFixture(deployFixture);

                const GaspGameMock = await ethers.getContractFactory("GaspGameMock", challenger);

                const promise = upgrades.upgradeProxy(gaspGameAddress, GaspGameMock);
                await expect(promise)
                    .to.revertedWithCustomError(gaspGame, "AccessControlUnauthorizedAccount")
                    .withArgs(challenger.address, defaultAdminRole);
            });
        });

        describe("Positive", function () {
            it("Should return a new address if upgraded to the new implementation", async function () {
                const { gaspGameAddress } = await loadFixture(deployFixture);

                const initialImplementationAddress: string =
                    await upgrades.erc1967.getImplementationAddress(gaspGameAddress);

                const GaspGameMock = await ethers.getContractFactory("GaspGameMock");
                await upgrades.upgradeProxy(gaspGameAddress, GaspGameMock);

                const currentImplementationAddress: string =
                    await upgrades.erc1967.getImplementationAddress(gaspGameAddress);
                expect(currentImplementationAddress).to.be.properAddress;
                expect(initialImplementationAddress).not.to.equal(currentImplementationAddress);
            });

            it("Should return the same address if upgraded to the same implementation", async function () {
                const { gaspGameAddress } = await loadFixture(deployFixture);

                const initialImplementationAddress: string =
                    await upgrades.erc1967.getImplementationAddress(gaspGameAddress);

                const GaspGame = await ethers.getContractFactory("GaspGame");
                await upgrades.upgradeProxy(gaspGameAddress, GaspGame);

                const currentImplementationAddress: string =
                    await upgrades.erc1967.getImplementationAddress(gaspGameAddress);
                expect(currentImplementationAddress).to.be.properAddress;
                expect(currentImplementationAddress).to.equal(initialImplementationAddress);
            });
        });
    });

    describe("Fallback", function () {
        describe("Negative", function () {
            it("Should revert without a reason if calling a non existing method", async function () {
                const { gaspGameAddress, challenger } = await loadFixture(deployFixture);
                const iface = new ethers.Interface(["function foo(uint256)"]);

                const promise = challenger.sendTransaction({
                    to: gaspGameAddress,
                    data: iface.encodeFunctionData("foo", [1n]),
                });
                await expect(promise).to.be.revertedWithoutReason();
            });

            it("Should revert without a reason if sending arbitrary data", async function () {
                const { gaspGameAddress, challenger } = await loadFixture(deployFixture);

                const promise = challenger.sendTransaction({
                    to: gaspGameAddress,
                    data: "0x01",
                });
                await expect(promise).to.be.revertedWithoutReason();
            });

            it("Should revert without a reason if sending a native amount", async function () {
                const { gaspGameAddress, challenger } = await loadFixture(deployFixture);

                const promise = challenger.sendTransaction({
                    to: gaspGameAddress,
                    value: 1n,
                });
                await expect(promise).to.be.revertedWithoutReason();
            });

            it("Should revert without a reason if sending no native amount", async function () {
                const { gaspGameAddress, challenger } = await loadFixture(deployFixture);

                const promise = challenger.sendTransaction({
                    to: gaspGameAddress,
                });
                await expect(promise).to.be.revertedWithoutReason();
            });
        });
    });

    describe("Sumbit a challenge", function () {
        describe("Negative", function () {
            it("Should revert with the right error if passing the zero number", async function () {
                const { gaspGame, dummyERC20MockAddress, challenger } =
                    await loadFixture(deployFixture);

                const promise = (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    0n,
                    dummyERC20MockAddress,
                    challengeReward
                );
                await expect(promise)
                    .to.be.revertedWithCustomError(gaspGame, "ZeroNumber")
                    .withArgs();
            });

            it("Should revert with the right error if passing the zero reward", async function () {
                const { gaspGame, challenger, dummyERC20MockAddress } =
                    await loadFixture(deployFixture);

                const promise = (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    0n
                );
                await expect(promise)
                    .to.be.revertedWithCustomError(gaspGame, "ZeroReward")
                    .withArgs();
            });

            it("Should revert with the right error if passing a non existing token", async function () {
                const { gaspGame, challenger } = await loadFixture(deployFixture);

                const nonExistingTokenAddress = generateRandomAddress(ethers);

                const promise = (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    nonExistingTokenAddress,
                    challengeReward
                );
                await expect(promise)
                    .to.be.revertedWithCustomError(gaspGame, "AddressEmptyCode")
                    .withArgs(nonExistingTokenAddress);
            });
        });

        describe("Positive", function () {
            it("Should emit the ChallengeSubmitted event", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock.connect(challenger).approve(gaspGameAddress, challengeReward);

                const promise = (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );
                await expect(promise)
                    .to.emit(gaspGame, "ChallengeSubmitted")
                    .withArgs(
                        1n,
                        challenger.address,
                        challengeNumbers[0],
                        dummyERC20MockAddress,
                        challengeReward,
                        anyValue
                    );
            });

            it("Should return the right token balances", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock.connect(challenger).approve(gaspGameAddress, challengeReward);

                const promise = (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );
                await expect(promise).to.changeTokenBalances(
                    dummyERC20Mock,
                    [gaspGame, challenger],
                    [challengeReward, -challengeReward]
                );
            });

            it("Should return the right token pool reward", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock.connect(challenger).approve(gaspGameAddress, challengeReward);

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );

                const currentTokenPoolReward: bigint =
                    await gaspGame.tokenPoolRewards(dummyERC20MockAddress);
                expect(currentTokenPoolReward).to.equal(0n);
            });
        });
    });

    describe("Solve a challenge", function () {
        describe("Negative", function () {
            it("Should revert with the right error if having no challenge submitted", async function () {
                const { gaspGame, solver } = await loadFixture(deployFixture);

                const currentChallengeId = 1n;

                const promise = (gaspGame.connect(solver) as GaspGame).solveChallenge(
                    currentChallengeId,
                    challengeProofs[0][0]
                );
                await expect(promise)
                    .to.be.revertedWithCustomError(gaspGame, "ChallengeNotFound")
                    .withArgs(currentChallengeId);
            });

            it("Should revert with the right error if solving the challenge twice", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                    solver,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock.connect(challenger).approve(gaspGameAddress, challengeReward);

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );

                const currentChallengeId: bigint = await gaspGame.currentChallengeId();

                await (gaspGame.connect(solver) as GaspGame).solveChallenge(
                    currentChallengeId,
                    challengeProofs[0][0]
                );

                const promise = (gaspGame.connect(solver) as GaspGame).solveChallenge(
                    currentChallengeId,
                    challengeProofs[0][1]
                );
                await expect(promise)
                    .to.be.revertedWithCustomError(gaspGame, "ChallengeAlreadySolved")
                    .withArgs(currentChallengeId);
            });

            it("Should revert with the right error if having the challenge expired", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                    solver,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock.connect(challenger).approve(gaspGameAddress, challengeReward);

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );
                const currentChallengeId: bigint = await gaspGame.currentChallengeId();

                await mine(10n);

                const promise = (gaspGame.connect(solver) as GaspGame).solveChallenge(
                    currentChallengeId,
                    challengeProofs[0][0]
                );
                await expect(promise)
                    .to.be.revertedWithCustomError(gaspGame, "ChallengeAlreadyExpired")
                    .withArgs(currentChallengeId, anyValue);
            });

            it("Should revert with the right error if providing the proof equal to 1", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                    solver,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock.connect(challenger).approve(gaspGameAddress, challengeReward);

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );
                const currentChallengeId: bigint = await gaspGame.currentChallengeId();
                const proof = 1n;

                const promise = (gaspGame.connect(solver) as GaspGame).solveChallenge(
                    currentChallengeId,
                    proof
                );
                await expect(promise)
                    .to.be.revertedWithCustomError(gaspGame, "InvalidChallengeProof")
                    .withArgs(currentChallengeId, proof);
            });

            it("Should revert with the right error if providing the proof equal to the challenge number itself", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                    solver,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock.connect(challenger).approve(gaspGameAddress, challengeReward);

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );
                const currentChallengeId: bigint = await gaspGame.currentChallengeId();
                const proof = challengeNumbers[0];

                const promise = (gaspGame.connect(solver) as GaspGame).solveChallenge(
                    currentChallengeId,
                    proof
                );
                await expect(promise)
                    .to.be.revertedWithCustomError(gaspGame, "InvalidChallengeProof")
                    .withArgs(currentChallengeId, proof);
            });

            it("Should revert with the right error if providing an invalid proof", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                    solver,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock.connect(challenger).approve(gaspGameAddress, challengeReward);

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );
                const currentChallengeId: bigint = await gaspGame.currentChallengeId();
                const proof = 2n;

                const promise = (gaspGame.connect(solver) as GaspGame).solveChallenge(
                    currentChallengeId,
                    proof
                );
                await expect(promise)
                    .to.be.revertedWithCustomError(gaspGame, "InvalidChallengeProof")
                    .withArgs(currentChallengeId, proof);
            });
        });

        describe("Positive", function () {
            it("Should emit the ChallengeSolved event for the first acceptable proof", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                    solver,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock.connect(challenger).approve(gaspGameAddress, challengeReward);

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );
                const currentChallengeId: bigint = await gaspGame.currentChallengeId();

                await mine(challengeTimeFrame - 1n);

                const promise = (gaspGame.connect(solver) as GaspGame).solveChallenge(
                    currentChallengeId,
                    challengeProofs[0][0]
                );
                await expect(promise)
                    .to.emit(gaspGame, "ChallengeSolved")
                    .withArgs(
                        currentChallengeId,
                        dummyERC20MockAddress,
                        challengeReward / 2n,
                        challengeReward / 2n
                    );
            });

            it("Should emit the ChallengeSolved event for the second acceptable proof", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                    solver,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock.connect(challenger).approve(gaspGameAddress, challengeReward);

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );
                const currentChallengeId: bigint = await gaspGame.currentChallengeId();

                await mine(challengeTimeFrame - 1n);

                const promise = (gaspGame.connect(solver) as GaspGame).solveChallenge(
                    currentChallengeId,
                    challengeProofs[0][1]
                );
                await expect(promise)
                    .to.emit(gaspGame, "ChallengeSolved")
                    .withArgs(
                        currentChallengeId,
                        dummyERC20MockAddress,
                        challengeReward / 2n,
                        challengeReward / 2n
                    );
            });

            it("Should return the right token balances", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                    solver,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock.connect(challenger).approve(gaspGameAddress, challengeReward);

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );

                const currentChallengeId: bigint = await gaspGame.currentChallengeId();

                const promise = (gaspGame.connect(solver) as GaspGame).solveChallenge(
                    currentChallengeId,
                    challengeProofs[0][0]
                );
                await expect(promise).to.changeTokenBalances(
                    dummyERC20Mock,
                    [gaspGame, challenger, solver],
                    [-(challengeReward / 2n), 0n, challengeReward / 2n]
                );
            });

            it("Should return the right token pool reward", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                    solver,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock.connect(challenger).approve(gaspGameAddress, challengeReward);

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );

                const currentChallengeId: bigint = await gaspGame.currentChallengeId();

                await (gaspGame.connect(solver) as GaspGame).solveChallenge(
                    currentChallengeId,
                    challengeProofs[0][0]
                );

                const currentTokenPoolReward: bigint =
                    await gaspGame.tokenPoolRewards(dummyERC20MockAddress);
                expect(currentTokenPoolReward).to.equal(challengeReward / 2n);
            });
        });
    });

    describe("Claim a reward", function () {
        describe("Negative", function () {
            it("Should revert with the right error if having no challenge submitted", async function () {
                const { gaspGame, challenger } = await loadFixture(deployFixture);

                const currentChallengeId = 1n;

                const promise = (gaspGame.connect(challenger) as GaspGame).claimChallengeReward(
                    currentChallengeId
                );
                await expect(promise)
                    .to.be.revertedWithCustomError(gaspGame, "ChallengeNotFound")
                    .withArgs(currentChallengeId);
            });

            it("Should revert with the right error if having a solved challenge", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                    solver,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock.connect(challenger).approve(gaspGameAddress, challengeReward);

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );
                const currentChallengeId: bigint = await gaspGame.currentChallengeId();

                await (gaspGame.connect(solver) as GaspGame).solveChallenge(
                    currentChallengeId,
                    challengeProofs[0][0]
                );

                await mine(challengeTimeFrame);

                const promise = (gaspGame.connect(challenger) as GaspGame).claimChallengeReward(
                    currentChallengeId
                );
                await expect(promise)
                    .to.be.revertedWithCustomError(gaspGame, "ChallengeAlreadySolved")
                    .withArgs(currentChallengeId);
            });

            it("Should revert with the right error if having a challenge active", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock.connect(challenger).approve(gaspGameAddress, challengeReward);

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );
                const currentChallengeId: bigint = await gaspGame.currentChallengeId();

                await mine(challengeTimeFrame - 1n);

                const promise = (gaspGame.connect(challenger) as GaspGame).claimChallengeReward(
                    currentChallengeId
                );
                await expect(promise)
                    .to.be.revertedWithCustomError(gaspGame, "ChallengeStillActive")
                    .withArgs(currentChallengeId, anyValue);
            });
        });

        describe("Positive", function () {
            describe("For a single pool", function () {
                it("Should emit the RewardClaimed event", async function () {
                    const {
                        gaspGame,
                        gaspGameAddress,
                        dummyERC20Mock,
                        dummyERC20MockAddress,
                        challenger,
                    } = await loadFixture(deployFixture);

                    await dummyERC20Mock
                        .connect(challenger)
                        .approve(gaspGameAddress, challengeReward);

                    await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                        challengeNumbers[0],
                        dummyERC20MockAddress,
                        challengeReward
                    );
                    const currentChallengeId: bigint = await gaspGame.currentChallengeId();

                    await mine(challengeTimeFrame);

                    const promise = (gaspGame.connect(challenger) as GaspGame).claimChallengeReward(
                        currentChallengeId
                    );
                    await expect(promise)
                        .to.emit(gaspGame, "ChallengeRewardClaimed")
                        .withArgs(currentChallengeId, dummyERC20MockAddress, challengeReward);
                });

                it("Should return the right token balances", async function () {
                    const {
                        gaspGame,
                        gaspGameAddress,
                        dummyERC20Mock,
                        dummyERC20MockAddress,
                        challenger,
                        solver,
                    } = await loadFixture(deployFixture);

                    await dummyERC20Mock
                        .connect(challenger)
                        .approve(gaspGameAddress, challengeReward);

                    await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                        challengeNumbers[0],
                        dummyERC20MockAddress,
                        challengeReward
                    );
                    const currentChallengeId: bigint = await gaspGame.currentChallengeId();
                    const totalReward = challengeReward + 0n;

                    await mine(challengeTimeFrame);

                    const promise = (gaspGame.connect(challenger) as GaspGame).claimChallengeReward(
                        currentChallengeId
                    );
                    await expect(promise).to.changeTokenBalances(
                        dummyERC20Mock,
                        [gaspGame, challenger, solver],
                        [-totalReward, totalReward, 0n]
                    );
                });

                it("Should return the right token pool reward", async function () {
                    const {
                        gaspGame,
                        gaspGameAddress,
                        dummyERC20Mock,
                        dummyERC20MockAddress,
                        challenger,
                    } = await loadFixture(deployFixture);

                    await dummyERC20Mock
                        .connect(challenger)
                        .approve(gaspGameAddress, challengeReward);

                    await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                        challengeNumbers[0],
                        dummyERC20MockAddress,
                        challengeReward
                    );
                    const currentChallengeId: bigint = await gaspGame.currentChallengeId();

                    await mine(challengeTimeFrame);

                    await (gaspGame.connect(challenger) as GaspGame).claimChallengeReward(
                        currentChallengeId
                    );
                    const currentTokenPoolReward: bigint =
                        await gaspGame.tokenPoolRewards(dummyERC20MockAddress);
                    expect(currentTokenPoolReward).to.equal(0n);
                });
            });
        });

        describe("For multiple pools", function () {
            it("Should emit the RewardClaimed event", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                    solver,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock
                    .connect(challenger)
                    .approve(gaspGameAddress, challengeReward * 2n);

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );

                const currentChallengeId: bigint = await gaspGame.currentChallengeId();
                await (gaspGame.connect(solver) as GaspGame).solveChallenge(
                    currentChallengeId,
                    challengeProofs[0][0]
                );

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[1],
                    dummyERC20MockAddress,
                    challengeReward
                );
                const nextChallengeId: bigint = await gaspGame.currentChallengeId();

                await mine(challengeTimeFrame);

                const promise = (gaspGame.connect(challenger) as GaspGame).claimChallengeReward(
                    nextChallengeId
                );
                await expect(promise)
                    .to.emit(gaspGame, "ChallengeRewardClaimed")
                    .withArgs(
                        nextChallengeId,
                        dummyERC20MockAddress,
                        challengeReward + challengeReward / 4n
                    );
            });

            it("Should return the right token balances", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                    solver,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock
                    .connect(challenger)
                    .approve(gaspGameAddress, challengeReward * 2n);

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );

                const currentChallengeId: bigint = await gaspGame.currentChallengeId();
                await (gaspGame.connect(solver) as GaspGame).solveChallenge(
                    currentChallengeId,
                    challengeProofs[0][0]
                );

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[1],
                    dummyERC20MockAddress,
                    challengeReward
                );
                const nextChallengeId: bigint = await gaspGame.currentChallengeId();
                const totalReward = challengeReward + challengeReward / 4n;

                await mine(challengeTimeFrame);

                const promise = (gaspGame.connect(challenger) as GaspGame).claimChallengeReward(
                    nextChallengeId
                );
                await expect(promise).to.changeTokenBalances(
                    dummyERC20Mock,
                    [gaspGame, challenger, solver],
                    [-totalReward, totalReward, 0n]
                );
            });

            it("Should return the right token pool reward", async function () {
                const {
                    gaspGame,
                    gaspGameAddress,
                    dummyERC20Mock,
                    dummyERC20MockAddress,
                    challenger,
                    solver,
                } = await loadFixture(deployFixture);

                await dummyERC20Mock
                    .connect(challenger)
                    .approve(gaspGameAddress, challengeReward * 2n);

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[0],
                    dummyERC20MockAddress,
                    challengeReward
                );

                const currentChallengeId: bigint = await gaspGame.currentChallengeId();
                await (gaspGame.connect(solver) as GaspGame).solveChallenge(
                    currentChallengeId,
                    challengeProofs[0][0]
                );

                await (gaspGame.connect(challenger) as GaspGame).submitChallenge(
                    challengeNumbers[1],
                    dummyERC20MockAddress,
                    challengeReward
                );
                const nextChallengeId: bigint = await gaspGame.currentChallengeId();

                await mine(challengeTimeFrame);

                await (gaspGame.connect(challenger) as GaspGame).claimChallengeReward(
                    nextChallengeId
                );
                const currentTokenPoolReward: bigint =
                    await gaspGame.tokenPoolRewards(dummyERC20MockAddress);
                expect(currentTokenPoolReward).to.equal(challengeReward / 4n);
            });
        });
    });
});
