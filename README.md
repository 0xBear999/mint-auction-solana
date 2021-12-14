Still not finish :( 

# Start

```
npm install
```

Make sure you have enough SOL (do this for both your phantom account and your cli account)
```
solana airdrop 5 <Your address> --url https://api.devnet.solana.com
solana config set --url https://api.devnet.solana.com
```
# Testing
```
anchor test --provider.cluster localnet
```


# With frontend

Create Typescript IDL for the frontend, deploy smart contract to Solana devnet

```
anchor build -t "../../app/src"
anchor deploy
```

Let's start our frontend
```
cd app
npm start
```

# What's next
1) Create account with bump and nonce or try to fetch the mint and token address so it doesn't have to create a new token everytime
2) Try Metaplex
