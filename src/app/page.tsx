'use client';

import React, { useState } from 'react';
import AuthScreen from '@/components/AuthScreen';
import DraftScreen from '@/components/DraftScreen';
import ArenaScreen from '@/components/ArenaScreen';
import { Player } from '@/lib/matchEngine';
import { Keypair } from '@solana/web3.js';

type GameState = 'AUTH' | 'DRAFT' | 'ARENA' | 'PAYOUT';

export default function Home() {
  const [gameState, setGameState] = useState<GameState>('AUTH');
  const [walletKeypair, setWalletKeypair] = useState<Keypair | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [squad, setSquad] = useState<Player[]>([]);
  const [entryFeeTx, setEntryFeeTx] = useState('');
  
  // Game results state
  const [gameResult, setGameResult] = useState<{
    survived: boolean;
    finalHp: number;
    earningsSol: number;
    settlementTxSig?: string;
  } | null>(null);

  const handleLoginSuccess = (keypair: Keypair, email: string) => {
    setWalletKeypair(keypair);
    setUserEmail(email);
    setGameState('DRAFT');
  };

  const handleDraftComplete = (selectedPlayers: Player[], txSig: string) => {
    setSquad(selectedPlayers);
    setEntryFeeTx(txSig);
    setGameState('ARENA');
  };

  const handleGameOver = (
    survived: boolean,
    finalHp: number,
    earningsSol: number,
    settlementTxSig?: string
  ) => {
    setGameResult({ survived, finalHp, earningsSol, settlementTxSig });
    setGameState('PAYOUT');
  };

  const handleResetGame = () => {
    setSquad([]);
    setEntryFeeTx('');
    setGameResult(null);
    setGameState('AUTH');
  };

  const walletAddress = walletKeypair ? walletKeypair.publicKey.toBase58() : '';

  return (
    <div className="min-h-screen bg-neo-yellow text-neo-dark flex flex-col justify-between w-full">
      
      {/* Global Navigation Header */}
      <header className="bg-white border-b-4 border-neo-dark px-6 py-4 flex justify-between items-center z-10 w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-neo-pink neo-border flex items-center justify-center font-black text-lg rotate-[-5deg]">
            ⚔️
          </div>
          <span className="font-extrabold text-lg md:text-xl tracking-tight uppercase">
            LIVEACTION SURVIVAL
          </span>
        </div>
        
        {walletAddress && (
          <div className="flex items-center gap-4 text-xs font-extrabold">
            <span className="hidden sm:inline bg-neo-green neo-border px-2.5 py-1 uppercase tracking-wide">
              🟢 Solana Devnet Active
            </span>
            <button 
              onClick={handleResetGame}
              className="px-3 py-1 bg-neo-pink text-white neo-border hover:bg-red-500 uppercase transition-all text-[10px]"
            >
              Disconnect
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-grow py-8 px-4 flex items-center justify-center w-full">
        {gameState === 'AUTH' && (
          <AuthScreen onLoginSuccess={handleLoginSuccess} />
        )}

        {gameState === 'DRAFT' && walletKeypair && (
          <DraftScreen 
            walletKeypair={walletKeypair} 
            onDraftComplete={handleDraftComplete} 
          />
        )}

        {gameState === 'ARENA' && walletKeypair && (
          <ArenaScreen 
            selectedPlayers={squad} 
            entryFeeTxSig={entryFeeTx} 
            walletKeypair={walletKeypair}
            onGameOver={handleGameOver} 
          />
        )}

        {gameState === 'PAYOUT' && gameResult && (
          <div className="w-full max-w-xl bg-white neo-border neo-shadow-lg p-6 md:p-8 my-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiNlNWU3ZWIiLz4KPC9zdmc+')] bg-repeat mx-auto">
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
                  onClick={handleResetGame}
                  className="flex-grow py-3 bg-neo-green text-neo-dark font-black uppercase neo-button"
                >
                  🔄 PLAY ANOTHER MATCH
                </button>
                <a
                  href="https://github.com/OmTelgade1403/superteamproject"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-grow py-3 bg-white text-neo-dark font-black uppercase neo-button text-center block"
                >
                  🐱 VIEW GITHUB REPO
                </a>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* Global Footer */}
      <footer className="bg-neo-dark text-white border-t-4 border-neo-dark py-4 text-center text-xs font-extrabold w-full">
        <p className="uppercase tracking-wider">
          LIVEACTION SURVIVAL • MADE FOR SUPERTEAM HACKATHON 🏆
        </p>
      </footer>

    </div>
  );
}
