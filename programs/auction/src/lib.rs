use anchor_lang::prelude::*;
use anchor_spl::token::{
    self, 
    Token, 
    Mint, 
    TokenAccount, 
    SetAuthority, 
    MintTo, 
    Transfer, 
};
use spl_token::instruction::AuthorityType;
use std::time::{ Duration };

declare_id!("3MzZ4DoRKjH8ar7VELx7KRg4KB31sayjQi81RYucUvpB");

// The process
// [X] 1) Alice mint an NFT and starting the auction
// [X] 2) Bob place the bid
// [X] 2.1) Bob must place the bid above the minimum threshold (10% of current bid)
// [X] 2.2) Bob must transfer the "platform token" to "bid's platform token account"
// [X] 3) After the first bid, the 15 seconds countdown start (It should be 24 Hours)
// [X] 4) Charlie place a new bid higher than Bob
// [X] 4.1) "bid's platform token account" must transfer the old bid back to Bob
// [X] 5) 15 seconds passed, Charlie win
// [X] 5.1) Alice should transfer "NFT" to Charlie and receive the money from bid account

// To do
// [ ] Swap??
// [ ] Add custom error
// [ ] Taking advantages of #[account(...)] eg; [constraint = ...] , [token::mint = ...] 
// [ ] Test that NFT's mint authority cannot be manipulate in the future
// [ ] Test with multiple auction occuring simutaneously
// [ ] Test with one person bid multiple nft
// [ ] *** Refactor code and variable name

#[program]
pub mod auction {
    use super::*;

    pub fn init_vault_token(ctx: Context<PlatformToken>) -> ProgramResult {
        token::mint_to(
            ctx.accounts.mint_to(), 
            1_000_000_0000000000)?;
        
        Ok(())
    }

    pub fn init_mint(ctx: Context<MintInfo>, start: u64) -> ProgramResult {

        // First check that this token didn't mint anything yet
        if ctx.accounts.mint.supply != 0 {
            return Err(ProgramError::InvalidArgument)
        };
        
        // Mint the token and delete mint authority
        token::mint_to(
            ctx.accounts.mint_to(),
            1)?;
        token::set_authority(
            ctx.accounts.null_authority(),
            AuthorityType::MintTokens,
            None)?;
        
        // Store the data
        let bid_info_account = &mut ctx.accounts.bid_info;

        bid_info_account.buyer = None;
        bid_info_account.mint_account = ctx.accounts.mint.key();
        bid_info_account.owner =  *ctx.accounts.owner.key;
        bid_info_account.start_bid = start;
        bid_info_account.last_bid = start;

        Ok(())
    }

