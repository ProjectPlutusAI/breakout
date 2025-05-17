import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

interface WalletData {
  publicKey: string;
  privateKey: string;
  mnemonic?: string; // For future implementation with bip39
}

/**
 * Generates multiple Solana wallets and saves them to a JSON file
 * @param count Number of wallets to generate
 * @param outputDir Directory to save the wallets file (defaults to current directory)
 * @returns Path to the generated file
 */
async function generateWallets(count: number, outputDir: string = './'): Promise<string> {
  if (count <= 0) {
    throw new Error('Count must be greater than 0');
  }

  const wallets: WalletData[] = [];

  console.log(`Generating ${count} Solana wallets...`);
  
  for (let i = 0; i < count; i++) {
    const keypair = Keypair.generate();
    wallets.push({
      publicKey: keypair.publicKey.toString(),
      privateKey: `[${keypair.secretKey.toString()}]`
    });
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `solana-wallets-${timestamp}.json`;
  const filePath = path.join(outputDir, filename);

  fs.writeFileSync(
    filePath,
    JSON.stringify(wallets, null, 2)
  );

  console.log(`\n✅ Successfully generated ${count} wallets`);
  console.log(`📁 Wallets saved to: ${path.resolve(filePath)}`);
  console.log('\n⚠️  WARNING: Keep this file secure! Anyone with access to these private keys can access the funds.');
  
  return filePath;
}

// Example usage
async function main() {
  try {
    // Change the first parameter to generate a different number of wallets
    // Change the second parameter to specify a different output directory
    await generateWallets(30, './wallets');
  } catch (error) {
    console.error('Error generating wallets:', error);
    process.exit(1);
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}

export { generateWallets, WalletData };
