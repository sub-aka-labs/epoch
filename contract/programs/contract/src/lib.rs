use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use arcium_anchor::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod state;

use constants::*;
use errors::DarkPoolError;
use events::*;
use state::*;

declare_id!("JAycaSPgFD8hd4Ys7RuJ5pJFzBL8pf11BT8z5HMa1zhZ");

#[error_code]
pub enum ErrorCode {
    #[msg("Cluster not set in MXE account")]
    ClusterNotSet,
}

#[arcium_program]
pub mod contract {
    use super::*;

    pub fn init_process_bet_comp_def(ctx: Context<InitProcessBetCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    pub fn init_compute_payout_comp_def(ctx: Context<InitComputePayoutCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_id: u64,
        question: String,
        betting_start_ts: i64,
        betting_end_ts: i64,
        resolution_end_ts: i64,
    ) -> Result<()> {
        require!(question.len() <= MAX_QUESTION_LEN, DarkPoolError::QuestionTooLong);
        require!(betting_start_ts < betting_end_ts, DarkPoolError::InvalidDeadlines);
        require!(betting_end_ts < resolution_end_ts, DarkPoolError::InvalidDeadlines);

        let clock = Clock::get()?;
        require!(betting_start_ts >= clock.unix_timestamp, DarkPoolError::DeadlineInPast);

        let market = &mut ctx.accounts.market;
        market.authority = ctx.accounts.authority.key();
        market.market_id = market_id;
        market.question = question;
        market.token_mint = ctx.accounts.token_mint.key();
        market.vault = ctx.accounts.vault.key();
        market.pool_state = ctx.accounts.pool_state.key();
        market.betting_start_ts = betting_start_ts;
        market.betting_end_ts = betting_end_ts;
        market.resolution_end_ts = resolution_end_ts;
        market.status = MarketStatus::Created;
        market.winning_outcome = None;
        market.total_positions = 0;
        market.state_commitment = [0u8; 32];
        market.bump = ctx.bumps.market;
        market.vault_bump = ctx.bumps.vault;
        market.pool_state_bump = ctx.bumps.pool_state;
        market.created_at = clock.unix_timestamp;
        market.resolved_at = None;

        let pool_state = &mut ctx.accounts.pool_state;
        pool_state.market = market.key();
        pool_state.encrypted_state = vec![];
        pool_state.state_version = 0;
        pool_state.last_computation_id = 0;
        pool_state.pending_computations = 0;
        pool_state.last_updated = clock.unix_timestamp;
        pool_state.bump = ctx.bumps.pool_state;
        pool_state.is_initialized = false;

        emit!(MarketCreated {
            market: market.key(),
            market_id,
            authority: market.authority,
            token_mint: market.token_mint,
            betting_end_ts,
            resolution_end_ts,
        });

        Ok(())
    }

    pub fn open_market(ctx: Context<OpenMarket>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let pool_state = &mut ctx.accounts.pool_state;

        require!(market.status == MarketStatus::Created, DarkPoolError::InvalidMarketStatus);

        pool_state.is_initialized = true;
        pool_state.state_version = 1;
        market.status = MarketStatus::Open;

        emit!(MarketOpened {
            market: market.key(),
            opened_at: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn place_bet(
        ctx: Context<PlaceBet>,
        computation_offset: u64,
        encrypted_bet: Vec<u8>,
        user_pubkey: [u8; 32],
        nonce: u128,
        deposit_amount: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;

        require!(ctx.accounts.market.status == MarketStatus::Open, DarkPoolError::MarketNotOpen);
        require!(clock.unix_timestamp >= ctx.accounts.market.betting_start_ts, DarkPoolError::BettingNotStarted);
        require!(clock.unix_timestamp < ctx.accounts.market.betting_end_ts, DarkPoolError::BettingEnded);
        require!(deposit_amount > 0, DarkPoolError::InvalidBetAmount);
        require!(encrypted_bet.len() == 64, DarkPoolError::InvalidEncryptedBetSize);

        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.bettor_token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.bettor.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, deposit_amount)?;

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        let encrypted_outcome: [u8; 32] = encrypted_bet[0..32].try_into().unwrap();
        let encrypted_amount: [u8; 32] = encrypted_bet[32..64].try_into().unwrap();

        let args = ArgBuilder::new()
            .x25519_pubkey(user_pubkey)
            .plaintext_u128(nonce)
            .encrypted_u8(encrypted_outcome)
            .encrypted_u64(encrypted_amount)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![ProcessBetCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;

        let position = &mut ctx.accounts.user_position;
        let market_key = ctx.accounts.market.key();
        position.market = market_key;
        position.owner = ctx.accounts.bettor.key();
        position.encrypted_bet = encrypted_bet;
        position.user_pubkey = user_pubkey;
        position.nonce = nonce;
        position.deposit_amount = deposit_amount;
        position.payout_amount = 0;
        position.status = PositionStatus::Pending;
        position.computation_id = computation_offset;
        position.bump = ctx.bumps.user_position;
        position.created_at = clock.unix_timestamp;
        position.processed_at = None;
        position.claimed_at = None;

        ctx.accounts.market.total_positions = ctx.accounts.market.total_positions.checked_add(1).ok_or(DarkPoolError::Overflow)?;
        ctx.accounts.pool_state.pending_computations = ctx.accounts.pool_state.pending_computations.checked_add(1).ok_or(DarkPoolError::Overflow)?;

        emit!(BetPlaced {
            market: market_key,
            position: position.key(),
            bettor: ctx.accounts.bettor.key(),
            deposit_amount,
            computation_id: computation_offset,
        });

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "process_bet")]
    pub fn process_bet_callback(
        ctx: Context<ProcessBetCallback>,
        output: SignedComputationOutputs<ProcessBetOutput>,
    ) -> Result<()> {
        let clock = Clock::get()?;

        let result = output
            .verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account)
            .map_err(|_| DarkPoolError::ComputationAborted)?;

        ctx.accounts.pool_state.encrypted_state = result
            .field_0
            .ciphertexts
            .iter()
            .flat_map(|chunk| chunk.iter().copied())
            .collect();
        ctx.accounts.pool_state.state_version = ctx.accounts.pool_state.state_version.checked_add(1).ok_or(DarkPoolError::Overflow)?;
        ctx.accounts.pool_state.last_updated = clock.unix_timestamp;
        ctx.accounts.pool_state.last_computation_id = ctx.accounts.user_position.computation_id;

        let mut commitment = [0u8; 32];
        commitment[..16].copy_from_slice(&result.field_0.nonce.to_le_bytes());
        ctx.accounts.market.state_commitment = commitment;

        ctx.accounts.user_position.status = PositionStatus::Processed;
        ctx.accounts.user_position.processed_at = Some(clock.unix_timestamp);

        ctx.accounts.pool_state.pending_computations = ctx.accounts.pool_state.pending_computations.saturating_sub(1);

        emit!(BetProcessed {
            market: ctx.accounts.market.key(),
            position: ctx.accounts.user_position.key(),
            state_version: ctx.accounts.pool_state.state_version,
            new_commitment: commitment,
        });

        Ok(())
    }

    pub fn close_betting(ctx: Context<CloseBetting>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(market.status == MarketStatus::Open, DarkPoolError::InvalidMarketStatus);
        require!(clock.unix_timestamp >= market.betting_end_ts, DarkPoolError::BettingNotEnded);

        market.status = MarketStatus::BettingClosed;

        emit!(BettingClosed {
            market: market.key(),
            total_positions: market.total_positions,
            closed_at: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>, winning_outcome: u8) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(
            market.status == MarketStatus::Open || market.status == MarketStatus::BettingClosed,
            DarkPoolError::InvalidMarketStatus
        );
        require!(clock.unix_timestamp >= market.betting_end_ts, DarkPoolError::BettingNotEnded);
        require!(winning_outcome <= 1, DarkPoolError::InvalidOutcome);

        market.winning_outcome = Some(winning_outcome);
        market.status = MarketStatus::Resolved;
        market.resolved_at = Some(clock.unix_timestamp);

        emit!(MarketResolved {
            market: market.key(),
            winning_outcome,
            resolved_at: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn compute_payout(ctx: Context<ComputePayout>, computation_offset: u64) -> Result<()> {
        let winning_outcome = ctx.accounts.market.winning_outcome.ok_or(DarkPoolError::MarketNotResolved)?;

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        let args = ArgBuilder::new()
            .x25519_pubkey(ctx.accounts.user_position.user_pubkey)
            .plaintext_u128(ctx.accounts.user_position.nonce)
            .plaintext_u8(winning_outcome)
            .plaintext_u64(ctx.accounts.user_position.deposit_amount)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![ComputePayoutCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "compute_payout")]
    pub fn compute_payout_callback(
        ctx: Context<ComputePayoutCallback>,
        output: SignedComputationOutputs<ComputePayoutOutput>,
    ) -> Result<()> {
        let result = output
            .verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account)
            .map_err(|_| DarkPoolError::ComputationAborted)?;

        let payout_bytes = &result.field_0.ciphertexts[0];
        let payout_amount = u64::from_le_bytes(payout_bytes[..8].try_into().unwrap_or([0u8; 8]));

        ctx.accounts.user_position.payout_amount = payout_amount;
        ctx.accounts.user_position.status = PositionStatus::PayoutComputed;

        emit!(PayoutComputed {
            market: ctx.accounts.market.key(),
            position: ctx.accounts.user_position.key(),
            user: ctx.accounts.user_position.owner,
            payout_amount,
        });

        Ok(())
    }

    pub fn claim_payout(ctx: Context<ClaimPayout>) -> Result<()> {
        let market = &ctx.accounts.market;
        let position = &mut ctx.accounts.user_position;
        let clock = Clock::get()?;

        require!(position.payout_amount > 0, DarkPoolError::NoPayout);

        let payout_amount = position.payout_amount;

        let market_id_bytes = market.market_id.to_le_bytes();
        let seeds = &[VAULT_SEED, market_id_bytes.as_ref(), &[market.vault_bump]];
        let signer_seeds = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.claimer_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, payout_amount)?;

        position.status = PositionStatus::Claimed;
        position.claimed_at = Some(clock.unix_timestamp);

        emit!(PayoutClaimed {
            market: market.key(),
            position: position.key(),
            user: position.owner,
            amount: payout_amount,
        });

        Ok(())
    }

    pub fn cancel_market(ctx: Context<CancelMarket>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(
            market.status == MarketStatus::Created
                || market.status == MarketStatus::Open
                || market.status == MarketStatus::BettingClosed,
            DarkPoolError::InvalidMarketStatus
        );

        market.status = MarketStatus::Cancelled;

        emit!(MarketCancelled {
            market: market.key(),
            cancelled_at: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        let market = &ctx.accounts.market;
        let position = &mut ctx.accounts.user_position;
        let clock = Clock::get()?;

        require!(position.can_claim_refund(), DarkPoolError::AlreadyClaimed);

        let refund_amount = position.deposit_amount;

        let market_id_bytes = market.market_id.to_le_bytes();
        let seeds = &[VAULT_SEED, market_id_bytes.as_ref(), &[market.vault_bump]];
        let signer_seeds = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.claimer_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, refund_amount)?;

        position.status = PositionStatus::Refunded;
        position.claimed_at = Some(clock.unix_timestamp);

        emit!(RefundClaimed {
            market: market.key(),
            position: position.key(),
            user: position.owner,
            amount: refund_amount,
        });

        Ok(())
    }
}

#[init_computation_definition_accounts("process_bet", payer)]
#[derive(Accounts)]
pub struct InitProcessBetCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(mut)]
    /// CHECK: Validated by Arcium
    pub comp_def_account: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("compute_payout", payer)]
#[derive(Accounts)]
pub struct InitComputePayoutCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(mut)]
    /// CHECK: Validated by Arcium
    pub comp_def_account: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + DarkMarket::INIT_SPACE,
        seeds = [MARKET_SEED, market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, DarkMarket>,

    #[account(
        init,
        payer = authority,
        space = 8 + EncryptedPoolState::INIT_SPACE,
        seeds = [POOL_STATE_SEED, market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pool_state: Account<'info, EncryptedPoolState>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        token::mint = token_mint,
        token::authority = vault,
        seeds = [VAULT_SEED, market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OpenMarket<'info> {
    #[account(constraint = authority.key() == market.authority @ DarkPoolError::Unauthorized)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub market: Account<'info, DarkMarket>,

    #[account(
        mut,
        constraint = pool_state.market == market.key() @ DarkPoolError::InvalidPoolState
    )]
    pub pool_state: Account<'info, EncryptedPoolState>,
}

#[queue_computation_accounts("process_bet", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    #[account(mut)]
    pub market: Box<Account<'info, DarkMarket>>,

    #[account(
        mut,
        constraint = pool_state.market == market.key() @ DarkPoolError::InvalidPoolState,
        constraint = pool_state.is_initialized @ DarkPoolError::PoolStateNotInitialized
    )]
    pub pool_state: Box<Account<'info, EncryptedPoolState>>,

    #[account(
        init,
        payer = payer,
        space = 8 + UserPosition::INIT_SPACE,
        seeds = [USER_POSITION_SEED, market.key().as_ref(), bettor.key().as_ref()],
        bump
    )]
    pub user_position: Box<Account<'info, UserPosition>>,

    #[account(
        mut,
        constraint = bettor_token_account.owner == bettor.key() @ DarkPoolError::InvalidTokenAccountOwner,
        constraint = bettor_token_account.mint == market.token_mint @ DarkPoolError::InvalidTokenMint
    )]
    pub bettor_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = vault.key() == market.vault @ DarkPoolError::InvalidVault
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(mut, address = derive_mempool_pda!(mxe_account, DarkPoolError::ClusterNotSet))]
    /// CHECK: Validated by address constraint
    pub mempool_account: UncheckedAccount<'info>,

    #[account(mut, address = derive_execpool_pda!(mxe_account, DarkPoolError::ClusterNotSet))]
    /// CHECK: Validated by address constraint
    pub executing_pool: UncheckedAccount<'info>,

    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, DarkPoolError::ClusterNotSet))]
    /// CHECK: Validated by address constraint
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_comp_def_pda!(comp_def_offset("process_bet")))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,

    #[account(mut, address = derive_cluster_pda!(mxe_account, DarkPoolError::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,

    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,

    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("process_bet")]
