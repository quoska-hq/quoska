"""Worker needs only its own bearer token, never the Supabase service role."""
import json
import os
import time
import urllib.request
from solver import solve


def post(body):
    url = os.environ["PLANNING_APP_URL"].rstrip("/") + "/api/v1/planning/worker"
    if not url.startswith("https://") and os.environ.get("PLANNING_ALLOW_LOCAL_HTTP") != "true":
        raise RuntimeError("HTTPS is required; local HTTP must be explicitly enabled.")
    request = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                    headers={"Authorization": "Bearer " + os.environ["PLANNING_WORKER_TOKEN"],
                                             "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=20) as response:
        result = json.load(response)
    if result.get("error"):
        raise RuntimeError("Worker API failed")
    return result["data"]


def run_once():
    job = post({"action": "claim"})
    if not job:
        return False
    try:
        result = solve(job["payload"])
    except Exception:
        result = {"status": "failed", "assignments": [], "wallSeconds": 0,
                  "message": "Der Rechenlauf konnte nicht abgeschlossen werden."}
    post({"jobId": job["id"], "leaseToken": job["leaseToken"], "result": result})
    return True


if __name__ == "__main__":
    if len(os.environ.get("PLANNING_WORKER_TOKEN", "")) < 32:
        raise RuntimeError("PLANNING_WORKER_TOKEN must have at least 32 characters")
    while True:
        try:
            if not run_once():
                time.sleep(5)
        except Exception:
            # Never log payloads, employee IDs or tokens.
            print("Planning worker: request failed; retrying.", flush=True)
            time.sleep(10)
