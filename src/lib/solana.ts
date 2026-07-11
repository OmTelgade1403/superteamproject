import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

// Setup browser buffer polyfill
if (typeof window !== 'undefined') {
  try {
    const { Buffer } = require('buffer');
    (window as any).Buffer = (window as any).Buffer || Buffer;
  } catch (e) {
    console.error('Buffer polyfill loading failed', e);
  }
}

// Devnet endpoint
export const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Server-side Escrow Wallet Management
export function getServerEscrowKeypair(): Keypair {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEscrowKeypair is a server-only method.');
  }

  const g = global as any;
  if (!g.escrowKeypair) {
    // Generate a new keypair for this server run
    g.escrowKeypair = Keypair.generate();
    const pubKey = g.escrowKeypair.publicKey.toBase58();
    console.log('🛡️ SERVER ESCROW WALLET PUBLIC KEY:', pubKey);

    // Auto-airdrop the server escrow wallet so it has SOL to send payouts
    (async () => {
      try {
        console.log('💸 Auto-requesting 1 SOL Devnet airdrop for server escrow...');
        const airdropSig = await connection.requestAirdrop(g.escrowKeypair.publicKey, 1 * LAMPORTS_PER_SOL);
        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          signature: airdropSig,
          ...latestBlockhash
        });
        const bal = await connection.getBalance(g.escrowKeypair.publicKey);
        console.log(`✅ Server escrow wallet balance is now ${(bal / LAMPORTS_PER_SOL).toFixed(2)} SOL.`);
      } catch (err) {
        console.warn('⚠️ Auto-airdrop failed. Payouts will depend on entry fees deposited in escrow.', err);
      }
    })();
  }
  return g.escrowKeypair;
}

// Client-side Wallet Helpers
export function getOrCreateClientKeypair(): Keypair {
  if (typeof window === 'undefined') {
    throw new Error('getOrCreateClientKeypair is a client-only method.');
  }

  const key = 'liveaction_survival_wallet';
  const stored = localStorage.getItem(key);

  if (stored) {
    try {
      const secret = Uint8Array.from(JSON.parse(stored));
      return Keypair.fromSecretKey(secret);
    } catch (e) {
      console.error('Failed to parse client wallet, generating a new one.', e);
    }
  }

  const newKeypair = Keypair.generate();
  const secretArray = Array.from(newKeypair.secretKey);
  localStorage.setItem(key, JSON.stringify(secretArray));
  return newKeypair;
}

export async function getSolBalance(pubkey: string): Promise<number> {
  try {
    const pk = new PublicKey(pubkey);
    const lamports = await connection.getBalance(pk);
    return lamports / LAMPORTS_PER_SOL;
  } catch (e) {
    console.error('Error fetching SOL balance', e);
    return 0;
  }
}

export async function requestAirdrop(pubkey: string): Promise<string> {
  const pk = new PublicKey(pubkey);
  const sig = await connection.requestAirdrop(pk, 1 * LAMPORTS_PER_SOL);
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature: sig,
    ...latestBlockhash
  });
  return sig;
}

export async function transferSol(fromKeypair: Keypair, toPubkey: string, amountSol: number): Promise<string> {
  const to = new PublicKey(toPubkey);
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: to,
      lamports: amountSol * LAMPORTS_PER_SOL,
    })
  );

  const signature = await connection.sendTransaction(transaction, [fromKeypair]);
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature,
    ...latestBlockhash
  });
  return signature;
}
