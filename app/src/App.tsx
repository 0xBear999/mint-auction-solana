import './App.css';

import React, { useState } from 'react';
import Modal  from 'react-modal';

import { 
  Connection, 
  ConfirmOptions, 
  Commitment, 
  Transaction, 
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';

import * as anchor from '@project-serum/anchor';

import * as spl_token from '@solana/spl-token';

import { IDL } from './auction';

import { getPhantomWallet } from '@solana/wallet-adapter-wallets';
import { ConnectionProvider, useAnchorWallet, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Program } from '@project-serum/anchor';

require('@solana/wallet-adapter-react-ui/styles.css');

const phantomWallets = [getPhantomWallet()];

const { SystemProgram, Keypair } = anchor.web3;

const vaultAccount = Keypair.generate();

let preflightCommitment: Commitment = "confirmed";
let opts: ConfirmOptions = {
  preflightCommitment
};
let id = 1;

const programId = new anchor.web3.PublicKey("3MzZ4DoRKjH8ar7VELx7KRg4KB31sayjQi81RYucUvpB");

let vaultMint: spl_token.Token;
let provider: anchor.Provider;
let vaultTokenAccount: anchor.web3.PublicKey;

Modal.setAppElement('#root');


function App() {
  const wallet = useAnchorWallet();

  const [tokenAddress, updateTokenAddress] = useState('');
  const [tokenSupply, updateTokenSupply] = useState('');

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [solAmount, updateSolAmount] = useState(0);
  const [swapModal, setSwapModal] = useState(false);
  const [walletToken, setWalletToken] = useState<Array<any>>([]);

  const [startPrice, setStartPrice] = useState(0);

  const getProvider = async () => {
    // const network = "http://127.0.0.1:8899";
    const network = "https://api.devnet.solana.com";

    const connection = new Connection(network, opts.preflightCommitment);
    provider = new anchor.Provider(
      connection, wallet!, opts
    );
    return provider;
  };

  const initializeProcess = async () => {
    
    const provider = await getProvider();
    const program = new Program(IDL, programId, provider);

    const send_lamport = new Transaction({
      feePayer: wallet?.publicKey,
      recentBlockhash: await (await provider.connection.getRecentBlockhash()).blockhash
    }).add(
      SystemProgram.transfer({
        fromPubkey: wallet!.publicKey,
        toPubkey: vaultAccount.publicKey,
        lamports: LAMPORTS_PER_SOL / 100 // 0.01 SOL
      }),
    );

    await wallet?.signTransaction(
      send_lamport,
    );

    await anchor.web3.sendAndConfirmRawTransaction(
      provider.connection,
      send_lamport.serialize()
    );

    vaultMint = await spl_token.Token.createMint(
      provider.connection,
      vaultAccount,
      vaultAccount.publicKey,
      vaultAccount.publicKey,
      10,
      spl_token.TOKEN_PROGRAM_ID
    );

    vaultTokenAccount = await vaultMint.createAccount(vaultAccount.publicKey);

    try {
     await program.rpc.initVaultToken(
      {
      accounts: {
        vaultMint: vaultMint.publicKey,
        vaultTokenAccount: vaultTokenAccount,
        user: vaultAccount.publicKey,
        tokenProgram: spl_token.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
      },
      signers: [vaultAccount]
        }
      );
    }
    catch (err) {
      console.log(err)
    }
  }

  let totalSupply = async () => {
    let supply = ((await vaultMint.getMintInfo()).supply.div(new anchor.BN(1e10))).toString();
    updateTokenSupply(supply);
    updateTokenAddress(vaultMint.publicKey.toString());
  };

  const addAccount = (walletAddress: anchor.web3.PublicKey, tokenAddress: anchor.web3.PublicKey) => {
    const newState = {walletAddress, tokenAddress};
    setWalletToken([...walletToken, newState]);
  }

  const buyPlatformToken = async (solAmount: number, tokenAddr: anchor.web3.PublicKey) => {
    const basic_swap = new Transaction({
      feePayer: wallet?.publicKey,
      recentBlockhash: await (await provider.connection.getRecentBlockhash()).blockhash
    }).add(
      SystemProgram.transfer({
        fromPubkey: wallet!.publicKey,
        toPubkey: vaultAccount.publicKey,
        lamports: solAmount * LAMPORTS_PER_SOL
      })
    )
    await wallet?.signTransaction(basic_swap);
    await anchor.web3.sendAndConfirmRawTransaction(
      provider.connection,
      basic_swap.serialize()
    );

    await vaultMint.transfer(
      vaultTokenAccount,
      tokenAddr,
      vaultAccount.publicKey,
      [vaultAccount],
      solAmount * 1000 * 1e10,
    )

  }

  const startMint = async (startPrice: number) => {
    const bidInfoAccount = anchor.web3.Keypair.generate();
    const ownerNftAccount = Keypair.generate();

    const send_lamport = new Transaction({
      feePayer: wallet?.publicKey,
      recentBlockhash: await (await provider.connection.getRecentBlockhash()).blockhash
    }).add(
      SystemProgram.transfer({
        fromPubkey: wallet!.publicKey,
        toPubkey: ownerNftAccount.publicKey,
        lamports: LAMPORTS_PER_SOL / 100 // 0.01 SOL
      }),
    );
    await wallet?.signTransaction(
      send_lamport,
    );

    await anchor.web3.sendAndConfirmRawTransaction(
      provider.connection,
      send_lamport.serialize()
    );


    const mintAccount = await spl_token.Token.createMint(
      provider.connection,
      ownerNftAccount,
      ownerNftAccount.publicKey,
      null,
      0,
      programId 
    );
    const NFTTokenAccount = await mintAccount.createAccount(wallet!.publicKey);


  }

  return (
    <div className="App">
      <header className="Connect__header">
        <div className="Connect__wallet">
          <WalletMultiButton className="Connect__button" />
        </div>
      </header>
      <div className="Initialize__token">
        {
          !initialized && (
            <button className="Initialize__button" onClick={() => {
              setModalIsOpen(true)
            }}>Initialize</button>
          )
        }
        <Modal  
          isOpen={modalIsOpen}     
          onRequestClose={() => setModalIsOpen(false)}
          style={{
            content: {
              top: '200px',
              left: '200px',
              right: '200px',
              bottom: '200px',
              overflow: 'hidden',
              border: '20px',
              background: 'linear-gradient(to right, #eeaeca, #ca94e9)',
              borderRadius: '20px',
            }
          }}
          >
            <h2 className="Initialize__ModalHeader">Transaction Details</h2>
            <p className="Initialize__ModalBody">You are about to send 0.1 SOL and Initialize the platform token</p>
            <div>
              <button className="Initialize__ModalClose" onClick={async () =>{
                await initializeProcess();
                setModalIsOpen(false);
                setInitialized(true);
                totalSupply();
              }}>Send Transaction</button>
            </div>
        </Modal>
      </div>
      {
        initialized && (
          <h4  
            className="Initialize__Detail"
            onClick={() => {
              window.open(new URL(`https://solscan.io/token/${tokenAddress}?cluster=devnet`))
            }}
          >
              Token: {tokenAddress.toString()}<br/>  Total Supply: {(tokenSupply).toString()}
          </h4>
        )
      }
      {
        initialized && (
        <div>
          <button className="Swap__button" onClick={() => setSwapModal(true)}>Swap</button>
          <Modal  
          isOpen={swapModal}     
          onRequestClose={() => setSwapModal(false)}
          style={{
            content: {
              top: '200px',
              left: '200px',
              right: '200px',
              bottom: '200px',
              overflow: 'hidden',
              border: '20px',
              background: 'linear-gradient(to right, #eeaeca, #ca94e9)',
              borderRadius: '20px',
            }
          }}
          >
            <div className="Swap__Modal">
            <div className="Swap__From">
              <h4>From SOL:  
              <input
                name="From SOL:"
                type="number"
                onChange={(e) => updateSolAmount(e.target.valueAsNumber)}
              />
              </h4>
            </div>
            <div className="Swap__To">
              <h4>To Token:
                <input value={solAmount * 1000} readOnly/>
              </h4>
            </div>
            <button onClick={async (e) => {
              const tokenCheck = walletToken.filter(({walletAddress, tokenAddress}) => walletAddress === wallet!.publicKey);
              if (tokenCheck.length === 0) {
                const tokenAddr = await vaultMint.createAccount(wallet!.publicKey);
                await buyPlatformToken(solAmount, tokenAddr);
                addAccount(wallet!.publicKey, tokenAddr);
              } else {
                const tokenAddr = tokenCheck[0]['tokenAddress'];
                await buyPlatformToken(solAmount, tokenAddr);
              }
              setSwapModal(false);
              }}>Swap</button>
            </div>
          </Modal>
        
        </div>
        )}
        {
        }
    </div>
  );
}

const AppWithProvider = () => (
  <ConnectionProvider endpoint="http://127.0.0.1:8899">
    <WalletProvider wallets={phantomWallets} autoConnect>
      <WalletModalProvider>
        <App />
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
)

export default AppWithProvider;