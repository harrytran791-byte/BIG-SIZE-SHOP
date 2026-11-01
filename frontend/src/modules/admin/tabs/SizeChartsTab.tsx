import { ProductMeasurements } from '../components/ProductMeasurements';
import React, { useState } from 'react';
import { Ruler, Edit, X } from 'lucide-react';
import { useToast } from '@/shared/context/ToastContext';
import { ConfirmModal } from '@/shared/components/ConfirmModal';

export const BASE_SIZE_CHARTS_DATA = [
  {
    categoryKey: 'tops',
    title: "Bảng Đo Áo Thun / Polo & Sơ Mi Nam (Men's Tops & Shirts)",
    desc: 'Quy chuẩn số đo dành cho áo ngắn tay, dài tay và sơ mi nam phom Relaxed Fit Big Size.',
    rows: [
      { size: 'XL', height: '165 - 175 cm', weight: '75 - 84 kg', chest: '102 - 108 cm', waist: '90 - 96 cm', hips: '100 - 106 cm', shoulder: '47 - 49 cm', length: '73 cm' },
      { size: '2XL', height: '170 - 180 cm', weight: '85 - 94 kg', chest: '109 - 116 cm', waist: '97 - 104 cm', hips: '107 - 114 cm', shoulder: '50 - 52 cm', length: '75 cm' },
      { size: '3XL', height: '172 - 185 cm', weight: '95 - 106 kg', chest: '117 - 126 cm', waist: '105 - 114 cm', hips: '115 - 124 cm', shoulder: '53 - 55 cm', length: '77 cm' },
      { size: '4XL', height: '175 - 190 cm', weight: '107 - 120 kg', chest: '127 - 138 cm', waist: '115 - 126 cm', hips: '125 - 136 cm', shoulder: '56 - 58 cm', length: '79 cm' },
      { size: '5XL', height: '175 - 195 cm', weight: '121 - 138 kg', chest: '139 - 150 cm', waist: '127 - 138 cm', hips: '137 - 148 cm', shoulder: '59 - 61 cm', length: '81 cm' },
    ]
  },
  {
    categoryKey: 'pants',
    title: "Bảng Đo Quần Dài & Quần Jeans Big Size (Pants & Denim)",
    desc: 'Quy chuẩn số đo vòng bụng và vòng đùi công nghệ lưng chun ẩn Flex-Waist.',
    rows: [
      { size: 'XL', height: '165 - 175 cm', weight: '75 - 84 kg', chest: '-', waist: '90 - 96 cm', hips: '102 - 108 cm', shoulder: 'Đùi: 62 - 65 cm', length: '100 cm' },
      { size: '2XL', height: '170 - 180 cm', weight: '85 - 94 kg', chest: '-', waist: '97 - 104 cm', hips: '109 - 115 cm', shoulder: 'Đùi: 66 - 69 cm', length: '102 cm' },
      { size: '3XL', height: '172 - 185 cm', weight: '95 - 106 kg', chest: '-', waist: '105 - 114 cm', hips: '116 - 124 cm', shoulder: 'Đùi: 70 - 74 cm', length: '104 cm' },
      { size: '4XL', height: '175 - 190 cm', weight: '107 - 120 kg', chest: '-', waist: '115 - 126 cm', hips: '125 - 134 cm', shoulder: 'Đùi: 75 - 79 cm', length: '105 cm' },
      { size: '5XL', height: '175 - 195 cm', weight: '121 - 138 kg', chest: '-', waist: '127 - 138 cm', hips: '135 - 146 cm', shoulder: 'Đùi: 80 - 85 cm', length: '106 cm' },
    ]
  },
  {
    categoryKey: 'dresses',
    title: "Bảng Đo Đầm & Váy Nữ Ngoại Cỡ (Women's Dresses & Sets)",
    desc: 'Quy chuẩn số đo đầm xòe chữ A và set bộ nữ tôn dáng che bụng dưới.',
    rows: [
      { size: 'XL', height: '155 - 165 cm', weight: '68 - 77 kg', chest: '98 - 104 cm', waist: '82 - 88 cm', hips: '102 - 108 cm', shoulder: 'Vai: 40 - 42 cm', length: '105 cm' },
      { size: '2XL', height: '158 - 168 cm', weight: '78 - 87 kg', chest: '105 - 112 cm', waist: '89 - 96 cm', hips: '109 - 116 cm', shoulder: 'Vai: 43 - 45 cm', length: '107 cm' },
      { size: '3XL', height: '160 - 172 cm', weight: '88 - 98 kg', chest: '113 - 122 cm', waist: '97 - 106 cm', hips: '117 - 126 cm', shoulder: 'Vai: 46 - 48 cm', length: '109 cm' },
      { size: '4XL', height: '160 - 175 cm', weight: '99 - 112 kg', chest: '123 - 134 cm', waist: '107 - 118 cm', hips: '127 - 138 cm', shoulder: 'Vai: 49 - 51 cm', length: '111 cm' },
      { size: '5XL', height: '160 - 178 cm', weight: '113 - 130 kg', chest: '135 - 146 cm', waist: '119 - 130 cm', hips: '139 - 150 cm', shoulder: 'Vai: 52 - 54 cm', length: '112 cm' },
    ]
  }
];

