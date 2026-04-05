'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { videocallsApi } from '../../../src/api/videocalls.api';
import { useSocket } from '../../providers/SocketProvider';
import axios from 'axios';

interface VideoCallProps {
    channelId: string;
    channelName: string;
    callType?: 'voice' | 'video';
    onCallEnd?: () => void;
    theme?: 'dark' | 'light';
    token?: string;
    url?: string;
    roomName?: string;
    callId?: string;
}

export function ChannelVideoCall({ channelId, channelName, callType = 'video', onCallEnd, theme = 'dark', token: propsToken, url: propsUrl, roomName: propsRoomName, callId: propsCallId }: VideoCallProps) {
    const [token, setToken] = useState<string>(propsToken || '');
    const [url, setUrl] = useState<string>(propsUrl || '');
    const [roomName, setRoomName] = useState<string>(propsRoomName || '');
    const [callId, setCallId] = useState<string>(propsCallId || '');
    // Start as false — we already have the token/url from props, no blocking load needed.
    // LiveKit's own <VideoConference> UI handles its internal connection state.
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [callStarted, setCallStarted] = useState(false);
    const [recordingEnabled, setRecordingEnabled] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [screenShareActive, setScreenShareActive] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const [minutesRemaining, setMinutesRemaining] = useState(0);
    const durationInterval = useRef<NodeJS.Timeout | null>(null);
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Prevents the onDisconnected callback from double-calling handleLeaveRoom
    // when the user explicitly clicks Leave (which sets token to '' then unmounts)
    const isLeavingRef = useRef(false);
    const { socket } = useSocket();

    // Update state when props change
    useEffect(() => {
        if (propsToken) setToken(propsToken);
        if (propsUrl) setUrl(propsUrl);
        if (propsRoomName) setRoomName(propsRoomName);
        if (propsCallId) setCallId(propsCallId);
    }, [propsToken, propsUrl, propsRoomName, propsCallId]);

    // Validate token/url/roomName and start the call UI
    useEffect(() => {
        if (!token || !url || !roomName) {
            console.log('⏳ Waiting for token:', { hasToken: !!token, hasUrl: !!url, hasRoomName: !!roomName });
            return;
        }

        // Guard: navigator.mediaDevices is only available in secure contexts (HTTPS or localhost).
        // When the app is accessed via plain HTTP from another device, the browser blocks it entirely,
        // resulting in the "undefined is not an object (evaluating 'navigator.mediaDevices.getUserMedia')" error.
        const isSecure =
            window.location.protocol === 'https:' ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';

        if (!isSecure || !navigator.mediaDevices) {
            console.error('❌ Insecure context: navigator.mediaDevices is not available.');
            setError(
                'Video/audio calls require a secure connection (HTTPS). ' +
                'You are currently accessing this app over plain HTTP from a remote device. ' +
                'Please ask your administrator to enable HTTPS, or access the app via localhost on this machine.'
            );
            return;
        }

        // Validate token format
        if (typeof token !== 'string' || token.length < 50) {
            console.error('❌ Invalid token received:', { type: typeof token, length: token?.length });
            setError('Invalid authentication token received. Please try again.');
            return;
        }

        console.log('✅ Token received and validated, rendering LiveKit room');
        console.log('📍 LiveKit URL:', url);
        console.log('🎥 Room name:', roomName);

        // Validate room name format
        if (!/^[a-zA-Z0-9_-]+$/.test(roomName)) {
            console.error('❌ Invalid room name format:', roomName);
            setError('Invalid room name format. Please try again.');
            return;
        }

        // Validate URL format
        try {
            new URL(url);
        } catch (e) {
            console.error('❌ Invalid LiveKit URL:', url);
            setError('Invalid video server URL. Please try again.');
            return;
        }

        // Everything looks good — show the LiveKit room immediately.
        // LiveKit's own VideoConference component handles its internal loading state.
        setError('');
        setCallStarted(true);

        // Start tracking call duration
        durationInterval.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
        }, 1000);

        // Safety timeout: if LiveKit fires onError after 30s still no connection, show error
        connectionTimeoutRef.current = setTimeout(() => {
            // Only set error if we haven't already set one
            setError((prev) => {
                if (!prev) {
                    console.warn('⏱️ LiveKit connection timeout after 30 seconds');
                    return 'Video connection taking too long. Please check your internet connection and try again.';
                }
                return prev;
            });
        }, 30000);

        return () => {
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            if (durationInterval.current) clearInterval(durationInterval.current);
        };
    }, [token, url, roomName]);

    // Handle graceful shutdown on page unload
    useEffect(() => {
        if (!callStarted || !callId) return;

        const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
            console.log('🔴 Page unloading, attempting graceful shutdown...');
            e.preventDefault();
            e.returnValue = '';

            try {
                // Attempt to end call before unload
                await videocallsApi.endCall(channelId, callId).catch(() => {
                    // Silently fail if unable to reach API
                    console.log('Could not reach API for cleanup');
                });
            } catch (err) {
                console.error('Cleanup error:', err);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [callStarted, callId, channelId]);

    // Listen for call warning events from server
    useEffect(() => {
        if (!socket) return;

        const handleCallWarning = (data: any) => {
            console.log('📢 Call warning received:', data);
            setMinutesRemaining(data.minutesRemaining);
            setShowWarning(true);

            // Auto-hide warning after 5 seconds
            setTimeout(() => {
                setShowWarning(false);
            }, 5000);
        };

        const handleCallEnded = (data: any) => {
            if (data.reason === 'max_duration_exceeded') {
                console.log('⏰ Call ended due to max duration');
                handleLeaveRoom();
            }
        };

        socket.on('channel:call-warning', handleCallWarning);
        socket.on('channel:call-ended', handleCallEnded);

        return () => {
            socket.off('channel:call-warning', handleCallWarning);
            socket.off('channel:call-ended', handleCallEnded);
        };
    }, [socket]);

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const handleEnableRecording = async () => {
        try {
            if (callId) {
                await videocallsApi.enableRecording(channelId, callId);
                setIsRecording(true);
            }
        } catch (err) {
            console.error('Error enabling recording:', err);
        }
    };

    const handleConnectionError = (error: Error) => {
        console.error('❌ LiveKit connection error:', error);
        setError(`Connection failed: ${error.message || 'Unable to connect to video server'}`);
    };

    const checkNetworkConnectivity = async () => {
        try {
            console.log('🌐 Checking network connectivity...');
            const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
            console.log('✅ Network OK, server reachable');
            return true;
        } catch (err) {
            console.error('❌ Network error:', err);
            return false;
        }
    };

    // Diagnostic effect to check connectivity on component mount
    useEffect(() => {
        if (token && url && roomName) {
            checkNetworkConnectivity();
        }
    }, [token, url, roomName]);

    const handleLeaveRoom = useCallback(async () => {
        if (isLeavingRef.current) return; // prevent double-execution
        isLeavingRef.current = true;

        try {
            if (callId) {
                await videocallsApi.endCall(channelId, callId);
            } else {
                await videocallsApi.leaveCall(channelId);
            }
        } catch (err) {
            console.error('Error leaving call:', err);
        } finally {
            if (durationInterval.current) clearInterval(durationInterval.current);
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            // Let the parent (page.tsx) handle unmounting by calling onCallEnd.
            // Do NOT clear token/roomName here — clearing them causes LiveKit to
            // report 'Client initiated disconnect' while it's mid-teardown.
            onCallEnd?.();
        }
    }, [channelId, callId, onCallEnd]);

    if (loading) {
        // loading is now always false on mount — this block is a safety fallback only
        return (
            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-canvas)]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
                    <p className="text-[var(--text-secondary)]">Preparing {callType === 'voice' ? 'voice' : 'video'} call...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-canvas)]">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-[var(--accent)] text-white rounded-md hover:bg-opacity-90"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!token || !url || !roomName) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-canvas)]">
                <p className="text-[var(--text-secondary)]">Preparing video environment...</p>
            </div>
        );
    }

    return (
        <div className={`w-full h-full ${theme === 'dark' ? 'bg-[#0f0f11]' : 'bg-[#f5f5f5]'} overflow-hidden relative flex flex-col`}>
            {/* Call Duration Warning */}
            {showWarning && (
                <div className="absolute top-16 left-4 right-4 bg-yellow-500/90 text-white p-3 rounded-lg animate-pulse z-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">⏰</span>
                        <span className="font-semibold">
                            Call will end in {minutesRemaining} minute{minutesRemaining !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <button
                        onClick={() => setShowWarning(false)}
                        className="text-white/70 hover:text-white"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Video Conference */}
            <LiveKitRoom
                video={callType === 'video'}
                audio={true}
                token={token}
                connect={true}
                serverUrl={url}
                data-lk-theme={theme}
                style={{ height: '100%' }}
                onConnected={() => {
                    console.log('✅ LiveKit connected successfully');
                    if (connectionTimeoutRef.current) {
                        clearTimeout(connectionTimeoutRef.current);
                        connectionTimeoutRef.current = null;
                    }
                }}
                onDisconnected={() => {
                    console.log('⚠️ LiveKit disconnected');
                    // Only auto-leave if the user didn't click Leave themselves.
                    // If isLeavingRef is true, handleLeaveRoom already ran.
                    if (!isLeavingRef.current) {
                        handleLeaveRoom();
                    }
                }}
                onError={(error) => {
                    const msg = error?.message || '';
                    // 'Client initiated disconnect' is a normal LiveKit lifecycle event
                    // that fires when the room is intentionally disconnected. It is NOT
                    // an error the user needs to see.
                    if (
                        msg.toLowerCase().includes('client initiated disconnect') ||
                        msg.toLowerCase().includes('client_initiated')
                    ) {
                        console.log('ℹ️ LiveKit disconnected (client initiated — normal)');
                        return;
                    }
                    console.error('❌ LiveKit error:', error);
                    if (connectionTimeoutRef.current) {
                        clearTimeout(connectionTimeoutRef.current);
                        connectionTimeoutRef.current = null;
                    }
                    setError(`Connection failed: ${msg || 'Unable to connect to video server. Please check that the LiveKit server URL is correctly configured.'}`);
                }}
            >
                <VideoConference />
            </LiveKitRoom>

        </div>
    );
}

// Simplified version without LiveKit components (for initial UI before LiveKit is installed)
export function SimpleVideoCallUI({ channelId, channelName, onClose, theme = 'dark' }: VideoCallProps & { onClose: () => void }) {
    const [isRecording, setIsRecording] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    return (
        <div className={`w-full h-full ${theme === 'dark' ? 'bg-gradient-to-br from-[#0f0f11] to-[#1a1b1e]' : 'bg-gradient-to-br from-gray-100 to-gray-200'} p-6 flex flex-col`}>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{channelName} - Video Call</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Live now</p>
                </div>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                >
                    End Call
                </button>
            </div>

            <div className={`flex-1 ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'} rounded-lg flex items-center justify-center mb-4 overflow-hidden`}>
                <div className="grid grid-cols-2 gap-4 w-full h-full p-4">
                    {[1, 2].map((idx) => (
                        <div
                            key={idx}
                            className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-300'} rounded-lg flex items-center justify-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}
                        >
                            <div className="text-center">
                                <div className={`w-16 h-16 rounded-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-400'} flex items-center justify-center mx-auto mb-2`}>
                                    <span className="text-2xl">📹</span>
                                </div>
                                <p className="text-sm">Participant {idx}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex gap-3 justify-center">
                <button
                    onClick={() => setIsRecording(!isRecording)}
                    className={`p-3 rounded-full transition-colors ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
                        }`}
                >
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </button>
                <button className="p-3 rounded-full bg-slate-600 hover:bg-slate-700 transition-colors">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.5 3H4.5C3.12 3 2 4.12 2 5.5v13C2 19.88 3.12 21 4.5 21h15c1.38 0 2.5-1.12 2.5-2.5v-13C22 4.12 20.88 3 19.5 3zm-5 9h-3v3h-2v-3h-3v-2h3V7h2v3h3v2z" />
                    </svg>
                </button>
                <button className="p-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                </button>
            </div>

            <p className={`text-center text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} mt-4`}>
                Press ESC or click End Call to exit
            </p>
        </div>
    );
}
