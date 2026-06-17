# 🎓 Collabrix — Master Technical Interview Prep Guide

This document lists potential technical interview questions, grouped by topic, focusing on the system design, web protocols, database management, and architecture of **Collabrix**. Each question includes difficulty, the core concept being tested, and a comprehensive answer mapped to the codebase.

---

## 📡 Category 1: WebRTC & Real-time Media Protocols

### Q1.1: What is the purpose of WebRTC Signaling, and does WebRTC use a server during a call?
*   **Difficulty**: Easy to Mid
*   **What it tests**: Understanding that WebRTC is peer-to-peer (P2P), but still requires server infrastructure to set up the connection.
*   **Answer**:
    *   **Yes, a server is required initially**, but not to route the media streams. WebRTC is peer-to-peer, meaning video/audio packets flow directly between browsers.
    *   However, browsers have no native way to discover each other's network routes (public IP, ports) or negotiate capabilities (video resolution, audio codecs) on their own.
    *   **Signaling** is the process of exchanging this metadata (SDP Offer, SDP Answer, and ICE Candidates) before the connection goes P2P. Collabrix uses the **Node.js + Socket.IO** backend as the signaling server to route these packets between clients. Once the peer connection establishes, the signaling server is no longer involved in the media flow.

---

### Q1.2: What are SDP (Session Description Protocol) and ICE (Interactive Connectivity Establishment) in WebRTC?
*   **Difficulty**: Mid
*   **What it tests**: Deep knowledge of the WebRTC handshake mechanism.
*   **Answer**:
    *   **SDP (Session Description Protocol)**: A text-based format describing the media settings of the browser (e.g., "I support VP8/H.264 video codecs and Opus audio codecs, and I am sending video from target X"). One peer sends an *SDP Offer*, and the other responds with an *SDP Answer*.
    *   **ICE (Interactive Connectivity Establishment)**: A protocol used to find the best network path to establish a P2P connection. 
    *   **ICE Candidates**: Network endpoints (combination of IP address, port, and transport protocol) gathered by the browser. 
        *   **STUN (Session Traversal Utilities for NAT)** servers are queried by the browser to determine its own public IP address.
        *   **TURN (Traversal Using Relays around NAT)** servers are used if a direct P2P connection is blocked by symmetric firewalls; in that case, the TURN server acts as a relay for media traffic.

---

