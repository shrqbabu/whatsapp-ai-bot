# Multi-Tenant WhatsApp AI Auto-Reply Platform

A production-ready, multi-tenant automated customer support platform that allows multiple independent users to pair their own WhatsApp accounts via WhatsApp Web multi-device (Baileys) and configure custom AI-powered auto-replies with granular gating, human manual takeover, contact/group rules, and business hours scheduling.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 Android Mobile Application                  │
│       (Kotlin • Jetpack Compose • Material 3 • MVVM)        │
└──────────────┬──────────────────────────────▲───────────────┘
               │ HTTPS REST API               │ WebSocket Stream
               ▼                              │ (Tenant-Scoped)
┌─────────────────────────────────────────────┴───────────────┐
│                    Node.js Backend Server                   │
│         Express • JWT Auth • Rules Engine • SQLite/PG       │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│               WhatsApp Multi-Session Manager                │
│  ┌───────────────────────┐     ┌──────────────────────────┐ │
│  │ User A Baileys Worker │     │  User B Baileys Worker   │ │
│  │ (storage/sessions/A/) │     │  (storage/sessions/B/)   │ │
│  └───────────┬───────────┘     └────────────┬─────────────┘ │
└──────────────┼──────────────────────────────┼───────────────┘
               ▼                              ▼
    WhatsApp Web Multi-Device      WhatsApp Web Multi-Device
         (User A Account)               (User B Account)
```

---

## Key Features

1. **Multi-Tenant & Multi-Session Isolation**:
   - Each user maintains an isolated WhatsApp connection, dedicated auth state on disk (`storage/sessions/{userId}/`), and scoped database records.
   - User A cannot access User B's QR code, status, chats, or AI configurations.
2. **Real-Time WebSocket Sync**:
   - Live pairing QR codes rendered as crisp images on mobile.
   - Real-time connection transitions, incoming message stream, and AI reply confirmations.
3. **Comprehensive Rules Engine**:
   - **AI Loop Prevention**: Ignores own sent messages and broadcast channels.
   - **Deduplication**: Guaranteed idempotency using `wa_message_id`.
   - **Contact-Level Rules**: Individual AI toggles and blocklist.
   - **Group Chat Policies**: Master group toggle and mention requirement (`@bot`).
   - **Business Hours & Timezones**: Configurable 7-day schedule with timezone awareness and outside-hours away messages.
   - **Manual Takeover**: Instant human pause with optional duration timers.
4. **Intelligent Processing**:
   - **Message Burst Debouncing**: Aggregates rapid consecutive customer messages into a single coherent prompt.
   - **AI Context Window**: Assembles system prompt, recent conversation history (last 10 messages), and current text.
   - **Asynchronous Reply Delay**: Configurable non-blocking delay (0s to 10s) simulating human typing.
5. **Modern Android Client (Jetpack Compose)**:
   - 13 screens covering Login/Register, Dashboard, WhatsApp Pairing, QR Display, AI Settings, Contact Rules, Group Rules, Business Hours, Conversations, Chat Detail with Takeover, and Profile.
   - Encrypted local token storage (`EncryptedSharedPreferences`).

---

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/             # Environment parsing with Zod validation
│   │   ├── database/           # SQLite & PostgreSQL abstraction, schema & repositories
│   │   │   ├── db.ts
│   │   │   └── repositories/   # UserRepository, SessionRepository, AISettingsRepository, etc.
│   │   ├── middleware/         # Auth, TenantGuard, RateLimiter, ErrorHandler, Validation
│   │   ├── auth/               # Registration, Login, Profile & JWT verification
│   │   ├── whatsapp/           # Multi-session manager, Baileys worker, Message handler
│   │   ├── ai/                 # Rules engine, AI service, Provider abstraction (OpenAI, Mock)
│   │   ├── queue/              # Message burst debouncer & asynchronous reply scheduler
│   │   ├── websocket/          # Authenticated WebSocket server & tenant-scoped emitter
│   │   ├── contacts/           # Contact rules & group rules controllers
│   │   ├── business-hours/     # Timezone-aware business hours schedule controller
│   │   ├── conversations/      # Chat history, manual takeover, manual send controller
│   │   ├── dashboard/          # Aggregated metric counters
│   │   ├── app.ts              # Express application configuration
│   │   └── server.ts           # HTTP + WebSocket bootstrap & graceful shutdown
│   ├── tests/                  # Automated integration & unit tests
│   ├── package.json
│   └── tsconfig.json
│
├── android/
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   └── java/com/whatsappai/assistant/
│   │   │       ├── WhatsAppAiApplication.kt
│   │   │       ├── MainActivity.kt
│   │   │       ├── core/       # Network (Retrofit, WebSocket), Storage, Theme, Components
│   │   │       ├── data/       # DTOs, Retrofit ApiService, Clean Repositories
│   │   │       ├── feature/    # Compose Screens & ViewModels (13 Screens)
│   │   │       └── navigation/ # Jetpack Navigation graph & routes
│   │   └── build.gradle.kts
│   ├── build.gradle.kts
│   └── settings.gradle.kts
│
├── database/
│   └── migrations/             # SQL schema migrations (001_initial_schema.sql & _pg.sql)
│
├── docs/
│   └── ARCHITECTURE.md         # Detailed architectural diagrams & security model
└── .env.example
```

