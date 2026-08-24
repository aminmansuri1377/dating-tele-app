import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface Message {
  id: string;
  senderId: string;
  type: 'TEXT' | 'EMOJI' | 'IMAGE';
  content?: string;
  imageUrl?: string;
  createdAt: string;
}

export default function ChatPage() {
  const { t } = useTranslation();
  const { matchId } = useParams<{ matchId: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const myUserId = useAuthStore((s) => s.userId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    api.get(`/matches/${matchId}/messages`).then(({ data }) => setMessages(data.reverse()));

    const socket = io(`${import.meta.env.VITE_WS_BASE_URL ?? 'http://localhost:3000'}/chat`, {
      auth: { token: accessToken },
    });
    socket.emit('join_match', matchId);
    socket.on('new_message', (msg: Message) => setMessages((prev) => [...prev, msg]));
    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [matchId]);

  function send() {
    if (!text.trim()) return;
    setError(null);
    socketRef.current?.emit('send_message', { matchId, type: 'TEXT', content: text }, (res: any) => {
      if (res?.error) setError(res.error.message ?? t('common.error'));
    });
    setText('');
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
              m.senderId === myUserId ? 'ml-auto bg-brand text-white' : 'bg-gray-100 dark:bg-gray-800'
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      {error && <div className="px-4 py-2 text-xs text-brand">{error}</div>}

      <div className="p-3 flex gap-2 border-t border-black/5 dark:border-white/10">
        <input
          className="flex-1 p-3 rounded-full border border-black/10 dark:border-white/10 bg-transparent"
          placeholder={t('chat.type_message')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button onClick={send} className="px-5 rounded-full bg-brand text-white font-semibold">
          {t('chat.send')}
        </button>
      </div>
    </div>
  );
}
