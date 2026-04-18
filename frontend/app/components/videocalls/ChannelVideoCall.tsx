'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    LiveKitRoom,
    ParticipantTile,
    VideoTrack,
    AudioTrack,
    useTracks,
    TrackLoop,
    TrackToggle,
    useLocalParticipant,
    LayoutContext,
    RoomAudioRenderer,
    RoomContext,
    ControlBar,
    TrackReference,
    useRemoteParticipants,
    useConnectionState,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import { AgentAudioVisualizerBar } from '@/components/agent-audio-visualizer-bar';
import { useCall } from '@/app/providers/CallProvider';
import {
    ChevronDownIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon,
    SpeakerWaveIcon,
    UserPlusIcon,
    VideoCameraIcon,
    VideoCameraSlashIcon,
    MicrophoneIcon,
    ChatBubbleLeftEllipsisIcon,
    ComputerDesktopIcon,
    PhoneIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

import { videocallsApi } from '../../../src/api/videocalls.api';
import { useSocket } from '../../providers/SocketProvider';
import { InCallChatPanel } from './InCallChatPanel';
import axios from 'axios';

interface VideoCallProps {
    channelId: string;
    channelName: string;
    onCallEnd?: () => void;
    theme?: 'dark' | 'light';
    token?: string;
    url?: string;
    roomName?: string;
    callId?: string;
    currentUser?: { _id: string; firstName: string; lastName: string } | null;
}

export function ChannelVideoCall({ channelId, channelName, onCallEnd, theme = 'dark', token: propsToken, url: propsUrl, roomName: propsRoomName, callId: propsCallId, currentUser }: VideoCallProps) {
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
    const [showChat, setShowChat] = useState(false);
    const [chatUnread, setChatUnread] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const durationInterval = useRef<NodeJS.Timeout | null>(null);
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Prevents the onDisconnected callback from double-calling handleLeaveRoom
    // when the user explicitly clicks Leave (which sets token to '' then unmounts)
    const isLeavingRef = useRef(false);
    const { socket } = useSocket();
    const { endCall: globalEndCall } = useCall();

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
                handleLeaveRoom(true);
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

    const handleLeaveRoom = useCallback(async (explicit: boolean = false) => {
        if (isLeavingRef.current) return;
        if (explicit) isLeavingRef.current = true;

        try {
            if (explicit) {
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(err => console.error("Error exiting fullscreen:", err));
                }
                if (callId) {
                    await videocallsApi.endCall(channelId, callId);
                } else {
                    await videocallsApi.leaveCall(channelId);
                }
                globalEndCall();
                
                // Emit call-ended event to socket so it appears in chat
                if (socket) {
                    socket.emit('channel:call-ended', {
                        callId,
                        channelId,
                        duration: callDuration,
                        callType: 'video',
                        status: callDuration > 0 ? 'completed' : 'declined',
                        initiatorId: currentUser?._id,
                    });
                }
            }
        } catch (err) {
            console.error('Error leaving call:', err);
        } finally {
            if (explicit) {
                if (durationInterval.current) clearInterval(durationInterval.current);
                if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
                onCallEnd?.();
            }
        }
    }, [channelId, callId, callDuration, currentUser, onCallEnd, globalEndCall, socket]);

    const toggleFullscreen = useCallback(async () => {
        if (!containerRef.current) return;

        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error("Error toggling fullscreen:", err);
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    if (loading) {
        // loading is now always false on mount — this block is a safety fallback only
        return (
            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-canvas)]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
                    <p className="text-[var(--text-secondary)]">Preparing video call...</p>
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
        <div ref={containerRef} className="w-full h-full bg-[#0f0f11] overflow-hidden relative flex flex-col">
            {/* Maximize Toggle Button */}
            <div className={`absolute top-4 left-4 z-40 transition-all duration-300 ${isFullscreen ? 'scale-110 opacity-70 hover:opacity-100' : 'opacity-40 hover:opacity-100'}`}>
                <button 
                    onClick={toggleFullscreen}
                    className="p-2.5 rounded-xl bg-black/40 hover:bg-black/60 text-white/90 shadow-2xl backdrop-blur-md border border-white/10 group active:scale-95 transition-all"
                    title={isFullscreen ? "Exit Fullscreen" : "Maximize Screen"}
                >
                    {isFullscreen ? (
                        <ArrowsPointingInIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    ) : (
                        <ArrowsPointingOutIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    )}
                </button>
            </div>

            <LiveKitRoom
                video={true}
                audio={true}
                token={token}
                connect={true}
                serverUrl={url}
                data-lk-theme={theme}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                onConnected={() => {
                    console.log('✅ LiveKit connected successfully');
                    if (connectionTimeoutRef.current) {
                        clearTimeout(connectionTimeoutRef.current);
                        connectionTimeoutRef.current = null;
                    }
                }}
                onDisconnected={() => {
                    if (!isLeavingRef.current) {
                        handleLeaveRoom(false);
                    }
                }}
                onError={(error) => {
                    const msg = error?.message || '';
                    if (
                        msg.toLowerCase().includes('client initiated disconnect') ||
                        msg.toLowerCase().includes('client_initiated')
                    ) {
                        return;
                    }
                    setError(`Connection failed: ${msg}`);
                }}
            >
                <div className="flex-1 flex flex-col p-4 relative overflow-hidden h-full">
                    {/* Top Status Bar */}
                    <div className="flex items-center justify-between mb-4 z-20 px-2 gap-4">
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.1em] flex items-center gap-1.5 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                Live Video Call
                            </span>
                            <h2 className="text-[15px] font-bold text-white/95 truncate leading-tight mt-0.5" title={channelName}>
                                {channelName}
                            </h2>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            {/* Recording Indicator */}
                            {recordingEnabled && (
                                <button
                                    onClick={handleEnableRecording}
                                    disabled={isRecording}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all border shrink-0
                                        ${isRecording
                                            ? 'bg-red-600/20 border-red-500 text-red-500 animate-pulse'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-red-600 hover:border-red-500 hover:text-white'}`}
                                >
                                    {isRecording ? '● Recording' : 'Start Rec'}
                                </button>
                            )}

                            <div className="px-2.5 py-1.5 rounded-md bg-white/5 text-[11px] font-mono text-white/70 border border-white/5 backdrop-blur-sm">
                                {formatDuration(callDuration)}
                            </div>

                            <div className="flex items-center gap-1">
                                <div className="p-2 rounded-lg hover:bg-white/10 cursor-pointer text-white/70 transition-colors" title="Audio Settings">
                                    <SpeakerWaveIcon className="w-4.5 h-4.5" />
                                </div>
                                <div className="p-2 rounded-lg hover:bg-white/10 cursor-pointer text-white/70 transition-colors" title="Invite Others">
                                    <UserPlusIcon className="w-4.5 h-4.5" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Grid Area */}
                    <div className="flex-1 overflow-y-auto pr-1 -mr-1 z-10 custom-scrollbar">
                        <ParticipantGrid />
                    </div>

                    {/* Bottom Control Bar */}
                    <div className="mt-4 sm:mt-6 flex justify-center pb-2 sm:pb-4 z-20">
                        <div className="bg-[#1e1f26]/95 rounded-[2.5rem] p-2 px-4 sm:p-3 sm:px-6 flex items-center gap-3 sm:gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 backdrop-blur-xl max-w-full overflow-x-auto ck-scrollbar">
                            <ControlButton
                                icon={VideoCameraIcon}
                                offIcon={VideoCameraSlashIcon}
                                source={Track.Source.Camera}
                            />
                            <ControlButton
                                icon={MicrophoneIcon}
                                offIcon={MicrophoneIcon}
                                source={Track.Source.Microphone}
                            />
                            <div 
                                className={`relative p-2.5 rounded-full cursor-pointer transition-all group active:scale-90 ${
                                    showChat ? 'bg-indigo-600/30 text-indigo-400' : 'hover:bg-white/10 text-white/90'
                                }`}
                                title="Open Chat"
                                onClick={() => { setShowChat(v => !v); setChatUnread(0); }}
                            >
                                <ChatBubbleLeftEllipsisIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                {chatUnread > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg animate-bounce">
                                        {chatUnread > 9 ? '9+' : chatUnread}
                                    </span>
                                )}
                            </div>
                            <ControlButton
                                icon={ComputerDesktopIcon}
                                offIcon={ComputerDesktopIcon}
                                source={Track.Source.ScreenShare}
                            />
                            <div className="w-px h-8 bg-white/10 mx-2" />
                            <button
                                onClick={() => handleLeaveRoom(true)}
                                className="p-3 bg-[#f04747] hover:bg-[#ff5c5c] rounded-full transition-all hover:scale-110 active:scale-95 shadow-[0_8px_20px_rgba(240,71,71,0.3)] group"
                                title="End Call"
                            >
                                <PhoneIcon className="w-6 h-6 text-white rotate-[135deg] group-hover:rotate-[145deg] transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Call Warning Alert */}
                    {showWarning && (
                        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-[#ffaa00] text-black px-6 py-2.5 rounded-full animate-bounce z-50 flex items-center gap-2.5 text-xs font-black shadow-2xl border-2 border-white/20">
                            <span className="text-sm">⚠️</span>
                            <span>Ends in {minutesRemaining} min</span>
                            <button onClick={() => setShowWarning(false)} className="ml-2 hover:opacity-70">✕</button>
                        </div>
                    )}

                    {/* In-Call Chat Panel */}
                    <InCallChatPanel
                        isOpen={showChat}
                        onClose={() => setShowChat(false)}
                        channelId={channelId}
                        currentUser={currentUser ?? null}
                        onUnreadCount={setChatUnread}
                    />
                </div>
                <RoomAudioRenderer />
            </LiveKitRoom>
        </div>
    );
}

