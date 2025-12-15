
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, subscribeToAuth, playGameTransaction, consumeGameResult, updateLiveBets } from '../services/backend';
import { User } from '../types';
import { ChevronLeft, Volume2, VolumeX, HelpCircle, History, Trophy, Coins, Flame, Users } from 'lucide-react';

// --- GAME ASSETS ---
const CARD_SUITS = ['♠', '♥', '♣', '♦'];
const CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const VALUES = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };

const CHIPS = [10, 50, 100, 500, 1000];

// Asset URLs
const DRAGON_IMG = "https://cdn-icons-png.flaticon.com/512/4712/4712808.png";
const TIGER_IMG = "https://cdn-icons-png.flaticon.com/512/3755/3755307.png";
const FIRE_GIF = "https://media.giphy.com/media/26tPlO25Ah0V4YdGx/giphy.gif"; 

type GameState = 'BETTING' | 'DEALING' | 'RESULT';
type Winner = 'DRAGON' | 'TIGER' | 'TIE' | null;

export default function GamePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [balance, setBalance] = useState(0);

  // Game Logic State
  const [gameState, setGameState] = useState<GameState>('BETTING');
  const [timer, setTimer] = useState(15);
  const [selectedChip, setSelectedChip] = useState(10);
  
  // Sound State
  const [isMuted, setIsMuted] = useState(false);
  const sounds = useRef({
      bet: new Audio('https://www.soundjay.com/button/sounds/button-37.mp3'),
      card: new Audio('https://www.soundjay.com/card/sounds/card-flip-1.mp3'),
      win: new Audio('https://www.soundjay.com/misc/sounds/magic-chime-01.mp3')
  });

  const playSound = (key: 'bet' | 'card' | 'win') => {
      if(isMuted) return;
      const audio = sounds.current[key];
      audio.currentTime = 0;
      audio.play().catch(() => {});
  };
  
  // Bets
  const [bets, setBets] = useState({ DRAGON: 12400, TIE: 1500, TIGER: 11200 }); // Total (Fake + Real)
  const [myBets, setMyBets] = useState({ DRAGON: 0, TIE: 0, TIGER: 0 }); // My Real Bets
  
  // Cards
  const [dragonCard, setDragonCard] = useState<{rank: string, suit: string} | null>(null);
  const [tigerCard, setTigerCard] = useState<{rank: string, suit: string} | null>(null);
  const [winner, setWinner] = useState<Winner>(null);
  
  // History
  const [history, setHistory] = useState<Winner[]>(['DRAGON', 'TIGER', 'TIGER', 'DRAGON', 'TIE', 'DRAGON', 'DRAGON']);

  useEffect(() => {
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      if(u) setBalance(u.balance);
    });
    return () => unsub();
  }, []);

  // --- FAKE BETTING SIMULATION ---
  useEffect(() => {
    let interval: any;
    if (gameState === 'BETTING') {
      interval = setInterval(() => {
         // Randomly add bets to Dragon
         if(Math.random() > 0.3) {
             setBets(prev => ({ ...prev, DRAGON: prev.DRAGON + Math.floor(Math.random() * 5000) }));
         }
         // Randomly add bets to Tiger
         if(Math.random() > 0.3) {
             setBets(prev => ({ ...prev, TIGER: prev.TIGER + Math.floor(Math.random() * 5000) }));
         }
         // Randomly add bets to Tie
         if(Math.random() > 0.8) {
             setBets(prev => ({ ...prev, TIE: prev.TIE + Math.floor(Math.random() * 500) }));
         }
         
         setTimer((prev) => {
            if (prev <= 0.1) return 0;
            return prev - 0.1; 
         });

      }, 100); 
    }
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
      if(gameState === 'BETTING' && timer <= 0) {
          handleDeal();
      }
  }, [timer, gameState]);

  const placeBet = (zone: 'DRAGON' | 'TIE' | 'TIGER') => {
    if (gameState !== 'BETTING') return;
    if (balance < selectedChip) {
      alert("Insufficient Balance! Please Recharge.");
      return;
    }

    playSound('bet');

    const newMyBets = { ...myBets, [zone]: myBets[zone] + selectedChip };
    setMyBets(newMyBets);
    setBets(prev => ({ ...prev, [zone]: prev[zone] + selectedChip }));
    
    // Sync with Admin Panel
    updateLiveBets(newMyBets);

    playGameTransaction(selectedChip, 'LOSS', `Bet on ${zone}`)
        .then(() => {})
        .catch(err => {
             alert(err.message);
             setMyBets(prev => ({ ...prev, [zone]: prev[zone] - selectedChip }));
        });
  };

  const getRandomCard = (minVal: number, maxVal: number) => {
     // Filter ranks based on value range needed
     const possibleRanks = CARD_RANKS.filter(r => {
         const v = VALUES[r as keyof typeof VALUES];
         return v >= minVal && v <= maxVal;
     });
     const rank = possibleRanks[Math.floor(Math.random() * possibleRanks.length)];
     const suit = CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)];
     return { rank, suit };
  };

  const handleDeal = async () => {
    setGameState('DEALING');
    
    // RESET LIVE BETS IN ADMIN
    updateLiveBets({ DRAGON: 0, TIGER: 0, TIE: 0 });

    // DETERMINE RESULT FROM BACKEND QUEUE
    const predeterminedResult = consumeGameResult(); // e.g., 'DRAGON'
    
    let dCard, tCard;

    if (predeterminedResult === 'DRAGON') {
        // Dragon needs higher card
        dCard = getRandomCard(8, 13); // High card (8-K)
        tCard = getRandomCard(1, 7);  // Low card (A-7)
    } else if (predeterminedResult === 'TIGER') {
        // Tiger needs higher card
        dCard = getRandomCard(1, 7);
        tCard = getRandomCard(8, 13);
    } else {
        // Tie
        const rank = CARD_RANKS[Math.floor(Math.random() * CARD_RANKS.length)];
        dCard = { rank, suit: CARD_SUITS[0] };
        tCard = { rank, suit: CARD_SUITS[1] };
    }

    // Wait for "Stop Betting"
    await new Promise(r => setTimeout(r, 1000));
    
    // Reveal Dragon
    playSound('card');
    setDragonCard(dCard);
    await new Promise(r => setTimeout(r, 1000));
    
    // Reveal Tiger
    playSound('card');
    setTigerCard(tCard);
    await new Promise(r => setTimeout(r, 500));

    setWinner(predeterminedResult);
    setGameState('RESULT');
    setHistory(prev => [predeterminedResult, ...prev].slice(0, 15));

    await handlePayout(predeterminedResult);

    setTimeout(() => {
      resetGame();
    }, 6000);
  };

  const handlePayout = async (result: string) => {
    let winnings = 0;
    if (result === 'DRAGON' && myBets.DRAGON > 0) winnings += myBets.DRAGON * 2;
    if (result === 'TIGER' && myBets.TIGER > 0) winnings += myBets.TIGER * 2;
    if (result === 'TIE' && myBets.TIE > 0) winnings += myBets.TIE * 9;

    if (winnings > 0) {
        playSound('win');
        await playGameTransaction(winnings, 'WIN', `Won on ${result}`);
    }
  };

  const resetGame = () => {
    setGameState('BETTING');
    setTimer(15);
    setBets({ 
        DRAGON: 10000 + Math.floor(Math.random() * 5000), 
        TIE: 1000 + Math.floor(Math.random() * 500), 
        TIGER: 10000 + Math.floor(Math.random() * 5000) 
    });
    setMyBets({ DRAGON: 0, TIE: 0, TIGER: 0 });
    setDragonCard(null);
    setTigerCard(null);
    setWinner(null);
  };

  const renderCard = (card: {rank: string, suit: string} | null) => {
    if (!card) {
       return (
         <div className="w-16 h-24 sm:w-20 sm:h-28 bg-indigo-900 rounded-lg border-2 border-slate-600 flex items-center justify-center shadow-2xl relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
             <div className="text-4xl text-white/20">?</div>
         </div>
       );
    }
    const isRed = card.suit === '♥' || card.suit === '♦';
    return (
        <div className="w-16 h-24 sm:w-20 sm:h-28 bg-white rounded-lg flex flex-col items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] animate-flip-in z-20">
           <div className={`text-2xl font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>{card.rank}</div>
           <div className={`text-3xl ${isRed ? 'text-red-600' : 'text-black'}`}>{card.suit}</div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col font-sans overflow-hidden">
      {/* Header code same as before */}
      <div className="flex justify-between items-center p-3 bg-slate-900 border-b border-slate-800 z-30 shadow-lg">
         <button onClick={() => navigate('/')} className="p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700">
            <ChevronLeft size={20} />
         </button>
         <div className="flex flex-col items-center">
             <div className="flex items-center bg-black/60 px-4 py-1.5 rounded-full border border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                 <Coins className="text-yellow-500 mr-2" size={16} />
                 <span className="text-white font-mono font-bold text-lg">Rs.{balance.toLocaleString()}</span>
             </div>
         </div>
         <div className="flex gap-2">
             <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
             </button>
         </div>
      </div>

      <div className="flex-1 relative flex flex-col pt-2 pb-4 bg-[url('https://img.freepik.com/free-vector/dark-purple-background-with-geometric-shapes_1017-32182.jpg')] bg-cover bg-center">
         <div className="absolute inset-0 bg-black/70"></div> 

         {/* --- TOP SECTION: AVATARS & CARDS --- */}
         <div className="relative z-10 w-full flex justify-between items-center px-2 mt-4 mb-2">
             
             {/* DRAGON */}
             <div className="flex flex-col items-center relative">
                 <div className={`relative w-24 h-24 sm:w-28 sm:h-28 transition-transform duration-500 ${winner === 'DRAGON' ? 'scale-110' : ''}`}>
                     {winner === 'DRAGON' && (
                         <img src={FIRE_GIF} alt="Fire" className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-32 h-32 z-50 pointer-events-none mix-blend-screen" />
                     )}
                     <img src={DRAGON_IMG} alt="Dragon" className={`w-full h-full object-contain drop-shadow-[0_0_15px_rgba(239,68,68,0.6)] ${winner === 'DRAGON' ? 'animate-bounce' : ''}`} />
                 </div>
                 <div className="mt-2 transform -rotate-3 transition-all duration-300">
                     {renderCard(dragonCard)}
                 </div>
             </div>

             {/* VS/TIMER */}
             <div className="flex flex-col items-center justify-center z-20">
                 {gameState === 'BETTING' ? (
                     <div className="w-16 h-16 rounded-full bg-slate-900 border-4 border-yellow-500 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.5)] animate-pulse">
                         <span className="text-2xl font-bold text-white font-mono">{Math.ceil(timer)}</span>
                     </div>
                 ) : (
                     <div className="text-yellow-500 font-black text-4xl drop-shadow-[0_0_15px_rgba(234,179,8,1)] animate-ping">VS</div>
                 )}
             </div>

             {/* TIGER */}
             <div className="flex flex-col items-center relative">
                 <div className={`relative w-24 h-24 sm:w-28 sm:h-28 transition-transform duration-500 ${winner === 'TIGER' ? 'scale-110' : ''}`}>
                     {winner === 'TIGER' && (
                         <img src={FIRE_GIF} alt="Fire" className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-32 h-32 z-50 pointer-events-none mix-blend-screen" />
                     )}
                     <img src={TIGER_IMG} alt="Tiger" className={`w-full h-full object-contain drop-shadow-[0_0_15px_rgba(234,179,8,0.6)] ${winner === 'TIGER' ? 'animate-bounce' : ''}`} />
                 </div>
                 <div className="mt-2 transform rotate-3 transition-all duration-300">
                     {renderCard(tigerCard)}
                 </div>
             </div>
         </div>

         {/* HISTORY BAR */}
         <div className="relative z-10 w-full px-2 mb-4">
             <div className="flex items-center justify-end space-x-1 bg-black/40 p-1.5 rounded-full border border-white/10 overflow-hidden backdrop-blur-sm">
                <span className="text-[10px] text-slate-400 mr-auto pl-2 font-bold uppercase">Last Results:</span>
                {history.map((h, i) => (
                    <div key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm border border-white/20 ${
                        h === 'DRAGON' ? 'bg-red-600' : h === 'TIGER' ? 'bg-yellow-600' : 'bg-green-600'
                    }`}>
                        {h?.charAt(0)}
                    </div>
                ))}
            </div>
         </div>

         {winner && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce pointer-events-none">
                 <div className={`px-8 py-3 rounded-xl border-4 font-black text-3xl uppercase shadow-[0_0_50px_rgba(0,0,0,1)] bg-black ${
                     winner === 'DRAGON' ? 'border-red-500 text-red-500' : 
                     winner === 'TIGER' ? 'border-yellow-500 text-yellow-500' : 
                     'border-green-500 text-green-500'
                 }`}>
                     {winner} WINS
                 </div>
             </div>
         )}

         {/* --- BETTING TABLE (UPDATED LABELS) --- */}
         <div className="relative z-10 flex-1 px-3 grid grid-cols-3 gap-2 pb-4">
             
             {/* DRAGON */}
             <div 
                onClick={() => placeBet('DRAGON')}
                className={`relative flex-1 rounded-l-2xl border-2 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all overflow-hidden group
                    ${winner === 'DRAGON' ? 'border-red-500 bg-red-900/40 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'border-red-600/30 bg-gradient-to-b from-red-900/60 to-black/60'}`}
             >
                 <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50"></div>
                 <h2 className="text-red-100 font-black text-xl uppercase drop-shadow-md z-10">Dragon</h2>
                 <p className="text-red-400 text-sm font-black z-10 bg-black/50 px-2 rounded mt-1">2x</p>
                 
                 <div className="mt-4 bg-black/40 px-3 py-1 rounded border border-red-500/30 text-white font-mono text-xs z-10 flex items-center">
                    <Users size={10} className="mr-1 text-red-500"/> {bets.DRAGON.toLocaleString()}
                 </div>

                 {myBets.DRAGON > 0 && (
                     <div className="absolute top-2 right-2 bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-bold shadow-lg z-20 animate-pulse">
                         +{myBets.DRAGON}
                     </div>
                 )}
                 <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-20 transition-opacity"></div>
             </div>

             {/* TIE */}
             <div 
                onClick={() => placeBet('TIE')}
                className={`relative flex-1 border-y-2 border-x flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all overflow-hidden group
                    ${winner === 'TIE' ? 'border-green-500 bg-green-900/40 shadow-[0_0_30px_rgba(34,197,94,0.5)]' : 'border-green-600/30 bg-gradient-to-b from-green-900/60 to-black/60'}`}
             >
                 <h2 className="text-green-100 font-black text-xl uppercase drop-shadow-md z-10">Tie</h2>
                 <p className="text-green-400 text-sm font-black z-10 bg-black/50 px-2 rounded mt-1">9x</p>
                 
                 <div className="mt-4 bg-black/40 px-3 py-1 rounded border border-green-500/30 text-white font-mono text-xs z-10 flex items-center">
                    <Users size={10} className="mr-1 text-green-500"/> {bets.TIE.toLocaleString()}
                 </div>

                 {myBets.TIE > 0 && (
                     <div className="absolute top-2 right-2 bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-bold shadow-lg z-20 animate-pulse">
                         +{myBets.TIE}
                     </div>
                 )}
             </div>

             {/* TIGER */}
             <div 
                onClick={() => placeBet('TIGER')}
                className={`relative flex-1 rounded-r-2xl border-2 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all overflow-hidden group
                    ${winner === 'TIGER' ? 'border-yellow-500 bg-yellow-900/40 shadow-[0_0_30px_rgba(234,179,8,0.5)]' : 'border-yellow-600/30 bg-gradient-to-b from-yellow-900/60 to-black/60'}`}
             >
                 <div className="absolute top-0 right-0 w-full h-1 bg-yellow-500/50"></div>
                 <h2 className="text-yellow-100 font-black text-xl uppercase drop-shadow-md z-10">Tiger</h2>
                 <p className="text-yellow-400 text-sm font-black z-10 bg-black/50 px-2 rounded mt-1">2x</p>
                 
                 <div className="mt-4 bg-black/40 px-3 py-1 rounded border border-yellow-500/30 text-white font-mono text-xs z-10 flex items-center">
                    <Users size={10} className="mr-1 text-yellow-500"/> {bets.TIGER.toLocaleString()}
                 </div>

                 {myBets.TIGER > 0 && (
                     <div className="absolute top-2 right-2 bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-bold shadow-lg z-20 animate-pulse">
                         +{myBets.TIGER}
                     </div>
                 )}
                 <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-20 transition-opacity"></div>
             </div>
         </div>

         {/* --- CHIP SELECTOR --- */}
         <div className="w-full px-3 mb-2 z-20">
             <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-2 flex justify-between items-center border border-white/10 shadow-2xl">
                 {CHIPS.map(val => (
                     <button 
                        key={val}
                        onClick={() => setSelectedChip(val)}
                        className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-black text-[10px] sm:text-xs shadow-lg transition-transform ${
                            selectedChip === val ? 'scale-110 ring-2 ring-white z-10 -translate-y-1' : 'scale-100 hover:scale-105 opacity-90'
                        } ${
                            val === 10 ? 'bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white text-white' :
                            val === 50 ? 'bg-gradient-to-br from-green-400 to-green-600 border-2 border-white text-white' :
                            val === 100 ? 'bg-gradient-to-br from-red-400 to-red-600 border-2 border-white text-white' :
                            val === 500 ? 'bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-white text-white' :
                            'bg-gradient-to-br from-yellow-400 to-yellow-600 border-2 border-white text-black'
                        }`}
                     >
                         <div className="absolute inset-0 rounded-full border border-white/30"></div>
                         {val}
                     </button>
                 ))}
             </div>
         </div>

         {gameState !== 'BETTING' && gameState !== 'RESULT' && (
             <div className="absolute inset-x-0 bottom-32 z-40 flex items-center justify-center pointer-events-none">
                 <div className="bg-black/70 px-6 py-2 rounded-full text-white font-bold text-sm uppercase tracking-widest animate-pulse border border-white/20">
                     Stop Betting
                 </div>
             </div>
         )}
      </div>
    </div>
  );
}