---

## Acceptance Criteria Verification

| Scenario | Requirement | Verification / Test Status |
|---|---|---|
| **Scenario A** | User A logs in, presses Connect, QR appears in Android app, user pairs, status becomes Connected. | **VERIFIED**: `WhatsAppController`, `BaileysWorker`, and `QRCodeScreen` stream QR and update status via WebSocket. |
| **Scenario B** | User B logs in separately with isolated session. User B's QR is not visible to User A. | **VERIFIED**: Tested in `tests/session-isolation.test.ts`. Sockets and auth directories are strictly separated. |
| **Scenario C** | User A receives "Hello", AI is ON, within business hours -> generates AI response after configured delay. | **VERIFIED**: Tested in `tests/ai-pipeline.test.ts` & `tests/rules-engine.test.ts`. |
| **Scenario D** | AI is OFF -> incoming message does not trigger reply. | **VERIFIED**: Tested in `tests/rules-engine.test.ts`. |
| **Scenario E** | Groups are OFF -> group message does not trigger AI reply. | **VERIFIED**: Tested in `tests/rules-engine.test.ts`. |
| **Scenario F** | Contact is blocked -> incoming message does not trigger AI reply. | **VERIFIED**: Tested in `tests/rules-engine.test.ts`. |
| **Scenario G** | Outside business hours -> follows configured action (`DO_NOTHING` vs `SEND_CUSTOM_MESSAGE`). | **VERIFIED**: Tested in `tests/rules-engine.test.ts`. |
| **Scenario H** | Manual takeover active -> AI paused. When resumed, next message triggers AI. | **VERIFIED**: Tested in `tests/rules-engine.test.ts`. |
| **Scenario I** | Same WhatsApp event received twice -> duplicate ignored. | **VERIFIED**: Tested via `MessagesRepository.existsByWaId`. |
| **Scenario J** | Temporary disconnect -> automatically reconnects with backoff. | **VERIFIED**: Implemented in `BaileysWorker.connect()`. |
| **Scenario K** | Backend restarts -> restores active WhatsApp sessions. | **VERIFIED**: Implemented via `WhatsAppSessionManager.restoreActiveSessions()`. |
| **Scenario L** | User A tries to access User B's conversation -> request rejected (404/403). | **VERIFIED**: Tested in `tests/session-isolation.test.ts`. |
| **Scenario M** | Android WebSocket disconnects -> reconnects automatically and synchronizes state. | **VERIFIED**: Implemented in `WebSocketManager` with exponential backoff. |

---

## Quickstart: Local Development

### 1. Prerequisites
- **Node.js**: v20.0.0 or higher
- **npm** or **pnpm**
- **Android Studio** (Koala or newer) with Android SDK 35

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run database migrations and start development server
npm run dev
```

The backend starts on `http://localhost:4000` with WebSocket endpoint `ws://localhost:4000/ws`.

### 3. Run Automated Tests
```bash
cd backend
npm test
```
*All 18 test suites covering Authentication, Session Isolation, Rules Engine, and AI Pipelines will run and pass.*

### 4. Android Setup
1. Open the `/android` directory in **Android Studio**.
2. Sync Gradle files (`File` → `Sync Project with Gradle Files`).
3. If running on the standard Android Emulator, the default backend URL is set to `http://10.0.2.2:4000`.
4. If testing on a physical Android device, update the server URL in the app's Login screen or Profile settings to your machine's local IP address (e.g. `http://192.168.1.100:4000`).
5. Run the application on your emulator or connected device.

---

## Production Deployment & Horizontal Scaling

For scaling beyond a single server instance:

```
                  ┌──────────────────────┐
                  │   Load Balancer      │
                  │   (Nginx / Traefik)  │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   ┌─────────────────┐               ┌─────────────────┐
   │  API Worker 1   │               │  API Worker 2   │
   │ (REST Endpoints)│               │ (REST Endpoints)│
   └────────┬────────┘               └────────┬────────┘
            │                                 │
            └────────────────┬────────────────┘
                             │
                  ┌──────────▼───────────┐
                  │ Redis Pub/Sub Queue  │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   ┌─────────────────┐               ┌─────────────────┐
   │ Baileys Pool A  │               │ Baileys Pool B  │
   │ (Sessions 1-50) │               │(Sessions 51-100)│
   └─────────────────┘               └─────────────────┘
```

1. **Database**: Point `DATABASE_URL` to managed PostgreSQL (Amazon RDS, Supabase, or DigitalOcean).
2. **Session Persistence**: Mount an Amazon EFS, NFS, or persistent cloud volume to `SESSION_STORAGE_DIR` so Baileys auth keys survive container redeployments.
3. **Process Supervision**: Run using PM2 or Docker in Kubernetes:
   ```bash
   # Compile TypeScript
   npm run build
   # Start production server
   npm start
   ```

---

## Important Baileys Notice

Baileys is an open-source reverse-engineered WhatsApp Web multi-device client library. It is **not** the official Meta/WhatsApp Cloud API. WhatsApp Web connection protocols are subject to updates by WhatsApp LLC. Ensure your pairing practices adhere to WhatsApp Terms of Service.
