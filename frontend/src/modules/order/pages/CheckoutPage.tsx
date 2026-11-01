import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  CreditCard,
  Truck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  Wallet,
  Tag,
  Mail,
} from 'lucide-react';
import { calculateOrderPricing } from '@/shared/utils/orderPricing';
import { emailService } from '@/shared/services/emailService';
import { ghnService } from '@/shared/services/ghnService';
import { useCart } from '@/context/CartContext';
import { useOrder } from '@/context/OrderContext';
import { useInventory } from '@/context/InventoryContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ShippingAddress } from '@/types';
import { VoucherModal } from '@/modules/cart/components/VoucherModal';
import { vnpayService } from '@/shared/services/vnpayService';
import { variantSku } from '@/shared/services/transactionService';
import {
  normalizeFullName,
  validateFullName,
  validateVietnamesePhone,
  clampPhoneInput,
  validateEmail,
  validateShippingAddressInput,
} from '@/shared/utils/userInputValidation';

// Bong bóng chỉ dẫn lỗi trực tiếp tại từng ô thông tin (Chat Bubble Tooltip)
const FieldErrorBubble: React.FC<{ message?: string }> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="relative mt-1.5 z-10 animate-fadeIn text-left">
      {/* Mũi tên nhọn trỏ thẳng lên ô nhập */}
      <div className="absolute -top-1.5 left-4 w-3 h-3 bg-rose-50 border-t border-l border-rose-300 transform rotate-45" />
      {/* Khung chat thông báo lỗi */}
      <div className="relative bg-rose-50 border border-rose-300 rounded-xl px-3 py-2 text-[11px] font-medium text-rose-800 shadow-xs flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span className="leading-snug">{message}</span>
      </div>
    </div>
  );
};

