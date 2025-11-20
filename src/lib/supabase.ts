import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'manager' | 'parent';
  team_name: string;
  avatar_url?: string;
  parent_of?: string[];
  push_subscription?: PushSubscription | null;
  created_at: string;
  updated_at: string;
};

export type PushSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type Event = {
  id: string;
  created_by: string;
  title: string;
  event_type: 'match' | 'training';
  opponent?: string;
  location: string;
  event_date: string;
  notes?: string;
  home_score?: number;
  away_score?: number;
  result?: 'win' | 'loss' | 'draw';
  is_home_game?: boolean;
  created_at: string;
  updated_at: string;
};

export type Availability = {
  id: string;
  event_id: string;
  user_id: string;
  player_id?: string;
  status: 'available' | 'unavailable' | 'maybe' | 'no_response';
  created_at: string;
  updated_at: string;
};

export type AvailabilityWithProfile = Availability & {
  profile: Profile;
};

export type AvailabilityWithPlayer = Availability & {
  player: Player;
};

export type ChatMessage = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profile?: Profile;
};

export type Announcement = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  priority: 'normal' | 'important' | 'urgent';
  created_at: string;
  profile?: Profile;
};

export type Notification = {
  id: string;
  user_id: string;
  type: 'message' | 'announcement' | 'event';
  reference_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type MediaFile = {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: 'image' | 'video';
  file_size: number;
  mime_type: string;
  caption?: string;
  created_at: string;
  profile?: Profile;
};

export type Player = {
  id: string;
  full_name: string;
  jersey_number?: number;
  position?: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';
  date_of_birth?: string;
  email?: string;
  phone?: string;
  parent_id?: string;
  avatar_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type MatchParticipant = {
  id: string;
  event_id: string;
  player_id: string;
  participated: boolean;
  is_managers_player: boolean;
  is_parents_player: boolean;
  created_at: string;
  updated_at: string;
};

export type MatchGoal = {
  id: string;
  event_id: string;
  player_id: string;
  assist_player_id?: string;
  goal_time?: number;
  created_at: string;
  updated_at: string;
};

export type PlayerStats = {
  id: string;
  player_id: string;
  total_goals: number;
  total_assists: number;
  matches_played: number;
  managers_player_count: number;
  parents_player_count: number;
  created_at: string;
  updated_at: string;
};

export type PlayerWithStats = Player & {
  stats?: PlayerStats;
};

export type PlayerPosition = {
  player_id: string;
  position_x: number;
  position_y: number;
  jersey_number?: number;
};

export type MatchLineup = {
  id: string;
  event_id: string;
  formation: string;
  player_positions: PlayerPosition[];
  created_by: string;
  is_home_game: boolean;
  created_at: string;
  updated_at: string;
};
