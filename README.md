# 🌐 MeetHub — Enterprise-Grade Video Conferencing Platform

MeetHub is a production-grade, highly scalable real-time video conferencing platform inspired by Google Meet, Zoom, and Microsoft Teams. It is designed to support low-latency HD video calls, crystal-clear audio, dynamic screen sharing, real-time persistent chat, lobby waitlists, and host moderation.

Designed with **connection resilience** and **horizontal scalability** at its core, MeetHub features advanced WebRTC signal negotiation, sub-second active speaker detection, and automatic ICE connection recovery.

---

## 🛠️ Tech Stack & Architecture

### Frontend
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-orange?style=for-the-badge)

*   **Next.js App Router (React 19)** for performant Server-Side Rendering (SSR) and Client-Side Hydration.
*   **Zustand** for lightweight, decentralized client-side state management.
*   **Tailwind CSS & Framer Motion** for beautiful, fluid, and responsive layouts.
*   Raw **WebRTC API** integration with a custom signaling controller.

### Backend
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-404d59?style=for-the-badge)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-39827F?style=for-the-badge&logo=prisma&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

*   **Node.js & Express** providing RESTful APIs for authentication, room creation, and user management.
*   **Socket.IO** for low-latency full-duplex signaling and real-time state synchronization.
*   **Prisma ORM** with SQLite (local development) and support for PostgreSQL (production).

### Infrastructure & Scaling
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

*   **Nginx** serving as a reverse proxy with SSL termination (mandatory for WebRTC camera/microphone access).
*   **Redis Pub/Sub** for horizontally scaling Socket.IO signaling nodes.
*   **Docker & Docker Compose** for containerizing the entire ecosystem.

---

## 🏗️ Architectural Overview & System Design

MeetHub uses a hybrid monorepo design, separating frontend UI presentation from backend WebSocket state sync and REST endpoints.

```mermaid
graph TD
    %% Clients
    ClientA["Client A (Chrome/Safari)"]
    ClientB["Client B (Firefox/Chrome)"]
    
    %% WebRTC Connection
    ClientA <-->|1. WebRTC Peer-to-Peer (Media Streams)| ClientB

    %% Signaling Through Proxy
    ClientA <-->|2. WS / HTTP| Nginx[Nginx Reverse Proxy]
    ClientB <-->|2. WS / HTTP| Nginx

    %% Services
    Nginx -->|3. Route: Port 3000| NextJS[Next.js App Server]
    Nginx -->|3. Route: Port 5000| Express[Express Server]

    %% Databases & Adapters
    Express <-->|4. WebSocket Signaling| SocketIO[Socket.IO Server]
    Express <-->|5. Prisma ORM| DB[(SQLite / PostgreSQL)]
    SocketIO <-->|6. Redis Adapter| Redis[(Redis Pub/Sub)]
```

*   **Frontend**: Built with **Next.js App Router (React 19)**, **TypeScript**, **Tailwind CSS**, and **Zustand** for lightweight local state. Stream negotiation and tracking are handled by standard WebRTC APIs and a custom signaling controller.
*   **Backend**: Powered by **Node.js**, **Express**, **TypeScript**, and **Socket.IO**. Database operations are orchestrated via **Prisma ORM** connecting to a **PostgreSQL** or **SQLite** instance.
*   **Real-time State Sync**: Scaled horizontally across server instances using **Redis Pub/Sub adapter**. Real-time room participant configurations are cached in Redis hashes to reduce database load.
*   **Infrastructure**: Packaged inside Docker containers fronted by **Nginx** acting as a secure reverse proxy with SSL termination (mandatory for WebRTC secure contexts).

---

## 📂 Directory Structure

