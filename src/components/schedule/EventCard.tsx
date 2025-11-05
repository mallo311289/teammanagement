import { Event } from '@/lib/supabase';
import { Calendar, MapPin, Trophy, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';

interface EventCardProps {
  event: Event & { availableCount?: number; totalCount?: number };
  onClick?: () => void;
  onEditScore?: () => void;
  canEditScore?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
}

export function EventCard({ event, onClick }: EventCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20 shadow-lg hover:bg-white/15 transition-all cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
          {event.event_type === 'match' ? (
            <Trophy className="w-7 h-7 text-white" />
          ) : (
            <Users className="w-7 h-7 text-white" />
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1">{event.title}</h3>
          {event.opponent && (
            <p className="text-white/80 mb-2">vs {event.opponent}</p>
          )}

          <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(event.event_date), 'EEE, d MMM - HH:mm')}</span>
          </div>

          <div className="flex items-center gap-2 text-white/70 text-sm">
            <MapPin className="w-4 h-4" />
            <span>{event.location}</span>
          </div>

          {event.is_home_game !== undefined && (
            <div className="mt-2">
              <Badge className="bg-white/20 text-white border-white/30">
                {event.is_home_game ? 'Home' : 'Away'}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
