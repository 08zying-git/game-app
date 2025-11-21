import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';
import { canStealGift, getGameRules, getAllGiftsRevealed } from '@/lib/gameLogic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const user = await requireAuth();
    const { gameId } = await params;
    const { giftId } = await request.json();

    if (!giftId) {
      return NextResponse.json({ error: 'Gift ID is required' }, { status: 400 });
    }

    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as any;
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status === 'ended') {
      return NextResponse.json({ error: 'Game has ended' }, { status: 400 });
    }
    
    if (game.status !== 'active') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
    }

    // Verify it's the current player's turn
    const participant = db.prepare(`
      SELECT * FROM game_participants WHERE game_id = ? AND user_id = ?
    `).get(gameId, user.id) as any;

    if (!participant || participant.player_number !== game.current_turn) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
    }

    // Check if player owns any gift
    const playerOwnsGift = db.prepare(`
      SELECT id FROM gifts WHERE game_id = ? AND current_owner_id = ?
    `).get(gameId, user.id) as { id: string } | undefined;

    // Check if player previously owned a gift (their gift was stolen)
    const playerPreviouslyOwnedGift = db.prepare(`
      SELECT id FROM gifts WHERE game_id = ? AND previous_owner_id = ?
    `).get(gameId, user.id) as { id: string } | undefined;

    // Check if there are unrevealed gifts
    const unrevealedCount = db.prepare(`
      SELECT COUNT(*) as count FROM gifts WHERE game_id = ? AND is_revealed = 0
    `).get(gameId) as { count: number };

    // Only force reveal if:
    // 1. Player doesn't currently own a gift AND
    // 2. Player previously owned a gift (it was stolen) AND  
    // 3. There are still unrevealed gifts
    // This allows Player 2+ to steal OR reveal on their first turn
    if (!playerOwnsGift && playerPreviouslyOwnedGift && unrevealedCount.count > 0) {
      return NextResponse.json({ 
        error: 'You must reveal a new gift first. Your gift was stolen, so you cannot steal until you reveal a new gift.' 
      }, { status: 400 });
    }

    // Get gift
    const gift = db.prepare('SELECT * FROM gifts WHERE id = ? AND game_id = ?').get(giftId, gameId) as any;
    if (!gift) {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
    }

    // Check if can steal (allows stealing your own gift if someone else currently owns it)
    const rules = getGameRules(gameId);
    if (!canStealGift(gift, user.id, rules)) {
      return NextResponse.json({ error: 'Cannot steal this gift' }, { status: 400 });
    }

    // Steal gift - exchange gifts if stealer already owns one
    const previousOwnerId = gift.current_owner_id;
    
    // Find if the stealing player already owns a gift
    const currentGift = db.prepare(`
      SELECT id FROM gifts WHERE game_id = ? AND current_owner_id = ? AND id != ?
    `).get(gameId, user.id, giftId) as { id: string } | undefined;
    
    if (currentGift && previousOwnerId) {
      // Exchange gifts: stealer gives their current gift to the previous owner
      db.prepare(`
        UPDATE gifts 
        SET current_owner_id = ?, previous_owner_id = ?
        WHERE id = ?
      `).run(previousOwnerId, user.id, currentGift.id);
    }
    
    // Steal the gift (stealer now owns it)
    db.prepare(`
      UPDATE gifts 
      SET current_owner_id = ?, previous_owner_id = ?, steal_count = steal_count + 1
      WHERE id = ?
    `).run(user.id, previousOwnerId, giftId);

    // Record action
    const { v4: uuidv4 } = await import('uuid');
    db.prepare(`
      INSERT INTO game_actions (id, game_id, user_id, action_type, gift_id, previous_owner_id)
      VALUES (?, ?, ?, 'steal', ?, ?)
    `).run(uuidv4(), gameId, user.id, giftId, previousOwnerId);

    // Check if all gifts are revealed before handling turn advancement
    const allRevealed = getAllGiftsRevealed(gameId);
    
    // Check if previous owner now owns a gift (from exchange) or needs to reveal a new one
    const previousOwnerGift = previousOwnerId ? db.prepare(`
      SELECT id FROM gifts WHERE game_id = ? AND current_owner_id = ?
    `).get(gameId, previousOwnerId) as { id: string } | undefined : undefined;
    
    // When a gift is stolen, if previous owner doesn't have a gift, they must reveal a new one
    if (previousOwnerId && !previousOwnerGift) {
      const previousParticipant = db.prepare(`
        SELECT player_number FROM game_participants WHERE game_id = ? AND user_id = ?
      `).get(gameId, previousOwnerId) as any;
      
      if (previousParticipant) {
        // Set turn to previous owner so they can reveal a new gift
        // This ensures player 1 gets the turn if their gift was stolen
        db.prepare(`UPDATE games SET current_turn = ? WHERE id = ?`).run(
          previousParticipant.player_number,
          gameId
        );
      }
    } else if (previousOwnerId && previousOwnerGift) {
      // Previous owner now has a gift from exchange, advance turn normally
      if (!allRevealed) {
        const turnOrder = JSON.parse(game.turn_order || '[]');
        const currentIndex = turnOrder.indexOf(user.id);
        const nextIndex = (currentIndex + 1) % turnOrder.length;
        const nextPlayerId = turnOrder[nextIndex];
        const nextParticipant = db.prepare(`
          SELECT player_number FROM game_participants WHERE game_id = ? AND user_id = ?
        `).get(gameId, nextPlayerId) as any;

        if (nextParticipant) {
          db.prepare(`UPDATE games SET current_turn = ? WHERE id = ?`).run(
            nextParticipant.player_number,
            gameId
          );
        }
      } else {
        // All gifts revealed - ensure player 1 gets final turn
        if (game.final_steal_round) {
          // Final steal round: set turn to player 1
          db.prepare(`UPDATE games SET current_turn = 1 WHERE id = ?`).run(gameId);
        } else {
          // No final steal round: if player 1 didn't steal, set turn to player 1
          // (they can't do anything but this ensures game ends after their turn)
          if (participant.player_number !== 1) {
            db.prepare(`UPDATE games SET current_turn = 1 WHERE id = ?`).run(gameId);
          }
        }
      }
    } else {
      // No previous owner (shouldn't happen for a steal, but handle gracefully)
      // Advance turn normally to next player in order
      if (!allRevealed) {
        const turnOrder = JSON.parse(game.turn_order || '[]');
        const currentIndex = turnOrder.indexOf(user.id);
        const nextIndex = (currentIndex + 1) % turnOrder.length;
        const nextPlayerId = turnOrder[nextIndex];
        const nextParticipant = db.prepare(`
          SELECT player_number FROM game_participants WHERE game_id = ? AND user_id = ?
        `).get(gameId, nextPlayerId) as any;

        if (nextParticipant) {
          db.prepare(`UPDATE games SET current_turn = ? WHERE id = ?`).run(
            nextParticipant.player_number,
            gameId
          );
        }
      } else {
        // All gifts revealed - ensure player 1 gets final turn
        if (game.final_steal_round) {
          // Final steal round: set turn to player 1
          db.prepare(`UPDATE games SET current_turn = 1 WHERE id = ?`).run(gameId);
        } else {
          // No final steal round: if player 1 didn't steal, set turn to player 1
          if (participant.player_number !== 1) {
            db.prepare(`UPDATE games SET current_turn = 1 WHERE id = ?`).run(gameId);
          }
        }
      }
    }

    // Auto-end game if Player 1 just completed their final turn
    const allRevealed = getAllGiftsRevealed(gameId);
    if (allRevealed && participant.player_number === 1) {
      // Player 1 just completed their final steal, end the game
      db.prepare(`
        UPDATE games 
        SET status = 'ended', ended_at = datetime('now')
        WHERE id = ?
      `).run(gameId);
    }

    return NextResponse.json({ message: 'Gift stolen successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error stealing gift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

