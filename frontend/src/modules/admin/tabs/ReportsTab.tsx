import { csvCell } from '@/shared/utils/adminExport';
import React, { useState, useMemo } from 'react';
import {
  Download,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  RotateCcw,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { Order, StockItem, Product, ReturnRequest } from '@/shared/types';
import { parseVnDate, isInReportPeriod, vietnamDateKey } from '@/shared/utils/reportUtils';
import { useToast } from '@/shared/context/ToastContext';

interface ReportsTabProps {
  orders: Order[];
  inventory: StockItem[];
  products: Product[];
  returnRequests: ReturnRequest[];
  onNavigateToInventory: (subTab?: 'alerts', scope?: 'out_of_stock' | 'threshold' | 'under10') => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  orders,
  inventory,
  products,
  returnRequests,
  onNavigateToInventory,
}) => {
  const { showToast } = useToast();

  const [reportTimeFilter, setReportTimeFilter] = useState<'today' | '7_days' | '30_days' | 'quarter' | 'year' | 'all'>('30_days');
  const [topProductsTimeRange, setTopProductsTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Filter orders by report time filter
  const filteredReportOrders = useMemo(() => {
    return orders.filter(o => isInReportPeriod(o.createdAtTimestamp || o.createdAt, reportTimeFilter));
  }, [orders, reportTimeFilter]);

  const reportOrders = filteredReportOrders;
  const deliveredReportOrders = reportOrders.filter((o) => o.status === 'delivered' && (o as any).paymentStatus !== 'refunded');
  const reportRevenue = deliveredReportOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const reportOrdersCount = reportOrders.length;
  const reportAov = deliveredReportOrders.length > 0 ? Math.round(reportRevenue / deliveredReportOrders.length) : 0;
  const reportDeliveredCount = deliveredReportOrders.length;
  const reportDeliveryRate = reportOrdersCount > 0 ? Math.round((reportDeliveredCount / reportOrdersCount) * 100) : 0;

  // Matching returns for the period
  const reportMatchingReturns = useMemo(() => {
    if (!returnRequests || returnRequests.length === 0) return [];
    if (reportTimeFilter === 'all') return returnRequests;
    const now = new Date().getTime();
    const orderIdsInPeriod = new Set(reportOrders.map((o) => o.id.trim().toUpperCase()));
    const orderNumbersInPeriod = new Set(reportOrders.map((o) => o.id.replace(/[^0-9]/g, '')));

    return returnRequests.filter((r) => {
      const cleanR = (r.orderId || '').trim().toUpperCase();
      const cleanRNum = cleanR.replace(/[^0-9]/g, '');
      if (orderIdsInPeriod.has(cleanR) || (cleanRNum && orderNumbersInPeriod.has(cleanRNum))) {
        return true;
      }
      const returnTime = parseVnDate(r.createdAt);
      const diffDays = (now - returnTime) / (1000 * 3600 * 24);
      if (reportTimeFilter === 'today') return diffDays <= 1;
      if (reportTimeFilter === '7_days') return diffDays <= 7;
      if (reportTimeFilter === '30_days') return diffDays <= 30;
      if (reportTimeFilter === 'quarter') return diffDays <= 90;
      if (reportTimeFilter === 'year') return diffDays <= 365;
      return false;
    });
  }, [returnRequests, reportOrders, reportTimeFilter]);

  const reportMatchingReturnsCount = reportMatchingReturns.length;
  const reportReturnRate = reportOrdersCount > 0
    ? Math.min(100, (reportMatchingReturnsCount / reportOrdersCount) * 100).toFixed(1)
    : '0.0';

  const reportTotalItems = reportOrders.reduce(
    (sum, o) => sum + (o.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 0),
    0
  );
  const reportAvgItemsPerOrder = reportOrdersCount > 0 ? (reportTotalItems / reportOrdersCount).toFixed(1) : '0';

  const reportTotalStock = inventory.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const reportTotalStockValue = inventory.reduce((sum, i) => sum + (i.quantity || 0) * (i.sellingPrice || 0), 0);
  const lowStockItems = inventory.filter((item) => item.quantity <= item.lowStockThreshold);

  // Size breakdown: XL - 5XL
  const reportSizeBreakdown = useMemo(() => {
    const counts: Record<string, number> = { XL: 0, '2XL': 0, '3XL': 0, '4XL': 0, '5XL': 0 };
    deliveredReportOrders.forEach((o) => {
      o.items?.forEach((item) => {
        const s = (item.size || '2XL').toUpperCase();
        if (counts[s] !== undefined) counts[s] += item.quantity || 1;
        else counts['2XL'] += item.quantity || 1;
      });
    });
    const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);
    const ranges: Record<string, string> = {
      XL: '70–80kg',
      '2XL': '80–90kg',
      '3XL': '90–105kg',
      '4XL': '105–120kg',
      '5XL': '120–135kg',
    };
    if (totalItems === 0) {
      return ['XL', '2XL', '3XL', '4XL', '5XL'].map((s) => ({
        size: s,
        count: 0,
        percent: 0,
        range: ranges[s] || '',
      }));
    }
    return ['XL', '2XL', '3XL', '4XL', '5XL'].map((s) => ({
      size: s,
      count: counts[s] || 0,
      percent: Math.round(((counts[s] || 0) / (totalItems || 1)) * 100),
      range: ranges[s] || '',
    }));
  }, [reportOrders]);

  // Top Best-Sellers (Top 5)
  const reportBestSellers = useMemo(() => {
    const map = new Map<string, { product: any; unitsSold: number; revenue: number; stock: number }>();

    products.forEach((p) => {
      const stock = p.variants?.reduce((s, v) => s + (v.stock || 0), 0) || 0;
      map.set(p.id, { product: p, unitsSold: 0, revenue: 0, stock });
    });
    const now = Date.now();
    const daysLimit = topProductsTimeRange === '7d' ? 7 : topProductsTimeRange === '90d' ? 90 : 30;
    const cutoffMs = now - daysLimit * 24 * 60 * 60 * 1000;

    const filteredOrders = reportOrders.filter((o) => {
      // Chỉ tính vào Top bán chạy khi đơn hàng đã giao thành công và không bị hoàn tiền
      if (o.status !== 'delivered' || (o as any).paymentStatus === 'refunded') return false;
      const t = parseVnDate(o.createdAtTimestamp || o.createdAt);
      if (!t) return false;
      return t >= cutoffMs && t <= now;
    });

    filteredOrders.forEach((o) => {
      o.items?.forEach((item) => {
        const pId = item.productId || item.product?.id;
        const entry = (pId ? map.get(pId) : undefined);
        const qty = item.quantity || 1;
        const rev = (item.price || item.product?.price || 0) * qty;
        if (entry) {
          entry.unitsSold += qty;
          entry.revenue += rev;
        } else if (item.product) {
          map.set(item.product.id, {
            product: item.product,
            unitsSold: qty,
            revenue: rev,
            stock: 0,
          });
        }
      });
    });

    return Array.from(map.values())
      .filter((item) => item.unitsSold > 0)
      .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
      .slice(0, 5);
  }, [products, reportOrders, topProductsTimeRange]);

  // Revenue chart trend points
  const revenueTrendPoints = useMemo(() => {
    const days: { key: string; label: string; total: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const fullDateStr = vietnamDateKey(d.getTime());
      const dayStr = fullDateStr.slice(5).split('-').reverse().join('/');
      days.push({
        key: fullDateStr,
        label: i === 0 ? 'Hôm nay' : dayStr,
        total: 0,
      });
    }

    deliveredReportOrders.forEach((o) => {
      const stamp = parseVnDate(o.createdAtTimestamp || o.createdAt);
      if (!stamp) return;
      const matched = days.find(d => d.key === vietnamDateKey(stamp));
      if (matched) matched.total += o.total || 0;
    });

    const maxVal = Math.max(...days.map((d) => d.total), 500000);
    const startX = 90;
    const endX = 550;
    const stepX = (endX - startX) / (days.length - 1);

    return days.map((d, idx) => {
      const cx = Math.round(startX + idx * stepX);
      const cy = Math.round(190 - (d.total / maxVal) * 140);
      const val = `${d.total.toLocaleString('vi-VN')}₫`;
      return { cx, cy, label: d.label, val, total: d.total };
    });
  }, [reportOrders]);

  const revenueAreaPath = revenueTrendPoints.length > 0
    ? `M ${revenueTrendPoints[0].cx} ${revenueTrendPoints[0].cy} ` +
      revenueTrendPoints.slice(1).map((p) => `L ${p.cx} ${p.cy}`).join(' ') +
      ` L ${revenueTrendPoints[revenueTrendPoints.length - 1].cx} 190 L ${revenueTrendPoints[0].cx} 190 Z`
    : '';

  const revenueLinePath = revenueTrendPoints.length > 0
    ? `M ${revenueTrendPoints[0].cx} ${revenueTrendPoints[0].cy} ` +
      revenueTrendPoints.slice(1).map((p) => `L ${p.cx} ${p.cy}`).join(' ')
    : '';

  const sanitizeCsvCell = csvCell;

  const mapOrderStatusToVn = (status: string): string => {
    switch (status) {
      case 'delivered': return 'Giao thành công';
      case 'shipping': return 'Đang giao hàng';
      case 'confirmed':
      case 'preparing': return 'Đã xác nhận';
      case 'cancelled': return 'Đã hủy';
      case 'placed': return 'Chờ duyệt';
      default: return status;
    }
  };

  const handleExportReportCSV = () => {
    const headers = ['Mã Đơn Hàng', 'Khách Hàng', 'Số Điện Thoại', 'Tổng Tiền (VNĐ)', 'Trạng Thái Đơn', 'Mã Vận Đơn 3PL'];
    const rows = reportOrders.map((o) => [
      sanitizeCsvCell(o.id),
      sanitizeCsvCell(o.shippingAddress?.fullName || 'Khách Hàng'),
      sanitizeCsvCell(o.shippingAddress?.phone || '—'),
      o.total,
      sanitizeCsvCell(mapOrderStatusToVn(o.status)),
      sanitizeCsvCell(o.trackingCode || '—'),
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_Cao_Doanh_Thu_BigSize_${reportTimeFilter}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Xuất báo cáo thành công', `Đã xuất ${reportOrders.length} đơn hàng trong kỳ báo cáo về máy.`, 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Title and Time Filter / Export */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#5C1D24]" />
            <span>Báo Cáo Doanh Thu & KPI Kinh Doanh</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Time Range Selector */}
          <select
            value={reportTimeFilter}
            onChange={(e) => setReportTimeFilter(e.target.value as any)}
            aria-label="Khoảng thời gian xem báo cáo"
            className="px-3 py-2 text-xs font-bold rounded-xl border border-stone-200 bg-white text-charcoal-800 shadow-2xs hover:border-stone-300 focus:outline-hidden cursor-pointer"
          >
            <option value="today">Hôm nay (24h qua)</option>
            <option value="7_days">7 ngày gần nhất</option>
            <option value="30_days">30 ngày qua (Tháng này)</option>
            <option value="quarter">Quý 4 / 2026</option>
            <option value="year">Năm 2026</option>
            <option value="all">Toàn bộ thời gian</option>
          </select>

          {/* CSV Export Button */}
          <button
            type="button"
            onClick={handleExportReportCSV}
            className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Tổng Doanh Thu */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium text-stone-600">Doanh số đơn hàng</span>
            <DollarSign className="w-5 h-5 text-brand-700" />
          </div>
          <p className="text-2xl lg:text-3xl font-black text-brand-700 tracking-tight">
            {reportRevenue.toLocaleString('vi-VN')}₫
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[11px]">
            <span className="text-stone-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {reportDeliveredCount} đơn hoàn tất
            </span>
          </div>
        </div>

        {/* 2. Tổng Đơn Hàng */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium text-stone-600">Tổng đơn hàng</span>
            <ShoppingBag className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl lg:text-3xl font-black text-charcoal-900 tracking-tight">
            {reportOrdersCount} đơn
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[11px]">
            <span className="text-emerald-700 font-semibold">
              Giao đạt {reportDeliveryRate}%
            </span>
            <span className="text-stone-400">{reportDeliveredCount} thành công</span>
          </div>
        </div>

        {/* 3. Giá Trị Đơn Trung Bình (AOV) */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium text-stone-600">Giá trị đơn TB (AOV)</span>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl lg:text-3xl font-black text-purple-700 tracking-tight">
            {reportAov.toLocaleString('vi-VN')}₫
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[11px]">
            <span className="text-stone-500 font-medium">Big Size Fashion</span>
            <span className="text-stone-400 font-mono">~{reportAvgItemsPerOrder} món/đơn</span>
          </div>
        </div>

        {/* 4. Tỷ Lệ Đổi Size 7 Ngày */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium text-stone-600">Tỷ lệ đổi size 7 ngày</span>
            <RotateCcw className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl lg:text-3xl font-black text-emerald-600 tracking-tight">
            {reportReturnRate}%
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[11px]">
            <span className="text-emerald-700 font-bold">Chuẩn form ngoại cỡ</span>
            <span className="text-stone-400">{reportMatchingReturnsCount} yêu cầu</span>
          </div>
        </div>
      </div>

      {/* Row 2: Biểu đồ doanh thu SVG + Phân bổ theo Size XL-5XL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ doanh thu */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-bold text-base text-charcoal-900">
                Doanh số đơn hàng trong 7 ngày gần nhất
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Giá trị đơn chưa hủy, phân bổ theo ngày đặt hàng
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
              <span className="w-2 h-2 rounded-full bg-brand-700" />
              Doanh số đơn hàng (VNĐ)
            </span>
          </div>

          {/* SVG Area Chart */}
          <div className="h-60 w-full pt-2">
            <svg viewBox="0 0 600 220" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#70222B" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#70222B" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {[0, 1, 2, 3, 4].map(tick => {
                const y = 190 - tick * 35;
                const value = Math.round(Math.max(...revenueTrendPoints.map(p => p.total), 500000) * tick / 4);
                return <g key={tick}>
                  <line x1="80" y1={y} x2="570" y2={y} stroke="#E5E7EB" strokeDasharray="3 3" />
                  <text x="74" y={y + 3} fontSize="8" fill="#9CA3AF" textAnchor="end">{value.toLocaleString('vi-VN')}₫</text>
                </g>;
              })}

              {/* Area Fill */}
              <path d={revenueAreaPath} fill="url(#revenueGrad)" />

              {/* Line Stroke */}
              <path
                d={revenueLinePath}
                fill="none"
                stroke="#70222B"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Dots & Value Labels */}
              {revenueTrendPoints.map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.cx} cy={pt.cy} r="5" fill="#70222B" stroke="#FFFFFF" strokeWidth="2.5" />
                  <text x={pt.cx} y={pt.cy - 10} fontSize="10" fontWeight="bold" fill="#70222B" textAnchor="middle">
                    {pt.val}
                  </text>
                  <text x={pt.cx} y={205} fontSize="10" fill="#6B7280" textAnchor="middle">
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <p className="text-[11px] text-stone-500 pt-3 border-t border-stone-100 flex items-center justify-between">
            <span>Đơn vị: Việt Nam Đồng (VNĐ)</span>
            <span className="font-semibold text-emerald-700">Không bao gồm đơn đã hủy</span>
          </p>
        </div>

        {/* Phân bổ theo dải size XL-5XL */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-charcoal-900">
              Phân bổ dải size ngoại cỡ
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Tỷ trọng số lượng đơn theo các size XL đến 5XL
            </p>
          </div>

          <div className="space-y-3.5 my-4">
            {reportSizeBreakdown.map((item) => (
              <div key={item.size} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-charcoal-900 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 text-[10px]">
                      {item.size}
                    </span>
                    <span className="text-[11px] text-stone-400 font-normal">({item.range})</span>
                  </span>
                  <span className="font-bold text-charcoal-800">
                    {item.percent}% <span className="text-stone-400 text-[11px] font-normal">({item.count} món)</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor:
                        item.size === '2XL'
                          ? '#70222B'
                          : item.size === '3XL'
                            ? '#9E2A2B'
                            : item.size === 'XL'
                              ? '#C25953'
                              : item.size === '4XL'
                                ? '#D97706'
                                : '#6B7280',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-[11px] text-stone-600">
            <strong className="text-charcoal-900 block font-semibold mb-0.5">Insight Nghiệp Vụ:</strong>
            {(() => {
              const sorted = [...reportSizeBreakdown].filter(s => s.count > 0).sort((a, b) => b.count - a.count);
              if (sorted.length === 0) {
                return 'Chưa có dữ liệu kích cỡ phát sinh đơn hàng trong kỳ chọn.';
              }
              const top1 = sorted[0];
              const top2 = sorted[1];
              if (top2) {
                return (
                  <>
                    Size <strong>{top1.size} & {top2.size}</strong> chiếm <strong>{top1.percent + top2.percent}%</strong> sản lượng tiêu thụ. Khuyến nghị Manager chủ động duy trì tồn kho cho 2 dải size này.
                  </>
                );
              }
              return (
                <>
                  Size <strong>{top1.size}</strong> chiếm <strong>{top1.percent}%</strong> sản lượng tiêu thụ trong kỳ.
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Row 3: Top Sản Phẩm Bán Chạy & Tồn Kho Tổng Quan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Bảng Top 5 Sản Phẩm Bán Chạy Nhất */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs">
          <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-charcoal-900">
                Top 5 Sản Phẩm Bán Chạy Nhất
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Đơn giao thành công trong kỳ báo cáo; giới hạn thêm theo số ngày đã chọn
              </p>
            </div>

            {/* Bộ lọc khoảng thời gian: 7 ngày, 30 ngày, 90 ngày */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl self-start sm:self-auto">
              {[
                { id: '7d', label: '7 ngày' },
                { id: '30d', label: '30 ngày' },
                { id: '90d', label: '90 ngày' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTopProductsTimeRange(t.id as any)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    topProductsTimeRange === t.id
                      ? 'bg-white text-charcoal-900 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="p-4 pl-6">Sản Phẩm</th>
                  <th className="p-4">Số Lượng Đã Bán</th>
                  <th className="p-4 pr-6 text-right">Doanh Thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {reportBestSellers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-stone-400 italic">
                      Chưa phát sinh dữ liệu bán hàng trong kỳ báo cáo đã chọn
                    </td>
                  </tr>
                ) : (
                  reportBestSellers.slice(0, 5).map((item, idx) => {
                    const maxUnitsInBatch = Math.max(
                      ...reportBestSellers.map((x) => x.unitsSold),
                      1
                    );
                    const percent = Math.min(100, Math.round((item.unitsSold / maxUnitsInBatch) * 100));

                    return (
                      <tr key={item.product.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                idx === 0
                                  ? 'bg-amber-400 text-amber-950 shadow-xs'
                                  : idx === 1
                                    ? 'bg-stone-200 text-stone-800'
                                    : idx === 2
                                      ? 'bg-amber-700 text-white'
                                      : 'bg-stone-100 text-stone-500'
                              }`}
                            >
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                            </span>
                            {item.product.images?.[0] ? (
                              <img
                                src={item.product.images[0]}
                                alt={item.product.name}
                                className="w-12 h-12 object-cover rounded-xl border border-stone-200 shrink-0 shadow-2xs"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl border border-dashed border-stone-300 bg-stone-100 flex items-center justify-center text-stone-400 shrink-0 text-xs font-bold">
                                SP
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-charcoal-900 block truncate text-xs sm:text-sm">
                                {item.product.name || 'Sản phẩm chưa định danh'}
                              </span>
                              <span className="text-stone-400 text-[11px] block mt-0.5">
                                {item.product.id?.startsWith('unresolved-') ? 'Chưa xác định sản phẩm trong danh mục' : item.product.categoryName || 'Sản phẩm trong danh mục'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 min-w-[140px]">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-charcoal-900">
                                {item.unitsSold} cái
                              </span>
                              <span className="text-[10px] text-stone-400 font-semibold">
                                {percent}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-stone-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-brand-700 transition-all duration-300"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="p-4 pr-6 text-right">
                          <span className="font-black text-brand-700 text-sm block">
                            {item.revenue.toLocaleString('vi-VN')}₫
                          </span>
                          <span className="text-[10px] text-stone-400 block mt-0.5">
                            Đơn giá: {item.product.price?.toLocaleString('vi-VN')}₫
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (1 col): Thống Kê Tồn Kho Tổng Quan */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-base text-charcoal-900">
                Tồn Kho Tổng Quan
              </h3>
              <Warehouse className="w-5 h-5 text-stone-400" />
            </div>
            <p className="text-xs text-stone-500">
              Giá trị tài sản hàng hóa và cân đối dải size trong kho
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1">
              <span className="text-[11px] text-stone-500 font-medium">Tổng giá trị tồn kho</span>
              <p className="text-xl lg:text-2xl font-black text-brand-800">
                {reportTotalStockValue.toLocaleString('vi-VN')}₫
              </p>
              <span className="text-[10px] text-stone-400 block font-mono">Tính theo giá bán niêm yết</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <span className="text-[11px] text-stone-500 block">Tổng lượng tồn</span>
                <strong className="text-base text-charcoal-900 font-black">{reportTotalStock}</strong>
                <span className="text-[10px] text-stone-400 block">sản phẩm</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <span className="text-[11px] text-stone-500 block">Tổng số SKU</span>
                <strong className="text-base text-charcoal-900 font-black">{inventory.length}</strong>
                <span className="text-[10px] text-stone-400 block">phân loại</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-stone-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  SKU tồn an toàn:
                </span>
                <strong className="text-emerald-700">{inventory.length - lowStockItems.length} SKU</strong>
              </div>

              {/* Sản phẩm sắp hết hàng (< 10 cái) */}
              <div className="flex items-center justify-between">
                <span className="text-amber-800 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Sản phẩm sắp hết hàng (&lt; 10 cái):
                </span>
                <strong className="text-amber-700 font-bold">
                  {inventory.filter((i) => i.quantity > 0 && i.quantity <= 10).length} SKU
                </strong>
              </div>

              {/* Sản phẩm hết hàng (0 cái) */}
              <div className="flex items-center justify-between">
                <span className="text-rose-700 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Sản phẩm hết hàng (0 cái):
                </span>
                <div className="flex items-center gap-2">
                  <strong className="text-rose-700 font-bold">
                    {inventory.filter((i) => i.quantity <= 0).length} SKU
                  </strong>
                  <button
                    type="button"
                    onClick={() => onNavigateToInventory('alerts', 'out_of_stock')}
                    className="px-2 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer shadow-2xs"
                    title="Chuyển ngay tới danh mục cần nhập hàng khẩn cấp"
                  >
                    Nhập hàng ngay
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToInventory()}
            className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-charcoal-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Warehouse className="w-4 h-4 text-stone-600" />
            <span>Xem Chi Tiết Tồn Kho & Kiểm Kê</span>
          </button>
        </div>
      </div>

      {/* Sub-footer */}
      <div className="flex items-center justify-between pt-6 text-[11px] text-stone-400 border-t border-stone-200">
        <span>Curve & Confidence • Phân hệ Báo cáo & Thống kê KPI</span>
        <span className="text-emerald-700 font-medium">Dữ liệu tính toán trực tiếp theo thời gian thực</span>
      </div>
    </div>
  );
};
