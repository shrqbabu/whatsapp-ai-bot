# Multi-Tenant WhatsApp AI Auto-Reply System: Architecture & Design

## 1. System Overview

This platform enables multiple independent users to pair their personal or business WhatsApp accounts via Baileys multi-device Web pairing and configure AI-powered automatic replies with granular control via a modern Android control panel.

```
┌─────────────────────────────────────────────────────────────┐
│                    Android Application                      │
│   (Jetpack Compose, Material 3, Clean MVVM Architecture)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS REST API + WebSocket
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Node.js Backend                         │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │        JWT Authentication & Tenant Isolation Guard    │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │ Scoped by User ID            │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │               WhatsApp Session Manager                │  │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────┐  │  │
│  │  │ Baileys Worker  │ │ Baileys Worker  │ │ Worker  │  │  │
│  │  │    User A       │ │    User B       │ │ User C  │  │  │
│  │  │(storage/user_A/)│ │(storage/user_B/)│ │  ...    │  │  │
│  │  └────────┬────────┘ └────────┬────────┘ └────┬────┘  │  │
│  └───────────┼───────────────────┼───────────────┼───────┘  │
│              │                   │               │          │
│              ▼                   ▼               ▼          │
│       ┌──────────────┐    ┌──────────────┐ ┌───────────┐    │
│       │  WhatsApp A  │    │  WhatsApp B  │ │WhatsApp C │    │
│       └──────────────┘    └──────────────┘ └───────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Tenant Session Isolation

To guarantee that one user's WhatsApp connection, QR code, chat messages, or AI actions cannot affect or leak to another user:

1. **Storage Isolation:** Each user has a dedicated authentication folder on disk under `storage/sessions/{userId}/` managed by `@whiskeysockets/baileys` `useMultiFileAuthState`.
2. **Memory Isolation:** The backend `WhatsAppSessionManager` maintains an in-memory map of `userId -> BaileysWorker`. Every connection, socket event, message send, or disconnect operation is strictly tied to that specific worker.
3. **Database Scoping:** Every SQL table (`whatsapp_sessions`, `ai_settings`, `contacts`, `contact_rules`, `group_rules`, `business_hours`, `conversations`, `messages`) contains a foreign key to `user_id`.
4. **API Tenant Guard:** The backend JWT middleware extracts the authenticated `userId` from verified tokens and rejects any attempt to query or modify data belonging to another tenant (`404` / `403`).
5. **WebSocket Routing:** The WebSocket server tracks connected socket clients in a `Map<userId, Set<WebSocket>>`. Events like `whatsapp.qr`, `whatsapp.status`, and `message.received` are delivered strictly to the authenticated sockets of that user.

---

## 3. Message Processing & AI Reply Pipeline

When an incoming WhatsApp message arrives:

```
Incoming WhatsApp Message Event
           │
           ▼
[1] Is it from own account (isFromMe)? ───► YES ──► Ignore (AI Loop Prevention)
           │ NO
           ▼
[2] Is it a broadcast / status update? ───► YES ──► Ignore
           │ NO
           ▼
[3] Is message already processed (ID deduplication)? ───► YES ──► Ignore
           │ NO
           ▼
[4] Upsert Contact & Conversation in DB
           │
           ▼
[5] Save Inbound Message in DB & notify Android via WebSocket
           │
           ▼
[6] Evaluate Rules Engine:
    ├── Global AI enabled in settings? (ai_settings.enabled)
    ├── Contact blocked? (contact_rules.blocked)
    ├── Contact AI disabled? (contact_rules.ai_enabled)
    ├── Is Group Message? ──► groups_enabled? ──► reply_only_when_mentioned?
    ├── Business Hours? ──► Within hours? ──► If outside: DO_NOTHING vs SEND_CUSTOM_MESSAGE
    └── Manual Takeover active? (conversations.takeover_active)
           │
           ├── FAILS ──► Terminate pipeline safely
           │
           └── PASSES
                  │
                  ▼
[7] Message Debouncer:
    Accumulate burst messages within configurable debounce window (e.g. 2s)
                  │
                  ▼
[8] AI Context Builder:
    Retrieve recent conversation history (last 10 messages) + System Prompt + Current text
                  │
                  ▼
[9] AI Provider Execution (OpenAI / Anthropic / Mock Provider)
                  │
                  ▼
[10] Configurable Reply Delay (Asynchronous non-blocking timer)
                  │
                  ▼
[11] Re-check manual takeover status
                  │
                  ▼
[12] Send outgoing message via user's isolated Baileys socket
                  │
                  ▼
[13] Save outgoing message in DB (ai_generated = true) & notify Android app
```

---

## 4. WebSocket Event Specification

All WebSocket payloads follow this JSON schema:

```json
{
  "event": "event_name",
  "data": { ... },
  "timestamp": "2026-09-06T15:00:00.000Z"
}
```

### Event Names:
- `whatsapp.status`: Emitted on status transition (`CONNECTED`, `CONNECTING`, `QR_REQUIRED`, `DISCONNECTED`, `RECONNECTING`, `LOGGED_OUT`, `ERROR`).
- `whatsapp.qr`: Emitted when pairing QR is generated, containing a Base64 image string.
- `whatsapp.connected`: Emitted when WhatsApp Web is paired, containing the user's phone number.
- `whatsapp.disconnected`: Emitted when the session is closed.
- `whatsapp.reconnecting`: Emitted when attempting automatic reconnection.
- `message.received`: Emitted when an incoming WhatsApp message is processed and stored.
- `message.sent`: Emitted when an outgoing message is dispatched.
- `ai.processing`: Emitted when AI begins reasoning.
- `ai.replied`: Emitted when the AI auto-reply has been delivered to WhatsApp.
- `takeover.changed`: Emitted when human manual takeover is toggled on a conversation.
