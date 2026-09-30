"""Synthetic capacity checks, independent of customer data and legal validation."""
import json
from datetime import date, timedelta
from solver import solve


def benchmark(people, locations, seconds=2):
    employees = [{"id": f"e{i}", "weeklyMinutes": 2880, "targetMinutes": 18000,
                  "initialMinutes": 0, "preferredDays": []} for i in range(people)]
    shifts = []
    conflicts = []
    for location in range(locations):
        team = [e["id"] for i, e in enumerate(employees) if i % locations == location]
        for n in range(90):
            day = date(2026, 10, 1) + timedelta(days=n)
            if day.weekday() >= 5:
                continue
            morning = f"s{location}:{n}:a"
            evening = f"s{location}:{n}:b"
            for sid, start in [(morning, n * 1440 + 360), (evening, n * 1440 + 780)]:
                shifts.append({"id": sid, "date": str(day), "locationId": str(location),
                               "start": start, "end": start + 360, "minutes": 360,
                               "candidates": team, "fixedEmployeeId": None})
            conflicts.append([morning, evening])
    payload = {"employees": employees, "shifts": shifts, "conflicts": conflicts,
               "version": 1, "timeLimitSeconds": seconds, "reservedWeekly": []}
    result = solve(payload)
    return {"people": people, "locations": locations, "shifts": len(shifts),
            "candidateVariables": sum(len(s["candidates"]) for s in shifts),
            "status": result["status"], "wallSeconds": round(result["wallSeconds"], 3)}


if __name__ == "__main__":
    for size in [(20, 2), (100, 10), (300, 30), (1000, 50)]:
        print(json.dumps(benchmark(*size)), flush=True)
