export type GameStatus = 'waiting' | 'active' | 'ended';

export type ActionType = 'reveal' | 'steal';

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

export interface Game {
  id: string;
  organizer_id: string;
  name: string;
  description?: string;
  status: GameStatus;
  turn_order?: string; // JSON array of user IDs
  current_turn?: number; // Player number (1-indexed)
  game_code: string; // Unique code for joining
  max_steals_per_gift?: number;
  allow_immediate_steal_back?: boolean | number; // SQLite returns 0/1
  final_steal_round?: boolean | number; // SQLite returns 0/1
  deadline?: string; // ISO date string
  created_at: string;
  started_at?: string;
  ended_at?: string;
}

export interface GameParticipant {
  id: string;
  game_id: string;
  user_id: string;
  player_number?: number; // 1-indexed
  joined_at: string;
}

export interface Gift {
  id: string;
  game_id: string;
  user_id: string; // Original submitter
  url: string;
  title?: string;
  description?: string;
  image_url?: string;
  is_revealed: boolean | number; // SQLite returns 0/1, but we treat as boolean
  current_owner_id?: string; // Current owner user ID
  previous_owner_id?: string; // Previous owner (for steal-back prevention)
  steal_count: number;
  created_at: string;
}

export interface GameAction {
  id: string;
  game_id: string;
  user_id: string;
  action_type: ActionType;
  gift_id?: string;
  previous_owner_id?: string;
  timestamp: string;
}

export interface GameRules {
  max_steals_per_gift: number;
  allow_immediate_steal_back: boolean;
  final_steal_round: boolean;
}

