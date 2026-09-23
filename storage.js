// storage.js
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

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  getDayName(date) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  },

  parseDateStr(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  },

  createDay(date) {
    return {
      date: this.formatDate(date),
      dayName: this.getDayName(date),
      meals: [],
    };
  },

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

  // تم التعديل: تضاف كل وجبة أو سناك في سطر مستقل دون دمج
  addMeal(day, name, calories) {
    day.meals.push({ name, calories });
  },

  addPreviousDay(state) {
    const sorted = [...state.days].sort((a, b) => a.date.localeCompare(b.date));
    const oldestDateStr = sorted.length > 0 ? sorted[0].date : this.formatDate(new Date());
    const oldestDate = this.parseDateStr(oldestDateStr);
    oldestDate.setDate(oldestDate.getDate() - 1);
    this.findOrCreateDay(state, oldestDate);
    this.save(state);
  },

  addNextDay(state) {
    const sorted = [...state.days].sort((a, b) => a.date.localeCompare(b.date));
    const newestDateStr = sorted.length > 0 ? sorted[sorted.length - 1].date : this.formatDate(new Date());
    const newestDate = this.parseDateStr(newestDateStr);
    newestDate.setDate(newestDate.getDate() + 1);
    this.findOrCreateDay(state, newestDate);
    this.save(state);
  }
};