import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'manager' | 'player' | 'parent';
  team_name?: string;
  position?: string;
  jersey_number?: number;
  avatar_url?: string;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  event_type: 'match' | 'training' | 'other';
  event_date: string;
  location: string;
  opponent?: string;
  is_home_game?: boolean;
  home_score?: number;
  away_score?: number;
  result?: 'win' | 'loss' | 'draw';
  notes?: string;
  created_at: string;
}

export interface Player {
  id: string;
  full_name: string;
  position: string;
  jersey_number: number;
  avatar_url?: string;
  stats?: PlayerStats;
  parent_id?: string;
}

export interface PlayerStats {
  id: string;
  player_id: string;
  matches_played: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  clean_sheets: number;
  minutes_played: number;
  total_goals?: number;
  total_assists?: number;
  managers_player_count?: number;
  parents_player_count?: number;
}

export interface FieldPlayerPosition {
  player_id: string;
  position_x: number;
  position_y: number;
  jersey_number: number;
}

export type MatchLineup = Lineup & {
  player?: Player;
  player_positions?: FieldPlayerPosition[];
};

export type PlayerPosition = 'Forward' | 'Midfielder' | 'Defender' | 'Goalkeeper' | FieldPlayerPosition;

export interface MediaFile {
  id: string;
  user_id: string;
  file_url: string;
  file_type: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  caption?: string;
  profile?: Profile;
  created_at: string;
}

export interface Lineup {
  id: string;
  event_id: string;
  player_id: string;
  position: string;
  is_starting: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'event' | 'lineup' | 'message' | 'other';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: Profile;
}
