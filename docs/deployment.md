# ☁️ 100% Free Production Deployment Guide

This guide provides step-by-step instructions to deploy **Collabrix** (Next.js frontend, Node.js + Socket.IO backend, and Prisma/PostgreSQL database) completely for **free**, with data persistence, zero hosting costs, and standard HTTPS/WSS security contexts.

---

## 🏗️ Free Production Architecture

To host a modern WebRTC real-time application with WebSockets and a database for free, we split the architecture into specialized free hosting tiers:

```mermaid
graph TD
    %% Clients
    Client["User Browser (Secure Context)"]
    
    %% Deployments
    Vercel["Frontend: Vercel (Free Tier)<br/>Next.js App Server"]
    Backend["Backend: Render or Koyeb (Free Tier)<br/>Node.js / Express / Socket.IO"]
    Neon["Database: Neon.tech (Free Tier)<br/>Serverless PostgreSQL"]

    %% Connections
    Client -->|HTTPS / API Requests| Vercel
    Client -->|WebSockets / HTTP Signaling| Backend
    Backend -->|Prisma Client TCP| Neon
    
    %% Config Loops
    Vercel -.->|NEXT_PUBLIC_BACKEND_URL| Backend
    Backend -.->|FRONTEND_URL| Vercel
```

1. **Database**: **Neon.tech** (Serverless PostgreSQL)
   * *Why?* Wakes up instantly (under 2 seconds) when a connection is made, and offers a generous free tier with 0.5 GiB storage which stays active.
2. **Backend**: **Render** (Easiest setup) or **Koyeb** (Fastest performance, no cold starts)
   * *Why?* Both support long-running WebSockets (Socket.IO). Render is extremely simple but sleeps after 15 minutes of inactivity (taking ~50s to wake up). Koyeb runs 24/7 on its free tier without sleeping (if you only run one app).
3. **Frontend**: **Vercel**
   * *Why?* Optimized specifically for Next.js App Router (React 19), with native edge functions and fast global CDN.

---

## 🗄️ Step 1: Set Up Neon PostgreSQL (Database)

We need a persistent PostgreSQL database since local SQLite files (`dev.db`) get deleted every time your backend container restarts.

