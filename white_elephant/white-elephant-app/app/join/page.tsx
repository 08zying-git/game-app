'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinGamePage() {
  const router = useRouter();
  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First, find game by code
      const res = await fetch(`/api/games/by-code/${gameCode}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Game not found');
        return;
      }

      const { game } = await res.json();

      // Then join the game
      const joinRes = await fetch(`/api/games/${game.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode }),
      });

      if (!joinRes.ok) {
        const data = await joinRes.json();
        setError(data.error || 'Failed to join game');
        return;
      }

      // Store flag that user just joined this game
      sessionStorage.setItem(`justJoined_${game.id}`, 'true');
      router.push(`/game/${game.id}`);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-green-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Join Game
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="gameCode" className="block text-sm font-medium text-gray-700 mb-1">
              Game Code
            </label>
            <input
              id="gameCode"
              type="text"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              required
              maxLength={6}
              placeholder="ABC123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-2xl font-bold tracking-widest uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={loading || gameCode.length !== 6}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Back to Dashboard
          </button>
        </p>
      </div>
    </div>
  );
}

