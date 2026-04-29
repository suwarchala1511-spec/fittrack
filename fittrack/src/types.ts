/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ActivityType = 'walking' | 'running' | 'cycling';

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  duration: number; // in minutes
  distance: number; // in km
  calories: number;
  timestamp: string;
}

export interface FoodIntake {
  id: string;
  userId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: string;
}

export interface SleepRecord {
  id: string;
  userId: string;
  startTime: string;
  endTime: string;
  quality: number; // 1-10
  timestamp: string;
}

export interface Goal {
  id: string;
  userId: string;
  type: 'daily' | 'weekly' | 'monthly';
  category: 'activity' | 'calories' | 'sleep' | 'steps' | 'activity_km';
  target: number;
  current: number;
  points: number;
  completed: boolean;
  deadline: string;
  reminderTime?: string; // HH:mm format
  reminderEnabled?: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  points: number;
  badges?: Badge[];
  dailyGoalProgress: number;
  weeklyGoalProgress: number;
  monthlyGoalProgress: number;
  isGuest?: boolean;
  theme?: 'default' | 'jungle' | 'horror' | 'cyberpunk' | 'olympus';
}

export interface AIInsight {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
  type: 'daily' | 'recommendation';
}
