import Database from 'better-sqlite3';
import path from 'path';
import { User, Game, GameParticipant, Gift, GameAction } from '@/types';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'white-elephant.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize database schema
export function initDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Games table
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      organizer_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'waiting',
      turn_order TEXT,
      current_turn INTEGER,
      game_code TEXT UNIQUE NOT NULL,
      max_steals_per_gift INTEGER DEFAULT 3,
      allow_immediate_steal_back INTEGER DEFAULT 0,
      final_steal_round INTEGER DEFAULT 0,
      deadline TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      started_at TEXT,
      ended_at TEXT,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    )
  `);

  // Game participants table
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_participants (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      player_number INTEGER,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(game_id, user_id)
    )
  `);

  // Gifts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS gifts (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT,
      description TEXT,
      image_url TEXT,
      is_revealed INTEGER DEFAULT 0,
      current_owner_id TEXT,
      previous_owner_id TEXT,
      steal_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (current_owner_id) REFERENCES users(id)
    )
  `);

  // Game actions table (for history/audit)
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_actions (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      gift_id TEXT,
      previous_owner_id TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (gift_id) REFERENCES gifts(id)
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_games_organizer ON games(organizer_id);
    CREATE INDEX IF NOT EXISTS idx_games_code ON games(game_code);
    CREATE INDEX IF NOT EXISTS idx_participants_game ON game_participants(game_id);
    CREATE INDEX IF NOT EXISTS idx_participants_user ON game_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_gifts_game ON gifts(game_id);
    CREATE INDEX IF NOT EXISTS idx_gifts_owner ON gifts(current_owner_id);
    CREATE INDEX IF NOT EXISTS idx_actions_game ON game_actions(game_id);
  `);
}

// Initialize on import
initDatabase();

export default db;


