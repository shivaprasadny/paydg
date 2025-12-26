// src/i18n/index.ts
// ---------------------------------------------------------
// PayDG i18n
// ✅ English + Spanish
// ✅ Persist selected language
// ✅ Reactive updates across screens
// ---------------------------------------------------------

import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18n } from "i18n-js";
import { notifyLanguageChanged } from "./langStore";

const LANG_KEY = "paydg_lang_v1";

const i18n = new I18n({
  en: {
    /* ---------------- Common ---------------- */
    home: "Home",
    hi: "Hi",
    save: "Save",
    cancel: "Cancel",
    saved: "Saved",
    edit: "Edit",
    delete: "Delete",
    update: "Update",
    clear: "Clear",
    continue: "Continue",

    /* ---------------- Language ---------------- */
    language: "Language",
    english: "English",
    spanish: "Español",

    /* ---------------- Home ---------------- */
    quick_stats: "Quick Stats",
    today: "Today",
    this_week: "This Week",
    this_month: "This Month",
    last_shift: "Last Shift",
    no_shifts: "No shifts yet. Add your first shift.",
    tap_to_edit_shift: "Tap to edit this shift",
    tip_defaults: "Tip: Set defaults in Settings — Add Shift auto-fills.",

    add_shift: "➕ Add Shift",
    entries: "📒 Entries",
    history: "🧾 History",
    stats: "📊 Stats",
    manage_workplaces: "🏢 Manage Workplaces",
    roles_btn: "🧑‍🍳 Roles",
    settings_btn: "⚙️ Settings",
    about_btn: "ℹ️ About Us",

    /* ---------------- Settings ---------------- */
    settings_title: "Settings",
    user: "User",
    your_name: "Your name",
    defaults_for_add_shift: "Defaults for Add Shift",
    default_hourly_wage: "Default hourly wage",
    default_break_minutes: "Default break minutes",
    default_deduct_unpaid_break: "Default: deduct unpaid break",
    defaults_helper: "These values auto-fill the Add Shift screen.",
    name_required: "Name required",
    name_required_msg: "Please enter at least 2 characters.",

    /* ---------------- About ---------------- */
    about_title: "About PayDG",
    about_what_title: "What this app does",
    about_what_body:
      "Track shifts, hours, tips (cash + card), and earnings. Save history and view weekly/monthly stats.",
    about_dev_title: "Developer",
    about_dev_body:
      "Built by Shiva Prasad. Made for restaurant workers to quickly calculate income and stay organized.",
    about_updates_title: "Feature updates",
    about_tip: "Tip: Keep the app updated for new features.",

    /* ---------------- Workplaces ---------------- */
    workplaces_title: "Workplaces",
    workplace_name: "Workplace name",
    add_workplace: "Add Workplace",
    delete_workplace_q: "Delete workplace?",
    delete_workplace_msg:
      'Delete "{name}" and all shifts under it? This cannot be undone.',
    workplace_name_required: "Workplace name required",
    workplace_name_required_msg: "Please enter at least 2 characters.",

    /* ---------------- Roles ---------------- */
    roles_title: "Roles",
    role_name: "Role name",
    add_role: "Add Role",
    delete_role_q: "Delete role?",
    delete_role_msg: 'Delete "{name}"? This cannot be undone.',
    role_name_required: "Role name required",
    role_name_required_msg: "Please enter at least 2 characters.",
    no_roles_helper: "No roles yet. Add Server / Bartender / Runner etc.",

// ---- Shifts / Add Shift ----
add_shift_title: "Add Shift",
edit_shift_title: "Edit Shift",
date: "Date",
start_time: "Start time",
end_time: "End time",
workplace: "Workplace",
role: "Role",
select_workplace: "Select workplace",
select_role: "Select role",
hourly_wage: "Hourly wage",
cash_tips: "Cash tips",
credit_tips: "Credit tips",
unpaid_break: "Unpaid break",
break_minutes: "Break minutes",
note: "Note",
save_shift: "Save shift",
update_shift: "Update shift",
pick: "Pick",
close: "Close",

err_missing_workplace: "Workplace required",
err_missing_workplace_msg: "Please select a workplace.",
err_invalid_time: "Time invalid",
err_invalid_time_msg: "End time must be after start time (overnight allowed).",

// ---- History / Entries ----
history_title: "History",
entries_title: "Entries",
refresh: "Refresh",
loading: "Loading...",
no_shifts_yet: "No shifts yet. Add your first shift.",
hold_to_delete: "Hold to delete",
delete_shift_q: "Delete shift?",
delete_shift_msg: "This cannot be undone.",

// ---- Stats ----
stats_title: "Stats",
today_total: "Today total",
week_total: "Week total",
month_total: "Month total",
year_total: "Year total",
hours: "Hours",
tips: "Tips",
wage_total: "Wage",
earned: "Earned",
select_week: "Select week",
select_month: "Select month",
select_year: "Select year",


  },

  es: {
    /* ---------------- Common ---------------- */
    home: "Inicio",
    hi: "Hola",
    save: "Guardar",
    cancel: "Cancelar",
    saved: "Guardado",
    edit: "Editar",
    delete: "Eliminar",
    update: "Actualizar",
    clear: "Limpiar",
    continue: "Continuar",




    /* ---------------- Language ---------------- */
    language: "Idioma",
    english: "Inglés",
    spanish: "Español",

    /* ---------------- Home ---------------- */
    quick_stats: "Resumen rápido",
    today: "Hoy",
    this_week: "Esta semana",
    this_month: "Este mes",
    last_shift: "Último turno",
    no_shifts: "Todavía no hay turnos. Agrega tu primer turno.",
    tap_to_edit_shift: "Toca para editar este turno",
    tip_defaults:
      "Tip: Ajusta valores en Configuración — Agregar Turno se rellena solo.",

    add_shift: "➕ Agregar turno",
    entries: "📒 Entradas",
    history: "🧾 Historial",
    stats: "📊 Estadísticas",
    manage_workplaces: "🏢 Lugares de trabajo",
    roles_btn: "🧑‍🍳 Roles",
    settings_btn: "⚙️ Configuración",
    about_btn: "ℹ️ Sobre la app",

    /* ---------------- Settings ---------------- */
    settings_title: "Configuración",
    user: "Usuario",
    your_name: "Tu nombre",
    defaults_for_add_shift: "Valores por defecto (Agregar Turno)",
    default_hourly_wage: "Salario por hora (por defecto)",
    default_break_minutes: "Minutos de descanso (por defecto)",
    default_deduct_unpaid_break:
      "Por defecto: descontar descanso no pagado",
    defaults_helper: "Estos valores rellenan automáticamente Agregar Turno.",
    name_required: "Nombre requerido",
    name_required_msg: "Ingresa al menos 2 caracteres.",

    /* ---------------- About ---------------- */
    about_title: "Sobre PayDG",
    about_what_title: "Qué hace esta app",
    about_what_body:
      "Registra turnos, horas, propinas (efectivo + tarjeta) y ganancias. Guarda historial y ve estadísticas semanales/mensuales.",
    about_dev_title: "Desarrollador",
    about_dev_body:
      "Creado por Shiva Prasad. Hecho para trabajadores de restaurantes para calcular ingresos rápido y organizarse.",
    about_updates_title: "Actualizaciones",
    about_tip: "Tip: Mantén la app actualizada para nuevas funciones.",

    /* ---------------- Workplaces ---------------- */
    workplaces_title: "Lugares de trabajo",
    workplace_name: "Nombre del lugar",
    add_workplace: "Agregar lugar",
    delete_workplace_q: "¿Eliminar lugar?",
    delete_workplace_msg:
      '¿Eliminar "{name}" y todos los turnos de este lugar? No se puede deshacer.',
    workplace_name_required: "Nombre requerido",
    workplace_name_required_msg: "Ingresa al menos 2 caracteres.",

    /* ---------------- Roles ---------------- */
    roles_title: "Roles",
    role_name: "Nombre del rol",
    add_role: "Agregar rol",
    delete_role_q: "¿Eliminar rol?",
    delete_role_msg: '¿Eliminar "{name}"? No se puede deshacer.',
    role_name_required: "Nombre requerido",
    role_name_required_msg: "Ingresa al menos 2 caracteres.",
    no_roles_helper:
      "Todavía no hay roles. Agrega Mesero / Bartender / Runner, etc.",


// ---- Turnos / Agregar Turno ----
add_shift_title: "Agregar turno",
edit_shift_title: "Editar turno",
date: "Fecha",
start_time: "Hora inicio",
end_time: "Hora fin",
workplace: "Lugar",
role: "Rol",
select_workplace: "Seleccionar lugar",
select_role: "Seleccionar rol",
hourly_wage: "Pago por hora",
cash_tips: "Propina efectivo",
credit_tips: "Propina tarjeta",
unpaid_break: "Descanso no pagado",
break_minutes: "Minutos descanso",
note: "Nota",
save_shift: "Guardar turno",
update_shift: "Actualizar turno",
pick: "Elegir",
close: "Cerrar",

err_missing_workplace: "Falta lugar",
err_missing_workplace_msg: "Selecciona un lugar de trabajo.",
err_invalid_time: "Hora inválida",
err_invalid_time_msg: "La hora de fin debe ser después del inicio (se permite noche).",

// ---- Historial / Entradas ----
history_title: "Historial",
entries_title: "Entradas",
refresh: "Actualizar",
loading: "Cargando...",
no_shifts_yet: "Todavía no hay turnos. Agrega tu primer turno.",
hold_to_delete: "Mantén para borrar",
delete_shift_q: "¿Eliminar turno?",
delete_shift_msg: "No se puede deshacer.",

// ---- Estadísticas ----
stats_title: "Estadísticas",
today_total: "Total de hoy",
week_total: "Total semana",
month_total: "Total mes",
year_total: "Total año",
hours: "Horas",
tips: "Propinas",
wage_total: "Salario",
earned: "Ganado",
select_week: "Elegir semana",
select_month: "Elegir mes",
select_year: "Elegir año",


  },
});

i18n.enableFallback = true;

/* ---------------------------------------------------------
   Init
--------------------------------------------------------- */
export async function initLanguage() {
  const saved = await AsyncStorage.getItem(LANG_KEY);
  if (saved) {
    i18n.locale = saved;
    return;
  }

  const device = Localization.getLocales()?.[0]?.languageCode ?? "en";
  i18n.locale = device.startsWith("es") ? "es" : "en";
}

/* ---------------------------------------------------------
   Set / Get
--------------------------------------------------------- */
export async function setLanguage(locale: "en" | "es") {
  i18n.locale = locale;
  await AsyncStorage.setItem(LANG_KEY, locale);

  // ✅ Force all screens to re-render
  notifyLanguageChanged();
}

export function getLanguage(): "en" | "es" {
  return i18n.locale?.startsWith("es") ? "es" : "en";
}

/* ---------------------------------------------------------
   Translate
   Supports params like: t("delete_workplace_msg", { name: "Don Giovanni" })
--------------------------------------------------------- */
export function t(key: string, params?: Record<string, any>) {
  return i18n.t(key, params);
}
