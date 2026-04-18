'use client';

import { useSocketStatus } from '@/app/providers/SocketProvider';
import { useEffect, useState } from 'react';

/**
 * Display socket connection status in the UI
 * Shows a subtle indicator in the top-right, with debugging info on hover
 */
export function ConnectionStatus() {
    const { isConnected, status, statusText } = useSocketStatus();
    const [showDebugInfo, setShowDebugInfo] = useState(false);

    // Auto-hide after 5 seconds
    useEffect(() => {
        if (!showDebugInfo) return;

        const timeout = setTimeout(() => setShowDebugInfo(false), 5000);
        return () => clearTimeout(timeout);
    }, [showDebugInfo]);

    return (
        <div className="fixed top-4 right-4 z-50 group">
            {/* Status Indicator */}
            <button
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg
                    transition-all duration-300 cursor-help
                    ${isConnected
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                    }
                `}
                title={status}
            >
                <span className="text-sm font-medium">{statusText}</span>
                
                {/* Pulse animation when connected */}
                {isConnected && (
                    <span className="w-2 h-2 bg-current rounded-full animate-pulse"></span>
                )}
            </button>

            {/* Debug Info Tooltip */}
            {showDebugInfo && (
                <div className={`
                    absolute top-12 right-0 mt-2 p-3 rounded-lg shadow-lg
                    text-sm font-mono whitespace-nowrap z-10
                    ${isConnected
                        ? 'bg-green-50 text-green-900 dark:bg-green-900 dark:text-green-100'
                        : 'bg-red-50 text-red-900 dark:bg-red-900 dark:text-red-100'
                    }
                    border
                    ${isConnected
                        ? 'border-green-300 dark:border-green-700'
                        : 'border-red-300 dark:border-red-700'
                    }
                `}>
                    <div>{statusText}</div>
                    <div className="text-xs opacity-75 mt-1">
                        {isConnected ? 'Real-time features active' : 'Connection lost'}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Warning banner for when socket is disconnected
 * Shows at the top of the page with important message
 */
export function ConnectionWarning() {
    const { isConnected } = useSocketStatus();

    if (isConnected) return null;

    return (
        <div className="bg-red-50 border-b border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
                <span className="text-xl">📡</span>
                <div>
                    <p className="font-semibold text-red-900 dark:text-red-200">
                        Connection Lost
                    </p>
                    <p className="text-sm text-red-800 dark:text-red-300">
                        Real-time features are unavailable. Attempting to reconnect...
                    </p>
                </div>
            </div>
        </div>
    );
}

/**
 * Simple connection status monitor for debugging
 * Can be added to layout for development
 */
export function ConnectionMonitor() {
    const { isConnected, status } = useSocketStatus();
    const [apiUrl, setApiUrl] = useState('');
    const [token, setToken] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const tokenExists = !!localStorage.getItem('token');
        
        setApiUrl(url);
        setToken(tokenExists);
    }, []);

    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-sm space-y-2 font-mono">
            <div>Status: <span className={isConnected ? 'text-green-600' : 'text-red-600'}>{status}</span></div>
            <div>API URL: <span className="text-blue-600">{apiUrl}</span></div>
            <div>Token: <span className={token ? 'text-green-600' : 'text-yellow-600'}>{token ? '✓' : '✗'}</span></div>
            {!isConnected && (
                <div className="text-red-600 text-xs mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    Missing SOCKET_IO_TROUBLESHOOTING.md file? Check the root directory for connection debugging guide.
                </div>
            )}
        </div>
    );
}
