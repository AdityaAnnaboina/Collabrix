# 🌐 MeetHub — Enterprise-Grade Video Conferencing Platform

MeetHub is a production-ready, highly scalable, real-time video conferencing platform inspired by Google Meet and Zoom. Built using a modern **hybrid monorepo architecture**, it provides low-latency HD video/audio calls, dynamic screen sharing, real-time persistent chat, lobby waitlists, and host moderation tools.

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

## 🏗️ System Architecture

The following diagram illustrates how clients communicate, establish Peer-to-Peer (P2P) connections, and sync state through the signaling backend:

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

---

## 🌟 Key Features

*   **🎥 HD Multi-Peer Video & Audio**: Low-latency calls utilizing native browser WebRTC APIs.
*   **🖥️ Dynamic Screen Sharing**: Seamless desktop/tab sharing on the fly without renegotiation.
*   **💬 Real-Time Persistent Chat**: In-meeting message sync stored in the database.
*   **🔒 Host Controls & Moderation**: Lobby approval, meeting locking, and participant controls.
*   **⚡ Active Speaker Tracking**: Real-time voice analysis via Web Audio API `AnalyserNode` to highlight the current speaker.
*   **📈 Developer Diagnostics Panel**: Live diagnostic overlay parsing `RTCPeerConnection.getStats()` (bitrate, packet loss, RTT, and FPS) every 3 seconds.

---

## 🔧 WebRTC Optimization & Engineering Challenges

MeetHub applies enterprise-grade connection strategies to ensure high quality of service:

### 1. Connection Resilience (Automatic ICE Restart)
WebRTC connections can fail due to changing network interfaces (e.g., switching from Wi-Fi to cellular). MeetHub monitors `iceconnectionstatechange`. If the connection falls to `failed` or `disconnected`, the client automatically triggers an **ICE Restart** (`pc.createOffer({ iceRestart: true })`) to re-establish peer connectivity seamlessly without dropping the call.

### 2. Instant Media Track Swapping
To change cameras or microphones during a live call, MeetHub avoids costly connection teardowns. Instead, it utilizes `RTCRtpSender.replaceTrack` to swap media sources on the fly, keeping the connection alive.

### 3. Horizontal Socket Scaling
To support thousands of concurrent calls, the signaling backend is stateless. When scaled horizontally behind a load balancer, instances use `@socket.io/redis-adapter` to synchronize room events (such as WebRTC offers, answers, and ICE candidates) across separate servers using Redis Pub/Sub channels.

---

## 📂 Directory Structure

```
gmeetclone/
├── backend/                  # Node.js signaling & auth server
│   ├── prisma/               # Database schemas & migrations
│   ├── src/
│   │   ├── config/           # Database, env, Redis clients
│   │   ├── controllers/      # REST API handlers
│   │   ├── middleware/       # JWT validations, error boundaries
│   │   ├── routes/           # REST endpoints
│   │   ├── services/         # Token signing, room state
│   │   ├── sockets/          # Socket.IO event handlers
│   │   └── index.ts          # Server entrypoint
│   └── Dockerfile
├── frontend/                 # Next.js App Router frontend
│   ├── src/
│   │   ├── app/              # Auth, lobby, room views
│   │   ├── components/       # UI (VideoGrid, Diagnostics, Controls)
│   │   ├── hooks/            # WebRTC, devices, active speaker
│   │   └── store/            # Zustand state stores
│   └── Dockerfile
├── infra/
│   └── nginx/
│       └── default.conf      # Reverse proxy config
├── docker-compose.yml        # Multi-service container orchestrator
└── README.md                 # Project Documentation
```

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
