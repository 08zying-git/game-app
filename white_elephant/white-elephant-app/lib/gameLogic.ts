import { Gift, GameRules, Game } from '@/types';
import db from './db';

export function canStealGift(
  gift: Gift,
  currentPlayerId: string,
  gameRules: GameRules
): boolean {
  // Can't steal own gift (if you currently own it)
  if (gift.current_owner_id === currentPlayerId) return false;
  
  // Can't steal if max steals reached
  if (gift.steal_count >= gameRules.max_steals_per_gift) return false;
  
  // Can't steal unrevealed gifts
  if (!gift.is_revealed || gift.is_revealed === 0) return false;
  
  // Players can steal any gift as long as it hasn't exceeded max steals
  // No restriction on stealing back immediately - players can steal any revealed gift
  
  return true;
}

export function getRevealedGifts(gameId: string): Gift[] {
  const gifts = db.prepare(`
    SELECT * FROM gifts 
    WHERE game_id = ? AND is_revealed = 1
    ORDER BY created_at
  `).all(gameId) as Gift[];
  
  return gifts;
}

export function getUnrevealedGifts(gameId: string): Gift[] {
  const gifts = db.prepare(`
    SELECT * FROM gifts 
    WHERE game_id = ? AND is_revealed = 0
    ORDER BY created_at
  `).all(gameId) as Gift[];
  
  return gifts;
}

export function getAllGiftsRevealed(gameId: string): boolean {
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM gifts WHERE game_id = ? AND is_revealed = 0
  `).get(gameId) as { count: number };
  
  return count.count === 0;
}

export function getGameRules(gameId: string): GameRules {
  const game = db.prepare(`
    SELECT max_steals_per_gift, allow_immediate_steal_back, final_steal_round
    FROM games WHERE id = ?
  `).get(gameId) as Game;
  
  return {
    max_steals_per_gift: game.max_steals_per_gift || 3,
    allow_immediate_steal_back: game.allow_immediate_steal_back === 1,
    final_steal_round: game.final_steal_round === 1,
  };
}

export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Check if code already exists
  const existing = db.prepare('SELECT id FROM games WHERE game_code = ?').get(code);
  if (existing) {
    return generateGameCode(); // Recursively generate until unique
  }
  
  return code;
}

/**
 * Check if a game is ready to be ended (all conditions met for ending)
 * Game should always end after player 1's final turn.
 * This does NOT actually end the game - it just checks if it's ready
 */
export function isGameReadyToEnd(gameId: string): boolean {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as Game;
  if (!game || game.status !== 'active') {
    return false; // Only active games can be ready to end
  }

  const allRevealed = getAllGiftsRevealed(gameId);
  
  if (!allRevealed) {
    return false; // Game can't end if not all gifts are revealed
  }

  // Get player 1's user ID
  const player1Participant = db.prepare(`
    SELECT user_id FROM game_participants WHERE game_id = ? AND player_number = 1
  `).get(gameId) as { user_id: string } | undefined;
  
  if (!player1Participant) {
    return false; // Can't end if player 1 doesn't exist
  }

  // Get the last action to see if player 1 just completed their turn
  const lastAction = db.prepare(`
    SELECT user_id, action_type 
    FROM game_actions 
    WHERE game_id = ? 
    ORDER BY timestamp DESC 
    LIMIT 1
  `).get(gameId) as { user_id: string; action_type: string } | undefined;

  // Game is ready to end if:
  // 1. All gifts are revealed
  // 2. The last action was taken by player 1 (player 1 has completed their final turn)
  if (lastAction && lastAction.user_id === player1Participant.user_id) {
    return true;
  }

  // Special case: If all gifts are revealed and it's player 1's turn,
  // and final steal round is NOT enabled, player 1 can't reveal (all revealed)
  // so the game is ready to end (player 1 has "had their turn" even though they can't act)
  if (!game.final_steal_round && game.current_turn === 1) {
    return true;
  }

  // Special case: If final steal round is enabled and it's player 1's turn,
  // check if player 1 can steal any gift. If they can't, they've effectively "passed"
  // and the game is ready to end
  if (game.final_steal_round && game.current_turn === 1) {
    // Check if player 1 can steal any revealed gift
    const revealedGifts = getRevealedGifts(gameId);
    const rules = getGameRules(gameId);
    const canStealAny = revealedGifts.some(gift => 
      canStealGift(gift, player1Participant.user_id, rules)
    );
    
    // If player 1 can't steal any gift, they've "had their turn" (passed)
    // and the game is ready to end
    if (!canStealAny) {
      return true;
    }
    
    // If player 1 can steal but hasn't taken an action yet, game is NOT ready to end
    return false;
  }

  // Otherwise, player 1 hasn't completed their final turn yet
  return false;
}

/**
 * Legacy function - kept for compatibility but no longer automatically ends games
 * Games must now be manually ended by the organizer
 */
export function checkAndUpdateGameStatus(gameId: string): void {
  // This function no longer automatically ends games
  // Games are now manually ended by the organizer via the end game endpoint
  // Keeping this function for backward compatibility but it does nothing
}

