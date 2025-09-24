import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can authorize and revoke oracles as contract owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const oracle = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('BetChain', 'authorize-oracle', [types.principal(oracle.address)], deployer.address),
        ]);
        
        assertEquals(block.receipts[0].result, `(ok true)`);
        
        let checkOracleBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'is-oracle-authorized', [types.principal(oracle.address)], deployer.address),
        ]);
        
        assertEquals(checkOracleBlock.receipts[0].result, `true`);
        
        let revokeBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'revoke-oracle', [types.principal(oracle.address)], deployer.address),
        ]);
        
        assertEquals(revokeBlock.receipts[0].result, `(ok true)`);
    },
});

Clarinet.test({
    name: "Cannot authorize oracle as non-owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_1')!;
        const oracle = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('BetChain', 'authorize-oracle', [types.principal(oracle.address)], user.address),
        ]);
        
        assertEquals(block.receipts[0].result, `(err u100)`);
    },
});

Clarinet.test({
    name: "Can create event with authorized oracle",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const oracle = accounts.get('wallet_1')!;
        const creator = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('BetChain', 'authorize-oracle', [types.principal(oracle.address)], deployer.address),
            Tx.contractCall('BetChain', 'create-event', [
                types.ascii("Lakers vs Warriors"),
                types.uint(1000),
                types.principal(oracle.address),
                types.uint(2)
            ], creator.address),
        ]);
        
        assertEquals(block.receipts[0].result, `(ok true)`);
        assertEquals(block.receipts[1].result, `(ok u1)`);
    },
});

Clarinet.test({
    name: "Cannot create event with unauthorized oracle",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const oracle = accounts.get('wallet_1')!;
        const creator = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('BetChain', 'create-event', [
                types.ascii("Lakers vs Warriors"),
                types.uint(1000),
                types.principal(oracle.address),
                types.uint(2)
            ], creator.address),
        ]);
        
        assertEquals(block.receipts[0].result, `(err u106)`);
    },
});

Clarinet.test({
    name: "Cannot create event with end block in past",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const oracle = accounts.get('wallet_1')!;
        const creator = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('BetChain', 'authorize-oracle', [types.principal(oracle.address)], deployer.address),
            Tx.contractCall('BetChain', 'create-event', [
                types.ascii("Past Event"),
                types.uint(1),
                types.principal(oracle.address),
                types.uint(2)
            ], creator.address),
        ]);
        
        assertEquals(block.receipts[1].result, `(err u102)`);
    },
});

Clarinet.test({
    name: "Can place bet on active event",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const oracle = accounts.get('wallet_1')!;
        const creator = accounts.get('wallet_2')!;
        const bettor = accounts.get('wallet_3')!;
        
        let setupBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'authorize-oracle', [types.principal(oracle.address)], deployer.address),
            Tx.contractCall('BetChain', 'create-event', [
                types.ascii("Lakers vs Warriors"),
                types.uint(1000),
                types.principal(oracle.address),
                types.uint(2)
            ], creator.address),
        ]);
        
        let betBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'place-bet', [
                types.uint(1),
                types.uint(0)
            ], bettor.address),
        ]);
        
        assertEquals(betBlock.receipts[0].result, `(ok true)`);
    },
});

Clarinet.test({
    name: "Cannot place bet on non-existent event",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const bettor = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('BetChain', 'place-bet', [
                types.uint(999),
                types.uint(0)
            ], bettor.address),
        ]);
        
        assertEquals(block.receipts[0].result, `(err u101)`);
    },
});

Clarinet.test({
    name: "Cannot place bet on invalid outcome",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const oracle = accounts.get('wallet_1')!;
        const creator = accounts.get('wallet_2')!;
        const bettor = accounts.get('wallet_3')!;
        
        let setupBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'authorize-oracle', [types.principal(oracle.address)], deployer.address),
            Tx.contractCall('BetChain', 'create-event', [
                types.ascii("Lakers vs Warriors"),
                types.uint(1000),
                types.principal(oracle.address),
                types.uint(2)
            ], creator.address),
        ]);
        
        let betBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'place-bet', [
                types.uint(1),
                types.uint(5)
            ], bettor.address),
        ]);
        
        assertEquals(betBlock.receipts[0].result, `(err u104)`);
    },
});

Clarinet.test({
    name: "Oracle can resolve event after end block",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const oracle = accounts.get('wallet_1')!;
        const creator = accounts.get('wallet_2')!;
        
        let setupBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'authorize-oracle', [types.principal(oracle.address)], deployer.address),
            Tx.contractCall('BetChain', 'create-event', [
                types.ascii("Lakers vs Warriors"),
                types.uint(10),
                types.principal(oracle.address),
                types.uint(2)
            ], creator.address),
        ]);
        
        chain.mineEmptyBlockUntil(15);
        
        let resolveBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'resolve-event', [
                types.uint(1),
                types.uint(0)
            ], oracle.address),
        ]);
        
        assertEquals(resolveBlock.receipts[0].result, `(ok true)`);
    },
});

