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
    <div className="border-t border-gray-700 pt-4 space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex justify-between items-center">
        <span>🎲 投骰子</span>
        <div className="flex items-center bg-gray-800 rounded px-1 border border-gray-700">
           <button 
             onClick={() => setDiceCount(Math.max(1, diceCount - 1))}
             className="text-gray-400 hover:text-white px-2 focus:outline-none"
           >
             -
           </button>
           <span className="text-xs font-mono w-6 text-center text-gray-200 select-none">
             {diceCount}
           </span>
           <button 
             onClick={() => setDiceCount(Math.min(20, diceCount + 1))}
             className="text-gray-400 hover:text-white px-2 focus:outline-none"
           >
             +
           </button>
        </div>
      </h2>

      {/* Wrapper to protect grid layout */}
      <div className="grid grid-cols-4 gap-2">
        {DICE_TYPES.map((sides) => (
          <button
            key={sides}
            onClick={() => handleRoll(sides)}
            disabled={rollingSide !== null}
            className={`flex items-center justify-center text-xs font-bold py-2 rounded border transition-all select-none
                ${rollingSide === sides 
                    ? 'bg-yellow-600 text-white border-yellow-400 animate-pulse scale-95' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-600 active:scale-95 active:bg-blue-900 active:border-blue-500'
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
         <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 text-center relative overflow-hidden mt-2 min-h-[80px] flex flex-col justify-center">
            {/* Background flashy effect for animation could go here */}
            {rollingSide ? (
                <div className="text-sm text-yellow-500 animate-bounce">
                    准备投掷...
                </div>
            ) : isAnimatingResult ? (
                <div className="text-3xl font-bold text-yellow-500 font-mono animate-pulse">
                    {displayTotal}
                </div>
            ) : (
                <>
                    <div className="text-3xl font-bold text-green-400 font-mono">
                        {displayTotal}
                    </div>
                    {/* Detail breakdown if multiple dice */}
                    {currentRoll && currentRoll.count > 1 && (
                        <div className="text-[10px] text-gray-500 mt-1 font-mono break-all leading-tight">
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
