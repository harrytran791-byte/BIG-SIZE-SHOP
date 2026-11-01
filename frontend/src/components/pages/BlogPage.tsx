import React, { useState } from 'react';
import { BookOpen, Calendar, Clock, ArrowRight, X, ChevronRight } from 'lucide-react';
import { mockBlogPosts, BlogPost } from '../../data/blogData';

interface BlogPageProps {
  onNavigate: (path: string) => void;
}

export const BlogPage: React.FC<BlogPageProps> = ({ onNavigate }) => {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  return (
    <div className="py-12 bg-surface-light min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-charcoal-400">
          <button onClick={() => onNavigate('/')} className="hover:text-charcoal-700">
            Trang chủ
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-charcoal-800 font-semibold">Blog & Mẹo phối đồ ngoại cỡ</span>
        </div>

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full uppercase tracking-wider border border-brand-200">
            GÓC PHONG CÁCH & BÍ QUYẾT TỎA SÁNG
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-charcoal-900 tracking-tight font-heading">
            Tự Tin Với Vóc Dáng Của Bạn
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
            Tổng hợp các bài viết hướng dẫn chọn chất liệu, mẹo phối đồ giấu bụng và câu chuyện truyền cảm hứng từ cộng đồng Big Size.
          </p>
        </div>

        {/* Articles List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {mockBlogPosts.map((post) => (
            <article
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="group bg-white rounded-3xl overflow-hidden border border-surface-border shadow-soft hover:shadow-float hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer"
            >
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

                  <p className="text-xs text-charcoal-600 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-3 border-t border-surface-border flex items-center text-xs font-bold text-brand-600 group-hover:translate-x-1 transition-transform">
                  <span>Đọc toàn bộ bài viết</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Article Detail Modal */}
        {selectedPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-sm"
              onClick={() => setSelectedPost(null)}
            />
            <div className="relative bg-white rounded-3xl p-6 sm:p-10 max-w-2xl w-full shadow-modal border border-surface-border z-10 animate-scaleIn max-h-[85vh] overflow-y-auto space-y-6">
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-4 right-4 p-2 text-charcoal-400 hover:text-charcoal-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-2">
                <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full">
                  {selectedPost.category}
                </span>
                <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-charcoal-900 leading-snug">
                  {selectedPost.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-charcoal-400">
                  <span>{selectedPost.date}</span>
                  <span>•</span>
                  <span>{selectedPost.readTime}</span>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden aspect-[16/9]">
                <img
                  src={selectedPost.image}
                  alt={selectedPost.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-charcoal-700 leading-relaxed">
                {selectedPost.content.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>

              <div className="pt-4 border-t border-surface-border flex justify-end">
                <button
                  onClick={() => setSelectedPost(null)}
                  className="px-6 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-bold"
                >
                  Đóng bài viết
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
