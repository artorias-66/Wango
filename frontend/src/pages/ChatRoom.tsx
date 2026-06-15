// frontend/src/pages/ChatRoom.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useChatSocket } from '../hooks/useChatSocket';
import { getChatMessages, type ChatMessage } from '../api/wango.api';


function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSep(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export function ChatRoom() {
  const { roomId: roomIdStr } = useParams<{ roomId: string }>();
  const roomId = roomIdStr ? parseInt(roomIdStr, 10) : null;
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [input, setInput] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [oldestId, setOldestId] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [roomTitle] = useState('Group Chat');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, connected, prependMessages } = useChatSocket({ roomId });

  // Load initial message history
  useEffect(() => {
    if (!roomId || historyLoaded) return;
    const load = async () => {
      setLoadingHistory(true);
      try {
        const token = await getToken();
        if (!token) return;
        const res = await getChatMessages(roomId, token);
        if (res.success) {
          prependMessages(res.data);
          if (res.data.length > 0) setOldestId(res.data[0].id);
          if (res.data.length < 50) setHasMore(false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingHistory(false);
        setHistoryLoaded(true);
      }
    };
    load();
  }, [roomId, historyLoaded, getToken, prependMessages]);

  // Scroll to bottom on new real-time messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const loadOlderMessages = useCallback(async () => {
    if (!roomId || !hasMore || loadingHistory || !oldestId) return;
    setLoadingHistory(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await getChatMessages(roomId, token, oldestId);
      if (res.success && res.data.length > 0) {
        prependMessages(res.data);
        setOldestId(res.data[0].id);
        if (res.data.length < 50) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } finally {
      setLoadingHistory(false);
    }
  }, [roomId, hasMore, loadingHistory, oldestId, getToken, prependMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  // Render messages with date separators
  const renderMessages = () => {
    const items: React.ReactNode[] = [];
    let lastDate = '';

    messages.forEach((msg, i) => {
      const msgDate = formatDateSep(msg.createdAt);
      if (msgDate !== lastDate) {
        lastDate = msgDate;
        items.push(
          <div key={`sep-${i}`} style={{
            display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 8px',
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
              {msgDate}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
          </div>
        );
      }

      const isMe = msg.sender.name === user?.fullName || msg.sender.name === user?.firstName;
      items.push(
        <MessageBubble key={msg.id} msg={msg} isMe={isMe} />
      );
    });

    return items;
  };

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: '60px',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-base)',
      maxWidth: 720,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 60, zIndex: 10,
        padding: '12px 20px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 20, padding: '4px 8px',
            display: 'flex', alignItems: 'center',
          }}
        >←</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: 17, fontWeight: 700, margin: 0 }}>
            {roomTitle}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? '#22c55e' : '#ef4444',
              display: 'inline-block',
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {connected ? 'Connected' : 'Connecting…'}
            </span>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div
        ref={listRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {hasMore && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <button
              onClick={loadOlderMessages}
              disabled={loadingHistory}
              style={{
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)', padding: '6px 16px',
                color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              {loadingHistory ? 'Loading…' : '↑ Load older messages'}
            </button>
          </div>
        )}

        {messages.length === 0 && historyLoaded && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            color: 'var(--text-muted)', paddingBottom: 40,
          }}>
            <div style={{ fontSize: 48 }}>💬</div>
            <p style={{ fontSize: 14 }}>No messages yet. Say hi!</p>
          </div>
        )}

        {renderMessages()}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        style={{
          position: 'sticky', bottom: 0,
          padding: '12px 20px',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--glass-border)',
          display: 'flex', gap: 10,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="input"
          style={{ flex: 1, padding: '10px 16px', fontSize: 14 }}
          disabled={!connected}
          maxLength={2000}
          autoFocus
        />
        <button
          type="submit"
          disabled={!connected || !input.trim()}
          className="btn btn-primary"
          style={{ padding: '10px 20px', fontSize: 15 }}
        >
          ↑
        </button>
      </form>
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function MessageBubble({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: isMe ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 10,
    }}>
      {/* Avatar */}
      {!isMe && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: msg.sender.avatarColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff',
          flexShrink: 0,
        }}>
          {msg.sender.name[0]?.toUpperCase()}
        </div>
      )}

      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        {!isMe && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
            {msg.sender.name}
          </span>
        )}
        <div style={{
          background: isMe ? 'var(--color-primary)' : 'var(--glass-bg)',
          border: isMe ? 'none' : '1px solid var(--glass-border)',
          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: '9px 14px',
          fontSize: 14,
          color: isMe ? '#fff' : 'var(--text-primary)',
          lineHeight: 1.45,
          wordBreak: 'break-word',
        }}>
          {msg.body}
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', paddingInline: 4 }}>
          {formatTime(msg.createdAt)}
        </span>
      </div>
    </div>
  );
}
