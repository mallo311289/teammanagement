import { useEffect, useState } from 'react';
import { Calendar, Plus, Trophy } from 'lucide-react';
import { supabase, Event } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EventCard } from '../components/schedule/EventCard';
import { CreateEventModal } from '../components/schedule/CreateEventModal';
import { EditEventModal } from '../components/schedule/EditEventModal';
import { EventDetailsModal } from '../components/schedule/EventDetailsModal';
import { MatchScoringModal } from '../components/schedule/MatchScoringModal';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { useToast } from '../hooks/use-toast';

type EventWithStats = Event & {
  availableCount: number;
  totalCount: number;
};

export function FixturesPage() {
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [scoringModalOpen, setScoringModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (eventsError) throw eventsError;

      const eventsWithStats: EventWithStats[] = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { data: availData } = await supabase
            .from('availability')
            .select('status')
            .eq('event_id', event.id);

          const availableCount = availData?.filter((a) => a.status === 'available').length || 0;
          const totalCount = availData?.length || 0;

          return {
            ...event,
            availableCount,
            totalCount,
          };
        })
      );

      setEvents(eventsWithStats);
    } catch (error) {
      // console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setDetailsModalOpen(true);
  };

  const handleEditScore = (event: Event) => {
    setSelectedEvent(event);
    setScoringModalOpen(true);
  };

  const handleEdit = (event: Event) => {
    setSelectedEvent(event);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (event: Event) => {
    setSelectedEvent(event);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEvent) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', selectedEvent.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Event deleted successfully',
      });

      loadEvents();
      setDeleteDialogOpen(false);
      setSelectedEvent(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete event',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading fixtures...</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const upcomingEvents = events.filter((event) => new Date(event.event_date) >= now);
  const pastEvents = events.filter((event) => new Date(event.event_date) < now);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-28 sm:pb-24">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Fixtures</h1>
            </div>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {events.length} {events.length === 1 ? 'event' : 'events'} scheduled
            </p>
          </div>

          {profile?.role === 'manager' && (
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg gap-2 w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              <span className="sm:inline">Add Event</span>
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upcoming' | 'past')} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6 sm:mb-8 h-12">
            <TabsTrigger value="upcoming" className="gap-1.5 sm:gap-2 text-sm sm:text-base">
              <Calendar className="w-4 h-4" />
              <span className="hidden xs:inline">Upcoming</span>
              <span className="xs:hidden">Up</span>
              <span>({upcomingEvents.length})</span>
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-1.5 sm:gap-2 text-sm sm:text-base">
              <Trophy className="w-4 h-4" />
              Past ({pastEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingEvents.length === 0 ? (
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  No upcoming events
                </h3>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mb-6">
                  {profile?.role === 'manager'
                    ? 'Create your first event to get started'
                    : 'Check back later for new events'}
                </p>
                {profile?.role === 'manager' && (
                  <Button
                    onClick={() => setCreateModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 w-full sm:w-auto"
                  >
                    <Plus className="w-5 h-5" />
                    Add First Event
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => handleEventClick(event)}
                    onEditScore={() => handleEditScore(event)}
                    canEditScore={profile?.role === 'manager'}
                    onEdit={() => handleEdit(event)}
                    onDelete={() => handleDeleteClick(event)}
                    canManage={profile?.role === 'manager'}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastEvents.length === 0 ? (
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  No past events
                </h3>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
                  Past events will appear here
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {pastEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => handleEventClick(event)}
                    onEditScore={() => handleEditScore(event)}
                    canEditScore={profile?.role === 'manager'}
                    onEdit={() => handleEdit(event)}
                    onDelete={() => handleDeleteClick(event)}
                    canManage={profile?.role === 'manager'}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-8 sm:mt-12 flex justify-center">
          <img
            src="/moorgreen-logo copy copy.webp"
            alt="Moorgreen Colts FC Logo"
            className="w-32 h-32 sm:w-48 sm:h-48 object-contain opacity-30"
          />
        </div>
      </div>

      {profile?.role === 'manager' && (
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="fixed bottom-24 right-4 sm:bottom-20 sm:right-6 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-95 text-white shadow-2xl transition-all duration-300 z-40 touch-target-min"
          size="icon"
        >
          <Plus className="w-7 h-7 sm:w-8 sm:h-8" />
        </Button>
      )}

      <CreateEventModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={loadEvents}
      />

      <EditEventModal
        event={selectedEvent}
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedEvent(null);
        }}
        onSuccess={loadEvents}
      />

      <EventDetailsModal
        event={selectedEvent}
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedEvent(null);
        }}
        onUpdate={loadEvents}
      />

      <MatchScoringModal
        event={selectedEvent}
        open={scoringModalOpen}
        onClose={() => {
          setScoringModalOpen(false);
          setSelectedEvent(null);
        }}
        onSuccess={loadEvents}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
              {selectedEvent && (
                <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedEvent.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {new Date(selectedEvent.event_date).toLocaleDateString()} at {selectedEvent.location}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
