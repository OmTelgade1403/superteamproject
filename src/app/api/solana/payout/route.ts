import { NextRequest, NextResponse } from 'next/server';
import { getServerEscrowKeypair, connection } from '@/lib/solana';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';

export async function POST(req: NextRequest) {
  try {
    const { userPubkey, amountSol } = await req.json();

    if (!userPubkey || typeof amountSol !== 'number') {
      return NextResponse.json({ error: 'Invalid parameters: userPubkey and amountSol required' }, { status: 400 });
    }

    const escrowKeypair = getServerEscrowKeypair();
    const toPublicKey = new PublicKey(userPubkey);

    console.log(`💸 Payout request: Sending ${amountSol} SOL to ${userPubkey} from Escrow ${escrowKeypair.publicKey.toBase58()}`);

    // Verify escrow balance
    const escrowBalance = await connection.getBalance(escrowKeypair.publicKey);
    const requiredLamports = amountSol * LAMPORTS_PER_SOL;

    if (escrowBalance < requiredLamports) {
      console.warn('⚠️ Server escrow wallet balance is too low. Requesting airdrop before payout.');
      try {
        const airdropSig = await connection.requestAirdrop(escrowKeypair.publicKey, 1.5 * LAMPORTS_PER_SOL);
        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          signature: airdropSig,
          ...latestBlockhash
        });
      } catch (err) {
        console.error('Failed to pre-airdrop escrow wallet', err);
        return NextResponse.json({ error: 'Escrow wallet lacks funds and airdrop was rate-limited. Payout failed.' }, { status: 500 });
      }
    }

    // Build Transfer Transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: escrowKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: requiredLamports,
      })
    );

    // Sign and send transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [escrowKeypair],
      { commitment: 'confirmed' }
    );

    console.log(`✅ Payout transaction successful: ${signature}`);

    return NextResponse.json({
      success: true,
      signature,
      escrowPubkey: escrowKeypair.publicKey.toBase58()
    });

  } catch (e: any) {
    console.error('Error processing payout transaction:', e);
    return NextResponse.json({ error: e.message || 'Payout transaction failed' }, { status: 500 });
  }
}
