import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { HomePage } from './pages/HomePage';
import { FixturesPage } from './pages/FixturesPage';
import { LineupPage } from './pages/LineupPage';
import { SquadPage } from './pages/SquadPage';
import { StatsPage } from './pages/StatsPage';
import { MediaPage } from './pages/MediaPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { BottomNav } from './components/layout/BottomNav';
import { Toaster } from './components/ui/toaster';

type Page = 'home' | 'fixtures' | 'lineup' | 'squad' | 'stats' | 'media' | 'profile';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const { user, loading } = useAuth();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'fixtures':
        return <FixturesPage />;
      case 'lineup':
        return <LineupPage />;
      case 'squad':
        return <SquadPage />;
      case 'stats':
        return <StatsPage />;
      case 'media':
        return <MediaPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {renderPage()}
      <BottomNav currentPage={currentPage} onPageChange={setCurrentPage} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
        <Toaster />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
