'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LiveKitRoom, VideoConference, formatChatMessage } from '@livekit/components-react';
import '@livekit/components-styles';
import { videocallsApi } from '../../../src/api/videocalls.api';
import { useSocket } from '../../providers/SocketProvider';
import axios from 'axios';

interface VideoCallProps {
    channelId: string;
    channelName: string;
    onCallEnd?: () => void;
    theme?: 'dark' | 'light';
}

export function ChannelVideoCall({ channelId, channelName, onCallEnd, theme = 'dark' }: VideoCallProps) {
    const [token, setToken] = useState<string>('');
    const [url, setUrl] = useState<string>('');
    const [roomName, setRoomName] = useState<string>('');
    const [callId, setCallId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [callStarted, setCallStarted] = useState(false);
    const [recordingEnabled, setRecordingEnabled] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [screenShareActive, setScreenShareActive] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const [minutesRemaining, setMinutesRemaining] = useState(0);
    const durationInterval = useRef<NodeJS.Timeout | null>(null);
    const { socket } = useSocket();

    // Try to start or join a call
    useEffect(() => {
        // Only initialize if token is already provided
        if (!token || !url || !roomName) {
            console.log('⏳ Waiting for token:', { hasToken: !!token, hasUrl: !!url, hasRoomName: !!roomName });
            return;
        }

        console.log('✅ Token received, initializing LiveKit');
        console.log('📍 LiveKit URL:', url);
        console.log('🎥 Room name:', roomName);

        // Token received, stop loading
        setLoading(false);
        setCallStarted(true);

        // Add timeout failsafe - if connection doesn't establish in 15 seconds, show error
        const timeoutId = setTimeout(() => {
            if (loading) {
                console.warn('⏱️ Connection timeout - taking longer than expected');
                setError('Video connection timeout. Please check your internet and try again.');
                setLoading(false);
            }
        }, 15000);

        // Start tracking call duration
        if (callStarted) {
            durationInterval.current = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        }

        return () => {
            // Cleanup
            clearTimeout(timeoutId);
            if (durationInterval.current) {
                clearInterval(durationInterval.current);
            }
        };
    }, [token, url, roomName]);

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

    const handleLeaveRoom = useCallback(async () => {
        try {
            if (callId) {
                await videocallsApi.endCall(channelId, callId);
            } else {
                await videocallsApi.leaveCall(channelId);
            }
            setToken('');
            setRoomName('');
            setCallStarted(false);
            if (durationInterval.current) {
                clearInterval(durationInterval.current);
            }
            onCallEnd?.();
        } catch (err) {
            console.error('Error leaving call:', err);
        }
    }, [channelId, callId, onCallEnd]);

    if (loading) {
        return (
            <div className="w-full h-96 flex items-center justify-center bg-[var(--bg-surface-1)] rounded-lg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
                    <p className="text-[var(--text-secondary)]">Initializing video call...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-96 flex items-center justify-center bg-[var(--bg-surface-1)] rounded-lg">
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
            <div className="w-full h-96 flex items-center justify-center bg-[var(--bg-surface-1)] rounded-lg">
                <p className="text-[var(--text-secondary)]">Preparing video environment...</p>
            </div>
        );
    }

    return (
        <div className={`w-full h-96 ${theme === 'dark' ? 'bg-black' : 'bg-white'} rounded-lg overflow-hidden relative`}>
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
                video={true}
                audio={true}
                token={token}
                connect={true}
                serverUrl={url}
                data-lk-theme={theme}
                style={{ height: '100%' }}
                onDisconnected={handleLeaveRoom}
            >
                <VideoConference />
            </LiveKitRoom>

            {/* Call Info Bar */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between bg-black/60 rounded-lg p-3 text-white text-sm">
                <div className="flex items-center gap-3">
                    <span className="font-medium">{channelName}</span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        {formatDuration(callDuration)}
                    </span>
                    {isRecording && (
                        <span className="flex items-center gap-1 text-red-500">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            Recording
                        </span>
                    )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                    {!isRecording && (
                        <button
                            onClick={handleEnableRecording}
                            className="p-2 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1"
                            title="Enable recording"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" fill="red" opacity="0.5" />
                                <circle cx="12" cy="12" r="4" fill="red" />
                            </svg>
                            Record
                        </button>
                    )}

                    <button
                        onClick={() => setScreenShareActive(!screenShareActive)}
                        className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${screenShareActive ? 'bg-blue-500/30' : 'hover:bg-white/20'
                            }`}
                        title="Share screen"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <rect x="2" y="3" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                            <path d="M2 17h20" stroke="currentColor" strokeWidth="2" />
                            <path d="M6 21h12" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Share
                    </button>

                    <button
                        onClick={handleLeaveRoom}
                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                        title="Leave call"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16346273 C3.34915502,0.9 2.40734225,1.00636533 1.77946707,1.4776575 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.99021575 L3.03521743,10.4311088 C3.03521743,10.5882061 3.34915502,10.7453035 3.50612381,10.7453035 L16.6915026,11.5307905 C16.6915026,11.5307905 17.1624089,11.5307905 17.1624089,12.0020827 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
                        </svg>
                        Leave
                    </button>
                </div>
            </div>
        </div>
    );
}

// Simplified version without LiveKit components (for initial UI before LiveKit is installed)
export function SimpleVideoCallUI({ channelId, channelName, onClose, theme = 'dark' }: VideoCallProps & { onClose: () => void }) {
    const [isRecording, setIsRecording] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    return (
        <div className={`w-full h-96 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-gray-100 to-gray-200'} rounded-lg p-6 flex flex-col`}>
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
