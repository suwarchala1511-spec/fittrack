import React from 'react';
import { Activity, FoodIntake, SleepRecord, Goal } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { cn } from '../lib/utils';
import { TrendingUp, TrendingDown, Minus, Activity as ActivityIcon, Utensils, Moon } from 'lucide-react';

interface ReportsProps {
  activities: Activity[];
  food: FoodIntake[];
  sleep: SleepRecord[];
  goals: Goal[];
}

export default function Reports({ activities, food, sleep, goals }: ReportsProps) {
  const [timeframe, setTimeframe] = React.useState<'Weekly' | 'Monthly'>('Weekly');
  
  const daysToView = timeframe === 'Weekly' ? 7 : 30;
  const interval = eachDayOfInterval({
    start: subDays(new Date(), daysToView - 1),
    end: new Date(),
  });

  const dailyData = interval.map(day => {
    const dayActivities = activities.filter(a => isSameDay(new Date(a.timestamp), day));
    const dayFood = food.filter(f => isSameDay(new Date(f.timestamp), day));
    const daySleep = sleep.filter(s => isSameDay(new Date(s.timestamp), day));

    return {
      name: timeframe === 'Weekly' ? format(day, 'EEE') : format(day, 'MMM d'),
      caloriesBurned: dayActivities.reduce((acc, a) => acc + a.calories, 0),
      caloriesConsumed: dayFood.reduce((acc, f) => acc + f.calories, 0),
      activeMinutes: dayActivities.reduce((acc, a) => acc + a.duration, 0),
      sleepHours: daySleep.reduce((acc, s) => acc + differenceInHours(new Date(s.endTime), new Date(s.startTime)), 0),
      sleepQuality: daySleep.length > 0 ? daySleep.reduce((acc, s) => acc + s.quality, 0) / daySleep.length : 0,
    };
  });

  const totalBurned = dailyData.reduce((acc, d) => acc + d.caloriesBurned, 0);
  const avgConsumed = dailyData.reduce((acc, d) => acc + d.caloriesConsumed, 0) / daysToView;
  const avgSleepQuality = dailyData.filter(d => d.sleepQuality > 0).length > 0 
    ? dailyData.reduce((acc, d) => acc + d.sleepQuality, 0) / dailyData.filter(d => d.sleepQuality > 0).length 
    : 0;

  const activityDistribution = [
    { name: 'Running', value: activities.filter(a => a.type === 'running').reduce((acc, a) => acc + a.duration, 0) },
    { name: 'Walking', value: activities.filter(a => a.type === 'walking').reduce((acc, a) => acc + a.duration, 0) },
    { name: 'Cycling', value: activities.filter(a => a.type === 'cycling').reduce((acc, a) => acc + a.duration, 0) },
  ].filter(d => d.value > 0);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-[var(--text-primary)]">Health Reports</h2>
        <div className="flex bg-[var(--bg-primary)] p-1 rounded-xl">
          {(['Weekly', 'Monthly'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                timeframe === t ? "bg-[var(--bg-card)] text-[var(--accent)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReportSummaryCard 
          label={`Total Burned (${timeframe})`} 
          value={`${totalBurned.toLocaleString()} kcal`} 
          trend="up" 
          percent="--" 
          icon={<ActivityIcon size={20} />} 
          color="indigo" 
        />
        <ReportSummaryCard 
          label="Avg Consumed" 
          value={`${Math.round(avgConsumed).toLocaleString()} kcal`} 
          trend="down" 
          percent="--" 
          icon={<Utensils size={20} />} 
          color="emerald" 
        />
        <ReportSummaryCard 
          label="Sleep Quality" 
          value={avgSleepQuality > 0 ? `${Math.round(avgSleepQuality * 10)}%` : '0%'} 
          trend="stable" 
          percent="--" 
          icon={<Moon size={20} />} 
          color="amber" 
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calories Comparison */}
        <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
          <h3 className="font-bold text-[var(--text-primary)] mb-6">Calories: Burned vs Consumed</h3>
          <div className="h-64 min-h-[256px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: 'var(--bg-primary)'}}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="caloriesBurned" name="Burned" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="caloriesConsumed" name="Consumed" fill="var(--success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Distribution */}
        <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
          <h3 className="font-bold text-[var(--text-primary)] mb-6">Activity Distribution</h3>
          <div className="h-64 min-h-[256px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activityDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {activityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--accent)' : index === 1 ? 'var(--success)' : '#f59e0b'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sleep Trends */}
        <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm lg:col-span-2">
          <h3 className="font-bold text-[var(--text-primary)] mb-6">Sleep Duration Trends</h3>
          <div className="h-64 min-h-[256px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Line type="monotone" dataKey="sleepHours" name="Hours Slept" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--accent)', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportSummaryCard({ label, value, trend, percent, icon, color }: any) {
  const colors: any = {
    indigo: "bg-[var(--accent)]/10 text-[var(--accent)]",
    emerald: "bg-[var(--success)]/10 text-[var(--success)]",
    amber: "bg-amber-500/10 text-amber-500",
  };

  return (
    <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors[color])}>
          {icon}
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold",
          trend === 'up' ? "bg-[var(--success)]/10 text-[var(--success)]" : 
          trend === 'down' ? "bg-rose-500/10 text-rose-500" : "bg-[var(--bg-primary)] text-[var(--text-secondary)]"
        )}>
          {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : <Minus size={12} />}
          {percent}
        </div>
      </div>
      <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">{label}</p>
      <h3 className="text-2xl font-black text-[var(--text-primary)]">{value}</h3>
    </div>
  );
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function differenceInHours(d1: Date, d2: Date) {
  return Math.abs(d1.getTime() - d2.getTime()) / 36e5;
}