1. Go to [Neon.tech](https://neon.tech/) and sign up for a free account.
2. Click **Create Project**:
   * **Name**: `collabrix-db`
   * **Database Version**: PostgreSQL 16 (default)
   * **Region**: Choose the region closest to your target audience or backend servers (e.g., *US East (N. Virginia)* or *Europe (Frankfurt)*).
3. Once created, you will see a **Connection Details** popup.
4. Copy the connection string. Make sure it is set to **Pooled Connection** (displays a URI starting with `postgresql://` and ends with `?sslmode=require`).
   * *Example URI*: `postgresql://neondb_owner:password@ep-cool-cloud-123456.us-east-1.aws.neon.tech/neondb?sslmode=require`
5. Keep this URI handy. It will be your `DATABASE_URL` environment variable.

---

## 🚀 Step 2: Set Up Backend Signaling Server (Render or Koyeb)

Choose **one** of the two free options below to deploy the backend.

### Option A: Render (Easiest)

Render is the simplest to configure but has a cold-start delay of ~50 seconds if no traffic is received for 15 minutes.

1. Create a free account on [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service settings:
   * **Name**: `collabrix-backend`
   * **Region**: Choose the same region as your Neon database.
   * **Branch**: `main` (or your active branch)
   * **Root Directory**: `backend` *(CRITICAL: This isolates the build to the backend folder)*
   * **Runtime**: `Node`
   * **Build Command**: `npm install && npx prisma generate && npx prisma db push && npm run build`
     > [!NOTE]
     > `npx prisma db push` automatically synchronizes your Prisma schema directly with the Neon PostgreSQL database without needing migration files or encountering SQLite vs PostgreSQL migration history conflicts.
   * **Start Command**: `npm run start`
   * **Instance Type**: **Free**
5. Click **Advanced** to add Environment Variables (see the env variables table below).
6. Click **Create Web Service**.

---

### Option B: Koyeb (Recommended for WebSockets, No Cold Starts)

Koyeb runs on micro-VMs. Its free tier does **not** sleep/auto-suspend if you only have one active service, meaning your Socket.IO connection is instantaneous.

1. Go to [Koyeb.com](https://www.koyeb.com/) and sign up.
2. Click **Create Service**.
3. Select **GitHub** as the deployment method and connect your repo.
4. Configure settings:
   * **Repository**: Select your repo.
   * **Branch**: `main`
   * **Root Directory**: Set to `/backend`
   * **Builder**: Select **Node.js** (or use Dockerfile, but Node.js buildpack is easiest).
   * **Build Command**: `npm install && npx prisma generate && npx prisma db push && npm run build`
   * **Run Command**: `npm run start`
   * **Port**: `5000` (Koyeb auto-detects ports or lets you expose a specific one. Ensure HTTP protocol routing points to port `5000` where the backend runs).
5. Under **Environment Variables**, add the variables listed below.
6. Click **Deploy**.

---

### ⚙️ Backend Environment Variables

Add these variables in your backend settings panel:

| Key | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations. |
| `DATABASE_URL` | *[Your Neon Connection String]* | The URI you copied from Neon. |
| `REDIS_ENABLED` | `false` | Disables Redis pub/sub (runs in single-instance mode). |
| `FRONTEND_URL` | *[Your Frontend Vercel URL]* | e.g. `https://collabrix.vercel.app` *(Note: You can update this later once Vercel gives you a URL)* |
| `JWT_ACCESS_SECRET` | *[Random secure string]* | Generate a long random string (e.g. `super-secret-access-token-123456`) |
| `JWT_REFRESH_SECRET` | *[Random secure string]* | Generate another long random string (e.g. `super-secret-refresh-token-123456`) |

---

## 🎨 Step 3: Set Up Frontend (Vercel)

Vercel is the official platform for Next.js, making the deployment of the `frontend` folder extremely simple.

1. Sign up on [Vercel](https://vercel.com/) (using GitHub).
2. Click **Add New** > **Project**.
3. Import your GitHub repository.
4. In the configuration settings:
   * **Framework Preset**: `Next.js`
   * **Root Directory**: `frontend` *(CRITICAL: Click Edit, select the `frontend` folder, and save)*
   * **Build and Development Settings**: Leave as default.
5. Expand the **Environment Variables** accordion and add:
   * **Key**: `NEXT_PUBLIC_BACKEND_URL`
   * **Value**: *[Your Backend URL]* (e.g., `https://collabrix-backend.onrender.com` or `https://your-app.koyeb.app`).
     > [!WARNING]
     > Do **NOT** add a trailing slash at the end of the URL (e.g., use `https://collabrix.onrender.com`, **not** `https://collabrix.onrender.com/`).
6. Click **Deploy**.
7. Once completed, Vercel will give you a production URL (e.g. `https://gmeetclone-frontend.vercel.app`).
8. **IMPORTANT: Go back to your Backend settings on Render or Koyeb, and update `FRONTEND_URL` to match this exact Vercel URL.** (This resolves CORS issues so the frontend can query the API and connect to the sockets).

---

## 🔍 Step 4: Verification & Troubleshooting

Once both the frontend and backend are deployed and cross-linked via their env variables:

### 1. Verification
1. Open your Vercel frontend URL.
2. Try registering a new user. If registration succeeds:
   * The frontend successfully reached the backend API.
   * The backend successfully connected to Neon PostgreSQL and created tables via Prisma.
3. Create a room and join it. Open the browser console (`F12`). Look at the Network tab for WebSockets (`ws://` or `wss://` transport).
   * If the connection succeeds and you enter the lobby, Socket.IO is connected and functioning!

### 2. Common Deployment Issues
* **CORS Errors**: 
  * *Symptoms*: Console log shows "Access to fetch at ... has been blocked by CORS policy".
  * *Fix*: Ensure the backend `FRONTEND_URL` matches your Vercel URL *exactly* (including `https://`, but without a trailing slash). If Render backend environment variables were updated, wait for it to redeploy.
* **Database Connection Timeouts**:
  * *Symptoms*: Backend logs show "PrismaClientInitializationError" or timeout.
  * *Fix*: Ensure your database URL contains `?sslmode=require` at the end (Neon requires SSL connections). Double-check that your password doesn't contain special characters that aren't URL-encoded.
* **Camera/Microphone Permission Errors**:
  * *Symptoms*: WebRTC fails to capture stream on mobile or remote devices.
  * *Fix*: WebRTC media access **requires** a secure context (`https://`). Vercel and Render/Koyeb handle SSL termination automatically, so make sure you are accessing the app using `https://` instead of `http://`.
