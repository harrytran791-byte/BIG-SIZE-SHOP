import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Ruler,
  RotateCcw,
  Check,
  ChevronDown,
  UserCheck,
  Plus,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import { streamGeminiAssistant, ChatMessage } from '@/services/geminiService';
import { useBodyProfile } from '@/context/BodyProfileContext';
import { useAuth } from '@/context/AuthContext';

interface AIChatbotProps {
  onNavigate: (path: string) => void;
  onOpenSizeFinder: () => void;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({ onNavigate, onOpenSizeFinder }) => {
  const { currentUser } = useAuth();
  const isCustomer = Boolean(currentUser && currentUser.role === 'customer');
  const { activeProfile, profiles, setActiveProfileId } = useBodyProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevProfileIdRef = useRef<string | null>(activeProfile?.id || null);

  const getInitialBotMessage = (profile: typeof activeProfile): ChatMessage => {
    if (!profile || !isCustomer) {
      return {
        id: 'msg-1',
        sender: 'bot',
        text: 'Chào bạn! Tôi là Stylist AI Thời Trang Big Size (XL–5XL). Tôi có thể hỗ trợ bạn: đoán size chuẩn xác, gợi ý phối đồ giấu bụng, hoặc tư vấn phom dáng theo thể trạng. Bạn đang tìm trang phục nam hay nữ ạ?',
        time: 'Vừa xong'
      };
    }
    const genderLabel = profile.gender === 'nam' ? 'Nam' : 'Nữ';
    const waistStr = profile.waist ? ` • Vòng bụng ${profile.waist}cm` : '';
    return {
      id: 'msg-1',
      sender: 'bot',
      text: `Chào bạn! Tôi là Stylist AI của Curve & Confidence ✨\n\nTôi đang kết nối trực tiếp với số đo hồ sơ **"${profile.name}"** (${genderLabel} • **${profile.weight}kg** • **${profile.height}cm**${waistStr}).\n\nBạn **không cần nhập lại số đo** — hãy bấm các câu hỏi gợi ý bên dưới hoặc hỏi bất cứ điều gì về cách chọn size và phối đồ tôn dáng nhé!`,
      time: 'Vừa xong'
    };
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => [getInitialBotMessage(activeProfile)]);

  // Khi đăng xuất hoặc chuyển đổi tài khoản, xóa sạch toàn bộ ngữ cảnh và tin nhắn chat cũ
  useEffect(() => {
    setMessages([getInitialBotMessage(activeProfile)]);
    setInput('');
    setIsProfileModalOpen(false);
    prevProfileIdRef.current = activeProfile?.id || null;
  }, [currentUser?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isProfileModalOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading, isProfileModalOpen]);

  // Notify chat when active profile is changed
  useEffect(() => {
    if (isCustomer && activeProfile && prevProfileIdRef.current && prevProfileIdRef.current !== activeProfile.id) {
      const genderLabel = activeProfile.gender === 'nam' ? 'Nam' : 'Nữ';
      const waistStr = activeProfile.waist ? `, eo **${activeProfile.waist}cm**` : '';
      setMessages((prev) => [
        ...prev,
        {
          id: `profile-switch-${Date.now()}`,
          sender: 'bot',
          text: `🔄 Đã chuyển sang tư vấn theo hồ sơ **"${activeProfile.name}"** (${genderLabel}, **${activeProfile.weight}kg**, **${activeProfile.height}cm**${waistStr}). Stylist đã sẵn sàng tư vấn theo số đo mới! ✨`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
    prevProfileIdRef.current = activeProfile?.id || null;
  }, [activeProfile?.id, isCustomer]);

  const quickPrompts = (isCustomer && activeProfile)
    ? [
        `Tư vấn size cho hồ sơ "${activeProfile.name}"`,
        'Gợi ý áo che bụng cho số đo này',
        'Quần tây nào ngồi không bị cấn bụng?',
        'Đổi size tận nơi có mất phí không?'
      ]
    : [
        'Tư vấn áo sơ mi che bụng bia',
        '85kg cao 1m70 mặc size gì?',
        'Gợi ý phối đồ cho người 90kg',
        'Đổi size tận nơi có mất phí không?'
      ];

  const handleResetChat = () => {
    setMessages([
      {
        ...getInitialBotMessage(activeProfile),
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
            setMessages((prev) => [
              ...prev,
              {
                id: botMsgId,
                sender: 'bot',
                text: accumulatedText,
                time: botTime
              }
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === botMsgId ? { ...m, text: accumulatedText } : m))
            );
          }
        },
        activeProfile
      );

      // Once streaming finishes, update final message content and action
      if (!isBotMsgAppended) {
        setMessages((prev) => [
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
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? { ...m, text: aiResult.text, action: aiResult.action }
              : m
          )
        );
      }
    } catch {
      if (!isBotMsgAppended) {
        setMessages((prev) => [
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
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-full shadow-modal border border-brand-600 transition-all hover:scale-105 active:scale-95 animate-fadeIn cursor-pointer"
          aria-label="Mở Trợ lý AI"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-brand-700" />
          </div>
          <div className="text-left hidden sm:block">
            <span className="block font-sans font-bold text-xs uppercase tracking-wider">
              Stylist AI Tư Vấn Size & Phối Đồ
            </span>
            {isCustomer && activeProfile && (
              <span className="block text-[10px] text-amber-200/90 font-normal">
                Đang áp dụng: {activeProfile.name} ({activeProfile.weight}kg)
              </span>
            )}
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[350px] sm:w-[420px] h-[590px] bg-white rounded-2xl shadow-modal border border-surface-border flex flex-col overflow-hidden animate-scaleIn relative">
          {/* Header */}
          <div className="px-4 py-3 bg-brand-700 text-white flex items-center justify-between shadow-sm shrink-0">
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
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsProfileModalOpen(false);
                }}
                title="Đóng cửa sổ"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Body Profile Bar: Phân định rạch ròi giữa Customer và Guest */}
          {isCustomer ? (
            activeProfile ? (
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="w-full bg-[#FAF7F4] hover:bg-[#F3ECE4] border-b border-[#EBE2D9] px-3.5 py-2 flex items-center justify-between text-left transition-colors cursor-pointer group shrink-0"
                title="Nhấn để xem và đổi hồ sơ số đo"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center shrink-0 border border-brand-200 group-hover:scale-105 transition-transform">
                    <UserCheck className="w-3.5 h-3.5 text-brand-700" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500">
                        HỒ SƠ ĐANG CHỌN:
                      </span>
                      <strong className="text-xs text-brand-900 truncate">
                        {activeProfile.name}
                      </strong>
                    </div>

                    <p className="text-[11px] text-stone-600 truncate mt-0.5">
                      {activeProfile.gender === 'nam' ? 'Nam' : 'Nữ'} • {activeProfile.weight}kg • {activeProfile.height}cm
                      {activeProfile.waist ? ` • Vòng 2: ${activeProfile.waist}cm` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2 px-2.5 py-1 bg-white group-hover:bg-brand-50 text-stone-700 group-hover:text-brand-800 rounded-full border border-stone-200/90 group-hover:border-brand-300 text-[11px] font-semibold transition-all shadow-2xs">
                  <span>Đổi ({profiles.length})</span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-brand-700 group-hover:translate-y-0.5 transition-transform" />
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="w-full bg-amber-50 hover:bg-amber-100/70 border-b border-amber-200 px-3.5 py-2 flex items-center justify-between text-left transition-colors cursor-pointer shrink-0"
              >
                <span className="text-[11px] text-amber-900 font-medium">Chưa chọn hồ sơ số đo</span>
                <span className="text-[10px] font-bold text-amber-800 underline">Chọn hồ sơ ({profiles.length})</span>
              </button>
            )
          ) : (
            <div className="w-full bg-stone-50 border-b border-stone-200 px-3.5 py-2 flex items-center justify-between text-[11px] text-stone-600 shrink-0">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Tư vấn size & phối đồ tự do
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onNavigate('/login');
                }}
                className="text-[10px] font-bold text-brand-700 hover:text-brand-900 hover:underline cursor-pointer"
              >
                Đăng nhập lưu số đo →
              </button>
            </div>
          )}

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
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
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
                        className="w-full py-2 px-3 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                      >
                        {m.action.openSizeFinder && <Ruler className="w-3.5 h-3.5 text-amber-300" />}
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
          <div className="px-3 py-2 bg-white border-t border-stone-200 overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => handleSend(p)}
                className="whitespace-nowrap px-3 py-1.5 bg-[#FAF7F4] hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 disabled:opacity-50 rounded-full text-[11px] text-stone-700 transition-all border border-stone-200/90 cursor-pointer font-medium shadow-2xs"
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
            className="p-2.5 bg-white border-t border-surface-border flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              disabled={isLoading}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isLoading
                  ? "Stylist đang trả lời..."
                  : isCustomer && activeProfile
                  ? `Hỏi theo số đo ${activeProfile.name} (chọn size, phối đồ)...`
                  : "Hỏi stylist (chiều cao, cân nặng, phối đồ)..."
              }
              className="flex-1 px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-brand-700 focus:bg-white disabled:opacity-60 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-brand-700 hover:bg-brand-800 disabled:opacity-40 text-white rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* FULL PROFILE SELECTOR OVERLAY SHEET (CHỈ CHO PHÉP CUSTOMER ĐÃ ĐĂNG NHẬP) */}
          {isProfileModalOpen && isCustomer && (
            <div className="absolute inset-0 z-30 bg-white flex flex-col animate-fadeIn">
              {/* Sheet Header */}
              <div className="px-4 py-3 bg-[#FAF7F4] border-b border-stone-200 flex items-center justify-between shadow-2xs shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsProfileModalOpen(false)}
                    className="p-1 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors cursor-pointer"
                    title="Quay lại khung chat"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h4 className="font-bold text-xs text-stone-900 leading-tight">
                      Chọn hồ sơ số đo ({profiles.length})
                    </h4>
                    <p className="text-[10px] text-stone-500">
                      AI sẽ tự động áp dụng số đo này để tư vấn
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Profiles Vertical Scrollable List */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 bg-stone-50 text-xs">
                {profiles.map((p) => {
                  const isSelected = p.id === activeProfile?.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setActiveProfileId(p.id);
                        setIsProfileModalOpen(false);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#FAF2EE] border-brand-700 ring-1 ring-brand-700 shadow-xs'
                          : 'bg-white border-stone-200/90 hover:border-brand-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Top Info */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                              isSelected
                                ? 'bg-brand-700 text-white'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            <User className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className="font-bold text-xs text-stone-900 truncate">
                                {p.name}
                              </h5>
                              {p.isDefault && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Mặc định
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-stone-500 truncate mt-0.5">
                              {p.gender === 'nam' ? 'Nam' : 'Nữ'}{p.age ? `, ${p.age} tuổi` : ''} • {p.relationship || 'Người thân'}
                            </p>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-700 text-white shadow-xs shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Đang chọn</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-stone-600 bg-stone-100 hover:bg-brand-50 hover:text-brand-800 transition-colors shrink-0">
                            Áp dụng
                          </span>
                        )}
                      </div>

                      {/* 4 Measurement Specs */}
                      <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center text-[10px]">
                        <div className="bg-stone-50/90 p-1.5 rounded-lg border border-stone-200/60">
                          <span className="block text-stone-400 text-[9px]">Chiều cao</span>
                          <strong className="text-stone-800">{p.height}cm</strong>
                        </div>
                        <div className="bg-stone-50/90 p-1.5 rounded-lg border border-stone-200/60">
                          <span className="block text-stone-400 text-[9px]">Cân nặng</span>
                          <strong className="text-stone-800">{p.weight}kg</strong>
                        </div>
                        <div className="bg-stone-50/90 p-1.5 rounded-lg border border-stone-200/60">
                          <span className="block text-stone-400 text-[9px]">Vòng bụng</span>
                          <strong className="text-brand-800 font-bold">{p.waist || '--'}cm</strong>
                        </div>
                        <div className="bg-stone-50/90 p-1.5 rounded-lg border border-stone-200/60">
                          <span className="block text-stone-400 text-[9px]">Vòng mông</span>
                          <strong className="text-stone-800">{p.hips || '--'}cm</strong>
                        </div>
                      </div>

                      {/* Body feature note */}
                      {(p.bodyFeature || p.notes) && (
                        <p className="mt-2 text-[10px] text-stone-500 line-clamp-1 italic bg-white/70 px-2 py-0.5 rounded border border-stone-100">
                          💡 {p.bodyFeature || p.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sheet Bottom Actions */}
              <div className="p-3 bg-white border-t border-stone-200 flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    onNavigate('/body-profile');
                    setIsOpen(false);
                    setIsProfileModalOpen(false);
                  }}
                  className="flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200/80 text-stone-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm hồ sơ mới</span>
                </button>

                <button
                  onClick={() => {
                    onNavigate('/body-profile');
                    setIsOpen(false);
                    setIsProfileModalOpen(false);
                  }}
                  className="py-2 px-3 text-brand-700 hover:text-brand-900 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Mở toàn bộ trang quản lý hồ sơ"
                >
                  <span>Quản lý</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
