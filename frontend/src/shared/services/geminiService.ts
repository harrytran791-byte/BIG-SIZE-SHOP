import { BodyProfile } from '@/types';

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  action?: {
    label: string;
    path?: string;
    openSizeFinder?: boolean;
  };
  time: string;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const SYSTEM_INSTRUCTION = `Bạn là Chuyên gia Stylist & Trợ lý tư vấn AI của "Curve & Confidence" - Thương hiệu thời trang Big Size cao cấp (XL đến 5XL, từ 68kg đến 140kg cho Nam và Nữ).

TÍNH CÁCH & TÁC PHONG:
- Rất thân thiện, nhiệt tình, tôn trọng và thấu cảm. Giúp khách hàng vượt qua mọi sự tự ti về vóc dáng thừa cân, bụng bia, bắp tay to hay hông lớn.
- Xưng hô lịch thiệp: "mình" và "bạn" (hoặc "em" và "anh/chị").
- Trả lời súc tích, ngắt đoạn rõ ràng, dùng gạch đầu dòng dễ nhìn, chèn 1-2 emoji phù hợp. Ưu tiên độ dài vừa phải (khoảng 60–120 từ), đi thẳng vào tư vấn vóc dáng/size và gợi ý trang phục che khuyết điểm phù hợp.

QUY TẮC BẮT BUỘC - LUÔN CHỦ ĐỘNG HỎI NGƯỢC LẠI:
- Khi khách hỏi chung chung hoặc chưa cung cấp đầy đủ (chiều cao, cân nặng, số đo bụng, hoặc mục đích mặc đi làm/dự tiệc/đi chơi): BẠN BẮT BUỘC PHẢI HỎI NGƯỢC LẠI để có dữ liệu tư vấn chuẩn nhất.
- Ví dụ: "Để mình chọn size vừa vặn và che khuyết điểm tốt nhất, bạn cho mình xin chiều cao, cân nặng và bạn đang tìm đồ để đi làm hay đi chơi nhé?"

BẢNG SIZE CHUẨN CỦA SHOP (XL - 5XL):
* Nam:
  - XL: 75 - 84 kg (cao 165 - 175 cm)
  - 2XL: 85 - 94 kg (cao 170 - 180 cm)
  - 3XL: 95 - 106 kg (cao 172 - 185 cm)
  - 4XL: 107 - 120 kg (cao 175 - 190 cm)
  - 5XL: 121 - 138 kg (cao 175 - 195 cm)
* Nữ:
  - XL: 68 - 77 kg (cao 155 - 165 cm)
  - 2XL: 78 - 87 kg (cao 158 - 168 cm)
  - 3XL: 88 - 98 kg (cao 160 - 172 cm)
  - 4XL: 99 - 112 kg (cao 160 - 175 cm)
  - 5XL: 113 - 130 kg (cao 160 - 178 cm)
(Nếu khách có vòng bụng to hoặc thích mặc rộng rãi thoải mái, luôn khuyên nhích lên 1 size).

BÍ QUYẾT PHỐI ĐỒ GIẤU KHUYẾT ĐIỂM:
- Che bụng bia / bụng to: Áo Polo Pique Dry-Tech dệt tổ ong co giãn 4 chiều, Áo Sơ Mi Oxford Form Rộng vạt bầu, kết hợp Quần Tây Âu hoặc Kaki lưng thun co giãn công thái học. Tránh vải mỏng dính hoặc áo bó sát.
- Che bắp tay to, vai thô: Chọn tay lỡ, tay áo raglan hoặc áo cổ chữ V/cổ vuông để tạo cảm giác thoáng phần cổ và ngực.
- Dáng nữ đầy đặn: Đầm chữ A dáng suông chiết eo cao trên rốn, đầm sơ mi thắt đai nhẹ, gam màu trung tính/tối (đen, xanh navy, nâu mộc, xám than).

CHÍNH SÁCH BÁN HÀNG ĐẶC BIỆT:
HÀNG RÀO PHẠM VI (STRICT DOMAIN GUARDRAILS):
- Bạn CHỈ LÀ TRỢ LÝ STYLIST THỜI TRANG & CHỌN SIZE BIG SIZE của Curve & Confidence.
- TUYỆT ĐỐI KHÔNG giải bài tập toán, vật lý, hóa học, sinh học, lịch sử, không viết code lập trình, không bàn luận chính trị hay y tế.
- Khi khách hỏi các câu hỏi ngoài phạm vi thời trang (ví dụ giải toán, công thức lý hóa, giải phương trình, lập trình,...), bạn BẮT BUỘC PHẢI TỪ CHỐI LỊCH THIỆP, HÓM HỈNH và dẫn dắt khách hàng quay lại mua sắm trang phục Big Size:
  Ví dụ: "Hihi, những bài toán lý hóa hay câu hỏi học thuật hóc búa này thì mình xin phép nhường lại cho thầy cô giáo và bác Google nha! 📚🔬 Chuyên môn số 1 của mình là Stylist thời trang Big Size (XL - 5XL) tại Curve & Confidence – chuyên tư vấn phối đồ tôn dáng, giấu bụng và chọn size chuẩn xác cho vóc dáng đầy đặn. Hôm nay bạn đang cần tìm trang phục để đi làm, dạo phố hay dự tiệc để mình hỗ trợ nhé? ✨"`;

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Fast-response model priority list (gemini-3.5-flash-lite offers ~690ms TTFB)
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest'
];

