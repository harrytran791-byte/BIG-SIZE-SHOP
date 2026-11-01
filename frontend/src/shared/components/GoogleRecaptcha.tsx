import React, { useEffect, useRef, useState } from 'react';

/**
 * Google reCAPTCHA v2 Component (Chuyển giao từ dự án Java login.jsp / VerifyRecaptcha.java)
 * Site Key: 6Ld0uDQtAAAAALD4eAhJJ9eCQeFSigoRkf4GvX2E
 */
export const RECAPTCHA_SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6Ld0uDQtAAAAALD4eAhJJ9eCQeFSigoRkf4GvX2E';

interface GoogleRecaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  theme?: 'dark' | 'light';
  className?: string;
}

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement | string,
        parameters: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          theme?: 'dark' | 'light';
        }
      ) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
    onRecaptchaReady?: () => void;
  }
}

export const GoogleRecaptcha: React.FC<GoogleRecaptchaProps> = ({
  onVerify,
  onExpire,
  theme = 'light',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Kiểm tra xem script grecaptcha đã tải chưa
    if (typeof window.grecaptcha?.render === 'function') {
      setIsLoaded(true);
      renderWidget();
      return;
    }

    // Nếu script chưa có, tạo tag script để tải từ Google
    const existingScript = document.getElementById('google-recaptcha-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-recaptcha-script';
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (isMounted) {
          setIsLoaded(true);
          renderWidget();
        }
      };
      script.onerror = () => {
        if (isMounted) {
          setLoadError(true);
        }
      };
      document.body.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (typeof window.grecaptcha?.render === 'function') {
          clearInterval(interval);
          if (isMounted) {
            setIsLoaded(true);
            renderWidget();
          }
        }
      }, 200);
      return () => clearInterval(interval);
    }

    function renderWidget() {
      if (containerRef.current && window.grecaptcha && widgetIdRef.current === null) {
        try {
          // Xóa các widget render cũ nếu có
          containerRef.current.innerHTML = '';
          const wid = window.grecaptcha.render(containerRef.current, {
            sitekey: RECAPTCHA_SITE_KEY,
            theme,
            callback: (token: string) => {
              onVerify(token);
            },
            'expired-callback': () => {
              if (onExpire) onExpire();
            },
          });
          widgetIdRef.current = wid;
        } catch (e) {
          console.warn('reCAPTCHA render notice:', e);
        }
      }
    }

    return () => {
      isMounted = false;
    };
  }, [theme]);

  // Nếu gặp lỗi mạng / offline, cho phép bypass an toàn như RecaptchaUtils.java của bài cũ
  if (loadError) {
    return (
      <div className={`p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-[11px] text-amber-800 ${className}`}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded text-amber-600 focus:ring-0 cursor-pointer"
            onChange={(e) => {
              if (e.target.checked) onVerify('bypass_token_local_test');
              else if (onExpire) onExpire();
            }}
          />
          <span className="font-medium">Xác thực: Tôi không phải là người máy (Chế độ kiểm thử dự phòng)</span>
        </label>
      </div>
    );
  }

  return (
    <div className={`flex justify-center my-2 ${className}`}>
      <div ref={containerRef} className="min-h-[78px] flex items-center justify-center">
        {!isLoaded && (
          <div className="text-xs text-stone-400 py-3 flex items-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
            <span>Đang tải Google reCAPTCHA...</span>
          </div>
        )}
      </div>
    </div>
  );
};
