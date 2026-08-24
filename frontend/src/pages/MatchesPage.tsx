import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function MatchesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    api.get('/matches').then(({ data }) => setMatches(data));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">{t('matches.title')}</h1>
      {matches.length === 0 && <p className="text-gray-400 text-center mt-10">{t('matches.empty')}</p>}
      <div className="space-y-2">
        {matches.map((m) => (
          <button
            key={m.id}
            onClick={() => navigate(`/chat/${m.id}`)}
            className="w-full flex items-center gap-3 p-3 rounded-card border border-black/5 dark:border-white/10 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{m.userA?.profile?.displayName ?? m.userB?.profile?.displayName}</p>
              <p className="text-sm text-gray-500 truncate">{m.messages?.[0]?.content ?? '—'}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
