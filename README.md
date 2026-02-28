# Football Fanatic Quiz

Interactive football quiz app built with React + Vite.  
It includes league/category quizzes, player and manager trivia, and an AI football chat powered through a GenLayer smart contract flow.

## Features

- League and competition quiz generator with difficulty levels
- Player quiz mode
- Manager quiz mode
- AI football chat experience
- Transaction status tracking for GenLayer contract calls
- Responsive UI with Tailwind + shadcn/ui components

## Tech Stack

- React 18
- TypeScript
- Vite 5
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Framer Motion
- Vitest

## Prerequisites

- Node.js 18+ (recommended: latest LTS)
- npm

## Environment Variables

Create a `.env` file in the project root with:

```env
VITE_GENLAYER_KEY=your_private_key_here
```

Notes:

- The app reads `VITE_GENLAYER_KEY` from `import.meta.env`.
- Do not commit your real key. `.env` is already listed in `.gitignore`.

## Local Development

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173`).

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run build:dev` - Create development-mode build
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run test` - Run tests once with Vitest
- `npm run test:watch` - Run Vitest in watch mode

## Project Structure

```text
src/
  components/      # Reusable UI and feature components
  lib/             # Quiz data and GenLayer integration helpers
  pages/           # Route-level screens
  App.tsx          # Router + providers
```

## Core Routes

- `/` - Landing page
- `/quiz` - Category quiz setup
- `/quiz/contract` - Contract quiz play view
- `/quiz/:leagueId/:difficulty` - Route-based quiz game
- `/players` - Player quiz
- `/managers` - Manager quiz
- `/ai-chat` - Football AI chat

