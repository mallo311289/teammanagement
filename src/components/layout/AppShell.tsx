import { useState, lazy, Suspense } from 'react';
import { BottomNav } from './BottomNav';
import { NotificationDropdown } from './NotificationDropdown';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { PageLoader } from '../ui/page-loader';

const HomePage = lazy(() => import('../../pages/HomePage').then(m => ({ default: m.HomePage })));
const SquadPage = lazy(() => import('../../pages/SquadPage').then(m => ({ default: m.SquadPage })));
const LineupPage = lazy(() => import('../../pages/LineupPage').then(m => ({ default: m.LineupPage })));
const ChatPage = lazy(() => import('../../pages/ChatPage').then(m => ({ default: m.ChatPage })));
const ProfilePage = lazy(() => import('../../pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const MediaPage = lazy(() => import('../../pages/MediaPage').then(m => ({ default: m.MediaPage })));
const FixturesPage = lazy(() => import('../../pages/FixturesPage').then(m => ({ default: m.FixturesPage })));
const StatsPage = lazy(() => import('../../pages/StatsPage').then(m => ({ default: m.StatsPage })));

export function AppShell() {
  const [activeTab, setActiveTab] = useState('home');
  const { profile } = useAuth();

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage />;
      case 'squad':
        return <SquadPage />;
      case 'lineup':
        return <LineupPage />;
      case 'chat':
        return <ChatPage />;
      case 'profile':
        return <ProfilePage />;
      case 'media':
        return <MediaPage />;
      case 'fixtures':
        return <FixturesPage />;
      case 'stats':
        return <StatsPage />;
      default:
        return <HomePage />;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A6FA5] via-[#5B7DB8] to-[#6B8BC3] pb-20 w-full overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 bg-[#4A6FA5]/80 backdrop-blur-md border-b border-white/10 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center overflow-hidden">
              <img
                src="/moorgreen-logo.webp"
                alt="Team Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-white font-medium text-sm">TeamTrack</p>
              <p className="text-white/70 text-xs">{profile?.team_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationDropdown onNavigate={setActiveTab} />
            <button
              onClick={() => setActiveTab('profile')}
              className="ring-2 ring-transparent hover:ring-white/30 transition-all rounded-full"
            >
              <Avatar className="w-10 h-10">
                <AvatarImage
                  src={profile?.avatar_url || undefined}
                  alt={profile?.full_name || 'User'}
                />
                <AvatarFallback className="bg-[#2ECC71] text-white text-sm font-semibold">
                  {profile ? getInitials(profile.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </header>

      <main className="pt-16">
        <Suspense fallback={<PageLoader />}>
          {renderPage()}
        </Suspense>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
