import { redirect } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-green-50 px-4">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-5xl font-bold mb-4 text-gray-800">
          White Elephant Gift Exchange
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Organize fun gift exchanges with your team or friends
        </p>
        <div className="space-x-4">
          <Link
            href="/login"
            className="inline-block bg-red-600 text-white px-8 py-3 rounded-md hover:bg-red-700 font-medium"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="inline-block bg-white text-red-600 px-8 py-3 rounded-md border-2 border-red-600 hover:bg-red-50 font-medium"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
