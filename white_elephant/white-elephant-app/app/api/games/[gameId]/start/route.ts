import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const user = await requireAuth();
    const { gameId } = await params;

    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as any;
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Check if user is organizer
    if (game.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Only organizer can start the game' }, { status: 403 });
    }

    // Check if game has already started
    if (game.status !== 'waiting') {
      return NextResponse.json({ error: 'Game has already started' }, { status: 400 });
    }

    // Get all participants
    const participants = db.prepare(`
      SELECT user_id FROM game_participants WHERE game_id = ? ORDER BY joined_at
    `).all(gameId) as { user_id: string }[];

    if (participants.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 participants to start' }, { status: 400 });
    }

    // Check that all participants have submitted gifts
    const gifts = db.prepare(`
      SELECT DISTINCT user_id FROM gifts WHERE game_id = ?
    `).all(gameId) as { user_id: string }[];
    
    const participantIds = new Set(participants.map(p => p.user_id));
    const giftSubmitterIds = new Set(gifts.map(g => g.user_id));
    
    // Check if all participants have submitted at least one gift
    const missingGifts = participants.filter(p => !giftSubmitterIds.has(p.user_id));
    if (missingGifts.length > 0) {
      return NextResponse.json({ 
        error: `All participants must submit gifts before starting. ${missingGifts.length} participant(s) still need to submit gifts.` 
      }, { status: 400 });
    }

    // Shuffle participants for random turn order
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const turnOrder = shuffled.map(p => p.user_id);

    // Assign player numbers
    shuffled.forEach((participant, index) => {
      db.prepare(`
        UPDATE game_participants SET player_number = ? WHERE game_id = ? AND user_id = ?
      `).run(index + 1, gameId, participant.user_id);
    });

    // Update game status
    db.prepare(`
      UPDATE games 
      SET status = 'active', turn_order = ?, current_turn = 1, started_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(turnOrder), gameId);

    return NextResponse.json({ message: 'Game started successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error starting game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

