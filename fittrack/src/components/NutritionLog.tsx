import React, { useState } from 'react';
import { FoodIntake } from '../types';
import { Utensils, Plus, Search, X, Flame, Beef, Wheat, Droplet, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { analyzeNutrition } from '../lib/gemini';

interface NutritionLogProps {
  onFoodAdd: (food: FoodIntake) => void;
}

export default function NutritionLog({ onFoodAdd }: NutritionLogProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [foodInput, setFoodInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedResult, setAnalyzedResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!foodInput.trim()) return;
    setIsAnalyzing(true);
    setAnalyzedResult(null);
    try {
      const result = await analyzeNutrition(foodInput);
      if (result) {
        setAnalyzedResult(result);
      } else {
        alert("AI couldn't identify any food in your description. Please try again with more details.");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      alert("Something went wrong during analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAdd = () => {
    if (!analyzedResult) return;
    onFoodAdd({
      id: Math.random().toString(36).substr(2, 9),
      userId: 'user1', // This should ideally come from auth context
      name: analyzedResult.name,
      calories: analyzedResult.calories,
      protein: analyzedResult.protein,
      carbs: analyzedResult.carbs,
      fat: analyzedResult.fat,
      timestamp: new Date().toISOString(),
    });
    setFoodInput('');
    setAnalyzedResult(null);
    setIsAdding(false);
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-sm p-6 transition-all duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-[var(--text-primary)]">Nutrition Log</h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={cn(
            "p-2 rounded-lg transition-colors",
            isAdding ? "bg-rose-500/10 text-rose-500" : "bg-[var(--accent)]/10 text-[var(--accent)]"
          )}
        >
          {isAdding ? <X size={20} /> : <Plus size={20} />}
        </button>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-[var(--bg-primary)] p-4 rounded-xl mb-4 border border-[var(--border)]">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Describe what you ate</p>
                <div className="relative mb-4">
                  <textarea 
                    placeholder="e.g., A bowl of chicken biryani with raita, or 2 slices of avocado toast..."
                    className="w-full p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none min-h-[100px] text-sm resize-none text-[var(--text-primary)]"
                    value={foodInput}
                    onChange={(e) => setFoodInput(e.target.value)}
                  />
                </div>

                {!analyzedResult ? (
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !foodInput.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--accent)] text-white rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-100"
                  >
                    {isAnalyzing ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Sparkles size={18} />
                    )}
                    {isAnalyzing ? "AI Analyzing..." : "Analyze with AI"}
                  </button>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--accent)]/20 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest">AI Result</p>
                        <h4 className="font-bold text-[var(--text-primary)]">{analyzedResult.name}</h4>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-[var(--text-primary)]">{analyzedResult.calories}</p>
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">kcal</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-[var(--bg-primary)] p-2 rounded-lg text-center">
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Pro</p>
                        <p className="text-sm font-bold text-[var(--text-primary)]">{analyzedResult.protein}g</p>
                      </div>
                      <div className="bg-[var(--bg-primary)] p-2 rounded-lg text-center">
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Carb</p>
                        <p className="text-sm font-bold text-[var(--text-primary)]">{analyzedResult.carbs}g</p>
                      </div>
                      <div className="bg-[var(--bg-primary)] p-2 rounded-lg text-center">
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Fat</p>
                        <p className="text-sm font-bold text-[var(--text-primary)]">{analyzedResult.fat}g</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => setAnalyzedResult(null)}
                        className="flex-1 py-2 bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-lg font-bold text-xs hover:bg-[var(--border)] transition-all"
                      >
                        Try Again
                      </button>
                      <button 
                        onClick={handleConfirmAdd}
                        className="flex-1 py-2 bg-[var(--success)] text-white rounded-lg font-bold text-xs hover:opacity-90 transition-all"
                      >
                        Confirm & Add
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nutrition Summary */}
        <div className="grid grid-cols-4 gap-2">
          <NutrientStat label="Cal" value="1,240" icon={<Flame size={14} />} color="orange" />
          <NutrientStat label="Pro" value="85g" icon={<Beef size={14} />} color="rose" />
          <NutrientStat label="Carb" value="120g" icon={<Wheat size={14} />} color="amber" />
          <NutrientStat label="Fat" value="45g" icon={<Droplet size={14} />} color="blue" />
        </div>
      </div>
    </div>
  );
}

function NutrientStat({ label, value, icon, color }: any) {
  const colors: any = {
    orange: "bg-orange-500/10 text-orange-500",
    rose: "bg-rose-500/10 text-rose-500",
    amber: "bg-amber-500/10 text-amber-500",
    blue: "bg-blue-500/10 text-blue-500",
  };

  return (
    <div className="bg-[var(--bg-primary)] p-2 rounded-xl text-center border border-[var(--border)]">
      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center mx-auto mb-1", colors[color])}>
        {icon}
      </div>
      <p className="text-[10px] font-black text-[var(--text-primary)]">{value}</p>
      <p className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-tighter">{label}</p>
    </div>
  );
}