### Q1.3: How does Collabrix handle connection disruptions when a user's network drops?
*   **Difficulty**: Mid to Senior
*   **What it tests**: Resilience strategies and hands-on WebRTC recovery experience.
*   **Answer**:
    *   Collabrix implements an **ICE Restart** mechanism inside [useWebRTC.ts](file:///c:/Users/katti/Desktop/gmeetclone/frontend/src/hooks/useWebRTC.ts).
    *   The client listens to the `iceconnectionstatechange` event on the `RTCPeerConnection` instance.
    *   If the connection state transitions to `failed` or `disconnected`, the browser recognizes a drop. Instead of closing the connection and making the user rejoin, the initiator creates a new SDP offer with the option `{ iceRestart: true }`.
    *   This forces the browser to gather fresh ICE candidates (perhaps switching from Wi-Fi to cellular data) and negotiate the connection on the fly without interrupting the active call.

---

### Q1.4: How did you implement screen sharing without causing meeting renegotiation delays?
*   **Difficulty**: Mid
*   **What it tests**: Track management and familiarity with the `RTCRtpSender` API.
*   **Answer**:
    *   We use **track replacement** rather than renegotiating the entire peer connection.
    *   When a user clicks "Share Screen" in [MeetingControls.tsx](file:///c:/Users/katti/Desktop/gmeetclone/frontend/src/components/MeetingControls.tsx), we query `navigator.mediaDevices.getDisplayMedia({ video: true })` to obtain the screen track.
    *   We then iterate through all active `RTCPeerConnection` instances in our peer loop, locate the video track sender (`RTCRtpSender`), and call `sender.replaceTrack(screenTrack)`.
    *   Because `replaceTrack` works directly at the transport layer, the video stream swaps instantly on the receivers' screens without triggering a complete SDP Offer/Answer cycle. When screen sharing stops, we replace the screen track back with the original webcam track.

---

## 🔌 Category 2: WebSockets & Signaling (Socket.IO)

### Q2.1: Why did you choose Socket.IO over raw WebSockets?
*   **Difficulty**: Easy
*   **What it tests**: Practical engineering choices and understanding of WebSocket wrappers.
*   **Answer**:
    *   **Automatic Reconnections**: Socket.IO handles disconnect/reconnect logic, buffering packets while the connection is offline.
    *   **HTTP Long Polling Fallback**: If a corporate proxy or firewall blocks WebSocket ports (`ws://` / `wss://`), Socket.IO falls back to HTTP long polling automatically.
    *   **Room Abstraction**: It provides built-in channel support (`socket.join(roomCode)` and `socket.to(roomCode).emit()`), which simplifies signaling routing.
    *   **Heartbeats**: Built-in ping/pong configurations prevent servers and reverse proxies (like Nginx or Render ingress routers) from closing idle connections.

---

### Q2.2: How does the backend prevent database bottlenecking when users mute or unmute their mic?
*   **Difficulty**: Mid to Senior
*   **What it tests**: Performance separation between persistent state (DB) and transient state (RAM/WebSocket).
*   **Answer**:
    *   We partition meeting state. Settings like registration and room creation are written to **PostgreSQL** because they need to persist across days.
    *   Transient states (e.g., "Is User X muted?", "Is User Y sharing their screen?") change frequently. Writing these to PostgreSQL would overload the database with transaction writes.
    *   Instead, we cache active participant states in **Redis hashes** (managed by [room-state.service.ts](file:///c:/Users/katti/Desktop/gmeetclone/backend/src/services/room-state.service.ts)) and broadcast changes directly to room sockets. PostgreSQL is completely bypassed during in-call toggle events.

---

## 🗄️ Category 3: Database & ORM (Prisma / PostgreSQL)

### Q3.1: Explain the difference between `prisma db push` and `prisma migrate dev`. When should you use which?
*   **Difficulty**: Mid
*   **What it tests**: Databases migration cycles and schema safety.
*   **Answer**:
    *   **`prisma migrate dev`**: 
        *   Used during local development. It reads your `schema.prisma` file, computes the diff against your database, creates a SQL migration file inside the `prisma/migrations` folder, and applies it.
        *   It maintains a migration history which is critical for tracking changes in team environments and applying production migrations sequentially via `prisma migrate deploy`.
    *   **`prisma db push`**:
        *   Pushes your schema directly to the database without generating migration files or referencing historical migrations.
        *   It is perfect for prototyping, deploying early-stage hobby applications, or switching database providers (e.g., from SQLite to PostgreSQL) because it bypasses historical migration provider conflicts (like `Error P3019` when a migration lock file is configured for SQLite).

---

### Q3.2: How does Prisma establish relationships between the User, Room, and Participant models?
*   **Difficulty**: Easy to Mid
*   **What it tests**: Relational database schema design.
*   **Answer**:
    *   Inside [schema.prisma](file:///c:/Users/katti/Desktop/gmeetclone/backend/prisma/schema.prisma):
        *   **One-to-Many Hosted Rooms**: A `User` can host many rooms. This is mapped via `rooms Room[] @relation("HostedRooms")` pointing to the `hostId` field in the `Room` model.
        *   **Junction Table (`Participant`)**: A user can join multiple rooms over time, and a room can have multiple users. We resolve this many-to-many relationship using a explicit junction table named `Participant`, linking `userId` to the `User` table and `roomId` to the `Room` table with `onDelete: Cascade` rules to clean up participant logs when rooms are deleted.

---

## 💻 Category 4: Frontend Framework & Web APIs

### Q4.1: Why did you use Next.js App Router (React 19) instead of a simple React Single Page Application (SPA)?
*   **Difficulty**: Easy to Mid
*   **What it tests**: Modern frontend architectural paradigms (SSR vs CSR).
*   **Answer**:
    *   **SEO & Speed**: Next.js provides Server-Side Rendering (SSR) for auth landing pages and homepages. Search engines can index the site, and the first-contentful-paint (FCP) is significantly faster.
    *   **Server Components vs. Client Components**: Next.js enables us to keep security/server-centric logic in Server Components, while utilizing Client Components (marked with `'use client'`) for stateful WebRTC video grids and audio nodes.
    *   **Built-in Routing**: The file-system routing allows us to structure lobbies and meeting pages cleanly (e.g., `app/room/[code]/page.tsx`).

---

### Q4.2: How does the frontend handle active speaker tracking without overloading React rendering?
*   **Difficulty**: Mid to Senior
*   **What it tests**: Web Audio API integration and React rendering lifecycle performance.
*   **Answer**:
    *   We use the **Web Audio API** inside the custom hook [useActiveSpeaker.ts](file:///c:/Users/katti/Desktop/gmeetclone/frontend/src/hooks/useActiveSpeaker.ts).
    *   Rather than running state updates on every micro-second audio byte (which would cause infinite React re-renders and freeze the page), we pipe the mic's `MediaStreamTrack` into a `MediaStreamAudioSourceNode` and feed it into an `AnalyserNode`.
    *   We poll the frequency bytes inside a `setInterval` or `requestAnimationFrame` loop once every **100ms** to check if the volume exceeds a threshold.
    *   Only when a user's speaking status changes (e.g. switches from *silent* to *speaking* or vice-versa) do we emit a socket event and update state. This isolates React renders to meaningful changes.

---

## 🏗️ Category 5: System Design & Scaling

### Q5.1: If your application starts lagging when a room exceeds 10 participants, what is the bottleneck, and how do you resolve it?
*   **Difficulty**: Senior
*   **What it tests**: System design, WebRTC topologies (Mesh vs SFU/MCU).
*   **Answer**:
    *   **The Bottleneck**: Collabrix currently uses a **Mesh (P2P)** topology. In a Mesh network, every user maintains a direct peer connection to every other user. If there are $N$ participants, each client must upload its video $N-1$ times and download $N-1$ video streams. Total connections equal $N(N-1)/2$. At 10+ participants, client upload bandwidth and CPU (decoding multiple video streams) saturate, causing severe lag and audio drops.
    *   **The Resolution**: We must transition from a Mesh topology to an **SFU (Selective Forwarding Unit)** topology (like *Mediasoup*, *Jitsi*, or *Livekit*).
        *   With an SFU, each client uploads their stream **only once** to the central SFU server.
        *   The SFU server routes these streams to other participants. This reduces the client's upload requirements from $N-1$ down to **1**, dramatically saving client bandwidth and processing power.

```
Mesh (Current P2P):                  SFU (Scale Target):
      Client A                             Client A
     /   |   \                                |  (1 Upload)
ClientB-ClientC                               v
     \   |   /                             [ SFU Server ]
      ClientD                              /    |     \
                                         Cl-B  Cl-C  Cl-D (Downloads)
```

---

### Q5.2: How does the Redis Pub/Sub adapter scale your signaling layer?
*   **Difficulty**: Mid to Senior
*   **What it tests**: Multi-server socket architecture and publish/subscribe design patterns.
*   **Answer**:
    *   By default, Socket.IO stores connected socket instances in the server's local RAM. If you scale your backend horizontally by running three instances (e.g. Server A, B, and C) behind a load balancer, a user connected to Server A cannot emit socket events directly to a user connected to Server B.
    *   To solve this, we plug in `@socket.io/redis-adapter` (configured in [redis.ts](file:///c:/Users/katti/Desktop/gmeetclone/backend/src/config/redis.ts)).
    *   When the backend needs to send a signal to a room (e.g. `socket.to("room-123").emit()`), it publishes the payload to a **Redis channel** representing that room. All backend instances are subscribed to this channel. Server B receives the payload from Redis and pushes it down the WebSocket channel to its locally connected client.

---

### Q5.3: How do you handle CORS and Cookie security when deploying frontend and backend to different domains (Vercel vs Render)?
*   **Difficulty**: Mid
*   **What it tests**: Web security protocols, CORS configurations, and cross-site cookies.
*   **Answer**:
    *   **CORS (Cross-Origin Resource Sharing)**: We restrict cross-site endpoints. In [server.ts](file:///c:/Users/katti/Desktop/gmeetclone/backend/src/server.ts), we enable `cors` with `origin` set to the exact deployed frontend Vercel URL, and allow credentials (`credentials: true`).
    *   **SameSite Cookies**: For JWT auth cookie delivery, we set cookies with `httpOnly: true` (preventing script access), `secure: true` (ensuring HTTPS transmission), and `sameSite: "none"` (allowing cookies to be sent across different root domains like Vercel and Render).
