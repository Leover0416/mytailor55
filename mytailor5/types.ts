
export interface Order {
  id: string;
  customerName: string; // 顾客姓名或单号
  createdAt: number;
  completedAt?: number; // 发货/完成时间
  images: string[]; // 改为图片数组，支持多图
  note: string;
  price: number;
  status: 'pending' | 'completed';
  source?: 'online' | 'offline'; // 来源：线上(相册) 或 线下(拍照)
  tags?: string[];
}

export type ViewState = 'dashboard' | 'add' | 'list' | 'settings';

export interface DailyStat {
  date: string;
  total: number;
  count: number;
}
