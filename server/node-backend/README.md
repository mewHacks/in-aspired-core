# In-Aspired Backend (Node.js)

The core backend service for **In-Aspired**, built with **Express.js** and **Socket.io**. This service handles authentication (including 2FA), user data management, and the real-time infrastructure for virtual study rooms.

## Table of Contents
- [Project Overview](#project-overview)
- [Prerequisites](#prerequisites)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Installation & Running](#installation--running)
- [API Overview](#api-overview)
- [Technical Highlights](#technical-highlights)
- [Chatbot Architecture](#chatbot-architecture)
- [Payment System](#payment-system)
- [Database Models](#database-models)
- [Testing](#testing)
- [Contributing](#contributing)

## Project Overview
Node.js backend provides persistent REST APIs, secure authentication, and real-time WebSocket capabilities for the In-Aspired client.

## Prerequisites
- **Node.js** (v20+ recommended)
- **MongoDB** (Local instance or Atlas cloud cluster)
- **npm** (comes with Node.js)

## Tech Stack
- **Runtime**: Node.js (TypeScript)
- **Web Framework**: Express.js v5
- **Database**: MongoDB (Mongoose ODM)
- **Real-Time Engine**: Socket.io
- **AI Engine**: Google Gemini (`gemini-2.5-flash` for chat/PDF, `gemini-embedding-001` for embeddings)
- **Security**: Helmet, Rate Limiting, BCrypt, JWT, Speakeasy (2FA)
- **Validation**: Zod

## Project Structure
```
src/
├── controllers/    # Request handlers (business logic)
├── middleware/     # Auth, Validation, Rate Limiting
├── models/         # Mongoose Schemas (User, Room, etc.)
├── routes/         # Express Route definitions
├── schemas/        # Zod Validation Schemas
├── services/       # External integrations (Email, Gemini AI, Embeddings)
├── socket/         # Socket.io event handlers
├── utils/          # Helpers (Encryption, JWT, Intent Detection)
└── data/           # Static data (System Info, Domain Maps)
```

## Environment Variables
Configure these in a `.env` file in the `server/node-backend` directory.

| Variable | Description | Default / Example | Required |
|----------|-------------|-------------------|----------|
| `PORT` | API Server Port | `5000` | No |
| `MONGODB_URI` | MongoDB Connection String | `mongodb://localhost:27017/in-aspired` | **Yes** |
| `JWT_SECRET` | Secret for signing Auth Tokens | `super_secure_secret` | **Yes** |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` | **Yes** |
| `REDIS_URL` | Redis connection string (room state + adapter) | `redis://localhost:6379` | No |
| `GEMINI_API_KEY` | Google Generative AI API Key | *(your key)* | No |
| `SMTP_SERVICE` | SMTP provider name | `gmail` | No |
| `SMTP_HOST` | SMTP host | `smtp.gmail.com` | No |
| `SMTP_PORT` | SMTP port | `587` | No |
| `SMTP_USER` | SMTP username | `email@example.com` | No |
| `SMTP_PASS` | SMTP password / app password | `password` | No |
| `SMTP_FROM_EMAIL` | Default From address | `"In-Aspired" <inaspired.official@gmail.com>` | No |
| `OFFICIAL_EMAIL` | Contact receiver | `inaspired.official@gmail.com` | No |
| `VAPID_PUBLIC_KEY` | Web Push public key | *(generated)* | No |
| `VAPID_PRIVATE_KEY` | Web Push private key | *(generated)* | No |
| `VAPID_SUBJECT` | Web Push subject | `mailto:inaspired.official@gmail.com` | No |
| `LEMONSQUEEZY_STORE_ID` | LemonSqueezy store ID | *(your store)* | No |
| `LEMONSQUEEZY_VARIANT_ID` | LemonSqueezy variant ID | *(your variant)* | No |
| `LEMONSQUEEZY_API_KEY` | LemonSqueezy API key | *(your key)* | No |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | LemonSqueezy webhook secret | *(your secret)* | No |
| `TWO_FACTOR_ENCRYPTION_KEY` | AES key for encrypting TOTP secrets | *(32+ chars)* | **Yes** |
| `PUPPETEER_EXECUTABLE_PATH` | Chromium path (Docker/Fly) | `/usr/bin/chromium` | No |

## Installation & Running

```bash
# 1. Install Dependencies
cd server/node-backend
npm install

# 2. Start Development Server (Hot Reload)
npm run dev

# 3. Build & Start Production
npm run build && npm start
```

## API Overview

The backend exposes endpoints for:

- **Authentication**: Sign up, login, Google OAuth, token refresh, logout
- **User Management**: Profile retrieval/update, 2FA enable/verify
- **Careers & Courses**: Browse, search, and manage educational content
- **Rooms**: Create/join virtual study rooms with real-time collaboration
- **Chatbot**: Hybrid AI chat interface powered by deterministic rules + LLM
- **Payments & PDFs**: Checkout and automated fulfillment via LemonSqueezy

## Technical Highlights

### Real-Time Collaboration (Socket.io)
Virtual study rooms support live collaboration via WebSocket:
- **Shared Whiteboard**: Real-time drawing with cursor tracking and state synchronization across all participants.
- **WebRTC Video/Audio**: Peer-to-peer video calls with signaling handled through Socket.io events.
- **Host Controls**: Session management including kick, timer sync, and room settings updates.
- **Pomodoro Timer**: Synchronized focus/break timer across all room participants.

### AI-Powered Personalization
- **RIASEC Profiling**: The recommendation engine uses cosine similarity to match a user's psychometric profile against career and course data.
- **Vector Search**: Course and career descriptions are embedded using the Google Generative AI SDK, enabling semantic search that understands intent beyond exact keywords.
- **Contextual Chatbot**: The chatbot injects the user's RIASEC code into every LLM prompt, allowing responses to be personalized to their interests and strengths.

### Multilingual Support
- The chatbot responds in the user's language (English, Chinese, Malay, Tamil) even when the underlying database content is English-only, achieved via LLM-powered on-the-fly translation.
- The frontend supports full i18n with locale-specific translation files.

## Chatbot Architecture

The In-Aspired chatbot uses a **Hybrid Architecture** combining deterministic rules for speed and an LLM for intelligence.

### Design Philosophy
- **Fast for common queries** (~90% of traffic): Regex patterns and keyword scoring handle greetings, system questions, and clear course/career queries instantly.
- **Smart for complex queries**: Google Gemini 2.5 Flash handles ambiguity, typos, multilingual input, and natural conversation.
- **Cost-efficient**: LLM is only invoked when the deterministic layer cannot resolve the intent, keeping API usage low.

### Control Flow (4 Phases)

**Phase 1 — Input Processing**: The user message is sanitized (trimmed to 500 chars), the last 3 messages of conversation history are loaded for context, and the user's RIASEC profile is fetched from MongoDB. Regex also extracts entities like institution names (e.g., "Sunway", "Taylor's") and course name patterns (e.g., "Diploma in X").

**Phase 2 — Intent Classification**: The bot classifies the user's intent into one of three paths:
- **SYSTEM_INFO**: Questions about the app itself (e.g., "How do I create a room?"). Static FAQ/feature text is injected into the LLM prompt.
- **DATA_RETRIEVAL**: Questions about courses or careers. Sub-classified into `COURSE_DISCOVERY`, `CAREER_DISCOVERY`, `DOMAIN_EXPLORATION`, or `SPECIFIC_QUERY`. If the query is ambiguous (e.g., "tell me about sports"), the LLM is asked to clarify intent first.
- **GENERAL_CHAT**: Greetings and small talk.

**Phase 3 — Hybrid Search**: For data retrieval queries, keywords are expanded using a domain map (e.g., "IT" → ["Software", "Computer Science"]), then MongoDB is queried across the Courses and Careers collections. If the deterministic search fails, domain-based fallback results are returned instead.

**Phase 4 — Response Generation**: The LLM receives a fully assembled prompt containing the system persona, the user's RIASEC code, retrieved database results (top 5), conversation history (last 3 turns), and instructions to always reply in the user's language (supports Chinese, Malay, Tamil).

### Key Features
| Feature | Description |
| :--- | :--- |
| **Typo Tolerance** | LLM corrects typos before database search (e.g., "Pscyhology" → "Psychology") |
| **Context Memory** | Remembers the last topic for 3 conversation turns for follow-up questions |
| **Institution Filtering** | Detects university names and scopes results (e.g., "Sunway Medical" → Medical courses at Sunway) |
| **Multilingual Support** | Responds in the user's language even when database content is English-only |
| **System Knowledge** | Answers questions about app features (music player, whiteboard, pomodoro timer) using injected static knowledge |

### Resilience & Fallback

The chatbot and embedding layer are designed to degrade gracefully when external services fail:

**Embedding circuit breaker** (`services/embedding.service.ts`):
- Tracks consecutive Gemini API failures with a 3-state circuit breaker: `CLOSED` (normal) → `OPEN` (fail-fast) → `HALF_OPEN` (probe)
- After **3 consecutive failures**, the circuit opens for **30 seconds** — all embedding requests fail immediately without waiting for a timeout
- After the cooldown, a single probe request tests recovery; success closes the circuit
- Callers receive `{ usedFallback: true }` and fall back to keyword search automatically

**Chatbot fallback chain**:
1. Gemini API responds normally → full LLM response
2. Gemini down / circuit open → deterministic intent classifier + regex search + template response
3. Database search returns no results → domain-based fallback results

This means the chatbot remains functional even during a complete Gemini API outage, with only a degradation in response quality.

### File Structure
| File | Role |
| :--- | :--- |
| `controllers/chat.controller.ts` | Orchestrator — routes messages through the 4-phase pipeline |
| `services/ai.service.ts` | LLM interface — communicates with Google Gemini |
| `services/embedding.service.ts` | Embedding generation with circuit breaker and keyword fallback |
| `utils/intent.utils.ts` | Deterministic intent classifier using regex patterns |
| `data/systemInfo.ts` | Static knowledge base about app features for SYSTEM_INFO queries |

## Payment System
*(Proprietary extension - not included in open source)*

The payment system integrates with payment providers for premium PDF report fulfillment.
1. **Secure Checkout**: Generates signed checkout URLs.
2. **Webhook Verification**: Validates webhook signatures.
3. **Automated Fulfillment**: Creates transaction, generates PDF, sends email.

## Database Models
The application uses the following Mongoose models in MongoDB:

- **User**: Stores profile, role, auth credentials, and 2FA secrets.
- **Career**: Job details, salary ranges, and RIASEC codes.
- **Course**: Educational courses linked to careers.
- **UserSavedCourse**: User's saved courses.
- **UserSavedCareer**: User's saved careers.
- **Result**: User quiz scores and analysis snapshots.
- **Room**: Virtual study room metadata and settings.
- **RoomMember**: Tracks active participants in rooms.
- **Session**: Tracks user's session in a room.
- **Participation**: Checks if user is eligible to create a room.
- **Whiteboard**: Collaborative whiteboard data for rooms.
- **PomodoroSession**: Tracks user's pomodoro timer sessions.
- **CuratedResource**: Pre-defined learning materials.
- **Resource**: Shared resources uploaded by usersin a room.
- **Transaction**: Payment records and fulfillment status.
- **Notification**: User alerts and announcements.
- **Message / AIChatMessage / AIConversation**: Room chat history and AI chat storage.
- **Contact**: Contact information and content from users.

## Testing
We use **Jest** and **Supertest**.

```bash
# Run all tests
npm test

# Run specific file
npx jest auth.controller
```

## Contributing
- **Validation**: Always use Zod schemas in `src/schemas`.
- **Errors**: Use the global `AppError` class.
