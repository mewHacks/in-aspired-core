# In-Aspired Client

The dedicated frontend for In-Aspired, built to deliver a **premium, glassmorphic user experience**. This documentation focuses on the UI/UX architecture, component hierarchy, and client-side logic.

## Table of Contents
- [Project Overview](#project-overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Installation & Running](#installation--running)
- [Folder Structure](#folder-structure)
- [Architecture & State](#architecture--state)
- [RIASEC Quiz Experience](#riasec-quiz-experience)
- [Virtual Room Implementation](#virtual-room-implementation)
- [Design System & Visuals](#design-system--visuals)
- [Testing](#testing)
- [Contributing](#contributing)

## Project Overview
This React web client serves as the interactive interface for the In-Aspired platform. It consumes Node.js APIs for user data, AI-driven recommendations, and real-time collaboration, rendering them in a highly animated UI.

## Prerequisites
- **Node.js** (v20+ recommended)
- **npm** or **yarn**
- **Vite** (included in dev dependencies)

## Environment Setup
Create a `.env` file in the `client/` directory:

```env
# API Connection
VITE_API_URL=http://localhost:5000

# Authentication (Google OAuth)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## Installation & Running

```bash
# 1. Install Dependencies
cd client
npm install

# 2. Start Development Server (HMR enabled)
npm run dev

# 3. Build for Production
npm run build
```

## Folder Structure

```
client/src/
├── components/
│   ├── layout/         # Navbar, Footer
│   ├── rooms/          # Virtual Room specifics (Whiteboard, VideoGrid)
│   ├── visuals/        # Complex Charts (Recharts, RiasecRadar)
│   ├── ui/             # Reusable atoms (Button, Card, Modal)
│   └── ...
├── contexts/           # Global State (AuthContext, SocketContext)
├── hooks/              # Custom Hooks (useWebRTC, useSocket)
├── pages/              # Route Page Components
├── services/           # API Integration Layer
├── styles/             # Global CSS and Tailwind directives
└── App.tsx             # Entry point & Routing
```

## Architecture & State

### 1. Global State (React Context)
- **`AuthContext`**: Manages user sessions via JWT/Cookies and auto-refreshes tokens.
- **`SocketContext`**: Maintains the single persistent WebSocket connection to avoid re-handshakes.
- **`ToastContext`**: Global notification system.

### 2. Service Layer
Business logic is decoupled from UI components. Data fetching uses the `httpClient` wrapper around `fetch` to handle cookie refresh and retries.

## RIASEC Quiz Experience

The quiz is one of the platform's key UX differentiators. To combat survey fatigue — the biggest problem with psychometric assessments — each question is presented in one of **5 rotating interaction styles**, randomly assigned per question:

| Style | Description |
|---|---|
| `DialogueChoiceView` | Conversation-style layout — feels like a chat, not a form |
| `DirectionalNavView` | Swipe/arrow-based navigation for tactile response selection |
| `SceneSelectionView` | Visual scenario cards — students pick a scene that resonates |
| `StandardCardView` | Classic quiz card layout for straightforward questions |
| `TvRemoteView` | Gamified remote-control UI — makes the quiz feel playful |

All five styles feed into the same underlying RIASEC scoring engine. The variety keeps students engaged across the full quiz without changing what is being measured.

Components live in `src/components/quiz-interactions/`.

---

## Virtual Room Implementation
The **Virtual Room** (`VirtualRoomPage.tsx`) is the most complex feature, orchestrating three real-time systems:

1.  **WebRTC Mesh Network**: `useWebRTC` hook manages P2P video streams between all participants.
2.  **Synced Whiteboard**: `Whiteboard.tsx` wraps **Excalidraw**, broadcasting scene updates via Socket.io.
3.  **Collaborative Tool**: Pomodoro timer is synced server-side to keep all users in the same state.

## Design System & Visuals

### 1. Glassmorphism
We use extensive `backdrop-filter: blur()` and translucent white layers to create depth.
### 2. Aurora Gradients
Backgrounds use animated mesh gradients (indigo/purple/teal) to create a "breathing" feel.
### 3. Typography
- **Headings**: `Outfit` (Geometric, Modern, Tech-forward)
- **Body**: `Plus Jakarta Sans` (Highly legible)
### 4. Micro-Interactions
- **Magnetic Buttons**: Buttons subtly track cursor position.
- **Scroll Revelation**: Content fades in effortlessly on scroll.

## Testing
We use **Vitest** for unit and component testing.

```bash
# Run all tests
npm test
```

## Contributing

### Component Guidelines
- **Naming**: Use PascalCase for components (`CareerCard.tsx`) and camelCase for hooks (`useAuth.ts`).
- **Styling**: strictly usage of **Tailwind CSS**. Avoid CSS modules explicitly.
- **Performance**: Use `React.memo` for high-frequency updates (like Whiteboard).

### Pull Request Process
1. Create a feature branch.
2. Ensure no linting errors (`npm run lint`).
3. Open a Pull Request.
