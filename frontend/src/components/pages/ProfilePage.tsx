import React, { useState } from 'react';
import { User, MapPin, Package, RotateCcw, Plus, Trash2, Edit3, CheckCircle, Clock, ShieldCheck, ArrowRight, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrder } from '../../context/OrderContext';
import { useReturn } from '../../context/ReturnContext';
import { useToast } from '../../context/ToastContext';
import { ShippingAddress } from '../../types';
import { ReturnModal } from '../returns/ReturnModal';
import { CancelOrderModal } from '../returns/CancelOrderModal';

interface ProfilePageProps {
  onNavigate: (path: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { currentUser, currentRole, updateProfile, addAddress, deleteAddress, setDefaultAddress } = useAuth();
  const { orders } = useOrder();
  const { returnRequests, cancellationRequests } = useReturn();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'info' | 'addresses' | 'orders' | 'returns'>('orders');

  // Personal Info Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');

  // Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [newAddr, setNewAddr] = useState<Omit<ShippingAddress, 'id'>>({
    fullName: currentUser?.name || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    province: 'Hà Nội',
    district: 'Quận Cầu Giấy',
    ward: 'Phường Dịch Vọng Hậu',
    addressDetail: '',
    label: 'Nhà riêng',
    isDefault: false
  });

  // Action Modals
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<any>(null);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<any>(null);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, phone, email });
    showToast('Cập nhật hồ sơ thành công', 'Thông tin cá nhân đã được lưu!', 'success');
  };

  const handleCreateAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddr.addressDetail) return;
    addAddress(newAddr);
    setIsAddressModalOpen(false);
    showToast('Đã thêm địa chỉ mới', 'Địa chỉ giao hàng đã được cập nhật vào sổ.', 'success');
    setNewAddr({
      fullName: currentUser?.name || '',
      phone: currentUser?.phone || '',
      email: currentUser?.email || '',
      province: 'Hà Nội',
      district: 'Quận Cầu Giấy',
      ward: 'Phường Dịch Vọng Hậu',
      addressDetail: '',
      label: 'Nhà riêng',
      isDefault: false
    });
  };

  return (
    <div className="bg-stone-50 min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* User Greeting Card */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-surface-border mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-50 border-2 border-brand-200 overflow-hidden shrink-0 flex items-center justify-center">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-brand-700" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-charcoal-900">
                  {currentUser?.name || 'Khách hàng Big Size'}
                </h1>
                <span className="px-2.5 py-0.5 bg-brand-100 text-brand-800 text-[10px] font-bold rounded-full uppercase">
                  {currentRole === 'customer' ? 'Thành Viên VIP' : currentRole}
                </span>
              </div>
              <p className="text-xs text-charcoal-500 mt-1">
                {currentUser?.email || 'Chưa cập nhật email'} • {currentUser?.phone || 'Chưa cập nhật SĐT'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('/account/body-profiles')}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-charcoal-800 text-xs font-bold rounded-lg transition-colors"
            >
              Hồ Sơ Số Đo AI Fit
            </button>
            <button
              onClick={() => onNavigate('/products')}
              className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Tiếp Tục Mua Sắm
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-surface-border bg-white rounded-t-2xl px-6 pt-3 gap-8 text-xs font-bold">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'orders'
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Đơn Hàng Của Tôi ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'returns'
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-900'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Yêu Cầu Đổi/Trả & Hủy ({returnRequests.length + cancellationRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'addresses'
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Sổ Địa Chỉ Giao Hàng ({currentUser?.addresses?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('info')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'info'
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Thông Tin Cá Nhân</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="bg-white rounded-b-2xl p-6 shadow-soft border-x border-b border-surface-border">
          {/* TAB 1: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {orders.length === 0 ? (
                <div className="text-center py-12 text-charcoal-500">
                  <Package className="w-12 h-12 mx-auto text-stone-300 mb-2" />
                  <p>Bạn chưa có đơn hàng nào.</p>
                </div>
              ) : (
                orders.map((order) => {
                  const isDelivered = order.status === 'delivered';
                  const isPending = order.status === 'placed';
                  const isConfirmed = order.status === 'confirmed';
                  const isCancelled = order.status === 'cancelled';

                  return (
                    <div
                      key={order.id}
                      className="border border-stone-200 rounded-xl p-5 hover:border-brand-300 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-charcoal-900">{order.id}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isDelivered ? 'bg-emerald-100 text-emerald-800' :
                              isCancelled ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {order.status === 'placed' && 'Chờ xác nhận'}
                              {order.status === 'confirmed' && 'Đã xác nhận'}
                              {order.status === 'preparing' && 'Đang đóng gói'}
                              {order.status === 'shipping' && 'Đang giao hàng (3PL)'}
                              {order.status === 'delivered' && 'Đã giao thành công'}
                              {order.status === 'cancelled' && 'Đã hủy đơn'}
                            </span>
                            {order.trackingCode && (
                              <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-mono font-semibold">
                                {order.carrier}: {order.trackingCode}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-charcoal-500 mt-1">Đặt lúc: {order.createdAt}</p>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold text-brand-700">
                            {order.total.toLocaleString('vi-VN')}₫
                          </span>
                          <span className="text-[10px] text-charcoal-500 block">
                            {order.items.length} món • {order.paymentMethod.toUpperCase()} ({order.paymentStatus})
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="py-3 space-y-2">
                        {order.items.map((it) => (
                          <div key={it.id} className="flex items-center gap-3">
                            <img
                              src={it.product.images[0]}
                              alt={it.product.name}
                              className="w-12 h-12 object-cover rounded-lg shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-charcoal-900 truncate">{it.product.name}</p>
                              <p className="text-[11px] text-charcoal-500">
                                Size: <strong className="text-brand-700">{it.size}</strong> • Màu: {it.colorName} • SL: {it.quantity}
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-charcoal-800">
                              {(it.price * it.quantity).toLocaleString('vi-VN')}₫
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons (Module 7: Return & Cancel) */}
                      <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                        <button
                          onClick={() => onNavigate(`/tracking?id=${order.id}`)}
                          className="text-xs font-bold text-charcoal-700 hover:text-brand-700 flex items-center gap-1"
                        >
                          <span>Xem Hành Trình Vận Đơn</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center gap-2">
                          {/* Cancel button if pending */}
                          {isPending && (
                            <button
                              onClick={() => setSelectedOrderForCancel(order)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold"
                            >
                              Hủy Đơn Hàng
                            </button>
                          )}

                          {/* Request cancel if confirmed */}
                          {isConfirmed && (
                            <button
                              onClick={() => setSelectedOrderForCancel(order)}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold"
                            >
                              Yêu Cầu Hủy Đơn
                            </button>
                          )}

                          {/* Exchange / Return button if delivered (FR-C09) */}
                          {isDelivered && (
                            <button
                              onClick={() => setSelectedOrderForReturn(order)}
                              className="px-3 py-1.5 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Yêu Cầu Đổi Size / Trả Hàng (7 Ngày)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: RETURNS & CANCELLATIONS */}
          {activeTab === 'returns' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-sm text-charcoal-900 mb-3 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-brand-700" />
                  Yêu Cầu Đổi Size & Trả Hàng ({returnRequests.length})
                </h3>
                {returnRequests.length === 0 ? (
                  <p className="text-xs text-charcoal-500 py-4">Chưa có yêu cầu đổi/trả nào.</p>
                ) : (
                  <div className="space-y-3">
                    {returnRequests.map((req) => (
                      <div key={req.id} className="p-4 border border-stone-200 rounded-xl bg-stone-50/50">
                        <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-brand-700">{req.id}</span>
                            <span className="text-[11px] text-charcoal-500">Đơn hàng: {req.orderId}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              req.status === 'pending_review' ? 'bg-amber-100 text-amber-800' :
                              req.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                              req.status === 'received_goods' ? 'bg-purple-100 text-purple-800' :
                              req.status === 'exchange_sent' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-stone-200 text-charcoal-700'
                            }`}>
                              {req.status === 'pending_review' && 'Chờ xét duyệt'}
                              {req.status === 'approved' && 'Đã duyệt yêu cầu'}
                              {req.status === 'received_goods' && 'Đã nhận hàng về kho'}
                              {req.status === 'exchange_sent' && 'Đã gửi size mới'}
                              {req.status === 'refunded' && 'Đã hoàn tiền'}
                            </span>
                          </div>
                          <span className="text-[10px] text-charcoal-400">{req.createdAt}</span>
                        </div>
                        <div className="py-2.5 flex items-center gap-3">
                          <img src={req.productImage} alt={req.productName} className="w-10 h-10 object-cover rounded-lg" />
                          <div className="flex-1 text-xs">
                            <p className="font-bold text-charcoal-900">{req.productName}</p>
                            <p className="text-charcoal-500 text-[11px]">
                              Loại: {req.type === 'exchange_size' ? `Đổi từ size ${req.currentSize} ➔ sang size ${req.requestedSize}` : 'Trả hàng & Hoàn tiền'}
                            </p>
                            <p className="text-charcoal-600 text-[11px] italic mt-0.5">"{req.reasonDetail}"</p>
                          </div>
                        </div>
                        {req.adminNote && (
                          <div className="text-[11px] p-2 bg-white border border-stone-200 rounded-lg text-charcoal-700">
                            <strong>Phản hồi từ Quản lý:</strong> {req.adminNote}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cancellation requests */}
              <div className="pt-4 border-t border-stone-200">
                <h3 className="font-bold text-sm text-charcoal-900 mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Yêu Cầu Hủy Đơn Hàng ({cancellationRequests.length})
                </h3>
                {cancellationRequests.length === 0 ? (
                  <p className="text-xs text-charcoal-500 py-4">Chưa có yêu cầu hủy đơn nào.</p>
                ) : (
                  <div className="space-y-3">
                    {cancellationRequests.map((can) => (
                      <div key={can.id} className="p-3.5 border border-stone-200 rounded-xl bg-stone-50/50 text-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-rose-700">{can.id}</span>
                            <span className="text-charcoal-500">Đơn hàng: {can.orderId}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              can.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {can.status === 'approved' ? 'Đã duyệt hủy' : 'Đang chờ duyệt'}
                            </span>
                          </div>
                          <span className="text-[10px] text-charcoal-400">{can.createdAt}</span>
                        </div>
                        <p className="text-charcoal-600 mt-2"><strong>Lý do:</strong> {can.reason}</p>
                        {can.adminNote && (
                          <p className="text-[11px] text-emerald-700 mt-1 font-semibold">Ghi chú: {can.adminNote}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-charcoal-500">Quản lý các địa chỉ nhận hàng để thanh toán nhanh hơn.</p>
                <button
                  onClick={() => setIsAddressModalOpen(true)}
                  className="px-3.5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Địa Chỉ Mới</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {currentUser?.addresses?.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-4 rounded-xl border relative transition-all ${
                      addr.isDefault
                        ? 'border-brand-700 bg-brand-50/20 shadow-sm'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-charcoal-900">{addr.fullName}</span>
                        {addr.label && (
                          <span className="px-2 py-0.5 bg-stone-100 text-charcoal-600 rounded text-[10px] font-semibold">
                            {addr.label}
                          </span>
                        )}
                        {addr.isDefault && (
                          <span className="px-2 py-0.5 bg-brand-700 text-white rounded text-[10px] font-bold">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!addr.isDefault && (
                          <button
                            onClick={() => setDefaultAddress(addr.id!)}
                            className="text-[11px] text-brand-700 hover:underline font-semibold mr-2"
                          >
                            Đặt mặc định
                          </button>
                        )}
                        <button
                          onClick={() => deleteAddress(addr.id!)}
                          className="p-1 text-charcoal-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-charcoal-600">{addr.phone}</p>
                    <p className="text-xs text-charcoal-700 mt-1 leading-relaxed">
                      {addr.addressDetail}, {addr.ward}, {addr.district}, {addr.province}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PERSONAL INFO */}
          {activeTab === 'info' && (
            <form onSubmit={handleUpdateProfile} className="max-w-lg space-y-4">
              <div>
                <label className="block text-xs font-bold text-charcoal-700 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-brand-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-brand-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal-700 mb-1">Email đăng nhập</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-brand-700"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg"
              >
                LƯU THAY ĐỔI
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Address Create Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-modal border border-surface-border">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="font-bold text-sm text-charcoal-900">Thêm Địa Chỉ Giao Hàng Mới</h3>
              <button onClick={() => setIsAddressModalOpen(false)}>
                <XCircle className="w-5 h-5 text-charcoal-400" />
              </button>
            </div>

            <form onSubmit={handleCreateAddress} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-charcoal-700 mb-1">Họ tên người nhận</label>
                <input
                  type="text"
                  required
                  value={newAddr.fullName}
                  onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-charcoal-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  required
                  value={newAddr.phone}
                  onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-charcoal-700 mb-1">Tỉnh / Thành phố</label>
                  <input
                    type="text"
                    required
                    value={newAddr.province}
                    onChange={(e) => setNewAddr({ ...newAddr, province: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-charcoal-700 mb-1">Quận / Huyện</label>
                  <input
                    type="text"
                    required
                    value={newAddr.district}
                    onChange={(e) => setNewAddr({ ...newAddr, district: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-charcoal-700 mb-1">Địa chỉ chi tiết (Số nhà, tên đường)</label>
                <input
                  type="text"
                  required
                  value={newAddr.addressDetail}
                  onChange={(e) => setNewAddr({ ...newAddr, addressDetail: e.target.value })}
                  placeholder="Ví dụ: Tầng 4, 18 Duy Tân..."
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="w-1/3 py-2 bg-stone-100 text-xs font-bold rounded-lg"
                >
                  HỦY
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-brand-700 text-white text-xs font-bold rounded-lg uppercase"
                >
                  LƯU ĐỊA CHỈ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {selectedOrderForReturn && (
        <ReturnModal
          order={selectedOrderForReturn}
          isOpen={!!selectedOrderForReturn}
          onClose={() => setSelectedOrderForReturn(null)}
        />
      )}

      {/* Cancel Order Modal */}
      {selectedOrderForCancel && (
        <CancelOrderModal
          order={selectedOrderForCancel}
          isOpen={!!selectedOrderForCancel}
          onClose={() => setSelectedOrderForCancel(null)}
        />
      )}
    </div>
  );
};