```
gmeetclone/
├── backend/                  # Node.js signaling & auth server
│   ├── prisma/               # Postgres/SQLite schemas & migrations
│   ├── src/
│   │   ├── config/           # Database, env, Redis clients
│   │   ├── controllers/      # REST API handlers (Auth, Rooms)
│   │   ├── middleware/       # JWT validations, error boundaries
│   │   ├── routes/           # REST endpoints
│   │   ├── services/         # Token signing, Redis room state managers
│   │   ├── sockets/          # Socket.IO signaling event handlers
│   │   └── index.ts          # Server bootstrapper
│   └── Dockerfile
├── frontend/                 # Next.js App Router frontend
│   ├── src/
│   │   ├── app/              # Views (auth pages, lobby, room)
│   │   ├── components/       # UI (VideoGrid, MeetingControls, Sidebar, Diagnostics)
│   │   ├── hooks/            # WebRTC, devices, active speaker nodes
│   │   ├── services/         # API HTTP fetch helpers
│   │   └── store/            # Zustand state stores (Room, Auth)
│   └── Dockerfile
├── infra/
│   └── nginx/
│       └── default.conf      # Nginx proxy mapping HTTP/HTTPS & WebSockets
├── docker-compose.yml        # Multi-service container orchestrator
└── README.md                 # Documentation
```

---

## 🌟 Key Features

*   **🎥 HD Multi-Peer Video & Audio**: Low-latency calls utilizing native browser WebRTC APIs.
*   **🖥️ Dynamic Screen Sharing**: Seamless desktop/tab sharing on the fly without renegotiation.
*   **💬 Real-Time Persistent Chat**: In-meeting message sync stored in the database.
*   **🔒 Host Controls & Moderation**: Lobby approval, meeting locking, and participant controls.
*   **⚡ Active Speaker Tracking**: Real-time voice analysis via Web Audio API `AnalyserNode` to highlight the current speaker.
*   **📈 Developer Diagnostics Panel**: Live diagnostic overlay parsing `RTCPeerConnection.getStats()` (bitrate, packet loss, RTT, and FPS).

---

## 🎥 WebRTC Optimization & Resilience Strategies

MeetHub applies enterprise-grade connection optimizations:
1.  **Connection Resilience (Automatic ICE Restart)**: Monitors `iceconnectionstatechange`. If states drop to `failed` or `disconnected`, the client initiates an **ICE Restart** (`pc.createOffer({ iceRestart: true })`) to heal the connection on the fly without dropping calls.
2.  **Crystal-Clear Audio**: Employs Web Audio settings like `echoCancellation`, `noiseSuppression`, and `autoGainControl`.
3.  **Instant Track Swaps**: When switching inputs (cameras/microphones), it uses `RTCRtpSender.replaceTrack` to feed the new media directly into the active connection without renegotiation.
4.  **Active Speaker focus**: Computes local volume spikes using a Web Audio `AnalyserNode` and broadcasts speaking statuses.
5.  **Screen Sharing**: Captures desktop frames via `getDisplayMedia`, overrides active video tracks on the fly, and recovers the camera stream on screen share end.

---

## 📈 Scaling Strategies

### Horizontal Socket Scaling
MeetHub backend signaling servers are stateless. Using `@socket.io/redis-adapter`:
*   Users can connect to different server replicas (e.g., Load-balanced Node Server A or B).
*   Event messages (SDPs, chat posts, toggles) are broadcasted to all corresponding nodes using Redis Pub/Sub channels.

### Room State Clustering
Active room participants lists are kept in Redis hashes under `room:state:{roomCode}`. Reads and state toggles do not hit the database during calls.

---

## 🛠️ Developer Diagnostics Panel
Click the **Bug Icon 🐛** in the control bar to open the developer overlay. It collects real-time diagnostics from `RTCPeerConnection.getStats()` every 3 seconds:
*   **Latency (RTT)**: Displays round-trip transmission speed in milliseconds.
*   **Packet Loss**: Measures network congestion ratios.
*   **Bitrate**: Gross bandwidth transmission in kbps.
*   **Video FPS**: Tracks video playback framerates.

---

## 🗺️ Future Improvement Roadmap

For rooms larger than 8 participants, Mesh topology can saturate client bandwidth. The codebase is modularly structured to support upgrading to an **SFU (Selective Forwarding Unit)** topology in the future:
1.  **Mediasoup Container Addition**: Integrate a `mediasoup` SFU container to receive video feeds.
2.  **Stream Routing Adjustments**: Instead of generating $(N-1)$ connections, update `useWebRTC` to maintain one `SendTransport` and multiple `RecvTransports` from the SFU.

---

## ⚙️ Environment Configurations

