import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import * as api from 'test/fixtures/api';
import { baseTokens } from '.';
import * as common from '@protocolink/common';
import { expect } from 'chai';
import { getChainId, snapshotAndRevertEach } from '@protocolink/test-helpers';
import hre from 'hardhat';
import * as logics from '@protocolink/logics';

describe('Transaction: Zap Withdraw', function () {
  const marketId = logics.compoundv3.MarketId.USDbC;

  let chainId: number;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let service: logics.compoundv3.Service;
  let cToken: common.Token;

  before(async function () {
    chainId = await getChainId();
    user1 = await hre.ethers.getImpersonatedSigner('0x83f65fe1e745a103301834c4618225d60593cdab');
    user2 = await hre.ethers.getImpersonatedSigner('0x84a41799ddccf7a7f09f7ac2ec2860e532c31ae7');
    service = new logics.compoundv3.Service(chainId, hre.ethers.provider);
    cToken = await service.getCToken(marketId);
  });

  snapshotAndRevertEach();

  it('user zap withdraw USDbC to USDbC in USDbC market', async function () {
    // 1. user obtains a quotation for zap withdraw 1 USDbC through the zap withdraw API
    const srcToken = baseTokens.USDbC;
    const destToken = srcToken;
    const srcAmount = '1';
    const slippage = 100;
    const permit2Type = 'approve';
    const quotation = await api.quote(
      chainId,
      marketId,
      'zap-withdraw',
      {
        account: user2.address,
        srcToken,
        srcAmount,
        destToken,
        slippage,
      },
      permit2Type
    );

    // 2. user needs to allow the Protocolink user agent to withdraw on behalf of the user
    expect(quotation.approvals.length).to.eq(2);
    for (const approval of quotation.approvals) {
      await expect(user2.sendTransaction(approval)).to.not.be.reverted;
    }

    // 3. user obtains a zap withdraw transaction request through the build transaction API.
    expect(quotation.logics.length).to.eq(1);
    const transactionRequest = await api.buildRouterTransactionRequest({
      chainId,
      account: user2.address,
      logics: quotation.logics,
    });

    const cBalanceBefore = await service.getBalance(user2.address, cToken);
    const dBalanceBefore = await service.getBalance(user2.address, destToken);

    await expect(user2.sendTransaction(transactionRequest)).to.not.be.reverted;

    // 4. user's USDbC supply balance should decrease.
    // 4-1. supply grows when the block of getting api data is different from the block of executing tx
    // await expect(user2.address).to.changeBalance(cToken, -srcAmount, 100);
    // TODO: undefined native token error
    const cBalanceAfter = await service.getBalance(user2.address, cToken);
    console.log('check if the latter 2 numbers are close');
    console.log(cBalanceAfter.amount);
    console.log(cBalanceBefore.sub(srcAmount).amount);

    // 5. user's USDbC balance should increase
    // await expect(user2.address).to.changeBalance(destToken, quotation.quotation.destAmount);
    // TODO: undefined native token error
    const dBalanceAfter = await service.getBalance(user2.address, destToken);
    console.log('check if the latter 2 numbers are close');
    console.log(dBalanceAfter.amount);
    console.log(dBalanceBefore.add(quotation.quotation.destAmount).amount);
  });

  it('user zap withdraw USDbC to USDC in USDbC market', async function () {
    // 1. user obtains a quotation for zap withdraw 1 USDbC to USDC through the zap withdraw API
    const srcToken = baseTokens.USDbC;
    const destToken = baseTokens.USDC;
    const srcAmount = '1';
    const slippage = 100;
    const permit2Type = 'approve';
    const quotation = await api.quote(
      chainId,
      marketId,
      'zap-withdraw',
      {
        account: user2.address,
        srcToken,
        srcAmount,
        destToken,
        slippage,
      },
      permit2Type
    );

    // 2. user needs to allow the Protocolink user agent to withdraw on behalf of the user
    expect(quotation.approvals.length).to.eq(2);
    for (const approval of quotation.approvals) {
      await expect(user2.sendTransaction(approval)).to.not.be.reverted;
    }

    // 3. user obtains a zap withdraw transaction request through the build transaction API.
    expect(quotation.logics.length).to.eq(2);
    const transactionRequest = await api.buildRouterTransactionRequest({
      chainId,
      account: user2.address,
      logics: quotation.logics,
    });

    const cBalanceBefore = await service.getBalance(user2.address, cToken);
    const dBalanceBefore = await service.getBalance(user2.address, destToken);

    await expect(user2.sendTransaction(transactionRequest)).to.not.be.reverted;

    // 4. user's USDbC supply balance should decrease.
    // 4-1. supply grows when the block of getting api data is different from the block of executing tx
    // await expect(user2.address).to.changeBalance(cToken, -srcAmount, 100);
    // TODO: undefined native token error
    const cBalanceAfter = await service.getBalance(user2.address, cToken);
    console.log('check if the latter 2 numbers are close');
    console.log(cBalanceAfter.amount);
    console.log(cBalanceBefore.sub(srcAmount).amount);

    // 5. user's USDC balance should increase
    // await expect(user2.address).to.changeBalance(destToken, quotation.quotation.destAmount, slippage);
    // TODO: undefined native token error
    const dBalanceAfter = await service.getBalance(user2.address, destToken);
    console.log('check if the latter 2 numbers are close');
    console.log(dBalanceAfter.amount);
    console.log(dBalanceBefore.add(quotation.quotation.destAmount).amount);
  });

  it.only('user zap withdraw cbETH to USDC in USDbC market', async function () {
    // 1. user obtains a quotation for zap withdraw 0.1 cbETH to USDC through the zap withdraw API
    const srcToken = baseTokens.cbETH;
    const destToken = baseTokens.USDC;
    const initCollateralBalance = await service.getCollateralBalance(marketId, user1.address, srcToken);
    const srcAmount = '0.1';
    const slippage = 100;
    const quotation = await api.quote(chainId, marketId, 'zap-withdraw', {
      account: user1.address,
      srcToken,
      srcAmount,
      destToken,
      slippage,
    });

    // 2. user needs to allow the Protocolink user agent to withdraw on behalf of the user
    expect(quotation.approvals.length).to.eq(1);
    for (const approval of quotation.approvals) {
      await expect(user1.sendTransaction(approval)).to.not.be.reverted;
    }

    // 3. user obtains a zap withdraw transaction request through the build transaction API.
    expect(quotation.logics.length).to.eq(2);
    const transactionRequest = await api.buildRouterTransactionRequest({
      chainId,
      account: user1.address,
      logics: quotation.logics,
    });

    const dBalanceBefore = await service.getBalance(user1.address, destToken);

    await expect(user1.sendTransaction(transactionRequest)).to.not.be.reverted;

    // 4. user's cbETH supply balance should decrease.
    const withdrawalAmount = new common.TokenAmount(srcToken, srcAmount);
    const collateralBalance = await service.getCollateralBalance(marketId, user1.address, srcToken);
    expect(initCollateralBalance.clone().sub(collateralBalance).eq(withdrawalAmount)).to.be.true;

    // 5. user's USDC balance should increase
    // await expect(user1.address).to.changeBalance(destToken, quotation.quotation.destAmount, slippage);
    const dBalanceAfter = await service.getBalance(user1.address, destToken);
    console.log('check if the latter 2 numbers are close');
    console.log(dBalanceAfter.amount);
    console.log(dBalanceBefore.add(quotation.quotation.destAmount).amount);
  });
});
