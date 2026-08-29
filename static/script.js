const form = document.getElementById("calc-form");
const hasRoommatesBox = document.getElementById("has-roommates");
const roommatesBlock = document.getElementById("roommates-block");
const roommateRows = document.getElementById("roommate-rows");
const addRoommateBtn = document.getElementById("add-roommate");
// const addExpenseBox = document.getElementById("Expense")
const emptyState = document.getElementById("empty-state");
const errorBox = document.getElementById("error-box");
const resultBox = document.getElementById("result");
const stampEl = document.getElementById("stamp");
const submitBtn = form.querySelector(".btn-stamp-action");
const showExpenseBtn = document.getElementById("show-expense-btn");
const expenseBreakdownBox = document.getElementById("Expense");
const expenseBreakdownBody = document.querySelector("#expense-breakdown-table tbody");

let lastResult = null;

function currency(n) {
  const num = Number(n) || 0;
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function addRoommateRow() {
  const row = document.createElement("div");
  row.className = "roommate-row";
  row.innerHTML = `
    <input type="text" class="rm-name" placeholder="Roommate name">
    <input type="number" class="rm-income" placeholder="Income (optional)" min="0" >
    <button type="button" class="remove-row" aria-label="Remove roommate">✕</button>
  `;
  row.querySelector(".remove-row").addEventListener("click", () => row.remove());
  roommateRows.appendChild(row);
}

hasRoommatesBox.addEventListener("change", () => {
  roommatesBlock.classList.toggle("hidden", !hasRoommatesBox.checked);
  if (hasRoommatesBox.checked && roommateRows.children.length === 0) {
    addRoommateRow();
  }
});
// function addExpenseBox() {
//   const row = document.createElement('div');
//   row.className = "expenseBox"
//   row.innerHTML = `
//     <p>Roshan</p>
//   `;
// }
addRoommateBtn.addEventListener("click", addRoommateRow);

function collectRoommates() {
  return Array.from(roommateRows.querySelectorAll(".roommate-row"))
    .map(row => ({
      name: row.querySelector(".rm-name").value.trim(),
      income: row.querySelector(".rm-income").value || null,
    }))
    .filter(r => r.name);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.classList.add("hidden");

  const payload = {
    income: document.getElementById("income").value,
    rent: document.getElementById("rent").value,
    utilities: document.getElementById("utilities").value,
    food: document.getElementById("food").value,
    transport: document.getElementById("transport").value,
    other: document.getElementById("other").value,
  };

  if (hasRoommatesBox.checked) {
    payload.split_method = document.getElementById("split-method").value;
    payload.roommates = collectRoommates();
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Calculating…";

  try {
    const res = await fetch("/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Something went wrong.");
      return;
    }

    renderResult(data);
  } catch (err) {
    showError("Could not reach the server. Is the Flask app running?");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Calculate";
  }
});

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
  resultBox.classList.add("hidden");
  emptyState.classList.add("hidden");
  lastResult = null;
  expenseBreakdownBox.classList.add("hidden");
  showExpenseBtn.textContent = "Show Expense Breakdown";
}

function renderResult(data) {
  const { affordability, per_person } = data;

  lastResult = data;
  expenseBreakdownBox.classList.add("hidden");
  showExpenseBtn.textContent = "Show Expense Breakdown";

  emptyState.classList.add("hidden");
  errorBox.classList.add("hidden");
  resultBox.classList.remove("hidden");

  stampEl.textContent = affordability.status.toUpperCase();
  stampEl.className = "stamp " + affordability.status.toLowerCase();
  stampEl.style.animation = "none";
  void stampEl.offsetWidth;
  stampEl.style.animation = "";

  document.getElementById("r-percentage").textContent = affordability.rent_percentage + "%";
  document.getElementById("r-total").textContent = currency(affordability.total_expenses);
  document.getElementById("r-remaining").textContent = currency(affordability.remaining);
  document.getElementById("r-tip").textContent = affordability.tip;

  const splitSection = document.getElementById("split-section");
  const splitTableBody = document.querySelector("#split-table tbody");
  splitTableBody.innerHTML = "";

  if (per_person && per_person.length > 1) {
    splitSection.classList.remove("hidden");
    per_person.forEach((person) => {
      const hasIncome = person.income !== null && person.income !== undefined;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${person.name}</td>
        <td class="num">${hasIncome ? currency(person.income) : "—"}</td>
        <td class="num">${hasIncome ? person.rent_percentage + "%" : "—"}</td>
        <td class="num">${currency(person.total_expenses)}</td>
        <td class="num">${hasIncome ? currency(person.remaining) : "—"}</td>
      `;
      splitTableBody.appendChild(tr);
    });
  } else {
    splitSection.classList.add("hidden");
  }
}

function renderExpenseBreakdown(per_person) {
  expenseBreakdownBody.innerHTML = "";

  per_person.forEach((person) => {
    const hasIncome = person.income !== null && person.income !== undefined;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${person.name}</td>
      <td class="num">${hasIncome ? currency(person.income) : "—"}</td>
      <td class="num">${currency(person.rent_share)}</td>
      <td class="num">${currency(person.utilities_share)}</td>
      <td class="num">${currency(person.food_share)}</td>
      <td class="num">${currency(person.transport_share)}</td>
      <td class="num">${currency(person.other_share)}</td>
      <td class="num">${currency(person.total_expenses)}</td>
      <td class="num">${hasIncome ? person.rent_percentage + "%" : "—"}</td>
      <td class="num">${hasIncome ? currency(person.remaining) : "—"}</td>
      <td>${person.status || "—"}</td>
    `;
    expenseBreakdownBody.appendChild(tr);
  });
}

showExpenseBtn.addEventListener("click", () => {
  if (!lastResult) return;

  const isHidden = expenseBreakdownBox.classList.contains("hidden");

  if (isHidden) {
    renderExpenseBreakdown(lastResult.per_person);
    expenseBreakdownBox.classList.remove("hidden");
    showExpenseBtn.textContent = "Hide Expense Breakdown";
    expenseBreakdownBox.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    expenseBreakdownBox.classList.add("hidden");
    showExpenseBtn.textContent = "Show Expense Breakdown";
  }
});
