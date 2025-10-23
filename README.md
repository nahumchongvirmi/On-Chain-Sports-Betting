# 🏆 BetChain - On-Chain Sports Betting Platform

> A transparent, decentralized platform for sports betting with outcomes verified by oracles on the Stacks blockchain ⚡

## 🌟 Features

- 🎯 **Decentralized Betting**: Place bets on sports events with complete transparency
- 🔮 **Oracle Integration**: Trusted oracles verify event outcomes
- 💰 **Automatic Payouts**: Smart contract handles winnings distribution
- 🛡️ **Secure**: Built with Clarity smart contract language
- 📊 **Multi-outcome Events**: Support for events with multiple possible outcomes
- 💸 **Protocol Fees**: 3% fee structure for platform sustainability
- ⏰ **Time-based Controls**: Betting windows with automatic closure

## 🚀 Quick Start

### Prerequisites

- [Clarinet](https://docs.hiro.so/stacks/clarinet) installed
- Basic understanding of Stacks blockchain
- STX tokens for betting

### Installation

```bash
git clone https://github.com/your-username/On-Chain-Sports-Betting.git
cd On-Chain-Sports-Betting
clarinet check
```

## 📖 How It Works

### 1. Oracle Authorization 🔐
Contract owner authorizes trusted oracles who can resolve event outcomes:

```clarity
(contract-call? .BetChain authorize-oracle 'SP1ORACLE...)
```

### 2. Event Creation 🎲
Anyone can create a betting event with an authorized oracle:

```clarity
(contract-call? .BetChain create-event 
  "Lakers vs Warriors" 
  u1000  ;; end block
  'SP1ORACLE...
  u2)    ;; number of outcomes
```

### 3. Place Bets 💰
Users bet their entire STX balance on their chosen outcome:

```clarity
(contract-call? .BetChain place-bet 
  u1  ;; event ID
  u0) ;; outcome (0 = Lakers win, 1 = Warriors win)
```

### 4. Event Resolution ⚖️
Oracle resolves the event after the end block:

```clarity
(contract-call? .BetChain resolve-event 
  u1  ;; event ID
  u0) ;; winning outcome
```

### 5. Claim Winnings 🏆
Winners claim their proportional share of the prize pool:

```clarity
(contract-call? .BetChain claim-winnings 
  u1  ;; event ID
  u0) ;; winning outcome
```

## 🔧 Contract Functions

### Read-Only Functions

| Function | Description | Parameters |
|----------|-------------|------------|
| `get-event` | Get event details | `event-id: uint` |
| `get-event-outcome` | Get outcome statistics | `event-id: uint, outcome: uint` |
| `get-user-bet` | Get user's bet info | `user: principal, event-id: uint, outcome: uint` |
| `is-oracle-authorized` | Check oracle status | `oracle: principal` |
| `get-protocol-fees` | Get accumulated fees | None |
| `get-next-event-id` | Get next event ID | None |

### Public Functions

#### Oracle Management
- `authorize-oracle` - Owner only, authorizes an oracle
- `revoke-oracle` - Owner only, removes oracle authorization

#### Event Lifecycle
- `create-event` - Create new betting event
- `place-bet` - Place bet on event outcome
- `resolve-event` - Oracle resolves event outcome
- `claim-winnings` - Claim winnings after event resolution

#### Admin
- `withdraw-protocol-fees` - Owner withdraws accumulated fees

## 💡 Example Usage

### Complete Betting Flow

```clarity
;; 1. Owner authorizes oracle
(contract-call? .BetChain authorize-oracle 'SP1ORACLE123)

;; 2. Create Lakers vs Warriors event
(contract-call? .BetChain create-event 
  "Lakers vs Warriors Game 7" 
  u500  ;; ends at block 500
  'SP1ORACLE123
  u2)   ;; 2 outcomes: Lakers or Warriors

;; 3. Alice bets on Lakers (outcome 0)
(contract-call? .BetChain place-bet u1 u0)

;; 4. Bob bets on Warriors (outcome 1)
(contract-call? .BetChain place-bet u1 u1)

;; 5. After block 500, oracle resolves Lakers win
(contract-call? .BetChain resolve-event u1 u0)

;; 6. Alice claims her winnings (gets ~97% of total pool)
(contract-call? .BetChain claim-winnings u1 u0)
```

## 🛡️ Security Features

- ✅ **Authorization Checks**: Only authorized oracles can resolve events
- ✅ **Time Windows**: Bets only accepted before event end time
- ✅ **Re-entrancy Protection**: Safe contract patterns
- ✅ **Double-spend Prevention**: Users can only bet once per outcome
- ✅ **Idempotent Operations**: Safe to retry failed transactions

## 💰 Economics

- **Protocol Fee**: 3% of total betting pool
- **Winner Takes**: 97% of pool distributed proportionally
- **Minimum Bet**: User's entire STX balance (design choice for simplicity)

## 🧪 Testing

The contract includes comprehensive tests covering:
- Oracle authorization/revocation
- Event creation with various scenarios
- Betting mechanics and validations
- Event resolution by oracles
- Winnings calculation and claims
- Error handling and edge cases

## 🎯 Error Codes

| Code | Error | Description |
|------|-------|-------------|
| `u100` | `ERR_UNAUTHORIZED` | Caller not authorized |
| `u101` | `ERR_EVENT_NOT_FOUND` | Event doesn't exist |
| `u102` | `ERR_EVENT_ENDED` | Event betting window closed |
| `u103` | `ERR_EVENT_NOT_ENDED` | Event still active |
| `u104` | `ERR_INVALID_OUTCOME` | Invalid outcome specified |
| `u105` | `ERR_INSUFFICIENT_FUNDS` | Not enough STX |
| `u106` | `ERR_ORACLE_NOT_AUTHORIZED` | Oracle not authorized |
| `u107` | `ERR_EVENT_ALREADY_RESOLVED` | Event already resolved |
| `u108` | `ERR_NO_BET_FOUND` | No bet found |
| `u109` | `ERR_ALREADY_CLAIMED` | Winnings already claimed |
| `u110` | `ERR_INVALID_EVENT_ID` | Invalid event ID |

## 🚧 Limitations

- Users must bet their entire STX balance (simplified for demo)
- Only one bet per user per outcome
- Oracle system requires trust in authorized entities
- No partial payouts (winner takes all minus fees)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure `clarinet check` passes
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Stacks Documentation](https://docs.stacks.co/)
- [Clarity Language Reference](https://docs.stacks.co/clarity/)
- [Clarinet Testing Guide](https://docs.hiro.so/stacks/clarinet-js-sdk)

---

*Built with ❤️ on Stacks blockchain*
