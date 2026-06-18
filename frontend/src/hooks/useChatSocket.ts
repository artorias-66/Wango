// frontend/src/hooks/useChatSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: number;
  body: string;
  createdAt: string;
  sender: { id: number; name: string; avatarColor: string };
}

interface UseChatSocketOptions {
  roomId: number | null;
}

interface UseChatSocketReturn {
  messages: ChatMessage[];
  sendMessage: (body: string) => void;
  connected: boolean;
  prependMessages: (msgs: ChatMessage[]) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChatSocket({ roomId }: UseChatSocketOptions): UseChatSocketReturn {
  const { getToken } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!roomId) return;

    let socket: Socket;
    let mounted = true;

    const init = async () => {
      const token = await getToken();
      if (!token || !mounted) return;

      socket = io(API_URL, {
        path: '/api/socket.io',
        auth: { token },
        transports: ['websocket'],
      });

      if (!mounted) {
        socket.disconnect();
        return;
      }

      socketRef.current = socket;

      socket.on('connect', () => {
        if (mounted) setConnected(true);
        socket.emit('join_room', { roomId });
      });

      socket.on('disconnect', () => {
        if (mounted) setConnected(false);
      });

      socket.on('new_message', (msg: ChatMessage) => {
        if (!mounted) return;
        setMessages((prev) => {
          if (prev.some(p => p.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });

      socket.on('error', (data) => {
        console.error('[Chat error]', data.message);
      });
    };

    init();

    return () => {
      mounted = false;
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
      setMessages([]);
      setConnected(false);
    };
  }, [roomId, getToken]);

  const sendMessage = useCallback((body: string) => {
    if (!socketRef.current || !roomId || !body.trim()) return;
    socketRef.current.emit('send_message', { roomId, body: body.trim() });
  }, [roomId]);

  // Used by ChatRoom to prepend historical messages fetched via REST
  const prependMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages((prev) => [...msgs, ...prev]);
  }, []);

  return { messages, sendMessage, connected, prependMessages };
}
