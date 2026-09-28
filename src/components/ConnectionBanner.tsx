'use client';

import { ConnectionStatus } from '../types/collaboration';

interface ConnectionBannerProps {
  status: ConnectionStatus;
}

export default function ConnectionBanner({ status }: ConnectionBannerProps) {
  if (status === 'connected') return null;

  const config: Record<Exclude<ConnectionStatus, 'connected'>, { bg: string; text: string; message: string }> = {
    connecting: {
      bg: 'bg-blue-500',
      text: 'text-white',
      message: 'Connecting…',
    },
    reconnecting: {
      bg: 'bg-yellow-500',
      text: 'text-white',
      message: '🔴 Connection lost — reconnecting…',
    },
    failed: {
      bg: 'bg-red-600',
      text: 'text-white',
      message: 'Could not reconnect. Please refresh the page.',
    },
  };

  const { bg, text, message } = config[status];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium ${bg} ${text}`}
    >
      {message}
    </div>
  );
}
