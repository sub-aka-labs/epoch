# Epoch

A privacy-preserving prediction market on Solana powered by Arcium MPC (Multi-Party Computation).

## Overview

Epoch allows users to place encrypted bets on prediction markets. Your bet direction (YES/NO) remains private until the market resolves, preventing front-running and ensuring fair outcomes.

### Key Features

- **Private Betting**: Bets are encrypted using Arcium MPC - no one can see which side you bet on
- **Solana Speed**: Fast, low-cost transactions on Solana devnet
- **Real-time Updates**: Live market data via Helius WebSocket infrastructure
- **Wallet Integration**: Supports Phantom and Solflare wallets

## Architecture

```
epoch/
├── app/                    # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and contract bindings
│   └── types/             # TypeScript types
│
└── contract/              # Solana smart contract
    ├── programs/          # Anchor program
    └── encrypted-ixs/     # Arcium encrypted instructions
```

## Tech Stack

**Frontend**
- Next.js 16
- React 19
- Tailwind CSS
- Solana Wallet Adapter

**Smart Contract**
- Anchor Framework
- Arcium MPC SDK
- SPL Token

**Infrastructure**
- Helius RPC (WebSocket + HTTP)
- Solana Devnet

## Getting Started

### Prerequisites

- Node.js 18+
- Rust & Cargo
- Solana CLI
- Anchor CLI

### Frontend Setup

```bash
cd app

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Add your Helius API key to .env.local
# Get one free at https://dashboard.helius.dev

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Contract Setup

```bash
cd contract

# Install dependencies
yarn install

# Build the program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## Environment Variables

### Frontend (`app/.env.local`)

```bash
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key
```

## How It Works

### Market Lifecycle

1. **Created** - Market is initialized with a question and deadlines
2. **Open** - Users can place encrypted bets
3. **BettingClosed** - Betting period ends
4. **Resolved** - Authority declares winning outcome (YES/NO)
5. **Settled** - Users can claim payouts

### Betting Flow

1. User selects outcome (YES/NO) and amount
2. Bet is encrypted client-side using Arcium shared secret
3. Encrypted bet is submitted to Solana
4. Arcium MPC processes the bet without revealing the direction
5. After resolution, payouts are computed via MPC
6. Users claim winnings

### Position Status

- **Pending** - Bet submitted, awaiting MPC processing
- **Processed** - MPC has processed the encrypted bet
- **PayoutComputed** - Payout calculated after market resolution
- **Claimed** - User has claimed their payout
- **Refunded** - Market cancelled, deposit returned

## Contract Addresses

| Network | Program ID |
|---------|------------|
| Devnet  | `6eUsJ9n3LM4FoRWx9MyN7SGyZzvs63Bu43xERvgGPWrd` |

## Project Structure

### Frontend Hooks

- `useMarket` - Fetch market data and admin actions
- `useMarkets` - List all markets
- `usePosition` - User position and claim actions
- `useBet` - Place encrypted bets (Arcium)
- `useHeliusWebSocket` - Real-time market updates

### Smart Contract Instructions

- `create_market` - Initialize a new prediction market
- `open_market` - Open market for betting
- `place_bet` - Submit encrypted bet
- `close_betting` - End betting period
- `resolve_market` - Declare winning outcome
- `compute_payout` - Calculate user payout via MPC
- `claim_payout` - Withdraw winnings
- `cancel_market` - Cancel and enable refunds
- `claim_refund` - Get deposit back if cancelled

## Development

### Run Tests

```bash
# Frontend
cd app && npm run lint

# Contract
cd contract && anchor test
```

### Build for Production

```bash
cd app && npm run build
```

## Security

- Bets are encrypted using x25519 key exchange with Arcium MPC
- Only the MPC network can decrypt bets collectively
- Smart contract enforces all market rules on-chain

## License

MIT
