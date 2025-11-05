import { useEffect, useState } from 'react';
import { BarChart3, Trophy, Target, User, Award, Edit3 } from 'lucide-react';
import { supabase, Player, PlayerStats } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { EditPlayerStatsModal } from '../components/stats/EditPlayerStatsModal';

type PlayerWithStats = Player & {
  stats: PlayerStats | null;
};

export function StatsPage() {
  const { profile } = useAuth();
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'goals' | 'assists' | 'matches'>('goals');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerWithStats | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const isManager = profile?.role === 'manager';

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .order('full_name');

      if (playersError) throw playersError;

      const playersWithStats: PlayerWithStats[] = await Promise.all(
        (playersData || []).map(async (player: Player) => {
          const { data: statsData } = await supabase
            .from('player_stats')
            .select('*')
            .eq('player_id', player.id)
            .maybeSingle();

          return {
            ...player,
            stats: statsData || null,
          };
        })
      );

      setPlayers(playersWithStats);
    } catch (error) {
      // console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSortedPlayers = () => {
    return [...players].sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      if (sortBy === 'goals') {
        aValue = a.stats?.total_goals || 0;
        bValue = b.stats?.total_goals || 0;
      } else if (sortBy === 'assists') {
        aValue = a.stats?.total_assists || 0;
        bValue = b.stats?.total_assists || 0;
      } else if (sortBy === 'matches') {
        aValue = a.stats?.matches_played || 0;
        bValue = b.stats?.matches_played || 0;
      }

      return bValue - aValue;
    });
  };

  const getTeamTotals = () => {
    const totals = {
      goals: 0,
      assists: 0,
      matches: 0,
    };

    players.forEach((player) => {
      if (player.stats) {
        totals.goals += player.stats.total_goals;
        totals.assists += player.stats.total_assists;
        totals.matches = Math.max(totals.matches, player.stats.matches_played);
      }
    });

    return totals;
  };

  const handleResetStats = async () => {
    if (!isManager) return;

    setResetting(true);
    try {
      const { error } = await supabase.rpc('reset_all_player_stats');

      if (error) throw error;

      toast.success('All statistics have been reset');
      setShowResetDialog(false);
      await loadStats();
    } catch (error) {
      // console.error('Error resetting stats:', error);
      toast.error('Failed to reset statistics');
    } finally {
      setResetting(false);
    }
  };

  const handleEditStats = (player: PlayerWithStats) => {
    setEditingPlayer(player);
    setShowEditModal(true);
  };

  const handleSaveStats = async (
    playerId: string,
    stats: {
      total_goals: number;
      total_assists: number;
      matches_played: number;
      managers_player_count: number;
      parents_player_count: number;
    }
  ) => {
    if (!isManager) return;

    try {
      const { data: existingStats } = await supabase
        .from('player_stats')
        .select('id')
        .eq('player_id', playerId)
        .maybeSingle();

      if (existingStats) {
        const { error } = await supabase
          .from('player_stats')
          .update({
            total_goals: stats.total_goals,
            total_assists: stats.total_assists,
            matches_played: stats.matches_played,
            managers_player_count: stats.managers_player_count,
            parents_player_count: stats.parents_player_count,
            updated_at: new Date().toISOString(),
          })
          .eq('player_id', playerId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('player_stats').insert({
          player_id: playerId,
          total_goals: stats.total_goals,
          total_assists: stats.total_assists,
          matches_played: stats.matches_played,
          managers_player_count: stats.managers_player_count,
          parents_player_count: stats.parents_player_count,
        });

        if (error) throw error;
      }

      toast.success('Statistics updated successfully');
      await loadStats();
    } catch (error) {
      // console.error('Error saving stats:', error);
      toast.error('Failed to update statistics');
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading statistics...</p>
        </div>
      </div>
    );
  }

  const teamTotals = getTeamTotals();
  const sortedPlayers = getSortedPlayers();

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-28 sm:pb-24">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Statistics</h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">Team and player performance</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">
                Total Goals
              </CardTitle>
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100">
                {teamTotals.goals}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">
                Total Assists
              </CardTitle>
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-green-900 dark:text-green-100">
                {teamTotals.assists}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300">
                Matches Played
              </CardTitle>
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-amber-900 dark:text-amber-100">
                {teamTotals.matches}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={sortBy} onValueChange={(v: string) => setSortBy(v as 'goals' | 'assists' | 'matches')} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-6 sm:mb-8 h-11 sm:h-12">
            <TabsTrigger value="goals" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Goals</span>
              <span className="xs:hidden">G</span>
            </TabsTrigger>
            <TabsTrigger value="assists" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Assists</span>
              <span className="xs:hidden">A</span>
            </TabsTrigger>
            <TabsTrigger value="matches" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Matches</span>
              <span className="xs:hidden">M</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={sortBy} className="space-y-4">
            {sortedPlayers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BarChart3 className="w-16 h-16 text-slate-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">No statistics available yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {sortedPlayers.map((player, index) => {
                  const stats = player.stats;
                  const hasStats = stats && (stats.total_goals > 0 || stats.total_assists > 0 || stats.matches_played > 0);

                  if (!hasStats && sortBy !== 'matches') return null;

                  return (
                    <Card
                      key={player.id}
                      className="hover:shadow-lg hover:scale-[1.01] transition-all duration-200"
                    >
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-3 sm:gap-4">
                            {index < 3 && hasStats && (
                              <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-bold text-lg sm:text-xl ${
                                index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg' :
                                index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-700 shadow-md' :
                                'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-md'
                              }`}>
                                {index + 1}
                              </div>
                            )}

                            <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                              {player.avatar_url ? (
                                <AvatarImage src={player.avatar_url} alt={player.full_name} />
                              ) : (
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg">
                                  {player.jersey_number || <User className="w-6 h-6" />}
                                </AvatarFallback>
                              )}
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                                {player.full_name}
                              </h3>
                              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
                                {player.position || 'Player'}
                                {player.jersey_number && ` • #${player.jersey_number}`}
                              </p>
                            </div>

                            {stats && (stats.managers_player_count > 0 || stats.parents_player_count > 0) && (
                              <div className="flex gap-2">
                                {stats.managers_player_count > 0 && (
                                  <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 shadow-lg border-2 border-amber-200 dark:border-amber-700">
                                    <div className="flex flex-col items-center">
                                      <span className="font-black text-white text-xs sm:text-sm leading-none">M</span>
                                      <span className="font-bold text-white text-[10px] leading-none">{stats.managers_player_count}</span>
                                    </div>
                                  </div>
                                )}
                                {stats.parents_player_count > 0 && (
                                  <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 shadow-lg border-2 border-amber-200 dark:border-amber-700">
                                    <div className="flex flex-col items-center">
                                      <span className="font-black text-white text-xs sm:text-sm leading-none">P</span>
                                      <span className="font-bold text-white text-[10px] leading-none">{stats.parents_player_count}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <div className="flex flex-col items-center gap-1.5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 px-3 py-3 rounded-xl border-2 border-blue-200 dark:border-blue-800/50 shadow-sm hover:shadow-md transition-shadow">
                              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                              <span className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
                                {stats?.total_goals || 0}
                              </span>
                              <span className="text-[10px] sm:text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                                Goals
                              </span>
                            </div>

                            <div className="flex flex-col items-center gap-1.5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 px-3 py-3 rounded-xl border-2 border-green-200 dark:border-green-800/50 shadow-sm hover:shadow-md transition-shadow">
                              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                              <span className="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100">
                                {stats?.total_assists || 0}
                              </span>
                              <span className="text-[10px] sm:text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">
                                Assists
                              </span>
                            </div>

                            <div className="flex flex-col items-center gap-1.5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/30 px-3 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow">
                              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-400" />
                              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {stats?.matches_played || 0}
                              </span>
                              <span className="text-[10px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                Matches
                              </span>
                            </div>
                          </div>

                          {isManager && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditStats(player)}
                              className="gap-2 text-xs h-9 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-blue-950 dark:hover:text-blue-300 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit Statistics
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-8 sm:mt-12 flex justify-center">
          <img
            src="/moorgreen-logo.webp"
            alt="Moorgreen Colts FC Logo"
            className="w-32 h-32 sm:w-48 sm:h-48 object-contain opacity-30"
          />
        </div>
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Statistics?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all player statistics to zero, including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Goals scored</li>
                <li>Assists</li>
                <li>Matches played</li>
                <li>Manager's Player awards</li>
                <li>Parent's Player awards</li>
              </ul>
              <p className="mt-3 font-semibold text-red-600 dark:text-red-400">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetStats}
              disabled={resetting}
              className="bg-red-600 hover:bg-red-700"
            >
              {resetting ? 'Resetting...' : 'Reset All Stats'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingPlayer && (
        <EditPlayerStatsModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          player={editingPlayer}
          stats={editingPlayer.stats}
          onSave={handleSaveStats}
        />
      )}
    </div>
  );
}
