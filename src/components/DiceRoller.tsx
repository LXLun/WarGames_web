import React, { useState, useEffect, useRef } from 'react';
import { useTokenStore, DiceRoll } from '../stores/useTokenStore';

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];

const DiceRoller: React.FC = () => {
  const currentRoll = useTokenStore((state) => state.currentRoll);
  const rollDice = useTokenStore((state) => state.rollDice);
  
  const [diceCount, setDiceCount] = useState(1);
  const [displayTotal, setDisplayTotal] = useState<number | null>(null);
  const [isAnimatingResult, setIsAnimatingResult] = useState(false);
  const [rollingSide, setRollingSide] = useState<number | null>(null); // To show which button is active
  
  // Track previous roll to detect changes
  const prevRollRef = useRef<DiceRoll | null>(null);

  useEffect(() => {
    if (!currentRoll) {
      setDisplayTotal(null);
      setIsAnimatingResult(false);
      prevRollRef.current = null;
      return;
    }

    // Only animate if it's a new roll (different object reference or different timestamp-like ID if we had one)
    // Since we create a new object in store every roll, reference check is enough.
    if (currentRoll !== prevRollRef.current) {
        setIsAnimatingResult(true);
        let elapsed = 0;
        const duration = 1200; // Longer duration to match full animation (500 delay + ~700 animation)
        const intervalTime = 50;

        const maxVal = currentRoll.sides * currentRoll.count;

        const interval = setInterval(() => {
            elapsed += intervalTime;
            // Show random number during animation
            setDisplayTotal(Math.floor(Math.random() * maxVal) + 1);

            if (elapsed >= duration) {
                clearInterval(interval);
                setDisplayTotal(currentRoll.total);
                setIsAnimatingResult(false);
            }
        }, intervalTime);

        prevRollRef.current = currentRoll;
        return () => clearInterval(interval);
    }
  }, [currentRoll]);

  const handleRoll = (sides: number) => {
    // 1. Set preparing state
    setRollingSide(sides);
    
    // 2. Clear old result immediately to feel fresh
    setDisplayTotal(null); 

    // 3. Delay the actual roll to sync with animation start
    setTimeout(() => {
        rollDice(sides, diceCount);
        setRollingSide(null);
    }, 500);
  };

  return (
    <div className="bg-gray-900/60 backdrop-blur-md border border-gray-600/50 rounded-xl shadow-2xl p-3 w-56 flex flex-col gap-3 transition-all hover:bg-gray-900/80">
      <div className="flex justify-between items-center border-b border-gray-700/50 pb-2 mb-1">
        <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1">
            <span>🎲</span> 骰子控制
        </h2>
        <div className="flex items-center bg-black/40 rounded-lg px-1 border border-white/5">
           <button 
             onClick={() => setDiceCount(Math.max(1, diceCount - 1))}
             className="text-gray-400 hover:text-white px-2 py-0.5 focus:outline-none transition-colors"
           >
             -
           </button>
           <span className="text-xs font-mono w-6 text-center text-yellow-500 font-bold select-none">
             {diceCount}
           </span>
           <button 
             onClick={() => setDiceCount(Math.min(20, diceCount + 1))}
             className="text-gray-400 hover:text-white px-2 py-0.5 focus:outline-none transition-colors"
           >
             +
           </button>
        </div>
      </div>

      {/* Wrapper to protect grid layout */}
      <div className="grid grid-cols-4 gap-1.5">
        {DICE_TYPES.map((sides) => (
          <button
            key={sides}
            onClick={() => handleRoll(sides)}
            disabled={rollingSide !== null}
            className={`flex items-center justify-center text-[10px] font-bold py-1.5 rounded border transition-all select-none
                ${rollingSide === sides 
                    ? 'bg-yellow-600 text-white border-yellow-400 animate-pulse scale-95 shadow-[0_0_10px_rgba(234,179,8,0.5)]' 
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/10 active:scale-95'
                }
            `}
            title={`Roll ${diceCount}d${sides}`}
          >
            D{sides}
          </button>
        ))}
      </div>

      {/* Result Display */}
      {(currentRoll || rollingSide) && (
         <div className="bg-black/40 rounded-lg p-1 border border-white/5 text-center relative overflow-hidden min-h-[48px] flex flex-col justify-center shadow-inner">
            {/* Background flashy effect for animation could go here */}
            {rollingSide ? (
                <div className="text-xs text-yellow-500 animate-bounce">
                    准备投掷...
                </div>
            ) : isAnimatingResult ? (
                <div className="text-xl font-bold text-yellow-500 font-mono animate-pulse">
                    {displayTotal}
                </div>
            ) : (
                <>
                    <div className="text-xl font-bold text-green-400 font-mono leading-none">
                        {displayTotal}
                    </div>
                    {/* Detail breakdown if multiple dice */}
                    {currentRoll && currentRoll.count > 1 && (
                        <div className="text-[8px] text-gray-500 mt-0.5 font-mono break-all leading-tight">
                             {diceCount}D{currentRoll.sides}: {currentRoll.results.join(', ')}
                        </div>
                    )}
                </>
            )}
         </div>
      )}
    </div>
  );
};

export default DiceRoller;