/**
 * Calculate size from user weight and height with shop ergonomics
 */
function calculateInstantSizeResponse(weight: number, heightStr?: string): { text: string; action: ChatMessage['action'] } {
  let maleSize = '2XL';
  let femaleSize = '2XL';

  if (weight < 75) {
    maleSize = 'XL';
    femaleSize = 'XL';
  } else if (weight <= 84) {
    maleSize = 'XL';
    femaleSize = weight <= 77 ? 'XL' : '2XL';
  } else if (weight <= 94) {
    maleSize = '2XL';
    femaleSize = weight <= 87 ? '2XL' : '3XL';
  } else if (weight <= 106) {
    maleSize = '3XL';
    femaleSize = weight <= 98 ? '3XL' : '4XL';
  } else if (weight <= 120) {
    maleSize = '4XL';
    femaleSize = weight <= 112 ? '4XL' : '5XL';
  } else {
    maleSize = '5XL';
    femaleSize = '5XL';
  }

  const heightText = heightStr ? ` và chiều cao khoảng **${heightStr}**` : '';

  return {
    text: `Chào bạn! Với thể trạng **${weight}kg**${heightText}, bảng size may đo công thái học độc quyền của Curve & Confidence chuẩn phom cho bạn như sau:\n\n` +
      `• **Nếu là Nam**: Vừa vặn và tôn dáng nhất ở size **${maleSize}**.\n` +
      `• **Nếu là Nữ**: Vừa vặn và tôn dáng nhất ở size **${femaleSize}**.\n\n` +
      `💡 **Lời khuyên từ Stylist**: Nếu bạn có vòng bụng bia, bắp tay lớn hoặc muốn mặc dáng suông rộng thoải mái khi ngồi xe/làm việc, hãy nhích lên **1 size** nhé! Mọi sản phẩm đều có chất vải dệt co giãn 4 chiều chống cộm ngấn bụng tuyệt đối. ✨`,
    action: {
      label: 'Mở Công Cụ AI Đoán Size Chi Tiết',
      openSizeFinder: true
    }
  };
}

export interface ProfileSizeRecommendationResult {
  recommendedSize: string;
  alternativeSize?: string;
  fitNotes: string;
  stylingTips: string;
}

/**
 * Calculate personalized size recommendation based on customer's body profile
 */
export function calculateProfileSizeRecommendation(profile: BodyProfile): ProfileSizeRecommendationResult {
  const isMale = profile.gender === 'nam';
  const weight = profile.weight;
  const waist = profile.waist;
  const isLoose = profile.fitPreference === 'loose';

  let recommendedSize = '2XL';
  let alternativeSize: string | undefined = undefined;

  if (isMale) {
    if (weight < 75) {
      recommendedSize = (waist >= 100 || isLoose) ? '2XL' : 'XL';
      alternativeSize = recommendedSize === 'XL' ? '2XL' : 'XL';
    } else if (weight <= 84) {
      recommendedSize = (waist >= 102 || isLoose) ? '2XL' : 'XL';
      alternativeSize = (recommendedSize === 'XL') ? '2XL' : '3XL';
    } else if (weight <= 94) {
      recommendedSize = (waist >= 108 || isLoose) ? '3XL' : '2XL';
      alternativeSize = (recommendedSize === '2XL') ? '3XL' : '2XL';
    } else if (weight <= 106) {
      recommendedSize = (waist >= 116 || isLoose) ? '4XL' : '3XL';
      alternativeSize = (recommendedSize === '3XL') ? '4XL' : '3XL';
    } else if (weight <= 120) {
      recommendedSize = (waist >= 124 || isLoose) ? '5XL' : '4XL';
      alternativeSize = (recommendedSize === '4XL') ? '5XL' : '4XL';
    } else {
      recommendedSize = '5XL';
    }
  } else {
    // Nữ
    if (weight < 68) {
      recommendedSize = (waist >= 88 || isLoose) ? '2XL' : 'XL';
      alternativeSize = recommendedSize === 'XL' ? '2XL' : 'XL';
    } else if (weight <= 77) {
      recommendedSize = (waist >= 92 || isLoose) ? '2XL' : 'XL';
      alternativeSize = (recommendedSize === 'XL') ? '2XL' : '3XL';
    } else if (weight <= 87) {
      recommendedSize = (waist >= 100 || isLoose) ? '3XL' : '2XL';
      alternativeSize = (recommendedSize === '2XL') ? '3XL' : '2XL';
    } else if (weight <= 98) {
      recommendedSize = (waist >= 108 || isLoose) ? '4XL' : '3XL';
      alternativeSize = (recommendedSize === '3XL') ? '4XL' : '3XL';
    } else if (weight <= 112) {
      recommendedSize = (waist >= 116 || isLoose) ? '5XL' : '4XL';
      alternativeSize = (recommendedSize === '4XL') ? '5XL' : '4XL';
    } else {
      recommendedSize = '5XL';
    }
  }

  let fitNotes = `Với thể trạng cao ${profile.height}cm và nặng ${profile.weight}kg`;
  if (waist) {
    fitNotes += `, vòng bụng ${waist}cm`;
  }
  if (profile.fitPreference === 'loose') {
    fitNotes += ' cùng thói quen thích mặc rộng rãi thoải mái';
  } else if (profile.fitPreference === 'snug') {
    fitNotes += ' cùng thói quen thích mặc vừa vặn gọn gàng';
  }
  fitNotes += `, size **${recommendedSize}** là lựa chọn chuẩn phom công thái học tôn dáng nhất.`;

  let stylingTips = '';
  if (isMale) {
    stylingTips = 'Ưu tiên **Áo Polo Pique Dry-Tech dệt tổ ong co giãn 4 chiều** hoặc **Sơ mi Oxford vạt bầu giấu bụng bia**, phối cùng **Quần tây cạp chun ẩn 3.5cm** chống cộm cấn khi ngồi làm việc hay lái xe.';
  } else {
    stylingTips = 'Ưu tiên **Đầm chữ A chiết eo cao trên rốn** hoặc **Sơ mi lụa cát vạt bầu kết hợp Quần suông lưng cao** giúp giấu trọn vòng 2 và tôn đôi chân thon thả.';
  }

  return {
    recommendedSize,
    alternativeSize,
    fitNotes,
    stylingTips
  };
}

