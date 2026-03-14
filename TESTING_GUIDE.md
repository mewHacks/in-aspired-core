# 🧪 Testing Guide
*For In-Aspired Team*

This guide explains exactly how to test every part of the application. Follow this checklist whenever you build a new feature.

## 📊 Current Coverage Summary

| Workspace | Test Files | Tests | Status |
|-----------|-----------|-------|--------|
| Client (Vitest) | ~8 | ~50+ | Active |
| Server (Jest) | **30** | **344** | **Comprehensive** |

The backend has **comprehensive test coverage** with:
- 30 test files, 344 tests, all passing
- All major controllers, services, middleware, and models covered
- Full integration tests with mocked dependencies
- Socket event tests for real-time room functionality

## 📂 Project Structure & Test Locations

We mirror our source code structure in our tests.

| Stack | Code Location | Test Location | Test Extension |
|-------|---------------|---------------|----------------|
| **Frontend** (React) | `client/src/` | `client/src/__tests__/` | `.test.tsx` / `.test.ts` |
| **Backend** (Node) | `server/node-backend/src/` | `server/node-backend/__tests__/` | `.test.ts` |

---

## ✅ The Master Checklist
*Copy this into your PR description!*

- [ ] **1. Unit Tests**: Does it work in isolation? (e.g., Button clicks, Input validation).
- [ ] **2. Integration Tests**: Does it work with others? (e.g., Page loads, API calls, Navigation).
- [ ] **3. Edge Cases**: Did you test empty states, error states, and invalid inputs?
- [ ] **4. Clean Up**: Removed `console.log`? meaningful descriptions in `it()`?

---

## ⚛️ Part 1: Frontend Testing (React)
**Framework**: Vitest + React Testing Library (RTL).

### 📝 How to write a Component Test
**Goal**: Verify a UI component (like a Button or Card) renders and responds to clicks.

**File**: `client/src/__tests__/components/MyComponent.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from '../../components/ui/MyComponent';

// Main test suite
describe('MyComponent', () => {
    // Test 1: Happy path
    it('renders with correct title', () => {
        render(<MyComponent title="Hello World" />);
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    // Test 2: Interaction
    it('calls onClick handler when clicked', () => {
        const handleClick = vi.fn(); // Mock function
        render(<MyComponent onClick={handleClick} />);
        
        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    // Test 3: Conditional rendering (Edge case)
    it('shows loading state', () => {
        render(<MyComponent isLoading={true} />);
        expect(screen.getByRole('status')).toBeInTheDocument(); // Assuming spinner has role="status"
    });
});
```

### 📝 How to write a Page Test (Mocking API & Router)
**Goal**: Verify a full page logic without hitting a real backend.

**File**: `client/src/__tests__/pages/MyPage.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyPage from '../../pages/MyPage';

// Mock external dependencies
const mockNavigate = vi.fn();

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

// Mock global fetch (API)
global.fetch = vi.fn();

// Main test suite
describe('My Page Integration', () => {

    // Clear all mocks before each test
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Test 1: Navigates on success
    it('navigates on success', async () => {

        // Setup successful API response
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });

        // Render page
        render(<BrowserRouter><MyPage /></BrowserRouter>);

        // Interact (assuming there is a button)
        // fireEvent.click(screen.getByText('Submit'));

        // Assert navigation happened
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });
    });
});
```

---

## 🟢 Part 2: Backend Testing (Node.js)
**Framework**: Jest + Supertest

### 📝 How to write an API Route Test
**Goal**: Sending a specific HTTP request returns the expected status and JSON.

**File**: `server/node-backend/__tests__/controllers/my.controller.test.ts`

```typescript
import request from 'supertest';
import app from '../../src/app'; // Your Express App

// Main test suite
describe('My Controller', () => {
    // Test 1: Success case
    it('GET /api/items returns 200 and list', async () => {
        const response = await request(app).get('/api/items');
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.header['content-type']).toMatch(/json/);
    });

    // Test 2: Error case
    it('POST /api/items returns 400 for missing data', async () => {
        const response = await request(app)
            .post('/api/items')
            .send({}); // Empty body
            
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Name is required');
    });
});
```

---



## 🏃‍♂️ Commands Cheat Sheet

| Action | Command | Working Directory |
|--------|---------|-------------------|
| **Run Frontend Tests** | `npm test` | `client/` |
| **Run Node Backend Tests** | `npm test` | `server/node-backend/` |
| **Linting** | `npm run lint` | `client/` or `server/node-backend/` |

---

## 🛠️ Infrastructure Requirements (Backend)

Previously, backend tests were purely mocked. To ensure security logic (like token rotation and rate limiting) works in real scenarios, we have transitioned to **Stateful Testing**.

### Prerequisites for Full Test Suite:
1.  **MongoDB**: Tests use a local database (default: `mongodb://127.0.0.1:27017/in-aspired-test`).
2.  **Redis**: Required for rate limiting and room state tests (default: `127.0.0.1:6379`).

**CI Behavior**: Our GitHub Actions workflow automatically initializes these services using Docker containers.

**Local Development**: If you don't have Redis/Mongo running locally, some stateful tests (like `authRateLimiter`) may fail with `ECONNREFUSED`.

---

## 💡 Best Practices

