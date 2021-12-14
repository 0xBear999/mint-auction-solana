import * as anchor from '@project-serum/anchor';
import * as spl_token from '@solana/spl-token';
import * as serum from '@project-serum/common';
import { assert } from 'chai';
import { create, urlSource } from 'ipfs-http-client';
import { SYSVAR_RENT_PUBKEY } from '@solana/web3.js';

const { SystemProgram, LAMPORTS_PER_SOL } = anchor.web3;

describe('Minting process', () => {

  const provider = anchor.Provider.env(); 
  const program = anchor.workspace.Auction;
  const system_program = SystemProgram.programId;

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  // Initialize
  const devAccount = anchor.web3.Keypair.generate();

  // Platform token (easier to control compare to using lamports)
  let _vaultMint: spl_token.Token;
  let _vault_token_account: anchor.web3.PublicKey;

  // First NFT
  const myAccount = anchor.web3.Keypair.generate(); // Owner
  let _nft_mint_account: spl_token.Token;
  let _nft_token_account: anchor.web3.PublicKey;
  let _nft_bid_info_account: anchor.web3.Keypair;
  let _nft_owner_platform_token_account: anchor.web3.PublicKey;
  let _nft_bid_platform_token_account: anchor.web3.PublicKey;

  // Second NFT
  let _nft_mint_account_2: spl_token.Token;
  let _nft_token_account_2: anchor.web3.PublicKey;
  let _nft_owner_platform_token_account_2: anchor.web3.PublicKey;

  // First Bidder
  const bobAccount = anchor.web3.Keypair.generate();
  let _bob_platform_token_account: anchor.web3.PublicKey;

  // Second Bidder
  const charlieAccount = anchor.web3.Keypair.generate();
  let _charlie_platform_token_account: anchor.web3.PublicKey;

  it('should initialize platform token', async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        devAccount.publicKey,
        LAMPORTS_PER_SOL * 5
      )
    );

    const vaultMint = await spl_token.Token.createMint(
      provider.connection,
      devAccount,
      devAccount.publicKey,
      devAccount.publicKey,
      10,
      spl_token.TOKEN_PROGRAM_ID
    );
    const vaultTokenAccount = await vaultMint.createAccount(devAccount.publicKey);

    const tx = await program.rpc.initVaultToken(
      {
        accounts: {
          vaultMint: vaultMint.publicKey,
          vaultTokenAccount: vaultTokenAccount,
          user: devAccount.publicKey,
          tokenProgram: spl_token.TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: system_program
        },
        signers: [devAccount]
      }
    );

    _vaultMint = vaultMint;
    _vault_token_account = vaultTokenAccount;
  })

  it('should create account and minted first nft', async () => {
    // Request an airdrop to pay initialize accounts fees
    if (await provider.connection.getBalance(myAccount.publicKey) == 0) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          myAccount.publicKey,
          LAMPORTS_PER_SOL
        )
      );
    };
    const token_program = spl_token.TOKEN_PROGRAM_ID;

    const bid_info_account = anchor.web3.Keypair.generate();
    
    // This is NFT mint account with null freezing authority
    const mint_account = await spl_token.Token.createMint(
      provider.connection,
      myAccount,
      myAccount.publicKey,
      null,
      0,
      token_program
    );

    const token_account = await mint_account.createAccount(myAccount.publicKey);
    assert(
      await (await mint_account.getMintInfo()).supply.toNumber() == 0, 
      "Token supply is not equal to 0");

    // Need this to pass u64
    const starting_price = new anchor.BN(1);

    // Create platform token account for this NFT's owner
    const owner_platform_token = await _vaultMint.createAccount(
      myAccount.publicKey
    );
    await _vaultMint.transfer(
      _vault_token_account,
      owner_platform_token,
      devAccount.publicKey,
      [devAccount],
      100
    );

    // If uncomment this line below, should result in ProgramError::InvalidArgument
    // await mint_account.mintTo(token_account, myAccount.publicKey, [myAccount], 1);

    const tx = await program.rpc.initMint(
      starting_price,
      {
        accounts: {
          bidInfo: bid_info_account.publicKey,
          tokenAccount: token_account,
          ownerPlatformToken: owner_platform_token,
          mint: mint_account.publicKey,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          owner: myAccount.publicKey,
          tokenProgram: token_program,
          systemProgram: system_program,
        },
        signers: [myAccount, bid_info_account]
      }
    );
    console.log("Your tx receipt: ", tx);

    _nft_mint_account = mint_account;
    _nft_token_account = token_account;
    _nft_bid_info_account = bid_info_account;
    _nft_owner_platform_token_account = owner_platform_token;

    console.log("Passed!");
  })

  it('NFT supply is 1', async () => {
    const mint_account = _nft_mint_account;
    assert(
      (await mint_account.getMintInfo()).supply.toNumber() === 1,
      "NFT supply is not equal to 1");
    const token_account = _nft_token_account;
    assert(
      await (await mint_account.getAccountInfo(token_account)).amount.toNumber() === 1,
      "The NFT token account is holding this token more than 1"
    );
  })

  it('mint authority of NFT should be null', async () => {
    const mint_account = _nft_mint_account;
    assert(
      await (await mint_account.getMintInfo()).mintAuthority === null,
      "NFT's mint authority is not null"
    );
  })

  it('bid init info should match', async () => {
    const nft_bid_info_account = _nft_bid_info_account;
    const mint_account = _nft_mint_account;
    let account = await program.account.bidInfo.fetch(nft_bid_info_account.publicKey);

    assert(mint_account.publicKey.equals(account.mintAccount),
      "NFT mint account not match");

    assert(account.buyer === null,
      "buyer is not null");

    assert(account.lastBid == 1,
      "Starting bid is not equivalent");
  })

  it('mint second nft with same owner', async () => {
    const token_program = spl_token.TOKEN_PROGRAM_ID;
    const sysvar_rent = anchor.web3.SYSVAR_RENT_PUBKEY;

    const bid_info_account = anchor.web3.Keypair.generate();

    const mint_account_2 = await spl_token.Token.createMint(
      provider.connection,
      myAccount,
      myAccount.publicKey,
      null,
      0,
      token_program
    );
    const token_account_2 = await mint_account_2.createAccount(myAccount.publicKey);

    const starting_price = new anchor.BN(3);

    const tx = await program.rpc.initMint(
      starting_price,
      {
        accounts: {
          tokenAccount: token_account_2,
          mint: mint_account_2.publicKey,
          rent: sysvar_rent,
          owner: myAccount.publicKey,
          tokenProgram: token_program,
          systemProgram: system_program,
          bidInfo: bid_info_account.publicKey,
          ownerPlatformToken: _nft_owner_platform_token_account,
        },
        signers: [myAccount, bid_info_account]
      }
    )

    assert((await mint_account_2.getMintInfo()).supply.toNumber() === 1, 
    "Token supply is not equal to 1");

    assert((await mint_account_2.getMintInfo()).mintAuthority === null, 
    "Token's mint authority is not null");

    assert((await mint_account_2.getAccountInfo(token_account_2)).amount.toNumber() === 1,
    "The token account is holding this token more than 1");

    _nft_mint_account_2 = mint_account_2;
    _nft_token_account_2 = token_account_2;
  })

  it('bob should be able to bid, info should be updated and payment should occured', async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        bobAccount.publicKey,
        LAMPORTS_PER_SOL
      )
    );
    const nft_bid_info_account = _nft_bid_info_account;

    let bid_info = await program.account.bidInfo.fetch(nft_bid_info_account.publicKey);

    assert(bid_info.lastBid.toNumber() === 1,
    "Last bid amount not equal to 1 Platform Token");

    const bob_platform_token_account = await _vaultMint.createAccount(bobAccount.publicKey);
    const bid_platform_token_account = await _vaultMint.createAccount(nft_bid_info_account.publicKey);
    await _vaultMint.transfer(
      _vault_token_account,
      bob_platform_token_account,
      devAccount.publicKey,
      [devAccount],
      120
    );

    const bob_bid_amount = new anchor.BN(2);
    const bob_platform_token_initial_balance = await (await _vaultMint.getAccountInfo(bob_platform_token_account)).amount;
    const bid_platform_token_initial_balance = await (await _vaultMint.getAccountInfo(bid_platform_token_account)).amount;

    const tx = await program.rpc.updateBid(
      bob_bid_amount,
      {
        accounts:
        {
          bidInfo: nft_bid_info_account.publicKey,
          buyer: bobAccount.publicKey,
          bidPlatformTokenAccount: bid_platform_token_account,
          buyerPlatformTokenAccount: bob_platform_token_account,
          tokenProgram: spl_token.TOKEN_PROGRAM_ID,
          systemProgram: system_program,
          oldBuyerPlatformTokenAccount: bob_platform_token_account,
        },
        signers: [bobAccount, nft_bid_info_account]
      }
    );

    const bid_platform_token_after_balance = await (await _vaultMint.getAccountInfo(bid_platform_token_account)).amount;
    const bob_platform_token_after_balance = await (await _vaultMint.getAccountInfo(bob_platform_token_account)).amount;
    
    assert(bid_platform_token_after_balance.eqn(
      bob_bid_amount.toNumber() + bid_platform_token_initial_balance.toNumber()),
      "Bid's platform token account didn't receive the correct collateral amount");

    assert(bob_platform_token_after_balance.eqn(
      bob_platform_token_initial_balance.toNumber() - bob_bid_amount.toNumber()),
      "Bob didn't transfer platform token or transfer with wrong argument");
    
    bid_info = await program.account.bidInfo.fetch(nft_bid_info_account.publicKey);

    assert(bid_info.buyer.equals(bobAccount.publicKey),
    "buyer not match");

    assert(bid_info.lastBid.toNumber() === 2,
    "Last bid amount didn't equal to 2");

    _bob_platform_token_account = bob_platform_token_account;
    _nft_bid_platform_token_account = bid_platform_token_account;

    console.log(bid_info.timeStart.toNumber());
    console.log(bid_info.timeEnd.toNumber());
    
  })

  it('charlie should be able to bid, info should be updated, payment and refund should occured', async () => {
    const nft_bid_account = _nft_bid_info_account;
    const charlie_platform_token_account = await _vaultMint.createAccount(
      charlieAccount.publicKey
    );
    const bid_platform_token_account = _nft_bid_platform_token_account;
    const old_buyer_platform_token_account = _bob_platform_token_account;

    await _vaultMint.transfer(
      _vault_token_account,
      charlie_platform_token_account,
      devAccount.publicKey,
      [devAccount],
      50
    );

    let bid_info = await program.account.bidInfo.fetch(nft_bid_account.publicKey);

    assert(bid_info.lastBid.toNumber() === 2,
    "Last bid amount not equal to 2 Platform Token");

    const old_buyer_platform_token_initial_balance = await (await _vaultMint.getAccountInfo(old_buyer_platform_token_account)).amount;
    const bid_platform_token_initial_balance = await (await _vaultMint.getAccountInfo(bid_platform_token_account)).amount;
    const charlie_platform_token_initial_balance = await (await _vaultMint.getAccountInfo(charlie_platform_token_account)).amount;

    const old_buyer_bid_amount = bid_info.lastBid;
    const charlie_bid_amount = new anchor.BN(42);

    await new Promise((f) => setTimeout(f, 5 * 1000 ));

    const tx = await program.rpc.updateBid(
      charlie_bid_amount,
      {
        accounts: {
          bidInfo: nft_bid_account.publicKey,
          buyer: charlieAccount.publicKey,
          buyerPlatformTokenAccount: charlie_platform_token_account,
          bidPlatformTokenAccount: bid_platform_token_account,
          oldBuyerPlatformTokenAccount: old_buyer_platform_token_account,
          tokenProgram: spl_token.TOKEN_PROGRAM_ID,
          systemProgram: system_program
        },
        signers: [charlieAccount, nft_bid_account]
      }
    );

    const old_buyer_platform_token_after_balance = await (await _vaultMint.getAccountInfo(old_buyer_platform_token_account)).amount;
    const bid_platform_token_after_balance = await (await _vaultMint.getAccountInfo(bid_platform_token_account)).amount;
    const charlie_platform_token_after_balance = await (await _vaultMint.getAccountInfo(charlie_platform_token_account)).amount;

    // console.log("", bid_platform_token_after_balance.toNumber(), " == ", charlie_bid_amount.toNumber());
    assert(bid_platform_token_after_balance.eq(charlie_bid_amount),
      "Bid's platform token account didn't receive the correct collateral amount");

    // console.log("", old_buyer_platform_token_after_balance.toNumber(), " == ", old_buyer_platform_token_initial_balance.toNumber() + old_buyer_bid_amount.toNumber());
    assert(old_buyer_platform_token_after_balance.eqn(
      old_buyer_platform_token_initial_balance.toNumber() + old_buyer_bid_amount.toNumber()),
      "Old buyer didn't receive the money back");
    
    // console.log("", charlie_platform_token_after_balance.toNumber(), " == ", charlie_platform_token_initial_balance.toNumber() - charlie_bid_amount.toNumber());
    assert(charlie_platform_token_after_balance.eqn(
      charlie_platform_token_initial_balance.toNumber() - charlie_bid_amount.toNumber()),
      "Charlie didn't transfer platform token or transfer with wrong argument");
    
    bid_info = await program.account.bidInfo.fetch(nft_bid_account.publicKey);

    assert(bid_info.buyer.equals(charlieAccount.publicKey),
    "buyer not match");
    assert(bid_info.lastBid.eq(charlie_bid_amount),
    "Last bid amount didn't equal to 42");

    console.log(bid_info.timeStart.toNumber());
    console.log(bid_info.timeEnd.toNumber());

  })

  it('should transfer NFT', async () => {
    const nft_bid_info_account = _nft_bid_info_account;
    const nft_mint_account = _nft_mint_account;
    const from_token_account = _nft_token_account;
    const to_token_account = await nft_mint_account.createAccount(bobAccount.publicKey);

    assert(await (await nft_mint_account.getAccountInfo(from_token_account)).amount.toNumber() === 1);
    assert(await (await nft_mint_account.getAccountInfo(to_token_account)).amount.toNumber() === 0);

    let bid_info = await program.account.bidInfo.fetch(nft_bid_info_account.publicKey);

    await new Promise((f) => setTimeout(f, 15 * 1000 ));

    const tx = await program.rpc.transferNft({
      accounts: {
        bidInfo: nft_bid_info_account.publicKey,
        fromAuthority: myAccount.publicKey,
        from: from_token_account,
        toAuthority: bobAccount.publicKey,
        to: to_token_account,
        mintAccount: nft_mint_account.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: spl_token.TOKEN_PROGRAM_ID,
        systemProgram: system_program
      },
      signers: [myAccount, bobAccount]
    });

    assert(await (await nft_mint_account.getAccountInfo(from_token_account)).amount.toNumber() === 0);
    assert(await (await nft_mint_account.getAccountInfo(to_token_account)).amount.toNumber() === 1);
  })

});