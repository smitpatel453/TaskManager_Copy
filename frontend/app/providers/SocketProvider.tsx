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

            const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
                auth: {
                    token,
                },
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5,
                transports: ['websocket', 'polling'],
            });

            newSocket.on('connect', () => {
                console.log('✅ Socket connected:', newSocket.id);
                setIsConnected(true);
            });

            newSocket.on('disconnect', (reason) => {
                console.log('❌ Socket disconnected:', reason);
                setIsConnected(false);
            });

            newSocket.on('reconnect', () => {
                console.log('🔄 Socket reconnected');
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

            newSocket.on('reconnect_attempt', () => {
                console.log('🔄 Attempting to reconnect...');
            });

            newSocket.on('reconnect_error', (error) => {
                console.error('⚠️ Reconnection error:', error);
            });

            newSocket.on('reconnect_failed', () => {
                console.error('❌ Failed to reconnect after max attempts');
            });

            newSocket.on('connect_error', (error) => {
                console.error('⚠️ Socket connection error:', error);
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
