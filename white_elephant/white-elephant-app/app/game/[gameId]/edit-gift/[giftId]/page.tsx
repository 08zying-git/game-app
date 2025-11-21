'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Gift } from '@/types';

export default function EditGiftPage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;
  const giftId = params.giftId as string;

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGift();
  }, [giftId]);

  const fetchGift = async () => {
    try {
      const res = await fetch(`/api/gifts/${giftId}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to load gift');
        return;
      }

      const data = await res.json();
      const gift: Gift = data.gift;
      setUrl(gift.url);
      setTitle(gift.title || '');
      setDescription(gift.description || '');
      setImageUrl(gift.image_url || '');
    } catch (err) {
      setError('Failed to load gift');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchMetadata = async () => {
    if (!url) return;

    setLoadingMetadata(true);
    setError('');

    try {
      const res = await fetch('/api/gifts/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch metadata');
        return;
      }

      if (data.metadata) {
        if (data.metadata.title && !title) setTitle(data.metadata.title);
        if (data.metadata.description && !description) setDescription(data.metadata.description);
        if (data.metadata.imageUrl && !imageUrl) setImageUrl(data.metadata.imageUrl);
      }
    } catch (err) {
      setError('Failed to fetch metadata');
    } finally {
      setLoadingMetadata(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/gifts/${giftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          title: title || null,
          description: description || null,
          imageUrl: imageUrl || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update gift');
        return;
      }

      router.push(`/game/${gameId}`);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this gift?')) {
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/gifts/${giftId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete gift');
        return;
      }

      router.push(`/game/${gameId}`);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Edit Your Gift</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              Gift URL *
            </label>
            <div className="flex space-x-2">
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://www.amazon.com/..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="button"
                onClick={handleFetchMetadata}
                disabled={!url || loadingMetadata}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMetadata ? 'Loading...' : 'Auto-fill'}
              </button>
            </div>
          </div>

          {imageUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preview Image
              </label>
              <img
                src={imageUrl}
                alt="Gift preview"
                className="max-w-xs h-auto rounded border border-gray-300"
                onError={() => setImageUrl('')}
              />
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Gift title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Image URL (if auto-fill didn't work)
            </label>
            <input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={submitting || !url}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Updating...' : 'Update Gift'}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/game/${gameId}`)}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>

          <div className="pt-4 border-t">
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="w-full bg-red-800 text-white py-2 px-4 rounded-md hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Deleting...' : 'Delete Gift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


