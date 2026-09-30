"""Bounded CP-SAT optimizer. It produces proposals; the app validates and publishes."""
from datetime import date, timedelta
from ortools.sat.python import cp_model


def solve(payload):
    model = cp_model.CpModel()
    choices = {}
    shifts = {s["id"]: s for s in payload["shifts"]}
    employees = {e["id"]: e for e in payload["employees"]}
    for sid, shift in shifts.items():
        options = []
        for eid in shift["candidates"]:
            if eid not in employees:
                continue
            choice = model.new_bool_var(f"{sid}:{eid}")
            choices[sid, eid] = choice
            options.append(choice)
            if shift["fixedEmployeeId"] is not None:
                model.add(choice == int(eid == shift["fixedEmployeeId"]))
        if not options:
            return {"status": "infeasible", "assignments": [], "wallSeconds": 0,
                    "message": "Mindestens eine Schicht hat keine zulässige Besetzung."}
        model.add_exactly_one(options)
    for a, b in payload["conflicts"]:
        common = set(shifts[a]["candidates"]) & set(shifts[b]["candidates"])
        for eid in common:
            if (a, eid) in choices and (b, eid) in choices:
                model.add(choices[a, eid] + choices[b, eid] <= 1)
    objective = []
    eligible_employees = {eid for _, eid in choices}
    total_target = sum(max(0, employees[eid]["targetMinutes"]) for eid in eligible_employees)
    total_minutes = sum(s["minutes"] for s in shifts.values())
    month_minutes = {}
    month_eligible = {}
    month_weights = {eid: {t["month"]: t["minutes"] for t in e.get("monthlyTargets", [])} for eid, e in employees.items()}
    for sid, shift in shifts.items():
        month = shift["date"][:7]
        month_minutes[month] = month_minutes.get(month, 0) + shift["minutes"]
        month_eligible.setdefault(month, set()).update(eid for eid in shift["candidates"] if (sid, eid) in choices)
    for eid, employee in employees.items():
        weekly = {}
        daily = {}
        monthly = {}
        terms = []
        for sid, shift in shifts.items():
            if (sid, eid) not in choices:
                continue
            term = shift["minutes"] * choices[sid, eid]
            terms.append(term)
            if shift.get("originalEmployeeId") and shift["originalEmployeeId"] != eid:
                objective.append(120 * choices[sid, eid])
            day = date.fromisoformat(shift["date"])
            monday = str(day - timedelta(days=day.weekday()))
            weekly.setdefault(monday, []).append(term)
            daily.setdefault(shift["date"], []).append(term)
            monthly.setdefault(shift["date"][:7], []).append(term)
            # Python weekdays start on Monday; API weekdays start on Sunday.
            if employee["preferredDays"] and (day.weekday() + 1) % 7 not in employee["preferredDays"]:
                objective.append(30 * choices[sid, eid])
        for week, terms_week in weekly.items():
            reserved = sum(r["minutes"] for r in payload.get("reservedWeekly", [])
                           if r["employeeId"] == eid and r["week"] == week)
            model.add(sum(terms_week) + reserved <= employee["weeklyMinutes"])
        for day, terms_day in daily.items():
            reserved = sum(r["minutes"] for r in payload.get("reservedDaily", [])
                           if r["employeeId"] == eid and r["date"] == day)
            model.add(sum(terms_day) + reserved <= 480)
        deviation = model.new_int_var(0, 10_000_000, f"deviation:{eid}")
        model.add_abs_equality(deviation, sum(terms) - employee["targetMinutes"])
        objective.append(deviation)
        if eid in eligible_employees:
            # Absolute contractual deficits alone are constant when everyone is below target.
            # Distribute the available work in proportion to the adjusted contractual targets.
            quota = round(total_minutes * max(0, employee["targetMinutes"]) / total_target) if total_target else round(total_minutes / len(eligible_employees))
            allocation_deviation = model.new_int_var(0, 10_000_000, f"allocation:{eid}")
            model.add_abs_equality(allocation_deviation, sum(terms) - quota)
            objective.append(allocation_deviation)
        for month, month_terms in monthly.items():
            weights = {person: max(0, month_weights[person].get(month, employees[person]["targetMinutes"])) for person in month_eligible[month]}
            total_weight = sum(weights.values())
            quota = round(month_minutes[month] * weights[eid] / total_weight) if total_weight else round(month_minutes[month] / len(weights))
            monthly_deviation = model.new_int_var(0, 10_000_000, f"monthly:{month}:{eid}")
            model.add_abs_equality(monthly_deviation, sum(month_terms) - quota)
            objective.append(monthly_deviation)
    for category in ("weekend", "night"):
        category_shifts = [s for s in shifts.values() if s.get(category)]
        eligible = {eid for shift in category_shifts for eid in shift["candidates"] if eid in employees}
        total_weight = sum(max(1, employees[eid]["targetMinutes"]) for eid in eligible)
        if not total_weight:
            continue
        history_key = "pastWeekendDays" if category == "weekend" else "pastNightDays"
        total_duties = len(category_shifts) + sum(employees[eid].get(history_key, 0) for eid in eligible)
        for eid in eligible:
            count = employees[eid].get(history_key, 0) + sum(choices[s["id"], eid] for s in category_shifts if (s["id"], eid) in choices)
            expected = round(100 * total_duties * max(1, employees[eid]["targetMinutes"]) / total_weight)
            deviation = model.new_int_var(0, 10_000_000, f"fairness:{category}:{eid}")
            model.add_abs_equality(deviation, 100 * count - expected)
            objective.append(deviation)
    model.minimize(sum(objective))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = min(60, max(1, payload["timeLimitSeconds"]))
    solver.parameters.num_search_workers = 2
    solver.parameters.random_seed = 1
    status = solver.solve(model)
    names = {cp_model.OPTIMAL: "optimal", cp_model.FEASIBLE: "feasible",
             cp_model.INFEASIBLE: "infeasible", cp_model.UNKNOWN: "timeout"}
    result_status = names.get(status, "failed")
    assignments = []
    if result_status in ("optimal", "feasible"):
        assignments = [{"shiftId": sid, "employeeId": eid} for (sid, eid), var in choices.items()
                       if solver.value(var)]
    return {"status": result_status, "assignments": assignments,
            "wallSeconds": solver.wall_time, "message": ""}
