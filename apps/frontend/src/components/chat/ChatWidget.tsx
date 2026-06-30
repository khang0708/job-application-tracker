'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2, Trash2, Bot } from 'lucide-react';
import { clsx } from 'clsx';
import { sendChatMessage, type ChatTurn } from '@/lib/api/chat';

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userTurn: ChatTurn = { role: 'user', content: text };
    setMessages((prev) => [...prev, userTurn]);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendChatMessage(text, messages);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-40 w-80 sm:w-96 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/20"
          style={{ height: '520px' }}>
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-900/95 backdrop-blur-xl border-b border-white/5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">JobTracker AI</p>
              <p className="text-xs text-slate-400">Hỏi bất kỳ điều gì về ứng tuyển của bạn</p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  title="Xóa hội thoại"
                  className="p-1.5 text-slate-500 hover:text-slate-300 transition rounded-lg hover:bg-white/5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-300 transition rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/90 backdrop-blur-xl">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/25">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-medium text-white mb-1">JobTracker AI</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tôi có thể phân tích ứng tuyển, so sánh cơ hội, theo dõi tiến độ và đưa ra lời khuyên cho hành trình tìm việc của bạn.
                </p>
                <div className="mt-4 space-y-1.5 w-full">
                  {[
                    'Tôi đang ở giai đoạn nào nhiều nhất?',
                    'Công ty nào tôi đang chờ phản hồi?',
                    'Tỷ lệ chuyển đổi Interview của tôi là bao nhiêu?',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg glass text-white/60 hover:text-white hover:bg-white/10 transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={clsx(
                    'max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'glass text-white/90 rounded-bl-sm',
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="glass px-3.5 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                  <span className="text-xs text-white/50">Đang phân tích…</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 bg-slate-900/95 backdrop-blur-xl border-t border-white/5">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi… (Enter để gửi)"
                rows={1}
                disabled={loading}
                className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition disabled:opacity-50 max-h-24 overflow-y-auto"
                style={{ lineHeight: '1.4' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'fixed bottom-5 right-5 z-40 w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all',
          open
            ? 'bg-slate-700 text-white'
            : 'bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-blue-500/30 hover:scale-105',
        )}
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        {!open && messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-[9px] font-bold flex items-center justify-center">
            {messages.length > 9 ? '9+' : messages.length}
          </span>
        )}
      </button>
    </>
  );
}
