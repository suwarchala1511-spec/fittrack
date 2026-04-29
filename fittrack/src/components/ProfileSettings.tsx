import React, { useState } from 'react';
import { User, Camera, Check, X, Loader2, Award, Palette } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { db, doc, updateDoc, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Generate 100 cartoon avatars using DiceBear
const AVATARS = Array.from({ length: 100 }, (_, i) => 
  `https://api.dicebear.com/7.x/adventurer/svg?seed=${i + 100}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
);

const THEMES = [
  { id: 'default', name: 'Standard', color: 'bg-indigo-600', description: 'Clean & Professional' },
  { id: 'jungle', name: 'Jungle Survival', color: 'bg-emerald-700', description: 'Deep Forest Adventure' },
  { id: 'horror', name: 'Nightmare Escape', color: 'bg-red-900', description: 'Run for your life' },
  { id: 'cyberpunk', name: 'Neon City', color: 'bg-fuchsia-600', description: 'Futuristic HUD' },
  { id: 'olympus', name: 'Ancient Olympus', color: 'bg-amber-500', description: 'Train with the Gods' },
] as const;

export default function ProfileSettings() {
  const { user, profile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.photoURL || '');
  const [selectedTheme, setSelectedTheme] = useState(profile?.theme || 'default');
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Sync state when profile loads
  React.useEffect(() => {
    if (profile) {
      if (!displayName) setDisplayName(profile.displayName || '');
      if (!selectedAvatar) setSelectedAvatar(profile.photoURL || '');
      setSelectedTheme(profile.theme || 'default');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        photoURL: selectedAvatar || null,
        theme: selectedTheme
      });
      
      // Apply theme immediately to the document
      document.documentElement.setAttribute('data-theme', selectedTheme);
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error("Profile update error:", error);
      setMessage({ 
        type: 'error', 
        text: error.message?.includes('permission') 
          ? 'Permission denied. Please check your connection.' 
          : 'Failed to update profile. Please try again.' 
      });
      try {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      } catch (e) {
        // Error already logged by handleFirestoreError
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-24 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-2 border",
              message.type === 'success' ? "bg-emerald-600 text-white border-emerald-400" : "bg-red-600 text-white border-red-400"
            )}
          >
            {message.type === 'success' ? <Check size={20} /> : <X size={20} />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] relative">
          <div className="absolute -bottom-12 left-8">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-[var(--bg-card)] p-1 shadow-xl border-4 border-[var(--bg-card)]">
                {selectedAvatar ? (
                  <img 
                    src={selectedAvatar} 
                    alt="Profile" 
                    className="w-full h-full rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-secondary)]">
                    <User size={40} />
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowAvatarPicker(true)}
                className="absolute bottom-0 right-0 p-2 bg-[var(--accent)] text-white rounded-lg shadow-lg hover:opacity-90 transition-all transform group-hover:scale-110"
              >
                <Camera size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-16 pb-8 px-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-black text-[var(--text-primary)]">Profile Settings</h2>
              <p className="text-[var(--text-secondary)]">Manage your identity and how others see you.</p>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-[var(--accent)] text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
              Save Changes
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider opacity-60">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider opacity-60">Email Address</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] cursor-not-allowed outline-none opacity-50"
                />
                <p className="mt-1 text-[10px] text-[var(--text-secondary)] font-medium">Email cannot be changed for security reasons.</p>
              </div>
            </div>

            <div className="bg-[var(--bg-primary)] rounded-2xl p-6 border border-[var(--border)]">
              <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Palette size={18} className="text-[var(--accent)]" />
                App Theme
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-xl border-2 transition-all text-left group",
                      selectedTheme === theme.id 
                        ? "bg-[var(--bg-card)] border-[var(--accent)] shadow-md" 
                        : "bg-[var(--bg-card)]/50 border-transparent hover:border-[var(--accent)]/30"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white shadow-sm", theme.color)}>
                      {selectedTheme === theme.id && <Check size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-[var(--text-primary)] text-sm">{theme.name}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] font-medium">{theme.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[var(--bg-primary)] rounded-2xl p-6 border border-[var(--border)]">
              <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Award size={18} className="text-[var(--accent)]" />
                Account Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">Total Points</span>
                  <span className="font-black text-[var(--accent)]">{profile?.points || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">Badges Earned</span>
                  <span className="font-black text-[var(--accent)]">{profile?.badges?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">Account Type</span>
                  <span className="px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded text-[10px] font-bold uppercase">
                    {profile?.isGuest ? 'Guest' : 'Premium'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[var(--bg-card)] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-[var(--border)]"
          >
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-card)] sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-black text-[var(--text-primary)]">Choose an Avatar</h3>
                <p className="text-sm text-[var(--text-secondary)]">Pick one of our 100 cartoon characters.</p>
              </div>
              <button 
                onClick={() => setShowAvatarPicker(false)}
                className="p-2 hover:bg-[var(--bg-primary)] rounded-xl transition-colors text-[var(--text-secondary)]"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
              {AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedAvatar(url);
                    setShowAvatarPicker(false);
                  }}
                  className={cn(
                    "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95",
                    selectedAvatar === url ? "border-[var(--accent)] ring-4 ring-[var(--accent)]/10" : "border-[var(--border)] hover:border-[var(--accent)]/30"
                  )}
                >
                  <img 
                    src={url} 
                    alt={`Avatar ${idx + 1}`} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {selectedAvatar === url && (
                    <div className="absolute inset-0 bg-[var(--accent)]/10 flex items-center justify-center">
                      <div className="bg-[var(--accent)] text-white rounded-full p-1">
                        <Check size={12} />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
