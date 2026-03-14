import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer'; // WebRTC API wrapper that handles SDP offers/answers, ICE candidates and media tracks
import { useSocket } from '../contexts/SocketContext'; // For signaling

// Manages the peers array and all socket event listeners

// PeerNode interface for each peer
export interface PeerNode {
    peerId: string; // Socket id of the remote user
    peer: Peer.Instance; // live WebRTC peer connection
    status: 'connecting' | 'connected' | 'failed'; // For UI
    stream?: MediaStream; // Remote media stream
}

// Hook signature
export const useWebRTC = (roomId: string, initialConfig = { micOn: true, cameraOn: true }) => {

    // Pulls socket from context
    const { socket } = useSocket();

    // Stores own media stream for local preview and send to peers
    const [userStream, setUserStream] = useState<MediaStream | null>(null);
    const [streamReady, setStreamReady] = useState(false);

    // Array of peers (other users), each contains the peer instance and their ID (state: async)
    // For UI update
    const [peers, setPeers] = useState<PeerNode[]>([]);

    // To keep track of peers we've already created (ref: sync)
    // source of truth for WebRTC logic
    const peersRef = useRef<PeerNode[]>([]);

    useEffect(() => {

        // If no socket ready or missing room ID, do nothing
        if (!socket || !roomId) return;

        // Store named handler references for robust listener management
        // If use socket.off(event) without a handler reference, it would remove ALL listeners for that event across the entire app, 
        // causing "ghost tiles" or broken functionality in other components (like VirtualRoomPage).
        let handleAllUsers: ((users: string[]) => void) | undefined;
        let handleUserJoined: ((payload: { signal: Peer.SignalData, callerID: string }) => void) | undefined;
        let handleUserLeftRoom: ((payload: { socketId: string }) => void) | undefined;
        let handleReceivingReturnedSignal: ((payload: { signal: Peer.SignalData, id: string }) => void) | undefined;

        // Helper to setup WebRTC signaling listeners
        const setupWebRTC = (stream?: MediaStream) => {
            // Listens for all users in the room
            handleAllUsers = (users: string[]) => {
                // Clear any stale peers before creating new ones (guards against double-fire on rejoin)
                peersRef.current.forEach(p => p.peer.destroy());
                peersRef.current = [];

                const newPeers: PeerNode[] = [];
                users.forEach(userID => {
                    const peer = createPeer(userID, socket.id!, stream);
                    const node: PeerNode = { peerId: userID, peer, status: 'connecting' };
                    peersRef.current.push(node);
                    newPeers.push(node);
                });
                setPeers(newPeers);
            };
            socket.on('all-users', handleAllUsers);

            // Handles new user joining
            handleUserJoined = (payload: { signal: Peer.SignalData, callerID: string }) => {
                const item = peersRef.current.find(p => p.peerId === payload.callerID);
                if (!item) {
                    // First signal from this caller: create peer and accept offer
                    const peer = addPeer(payload.signal, payload.callerID, stream);
                    const node: PeerNode = { peerId: payload.callerID, peer, status: 'connecting' };
                    peersRef.current.push(node);
                    setPeers(prev => [...prev, node]);
                } else {
                    // Subsequent signals (trickle ICE candidates): forward to existing peer
                    item.peer.signal(payload.signal);
                }
            };
            socket.on('user-joined', handleUserJoined);

            // Handles user leaving room
            handleUserLeftRoom = ({ socketId }: { socketId: string }) => {
                const peerNode = peersRef.current.find(p => p.peerId === socketId);
                if (peerNode) {
                    peerNode.peer.destroy();
                }
                peersRef.current = peersRef.current.filter(p => p.peerId !== socketId);
                setPeers(prev => prev.filter(p => p.peerId !== socketId));
            };
            socket.on('user-left-room', handleUserLeftRoom);

            // Handles answer signal from peer (receiver)
            handleReceivingReturnedSignal = (payload: { signal: Peer.SignalData, id: string }) => {
                const item = peersRef.current.find(p => p.peerId === payload.id);
                if (item) {
                    item.peer.signal(payload.signal);
                }
            };
            socket.on('receiving-returned-signal', handleReceivingReturnedSignal);

            // Explicitly request video peers once listeners are registered
            socket.emit('join-video', roomId);
        };

        // Request media stream with graceful fallback chain
        const initStream = async () => {
            let stream: MediaStream | undefined;
            try { // Ideal: camera + mic
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            } catch {
                try { // Fallback: mic only (camera denied/unavailable)
                    stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                    console.warn('Camera unavailable — joining with audio only.');
                } catch (err) { // No media at all
                    console.warn('Camera and mic unavailable — joining as view-only.', err);
                }
            }

            if (stream) {
                stream.getAudioTracks().forEach(track => { track.enabled = initialConfig.micOn; }); // Apply initial mute state
                stream.getVideoTracks().forEach(track => { track.enabled = initialConfig.cameraOn; }); // Apply initial camera state
                setUserStream(stream); // Store for local preview and peer sharing
            }
            setStreamReady(true); // Signal UI that media setup is complete (even if no stream)
            setupWebRTC(stream); // Start WebRTC, undefined stream means view-only
        };

        initStream();

        return () => {
            // Remove only the specific handlers registered by this hook,
            // so other components' listeners for the same events are not affected.
            if (handleAllUsers) socket.off('all-users', handleAllUsers);
            if (handleUserJoined) socket.off('user-joined', handleUserJoined);
            if (handleReceivingReturnedSignal) socket.off('receiving-returned-signal', handleReceivingReturnedSignal);
            if (handleUserLeftRoom) socket.off('user-left-room', handleUserLeftRoom);
        };
    }, [socket, roomId]);

    // Cleanup peers on unmount (user leaves room, page refreshes)
    useEffect(() => {
        return () => {
            // Destroys WebRTC connections, releases resources
            peersRef.current.forEach(p => p.peer.destroy());
            peersRef.current = [];
            setPeers([]);

            // Turns off media 
            if (userStream) {
                userStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);


    // STUN servers for NAT traversal + free public TURN relay for cross-network audio/video.
    // TODO (Future Enhancement): Replace openrelay with a dedicated TURN server (e.g. Metered.ca paid tier,
    // or self-hosted coturn) for production reliability and bandwidth guarantees.
    const ICE_SERVERS = {
        iceServers: [
            // Google's STUN servers
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },

            // Metered's TURN servers
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
        ]
    };

    // Create peer/ Initiator
    // We are calling an existing user in the room
    function createPeer(userToSignal: string, callerID: string, stream?: MediaStream) {
        const peer = new Peer({
            initiator: true, // Create offer
            trickle: true,   // Send ICE candidates as discovered (faster, more reliable across networks)
            config: ICE_SERVERS,
            ...(stream ? { stream } : {})
        });

        // Send SDP offer via socket
        peer.on('signal', (signal: unknown) => {
            socket?.emit('sending-signal', { userToSignal, callerID, signal });
        });

        // Capture remote stream
        peer.on('stream', (stream) => {
            setPeers(prev => prev.map(p => p.peerId === userToSignal ? { ...p, stream } : p));
        });

        // Establish data channel and mark UI as connected
        peer.on('connect', () => {
            setPeers(prev => prev.map(p => p.peerId === userToSignal ? { ...p, status: 'connected' } : p));
        });

        // Catches unexpected errors
        peer.on('error', (err) => {
            console.error('Peer connection error:', err);
            setPeers(prev => prev.map(p => p.peerId === userToSignal ? { ...p, status: 'failed' } : p));
        });

        // Cleanup
        peer.on('close', () => {
            peersRef.current = peersRef.current.filter(p => p.peerId !== userToSignal);
            setPeers(prev => prev.filter(p => p.peerId !== userToSignal));
        });

        return peer;
    }

    // Add peer/ Receiver
    // We are accepting a call from a new user
    function addPeer(incomingSignal: Peer.SignalData, callerID: string, stream?: MediaStream) {
        const peer = new Peer({
            initiator: false, // Accept offer and send answer back
            trickle: true,    // Send ICE candidates as discovered (faster, more reliable across networks)
            config: ICE_SERVERS,
            ...(stream ? { stream } : {})
        });

        // Send answer via socket
        peer.on('signal', (signal: unknown) => {
            socket?.emit('returning-signal', { signal, callerID });
        });

        // Capture remote stream
        peer.on('stream', (stream) => {
            setPeers(prev => prev.map(p => p.peerId === callerID ? { ...p, stream } : p));
        });

        // Establish data channel and mark UI as connected
        peer.on('connect', () => {
            setPeers(prev => prev.map(p => p.peerId === callerID ? { ...p, status: 'connected' } : p));
        });

        // Catches unexpected errors
        peer.on('error', (err) => {
            console.error('Peer connection error:', err);
            setPeers(prev => prev.map(p => p.peerId === callerID ? { ...p, status: 'failed' } : p));
        });

        // Cleanup
        peer.on('close', () => {
            peersRef.current = peersRef.current.filter(p => p.peerId !== callerID);
            setPeers(prev => prev.filter(p => p.peerId !== callerID));
        });

        // Accept remote offer
        peer.signal(incomingSignal);

        return peer;
    }

    // Callbacks for toggling media
    const toggleAudio = (enabled: boolean) => {
        if (userStream) {
            userStream.getAudioTracks().forEach(track => track.enabled = enabled); // Do not re-negotiate, zero latency
        }
    };
    const toggleVideo = (enabled: boolean) => {
        if (userStream) {
            userStream.getVideoTracks().forEach(track => track.enabled = enabled);
        }
    };

    return {
        userStream,
        peers,
        streamReady,
        toggleAudio,
        toggleVideo
    };
};
