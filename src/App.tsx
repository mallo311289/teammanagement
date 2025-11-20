import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { PushNotificationProvider } from './contexts/PushNotificationContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { AppShell } from './components/layout/AppShell';
import { NetworkStatus } from './components/layout/NetworkStatus';
import { Toaster } from './components/ui/toaster';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4A6FA5] via-[#5B7DB8] to-[#6B8BC3] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto"></div>
          <p className="text-white text-lg">Loading TeamTrack...</p>
        </div>
      </div>
    );
  }

  return user ? (
    <PushNotificationProvider>
      <NotificationProvider>
        <NetworkStatus />
        <AppShell />
      </NotificationProvider>
    </PushNotificationProvider>
  ) : (
    <AuthScreen />
  );
}

function App() {
  return (
    <AuthProvider>
      <NetworkProvider>
        <AppContent />
        <Toaster />
      </NetworkProvider>
    </AuthProvider>
  );
}

export default App;
