# Capsule

A full stack website for saving memories in a time capsule.

## Live Demo

Deployed on Render: <https://capsule-s77x.onrender.com>

## Slides

<https://docs.google.com/presentation/d/1ecZQcJ44aZm_QCXuPGLc4gVp8-woWTznhn5odgEosRg/edit?usp=sharing>

[Demo Video](https://www.youtube.com/watch?v=w9BYKyD3LWM)

## Authors

- Alexandra (Ally) Descoteaux — Contributions and Reveal (contributions collection, full CRUD, reveal view)
- James Hicks — Authentication, Capsules, and Invites (users and capsules collections)

## Class Link

CS5610 Web Development — Northeastern University: <https://johnguerra.co/classes/webDevelopment_online_summer_2/>

## Project Objective

Capsule is a digital time capsule. A user creates a capsule with a title and an open date, invites friends or family with a share code, and everyone contributes messages, photos, predictions, and voice notes. Once sealed, nobody can view any contents until the open date arrives, making the reveal a shared moment for everyone who took part.

## Screenshots

### Example of registration
![Capsule Registration](docs/pics/RegisterCapsule.png)

### Example of Capsule Login
![Capsule Login](docs/pics/LoginCapsule.png)

### Example of Creating a new Capsule
![Capsule Create view](docs/pics/CapsuleDetails.png)

### Example of viewing a Capsule that has been created
![Capsule detail and reveal view](docs/pics/CapsuleDetails.png)

## What It Does

Capsule lets authenticated users create locked time capsules with an open date. Contributors can add messages, predictions, photos, and voice notes while the capsule is sealed. Once the open date arrives, the capsule unlocks and the contents can be opened as a step-by-step **reveal ceremony** — one contribution at a time — or viewed all at once. After a capsule opens, its owner can mark each **prediction** as having come true or not.

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

## Seed Synthetic Data

To populate the database with synthetic demo data (40 users, 120 capsules, and 1,000 contributions — 1,160 records total), run:

```bash
npm run seed
```

This clears the `users`, `capsules`, and `contributions` collections first, then reseeds them. Every seeded user's password is `password123` (for example, log in as `demo1@capsule.test`).

## Try It With Demo Data

For a quick, predictable walkthrough of the reveal ceremony and prediction resolution, seed a single demo account with ready-made capsules:

```bash
npm run demo:data
```

This creates (and, on re-run, resets) one account:

- **email:** `demo@capsule.test`
- **password:** `password123`

It owns two capsules: an already-open **"Senior Year 2024"** with messages, a photo, and three unresolved predictions to try the reveal ceremony and mark true/false, plus a still-locked **"New Year 2030 Goals"** to show the countdown and sealed state. This script only touches the demo account, so it is safe to run alongside `npm run seed` data.

## Deployment

The app is deployed on [Render](https://render.com) as a single web service that serves both the API and the built frontend:

- **Build command:** `npm install && npm install --prefix frontend && npm run build --prefix frontend`
- **Start command:** `node backend.js`
- **Environment:** set `MONGODB_URI` (e.g. a MongoDB Atlas connection string), `MONGODB_DB`, `SESSION_SECRET`, and `NODE_ENV=production`. Render provides `PORT` automatically.

Because Render serves the app over HTTPS behind a proxy, the server sets `trust proxy` so the `secure` session cookie is issued correctly in production.

## Available Scripts

- `npm start` - runs the backend with watch mode
- `npm run seed` - clears and repopulates the database with synthetic data
- `npm run demo:data` - resets the `demo@capsule.test` account and its demo capsules
- `npm run format` - formats the codebase with Prettier
- `npm run lint:fix` - runs ESLint with autofix
- `npm --prefix frontend run dev` - runs the Vite frontend
- `npm --prefix frontend run build` - builds the frontend for production

## Notes

- Log in or register before using the capsule list and reveal pages. New passwords must be at least 8 characters, and registering logs you straight in.
- Photos and voice notes are stored as base64 data URLs in the current implementation, so this is best for small demo files.
- Only a capsule's owner can resolve its predictions, and only after the capsule has opened.


================== Peer Code Review from Shorena K. Anzhilov =======================
