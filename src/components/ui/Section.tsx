/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const Section: React.FC<{
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, action, children, className = '' }) => (
  <section className={`flex flex-col gap-3 ${className}`}>
    <div className="flex items-center justify-between gap-2 min-h-5">
      <h3 className="eyebrow">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

export const Divider: React.FC = () => <div className="h-px bg-white/6 -mx-4" />;

export const Switch: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
    <span className="text-[12.5px] font-medium text-ink-100">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-brass-500' : 'bg-ink-700'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : ''
        }`}
      />
    </button>
  </label>
);

export const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-[12px]">
    <span className="text-ink-400">{label}</span>
    <span className="font-mono text-ink-100">{value}</span>
  </div>
);

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }> = ({
  icon,
  title,
  text,
  action,
}) => (
  <div className="flex flex-col items-center text-center gap-2 py-6 px-3 rounded-xl border border-dashed border-white/10">
    <div className="w-9 h-9 rounded-full bg-ink-800 text-ink-400 flex items-center justify-center">{icon}</div>
    <p className="text-[13px] font-semibold text-ink-100">{title}</p>
    <p className="text-[12px] text-ink-400 leading-relaxed">{text}</p>
    {action && <div className="mt-1">{action}</div>}
  </div>
);
