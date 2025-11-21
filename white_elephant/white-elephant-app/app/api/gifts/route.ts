import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { gameId, url, title, description, imageUrl } = await request.json();

    if (!gameId || !url) {
      return NextResponse.json(
        { error: 'Game ID and URL are required' },
        { status: 400 }
      );
    }

    // Verify game exists and is in waiting status
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as any;
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'waiting') {
      return NextResponse.json({ error: 'Cannot add gifts after game has started' }, { status: 400 });
    }

    // Check if user is a participant
    const participant = db.prepare(`
      SELECT id FROM game_participants WHERE game_id = ? AND user_id = ?
    `).get(gameId, user.id);
    if (!participant) {
      return NextResponse.json({ error: 'Must be a participant to add gifts' }, { status: 403 });
    }

    // Check deadline
    if (game.deadline) {
      const deadline = new Date(game.deadline);
      if (new Date() > deadline) {
        return NextResponse.json({ error: 'Gift submission deadline has passed' }, { status: 400 });
      }
    }

    // Create gift
    const { v4: uuidv4 } = await import('uuid');
    const giftId = uuidv4();
    
    db.prepare(`
      INSERT INTO gifts (id, game_id, user_id, url, title, description, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      giftId,
      gameId,
      user.id,
      url,
      title || null,
      description || null,
      imageUrl || null
    );

    const gift = db.prepare('SELECT * FROM gifts WHERE id = ?').get(giftId);

    return NextResponse.json({ gift }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating gift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


