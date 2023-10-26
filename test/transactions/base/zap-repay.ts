import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import * as api from 'test/fixtures/api';
import { baseTokens } from '.';
import { claimToken } from '../../utils/faucet';
import * as common from '@protocolink/common';
import { expect } from 'chai';
import { getChainId, snapshotAndRevertEach } from '@protocolink/test-helpers';
import hre from 'hardhat';
import * as logics from '@protocolink/logics';
import * as utils from 'test/utils';

describe('Transaction: Zap Repay', function () {
  const marketId = logics.compoundv3.MarketId.USDbC;
  const baseToken = baseTokens.USDbC;

  let chainId: number;
  let user: SignerWithAddress;
  let service: logics.compoundv3.Service;
  let initBorrowBalance: common.TokenAmount;

  before(async function () {
    chainId = await getChainId();
    user = await hre.ethers.getImpersonatedSigner('0x83f65fe1e745a103301834c4618225d60593cdab');
    service = new logics.compoundv3.Service(chainId, hre.ethers.provider);
    initBorrowBalance = await service.getBorrowBalance(marketId, user.address, baseToken);
  });

  snapshotAndRevertEach();

  it('user zap repay USDbC in USDbC market', async function () {
    await claimToken(chainId, user.address, baseToken, '200');

    // 1. user obtains a quotation for zap repay 100 USDbC through the zap repay API
    const srcToken = baseTokens.USDbC;
    const srcAmount = '100';
    const slippage = 100;
    const permit2Type = 'approve';
    const quotation = await api.quote(
      chainId,
      marketId,
      'zap-repay',
      {
        account: user.address,
        srcToken,
        srcAmount,
        slippage,
      },
      permit2Type
    );

    // 2. user needs to allow the Protocolink user agent to repay on behalf of the user
    expect(quotation.approvals.length).to.eq(2);
    for (const approval of quotation.approvals) {
      await expect(user.sendTransaction(approval)).to.not.be.reverted;
    }

    // 3. user obtains a zap repay transaction request through the build transaction API.
    expect(quotation.logics.length).to.eq(1);
    const transactionRequest = await api.buildRouterTransactionRequest({
      chainId,
      account: user.address,
      logics: quotation.logics,
    });

    await expect(user.sendTransaction(transactionRequest)).to.not.be.reverted;

    // 4. user's USDbC borrow balance should decrease.
    // 4-1. supply grows when the block of getting api data is different from the block of executing tx
    const quoteDestAmount = new common.TokenAmount(baseToken, quotation.quotation.destAmount);
    const [min] = utils.bpsBound(quoteDestAmount.amount);
    const minDestAmount = quoteDestAmount.clone().set(min);

    const borrowBalance = await service.getBorrowBalance(marketId, user.address, baseToken);
    expect(initBorrowBalance.clone().sub(borrowBalance).lte(quoteDestAmount)).to.be.true;
    expect(initBorrowBalance.clone().sub(borrowBalance).gte(minDestAmount)).to.be.true;

    // 5. user's USDbC balance should decrease
    // await expect(user.address).to.changeBalance(baseToken, -srcAmount);
    // TODO: undefined native token error
    const balance = await service.getBalance(user.address, baseToken);
    expect(balance.amount).to.be.eq('100');
  });

  it('user zap repay extra USDC in USDbC market', async function () {
    const initBorrowBalance = await service.getBorrowBalance(marketId, user.address, baseToken);
    const srcAmount = initBorrowBalance.add(initBorrowBalance).amount; // multiply by 2 to avoid rate changing
    await claimToken(chainId, user.address, baseTokens.USDC, srcAmount);
    await claimToken(chainId, user.address, baseTokens.ETH, '5000'); // gas

    // 1. user obtains a quotation for zap repay USDC to USDbC through the zap repay API
    const srcToken = baseTokens.USDC;
    const slippage = 100;
    const permit2Type = 'approve';
    const quotation = await api.quote(
      chainId,
      marketId,
      'zap-repay',
      {
        account: user.address,
        srcToken,
        srcAmount,
        slippage,
      },
      permit2Type
    );

    // 2. user needs to allow the Protocolink user agent to repay on behalf of the user
    expect(quotation.approvals.length).to.eq(2);
    for (const approval of quotation.approvals) {
      await expect(user.sendTransaction(approval)).to.not.be.reverted;
    }

    // 3. user obtains a zap repay transaction request through the build transaction API.
    expect(quotation.logics.length).to.eq(2);
    const transactionRequest = await api.buildRouterTransactionRequest({
      chainId,
      account: user.address,
      logics: quotation.logics,
    });
    await expect(user.sendTransaction(transactionRequest)).to.not.be.reverted;

    // 4. user's USDbC borrow balance should be zero
    const borrowBalance = await service.getBorrowBalance(marketId, user.address, baseToken);
    expect(borrowBalance.isZero).to.be.true;

    // 5. user's USDbC supply balance should be zero
    const cToken = await service.getCToken(marketId);
    const baseTokenBalance = await service.getBalance(user.address, cToken);
    expect(baseTokenBalance.isZero).to.be.true;

    // 6. user's USDC balance should decrease
    // await expect(user.address).to.changeBalance(srcToken, -srcAmount);
    // TODO: undefined native token error
    const balance = await service.getBalance(user.address, srcToken);
    expect(balance.isZero).to.be.true;
  });
});
