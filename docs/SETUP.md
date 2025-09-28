# 🛠️ Setup Instructions

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd snevo
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure Supabase:
   - Create a new Supabase project
   - Get your project URL and API keys
   - Update `.env` file with your credentials

5. Run database migrations:
```bash
npm run migrate
```

6. Start the development server:
```bash
npm run dev
```

## Environment Variables

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
JWT_SECRET=your_jwt_secret
PORT=3000
NODE_ENV=development
```

## Development

- Backend runs on `http://localhost:3000`
- Frontend runs on `http://localhost:3001`
- Database is hosted on Supabase

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy to your hosting platform:
```bash
npm run deploy
```
