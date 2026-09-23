// storage.js
// -----------------------------------------------------------------------
// Data model: state.days is an array of day objects, each holding a list
// of logged meals. No budget, no target, no locking — just a running
// log with a daily total.
//
//   day = {
//     date: "2026-09-23",       // YYYY-MM-DD, in the LOCAL timezone
//     dayName: "Wednesday",
//     meals: [ { name: "Breakfast", calories: 450 }, ... ]
//   }
//
// Logging the same meal name twice in one day merges into the existing
// row and sums the calories, rather than creating a duplicate row.
// -----------------------------------------------------------------------

const STORAGE_KEY = "mealLedgerState";

const Storage = {
  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse saved state:", e);
      return null;
    }
  },

  save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  // Local-timezone-safe date formatting (avoids the classic bug where
  // toISOString() shifts the date by rendering it in UTC).
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  getDayName(date) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  },

  createDay(date) {
    return {
      date: this.formatDate(date),
      dayName: this.getDayName(date),
      meals: [],
    };
  },

  // Finds today's (or any date's) day entry, creating it if it doesn't
  // exist yet. Always pass a real Date object — never a re-parsed
  // string — so the date/day-name never drift across timezones.
  findOrCreateDay(state, date) {
    const dateStr = this.formatDate(date);
    let day = state.days.find((d) => d.date === dateStr);
    if (!day) {
      day = this.createDay(date);
      state.days.push(day);
    }
    return day;
  },

  getDayTotal(day) {
    return day.meals.reduce((sum, m) => sum + m.calories, 0);
  },

  // Adds calories to a meal, merging into an existing same-named entry
  // for that day (case-insensitive) instead of creating a duplicate row.
  addMeal(day, name, calories) {
    const existing = day.meals.find((m) => m.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.calories += calories;
    } else {
      day.meals.push({ name, calories });
    }
  },
};
