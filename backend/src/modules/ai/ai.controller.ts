import { Request, Response } from 'express';
import { genAI } from '../../config/gemini';

export const recommendSize = async (req: Request, res: Response): Promise<void> => {
  try {
    const { height, weight, bust, waist, hip, fitPreference } = req.body;

    // Thuật toán tính size Big Size cơ bản
    let suggestedSize = 'XL';
    if (weight >= 95 || (bust && bust > 115) || (waist && waist > 105)) {
      suggestedSize = '5XL';
    } else if (weight >= 85 || (bust && bust > 108) || (waist && waist > 98)) {
      suggestedSize = '4XL';
    } else if (weight >= 75 || (bust && bust > 102) || (waist && waist > 90)) {
      suggestedSize = '3XL';
    } else if (weight >= 68 || (bust && bust > 96) || (waist && waist > 82)) {
      suggestedSize = '2XL';
    } else {
      suggestedSize = 'XL';
    }

    let aiAdvice = `Với chiều cao ${height || 160}cm và cân nặng ${weight || 70}kg, vóc dáng của bạn phù hợp nhất với cỡ ${suggestedSize}. Thiết kế phom giấu bụng độc quyền sẽ giúp bạn tự tin và tôn dáng tối đa.`;

    // Nếu có Gemini API Key, nhờ AI Stylist viết lời tư vấn cá nhân hóa chuyên sâu
    if (genAI) {
      try {
        const response = await genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Bạn là Chuyên gia tư vấn thời trang Big Size của thương hiệu Curve & Confidence.
Khách hàng có thông số: Chiều cao: ${height}cm, Cân nặng: ${weight}kg, Vòng 1: ${bust || 'chưa rõ'}cm, Vòng 2: ${waist || 'chưa rõ'}cm, Vòng 3: ${hip || 'chưa rõ'}cm, Gu mặc: ${fitPreference || 'thoải mái'}.
Hãy đưa ra lời khuyên ngắn gọn (2-3 câu), ấm áp, tinh tế về cách chọn size (${suggestedSize}) và mẹo chọn kiểu trang phục che khuyết điểm (như giấu bụng, gọn bắp tay).`
        });
        if (response && response.text) {
          aiAdvice = response.text;
        }
      } catch (aiErr) {
        console.warn('Gemini API call skipped/fallback:', aiErr);
      }
    }

    res.json({
      success: true,
      data: {
        suggestedSize,
        advice: aiAdvice,
        confidenceScore: 0.95
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
