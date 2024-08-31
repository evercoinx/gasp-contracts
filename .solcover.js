// eslint-disable-next-line @typescript-eslint/no-require-imports,no-undef
const { Network } = require("./utils/network");

// eslint-disable-next-line no-undef
module.exports = {
    configureYulOptimizer: true,
    network: Network.Hardhat,
    skipFiles: ["NFTStaking.sol", "interfaces/", "test/"],
};
