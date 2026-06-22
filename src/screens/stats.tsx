// src/screens/stats.tsx
// ---------------------------------------------------------
// PayDG — Stats Screen
// Weekly = Monday to Sunday
// Shows Week / Month / Year stats
// Includes workplace filter and previous-period comparison
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useFocusEffect, useRouter } from "expo-router";

import { listWorkplaces } from "../storage/repositories/workplaceRepo";
import Screen from "../components/Screen";

type Shift = {
  id: string;
  workplaceId: string;
  workplaceName?: string;
  isoDate: string;
  startISO: string;
  endISO: string;
  unpaidBreak: boolean;
  breakMinutes: number;
  hourlyWage: number;
  cashTips: number;
  creditTips: number;
  workedMinutes: number;
  workedHours: number;
  hourlyPay: number;
  totalTips: number;
  totalEarned: number;
  note?: string;
  createdAt: string;
};

type Mode = "week" | "month" | "year";

const STORAGE_KEY = "paydg_shifts_v1";

/* =========================
   DATE HELPERS
========================= */

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);

  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;

  x.setDate(x.getDate() + diff);
  return x;
}

function endOfWeekSunday(d: Date) {
  const start = startOfWeekMonday(d);
  const end = new Date(start);

  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return end;
}

function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfYear(d: Date) {
  const x = new Date(d.getFullYear(), 0, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfYear(d: Date) {
  const x = new Date(d.getFullYear(), 11, 31);
  x.setHours(23, 59, 59, 999);
  return x;
}

function fmtRange(a: Date, b: Date) {
  const sameYear = a.getFullYear() === b.getFullYear();
  const sameMonth = a.getMonth() === b.getMonth();

  const aText = a.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });

  const bText = b.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });

  return `${aText} – ${bText}`;
}

