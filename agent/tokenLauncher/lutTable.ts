import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, createCloseAccountInstruction,createSyncNativeInstruction } from '@solana/spl-token';

import { AddressLookupTableProgram,clusterApiUrl, Connection, Keypair, PublicKey, sendAndConfirmRawTransaction, TransactionInstruction, TransactionMessage, VersionedTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import axios from "axios";;
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Send the transaction
const connection = new Connection(process.env.RPC_URL!, "confirmed");

export const createLUT = async () => {

    const privateKeyArray = JSON.parse(process.env.PRIVATE_KEY_LAUNCH!) as number[];
    const secretKey = Uint8Array.from(privateKeyArray);
    const wallet = Keypair.fromSecretKey(secretKey);

	const [lookupTableInst, lookupTableAddress] =
		AddressLookupTableProgram.createLookupTable({
			authority: wallet.publicKey!,
			payer: wallet.publicKey!,
			recentSlot: await connection.getSlot(),
		});

	let latestBlockhash = await connection.getLatestBlockhash('finalized');

	const messageV0 = new TransactionMessage({
		payerKey: wallet.publicKey!,
		recentBlockhash: latestBlockhash.blockhash,
		instructions: [lookupTableInst]
	}).compileToV0Message();

	let transaction = new VersionedTransaction(messageV0);
	transaction.sign([wallet]);
	const txid = await connection.sendRawTransaction(transaction.serialize())
	console.log("txid", txid)
	console.log("Lookup Table Address:", lookupTableAddress.toBase58());
}

export const LUT = new PublicKey(process.env.LUT_ADDRESS!)

const addLUT = async () => {
    const privateKeyArray = JSON.parse(process.env.PRIVATE_KEY_LAUNCH!) as number[];
    const secretKey = Uint8Array.from(privateKeyArray);
    const wallet = Keypair.fromSecretKey(secretKey);

	const addAddressesInstruction = AddressLookupTableProgram.extendLookupTable({
		payer: wallet.publicKey!,
		authority: wallet.publicKey!,
		lookupTable: LUT,
		addresses: [],
	});

	let latestBlockhash = await connection.getLatestBlockhash('finalized');
	const messageV0 = new TransactionMessage({
		payerKey: wallet.publicKey!,
		recentBlockhash: latestBlockhash.blockhash,
		instructions: [addAddressesInstruction]
	}).compileToV0Message();

	let transaction = new VersionedTransaction(messageV0);
	transaction.sign([wallet]);
	const txid = await connection.sendRawTransaction(transaction.serialize())
	console.log("txid", txid)
}

addLUT()