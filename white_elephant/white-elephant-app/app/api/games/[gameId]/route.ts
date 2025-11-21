import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';
import { isGameReadyToEnd } from '@/lib/gameLogic';
import { Game, GameParticipant, Gift, User } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const user = await requireAuth();
    const { gameId } = await params;

    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as Game | undefined;
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Check if game is ready to end (but don't end it automatically)
    const readyToEnd = game.status === 'active' ? isGameReadyToEnd(gameId) : false;

    // Check if user is organizer or participant
    const isOrganizer = game.organizer_id === user.id;
    const participant = db.prepare(`
      SELECT * FROM game_participants WHERE game_id = ? AND user_id = ?
    `).get(gameId, user.id) as GameParticipant | undefined;

    if (!isOrganizer && !participant) {
      return NextResponse.json({ error: 'Not authorized to view this game' }, { status: 403 });
    }

    // Get participants
    const participants = db.prepare(`
      SELECT gp.*, u.name, u.email
      FROM game_participants gp
      JOIN users u ON gp.user_id = u.id
      WHERE gp.game_id = ?
      ORDER BY gp.player_number, gp.joined_at
    `).all(gameId) as (GameParticipant & { name: string; email: string })[];

    // Get gifts
    const gifts = db.prepare(`
      SELECT * FROM gifts WHERE game_id = ? ORDER BY created_at
    `).all(gameId) as Gift[];

    // Parse turn order
    let turnOrder: string[] = [];
    if (game.turn_order) {
      try {
        turnOrder = JSON.parse(game.turn_order);
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    // Get game rules
    const rules = {
      max_steals_per_gift: game.max_steals_per_gift || 3,
      allow_immediate_steal_back: (game.allow_immediate_steal_back === 1 || game.allow_immediate_steal_back === true),
      final_steal_round: (game.final_steal_round === 1 || game.final_steal_round === true),
    };

    return NextResponse.json({
      game,
      participants,
      gifts,
      turnOrder,
      isOrganizer,
      currentPlayerNumber: participant?.player_number,
      rules,
      readyToEnd,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

