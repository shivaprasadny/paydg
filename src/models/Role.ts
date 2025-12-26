export type Role = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;

  // Optional defaults (override workplace/settings)
  defaultHourlyWage?: number;
  defaultBreakMinutes?: number;
  defaultUnpaidBreak?: boolean;
};
