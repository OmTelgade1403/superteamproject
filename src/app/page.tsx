'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from '@/context/SessionContext';

export default function LandingPage() {
  const { isAuthenticated } = useSession();

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
        <Link 
          href={isAuthenticated ? '/dashboard' : '/auth'}
          className="px-4 py-2 bg-neo-blue text-white text-xs font-extrabold uppercase neo-button"
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Connect Wallet'}
        </Link>
      </header>

      {/* Main Hero & Description */}
      <main className="flex-grow flex items-center justify-center py-12 px-4 w-full">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          
          {/* Badge */}
          <div className="inline-block bg-neo-pink text-white neo-border px-4 py-2 font-black text-xs md:text-sm uppercase tracking-wider rotate-[-2deg] neo-shadow">
            ⚽ HACKATHON PROTOCOL LIVE DEMO
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight leading-none">
            WATCHING SPORTS IS <br/>
            <span className="bg-white px-4 neo-border inline-block rotate-[1deg] my-2 text-neo-pink neo-shadow-lg">
              NO LONGER PASSIVE.
            </span>
          </h1>

          {/* Description */}
          <p className="max-w-2xl mx-auto font-extrabold text-base md:text-xl text-neo-dark/80">
            A live-action, Web3 fantasy sports PWA that turns World Cup match tracking into a minute-by-minute survival game using real-time sports data feeds and automated Solana Devnet payouts.
          </p>

          {/* Call to Action */}
          <div className="pt-4">
            <Link 
              href={isAuthenticated ? '/dashboard' : '/auth'}
              className="inline-block px-8 py-5 text-lg md:text-xl font-black uppercase neo-button bg-neo-green text-neo-dark animate-bounce"
            >
              ⚡ Enter Arena & Deposit SOL
            </Link>
          </div>

          {/* Gameplay explanation sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left">
            
            {/* Step 1 */}
            <div className="bg-white neo-border p-6 neo-shadow">
              <span className="text-4xl block mb-3">🎯</span>
              <h3 className="text-xl font-black uppercase mb-2">1. Micro-Draft</h3>
              <p className="text-sm font-semibold text-gray-600">
                Select a small squad of 3 players. All players share a single team health pool of 100 HP. Entry fee is exactly 0.10 SOL locked into escrow.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white neo-border p-6 neo-shadow">
              <span className="text-4xl block mb-3">⚡</span>
              <h3 className="text-xl font-black uppercase mb-2">2. In-Game Survival</h3>
              <p className="text-sm font-semibold text-gray-600">
                Every pass missed or foul committed by your players inflicts damage instantly. Clean tackles and goals heal you. If HP hits 0, you go grayscale and die.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white neo-border p-6 neo-shadow">
              <span className="text-4xl block mb-3">💰</span>
              <h3 className="text-xl font-black uppercase mb-2">3. Solana Devnet Escrow</h3>
              <p className="text-sm font-semibold text-gray-600">
                The exact second the final whistle blows, our smart contract distributes the prize pool (0.35 SOL) instantly back to the surviving players' wallets.
              </p>
            </div>

          </div>

        </div>
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
