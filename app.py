from calendar import month_name
from datetime import datetime
from pathlib import Path
from flask import Flask, jsonify, render_template, request, send_file

REPORT_PATH = Path(__file__).parent / "Monthly_Expenses_report.txt"

tips = {
    "Affordable": "You're in good shape. Consider boosting your savings goal.",
    "Moderate": "Rent is a bit high. Watch discretionary spending like food/transport.",
    "Expensive": "Rent is eating too much of your income. Consider a roommate or cheaper place."
}


def compute_per_person(income, rent, utilities, food, security, other,
                        roommates, split_method):

    if roommates is None:
        roommates = []

    people = []

    you = {
        "name": "You",
        "income": income,
    }
    people.append(you)

    for roommate in roommates:
        raw_name = roommate.get("name")
        if raw_name is None:
            name = "Roommate"
        else:
            name = raw_name.strip()
            if name == "":
                name = "Roommate"

        raw_income = roommate.get("income")
        if raw_income is None or raw_income == "":
            r_income = None
        else:
            try:
                r_income = int(raw_income)
            except (TypeError, ValueError):
                r_income = None

        person = {
            "name": name,
            "income": r_income,
        }
        people.append(person)

    total_people = len(people)

    fractions = {}

    if split_method == "income":
        total_income = 0
        for person in people:
            if person["income"] is not None:
                total_income = total_income + person["income"]

        if total_income == 0:
            total_income = 1

        for person in people:
            if person["income"] is None:
                person_income = 0
            else:
                person_income = person["income"]
            fractions[person["name"]] = person_income / total_income
    else:
        equal_fraction = 1 / total_people
        for person in people:
            fractions[person["name"]] = equal_fraction

    results = []

    for person in people:
        frac = fractions[person["name"]]

        rent_share = round(rent * frac, 2)
        utilities_share = round(utilities * frac, 2)
        food_share = round(food * frac, 2)
        security_share = round(security * frac, 2)
        other_share = round(other * frac, 2)

        total_expenses = round(
            rent_share + utilities_share + food_share + security_share + other_share,
            2,
        )

        entry = {
            "name": person["name"],
            "income": person["income"],
            "rent_share": rent_share,
            "utilities_share": utilities_share,
            "food_share": food_share,
            "security_share": security_share,
            "other_share": other_share,
            "total_expenses": total_expenses,
            "rent_percentage": None,
            "remaining": None,
            "status": None,
            "tip": None,
        }

        if person["income"] is not None and person["income"] > 0:
            rent_percentage = round((rent_share / person["income"]) * 100, 2)
            remaining = round(person["income"] - total_expenses, 2)

            if rent_percentage <= 30:
                status = "Affordable"
            elif rent_percentage <= 40:
                status = "Moderate"
            else:
                status = "Expensive"

            entry["rent_percentage"] = rent_percentage
            entry["remaining"] = remaining
            entry["status"] = status
            entry["tip"] = tips[status]

        results.append(entry)

    return results


def save_report(per_person, split_method):
    """Appends one entry to Monthly_Expenses_report.txt with a line per person."""
    now = datetime.now()
    current_month_name = month_name[now.month]
    current_year = now.year

    file = open(REPORT_PATH, "a", encoding="utf-8")
    file.seek(0)
    file.truncate(0)
    file.write("\n" + current_month_name + " " + str(current_year) + "\n")
    file.write("Monthly Expenses Report\n")
    file.write("Split method: " + split_method + "\n\n")

    for person in per_person:
        file.write(person["name"] + "\n")

        if person["income"] is None:
            income_text = "not provided"
        else:
            income_text = "\u20b9" + str(person["income"])
        
        file.write("  Income: " + income_text + "\n")

        file.write("  Rent share: \u20b9" + str(person["rent_share"]) + "\n")
        file.write("  Utilities share: \u20b9" + str(person["utilities_share"]) + "\n")
        file.write("  Food share: \u20b9" + str(person["food_share"]) + "\n")
        file.write("  security share: \u20b9" + str(person["security_share"]) + "\n")
        file.write("  Other share: \u20b9" + str(person["other_share"]) + "\n")
        file.write("  Total expenses: \u20b9" + str(person["total_expenses"]) + "\n")

        if person["income"] is not None:
            file.write("  Rent % of income: " + str(person["rent_percentage"]) + "%\n")
            file.write("  Remaining after expenses: \u20b9" + str(person["remaining"]) + "\n")
            file.write("  Affordability status: " + str(person["status"]) + "\n")
            file.write("  Tip: " + str(person["tip"]) + "\n")

        file.write("\n")

    file.close()


app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/calculate", methods=["POST"])
def calculate():
    data = request.get_json()

    income = int(data["income"])
    rent = int(data["rent"])
    utilities = int(data["utilities"])
    food = int(data["food"])
    security = int(data["security"])
    other = int(data["other"])

    if income <= 0:
        return jsonify({"error": "Income must be greater than 0."}), 400

    if "split_method" in data:
        split_method = data["split_method"]
    else:
        split_method = "equal"

    if "roommates" in data:
        roommates = data["roommates"]
    else:
        roommates = None

    per_person = compute_per_person(
        income, rent, utilities, food, security, other,
        roommates, split_method,
    )

    save_report(per_person, split_method)
    affordability = per_person[0]

    return jsonify({
        "affordability": affordability,
        "per_person": per_person,
    })


@app.route("/download-report")
def download_report():
    if not REPORT_PATH.exists():
        return jsonify({"error": "No report yet."}), 404

    return send_file(REPORT_PATH, as_attachment=True)


if __name__ == "__main__":
    app.run(debug=True)