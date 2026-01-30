| <img src="https://github.com/user-attachments/assets/dbd19dc9-46af-417e-a68b-34c796f0d9e4" width="48" /> | **Epoch** |
|---|---|

<img width="1200" height="650" alt="image" src="https://github.com/user-attachments/assets/cb098658-393d-4b7d-b570-e7122b74d420" />

**Epoch** is a privacy-preserving prediction market built on Solana, powered by **Arcium MPC**. Users can place bets on prediction markets without revealing their position (YES / NO) until the market resolves. This prevents front-running, copy trading, and outcome manipulation, enabling fair, trust-minimized markets.

---

## Why Epoch

Traditional on-chain prediction markets leak user intent the moment a bet is placed. Epoch fixes this.

- **Private Bets**: Bet direction is encrypted and hidden during the entire betting phase
- **Fair Markets**: No front-running or strategy copying
- **On-Chain Enforcement**: Market rules and payouts are enforced by Solana smart contracts
- **Fast & Cheap**: Powered by Solana's high-throughput runtime

---

## How It Works

### Encrypted Betting

1. Users choose an outcome and stake
2. The bet direction is encrypted client-side using Arcium MPC
3. Encrypted data is submitted on-chain
4. MPC processes bets without revealing individual positions
5. After resolution, payouts are computed privately and claimed trustlessly

At no point during betting can observers infer which side a user took.

---

### Market Lifecycle

1. **Created**: Market initialized with a question and timeline
2. **Open**: Encrypted bets are accepted
3. **Betting Closed**: No new bets
4. **Resolved**: Outcome declared
5. **Settled**: Users claim payouts

---

## Architecture

```
epoch/
├── app/                  # Next.js frontend
│   ├── app/              # App router pages
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and contract bindings
│   └── types/            # TypeScript types
│
└── contract/             # Solana smart contract
    ├── programs/         # Anchor program
    └── encrypted-ixs/    # Arcium encrypted instructions
```

- **Frontend** handles wallet authentication, encryption, and UX
- **Smart contract** enforces market logic and settlement
- **Arcium MPC** ensures privacy for bet direction and payout computation

---

## Technology Stack

**Frontend**
- Next.js (App Router)
- React
- Tailwind CSS
- Privy Wallet Authentication

**On-Chain**
- Solana
- Anchor Framework
- Arcium MPC
- SPL Token

**Infrastructure**
- Helius RPC & WebSockets

---

## Security Model

- Bet directions are encrypted using MPC-friendly cryptography
- No single party can decrypt user positions
- Smart contracts strictly enforce market state transitions
- Payouts are computed via MPC after resolution

Epoch never has access to plaintext user bets.

---

## Deployment

| Network | Program ID |
|---------|------------|
| Devnet  | `JAycaSPgFD8hd4Ys7RuJ5pJFzBL8pf11BT8z5HMa1zhZ` |

---

## Status

Epoch is currently live on Solana devnet. Mainnet deployment planned following audits and MPC scaling.

---

## License

[EPOCH LICENSE](https://github.com/epochdotm/epoch/blob/main/LICENSE)
