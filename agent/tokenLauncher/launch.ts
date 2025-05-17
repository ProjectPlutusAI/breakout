import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, createCloseAccountInstruction,createSyncNativeInstruction } from '@solana/spl-token';

import { ComputeBudgetProgram,AddressLookupTableProgram,clusterApiUrl, Connection, Keypair, PublicKey, sendAndConfirmRawTransaction, TransactionInstruction, TransactionMessage, VersionedTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import axios from "axios";
import BN from "bn.js";
import base58 from "bs58";
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Load environment variables
dotenv.config();

// Send the transaction
const connection = new Connection(process.env.RPC_URL!, "confirmed");

export const launchToken = async () => {
    try {

        // Parse private key from array string
        const privateKeyArray = JSON.parse(process.env.PRIVATE_KEY_LAUNCH!) as number[];
        const secretKey = Uint8Array.from(privateKeyArray);
        const keypair = Keypair.fromSecretKey(secretKey);

        const supplyInTokens = 1_000_000_000; // must be one of these: 69M, 420M, 1B, 69B, 420B, 1T
        const supply = new BN(supplyInTokens).mul(new BN(10).pow(new BN(6)));
        const totalSellA = supply.mul(new BN(7931)).div(new BN(10000));

        const createMintEndpoint = "https://buffer-queue.letsbonk22.workers.dev/launchpad/createMint";
        const { mint, poolId, poolPrice, transaction } = (await axios.post(createMintEndpoint, {
            useBonkMintAddress: false, // hardcoded
            owner: keypair.publicKey.toBase58(),
            decimals: 6, // hardcoded
            name: 'Dig Bick',
            symbol: 'BBC',
            uri: 'https://ipfs.io/ipfs/bafkreiaeu7dy4c7ttw4ocveaqoan2tyjvqeixlx343bf3avzmnz7gd23d4',
            migrateType: 'amm', // hardcoded
            platformId: 'FfYek5vEz23cMkWsdJwG2oa6EphsvXSHrGpdALN4g6W1', // hardcoded
            slippage: 100,
            buyAmount: 1, // the amount to buy (SOL) in lamports
            createOnly: true, // true = create launch with no buy, false = create launch with initial buy
            supply: supply.toString(),
            totalSellA: totalSellA.toString(),
            computeBudgetConfig: {
                units: 600000,
                microLamports: 10000
            }
        })).data;

        console.log(`Token mint address: ${mint}`);

        // Parse the transaction from the HTTP API's response
        const versionedTransaction = VersionedTransaction.deserialize(Buffer.from(transaction, 'base64'));

        // Sign the transaction
        versionedTransaction.sign([keypair]);

        const latestBlockhash = await connection.getLatestBlockhash("finalized");
        const transactionHash = await sendAndConfirmRawTransaction(
            connection,
            Buffer.from(versionedTransaction.serialize()),
            {
                signature: base58.encode(versionedTransaction.signatures[0]),
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
            },
            {
                skipPreflight: false,
                preflightCommitment: connection.commitment,
                commitment: connection.commitment
            }
        );

        console.log("Transaction Hash: " + transactionHash);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Status code:', error.response.status);
                console.error('Response data:', JSON.stringify(error.response.data, null, 2));
                if (error.response.data?.error) {
                    console.error('Error details:', JSON.stringify(error.response.data.error, null, 2));
                }
            } else if (error.request) {
                // The request was made but no response was received
                console.error('No response received:', error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Error:', error.message);
            }
        } else {
            console.error('Unexpected error:', error);
        }
    }
};

const UNIT_PRICE = 2_500_000;


const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112")

const RAYDIUM_LAUNCHPAD_PROGRAM_ID = new PublicKey("LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj")
const RAYDIUM_AUTHORITY = new PublicKey("WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh")
const GLOBAL_CONFIG = new PublicKey("6s1xP3hpbAfFoNtUNF8mfHsjr2Bd97JxFJRWLbL6aHuX")
const PLATFORM_CONFIG = new PublicKey("FfYek5vEz23cMkWsdJwG2oa6EphsvXSHrGpdALN4g6W1")
const EVENT_AUTHORITY = new PublicKey("2DPAtwB8L12vrMRExbLuyGnC7n2J5LNoZQSejeQGpwkr")


interface BuyTokenParams {
    payer: PublicKey;
    poolStatePda: PublicKey;
    baseVaultPda: PublicKey;
    quoteVaultPda: PublicKey;
    baseMint: PublicKey;
    baseTokenAccount: PublicKey;
    wsolTokenAccount: PublicKey;
    amountIn: number; // in SOL
    minimumAmountOut: number; // in tokens
    shareFeeRate?: number;
}

