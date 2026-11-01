export interface BodyProfile {
  id: number;
  user_id: number;
  height_cm: number;
  weight_kg: number;
  bust_cm?: number;
  waist_cm?: number;
  hip_cm?: number;
  shape_type?: string;
  fit_preference?: 'snug' | 'comfortable' | 'loose';
  updated_at: Date;
}