function ParticipantGrid() {
    const { localParticipant } = useLocalParticipant();
    const { setCurrentAudioTrack } = useCall();
    
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false },
    );

    const audioTracks = useTracks([{ source: Track.Source.Microphone, withPlaceholder: false }]);

    // Share local microphone track with global context for sidebar visualization
    useEffect(() => {
        const localAudioTrack = audioTracks.find(t => t.participant.sid === localParticipant.sid);
        if (localAudioTrack?.publication?.audioTrack) {
            setCurrentAudioTrack(localAudioTrack.publication.audioTrack as any);
        }
        return () => setCurrentAudioTrack(null);
    }, [audioTracks, localParticipant.sid, setCurrentAudioTrack]);

    const count = tracks.length;

    // Determine grid layout based on participant count
    const gridClasses =
        count === 1 ? 'grid-cols-1 h-full' :
            count === 2 ? 'grid-cols-1 md:grid-cols-2 h-full max-h-full' :
                count === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 h-full' :
                  
                'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full';

    return (
        <div className="flex items-center justify-center w-full h-full p-2 md:p-4 overflow-hidden">
            <div className={`grid ${gridClasses} gap-4 w-full h-full transition-all duration-500 ease-in-out`}>
                {tracks.map((trackReference) => (
                    <ParticipantTile
                        key={`${trackReference.participant.sid}_${trackReference.source}`}
                        trackRef={trackReference}
                        className={`
                            rounded-3xl overflow-hidden shadow-2xl border-2 border-transparent 
                            data-[speaking=true]:border-indigo-500 transition-all duration-500 relative bg-[#1c1d22] 
                            flex items-center justify-center group h-full w-full
                        `}
                    >
                        {trackReference.publication && (
                            <>
                                <VideoTrack
                                    trackRef={trackReference as TrackReference}
                                    className="w-full h-full object-cover"
                                />
                                <AudioTrack trackRef={trackReference as TrackReference} />
                            </>
                        )}

                        {/* Placeholder UI */}
                        {trackReference.participant.isCameraEnabled === false && trackReference.source === Track.Source.Camera && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#131418] z-0">
                                <div className="w-24 h-24 rounded-full bg-indigo-500/10 flex items-center justify-center border-2 border-indigo-500/20 shadow-2xl relative">
                                    <span className="text-4xl font-bold text-indigo-400 uppercase">
                                        {trackReference.participant.identity.charAt(0)}
                                    </span>
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#131418] flex items-center justify-center">
                                        <VideoCameraSlashIcon className="w-5 h-5 text-white/40" />
                                    </div>
                                </div>
                                <span className="mt-5 text-[11px] font-bold text-white/30 uppercase tracking-[0.3em]">
                                    Video Disabled
                                </span>
                            </div>
                        )}

                        <div className="absolute top-6 right-6 z-10 flex items-center gap-2">
                            {trackReference.participant.isSpeaking && (
                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
                            )}
                        </div>

                        <div className="absolute bottom-5 left-5 z-10 px-4 py-2 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 max-w-[90%] transition-all flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                                {trackReference.source === Track.Source.ScreenShare && (
                                    <ComputerDesktopIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                                )}
                                <span className="text-[12px] font-bold text-white leading-none uppercase tracking-widest truncate">
                                    {trackReference.participant.isLocal ? 'You' : (trackReference.participant.identity.split('_')[1] || trackReference.participant.identity.split('_')[0])}
                                </span>
                            </div>
                            
                            {/* Subtle Audio Pulse - Added Wisely */}
                            <AgentAudioVisualizerBar 
                                audioTrack={audioTracks.find(t => t.participant.sid === trackReference.participant.sid) as TrackReference}
                                state={trackReference.participant.isSpeaking ? 'speaking' : 'listening'}
                                size="icon"
                                barCount={5}
                                color="#6366f1"
                                className="opacity-70"
                            />
                        </div>
                    </ParticipantTile>
                ))}
            </div>
        </div>
    );
}

