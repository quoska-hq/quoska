import unittest
from solver import solve


def payload():
    return {"version": 1, "timeLimitSeconds": 2, "conflicts": [], "reservedWeekly": [],
            "shifts": [{"id": "a", "start": 0, "end": 360, "minutes": 360,
                        "date": "2026-10-01", "locationId": "location", "candidates": ["one", "two"],
                        "fixedEmployeeId": None}],
            "employees": [{"id": eid, "weeklyMinutes": 2880, "targetMinutes": 360,
                           "initialMinutes": 0, "preferredDays": []} for eid in ["one", "two"]]}


class SolverTests(unittest.TestCase):
    def test_full_assignment(self):
        result = solve(payload())
        self.assertIn(result["status"], ["optimal", "feasible"])
        self.assertEqual(len(result["assignments"]), 1)

    def test_empty_candidate_set_is_infeasible(self):
        data = payload()
        data["shifts"][0]["candidates"] = []
        self.assertEqual(solve(data)["status"], "infeasible")

    def test_fixed_assignment_is_preserved(self):
        data = payload()
        data["shifts"][0]["fixedEmployeeId"] = "two"
        self.assertEqual(solve(data)["assignments"][0]["employeeId"], "two")

    def test_other_employment_counts_towards_weekly_limit(self):
        data = payload()
        data["shifts"][0]["candidates"] = ["one"]
        data["reservedWeekly"] = [{"employeeId": "one", "week": "2026-09-28", "minutes": 2880}]
        self.assertEqual(solve(data)["status"], "infeasible")

    def test_other_employment_counts_towards_daily_limit(self):
        data = payload()
        data["shifts"][0]["candidates"] = ["one"]
        data["reservedDaily"] = [{"employeeId": "one", "date": "2026-10-01", "minutes": 180}]
        self.assertEqual(solve(data)["status"], "infeasible")

    def test_conflicting_shifts_cannot_share_a_person(self):
        data = payload()
        data["shifts"][0]["candidates"] = ["one"]
        data["shifts"].append({**data["shifts"][0], "id": "b"})
        data["conflicts"] = [["a", "b"]]
        self.assertEqual(solve(data)["status"], "infeasible")


if __name__ == "__main__":
    unittest.main()
