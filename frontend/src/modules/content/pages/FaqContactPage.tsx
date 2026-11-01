import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Send, Phone, Mail, MapPin, Clock, MessageSquare, ChevronRight } from 'lucide-react';
import { mockFaqList, FaqItem } from '@/data/faqData';
import { useToast } from '@/context/ToastContext';

interface FaqContactPageProps {
  onNavigate: (path: string) => void;
}

export const FaqContactPage: React.FC<FaqContactPageProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<'all' | 'size' | 'exchange' | 'shipping'>('all');
  const [expandedId, setExpandedId] = useState<string | null>('f1');

  // Contact form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const filteredFaqs = mockFaqList.filter(
    (item) => activeCategory === 'all' || item.category === activeCategory
  );

  const toggleAccordion = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Thiếu họ tên', 'Vui lòng cung cấp họ và tên của bạn.', 'error');
      return;
    }
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 11) {
      showToast('Số điện thoại không hợp lệ', 'Vui lòng nhập số điện thoại liên hệ từ 9 đến 11 chữ số.', 'error');
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      showToast('Nội dung quá ngắn', 'Vui lòng nhập nội dung thắc mắc hoặc cần tư vấn cụ thể hơn.', 'error');
      return;
    }

    try {
      const storageKey = 'curve_contact_inquiries';
      const existing: any[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.push({
        id: `cnt_${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        message: message.trim(),
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(storageKey, JSON.stringify(existing));
    } catch {
      showToast('Chưa lưu được bản nháp', 'Nội dung vẫn được giữ trong biểu mẫu. Vui lòng gọi hotline 0934.460.209 để được hỗ trợ.', 'error');
      return;
    }

    showToast(
      'Đã lưu bản nháp trên thiết bị',
      'Cửa hàng chưa nhận được nội dung này. Vui lòng gọi hotline 0934.460.209 để gửi yêu cầu tư vấn.',
      'info'
    );

    // Keep the text visible so the customer can reuse it when contacting support.
  };

  return (
    <div className="py-12 bg-surface-light min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-charcoal-400">
          <button onClick={() => onNavigate('/')} className="hover:text-charcoal-700">
            Trang chủ
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-charcoal-800 font-semibold">Câu hỏi thường gặp & Liên hệ</span>
        </div>

        {/* SECTION 1: FAQ ACCORDION */}
        <div className="space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full uppercase tracking-wider border border-brand-200">
              TRỢ GIÚP & GIẢI ĐÁP THẮC MẮC
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-charcoal-900 tracking-tight font-heading">
              Câu Hỏi Thường Gặp (FAQ)
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-600">
              Tìm hiểu chính sách đổi size trong 7 ngày, quy chuẩn may đo công thái học và thời gian giao hàng.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar pb-2">
            {[
              { id: 'all', label: 'Tất cả câu hỏi' },
              { id: 'size', label: 'Tư vấn chọn size (XL-5XL)' },
              { id: 'exchange', label: 'Chính sách đổi trả 7 ngày' },
              { id: 'shipping', label: 'Vận chuyển & Đồng kiểm' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as any)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === tab.id
                    ? 'bg-charcoal-900 text-white shadow-sm'
                    : 'bg-white text-charcoal-700 hover:bg-surface-cream border border-surface-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Accordion list */}
          <div className="space-y-3 max-w-3xl mx-auto">
            {filteredFaqs.map((faq) => {
              const isOpen = expandedId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-white rounded-2xl border border-surface-border overflow-hidden transition-all shadow-soft"
                >
                  <button
                    onClick={() => toggleAccordion(faq.id)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-stone-50 transition-colors"
                  >
                    <span className="font-heading font-bold text-xs sm:text-sm text-charcoal-900">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-charcoal-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180 text-brand-600' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-charcoal-600 leading-relaxed border-t border-surface-border/50 animate-fadeIn">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: SHOWROOM & CONTACT FORM */}
        <div className="bg-white rounded-3xl border border-surface-border shadow-soft p-6 sm:p-10 space-y-8">
          <div>
            <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              KẾT NỐI VỚI CHÚNG TÔI
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight mt-2">
              Liên Hệ & Trải Nghiệm Showroom
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
              Đội ngũ stylist ngoại cỡ luôn sẵn sàng hỗ trợ bạn tìm được trang phục tôn vinh vóc dáng nhất.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Showroom info (5 cols) */}
            <div className="lg:col-span-5 space-y-5 bg-surface-cream/70 p-6 rounded-2xl border border-surface-border text-xs">
              <h3 className="font-heading font-bold text-sm text-charcoal-900">
                Hệ Thống Showroom Big Size
              </h3>

              <div className="space-y-4 text-charcoal-700">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-charcoal-900">Showroom TP. Hồ Chí Minh:</strong>
                    <span>120 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP.HCM</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-charcoal-900">Showroom Hà Nội:</strong>
                    <span>88 Phố Huế, Quận Hai Bà Trưng, TP. Hà Nội</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-brand-500 shrink-0" />
                  <div>
                    <strong className="block text-charcoal-900">Hotline Đặt Hàng & Tư Vấn Size:</strong>
                    <span className="text-brand-600 font-bold">1900 6868 (8:00 - 21:30)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-brand-500 shrink-0" />
                  <div>
                    <strong className="block text-charcoal-900">Email Hỗ Trợ Đổi Hàng:</strong>
                    <span>support@curveconfidence.vn</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-brand-500 shrink-0" />
                  <div>
                    <strong className="block text-charcoal-900">Giờ Mở Cửa:</strong>
                    <span>8:30 – 21:30 (Mở cửa tất cả các ngày trong tuần)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact form (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="font-heading font-bold text-sm text-charcoal-900">
                Soạn Nội Dung Cần Tư Vấn
              </h3>

              <form onSubmit={handleSendMessage} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-charcoal-700 mb-1">
                      Họ và tên của bạn <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-surface-cream border border-surface-border rounded-xl p-2.5 text-xs focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-charcoal-700 mb-1">
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="09xx xxx xxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-surface-cream border border-surface-border rounded-xl p-2.5 text-xs focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-charcoal-700 mb-1">
                    Nội dung cần hỗ trợ (Tư vấn size, Đổi trả, v.v.) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Nhập chiều cao, cân nặng hoặc thắc mắc của bạn..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-surface-cream border border-surface-border rounded-xl p-2.5 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-float flex items-center gap-2 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Lưu bản nháp trên thiết bị</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