export const SizeChartsTab: React.FC = () => {
  const { showToast } = useToast();

  const [sizeChartCategoryFilter, setSizeChartCategoryFilter] = useState<'all' | 'tops' | 'pants' | 'dresses'>('all');
  const [sizeChartsData, setSizeChartsData] = useState(() => {
    try {
      const saved = localStorage.getItem('curve_admin_size_charts');
      if (saved) return JSON.parse(saved);
    } catch { }
    return BASE_SIZE_CHARTS_DATA;
  });

  const [chartToReset, setChartToReset] = useState<any | null>(null);
  const [editingSizeRow, setEditingSizeRow] = useState<{
    categoryKey: string;
    row: {
      size: string;
      height: string;
      weight: string;
      chest: string;
      waist: string;
      hips: string;
      shoulder: string;
      length: string;
    };
  } | null>(null);

  return (
    <div className="space-y-6">
      <ProductMeasurements />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-charcoal-900 flex items-center gap-2">
              <Ruler className="w-6 h-6 text-[#5C1D24]" />
              Bảng Thông Số Kỹ Thuật Size Chart Big Size (XL – 5XL)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Bản nháp tham khảo trên trình duyệt
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Số đo tham khảo dưới đây chỉ lưu trên trình duyệt. Dùng mục số đo theo từng sản phẩm phía trên để cập nhật dữ liệu dùng chung.
          </p>
        </div>

        {/* Filter by category key */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'tops', label: 'Áo Nam' },
            { id: 'pants', label: 'Quần & Jeans' },
            { id: 'dresses', label: 'Đầm Nữ' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setSizeChartCategoryFilter(btn.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sizeChartCategoryFilter === btn.id
                  ? 'bg-white text-[#5C1D24] shadow-xs'
                  : 'text-stone-600 hover:text-charcoal-900'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advice Guidance Box */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Ruler className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-950">
              Nguyên Tắc Tư Vấn & Cấu Hình Dải Size Big Size Chuẩn
            </h4>
            <p className="text-xs text-amber-900/90 leading-relaxed">
              1. <strong>Ưu tiên số đo vòng lớn nhất:</strong> Nếu khách có số đo ngực 2XL nhưng bụng bia thuộc dải 3XL, luôn khuyên chọn 3XL để không kích nẹp bụng.
              <br />
              2. <strong>Tính chất vải:</strong> Dòng vải dệt kim thun giãn 4 chiều (Polo Dry-Tech, Thun) có thể chọn sát số đo. Dòng vải dệt thoi (Sơ mi Oxford, Denim) cộng thêm 2–4cm độ cử động.
            </p>
          </div>
        </div>
      </div>

      {/* Render Charts for Each Category */}
      {sizeChartsData
        .filter((sc: any) => sizeChartCategoryFilter === 'all' || sc.categoryKey === sizeChartCategoryFilter)
        .map((chart: any) => (
          <div
            key={chart.categoryKey}
            className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs"
          >
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-charcoal-900">{chart.title}</h3>
                <p className="text-xs text-stone-500 mt-0.5">{chart.desc}</p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartToReset(chart)}
                  className="px-2.5 py-1 text-[11px] font-bold text-stone-500 hover:text-[#5C1D24] hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
                  title="Khôi phục thông số kích thước mặc định ban đầu"
                >
                  Khôi phục chuẩn
                </button>
                <span className="px-2.5 py-1 bg-[#5C1D24]/10 text-[#5C1D24] rounded-lg text-xs font-bold font-mono">
                  Dải XL đến 5XL
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50/70 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Kích Cỡ</th>
                    <th className="p-3.5">Chiều Cao</th>
                    <th className="p-3.5">Cân Nặng Khuyến Nghị</th>
                    <th className="p-3.5">Vòng Ngực</th>
                    <th className="p-3.5">Vòng Eo / Bụng</th>
                    <th className="p-3.5">Vòng Mông</th>
                    <th className="p-3.5">Rộng Vai / Đùi</th>
                    <th className="p-3.5">Chiều Dài</th>
                    <th className="p-3.5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {chart.rows.map((row: any) => (
                    <tr key={row.size} className="hover:bg-stone-50/50">
                      <td className="p-3.5 font-bold font-mono text-[#5C1D24] text-sm">
                        <span className="px-2.5 py-1 rounded-md bg-stone-100 inline-block">
                          {row.size}
                        </span>
                      </td>
                      <td className="p-3.5 text-stone-700 font-medium">{row.height}</td>
                      <td className="p-3.5 font-bold text-emerald-800">{row.weight}</td>
                      <td className="p-3.5 text-stone-700 font-mono">{row.chest}</td>
                      <td className="p-3.5 text-stone-700 font-mono">{row.waist}</td>
                      <td className="p-3.5 text-stone-700 font-mono">{row.hips}</td>
                      <td className="p-3.5 text-stone-700 font-mono">{row.shoulder}</td>
                      <td className="p-3.5 font-bold text-charcoal-900">{row.length}</td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setEditingSizeRow({ categoryKey: chart.categoryKey, row: { ...row } })}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-[#5C1D24] text-stone-700 hover:text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                          title="Chỉnh sửa thông số size này"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {/* MODAL: CHỈNH SỬA THÔNG SỐ SIZE CHART */}
      {editingSizeRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-md animate-fadeIn"
          onClick={() => setEditingSizeRow(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 my-auto animate-scaleIn text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#5C1D24] text-white flex items-center justify-center font-bold text-sm">
                  {editingSizeRow.row.size}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-charcoal-900">
                    Chỉnh Sửa Thông Số Kỹ Thuật Size {editingSizeRow.row.size}
                  </h3>
                  <p className="text-[11px] text-stone-500">Cập nhật dải đo nhân trắc học cho danh mục này</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSizeRow(null)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                // Kiểm tra logic dải đo: min <= max (chống đảo ngược dải đo như 175 - 165 cm)
                const row = editingSizeRow.row;
                const checks = [
                  { val: row.height, label: 'Chiều cao' },
                  { val: row.weight, label: 'Cân nặng khuyến nghị' },
                  { val: row.chest, label: 'Vòng ngực' },
                  { val: row.waist, label: 'Vòng eo / bụng' },
                  { val: row.hips, label: 'Vòng mông' },
                ];

                for (const item of checks) {
                  if (item.val) {
                    const match = item.val.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
                    if (match) {
                      const min = parseFloat(match[1]);
                      const max = parseFloat(match[2]);
                      if (min > max) {
                        showToast(
                          'Thông số không hợp lệ',
                          `Mục "${item.label}" có giá trị tối thiểu (${min}) lớn hơn tối đa (${max}). Vui lòng nhập đúng thứ tự dải đo!`,
                          'error'
                        );
                        return;
                      }
                    }
                  }
                }

                const updated = sizeChartsData.map((chart: any) => {
                  if (chart.categoryKey === editingSizeRow.categoryKey) {
                    return {
                      ...chart,
                      rows: chart.rows.map((r: any) =>
                        r.size === editingSizeRow.row.size ? editingSizeRow.row : r
                      ),
                    };
                  }
                  return chart;
                });
                setSizeChartsData(updated);
                localStorage.setItem('curve_admin_size_charts', JSON.stringify(updated));
                setEditingSizeRow(null);
                showToast(
                  'Lưu bản nháp cục bộ',
                  `Đã lưu bảng thông số size ${editingSizeRow.row.size} vào bản nháp trên trình duyệt. Số đo sản phẩm dùng chung chưa thay đổi.`,
                  'info'
                );
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Chiều cao</label>
                  <input
                    type="text"
                    required
                    value={editingSizeRow.row.height}
                    onChange={(e) =>
                      setEditingSizeRow({
                        ...editingSizeRow,
                        row: { ...editingSizeRow.row, height: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cân nặng khuyến nghị</label>
                  <input
                    type="text"
                    required
                    value={editingSizeRow.row.weight}
                    onChange={(e) =>
                      setEditingSizeRow({
                        ...editingSizeRow,
                        row: { ...editingSizeRow.row, weight: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Vòng ngực</label>
                  <input
                    type="text"
                    value={editingSizeRow.row.chest}
                    onChange={(e) =>
                      setEditingSizeRow({
                        ...editingSizeRow,
                        row: { ...editingSizeRow.row, chest: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Vòng eo / bụng</label>
                  <input
                    type="text"
                    required
                    value={editingSizeRow.row.waist}
                    onChange={(e) =>
                      setEditingSizeRow({
                        ...editingSizeRow,
                        row: { ...editingSizeRow.row, waist: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Vòng mông</label>
                  <input
                    type="text"
                    required
                    value={editingSizeRow.row.hips}
                    onChange={(e) =>
                      setEditingSizeRow({
                        ...editingSizeRow,
                        row: { ...editingSizeRow.row, hips: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Rộng vai / đùi</label>
                  <input
                    type="text"
                    value={editingSizeRow.row.shoulder}
                    onChange={(e) =>
                      setEditingSizeRow({
                        ...editingSizeRow,
                        row: { ...editingSizeRow.row, shoulder: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">Chiều dài áo / quần / váy</label>
                  <input
                    type="text"
                    required
                    value={editingSizeRow.row.length}
                    onChange={(e) =>
                      setEditingSizeRow({
                        ...editingSizeRow,
                        row: { ...editingSizeRow.row, length: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingSizeRow(null)}
                  className="w-1/3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl cursor-pointer"
                >
                  HỦY
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#5C1D24] hover:bg-[#4A121D] text-white font-bold rounded-xl cursor-pointer"
                >
                  LƯU THAY ĐỔI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Reset Size Chart Modal */}
      <ConfirmModal
        isOpen={chartToReset !== null}
        title="Khôi phục thông số size chuẩn?"
        description={`Bạn có chắc chắn muốn đặt lại các thông số kích thước của bảng "${chartToReset?.title}" về chuẩn ban đầu?`}
        confirmText="Khôi phục chuẩn"
        cancelText="Giữ thông số hiện tại"
        variant="warning"
        onConfirm={() => {
          if (!chartToReset) return;
          const defaultData = BASE_SIZE_CHARTS_DATA.find((x) => x.categoryKey === chartToReset.categoryKey);
          if (defaultData) {
            const updated = sizeChartsData.map((c: any) =>
              c.categoryKey === chartToReset.categoryKey ? defaultData : c
            );
            setSizeChartsData(updated);
            localStorage.setItem('curve_admin_size_charts', JSON.stringify(updated));
            showToast('Khôi phục thành công', `Đã khôi phục thông số mặc định cho ${chartToReset.title}`, 'info');
          }
          setChartToReset(null);
        }}
        onCancel={() => setChartToReset(null)}
      />
    </div>
  );
};
