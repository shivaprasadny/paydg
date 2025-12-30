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


    // ===== Profile =====
  profile_create_title: "Create your profile",
  profile_create_sub: "This helps personalize your app experience.",
  name_placeholder: "Enter your name",
  profile_tip: "You can change this later in Settings.",

  


  profile_created: "Your profile has been saved successfully.",

 
  // keep existing keys below
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

    /* ---- History / Entries ---- */
    history_title: "History",
    entries_title: "Entries",

    totals: "Totals",
    refresh: "Refresh",
    loading: "Loading...",
    no_shifts_yet: "No shifts yet. Add your first shift.",

    tips_label: "Tips",
    wage_label: "Wage",
    hold_to_delete: "Hold to delete",

    delete_shift_q: "Delete shift?",
    delete_shift_msg: "This cannot be undone.",

    // ✅ Footer hint (correct key)
    history_footer_hint: "Tip: Tap a shift to edit. Long-press to delete.",
    // ✅ Backwards-compatible typo key (so nothing breaks)
    history_footrt_hint: "Tip: Tap a shift to edit. Long-press to delete.",

    day_title: "Day",
    totals_title: "Totals",
    shifts: "Shifts",
    cash: "Cash",
    card: "Card",
    total: "Total",
    no_shifts_for_day: "No shifts for this day.",
    tap_shift_to_edit: "Tap any shift to edit.",
    workplace_fallback: "Workplace",

    /* ---- Edit Role ---- */
    edit_role_title: "Edit Role",
    role_not_found: "Role not found.",
    go_back: "Go back",
    role_updated: "Role updated ✅",
    delete_role_help:
      "This will remove it from Roles list. Old shifts will still keep roleName saved.",
    basics: "Basics",
    role_name_placeholder: "e.g. Server",
    defaults_optional: "Defaults (optional)",
    use_role_defaults: "Use role defaults",
    role_defaults_help: "If enabled, Add Shift will auto-fill from Role first.",
    leave_blank_fallback: "Leave blank to use Workplace/Settings",
    delete_role_btn: "Delete Role",

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

    /* ---- Shifts / Add Shift ---- */
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

    /* ---- Stats ---- */
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

    profile_title: "Profile",
    edit_profile_title: "Edit Profile",

    edit_workplace_title: "Edit Workplace",
    day_details_title: "Day Details",
    week_details_title: "Week Details",
    more_title: "More",

    no_role: "No role",
    add_roles_hint: "Add roles in Home → Roles.",
    shift_date_title: "Shift Date",

    saved_as: "Saved as:",
    shift_time: "Shift time",

    deduct_unpaid_break: "Deduct unpaid break",

    pay_tips_title: "Pay & Tips",

    enter_hourly_wage: "Please enter your hourly wage.",
    eg_15: "e.g. 15",

    card_tips: "Card tips",

    note_placeholder: "Optional note…",
    preview: "Preview",

    hourly_pay: "Hourly pay",

    shift_saved: "Shift saved ✅",
    end_after_start: "End time must be after start time.",
    error: "Error",
    shift_save_failed: "Could not save shift. Please try again.",
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

    /* ---- History / Entries ---- */
    history_title: "Historial",
    entries_title: "Entradas",

    totals: "Totales",
    today: "Hoy",
    this_week: "Esta semana",
    this_month: "Este mes",
    shifts: "Turnos",
    tips_label: "Propinas",
    wage_label: "Salario",
    hold_to_delete: "Mantén presionado para borrar",
    no_shifts: "No hay turnos",
    refresh: "Actualizar",
    loading: "Cargando...",
    no_shifts_yet: "Todavía no hay turnos. Agrega tu primer turno.",

    delete_shift_q: "¿Eliminar turno?",
    delete_shift_msg: "No se puede deshacer.",

    // ✅ Footer hint (correct key)
    history_footer_hint: "Tip: Toca un turno para editar. Mantén presionado para eliminar.",
    // ✅ Backwards-compatible typo key
    history_footrt_hint: "Tip: Toca un turno para editar. Mantén presionado para eliminar.",

    /* ---- Day details ---- */
    day_title: "Día",
    totals_title: "Totales",
    cash: "Efectivo",
    card: "Tarjeta",
    total: "Total",
    no_shifts_for_day: "No hay turnos para este día.",
    tap_shift_to_edit: "Toca cualquier turno para editar.",
    workplace_fallback: "Lugar",

    /* ---- Edit Role ---- */
    edit_role_title: "Editar rol",
    role_not_found: "Rol no encontrado.",
    go_back: "Volver",
    role_updated: "Rol actualizado ✅",
    delete_role_help:
      "Esto lo elimina de la lista de Roles. Los turnos viejos seguirán guardando el nombre del rol.",
    basics: "Básico",
    role_name_placeholder: "Ej. Mesero",
    defaults_optional: "Valores por defecto (opcional)",
    use_role_defaults: "Usar valores por defecto del rol",
    role_defaults_help: "Si está activado, Agregar Turno se rellenará primero desde el Rol.",
    leave_blank_fallback: "Déjalo vacío para usar Lugar/Configuración",
    delete_role_btn: "Eliminar rol",

    /* ---------------- Language ---------------- */
    language: "Idioma",
    english: "Inglés",
    spanish: "Español",

    /* ---------------- Home ---------------- */
    quick_stats: "Resumen rápido",
    last_shift: "Último turno",
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

    /* ---- Shifts / Add Shift ---- */
    add_shift_title: "Agregar turno",
    edit_shift_title: "Editar turno",
    date: "Fecha",
    start_time: "Hora de inicio",
    end_time: "Hora de fin",
    workplace: "Lugar de trabajo",
    role: "Rol",
    select_workplace: "Seleccionar lugar",
    select_role: "Seleccionar rol",
    hourly_wage: "Pago por hora",
    cash_tips: "Propinas en efectivo",
    credit_tips: "Propina tarjeta",
    unpaid_break: "Descanso no pagado",
    break_minutes: "Minutos de descanso",
    note: "Nota",
    save_shift: "Guardar turno",
    update_shift: "Actualizar turno",
    pick: "Elegir",
    close: "Cerrar",

    err_missing_workplace: "Falta lugar",
    err_missing_workplace_msg: "Selecciona un lugar de trabajo.",
    err_invalid_time: "Hora inválida",
    err_invalid_time_msg: "La hora de fin debe ser después del inicio (se permite noche).",

    /* ---- Stats ---- */
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

    profile_title: "Perfil",
    edit_profile_title: "Editar perfil",

    edit_workplace_title: "Editar lugar",
    day_details_title: "Detalle del día",
    week_details_title: "Detalle de la semana",
    more_title: "Más",

    no_role: "Sin rol",
    add_roles_hint: "Agrega roles en Inicio → Roles.",
    shift_date_title: "Fecha del turno",

    saved_as: "Guardado como:",
    shift_time: "Horario del turno",

    deduct_unpaid_break: "Descontar descanso no pagado",

    pay_tips_title: "Pago y propinas",

    enter_hourly_wage: "Por favor ingresa tu pago por hora.",
    eg_15: "ej. 15",

    card_tips: "Propinas con tarjeta",

    note_placeholder: "Nota opcional…",
    preview: "Vista previa",

    hourly_pay: "Pago por horas",

    shift_saved: "Turno guardado ✅",
    end_after_start: "La hora de fin debe ser después de la hora de inicio.",
    error: "Error",
    shift_save_failed: "No se pudo guardar el turno. Inténtalo de nuevo.",
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
