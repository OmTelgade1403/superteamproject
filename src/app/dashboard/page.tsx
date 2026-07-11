'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { Player } from '@/lib/matchEngine';
import { getSolBalance, requestAirdrop } from '@/lib/solana';
import Link from 'next/link';

type Tab = 'LOBBY' | 'ROSTER' | 'LEDGER' | 'LEADERBOARD';

export default function DashboardPage() {
  const router = useRouter();
  const { 
    isAuthenticated, 
    walletKeypair, 
    userEmail, 
    solLedger, 
    logout,
    addLedgerEntry
  } = useSession();

  const [activeTab, setActiveTab] = useState<Tab>('LOBBY');
  const [balance, setBalance] = useState<number>(0);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [roster, setRoster] = useState<Player[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [rosterFilter, setRosterFilter] = useState<'ALL' | 'FWD' | 'MID' | 'DEF' | 'GK'>('ALL');

  // Redirection guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, router]);

  // Refresh balance
  useEffect(() => {
    if (walletKeypair) {
      refreshBalance();
    }
  }, [walletKeypair]);

  // Load roster when Roster tab is opened
  useEffect(() => {
    if (activeTab === 'ROSTER' && roster.length === 0) {
      fetchRoster();
    }
  }, [activeTab]);

  const refreshBalance = async () => {
    if (!walletKeypair) return;
    const bal = await getSolBalance(walletKeypair.publicKey.toBase58());
    setBalance(bal);
  };

  const fetchRoster = async () => {
    setIsLoadingRoster(true);
    try {
      const res = await fetch('/api/players');
      const data = await res.json();
      setRoster(data);
    } catch (e) {
      console.error('Failed to load roster', e);
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const handleAirdrop = async () => {
    if (!walletKeypair) return;
    setIsAirdropping(true);
    try {
      const sig = await requestAirdrop(walletKeypair.publicKey.toBase58());
      addLedgerEntry('AIRDROP', 1.0, sig, 'CONFIRMED');
      await refreshBalance();
      alert('Airdrop complete! +1 SOL added to your balance.');
    } catch (e: any) {
      console.error(e);
      alert('Airdrop failed. Please try again later.');
    } finally {
      setIsAirdropping(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!isAuthenticated || !walletKeypair) {
    return (
      <div className="min-h-screen bg-neo-yellow text-neo-dark flex items-center justify-center font-extrabold uppercase">
        Verifying Authentication Session...
      </div>
    );
  }

  const walletAddress = walletKeypair.publicKey.toBase58();
  const filteredRoster = rosterFilter === 'ALL' 
    ? roster 
    : roster.filter(p => p.position === rosterFilter);

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
        
        <div className="flex items-center gap-4 text-xs font-extrabold">
          <span className="hidden md:inline text-gray-500 font-mono">{userEmail}</span>
          <button 
            onClick={handleLogout}
            className="px-3 py-1 bg-neo-pink text-white neo-border hover:bg-red-500 uppercase transition-all text-[10px]"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Dashboard Body */}
      <main className="flex-grow max-w-6xl mx-auto py-8 px-4 w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white neo-border neo-shadow p-6 space-y-4">
            <div className="inline-block bg-neo-green text-neo-dark neo-border px-2 py-0.5 font-black uppercase text-[10px]">
              SOLANA WALLET
            </div>
            
            <div>
              <span className="text-[10px] font-black text-gray-500 block uppercase">Address</span>
              <div className="font-mono text-xs text-neo-dark break-all bg-gray-50 p-2 border-2 border-neo-dark select-all select-none">
                {walletAddress.slice(0, 12)}...{walletAddress.slice(-12)}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black text-gray-500 block uppercase">Available Balance</span>
              <span className="text-3xl font-black">{balance.toFixed(4)} SOL</span>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleAirdrop}
                disabled={isAirdropping}
                className="w-full py-2 bg-neo-blue text-white text-xs font-extrabold uppercase neo-button"
              >
                {isAirdropping ? '⏳ Airdropping...' : '🎁 Faucet Airdrop (+1 SOL)'}
              </button>
              <button
                onClick={refreshBalance}
                className="w-full py-2 bg-white text-xs font-extrabold uppercase neo-button"
              >
                🔄 Refresh Balance
              </button>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="bg-neo-pink text-neo-dark neo-border neo-shadow p-6 hidden lg:block">
            <h4 className="font-black text-lg uppercase mb-3">🔥 Battle Stats</h4>
            <div className="space-y-2 text-xs font-extrabold uppercase">
              <div className="flex justify-between">
                <span>Games Played</span>
                <span>{solLedger.filter(e => e.type === 'DEPOSIT').length}</span>
              </div>
              <div className="flex justify-between border-t border-neo-dark pt-2">
                <span>Successful Payouts</span>
                <span>{solLedger.filter(e => e.type === 'PAYOUT').length}</span>
              </div>
              <div className="flex justify-between border-t border-neo-dark pt-2">
                <span>Total Escrow Wins</span>
                <span>
                  {(solLedger.filter(e => e.type === 'PAYOUT').reduce((sum, e) => sum + e.amount, 0)).toFixed(2)} SOL
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs & Content Panel */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Tabs header */}
          <div className="flex flex-wrap gap-2 border-b-4 border-neo-dark pb-2">
            {([
              { key: 'LOBBY', label: '🎮 Lobby' },
              { key: 'ROSTER', label: '📊 Player Roster' },
              { key: 'LEDGER', label: '💰 SOL Ledger' },
              { key: 'LEADERBOARD', label: '🏆 Leaderboard' }
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-xs font-black uppercase neo-border transition-all ${
                  activeTab === tab.key 
                    ? 'bg-white neo-shadow transform translate-x-[-1px] translate-y-[-1px]' 
                    : 'bg-neo-yellow/20 hover:bg-white/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Lobby */}
          {activeTab === 'LOBBY' && (
            <div className="bg-white neo-border neo-shadow p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-3xl font-black uppercase text-neo-dark">Ready for Survival?</h3>
                <p className="font-bold text-gray-500 mt-1">
                  Draft your squad, lock up your 0.1 SOL escrow deposit, and watch the match in real-time.
                </p>
              </div>

              <div className="bg-yellow-50 border-4 border-dashed border-neo-dark p-6 space-y-3 font-extrabold text-sm">
                <h5 className="uppercase text-neo-pink text-base">🛡️ ACTIVE ARENA PLAY RULES:</h5>
                <ul className="list-disc pl-4 space-y-2">
                  <li>Choose exactly 3 players from any team (FWD, MID, DEF, GK).</li>
                  <li>Everyone starts in the arena with a shared team health bar (100 HP).</li>
                  <li>Real-time event feeds adjust your HP. Missed passes and fouls damage you (-4/-8 HP). Goals and clean tackles heal you (+25/+6 HP).</li>
                  <li>Use your 2 Shields strategically to block damage for 6 seconds.</li>
                  <li>Survive the 90' match whistle to instantly receive a 0.35 SOL Devnet payout!</li>
                </ul>
              </div>

              <Link 
                href="/draft" 
                className="inline-block px-8 py-4 text-sm font-black uppercase neo-button bg-neo-green text-neo-dark"
              >
                🏁 Start Match & Enter Draft
              </Link>
            </div>
          )}

          {/* Tab 2: Roster Stats */}
          {activeTab === 'ROSTER' && (
            <div className="bg-white neo-border neo-shadow p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="text-2xl font-black uppercase">WORLD CUP SQUAD CATALOG</h3>
                
                {/* Roster tab filter */}
                <div className="flex gap-1 flex-wrap">
                  {(['ALL', 'FWD', 'MID', 'DEF', 'GK'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setRosterFilter(f)}
                      className={`px-3 py-1 text-[10px] font-black uppercase neo-border ${
                        rosterFilter === f ? 'bg-neo-blue text-white' : 'bg-gray-100'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {isLoadingRoster ? (
                <div className="py-20 text-center font-extrabold animate-pulse uppercase">
                  Loading Player Statistics from API...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredRoster.map(player => (
                    <div key={player.id} className="bg-gray-50 border-2 border-neo-dark p-4 flex gap-4 items-center">
                      <span className="text-4xl">{player.avatar}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-sm text-neo-dark">{player.name}</h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-neo-dark text-white uppercase">
                            {player.position}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">{player.country}</p>
                        
                        {/* Stat bars */}
                        <div className="grid grid-cols-3 gap-2 mt-2 text-[9px] font-extrabold uppercase">
                          <div>
                            <span className="text-gray-400 block">ATT</span>
                            <span className="text-neo-pink">{player.stats.attack}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">DEF</span>
                            <span className="text-neo-blue">{player.stats.defense}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">DISC</span>
                            <span className="text-neo-green">{player.stats.discipline}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: SOL Ledger */}
          {activeTab === 'LEDGER' && (
            <div className="bg-white neo-border neo-shadow p-6 space-y-4">
              <h3 className="text-2xl font-black uppercase">SOLANA TRANSACTION LEDGER</h3>
              <p className="text-xs font-bold text-gray-500">
                A verified record of all Devnet airdrops, match entry escrow deposits, and payouts.
              </p>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {solLedger.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 font-extrabold uppercase text-xs border-2 border-dashed border-gray-300">
                    No transactions recorded on this session.
                  </div>
                ) : (
                  solLedger.map((entry) => (
                    <div key={entry.id} className="p-3 neo-border bg-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase border ${
                            entry.type === 'DEPOSIT' ? 'bg-neo-pink text-white border-neo-dark' :
                            entry.type === 'PAYOUT' ? 'bg-neo-green text-neo-dark border-neo-dark' : 'bg-neo-blue text-white border-neo-dark'
                          }`}>
                            {entry.type}
                          </span>
                          <span className="font-mono text-[10px] text-gray-400">{entry.timestamp}</span>
                        </div>
                        <a 
                          href={`https://explorer.solana.com/tx/${entry.txSig}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-neo-blue hover:underline break-all block mt-1"
                        >
                          TX: {entry.txSig.slice(0, 24)}...
                        </a>
                      </div>

                      <div className="text-right">
                        <span className={`text-sm font-black ${
                          entry.type === 'PAYOUT' || entry.type === 'AIRDROP' ? 'text-neo-green' : 'text-neo-pink'
                        }`}>
                          {entry.type === 'PAYOUT' || entry.type === 'AIRDROP' ? '+' : '-'}{entry.amount.toFixed(2)} SOL
                        </span>
                        <span className="block text-[9px] font-bold text-gray-400 uppercase">{entry.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Leaderboard */}
          {activeTab === 'LEADERBOARD' && (
            <div className="bg-white neo-border neo-shadow p-6 space-y-4">
              <h3 className="text-2xl font-black uppercase">SURVIVOR HALL OF FAME</h3>
              <p className="text-xs font-bold text-gray-500">
                Ranked by total survive wagers, final HP pool, and Solana payout achievements.
              </p>

              <div className="space-y-2 font-extrabold text-sm">
                <div className="flex justify-between items-center p-3 bg-neo-yellow/20 neo-border">
                  <div className="flex items-center gap-2">
                    <span>🥇</span>
                    <span>solanaPro.sol</span>
                  </div>
                  <span>95 HP (12 Matches)</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 border border-gray-300">
                  <div className="flex items-center gap-2">
                    <span>🥈</span>
                    <span>rugSurvivor.sol</span>
                  </div>
                  <span>88 HP (9 Matches)</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 border border-gray-300">
                  <div className="flex items-center gap-2">
                    <span>🥉</span>
                    <span>messiHolder.sol</span>
                  </div>
                  <span>82 HP (8 Matches)</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 border border-gray-300">
                  <div className="flex items-center gap-2">
                    <span>4.</span>
                    <span>degenSaver.sol</span>
                  </div>
                  <span>78 HP (5 Matches)</span>
                </div>
              </div>
            </div>
          )}

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