Clarinet.test({
    name: "Cannot resolve event before end block",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const oracle = accounts.get('wallet_1')!;
        const creator = accounts.get('wallet_2')!;
        
        let setupBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'authorize-oracle', [types.principal(oracle.address)], deployer.address),
            Tx.contractCall('BetChain', 'create-event', [
                types.ascii("Lakers vs Warriors"),
                types.uint(1000),
                types.principal(oracle.address),
                types.uint(2)
            ], creator.address),
        ]);
        
        let resolveBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'resolve-event', [
                types.uint(1),
                types.uint(0)
            ], oracle.address),
        ]);
        
        assertEquals(resolveBlock.receipts[0].result, `(err u103)`);
    },
});

Clarinet.test({
    name: "Only authorized oracle can resolve event",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const oracle = accounts.get('wallet_1')!;
        const creator = accounts.get('wallet_2')!;
        const unauthorized = accounts.get('wallet_3')!;
        
        let setupBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'authorize-oracle', [types.principal(oracle.address)], deployer.address),
            Tx.contractCall('BetChain', 'create-event', [
                types.ascii("Lakers vs Warriors"),
                types.uint(10),
                types.principal(oracle.address),
                types.uint(2)
            ], creator.address),
        ]);
        
        chain.mineEmptyBlockUntil(15);
        
        let resolveBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'resolve-event', [
                types.uint(1),
                types.uint(0)
            ], unauthorized.address),
        ]);
        
        assertEquals(resolveBlock.receipts[0].result, `(err u106)`);
    },
});

Clarinet.test({
    name: "Winner can claim winnings after event resolution",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const oracle = accounts.get('wallet_1')!;
        const creator = accounts.get('wallet_2')!;
        const bettor = accounts.get('wallet_3')!;
        
        let setupBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'authorize-oracle', [types.principal(oracle.address)], deployer.address),
            Tx.contractCall('BetChain', 'create-event', [
                types.ascii("Lakers vs Warriors"),
                types.uint(10),
                types.principal(oracle.address),
                types.uint(2)
            ], creator.address),
            Tx.contractCall('BetChain', 'place-bet', [
                types.uint(1),
                types.uint(0)
            ], bettor.address),
        ]);
        
        chain.mineEmptyBlockUntil(15);
        
        let resolveBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'resolve-event', [
                types.uint(1),
                types.uint(0)
            ], oracle.address),
        ]);
        
        let claimBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'claim-winnings', [
                types.uint(1),
                types.uint(0)
            ], bettor.address),
        ]);
        
        assertEquals(claimBlock.receipts[0].result.includes('ok'), true);
    },
});

Clarinet.test({
    name: "Cannot claim winnings for losing outcome",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const oracle = accounts.get('wallet_1')!;
        const creator = accounts.get('wallet_2')!;
        const bettor = accounts.get('wallet_3')!;
        
        let setupBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'authorize-oracle', [types.principal(oracle.address)], deployer.address),
            Tx.contractCall('BetChain', 'create-event', [
                types.ascii("Lakers vs Warriors"),
                types.uint(10),
                types.principal(oracle.address),
                types.uint(2)
            ], creator.address),
            Tx.contractCall('BetChain', 'place-bet', [
                types.uint(1),
                types.uint(1)
            ], bettor.address),
        ]);
        
        chain.mineEmptyBlockUntil(15);
        
        let resolveBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'resolve-event', [
                types.uint(1),
                types.uint(0)
            ], oracle.address),
        ]);
        
        let claimBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'claim-winnings', [
                types.uint(1),
                types.uint(1)
            ], bettor.address),
        ]);
        
        assertEquals(claimBlock.receipts[0].result, `(err u104)`);
    },
});

Clarinet.test({
    name: "Contract owner can withdraw protocol fees",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const oracle = accounts.get('wallet_1')!;
        const creator = accounts.get('wallet_2')!;
        const bettor = accounts.get('wallet_3')!;
        
        let setupBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'authorize-oracle', [types.principal(oracle.address)], deployer.address),
            Tx.contractCall('BetChain', 'create-event', [
                types.ascii("Lakers vs Warriors"),
                types.uint(10),
                types.principal(oracle.address),
                types.uint(2)
            ], creator.address),
            Tx.contractCall('BetChain', 'place-bet', [
                types.uint(1),
                types.uint(0)
            ], bettor.address),
        ]);
        
        chain.mineEmptyBlockUntil(15);
        
        let resolveBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'resolve-event', [
                types.uint(1),
                types.uint(0)
            ], oracle.address),
        ]);
        
        let withdrawBlock = chain.mineBlock([
            Tx.contractCall('BetChain', 'withdraw-protocol-fees', [], deployer.address),
        ]);
        
        assertEquals(withdrawBlock.receipts[0].result.includes('ok'), true);
    },
});

Clarinet.test({
    name: "Non-owner cannot withdraw protocol fees",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('BetChain', 'withdraw-protocol-fees', [], user.address),
        ]);
        
        assertEquals(block.receipts[0].result, `(err u100)`);
    },
});


import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;

/*
  The test below is an example. To learn more, read the testing documentation here:
  https://docs.hiro.so/stacks/clarinet-js-sdk
*/

describe("example tests", () => {
  it("ensures simnet is well initialised", () => {
    expect(simnet.blockHeight).toBeDefined();
  });

  // it("shows an example", () => {
  //   const { result } = simnet.callReadOnlyFn("counter", "get-counter", [], address1);
  //   expect(result).toBeUint(0);
  // });
});
