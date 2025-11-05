import { Player } from '@/lib/supabase';

interface PlayerCardProps {
  player: Player;
  onClick?: () => void;
  canEdit?: boolean;
  onEdit?: () => void;
}

export function PlayerCard({ player, onClick }: PlayerCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
          {player.jersey_number || '?'}
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg">{player.full_name}</h3>
          <p className="text-white/70">{player.position}</p>
        </div>
      </div>
    </div>
  );
}
