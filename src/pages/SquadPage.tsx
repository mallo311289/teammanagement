import { useEffect, useState } from 'react';
import { Users, Plus, UserPlus } from 'lucide-react';
import { supabase, Player } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PlayerCard } from '../components/squad/PlayerCard';
import { AddPlayerModal } from '../components/squad/AddPlayerModal';
import { EditPlayerModal } from '../components/squad/EditPlayerModal';
import { Button } from '../components/ui/button';

export function SquadPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [addPlayerModalOpen, setAddPlayerModalOpen] = useState(false);
  const [editPlayerModalOpen, setEditPlayerModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('jersey_number', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      // console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupPlayersByPosition = () => {
    const positions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'] as const;
    const grouped: Record<string, Player[]> = {
      Goalkeeper: [],
      Defender: [],
      Midfielder: [],
      Forward: [],
      Other: [],
    };

    players.forEach((player) => {
      if (player.position && positions.includes(player.position)) {
        grouped[player.position].push(player);
      } else {
        grouped.Other.push(player);
      }
    });

    return grouped;
  };

  const handleEditPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setEditPlayerModalOpen(true);
  };

  const canEditPlayer = (player: Player) => {
    if (profile?.role === 'manager') return true;
    if (profile?.role === 'parent' && player.parent_id === profile.id) return true;
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
          <p className="text-white font-medium">Loading squad...</p>
        </div>
      </div>
    );
  }

  const groupedPlayers = groupPlayersByPosition();

  return (
    <div className="min-h-screen pb-28 sm:pb-24">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-white" />
              <h1 className="text-4xl font-bold text-white">Squad</h1>
            </div>
            <p className="text-white/70 text-lg">
              {players.length} {players.length === 1 ? 'player' : 'players'} in the team
            </p>
          </div>

          {profile?.role === 'manager' && (
            <Button
              onClick={() => setAddPlayerModalOpen(true)}
              className="bg-white text-[#4A6FA5] hover:bg-white/90 shadow-lg gap-2 transition-all"
            >
              <UserPlus className="w-5 h-5" />
              Add Player
            </Button>
          )}
        </div>

        {players.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 text-center border border-white/20 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <Users className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No players yet
            </h3>
            <p className="text-white/70 mb-6">
              {profile?.role === 'manager'
                ? 'Add your first player to get started'
                : 'Check back later when players are added'}
            </p>
            {profile?.role === 'manager' && (
              <Button
                onClick={() => setAddPlayerModalOpen(true)}
                className="bg-white text-[#4A6FA5] hover:bg-white/90 gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Add First Player
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {(['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Other'] as const).map(
              (position) => {
                const positionPlayers = groupedPlayers[position];
                if (positionPlayers.length === 0) return null;

                return (
                  <div key={position} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-2xl font-bold text-white">
                        {position}s
                      </h2>
                      <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium">
                        {positionPlayers.length}
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {positionPlayers.map((player) => (
                        <PlayerCard
                          key={player.id}
                          player={player}
                          canEdit={canEditPlayer(player)}
                          onEdit={() => handleEditPlayer(player)}
                        />
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}

        <div className="mt-12 flex justify-center animate-in fade-in zoom-in duration-700 delay-300">
          <img
            src="/moorgreen-logo.webp"
            alt="Moorgreen Colts FC Logo"
            className="w-48 h-48 object-contain opacity-40 hover:opacity-60 transition-opacity duration-300"
          />
        </div>
      </div>

      {profile?.role === 'manager' && (
        <Button
          onClick={() => setAddPlayerModalOpen(true)}
          className="fixed bottom-20 right-6 h-16 w-16 rounded-full bg-white text-[#4A6FA5] hover:bg-white/90 shadow-2xl transition-all duration-300 hover:scale-110 z-50"
          size="icon"
        >
          <Plus className="w-8 h-8" />
        </Button>
      )}

      <AddPlayerModal
        open={addPlayerModalOpen}
        onClose={() => setAddPlayerModalOpen(false)}
        onSuccess={loadPlayers}
      />

      <EditPlayerModal
        player={selectedPlayer}
        open={editPlayerModalOpen}
        onClose={() => {
          setEditPlayerModalOpen(false);
          setSelectedPlayer(null);
        }}
        onSuccess={loadPlayers}
      />
    </div>
  );
}
