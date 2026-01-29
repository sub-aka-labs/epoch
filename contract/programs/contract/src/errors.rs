use anchor_lang::prelude::*;

#[error_code]
pub enum DarkPoolError {
    #[msg("Question exceeds maximum length of 200 characters")]
    QuestionTooLong,

    #[msg("Betting end time must be before resolution end time")]
    InvalidDeadlines,

    #[msg("Deadline cannot be in the past")]
    DeadlineInPast,

    #[msg("Market is not open for betting")]
    MarketNotOpen,

    #[msg("Betting period has not started yet")]
    BettingNotStarted,

    #[msg("Betting period has ended")]
    BettingEnded,

    #[msg("Betting period has not ended yet")]
    BettingNotEnded,

    #[msg("Market has not been resolved")]
    MarketNotResolved,

    #[msg("Market has already been resolved")]
    MarketAlreadyResolved,

    #[msg("Market is not cancelled")]
    MarketNotCancelled,

    #[msg("Invalid market status for this operation")]
    InvalidMarketStatus,

    #[msg("Bet amount must be greater than zero")]
    InvalidBetAmount,

    #[msg("Encrypted bet data size is invalid")]
    InvalidEncryptedBetSize,

    #[msg("Invalid outcome - must be 0 (NO) or 1 (YES)")]
    InvalidOutcome,

    #[msg("Position has already been claimed")]
    AlreadyClaimed,

    #[msg("No payout available for this position")]
    NoPayout,

    #[msg("Payout has not been computed yet")]
    PayoutNotComputed,

    #[msg("Unauthorized - only market authority can perform this action")]
    Unauthorized,

    #[msg("Invalid token account owner")]
    InvalidTokenAccountOwner,

    #[msg("Token mint does not match market")]
    InvalidTokenMint,

    #[msg("Vault does not match market")]
    InvalidVault,

    #[msg("Pool state does not match market")]
    InvalidPoolState,

    #[msg("Position does not belong to this market")]
    InvalidPosition,

    #[msg("Pool state has not been initialized")]
    PoolStateNotInitialized,

    #[msg("Encrypted state exceeds maximum size")]
    EncryptedStateTooLarge,

    #[msg("Computation was aborted")]
    ComputationAborted,

    #[msg("Cluster not set in MXE account")]
    ClusterNotSet,

    #[msg("Invalid computation result")]
    InvalidComputationResult,

    #[msg("Arithmetic overflow")]
    Overflow,

    #[msg("Arithmetic underflow")]
    Underflow,
}
