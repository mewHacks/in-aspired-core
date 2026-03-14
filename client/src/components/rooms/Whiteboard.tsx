import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Excalidraw, reconcileElements } from "@excalidraw/excalidraw"; // Import reconcileElements for merging, fix “last writer wins” scene replacement bugs
import "@excalidraw/excalidraw/index.css";
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { useParams } from 'react-router-dom';

// Props for Whiteboard component
interface WhiteboardProps {
    roomId?: string;
    isReadOnly?: boolean;
}

// Main whiteboard component
const Whiteboard: React.FC<WhiteboardProps> = ({ isReadOnly = false }) => {

    // Get room ID from URL params, user (for cursors and labels) and socket.io connection + status
    const { id: routeRoomId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const { socket, connected } = useSocket();

    // Holds Excalidraw imperative API once mounted
    const [excalidrawAPI, setExcalidrawAPI] = useState<any | null>(null);

    // Cursor data to render live cursor positions for collaborators
    const [collaborators, setCollaborators] = useState<Map<string, any>>(new Map());

    // Flag to ensure we don't emit changes before we've verified server state
    // Avoids overwriting a populated board with an empty local scene
    const [isSynced, setIsSynced] = useState(false);

    // Track if we have local changes pending emission to avoid reconciliation conflicts to fix flashing delete bugs
    // Because emissions are debounced (50ms) and remote updates might arrive
    const hasPendingChanges = useRef(false);

    // Persistent file cache to ensure images are retained across onChange calls
    const filesRef = useRef<Record<string, any>>({});
    const pendingFileEmitRef = useRef<NodeJS.Timeout | null>(null);

    // "Zombie" protection: Track recently deleted element IDs to strictly enforce deletion
    // regardless of what remote updates say (fixes "reappearing" bugs or race conditions)
    const recentDeletesRef = useRef<Set<string>>(new Set());

    // Use roomId from props or route
    const currentRoomId = routeRoomId;

    useEffect(() => {
        if (!socket || !connected || !currentRoomId) return;

        // Explicitly request the authoritative room state on mount
        socket.emit('get-whiteboard-state', currentRoomId);

        // Handle full state sync from server
        const handleWhiteboardState = (data: { elements: any[], files?: any }) => {
            if (excalidrawAPI) {

                // Store files in persistent cache
                if (data.files) {
                    filesRef.current = { ...data.files };
                }

                // For initial sync, trust server completely
                excalidrawAPI.updateScene({
                    elements: data.elements,
                    files: data.files
                });

                // Only after receiving this do we allow emitting local changes, avoids empty board overwrites
                setIsSynced(true);
            }
        };

        // Listen for incoming incremental drawing updates
        const handleRemoteDraw = (data: { elements: any[], files?: any }) => {

            if (excalidrawAPI) {
                // Merge incoming files into persistent cache
                if (data.files) {
                    filesRef.current = {
                        ...filesRef.current,
                        ...data.files
                    };
                }

                // Gets current scene
                const localElements = excalidrawAPI.getSceneElements();

                // "Zombie" Protection:
                // If we recently deleted an element, force it to BE deleted in the incoming data
                // This prevents stale server state from reviving it
                const sanitizedRemoteElements = data.elements.map((el: any) => {
                    if (recentDeletesRef.current.has(el.id)) {
                        return { ...el, isDeleted: true };
                    }
                    return el;
                });

                // Use reconcileElements to merge remote elements into local scene instead of replacing 
                const merged = reconcileElements(
                    localElements,
                    sanitizedRemoteElements,
                    excalidrawAPI.getAppState()
                );

                excalidrawAPI.updateScene({
                    elements: merged,
                    files: filesRef.current // Use full merged cache so existing images don't disappear
                });

                setIsSynced(true);
            }
        };

        // Handle remote cursor movements
        const handleCursorMove = (data: { userId: string, pointer: { x: number, y: number }, username: string }) => {
            setCollaborators(prev => {
                const next = new Map(prev);
                next.set(data.userId, {
                    pointer: data.pointer,
                    username: data.username || 'Anonymous',
                    color: "#A5B4FC" // Light Indigo default
                });
                return next;
            });
        };

        socket.on('whiteboard-state', handleWhiteboardState);
        socket.on('draw', handleRemoteDraw);
        socket.on('cursor-move', handleCursorMove);

        return () => {
            socket.off('whiteboard-state', handleWhiteboardState);
            socket.off('draw', handleRemoteDraw);
            socket.off('cursor-move', handleCursorMove);
        };
    }, [socket, connected, currentRoomId, excalidrawAPI, isReadOnly]);

    // Ref to hold the emit timeout
    const emitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Dynamic emit function that can handle variable delays (e.g. fast delete)
    const triggerEmit = useCallback((newElements: readonly any[], files: any, delay: number) => {
        // If read-only, we shouldn't be emitting, and we shouldn't have pending changes blocking sync
        if (isReadOnly) {
            hasPendingChanges.current = false;
            return;
        }

        if (socket && connected && currentRoomId) {

            // Clear existing timeout to reset debounce
            if (emitTimeoutRef.current) {
                clearTimeout(emitTimeoutRef.current);
            }

            const doEmit = () => {
                // mark pending before emit
                hasPendingChanges.current = true;

                socket.emit('draw', {
                    roomId: currentRoomId,
                    elements: newElements,
                    files: files
                });

                // grace period before allowing reconciliation
                setTimeout(() => {
                    hasPendingChanges.current = false;
                }, 200);
            };

            // Set new timeout
            emitTimeoutRef.current = setTimeout(doEmit, delay);
        }
    }, [socket, connected, currentRoomId, isReadOnly]);

    const emitWithLatestFiles = useCallback((elements: readonly any[], delay: number) => {
        if (!excalidrawAPI) return;
        const latestFiles = excalidrawAPI.getFiles ? excalidrawAPI.getFiles() : filesRef.current;
        triggerEmit(elements, latestFiles, delay);
    }, [excalidrawAPI, triggerEmit]);

    // Fired when local Excalidraw state changes
    const onChange = (newElements: readonly any[], _appState: any, files: any) => {

        // Block emissions until we have synced with server to avoid overwriting with empty state
        if (!isSynced) return;

        // Mark that we have pending changes to avoid reconciliation conflicts
        hasPendingChanges.current = true;

        // Merge files instead of trusting last onChange - prevents image loss
        if (files) {
            filesRef.current = {
                ...filesRef.current,
                ...files
            };
        }

        // If there are no elements AND no files, ignore no-op updates
        if (newElements.length === 0 && Object.keys(filesRef.current).length === 0) return;

        // Identify newly deleted elements and add to protection set
        newElements.forEach(el => {
            if (el.isDeleted) {
                recentDeletesRef.current.add(el.id);
                // Auto-clear from set after 3 seconds (enough time for sync to settle)
                setTimeout(() => {
                    recentDeletesRef.current.delete(el.id);
                }, 3000);
            }
        });

        // prepare elements to emit: explicitly preserve isDeleted to avoid server stripping it or client overriding it
        const elementsToSend = newElements.map(el => ({
            ...el,
            isDeleted: el.isDeleted || false,
        }));

        // If we have images but file dataURL isn't ready yet, retry shortly to include files
        const imageFileIds = elementsToSend.filter(el => el.type === 'image' && el.fileId).map(el => el.fileId);
        const missingImageData = imageFileIds.some((id: string) => {
            const file = filesRef.current?.[id];
            return !file || !file.dataURL;
        });
        if (missingImageData) {
            if (pendingFileEmitRef.current) {
                clearTimeout(pendingFileEmitRef.current);
            }
            pendingFileEmitRef.current = setTimeout(() => {
                emitWithLatestFiles(elementsToSend, 5);
            }, 120);
            return;
        }

        // Check if using eraser, if so, emit faster to capture deletions immediately
        // _appState.activeTool.type === "eraser"
        const isErasing = _appState?.activeTool?.type === "eraser";
        const delay = isErasing ? 5 : 50;

        emitWithLatestFiles(elementsToSend, delay);
    };

    // Broadcast local cursor movement to room 
    const onPointerUpdate = (payload: { pointer: { x: number, y: number }, button: "down" | "up", pointersMap: any }) => {
        if (socket && connected && currentRoomId) {
            socket.emit('cursor-move', {
                roomId: currentRoomId,
                pointer: payload.pointer,
                username: user?.name || 'Guest'
            });
        }
    };

    return (
        <div className="h-full w-full relative bg-white dark:bg-gray-900">
            {/* 
                 Excalidraw wrapper needs explicit height/width, parent container in VirtualRoomPage sets the bounds
              */}
            <Excalidraw
                excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
                initialData={{
                    elements: [],
                    appState: { 
                        viewBackgroundColor: "#ffffff",
                        // Add dark mode background color detection
                    },
                    scrollToContent: true
                }}
                onChange={onChange}
                onPointerUpdate={onPointerUpdate as any}
                {...{ collaborators } as any}
                viewModeEnabled={isReadOnly}
                UIOptions={{
                    canvasActions: {
                        loadScene: false,
                        saveToActiveFile: false,
                        toggleTheme: false, // Force light mode for now
                        saveAsImage: true,
                        // completely disable mermaid features
                    }
                }}
                aiEnabled={false} // completely disable AI features
                theme={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
            />
        </div>
    );
};

export default Whiteboard;
