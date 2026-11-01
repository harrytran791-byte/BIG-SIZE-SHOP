import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CartItem, Product, Size, Voucher } from '@/types';
import { calculateOrderPricing, isVoucherAvailable } from '@/shared/utils/orderPricing';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/modules/user/context/AuthContext';
import {
  fetchVouchersFromSupabase,
  SupabaseVoucher,
  supabase,
  syncCartToSupabase,
  fetchCartFromSupabase
} from '@/shared/services/supabaseClient';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, size: Size, colorName: string, colorHex: string, quantity?: number) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  changeItemSize: (itemId: string, newSize: Size) => void;
  clearCart: () => void;
  appliedVoucher: Voucher | null;
  appliedDiscountVoucher: Voucher | null;
  appliedShippingVoucher: Voucher | null;
  applyVoucher: (code: string) => boolean;
  removeVoucher: (type?: 'discount' | 'shipping') => void;
  removeDiscountVoucher: () => void;
  removeShippingVoucher: () => void;
  subtotal: number;
  discountAmount: number;
  baseShippingFee: number;
  shippingDiscountAmount: number;
  shippingFee: number;
  total: number;
  totalItemsCount: number;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  vouchersList: Voucher[];
  usedVoucherCodes: string[];
  isVoucherUsed: (code: string) => boolean;
}

const getCartStorageKey = (userId?: string) => `curve_confidence_cart_v2_${userId || 'guest'}`;

// Dọn dẹp bản lưu vĩnh viễn cũ của khách vãng lai để đảm bảo giỏ hàng tự hủy khi thoát tab
try {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(getCartStorageKey('guest'));
  }
} catch {}

const getUsedVouchersStorageKey = (userId?: string) => `curve_used_vouchers_${userId || 'guest'}`;
const DISCOUNT_VOUCHER_STORAGE_KEY = 'curve_confidence_discount_voucher_v1';
const SHIPPING_VOUCHER_STORAGE_KEY = 'curve_confidence_shipping_voucher_v1';

export const getUsedVoucherCodesForUser = (userId?: string): string[] => {
  try {
    const raw = localStorage.getItem(getUsedVouchersStorageKey(userId));
    const list: string[] = raw ? JSON.parse(raw) : [];
    const ordersRaw = localStorage.getItem('curve_orders');
    if (ordersRaw) {
      const orders: any[] = JSON.parse(ordersRaw);
      for (const o of orders) {
        if (o.voucherCode && o.status !== 'cancelled') {
          const code = String(o.voucherCode).toUpperCase();
          if (!list.includes(code)) list.push(code);
        }
      }
    }
    return list;
  } catch {
    return [];
  }
};