Create a `.env` file in the root directory. The docker-compose orchestrator and local setup read these values:

| Variable | Dev Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port for the backend signaling server. |
| `DATABASE_URL` | `file:./dev.db` | Connection string to database (SQLite path or PostgreSQL URI). |
| `REDIS_URL` | `redis://localhost:6379` | Connection string to Redis instance. |
| `JWT_ACCESS_SECRET` | `your_secret_access` | JWT access token signature key. |
| `JWT_REFRESH_SECRET` | `your_secret_refresh` | JWT refresh token signature key. |
| `FRONTEND_URL` | `http://localhost:3000` | Origin URL of the frontend proxy / NextJS server. |
| `NODE_ENV` | `development` | Environment status (`development` \| `production`). |
| `REDIS_ENABLED` | `false` | Enable or disable Redis pub/sub adapter. |

---

## 🚀 Quick Start Guide

You can run MeetHub either using Docker Compose (recommended for production-like local testing) or directly using Node/NPM.

### Option A: Running Locally with Node/NPM (No Docker)

This is the fastest way to run the application locally. It uses a local SQLite database and in-memory WebSockets (no Redis installation needed).

#### 1. Setup Environment
Create a `.env` file in the root directory (you can copy `.env.example` as a template):
```env
PORT=5000
DATABASE_URL="file:./dev.db"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="supersecretaccesskey123_change_in_production!"
JWT_REFRESH_SECRET="supersecretrefreshkey123_change_in_production!"
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"
REDIS_ENABLED="false"
```

#### 2. Run the Backend
Navigate to the `backend` folder, install dependencies, generate the Prisma client, and start the development server:
```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```
The backend will run on `http://localhost:5000`.

#### 3. Run the Frontend
Navigate to the `frontend` folder, install dependencies, and start the Next.js development server:
```bash
cd ../frontend
npm install
npm run dev
```
The frontend will run on `http://localhost:3000`. Open it in your browser!

---

### Option B: Running with Docker Compose
WebRTC requires a secure context (`https://`) to request camera and microphone permissions on non-localhost addresses. The Docker setup packages Nginx with SSL termination.

#### 1. Prerequisite: Generate Self-Signed Certificates
Run the following command from the project root:
```bash
# Create directory
mkdir -p infra/nginx/ssl

# Generate key & cert using Docker
docker run --rm -v "${PWD}/infra/nginx/ssl:/export" alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /export/nginx-selfsigned.key -out /export/nginx-selfsigned.crt -subj "/CN=localhost"
```

#### 2. Boot the Ecosystem
Run the build command from the root directory:
```bash
docker compose up --build
```
Open **`https://localhost`** in your browser.

---

## ☁️ Deployment (100% Free Production Stack)

To deploy MeetHub completely for free with data persistence, follow this architecture:

### 1. Database (Supabase or Neon PostgreSQL)
Since local SQLite databases are deleted on ephemeral containers (like Render's free tier), use a free cloud PostgreSQL database:
1. Create a free account on **Supabase** or **Neon**.
2. Create a project and copy the **PostgreSQL Connection URI**.
3. In `backend/prisma/schema.prisma`, change the datasource provider to `"postgresql"`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

### 2. Backend (Render Free Tier)
1. Deploy a **Web Service** on **Render** linked to your Git repository.
2. Build Settings:
   * **Root Directory**: `backend`
   * **Build Command**: `npm install && npm run prisma:generate && npm run build`
   * **Start Command**: `npm run start`
3. Add environment variables:
   * `DATABASE_URL`: Your Supabase/Neon connection string.
   * `FRONTEND_URL`: Your Netlify URL (e.g. `https://your-app.netlify.app`).
   * `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Secure random strings.
   * `REDIS_ENABLED`: `false`

### 3. Frontend (Netlify Free Tier)
1. Deploy a **Site** on **Netlify** linked to your Git repository.
2. Build Settings:
   * **Base Directory**: `frontend`
   * **Build Command**: `npm run build`
   * **Publish Directory**: `frontend/.next`
3. Add environment variables:
   * `NEXT_PUBLIC_BACKEND_URL`: Your Render backend URL (e.g. `https://gmeet-backend.onrender.com`).
