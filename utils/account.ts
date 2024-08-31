// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ethers as ethersType } from "ethers";
import { EIP1193Provider, HardhatEthersHelpers } from "hardhat/types";

type HardhatEthers = typeof ethersType & HardhatEthersHelpers;

export async function getSigner(
    ethers: HardhatEthers,
    ethereum: EIP1193Provider,
    address?: string
) {
    const provider = new ethers.BrowserProvider(ethereum);
    return await provider.getSigner(address);
}

export function generateRandomAddress(ethers: HardhatEthers) {
    const privateKey = `0x${Buffer.from(ethers.randomBytes(32)).toString("hex")}`;
    return new ethers.Wallet(privateKey).address;
}