export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Instant local stylist knowledge matching (0.05s response time)
 */
function findInstantStylistAnswer(
  query: string,
  activeProfile?: BodyProfile | null
): { text: string; action?: ChatMessage['action'] } | null {
  const lower = query.toLowerCase().trim();
  const normalized = removeVietnameseTones(query);

  // 1. Explicit weight typed by user in chat takes priority
  const weightMatch = lower.match(/(\d{2,3})\s*(?:kg|kí|ký|cân)/) || lower.match(/(?:nặng|cân nặng)\s*(\d{2,3})/);
  const heightMatch = lower.match(/(1[m,.]\d{1,2}|1\d{2}\s*cm)/);

  if (weightMatch) {
    const weight = parseInt(weightMatch[1], 10);
    if (weight >= 55 && weight <= 180) {
      const height = heightMatch ? heightMatch[1] : undefined;
      return calculateInstantSizeResponse(weight, height);
    }
  }

  // 2. Domain guardrails
  if (
    lower.includes('toán') || lower.includes('vật lý') || lower.includes('hóa học') ||
    lower.includes('phương trình') || lower.includes('lập trình') || lower.includes('code') ||
    lower.includes('python') || lower.includes('1 + 1')
  ) {
    return {
      text: 'Hihi, những bài toán lý hóa hay câu hỏi học thuật hóc búa này thì mình xin phép nhường lại cho thầy cô giáo và bác Google nha! 📚🔬\n\nChuyên môn số 1 của mình là **Stylist thời trang Big Size (XL – 5XL)** tại Curve & Confidence – chuyên tư vấn phối đồ tôn dáng, giấu bụng và chọn size chuẩn xác cho vóc dáng đầy đặn.\n\nHôm nay bạn đang cần tìm trang phục để đi làm, dạo phố hay dự tiệc để mình hỗ trợ nhé? ✨',
      action: {
        label: 'Khám Phá Bộ Sưu Tập Big Size',
        path: '/products'
      }
    };
  }

  // 3. Return policy questions
  const isReturnQuestion =
    normalized.includes('doi size') ||
    normalized.includes('doi tra') ||
    normalized.includes('phi doi') ||
    normalized.includes('tra hang') ||
    lower.includes('đổi') ||
    lower.includes('trả');

  if (isReturnQuestion) {
    return {
      text: 'Tại Curve & Confidence, bạn được áp dụng chính sách **ĐỔI SIZE TẬN NƠI MIỄN PHÍ TRONG 7 NGÀY** cực kỳ tiện lợi:\n\n' +
        '• 🚀 **Shipper đến tận nhà**: Giao size mới tận tay bạn và nhận lại sản phẩm cũ cùng lúc. Bạn không cần mất công mang ra bưu cục hay đóng gói phiền phức.\n' +
        '• 💯 **0đ Phí đổi size**: Hoàn toàn miễn phí vận chuyển 2 chiều cho lần đổi size đầu tiên.\n' +
        '• 📦 **Được kiểm tra hàng**: Mở hàng thử đồ thoải mái trước khi thanh toán.\n\n' +
        'Bạn hoàn toàn yên tâm chọn đồ và thử ngay tại nhà nhé! ❤️',
      action: {
        label: 'Xem Chi Tiết Chính Sách Đổi Trả',
        path: '/faq'
      }
    };
  }

  // 4. Specific category questions
  const isWinterQuestion =
    normalized.includes('dong') ||
    normalized.includes('lanh') ||
    normalized.includes('khoac') ||
    normalized.includes('len') ||
    normalized.includes('da');

  const isShirtBellyQuestion =
    (normalized.includes('so mi') || normalized.includes('ao')) &&
    (normalized.includes('bung') || normalized.includes('bia') || normalized.includes('giau bung'));

  const isPantBellyQuestion =
    normalized.includes('can bung') ||
    (normalized.includes('quan') && (normalized.includes('ngoi') || normalized.includes('bung') || normalized.includes('cap chun')));

  // 5. General product search / styling / size recommendation queries
  const isProductOrStyleQuery =
    normalized.includes('san pham') ||
    normalized.includes('phu hop') ||
    normalized.includes('tim') ||
    normalized.includes('chon') ||
    normalized.includes('mua') ||
    normalized.includes('goi y') ||
    normalized.includes('tu van') ||
    normalized.includes('size') ||
    normalized.includes('co nao') ||
    normalized.includes('mac') ||
    normalized.includes('ao') ||
    normalized.includes('quan') ||
    normalized.includes('dam') ||
    normalized.includes('vay') ||
    normalized.includes('do') ||
    normalized.includes('trang phuc') ||
    normalized.includes('phoi') ||
    normalized.includes('dang') ||
    normalized.includes('bung') ||
    normalized.includes('bia') ||
    normalized.includes('ho so') ||
    normalized.includes('so do');

  // If user has activeProfile and asks specifically about shirts / belly
  if (activeProfile && isShirtBellyQuestion) {
    const rec = calculateProfileSizeRecommendation(activeProfile);
    return {
      text: `Dựa trên hồ sơ **"${activeProfile.name}"** (${activeProfile.gender === 'nam' ? 'Nam' : 'Nữ'}, **${activeProfile.weight}kg**, vòng bụng **${activeProfile.waist}cm**), để che khuyết điểm bụng hiệu quả nhất:\n\n` +
        `• 🎯 **Size sơ mi chuẩn nhất**: **Size ${rec.recommendedSize}** (phom Regular Fit vạt bầu nhẹ).\n` +
        `• 🧵 **Chất liệu đề xuất**: **Oxford Cotton pha Spandex dệt sợi nổi** dày dặn vừa phải, đứng phom và không bám dính vào vùng bụng.\n` +
        `• 🎨 **Màu sắc tôn dáng**: Các gam màu trầm nam tính như Xanh Navy, Xám Melange, Đen khói hoặc Kẻ sọc dọc nhỏ giúp "ăn gian" 4–6kg thị giác! ✨\n\n` +
        `Bạn muốn xem mẫu sơ mi tay ngắn năng động hay tay dài công sở size **${rec.recommendedSize}** để mình gửi mẫu nhé?`,
      action: {
        label: `Khám Phá Sơ Mi Oxford Size ${rec.recommendedSize}`,
        path: `/products?size=${rec.recommendedSize}`
      }
    };
  }

  // If user has activeProfile and asks specifically about trousers / belly pressure
  if (activeProfile && isPantBellyQuestion) {
    const rec = calculateProfileSizeRecommendation(activeProfile);
    return {
      text: `Với vòng bụng **${activeProfile.waist}cm** và thể trạng **${activeProfile.weight}kg** của hồ sơ **"${activeProfile.name}"**, nỗi lo ngồi bị cấn hoặc bó chặt cạp quần sẽ được giải quyết triệt để:\n\n` +
        `• 🎯 **Size quần đề xuất**: **Size ${rec.recommendedSize}**.\n` +
        `• 🩳 **Công nghệ cạp chun ẩn 3.5cm**: Phần chun co giãn thông minh được giấu hoàn toàn bên trong sườn quần, bên ngoài vẫn giữ nguyên cạp tây phẳng chỉn chu.\n` +
        `• 👖 **Chất liệu Kaki / Cotton chéo co giãn 4 chiều**: Đũng quần hạ sâu công thái học, cử động hay ngồi làm việc 8 tiếng cực kỳ êm ái, không bị cọ xát ngấn bụng.\n\n` +
        `Bạn muốn xem phom quần tây ống suông hay ống đứng đứng dáng size **${rec.recommendedSize}**?`,
      action: {
        label: `Xem Quần Tây Lưng Thun Size ${rec.recommendedSize}`,
        path: `/products?size=${rec.recommendedSize}`
      }
    };
  }

  // If user has activeProfile and asks for suitable products / styling / sizing ("TÌM SAN PHAM PHU HOP", "gợi ý đồ", etc.)
  if (activeProfile && isProductOrStyleQuery) {
    const rec = calculateProfileSizeRecommendation(activeProfile);
    const isMale = activeProfile.gender === 'nam';
    const waistStr = activeProfile.waist ? `, vòng bụng **${activeProfile.waist}cm**` : '';
    const noteStr = (activeProfile.bodyFeature || activeProfile.notes)
      ? `\n• 👤 **Đặc điểm vóc dáng**: ${activeProfile.bodyFeature || activeProfile.notes}`
      : '';

    let itemsList = '';
    if (isMale) {
      itemsList =
        `1. **Áo Sơ Mi Oxford Form Rộng Vạt Bầu**: Thiết kế vạt bầu thông minh che trọn vòng bụng ${activeProfile.waist || 'lớn'}cm khi đứng hay ngồi, chất vải dệt đứng dáng không bám dính da.\n` +
        `2. **Áo Polo Pique Dry-Tech Co Giãn 4 Chiều**: Dệt tổ ong cao cấp, thoáng mát, tôn vai ngang và giấu bụng bia cực tốt.\n` +
        `3. **Quần Tây Âu / Kaki Cạp Chun Ẩn 3.5cm**: Lưng thun ẩn co giãn thông minh, ngồi làm việc, lái xe hay ăn tiệc êm ái, hoàn toàn không bị cấn siết bụng.`;
    } else {
      itemsList =
        `1. **Đầm Chữ A Chiết Eo Cao Trên Rốn**: Tùng váy xòe rủ tự nhiên giấu ngấn bụng và nâng dáng thon gọn thanh lịch.\n` +
        `2. **Áo Sơ Mi Lụa Cát Vạt Bầu**: Chất liệu rủ nhẹ, phom suông che khuyết điểm bắp tay và eo.\n` +
        `3. **Quần Suông Ống Rộng Lưng Cao Co Giãn**: Kéo dài đôi chân, đũng quần thoải mái không gò bó.`;
    }

    return {
      text: `Dựa trên hồ sơ **"${activeProfile.name}"** (${isMale ? 'Nam' : 'Nữ'}, **${activeProfile.weight}kg**, cao **${activeProfile.height}cm**${waistStr}):\n\n` +
        `• 🎯 **Size đề xuất chuẩn nhất**: **Size ${rec.recommendedSize}** (phom Big Size chuẩn công thái học vừa vặn).${noteStr}\n` +
        `• 👔 **Top sản phẩm phù hợp nhất với vóc dáng này**:\n${itemsList}\n\n` +
        `Tất cả sản phẩm trên đều có sẵn chuẩn size **${rec.recommendedSize}**. Bạn muốn xem chi tiết mẫu áo sơ mi, polo hay quần tây size **${rec.recommendedSize}** trước để mình gửi nhé? ✨`,
      action: {
        label: `Xem Toàn Bộ Sản Phẩm Phù Hợp Size ${rec.recommendedSize}`,
        path: `/products?size=${rec.recommendedSize}`
      }
    };
  }

  // Non-profile answers for quick prompts
  if (isShirtBellyQuestion) {
    return {
      text: 'Để che **bụng bia / bụng to** hiệu quả nhất khi mặc áo sơ mi, Stylist Curve & Confidence khuyên bạn:\n\n' +
        '• **Phom dáng**: Chọn dáng **Regular Fit vạt bầu nhẹ** – vạt áo hơi uốn lượn sẽ tạo cảm giác eo thon, không bị căng cứng ngấn bụng khi đứng hay ngồi.\n' +
        '• **Chất liệu**: Ưu tiên **Oxford Cotton pha Spandex dệt sợi nổi** dày dặn vừa phải, đứng phom và không bám dính vào da.\n' +
        '• **Màu sắc**: Các gam màu trầm nam tính như Xanh Navy, Xám Melange, Đen khói hoặc Kẻ sọc dọc nhỏ giúp "ăn gian" 4–6kg thị giác! ✨\n\n' +
        'Bạn đang tìm sơ mi tay ngắn năng động hay tay dài công sở để mình gửi mẫu vừa size nhé?',
      action: {
        label: 'Khám Phá Sơ Mi Oxford Form Rộng',
        path: '/products'
      }
    };
  }

  if (isPantBellyQuestion) {
    return {
      text: 'Nỗi sợ lớn nhất của người mặc đồ Big Size khi ngồi là cạp quần siết chặt gây khó thở hoặc cấn bụng bia. Giải pháp độc quyền tại Curve & Confidence:\n\n' +
        '• **Quần Tây Âu Công Thái Học Cạp Thun Ẩn 3.5cm**: Phần chun co giãn thông minh được giấu hoàn toàn bên trong sườn quần, bên ngoài vẫn giữ nguyên cạp tây phẳng chỉn chu.\n' +
        '• **Chất liệu Kaki / Cotton chéo co giãn 4 chiều**: Vận động, ngồi xe máy hay ngồi làm việc 8 tiếng cực kỳ êm ái, đũng quần hạ sâu không bị cọ xát.\n\n' +
        'Bạn muốn xem phom quần ống suông hay ống đứng đứng dáng để mình tư vấn nhé!',
      action: {
        label: 'Xem Quần Tây Lưng Thun Co Giãn',
        path: '/products'
      }
    };
  }

  if (isWinterQuestion) {
    return {
      text: 'Nguyên tắc vàng phối đồ mùa đông cho thể trạng Big Size là **Kỹ thuật Layering 3 lớp không cộm**:\n\n' +
        '• **Lớp trong**: Áo thun giữ nhiệt mỏng hoặc thun cotton ôm vừa vặn.\n' +
        '• **Lớp giữa**: Sơ mi vạt bầu hoặc áo len dệt kim mỏng nhẹ cổ tim/cổ tròn.\n' +
        '• **Lớp ngoài**: Áo khoác dạ phom suông hoặc Blazer đứng dáng dài ngang đùi – giúp kéo thẳng đường viền cơ thể và giấu trọn vòng bụng.\n\n' +
        'Tránh áo phao quá phồng to bạn nhé! Bạn đang cần set đồ mùa đông để đi làm hay dạo phố nè?',
      action: {
        label: 'Khám Phá Áo Khoác Big Size',
        path: '/products'
      }
    };
  }

  return null;
}


