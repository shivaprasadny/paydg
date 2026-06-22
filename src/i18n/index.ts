// src/i18n/index.ts
// ---------------------------------------------------------
// PayDG i18n
// English-only translation catalog.
// ---------------------------------------------------------

import { I18n } from "i18n-js";

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

});

i18n.enableFallback = true;

/* ---------------------------------------------------------
   Init
--------------------------------------------------------- */
export async function initLanguage() {
  i18n.locale = "en";
}

/* ---------------------------------------------------------
   Set / Get
--------------------------------------------------------- */
export function getLanguage(): "en" {
  return "en";
}

/* ---------------------------------------------------------
   Translate
   Supports params like: t("delete_workplace_msg", { name: "Don Giovanni" })
--------------------------------------------------------- */
export function t(key: string, params?: Record<string, any>) {
  return i18n.t(key, params);
}
