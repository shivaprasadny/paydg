export const MONEY_COLORS = {
  background: "#F6F7FB",
  card: "#FFFFFF",
  navy: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  green: "#059669",
  greenSoft: "#ECFDF5",
  red: "#DC2626",
  redSoft: "#FEF2F2",
  amber: "#D97706",
  amberSoft: "#FFF7ED",
  blue: "#2563EB",
  blueSoft: "#EFF6FF",
};

export function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}
