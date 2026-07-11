import { NextResponse } from 'next/server';
import { getServerEscrowKeypair } from '@/lib/solana';

export async function GET() {
  try {
    const escrowKeypair = getServerEscrowKeypair();
    return NextResponse.json({ escrowAddress: escrowKeypair.publicKey.toBase58() });
  } catch (e: any) {
    console.error('Error fetching server escrow address:', e);
    return NextResponse.json({ error: 'Failed to retrieve escrow address' }, { status: 500 });
  }
}
