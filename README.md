# SyncUp

SyncUp is a Slack-style team workspace for real-time collaboration: public and private channels, direct messages, voice/video calls, file attachments, and live notifications.

**Repository:** [github.com/PrabhsimranKaur11/Final_syncup](https://github.com/PrabhsimranKaur11/Final_syncup)

## Project structure

| Folder | Stack | Role |
|--------|--------|------|
| `syncup-backend/` | Node.js, Express, MongoDB, Socket.io | REST API, auth, uploads, WebSocket events |
| `syncup-workspace/` | React, Vite | Web client (proxies API to the backend in dev) |

## Prerequisites

- **Node.js** 18 or newer
- **MongoDB** running locally or a connection string you control

## Environment setup

1. In `syncup-backend/`, copy the example env file:
   ```bash
   cp .env.example .env
   ```
   On Windows (PowerShell): `Copy-Item .env.example .env`
2. Edit `.env` with your MongoDB URI, JWT secret, and optional Cloudinary keys (or use local uploads via `USE_LOCAL_UPLOADS=true`).

**Do not commit `.env`** — it is listed in `.gitignore`.

## Install and run

### Backend (port 5000)

```bash
cd syncup-backend
npm install
npm run dev
```

API and Socket.io listen on **http://localhost:5000** by default (`PORT` in `.env`).

### Frontend (port 5173)

In a second terminal:

```bash
cd syncup-workspace
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` and `/socket.io` to the backend during development.

## Features

- Channels and direct messages with real-time updates
- Voice and video calls (WebRTC)
- In-app notifications
- Private rooms / restricted access
- File uploads (Cloudinary or local storage)

## Scripts (quick reference)

| Location | Command | Purpose |
|----------|---------|---------|
| `syncup-backend` | `npm run dev` | Dev server with nodemon |
| `syncup-backend` | `npm start` | Production-style start |
| `syncup-workspace` | `npm run dev` | Vite dev server |
| `syncup-workspace` | `npm run build` | Production build |

## License

Use and modify according to your project needs unless otherwise specified in the repository.
