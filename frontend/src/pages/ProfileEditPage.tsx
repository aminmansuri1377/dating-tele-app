import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function ProfileEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    api.get('/profiles/me').then(({ data }) => setForm(data));
  }, []);

  async function handleSave() {
    await api.put('/profiles/me', form);
    navigate('/settings');
  }

  if (!form) return <div className="p-6">{t('common.loading')}</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">{t('settings.edit_profile')}</h1>
      <input
        className="w-full p-3 rounded-card border border-black/10 dark:border-white/10 bg-transparent"
        value={form.displayName}
        onChange={(e) => setForm({ ...form, displayName: e.target.value })}
        placeholder={t('profile_setup.display_name')}
      />
      <textarea
        className="w-full p-3 rounded-card border border-black/10 dark:border-white/10 bg-transparent"
        rows={3}
        value={form.bio ?? ''}
        onChange={(e) => setForm({ ...form, bio: e.target.value })}
        placeholder={t('profile_setup.bio')}
      />
      <button onClick={handleSave} className="w-full py-3 rounded-full bg-brand text-white font-semibold">
        {t('profile_setup.save')}
      </button>
    </div>
  );
}
