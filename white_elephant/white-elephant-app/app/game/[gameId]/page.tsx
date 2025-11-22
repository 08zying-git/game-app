'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Game, Gift, GameParticipant } from '@/types';
import GameLobby from '@/components/GameSetup/GameLobby';
import GiftGrid from '@/components/Game/GiftGrid';
import TurnIndicator from '@/components/Game/TurnIndicator';
import { GameRules } from '@/types';

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<Game | null>(null);
  const [participants, setParticipants] = useState<Array<GameParticipant & { name: string; email: string }>>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [currentPlayerNumber, setCurrentPlayerNumber] = useState<number | undefined>();
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [rules, setRules] = useState<GameRules>({ max_steals_per_gift: 3, allow_immediate_steal_back: false, final_steal_round: false });
  const [readyToEnd, setReadyToEnd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchGameData();
    
    // Check if user just joined this game
    if (typeof window !== 'undefined') {
      const justJoined = sessionStorage.getItem(`justJoined_${gameId}`);
      if (justJoined === 'true') {
        setShowWelcomeBanner(true);
        // Clear the flag so banner doesn't show again on refresh
        sessionStorage.removeItem(`justJoined_${gameId}`);
      }
    }
    
    // Poll for updates every 2 seconds (will be replaced with WebSocket later)
    const interval = setInterval(fetchGameData, 2000);
    return () => clearInterval(interval);
  }, [gameId]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUserId(data.user?.id);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  const fetchGameData = async () => {
    try {
      const res = await fetch(`/api/games/${gameId}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        setError('Failed to load game');
        return;
      }

      const data = await res.json();
      setGame(data.game);
      setParticipants(data.participants || []);
      setGifts(data.gifts || []);
      setCurrentPlayerNumber(data.currentPlayerNumber);
      setIsOrganizer(data.isOrganizer);
      setRules(data.rules || { max_steals_per_gift: 3, allow_immediate_steal_back: false, final_steal_round: false });
      setReadyToEnd(data.readyToEnd || false);
    } catch (err) {
      console.error('Error fetching game:', err);
      setError('Failed to load game');
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    try {
      const res = await fetch(`/api/games/${gameId}/start`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to start game');
        return;
      }

      fetchGameData();
    } catch (err) {
      setError('Failed to start game');
    }
  };

  const handleRevealGift = async (giftId: string) => {
    try {
      const res = await fetch(`/api/games/${gameId}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to reveal gift');
        return;
      }

      fetchGameData();
    } catch (err) {
      setError('Failed to reveal gift');
    }
  };

  const handleStealGift = async (giftId: string) => {
    try {
      const res = await fetch(`/api/games/${gameId}/steal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to steal gift');
        return;
      }

      fetchGameData();
    } catch (err) {
      setError('Failed to steal gift');
    }
  };

  const handleEndGame = async () => {
    if (!confirm('Are you sure you want to end the game? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/games/${gameId}/end`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to end game');
        return;
      }

      fetchGameData();
    } catch (err) {
      setError('Failed to end game');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading game...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Game not found</div>
      </div>
    );
  }

  const ownerNames: Record<string, string> = {};
  participants.forEach(p => {
    ownerNames[p.user_id] = p.name;
  });

  const revealedGifts = gifts.filter(g => g.is_revealed === 1 || g.is_revealed === true);
  const unrevealedGifts = gifts.filter(g => g.is_revealed === 0 || g.is_revealed === false);
  const isCurrentPlayer = currentPlayerNumber === game.current_turn;
  const allGiftsRevealed = unrevealedGifts.length === 0;

  // Get current user ID from participants (for gameplay)
  // Use the current user's ID (from currentUserId state) for permission checks
  // But also get the player whose turn it is for display purposes
  const currentPlayerUserId = currentUserId; // Use the actual current user's ID
  const turnPlayerUserId = participants.find(p => p.player_number === game.current_turn)?.user_id;
  
  // Check if only one gift remains and it's the current player's own gift
  const onlyMyGiftRemains = Boolean(
    unrevealedGifts.length === 1 && 
    currentPlayerUserId && 
    unrevealedGifts[0].user_id === currentPlayerUserId
  );

  const canStealGiftClient = (gift: Gift): boolean => {
    if (!currentPlayerUserId) return false;
    
    // Check if player's gift was stolen and they must reveal
    const playerOwnsAnyGift = gifts.some(g => g.current_owner_id === currentPlayerUserId);
    const playerPreviouslyOwned = gifts.some(g => g.previous_owner_id === currentPlayerUserId);
    const mustReveal = isCurrentPlayer && !playerOwnsAnyGift && playerPreviouslyOwned && unrevealedGifts.length > 0;
    
    // If player must reveal (their gift was stolen), they cannot steal
    if (mustReveal) return false;
    
    // Can't steal own gift (if you currently own it)
    if (gift.current_owner_id === currentPlayerUserId) return false;
    
    // Can't steal if max steals reached
    if (gift.steal_count >= rules.max_steals_per_gift) return false;
    
    // Can't steal unrevealed gifts
    if (!gift.is_revealed || gift.is_revealed === 0) return false;
    
    return true;
  };

  const canRevealGiftClient = (gift: Gift): boolean => {
    if (!currentPlayerUserId) return false;
    // Can reveal if it's not your gift, OR if it's the only remaining gift and it's yours
    if (gift.user_id === currentPlayerUserId) {
      return onlyMyGiftRemains;
    }
    return true;
  };

  // Check if current player doesn't own any gift AND previously owned one (their gift was stolen)
  const playerOwnsGift = gifts.some(g => g.current_owner_id === currentPlayerUserId);
  const playerPreviouslyOwnedGift = gifts.some(g => g.previous_owner_id === currentPlayerUserId);
  const needsToReveal = isCurrentPlayer && !playerOwnsGift && playerPreviouslyOwnedGift && unrevealedGifts.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 flex justify-between items-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back to Dashboard
          </button>
          {game.status === 'waiting' && (
            <a
              href={`/game/${gameId}/submit-gift`}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Add Gift
            </a>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {showWelcomeBanner && game && game.name && (
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-400 to-blue-600 border-4 border-blue-700 text-white rounded-xl text-center shadow-lg relative">
            <button
              onClick={() => setShowWelcomeBanner(false)}
              className="absolute top-2 right-2 text-white hover:text-gray-200 text-2xl font-bold"
              aria-label="Close welcome banner"
            >
              ×
            </button>
            <h3 className="text-3xl font-bold mb-2">
              🎉 Welcome to <span className="underline decoration-2 decoration-white">{game.name}</span> game! 🎉
            </h3>
            <p className="text-lg font-semibold">You've successfully joined the game. Have fun!</p>
          </div>
        )}

        {game.status === 'ended' && (
          <div className="mb-6 p-6 bg-gradient-to-r from-green-400 to-green-600 border-4 border-green-700 text-white rounded-xl text-center shadow-lg">
            <h3 className="text-3xl font-bold mb-3">🎉 Game Has Ended! 🎉</h3>
            <p className="text-lg font-semibold">Check out the final results below.</p>
          </div>
        )}

        {game.status === 'waiting' && (
          <GameLobby
            game={game}
            participants={participants}
            gifts={gifts}
            isOrganizer={isOrganizer}
            currentUserId={currentUserId}
            onStartGame={handleStartGame}
          />
        )}

        {game.status === 'active' && (
          <div className="space-y-6">
            {needsToReveal && (
              <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🎁</span>
                  <div>
                    <h3 className="text-lg font-semibold text-orange-800 mb-1">
                      Your gift was stolen!
                    </h3>
                    <p className="text-sm text-orange-700">
                      Please reveal a new gift from the unrevealed gifts below.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isOrganizer && readyToEnd && (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800 mb-1">
                      🎯 Game Ready to End
                    </h3>
                    <p className="text-sm text-yellow-700">
                      All gifts have been revealed{rules.final_steal_round ? ' and the final steal round is complete' : ''}. 
                      Click the button below to officially end the game.
                    </p>
                  </div>
                  <button
                    onClick={handleEndGame}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold text-lg whitespace-nowrap ml-4"
                  >
                    End Game
                  </button>
                </div>
              </div>
            )}

            <TurnIndicator
              currentTurn={game.current_turn || 1}
              currentPlayerNumber={currentPlayerNumber}
              participants={participants}
            />

            <GiftGrid
              gifts={gifts}
              revealedGifts={revealedGifts}
              unrevealedGifts={unrevealedGifts}
              isCurrentPlayer={isCurrentPlayer}
              currentPlayerId={currentUserId || ''}
              canStealGift={canStealGiftClient}
              canRevealGift={canRevealGiftClient}
              onReveal={handleRevealGift}
              onSteal={handleStealGift}
              ownerNames={ownerNames}
              currentUserId={currentUserId}
            />
          </div>
        )}

        {game.status === 'ended' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Game Ended!</h2>
            <p className="text-gray-600 mb-6">Final Results:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {revealedGifts.map((gift) => (
                <div key={gift.id} className="bg-gray-50 rounded p-4">
                  <h4 className="font-semibold">{gift.title || 'Untitled Gift'}</h4>
                  <p className="text-sm text-gray-600">
                    Owner: {gift.current_owner_id ? ownerNames[gift.current_owner_id] : 'Unknown'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

