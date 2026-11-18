/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';

interface CustomNumberInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomNumberInput: React.FC<CustomNumberInputProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 10000,
  step = 1,
  unit = 'cm',
  className = '',
  disabled = false,
}) => {
  const [internalVal, setInternalVal] = useState(value.toString());
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startValRef = useRef(value);

  useEffect(() => {
    setInternalVal(Math.round(value * 10) / 10 + '');
  }, [value]);

  const handleCommit = (str: string) => {
    let num = parseFloat(str);
    if (isNaN(num)) num = value;
    num = Math.max(min, Math.min(max, num));
    num = Math.round(num * 10) / 10;
    setInternalVal(num.toString());
    onChange(num);
  };

  const handleStep = (delta: number) => {
    if (disabled) return;
    const newVal = Math.max(min, Math.min(max, Math.round((value + delta * step) * 10) / 10));
    setInternalVal(newVal.toString());
    onChange(newVal);
  };

  // Drag scrubber on the label
  const handleLabelMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startValRef.current = value;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvent.clientX - startXRef.current;
      const multiplier = moveEvent.shiftKey ? 0.2 : moveEvent.altKey ? 5 : 1;
      const change = Math.round(dx * step * multiplier * 0.5);
      const computed = Math.max(min, Math.min(max, startValRef.current + change));
      onChange(computed);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <label
          onMouseDown={handleLabelMouseDown}
          title="Trascina orizzontalmente per regolare"
          className="font-medium tracking-wide text-neutral-300 cursor-ew-resize select-none hover:text-white transition-colors"
        >
          {label}
        </label>
        {unit && <span className="text-[11px] font-mono text-neutral-500">{unit}</span>}
      </div>

      <div className="relative flex items-center bg-neutral-900 border border-neutral-800 rounded-md focus-within:border-neutral-500 transition-colors">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          disabled={disabled || value <= min}
          className="flex items-center justify-center w-7 h-8 text-neutral-400 hover:text-white hover:bg-neutral-800/80 active:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent rounded-l-md transition-colors"
          title="Diminuisci"
        >
          <Minus className="w-3 h-3" />
        </button>

        <input
          type="number"
          value={internalVal}
          onChange={(e) => setInternalVal(e.target.value)}
          onBlur={(e) => handleCommit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCommit(internalVal);
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              handleStep(1);
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              handleStep(-1);
            }
          }}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className="w-full h-8 bg-transparent text-center font-mono text-xs font-semibold text-neutral-100 focus:outline-none select-text"
        />

        <button
          type="button"
          onClick={() => handleStep(1)}
          disabled={disabled || value >= max}
          className="flex items-center justify-center w-7 h-8 text-neutral-400 hover:text-white hover:bg-neutral-800/80 active:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent rounded-r-md transition-colors"
          title="Aumenta"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
