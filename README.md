# Gasp Smart Contracts

## Github Workflows

-   ![CI](https://github.com/evercoinx/gasp-contracts/actions/workflows/ci.yaml/badge.svg)

## Description

Create a smart contract using Solidity programming language.
The contract is economically incentivized game with the following rules:

At any time, any user can submit uint N, which will define a challenge, and provide a non-zero amount of chosen ERC20-compatible tokens, which will define a reward.

Within the timeframe T, which is constant for the game, any user can solve a challenge by proving N being a composite number.

- If the proof is correct, the user who provided the solution will receive 50% of the reward for the challenge, and the other 50% of the reward will stay in the contract as part of the prize pool.
- If within T no correct proof were provided, user who submitted the challenge will receive:
100% of reward provided for the challenge;
50% of the amount of the same token in the prize pool.

Example:

- T = 10 blocks; there are 100 XYZ tokens in the prize pool.
- Alice submits challenge 42 and sets the reward as 100 XYZ tokens
- After 5 blocks from the challenge creation Bob sends a transaction proving 42 is a composite number and claims 50 XYZ tokens as a reward. There are now 150 XYZ tokens in the prize pool.
- If Bob would not solve the challenge and there would be no one to provide a solution within 10 blocks, Alice would receive 150 XYZ tokens.

## Commands

Format TypeScript code

```bash
npm run format
```

Lint TypeScript code

```bash
npm run lint
```

Compile contracts

```bash
npm run compile
```

Check contracts with linter

```bash
npm run check
```

Run unit tests

```bash
npm test
```

Run unit tests with coverage

```bash
npm run cover
```

Run unit tests with gas estimations

```bash
npm run gas
```

Get contracts size

```bash
npm run size
```

Analyze contracts with static analyzer

```bash
npm run analyze
```

Clean up temporary files and artifacts

```bash
npm run clean
```

## Contract Deployment Information

### Ethereum Mainnet

#### GaspGame Contract

No deployment yet.

### Sepolia Testnet

#### GaspGame Contract

No deployment yet.
