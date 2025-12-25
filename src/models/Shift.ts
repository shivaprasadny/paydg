export type Shift = {
  id: string;
  workplaceId: string;
  shiftDate: string;     // YYYY-MM-DD
  startTs: string;       // ISO
  endTs: string;         // ISO
  role: string;
  hourlyWage: number;
  lunchDeducted: boolean;
  cashTips: number;
  creditTips: number;
  notes?: string | null;

  workedMinutes: number;
  hourlyPay: number;
  totalTips: number;
  totalEarned: number;

  createdAt: string;
  updatedAt: string;
};
