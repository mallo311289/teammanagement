import { useEffect, useState } from 'react';
import { Calendar, Users as UsersIcon, Save, Check } from 'lucide-react';
import { supabase, Event, Player, MatchLineup, PlayerPosition } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { useToast } from '../hooks/use-toast';
import { format } from 'date-fns';

type Formation = '2-3-1' | '1-3-2-1' | '3-2-1' | '1-2-3-1';

const FORMATIONS: Record<Formation, { name: string; positions: { x: number; y: number }[] }> = {
  '2-3-1': {
    name: '2-3-1',
    positions: [
      { x: 50, y: 90 }, // GK
      { x: 30, y: 70 }, // Def 1
      { x: 70, y: 70 }, // Def 2
      { x: 20, y: 45 }, // Mid 1
      { x: 50, y: 40 }, // Mid 2
      { x: 80, y: 45 }, // Mid 3
      { x: 50, y: 15 }, // Forward
    ],
  },
  '1-3-2-1': {
    name: '1-3-2-1',
    positions: [
      { x: 50, y: 90 }, // GK
      { x: 20, y: 70 }, // Def 1
      { x: 50, y: 75 }, // Def 2
      { x: 80, y: 70 }, // Def 3
      { x: 35, y: 45 }, // Mid 1
      { x: 65, y: 45 }, // Mid 2
      { x: 50, y: 15 }, // Forward
    ],
  },
  '3-2-1': {
    name: '3-2-1',
    positions: [
      { x: 50, y: 90 }, // GK
      { x: 20, y: 65 }, // Def 1
      { x: 50, y: 65 }, // Def 2
      { x: 80, y: 65 }, // Def 3
      { x: 35, y: 40 }, // Mid 1
      { x: 65, y: 40 }, // Mid 2
      { x: 50, y: 15 }, // Forward
    ],
  },
  '1-2-3-1': {
    name: '1-2-3-1',
    positions: [
      { x: 50, y: 90 }, // GK
      { x: 50, y: 72 }, // Def
      { x: 35, y: 55 }, // Mid 1
      { x: 65, y: 55 }, // Mid 2
      { x: 25, y: 30 }, // Att 1
      { x: 50, y: 25 }, // Att 2
      { x: 75, y: 30 }, // Att 3
      { x: 50, y: 10 }, // Forward
    ],
  },
};

