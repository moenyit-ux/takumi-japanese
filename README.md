# Takumi Japanese

Mobile-first web app foundation for **Takumi Japanese**, focused on JLPT N4/N3 learning for Indonesian workers in Japan.

## Stack
- Next.js 16 + TypeScript
- Supabase Auth + PostgreSQL
- Vercel deployment

## Product rules
- JLPT N4: 48 sessions, 7 free sessions
- JLPT N3: 60 sessions, 9 free sessions
- Session pass score: 70
- Five-session checkpoint pass score: 75
- Simulation pass score: 75
- 5 simulations per level
- Unlimited attempt history
- Automatic/manual bookmarks
- Manual payment workflow for the initial release
- Editorial roles and review states
- Account deletion requests

## Current phase
The UI shell, authentication entry point, database foundation, and Vercel preview are ready. Learning content is intentionally not fabricated; final Takumi material will be imported after review.

## Local setup
```bash
npm install
npm run dev
```

The current prototype uses the Supabase project publishable key in the browser. This is a public client key and must always be protected by Row Level Security (RLS). Never commit a Supabase secret/service-role key.