    // TO DO (Bidding process)
    // [X] Bid must exceed 10% of current bid [Done]
    // [X] Use += not == (add more bid) [Done]
    // [Using new token instead] Bid must count in SOL but sending as lamports
    // [Using 15 seconds instead] 24 Hours countdown after bid
    pub fn update_bid(ctx: Context<Bid>, amount: u64) -> ProgramResult {

        // Upon placing the bid amount, let's transfer the  bidding amount
        // to the bid's platform token account
        token::transfer(
            ctx.accounts.new_bid(), 
            amount)?;
        // If anything below this line failed, transaction will be revert
        // So the transfer function above won't success
        
        let minimum_bid = (ctx.accounts.bid_info.last_bid as f64 * 1.1) as u64;

        // If amount less than minimum (10% of old bid)
        // or if NFT's owner try to raise more price, return Error
        if amount < minimum_bid || 
        ctx.accounts.buyer.key.to_string() == ctx.accounts.bid_info.owner.to_string() {
            return Err(ProgramError::InvalidArgument) // [ ] Custom
        } else if amount > ctx.accounts.buyer_platform_token_account.amount {
            // If total bidding amount is more than account's balance, return error
            return Err(ProgramError::InsufficientFunds) // [ ] Custom
        }

        // Check associated with buyer address and lamports
        match ctx.accounts.bid_info.buyer {
            // This condition mean that this is not the first round bid (first person)
            Some(x) => {
                // If it's the same person bidding again, return an error
                if ctx.accounts.buyer.key.to_string() == x.to_string() {
                    msg!("Cannot bid on yourself");
                    return Err(ProgramError::InvalidArgument)
                }
                // If everything works, Let's transfer the old bid amount back
                token::transfer(
                    ctx.accounts.return_bid(), 
                    ctx.accounts.bid_info.last_bid)?;
            },
            // This condition mean that it is the first time bidding
            None => {}
        }

        // Update data
        let bid_info_account = &mut ctx.accounts.bid_info;

        bid_info_account.buyer = Some(*ctx.accounts.buyer.key);
        bid_info_account.last_bid = amount;

        let wait_drt = Duration::from_secs(15);

        bid_info_account.time_start = Clock::get().unwrap().unix_timestamp as u64;
        bid_info_account.time_end = bid_info_account.time_start + wait_drt.as_secs(); 

        Ok(())
    }
    pub fn transfer_nft(ctx: Context<TrasferAccount>) -> ProgramResult {

        // Check that it exceed the countdown
        let now = Clock::get()?.unix_timestamp as u64;

        if ctx.accounts.bid_info.time_end > now {
            msg!("Invalid time {:?} < {:?}", now, ctx.accounts.bid_info.time_end);
            return Err(ProgramError::InvalidArgument) // [ ] Custom
        }

        // Sending NFT Token to the winner
        token::transfer(
            ctx.accounts.transfer_to(), 
            1)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct PlatformToken<'info> {
    #[account(mut)]
    pub vault_mint: Account<'info, Mint>,
    #[account(mut)]
    pub vault_token_account: AccountInfo<'info>,
    #[account(mut, signer)]
    pub user: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

impl<'info> PlatformToken<'info> {
    pub fn mint_to(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        let account = MintTo {
            mint: self.vault_mint.to_account_info().clone(),
            to: self.vault_token_account.to_account_info().clone(),
            authority: self.user.clone(),
        };
        let program = self.token_program.to_account_info();
        CpiContext::new(program,account)
    }
}

#[derive(Accounts)]
pub struct MintInfo<'info> {
    #[account(init, payer = owner, space = 512)]
    pub bid_info: Account<'info, BidInfo>,
    #[account(mut)] // Needed for isWriteable
    pub token_account: Account<'info, TokenAccount>,
    #[account(mut)] // Needed for isWriteable
    pub owner_platform_token: Account<'info, TokenAccount>,
    #[account(mut)] // Needed for isWriteable
    pub mint: Account<'info, Mint>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut, signer)]
    pub owner: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> MintInfo<'info> {
    pub fn mint_to(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        let account = MintTo {
            mint: self.mint.to_account_info().clone(),
            to: self.token_account.to_account_info().clone(),
            authority: self.owner.clone(),
        };
        let program = self.token_program.to_account_info();
        CpiContext::new(program,account)
    }
    pub fn null_authority(&self) -> CpiContext<'_, '_, '_, 'info, SetAuthority<'info>> {
        let account = SetAuthority {
            current_authority: self.owner.clone(),
            account_or_mint: self.mint.to_account_info().clone(),
        };
        let program = self.token_program.to_account_info();
        CpiContext::new(program, account)
    }
}

#[derive(Accounts)]
pub struct Bid<'info> {
    #[account(mut, signer)]
    pub bid_info: Account<'info, BidInfo>,
    #[account(mut, signer)]
    pub buyer: AccountInfo<'info>,
    #[account(mut)]
    pub buyer_platform_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub bid_platform_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub old_buyer_platform_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> Bid<'info> {
    pub fn new_bid(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let account = Transfer {
            from: self.buyer_platform_token_account.to_account_info().clone(),
            to: self.bid_platform_token_account.to_account_info().clone(),
            authority: self.buyer.clone()
        };
        let program = self.token_program.to_account_info();
        CpiContext::new(program, account)
    }
    pub fn return_bid(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let account = Transfer {
            from: self.bid_platform_token_account.to_account_info().clone(),
            to: self.old_buyer_platform_token_account.to_account_info().clone(),
            authority: self.bid_info.to_account_info().clone()
        };
        let program = self.token_program.to_account_info();
        CpiContext::new(program, account)
    }
}

#[account]
pub struct BidInfo {
    pub mint_account: Pubkey,
    pub buyer: Option<Pubkey>,
    pub owner: Pubkey,
    pub start_bid: u64,
    pub last_bid: u64,
    pub time_start: u64,
    pub time_end: u64,
}

#[derive(Accounts)]
pub struct TrasferAccount<'info> {
    #[account(mut)]
    pub bid_info: Account<'info, BidInfo>,
    #[account(mut, signer)]
    pub from_authority: AccountInfo<'info>,
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    #[account(mut, signer)]
    pub to_authority: AccountInfo<'info>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    #[account(mut)]
    pub mint_account: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> TrasferAccount<'info> {
    pub fn transfer_to(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let account = Transfer {
            from: self.from.to_account_info().clone(),
            to: self.to.to_account_info().clone(),
            authority: self.from_authority.clone()
        };
        let program = self.token_program.to_account_info();
        CpiContext::new(program, account)
    }
}