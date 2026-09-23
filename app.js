// app.js
// -----------------------------------------------------------------------
// Single continuous page: days stack from oldest (top) to newest
// (bottom), same pattern as the Calorie Ledger project. No budget, no
// locking — just add meals, see the day's running total.
// -----------------------------------------------------------------------

// app.js
let state = null;
const root = document.getElementById("app");

let openFormDate = null;
let formState = { mealType: "Snack", customName: "", calories: "" };

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Customize"];

function init() {
  state = Storage.load() || { days: [] };
  Storage.findOrCreateDay(state, new Date());
  Storage.save(state);
  render();
}

function fmt(n) {
  return Number(n).toLocaleString("en-US");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderDayBlock(day) {
  const total = Storage.getDayTotal(day);
  const formOpen = openFormDate === day.date;

  const rows = day.meals
    .map(
      (meal, i) => `
        <div class="meal-row">
          <span class="meal-name">${escapeHtml(meal.name)}</span>
          <span class="meal-calories">${fmt(meal.calories)}</span>
          <span class="meal-actions">
            <button class="icon-btn" data-action="edit-meal" data-date="${day.date}" data-index="${i}" title="Edit">✎</button>
            <button class="icon-btn" data-action="delete-meal" data-date="${day.date}" data-index="${i}" title="Delete">×</button>
          </span>
        </div>
      `
    )
    .join("");

  return `
    <section class="day-block">
      <div class="day-header">
        <span>${day.date} · ${day.dayName}</span>
        <button class="icon-btn add-btn" data-action="toggle-add" data-date="${day.date}" title="Add a meal">${formOpen ? "–" : "+"}</button>
      </div>
      ${rows || `<div class="empty-day">No meals logged yet</div>`}
      ${formOpen ? renderAddForm(day.date) : ""}
      <div class="meal-row total-row">
        <span class="meal-name">Total</span>
        <span class="meal-calories">${fmt(total)}</span>
        <span class="meal-actions"></span>
      </div>
    </section>
  `;
}

function renderAddForm(date) {
  const typeButtons = MEAL_TYPES.map(
    (type) => `
      <button
        class="type-btn ${formState.mealType === type ? "selected" : ""}"
        data-action="select-type"
        data-type="${type}"
      >${type}</button>
    `
  ).join("");

  return `
    <div class="add-meal-form">
      <div class="meal-type-buttons">${typeButtons}</div>
      ${
        formState.mealType === "Customize"
          ? `<input type="text" id="mealCustomNameInput" class="text-input" placeholder="Meal name" value="${escapeHtml(formState.customName)}" />`
          : ""
      }
      <div class="form-row">
        <input type="number" id="mealCaloriesInput" class="calories-input" placeholder="Calories" inputmode="numeric" value="${escapeHtml(formState.calories)}" />
        <button class="save-meal-btn" data-action="save-meal" data-date="${date}">Save</button>
      </div>
    </div>
  `;
}

function render() {
  const sortedDays = [...state.days].sort((a, b) => a.date.localeCompare(b.date));
  const blocks = sortedDays.map((day) => renderDayBlock(day)).join("");

  root.innerHTML = `
    <div class="ledger">
      <div class="date-nav-bar">
        <button class="nav-day-btn" data-action="add-prev-day">+ Add Previous Day</button>
      </div>
      
      ${blocks}

      <div class="date-nav-bar">
        <button class="nav-day-btn" data-action="add-next-day">+ Add Next Day</button>
      </div>

      <!-- Export / Import Footer -->
      <footer class="footer-actions">
        <button class="link-btn" data-action="export-data">Export data</button>
        <button class="link-btn" data-action="import-data">Import data</button>
        <button class="link-btn danger" data-action="reset-data">Reset all data</button>
        <input type="file" id="importFileInput" accept=".json" style="display:none;" />
      </footer>
    </div>
  `;

  attachEvents();

  if (!openFormDate) {
    window.scrollTo(0, document.body.scrollHeight);
  }
}

function attachEvents() {
  document.querySelectorAll('[data-action="toggle-add"]').forEach((btn) => {
    btn.addEventListener("click", (e) => handleToggleAddForm(e.currentTarget.dataset.date));
  });

  document.querySelectorAll('[data-action="select-type"]').forEach((btn) => {
    btn.addEventListener("click", (e) => handleSelectMealType(e.currentTarget.dataset.type));
  });

  document.querySelectorAll('[data-action="save-meal"]').forEach((btn) => {
    btn.addEventListener("click", (e) => handleSaveMeal(e.currentTarget.dataset.date));
  });

  document.querySelectorAll('[data-action="edit-meal"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      handleEditMeal(e.currentTarget.dataset.date, parseInt(e.currentTarget.dataset.index, 10));
    });
  });

  document.querySelectorAll('[data-action="delete-meal"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      handleDeleteMeal(e.currentTarget.dataset.date, parseInt(e.currentTarget.dataset.index, 10));
    });
  });

  // أزرار إضافة الأيام
  const prevBtn = document.querySelector('[data-action="add-prev-day"]');
  if (prevBtn) prevBtn.addEventListener("click", () => { Storage.addPreviousDay(state); render(); });

  const nextBtn = document.querySelector('[data-action="add-next-day"]');
  if (nextBtn) nextBtn.addEventListener("click", () => { Storage.addNextDay(state); render(); });

  // أزرار تصدير واستيراد البيانات
  const exportBtn = document.querySelector('[data-action="export-data"]');
  if (exportBtn) exportBtn.addEventListener("click", handleExport);

  const importBtn = document.querySelector('[data-action="import-data"]');
  const fileInput = document.getElementById("importFileInput");
  if (importBtn && fileInput) {
    importBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", handleImport);
  }

  const resetBtn = document.querySelector('[data-action="reset-data"]');
  if (resetBtn) resetBtn.addEventListener("click", handleReset);
}

