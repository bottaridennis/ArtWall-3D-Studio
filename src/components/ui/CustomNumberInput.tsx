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
  hint?: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

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
  hint,
}) => {
  const [internalVal, setInternalVal] = useState(String(round1(value)));
  const [focused, setFocused] = useState(false);
  const startXRef = useRef(0);
  const startValRef = useRef(value);

  useEffect(() => {
    if (!focused) setInternalVal(String(round1(value)));
  }, [value, focused]);

  const clampV = (n: number) => Math.max(min, Math.min(max, n));

  const handleCommit = (str: string) => {
    let num = parseFloat(str.replace(',', '.'));
    if (isNaN(num)) num = value;
    num = round1(clampV(num));
    setInternalVal(String(num));
    if (num !== value) onChange(num);
  };

  const handleStep = (delta: number) => {
    if (disabled) return;
    const newVal = round1(clampV(value + delta * step));
    setInternalVal(String(newVal));
    onChange(newVal);
  };

  // Drag scrubber on the label (pointer events: works with mouse, pen and touch)
  const handleLabelPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    startXRef.current = e.clientX;
    startValRef.current = value;
    document.body.style.cursor = 'ew-resize';

    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startXRef.current;
      const multiplier = ev.shiftKey ? 0.2 : ev.altKey ? 5 : 1;
      const change = Math.round((dx * step * multiplier) / 2);
      onChange(round1(clampV(startValRef.current + change)));
    };
    const handleUp = () => {
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  return (
    <div className={`flex flex-col gap-1.5 min-w-0 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <label
          onPointerDown={handleLabelPointerDown}
          title="Trascina orizzontalmente per regolare (Shift = fine, Alt = rapido)"
          className="field-label truncate cursor-ew-resize select-none hover:text-ink-100 transition-colors touch-none"
        >
          {label}
        </label>
        {hint && <span className="text-[10.5px] text-ink-500 truncate">{hint}</span>}
      </div>

      <div
        className={`group relative flex items-center h-[2.1rem] rounded-[0.55rem] bg-ink-950 border transition-colors ${
          focused ? 'border-brass-500/70 ring-3 ring-brass-500/12' : 'border-white/8 hover:border-white/14'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <button
          type="button"
          tabIndex={-1}
          onClick={() => handleStep(-1)}
          disabled={disabled || value <= min}
          className="flex items-center justify-center w-7 h-full text-ink-400 hover:text-ink-100 disabled:opacity-25 transition-colors"
          aria-label={`Diminuisci ${label}`}
        >
          <Minus className="w-3 h-3" />
        </button>

        <input
          type="text"
          inputMode="decimal"
          value={internalVal}
          onFocus={(e) => {
            setFocused(true);
            e.target.select();
          }}
          onChange={(e) => setInternalVal(e.target.value)}
          onBlur={(e) => {
            setFocused(false);
            handleCommit(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCommit(internalVal);
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              handleStep(e.shiftKey ? 10 : 1);
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              handleStep(e.shiftKey ? -10 : -1);
            }
          }}
          disabled={disabled}
          aria-label={label}
          className="flex-1 min-w-0 h-full bg-transparent text-center font-mono text-[12.5px] font-medium text-ink-100 focus:outline-none"
        />
        {unit && <span className="pointer-events-none text-[10.5px] font-mono text-ink-500 -ml-1 mr-0.5">{unit}</span>}

        <button
          type="button"
          tabIndex={-1}
          onClick={() => handleStep(1)}
          disabled={disabled || value >= max}
          className="flex items-center justify-center w-7 h-full text-ink-400 hover:text-ink-100 disabled:opacity-25 transition-colors"
          aria-label={`Aumenta ${label}`}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
