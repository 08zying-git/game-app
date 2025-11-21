'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateGamePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [maxSteals, setMaxSteals] = useState(3);
  const [allowImmediateStealBack, setAllowImmediateStealBack] = useState(false);
  const [finalStealRound, setFinalStealRound] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          deadline: deadline || null,
          max_steals_per_gift: maxSteals,
          allow_immediate_steal_back: allowImmediateStealBack,
          final_steal_round: finalStealRound,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create game');
        return;
      }

      router.push(`/game/${data.game.id}`);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Create New Game</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-base font-semibold text-black mb-1">
              Game Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="e.g., Christmas 2024 Gift Exchange"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-base font-semibold text-black mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Optional description for your game"
            />
          </div>

          <div>
            <label htmlFor="deadline" className="block text-base font-semibold text-black mb-1">
              Gift Submission Deadline
            </label>
            <input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label htmlFor="maxSteals" className="block text-base font-semibold text-black mb-1">
              Max Steals Per Gift
            </label>
            <input
              id="maxSteals"
              type="number"
              min="1"
              max="10"
              value={maxSteals}
              onChange={(e) => setMaxSteals(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <p className="mt-1 text-xs text-gray-500">How many times a gift can be stolen (default: 3)</p>
          </div>

          <div className="flex items-center">
            <input
              id="allowImmediateStealBack"
              type="checkbox"
              checked={allowImmediateStealBack}
              onChange={(e) => setAllowImmediateStealBack(e.target.checked)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="allowImmediateStealBack" className="ml-2 block text-base text-black">
              Allow immediate steal-back (player can steal back their gift right away)
            </label>
          </div>

          <div className="flex items-center">
            <input
              id="finalStealRound"
              type="checkbox"
              checked={finalStealRound}
              onChange={(e) => setFinalStealRound(e.target.checked)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="finalStealRound" className="ml-2 block text-base text-black">
              Final steal round (Player #1 gets one more chance after all gifts are revealed)
            </label>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


