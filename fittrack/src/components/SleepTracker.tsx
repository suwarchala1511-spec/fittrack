import React, { useState } from 'react';
import { SleepRecord } from '../types';
import { Moon, Sun, Clock, Star, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { format, differenceInHours } from 'date-fns';

interface SleepTrackerProps {
  onSleepAdd: (sleep: SleepRecord) => void;
}

export default function SleepTracker({ onSleepAdd }: SleepTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime] = useState('07:00');
  const [quality, setQuality] = useState(8);

  const handleAdd = () => {
    const today = new Date();
    const start = new Date(today.setHours(parseInt(startTime.split(':')[0]), parseInt(startTime.split(':')[1])));
    const end = new Date(today.setHours(parseInt(endTime.split(':')[0]), parseInt(endTime.split(':')[1])));
    if (end < start) end.setDate(end.getDate() + 1);

    onSleepAdd({
      id: Math.random().toString(36).substr(2, 9),
      userId: 'user1',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      quality,
      timestamp: new Date().toISOString(),
    });
    setIsAdding(false);
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-sm p-6 transition-all duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-[var(--text-primary)]">Sleep Tracker</h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="p-2 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/20 transition-colors"
        >
          {isAdding ? <Sun size={20} /> : <Plus size={20} />}
        </button>
      </div>

      {isAdding ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1 block">Bedtime</label>
              <input 
                type="time" 
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg font-bold text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1 block">Wake up</label>
              <input 
                type="time" 
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg font-bold text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1 block">Quality (1-10)</label>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <div className="flex justify-between text-[10px] font-bold text-[var(--text-secondary)] mt-1">
              <span>Poor</span>
              <span className="text-[var(--accent)]">{quality}/10</span>
              <span>Excellent</span>
            </div>
          </div>

          <button 
            onClick={handleAdd}
            className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-bold hover:opacity-90 transition-all"
          >
            Log Sleep
          </button>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Moon size={32} />
          </div>
          <p className="text-2xl font-black text-[var(--text-primary)]">7h 45m</p>
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Average Sleep</p>
          
          <div className="mt-6 grid grid-cols-3 gap-2">
            <div className="p-2 bg-[var(--bg-primary)] rounded-xl">
              <p className="text-xs font-bold text-[var(--text-primary)]">85%</p>
              <p className="text-[8px] font-bold text-[var(--text-secondary)] uppercase">Quality</p>
            </div>
            <div className="p-2 bg-[var(--bg-primary)] rounded-xl">
              <p className="text-xs font-bold text-[var(--text-primary)]">11:00 PM</p>
              <p className="text-[8px] font-bold text-[var(--text-secondary)] uppercase">Bedtime</p>
            </div>
            <div className="p-2 bg-[var(--bg-primary)] rounded-xl">
              <p className="text-xs font-bold text-[var(--text-primary)]">06:45 AM</p>
              <p className="text-[8px] font-bold text-[var(--text-secondary)] uppercase">Wake up</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
