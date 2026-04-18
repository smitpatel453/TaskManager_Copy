'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Socket, io } from 'socket.io-client';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const joinedChannelsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Only initialize socket once on mount
        if (socketRef.current) {
            return; // Already initialized
        }

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

            if (!token) {
                console.warn('No auth token found, socket will not connect');
                return;
            }

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            
            // Detect if running on Vercel (serverless doesn't support WebSocket upgrades)
            const isVercel = typeof window !== 'undefined' && 
                (window.location.hostname.includes('vercel.app') || 
                 window.location.hostname.includes('.in.'));
            
            console.log(`🌐 Environment: ${isVercel ? 'VERCEL (using polling)' : 'LOCAL/TRADITIONAL (using websocket → polling)'}`);
            console.log(`📡 API URL: ${apiUrl}`);

            // On Vercel, disable WebSocket since serverless doesn't support HTTP upgrades
            // Use polling only for reliable connection
            const transports = isVercel ? ['polling'] : ['websocket', 'polling'];
            console.log(`📶 Socket.IO transports: ${transports.join(', ')}`);

            const newSocket = io(apiUrl, {
                auth: {
                    token,
                },
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: Infinity,  // Keep retrying on Vercel
                transports,
                // Polling configuration
                ...(isVercel && {
                    pollingInterval: 3000,  // Poll every 3 seconds on Vercel
                })
            });

            newSocket.on('connect', () => {
                const transport = newSocket.io.engine.transport.name;
                console.log(`✅ Socket connected: ${newSocket.id}`);
                console.log(`📡 Connected via: ${transport}`);
                setIsConnected(true);
            });

            newSocket.on('disconnect', (reason) => {
                console.log(`❌ Socket disconnected - Reason: ${reason}`);
                setIsConnected(false);
            });

            newSocket.on('reconnect', () => {
                const transport = newSocket.io.engine.transport.name;
                console.log(`🔄 Socket reconnected via: ${transport}`);
                setIsConnected(true);

                // Auto-rejoin channels after reconnection
                if (joinedChannelsRef.current.size > 0) {
                    console.log(`📡 Auto-rejoining ${joinedChannelsRef.current.size} channels...`);
                    joinedChannelsRef.current.forEach((channelId) => {
                        newSocket.emit('join_channel', channelId);
                        console.log(`  ↳ Rejoined channel: ${channelId}`);
                    });
                }
            });

            newSocket.on('reconnect_attempt', (attempt) => {
                console.log(`🔄 Reconnection attempt #${attempt}...`);
            });

            newSocket.on('reconnect_error', (error) => {
                console.error(`⚠️ Reconnection error:`, error?.message || error);
            });

            newSocket.on('reconnect_failed', () => {
                console.error(`❌ Failed to reconnect - Check server status`);
            });

            newSocket.on('connect_error', (error) => {
                console.error(`⚠️ Socket connection error - ${error?.message || error}`);
                
                // More detailed error info
                if ((error as any)?.data) {
                    console.error(`   Error Details: ${(error as any).data.message}`);
                }
                
                const transport = newSocket.io.engine?.transport?.name;
                if (transport) {
                    console.error(`   Transport: ${transport}`);
                }
                
                // Determine the error type for specific guidance
                const errorMsg = error?.message || String(error);
                const errorType = errorMsg.toLowerCase();
                
                // Help the user debug with specific guidance
                console.warn(`📋 Troubleshooting Tips:`);
                console.warn(`   1. Is backend running on ${apiUrl}?`);
                console.warn(`      • Run: curl -i http://localhost:3001/health`);
                console.warn(`   2. Check your environment configuration`);
                console.warn(`      • Frontend API: ${apiUrl}`);
                console.warn(`      • Check NEXT_PUBLIC_API_URL in .env.local`);
                console.warn(`   3. Verify authentication token exists`);
                console.warn(`      • Token: ${token ? '✓ Present' : '✗ Missing (login required)'}`);
                console.warn(`   4. Backend CORS must include frontend URL`);
                console.warn(`      • Check backend/src/middlewares/cors.ts`);
                
                // Specific error patterns
                if (errorType.includes('unauthorized') || errorType.includes('403')) {
                    console.warn(`\n   🔒 Authentication Error:`);
                    console.warn(`      • Token may be expired (login again)`);
                    console.warn(`      • Backend API_SECRET mismatch`);
                } else if (errorType.includes('network') || errorType.includes('econnrefused')) {
                    console.warn(`\n   🌐 Network Error:`);
                    console.warn(`      • Backend is not running`);
                    console.warn(`      • Firewall may be blocking port 3001`);
                    console.warn(`      • Wrong API URL configured`);
                }
                
                console.warn(`📖 For detailed help: See SOCKET_IO_TROUBLESHOOTING.md`);
            });

            // Track join_channel emissions for auto-rejoin on reconnect
            const originalEmit = newSocket.emit.bind(newSocket);
            newSocket.emit = function (eventName: string, ...args: any[]) {
                if (eventName === 'join_channel' && typeof args[0] === 'string') {
                    joinedChannelsRef.current.add(args[0]);
                } else if (eventName === 'leave_channel' && typeof args[0] === 'string') {
                    joinedChannelsRef.current.delete(args[0]);
                }
                return originalEmit(eventName, ...args);
            } as any;

            socketRef.current = newSocket;
            setSocket(newSocket);
        } catch (error) {
            console.error('Error initializing socket:', error);
        }

        // Cleanup on unmount
        return () => {
            if (socketRef.current && socketRef.current.connected) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setIsConnected(false);
            }
        };
    }, []); // Empty dependency array - runs only once on mount

    return (
        <SocketContext.Provider value={{ socket: socket || socketRef.current, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
}

/**
 * Hook to display connection status in UI
 * Useful for showing connection indicators or handling offline states
 */
export function useSocketStatus() {
    const { isConnected } = useSocket();
    
    return {
        isConnected,
        status: isConnected ? 'connected' : 'disconnected',
        statusText: isConnected ? '🟢 Connected' : '🔴 Disconnected',
        canUseLiveFeatures: isConnected,
    };
}
