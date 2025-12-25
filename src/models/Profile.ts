export type Profile = {
  id: 1;
  userName: string;
  createdAt: string;
  updatedAt: string;

    // Defaults for Add Shift
  defaultHourlyWage?: number;
  defaultBreakMinutes?: number;
  defaultUnpaidBreak?: boolean;
};