function ControlButton({
    icon: Icon,
    offIcon: OffIcon,
    source
}: {
    icon: any,
    offIcon: any,
    source: Track.Source
}) {
    const { localParticipant } = useLocalParticipant();

    const enabled = source === Track.Source.Camera
        ? localParticipant.isCameraEnabled
        : source === Track.Source.Microphone
            ? localParticipant.isMicrophoneEnabled
            : localParticipant.isScreenShareEnabled;

    const toggle = () => {
        if (source === Track.Source.Camera) {
            localParticipant.setCameraEnabled(!enabled);
        } else if (source === Track.Source.Microphone) {
            localParticipant.setMicrophoneEnabled(!enabled);
        } else if (source === Track.Source.ScreenShare) {
            localParticipant.setScreenShareEnabled(!enabled);
        }
    };

    return (
        <div
            onClick={toggle}
            className={`p-3 rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center ${enabled ? 'bg-white/5 hover:bg-white/15' : 'bg-[#f04747]/20 hover:bg-[#f04747]/30 ring-1 ring-[#f04747]/30'}`}
            title={enabled ? `Turn Off` : `Turn On`}
        >
            {enabled ? (
                <Icon className="w-6 h-6 text-white" />
            ) : (
                <div className="relative flex items-center justify-center">
                    <OffIcon className="w-6 h-6 text-[#f04747]" />
                    <div className="absolute w-[120%] h-[2px] bg-[#f04747] rotate-45 rounded-full" />
                </div>
            )}
        </div>
    );
}