1.  **Triple A Pattern**: Structure your tests as **Arrange**, **Act**, **Assert**.
    ```javascript
    // Arrange
    const input = 5;
    // Act
    const result = calculate(input);
    // Assert
    expect(result).toBe(10);
    ```
2.  **Descriptive Names**: 
    *   ❌ `it('works', ...)`
    *   ✅ `it('should return 400 when email is invalid', ...)`
3.  **Mock Expensive Things**: Never hit real Database or External APIs (Google, Stripe, OpenAI) in tests. Mock them!

---

# 📋 In-Aspired Complete Test Inventory
*A specific, file-by-file checklist of what needs to be tested.*

## Legend
- [/] **Tested**: Tests exist and pass.
- [ ] **Pending**: Needs validation.

---

## 🟢 Node.js Backend (`server/node-backend`)
*Focus: API Endpoints & Logic*

### Controllers
- [/] `auth.controller.ts` (Signup/Login)
- [/] `career.controller.ts`
    - [/] `getAllCareers`: Returns 200 and list.
    - [/] `getCareerById`: Returns 404 if not found.
- [/] `course.controller.ts`
    - [/] `getAllCourses`: Filtering logic.
- [/] `recommendation.controller.ts`
    - [/] `getRecommendations`: Auth check.
- [/] `resource.controller.ts`
    - [/] `uploadResource`: Multer file handling.
- [/] `room.controller.ts`
    - [/] `createRoom`: Owner association.
- [/] `contact.controller.ts`
    - [/] `sendMessage`: Email service call.
- [/] `users.controller.ts`
    - [/] `getProfile`: Secure data return.
- [/] `chat.controller.ts` (Chatbot history/clear) — **NOW TESTED**
- [/] `notification.controller.ts` — **NOW TESTED**
# [Proprietary] `payment.controller.ts` — not included in open source
- [/] `admin.controller.ts` — **NOW TESTED**
- [/] `feedback.controller.ts` — **NOW TESTED**

### Services
- [/] `ai.service.ts`: Mocked `GoogleGenerativeAI`.
- [/] `email.service.ts`: Mock `nodemailer` to fail/succeed.
- [/] `recommendation.service.ts`: Algorithm correctness.
- [/] `notification.service.ts` — **NOW TESTED** (16 tests: CRUD, socket emit, helpers)
# [Proprietary] `payment.service.ts` — not included in open source
- [/] `pdf.service.ts`: PDF generation (used by proprietary payment extension)

### Middleware
- [/] `auth.middleware.ts`: Blocks requests without valid JWT.
- [/] `rateLimiter.middleware.ts`: Blocks excessive requests.
- [/] `requireAdmin.middleware.ts`: Verifies admin role — **NOW TESTED**
- [/] `error.middleware.ts`: Global error handler — **NOW TESTED**
- [/] `validate.middleware.ts`: Zod/Joi schema validation — **NOW TESTED**
- [/] `upload.middleware.ts`: File upload config — **NOW TESTED**
- [/] `activityLogger.ts`: Logging + socket broadcast — **NOW TESTED**

### Models
- [/] `User.ts`: Schema, password hashing, toJSON transform — **TESTED**
- [ ] `Room.ts`, `Contact.ts`, `Career.ts`, `Message.ts`, `Course.ts`, `Participation.ts`, `Resource.ts`, `Transaction.ts`, `Notification.ts` (Verify schema/methods).

### Utils
- [ ] `encryption.ts`: Encrypt/Decrypt helpers.
- [/] `intent.utils.ts`

### Socket
- [/] `room-events.test.ts`: Room joining, drawing, messaging, host controls, session cleanup

---

## ⚛️ Frontend (`client/src`)
*Focus: UI Rendering & User Flows*

### Core Components (`components/ui`)
- [/] `Button.tsx`
- [/] `Input.tsx`: Interaction & Error states.
- [/] `Card.tsx`: Prop rendering.
- [ ] `HostControlsModal.tsx` (room controls modal): Open/Close state.
- [ ] `SearchBar.tsx`: Typing triggers callback.

### Feature Components
- [ ] `CareerCard.tsx` / `CourseCard.tsx`: Data display.
- [ ] `Whiteboard.tsx`: Canvas works without crashing (mock Canvas API).
- [ ] `ChatbotWidget.tsx`: Toggles open/close.

### Pages (Integration Tests)
- [/] `LoginPage.tsx`
- [/] `SignupPage.tsx`
- [ ] `HomePage.tsx`: Hero & Features load.
- [/] `QuizPage.tsx`:
    - [/] Advances to next question.
    - [/] Submits final score.
- [/] `VirtualRoomPage.tsx`:
    - [/] Socket connection (Mock `useWebRTC`).
    - [/] Render video/audio controls.
- [ ] `ResultsPage.tsx`: Displays RIASEC chart.

### Hooks & Utils
- [/] `validators.ts` (Email/Password logic).
- [ ] `useWebRTC.ts`: Complex mock required (ensure methods exist).

---


---

## Priority Order 
1.  **Core UI**: `Input`, `Card`, `Navbar`.
2.  **Room Logic**: `VirtualRoomPage` (Critical feature).
3.  **Quiz Flow**: `QuizPage` -> `ResultsPage` (Core value prop).
4.  **Backend CRUD**: `Course` & `Career` controllers.
