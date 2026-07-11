'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Keypair } from '@solana/web3.js';
import { Player } from '@/lib/matchEngine';
import { getOrCreateClientKeypair } from '@/lib/solana';

export interface LedgerEntry {
  id: string;
  timestamp: string;
  type: 'DEPOSIT' | 'PAYOUT' | 'AIRDROP';
  amount: number;
  txSig: string;
  status: 'CONFIRMED' | 'FAILED';
}

export interface GameResult {
  survived: boolean;
  finalHp: number;
  earningsSol: number;
  settlementTxSig?: string;
}

interface SessionContextType {
  walletKeypair: Keypair | null;
  userEmail: string;
  squad: Player[];
  entryFeeTx: string;
  gameResult: GameResult | null;
  solLedger: LedgerEntry[];
  isAuthenticated: boolean;
  login: (keypair: Keypair, email: string) => void;
  logout: () => void;
  updateSquad: (players: Player[]) => void;
  updateEntryFeeTx: (tx: string) => void;
  updateGameResult: (result: GameResult | null) => void;
  addLedgerEntry: (type: LedgerEntry['type'], amount: number, txSig: string, status?: LedgerEntry['status']) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [walletKeypair, setWalletKeypair] = useState<Keypair | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [squad, setSquad] = useState<Player[]>([]);
  const [entryFeeTx, setEntryFeeTx] = useState('');
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [solLedger, setSolLedger] = useState<LedgerEntry[]>([]);

  // Automatically initialize keypair on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const kp = getOrCreateClientKeypair();
      setWalletKeypair(kp);
      
      // Load ledger from local storage if exists
      const storedLedger = localStorage.getItem('liveaction_sol_ledger');
      if (storedLedger) {
        try {
          setSolLedger(JSON.parse(storedLedger));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const login = (keypair: Keypair, email: string) => {
    setWalletKeypair(keypair);
    setUserEmail(email);
    localStorage.setItem('liveaction_user_email', email);
  };

  const logout = () => {
    setWalletKeypair(null);
    setUserEmail('');
    setSquad([]);
    setEntryFeeTx('');
    setGameResult(null);
    localStorage.removeItem('liveaction_user_email');
  };

  const updateSquad = (players: Player[]) => {
    setSquad(players);
  };

  const updateEntryFeeTx = (tx: string) => {
    setEntryFeeTx(tx);
    addLedgerEntry('DEPOSIT', 0.1, tx, 'CONFIRMED');
  };

  const updateGameResult = (result: GameResult | null) => {
    setGameResult(result);
    if (result && result.survived && result.settlementTxSig) {
      addLedgerEntry('PAYOUT', result.earningsSol, result.settlementTxSig, 'CONFIRMED');
    }
  };

  const addLedgerEntry = (
    type: LedgerEntry['type'],
    amount: number,
    txSig: string,
    status: LedgerEntry['status'] = 'CONFIRMED'
  ) => {
    const newEntry: LedgerEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleString(),
      type,
      amount,
      txSig,
      status
    };
    
    setSolLedger(prev => {
      const updated = [newEntry, ...prev];
      localStorage.setItem('liveaction_sol_ledger', JSON.stringify(updated));
      return updated;
    });
  };

  const isAuthenticated = !!userEmail;

  return (
    <SessionContext.Provider value={{
      walletKeypair,
      userEmail,
      squad,
      entryFeeTx,
      gameResult,
      solLedger,
      isAuthenticated,
      login,
      logout,
      updateSquad,
      updateEntryFeeTx,
      updateGameResult,
      addLedgerEntry
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
