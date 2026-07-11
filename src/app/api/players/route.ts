import { NextResponse } from 'next/server';
import { PLAYERS_ROSTER } from '@/lib/matchEngine';

export async function GET() {
  return NextResponse.json(PLAYERS_ROSTER);
}
