'use client';

import React, { useState, useEffect, useRef } from 'react';
import { videocallsApi } from '../../../src/api/videocalls.api';
import { useSocket } from '../../providers/SocketProvider';
import axios from 'axios';

interface ChannelCallPromptProps {
    channelId: string;
    channelName: string;
    callType?: 'voice' | 'video';
    onStartCall: (token: string, url: string, roomName: string, callId?: string) => void;
    onJoinCall: (token: string, url: string, roomName: string, callId?: string) => void;
    theme?: 'dark' | 'light';
    autoJoin?: boolean;
}

export function ChannelCallPrompt({
    channelId,
    channelName,
    callType = 'video',
    onStartCall,
    onJoinCall,
    theme = 'dark',
    autoJoin = false,
}: ChannelCallPromptProps) {
    const [hasActiveCall, setHasActiveCall] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeParticipants, setActiveParticipants] = useState<string[]>([]);
    const [recordingEnabled, setRecordingEnabled] = useState(false);
    const { socket, isConnected } = useSocket();

    // Check for active calls on mount
    useEffect(() => {
        checkForActiveCall();
        const interval = setInterval(checkForActiveCall, 5000); // Poll every 5 seconds

        return () => {
            clearInterval(interval);
        };
    }, [channelId]);

    // Listen for real-time call events using the global socket
    useEffect(() => {
        if (!socket || !isConnected) return;

        console.log('Setting up socket listeners for channel:', channelId);
        socket.emit('join_channel', channelId);

        const handleCallStarted = (data: any) => {
            console.log('Call started event received:', data);
            if (data.channelId === channelId) {
                console.log('Call started in our channel:', data);
                checkForActiveCall();
            }
        };

        const handleCallEnded = (data: any) => {
            console.log('Call ended event received:', data);
            if (data.channelId === channelId) {
                console.log('Call ended in our channel:', data);
                // Always set to false and clear participants when call ends
                setHasActiveCall(false);
                setActiveParticipants([]);
                // Force a fresh check to ensure we're in sync with backend
                setTimeout(() => checkForActiveCall(), 500);
            }
        };

        const handleUserJoined = (data: any) => {
            if (data.channelId === channelId) {
                console.log('User joined call:', data);
                checkForActiveCall();
            }
        };

        const handleUserLeft = (data: any) => {
            if (data.channelId === channelId) {
                console.log('User left call:', data);
                // Check immediately and again after a brief delay to ensure we catch if it's the last user
                checkForActiveCall();
                setTimeout(() => checkForActiveCall(), 100);
            }
        };

        socket.on('channel:call-started', handleCallStarted);
        socket.on('channel:call-ended', handleCallEnded);
        socket.on('channel:call-user-joined', handleUserJoined);
        socket.on('channel:call-user-left', handleUserLeft);

        return () => {
            socket.off('channel:call-started', handleCallStarted);
            socket.off('channel:call-ended', handleCallEnded);
            socket.off('channel:call-user-joined', handleUserJoined);
            socket.off('channel:call-user-left', handleUserLeft);
            socket.emit('leave_channel', channelId);
        };
    }, [socket, isConnected, channelId]);

    const checkForActiveCall = async () => {
        try {
            const callInfo = await videocallsApi.getCallInfo(channelId);
            console.log('Active call status:', callInfo);
            setHasActiveCall(callInfo.hasActiveCall);
            if (callInfo.activeCall?.participants) {
                const participantNames = callInfo.activeCall.participants.map((p) => `${p.firstName} ${p.lastName}`);
                console.log('Participants:', participantNames);
                setActiveParticipants(participantNames);
            } else {
                console.log('No participants in active call');
                setActiveParticipants([]);
            }
        } catch (error) {
            console.error('Error checking for active call:', error);
        }
    };

    const handleStartCall = async () => {
        try {
            setLoading(true);
            const callData = await videocallsApi.startCall(channelId, recordingEnabled);
            setHasActiveCall(true);
            onStartCall(callData.token, callData.url, callData.roomName, callData.callId);
        } catch (error) {
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.error || 'Failed to start call'
                : 'An error occurred';
            console.error('Error starting call:', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinCall = async () => {
        try {
            setLoading(true);
            const callData = await videocallsApi.joinCall(channelId);
            onJoinCall(callData.token, callData.url, callData.roomName, callData.callId);
        } catch (error) {
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.error || 'Failed to join call'
                : 'An error occurred';
            console.error('Error joining call:', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const hasAutoJoined = useRef(false);
    useEffect(() => {
        if (autoJoin && hasActiveCall && !loading && !hasAutoJoined.current) {
            hasAutoJoined.current = true;
            handleJoinCall();
        }
    }, [autoJoin, hasActiveCall, loading]);


    if (hasActiveCall) {
        if (autoJoin) {
            return (
                <div className={`${theme === 'dark' ? 'bg-[var(--bg-surface-2)] border-[var(--border-default)]' : 'bg-gray-50 border-gray-200'} border rounded-xl p-8 mb-4 flex flex-col items-center justify-center gap-4`}>
                    <div className="w-8 h-8 rounded-full border-[3px] border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <p className={`text-[13px] font-medium ${theme === 'dark' ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
                        Connecting to active {callType} call...
                    </p>
                </div>
            );
        }

        return (
            <div className={`${theme === 'dark' ? 'bg-green-900/20 border-green-700/50' : 'bg-green-100 border-green-300'} border rounded-lg p-4 mb-4`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className={`text-sm font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-700'} flex items-center gap-2`}>
                            <span className="animate-pulse w-2 h-2 bg-green-400 rounded-full"></span>
                            Active {callType === 'voice' ? 'Voice' : 'Video'} Call
                        </h4>
                        <p className={`text-xs ${theme === 'dark' ? 'text-green-300/70' : 'text-green-600/70'} mt-1`}>
                            {activeParticipants.length} participant{activeParticipants.length !== 1 ? 's' : ''} in call
                        </p>
                        {activeParticipants.length > 0 && (
                            <p className={`text-xs ${theme === 'dark' ? 'text-green-300/50' : 'text-green-600/50'} mt-1`}>{activeParticipants.join(', ')}</p>
                        )}
                    </div>
                    <button
                        onClick={handleJoinCall}
                        disabled={loading}
                        className={`px-4 py-2 ${theme === 'dark' ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600' : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400'} text-white rounded-md transition-colors text-sm font-medium`}
                    >
                        {loading ? 'Joining...' : `Join ${callType === 'voice' ? 'Voice' : 'Video'} Call`}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`${theme === 'dark' ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-100 border-blue-300'} border rounded-lg p-4 mb-4`}>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className={`text-sm font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                            Start a {callType === 'voice' ? 'Voice' : 'Video'} Call
                        </h4>
                        <p className={`text-xs ${theme === 'dark' ? 'text-blue-300/70' : 'text-blue-600/70'} mt-1`}>
                            {callType === 'voice' ? 'Connect with team members via audio' : 'Connect with team members in real-time'}
                        </p>
                    </div>
                </div>

                {/* Recording Toggle - Only show for video calls */}
                {callType === 'video' && (
                    <div className="flex items-center gap-2 pl-0">
                        <input
                            type="checkbox"
                            id={`recording-${channelId}`}
                            checked={recordingEnabled}
                            onChange={(e) => setRecordingEnabled(e.target.checked)}
                            className="rounded border-gray-300"
                        />
                        <label htmlFor={`recording-${channelId}`} className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                            Enable recording
                        </label>
                    </div>
                )}

                {/* Start Button */}
                <button
                    onClick={handleStartCall}
                    disabled={loading}
                    className={`w-full px-4 py-2 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400'} text-white rounded-md transition-colors text-sm font-medium flex items-center justify-center gap-2`}
                >
                    {loading ? `Starting ${callType === 'voice' ? 'Voice' : 'Video'} Call...` : `Start ${callType === 'voice' ? 'Voice' : 'Video'} Call`}
                </button>
            </div>
        </div>
    );
}
