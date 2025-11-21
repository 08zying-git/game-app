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
    const { gameCode } = await request.json();

    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as any;
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Verify game code
    if (game.game_code !== gameCode) {
      return NextResponse.json({ error: 'Invalid game code' }, { status: 400 });
    }

    // Check if game has started
    if (game.status !== 'waiting') {
      return NextResponse.json({ error: 'Game has already started' }, { status: 400 });
    }

    // Check if already a participant
    const existing = db.prepare(`
      SELECT id FROM game_participants WHERE game_id = ? AND user_id = ?
    `).get(gameId, user.id);
    if (existing) {
      return NextResponse.json({ error: 'Already a participant' }, { status: 400 });
    }

    // Add participant
    const { v4: uuidv4 } = await import('uuid');
    const participantId = uuidv4();
    db.prepare(`
      INSERT INTO game_participants (id, game_id, user_id)
      VALUES (?, ?, ?)
    `).run(participantId, gameId, user.id);

    return NextResponse.json({ message: 'Successfully joined game' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error joining game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

