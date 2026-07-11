'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import ArenaScreen from '@/components/ArenaScreen';
import Link from 'next/link';

export default function ArenaPage() {
  const router = useRouter();
  const { 
    isAuthenticated, 
    walletKeypair, 
    squad, 
    entryFeeTx, 
    updateGameResult 
  } = useSession();

  // Route guard: must be authenticated and have drafted players
  useEffect(() => {
    if (!isAuthenticated || !walletKeypair) {
      router.push('/auth');
    } else if (squad.length !== 3) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, walletKeypair, squad, router]);

  const handleGameOver = (
    survived: boolean,
    finalHp: number,
    earningsSol: number,
    settlementTxSig?: string
  ) => {
    updateGameResult({ survived, finalHp, earningsSol, settlementTxSig });
    router.push('/payout');
  };

  if (!isAuthenticated || !walletKeypair || squad.length !== 3) {
    return (
      <div className="min-h-screen bg-neo-yellow text-neo-dark flex items-center justify-center font-extrabold uppercase">
        Initializing Broadcast Arena Stream...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-yellow text-neo-dark flex flex-col justify-between w-full">
      {/* Header */}
      <header className="bg-white border-b-4 border-neo-dark px-6 py-4 flex justify-between items-center w-full z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-neo-pink neo-border flex items-center justify-center font-black text-lg rotate-[-5deg]">
            ⚔️
          </div>
          <span className="font-extrabold text-lg md:text-xl tracking-tight uppercase">
            LIVEACTION SURVIVAL
          </span>
        </div>
      </header>

      {/* Main game content */}
      <main className="flex-grow py-8 w-full">
        <ArenaScreen 
          selectedPlayers={squad} 
          entryFeeTxSig={entryFeeTx} 
          walletKeypair={walletKeypair}
          onGameOver={handleGameOver} 
        />
      </main>

      {/* Footer */}
      <footer className="bg-neo-dark text-white border-t-4 border-neo-dark py-4 text-center text-xs font-extrabold w-full">
        <p className="uppercase tracking-wider">
          LIVEACTION SURVIVAL • FOR SUPERTEAM HACKATHON 🏆
        </p>
      </footer>
    </div>
  );
}
