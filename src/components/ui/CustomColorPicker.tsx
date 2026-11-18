/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Pipette } from 'lucide-react';

interface CustomColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  presetColors?: { name: string; value: string }[];
  className?: string;
}

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
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span className="font-medium tracking-wide text-neutral-300">{label}</span>
        <span className="font-mono text-[11px] uppercase text-neutral-400">{value}</span>
      </div>

      {/* Swatches */}
      <div className="grid grid-cols-5 gap-1.5">
        {presetColors.map((col) => {
          const isSelected = value.toLowerCase() === col.value.toLowerCase();
          return (
            <button
              key={col.value}
              type="button"
              onClick={() => onChange(col.value)}
              title={col.name}
              className={`h-6 rounded border transition-all ${
                isSelected
                  ? 'border-white scale-105 shadow-sm shadow-white/20 ring-1 ring-white/50'
                  : 'border-neutral-800 hover:border-neutral-600 hover:scale-102'
              }`}
              style={{ backgroundColor: col.value }}
            />
          );
        })}
      </div>

      {/* Custom Color Input row */}
      <div className="flex items-center gap-2 mt-0.5">
        <div className="relative flex-1 flex items-center bg-neutral-900 border border-neutral-800 rounded-md px-2 py-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent font-mono text-xs text-neutral-200 uppercase focus:outline-none"
            placeholder="#HEX"
          />
        </div>
        <label className="relative flex items-center justify-center w-8 h-8 rounded-md bg-neutral-900 border border-neutral-800 hover:border-neutral-700 cursor-pointer transition-colors overflow-hidden">
          <Pipette className="w-3.5 h-3.5 text-neutral-400" />
          <input
            type="color"
            value={value.startsWith('#') ? value : '#607274'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
      </div>
    </div>
  );
};
