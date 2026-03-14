// VirtualRoomPage.test.tsx
// Integration tests for the Virtual Study Room page
// Verifies room data loading, socket connection lifecycle, and media control toggling
// Uses MemoryRouter with parameterised route to simulate navigation to /rooms/:id

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Route, Routes, MemoryRouter } from 'react-router-dom';
import VirtualRoomPage from '../../pages/VirtualRoomPage';
import { ConfirmProvider } from '../../contexts/ConfirmContext';


// --- MOCKS ---

// 1. Mock Contexts — provide deterministic socket, auth user, and toast stubs
const mockSocket = {
    emit: vi.fn(),   // tracks socket emissions (join-room, leave-room, etc.)
    on: vi.fn(),      // tracks event listener registration
    off: vi.fn()      // tracks event listener removal
};

vi.mock('../../contexts/SocketContext', () => ({
    useSocket: () => ({
        socket: mockSocket,
        connected: true
    })
}));

// Auth mock includes _id and email — the component uses both when
// constructing the join-room payload sent to the socket server
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'test-user-id', _id: 'test-user-id', name: 'Test User', email: 'test@test.com' }
    })
}));

vi.mock('../../contexts/ToastContext', () => ({
    useToast: () => ({
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn()
    })
}));

// 2. Mock Custom Hooks — WebRTC hook is stubbed to avoid real media device access
const mockToggleAudio = vi.fn();
const mockToggleVideo = vi.fn();

vi.mock('../../hooks/useWebRTC', () => ({
    useWebRTC: () => ({
        userStream: null,
        peers: [],
        toggleAudio: mockToggleAudio,
        toggleVideo: mockToggleVideo,
        streamReady: true
    })
}));

// 3. Mock Child Components (to avoid deep rendering issues)
vi.mock('../../components/rooms/Whiteboard', () => ({
    default: () => <div data-testid="mock-whiteboard">Whiteboard</div>
}));

vi.mock('../../components/room/MusicPlayer', () => ({
    default: () => <div data-testid="mock-music-player">Music Player</div>
}));

vi.mock('../../components/room/ResourcesPanel', () => ({
    default: () => <div data-testid="mock-resources-panel">Resources Panel</div>
}));

vi.mock('../../components/room/TodoPanel', () => ({
    default: () => <div data-testid="mock-todo-panel">Todo Panel</div>
}));

// 4. Mock Global Fetch — intercepts the GET /api/rooms/:id call
global.fetch = vi.fn();

// --- TESTS ---

describe('VirtualRoomPage Integration', () => {

    // Reset all mocks before each test to prevent cross-test contamination
    beforeEach(() => {
        vi.clearAllMocks();

        // Default Mock API Response — returns a fully configured room object
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                _id: 'room-123',
                name: 'Test Room',
                type: 'public', // Changed from public to 'public' to match type if necessary, usually it's string
                level: 'Beginner',
                sessionDuration: 60,
                allowCamera: true,
                allowAudio: true,
                allowWhiteboard: true
            })
        });
    });

    // Helper — renders VirtualRoomPage within a MemoryRouter pre-navigated to /rooms/room-123
    // ConfirmProvider wraps the page because the component may trigger confirmation dialogs
    const renderPage = () => {
        return render(
            <MemoryRouter initialEntries={['/rooms/room-123']}>
                <ConfirmProvider>
                    <Routes>
                        <Route path="/rooms/:id" element={<VirtualRoomPage />} />
                    </Routes>
                </ConfirmProvider>
            </MemoryRouter>
        );
    }

    // Test 1: While fetch is pending the page should display a loading indicator
    it('renders loading state initially', async () => {
        // Return a never-resolving promise so the component stays in loading state
        (global.fetch as any).mockImplementationOnce(() => new Promise(() => { }));
        renderPage();
        expect(screen.getByText(/Loading Room/i)).toBeInTheDocument();
    });

    // Test 2: After the room data fetch resolves, the room name and key UI elements render
    it('renders room UI after data fetch', async () => {
        renderPage();

        // Wait for room name to appear (indicates fetch resolved and state updated)
        await waitFor(() => {
            expect(screen.getByText('Test Room')).toBeInTheDocument();
        });

        // Verify supplementary UI sections rendered
        expect(screen.getByText(/ID:/)).toBeInTheDocument();
        expect(screen.getByTestId('mock-music-player')).toBeInTheDocument();
    });

    // Test 3: After room data loads, the component emits a 'join-room' event via socket
    // Note: The socket emit happens in a useEffect that depends on the room state,
    // so we must wait for the room data first, then poll for the emit in a separate waitFor
    it('joins room via socket on mount', async () => {
        renderPage();

        // Phase 1 — wait for room data to populate the UI
        await waitFor(() => {
            expect(screen.getByText('Test Room')).toBeInTheDocument();
        });

        // Phase 2 — wait for the socket emit triggered by the room-dependent useEffect
        await waitFor(() => {
            expect(mockSocket.emit).toHaveBeenCalled();
        }, { timeout: 1000 });

        // Verify the emitted payload contains the correct room ID and user info
        expect(mockSocket.emit).toHaveBeenCalledWith('join-room', expect.objectContaining({
            roomId: 'room-123',
            user: expect.objectContaining({ name: 'Test User' })
        }));
    });

    // Test 4: Clicking the microphone toggle button invokes the WebRTC toggleAudio hook
    it('toggles microphone', async () => {
        renderPage();
        await waitFor(() => screen.getByText('Test Room'));

        // Mic defaults to off, so the button title is "Unmute Microphone"
        const micBtn = screen.getByTitle('Unmute Microphone');
        fireEvent.click(micBtn);

        // toggleAudio(true) should be called to enable the microphone
        expect(mockToggleAudio).toHaveBeenCalledWith(true);
    });
});
