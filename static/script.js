const form = document.getElementById("calc-form");
const hasRoommatesBox = document.getElementById("has-roommates");
const roommatesBlock = document.getElementById("roommates-block");
const roommateRows = document.getElementById("roommate-rows");
const addRoommateBtn = document.getElementById("add-roommate");
const emptyState = document.getElementById("empty-state");
const errorBox = document.getElementById("error-box");
const resultBox = document.getElementById("result");
const stampEl = document.getElementById("stamp");
const submitBtn = form.querySelector(".btn-stamp-action");
const showExpenseBtn = document.getElementById("show-expense-btn");
const downloadReportBtn = document.getElementById("download-report-btn");
const expenseBreakdownBox = document.getElementById("Expense");
const expenseBreakdownBody = document.querySelector("#expense-breakdown-table tbody");

let lastResult = null;
let lastSplitMethod = "equal";

const tips = {
  "Affordable": "You're in good shape. Consider boosting your savings goal.",
  "Moderate": "Rent is a bit high. Watch discretionary spending like food/transport.",
  "Expensive": "Rent is eating too much of your income. Consider a roommate or cheaper place."
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function currency(n) {
  const num = Number(n) || 0;
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: num % 1 === 0 ? 0 : 2 });
}

function addRoommateRow() {
  const row = document.createElement("div");
  row.className = "roommate-row";
  row.innerHTML = `
    <input type="text" class="rm-name" placeholder="Roommate name" aria-label="Roommate name">
    <input type="number" class="rm-income" placeholder="Income (optional)" min="0" step="any" aria-label="Roommate income">
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

addRoommateBtn.addEventListener("click", addRoommateRow);

function collectRoommates() {
  return Array.from(roommateRows.querySelectorAll(".roommate-row"))
    .map(row => ({
      name: row.querySelector(".rm-name").value.trim(),
      income: row.querySelector(".rm-income").value ? Number(row.querySelector(".rm-income").value) : null,
    }))
    .filter(r => r.name);
}

function computePerPerson(income, rent, utilities, food, security, other, roommates, splitMethod) {
  if (!roommates) roommates = [];

  const people = [{
    name: "You",
    income: income
  }];

  roommates.forEach(rm => {
    let name = rm.name ? rm.name.trim() : "Roommate";
    if (!name) name = "Roommate";

    let rIncome = null;
    if (rm.income !== null && rm.income !== undefined && rm.income !== "") {
      const parsed = Number(rm.income);
      if (!isNaN(parsed) && parsed >= 0) {
        rIncome = parsed;
      }
    }

    people.push({
      name: name,
      income: rIncome
    });
  });

  const totalPeople = people.length;
  const fractions = {};

  if (splitMethod === "income") {
    let totalIncome = 0;
    people.forEach(p => {
      if (p.income !== null && p.income > 0) {
        totalIncome += p.income;
      }
    });

    if (totalIncome === 0) totalIncome = 1;

    people.forEach(p => {
      const personIncome = (p.income !== null && p.income > 0) ? p.income : 0;
      fractions[p.name] = personIncome / totalIncome;
    });
  } else {
    const equalFraction = 1 / totalPeople;
    people.forEach(p => {
      fractions[p.name] = equalFraction;
    });
  }

  const results = [];

  people.forEach(person => {
    const frac = fractions[person.name] || 0;

    const rentShare = Math.round((rent * frac) * 100) / 100;
    const utilitiesShare = Math.round((utilities * frac) * 100) / 100;
    const foodShare = Math.round((food * frac) * 100) / 100;
    const securityShare = Math.round((security * frac) * 100) / 100;
    const otherShare = Math.round((other * frac) * 100) / 100;

    const totalExpenses = Math.round((rentShare + utilitiesShare + foodShare + securityShare + otherShare) * 100) / 100;

    const entry = {
      name: person.name,
      income: person.income,
      rent_share: rentShare,
      utilities_share: utilitiesShare,
      food_share: foodShare,
      security_share: securityShare,
      other_share: otherShare,
      total_expenses: totalExpenses,
      rent_percentage: null,
      remaining: null,
      status: null,
      tip: null,
    };

    if (person.income !== null && person.income > 0) {
      const rentPercentage = Math.round(((rentShare / person.income) * 100) * 100) / 100;
      const remaining = Math.round((person.income - totalExpenses) * 100) / 100;

      let status = "Affordable";
      if (rentPercentage <= 30) {
        status = "Affordable";
      } else if (rentPercentage <= 40) {
        status = "Moderate";
      } else {
        status = "Expensive";
      }

      entry.rent_percentage = rentPercentage;
      entry.remaining = remaining;
      entry.status = status;
      entry.tip = tips[status];
    }

    results.push(entry);
  });

  return results;
}

function generateReportText(perPerson, splitMethod) {
  const now = new Date();
  const currentMonthName = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();

  let text = "\n" + currentMonthName + " " + currentYear + "\n";
  text += "Monthly Expenses Report\n";
  text += "Split method: " + splitMethod + "\n\n";

  perPerson.forEach(person => {
    text += person.name + "\n";

    const incomeText = (person.income === null || person.income === undefined)
      ? "not provided"
      : "₹" + person.income;

    text += "  Income: " + incomeText + "\n";
    text += "  Rent share: ₹" + person.rent_share + "\n";
    text += "  Utilities share: ₹" + person.utilities_share + "\n";
    text += "  Food share: ₹" + person.food_share + "\n";
    text += "  security share: ₹" + person.security_share + "\n";
    text += "  Other share: ₹" + person.other_share + "\n";
    text += "  Total expenses: ₹" + person.total_expenses + "\n";

    if (person.income !== null && person.income !== undefined) {
      text += "  Rent % of income: " + person.rent_percentage + "%\n";
      text += "  Remaining after expenses: ₹" + person.remaining + "\n";
      text += "  Affordability status: " + person.status + "\n";
      text += "  Tip: " + person.tip + "\n";
    }

    text += "\n";
  });

  return text;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  errorBox.classList.add("hidden");

  const rawIncome = document.getElementById("income").value.trim();
  const rawRent = document.getElementById("rent").value.trim();
  const rawUtilities = document.getElementById("utilities").value.trim();
  const rawFood = document.getElementById("food").value.trim();
  const rawSecurity = document.getElementById("security").value.trim();
  const rawOther = document.getElementById("other").value.trim();

  const income = Number(rawIncome);
  const rent = rawRent === "" ? 0 : Number(rawRent);
  const utilities = rawUtilities === "" ? 0 : Number(rawUtilities);
  const food = rawFood === "" ? 0 : Number(rawFood);
  const security = rawSecurity === "" ? 0 : Number(rawSecurity);
  const other = rawOther === "" ? 0 : Number(rawOther);

  if (isNaN(income) || income <= 0) {
    showError("Income must be greater than 0.");
    return;
  }

  if (isNaN(rent) || rent < 0 || isNaN(utilities) || isNaN(food) || isNaN(security) || isNaN(other)) {
    showError("Please enter valid expense figures.");
    return;
  }

  let splitMethod = "equal";
  let roommates = [];

  if (hasRoommatesBox.checked) {
    splitMethod = document.getElementById("split-method").value;
    roommates = collectRoommates();
  }

  lastSplitMethod = splitMethod;

  submitBtn.disabled = true;
  submitBtn.textContent = "Calculating…";

  try {
    const perPerson = computePerPerson(
      income, rent, utilities, food, security, other,
      roommates, splitMethod
    );

    const affordability = perPerson[0];

    const data = {
      affordability: affordability,
      per_person: perPerson
    };

    renderResult(data);
  } catch (err) {
    console.error(err);
    showError("An error occurred while calculating. Please check your inputs.");
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

  const status = affordability.status || "Affordable";
  stampEl.textContent = status.toUpperCase();
  stampEl.className = "stamp " + status.toLowerCase();
  stampEl.style.animation = "none";
  void stampEl.offsetWidth;
  stampEl.style.animation = "";

  document.getElementById("r-percentage").textContent = (affordability.rent_percentage ?? 0) + "%";
  document.getElementById("r-total").textContent = currency(affordability.total_expenses);
  document.getElementById("r-remaining").textContent = currency(affordability.remaining);
  document.getElementById("r-tip").textContent = affordability.tip || "";

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
      <td class="num">${currency(person.security_share)}</td>
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

if (downloadReportBtn) {
  downloadReportBtn.addEventListener("click", () => {
    if (!lastResult || !lastResult.per_person) {
      showError("Please calculate your expenses first.");
      return;
    }
    const reportText = generateReportText(lastResult.per_person, lastSplitMethod);
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Monthly_Expenses_report.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}