import { useState, useRef, useEffect } from 'react';
import { User, Mail, Shield, Users, LogOut, Settings, Bell, MessageSquare, Calendar as CalendarIcon, Camera, Edit2, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { useToast } from '../hooks/use-toast';
import { supabase, Player } from '../lib/supabase';
import { EditPlayerModal } from '../components/squad/EditPlayerModal';
import { EditProfileModal } from '../components/profile/EditProfileModal';

export function ProfilePage() {
  const { profile, signOut, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyAnnouncements, setNotifyAnnouncements] = useState(true);
  const [notifyEvents, setNotifyEvents] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editingChildren, setEditingChildren] = useState(false);
  const [savingChildren, setSavingChildren] = useState(false);
  const [squadPlayers, setSquadPlayers] = useState<Player[]>([]);
  const [linkedPlayers, setLinkedPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && (profile?.role === 'parent' || profile?.role === 'manager')) {
      loadSquadPlayers();
      loadLinkedPlayers();
    }
  }, [profile, user]);

  const loadSquadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setSquadPlayers(data || []);
    } catch (error) {
      // console.error('Error loading squad players:', error);
    }
  };

  const loadLinkedPlayers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('parent_id', user.id);

      if (error) throw error;
      setLinkedPlayers(data || []);
      setSelectedPlayerIds((data || []).map(p => p.id));
    } catch (error) {
      // console.error('Error loading linked players:', error);
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'File size must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploadingAvatar(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-avatars/${fileName}`;

      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();

      toast({
        title: 'Success',
        description: 'Profile picture updated successfully',
      });
    } catch (error: any) {
      // console.error('Error uploading avatar:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload profile picture',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const togglePlayerSelection = async (playerId: string) => {
    if (!user) return;

    const isCurrentlySelected = selectedPlayerIds.includes(playerId);

    if (!isCurrentlySelected && selectedPlayerIds.length >= 2) {
      toast({
        title: 'Maximum reached',
        description: 'You can only link up to 2 children',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingChildren(true);

      if (isCurrentlySelected) {
        const { error } = await supabase
          .from('players')
          .update({ parent_id: null })
          .eq('id', playerId);

        if (error) throw error;

        const newSelectedIds = selectedPlayerIds.filter(id => id !== playerId);
        setSelectedPlayerIds(newSelectedIds);

        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ parent_of: newSelectedIds })
          .eq('id', user.id);

        if (profileUpdateError) throw profileUpdateError;
      } else {
        const { error } = await supabase
          .from('players')
          .update({ parent_id: user.id })
          .eq('id', playerId);

        if (error) throw error;

        const newSelectedIds = [...selectedPlayerIds, playerId];
        setSelectedPlayerIds(newSelectedIds);

        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ parent_of: newSelectedIds })
          .eq('id', user.id);

        if (profileUpdateError) throw profileUpdateError;
      }

      await loadLinkedPlayers();
      await refreshProfile();

      toast({
        title: 'Success',
        description: isCurrentlySelected ? 'Child unlinked successfully' : 'Child linked successfully',
      });
    } catch (error: any) {
      // console.error('Error updating child link:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update child link',
        variant: 'destructive',
      });
      await loadLinkedPlayers();
    } finally {
      setSavingChildren(false);
    }
  };


  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
    } catch (error) {
      // console.error('Error logging out:', error);
      toast({
        title: 'Error',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive',
      });
      setLoggingOut(false);
    }
  };

  const getAvatarUrl = () => {
    if (profile?.avatar_url) return profile.avatar_url;
    return `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop`;
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A6FA5] via-[#5B7DB8] to-[#6B8BC3] pb-28 sm:pb-24 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-0 shadow-2xl overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-[#4A6FA5] to-[#6B8BC3]"></div>
          <CardContent className="relative pt-0 pb-8">
            <div className="flex flex-col items-center -mt-16">
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
                  <AvatarImage src={getAvatarUrl()} alt={profile.full_name} />
                  <AvatarFallback className="bg-[#4A6FA5] text-white text-3xl font-bold">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-[#4A6FA5] hover:bg-[#3d5c8f] text-white rounded-full flex items-center justify-center shadow-lg transition-all transform group-hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Change profile picture"
                >
                  {uploadingAvatar ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              <h1 className="text-2xl font-bold text-slate-900 mt-4">
                {profile.full_name}
              </h1>

              <div className="flex items-center gap-2 mt-2">
                <Mail className="w-4 h-4 text-slate-500" />
                <p className="text-slate-600">{profile.email}</p>
              </div>

              <Badge
                variant={profile.role === 'manager' ? 'default' : 'secondary'}
                className={`mt-3 px-4 py-1 ${
                  profile.role === 'manager'
                    ? 'bg-[#4A6FA5] hover:bg-[#3d5c8f]'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                <Shield className="w-3 h-3 mr-1" />
                {profile.role === 'manager' ? 'Manager' : 'Parent'}
              </Badge>

              <Button
                variant="outline"
                onClick={() => setEditingProfile(true)}
                className="mt-6 border-2 border-[#4A6FA5] text-[#4A6FA5] hover:bg-[#4A6FA5] hover:text-white"
              >
                <User className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {(profile.role === 'parent' || profile.role === 'manager') && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Users className="w-5 h-5 text-[#4A6FA5]" />
                    My Children
                  </CardTitle>
                  <CardDescription>
                    {profile.role === 'manager'
                      ? 'Link your children to squad players (max 2)'
                      : 'Link your children to squad players (max 2)'}
                  </CardDescription>
                </div>
                {!editingChildren && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingChildren(true)}
                    className="border-[#4A6FA5] text-[#4A6FA5] hover:bg-[#4A6FA5] hover:text-white"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    {linkedPlayers.length === 0 ? 'Link Children' : 'Edit'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingChildren ? (
                <div className="space-y-4">
                  <div className="text-sm text-slate-600 mb-3">
                    Click on a player to link them as your child (max 2). Changes are saved automatically.
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {squadPlayers.map((player) => {
                      const isSelected = selectedPlayerIds.includes(player.id);
                      const isAlreadyLinked = player.parent_id && player.parent_id !== user?.id;

                      return (
                        <button
                          key={player.id}
                          onClick={() => !isAlreadyLinked && togglePlayerSelection(player.id)}
                          disabled={!!isAlreadyLinked}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-[#4A6FA5] bg-blue-50'
                              : isAlreadyLinked
                              ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-12 h-12 border-2 border-white shadow">
                              {player.avatar_url ? (
                                <AvatarImage src={player.avatar_url} alt={player.full_name} />
                              ) : (
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                                  {player.jersey_number || getInitials(player.full_name)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="text-left">
                              <p className="font-semibold text-slate-900">{player.full_name}</p>
                              <p className="text-xs text-slate-500">
                                {player.position || 'Player'} {player.jersey_number ? `• #${player.jersey_number}` : ''}
                              </p>
                              {isAlreadyLinked && (
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  Already linked to another parent
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-[#4A6FA5] flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={() => setEditingChildren(false)}
                      variant="outline"
                      disabled={savingChildren}
                      className="border-[#4A6FA5] text-[#4A6FA5] hover:bg-[#4A6FA5] hover:text-white"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {linkedPlayers.length > 0 ? (
                    <div className="space-y-3">
                      {linkedPlayers.map((player) => (
                        <div
                          key={player.id}
                          className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg border border-blue-100 hover:shadow-md transition-all"
                        >
                          <Avatar className="w-14 h-14 border-2 border-[#4A6FA5] shadow">
                            {player.avatar_url ? (
                              <AvatarImage src={player.avatar_url} alt={player.full_name} />
                            ) : (
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg">
                                {player.jersey_number || getInitials(player.full_name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-bold text-slate-900 text-lg">{player.full_name}</p>
                            <p className="text-sm text-slate-600">
                              {player.position || 'Player'} {player.jersey_number ? `• #${player.jersey_number}` : ''}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingPlayer(player)}
                            className="border-[#4A6FA5] text-[#4A6FA5] hover:bg-[#4A6FA5] hover:text-white"
                          >
                            <Camera className="w-4 h-4 mr-1" />
                            Photo
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Users className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                      <p className="font-medium">No children linked yet</p>
                      <p className="text-sm mt-1">Click "Link Children" to select your children from the squad</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Users className="w-5 h-5 text-[#4A6FA5]" />
              Team Information
            </CardTitle>
            <CardDescription>Your team details and join code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-600">Team Name</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {profile.team_name}
                </p>
              </div>
            </div>

            {profile.role === 'manager' && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div>
                  <p className="text-sm font-medium text-blue-600">Team Join Code</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1 tracking-wider">
                    TEAM2024
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Share this code with parents to join
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={() => {
                    navigator.clipboard.writeText('TEAM2024');
                    toast({
                      title: 'Copied!',
                      description: 'Team code copied to clipboard',
                    });
                  }}
                >
                  Copy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Settings className="w-5 h-5 text-[#4A6FA5]" />
              Notification Settings
            </CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <Label htmlFor="notify-messages" className="text-base font-semibold text-slate-900 cursor-pointer">
                    Chat Messages
                  </Label>
                  <p className="text-sm text-slate-600 mt-1">
                    Get notified about new messages in team chat
                  </p>
                </div>
              </div>
              <Switch
                id="notify-messages"
                checked={notifyMessages}
                onCheckedChange={setNotifyMessages}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <Label htmlFor="notify-announcements" className="text-base font-semibold text-slate-900 cursor-pointer">
                    Announcements
                  </Label>
                  <p className="text-sm text-slate-600 mt-1">
                    Get notified about team announcements
                  </p>
                </div>
              </div>
              <Switch
                id="notify-announcements"
                checked={notifyAnnouncements}
                onCheckedChange={setNotifyAnnouncements}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CalendarIcon className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <Label htmlFor="notify-events" className="text-base font-semibold text-slate-900 cursor-pointer">
                    Events & Matches
                  </Label>
                  <p className="text-sm text-slate-600 mt-1">
                    Get notified about new events and schedule changes
                  </p>
                </div>
              </div>
              <Switch
                id="notify-events"
                checked={notifyEvents}
                onCheckedChange={setNotifyEvents}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <Button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-base font-semibold"
            >
              {loggingOut ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="w-5 h-5 mr-2" />
                  Log Out
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-12 flex justify-center animate-in fade-in zoom-in duration-700 delay-300">
          <img
            src="/moorgreen-colts-fc-logo.webp"
            alt="Moorgreen Colts FC Logo"
            className="w-48 h-48 object-contain opacity-40 hover:opacity-60 transition-opacity duration-300"
          />
        </div>
      </div>

      <EditPlayerModal
        player={editingPlayer}
        open={!!editingPlayer}
        onClose={() => setEditingPlayer(null)}
        onSuccess={() => {
          loadLinkedPlayers();
          setEditingPlayer(null);
        }}
      />

      <EditProfileModal
        profile={profile}
        open={editingProfile}
        onClose={() => setEditingProfile(false)}
        onSuccess={() => {
          refreshProfile();
          setEditingProfile(false);
        }}
      />
    </div>
  );
}