interface CheckoutPageProps {
  onNavigate: (path: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onNavigate }) => {
  const {
    cart,
    subtotal,
    appliedVoucher,
    appliedDiscountVoucher,
    appliedShippingVoucher,
    applyVoucher,
    removeDiscountVoucher,
    removeShippingVoucher,
    clearCart,
    vouchersList,
    usedVoucherCodes,
  } = useCart();
  const { createOrder } = useOrder();
  const { deductStock, releaseStock, inventory } = useInventory();
  const { currentUser, openAuthModal, logout } = useAuth();
  const { showToast } = useToast();

  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  const defaultAddr = currentUser?.addresses?.find(a => a.isDefault) || currentUser?.addresses?.[0];

  // Shipping form state - Tự động nạp từ bản nháp sessionStorage nếu người dùng F5 hoặc quay lại
  const [formData, setFormData] = useState<ShippingAddress>(() => {
    try {
      const savedDraft = sessionStorage.getItem('curve_checkout_draft');
      if (savedDraft) {
        return JSON.parse(savedDraft);
      }
    } catch {}
    return {
      fullName: defaultAddr?.fullName || currentUser?.name || '',
      phone: defaultAddr?.phone || currentUser?.phone || '',
      email: defaultAddr?.email || currentUser?.email || '',
      province: defaultAddr?.province || 'TP. Hồ Chí Minh',
      district: defaultAddr?.district || '',
      ward: defaultAddr?.ward || '',
      addressDetail: defaultAddr?.addressDetail || '',
      note: '',
    };
  });

  const [invoiceEmail, setInvoiceEmail] = useState<string>(
    currentUser?.email || defaultAddr?.email || formData.email || ''
  );
  const [wantInvoice, setWantInvoice] = useState<boolean>(true);

  React.useEffect(() => {
    if (currentUser) {
      setFormData((prev) => {
        const nextFullName =
          (!prev.fullName || validateFullName(prev.fullName, 'Họ và tên người nhận')) &&
          currentUser.name &&
          !validateFullName(currentUser.name, 'Họ và tên người nhận')
            ? currentUser.name
            : prev.fullName || currentUser.name || '';
        const nextPhone =
          (!prev.phone || validateVietnamesePhone(prev.phone)) &&
          currentUser.phone &&
          !validateVietnamesePhone(currentUser.phone)
            ? currentUser.phone
            : prev.phone || currentUser.phone || '';
        const next = {
          ...prev,
          fullName: nextFullName,
          phone: nextPhone,
          email: prev.email || currentUser.email || '',
        };
        try {
          sessionStorage.setItem('curve_checkout_draft', JSON.stringify(next));
        } catch {}
        return next;
      });
      if (currentUser.email && !invoiceEmail) {
        setInvoiceEmail(currentUser.email);
      }
    }
  }, [currentUser]);

  const shippingMethod = 'standard';
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'vnpay'>('cod');
  const [ghnFee, setGhnFee] = useState<number | null>(null);
  const [isCalculatingGhnFee, setIsCalculatingGhnFee] = useState(false);
  const [ghnFeeError, setGhnFeeError] = useState<string | null>(null);
  const submittingOrder = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showQrModal, setShowQrModal] = useState(false);
  const [isRedirectingToPayment, setIsRedirectingToPayment] = useState(false);
  const [redirectingOrderId, setRedirectingOrderId] = useState('');

  // Tự động tính cước GHN thực tế dựa theo địa chỉ nhận hàng và trọng lượng giỏ hàng
  useEffect(() => {
    const province = (formData.province || '').trim();
    const district = (formData.district || '').trim();
    const ward = (formData.ward || '').trim();

    if (!province || !district || !ward) {
      setGhnFee(null);
      setGhnFeeError(null);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setIsCalculatingGhnFee(true);
      setGhnFeeError(null);
      try {
        const totalWeight = Math.max(300, cart.reduce((sum, item) => sum + (item.quantity * 400), 0));
        const res = await ghnService.calculateShippingFee(
          { province, district, ward },
          totalWeight,
          subtotal
        );
        if (!active) return;
        if (res.success && typeof res.fee === 'number') {
          setGhnFee(res.fee);
          setGhnFeeError(null);
        } else {
          setGhnFee(null);
          setGhnFeeError(res.errorMessage || 'Không thể tính phí vận chuyển từ GHN.');
        }
      } catch (err: any) {
        if (!active) return;
        setGhnFee(null);
        setGhnFeeError(err?.message || 'Lỗi kết nối bưu cục GHN.');
      } finally {
        if (active) setIsCalculatingGhnFee(false);
      }
    }, 500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [formData.province, formData.district, formData.ward, cart.length, subtotal]);

  const { discountAmount, baseShippingFee, shippingDiscountAmount, shippingFee, rawShippingFee, total: finalTotal } = calculateOrderPricing(subtotal, appliedVoucher, 'standard', ghnFee);

  const checkoutSnapshot = JSON.stringify({
    formData, invoiceEmail, shippingMethod, paymentMethod,
    userId: currentUser?.id, userStatus: currentUser?.status,
    cart: cart.map(item => ({ ...item, sku: undefined })),
    appliedVoucher, appliedDiscountVoucher, appliedShippingVoucher, subtotal, finalTotal,
  });
  const latestCheckoutSnapshot = useRef(checkoutSnapshot);
  latestCheckoutSnapshot.current = checkoutSnapshot;

  const handleInputChange = (field: keyof ShippingAddress, value: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      try {
        sessionStorage.setItem('curve_checkout_draft', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleBlurField = (field: keyof ShippingAddress, value: string) => {
    let targetVal = value;
    if (field === 'fullName') {
      targetVal = normalizeFullName(value);
      handleInputChange('fullName', targetVal);
    } else if (field === 'province' || field === 'district' || field === 'ward' || field === 'addressDetail') {
      targetVal = value.trim();
      handleInputChange(field, targetVal);
    }

    let err: string | null = null;
    switch (field) {
      case 'fullName':
        err = validateFullName(targetVal, 'Họ và tên người nhận');
        break;
      case 'phone':
        err = validateVietnamesePhone(targetVal);
        break;
      case 'email':
        err = validateEmail(targetVal);
        break;
      case 'province':
        err = !targetVal ? 'Vui lòng nhập tỉnh / thành phố nhận hàng.' : null;
        break;
      case 'district':
        err = !targetVal ? 'Vui lòng nhập quận / huyện nhận hàng.' : null;
        break;
      case 'ward':
        err = !targetVal ? 'Vui lòng nhập phường / xã nhận hàng.' : null;
        break;
      case 'addressDetail':
        if (!targetVal) err = 'Vui lòng nhập số nhà, tên đường nhận hàng.';
        else if (targetVal.length < 3) err = 'Địa chỉ chi tiết (số nhà, tên đường) cần tối thiểu 3 ký tự.';
        break;
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingOrder.current) return;
    setErrorMessage('');

    const cleanFullName = normalizeFullName(formData.fullName);
    const cleanPhone = (formData.phone || '').trim();
    const finalEmail = (invoiceEmail || formData.email || currentUser?.email || '').trim();
    const cleanedFormData: ShippingAddress = {
      ...formData,
      fullName: cleanFullName,
      phone: cleanPhone,
      email: finalEmail,
      province: (formData.province || '').trim(),
      district: (formData.district || '').trim(),
      ward: (formData.ward || '').trim(),
      addressDetail: (formData.addressDetail || '').trim(),
    };
    setFormData(cleanedFormData);

    const newErrors = validateShippingAddressInput(cleanedFormData, {
      requireEmail: true,
      requireWard: true,
    });

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      const firstKey = Object.keys(newErrors)[0];
      const targetEl = document.getElementById(`checkout-${firstKey}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.focus();
      }
      return;
    }
    setFieldErrors({});

    // 1. Kiểm tra tài khoản có bị Quản trị viên khóa hay không (Bảo vệ an toàn phiên hoạt động)
    const isLocked = currentUser?.status === 'locked' || (() => {
      try {
        const lockedList: string[] = JSON.parse(localStorage.getItem('curve_locked_users') || '[]');
        return currentUser ? (lockedList.includes(currentUser.id) || (!!currentUser.email && lockedList.includes(currentUser.email.toLowerCase()))) : false;
      } catch {
        return false;
      }
    })();

    if (isLocked) {
      showToast('Tài khoản bị khóa', 'Tài khoản của bạn đã bị Quản trị viên tạm khóa. Không thể thực hiện thanh toán giao dịch.', 'error');
      setErrorMessage('Tài khoản đã bị tạm khóa. Vui lòng liên hệ bộ phận hỗ trợ.');
      setIsProcessing(false);
      logout();
      onNavigate('/');
      return;
    }

    // 2. Tiền kiểm tra số lượng tồn kho thực tế (Chống bán khống / Overselling)
    for (const it of cart) {
      const productName = it.product?.name || 'Sản phẩm';
      let sku: string;
      try {
        sku = variantSku(it);
        it.sku = sku; // Đồng bộ lại SKU đã xác thực vào dòng giỏ hàng cho bước đặt đơn
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : `Sản phẩm "${productName}" chưa có mã SKU hợp lệ trong kho.`;
        showToast('Mã SKU không hợp lệ', msg, 'error');
        setErrorMessage(msg);
        setIsProcessing(false);
        return;
      }

      if (inventory.length > 0) {
        const invItem = inventory.find(i => i.sku === sku);
        if (!invItem) {
          showToast('Sản phẩm không có trong kho', `Sản phẩm "${productName}" (Size ${it.size} - SKU: ${sku}) hiện không tìm thấy trong dữ liệu kho hàng.`, 'error');
          setErrorMessage(`Sản phẩm "${productName}" (Size ${it.size}) không tìm thấy trong kho.`);
          setIsProcessing(false);
          return;
        }

        const availableStock = Math.max(0, invItem.quantity - (invItem.heldQuantity || 0));
        if (availableStock < it.quantity) {
          showToast('Sản phẩm không đủ hàng', `Sản phẩm "${productName}" (Size ${it.size}) hiện chỉ còn ${availableStock} sản phẩm khả dụng trong kho. Vui lòng điều chỉnh lại số lượng giỏ hàng!`, 'error');
          setErrorMessage(`Sản phẩm "${productName}" (Size ${it.size}) hiện chỉ còn ${availableStock} sản phẩm khả dụng trong kho.`);
          setIsProcessing(false);
          return;
        }
      }
    }

    if (ghnFeeError) {
      showToast('Cước vận chuyển chưa xác định', ghnFeeError, 'error');
      setErrorMessage(`Không thể tính cước vận chuyển GHN: ${ghnFeeError}. Vui lòng kiểm tra lại địa chỉ.`);
      setIsProcessing(false);
      return;
    }

    submittingOrder.current = true;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const targetVoucherCode = appliedDiscountVoucher?.code || appliedVoucher?.code || appliedShippingVoucher?.code || undefined;

      const newOrder = await createOrder({
        items: [...cart],
        shippingAddress: {
          ...cleanedFormData,
          email: finalEmail,
        },
        shippingMethod,
        shippingFee,
        paymentMethod,
        paymentStatus: 'pending',
        subtotal,
        discountAmount,
        voucherCode: targetVoucherCode,
        total: finalTotal,
        wantInvoice: true,
        invoiceEmail: finalEmail,
      });

      // Clear draft
      try {
        sessionStorage.removeItem('curve_checkout_draft');
      } catch {}

      // Nếu chọn VNPay: hiển thị overlay chuyển hướng chuyên nghiệp, không làm lộ màn hình giỏ hàng trống
      if (paymentMethod === 'vnpay') {
        setIsRedirectingToPayment(true);
        setRedirectingOrderId(newOrder.id);

        const vnpayRes = await vnpayService.createPaymentUrl(
          newOrder.id,
          finalTotal,
          `Thanh toan don hang ${newOrder.id} tai Curve and Confidence`,
          `${window.location.origin}/order-success/${newOrder.id}`
        );

        clearCart();

        if (vnpayRes.success && vnpayRes.paymentUrl) {
          window.location.href = vnpayRes.paymentUrl;
          return;
        } else {
          setIsRedirectingToPayment(false);
          showToast('Không thể kết nối cổng VNPay', vnpayRes.errorMessage || 'Đơn hàng đang ở trạng thái Chờ thanh toán. Bạn có thể thử thanh toán lại hoặc hủy đơn.', 'error');
          onNavigate(`/order-success/${newOrder.id}`);
          return;
        }
      }

      // Clear cart
      clearCart();

      // Tự động gửi hóa đơn điện tử ngay cho đơn hàng COD hoặc VietQR hoàn tất tại Checkout
      if (finalEmail) {
        emailService.sendOrderInvoice(newOrder, finalEmail, formData.fullName).catch((err) => {
          console.warn('⚠️ Lỗi gửi hóa đơn tự động tại Checkout:', err);
        });
      }

      // Confetti celebration (chỉ dành cho phương thức hoàn tất ngay tại checkout)
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {
        console.error('Confetti error', err);
      }

      // Navigate to success
      onNavigate(`/order-success/${newOrder.id}`);
    } catch (err: any) {
      console.error('Lỗi thanh toán đơn hàng:', err);
      setErrorMessage(err?.message || 'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.');
    } finally {
      submittingOrder.current = false;
      setIsProcessing(false);
    }
  };

  // Màn hình kết nối cổng thanh toán VNPay chuyên nghiệp (chống giật lộ Giỏ hàng trống)
  if (isRedirectingToPayment) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 bg-surface-light">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200/90 shadow-xl text-center space-y-6 animate-scaleIn">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-[#5C1D24]/10 border-t-[#5C1D24] animate-spin" />
            <div className="w-12 h-12 rounded-2xl bg-[#5C1D24]/5 text-[#5C1D24] flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#0066cc] border border-blue-200 inline-block">
              Cổng Thanh Toán Quốc Gia VNPay
            </span>
            <h2 className="text-xl font-extrabold text-charcoal-900 font-heading">
              Đang Kết Nối Bảo Mật Đến VNPay...
            </h2>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              Hệ thống đang mã hóa phiên giao dịch an toàn SSL 256-bit. Vui lòng không đóng trình duyệt hoặc tải lại trang trong khi hệ thống chuyển hướng.
            </p>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs space-y-1.5 text-left">
            <div className="flex justify-between items-center text-stone-500">
              <span>Mã đơn hàng:</span>
              <strong className="font-mono text-charcoal-900 font-bold">{redirectingOrderId}</strong>
            </div>
            <div className="flex justify-between items-center text-stone-500">
              <span>Số tiền thanh toán:</span>
              <strong className="text-brand-600 font-extrabold text-sm">{finalTotal.toLocaleString('vi-VN')}₫</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-bold text-charcoal-900">Giỏ hàng trống</h2>
        <p className="text-xs text-charcoal-500 mt-2">Vui lòng chọn sản phẩm trước khi thanh toán.</p>
        <button
          onClick={() => onNavigate('/products')}
          className="mt-4 px-6 py-2.5 bg-brand-500 text-white rounded-full text-xs font-bold"
        >
          Xem sản phẩm
        </button>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="py-20 bg-surface-light min-h-[70vh] flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-6 py-8 bg-white rounded-3xl border border-surface-border shadow-soft text-center space-y-6">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto text-brand-600">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-charcoal-900 font-heading">
              Vui Lòng Đăng Nhập Để Thanh Toán
            </h2>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              Quý khách vui lòng đăng nhập hoặc tạo tài khoản để tích điểm hội viên, áp dụng mã ưu đãi và được hưởng chính sách bảo hiểm đổi size 7 ngày tận nơi.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                try {
                  sessionStorage.setItem('auth_redirect_url', '/checkout');
                } catch {}
                onNavigate('/login');
              }}
              className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl transition-all shadow-float flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Đăng Nhập Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                try {
                  sessionStorage.setItem('auth_redirect_url', '/checkout');
                } catch {}
                onNavigate('/register');
              }}
              className="w-full py-3.5 bg-surface-cream hover:bg-stone-200 text-charcoal-900 font-bold text-sm rounded-xl transition-all border border-surface-border cursor-pointer"
            >
              Tạo Tài Khoản Mới (Đăng Ký)
            </button>
            <button
              onClick={() => onNavigate('/cart')}
              className="w-full py-2 text-xs font-semibold text-charcoal-500 hover:text-charcoal-800"
            >
              ← Quay lại giỏ hàng
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 bg-surface-light min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-charcoal-400 mb-6">
          <button onClick={() => onNavigate('/')} className="hover:text-charcoal-700">
            Trang chủ
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <button onClick={() => onNavigate('/cart')} className="hover:text-charcoal-700">
            Giỏ hàng
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-charcoal-800 font-semibold">Thanh toán & Đặt hàng</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight mb-8">
          Thông Tin Giao Hàng & Thanh Toán
        </h1>

        {/* Error message alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Đã xảy ra lỗi trong quá trình thanh toán:</p>
              <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
              {(errorMessage.includes('giỏ hàng') || errorMessage.includes('SKU') || errorMessage.includes('kho')) && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('/cart')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 text-white font-medium text-xs hover:bg-red-700 transition-colors shadow-sm"
                  >
                    Quay lại Giỏ hàng để điều chỉnh sản phẩm &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Shipping & Payment (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Thông tin người nhận */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-surface-border shadow-soft space-y-4">
              <h3 className="font-heading font-bold text-base text-charcoal-900 pb-3 border-b border-surface-border">
                1. Địa Chỉ Nhận Hàng
              </h3>

              {/* Sổ địa chỉ đã lưu (cho khách đã đăng nhập) */}
              {currentUser?.addresses && currentUser.addresses.length > 0 && (
                <div className="mb-2 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                  <p className="text-[11px] font-bold text-stone-600 mb-2 flex items-center gap-1.5">
                    <span>📍</span> Chọn nhanh từ sổ địa chỉ đã lưu:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {currentUser.addresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setFormData({
                            fullName: a.fullName,
                            phone: a.phone,
                            email: a.email,
                            province: a.province,
                            district: a.district,
                            ward: a.ward,
                            addressDetail: a.addressDetail,
                            note: a.note || ''
                          });
                          setFieldErrors({});
                          showToast('Đã chọn địa chỉ', `${a.label || 'Địa chỉ'}: ${a.addressDetail}`, 'info');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          formData.addressDetail === a.addressDetail
                            ? 'bg-brand-700 text-white border-brand-700 shadow-xs'
                            : 'bg-white text-charcoal-700 border-stone-300 hover:border-brand-600'
                        }`}
                      >
                        {a.label || 'Địa chỉ'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-fullName" className="block text-xs font-bold text-charcoal-700 mb-1">
                    Họ và tên người nhận <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="checkout-fullName"
                    type="text"
                    required
                    maxLength={100}
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    onBlur={(e) => handleBlurField('fullName', e.target.value)}
                    className={`w-full bg-surface-cream border rounded-xl p-2.5 text-xs text-charcoal-900 focus:outline-none transition-all ${
                      fieldErrors.fullName
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-300'
                        : 'border-surface-border focus:border-brand-500'
                    }`}
                  />
                  <FieldErrorBubble message={fieldErrors.fullName} />
                </div>

                <div>
                  <label htmlFor="checkout-phone" className="block text-xs font-bold text-charcoal-700 mb-1">
                    Số điện thoại liên hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', clampPhoneInput(e.target.value))}
                    onBlur={(e) => handleBlurField('phone', e.target.value)}
                    className={`w-full bg-surface-cream border rounded-xl p-2.5 text-xs text-charcoal-900 focus:outline-none transition-all font-mono ${
                      fieldErrors.phone
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-300'
                        : 'border-surface-border focus:border-brand-500'
                    }`}
                  />
                  <FieldErrorBubble message={fieldErrors.phone} />
                </div>

                {/* Email nhận hóa đơn điện tử & thông báo đơn hàng */}
                <div className="sm:col-span-2">
                  <label htmlFor="checkout-email" className="block text-xs font-bold text-charcoal-700 mb-1">
                    Địa chỉ Email nhận hóa đơn & mã vận đơn <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="checkout-email"
                      type="email"
                      required
                      maxLength={254}
                      placeholder="VD: nguyenvana@gmail.com"
                      value={invoiceEmail}
                      onChange={(e) => {
                        setInvoiceEmail(e.target.value);
                        handleInputChange('email', e.target.value);
                        if (fieldErrors.email) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.email;
                            return next;
                          });
                        }
                      }}
                      onBlur={(e) => handleBlurField('email', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2.5 bg-surface-cream border rounded-xl text-xs text-charcoal-900 placeholder:text-stone-400 focus:outline-none transition-all font-medium ${
                        fieldErrors.email
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-300'
                          : 'border-surface-border focus:border-brand-500 focus:bg-white'
                      }`}
                    />
                  </div>
                  <FieldErrorBubble message={fieldErrors.email} />
                  <div className="mt-2 mb-1 flex items-start gap-2 text-[11px] text-stone-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1"></span>
                    <p className="leading-relaxed text-stone-600">
                      Hóa đơn điện tử chi tiết và cập nhật hành trình vận đơn sẽ được tự động gửi từ{' '}
                      <strong className="text-stone-800 font-semibold">shopbigsize47@gmail.com</strong>{' '}
                      về email này ngay khi thanh toán.
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="checkout-province" className="block text-xs font-bold text-charcoal-700 mb-1">
                    Tỉnh / Thành phố <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="checkout-province"
                    type="text"
                    required
                    maxLength={100}
                    value={formData.province}
                    onChange={(e) => handleInputChange('province', e.target.value)}
                    onBlur={(e) => handleBlurField('province', e.target.value)}
                    className={`w-full bg-surface-cream border rounded-xl p-2.5 text-xs text-charcoal-900 focus:outline-none transition-all ${
                      fieldErrors.province
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-300'
                        : 'border-surface-border focus:border-brand-500'
                    }`}
                  />
                  <FieldErrorBubble message={fieldErrors.province} />
                </div>

                <div>
                  <label htmlFor="checkout-district" className="block text-xs font-bold text-charcoal-700 mb-1">
                    Quận / Huyện <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="checkout-district"
                    type="text"
                    required
                    maxLength={100}
                    value={formData.district}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    onBlur={(e) => handleBlurField('district', e.target.value)}
                    placeholder="Nhập quận / huyện"
                    className={`w-full bg-surface-cream border rounded-xl p-2.5 text-xs text-charcoal-900 focus:outline-none transition-all ${
                      fieldErrors.district
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-300'
                        : 'border-surface-border focus:border-brand-500'
                    }`}
                  />
                  <FieldErrorBubble message={fieldErrors.district} />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="checkout-ward" className="block text-xs font-bold text-charcoal-700 mb-1">
                    Phường / Xã <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="checkout-ward"
                    type="text"
                    required
                    maxLength={100}
                    value={formData.ward}
                    onChange={(e) => handleInputChange('ward', e.target.value)}
                    onBlur={(e) => handleBlurField('ward', e.target.value)}
                    placeholder="Nhập đúng phường / xã nhận hàng"
                    className={`w-full bg-surface-cream border rounded-xl p-2.5 text-xs text-charcoal-900 focus:outline-none transition-all ${
                      fieldErrors.ward
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-300'
                        : 'border-surface-border focus:border-brand-500'
                    }`}
                  />
                  <FieldErrorBubble message={fieldErrors.ward} />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="checkout-addressDetail" className="block text-xs font-bold text-charcoal-700 mb-1">
                    Địa chỉ chi tiết (Số nhà, tên đường) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="checkout-addressDetail"
                    type="text"
                    required
                    placeholder="VD: Số 45 Lê Duẩn"
                    maxLength={500}
                    value={formData.addressDetail}
                    onChange={(e) => handleInputChange('addressDetail', e.target.value)}
                    onBlur={(e) => handleBlurField('addressDetail', e.target.value)}
                    className={`w-full bg-surface-cream border rounded-xl p-2.5 text-xs text-charcoal-900 focus:outline-none transition-all ${
                      fieldErrors.addressDetail
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-300'
                        : 'border-surface-border focus:border-brand-500'
                    }`}
                  />
                  <FieldErrorBubble message={fieldErrors.addressDetail} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-charcoal-700 mb-1">
                    Ghi chú đơn hàng (nếu có)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Giao giờ hành chính, gọi trước khi đến..."
                    value={formData.note || ''}
                    onChange={(e) => handleInputChange('note', e.target.value)}
                    className="w-full bg-surface-cream border border-surface-border rounded-xl p-2.5 text-xs text-charcoal-900 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Phương thức vận chuyển */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-surface-border shadow-soft space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <h3 className="font-heading font-bold text-base text-charcoal-900">
                  2. Đơn Vị & Hình Thức Vận Chuyển
                </h3>
                <span className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Đối tác GHN Express
                </span>
              </div>

              <div className="space-y-3">
                <div
                  className="flex items-center justify-between p-4 rounded-2xl border border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/20 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                      GHN
                    </div>
                    <div>
                      <p className="text-xs font-bold text-charcoal-900">
                        Giao hàng tiêu chuẩn (GHN)
                      </p>
                      <p className="text-[11px] text-charcoal-500 mt-0.5">
                        Bưu tá giao tận nơi • Dự kiến 1 - 3 ngày làm việc
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {isCalculatingGhnFee ? (
                      <span className="text-xs text-stone-400 italic">Đang tính cước GHN...</span>
                    ) : ghnFee != null ? (
                      shippingFee === 0 ? (
                        <div className="space-y-0.5">
                          <span className="text-xs text-emerald-700 font-extrabold block">Freeship 0₫</span>
                          <span className="text-[10px] text-stone-400 line-through block font-mono">
                            {ghnFee.toLocaleString('vi-VN')}₫
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-charcoal-900 font-mono">
                          {ghnFee.toLocaleString('vi-VN')}₫
                        </span>
                      )
                    ) : ghnFeeError ? (
                      <span className="text-[11px] text-rose-600 font-medium block max-w-[180px] leading-tight text-right">
                        {ghnFeeError}
                      </span>
                    ) : (
                      <span className="text-[11px] text-stone-400 italic">Chọn địa chỉ để tính cước</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Phương thức thanh toán */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-surface-border shadow-soft space-y-4">
              <h3 className="font-heading font-bold text-base text-charcoal-900 pb-3 border-b border-surface-border">
                3. Hình Thức Thanh Toán
              </h3>

              <div className="space-y-3">

                {/* COD */}
                <div
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === 'cod'
                      ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500'
                      : 'border-surface-border bg-white hover:bg-surface-cream'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-charcoal-900">
                        Thanh toán khi nhận hàng (COD)
                      </p>
                      <p className="text-[11px] text-charcoal-500">Được mở kiện kiểm tra hàng trước khi gửi tiền</p>
                    </div>
                  </div>
                </div>

                {/* VNPay Sandbox Cổng thanh toán quốc gia */}
                <div
                  onClick={() => setPaymentMethod('vnpay')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === 'vnpay'
                      ? 'border-[#0066cc] bg-blue-50/50 ring-1 ring-[#0066cc]'
                      : 'border-surface-border bg-white hover:bg-surface-cream'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-[#0066cc]" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-charcoal-900">
                          Cổng thanh toán điện tử VNPay Sandbox (ATM / QR Pay)
                        </p>
                        <span className="bg-blue-100 text-[#0066cc] text-[10px] font-bold px-1.5 py-0.5 rounded">
                          Tích hợp Sandbox
                        </span>
                      </div>
                      <p className="text-[11px] text-charcoal-500">
                        Chuyển hướng trực tiếp đến Cổng thanh toán VNPay chính thức
                      </p>
                    </div>
                  </div>

                  {paymentMethod === 'vnpay' && (
                    <div className="mt-3 p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1 text-charcoal-700 animate-fadeIn">
                      <p className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
                        <span>Cổng thanh toán điện tử VNPay Sandbox:</span>
                      </p>
                      <p className="text-[11px] text-blue-800 leading-relaxed">
                        Sau khi bấm Xác nhận đặt hàng, hệ thống sẽ chuyển hướng an toàn đến Cổng thanh toán VNPay Sandbox để quý khách thực hiện thanh toán bằng thẻ ATM nội địa (NCB) hoặc ứng dụng ngân hàng.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Items Summary & Submit (5 cols) */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-surface-border shadow-soft space-y-6 sticky top-28">
            <h3 className="font-heading font-bold text-base text-charcoal-900 pb-3 border-b border-surface-border">
              Đơn Hàng Của Bạn ({cart.length} món)
            </h3>

            {/* Items mini list */}
            <div className="divide-y divide-surface-border max-h-60 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="py-3 flex items-center gap-3">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-12 h-14 object-cover rounded-xl bg-stone-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-bold text-charcoal-900 truncate">{item.product.name}</p>
                    <p className="text-[11px] text-charcoal-500 mt-0.5">
                      Size: <strong>{item.size}</strong> • {item.colorName} • SL: <strong>{item.quantity}</strong>
                    </p>
                  </div>
                  <span className="text-xs font-bold text-charcoal-900">
                    {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                  </span>
                </div>
              ))}
            </div>

            {/* Voucher Selection & Dual Applied Status */}
            <div className="pt-3 border-t border-surface-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-charcoal-900 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-brand-600" />
                  <span>Ưu đãi & Voucher</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(true)}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{appliedDiscountVoucher || appliedShippingVoucher ? 'Đổi voucher' : 'Chọn voucher'}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Applied Discount Voucher Chip */}
              {appliedDiscountVoucher && (
                <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-xl p-2 text-xs">
                  <div className="flex items-center gap-2 text-rose-900 min-w-0">
                    <Tag className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="truncate">
                      Giảm: <strong className="font-mono">{appliedDiscountVoucher.code}</strong> (-{discountAmount.toLocaleString('vi-VN')}₫)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeDiscountVoucher}
                    className="text-[11px] text-rose-700 hover:text-rose-900 font-semibold underline shrink-0 cursor-pointer ml-2"
                  >
                    Bỏ mã
                  </button>
                </div>
              )}

              {/* Applied Shipping Voucher Chip */}
              {appliedShippingVoucher && (
                <div className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-xl p-2 text-xs">
                  <div className="flex items-center gap-2 text-sky-900 min-w-0">
                    <Truck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span className="truncate">
                      Freeship: <strong className="font-mono">{appliedShippingVoucher.code}</strong> (-{shippingDiscountAmount.toLocaleString('vi-VN')}₫)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeShippingVoucher}
                    className="text-[11px] text-sky-700 hover:text-sky-900 font-semibold underline shrink-0 cursor-pointer ml-2"
                  >
                    Bỏ mã
                  </button>
                </div>
              )}
            </div>

            {/* Calculations */}
            <div className="space-y-2 text-xs text-charcoal-600 pt-3 border-t border-surface-border">
              <div className="flex justify-between">
                <span>Tiền hàng:</span>
                <span className="font-bold text-charcoal-900">{subtotal.toLocaleString('vi-VN')}₫</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-700 font-semibold">
                  <span>Giảm giá voucher {appliedDiscountVoucher ? `(${appliedDiscountVoucher.code})` : ''}:</span>
                  <span>-{discountAmount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Phí vận chuyển GHN:</span>
                <span className="font-bold">
                  {isCalculatingGhnFee ? (
                    <span className="text-stone-400 italic font-normal">Đang tính...</span>
                  ) : ghnFee != null ? (
                    shippingFee === 0 ? (
                      <span className="text-emerald-700">Miễn phí <span className="line-through text-stone-400 font-normal">({ghnFee.toLocaleString('vi-VN')}₫)</span></span>
                    ) : (
                      `${ghnFee.toLocaleString('vi-VN')}₫`
                    )
                  ) : ghnFeeError ? (
                    <span className="text-rose-600 text-[11px] font-normal">Chưa tính được</span>
                  ) : (
                    <span className="text-stone-400 font-normal italic">Chờ địa chỉ</span>
                  )}
                </span>
              </div>
              {shippingDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Ưu đãi Freeship {subtotal >= 500000 ? '(Đơn từ 500k)' : `(${appliedShippingVoucher?.code})`}:</span>
                  <span>-{shippingDiscountAmount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-charcoal-900 pt-3 border-t border-surface-border">
                <span>Tổng cần thanh toán:</span>
                <span className="text-xl font-extrabold text-brand-600 font-heading">
                  {finalTotal.toLocaleString('vi-VN')}₫
                </span>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:bg-stone-300 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-float transition-all group"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý đặt hàng...</span>
                </>
              ) : (
                <>
                  <span>Xác nhận đặt hàng ({finalTotal.toLocaleString('vi-VN')}₫)</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="text-center text-[11px] text-charcoal-400 space-y-1 pt-1">
              <p>Cam kết bảo mật thông tin khách hàng tuyệt đối.</p>
              <p>Hỗ trợ đổi size tận nơi trong 7 ngày nếu không vừa vặn.</p>
            </div>
          </div>
        </form>
      </div>

      {/* Voucher Selection Modal */}
      <VoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        onApplyVoucher={(code) => {
          const success = applyVoucher(code);
          return success;
        }}
        currentSubtotal={subtotal}
        appliedDiscountVoucher={appliedDiscountVoucher}
        appliedShippingVoucher={appliedShippingVoucher}
        onRemoveDiscount={removeDiscountVoucher}
        onRemoveShipping={removeShippingVoucher}
        vouchersList={vouchersList}
        usedVoucherCodes={usedVoucherCodes}
      />
    </div>
  );
};