function preparePayload(history: ChatMessage[], newMessage: string, activeProfile?: BodyProfile | null) {
  const pastMessages = history.filter(m => m.id !== 'msg-1');
  const recentMessages = pastMessages.slice(-5);
  const contents: GeminiContent[] = [];

  for (const msg of recentMessages) {
    if (msg.text === newMessage && msg.sender === 'user') continue;
    contents.push({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  }

  // Add current user message
  contents.push({
    role: 'user',
    parts: [{ text: newMessage }]
  });

  let systemInstructionText = SYSTEM_INSTRUCTION;
  if (activeProfile) {
    const isMale = activeProfile.gender === 'nam';
    systemInstructionText += `\n\n[THÔNG TIN HỒ SƠ KHÁCH HÀNG ĐANG CHỌN TỪ QUẢN LÝ HỒ SƠ - KHÁCH KHÔNG CẦN NHẬP LẠI SỐ ĐO]:
- Tên hồ sơ: ${activeProfile.name} (${activeProfile.relationship || 'Bản thân'})
- Giới tính: ${isMale ? 'Nam' : 'Nữ'}
- Tuổi: ${activeProfile.age || 'Không rõ'}
- Chiều cao: ${activeProfile.height} cm
- Cân nặng: ${activeProfile.weight} kg
- Vòng ngực: ${activeProfile.chest} cm
- Vòng eo / bụng: ${activeProfile.waist} cm
- Vòng mông: ${activeProfile.hips} cm
- Chiều rộng vai: ${activeProfile.shoulder || 48} cm
- Sở thích mặc: ${activeProfile.fitPreference === 'loose' ? 'Thích mặc rộng rãi thoải mái' : activeProfile.fitPreference === 'snug' ? 'Thích mặc vừa sát gọn gàng' : 'Tiêu chuẩn (Regular fit)'}
- Đặc điểm dáng người: ${activeProfile.bodyFeature || activeProfile.notes || 'Dáng người đầy đặn'}

QUY TẮC BẮT BUỘC KHI CÓ HỒ SƠ:
1. Bạn ĐÃ BIẾT TOÀN BỘ số đo, chiều cao, cân nặng và đặc điểm vóc dáng của khách qua hồ sơ "${activeProfile.name}".
2. TUYỆT ĐỐI KHÔNG HỎI LẠI chiều cao, cân nặng hay số đo của khách!
3. Khi khách hỏi tư vấn size, phối đồ, chọn mẫu, hãy sử dụng ngay các thông số trên để tư vấn cụ thể và cá nhân hóa. Mở đầu bằng việc xác nhận đang tư vấn dựa trên hồ sơ "${activeProfile.name}" (${activeProfile.weight}kg, ${activeProfile.height}cm, vòng bụng ${activeProfile.waist}cm).`;
  }

  return {
    systemInstruction: {
      parts: [{ text: systemInstructionText }]
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 350
    }
  };
}

function detectSmartAction(newMessage: string, replyText: string): ChatMessage['action'] | undefined {
  const lowerQuery = (newMessage + ' ' + replyText).toLowerCase();

  if (lowerQuery.includes('đoán size') || lowerQuery.includes('bảng size') || lowerQuery.includes('chi tiết size') || lowerQuery.includes('công cụ')) {
    return {
      label: 'Mở Công Cụ AI Đoán Size Chi Tiết',
      openSizeFinder: true
    };
  } else if (lowerQuery.includes('đổi') || lowerQuery.includes('trả') || lowerQuery.includes('chính sách')) {
    return {
      label: 'Xem Chi Tiết Chính Sách Đổi Trả 7 Ngày',
      path: '/faq'
    };
  } else if (lowerQuery.includes('sản phẩm') || lowerQuery.includes('áo') || lowerQuery.includes('quần') || lowerQuery.includes('đầm') || lowerQuery.includes('mua')) {
    return {
      label: 'Khám Phá Bộ Sưu Tập Big Size',
      path: '/products'
    };
  }
  return undefined;
}

/**
 * Stream AI response in real time (Instant Local Knowledge + SSE Streaming)
 */
export async function streamGeminiAssistant(
  history: ChatMessage[],
  newMessage: string,
  onChunk: (accumulatedText: string, chunkText: string) => void,
  activeProfile?: BodyProfile | null
): Promise<{ text: string; action?: ChatMessage['action'] }> {
  // 1. Instant Stylist Knowledge Layer (0.05s response time)
  const instantMatch = findInstantStylistAnswer(newMessage, activeProfile);
  if (instantMatch) {
    const words = instantMatch.text.split(' ');
    let accumulated = '';
    for (let i = 0; i < words.length; i += 3) {
      const piece = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
      accumulated += piece;
      onChunk(accumulated, piece);
      await new Promise(r => setTimeout(r, 16));
    }
    return instantMatch;
  }

  // 2. Fallback to Google Gemini SSE streaming for open-ended queries
  try {
    const requestPayload = preparePayload(history, newMessage, activeProfile);
    let fullText = '';
    let lastError: any = null;

    for (const model of CANDIDATE_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': API_KEY
          },
          body: JSON.stringify(requestPayload)
        });

        if (!response.ok || !response.body) {
          const errData = await response.json().catch(() => null);
          console.warn(`Gemini stream model ${model} failed with HTTP ${response.status}:`, errData);
          lastError = errData || response.status;
          continue;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let lineBuffer = '';
        let streamedChars = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() ?? '';

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith('data:')) continue;
            const jsonStr = line.replace(/^data:\s*/, '').trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const textPiece = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (textPiece) {
                streamedChars += textPiece;
                onChunk(streamedChars, textPiece);
              }
            } catch {
              // ignore partial lines
            }
          }
        }

        // Process any remaining buffered text
        if (lineBuffer.trim().startsWith('data:')) {
          const jsonStr = lineBuffer.trim().replace(/^data:\s*/, '').trim();
          if (jsonStr && jsonStr !== '[DONE]') {
            try {
              const parsed = JSON.parse(jsonStr);
              const textPiece = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (textPiece) {
                streamedChars += textPiece;
                onChunk(streamedChars, textPiece);
              }
            } catch {}
          }
        }

        if (streamedChars.trim().length > 0) {
          fullText = streamedChars.trim();
          break; // Streaming succeeded!
        }
      } catch (streamErr) {
        console.warn(`Error during stream with model ${model}:`, streamErr);
        lastError = streamErr;
      }
    }

    if (!fullText) {
      console.warn('Streaming did not yield text, falling back to askGeminiAssistant:', lastError);
      return await askGeminiAssistant(history, newMessage, activeProfile);
    }

    return {
      text: fullText,
      action: detectSmartAction(newMessage, fullText)
    };
  } catch (error) {
    console.error('Error in streamGeminiAssistant:', error);
    return getFallbackResponse(newMessage, activeProfile);
  }
}

