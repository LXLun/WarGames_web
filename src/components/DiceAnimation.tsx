import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTokenStore } from '../stores/useTokenStore';

interface DiceShapeProps {
    sides: number;
    value: number;
}
  
const DiceShape: React.FC<DiceShapeProps> = ({ sides, value }) => {
  // Use Tailwind CSS for shape and gradients to create a realistic look
  // Common base: 16x16 (4rem), centered text, mono font for numbers
  const baseSize = "w-16 h-16";
  const commonFlex = "flex items-center justify-center relative";
  const textStyle = "text-2xl font-black text-white z-10 font-mono drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]";
  
  // We use a wrapper for the filter drop-shadow to apply to the clipped shape
  const wrapperClass = "filter drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)] transition-transform";
  
  let innerClass = `${baseSize} ${commonFlex} overflow-hidden`;
  let clipPathStyle: React.CSSProperties = {};
  let gradientClass = "";
  
  // Inner highlights to simulate 3D edges
  let innerElements = (
      <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
  );

  if (sides === 4) {
    // D4: Triangle with bottom heavy
    innerClass += " pb-3"; 
    gradientClass = "bg-gradient-to-br from-red-500 via-red-600 to-red-800";
    clipPathStyle = { clipPath: "polygon(50% 0%, 0% 85%, 100% 85%)" };
    innerElements = (
        <>
            <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-white/30 to-transparent opacity-60" style={{ clipPath: "polygon(50% 0%, 0% 85%, 100% 85%)" }} />
            {/* Edge Highlight */}
            <div className="absolute inset-0 border-b-8 border-black/10" style={{ clipPath: "polygon(50% 0%, 0% 85%, 100% 85%)" }}></div>
        </>
    );
  } else if (sides === 6) {
    // D6: Rounded Cube
    innerClass += " rounded-2xl border-[1px] border-white/20 shadow-[inset_0_2px_10px_rgba(255,255,255,0.3),inset_0_-5px_10px_rgba(0,0,0,0.2)]";
    gradientClass = "bg-gradient-to-br from-blue-400 via-blue-600 to-indigo-800";
    // Beveled look
    innerElements = (
        <>
             <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-black/20 pointer-events-none" />
             <div className="absolute top-1 left-1 right-1 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl" />
        </>
    );
  } else if (sides === 8) {
    // D8: Diamond / Octahedron
    gradientClass = "bg-gradient-to-b from-emerald-400 via-emerald-600 to-green-800";
    clipPathStyle = { clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" };
    innerElements = (
        <>
            <div className="absolute w-full h-[1px] bg-white/30 top-1/2 -translate-y-1/2" />
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
        </>
    );
  } else if (sides === 10 || sides === 100) {
    // D10: Kite shape
    gradientClass = "bg-gradient-to-br from-purple-400 via-purple-600 to-fuchsia-800";
    // Kite shape: Top point, Right mid, Bottom point, Left mid
    clipPathStyle = { clipPath: "polygon(50% 0%, 100% 35%, 50% 100%, 0% 35%)" };
    innerElements = (
        <>
           <div className="absolute w-[1px] h-full bg-white/20 left-1/2 -translate-x-1/2" />
           <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/20" />
        </>
    );
  } else if (sides === 12) {
      // D12: Pentagon (approximated as a nice heavy polygon)
      gradientClass = "bg-gradient-to-br from-orange-400 via-orange-600 to-red-600";
      clipPathStyle = { clipPath: "polygon(50% 0%, 95% 38%, 82% 100%, 18% 100%, 5% 38%)" }; // Pentagon
      innerElements = (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent_60%)]" />
      );
  } else {
    // D20: Hexagon (flat projection of Icosahedron)
    // Actually typically handled as a Hexagon
    gradientClass = "bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-700";
    clipPathStyle = { clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" };
    innerElements = (
        <>
            {/* Internal Triangle lines to simulate faces of D20 */}
            <div className="absolute inset-0" 
                 style={{ 
                     background: `
                        linear-gradient(30deg, transparent 49%, rgba(255,255,255,0.3) 50%, transparent 51%),
                        linear-gradient(150deg, transparent 49%, rgba(255,255,255,0.3) 50%, transparent 51%),
                        linear-gradient(90deg, transparent 49%, rgba(255,255,255,0.3) 50%, transparent 51%)
                     `,
                     opacity: 0.6
                 }} 
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4),transparent_60%)]" />
        </>
    );
  }

  return (
    <div className={wrapperClass}>
        <div 
            className={`${innerClass} ${gradientClass}`}
            style={clipPathStyle}
        >
        {innerElements}
        <span className={textStyle}>{value}</span>
        </div>
    </div>
  );
};

const DiceAnimation: React.FC = () => {
    const currentRoll = useTokenStore((state) => state.currentRoll);
    const [isVisible, setIsVisible] = useState(false);
    const [animationKey, setAnimationKey] = useState(0);

    // Generate random positions when animation key changes
    const diceConfig = useMemo(() => {
        if (!currentRoll) return [];
        return currentRoll.results.map(() => ({
            // Random offset within 100px (reduced from 150)
            x: (Math.random() - 0.5) * 100, 
            y: (Math.random() - 0.5) * 100,
            // Random rotation tilt
            rotate: (Math.random() - 0.5) * 60 
        }));
    }, [animationKey, currentRoll]); // Regenerate only on new roll

    // Watch for new rolls
    useEffect(() => {
        if (currentRoll) {
            setIsVisible(true);
            setAnimationKey(prev => prev + 1); // Force re-render of animation
            
            // Auto hide after 2.5s (0.5s into, 2s persist)
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 2500);
            
            return () => clearTimeout(timer);
        }
    }, [currentRoll]);

    return (
        <AnimatePresence mode="wait">
            {isVisible && currentRoll && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
                    {/* 透明动画层，直接在地图上 */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative w-full h-full flex items-center justify-center"
                    >
                        <div className="relative flex items-center justify-center">
                            {currentRoll.results.map((result, index) => {
                                const config = diceConfig[index] || { x: 0, y: 0, rotate: 0 };
                                return (
                                    <motion.div
                                        key={`${animationKey}-${index}`}
                                        className="absolute text-center drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
                                        initial={{ 
                                            y: 300, 
                                            x: config.x * 2, // 稍微扩大一点让骰子自然分布
                                            opacity: 0, 
                                            rotate: 0, 
                                            scale: 0.5 
                                        }}
                                        animate={{ 
                                            y: config.y, 
                                            x: config.x,
                                            opacity: 1, 
                                            rotate: 720 + config.rotate,
                                            scale: [0.5, 1.2, 1],
                                        }}
                                        exit={{ 
                                            scale: 0.8, 
                                            opacity: 0, 
                                            y: -50,
                                            transition: { duration: 0.3 } 
                                        }}
                                        transition={{
                                            duration: 0.8,
                                        type: "spring",
                                        stiffness: 200,
                                        damping: 18,
                                        delay: index * 0.08
                                    }}
                                >
                                    <motion.div
                                        animate={{
                                            x: [0, -3, 3, -3, 3, 0],
                                            y: [0, -3, 3, -3, 3, 0], 
                                        }}
                                        transition={{
                                            delay: 0.8 + (index * 0.08),
                                            duration: 0.3,
                                        }}
                                    >
                                        <DiceShape sides={currentRoll.sides} value={result} />
                                    </motion.div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>
        )}
        </AnimatePresence>
    );
};

export default DiceAnimation;