import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';
import { Game } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Get all games where user is organizer or participant
    const games = db.prepare(`
      SELECT DISTINCT g.*
      FROM games g
      LEFT JOIN game_participants gp ON g.id = gp.game_id
      WHERE g.organizer_id = ? OR gp.user_id = ?
      ORDER BY g.created_at DESC
    `).all(user.id, user.id) as Game[];

    return NextResponse.json({ games });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching games:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { name, description, deadline, max_steals_per_gift, allow_immediate_steal_back, final_steal_round } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Game name is required' },
        { status: 400 }
      );
    }

    const { generateGameCode } = await import('@/lib/gameLogic');
    const gameCode = generateGameCode();
    const { v4: uuidv4 } = await import('uuid');
    const gameId = uuidv4();

    db.prepare(`
      INSERT INTO games (
        id, organizer_id, name, description, game_code,
        max_steals_per_gift, allow_immediate_steal_back, final_steal_round, deadline
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      gameId,
      user.id,
      name,
      description || null,
      gameCode,
      max_steals_per_gift || 3,
      allow_immediate_steal_back ? 1 : 0,
      final_steal_round ? 1 : 0,
      deadline || null
    );

    // Add organizer as participant
    const { v4: uuidv4Participant } = await import('uuid');
    const participantId = uuidv4Participant();
    db.prepare(`
      INSERT INTO game_participants (id, game_id, user_id)
      VALUES (?, ?, ?)
    `).run(participantId, gameId, user.id);

    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as Game;

    return NextResponse.json({ game }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

