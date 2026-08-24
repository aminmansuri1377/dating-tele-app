import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getInitData } from './telegram/webapp';
import { api } from './api/client';
import { useAuthStore } from './store/authStore';

import WelcomePage from './pages/WelcomePage';
import LanguageSelectPage from './pages/LanguageSelectPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import DiscoveryPage from './pages/DiscoveryPage';
import MatchesPage from './pages/MatchesPage';
import ChatPage from './pages/ChatPage';
import PremiumPage from './pages/PremiumPage';
import SettingsPage from './pages/SettingsPage';
import ProfileEditPage from './pages/ProfileEditPage';
import BottomNav from './components/BottomNav';

export default function App() {
  const { accessToken, setSession, needsProfileSetup } = useAuthStore();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        const initData = getInitData();
        const { data } = await api.post('/auth/telegram', { initData });
        setSession(data.accessToken, data.user.id, data.needsProfileSetup);
      } catch (err) {
        console.error('Telegram auth failed', err);
      } finally {
        setBooting(false);
      }
    }
    bootstrap();
  }, []);

  if (booting) {
    return <div className="h-screen flex items-center justify-center text-brand">Loading…</div>;
  }

  if (!accessToken) {
    return <WelcomePage />;
  }

  if (needsProfileSetup) {
    return (
      <Routes>
        <Route path="/language" element={<LanguageSelectPage />} />
        <Route path="*" element={<ProfileSetupPage />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen pb-16 bg-surface-light dark:bg-surface-dark text-black dark:text-white">
      <Routes>
        <Route path="/" element={<DiscoveryPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/chat/:matchId" element={<ChatPage />} />
        <Route path="/premium" element={<PremiumPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile/edit" element={<ProfileEditPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
