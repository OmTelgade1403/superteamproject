'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { getOrCreateClientKeypair, getSolBalance, requestAirdrop } from '@/lib/solana';
import { Keypair } from '@solana/web3.js';
import Link from 'next/link';

export default function AuthPage() {
  const router = useRouter();
  const { login, walletKeypair, isAuthenticated } = useSession();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeKeypair, setActiveKeypair] = useState<Keypair | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [walletInputSecret, setWalletInputSecret] = useState('');
  const [airdropTx, setAirdropTx] = useState('');

  // Sync session keypair or generate locally
  useEffect(() => {
    if (walletKeypair) {
      setActiveKeypair(walletKeypair);
      refreshBalance(walletKeypair.publicKey.toBase58());
    } else if (typeof window !== 'undefined') {
      const kp = getOrCreateClientKeypair();
      setActiveKeypair(kp);
      refreshBalance(kp.publicKey.toBase58());
    }
  }, [walletKeypair]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const refreshBalance = async (pubkey: string) => {
    const bal = await getSolBalance(pubkey);
    setBalance(bal);
  };

  const handleAirdrop = async () => {
    if (!activeKeypair) return;
    setIsAirdropping(true);
    setAirdropTx('');
    try {
      const sig = await requestAirdrop(activeKeypair.publicKey.toBase58());
      setAirdropTx(`Airdrop Success! TX: ${sig.slice(0, 15)}...`);
      await refreshBalance(activeKeypair.publicKey.toBase58());
    } catch (e: any) {
      console.error(e);
      alert('Airdrop failed. Solana Devnet rate limits might be active. Please try again in a minute.');
    } finally {
      setIsAirdropping(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || !activeKeypair) return;

    setIsSubmitting(true);
    setTimeout(() => {
      login(activeKeypair, email);
      setIsSubmitting(false);
      router.push('/dashboard');
    }, 1200);
  };

  const handleSocialLogin = (platform: string) => {
    if (!activeKeypair) return;
    setIsSubmitting(true);
    setTimeout(() => {
      login(activeKeypair, `${platform.toLowerCase()}user@liveaction.xyz`);
      setIsSubmitting(false);
      router.push('/dashboard');
    }, 1000);
  };

  const handleImportWallet = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const secret = Uint8Array.from(JSON.parse(walletInputSecret));
      const imported = Keypair.fromSecretKey(secret);
      localStorage.setItem('liveaction_survival_wallet', JSON.stringify(Array.from(imported.secretKey)));
      setActiveKeypair(imported);
      login(imported, 'imported-keypair@solana.com'); // Instantly log in
      refreshBalance(imported.publicKey.toBase58());
      alert('Solana Keypair imported and authenticated!');
      router.push('/dashboard');
    } catch (err) {
      alert('Invalid keypair secret key format. Please enter a valid JSON array of numbers.');
    }
  };

  return (
    <div className="min-h-screen bg-neo-yellow text-neo-dark flex flex-col justify-between w-full">
      {/* Header */}
      <header className="bg-white border-b-4 border-neo-dark px-6 py-4 flex justify-between items-center w-full z-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-neo-pink neo-border flex items-center justify-center font-black text-lg rotate-[-5deg]">
            ⚔️
          </div>
          <span className="font-extrabold text-lg md:text-xl tracking-tight uppercase">
            LIVEACTION SURVIVAL
          </span>
        </Link>
      </header>

      {/* Auth Panel */}
      <main className="flex-grow flex items-center justify-center py-8 px-4 w-full">
        <div className="w-full max-w-md bg-white neo-border neo-shadow-lg p-6 md:p-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiNlNWU3ZWIiLz4KPC9zdmc+')] bg-repeat mx-auto">
          
          {/* Badge */}
          <div className="inline-block bg-neo-pink text-white neo-border px-3 py-1 font-bold text-xs uppercase tracking-wider mb-4 rotate-[-2deg]">
            ⛓️ SOLANA DEVNET LIVE WALLET
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-neo-dark mb-2 uppercase">
            Connect & Login
          </h2>
          <p className="text-neo-dark font-semibold mb-6 text-sm border-b-4 border-neo-dark pb-4">
            Auth via Web3Auth and fund your Devnet wallet to start the match escrow.
          </p>

          {activeKeypair && (
            <div className="bg-neo-yellow/20 p-4 neo-border border-dashed space-y-3 mb-6">
              <span className="block text-xs font-black uppercase text-gray-500">Your Active Wallet Address</span>
              <div className="font-mono text-xs text-neo-dark break-all bg-white p-2 border-2 border-neo-dark select-all">
                {activeKeypair.publicKey.toBase58()}
              </div>
              
              <div className="flex justify-between items-center">
                <div className="font-extrabold">
                  <span className="text-gray-500 text-xs block uppercase">On-chain Balance</span>
                  <span className="text-2xl text-neo-dark">{balance.toFixed(4)} SOL</span>
                </div>
                
                <button
                  onClick={handleAirdrop}
                  disabled={isAirdropping}
                  className="px-3 py-2 text-xs uppercase bg-neo-blue text-white neo-button disabled:opacity-50"
                >
                  {isAirdropping ? '⏳ Airdropping...' : '🎁 Airdrop 1 SOL'}
                </button>
              </div>

              {airdropTx && (
                <p className="text-[10px] font-mono text-neo-green font-bold bg-neo-dark p-1 text-center">
                  {airdropTx}
                </p>
              )}
            </div>
          )}

          {isSubmitting ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-neo-pink neo-border animate-spin mb-4"></div>
              <p className="text-xl font-extrabold animate-pulse">CONNECTING WEB3AUTH...</p>
              <p className="text-xs font-bold text-gray-500 mt-2">Initializing Wallet Escrow Session</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Email form simulating Web3Auth email login */}
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <label className="block text-sm font-extrabold uppercase text-neo-dark">
                  Log in with Web3Auth (Email OTP)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="neo-input flex-1"
                  />
                  <button type="submit" className="neo-button px-5 py-3 bg-neo-green">
                    Send OTP
                  </button>
                </div>
              </form>

              <div className="relative flex items-center justify-center my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-4 border-neo-dark"></div>
                </div>
                <span className="relative bg-white px-3 font-extrabold text-sm uppercase neo-border">OR</span>
              </div>

              {/* Social logins */}
              <div className="space-y-2">
                <span className="block text-sm font-extrabold uppercase text-neo-dark">
                  Fast Sign-in
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSocialLogin('Google')}
                    className="neo-button py-2 bg-white flex items-center justify-center gap-1 text-xs sm:text-sm"
                  >
                    🔴 Google
                  </button>
                  <button
                    onClick={() => handleSocialLogin('Twitter')}
                    className="neo-button py-2 bg-white flex items-center justify-center gap-1 text-xs sm:text-sm"
                  >
                    🔵 Twitter
                  </button>
                  <button
                    onClick={() => handleSocialLogin('GitHub')}
                    className="neo-button py-2 bg-white flex items-center justify-center gap-1 text-xs sm:text-sm"
                  >
                    ⚫ GitHub
                  </button>
                </div>
              </div>

              <div className="relative flex items-center justify-center my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-4 border-neo-dark"></div>
                </div>
                <span className="relative bg-white px-3 font-extrabold text-sm uppercase neo-border">OR</span>
              </div>

              {/* Wallet Import form */}
              <form onSubmit={handleImportWallet} className="space-y-3">
                <label className="block text-sm font-extrabold uppercase text-neo-dark">
                  Import Existing Solana Keypair
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Enter secret key JSON array, e.g. [12,43,101...]"
                    value={walletInputSecret}
                    onChange={(e) => setWalletInputSecret(e.target.value)}
                    className="neo-input flex-1 text-xs font-mono"
                  />
                  <button 
                    type="submit" 
                    className="neo-button px-4 py-2 bg-neo-blue text-xs uppercase"
                  >
                    Import
                  </button>
                </div>
              </form>

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
