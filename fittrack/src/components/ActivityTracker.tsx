import React, { useState, useEffect, useRef } from 'react';
import { Activity, ActivityType } from '../types';
import { Play, Pause, Square, MapPin, Zap, Timer, TrendingUp, Plus, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ActivityTrackerProps {
  onActivityComplete: (activity: Activity) => void;
}

export default function ActivityTracker({ onActivityComplete }: ActivityTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [type, setType] = useState<ActivityType>('walking');
  const [duration, setDuration] = useState(0); // seconds for timer, minutes for manual
  const [distance, setDistance] = useState(0); // km
  const [calories, setCalories] = useState(0);
  const [path, setPath] = useState<{ lat: number; lng: number }[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTracking = () => {
    setIsTracking(true);
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
      // Simulate distance and calories
      setDistance(prev => prev + (type === 'running' ? 0.003 : type === 'cycling' ? 0.006 : 0.0015));
      setCalories(prev => prev + (type === 'running' ? 0.15 : type === 'cycling' ? 0.12 : 0.05));
    }, 1000);

    // Try to get geolocation if available
    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition((position) => {
        setPath(prev => [...prev, { lat: position.coords.latitude, lng: position.coords.longitude }]);
      });
    }
  };

  const stopTracking = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsTracking(false);
    
    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      userId: 'user1',
      type,
      duration: Math.round(duration / 60),
      distance: parseFloat(distance.toFixed(2)),
      calories: Math.round(calories),
      timestamp: new Date().toISOString(),
    };
    
    onActivityComplete(newActivity);
    setDuration(0);
    setDistance(0);
    setCalories(0);
    setPath([]);
  };

  const handleManualSubmit = () => {
    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      userId: 'user1',
      type,
      duration: duration, // duration is in minutes for manual
      distance: parseFloat(distance.toFixed(2)),
      calories: Math.round(calories),
      timestamp: new Date().toISOString(),
    };
    
    onActivityComplete(newActivity);
    setDuration(0);
    setDistance(0);
    setCalories(0);
    setIsManual(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-sm p-6 transition-all duration-300">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-[var(--text-primary)]">Activity Tracker</h3>
          <button 
            onClick={() => {
              if (!isTracking) {
                setIsManual(!isManual);
                setDuration(0);
                setDistance(0);
                setCalories(0);
              }
            }}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              isManual ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
            )}
            title={isManual ? "Switch to Timer" : "Switch to Manual Log"}
          >
            {isManual ? <Timer size={16} /> : <History size={16} />}
          </button>
        </div>
        <div className="flex gap-2">
          {(['walking', 'running', 'cycling'] as ActivityType[]).map((t) => (
            <button
              key={t}
              disabled={isTracking}
              onClick={() => setType(t)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all",
                type === t ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {isManual ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1 block">Duration (min)</label>
              <input 
                type="number" 
                value={duration || ''}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1 block">Distance (km)</label>
              <input 
                type="number" 
                step="0.1"
                value={distance || ''}
                onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
                placeholder="0.0"
                className="w-full p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1 block">Calories (kcal)</label>
              <input 
                type="number" 
                value={calories || ''}
                onChange={(e) => setCalories(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </div>
          <button 
            onClick={handleManualSubmit}
            disabled={!duration}
            className="w-full py-4 bg-[var(--accent)] text-white rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
          >
            Log Activity
          </button>
        </div>
      ) : (
        <>
          <div className="relative h-48 bg-[var(--bg-primary)] rounded-xl mb-6 flex flex-col items-center justify-center overflow-hidden">
            {/* Animated Background for Tracking */}
            {isTracking && (
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-[var(--accent)] rounded-full blur-3xl opacity-20"
              />
            )}
            
            <div className="relative z-10 text-center">
              <p className="text-4xl font-black text-[var(--text-primary)] font-mono mb-1">{formatTime(duration)}</p>
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Duration</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-[var(--bg-primary)] p-4 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2 text-[var(--accent)] mb-1">
                <TrendingUp size={16} />
                <span className="text-lg font-black">{distance.toFixed(2)}</span>
              </div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Distance (km)</p>
            </div>
            <div className="bg-[var(--bg-primary)] p-4 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2 text-orange-500 mb-1">
                <Zap size={16} />
                <span className="text-lg font-black">{Math.round(calories)}</span>
              </div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Calories (kcal)</p>
            </div>
          </div>

          <div className="flex gap-3">
            {!isTracking ? (
              <button 
                onClick={startTracking}
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent)] text-white py-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-indigo-200"
              >
                <Play size={20} fill="currentColor" />
                Start Session
              </button>
            ) : (
              <>
                <button 
                  onClick={() => setIsTracking(false)}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white py-4 rounded-xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-200"
                >
                  <Pause size={20} fill="currentColor" />
                  Pause
                </button>
                <button 
                  onClick={stopTracking}
                  className="flex-1 flex items-center justify-center gap-2 bg-rose-500 text-white py-4 rounded-xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
                >
                  <Square size={20} fill="currentColor" />
                  Finish
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
