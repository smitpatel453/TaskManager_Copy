'use client';

import React, { useEffect, useState } from 'react';
import { videocallsApi, CallHistory, UserCallStats } from '../../../src/api/videocalls.api';
import axios from 'axios';

interface CallHistoryViewProps {
    channelId?: string;
    theme?: 'dark' | 'light';
}

export function CallHistoryView({ channelId, theme = 'dark' }: CallHistoryViewProps) {
    const [callHistory, setCallHistory] = useState<CallHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (!channelId) return;

        const loadCallHistory = async () => {
            try {
                setLoading(true);
                const response = await videocallsApi.getCallHistory(channelId, 10, 0);
                setCallHistory(response.calls);
            } catch (err) {
                const errorMessage = axios.isAxiosError(err)
                    ? err.response?.data?.error || 'Failed to load call history'
                    : 'An error occurred';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        loadCallHistory();
    }, [channelId]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        }
        return `${secs}s`;
    };

    if (loading) {
        return (
            <div className={`${theme === 'dark' ? 'bg-[var(--bg-surface-1)]' : 'bg-white'} rounded-lg p-4`}>
                <p className={theme === 'dark' ? 'text-[var(--text-secondary)]' : 'text-gray-600'}>Loading call history...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${theme === 'dark' ? 'bg-[var(--bg-surface-1)]' : 'bg-white'} rounded-lg p-4`}>
                <p className="text-red-500 text-sm">{error}</p>
            </div>
        );
    }

    if (callHistory.length === 0) {
        return (
            <div className={`${theme === 'dark' ? 'bg-[var(--bg-surface-1)]' : 'bg-white'} rounded-lg p-4`}>
                <p className={theme === 'dark' ? 'text-[var(--text-secondary)]' : 'text-gray-600'}>No call history yet</p>
            </div>
        );
    }

    return (
        <div className={`${theme === 'dark' ? 'bg-[var(--bg-surface-1)]' : 'bg-white'} rounded-lg overflow-hidden`}>
            <div className={`border-b ${theme === 'dark' ? 'border-[var(--border-subtle)]' : 'border-gray-200'} p-4`}>
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-[var(--text-primary)]' : 'text-black'}`}>Call History</h3>
            </div>
            <div className="divide-y divide-opacity-10">
                {callHistory.map((call) => (
                    <div key={call._id} className={`${theme === 'dark' ? 'hover:bg-[var(--bg-surface-2)]' : 'hover:bg-gray-50'} p-4 transition-colors`}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className={`font-medium ${theme === 'dark' ? 'text-[var(--text-primary)]' : 'text-black'}`}>
                                        {call.initiatorId.firstName} {call.initiatorId.lastName}
                                    </h4>
                                    {call.recordingEnabled && (
                                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded font-medium">Recording</span>
                                    )}
                                </div>
                                <p className={`text-xs ${theme === 'dark' ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
                                    {formatDate(call.startedAt)}
                                </p>
                                <p className={`text-xs ${theme === 'dark' ? 'text-[var(--text-muted)]' : 'text-gray-500'} mt-1`}>
                                    {call.participantIds.length} participants • {formatDuration(call.duration)}
                                </p>
                            </div>
                            <div className="flex-shrink-0">
                                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-[var(--accent)]' : 'text-blue-600'}`}>
                                    {formatDuration(call.duration)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function UserCallStatsView({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
    const [stats, setStats] = useState<UserCallStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const loadStats = async () => {
            try {
                setLoading(true);
                const response = await videocallsApi.getUserCallStats();
                setStats(response);
            } catch (err) {
                const errorMessage = axios.isAxiosError(err)
                    ? err.response?.data?.error || 'Failed to load statistics'
                    : 'An error occurred';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, []);

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    if (loading) {
        return (
            <div className={`${theme === 'dark' ? 'bg-[var(--bg-surface-1)]' : 'bg-white'} rounded-lg p-6`}>
                <p className={theme === 'dark' ? 'text-[var(--text-secondary)]' : 'text-gray-600'}>Loading statistics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${theme === 'dark' ? 'bg-[var(--bg-surface-1)]' : 'bg-white'} rounded-lg p-6`}>
                <p className="text-red-500 text-sm">{error}</p>
            </div>
        );
    }

    if (!stats) return null;

    const statItems = [
        { label: 'Calls Initiated', value: stats.initiatedCalls, icon: '📞' },
        { label: 'Calls Participated', value: stats.participatedCalls, icon: '👥' },
        { label: 'Total Duration', value: formatDuration(stats.totalDuration), icon: '⏱️' },
        { label: 'Average Duration', value: formatDuration(stats.averageDuration), icon: '📊' },
    ];

    return (
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4`}>
            {statItems.map((item) => (
                <div
                    key={item.label}
                    className={`${theme === 'dark' ? 'bg-[var(--bg-surface-1)]' : 'bg-white'} rounded-lg p-4 border ${theme === 'dark' ? 'border-[var(--border-subtle)]' : 'border-gray-200'}`}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{item.icon}</span>
                        <p className={`text-xs font-medium ${theme === 'dark' ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
                            {item.label}
                        </p>
                    </div>
                    <p className={`text-lg font-bold ${theme === 'dark' ? 'text-[var(--text-primary)]' : 'text-black'}`}>
                        {typeof item.value === 'number' ? item.value : item.value}
                    </p>
                </div>
            ))}
        </div>
    );
}