export async function askGeminiAssistant(
  history: ChatMessage[],
  newMessage: string,
  activeProfile?: BodyProfile | null
): Promise<{ text: string; action?: ChatMessage['action'] }> {
  // Check instant match first
  const instantMatch = findInstantStylistAnswer(newMessage, activeProfile);
  if (instantMatch) return instantMatch;

  try {
    const requestPayload = preparePayload(history, newMessage, activeProfile);
    let candidateText: string | null = null;
    let lastError: any = null;

    // Try each model sequentially until one succeeds
    for (const model of CANDIDATE_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': API_KEY
          },
          body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          console.warn(`Gemini model ${model} failed with HTTP ${response.status}:`, errData);
          lastError = errData || response.status;
          continue; // Try next fallback model
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 0) {
          candidateText = text.trim();
          break; // Succeeded!
        }
      } catch (networkErr) {
        console.warn(`Network error querying model ${model}:`, networkErr);
        lastError = networkErr;
      }
    }

    if (!candidateText) {
      throw new Error(`All candidate Gemini models exhausted. Last error: ${JSON.stringify(lastError)}`);
    }

    return {
      text: candidateText,
      action: detectSmartAction(newMessage, candidateText)
    };
  } catch (error) {
    console.error('Error in askGeminiAssistant:', error);
    return getFallbackResponse(newMessage, activeProfile);
  }
}

