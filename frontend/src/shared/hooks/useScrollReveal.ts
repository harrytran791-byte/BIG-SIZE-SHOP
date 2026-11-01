import { useEffect } from 'react';

/**
 * Hook quản lý Scroll-Reveal toàn cục 1 lần duy nhất (Once-Only Reveal)
 * Tự động tìm tất cả các phần tử có class 'reveal-init' trên toàn bộ trang web:
 * - Khi người dùng cuộn từ trên xuống, mỗi phần tử khi xuất hiện sẽ trượt mượt mà lên (reveal-visible)
 * - Ngay sau đó observer sẽ unobserve(target) để cố định trạng thái hiển thị vĩnh viễn
 * - Dù người dùng có cuộn lên đầu trang rồi cuộn lại thì giao diện vẫn giữ nguyên hoàn hảo, không lặp lại hiệu ứng
 * - Tôn trọng tuyệt đối prefers-reduced-motion của người dùng
 */
export function useScrollReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      document.querySelectorAll('.reveal-init').forEach((el) => {
        el.classList.add('reveal-visible');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
            observer.unobserve(entry.target); // Chỉ chạy đúng 1 lần duy nhất
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.08,
      }
    );

    const observeAll = () => {
      const elements = document.querySelectorAll('.reveal-init:not(.reveal-visible)');
      elements.forEach((el) => observer.observe(el));
    };

    observeAll();

    const mutationObserver = new MutationObserver(() => {
      observeAll();
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);
}
