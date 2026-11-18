/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Pipette, Check } from 'lucide-react';

interface CustomColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  presetColors?: { name: string; value: string }[];
  className?: string;
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const isLight = (hex: string) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
};

export const CustomColorPicker: React.FC<CustomColorPickerProps> = ({
  label,
  value,
  onChange,
  presetColors = [
    { name: 'Nero Grafite', value: '#18181b' },
    { name: 'Antracite', value: '#3f3f46' },
    { name: 'Bianco Caldo', value: '#f5f5f0' },
    { name: 'Rovere Caldo', value: '#b08968' },
    { name: 'Noce Scuro', value: '#7f5539' },
    { name: 'Grigio Ardesia', value: '#607274' },
    { name: 'Blu Petrolio', value: '#3e5c76' },
    { name: 'Verde Salvia', value: '#617a69' },
    { name: 'Terracotta', value: '#bf6b63' },
    { name: 'Senape Dorato', value: '#d4af37' },
  ],
  className = '',
}) => {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  const commitText = (t: string) => {
    const v = t.startsWith('#') ? t : `#${t}`;
    if (HEX_RE.test(v)) onChange(v.toLowerCase());
    else setText(value);
  };

  const selectedPreset = presetColors.find((c) => c.value.toLowerCase() === value.toLowerCase());

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="field-label">{label}</span>
        <span className="text-[11px] text-ink-500">{selectedPreset?.name || 'Personalizzato'}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {presetColors.map((col) => {
          const isSelected = value.toLowerCase() === col.value.toLowerCase();
          return (
            <button
              key={col.value}
              type="button"
              onClick={() => onChange(col.value)}
              title={col.name}
              aria-label={col.name}
              aria-pressed={isSelected}
              className={`relative w-7 h-7 rounded-full transition-transform hover:scale-110 ring-offset-2 ring-offset-ink-900 ${
                isSelected ? 'ring-2 ring-brass-400' : 'ring-1 ring-white/10'
              }`}
              style={{ backgroundColor: col.value }}
            >
              {isSelected && (
                <Check
                  className={`absolute inset-0 m-auto w-3.5 h-3.5 ${isLight(col.value) ? 'text-black/70' : 'text-white'}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <label
          className="relative w-[2.1rem] h-[2.1rem] shrink-0 rounded-[0.55rem] cursor-pointer overflow-hidden ring-1 ring-white/10 flex items-center justify-center"
          style={{ backgroundColor: HEX_RE.test(value) ? value : '#607274' }}
          title="Scegli un colore personalizzato"
        >
          <Pipette className={`w-3.5 h-3.5 ${HEX_RE.test(value) && isLight(value) ? 'text-black/60' : 'text-white/80'}`} />
          <input
            type="color"
            value={HEX_RE.test(value) && value.length === 7 ? value : '#607274'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            aria-label={`${label}: colore personalizzato`}
          />
        </label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commitText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && commitText(text)}
          className="field font-mono uppercase"
          placeholder="#HEX"
          aria-label={`${label}: codice esadecimale`}
        />
      </div>
    </div>
  );
};