export const createBuyInstruction = async ({
    payer,
    poolStatePda,
    baseVaultPda,
    quoteVaultPda,
    baseMint,
    baseTokenAccount,
    wsolTokenAccount,
    amountIn,
    minimumAmountOut,
    shareFeeRate = 0
}: BuyTokenParams): Promise<TransactionInstruction> => {
    // Instruction discriminator for buyExactIn
    const instructionDiscriminator = Buffer.from('faea0d7bd59c13ec', 'hex');
    
    // Create buffer for instruction data (8 bytes discriminator + 8 bytes amountIn + 8 bytes minAmountOut + 8 bytes shareFeeRate)
    const data = Buffer.alloc(32); // Total 32 bytes for all fields
    
    // Add instruction discriminator (first 8 bytes)
    data.set(instructionDiscriminator, 0);
    
    // Add amount in lamports (1 SOL = 1e9 lamports) - bytes 8-15
    const lamports = BigInt(Math.floor(amountIn * 1e9));
    data.writeBigUInt64LE(lamports, 8);
    
    // Add minimum amount out (assuming 6 decimals for the token) - bytes 16-23
    const tokenAmount = BigInt(Math.floor(minimumAmountOut));
    data.writeBigUInt64LE(tokenAmount, 16);
    
    // Add share fee rate - bytes 24-31
    data.writeBigUInt64LE(BigInt(shareFeeRate), 24);
    
    // Create instruction keys
    const keys = [
        // Payer
        { pubkey: payer, isSigner: true, isWritable: true },
        // Authority
        { pubkey: RAYDIUM_AUTHORITY, isSigner: false, isWritable: false },
        // Global config
        { pubkey: GLOBAL_CONFIG, isSigner: false, isWritable: false },
        // Platform config
        { pubkey: PLATFORM_CONFIG, isSigner: false, isWritable: false },
        // Pool state
        { pubkey: poolStatePda, isSigner: false, isWritable: true },
        // Base token account (user)
        { pubkey: baseTokenAccount, isSigner: false, isWritable: true },
        // WSOL token account (user)
        { pubkey: wsolTokenAccount, isSigner: false, isWritable: true },
        // Base vault
        { pubkey: baseVaultPda, isSigner: false, isWritable: true },
        // Quote vault
        { pubkey: quoteVaultPda, isSigner: false, isWritable: true },
        // Base mint
        { pubkey: baseMint, isSigner: false, isWritable: true },
        // Quote mint (WSOL)
        { pubkey: WSOL_MINT, isSigner: false, isWritable: false },
        // Token program (twice as in the Python version)
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        // Event authority
        { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
        // Raydium program
        { pubkey: RAYDIUM_LAUNCHPAD_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    
    return new TransactionInstruction({
        programId: RAYDIUM_LAUNCHPAD_PROGRAM_ID,
        keys,
        data
    });
};

const buyToken = async (
    amountInSol: number,
    minAmountOut: number
) => {
    try {

        const poolStatePda = process.env.POOL_STATE_PDA!
        const baseVaultPda = process.env.BASE_VAULT_PDA!
        const quoteVaultPda = process.env.QUOTE_VAULT_PDA!
        const baseMint = process.env.BASE_MINT!

        const privateKeyArray = JSON.parse(process.env.PRIVATE_KEY_LAUNCH!) as number[];
        const secretKey = Uint8Array.from(privateKeyArray);
        const payer = Keypair.fromSecretKey(secretKey);

        console.log("privateKeyArray",payer.publicKey.toBase58())

        // get token account
        const baseTokenAccount =  await getAssociatedTokenAddress(new PublicKey(baseMint), payer.publicKey);
        const wsolTokenAccount = await getAssociatedTokenAddress(WSOL_MINT, payer.publicKey);

        const createWsolTokenAccountIx = 
          createAssociatedTokenAccountInstruction(
            payer.publicKey,
            wsolTokenAccount,
            payer.publicKey,
            new PublicKey(WSOL_MINT)
          )

        const createBaseTokenAccountIx = 
          createAssociatedTokenAccountInstruction(
            payer.publicKey,
            baseTokenAccount,
            payer.publicKey,
            new PublicKey(baseMint)
          )
      

        //wrap SOL instruction
        const wrapSolIx = SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: wsolTokenAccount,
            lamports: Math.floor((amountInSol + 0.002) * 1e9),
          })


        const syncNativeIx = createSyncNativeInstruction(wsolTokenAccount, TOKEN_PROGRAM_ID)  

        const closeWsolTokenAccountIx = createCloseAccountInstruction(
            wsolTokenAccount,
            payer.publicKey,
            payer.publicKey
        )
        

        // Create the buy instruction
        const buyIx = await createBuyInstruction({
            payer: payer.publicKey,
            poolStatePda: new PublicKey(poolStatePda),
            baseVaultPda: new PublicKey(baseVaultPda),
            quoteVaultPda: new PublicKey(quoteVaultPda),
            baseMint: new PublicKey(baseMint),
            baseTokenAccount: new PublicKey(baseTokenAccount),
            wsolTokenAccount: new PublicKey(wsolTokenAccount),
            amountIn: amountInSol,
            minimumAmountOut: minAmountOut,
            shareFeeRate: 0
        });

        console.log("buyIx",buyIx)

        // Get latest blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

        // Create and sign the transaction
        const transaction = new VersionedTransaction(
            new TransactionMessage({
                payerKey: payer.publicKey,
                recentBlockhash: blockhash,
                instructions: [createWsolTokenAccountIx, createBaseTokenAccountIx,wrapSolIx, buyIx,closeWsolTokenAccountIx],
            }).compileToV0Message()
        );
        
        transaction.sign([payer]);

        // Send the transaction
        const txid = await connection.sendTransaction(transaction, {skipPreflight: false});
        console.log(`Transaction sent: https://solscan.io/tx/${txid}`);
        
        // Confirm the transaction
        const confirmation = await connection.confirmTransaction({
            signature: txid,
            blockhash,
            lastValidBlockHeight,
        });
        
        console.log('Transaction confirmed:', confirmation);
        return txid;
    } catch (error) {
        console.error('Error in buyToken:', error);
        throw error;
    }
};

