# White Elephant Gift Exchange App

A web-based application for organizing White Elephant gift exchanges with your team or friends.

## Features

- **User Authentication**: Sign up and login with email/password
- **Game Creation**: Create games with customizable rules
- **Gift Submission**: Submit gifts via URL with automatic metadata extraction
- **Real-time Gameplay**: Turn-based gift exchange with steal mechanics
- **Game Rules**: Configurable rules including max steals, steal-back prevention, and final steal round
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: Next.js 16 with React and TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT-based session management
- **Real-time**: Polling-based updates (Socket.io can be added for true real-time)

## Getting Started

### Prerequisites

- Node.js 16+ (Note: Some packages require Node 18+, but the app should work with Node 16)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (create `.env.local`):
```env
JWT_SECRET=your-secret-key-here
DATABASE_PATH=./data/white-elephant.db
NODE_ENV=development
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
white-elephant-app/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── games/         # Game management endpoints
│   │   └── gifts/         # Gift management endpoints
│   ├── dashboard/         # User dashboard
│   ├── game/              # Game pages
│   ├── login/             # Login page
│   └── signup/            # Signup page
├── components/            # React components
│   ├── Game/              # Gameplay components
│   └── GameSetup/         # Game setup components
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication helpers
│   ├── db.ts             # Database setup
│   └── gameLogic.ts      # Game logic helpers
├── types/                 # TypeScript type definitions
└── public/                # Static assets
```

## Database Schema

The app uses SQLite with the following tables:

- `users`: User accounts
- `games`: Game instances
- `game_participants`: Participants in each game
- `gifts`: Gift submissions
- `game_actions`: Action history for audit trail

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Games
- `GET /api/games` - List user's games
- `POST /api/games` - Create new game
- `GET /api/games/[gameId]` - Get game details
- `POST /api/games/[gameId]/join` - Join a game
- `POST /api/games/[gameId]/start` - Start a game (organizer only)
- `POST /api/games/[gameId]/reveal` - Reveal a gift
- `POST /api/games/[gameId]/steal` - Steal a gift

### Gifts
- `POST /api/gifts` - Submit a gift
- `POST /api/gifts/metadata` - Extract metadata from URL

## Game Flow

1. **Setup**: Organizer creates a game and sets rules
2. **Invitation**: Participants join using the game code
3. **Gift Submission**: Each participant submits a gift URL
4. **Lobby**: Organizer reviews participants and gifts, then starts the game
5. **Gameplay**: Players take turns revealing or stealing gifts
6. **End**: Game ends when all gifts are revealed (and final steal round if enabled)

## Future Enhancements

- WebSocket integration for true real-time updates
- Email notifications
- Game history and statistics
- Mobile app version
- Social features (chat, reactions)
- Gift wishlist functionality

## License

MIT