#[derive(Accounts)]
pub struct ProcessBetCallback<'info> {
    #[account(mut)]
    pub market: Account<'info, DarkMarket>,

    #[account(mut, constraint = pool_state.market == market.key() @ DarkPoolError::InvalidPoolState)]
    pub pool_state: Account<'info, EncryptedPoolState>,

    #[account(mut, constraint = user_position.market == market.key() @ DarkPoolError::InvalidPosition)]
    pub user_position: Account<'info, UserPosition>,

    pub arcium_program: Program<'info, Arcium>,

    #[account(address = derive_comp_def_pda!(comp_def_offset("process_bet")))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: Validated by Arcium callback
    pub computation_account: UncheckedAccount<'info>,

    pub cluster_account: Account<'info, Cluster>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: Validated by address constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CloseBetting<'info> {
    #[account(constraint = authority.key() == market.authority @ DarkPoolError::Unauthorized)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub market: Account<'info, DarkMarket>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(constraint = authority.key() == market.authority @ DarkPoolError::Unauthorized)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub market: Account<'info, DarkMarket>,
}

#[queue_computation_accounts("compute_payout", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct ComputePayout<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(constraint = market.status == MarketStatus::Resolved @ DarkPoolError::MarketNotResolved)]
    pub market: Box<Account<'info, DarkMarket>>,

    #[account(constraint = pool_state.market == market.key() @ DarkPoolError::InvalidPoolState)]
    pub pool_state: Box<Account<'info, EncryptedPoolState>>,

    #[account(
        mut,
        constraint = user_position.market == market.key() @ DarkPoolError::InvalidPosition,
        constraint = user_position.status == PositionStatus::Processed @ DarkPoolError::InvalidMarketStatus
    )]
    pub user_position: Box<Account<'info, UserPosition>>,

    #[account(init_if_needed, space = 9, payer = payer, seeds = [&SIGN_PDA_SEED], bump)]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(mut, address = derive_mempool_pda!(mxe_account, DarkPoolError::ClusterNotSet))]
    /// CHECK: Validated by address constraint
    pub mempool_account: UncheckedAccount<'info>,

    #[account(mut, address = derive_execpool_pda!(mxe_account, DarkPoolError::ClusterNotSet))]
    /// CHECK: Validated by address constraint
    pub executing_pool: UncheckedAccount<'info>,

    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, DarkPoolError::ClusterNotSet))]
    /// CHECK: Validated by address constraint
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_comp_def_pda!(comp_def_offset("compute_payout")))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,

    #[account(mut, address = derive_cluster_pda!(mxe_account, DarkPoolError::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,

    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,

    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("compute_payout")]
