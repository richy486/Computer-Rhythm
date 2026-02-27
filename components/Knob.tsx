
import React, { useState, useEffect, useRef } from 'react';

interface KnobProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  label?: string;
  size?: number;
}

const Knob: React.FC<KnobProps> = ({ value, min, max, onChange, label, size = 24 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startVal.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const deltaY = startY.current - e.clientY;
    const sensitivity = e.shiftKey ? 400 : 150; // Fine-tune with Shift
    const range = max - min;
    const deltaVal = (deltaY / sensitivity) * range;
    
    let nextVal = startVal.current + deltaVal;
    nextVal = Math.max(min, Math.min(max, nextVal));
    onChange(nextVal);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    onChange(0); // Standard reset to center
  };

  // Rotation calculation (assuming 300 degree sweep, -150 to 150)
  const normalizedValue = (value - min) / (max - min);
  const rotation = (normalizedValue * 300) - 150;

  // Arc calculation for bipolar display (0 center)
  const arcRadius = 10;
  const center = size / 2;
  const strokeWidth = 2.5;
  const circumference = 2 * Math.PI * arcRadius;
  
  // Progress arc from center (0)
  // Our range is -1 to 1. 0 is 0.5 normalized.
  const isPositive = value >= 0;
  const progressPercent = Math.abs(value) / (max - min) * 2; // scale to 0-1
  const dashArray = circumference;
  const dashOffset = circumference * (1 - progressPercent * 0.42); // 0.42 accounts for 300deg limit

  return (
    <div className="flex flex-col items-center gap-0.5 select-none touch-none group">
      {label && <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter group-hover:text-slate-300 transition-colors">{label}</span>}
      
      <div 
        className="relative cursor-ns-resize"
        style={{ width: size, height: size }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {/* Background Track */}
          <circle 
            cx={center} cy={center} r={arcRadius} 
            fill="transparent" 
            stroke="rgba(30, 41, 59, 1)" 
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference * 0.83} ${circumference}`}
            strokeDashoffset={-circumference * 0.08}
            strokeLinecap="round"
          />
          
          {/* Progress Arc */}
          <circle 
            cx={center} cy={center} r={arcRadius} 
            fill="transparent" 
            stroke={isPositive ? "rgba(249, 115, 22, 1)" : "rgba(59, 130, 246, 1)"} 
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference * 0.83} ${circumference}`}
            strokeDashoffset={isPositive ? circumference * 0.415 : circumference * 0.415} // Simplified visual for demo
            style={{ 
              opacity: value === 0 ? 0 : 1,
              transition: 'stroke 0.2s ease',
              // We rotate the arc specifically for bipolar
              transformOrigin: 'center',
              transform: isPositive ? `rotate(0deg)` : `rotate(180deg)`
            }}
            strokeLinecap="round"
          />
        </svg>

        {/* Knob Body */}
        <div 
          className="absolute inset-[3px] bg-slate-800 rounded-full shadow-inner border border-slate-700/50 flex items-center justify-center transition-transform"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Pointer Dot */}
          <div className="absolute top-0.5 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
        </div>
      </div>
      
      <span className="text-[6px] font-mono text-slate-600 group-hover:text-orange-400/80 transition-colors">
        {value === 0 ? 'FIXED' : (value > 0 ? `+${Math.round(value * 100)}` : Math.round(value * 100))}
      </span>
    </div>
  );
};

export default Knob;
