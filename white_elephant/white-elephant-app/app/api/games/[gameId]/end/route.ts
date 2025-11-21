import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';
import { isGameReadyToEnd } from '@/lib/gameLogic';

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
      return NextResponse.json({ error: 'Only organizer can end the game' }, { status: 403 });
    }

    // Check if game has already ended
    if (game.status === 'ended') {
      return NextResponse.json({ error: 'Game has already ended' }, { status: 400 });
    }

    // Check if game is ready to end
    if (!isGameReadyToEnd(gameId)) {
      return NextResponse.json({ 
        error: 'Game is not ready to end yet. All gifts must be revealed and final steal round (if enabled) must be completed.' 
      }, { status: 400 });
    }

    // End the game
    db.prepare(`
      UPDATE games 
      SET status = 'ended', ended_at = datetime('now') 
      WHERE id = ?
    `).run(gameId);

    return NextResponse.json({ message: 'Game ended successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error ending game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


