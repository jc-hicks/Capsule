# Capsule
A full stack website for saving memories in a time capsule.

## What It Does

Capsule lets authenticated users create locked time capsules with an open date. Contributors can add messages, predictions, and photos while the capsule is sealed, then view the reveal once the open date arrives.

## Requirements

- Node.js 18+ recommended
- MongoDB connection string

## Environment Variables

Create a `.env` file in the project root with:

- `MONGODB_URI` - required MongoDB connection string
- `MONGODB_DB` - optional database name, defaults to `capsule`
- `SESSION_SECRET` - optional Express session secret, defaults to a development value
- `PORT` - optional backend port, defaults to `3000`

## Install

Install the backend dependencies from the project root, then install the frontend dependencies:

```bash
npm install
npm --prefix frontend install
```

## Run In Development

Use two terminals:

1. Start the backend API from the project root:

```bash
npm start
```

2. Start the frontend dev server:

```bash
npm --prefix frontend run dev
```

The frontend runs on the Vite port, and it proxies `/api` requests to the backend at `http://localhost:3000`.

## Run As A Single App

If you want the backend to serve the built frontend, first build the frontend, then start the backend:

```bash
npm --prefix frontend run build
npm start
```

Open `http://localhost:3000` after the build completes.

## Available Scripts

- `npm start` - runs the backend with watch mode
- `npm --prefix frontend run dev` - runs the Vite frontend
- `npm --prefix frontend run build` - builds the frontend for production

## Notes

- Log in or register before using the capsule list and reveal pages.
- Photos are stored as uploaded data URLs in the current implementation, so this is best for small demo images.
