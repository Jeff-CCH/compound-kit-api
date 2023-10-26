import * as common from '@protocolink/common';
import * as helpers from '@nomicfoundation/hardhat-network-helpers';

export const faucetMap: Record<number, { default: string; specified?: Record<string, string> }> = {
  [common.ChainId.base]: {
    default: '0xb4885bc63399bf5518b994c1d0c153334ee579d0',
    specified: {
      '0x4200000000000000000000000000000000000006': '0xb4885bc63399bf5518b994c1d0c153334ee579d0', // WETH
      '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA': '0x4c80e24119cfb836cdf0a6b53dc23f04f7e652ca', // USDbC
      '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22': '0x9c4ec768c28520b50860ea7a15bd7213a9ff58bf', // cbETH
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': '0x20fe51a9229eef2cf8ad9e89d91cab9312cf3b7a', // USDC
    },
  },
};

export async function claimToken(
  chainId: number,
  recepient: string,
  tokenOrAddress: common.TokenOrAddress,
  amount: string,
  faucet?: string
) {
  const hre = await import('hardhat');

  const web3Toolkit = new common.Web3Toolkit(chainId, hre.ethers.provider);
  const token = await web3Toolkit.getToken(tokenOrAddress);
  const tokenAmount = new common.TokenAmount(token, amount);

  if (token.isNative || token.isWrapped) {
    const signers = await hre.ethers.getSigners();
    faucet = signers[signers.length - 1].address;
  } else {
    if (!faucet) {
      faucet = faucetMap[chainId]?.specified?.[token.address] ?? faucetMap[chainId].default;
    }
    await helpers.impersonateAccount(faucet);
  }

  const signer = await hre.ethers.provider.getSigner(faucet);
  if (token.isNative) {
    await signer.sendTransaction({ to: recepient, value: tokenAmount.amountWei });
  } else {
    if (token.isWrapped) {
      const weth = common.WETH__factory.connect(token.address, signer);
      await (await weth.deposit({ value: tokenAmount.amountWei })).wait();
    }
    const erc20 = common.ERC20__factory.connect(token.address, signer);
    await (await erc20.transfer(recepient, tokenAmount.amountWei)).wait();
  }
}
