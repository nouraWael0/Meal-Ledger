// app.js
// -----------------------------------------------------------------------
// Single continuous page: days stack from oldest (top) to newest
// (bottom), same pattern as the Calorie Ledger project. No budget, no
// locking — just add meals, see the day's running total.
// -----------------------------------------------------------------------

let state = null;
const root = document.getElementById("app");

// Which day's "add meal" form is currently open (by date string), or
// null if none. Transient UI state, not persisted.
let openFormDate = null;

// The open form's current field values — kept here (not just in the
// DOM) so a meal-type selection, which triggers a re-render, doesn't
// wipe out whatever the person already typed.
let formState = { mealType: "Snack", customName: "", calories: "" };

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Customize"];

// ---------- Entry point ----------
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

// ---------- Render a single day block ----------
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

// ---------- Render the "add a meal" form for a given day ----------
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

// ---------- Full render ----------
function render() {
  const sortedDays = [...state.days].sort((a, b) => a.date.localeCompare(b.date));
  const blocks = sortedDays.map((day) => renderDayBlock(day)).join("");

  root.innerHTML = `<div class="ledger">${blocks}</div>`;
  attachEvents();

  if (!openFormDate) {
    window.scrollTo(0, document.body.scrollHeight);
  }
}

// ---------- Events ----------
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
  // Capture whatever's already typed before the re-render wipes the DOM.
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
  const meal = day.meals[index];

  const confirmed = confirm(`Delete "${meal.name}" (${fmt(meal.calories)} cal)?`);
  if (!confirmed) return;

  day.meals.splice(index, 1);
  Storage.save(state);
  render();
}

init();
