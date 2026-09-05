import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

type ProfileForm = {
  displayName: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  genderPref: 'MALE' | 'FEMALE' | 'OTHER' | 'EVERYONE';
  bio?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  interests?: string[];
  spokenLanguages?: string[];
  datingGoal: 'DATING' | 'FRIENDSHIP' | 'CHAT' | 'RELATIONSHIP';
  minAgePref?: number;
  maxAgePref?: number;
  maxDistanceKm?: number;
};

export default function ProfileEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/profiles/me')
      .then(({ data }) => {
        setForm({
          displayName: data.displayName,
          age: data.age,
          gender: data.gender,
          genderPref: data.genderPref,
          bio: data.bio ?? '',
          city: data.city ?? '',
          country: data.country ?? '',
          latitude: data.latitude ?? undefined,
          longitude: data.longitude ?? undefined,
          interests: data.interests ?? [],
          spokenLanguages: data.spokenLanguages ?? [],
          datingGoal: data.datingGoal,
          minAgePref: data.minAgePref,
          maxAgePref: data.maxAgePref,
          maxDistanceKm: data.maxDistanceKm,
        });
      })
      .catch(() => setError('Could not load your profile.'));
  }, []);

  async function handleSave() {
    if (!form || saving) return;
    try {
      setError(null);
      setSaving(true);
      await api.put('/profiles/me', form);
      navigate('/settings');
    } catch (err: any) {
      setError(err?.response?.data?.message?.message ?? err?.response?.data?.message ?? 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <div className="p-6">{error ?? t('common.loading')}</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">{t('settings.edit_profile')}</h1>
      <input
        className="w-full p-3 rounded-card border border-black/10 dark:border-white/10 bg-transparent"
        value={form.displayName}
        maxLength={50}
        onChange={(e) => setForm({ ...form, displayName: e.target.value })}
        placeholder={t('profile_setup.display_name')}
      />
      <textarea
        className="w-full p-3 rounded-card border border-black/10 dark:border-white/10 bg-transparent"
        rows={3}
        maxLength={500}
        value={form.bio ?? ''}
        onChange={(e) => setForm({ ...form, bio: e.target.value })}
        placeholder={t('profile_setup.bio')}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        onClick={() => void handleSave()}
        disabled={saving}
        className="w-full py-3 rounded-full bg-brand text-white font-semibold disabled:opacity-50"
      >
        {saving ? t('common.loading') : t('profile_setup.save')}
      </button>
    </div>
  );
}
