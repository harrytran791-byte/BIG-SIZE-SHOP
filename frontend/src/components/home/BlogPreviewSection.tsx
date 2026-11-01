import React from 'react';
import { ArrowRight, BookOpen, Clock, Calendar } from 'lucide-react';
import { mockBlogPosts } from '../../data/blogData';

interface BlogPreviewSectionProps {
  onNavigate: (path: string) => void;
}

export const BlogPreviewSection: React.FC<BlogPreviewSectionProps> = ({ onNavigate }) => {
  return (
    <section className="py-20 bg-surface-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
              <BookOpen className="w-4 h-4 text-brand-500" />
              <span>Góc phong cách & Mẹo chọn đồ</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
              Bí Quyết Phối Đồ Ngoại Cỡ Hack Dáng
            </h2>
          </div>

          <button
            onClick={() => onNavigate('/blog')}
            className="text-xs sm:text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 hover:underline"
          >
            <span>Xem tất cả bài viết</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {mockBlogPosts.map((post) => (
            <article
              key={post.id}
              onClick={() => onNavigate('/blog')}
              className="group bg-white rounded-3xl overflow-hidden border border-surface-border shadow-soft hover:shadow-float hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer"
            >
              {/* Image banner */}
              <div className="aspect-[16/10] overflow-hidden bg-stone-100 relative">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-charcoal-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                  {post.category}
                </span>
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-[11px] text-charcoal-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-base text-charcoal-900 line-clamp-2 group-hover:text-brand-600 transition-colors leading-snug">
                    {post.title}
                  </h3>

                  <p className="text-xs text-charcoal-600 line-clamp-2 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-3 border-t border-surface-border flex items-center text-xs font-bold text-brand-600 group-hover:translate-x-1 transition-transform">
                  <span>Đọc tiếp bài viết</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
