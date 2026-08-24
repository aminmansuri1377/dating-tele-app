import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

const GOALS = ['DATING', 'FRIENDSHIP', 'CHAT', 'RELATIONSHIP'] as const;
const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;

export default function ProfileSetupPage() {
  const { t } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const userId = useAuthStore((s) => s.userId)!;

  const [form, setForm] = useState({
    displayName: '',
    age: 18,
    gender: 'MALE' as (typeof GENDERS)[number],
    genderPref: 'EVERYONE',
    bio: '',
    city: '',
    country: '',
    datingGoal: 'CHAT' as (typeof GOALS)[number],
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/profiles/me', form);
      // Profile is complete now — drop needsProfileSetup so App.tsx routes into the main app
      setSession(accessToken, userId, false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen p-6 space-y-4">
      <h1 className="text-xl font-bold">{t('profile_setup.title')}</h1>

      {/* Photo upload grid would call PhotosService.createUploadUrl + confirm per photo — omitted here for brevity */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-card border-2 border-dashed border-black/10 dark:border-white/10 flex items-center justify-center text-2xl text-gray-400">
            +
          </div>
        ))}
      </div>

      <input
        placeholder={t('profile_setup.display_name')}
        className="w-full p-3 rounded-card border border-black/10 dark:border-white/10 bg-transparent"
        value={form.displayName}
        onChange={(e) => setForm({ ...form, displayName: e.target.value })}
      />
      <input
        type="number"
        placeholder={t('profile_setup.age')}
        className="w-full p-3 rounded-card border border-black/10 dark:border-white/10 bg-transparent"
        value={form.age}
        onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
      />

      <div className="flex gap-2">
        {GENDERS.map((g) => (
          <button
            key={g}
            onClick={() => setForm({ ...form, gender: g })}
            className={`flex-1 py-2 rounded-full border ${form.gender === g ? 'bg-brand text-white border-brand' : 'border-black/10 dark:border-white/10'}`}
          >
            {t(`profile_setup.gender_${g.toLowerCase()}`)}
          </button>
        ))}
      </div>

      <textarea
        placeholder={t('profile_setup.bio')}
        className="w-full p-3 rounded-card border border-black/10 dark:border-white/10 bg-transparent"
        rows={3}
        value={form.bio}
        onChange={(e) => setForm({ ...form, bio: e.target.value })}
      />

      <div className="flex gap-2">
        <input
          placeholder={t('profile_setup.city')}
          className="flex-1 p-3 rounded-card border border-black/10 dark:border-white/10 bg-transparent"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />
        <input
          placeholder={t('profile_setup.country')}
          className="flex-1 p-3 rounded-card border border-black/10 dark:border-white/10 bg-transparent"
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
        />
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-2">{t('profile_setup.goal')}</p>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((g) => (
            <button
              key={g}
              onClick={() => setForm({ ...form, datingGoal: g })}
              className={`py-2 rounded-full border ${form.datingGoal === g ? 'bg-brand text-white border-brand' : 'border-black/10 dark:border-white/10'}`}
            >
              {t(`profile_setup.goal_${g.toLowerCase()}`)}
            </button>
          ))}
        </div>
      </div>

      <button
        disabled={saving}
        onClick={handleSave}
        className="w-full py-3 rounded-full bg-brand text-white font-semibold disabled:opacity-50"
      >
        {t('profile_setup.save')}
      </button>
    </div>
  );
}
