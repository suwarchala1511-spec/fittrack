import React, { useState, useEffect, useCallback } from 'react';
import { Activity, FoodIntake, SleepRecord, Goal, ActivityType, Badge, UserProfile } from '../types';
import { 
  Activity as ActivityIcon, 
  Utensils, 
  Moon, 
  Trophy, 
  TrendingUp, 
  Share2, 
  Plus, 
  ChevronRight,
  User,
  LogOut,
  Settings,
  Bell,
  Calendar,
  Zap,
  X,
  LogIn,
  Award,
  Clock,
  MapPin,
  Flame,
  Check,
  Sun,
  Footprints,
  Star,
  Compass
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subDays, isWithinInterval, parseISO, endOfMonth } from 'date-fns';
import { cn } from '../lib/utils';
import { generateDailyInsight, generateAdvancedRecommendations } from '../lib/gemini';
import ActivityTracker from './ActivityTracker';
import NutritionLog from './NutritionLog';
import SleepTracker from './SleepTracker';
import Reports from './Reports';
import ProfileSettings from './ProfileSettings';
import { useAuth } from '../AuthContext';
import { 
  db, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  handleFirestoreError, 
  OperationType 
} from '../firebase';

export default function Dashboard() {
  const { user, profile, loading: authLoading, signIn, signInGuest, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'nutrition' | 'sleep' | 'goals' | 'reports' | 'badges' | 'profile'>('overview');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [food, setFood] = useState<FoodIntake[]>([]);
  const [sleep, setSleep] = useState<SleepRecord[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  
  const [insight, setInsight] = useState<string>('Analyzing your data...');
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [timeframe, setTimeframe] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [celebratedBadge, setCelebratedBadge] = useState<Badge | null>(null);
  const [newGoal, setNewGoal] = useState<{
    type: 'daily' | 'weekly' | 'monthly';
    category: 'activity' | 'calories' | 'sleep' | 'steps' | 'activity_km';
    target: number;
    reminderTime: string;
    reminderEnabled: boolean;
  }>({
    type: 'daily',
    category: 'activity',
    target: 60,
    reminderTime: '09:00',
    reminderEnabled: false
  });

  useEffect(() => {
    if (profile?.theme) {
      document.documentElement.setAttribute('data-theme', profile.theme);
    } else {
      document.documentElement.setAttribute('data-theme', 'default');
    }
  }, [profile?.theme]);

  const getThemeText = (key: string) => {
    const theme = profile?.theme || 'default';
    const texts: any = {
      'goal_met': {
        'default': 'Goal Met!',
        'jungle': 'Survival Secured!',
        'horror': 'You Escaped!',
        'cyberpunk': 'System Optimized!',
        'olympus': 'Divine Favor Earned!',
      },
      'dashboard_title': {
        'default': 'Fitness Dashboard',
        'jungle': 'Jungle Survival Log',
        'horror': 'The Escape Plan',
        'cyberpunk': 'Cybernetic HUD',
        'olympus': 'Trials of Olympus',
      },
      'welcome': {
        'default': 'Welcome back',
        'jungle': 'Stay alert',
        'horror': 'Don\'t look back',
        'cyberpunk': 'Connection established',
        'olympus': 'Greetings, Hero',
      }
    };
    return texts[key]?.[theme] || texts[key]?.['default'];
  };

  const getThemeBadge = (badge: Badge) => {
    const theme = profile?.theme || 'default';
    if (theme === 'default') return badge;
    
    const themeBadges: any = {
      'jungle': {
        'early-bird': { name: 'Morning Jaguar', description: 'Prowling before sunrise' },
        'marathoner': { name: 'Jungle Trekker', description: 'Covered 42.2km of dense forest' },
        '7-day-streak': { name: 'Apex Predator', description: '7 days at the top of the food chain' },
        'rest-day-pro': { name: 'Hibernation Master', description: 'Recovered for the next hunt' },
      },
      'horror': {
        'early-bird': { name: 'First Light', description: 'Survived until dawn' },
        'marathoner': { name: 'The Long Run', description: 'Escaped 42.2km from the shadows' },
        '7-day-streak': { name: 'Final Survivor', description: '7 days of avoiding the inevitable' },
        'rest-day-pro': { name: 'Safe House', description: 'Found a moment of peace' },
      },
      'cyberpunk': {
        'early-bird': { name: 'System Boot', description: 'Online before the grid wakes' },
        'marathoner': { name: 'Network Runner', description: 'Traversed 42.2km of the digital sprawl' },
        '7-day-streak': { name: 'Overclocked', description: '7 days of peak performance' },
        'rest-day-pro': { name: 'Recharge Cycle', description: 'Battery at 100%' },
      },
      'olympus': {
        'early-bird': { name: 'Helios\' Chariot', description: 'Rising with the sun god' },
        'marathoner': { name: 'Messenger of Gods', description: 'Ran the original marathon distance' },
        '7-day-streak': { name: 'Heroic Discipline', description: '7 days of demigod training' },
        'rest-day-pro': { name: 'Ambrosia Rest', description: 'Restoring divine energy' },
      }
    };

    const override = themeBadges[theme]?.[badge.id];
    if (override) {
      return { ...badge, ...override };
    }
    return badge;
  };

  const [notifications, setNotifications] = useState<{ id: string; message: string; type: string }[]>([]);

  // Reminder Check Logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      
      goals.forEach(goal => {
        if (goal.reminderEnabled && goal.reminderTime === currentTime && !goal.completed) {
          const notificationId = `${goal.id}-${currentTime}`;
          // Avoid duplicate notifications for the same minute
          if (!notifications.find(n => n.id === notificationId)) {
            setNotifications(prev => [{
              id: notificationId,
              message: `Reminder: Don't forget your ${goal.category === 'calories' ? 'Food' : goal.category.replace('_', ' ')} goal!`,
              type: 'reminder'
            }, ...prev]);
          }
        }
      });
    }, 10000); // Check every 10 seconds for better responsiveness

    return () => clearInterval(interval);
  }, [goals, notifications]);

  // Dynamic Chart Data Generation
  const dynamicChartData = useCallback(() => {
    const now = new Date();
    if (timeframe === 'Weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(now, 6 - i);
        const dayName = days[d.getDay()];
        const dayActivities = activities.filter(a => isSameDay(parseISO(a.timestamp), d));
        const value = dayActivities.reduce((acc, a) => acc + a.duration, 0);
        return { name: dayName, value };
      });
      return last7Days;
    } else {
      // Monthly: Last 30 days grouped by week or just show days
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const d = subDays(now, 29 - i);
        const dayLabel = format(d, 'MMM d');
        const dayActivities = activities.filter(a => isSameDay(parseISO(a.timestamp), d));
        const value = dayActivities.reduce((acc, a) => acc + a.duration, 0);
        return { name: dayLabel, value };
      });
      return last30Days;
    }
  }, [activities, timeframe]);

  const chartData = dynamicChartData();
  const hasData = activities.length > 0 || food.length > 0 || sleep.length > 0;

  // Today's Stats Calculation
  const today = new Date();
  const todayActivities = activities.filter(a => isSameDay(parseISO(a.timestamp), today));
  const todayFood = food.filter(f => isSameDay(parseISO(f.timestamp), today));
  const todaySleep = sleep.filter(s => isSameDay(parseISO(s.timestamp), today));

  const todaySteps = todayActivities.reduce((acc, a) => acc + (a.type === 'walking' ? a.duration * 100 : 0), 0);
  const todayCalories = todayFood.reduce((acc, f) => acc + f.calories, 0);
  const todayActiveMin = todayActivities.reduce((acc, a) => acc + a.duration, 0);
  const todaySleepDuration = todaySleep.reduce((acc, s) => {
    const start = parseISO(s.startTime);
    const end = parseISO(s.endTime);
    return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);

  // Real-time listeners
  useEffect(() => {
    if (!user) return;

    const unsubActivities = onSnapshot(
      query(collection(db, 'activities'), where('userId', '==', user.uid)),
      (snapshot) => {
        setActivities(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Activity)));
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'activities')
    );

    const unsubFood = onSnapshot(
      query(collection(db, 'food'), where('userId', '==', user.uid)),
      (snapshot) => {
        setFood(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as FoodIntake)));
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'food')
    );

    const unsubSleep = onSnapshot(
      query(collection(db, 'sleep'), where('userId', '==', user.uid)),
      (snapshot) => {
        setSleep(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SleepRecord)));
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'sleep')
    );

    const unsubGoals = onSnapshot(
      query(collection(db, 'goals'), where('userId', '==', user.uid)),
      (snapshot) => {
        setGoals(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Goal)));
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'goals')
    );

    return () => {
      unsubActivities();
      unsubFood();
      unsubSleep();
      unsubGoals();
    };
  }, [user]);

  // Badge Logic
  const checkBadges = useCallback(async () => {
    if (!user || !profile) return;

    const earnedBadges = profile.badges || [];
    const newBadges: Badge[] = [];

    // 1. Early Bird (Activity before 8 AM)
    const hasEarlyBird = earnedBadges.some(b => b.id === 'early-bird');
    if (!hasEarlyBird) {
      const earlyActivity = activities.find(a => {
        const date = new Date(a.timestamp);
        return date.getHours() < 8;
      });
      if (earlyActivity) {
        newBadges.push({
          id: 'early-bird',
          name: 'Early Bird',
          description: 'Logged an activity before 8 AM',
          icon: 'Sun',
          earnedAt: new Date().toISOString()
        });
      }
    }

    // 2. Night Owl (Activity after 10 PM)
    const hasNightOwl = earnedBadges.some(b => b.id === 'night-owl');
    if (!hasNightOwl) {
      const lateActivity = activities.find(a => {
        const date = new Date(a.timestamp);
        return date.getHours() >= 22;
      });
      if (lateActivity) {
        newBadges.push({
          id: 'night-owl',
          name: 'Night Owl',
          description: 'Logged an activity after 10 PM',
          icon: 'Moon',
          earnedAt: new Date().toISOString()
        });
      }
    }

    // 3. Distance Master (Total distance > 5km)
    const hasDistance5k = earnedBadges.some(b => b.id === 'distance-5k');
    if (!hasDistance5k) {
      const totalDistance = activities.reduce((acc, a) => acc + (a.distance || 0), 0);
      if (totalDistance >= 5) {
        newBadges.push({
          id: 'distance-5k',
          name: 'Distance Master (5k)',
          description: 'Covered a total distance of 5 km',
          icon: 'Footprints',
          earnedAt: new Date().toISOString()
        });
      }
    }

    const hasDistance10k = earnedBadges.some(b => b.id === 'distance-10k');
    if (!hasDistance10k) {
      const totalDistance = activities.reduce((acc, a) => acc + (a.distance || 0), 0);
      if (totalDistance >= 10) {
        newBadges.push({
          id: 'distance-10k',
          name: 'Distance Master (10k)',
          description: 'Covered a total distance of 10 km',
          icon: 'Footprints',
          earnedAt: new Date().toISOString()
        });
      }
    }

    const hasMarathoner = earnedBadges.some(b => b.id === 'marathoner');
    if (!hasMarathoner) {
      const totalDistance = activities.reduce((acc, a) => acc + (a.distance || 0), 0);
      if (totalDistance >= 42.2) {
        newBadges.push({
          id: 'marathoner',
          name: 'Distance Master (Marathon)',
          description: 'Covered a total distance of 42.2 km',
          icon: 'Footprints',
          earnedAt: new Date().toISOString()
        });
      }
    }

    // 4. 7-Day Streak (7 consecutive days with completed goals)
    const hasStreak = earnedBadges.some(b => b.id === '7-day-streak');
    if (!hasStreak && goals.length > 0) {
      let streak = 0;
      for (let i = 0; i < 7; i++) {
        const day = subDays(new Date(), i);
        const dayGoals = goals.filter(g => isSameDay(parseISO(g.deadline), day));
        if (dayGoals.length > 0 && dayGoals.every(g => g.completed)) {
          streak++;
        } else {
          break;
        }
      }
      if (streak >= 7) {
        newBadges.push({
          id: '7-day-streak',
          name: '7-Day Streak',
          description: 'Completed all goals for 7 consecutive days',
          icon: 'Flame',
          earnedAt: new Date().toISOString()
        });
      }
    }

    // 5. Rest Day Pro (8+ hours of sleep)
    const hasRestDayPro = earnedBadges.some(b => b.id === 'rest-day-pro');
    if (!hasRestDayPro) {
      const goodSleep = sleep.find(s => {
        const duration = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60);
        return duration >= 8;
      });
      if (goodSleep) {
        newBadges.push({
          id: 'rest-day-pro',
          name: 'Rest Day Pro',
          description: 'Logged 8+ hours of sleep',
          icon: 'Moon',
          earnedAt: new Date().toISOString()
        });
      }
    }

    // 6. Power Plate (3 food logs in one day)
    const hasPowerPlate = earnedBadges.some(b => b.id === 'power-plate');
    if (!hasPowerPlate) {
      const foodByDay: { [key: string]: number } = {};
      food.forEach(f => {
        const date = format(parseISO(f.timestamp), 'yyyy-MM-dd');
        foodByDay[date] = (foodByDay[date] || 0) + 1;
      });
      const hasThreeMeals = Object.values(foodByDay).some(count => count >= 3);
      if (hasThreeMeals) {
        newBadges.push({
          id: 'power-plate',
          name: 'Power Plate',
          description: 'Logged 3 healthy meals in one day',
          icon: 'Award',
          earnedAt: new Date().toISOString()
        });
      }
    }

    if (newBadges.length > 0) {
      const updatedBadges = [...earnedBadges, ...newBadges];
      try {
        await updateDoc(doc(db, 'users', user.uid), { badges: updatedBadges });
        setCelebratedBadge(newBadges[0]);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#f59e0b', '#10b981']
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  }, [user, profile, activities, goals, sleep, food]);

  useEffect(() => {
    if (activities.length > 0 || goals.length > 0 || sleep.length > 0 || food.length > 0) {
      checkBadges();
    }
  }, [activities, goals, sleep, food, checkBadges]);

  useEffect(() => {
    const fetchAI = async () => {
      if (!user || activities.length === 0) return;
      setLoadingAI(true);
      try {
        const insightText = await generateDailyInsight(activities, food, sleep, goals);
        setInsight(insightText || "Keep up the good work!");
        
        const recs = await generateAdvancedRecommendations(activities, food, sleep, goals);
        setRecommendations(recs);
      } catch (error) {
        console.error("AI Error:", error);
        setInsight("Unable to generate AI insights at this time.");
      } finally {
        setLoadingAI(false);
      }
    };
    fetchAI();
  }, [activities, food, sleep, goals, user]);

  const handleActivityComplete = async (newActivity: Activity) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'activities'), { ...newActivity, userId: user.uid });
      
      // Update goals
      for (const goal of goals) {
        if (goal.category === 'activity' && !goal.completed) {
          const newCurrent = goal.current + newActivity.duration;
          const completed = newCurrent >= goal.target;
          await updateDoc(doc(db, 'goals', goal.id), { current: newCurrent, completed });
          
          if (completed && profile) {
            await updateDoc(doc(db, 'users', user.uid), { points: profile.points + goal.points });
          }
        } else if (goal.category === 'activity_km' && !goal.completed) {
          const newCurrent = goal.current + newActivity.distance;
          const completed = newCurrent >= goal.target;
          await updateDoc(doc(db, 'goals', goal.id), { current: newCurrent, completed });
          
          if (completed && profile) {
            await updateDoc(doc(db, 'users', user.uid), { points: profile.points + goal.points });
          }
        }
      }
      setShowTracker(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'activities');
    }
  };

  const handleFoodAdd = async (newFood: FoodIntake) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'food'), { ...newFood, userId: user.uid });
      
      for (const goal of goals) {
        if (goal.category === 'calories' && !goal.completed) {
          const newCurrent = goal.current + newFood.calories;
          const completed = newCurrent >= goal.target;
          await updateDoc(doc(db, 'goals', goal.id), { current: newCurrent, completed });
          
          if (completed && profile) {
            await updateDoc(doc(db, 'users', user.uid), { points: profile.points + goal.points });
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'food');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FitTrack Progress',
          text: `I've earned ${profile?.points || 0} points and ${profile?.badges?.length || 0} badges on FitTrack!`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      alert('Sharing is not supported on this browser. You can copy the URL to share manually.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
        <div className="bg-[var(--bg-card)] p-8 rounded-2xl border border-[var(--border)] shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full flex items-center justify-center mx-auto mb-6">
            <ActivityIcon size={32} />
          </div>
          <h2 className="text-3xl font-black text-[var(--text-primary)] mb-2">FitTrack</h2>
          <p className="text-[var(--text-secondary)] mb-8">Track your fitness, nutrition, and sleep with AI-powered insights.</p>
          <button 
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 py-4 bg-[var(--accent)] text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-[var(--accent)]/20 mb-4"
          >
            <LogIn size={20} />
            Sign in with Google
          </button>
          <button 
            onClick={signInGuest}
            className="w-full flex items-center justify-center gap-3 py-4 bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] rounded-xl font-bold hover:bg-[var(--accent)]/5 transition-all"
          >
            <User size={20} />
            Continue as Guest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-[var(--text-primary)] font-sans">
      {/* Notifications Overlay */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl rounded-2xl p-4 w-80 pointer-events-auto flex items-start gap-4"
            >
              <div className="w-10 h-10 bg-[var(--accent)] text-white rounded-xl flex items-center justify-center shrink-0">
                <Bell size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--text-primary)]">{n.message}</p>
                <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase mt-1">Goal Reminder</p>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                className="text-[var(--text-secondary)]/30 hover:text-[var(--text-primary)]"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Badge Celebration Modal */}
      <AnimatePresence>
        {celebratedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                transition: {
                  type: "spring",
                  stiffness: 100,
                  damping: 10,
                }
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--accent)] via-[var(--accent-secondary)] to-[var(--accent)]" />
              
              <div className="mb-6 relative inline-block">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-[var(--accent)]/5 rounded-full scale-150 opacity-50"
                />
                <div className="relative z-10 w-24 h-24 bg-[var(--bg-card)] rounded-full shadow-xl flex items-center justify-center border-4 border-[var(--bg-primary)]">
                  <BadgeIcon name={celebratedBadge.icon} size={48} />
                </div>
              </div>

              <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2">{getThemeText('goal_met')}</h2>
              <p className="text-[var(--accent)] font-bold mb-4">{celebratedBadge.name}</p>
              <p className="text-[var(--text-secondary)] text-sm mb-8">{celebratedBadge.description}</p>

              <button
                onClick={() => setCelebratedBadge(null)}
                className="w-full py-4 bg-[var(--accent)] text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-[var(--accent)]/90 transition-all"
              >
                Awesome!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--bg-sidebar)] border-t border-[var(--border)] px-6 py-3 flex justify-between items-center z-50 md:top-0 md:bottom-auto md:flex-col md:w-20 md:h-full md:border-t-0 md:border-r md:py-8 transition-all duration-300">
        <div className="hidden md:block mb-8">
          <button 
            onClick={() => setActiveTab('profile')}
            className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--border)] hover:border-[var(--accent)] transition-all"
          >
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 bg-[var(--accent)] rounded-xl flex items-center justify-center text-white font-bold text-xl">F</div>
            )}
          </button>
        </div>
        
        <NavIcon icon={<TrendingUp size={24} />} active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Overview" />
        <NavIcon icon={<ActivityIcon size={24} />} active={activeTab === 'activities'} onClick={() => setActiveTab('activities')} label="Activities" />
        <NavIcon icon={<Utensils size={24} />} active={activeTab === 'nutrition'} onClick={() => setActiveTab('nutrition')} label="Nutrition" />
        <NavIcon icon={<Moon size={24} />} active={activeTab === 'sleep'} onClick={() => setActiveTab('sleep')} label="Sleep" />
        <NavIcon icon={<Trophy size={24} />} active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} label="Goals" />
        <NavIcon icon={<Award size={24} />} active={activeTab === 'badges'} onClick={() => setActiveTab('badges')} label="Badges" />
        <NavIcon icon={<Calendar size={24} />} active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} label="Reports" />
        <NavIcon icon={<User size={24} />} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="Profile" />
        
        <div className="hidden md:flex flex-col gap-4 mt-auto">
          <NavIcon icon={<Bell size={24} />} active={showNotifications} onClick={() => setShowNotifications(!showNotifications)} label="Notifications" />
          <NavIcon icon={<LogOut size={24} />} active={false} onClick={signOut} label="Sign Out" />
        </div>
      </nav>

      {/* Notifications Panel (Fixed Overlay) */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-[var(--bg-card)] shadow-2xl z-[101] p-8 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-[var(--text-primary)]">Notifications</h2>
                  <p className="text-[var(--text-secondary)] text-sm">Stay on track with your goals</p>
                </div>
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="w-10 h-10 bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-xl flex items-center justify-center hover:bg-[var(--bg-primary)]/80 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-[var(--bg-primary)] text-[var(--text-secondary)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell size={32} />
                    </div>
                    <p className="text-[var(--text-secondary)]/50 font-medium">No new notifications</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] flex gap-4 relative group">
                      <div className="w-10 h-10 bg-[var(--accent)]/10 text-[var(--accent)] rounded-xl flex items-center justify-center shrink-0">
                        <Bell size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">{n.message}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase mt-1 tracking-wider">Goal Reminder</p>
                      </div>
                      <button 
                        onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                        className="text-[var(--text-secondary)]/30 hover:text-rose-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pb-24 pt-6 px-4 md:pl-28 md:pr-8 md:pt-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] capitalize">
              {activeTab === 'overview' ? `${getThemeText('welcome')}, ${profile?.isGuest ? 'Guest' : profile?.displayName?.split(' ')[0]}!` : activeTab}
            </h1>
            <p className="text-[var(--text-secondary)]">{getThemeText('dashboard_title')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowNotifications(true)}
              className="relative w-10 h-10 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[var(--bg-card)]">
                  {notifications.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--border)] hover:border-[var(--accent)] transition-all"
            >
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-secondary)]">
                  <User size={20} />
                </div>
              )}
            </button>
            <button 
              onClick={handleShare}
              className="p-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
            >
              <Share2 size={20} />
            </button>
            <button 
              onClick={() => setShowTracker(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Log Activity</span>
            </button>
          </div>
        </header>

        {/* Activity Tracker Modal */}
        <AnimatePresence>
          {showTracker && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md relative"
              >
                <button 
                  onClick={() => setShowTracker(false)}
                  className="absolute -top-12 right-0 text-white hover:text-slate-200 transition-colors"
                >
                  <X size={32} />
                </button>
                <ActivityTracker onActivityComplete={handleActivityComplete} />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Badge Earned Notification */}
        <AnimatePresence>
          {newBadge && (
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 20, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="fixed top-0 left-1/2 -translate-x-1/2 z-[200] bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-indigo-400"
            >
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Award size={28} className="text-yellow-300" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">New Badge Earned!</p>
                <p className="text-lg font-black">{newBadge.name}</p>
              </div>
              <button onClick={() => setNewBadge(null)} className="ml-4 p-1 hover:bg-white/10 rounded-lg">
                <X size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* AI Insight Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white mb-8 shadow-xl shadow-indigo-200 relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={20} className="text-yellow-300 fill-yellow-300" />
                  <span className="text-sm font-semibold uppercase tracking-wider opacity-80">AI Daily Insight</span>
                </div>
                <p className="text-lg font-medium leading-relaxed mb-4">
                  {loadingAI ? "Generating your personalized insight..." : insight}
                </p>
                {recommendations && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                      <p className="text-xs font-bold uppercase opacity-60 mb-1">Exercise</p>
                      <p className="text-sm">{recommendations.exercise}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                      <p className="text-xs font-bold uppercase opacity-60 mb-1">Nutrition</p>
                      <p className="text-sm">{recommendations.nutrition}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                      <p className="text-xs font-bold uppercase opacity-60 mb-1">Sleep</p>
                      <p className="text-sm">{recommendations.sleep}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -left-10 -top-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl"></div>
            </motion.div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Stats & Charts */}
              <div className="lg:col-span-2 space-y-8">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard 
                    label="Steps" 
                    value={todaySteps.toLocaleString()} 
                    target="10,000" 
                    unit="steps" 
                    icon={<ActivityIcon className="text-orange-500" />} 
                    color="orange" 
                  />
                  <StatCard 
                    label="Calories" 
                    value={todayCalories.toLocaleString()} 
                    target="2,200" 
                    unit="kcal" 
                    icon={<Utensils className="text-emerald-500" />} 
                    color="emerald" 
                  />
                  <StatCard 
                    label="Active" 
                    value={todayActiveMin.toString()} 
                    target="60" 
                    unit="min" 
                    icon={<Zap className="text-amber-500" />} 
                    color="amber" 
                  />
                  <StatCard 
                    label="Sleep" 
                    value={todaySleepDuration.toFixed(1)} 
                    target="8" 
                    unit="hrs" 
                    icon={<Moon className="text-indigo-500" />} 
                    color="indigo" 
                  />
                </div>

                {/* Activity Chart */}
                {hasData && (
                  <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-[var(--text-primary)]">Activity Analysis</h3>
                      <select 
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value as 'Weekly' | 'Monthly')}
                        className="bg-[var(--bg-primary)] border-none text-sm font-medium rounded-lg focus:ring-0 text-[var(--text-primary)]"
                      >
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>
                    <div className="h-64 min-h-[256px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 10}} dy={10} />
                          <YAxis hide />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                          />
                          <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorActivity)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Trackers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <NutritionLog onFoodAdd={handleFoodAdd} />
                  <SleepTracker onSleepAdd={async (s) => {
                    if (!user) return;
                    try {
                      await addDoc(collection(db, 'sleep'), { ...s, userId: user.uid });
                    } catch (error) {
                      handleFirestoreError(error, OperationType.CREATE, 'sleep');
                    }
                  }} />
                </div>
              </div>

              {/* Right Column: Goals & Points */}
              <div className="space-y-8">
                {/* Points Card */}
                <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm text-center">
                  <div className="w-16 h-16 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
                    <Trophy size={32} />
                  </div>
                  <h3 className="text-3xl font-black text-[var(--text-primary)]">{profile?.points?.toLocaleString() || 0}</h3>
                  <p className="text-[var(--text-secondary)] font-medium mb-4">Total Points Earned</p>
                  <div className="w-full bg-[var(--bg-primary)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                    <div className="bg-[var(--accent)] h-full" style={{ width: `${((profile?.points || 0) % 1000) / 10}%` }}></div>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-2">{1000 - ((profile?.points || 0) % 1000)} points to next level</p>
                </div>

                {/* Badges Preview */}
                <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-[var(--text-primary)]">Recent Badges</h3>
                    <button onClick={() => setActiveTab('badges')} className="text-xs font-bold text-[var(--accent)] hover:underline">View All</button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {profile?.badges && profile.badges.length > 0 ? (
                      profile.badges.slice(0, 3).map(badge => (
                        <div key={badge.id} className="flex-shrink-0 w-16 h-16 bg-[var(--bg-primary)] rounded-2xl flex items-center justify-center text-[var(--accent)] border border-[var(--border)]" title={badge.name}>
                          <BadgeIcon name={badge.icon} size={24} />
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--text-secondary)] italic">No badges earned yet. Keep pushing!</p>
                    )}
                  </div>
                </div>

                {/* Goals Progress */}
                <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
                  <h3 className="font-bold text-[var(--text-primary)] mb-6">Active Goals</h3>
                  <div className="space-y-6">
                    {goals.length === 0 ? (
                      <p className="text-sm text-[var(--text-secondary)] text-center py-4">No active goals. Set one to start earning points!</p>
                    ) : (
                      goals.map(goal => (
                        <div key={goal.id}>
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", goal.completed ? "bg-[var(--success)]" : "bg-[var(--accent)]")}></div>
                              <span className="text-sm font-bold text-[var(--text-primary)] capitalize">
                                {goal.category === 'calories' ? 'Food' : goal.category.replace('_', ' ')} Goal
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[var(--accent)]">+{goal.points} pts</span>
                              {goal.reminderEnabled && (
                                <div className="flex items-center gap-1 text-[8px] font-bold text-[var(--text-secondary)] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded-md border border-[var(--border)]">
                                  <Bell size={8} />
                                  {goal.reminderTime}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="w-full bg-[var(--bg-primary)] h-2 rounded-full overflow-hidden mb-1 border border-[var(--border)]">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                              className={cn("h-full", goal.completed ? "bg-[var(--success)]" : "bg-[var(--accent)]")}
                            ></motion.div>
                          </div>
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            <span>
                              {goal.current} / {goal.target} {
                                goal.category === 'activity' ? 'min' : 
                                goal.category === 'activity_km' ? 'km' :
                                goal.category === 'calories' ? 'kcal' : 
                                goal.category === 'sleep' ? 'hrs' : 'steps'
                              }
                            </span>
                            <span>{Math.round((goal.current / goal.target) * 100)}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <button 
                    onClick={() => setActiveTab('goals')}
                    className="w-full mt-8 py-3 border-2 border-dashed border-[var(--border)] rounded-xl text-[var(--text-secondary)] font-bold text-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
                  >
                    + Set New Goal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="space-y-8">
            <ActivityTracker onActivityComplete={handleActivityComplete} />
            <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
              <h3 className="font-bold text-[var(--text-primary)] mb-6">Activity History</h3>
              <div className="space-y-4">
                {activities.length === 0 ? (
                   <p className="text-sm text-[var(--text-secondary)] text-center py-8">No activities logged yet.</p>
                ) : (
                  activities.map(activity => (
                    <div key={activity.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-primary)] hover:opacity-80 transition-all cursor-pointer border border-[var(--border)]">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          activity.type === 'running' ? "bg-orange-500/10 text-orange-500" : 
                          activity.type === 'cycling' ? "bg-indigo-500/10 text-indigo-500" : "bg-blue-500/10 text-blue-500"
                        )}>
                          <ActivityIcon size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-[var(--text-primary)] capitalize">{activity.type}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{format(new Date(activity.timestamp), 'MMM d, h:mm a')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[var(--text-primary)]">{activity.distance} km</p>
                        <p className="text-xs text-[var(--text-secondary)]">{activity.duration} min • {activity.calories} kcal</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'nutrition' && (
          <div className="space-y-8">
            <NutritionLog onFoodAdd={handleFoodAdd} />
            <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
              <h3 className="font-bold text-[var(--text-primary)] mb-6">Nutrition History</h3>
              <div className="space-y-4">
                {food.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)] text-center py-8">No food logged yet.</p>
                ) : (
                  [...food].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-primary)] hover:opacity-80 transition-all border border-[var(--border)]">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                          <Utensils size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-[var(--text-primary)] capitalize">{item.name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{format(new Date(item.timestamp), 'MMM d, h:mm a')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[var(--text-primary)]">{item.calories} kcal</p>
                        <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">
                          P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'sleep' && (
          <div className="space-y-8">
            <SleepTracker onSleepAdd={async (s) => {
              if (!user) return;
              try {
                await addDoc(collection(db, 'sleep'), { ...s, userId: user.uid });
                
                // Update sleep goals
                const sleepDuration = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60);
                for (const goal of goals) {
                  if (goal.category === 'sleep' && !goal.completed) {
                    const newCurrent = goal.current + sleepDuration;
                    const completed = newCurrent >= goal.target;
                    await updateDoc(doc(db, 'goals', goal.id), { current: newCurrent, completed });
                    
                    if (completed && profile) {
                      await updateDoc(doc(db, 'users', user.uid), { points: profile.points + goal.points });
                    }
                  }
                }
              } catch (error) {
                handleFirestoreError(error, OperationType.CREATE, 'sleep');
              }
            }} />
            <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
              <h3 className="font-bold text-[var(--text-primary)] mb-6">Sleep History</h3>
              <div className="space-y-4">
                {sleep.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)] text-center py-8">No sleep logs yet.</p>
                ) : (
                  [...sleep].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(record => {
                    const start = parseISO(record.startTime);
                    const end = parseISO(record.endTime);
                    const durationHrs = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    return (
                      <div key={record.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-primary)] hover:opacity-80 transition-all border border-[var(--border)]">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                            <Moon size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-[var(--text-primary)]">Sleep Session</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {format(start, 'MMM d, h:mm a')} - {format(end, 'h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[var(--text-primary)]">{durationHrs.toFixed(1)} hrs</p>
                          <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Quality: {record.quality}/10</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'reports' && <Reports activities={activities} food={food} sleep={sleep} goals={goals} />}
        
        {activeTab === 'badges' && (
          <div className="space-y-8">
            <div className="bg-[var(--bg-card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-[var(--accent)] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Award size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[var(--text-primary)]">Your Achievements</h2>
                  <p className="text-[var(--text-secondary)]">You've earned {profile?.badges?.length || 0} badges so far!</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile?.badges && profile.badges.length > 0 ? (
                  profile.badges.map(badge => {
                    const themedBadge = getThemeBadge(badge);
                    return (
                      <motion.div 
                        key={badge.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1,
                          transition: {
                            type: "spring",
                            stiffness: 100,
                            damping: 10,
                          }
                        }}
                        whileHover={{ scale: 1.05 }}
                        className="bg-[var(--bg-card)] p-8 rounded-[2.5rem] border border-[var(--border)] shadow-xl flex flex-col items-center text-center relative overflow-hidden group"
                      >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="w-32 h-32 bg-[var(--bg-primary)] rounded-full flex items-center justify-center mb-6 relative group-hover:scale-110 transition-transform duration-500">
                          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/5 to-[var(--accent-secondary)]/5 rounded-full" />
                          <BadgeIcon name={badge.icon} size={64} />
                        </div>
                        
                        <h3 className="text-xl font-black text-[var(--text-primary)] mb-2">{themedBadge.name}</h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed max-w-[200px]">{themedBadge.description}</p>
                        
                        <div className="mt-auto pt-6 border-t border-[var(--border)] w-full">
                          <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Earned {format(new Date(badge.earnedAt), 'MMM d, yyyy')}</span>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-20 text-center">
                    <div className="w-20 h-20 bg-[var(--bg-primary)] text-[var(--text-secondary)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Award size={40} />
                    </div>
                    <p className="text-[var(--text-secondary)] font-medium">No badges earned yet. Start tracking to unlock achievements!</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[var(--bg-card)] p-8 rounded-[2.5rem] border border-[var(--border)] shadow-xl">
              <h3 className="text-xl font-black text-[var(--text-primary)] mb-8">Available Milestones</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MilestoneItem name="Early Bird" description="Log an activity before 8 AM" icon="Sun" />
                <MilestoneItem name="Night Owl" description="Log an activity after 10 PM" icon="Moon" />
                <MilestoneItem name="Marathoner" description="Cover a total distance of 42.2 km" icon="Footprints" />
                <MilestoneItem name="7-Day Streak" description="Complete all goals for 7 consecutive days" icon="Flame" />
                <MilestoneItem name="Power Plate" description="Log 3 healthy meals in one day" icon="Award" />
                <MilestoneItem name="Rest Day Pro" description="Log 8+ hours of sleep" icon="Moon" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="space-y-8">
            <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-[var(--text-primary)]">Manage Your Goals</h3>
                <button 
                  onClick={() => setShowGoalForm(!showGoalForm)}
                  className="flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-all"
                >
                  {showGoalForm ? <X size={18} /> : <Plus size={18} />}
                  {showGoalForm ? 'Cancel' : 'Set New Goal'}
                </button>
              </div>

              <AnimatePresence>
                {showGoalForm && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-8"
                  >
                    <div className="bg-[var(--bg-primary)] p-6 rounded-2xl border border-[var(--border)] grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Category</label>
                        <select 
                          value={newGoal.category}
                          onChange={(e) => setNewGoal({...newGoal, category: e.target.value as any})}
                          className="w-full p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] outline-none font-bold text-[var(--text-primary)]"
                        >
                          <option value="activity">Activity (min)</option>
                          <option value="activity_km">Activity (km)</option>
                          <option value="calories">Food (kcal)</option>
                          <option value="sleep">Sleep (hrs)</option>
                          <option value="steps">Steps</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Timeframe</label>
                        <select 
                          value={newGoal.type}
                          onChange={(e) => setNewGoal({...newGoal, type: e.target.value as any})}
                          className="w-full p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] outline-none font-bold text-[var(--text-primary)]"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                      <div className="bg-[var(--accent)]/5 p-3 rounded-2xl border border-[var(--accent)]/10">
                        <label className="block text-xs font-bold text-[var(--accent)] uppercase mb-2 opacity-60">Reminder Settings</label>
                        <div className="flex gap-2">
                          <input 
                            type="time"
                            value={newGoal.reminderTime}
                            onChange={(e) => setNewGoal({...newGoal, reminderTime: e.target.value})}
                            className="flex-1 p-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] outline-none font-bold text-[var(--text-primary)] text-sm"
                          />
                          <button 
                            onClick={() => setNewGoal({...newGoal, reminderEnabled: !newGoal.reminderEnabled})}
                            className={cn(
                              "w-10 h-10 rounded-xl transition-all flex items-center justify-center shrink-0",
                              newGoal.reminderEnabled ? "bg-[var(--accent)] text-white shadow-lg shadow-indigo-200" : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]"
                            )}
                          >
                            <Bell size={18} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Target Value</label>
                        <div className="flex gap-2">
                          <input 
                            type="number"
                            value={newGoal.target}
                            onChange={(e) => setNewGoal({...newGoal, target: parseFloat(e.target.value) || 0})}
                            className="flex-1 p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] outline-none font-bold text-[var(--text-primary)]"
                          />
                          <button 
                            onClick={async () => {
                              if (!user) return;
                              try {
                                await addDoc(collection(db, 'goals'), {
                                  id: Math.random().toString(36).substr(2, 9),
                                  userId: user.uid,
                                  type: newGoal.type,
                                  category: newGoal.category,
                                  target: newGoal.target,
                                  current: 0,
                                  points: newGoal.type === 'daily' ? 100 : newGoal.type === 'weekly' ? 500 : 200,
                                  completed: false,
                                  reminderTime: newGoal.reminderTime,
                                  reminderEnabled: newGoal.reminderEnabled,
                                  deadline: newGoal.type === 'daily' 
                                    ? new Date(new Date().setHours(23, 59, 59)).toISOString()
                                    : newGoal.type === 'weekly'
                                      ? endOfWeek(new Date()).toISOString()
                                      : endOfMonth(new Date()).toISOString()
                                });
                                setShowGoalForm(false);
                                // Show a success notification
                                setNotifications(prev => [{
                                  id: Date.now().toString(),
                                  message: `Success! New ${newGoal.category.replace('_', ' ')} goal set.`,
                                  type: 'success'
                                }, ...prev]);
                              } catch (error) {
                                handleFirestoreError(error, OperationType.CREATE, 'goals');
                              }
                            }}
                            className="bg-[var(--accent)] text-white px-6 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-indigo-100"
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.length === 0 ? (
                  <div className="col-span-full py-12 text-center">
                    <div className="w-16 h-16 bg-[var(--bg-primary)] text-[var(--text-secondary)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trophy size={32} />
                    </div>
                    <p className="text-[var(--text-secondary)] font-medium">No active goals yet. Set one to start tracking!</p>
                  </div>
                ) : (
                  goals.map(goal => (
                    <div key={goal.id} className="p-6 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] relative group">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", goal.completed ? "bg-emerald-500/10 text-emerald-500" : "bg-[var(--accent)]/10 text-[var(--accent)]")}>
                            {goal.category === 'activity' || goal.category === 'activity_km' ? <ActivityIcon size={20} /> : 
                             goal.category === 'calories' ? <Utensils size={20} /> :
                             goal.category === 'sleep' ? <Moon size={20} /> : <Zap size={20} />}
                          </div>
                          <div>
                            <p className="font-bold text-[var(--text-primary)] capitalize">
                              {goal.category === 'calories' ? 'Food' : goal.category.replace('_', ' ')} Goal
                            </p>
                            <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">{goal.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--accent)]">+{goal.points} pts</span>
                          {goal.reminderEnabled && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--accent)] bg-[var(--accent)]/5 px-2 py-1 rounded-lg border border-[var(--accent)]/10">
                              <Bell size={10} fill="currentColor" />
                              {goal.reminderTime}
                            </div>
                          )}
                          {goal.completed && <div className="bg-emerald-500 text-white p-1 rounded-full shadow-sm"><Check size={10} /></div>}
                        </div>
                      </div>
                      <div className="w-full bg-[var(--bg-card)] h-2 rounded-full overflow-hidden mb-2">
                        <div className={cn("h-full", goal.completed ? "bg-emerald-500" : "bg-[var(--accent)]")} style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                        <span className="text-[var(--text-secondary)]">
                          {goal.current} / {goal.target} {
                            goal.category === 'activity' ? 'min' : 
                            goal.category === 'calories' ? 'kcal' : 
                            goal.category === 'sleep' ? 'hrs' : 'steps'
                          }
                        </span>
                        <span className="text-[var(--text-primary)]">{Math.round((goal.current / goal.target) * 100)}%</span>
                      </div>
                      
                      <button 
                        onClick={async () => {
                          try {
                            await deleteDoc(doc(db, 'goals', goal.id));
                          } catch (error) {
                            handleFirestoreError(error, OperationType.DELETE, `goals/${goal.id}`);
                          }
                        }}
                        className="absolute top-2 right-2 p-1 text-[var(--text-secondary)]/30 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && <ProfileSettings />}
      </main>
    </div>
  );
}

function NavIcon({ icon, active, onClick, label }: { icon: React.ReactNode, active: boolean, onClick: () => void | Promise<void>, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded-xl transition-all md:w-14 md:h-14 md:justify-center",
        active ? "text-[var(--accent)] bg-[var(--accent)]/10" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold md:hidden">{label}</span>
    </button>
  );
}

function StatCard({ label, value, target, unit, icon, color }: any) {
  const colors: any = {
    orange: "bg-orange-500/10 text-orange-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    amber: "bg-amber-500/10 text-amber-500",
    indigo: "bg-indigo-500/10 text-indigo-500",
  };

  const val = parseFloat(value.replace(/,/g, ''));
  const tar = parseFloat(target.replace(/,/g, ''));
  const progress = Math.min((val / tar) * 100, 100);

  return (
    <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", colors[color])}>
        {icon}
      </div>
      <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black text-[var(--text-primary)]">{value}</span>
        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">{unit}</span>
      </div>
      <div className="mt-3 w-full bg-[var(--bg-primary)] h-1.5 rounded-full overflow-hidden">
        <div className={cn("h-full", color === 'orange' ? 'bg-orange-500' : color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : 'bg-indigo-500')} style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
}

function BadgeIcon({ name, size }: { name: string, size: number }) {
  const [isHovered, setIsHovered] = React.useState(false);

  switch (name) {
    case 'Sun': // Early Bird
      return (
        <motion.div 
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative flex items-center justify-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 text-[var(--accent)] opacity-20"
          >
            <Sun size={size * 1.4} />
          </motion.div>
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 flex flex-col items-center"
          >
            <Sun size={size} className="text-[var(--accent)] fill-[var(--accent)]/10" />
            <motion.div 
              animate={isHovered ? { scaleX: [1, 1.2, 1] } : {}}
              className="absolute top-[40%] w-[80%] h-[4px] bg-[var(--accent)] rounded-full shadow-sm" 
            />
          </motion.div>
        </motion.div>
      );
    case 'Flame': // Consistent Athlete
      return (
        <motion.div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative flex items-center justify-center"
        >
          <motion.div
            animate={{ 
              y: [0, -6, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          >
            <Flame size={size} className="text-[var(--accent)] fill-[var(--accent)]/10" />
            <div className="absolute top-[55%] left-1/2 -translate-x-1/2 flex gap-1.5">
              <div className="w-1.5 h-1.5 bg-[var(--text-primary)] rounded-full" />
              <div className="w-1.5 h-1.5 bg-[var(--text-primary)] rounded-full" />
            </div>
          </motion.div>
          <motion.div 
            animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -bottom-2 w-full h-4 bg-[var(--accent)]/10 blur-xl rounded-full"
          />
        </motion.div>
      );
    case 'Footprints': // Distance Master / Marathon Mapper
      return (
        <motion.div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative flex items-center justify-center"
        >
          <motion.div 
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 p-3 bg-[var(--bg-card)] rounded-full shadow-sm border border-[var(--border)]"
          >
            <Compass size={size * 0.8} className="text-[var(--accent)]" />
          </motion.div>
          <motion.div 
            animate={{ 
              rotate: isHovered ? [0, -20, 20, 0] : [0, -5, 5, 0],
              scale: isHovered ? 1.2 : 1,
            }}
            transition={{ duration: isHovered ? 0.3 : 2, repeat: Infinity }}
            className="absolute -left-6 top-0 text-[var(--accent)] opacity-60"
          >
            <Zap size={size * 0.7} className="fill-[var(--accent)]/10" />
          </motion.div>
          <motion.div 
            animate={{ 
              rotate: isHovered ? [0, 20, -20, 0] : [0, 5, -5, 0],
              scale: isHovered ? 1.2 : 1,
            }}
            transition={{ duration: isHovered ? 0.3 : 2, repeat: Infinity }}
            className="absolute -right-6 top-0 text-[var(--accent)] opacity-60"
          >
            <Zap size={size * 0.7} className="fill-[var(--accent)]/10" />
          </motion.div>
          <div className="absolute -bottom-4 flex gap-2">
            <Footprints size={size * 0.4} className="text-[var(--accent-secondary)]" />
          </div>
        </motion.div>
      );
    case 'Moon': // Night Owl
      return (
        <motion.div className="relative flex items-center justify-center">
          <div className="relative z-10">
            <Moon size={size} className="text-[var(--accent)] fill-[var(--accent)]/10" />
          </div>
          <motion.div 
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0 }}
            className="absolute -top-4 -right-2 text-[var(--accent-secondary)]"
          >
            <Star size={size * 0.4} className="fill-current" />
          </motion.div>
          <motion.div 
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            className="absolute top-2 -left-6 text-[var(--accent-secondary)] opacity-70"
          >
            <Star size={size * 0.3} className="fill-current" />
          </motion.div>
          <motion.div 
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
            className="absolute -bottom-2 -left-2 text-[var(--accent-secondary)] opacity-50"
          >
            <Star size={size * 0.2} className="fill-current" />
          </motion.div>
        </motion.div>
      );
    case 'MapPin': return <MapPin size={size} className="text-[var(--accent)] fill-[var(--accent)]/10" />;
    case 'Clock': return <Clock size={size} className="text-[var(--accent)] fill-[var(--accent)]/10" />;
    default: return <Award size={size} className="text-[var(--accent)] fill-[var(--accent)]/10" />;
  }
}

function MilestoneItem({ name, description, icon }: { name: string, description: string, icon: string }) {
  return (
    <div className="flex items-center gap-6 p-6 rounded-3xl bg-[var(--bg-primary)]/50 border border-[var(--border)] hover:bg-[var(--bg-card)] hover:shadow-lg transition-all group">
      <div className="w-16 h-16 bg-[var(--bg-card)] rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
        <BadgeIcon name={icon} size={32} />
      </div>
      <div>
        <p className="font-black text-[var(--text-primary)]">{name}</p>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
