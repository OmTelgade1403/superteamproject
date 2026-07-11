'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Player, MatchEvent } from '@/lib/matchEngine';
import { Keypair } from '@solana/web3.js';

interface ArenaScreenProps {
  selectedPlayers: Player[];
  entryFeeTxSig: string;
  walletKeypair: Keypair;
  onGameOver: (survived: boolean, finalHp: number, earningsSol: number, settlementTxSig?: string) => void;
}

interface Prediction {
  id: string;
  question: string;
  type: 'FOUL' | 'SHOT';
  choice: 'YES' | 'NO';
  active: boolean;
  timeLeft: number;
  result?: 'WIN' | 'LOSE';
}

export default function ArenaScreen({ selectedPlayers, entryFeeTxSig, walletKeypair, onGameOver }: ArenaScreenProps) {
  const [hp, setHp] = useState(100);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [flashType, setFlashType] = useState<'NONE' | 'DAMAGE' | 'HEAL' | 'SHIELD'>('NONE');
  const [isEliminated, setIsEliminated] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  
  // Power-Ups (Shields) State
  const [shieldsCount, setShieldsCount] = useState(2);
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [shieldCooldown, setShieldCooldown] = useState(0);
  
  // Predictions state
  const [activePrediction, setActivePrediction] = useState<Prediction | null>(null);
  const [predictionLog, setPredictionLog] = useState<string>('');

  const sseRef = useRef<EventSource | null>(null);
  const isShieldActiveRef = useRef(false);
  const hpRef = useRef(100);

  // Sync ref with state
  useEffect(() => {
    isShieldActiveRef.current = isShieldActive;
  }, [isShieldActive]);

  useEffect(() => {
    hpRef.current = hp;
    if (hp <= 0 && !isEliminated) {
      setIsEliminated(true);
      triggerFlash('DAMAGE');
    }
  }, [hp, isEliminated]);

  // Connect to SSE stream
  useEffect(() => {
    const playerIds = selectedPlayers.map(p => p.id).join(',');
    const sse = new EventSource(`/api/match-stream?players=${playerIds}`);
    sseRef.current = sse;

    sse.onmessage = (message) => {
      try {
        const event: MatchEvent = JSON.parse(message.data);
        
        if (event.type === 'CONNECTED') {
          setEvents(prev => [event, ...prev]);
          return;
        }

        setEvents(prev => [event, ...prev].slice(0, 30));

        setGameTime(prev => {
          const nextTime = prev + Math.floor(Math.random() * 5) + 3;
          return nextTime >= 90 ? 90 : nextTime;
        });

        const isOurPlayer = selectedPlayers.some(p => p.id === event.playerId);
        
        if (isOurPlayer && event.hpDelta !== 0) {
          if (event.hpDelta < 0) {
            if (isShieldActiveRef.current) {
              triggerFlash('SHIELD');
              setEvents(prev => [
                {
                  id: Math.random().toString(),
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  playerId: '',
                  playerName: '',
                  playerCountry: '',
                  type: 'SAVE',
                  description: `🛡️ **SHIELD ACTIVE!** Damage from ${event.playerName}'s action was successfully blocked!`,
                  hpDelta: 0
                },
                ...prev
              ]);
            } else {
              setHp(current => Math.max(0, current + event.hpDelta));
              triggerFlash('DAMAGE');
            }
          } else {
            setHp(current => Math.min(100, current + event.hpDelta));
            triggerFlash('HEAL');
          }
        }

        if (activePrediction && activePrediction.active) {
          const isFoul = event.type === 'FOUL' || event.type === 'YELLOW_CARD' || event.type === 'RED_CARD';
          const isShot = event.type === 'SHOT' || event.type === 'GOAL';

          if ((activePrediction.type === 'FOUL' && isFoul) || (activePrediction.type === 'SHOT' && isShot)) {
            resolvePrediction(true);
          }
        }

      } catch (e) {
        console.error('Failed to parse match event', e);
      }
    };

    sse.onerror = (e) => {
      console.error('SSE Connection error', e);
    };

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [selectedPlayers, activePrediction]);

  // Shield Cooldown Timer
  useEffect(() => {
    if (shieldCooldown <= 0) return;
    const interval = setInterval(() => {
      setShieldCooldown(c => c - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [shieldCooldown]);

  // Game clock completion check
  useEffect(() => {
    if (gameTime >= 90) {
      if (sseRef.current) sseRef.current.close();
      
      const survived = hpRef.current > 0;
      const earnings = survived ? 0.35 : 0.0;
      
      if (survived) {
        // Trigger real payout call
        setIsProcessingPayout(true);
        (async () => {
          try {
            console.log('Sending payout request to server...');
            const res = await fetch('/api/solana/payout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userPubkey: walletKeypair.publicKey.toBase58(),
                amountSol: earnings
              })
            });
            const data = await res.json();
            if (res.status === 200 && data.signature) {
              onGameOver(true, hpRef.current, earnings, data.signature);
            } else {
              throw new Error(data.error || 'Payout transaction failed');
            }
          } catch (e: any) {
            console.error('Payout failed', e);
            alert(`Real Solana Devnet Payout failed: ${e.message || e}. Entering next screen with fallback status.`);
            onGameOver(true, hpRef.current, earnings, undefined);
          } finally {
            setIsProcessingPayout(false);
          }
        })();
      } else {
        onGameOver(false, hpRef.current, 0.0, undefined);
      }
    }
  }, [gameTime, onGameOver, walletKeypair]);

  // Prediction timer countdown
  useEffect(() => {
    if (!activePrediction || !activePrediction.active) return;

    const timer = setInterval(() => {
      setActivePrediction(prev => {
        if (!prev) return null;
        if (prev.timeLeft <= 1) {
          clearInterval(timer);
          setTimeout(() => resolvePrediction(false), 0);
          return { ...prev, active: false, timeLeft: 0 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activePrediction]);

  const triggerFlash = (type: 'DAMAGE' | 'HEAL' | 'SHIELD') => {
    setFlashType(type);
    setTimeout(() => {
      setFlashType('NONE');
    }, 3000);
  };

  const triggerShield = () => {
    if (shieldsCount <= 0 || shieldCooldown > 0 || isShieldActive) return;

    setShieldsCount(prev => prev - 1);
    setIsShieldActive(true);
    triggerFlash('SHIELD');

    setTimeout(() => {
      setIsShieldActive(false);
      setShieldCooldown(15);
    }, 6000);
  };

  const startPrediction = (type: 'FOUL' | 'SHOT') => {
    if (activePrediction) return;

    const question = type === 'FOUL' 
      ? 'Will there be a foul/card in the next 15 seconds?'
      : 'Will there be a shot/goal in the next 15 seconds?';

    setActivePrediction({
      id: Math.random().toString(),
      question,
      type,
      choice: 'YES',
      active: true,
      timeLeft: 15
    });
    setPredictionLog('Prediction locked in! Awaiting match data...');
  };

  const resolvePrediction = (success: boolean) => {
    if (!activePrediction) return;

    if (success) {
      setHp(current => Math.min(100, current + 15));
      triggerFlash('HEAL');
      setPredictionLog('✅ PREDICTION WON! +15 HP Medkit administered.');
    } else {
      setHp(current => Math.max(0, current - 10));
      triggerFlash('DAMAGE');
      setPredictionLog('❌ PREDICTION LOST! HP penalty of -10 HP applied.');
    }

    setActivePrediction(null);
    setTimeout(() => setPredictionLog(''), 4000);
  };

  return (
    <div className={`max-w-5xl mx-auto p-4 w-full transition-all duration-300 ${isEliminated ? 'filter grayscale brightness-75' : ''}`}>
      
      {/* Damage / Heal Overlay Flash Animations */}
      {flashType === 'DAMAGE' && (
        <div className="fixed inset-0 pointer-events-none bg-red-600/30 border-8 border-red-600 z-50 animate-[pulse_0.4s_infinite]" />
      )}
      {flashType === 'HEAL' && (
        <div className="fixed inset-0 pointer-events-none bg-green-500/25 border-8 border-green-500 z-50 animate-[pulse_0.4s_infinite]" />
      )}
      {flashType === 'SHIELD' && (
        <div className="fixed inset-0 pointer-events-none bg-blue-500/20 border-8 border-blue-500 z-50 animate-[pulse_0.4s_infinite]" />
      )}

      {/* Arena Header */}
      <div className="bg-neo-dark text-white neo-border p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="bg-neo-pink text-neo-dark px-2 py-1 text-xs font-extrabold uppercase neo-border inline-block rotate-[-1deg] mb-2">
            ⚽ LIVE BROADCAST DATA ARENA
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight uppercase">
            🏆 WORLD CUP MATCH LIVE
          </h2>
          <div className="font-mono text-xs text-gray-400 mt-1 uppercase flex flex-wrap gap-4">
            <span>Escrow Deposit: 0.1 SOL ✔️</span>
            <span className="text-neo-green font-bold">TX: {entryFeeTxSig.slice(0, 10)}...</span>
          </div>
        </div>
        
        {/* Match Timer */}
        <div className="bg-neo-yellow text-neo-dark neo-border px-6 py-3 font-black text-center neo-shadow">
          <div className="text-[10px] uppercase text-gray-600">Match Clock</div>
          <div className="text-3xl font-mono">{gameTime}'<span className="animate-pulse">:00</span></div>
        </div>
      </div>

      {isProcessingPayout ? (
        <div className="bg-white neo-border neo-shadow-lg p-12 flex flex-col items-center justify-center max-w-xl mx-auto my-12">
          <div className="w-16 h-16 bg-neo-pink neo-border animate-spin mb-6 flex items-center justify-center text-3xl font-extrabold">
            💸
          </div>
          <h3 className="text-2xl font-extrabold text-neo-dark mb-4">ON-CHAIN PAYOUT SETTLEMENT</h3>
          <p className="text-sm font-bold text-center text-gray-600">
            Escrow contract is processing your payout transfer of 0.35 SOL on Solana Devnet...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Game Screen */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Health Bar Section */}
            <div className="bg-white neo-border neo-shadow p-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xl font-extrabold uppercase text-neo-dark flex items-center gap-2">
                  ❤️ SQUAD TOTAL HEALTH 
                  {isShieldActive && <span className="bg-neo-blue text-white text-xs px-2 py-0.5 rounded animate-pulse">🛡️ SHIELD ACTIVE</span>}
                </span>
                <span className={`text-4xl font-black ${hp > 50 ? 'text-neo-green' : hp > 20 ? 'text-neo-yellow' : 'text-red-500 animate-pulse'}`}>
                  {hp} HP
                </span>
              </div>
              
              {/* The Brutalist HP Progress */}
              <div className="w-full h-10 neo-border bg-gray-200 overflow-hidden relative">
                <div 
                  className={`h-full transition-all duration-300 ${
                    isShieldActive ? 'bg-neo-blue' :
                    hp > 50 ? 'bg-neo-green' : 
                    hp > 20 ? 'bg-neo-yellow' : 'bg-red-500'
                  }`}
                  style={{ width: `${hp}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center font-black text-xs tracking-widest text-neo-dark mix-blend-difference">
                  {hp === 0 ? 'ELIMINATED' : 'SURVIVAL ZONE'}
                </div>
              </div>

              {/* Micro-Squad Display */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                {selectedPlayers.map(player => (
                  <div key={player.id} className="bg-gray-50 neo-border p-3 flex flex-col items-center text-center">
                    <span className="text-4xl mb-1">{player.avatar}</span>
                    <h5 className="font-extrabold text-xs text-neo-dark truncate w-full">{player.name}</h5>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-neo-dark text-white mt-1">
                      {player.position}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Action Ticker / Events Feed */}
            <div className="bg-white neo-border neo-shadow p-6">
              <h3 className="text-2xl font-black text-neo-dark mb-4 pb-2 border-b-4 border-neo-dark flex justify-between items-center">
                <span>📡 TxLINE REAL-TIME FEED</span>
                <span className="text-xs bg-neo-green neo-border px-2 py-0.5 animate-pulse uppercase">LIVE DATA</span>
              </h3>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 font-semibold text-sm">
                {events.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 font-extrabold uppercase text-xs border-2 border-dashed border-gray-300">
                    Waiting for kickoff events...
                  </div>
                ) : (
                  events.map((event, index) => (
                    <div 
                      key={event.id || index} 
                      className={`p-3 neo-border transition-all duration-300 flex justify-between items-center ${
                        event.type === 'CONNECTED' ? 'bg-neo-blue/20 border-dashed' :
                        event.hpDelta < 0 ? 'bg-red-50 border-red-500 animate-[shake_0.2s_ease-in-out_2]' :
                        event.hpDelta > 0 ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex-1">
                        <span className="font-mono text-xs text-gray-400 block mb-1">{event.timestamp}</span>
                        <p 
                          className="text-neo-dark font-extrabold text-xs sm:text-sm"
                          dangerouslySetInnerHTML={{ __html: event.description }}
                        />
                      </div>
                      {event.hpDelta !== 0 && (
                        <span className={`text-sm font-black ml-4 whitespace-nowrap ${event.hpDelta < 0 ? 'text-red-500' : 'text-neo-green'}`}>
                          {event.hpDelta > 0 ? `+${event.hpDelta} HP` : `${event.hpDelta} HP`}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Power-Ups and Predictions */}
          <div className="space-y-6">
            
            {/* Shield Power-Up Section */}
            <div className="bg-white neo-border neo-shadow p-6">
              <h3 className="text-xl font-extrabold text-neo-dark mb-4 border-b-4 border-neo-dark pb-2">
                🛡️ ACTIVE SHIELDS
              </h3>
              <p className="text-xs font-bold text-gray-500 mb-4">
                React instantly to match pressure! Trigger a shield to block all squad damage for the next 6 seconds.
              </p>

              <button
                onClick={triggerShield}
                disabled={shieldsCount <= 0 || shieldCooldown > 0 || isShieldActive || isEliminated}
                className={`w-full py-4 text-center font-black uppercase neo-button relative ${
                  isShieldActive ? 'bg-neo-blue text-white animate-pulse' : 'bg-white'
                }`}
              >
                {isShieldActive ? (
                  <span>🛡️ SHIELD IS ACTIVE (6s)</span>
                ) : shieldCooldown > 0 ? (
                  <span>COOLDOWN: {shieldCooldown}s</span>
                ) : shieldsCount > 0 ? (
                  <span>⚡ ACTIVATE SHIELD ({shieldsCount} left)</span>
                ) : (
                  <span>❌ NO SHIELDS REMAINING</span>
                )}
              </button>
              
              <div className="flex justify-between mt-3 text-[10px] font-extrabold text-gray-500 uppercase">
                <span>Cooldown: 15s</span>
                <span>Duration: 6s</span>
              </div>
            </div>

            {/* Mini-Predictions / Hi-Lo Mechanics */}
            <div className="bg-white neo-border neo-shadow p-6">
              <h3 className="text-xl font-extrabold text-neo-dark mb-4 border-b-4 border-neo-dark pb-2">
                🎲 MINI-PREDICTIONS
              </h3>
              <p className="text-xs font-bold text-gray-500 mb-4">
                Predict events during slow moments. Win to earn a **MEDKIT (+15 HP)**. Lose and suffer **-10 HP** damage!
              </p>

              {activePrediction ? (
                <div className="bg-neo-yellow/30 p-4 neo-border border-dashed space-y-4">
                  <div className="flex justify-between items-center text-xs font-extrabold uppercase">
                    <span className="text-neo-pink">🔮 Prediction Active</span>
                    <span className="font-mono text-sm bg-neo-dark text-white px-2 py-0.5 neo-border">
                      {activePrediction.timeLeft}s left
                    </span>
                  </div>
                  <h5 className="font-extrabold text-sm">{activePrediction.question}</h5>
                  <div className="text-xs font-bold text-gray-500">Choice: <span className="bg-neo-dark text-white px-2 py-0.5 neo-border uppercase">{activePrediction.choice}</span></div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => startPrediction('FOUL')}
                    disabled={isEliminated}
                    className="w-full py-3 bg-neo-pink text-white text-xs font-black uppercase neo-button"
                  >
                    🔮 Predict: Foul in Next 15s
                  </button>
                  <button
                    onClick={() => startPrediction('SHOT')}
                    disabled={isEliminated}
                    className="w-full py-3 bg-neo-green text-neo-dark text-xs font-black uppercase neo-button"
                  >
                    🔮 Predict: Shot in Next 15s
                  </button>
                </div>
              )}

              {predictionLog && (
                <div className="mt-4 bg-neo-dark text-white p-3 neo-border font-mono text-[11px]">
                  {predictionLog}
                </div>
              )}
            </div>

            {/* Quick Demo Assist */}
            <div className="bg-neo-pink/10 border-4 border-dashed border-neo-dark p-4">
              <h4 className="font-black text-xs uppercase mb-2">💡 Demo Speed Controls</h4>
              <p className="text-[10px] font-bold text-gray-600 mb-3">
                Press the whistle below to force the referee to end the match early (triggers Solana payouts immediately).
              </p>
              <button
                onClick={() => setGameTime(90)}
                className="w-full py-2 bg-white text-xs font-bold uppercase neo-button flex items-center justify-center gap-1"
              >
                🏁 BLOW FINAL WHISTLE (90')
              </button>
            </div>

          </div>

        </div>
      )}

      {isEliminated && (
        <div className="fixed inset-0 bg-neo-dark/70 flex items-center justify-center p-4 z-40 backdrop-blur-sm">
          <div className="bg-white neo-border neo-shadow-lg p-8 max-w-md w-full text-center">
            <span className="text-6xl">💀</span>
            <h3 className="text-3xl font-extrabold text-neo-dark mt-4 mb-2 uppercase">ELIMINATED</h3>
            <p className="font-bold text-sm text-gray-500 mb-6">
              Your squad team health hit 0 HP! Your Solana Devnet deposit has been distributed to survivors.
            </p>
            <button
              onClick={() => onGameOver(false, 0, 0.0)}
              className="w-full py-3 bg-neo-pink text-white font-extrabold uppercase neo-button"
            >
              ☠️ VIEW FINAL SETTLEMENT
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
