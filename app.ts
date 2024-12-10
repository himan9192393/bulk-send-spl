import fs from "fs";
import path from "path";
import secret from "../tushar.json";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  ParsedAccountData,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";

// Initialize keypair and connection
const FROM_KEYPAIR = Keypair.fromSecretKey(new Uint8Array(secret));
const SOLANA_CONNECTION = new Connection("https://api.devnet.solana.com");
const MINT_ADDRESS = "FtLba3VWoEArH6AyhCgJiYTHyPtMxw3sbjb1LzUse4qD"; // Change this!
const TRANSFER_AMOUNT = 10; // Amount to send

// Read destination wallet addresses from a file
function getDestinationWallets(): string[] {
  const filePath = path.join(__dirname, "wallet.txt"); // Use current directory
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch (err) {
    console.error(`Error reading file at ${filePath}:`, err);
    process.exit(1); // Exit the process if file reading fails
  }
} // Get number of decimals for the token
async function getNumberDecimals(mintAddress: string): Promise<number> {
  const info = await SOLANA_CONNECTION.getParsedAccountInfo(
    new PublicKey(mintAddress),
  );
  const result = (info.value?.data as ParsedAccountData).parsed.info
    .decimals as number;
  return result;
}

// Send tokens function
async function sendTokens(destinationWallet: string, numberDecimals: number) {
  console.log(
    `Sending ${TRANSFER_AMOUNT} tokens from ${FROM_KEYPAIR.publicKey.toString()} to ${destinationWallet}.`,
  );

  // Get source token account
  const sourceAccount = await getOrCreateAssociatedTokenAccount(
    SOLANA_CONNECTION,
    FROM_KEYPAIR,
    new PublicKey(MINT_ADDRESS),
    FROM_KEYPAIR.publicKey,
  );

  // Get destination token account
  const destinationAccount = await getOrCreateAssociatedTokenAccount(
    SOLANA_CONNECTION,
    FROM_KEYPAIR,
    new PublicKey(MINT_ADDRESS),
    new PublicKey(destinationWallet),
  );

  // Create and send transaction
  const tx = new Transaction().add(
    createTransferInstruction(
      sourceAccount.address,
      destinationAccount.address,
      FROM_KEYPAIR.publicKey,
      TRANSFER_AMOUNT * Math.pow(10, numberDecimals),
    ),
  );

  const latestBlockHash =
    await SOLANA_CONNECTION.getLatestBlockhash("confirmed");
  tx.recentBlockhash = latestBlockHash.blockhash;

  const signature = await sendAndConfirmTransaction(SOLANA_CONNECTION, tx, [
    FROM_KEYPAIR,
  ]);

  console.log(
    "\x1b[32m", // Green Text
    `Transaction Success! 🎉\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`,
  );
}

// Main function
async function main() {
  console.log(`My public key is: ${FROM_KEYPAIR.publicKey.toString()}.`);

  const destinationWallets = getDestinationWallets();

  if (destinationWallets.length === 0) {
    console.log("No destination wallets found.");
    return;
  }

  const numberDecimals = await getNumberDecimals(MINT_ADDRESS);

  for (const wallet of destinationWallets) {
    try {
      await sendTokens(wallet, numberDecimals);
    } catch (error) {
      console.error(`Failed to send tokens to ${wallet}:`, error);
    }
  }
}

main();
