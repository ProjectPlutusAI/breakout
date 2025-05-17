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

// Configuration
const CONFIG = {
  WALLET_FILE: path.join(__dirname, 'wallets', 'solana-wallets.json')
};

export const buyTokenAll = async () => {


const wallets: any[] = JSON.parse(fs.readFileSync(CONFIG.WALLET_FILE, 'utf-8'));

let totalSol = 0;
let totalToken = 0;

for(const wallet of wallets){
 
    const baseMint = process.env.BASE_MINT!

    const privateKeyArray = JSON.parse(wallet.privateKey) as number[];
    const secretKey = Uint8Array.from(privateKeyArray);
    const payer = Keypair.fromSecretKey(secretKey);

    //get sol balance in payer
    const solBalance = await connection.getBalance(payer.publicKey);
    console.log("solBalance",solBalance/1e9)
    
    // get token account
    const baseTokenAccount =  await getAssociatedTokenAddress(new PublicKey(baseMint), payer.publicKey);
    try{
    //tokenBalance
    const tokenBalance = await connection.getTokenAccountBalance(baseTokenAccount);
    const tokenBalanceUiAmount = tokenBalance.value.uiAmount;
    console.log("tokenBalanceUiAmount",tokenBalanceUiAmount)

    totalSol += Number(solBalance);
    totalToken += Number(tokenBalanceUiAmount);
    }catch(e){
      //  console.log(e)
    }
}

console.log("totalSol",totalSol/1e9)
console.log("totalToken",totalToken)

}

buyTokenAll()
