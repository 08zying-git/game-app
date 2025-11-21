'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Game } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserAndGames();
  }, []);

  const fetchUserAndGames = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.push('/login');
        return;
      }
      const userData = await userRes.json();
      setUser(userData.user);

      const gamesRes = await fetch('/api/games');
      if (gamesRes.ok) {
        const gamesData = await gamesRes.json();
        setGames(gamesData.games || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const waitingGames = games.filter(g => g.status === 'waiting');
  const activeGames = games.filter(g => g.status === 'active');
  const endedGames = games.filter(g => g.status === 'ended');

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-gray-800">White Elephant</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Hello, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">My Games</h2>
          <div className="flex space-x-4">
            <Link
              href="/join"
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 font-medium"
            >
              Join Game
            </Link>
            <Link
              href="/create-game"
              className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 font-medium"
            >
              Create New Game
            </Link>
          </div>
        </div>

        {waitingGames.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Waiting to Start</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {waitingGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/game/${game.id}`}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
                >
                  <h4 className="font-semibold text-lg mb-2">{game.name}</h4>
                  <p className="text-gray-600 text-sm mb-2">Code: {game.game_code}</p>
                  <p className="text-gray-500 text-xs">Status: {game.status}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {activeGames.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Active Games</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/game/${game.id}`}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
                >
                  <h4 className="font-semibold text-lg mb-2">{game.name}</h4>
                  <p className="text-gray-600 text-sm mb-2">Code: {game.game_code}</p>
                  <p className="text-green-600 text-xs font-medium">Status: {game.status}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {endedGames.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Completed Games</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {endedGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/game/${game.id}`}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition opacity-75"
                >
                  <h4 className="font-semibold text-lg mb-2">{game.name}</h4>
                  <p className="text-gray-600 text-sm mb-2">Code: {game.game_code}</p>
                  <p className="text-gray-500 text-xs">Status: {game.status}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {games.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">You don't have any games yet.</p>
            <Link
              href="/create-game"
              className="inline-block bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 font-medium"
            >
              Create Your First Game
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

