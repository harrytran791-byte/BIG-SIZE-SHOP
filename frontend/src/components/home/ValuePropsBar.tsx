import React from 'react';

export const ValuePropsBar: React.FC = () => {
  const items = [
    {
      number: '01',
      title: 'Mua sắm tự tin',
      subtitle: 'Dễ dàng chọn đúng phong cách riêng.',
    },
    {
      number: '02',
      title: 'Bứt phá vẻ đẹp',
      subtitle: 'Tôn dáng, nổi bật nét riêng.',
    },
    {
      number: '03',
      title: 'Đặt hàng thuận tiện',
      subtitle: 'Mua nhanh, thanh toán thật dễ.',
    },
  ];

  return (
    <div className="bg-white border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-surface-border gap-6 md:gap-0">
          {items.map((item) => (
            <div
              key={item.number}
              className="flex items-center justify-center gap-4 px-4 md:px-6 py-2 md:py-0"
            >
              {/* Arial Bold Number in Burgundy */}
              <span className="font-bold text-3xl sm:text-4xl text-brand-600 leading-none shrink-0 tracking-tight">
                {item.number}
              </span>
              <div className="text-xs leading-relaxed">
                <span className="font-sans font-bold text-charcoal-900 block text-xs sm:text-sm">
                  {item.title}
                </span>
                <span className="text-charcoal-500 font-normal block mt-0.5">
                  {item.subtitle}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
