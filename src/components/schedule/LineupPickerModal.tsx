import { useState, useEffect } from 'react';
import { Event, Player, supabase } from '@/lib/supabase';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LineupPickerModalProps {
  event: Event | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LineupPickerModal({ event, open, onClose, onSuccess }: LineupPickerModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && event) {
      loadPlayers();
      loadExistingLineup();
    }
  }, [open, event]);

  const loadPlayers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'player')
        .order('full_name');

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingLineup = async () => {
    if (!event) return;

    try {
      const { data, error } = await supabase
        .from('lineups')
        .select('player_id')
        .eq('event_id', event.id)
        .eq('is_starting', true);

      if (error) throw error;

      const playerIds = new Set((data || []).map((l) => l.player_id));
      setSelectedPlayers(playerIds);
    } catch (error) {
      console.error('Error loading lineup:', error);
    }
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        if (newSet.size < 11) {
          newSet.add(playerId);
        }
      }
      return newSet;
    });
  };

  const saveLineup = async () => {
    if (!event) return;

    setSaving(true);
    try {
      await supabase.from('lineups').delete().eq('event_id', event.id);

      const lineupData = Array.from(selectedPlayers).map((playerId) => ({
        event_id: event.id,
        player_id: playerId,
        is_starting: true,
        position: 'Forward',
      }));

      const { error } = await supabase.from('lineups').insert(lineupData);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving lineup:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!open || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Pick Starting Lineup</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Selected: {selectedPlayers.size} / 11 players
          </p>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading players...</div>
            ) : players.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No players found</div>
            ) : (
              players.map((player) => {
                const isSelected = selectedPlayers.has(player.id);
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    className={cn(
                      'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all',
                      isSelected
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                        {player.jersey_number || '?'}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{player.full_name}</p>
                        <p className="text-sm text-gray-500">{player.position || 'Player'}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-6 h-6 text-blue-500" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={saveLineup}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={saving || selectedPlayers.size !== 11}
          >
            {saving ? 'Saving...' : 'Save Lineup'}
          </Button>
        </div>
      </div>
    </div>
  );
}