export const markVoucherAsUsed = (code: string, userId?: string) => {
  try {
    const clean = code.trim().toUpperCase();
    const current = getUsedVoucherCodesForUser(userId);
    if (!current.includes(clean)) {
      current.push(clean);
      localStorage.setItem(getUsedVouchersStorageKey(userId), JSON.stringify(current));
    }
  } catch {}
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { currentUser } = useAuth();

  const isHydratedRef = useRef(false);
  const hydrationGenerationRef = useRef(0);
  const loadedCartRef = useRef<CartItem[] | null>(null);
  const activeUserIdRef = useRef<string | undefined>(currentUser?.id);
  const syncQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [cartOwnerId, setCartOwnerId] = useState(currentUser?.id);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const storage = (typeof window !== 'undefined' && !currentUser?.id && window.sessionStorage) ? window.sessionStorage : localStorage;
      const saved = storage.getItem(getCartStorageKey(currentUser?.id));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Tự động tải giỏ hàng từ Supabase Cloud khi khách hàng đăng nhập
  useEffect(() => {
    isHydratedRef.current = false;
    hydrationGenerationRef.current += 1;
    loadedCartRef.current = null;
    activeUserIdRef.current = currentUser?.id;
    let cancelled = false;

    const storageKey = getCartStorageKey(currentUser?.id);
    const storage = (typeof window !== 'undefined' && !currentUser?.id && window.sessionStorage) ? window.sessionStorage : localStorage;
    let localItems: CartItem[] = [];
    try {
      const saved = storage.getItem(storageKey);
      localItems = saved ? JSON.parse(saved) : [];
      // Chuyển giao sản phẩm từ giỏ khách vãng lai (Guest) sang giỏ thành viên khi vừa đăng nhập
      if (localItems.length === 0 && currentUser?.id) {
        const guestStorage = typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : storage;
        const guestSaved = guestStorage.getItem(getCartStorageKey('guest')) || localStorage.getItem(getCartStorageKey('guest'));
        if (guestSaved) {
          const guestItems: CartItem[] = JSON.parse(guestSaved);
          if (guestItems.length > 0) {
            localItems = guestItems;
            localStorage.setItem(storageKey, guestSaved);
            guestStorage.removeItem(getCartStorageKey('guest'));
            localStorage.removeItem(getCartStorageKey('guest'));
          }
        }
      }
      setCart(localItems);
    } catch {
      setCart([]);
    }
    setCartOwnerId(currentUser?.id);

    const userKey = currentUser?.role === 'customer' ? currentUser.id : undefined;
    if (!userKey) {
      // Guest: hydrated immediately from local storage
      isHydratedRef.current = true;
      return;
    }

    // Authenticated user: fetch from Supabase Cloud
    fetchCartFromSupabase(userKey, { strict: true })
      .then((remoteItems) => {
        if (cancelled || activeUserIdRef.current !== currentUser?.id) return;
        if (!Array.isArray(remoteItems)) throw new Error('Cart read was not verified');
        const finalItems = remoteItems.length > 0 ? remoteItems : localItems;
        loadedCartRef.current = finalItems;
        setCart(finalItems);
        try {
          localStorage.setItem(storageKey, JSON.stringify(finalItems));
        } catch {}
        isHydratedRef.current = true;
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('⚠️ Lỗi tải giỏ hàng Supabase:', err);
        isHydratedRef.current = false;
        showToast('Chưa tải được giỏ hàng', 'Bản lưu trên thiết bị được giữ nguyên. Vui lòng tải lại trang trước khi chỉnh sửa giỏ.', 'warning');
      });
    return () => { cancelled = true; };
  }, [currentUser?.id, currentUser?.role]);

  const [dynamicVouchers, setDynamicVouchers] = useState<Voucher[]>([]);

  useEffect(() => {
    const loadVouchers = async () => {
      try {
        const supaVouchers = await fetchVouchersFromSupabase();
        const mapped: Voucher[] = supaVouchers.map(v => ({
          id: v.id, code: v.code.toUpperCase(), discountType: v.discountType,
          discountValue: Number(v.discountValue), minOrderValue: Number(v.minOrderValue || 0),
          maxDiscount: v.maxDiscount == null ? undefined : Number(v.maxDiscount), description: v.name,
          voucherType: v.voucherType, status: v.status, startsAt: v.startsAt, expiresAt: v.expiresAt,
        }));
        setDynamicVouchers(mapped);

      } catch (err) {
        console.warn('⚠️ Error loading vouchers:', err);
      }
    };

    loadVouchers();

    // Subscribe to realtime changes on 'voucher' table (Auto sync between Manager and Customer)
    const channel = supabase
      .channel('realtime:voucher')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'voucher' },
        () => {
          loadVouchers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [appliedDiscountVoucher, setAppliedDiscountVoucher] = useState<Voucher | null>(() => {
    try {
      const saved = localStorage.getItem(DISCOUNT_VOUCHER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [appliedShippingVoucher, setAppliedShippingVoucher] = useState<Voucher | null>(() => {
    try {
      const saved = localStorage.getItem(SHIPPING_VOUCHER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [usedVouchers, setUsedVouchers] = useState<string[]>(() => getUsedVoucherCodesForUser(currentUser?.id));

  useEffect(() => {
    setUsedVouchers(getUsedVoucherCodesForUser(currentUser?.id));

    // Đồng bộ danh sách voucher đã dùng từ CSDL Supabase thật hoadon
    if (currentUser?.id && currentUser.role === 'customer') {
      const rawMaTk = currentUser.id.replace(/^usr_/, '');
      const numericTk = Number(rawMaTk);
      if (Number.isInteger(numericTk)) {
        const syncUsedVouchers = async () => {
          try {
            const { data: kh } = await supabase
              .from('khachhang')
              .select('ma_kh')
              .eq('ma_tk', numericTk)
              .maybeSingle();

            if (kh?.ma_kh) {
              const { data: orders } = await supabase
                .from('hoadon')
                .select('voucher(code), trang_thai_don')
                .eq('ma_kh', kh.ma_kh)
                .neq('trang_thai_don', 'Da_huy')
                .not('ma_voucher', 'is', null);

              if (orders && Array.isArray(orders)) {
                const remoteCodes = orders
                  .map((row: any) => (row.voucher?.code || '').trim().toUpperCase())
                  .filter(Boolean);
                if (remoteCodes.length > 0) {
                  setUsedVouchers((prev) => {
                    const combined = Array.from(new Set([...prev, ...remoteCodes]));
                    try {
                      localStorage.setItem(getUsedVouchersStorageKey(currentUser?.id), JSON.stringify(combined));
                    } catch {}
                    return combined;
                  });
                }
              }
            }
          } catch (err) {
            console.warn('⚠️ Lỗi đồng bộ voucher đã dùng từ Supabase:', err);
          }
        };
        void syncUsedVouchers();
      }
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    // Reconcile sessions saved before the one-voucher rule.
    if (appliedDiscountVoucher && appliedShippingVoucher) setAppliedShippingVoucher(null);
  }, [appliedDiscountVoucher, appliedShippingVoucher]);

  useEffect(() => {
    if (!isHydratedRef.current || cartOwnerId !== currentUser?.id) return;

    const storageKey = getCartStorageKey(currentUser?.id);
    const storage = (typeof window !== 'undefined' && !currentUser?.id && window.sessionStorage) ? window.sessionStorage : localStorage;
    try {
      storage.setItem(storageKey, JSON.stringify(cart));
    } catch (err) {
      console.error('Failed to save cart to storage', err);
    }

    const userKey = currentUser?.role === 'customer' ? currentUser.id : undefined;
    if (userKey && cart !== loadedCartRef.current) {
      const generation = hydrationGenerationRef.current;
      syncQueueRef.current = syncQueueRef.current.catch(() => {}).then(async () => {
        if (activeUserIdRef.current !== userKey || !isHydratedRef.current ||
          hydrationGenerationRef.current !== generation) return;
        const res = await syncCartToSupabase(cart, userKey);
        if (res.success === false && activeUserIdRef.current === userKey) {
          showToast('Đồng bộ giỏ hàng', 'Chưa thể lưu giỏ hàng lên máy chủ. Dữ liệu vẫn được giữ trên thiết bị của bạn.', 'warning');
        }
      }).catch((err) => {
        console.warn('⚠️ Lỗi đồng bộ giỏ hàng Supabase:', err);
      });
    }
  }, [cart, currentUser?.id, currentUser?.role, cartOwnerId]);

  useEffect(() => {
    try {
      if (appliedDiscountVoucher) {
        localStorage.setItem(DISCOUNT_VOUCHER_STORAGE_KEY, JSON.stringify(appliedDiscountVoucher));
      } else {
        localStorage.removeItem(DISCOUNT_VOUCHER_STORAGE_KEY);
      }
    } catch (err) {
      console.error('Failed to save discount voucher', err);
    }
  }, [appliedDiscountVoucher]);

  useEffect(() => {
    try {
      if (appliedShippingVoucher) {
        localStorage.setItem(SHIPPING_VOUCHER_STORAGE_KEY, JSON.stringify(appliedShippingVoucher));
      } else {
        localStorage.removeItem(SHIPPING_VOUCHER_STORAGE_KEY);
      }
    } catch (err) {
      console.error('Failed to save shipping voucher', err);
    }
  }, [appliedShippingVoucher]);

  const canEditCart = () => {
    if (isHydratedRef.current && cartOwnerId === currentUser?.id) return true;
    showToast('Giỏ hàng chưa sẵn sàng', 'Vui lòng chờ tải giỏ hàng hoặc tải lại trang nếu kết nối bị lỗi.', 'warning');
    return false;
  };

  const addToCart = (product: Product, size: Size, colorName: string, colorHex: string, quantity = 1) => {
    if (!canEditCart()) return;
    const itemId = `${product.id}_${size}_${colorName}`;

    // Check variant existence and stock
    const variant = product.variants?.find((v) => v.size === size && (!colorName || v.colorName.toLowerCase() === colorName.toLowerCase()));
    if (!variant) {
      showToast('Kích cỡ tạm không khả dụng', `Size ${size} hiện chưa có cho sản phẩm này.`, 'error');
      return;
    }

    if (variant.stock <= 0) {
      showToast('Biến thể đã tạm hết hàng', `Size ${size} - Màu ${colorName} hiện không còn trong kho.`, 'error');
      return;
    }

    const availableStock = variant.stock;
    const finalQuantity = Math.min(quantity, availableStock);
    if (quantity > availableStock) {
      showToast('Số lượng vượt tồn kho', `Kho chỉ còn ${availableStock} sản phẩm cho Size ${size}.`, 'warning');
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === itemId);
      if (existing) {
        const nextQty = Math.min(existing.quantity + finalQuantity, availableStock);
        return prev.map((item) =>
          item.id === itemId ? { ...item, quantity: nextQty, sku: item.sku || variant.sku } : item
        );
      }
      return [
        ...prev,
        {
          id: itemId,
          productId: product.id,
          product,
          sku: variant.sku,
          size,
          colorName,
          colorHex,
          quantity: finalQuantity,
          price: product.price,
        },
      ];
    });

    showToast('Đã thêm vào giỏ hàng', `${product.name} (Size: ${size} - ${colorName})`, 'success');
    setIsCartDrawerOpen(true);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (!canEditCart()) return;
    const rawQty = Math.floor(quantity);
    if (!Number.isFinite(rawQty) || rawQty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const variant = item.product?.variants?.find(
          (v) => v.size === item.size && (!item.colorName || v.colorName.toLowerCase() === item.colorName.toLowerCase())
        );
        const maxStock = variant?.stock ?? 99;
        const safeQty = Math.min(rawQty, Math.max(1, maxStock));
        if (safeQty < rawQty) {
          showToast('Số lượng đạt giới hạn', `Kho chỉ còn ${maxStock} sản phẩm cho size ${item.size}`, 'warning');
        }
        return { ...item, quantity: safeQty };
      })
    );
  };

  const removeFromCart = (itemId: string) => {
    if (!canEditCart()) return;
    const itemToRemove = cart.find((i) => i.id === itemId);
    setCart((prev) => prev.filter((item) => item.id !== itemId));
    if (itemToRemove) {
      showToast('Đã xóa sản phẩm', itemToRemove.product.name, 'info');
    }
  };

  const changeItemSize = (itemId: string, newSize: Size) => {
    if (!canEditCart()) return;
    let success = false;
    let errorMsg = '';
    setCart((prev) => {
      const item = prev.find((i) => i.id === itemId);
      if (!item) return prev;
      if (item.size === newSize) return prev;

      // Find matching variant for the new size and the same color
      const variants = item.product?.variants || [];
      const newVariant = variants.find(
        (v) => v.size === newSize && (!item.colorName || v.colorName.toLowerCase() === item.colorName.toLowerCase())
      );

      if (!newVariant) {
        errorMsg = `Sản phẩm "${item.product.name}" hiện không có size ${newSize} cho màu ${item.colorName || 'này'}.`;
        return prev;
      }

      // Check stock
      const stock = newVariant.stock ?? 10;
      if (stock < 1) {
        errorMsg = `Size ${newSize} (${item.colorName || ''}) hiện đã hết hàng.`;
        return prev;
      }

      const newId = `${item.productId}_${newSize}_${item.colorName}`;
      const requestedQty = Math.min(item.quantity, stock);

      // Check if item with new size already exists in cart
      const existingNew = prev.find((i) => i.id === newId);
      if (existingNew) {
        const combinedQty = Math.min(existingNew.quantity + requestedQty, stock);
        success = true;
        return prev
          .filter((i) => i.id !== itemId)
          .map((i) => (i.id === newId ? { ...i, quantity: combinedQty, sku: newVariant.sku } : i));
      }

      success = true;
      return prev.map((i) => (i.id === itemId ? {
        ...i,
        id: newId,
        size: newSize,
        sku: newVariant.sku,
        quantity: requestedQty
      } : i));
    });

    if (success) {
      showToast('Đã cập nhật size', `Đổi thành size ${newSize}`, 'success');
    } else if (errorMsg) {
      showToast('Không thể đổi size', errorMsg, 'error');
    }
  };

  const clearCart = () => {
    if (!canEditCart()) return;
    setCart([]);
    setAppliedDiscountVoucher(null);
    setAppliedShippingVoucher(null);
  };

  const applyVoucher = (code: string): boolean => {
    const cleanCode = code.trim().toUpperCase();
    const found = dynamicVouchers.find((v) => v.code === cleanCode);

    if (!found || !isVoucherAvailable(found)) {
      showToast('Mã voucher không hợp lệ', 'Mã không tồn tại, chưa đến hạn hoặc đã ngừng áp dụng.', 'error');
      return false;
    }

    if (subtotal < found.minOrderValue) {
      showToast(
        'Đơn hàng chưa đủ điều kiện',
        `Mã này yêu cầu giá trị đơn hàng tối thiểu ${found.minOrderValue.toLocaleString('vi-VN')}đ`,
        'error'
      );
      return false;
    }

    const type = found.voucherType || (found.code.includes('FREESHIP') ? 'shipping' : 'discount');

    // Single-use check: Discount vouchers can only be used once per customer
    if (type !== 'shipping' && usedVouchers.includes(cleanCode)) {
      showToast(
        'Mã giảm giá đã được sử dụng',
        'Mã giảm giá này chỉ áp dụng 1 lần cho mỗi khách hàng và bạn đã sử dụng ở đơn hàng trước.',
        'error'
      );
      return false;
    }

    if (type === 'shipping') {
      setAppliedDiscountVoucher(null);
      setAppliedShippingVoucher(found);
      showToast('Áp dụng mã vận chuyển thành công!', `Đã áp dụng mã ${found.code}: ${found.description}`, 'success');
    } else {
      setAppliedShippingVoucher(null);
      setAppliedDiscountVoucher(found);
      showToast('Áp dụng mã giảm giá thành công!', `Đã áp dụng mã ${found.code}: ${found.description}`, 'success');
    }

    return true;
  };

  const removeDiscountVoucher = () => {
    setAppliedDiscountVoucher(null);
    showToast('Đã bỏ mã giảm giá đơn hàng', undefined, 'info');
  };

  const removeShippingVoucher = () => {
    setAppliedShippingVoucher(null);
    showToast('Đã bỏ mã hỗ trợ vận chuyển', undefined, 'info');
  };

  const removeVoucher = (type?: 'discount' | 'shipping') => {
    if (type === 'shipping') {
      removeShippingVoucher();
    } else if (type === 'discount') {
      removeDiscountVoucher();
    } else {
      setAppliedDiscountVoucher(null);
      setAppliedShippingVoucher(null);
      showToast('Đã bỏ toàn bộ mã ưu đãi', undefined, 'info');
    }
  };

  // Subtotal
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const selectedVoucher = appliedDiscountVoucher || appliedShippingVoucher;
  const appliedVoucher = dynamicVouchers.find(v => v.code === selectedVoucher?.code && isVoucherAvailable(v) && subtotal >= v.minOrderValue) || null;
  const { discountAmount, baseShippingFee, shippingDiscountAmount, shippingFee, total } = calculateOrderPricing(subtotal, appliedVoucher);


  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        changeItemSize,
        clearCart,
        appliedVoucher,
        appliedDiscountVoucher: appliedVoucher?.voucherType !== 'shipping' ? appliedVoucher : null,
        appliedShippingVoucher: appliedVoucher?.voucherType === 'shipping' ? appliedVoucher : null,
        applyVoucher,
        removeVoucher,
        removeDiscountVoucher,
        removeShippingVoucher,
        subtotal,
        discountAmount,
        baseShippingFee,
        shippingDiscountAmount,
        shippingFee,
        total,
        totalItemsCount,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        vouchersList: dynamicVouchers.filter(v => isVoucherAvailable(v)),
        usedVoucherCodes: usedVouchers,
        isVoucherUsed: (code: string) => usedVouchers.includes(code.toUpperCase()),
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
