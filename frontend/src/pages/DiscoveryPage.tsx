import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TinderCard from 'react-tinder-card';
import { api } from '../api/client';
import { hapticImpact } from '../telegram/webapp';

interface Candidate {
  userId: string;
  displayName: string;
  age: number;
  city?: string;
  bio?: string;
  user: { photos: { url: string }[] };
}

export default function DiscoveryPage() {
  const { t } = useTranslation();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { data } = await api.get('/discovery/candidates');
      setCandidates(data.candidates);
      setError(null);
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      
      // Handle premium swipe limit error (403 Forbidden)
      if (status === 403 && message?.includes('Upgrade to Premium')) {
        setError(message);
      }
      // Handle daily swipe limit reached (also 403)
      else if (status === 403 && message?.includes('Daily swipe limit')) {
        setError(message);
      }
      // Generic server error (401 handled by API client interceptor)
      else {
        setError(t('common.error'));
      }
    }
  }

  async function onSwipe(direction: 'left' | 'right', candidate: Candidate) {
    hapticImpact('light');
    const action = direction === 'right' ? 'LIKE' : 'PASS';
    try {
      const { data } = await api.post('/likes/swipe', { toUserId: candidate.userId, action });
      if (data.match) {
        hapticImpact('heavy');
        alert(t('matches.new_match')); // replace with a proper match modal in production
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? t('common.error'));
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">{t('discovery.title')}</h1>

      {error && (
        <div className="p-4 rounded-card bg-green-100 text-green-800 border border-green-200 mb-4">
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-1">{t('discovery.upgrade_cta')}</p>
        </div>
      )}

      <div className="relative h-[65vh]">
        {candidates.length === 0 && !error && (
          <p className="text-center text-gray-400 mt-20">{t('discovery.no_more_cards')}</p>
        )}
        {candidates.map((c) => (
          <TinderCard key={c.userId} onSwipe={(dir) => onSwipe(dir as 'left' | 'right', c)} preventSwipe={['up', 'down']}>
            <div
              className="absolute inset-0 rounded-card card-shadow bg-cover bg-center flex items-end p-5 text-white"
              style={{ backgroundImage: `url(${c.user.photos[0]?.url ?? ''})`, backgroundColor: '#333' }}
            >
              <div>
                <h2 className="text-2xl font-bold">
                  {c.displayName}, {c.age}
                </h2>
                {c.city && <p className="text-sm opacity-90">{c.city}</p>}
                {c.bio && <p className="text-sm opacity-80 mt-1 line-clamp-2">{c.bio}</p>}
              </div>
            </div>
          </TinderCard>
        ))}
      </div>
    </div>
  );
}