function getFallbackResponse(query: string, activeProfile?: BodyProfile | null): { text: string; action?: ChatMessage['action'] } {
  const lower = query.toLowerCase();

  // 0. Hàng rào bảo vệ: Lịch sự từ chối các câu hỏi ngoài phạm vi (Toán, Lý, Hóa, Bài tập, Lập trình...)
  if (
    lower.includes('toán') ||
    lower.includes('vật lý') ||
    lower.includes('hóa học') ||
    lower.includes('hóa') ||
    lower.includes('lý') ||
    lower.includes('phương trình') ||
    lower.includes('tích phân') ||
    lower.includes('công thức') ||
    lower.includes('bài tập') ||
    lower.includes('giải bài') ||
    lower.includes('lập trình') ||
    lower.includes('code') ||
    lower.includes('python') ||
    lower.includes('java') ||
    lower.includes('html') ||
    lower.includes('1 + 1') ||
    lower.includes('2 + 2') ||
    lower.includes('tam giác')
  ) {
    return {
      text: 'Hihi, những bài toán lý hóa hay câu hỏi học thuật hóc búa này thì mình xin phép nhường lại cho thầy cô giáo và bác Google nha! 📚🔬\n\nChuyên môn số 1 của mình là **Stylist thời trang Big Size (XL – 5XL)** tại Curve & Confidence – chuyên tư vấn phối đồ tôn dáng, giấu bụng và chọn size chuẩn xác cho vóc dáng đầy đặn.\n\nHôm nay bạn đang cần tìm trang phục để đi làm, dạo phố hay dự tiệc để mình hỗ trợ nhé? ✨',
      action: {
        label: 'Khám Phá Bộ Sưu Tập Big Size',
        path: '/products'
      }
    };
  }

  // 1. Tư vấn phong cách Mùa Đông / Áo Khoác
  if (lower.includes('đông') || lower.includes('lạnh') || lower.includes('khoác') || lower.includes('len') || lower.includes('dạ')) {
    return {
      text: 'Với thời tiết mùa đông, nguyên tắc phối đồ Big Size chuẩn đẹp nhất là **Kỹ thuật Layering 3 lớp không cộm**:\n\n• **Lớp trong**: Áo thun giữ nhiệt cổ lọ mỏng hoặc thun cotton ôm vừa vặn.\n• **Lớp giữa**: Áo sơ mi Oxford hoặc áo len dệt kim mỏng vạt bầu.\n• **Lớp ngoài**: Áo Blazer dáng suông dài qua hông hoặc Áo khoác dạ phom đứng giúp kéo dài tỉ lệ cơ thể và giấu bụng hoàn hảo.\n\nNàng đang tìm set đồ đông để đi làm hay dạo phố để mình gợi ý mẫu phù hợp nhất nhé! ✨',
      action: {
        label: 'Khám Phá Áo Khoác & Blazer Big Size',
        path: '/products'
      }
    };
  }

  // 2. Tư vấn che khuyết điểm bụng / eo
  if (lower.includes('bụng') || lower.includes('eo') || lower.includes('bụng bia') || lower.includes('mỡ')) {
    if (activeProfile) {
      const rec = calculateProfileSizeRecommendation(activeProfile);
      return {
        text: `Dựa trên hồ sơ **"${activeProfile.name}"** (${activeProfile.weight}kg, eo ${activeProfile.waist}cm):\n\n` +
          `• **Size trang phục chuẩn phom**: **${rec.recommendedSize}**\n` +
          `• **Bí quyết giấu bụng**: ${rec.stylingTips}\n\n` +
          `Tránh tuyệt đối các chất liệu mỏng dính hoặc áo bo gấu bó sát bạn nhé!`,
        action: {
          label: `Xem Sản Phẩm Size ${rec.recommendedSize}`,
          path: `/products?size=${rec.recommendedSize}`
        }
      };
    }
    return {
      text: 'Để giấu bụng hiệu quả nhất, chuyên gia khuyên bạn nên chọn:\n\n• **Dành cho Nam**: Áo Polo dệt tổ ong Dry-Tech co giãn 4 chiều hoặc Sơ mi vạt bầu phối Quần tây cạp chun ẩn.\n• **Dành cho Nữ**: Đầm Peplum hoặc Đầm chữ A chiết eo cao trên rốn, tùng xòe rủ tự nhiên giấu ngấn bụng tuyệt đối.\n\nTránh tuyệt đối các chất liệu mỏng dính hoặc áo bo gấu bạn nhé!',
      action: {
        label: 'Xem Đầm & Áo Che Khuyết Điểm',
        path: '/products'
      }
    };
  }

  // 3. Tư vấn kích cỡ / Cân nặng
  if (lower.includes('size') || lower.includes('kg') || lower.includes('nặng') || lower.includes('cao') || lower.includes('mặc')) {
    if (activeProfile) {
      const rec = calculateProfileSizeRecommendation(activeProfile);
      return {
        text: `Dựa trên số đo hồ sơ **"${activeProfile.name}"** (${activeProfile.weight}kg, ${activeProfile.height}cm, vòng bụng ${activeProfile.waist}cm):\n\n` +
          `• **Size chuẩn công thái học**: **${rec.recommendedSize}**\n` +
          `• **Tư vấn Stylist**: ${rec.fitNotes}\n` +
          `• **Gợi ý trang phục**: ${rec.stylingTips}`,
        action: {
          label: `Xem Toàn Bộ Sản Phẩm Size ${rec.recommendedSize}`,
          path: `/products?size=${rec.recommendedSize}`
        }
      };
    }
    return {
      text: 'Để mình tư vấn size chuẩn xác và tôn dáng nhất, bạn cho mình xin cụ thể: Chiều cao, cân nặng và bạn có vòng bụng lớn hay vai rộng không nhé? Curve & Confidence có đầy đủ size chuẩn phom từ XL đến 5XL cho bạn!',
      action: {
        label: 'Mở Công Cụ AI Đoán Size Chi Tiết',
        openSizeFinder: true
      }
    };
  }

  // 4. Tư vấn chính sách đổi trả 7 ngày
  if (lower.includes('đổi') || lower.includes('trả') || lower.includes('bảo hành')) {
    return {
      text: 'Tại Curve & Confidence, bạn được **ĐỔI SIZE TẬN NƠI MIỄN PHÍ TRONG 7 NGÀY**. Shipper sẽ mang size mới đến tận nhà đổi và nhận lại hàng cũ cùng lúc, bạn hoàn toàn yên tâm thử đồ tại nhà nhé!',
      action: {
        label: 'Xem Chi Tiết Chính Sách Đổi Trả',
        path: '/faq'
      }
    };
  }

  // 5. Tư vấn trang phục đi làm / dự tiệc
  if (lower.includes('làm') || lower.includes('công sở') || lower.includes('tiệc') || lower.includes('cưới')) {
    return {
      text: 'Với trang phục đi làm hoặc dự tiệc, phong cách thanh lịch tối giản kết hợp các gam màu quyền lực (Đen huyền bí, Xanh Navy, Nâu tây) sẽ giúp bạn toát lên thần thái sang trọng và cực kỳ thon gọn. Bạn muốn xem đầm tiệc hay set blazer công sở?',
      action: {
        label: 'Xem Bộ Sưu Tập Công Sở & Dự Tiệc',
        path: '/products'
      }
    };
  }

  if (activeProfile) {
    const rec = calculateProfileSizeRecommendation(activeProfile);
    const isMale = activeProfile.gender === 'nam';
    const waistStr = activeProfile.waist ? `, vòng bụng **${activeProfile.waist}cm**` : '';
    return {
      text: `Dựa trên số đo hồ sơ **"${activeProfile.name}"** (${isMale ? 'Nam' : 'Nữ'}, **${activeProfile.weight}kg**, cao **${activeProfile.height}cm**${waistStr}):\n\n` +
        `• 🎯 **Size đề xuất chuẩn nhất**: **Size ${rec.recommendedSize}** (phom Big Size chuẩn công thái học).\n` +
        `• 💡 **Phân tích vóc dáng**: ${rec.fitNotes}\n` +
        `• ✨ **Gợi ý trang phục**: ${rec.stylingTips}\n\n` +
        `Bạn muốn tìm áo hay quần chuẩn size **${rec.recommendedSize}** cho vóc dáng này để mình gửi mẫu nhé?`,
      action: {
        label: `Xem Toàn Bộ Sản Phẩm Phù Hợp Size ${rec.recommendedSize}`,
        path: `/products?size=${rec.recommendedSize}`
      }
    };
  }

  return {
    text: 'Cảm ơn bạn đã nhắn tin! Mọi trang phục tại Curve & Confidence đều được may đo công thái học riêng cho thể trạng đầy đặn (XL đến 5XL). Bạn đang tìm đồ nam hay nữ, và bạn muốn mặc đi làm hay dạo phố để mình hỗ trợ nhé?',
    action: {
      label: 'Khám Phá Cửa Hàng',
      path: '/products'
    }
  };
}
