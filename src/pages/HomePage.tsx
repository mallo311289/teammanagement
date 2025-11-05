import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, MapPin, Trophy, Users, ChevronRight, Shield, RefreshCw, Clipboard } from 'lucide-react';
import { supabase, Event } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { EventCardSkeleton } from '../components/ui/loading-skeleton';
import { LineupPickerModal } from '../components/schedule/LineupPickerModal';
import { usePullToRefresh } from '../hooks/use-pull-to-refresh';
import { format } from 'date-fns';

export function HomePage() {
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const [previousMatch, setPreviousMatch] = useState<Event | null>(null);
  const [teamName, setTeamName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [lineupPickerOpen, setLineupPickerOpen] = useState(false);
  const { profile } = useAuth();
  const { notifications } = useNotifications();

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const now = new Date().toISOString();

      const { data: upcomingEvents, error: upcomingError } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', now)
        .order('event_date', { ascending: true })
        .limit(1);

      if (upcomingError) throw upcomingError;
      setNextEvent(upcomingEvents?.[0] || null);

      const { data: pastMatches, error: pastError } = await supabase
        .from('events')
        .select('*')
        .eq('event_type', 'match')
        .lt('event_date', now)
        .not('result', 'is', null)
        .order('event_date', { ascending: false })
        .limit(1);

      if (pastError) throw pastError;
      setPreviousMatch(pastMatches?.[0] || null);

      if (profile) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('team_name')
          .eq('id', profile.id)
          .single();

        if (profileData) {
          setTeamName(profileData.team_name);
        }
      }
    } catch (error) {
      // console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const { containerRef, isPulling, isRefreshing, pullDistance } = usePullToRefresh(loadHomeData);

  useEffect(() => {
    loadHomeData();
    markEventNotificationsAsRead();
  }, []);

  const markEventNotificationsAsRead = async () => {
    if (!profile) return;

    const eventNotificationIds = notifications
      .filter((n) => !n.is_read && n.type === 'event')
      .map((n) => n.id);

    if (eventNotificationIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', eventNotificationIds);
    }
  };

  const getResultBadge = (result?: 'win' | 'loss' | 'draw') => {
    switch (result) {
      case 'win':
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-4 py-1 transition-all">
            WIN
          </Badge>
        );
      case 'loss':
        return (
          <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-1 transition-all">
            LOSS
          </Badge>
        );
      case 'draw':
        return (
          <Badge className="bg-slate-600 hover:bg-slate-700 text-white font-bold text-sm px-4 py-1 transition-all">
            DRAW
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen overflow-y-auto"
      style={{ transform: `translateY(${pullDistance}px)`, transition: isPulling ? 'none' : 'transform 0.3s ease-out' }}
    >
      {(isPulling || isRefreshing) && (
        <div
          className="flex items-center justify-center py-4 text-white"
          style={{ opacity: Math.min(pullDistance / 60, 1) }}
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="ml-2 text-sm font-medium">
            {isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
          </span>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 pb-28 sm:pb-24">
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome, {profile?.full_name.split(' ')[0] || 'Coach'}!
          </h1>
          <p className="text-white/70 text-lg">Here's what's happening with your team</p>
        </div>

        <div className="space-y-6">
          {loading ? (
            <>
              <EventCardSkeleton />
              <EventCardSkeleton />
            </>
          ) : (
            <>
              {nextEvent ? (
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20 shadow-2xl hover:bg-white/15 hover:shadow-3xl hover:scale-[1.02] transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-white">
                        {nextEvent.event_type === 'match' ? 'Next Match' : 'Next Event'}
                      </h2>
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-white/60 group-hover:translate-x-1 transition-transform" />
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
                      {nextEvent.event_type === 'match' ? (
                        <Trophy className="w-8 h-8 text-white" />
                      ) : (
                        <Users className="w-8 h-8 text-white" />
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {nextEvent.title}
                      </h3>
                      {nextEvent.opponent && (
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-white/90 text-lg">vs</span>
                          <span className="text-white/90 text-lg font-semibold">
                            {nextEvent.opponent}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-white/80 mb-2">
                        <CalendarIcon className="w-5 h-5" />
                        <span className="font-medium">
                          {format(new Date(nextEvent.event_date), 'EEE, d MMM - HH:mm')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-white/80">
                        <MapPin className="w-5 h-5" />
                        <span>{nextEvent.location}</span>
                      </div>

                      {nextEvent.event_type === 'match' && nextEvent.is_home_game !== undefined && (
                        <div className="mt-3">
                          <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 transition-colors">
                            {nextEvent.is_home_game ? 'Home' : 'Away'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {profile?.role === 'manager' && nextEvent.event_type === 'match' && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <Button
                        onClick={() => setLineupPickerOpen(true)}
                        className="w-full bg-white text-[#4A6FA5] hover:bg-white/90 font-semibold transition-all"
                      >
                        <Clipboard className="w-5 h-5 mr-2" />
                        Pick Starting Lineup
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <EmptyState
                    icon={CalendarIcon}
                    title="No Upcoming Events"
                    description="There are no events scheduled yet. Check back later for updates!"
                    className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20"
                  />
                </div>
              )}

              {previousMatch && previousMatch.result ? (
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20 shadow-2xl hover:bg-white/15 hover:shadow-3xl hover:scale-[1.02] transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Recent Result</h2>
                    {getResultBadge(previousMatch.result)}
                  </div>

                  <div className="flex items-baseline justify-center gap-8 mb-6">
                    <div className="text-center flex-1">
                      <div className="text-6xl font-bold text-white mb-2 leading-none">
                        {previousMatch.is_home_game
                          ? previousMatch.home_score
                          : previousMatch.away_score}
                      </div>
                      <p className="text-white/70 font-medium">
                        {previousMatch.is_home_game ? teamName || 'Home' : previousMatch.opponent}
                      </p>
                    </div>

                    <div className="text-4xl font-bold text-white/60 leading-none">-</div>

                    <div className="text-center flex-1">
                      <div className="text-6xl font-bold text-white mb-2 leading-none">
                        {previousMatch.is_home_game
                          ? previousMatch.away_score
                          : previousMatch.home_score}
                      </div>
                      <p className="text-white/70 font-medium">
                        {previousMatch.is_home_game ? previousMatch.opponent : teamName || 'Home'}
                      </p>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-white/60 text-sm">
                      {format(new Date(previousMatch.event_date), 'EEEE, d MMMM')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                  <EmptyState
                    icon={Shield}
                    title="No Recent Results"
                    description="Match results will appear here once games are completed and scored."
                    className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-12 flex justify-center animate-in fade-in zoom-in duration-700 delay-300">
          <img
            src="/moorgreen-colts-fc-logo.webp"
            alt="Moorgreen Colts FC Logo"
            className="w-48 h-48 object-contain opacity-40 hover:opacity-60 transition-opacity duration-300"
          />
        </div>
      </div>

      <LineupPickerModal
        event={nextEvent}
        open={lineupPickerOpen}
        onClose={() => setLineupPickerOpen(false)}
        onSuccess={loadHomeData}
      />
    </div>
  );
}
