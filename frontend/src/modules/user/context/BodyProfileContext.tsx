import React, { createContext, useContext, useState, useEffect } from 'react';
import { BodyProfile, Product, Size, SizeRecommendation } from '@/types';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { fetchCustomerBodyProfiles, saveCustomerBodyProfile, deleteCustomerBodyProfile } from '@/shared/services/supabaseClient';

interface BodyProfileContextType {
  profiles: BodyProfile[];
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
  activeProfile: BodyProfile | null;
  addProfile: (profile: Omit<BodyProfile, 'id'>) => BodyProfile;
  updateProfile: (id: string, profile: Partial<BodyProfile>) => void;
  deleteProfile: (id: string) => void;
  setDefaultProfile: (id: string) => void;
  tempProfile: Partial<BodyProfile>;
  setTempProfile: React.Dispatch<React.SetStateAction<Partial<BodyProfile>>>;
  calculateSizeRecommendation: (
    product: Product,
    profileOrInput?: Partial<BodyProfile>
  ) => SizeRecommendation;
}

const BodyProfileContext = createContext<BodyProfileContextType | undefined>(undefined);

export const BodyProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const isCustomer = Boolean(currentUser && currentUser.role === 'customer');

  const userProfileKey = isCustomer ? `curve_user_profiles_${currentUser!.id}` : null;
  const userActiveKey = isCustomer ? `curve_active_profile_${currentUser!.id}` : null;

  // Initialize profiles: strictly empty for Guest, cached from localStorage for Customer
  const [profiles, setProfiles] = useState<BodyProfile[]>(() => {
    if (!isCustomer || !userProfileKey) return [];
    try {
      const saved = localStorage.getItem(userProfileKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    if (!isCustomer || !userActiveKey) return null;
    try {
      return localStorage.getItem(userActiveKey) || null;
    } catch {
      return null;
    }
  });

  // Đồng bộ CSDL Supabase thật bảng `sodocothe`:
  // - Nếu là Guest hoặc Logout: Xóa sạch 100% profiles & activeProfileId
  // - Nếu là Customer đăng nhập: Tải đúng danh sách hồ sơ của chính khách hàng đó từ Supabase
  useEffect(() => {
    // Dọn sạch các key cũ của guest hoặc demo nếu còn sót trong storage
    try {
      localStorage.removeItem('curve_guest_body_profiles');
      localStorage.removeItem('curve_guest_active_profile');
      localStorage.removeItem('curve_confidence_body_profiles_v2');
      localStorage.removeItem('curve_confidence_active_profile_id_v2');
    } catch {}

    if (!isCustomer || !currentUser) {
      setProfiles([]);
      setActiveProfileId(null);
      return;
    }

    let cancelled = false;
    const loadFromSupabase = async () => {
      try {
        const dbProfiles = await fetchCustomerBodyProfiles(currentUser.id);
        if (cancelled) return;

        setProfiles(dbProfiles);
        if (userProfileKey) {
          localStorage.setItem(userProfileKey, JSON.stringify(dbProfiles));
        }

        const savedActive = userActiveKey ? localStorage.getItem(userActiveKey) : null;
        const validActive = dbProfiles.some(p => p.id === savedActive)
          ? savedActive
          : (dbProfiles[0]?.id || null);

        setActiveProfileId(validActive);
        if (userActiveKey) {
          if (validActive) localStorage.setItem(userActiveKey, validActive);
          else localStorage.removeItem(userActiveKey);
        }
      } catch (err) {
        console.error('Lỗi tải hồ sơ số đo từ Supabase:', err);
      }
    };

    void loadFromSupabase();
    return () => { cancelled = true; };
  }, [currentUser?.id, isCustomer, userProfileKey, userActiveKey]);

  const [tempProfile, setTempProfile] = useState<Partial<BodyProfile>>({
    gender: 'nam',
    height: 172,
    weight: 92,
    chest: 114,
    waist: 102,
    hips: 110,
    fitPreference: 'regular',
  });

  useEffect(() => {
    if (!isCustomer || !userProfileKey) return;
    try {
      localStorage.setItem(userProfileKey, JSON.stringify(profiles));
    } catch (err) {
      console.error('Failed to save profiles to localStorage', err);
    }
  }, [profiles, userProfileKey, isCustomer]);

  useEffect(() => {
    if (!isCustomer || !userActiveKey) return;
    try {
      if (activeProfileId) {
        localStorage.setItem(userActiveKey, activeProfileId);
      } else {
        localStorage.removeItem(userActiveKey);
      }
    } catch (err) {
      console.error('Failed to save active profile id', err);
    }
  }, [activeProfileId, userActiveKey, isCustomer]);

  // Hồ sơ đang kích hoạt: Khách vãng lai (Guest) BẮT BUỘC trả về null
  const activeProfile: BodyProfile | null = isCustomer && profiles.length > 0
    ? (profiles.find((p) => p.id === activeProfileId) || profiles.find((p) => p.isDefault) || profiles[0] || null)
    : null;

  const addProfile = (data: Omit<BodyProfile, 'id'>): BodyProfile => {
    if (!isCustomer || !currentUser) {
      showToast('Cần đăng nhập', 'Vui lòng đăng nhập tài khoản để lưu hồ sơ số đo của bạn.', 'info');
      const guestTemp: BodyProfile = {
        ...data,
        id: 'prof-temp-' + Date.now(),
        isDefault: true,
      };
      return guestTemp;
    }

    const tempId = 'sodo_temp_' + Date.now();
    const optimisticProfile: BodyProfile = {
      ...data,
      id: tempId,
      isDefault: profiles.length === 0 ? true : !!data.isDefault,
    };

    setProfiles((prev) => {
      let updated = prev;
      if (optimisticProfile.isDefault) {
        updated = updated.map((p) => ({ ...p, isDefault: false }));
      }
      return [...updated, optimisticProfile];
    });
    setActiveProfileId(tempId);

    // Lưu vào CSDL Supabase thật bảng sodocothe
    saveCustomerBodyProfile(currentUser.id, data).then((saved) => {
      if (saved) {
        setProfiles((prev) => prev.map((p) => (p.id === tempId ? saved : p)));
        setActiveProfileId((cur) => (cur === tempId ? saved.id : cur));
        if (userProfileKey) {
          localStorage.setItem(userProfileKey, JSON.stringify(profiles.map(p => p.id === tempId ? saved : p)));
        }
      }
    }).catch(() => {});

    showToast('Đã tạo hồ sơ số đo mới', `Hồ sơ "${optimisticProfile.name}" đã được lưu thành công.`, 'success');
    return optimisticProfile;
  };

  const updateProfile = (id: string, data: Partial<BodyProfile>) => {
    const target = profiles.find((p) => p.id === id);
    if (!target) return;

    const merged = { ...target, ...data };
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return merged;
        }
        if (data.isDefault && p.id !== id) {
          return { ...p, isDefault: false };
        }
        return p;
      })
    );

    if (isCustomer && currentUser) {
      saveCustomerBodyProfile(currentUser.id, merged, id).then((saved) => {
        if (saved && userProfileKey) {
          localStorage.setItem(userProfileKey, JSON.stringify(profiles));
        }
      }).catch(() => {});
    }

    showToast('Đã cập nhật hồ sơ số đo', undefined, 'success');
  };

  const deleteProfile = (id: string) => {
    const toDelete = profiles.find((p) => p.id === id);
    const remaining = profiles.filter((p) => p.id !== id);
    setProfiles(remaining);
    if (activeProfileId === id) {
      setActiveProfileId(remaining.length > 0 ? remaining[0].id : null);
    }

    if (isCustomer && currentUser) {
      deleteCustomerBodyProfile(currentUser.id, id).then(() => {
        if (userProfileKey) {
          localStorage.setItem(userProfileKey, JSON.stringify(remaining));
        }
      }).catch(() => {});
    }

    showToast('Đã xóa hồ sơ', toDelete ? `Hồ sơ "${toDelete.name}" đã bị xóa.` : undefined, 'info');
  };

  const setDefaultProfile = (id: string) => {
    setProfiles((prev) =>
      prev.map((p) => ({
        ...p,
        isDefault: p.id === id,
      }))
    );
    setActiveProfileId(id);
    if (userActiveKey) {
      localStorage.setItem(userActiveKey, id);
    }
    showToast('Đã đặt làm hồ sơ mặc định', undefined, 'success');
  };

  // Sizing AI recommendation engine
  const calculateSizeRecommendation = (
    product: Product,
    profileOrInput?: Partial<BodyProfile>
  ): SizeRecommendation => {
    const user = profileOrInput || activeProfile || tempProfile;
    const rawHeight = Number(user.height);
    const rawWeight = Number(user.weight);
    const preference = user.fitPreference || 'regular';

    const chart = product?.sizeChart;
    const sizes: Size[] = ['XL', '2XL', '3XL', '4XL', '5XL'];

    if (!chart || chart.length === 0) {
      return {
        recommendedSize: (product?.sizes && product.sizes[0]) || 'XL',
        confidenceScore: 0,
        fitType: preference,
        reason: 'Sản phẩm này hiện chưa có dữ liệu bảng size chi tiết từ nhà sản xuất.',
        measurementComparison: [],
      };
    }

    if (!rawHeight || rawHeight <= 0 || !rawWeight || rawWeight <= 0) {
      return {
        recommendedSize: chart[0]?.size || 'XL',
        confidenceScore: 0,
        fitType: preference,
        reason: 'Chưa đủ số đo chiều cao và cân nặng hợp lệ để tư vấn size chính xác. Vui lòng nhập số đo thực tế.',
        measurementComparison: [],
      };
    }

    const height = rawHeight;
    const weight = rawWeight;
    const chest = Number(user.chest) || 110;
    const waist = Number(user.waist) || 100;
    const hips = Number(user.hips) || 108;

    // Helper to parse "min - max"
    const parseRange = (str?: string): [number, number] => {
      if (!str) return [0, 999];
      const parts = str.split('-').map((s) => parseFloat(s.replace(/[^0-9.]/g, '').trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return [parts[0], parts[1]];
      }
      return [parts[0] || 0, (parts[0] || 0) + 10];
    };

    // Score each size based on product type
    // If pants: prioritize waist and hips and weight
    // If tops/dress: prioritize chest, weight and waist
    const scores = chart.map((row) => {
      const [wMin, wMax] = parseRange(row.weightRange);
      const [cMin, cMax] = parseRange(row.chest);
      const [waMin, waMax] = parseRange(row.waist);
      const [hMin, hMax] = parseRange(row.hips);

      let diff = 0;

      // Weight score
      if (weight < wMin) diff += (wMin - weight) * 1.5;
      else if (weight > wMax) diff += (weight - wMax) * 1.8;

      if (product.category === 'quan-jeans') {
        // Waist is paramount
        if (waist < waMin) diff += (waMin - waist) * 2.0;
        else if (waist > waMax) diff += (waist - waMax) * 2.5;

        // Hips
        if (hips < hMin) diff += (hMin - hips) * 1.2;
        else if (hips > hMax) diff += (hips - hMax) * 1.6;
      } else {
        // Big Size Tops/Dresses: Ưu tiên vòng eo/bụng 45% (khách Big Size vòng 2 biến thiên lớn nhất), ngực & cân nặng 55%
        // Vòng bụng (Waist/Belly fit) - Trọng số cao nhất để không bị kích bụng khi ngồi làm việc
        if (waist < waMin) diff += (waMin - waist) * 2.5;
        else if (waist > waMax) diff += (waist - waMax) * 3.2;

        // Vòng ngực (Chest fit)
        if (chest < cMin) diff += (cMin - chest) * 1.8;
        else if (chest > cMax) diff += (chest - cMax) * 2.2;
      }

      return {
        size: row.size,
        diff,
        row,
      };
    });

    // Sort by smallest difference
    scores.sort((a, b) => a.diff - b.diff);

    let bestIndex = sizes.indexOf(scores[0].size);
    let chosenSize = scores[0].size;
    let alternativeSize: Size | undefined = scores[1]?.size;

    // Apply fit preference
    if (preference === 'loose' && bestIndex < sizes.length - 1) {
      // Check if user is near upper edge
      const [cMin, cMax] = parseRange(scores[0].row.chest);
      const [wMin, wMax] = parseRange(scores[0].row.weightRange);
      if (chest > (cMin + cMax) / 2 || weight > (wMin + wMax) / 2) {
        alternativeSize = chosenSize;
        chosenSize = sizes[bestIndex + 1];
      }
    } else if (preference === 'snug' && bestIndex > 0) {
      const [cMin, cMax] = parseRange(scores[0].row.chest);
      if (chest <= (cMin + cMax) / 2) {
        alternativeSize = chosenSize;
        chosenSize = sizes[bestIndex - 1];
      }
    }

    const matchedRow = chart.find((r) => r.size === chosenSize) || chart[0];

    // Build comparison table
    const measurementComparison = [
      {
        part: 'Cân nặng',
        userValue: weight,
        recommendedRange: `${matchedRow.weightRange}`,
        status:
          weight >= parseRange(matchedRow.weightRange)[0] && weight <= parseRange(matchedRow.weightRange)[1]
            ? ('perfect' as const)
            : weight < parseRange(matchedRow.weightRange)[0]
            ? ('loose' as const)
            : ('tight' as const),
      },
      {
        part: product.category === 'quan-jeans' ? 'Vòng eo' : 'Vòng ngực',
        userValue: product.category === 'quan-jeans' ? waist : chest,
        recommendedRange: `${product.category === 'quan-jeans' ? matchedRow.waist : matchedRow.chest} cm`,
        status: 'perfect' as const,
      },
      {
        part: 'Vòng mông',
        userValue: hips,
        recommendedRange: `${matchedRow.hips} cm`,
        status: 'perfect' as const,
      },
    ];

    let reason = '';
    const fitLabel = preference === 'loose' ? 'rộng rãi' : preference === 'snug' ? 'ôm gọn' : 'vừa vặn';

    const rawScore = Math.max(0, Math.round(100 - scores[0].diff * 2));
    const confidenceScore = Math.min(95, rawScore);

    if (confidenceScore < 50) {
      reason = `Số đo của bạn (${height}cm, ${weight}kg) có độ lệch lớn so với bảng size tiêu chuẩn (${chosenSize}). Bạn nên liên hệ chuyên viên may đo để được tư vấn phom dáng vừa vặn nhất.`;
    } else if (alternativeSize && alternativeSize !== chosenSize) {
      reason = `Số đo của bạn (${height}cm, ${weight}kg) nằm ở vùng giao thoa giữa ${alternativeSize} và ${chosenSize}. Với sở thích mặc ${fitLabel}, size ${chosenSize} sẽ đem lại độ cử động thoải mái nhất ở nách áo và vòng bụng, không lo bị chật hay kích khi ngồi.`;
    } else {
      reason = `Dựa trên số đo ${height}cm, ${weight}kg cùng chỉ số ngực/eo, size ${chosenSize} là kích thước chuẩn xác nhất, đảm bảo form áo đứng đẹp và tôn vinh vóc dáng.`;
    }

    return {
      recommendedSize: chosenSize,
      alternativeSize: alternativeSize !== chosenSize ? alternativeSize : undefined,
      confidenceScore,
      fitType: preference,
      reason,
      measurementComparison,
    };
  };

  return (
    <BodyProfileContext.Provider
      value={{
        profiles,
        activeProfileId,
        setActiveProfileId,
        activeProfile,
        addProfile,
        updateProfile,
        deleteProfile,
        setDefaultProfile,
        tempProfile,
        setTempProfile,
        calculateSizeRecommendation,
      }}
    >
      {children}
    </BodyProfileContext.Provider>
  );
};

export const useBodyProfile = () => {
  const context = useContext(BodyProfileContext);
  if (!context) {
    throw new Error('useBodyProfile must be used within a BodyProfileProvider');
  }
  return context;
};
