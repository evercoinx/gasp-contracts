import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import { HardhatNetworkHDAccountsConfig, HardhatNetworkMiningUserConfig } from "hardhat/types";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-solhint";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-contract-sizer";
import "./tasks/upgrade-contract";
import "./tasks/verify-contract";
import { extractEnvironmentVariables } from "./utils/environment";
import { getProviderUrl, Network } from "./utils/network";

const isCI = !!process.env.CI;
dotenv.config({
    path: isCI ? ".env.example" : ".env",
    encoding: "UTF-8",
});

const envVars = extractEnvironmentVariables();

const accounts: Omit<HardhatNetworkHDAccountsConfig, "accountsBalance"> = {
    mnemonic: envVars.DEPLOYER_MNEMONIC,
    passphrase: envVars.DEPLOYER_PASSPHRASE,
    path: "m/44'/60'/0'/0",
    initialIndex: 0,
    count: 10,
};

const mining: HardhatNetworkMiningUserConfig = {
    auto: true,
    mempool: {
        order: "fifo",
    },
};

const config: HardhatUserConfig = {
    networks: {
        [Network.Hardhat]: {
            initialBaseFeePerGas: 0, // See https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136
            blockGasLimit: 30_000_000,
            mining,
        },
        [Network.Localhost]: {
            url: getProviderUrl(Network.Localhost),
            blockGasLimit: 30_000_000,
            mining,
        },
        [Network.Sepolia]: {
            url: getProviderUrl(Network.Sepolia, envVars.API_PROVIDER, envVars.SEPOLIA_API_KEY),
            chainId: 11155111,
            from: envVars.DEPLOYER_ADDRESS,
            accounts,
        },
        [Network.Ethereum]: {
            url: getProviderUrl(Network.Ethereum, envVars.API_PROVIDER, envVars.ETHEREUM_API_KEY),
            chainId: 1,
            from: envVars.DEPLOYER_ADDRESS,
            accounts,
        },
    },
    defaultNetwork: Network.Hardhat,
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    mocha: {
        reporter: isCI ? "dot" : "nyan",
        timeout: "60s",
    },
    etherscan: {
        apiKey: {
            [Network.Sepolia]: envVars.ETHERSCAN_API_KEY,
            [Network.EthereumAlt]: envVars.ETHERSCAN_API_KEY,
        },
    },
    defender: {
        apiKey: envVars.OZ_DEFENDER_API_KEY,
        apiSecret: envVars.OZ_DEFENDER_API_SECRET,
    },
    gasReporter: {
        coinmarketcap: envVars.COINMARKETCAP_API_KEY,
        excludeContracts: ["@openzeppelin/", "interfaces/", "libraries/", "mocks/"],
        gasPriceApi: "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
        currency: "ETH",
        token: "ETH",
    },
    contractSizer: {
        alphaSort: false,
        runOnCompile: false,
        disambiguatePaths: false,
        strict: true,
        only: ["GaspGame"],
        except: ["@openzeppelin/", "interfaces/", "libraries/", "mocks/"],
    },
};

export default config;
