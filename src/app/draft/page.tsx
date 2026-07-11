'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import DraftScreen from '@/components/DraftScreen';
import { Player } from '@/lib/matchEngine';
import Link from 'next/link';

export default function DraftPage() {
  const router = useRouter();
  const { isAuthenticated, walletKeypair, updateSquad, updateEntryFeeTx } = useSession();

  // Route guard
  useEffect(() => {
    if (!isAuthenticated || !walletKeypair) {
      router.push('/auth');
    }
  }, [isAuthenticated, walletKeypair, router]);

  const handleDraftComplete = (selectedPlayers: Player[], txSig: string) => {
    updateSquad(selectedPlayers);
    updateEntryFeeTx(txSig);
    router.push('/arena');
  };

  if (!isAuthenticated || !walletKeypair) {
    return (
      <div className="min-h-screen bg-neo-yellow text-neo-dark flex items-center justify-center font-extrabold uppercase">
        Loading Draft Lobby...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-yellow text-neo-dark flex flex-col justify-between w-full">
      {/* Header */}
      <header className="bg-white border-b-4 border-neo-dark px-6 py-4 flex justify-between items-center w-full z-10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-neo-pink neo-border flex items-center justify-center font-black text-lg rotate-[-5deg]">
            ⚔️
          </div>
          <span className="font-extrabold text-lg md:text-xl tracking-tight uppercase">
            LIVEACTION SURVIVAL
          </span>
        </Link>
        <Link 
          href="/dashboard" 
          className="px-3 py-1 bg-white text-neo-dark neo-border hover:bg-gray-100 uppercase transition-all text-xs font-black"
        >
          ⬅️ Back to Dashboard
        </Link>
      </header>

      {/* Main draft content */}
      <main className="flex-grow py-8 w-full">
        <DraftScreen 
          walletKeypair={walletKeypair} 
          onDraftComplete={handleDraftComplete} 
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
