import { UserAccount } from '@/types';

// Danh sách tài khoản chuẩn đồng bộ 100% với bảng `taikhoan` trên Supabase & PostgreSQL thật
export const mockUsers: UserAccount[] = [
  {
    id: 'usr_1',
    name: 'Trần Văn Bình',
    email: 'binh98@gmail.com',
    phone: '0901234567',
    role: 'admin',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-10-11',
    addresses: []
  },
  {
    id: 'usr_2',
    name: 'Nguyễn Khánh Linh',
    email: 'linhkhanh@gmail.com',
    phone: '0902345678',
    role: 'manager',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-10-11',
    addresses: []
  },
  {
    id: 'usr_3',
    name: 'Lê Đức Anh',
    email: 'ldanh@gmail.com',
    phone: '0903456789',
    role: 'manager',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-10-11',
    addresses: []
  },
  {
    id: 'usr_4',
    name: 'Nguyễn Cao Quốc Khánh',
    email: 'quockhanh06@gmail.com',
    phone: '0582592501',
    role: 'customer',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-10-11',
    addresses: []
  },
  {
    id: 'usr_5',
    name: 'Trương Khánh Ngân',
    email: 'kngann05@gmail.com',
    phone: '0374925497',
    role: 'customer',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-10-11',
    addresses: []
  },
  {
    id: 'usr_7',
    name: 'Nguyễn Kiều Duyên',
    email: 'kieuduyen@gmail.com',
    phone: '0903456789',
    role: 'admin',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-10-11',
    addresses: []
  },
  {
    id: 'usr_8',
    name: 'Trần Minh Anh',
    email: 'minhanh@gmail.com',
    phone: '0912345678',
    role: 'customer',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-10-11',
    addresses: []
  },
  {
    id: 'usr_9',
    name: 'Nguyễn Thị Lan',
    email: 'lannguyen@gmail.com',
    phone: '0901234567',
    role: 'customer',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-10-11',
    addresses: []
  },
  {
    id: 'usr_10',
    name: 'Lê Hoàng Nam',
    email: 'hoangnamle@gmail.com',
    phone: '0934567890',
    role: 'customer',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-10-11',
    addresses: []
  },
  {
    id: 'usr_13',
    name: 'Toàn Nho',
    email: 'harrytran791@gmail.com',
    phone: '0977889900',
    role: 'admin',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-10-11',
    addresses: []
  }
];
