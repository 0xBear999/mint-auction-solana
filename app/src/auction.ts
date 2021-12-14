export type Auction = {
  "version": "0.0.0",
  "name": "auction",
  "instructions": [
    {
      "name": "initVaultToken",
      "accounts": [
        {
          "name": "vaultMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initMint",
      "accounts": [
        {
          "name": "bidInfo",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ownerPlatformToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "start",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateBid",
      "accounts": [
        {
          "name": "bidInfo",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "buyer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "buyerPlatformTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "bidPlatformTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "oldBuyerPlatformTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "transferNft",
      "accounts": [
        {
          "name": "bidInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fromAuthority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "from",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "toAuthority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "to",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "bidInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mintAccount",
            "type": "publicKey"
          },
          {
            "name": "buyer",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "startBid",
            "type": "u64"
          },
          {
            "name": "lastBid",
            "type": "u64"
          },
          {
            "name": "timeStart",
            "type": "u64"
          },
          {
            "name": "timeEnd",
            "type": "u64"
          }
        ]
      }
    }
  ]
};

export const IDL: Auction = {
  "version": "0.0.0",
  "name": "auction",
  "instructions": [
    {
      "name": "initVaultToken",
      "accounts": [
        {
          "name": "vaultMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initMint",
      "accounts": [
        {
          "name": "bidInfo",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ownerPlatformToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "start",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateBid",
      "accounts": [
        {
          "name": "bidInfo",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "buyer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "buyerPlatformTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "bidPlatformTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "oldBuyerPlatformTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "transferNft",
      "accounts": [
        {
          "name": "bidInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fromAuthority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "from",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "toAuthority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "to",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "bidInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mintAccount",
            "type": "publicKey"
          },
          {
            "name": "buyer",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "startBid",
            "type": "u64"
          },
          {
            "name": "lastBid",
            "type": "u64"
          },
          {
            "name": "timeStart",
            "type": "u64"
          },
          {
            "name": "timeEnd",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
