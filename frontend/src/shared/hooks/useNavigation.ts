import { useState, useEffect, useCallback } from 'react';

export interface RouteState {
  path: string;
  params: Record<string, string>;
  searchParams: URLSearchParams;
}

export const useNavigation = () => {
  const parseCurrentLocation = (): RouteState => {
    // 1. Prioritize pathname for clean URLs (e.g. /admin/products, /products, /account/profile)
    let fullPath = window.location.pathname || '/';
    let queryString = window.location.search ? window.location.search.slice(1) : '';

    // 2. Fallback / Deep-linking: If there is a hash like '#/faq' or '#/admin/orders', support it seamlessly
    if (window.location.hash && window.location.hash.startsWith('#/')) {
      const rawHash = window.location.hash.slice(1) || '/';
      const [hashPath, hashQuery] = rawHash.split('?');
      if (hashPath && hashPath !== '/') {
        fullPath = hashPath.startsWith('/') ? hashPath : `/${hashPath}`;
      }
      if (hashQuery) {
        queryString = hashQuery;
      }
    }

    const [cleanPath] = fullPath.split('?');
    const searchParams = new URLSearchParams(queryString || '');

    // Extract dynamic params like /product/:id, /order-success/:orderId, /admin/:adminTab
    const params: Record<string, string> = {};
    const pathParts = cleanPath.split('/').filter(Boolean);

    if (pathParts[0] === 'product' && pathParts[1]) {
      params.id = pathParts[1];
    } else if (pathParts[0] === 'order-success' && pathParts[1]) {
      params.orderId = pathParts[1];
    } else if (pathParts[0] === 'admin' && pathParts[1]) {
      params.adminTab = pathParts[1];
    } else if (pathParts[0] === 'manager' && pathParts[1]) {
      params.managerTab = pathParts[1];
    }

    return {
      path: cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`,
      params,
      searchParams,
    };
  };

  const [route, setRoute] = useState<RouteState>(parseCurrentLocation);

  useEffect(() => {
    const handleLocationChange = () => {
      setRoute(parseCurrentLocation());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const clean = to.startsWith('#') ? to.slice(1) : to;
    const targetUrl = clean.startsWith('/') ? clean : `/${clean}`;

    const currentUrl = (window.location.pathname || '/') + (window.location.search || '');
    if (currentUrl !== targetUrl) {
      if (options?.replace) {
        window.history.replaceState(null, '', targetUrl);
      } else {
        window.history.pushState(null, '', targetUrl);
      }
    }

    // Clean up hash if any existed to keep address bar pristine
    if (window.location.hash) {
      window.history.replaceState(null, '', targetUrl);
    }

    setRoute(parseCurrentLocation());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return { route, navigate };
};
