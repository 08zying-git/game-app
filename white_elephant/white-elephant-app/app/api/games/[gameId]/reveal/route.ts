import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';
import { getAllGiftsRevealed } from '@/lib/gameLogic';

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

    // Get gift
    const gift = db.prepare('SELECT * FROM gifts WHERE id = ? AND game_id = ?').get(giftId, gameId) as any;
    if (!gift) {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
    }

    if (gift.is_revealed) {
      return NextResponse.json({ error: 'Gift already revealed' }, { status: 400 });
    }

    // Check if only one gift remains and it's the player's own gift
    const unrevealedGifts = db.prepare(`
      SELECT id, user_id FROM gifts WHERE game_id = ? AND is_revealed = 0
    `).all(gameId) as Array<{ id: string; user_id: string }>;
    const onlyMyGiftRemains = unrevealedGifts.length === 1 && unrevealedGifts[0].user_id === user.id;

    // Cannot reveal your own gift UNLESS it's the only remaining gift
    // Exception: If it's the only remaining gift and it's your own, you can reveal it (even if you already own a gift)
    if (gift.user_id === user.id && !onlyMyGiftRemains) {
      return NextResponse.json({ error: 'You cannot reveal your own gift' }, { status: 400 });
    }

    // Check if player already owns a gift - they can only own one at a time
    // Exception: If this is the only remaining gift and it's their own, allow it
    const currentGift = db.prepare(`
      SELECT id FROM gifts WHERE game_id = ? AND current_owner_id = ? AND id != ?
    `).get(gameId, user.id, giftId) as { id: string } | undefined;
    
    if (currentGift && !onlyMyGiftRemains) {
      return NextResponse.json({ 
        error: 'You already own a gift. You can only own one gift at a time. Steal a gift to exchange it.' 
      }, { status: 400 });
    }

    // Check if this is a "make-up" turn (player got turn back because their gift was stolen)
    // Check BEFORE inserting the reveal action so we can see the last steal action
    const lastAction = db.prepare(`
      SELECT user_id, action_type, previous_owner_id 
      FROM game_actions 
      WHERE game_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `).get(gameId) as { user_id: string; action_type: string; previous_owner_id: string | null } | undefined;
    
    const isMakeupTurn = lastAction && lastAction.action_type === 'steal' && lastAction.previous_owner_id === user.id;

    // Reveal gift and set owner
    db.prepare(`
      UPDATE gifts 
      SET is_revealed = 1, current_owner_id = ?
      WHERE id = ?
    `).run(user.id, giftId);

    // Record action
    const { v4: uuidv4 } = await import('uuid');
    db.prepare(`
      INSERT INTO game_actions (id, game_id, user_id, action_type, gift_id)
      VALUES (?, ?, ?, 'reveal', ?)
    `).run(uuidv4(), gameId, user.id, giftId);

    // Check if all gifts are revealed
    const allRevealed = getAllGiftsRevealed(gameId);
    
    // Advance turn (unless all gifts are revealed, then we might end game or do final steal round)
    if (!allRevealed) {
      
      const turnOrder = JSON.parse(game.turn_order || '[]');
      let nextPlayerId: string;
      
      // If this is a make-up turn (player got turn back because their gift was stolen)
      // After make-up turn, advance to next player after the stealer
      if (isMakeupTurn && lastAction) {
        // This is a make-up turn - advance to next player after the stealer
        const stealerIndex = turnOrder.indexOf(lastAction.user_id);
        const nextIndex = (stealerIndex + 1) % turnOrder.length;
        nextPlayerId = turnOrder[nextIndex];
      } else {
        // Normal turn - advance to next player in order
        const currentIndex = turnOrder.indexOf(user.id);
        const nextIndex = (currentIndex + 1) % turnOrder.length;
        nextPlayerId = turnOrder[nextIndex];
      }
      
      const nextParticipant = db.prepare(`
        SELECT player_number FROM game_participants WHERE game_id = ? AND user_id = ?
      `).get(gameId, nextPlayerId) as any;

      if (nextParticipant) {
        db.prepare(`
          UPDATE games SET current_turn = ? WHERE id = ?
        `).run(nextParticipant.player_number, gameId);
      }
    } else {
      // All gifts revealed - ensure player 1 gets the final turn
      if (game.final_steal_round) {
        // Final steal round enabled: always set turn to player 1 for final steal opportunity
        // This gives player 1 a chance to steal
        db.prepare(`UPDATE games SET current_turn = 1 WHERE id = ?`).run(gameId);
      } else {
        // Final steal round NOT enabled: if player 1 didn't reveal the last gift,
        // we need to ensure they get a turn. But since all gifts are revealed, 
        // they can't reveal. So we check if they already took the last action.
        // If not, we still set turn to player 1 (they can't do anything, but it ensures
        // the game is ready to end after their "turn")
        const player1Participant = db.prepare(`
          SELECT player_number FROM game_participants WHERE game_id = ? AND player_number = 1
        `).get(gameId) as any;
        
        if (player1Participant && participant.player_number !== 1) {
          // Player 1 didn't reveal the last gift, set turn to player 1
          // They can't reveal (all revealed) but this ensures game ends after their turn
          db.prepare(`UPDATE games SET current_turn = 1 WHERE id = ?`).run(gameId);
        }
        // If player 1 already revealed the last gift, turn is already set correctly
      }
      // Game will not end automatically - organizer must manually end it via the end game button
    }

    return NextResponse.json({ message: 'Gift revealed successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error revealing gift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

