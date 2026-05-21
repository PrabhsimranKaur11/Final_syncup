# SyncUp Workspace — Backend API

Real-time team communication platform backend built with Node.js, Express, MongoDB, and Socket.io.

## Installation

```bash
cd syncup-backend
npm install
```

## Environment Setup

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `FRONTEND_URL` | Frontend origin for CORS |
| `COOKIE_EXPIRES_IN` | Cookie expiry in days |

## Running Locally

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

## API Endpoints

### Auth (`/api/auth`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/register` | Register new user | ✗ |
| POST | `/login` | Login | ✗ |
| POST | `/logout` | Logout | ✓ |
| GET | `/me` | Get current user | ✓ |

### Users (`/api/users`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/` | Get all users | ✓ |
| GET | `/:id` | Get user by ID | ✓ |
| PATCH | `/:id` | Update profile | ✓ |
| PATCH | `/:id/status` | Update status | ✓ |

### Workspaces (`/api/workspaces`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/` | Get user's workspaces | ✓ |
| POST | `/` | Create workspace | ✓ |
| GET | `/:id` | Get workspace | ✓ |
| PATCH | `/:id` | Update workspace | ✓ |
| DELETE | `/:id` | Delete workspace (owner) | ✓ |
| POST | `/:id/members` | Add member | ✓ |
| DELETE | `/:id/members/:userId` | Remove member | ✓ |

### Channels

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/workspaces/:wId/channels` | List channels | ✓ |
| POST | `/api/workspaces/:wId/channels` | Create channel | ✓ |
| GET | `/api/channels/:id` | Get channel | ✓ |
| PATCH | `/api/channels/:id` | Update channel | ✓ |
| DELETE | `/api/channels/:id` | Delete channel | ✓ |
| POST | `/api/channels/:id/members` | Add member | ✓ |
| DELETE | `/api/channels/:id/members/:userId` | Remove member | ✓ |

### Messages

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/channels/:cId/messages` | Get messages (paginated) | ✓ |
| POST | `/api/channels/:cId/messages` | Send message | ✓ |
| DELETE | `/api/messages/:id` | Delete message (sender) | ✓ |

### Upload

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/upload` | Upload file to Cloudinary | ✓ |

## Socket.io Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join-workspace` | `{ workspaceId, userId }` | Join workspace room |
| `leave-workspace` | `{ workspaceId, userId }` | Leave workspace room |
| `join-channel` | `{ channelId }` | Join channel room |
| `leave-channel` | `{ channelId }` | Leave channel room |
| `send-message` | message object | Send message |
| `delete-message` | `{ messageId, channelId }` | Delete message |
| `user-online` | `{ userId, workspaceId }` | Mark online |
| `user-offline` | `{ userId, workspaceId }` | Mark offline |
| `user-away` | `{ userId, workspaceId }` | Mark away |
| `typing` | `{ channelId, userId, fullName }` | Start typing |
| `stop-typing` | `{ channelId, userId }` | Stop typing |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `new-message` | message object | New message broadcast |
| `delete-message` | `{ messageId, channelId }` | Message deleted |
| `user-status-changed` | `{ userId, status }` | User status update |
| `user-typing` | `{ channelId, userId, fullName }` | Typing indicator |
| `user-stop-typing` | `{ channelId, userId }` | Stop typing indicator |

## Deployment on Render.com

1. Push `syncup-backend/` to a GitHub repository
2. Create a **New Web Service** on [Render](https://render.com)
3. Connect your GitHub repo
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `syncup-backend` (if in a monorepo)
5. Add all `.env` variables in Render's **Environment** tab
6. Set `NODE_ENV=production` and `FRONTEND_URL` to your deployed frontend URL
7. Deploy — Render will auto-deploy on every push

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Auth**: JWT + bcryptjs
- **Real-time**: Socket.io
- **File Upload**: Cloudinary + Multer
- **Validation**: validator.js
