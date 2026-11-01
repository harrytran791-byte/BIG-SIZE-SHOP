import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot, User, Ruler, RotateCcw } from 'lucide-react';
import { streamGeminiAssistant, askGeminiAssistant, ChatMessage } from '../../services/geminiService';

interface AIChatbotProps {
  onNavigate: (path: string) => void;
  onOpenSizeFinder: () => void;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({ onNavigate, onOpenSizeFinder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialBotMessage: ChatMessage = {
    id: 'msg-1',
    sender: 'bot',
    text: 'Chào bạn! Tôi là Stylist AI Thời Trang Big Size (XL–5XL). Tôi có thể hỗ trợ bạn: đoán size chuẩn xác, gợi ý phối đồ giấu bụng, kiểm tra tồn kho hoặc giải đáp đổi trả! Bạn đang tìm đồ nam hay nữ ạ?',
    time: 'Vừa xong'
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialBotMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  const quickPrompts = [
    'Tư vấn áo sơ mi che bụng bia',
    '85kg cao 1m70 mặc size gì?',
    'Đổi size tận nơi có mất phí không?',
    'Quần tây nào ngồi không bị cấn bụng?'
  ];

  const handleResetChat = () => {
    setMessages([
      {
        ...initialBotMessage,
        id: `msg-${Date.now()}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!textToSend) setInput('');
    setIsLoading(true);

    const botMsgId = `bot-${Date.now()}`;
    const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let isBotMsgAppended = false;

    try {
      const aiResult = await streamGeminiAssistant(
        nextHistory,
        query,
        (accumulatedText) => {
          if (!isBotMsgAppended) {
            isBotMsgAppended = true;
            setIsLoading(false);
            setMessages(prev => [
              ...prev,
              {
                id: botMsgId,
                sender: 'bot',
                text: accumulatedText,
                time: botTime
              }
            ]);
          } else {
            setMessages(prev =>
              prev.map(m => (m.id === botMsgId ? { ...m, text: accumulatedText } : m))
            );
          }
        }
      );

      // Once streaming finishes, update final message content and action
      if (!isBotMsgAppended) {
        setMessages(prev => [
          ...prev,
          {
            id: botMsgId,
            sender: 'bot',
            text: aiResult.text,
            action: aiResult.action,
            time: botTime
          }
        ]);
      } else {
        setMessages(prev =>
          prev.map(m =>
            m.id === botMsgId
              ? { ...m, text: aiResult.text, action: aiResult.action }
              : m
          )
        );
      }
    } catch {
      if (!isBotMsgAppended) {
        setMessages(prev => [
          ...prev,
          {
            id: botMsgId,
            sender: 'bot',
            text: 'Rất tiếc vì kết nối bị gián đoạn đôi chút. Bạn hãy thử nhắn lại nhé!',
            time: botTime
          }
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedText = (content: string) => {
    return content.split('\n').map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={lineIdx} className="block min-h-[1.25em]">
          {parts.map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={partIdx} className="font-semibold text-brand-950">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </span>
      );
    });
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {/* Trigger Bubble Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-full shadow-modal border border-brand-600 transition-all hover:scale-105 active:scale-95 animate-fadeIn"
          aria-label="Mở Trợ lý AI"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-brand-700" />
          </div>
          <span className="font-sans font-bold text-xs uppercase tracking-wider hidden sm:inline">
            Stylist AI Tư Vấn Size & Phối Đồ
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[340px] sm:w-[400px] h-[550px] bg-white rounded-2xl shadow-modal border border-surface-border flex flex-col overflow-hidden animate-scaleIn">
          {/* Header */}
          <div className="px-4 py-3 bg-brand-700 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Bot className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight">
                  AI Fashion Stylist
                </h4>
                <p className="text-[10px] text-brand-100 font-sans">Tư vấn chuyên sâu ngoại cỡ XL–5XL</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Bắt đầu hội thoại mới"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Đóng cửa sổ"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-stone-50 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-brand-700 text-white rounded-tr-none'
                      : 'bg-white text-charcoal-800 border border-stone-200/90 rounded-tl-none shadow-sm'
                  }`}
                >
                  <div className="space-y-0.5">{renderFormattedText(m.text)}</div>

                  {/* Action button if attached */}
                  {m.action && (
                    <div className="mt-2.5 pt-2 border-t border-stone-100">
                      <button
                        onClick={() => {
                          if (m.action?.openSizeFinder) {
                            onOpenSizeFinder();
                          } else if (m.action?.path) {
                            onNavigate(m.action.path);
                          }
                          setIsOpen(false);
                        }}
                        className="w-full py-1.5 px-2.5 bg-brand-50 hover:bg-brand-100 text-brand-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-brand-200"
                      >
                        {m.action.openSizeFinder && <Ruler className="w-3.5 h-3.5 text-brand-700" />}
                        <span>{m.action.label}</span>
                      </button>
                    </div>
                  )}

                  <span
                    className={`block text-[9px] mt-1 ${
                      m.sender === 'user' ? 'text-white/70 text-right' : 'text-stone-400'
                    }`}
                  >
                    {m.time}
                  </span>
                </div>
                {m.sender === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-charcoal-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {/* AI Typing Indicator */}
            {isLoading && (
              <div className="flex gap-2 justify-start items-center">
                <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-stone-200/90 rounded-2xl rounded-tl-none px-3.5 py-2.5 shadow-sm flex items-center gap-1.5">
                  <span className="text-[11px] text-stone-500 font-medium">Stylist AI đang soạn câu trả lời</span>
                  <span className="inline-flex gap-1 items-center ml-1">
                    <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-bounce" />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Pills */}
          <div className="px-3 py-2 bg-white border-t border-stone-200 overflow-x-auto flex gap-1.5 no-scrollbar">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => handleSend(p)}
                className="whitespace-nowrap px-2.5 py-1 bg-stone-100 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50 rounded-full text-[10px] text-charcoal-600 transition-colors border border-stone-200"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-surface-border flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              disabled={isLoading}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? "Stylist đang trả lời..." : "Hỏi stylist (chiều cao, cân nặng, phối đồ)..."}
              className="flex-1 px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-brand-700 focus:bg-white disabled:opacity-60 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-brand-700 hover:bg-brand-800 disabled:opacity-40 text-white rounded-xl transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
