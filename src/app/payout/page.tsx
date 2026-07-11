'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import Link from 'next/link';

export default function PayoutPage() {
  const router = useRouter();
  const { 
    isAuthenticated, 
    walletKeypair, 
    entryFeeTx, 
    gameResult, 
    updateGameResult 
  } = useSession();

  // Route guard: must be authenticated and have game result
  useEffect(() => {
    if (!isAuthenticated || !walletKeypair) {
      router.push('/auth');
    } else if (!gameResult) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, walletKeypair, gameResult, router]);

  const handleReturnToDashboard = () => {
    updateGameResult(null); // Clear game result session state
    router.push('/dashboard');
  };

  if (!isAuthenticated || !walletKeypair || !gameResult) {
    return (
      <div className="min-h-screen bg-neo-yellow text-neo-dark flex items-center justify-center font-extrabold uppercase">
        Loading Settlement Report...
      </div>
    );
  }

  const walletAddress = walletKeypair.publicKey.toBase58();

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
        <button
          onClick={handleReturnToDashboard}
          className="px-3 py-1 bg-white text-neo-dark neo-border hover:bg-gray-100 uppercase transition-all text-xs font-black"
        >
          🎮 Back to Dashboard
        </button>
      </header>

      {/* Main payout contents */}
      <main className="flex-grow py-8 px-4 flex items-center justify-center w-full">
        <div className="w-full max-w-xl bg-white neo-border neo-shadow-lg p-6 md:p-8 my-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiNlNWU3ZWIiLz4KPC9zdmc+')] bg-repeat mx-auto animate-fade-in">
          <div className="text-center space-y-4">
            
            {gameResult.survived ? (
              <>
                <span className="text-7xl block animate-bounce">🏆</span>
                <div className="inline-block bg-neo-green text-neo-dark neo-border px-4 py-1.5 font-black uppercase text-sm tracking-wider mb-2 rotate-[-1deg]">
                  VICTORY ROYAL SURVIVOR!
                </div>
                <h2 className="text-4xl font-black uppercase tracking-tight">SQUAD SURVIVED!</h2>
                <p className="font-bold text-sm text-gray-600">
                  Your 3-player team withstood the match pressure, finishing with **{gameResult.finalHp} HP**.
                </p>
              </>
            ) : (
              <>
                <span className="text-7xl block animate-pulse">💀</span>
                <div className="inline-block bg-neo-pink text-white neo-border px-4 py-1.5 font-black uppercase text-sm tracking-wider mb-2 rotate-[1deg]">
                  ELIMINATED IN BATTLE
                </div>
                <h2 className="text-4xl font-black uppercase tracking-tight">WASTED</h2>
                <p className="font-bold text-sm text-gray-600">
                  Your squad team health hit 0 HP before the referee blew the final whistle.
                </p>
              </>
            )}

            {/* Solana Escrow Settlement Report */}
            <div className="bg-neo-dark text-white p-6 neo-border text-left mt-6 space-y-4">
              <h4 className="font-black text-sm uppercase tracking-wider border-b border-gray-700 pb-2 text-neo-green">
                💰 Solana Devnet Settlement
              </h4>
              
              <div className="grid grid-cols-2 gap-4 text-xs font-mono uppercase">
                <div>
                  <span className="text-gray-400 block text-[10px]">Your Wallet Address</span>
                  <span className="font-bold truncate block select-all">{walletAddress.slice(0, 12)}...</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Entry Fee Locked</span>
                  <span className="font-bold text-neo-pink">
                    <a 
                      href={`https://explorer.solana.com/tx/${entryFeeTx}?cluster=devnet`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline underline-offset-4"
                    >
                      -0.10 SOL 🔗
                    </a>
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Payout Distribution</span>
                  <span className="font-bold text-neo-green">
                    {gameResult.survived && gameResult.settlementTxSig ? (
                      <a 
                        href={`https://explorer.solana.com/tx/${gameResult.settlementTxSig}?cluster=devnet`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline underline-offset-4"
                      >
                        +0.35 SOL 🔗
                      </a>
                    ) : (
                      '0.00 SOL'
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Net Return</span>
                  <span className={`font-bold ${gameResult.survived ? 'text-neo-green' : 'text-red-400'}`}>
                    {gameResult.survived ? '+0.25 SOL' : '-0.10 SOL'}
                  </span>
                </div>
              </div>

              {gameResult.settlementTxSig ? (
                <div className="pt-2 border-t border-gray-800 text-[10px] font-mono break-all text-gray-400">
                  <span className="text-neo-green font-bold block mb-1">🔗 SOLANA TRANSACTION VERIFIED:</span>
                  <a 
                    href={`https://explorer.solana.com/tx/${gameResult.settlementTxSig}?cluster=devnet`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-neo-blue hover:underline"
                  >
                    {gameResult.settlementTxSig}
                  </a>
                  <span className="block mt-1 font-bold text-[9px]">
                    (Escrow payout instruction executed on Solana Devnet)
                  </span>
                </div>
              ) : gameResult.survived ? (
                <div className="pt-2 border-t border-gray-800 text-[10px] font-mono text-neo-pink">
                  ⚠️ Escrow balance was insufficient for payout on Devnet or cluster connection timed out.
                </div>
              ) : null}
            </div>

            {/* Leaderboard */}
            <div className="bg-white neo-border p-4 text-left">
              <h4 className="font-extrabold text-sm uppercase mb-3 border-b-2 border-neo-dark pb-1">
                📊 Match Survival Board
              </h4>
              <div className="space-y-2 text-xs font-extrabold">
                <div className="flex justify-between items-center p-2 bg-neo-yellow/20 neo-border">
                  <div className="flex items-center gap-2">
                    <span>🥇</span>
                    <span>{walletAddress.slice(0, 6)}... (You)</span>
                  </div>
                  <span>{gameResult.finalHp} HP</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 border border-gray-300">
                  <div className="flex items-center gap-2">
                    <span>🥈</span>
                    <span>solSurfer.sol</span>
                  </div>
                  <span>54 HP</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 border border-gray-300">
                  <div className="flex items-center gap-2">
                    <span>💀</span>
                    <span>degenDribbler.sol</span>
                  </div>
                  <span>0 HP (Out 65')</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleReturnToDashboard}
                className="flex-grow py-3 bg-neo-green text-neo-dark font-black uppercase neo-button"
              >
                🎮 Return to Dashboard
              </button>
              <a
                href="https://github.com/OmTelgade1403/superteamproject"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-grow py-3 bg-white text-neo-dark font-black uppercase neo-button text-center block"
              >
                🐱 View GitHub Repo
              </a>
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