export function LineupPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nextMatch, setNextMatch] = useState<Event | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [formation, setFormation] = useState<Formation>('2-3-1');
  const [lineup, setLineup] = useState<MatchLineup | null>(null);
  const [playerPositions, setPlayerPositions] = useState<PlayerPosition[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('event_type', 'match')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(1);

      if (eventsError) throw eventsError;

      if (events && events.length > 0) {
        const match = events[0];
        setNextMatch(match);

        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .order('jersey_number');

        if (playersError) throw playersError;
        setPlayers(playersData || []);

        const { data: lineupData, error: lineupError } = await supabase
          .from('match_lineups')
          .select('*')
          .eq('event_id', match.id)
          .maybeSingle();

        if (!lineupError && lineupData) {
          setLineup(lineupData);

          const positions = lineupData.player_positions as PlayerPosition[];
          const starters = positions.filter((p: any) => !p.is_substitute);

          if (starters.length === 7) {
            setFormation('2-3-1');
          }

          setPlayerPositions(starters);

          const allPlayerIds = positions.map((p: any) => p.player_id);
          const lineupPlayers = (playersData || []).filter((p: Player) => allPlayerIds.includes(p.id));
          setSelectedPlayers(lineupPlayers);
        }

        const { data: availData } = await supabase
          .from('availability')
          .select('user_id, profiles(id)')
          .eq('event_id', match.id)
          .eq('status', 'available');

        if (availData) {
          const availablePlayerIds = availData
            .map((a: any) => a.profiles?.id)
            .filter((id: string | undefined): id is string => id !== undefined);

          const available = (playersData || []).filter((p: Player) =>
            availablePlayerIds.includes(p.parent_id || '')
          );
          setAvailablePlayers(available);
        }
      }
    } catch (error) {
      // console.error('Error loading lineup data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lineup data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormationChange = (newFormation: Formation) => {
    setFormation(newFormation);
    updatePlayerPositions(newFormation, selectedPlayers);
  };

  const updatePlayerPositions = (currentFormation: Formation, players: Player[]) => {
    const formationData = FORMATIONS[currentFormation];
    const positions: PlayerPosition[] = players.slice(0, formationData.positions.length).map((player, index) => ({
      player_id: player.id,
      position_x: formationData.positions[index].x,
      position_y: formationData.positions[index].y,
      jersey_number: player.jersey_number,
    }));
    setPlayerPositions(positions);
  };

  const handlePlayerSelect = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const formationData = FORMATIONS[formation];
    const maxPlayers = formationData.positions.length;

    if (selectedPlayers.find(p => p.id === playerId)) {
      const newSelected = selectedPlayers.filter(p => p.id !== playerId);
      setSelectedPlayers(newSelected);
      updatePlayerPositions(formation, newSelected);
    } else if (selectedPlayers.length < maxPlayers) {
      const newSelected = [...selectedPlayers, player];
      setSelectedPlayers(newSelected);
      updatePlayerPositions(formation, newSelected);
    } else {
      toast({
        title: 'Maximum players reached',
        description: `This formation allows ${maxPlayers} players`,
        variant: 'destructive',
      });
    }
  };

  const handleSaveLineup = async () => {
    if (!nextMatch || !profile) return;

    const formationData = FORMATIONS[formation];
    if (selectedPlayers.length !== formationData.positions.length) {
      toast({
        title: 'Incomplete lineup',
        description: `Please select ${formationData.positions.length} players for this formation`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const lineupData = {
        event_id: nextMatch.id,
        formation,
        player_positions: playerPositions,
        created_by: profile.id,
        is_home_game: nextMatch.is_home_game || true,
      };

      if (lineup) {
        const { error } = await supabase
          .from('match_lineups')
          .update(lineupData)
          .eq('id', lineup.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('match_lineups')
          .insert(lineupData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Lineup saved successfully',
      });

      loadData();
    } catch (error: any) {
      // console.error('Error saving lineup:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save lineup',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading lineup...</p>
        </div>
      </div>
    );
  }

  if (!nextMatch) {
    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-[#4A6FA5] via-[#5B7DB8] to-[#6B8BC3]">
        <Card className="max-w-2xl mx-auto bg-white/95 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-16 h-16 text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
              No Upcoming Matches
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-center">
              There are no upcoming matches to create a lineup for
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formationData = FORMATIONS[formation];
  const requiredPlayers = formationData.positions.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A6FA5] via-[#5B7DB8] to-[#6B8BC3] pb-28 sm:pb-24">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Match Lineup</h1>
            <p className="text-white/80">Set up your team formation</p>
          </div>
          {profile?.role === 'manager' && (
            <Button
              onClick={handleSaveLineup}
              disabled={saving || selectedPlayers.length !== requiredPlayers}
              className="bg-white text-[#4A6FA5] hover:bg-white/90 gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#4A6FA5] border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Lineup
                </>
              )}
            </Button>
          )}
        </div>

        <Card className="mb-6 bg-white/95 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#4A6FA5]">
              <Calendar className="w-5 h-5" />
              NEXT MATCH
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-1">{nextMatch.title}</h3>
                <p className="text-slate-600">
                  {format(new Date(nextMatch.event_date), 'EEE, d MMM • HH:mm')}
                </p>
                <p className="text-sm text-slate-500">{nextMatch.location}</p>
              </div>
              <Badge
                variant={nextMatch.is_home_game ? 'default' : 'secondary'}
                className={nextMatch.is_home_game ? 'bg-green-500' : 'bg-slate-500'}
              >
                {nextMatch.is_home_game ? 'Home' : 'Away'}
              </Badge>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-slate-600">Selected:</span>
              <Badge variant="outline">
                {selectedPlayers.length}/{requiredPlayers} players
              </Badge>
              {availablePlayers.length > 0 && (
                <span className="text-green-600 text-xs">
                  ({availablePlayers.length} available)
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {profile?.role === 'manager' && (
              <Card className="bg-white/95 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-[#4A6FA5]">Formation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {(Object.keys(FORMATIONS) as Formation[]).map((f) => (
                      <Button
                        key={f}
                        onClick={() => handleFormationChange(f)}
                        variant={formation === f ? 'default' : 'outline'}
                        className={formation === f ? 'bg-[#4A6FA5]' : ''}
                      >
                        {f}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-gradient-to-br from-[#3d5c8f] to-[#4A6FA5] border-white/20 p-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-center">Starting XI</CardTitle>
              </CardHeader>
              <div className="relative w-full aspect-[3/4] bg-gradient-to-b from-green-500 to-green-600 rounded-lg shadow-2xl overflow-hidden">
                <div className="absolute inset-0">
                  <div className="absolute left-0 right-0 top-1/2 border-t-2 border-white/40"></div>
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/40 rounded-full"></div>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-32 h-20 border-2 border-t-2 border-white/40 rounded-t-lg"></div>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-20 h-12 border-2 border-t-2 border-white/40 rounded-t"></div>
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 w-32 h-20 border-2 border-b-2 border-white/40 rounded-b-lg"></div>
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 w-20 h-12 border-2 border-b-2 border-white/40 rounded-b"></div>
                </div>

                {playerPositions.map((pos, index) => {
                  const player = players.find(p => p.id === pos.player_id);
                  if (!player) return null;

                  const xPos = (pos as any).position_x ?? (pos as any).x ?? 50;
                  const yPos = (pos as any).position_y ?? (pos as any).y ?? 50;

                  return (
                    <div
                      key={index}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${xPos}%`,
                        top: `${yPos}%`,
                      }}
                    >
                      <div className="relative">
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                          {player.jersey_number || '?'}
                        </div>
                        <Avatar className="w-14 h-14 border-4 border-white shadow-xl">
                          {player.avatar_url ? (
                            <AvatarImage src={player.avatar_url} alt={player.full_name} />
                          ) : (
                            <AvatarFallback className="bg-[#4A6FA5] text-white font-bold">
                              {player.full_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {lineup && lineup.player_positions && (lineup.player_positions as any[]).filter((pos: any) => pos.is_substitute).length > 0 && (
              <Card className="bg-white/95 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#4A6FA5]">
                    <UsersIcon className="w-5 h-5" />
                    Substitutes Bench
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {(lineup.player_positions as any[])
                      .filter((pos: any) => pos.is_substitute)
                      .map((pos: any) => {
                        const player = players.find(p => p.id === pos.player_id);
                        if (!player) return null;
                        return (
                          <div
                            key={player.id}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-orange-50 border-2 border-orange-200 hover:border-orange-300 transition-all"
                          >
                            <Avatar className="w-16 h-16 border-3 border-orange-500">
                              {player.avatar_url ? (
                                <AvatarImage src={player.avatar_url} alt={player.full_name} />
                              ) : (
                                <AvatarFallback className="bg-orange-600 text-white font-bold text-lg">
                                  {player.jersey_number || '?'}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="text-center">
                              <div className="font-semibold text-slate-900 text-sm">
                                {player.full_name}
                              </div>
                              <div className="text-xs text-slate-600">
                                #{player.jersey_number || '?'}
                              </div>
                            </div>
                            <Badge className="bg-orange-600 text-xs">Sub</Badge>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {profile?.role === 'manager' ? (
            <div className="space-y-4">
              <Card className="bg-white/95 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#4A6FA5]">
                    <UsersIcon className="w-5 h-5" />
                    Select Players
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {players.map((player) => {
                      const isSelected = selectedPlayers.find(p => p.id === player.id);
                      const isAvailable = availablePlayers.find(p => p.id === player.id);

                      return (
                        <div
                          key={player.id}
                          onClick={() => handlePlayerSelect(player.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#4A6FA5] text-white'
                              : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Avatar className="w-10 h-10">
                            {player.avatar_url ? (
                              <AvatarImage src={player.avatar_url} alt={player.full_name} />
                            ) : (
                              <AvatarFallback className="bg-slate-300 dark:bg-slate-600">
                                {player.jersey_number || '?'}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-semibold">{player.full_name}</div>
                            <div className={`text-xs ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                              {player.position || 'Player'} • #{player.jersey_number || '?'}
                            </div>
                          </div>
                          {isSelected && <Check className="w-5 h-5" />}
                          {isAvailable && !isSelected && (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                              Available
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              <Card className="bg-white/95 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#4A6FA5]">
                    <UsersIcon className="w-5 h-5" />
                    Starting Lineup
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {playerPositions.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">No lineup set yet</p>
                    ) : (
                      playerPositions.map((pos) => {
                        const player = players.find(p => p.id === pos.player_id);
                        if (!player) return null;
                        return (
                          <div
                            key={player.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200"
                          >
                            <Avatar className="w-10 h-10 border-2 border-green-500">
                              {player.avatar_url ? (
                                <AvatarImage src={player.avatar_url} alt={player.full_name} />
                              ) : (
                                <AvatarFallback className="bg-green-600 text-white font-bold">
                                  {player.jersey_number || '?'}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-semibold text-slate-900">
                                {player.full_name}
                              </div>
                              <div className="text-xs text-slate-600">
                                {player.position || 'Player'} • #{player.jersey_number || '?'}
                              </div>
                            </div>
                            <Badge className="bg-green-600">Starter</Badge>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {lineup && lineup.player_positions && (
                <Card className="bg-white/95 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#4A6FA5]">
                      <UsersIcon className="w-5 h-5" />
                      Substitutes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(lineup.player_positions as any[])
                        .filter((pos: any) => pos.is_substitute)
                        .map((pos: any) => {
                          const player = players.find(p => p.id === pos.player_id);
                          if (!player) return null;
                          return (
                            <div
                              key={player.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200"
                            >
                              <Avatar className="w-10 h-10 border-2 border-orange-500">
                                {player.avatar_url ? (
                                  <AvatarImage src={player.avatar_url} alt={player.full_name} />
                                ) : (
                                  <AvatarFallback className="bg-orange-600 text-white font-bold">
                                    {player.jersey_number || '?'}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-semibold text-slate-900">
                                  {player.full_name}
                                </div>
                                <div className="text-xs text-slate-600">
                                  {player.position || 'Player'} • #{player.jersey_number || '?'}
                                </div>
                              </div>
                              <Badge className="bg-orange-600">Sub</Badge>
                            </div>
                          );
                        })}
                      {(lineup.player_positions as any[]).filter((pos: any) => pos.is_substitute).length === 0 && (
                        <p className="text-center text-slate-500 py-4 text-sm">No substitutes selected</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <div className="mt-12 flex justify-center animate-in fade-in zoom-in duration-700 delay-300">
          <img
            src="/moorgreen-logo copy copy.webp"
            alt="Moorgreen Colts FC Logo"
            className="w-48 h-48 object-contain opacity-40 hover:opacity-60 transition-opacity duration-300"
          />
        </div>
      </div>
    </div>
  );
}
