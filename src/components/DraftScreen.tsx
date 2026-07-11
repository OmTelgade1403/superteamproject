'use client';

import React, { useState, useEffect } from 'react';
import { Player } from '@/lib/matchEngine';
import { Keypair } from '@solana/web3.js';
import { transferSol, getSolBalance } from '@/lib/solana';

interface DraftScreenProps {
  walletKeypair: Keypair;
  onDraftComplete: (selectedPlayers: Player[], entryFeeTxSig: string) => void;
}

export default function DraftScreen({ walletKeypair, onDraftComplete }: DraftScreenProps) {
  const [roster, setRoster] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [isDepositing, setIsDepositing] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'FWD' | 'MID' | 'DEF' | 'GK'>('ALL');
  const [txLog, setTxLog] = useState<string[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);

  // Fetch players from API on mount
  useEffect(() => {
    async function fetchRoster() {
      try {
        const res = await fetch('/api/players');
        const data = await res.json();
        setRoster(data);
      } catch (err) {
        console.error('Failed to fetch player roster from API', err);
      } finally {
        setIsLoadingRoster(false);
      }
    }
    fetchRoster();
  }, []);

  const handleSelectPlayer = (player: Player) => {
    if (selectedPlayers.some(p => p.id === player.id)) {
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
    } else {
      if (selectedPlayers.length >= 3) {
        alert('You can draft at most 3 players for your micro-squad!');
        return;
      }
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const handleDepositAndEnter = async () => {
    if (selectedPlayers.length !== 3) return;
    
    setIsDepositing(true);
    setTxLog(['1/3: Retrieving server escrow address...']);

    try {
      // 1. Fetch server escrow address
      const escrowRes = await fetch('/api/solana/escrow-address');
      const escrowData = await escrowRes.json();
      
      if (escrowRes.status !== 200 || !escrowData.escrowAddress) {
        throw new Error(escrowData.error || 'Could not fetch escrow address');
      }

      const escrowAddress = escrowData.escrowAddress;
      setTxLog(prev => [...prev, `Found server escrow wallet: ${escrowAddress}`, '2/3: Initiating real on-chain transaction...']);

      // 2. Check balance
      const myAddress = walletKeypair.publicKey.toBase58();
      const currentBalance = await getSolBalance(myAddress);
      
      if (currentBalance < 0.1) {
        throw new Error(`Insufficient funds: You have ${currentBalance.toFixed(4)} SOL but need at least 0.1 SOL (plus transaction fee). Go back to home and request an airdrop.`);
      }

      // 3. Perform real Solana transaction
      setTxLog(prev => [...prev, `Transferring 0.10 SOL from ${myAddress.slice(0, 10)}... to Escrow...`]);
      const txSig = await transferSol(walletKeypair, escrowAddress, 0.1);
      
      setTxLog(prev => [...prev, `3/3: Transaction confirmed! TX: ${txSig.slice(0, 20)}...`, 'Entering Arena...']);

      setTimeout(() => {
        onDraftComplete(selectedPlayers, txSig);
        setIsDepositing(false);
      }, 1500);

    } catch (e: any) {
      console.error(e);
      setTxLog(prev => [...prev, `❌ ERROR: ${e.message || 'Transaction failed.'}`]);
      setTimeout(() => {
        setIsDepositing(false);
      }, 5000);
    }
  };

  const filteredPlayers = activeTab === 'ALL' 
    ? roster 
    : roster.filter(p => p.position === activeTab);

  const walletAddress = walletKeypair.publicKey.toBase58();

  return (
    <div className="max-w-5xl mx-auto p-4 w-full">
      {/* Lobby Header */}
      <div className="bg-neo-pink neo-border neo-shadow p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-neo-dark uppercase tracking-tight">
            🎯 THE MICRO-DRAFT LOBBY
          </h2>
          <p className="font-bold text-sm text-neo-dark mt-1">
            Pick a 3-player survival squad. Every real-world action heals or damages your shared health bar.
          </p>
        </div>
        <div className="bg-white neo-border px-4 py-2 font-mono text-xs text-neo-dark break-all self-start">
          <span className="font-extrabold block text-[10px] uppercase text-gray-500">Connected Wallet Address</span>
          {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
        </div>
      </div>

      {isDepositing ? (
        <div className="bg-white neo-border neo-shadow-lg p-8 md:p-12 flex flex-col items-center justify-center max-w-xl mx-auto my-12">
          <div className="w-16 h-16 bg-neo-green neo-border animate-bounce mb-6 flex items-center justify-center text-3xl font-extrabold">
            💸
          </div>
          <h3 className="text-2xl font-extrabold text-neo-dark mb-4">CONFIRMING SOLANA TRANSACTION</h3>
          
          <div className="w-full bg-neo-dark p-4 neo-border font-mono text-xs text-neo-green space-y-2 max-h-[160px] overflow-y-auto">
            {txLog.map((log, index) => (
              <div key={index}>&gt; {log}</div>
            ))}
          </div>
          
          <p className="text-xs font-bold text-gray-500 mt-4 animate-pulse">
            Broadcasting to Solana Devnet cluster...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Roster Selection Panel */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Position Tabs */}
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'FWD', 'MID', 'DEF', 'GK'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-extrabold uppercase neo-border transition-all ${
                    activeTab === tab 
                      ? 'bg-neo-blue neo-shadow transform translate-x-[-1px] translate-y-[-1px]' 
                      : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {isLoadingRoster ? (
              <div className="py-20 text-center font-extrabold animate-pulse uppercase">
                Loading players roster from Server API...
              </div>
            ) : (
              /* Players Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredPlayers.map(player => {
                  const isSelected = selectedPlayers.some(p => p.id === player.id);
                  return (
                    <div 
                      key={player.id} 
                      className={`bg-white neo-border p-4 transition-all flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-neo-yellow neo-shadow border-neo-dark' 
                          : 'hover:bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-4xl">{player.avatar}</span>
                          <span className={`px-2 py-0.5 text-xs font-extrabold uppercase neo-border ${
                            player.position === 'FWD' ? 'bg-neo-pink' :
                            player.position === 'MID' ? 'bg-neo-blue' :
                            player.position === 'DEF' ? 'bg-neo-green' : 'bg-gray-300'
                          }`}>
                            {player.position}
                          </span>
                        </div>
                        <h4 className="text-xl font-extrabold text-neo-dark">{player.name}</h4>
                        <p className="text-xs font-bold text-gray-500 uppercase">{player.country}</p>
                        
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-1 my-3 text-[10px] uppercase font-extrabold bg-gray-100 p-2 neo-border">
                          <div className="text-center">
                            <span className="block text-gray-500">ATT</span>
                            <span>{player.stats.attack}</span>
                          </div>
                          <div className="text-center border-x-2 border-neo-dark">
                            <span className="block text-gray-500">DEF</span>
                            <span>{player.stats.defense}</span>
                          </div>
                          <div className="text-center">
                            <span className="block text-gray-500">DISC</span>
                            <span>{player.stats.discipline}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectPlayer(player)}
                        className={`w-full py-2 text-xs uppercase font-extrabold neo-button mt-2 ${
                          isSelected ? 'bg-neo-pink text-white' : 'bg-white'
                        }`}
                      >
                        {isSelected ? '❌ Remove Draft' : '➕ Draft Player'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selection Cart / Checkout Panel */}
          <div className="space-y-4">
            <div className="bg-white neo-border neo-shadow p-6 sticky top-4">
              <h3 className="text-2xl font-extrabold text-neo-dark mb-4 pb-2 border-b-4 border-neo-dark">
                📋 YOUR SQUAD
              </h3>

              {selectedPlayers.length === 0 ? (
                <div className="py-12 text-center text-gray-400 font-extrabold uppercase text-sm border-2 border-dashed border-gray-300">
                  Roster is empty.<br/>Select 3 players to play.
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {selectedPlayers.map(player => (
                    <div key={player.id} className="flex justify-between items-center bg-gray-50 p-3 neo-border">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{player.avatar}</span>
                        <div>
                          <h5 className="font-extrabold text-sm">{player.name}</h5>
                          <span className="text-[10px] font-bold text-gray-500 uppercase">{player.position} • {player.country}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelectPlayer(player)}
                        className="text-red-500 hover:text-red-700 font-extrabold text-xs p-1"
                      >
                        REMOVE
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Fee Information */}
              <div className="space-y-2 font-extrabold text-xs uppercase mb-6 bg-yellow-50 p-3 border-2 border-dashed border-neo-dark">
                <div className="flex justify-between">
                  <span>Entry Fee</span>
                  <span>0.10 SOL</span>
                </div>
                <div className="flex justify-between border-t-2 border-neo-dark pt-2">
                  <span>Prize Pool Allocation</span>
                  <span>95%</span>
                </div>
                <div className="flex justify-between text-gray-500 text-[10px] mt-1">
                  <span>Devnet Cluster</span>
                  <span>SOLANA-DEVNET</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleDepositAndEnter}
                disabled={selectedPlayers.length !== 3}
                className="w-full py-4 text-center text-sm font-black uppercase neo-button bg-neo-green disabled:opacity-50"
              >
                {selectedPlayers.length === 3 
                  ? '⚡ DEPOSIT 0.1 SOL ON-CHAIN' 
                  : `SELECT ${3 - selectedPlayers.length} MORE PLAYER(S)`}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