function handleToggleAddForm(date) {
  if (openFormDate === date) {
    openFormDate = null;
  } else {
    openFormDate = date;
    formState = { mealType: "Snack", customName: "", calories: "" };
  }
  render();
}

function handleSelectMealType(type) {
  const calInput = document.getElementById("mealCaloriesInput");
  const nameInput = document.getElementById("mealCustomNameInput");
  if (calInput) formState.calories = calInput.value;
  if (nameInput) formState.customName = nameInput.value;

  formState.mealType = type;
  render();
}

function handleSaveMeal(date) {
  const calInput = document.getElementById("mealCaloriesInput");
  const nameInput = document.getElementById("mealCustomNameInput");

  const calories = parseInt(calInput.value, 10);
  if (isNaN(calories) || calories < 0) {
    alert("Enter a valid calorie amount.");
    return;
  }

  let mealName = formState.mealType;
  if (formState.mealType === "Customize") {
    mealName = (nameInput.value || "").trim();
    if (!mealName) {
      alert("Enter a name for this meal.");
      return;
    }
  }

  const day = state.days.find((d) => d.date === date);
  Storage.addMeal(day, mealName, calories);

  openFormDate = null;
  Storage.save(state);
  render();
}

function handleEditMeal(date, index) {
  const day = state.days.find((d) => d.date === date);
  const meal = day.meals[index];

  const input = prompt(`Edit calories for ${meal.name}:`, meal.calories);
  if (input === null) return;
  const value = parseInt(input, 10);
  if (isNaN(value) || value < 0) return;

  meal.calories = value;
  Storage.save(state);
  render();
}

function handleDeleteMeal(date, index) {
  const day = state.days.find((d) => d.date === date);

  const confirmed = confirm(`Delete "${day.meals[index].name}"?`);
  if (!confirmed) return;

  day.meals.splice(index, 1);
  Storage.save(state);
  render();
}

// تصدير البيانات (Export)
function handleExport() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const dlAnchorElem = document.createElement("a");
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", `meal-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`);
  dlAnchorElem.click();
}

// استيراد البيانات (Import)
function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      if (imported && Array.isArray(imported.days)) {
        state = imported;
        Storage.save(state);
        render();
        alert("Data imported successfully!");
      } else {
        alert("Invalid file format.");
      }
    } catch (err) {
      alert("Error reading JSON file.");
    }
  };
  reader.readAsText(file);
}

// إعادة ضبط البيانات (Reset)
function handleReset() {
  if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
    state = { days: [] };
    Storage.findOrCreateDay(state, new Date());
    Storage.save(state);
    render();
  }
}

init();