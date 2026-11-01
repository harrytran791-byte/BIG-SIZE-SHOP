export interface MeasurementGuideItem {
  id: string;
  name: string;
  instruction: string;
  tips: string;
  iconName: string;
}

export const measurementGuideSteps: MeasurementGuideItem[] = [
  {
    id: 'chest',
    name: '1. Vòng Ngực (Chest / Bust)',
    instruction: 'Dùng thước dây quấn quanh điểm nhô cao nhất của ngực. Giữ thước nằm ngang song song với mặt sàn, không siết quá chặt.',
    tips: 'Nên thở đều tự nhiên, thả lỏng vai khi đo. Thước dây có thể trượt 1 ngón tay bên trong là độ căng chuẩn nhất.',
    iconName: 'User'
  },
  {
    id: 'waist',
    name: '2. Vòng Eo (Waist)',
    instruction: 'Đo quanh phần hẹp nhất của thắt lưng (thường nằm trên rốn khoảng 2-3cm). Với người có bụng dưới to, hãy đo thêm vòng bụng ngang rốn.',
    tips: 'Không hóp bụng khi đo. Nếu chọn quần cạp cao, hãy đo đúng vị trí cạp bạn thường mặc.',
    iconName: 'Maximize2'
  },
  {
    id: 'hips',
    name: '3. Vòng Mông (Hips)',
    instruction: 'Khép 2 chân đứng thẳng, đo quanh điểm nở nang nhất của mông.',
    tips: 'Đảm bảo thước dây vòng đều từ trước ra sau, không bị lệch xéo.',
    iconName: 'Activity'
  },
  {
    id: 'shoulder',
    name: '4. Chiều Rộng Vai (Shoulder)',
    instruction: 'Đo từ đỉnh mút xương vai bên trái sang đỉnh mút xương vai bên phải qua phần gáy cổ.',
    tips: 'Nên nhờ người thân đo giúp để có thông số chính xác nhất khi đứng thẳng tự nhiên.',
    iconName: 'Maximize'
  }
];

export const sizeStandardsOverview = [
  {
    size: 'XL',
    weight: '75 - 84 kg',
    height: '165 - 175 cm',
    chest: '102 - 108 cm',
    waist: '90 - 96 cm',
    hips: '100 - 106 cm',
    description: 'Phù hợp người có thể trạng đẫy đà, bắt đầu chuyển từ size chuẩn sang form lớn.'
  },
  {
    size: '2XL',
    weight: '85 - 94 kg',
    height: '170 - 180 cm',
    chest: '109 - 116 cm',
    waist: '97 - 104 cm',
    hips: '107 - 114 cm',
    description: 'Form phổ biến nhất cho người có bụng bia nhẹ hoặc khung xương to.'
  },
  {
    size: '3XL',
    weight: '95 - 106 kg',
    height: '172 - 185 cm',
    chest: '117 - 126 cm',
    waist: '105 - 114 cm',
    hips: '115 - 124 cm',
    description: 'Thiết kế nới rộng vùng nách và bắp tay, thoải mái cử động không bó ép.'
  },
  {
    size: '4XL',
    weight: '107 - 120 kg',
    height: '175 - 190 cm',
    chest: '127 - 138 cm',
    waist: '115 - 126 cm',
    hips: '125 - 136 cm',
    description: 'Dành riêng cho thể trạng đô con, vòng bụng và ngực lớn.'
  },
  {
    size: '5XL',
    weight: '121 - 138+ kg',
    height: '175 - 195 cm',
    chest: '139 - 150 cm',
    waist: '127 - 138 cm',
    hips: '137 - 148 cm',
    description: 'Cỡ đại được tính toán tỉ lệ công thái học đặc biệt, không bao giờ bị cụt ngắn lưng.'
  }
];