function fmtMonth(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function fmtMoney(n: number) {
  const val = Number.isFinite(n) ? n : 0;
  return `$${val.toFixed(2)}`;
}

/* =========================
   TOTALS / CHANGE HELPERS
========================= */

function computeTotals(shifts: Shift[]) {
  const workedMinutes = shifts.reduce((s, x) => s + (x.workedMinutes || 0), 0);
  const hours = Number((workedMinutes / 60).toFixed(2));

  const cash = shifts.reduce((s, x) => s + (x.cashTips || 0), 0);
  const card = shifts.reduce((s, x) => s + (x.creditTips || 0), 0);
  const wage = shifts.reduce((s, x) => s + (x.hourlyPay || 0), 0);
  const total = shifts.reduce((s, x) => s + (x.totalEarned || 0), 0);

  return {
    shiftsCount: shifts.length,
    hours,
    cash: Number(cash.toFixed(2)),
    card: Number(card.toFixed(2)),
    tips: Number((cash + card).toFixed(2)),
    wage: Number(wage.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

function calcChangePct(current: number, prev: number) {
  const cur = Number.isFinite(current) ? current : 0;
  const p = Number.isFinite(prev) ? prev : 0;

  if (p === 0) {
    if (cur === 0) return { dir: "flat" as const, pctText: "0.0%" };
    return { dir: "up" as const, pctText: "New" };
  }

  const diff = cur - p;
  const pct = (diff / p) * 100;

  const dir =
    diff > 0 ? ("up" as const) : diff < 0 ? ("down" as const) : ("flat" as const);

  return { dir, pctText: `${Math.abs(pct).toFixed(1)}%` };
}

/* =========================
   SMALL COMPONENTS
========================= */

function ChangeBadge({ current, prev }: { current: number; prev: number }) {
  const { dir, pctText } = calcChangePct(current, prev);

  if (dir === "up") {
    return (
      <View style={[styles.changePill, styles.changeUp]}>
        <Text style={[styles.changeText, styles.changeUpText]}>↑ {pctText}</Text>
      </View>
    );
  }

  if (dir === "down") {
    return (
      <View style={[styles.changePill, styles.changeDown]}>
        <Text style={[styles.changeText, styles.changeDownText]}>↓ {pctText}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.changePill, styles.changeFlat]}>
      <Text style={[styles.changeText, styles.changeFlatText]}>— {pctText}</Text>
    </View>
  );
}

function TotalRow({
  label,
  value,
  current,
  prev,
  highlight,
}: {
  label: string;
  value: string;
  current: number;
  prev: number;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.totalRow, highlight && styles.totalRowHighlight]}>
      <View>
        <Text style={[styles.totalLabel, highlight && styles.totalLabelHighlight]}>
          {label}
        </Text>
        <Text style={styles.compareText}>vs previous period</Text>
      </View>

      <View style={styles.totalRight}>
        <Text style={[styles.totalValue, highlight && styles.totalValueHighlight]}>
          {value}
        </Text>
        <ChangeBadge current={current} prev={prev} />
      </View>
    </View>
  );
}

function ModeTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

/* =========================
   MAIN SCREEN
========================= */

export default function StatsScreen() {
  const router = useRouter();

  const workplaces = useMemo(() => listWorkplaces(), []);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);

  const [mode, setMode] = useState<Mode>("week");
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());

  const [pickerOpen, setPickerOpen] = useState(false);
  const [workplaceId, setWorkplaceId] = useState<string>("ALL");
  const [workplaceModal, setWorkplaceModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadStats() {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const arr: Shift[] = raw ? JSON.parse(raw) : [];
        setAllShifts(arr);
      }

      loadStats();
    }, [])
  );

  const window = useMemo(() => {
    if (mode === "week") {
      const start = startOfWeekMonday(anchorDate);
      const end = endOfWeekSunday(anchorDate);
      return { start, end, label: fmtRange(start, end) };
    }

    if (mode === "month") {
      const start = startOfMonth(anchorDate);
      const end = endOfMonth(anchorDate);
      return { start, end, label: fmtMonth(anchorDate) };
    }

    const start = startOfYear(anchorDate);
    const end = endOfYear(anchorDate);

    return {
      start,
      end,
      label: String(anchorDate.getFullYear()),
    };
  }, [mode, anchorDate]);

  const prevWindow = useMemo(() => {
    if (mode === "week") {
      const start = startOfWeekMonday(anchorDate);
      const end = endOfWeekSunday(anchorDate);

      start.setDate(start.getDate() - 7);
      end.setDate(end.getDate() - 7);

      return { start, end };
    }

    if (mode === "month") {
      const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, 15);
      return {
        start: startOfMonth(d),
        end: endOfMonth(d),
      };
    }

    const d = new Date(anchorDate.getFullYear() - 1, 0, 1);

    return {
      start: startOfYear(d),
      end: endOfYear(d),
    };
  }, [mode, anchorDate]);

  const filtered = useMemo(() => {
    const min = window.start.getTime();
    const max = window.end.getTime();

    return allShifts.filter((s) => {
      const t = new Date(s.startISO).getTime();

      if (t < min || t > max) return false;
      if (workplaceId !== "ALL" && s.workplaceId !== workplaceId) return false;

      return true;
    });
  }, [allShifts, window.start, window.end, workplaceId]);

  const prevFiltered = useMemo(() => {
    const min = prevWindow.start.getTime();
    const max = prevWindow.end.getTime();

    return allShifts.filter((s) => {
      const t = new Date(s.startISO).getTime();

      if (t < min || t > max) return false;
      if (workplaceId !== "ALL" && s.workplaceId !== workplaceId) return false;

      return true;
    });
  }, [allShifts, prevWindow.start, prevWindow.end, workplaceId]);

  const totals = useMemo(() => computeTotals(filtered), [filtered]);
  const prevTotals = useMemo(() => computeTotals(prevFiltered), [prevFiltered]);

  const workplaceLabel = useMemo(() => {
    if (workplaceId === "ALL") return "All workplaces";

    const w = workplaces.find((x: any) => x.id === workplaceId);
    return w?.name ?? "Workplace";
  }, [workplaceId, workplaces]);

  return (
    <Screen bg="#F6F7FB" pad={0}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>PayDG analytics</Text>
            <Text style={styles.title}>Stats</Text>
          </View>

          <Pressable
            style={styles.filterBtn}
            onPress={() => setWorkplaceModal(true)}
          >
            <Text style={styles.filterText} numberOfLines={1}>
              {workplaceLabel}
            </Text>
          </Pressable>
        </View>

        {/* Mode Tabs */}
        <View style={styles.tabs}>
          <ModeTab label="Week" active={mode === "week"} onPress={() => setMode("week")} />
          <ModeTab label="Month" active={mode === "month"} onPress={() => setMode("month")} />
          <ModeTab label="Year" active={mode === "year"} onPress={() => setMode("year")} />
        </View>

        {/* Selected Range */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selected period</Text>

          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rangeText}>{window.label}</Text>
              <Text style={styles.helper}>
                {mode === "week"
                  ? "Week starts Monday and ends Sunday."
                  : "Pick any date inside the period."}
              </Text>
            </View>

            <Pressable style={styles.pickBtn} onPress={() => setPickerOpen(true)}>
              <Text style={styles.pickBtnText}>Pick</Text>
            </Pressable>
          </View>

          {mode === "week" && (
            <Pressable
              style={styles.viewShiftsBtn}
              onPress={() =>
                router.push({
                  pathname: "/week-details",
                  params: {
                    start: window.start.toISOString(),
                    end: window.end.toISOString(),
                    workplaceId,
                    label: window.label,
                  },
                })
              }
            >
              <Text style={styles.viewShiftsText}>View shifts →</Text>
            </Pressable>
          )}
        </View>

        {/* Main Summary Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total earned</Text>
          <Text style={styles.heroAmount}>{fmtMoney(totals.total)}</Text>

          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMeta}>{totals.shiftsCount} shifts</Text>
            <Text style={styles.heroMeta}>{totals.hours.toFixed(2)}h</Text>
            <ChangeBadge current={totals.total} prev={prevTotals.total} />
          </View>
        </View>

        {/* Totals */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Breakdown</Text>

          <TotalRow
            label="Hours"
            value={`${totals.hours.toFixed(2)}h`}
            current={totals.hours}
            prev={prevTotals.hours}
          />

          <TotalRow
            label="Hourly pay"
            value={fmtMoney(totals.wage)}
            current={totals.wage}
            prev={prevTotals.wage}
          />

          <TotalRow
            label="Cash tips"
            value={fmtMoney(totals.cash)}
            current={totals.cash}
            prev={prevTotals.cash}
          />

          <TotalRow
            label="Card tips"
            value={fmtMoney(totals.card)}
            current={totals.card}
            prev={prevTotals.card}
          />

          <TotalRow
            label="Total tips"
            value={fmtMoney(totals.tips)}
            current={totals.tips}
            prev={prevTotals.tips}
          />

          <TotalRow
            label="Total earned"
            value={fmtMoney(totals.total)}
            current={totals.total}
            prev={prevTotals.total}
            highlight
          />
        </View>

        <Text style={styles.bottomNote}>
          Changes compare this selected period with the previous same period.
        </Text>
      </ScrollView>

      {/* Date Picker */}
      <DateTimePickerModal
        isVisible={pickerOpen}
        mode="date"
        date={anchorDate}
        onConfirm={(d) => {
          setAnchorDate(d);
          setPickerOpen(false);
        }}
        onCancel={() => setPickerOpen(false)}
      />

      {/* Workplace Filter Modal */}
      <Modal transparent visible={workplaceModal} animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setWorkplaceModal(false)}
        >
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>Filter by workplace</Text>

            <Pressable
              onPress={() => {
                setWorkplaceId("ALL");
                setWorkplaceModal(false);
              }}
              style={[
                styles.modalItem,
                workplaceId === "ALL" && styles.modalItemActive,
              ]}
            >
              <Text style={styles.modalItemText}>All workplaces</Text>
            </Pressable>

            {workplaces.map((w: any) => {
              const active = w.id === workplaceId;

              return (
                <Pressable
                  key={w.id}
                  onPress={() => {
                    setWorkplaceId(w.id);
                    setWorkplaceModal(false);
                  }}
                  style={[styles.modalItem, active && styles.modalItemActive]}
                >
                  <Text style={styles.modalItemText}>{w.name}</Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

/* =========================
   PAYDG PREMIUM LIGHT THEME
========================= */

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingBottom: 42,
    gap: 14,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  eyebrow: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
  },
  title: {
    color: "#0F172A",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 2,
  },

  filterBtn: {
    maxWidth: 160,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#1E293B",
  },
  filterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 14,
  },
  tabActive: {
    backgroundColor: "#D97706",
  },
  tabText: {
    color: "#64748B",
    fontWeight: "900",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  rangeText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
  },
  helper: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 5,
  },

  pickBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "#1E293B",
  },
  pickBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  viewShiftsBtn: {
    marginTop: 14,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  viewShiftsText: {
    color: "#D97706",
    fontWeight: "900",
  },

  heroCard: {
    backgroundColor: "#1E293B",
    borderRadius: 28,
    padding: 22,
  },
  heroLabel: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "800",
  },
  heroAmount: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "900",
    marginTop: 8,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  heroMeta: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "800",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  totalRowHighlight: {
    borderBottomWidth: 0,
    marginTop: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  totalLabel: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800",
  },
  totalLabelHighlight: {
    color: "#92400E",
  },
  compareText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  totalRight: {
    alignItems: "flex-end",
    gap: 7,
  },
  totalValue: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
  },
  totalValueHighlight: {
    color: "#92400E",
    fontSize: 19,
  },

  changePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  changeText: {
    fontSize: 12,
    fontWeight: "900",
  },
  changeUp: {
    borderColor: "#86EFAC",
    backgroundColor: "#ECFDF5",
  },
  changeUpText: {
    color: "#15803D",
  },
  changeDown: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  changeDownText: {
    color: "#B91C1C",
  },
  changeFlat: {
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  changeFlatText: {
    color: "#475569",
  },

  bottomNote: {
    color: "#94A3B8",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  modalTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  modalItemActive: {
    borderColor: "#D97706",
    backgroundColor: "#FFF7ED",
  },
  modalItemText: {
    color: "#1E293B",
    fontWeight: "900",
  },
});