#[derive(Accounts)]
pub struct ComputePayoutCallback<'info> {
    #[account(mut, constraint = market.status == MarketStatus::Resolved @ DarkPoolError::MarketNotResolved)]
    pub market: Account<'info, DarkMarket>,

    #[account(mut, constraint = user_position.market == market.key() @ DarkPoolError::InvalidPosition)]
    pub user_position: Account<'info, UserPosition>,

    pub arcium_program: Program<'info, Arcium>,

    #[account(address = derive_comp_def_pda!(comp_def_offset("compute_payout")))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: Validated by Arcium callback
    pub computation_account: UncheckedAccount<'info>,

    pub cluster_account: Account<'info, Cluster>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: Validated by address constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ClaimPayout<'info> {
    #[account(mut)]
    pub claimer: Signer<'info>,

    #[account(
        constraint = market.status == MarketStatus::Resolved || market.status == MarketStatus::Settled @ DarkPoolError::MarketNotResolved
    )]
    pub market: Account<'info, DarkMarket>,

    #[account(
        mut,
        seeds = [USER_POSITION_SEED, market.key().as_ref(), claimer.key().as_ref()],
        bump = user_position.bump,
        constraint = user_position.owner == claimer.key() @ DarkPoolError::Unauthorized,
        constraint = user_position.status == PositionStatus::PayoutComputed @ DarkPoolError::PayoutNotComputed
    )]
    pub user_position: Account<'info, UserPosition>,

    #[account(
        mut,
        constraint = claimer_token_account.owner == claimer.key() @ DarkPoolError::InvalidTokenAccountOwner,
        constraint = claimer_token_account.mint == market.token_mint @ DarkPoolError::InvalidTokenMint
    )]
    pub claimer_token_account: Account<'info, TokenAccount>,

    #[account(mut, constraint = vault.key() == market.vault @ DarkPoolError::InvalidVault)]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelMarket<'info> {
    #[account(constraint = authority.key() == market.authority @ DarkPoolError::Unauthorized)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub market: Account<'info, DarkMarket>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub claimer: Signer<'info>,

    #[account(constraint = market.status == MarketStatus::Cancelled @ DarkPoolError::MarketNotCancelled)]
    pub market: Account<'info, DarkMarket>,

    #[account(
        mut,
        seeds = [USER_POSITION_SEED, market.key().as_ref(), claimer.key().as_ref()],
        bump = user_position.bump,
        constraint = user_position.owner == claimer.key() @ DarkPoolError::Unauthorized
    )]
    pub user_position: Account<'info, UserPosition>,

    #[account(
        mut,
        constraint = claimer_token_account.owner == claimer.key() @ DarkPoolError::InvalidTokenAccountOwner,
        constraint = claimer_token_account.mint == market.token_mint @ DarkPoolError::InvalidTokenMint
    )]
    pub claimer_token_account: Account<'info, TokenAccount>,

    #[account(mut, constraint = vault.key() == market.vault @ DarkPoolError::InvalidVault)]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
