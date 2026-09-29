#!/usr/bin/env bash
# Rebuild CV under the locked dependencies (requirements.lock) and compare with the
# reference candidate (tolerance |a-b| <= 1e-12 + 1e-12*|a|; public file 1e-4). Run from this folder:  bash verify_locked_build.sh
# Needs Python 3.11+ and internet access to PyPI. Writes only to reproduction_runs/.
set -euo pipefail
cd "$(dirname "$0")"
REF="${1:-releases/1.1.0/outputs}"
PY=""
for c in python3.13 python3.12 python3.11 python3; do
  if command -v "$c" >/dev/null && "$c" -c 'import sys; sys.exit(0 if sys.version_info >= (3,11) else 1)'; then PY="$c"; break; fi
done
[ -n "$PY" ] || { echo "Need Python 3.11+ (install from python.org or 'brew install python@3.12')."; exit 1; }
STAMP=$(date +%Y%m%d_%H%M%S); RUN="reproduction_runs/locked_$STAMP"
mkdir -p reproduction_runs
"$PY" -m venv "reproduction_runs/.venv_$STAMP"
VPY="reproduction_runs/.venv_$STAMP/bin/python"
"$VPY" -m pip install --quiet --upgrade pip
"$VPY" -m pip install --quiet -r requirements.lock
echo "Environment: $("$VPY" -c 'import sys,pandas,numpy;print(sys.version.split()[0],"pandas",pandas.__version__,"numpy",numpy.__version__)')"
"$VPY" build_release.py --input-dir private_inputs/2026-09-29 --output-dir "$RUN" >/dev/null
"$VPY" - "$REF" "$RUN" <<'PYEOF'
import sys, json, numpy as np, pandas as pd
ref, run = sys.argv[1], sys.argv[2]
report = {"reference": ref, "rebuild": run, "files": {}}
ok = True
for name in ["cv_player_seasons.csv", "cv_player_stints.csv", "leaderboard_cv_full_qualified.csv",
             "leaderboard_cv_base_qualified.csv", "team_defense.csv", "team_mov_diagnostics.csv", "PUBLIC_cv_scores.csv"]:
    a = pd.read_csv(f"{ref}/{name}", float_precision="round_trip", low_memory=False)
    b = pd.read_csv(f"{run}/{name}", float_precision="round_trip", low_memory=False)
    r = {"rows_match": a.shape == b.shape and list(a.columns) == list(b.columns)}
    if r["rows_match"]:
        num = a.select_dtypes("number").columns
        absdiff = (a[num] - b[num]).abs()
        diff = absdiff.max().max() if len(num) else 0.0
        # Mixed tolerance: |a - b| <= atol + rtol*|a|. Different platforms' math libraries
        # (exp/log) may differ in the last binary digit, i.e. about 4e-16 relative; for a
        # value near 9,000 that is about 4e-12 absolute, so a pure absolute test is too strict.
        atol = 1e-4 if name.startswith("PUBLIC") else 1e-12   # public file is rounded to 4 decimals
        rtol = 0.0 if name.startswith("PUBLIC") else 1e-12
        excess = int((absdiff > atol + rtol * a[num].abs()).sum().sum()) if len(num) else 0
        rel = (absdiff / a[num].abs().where(a[num].abs() > 0)).max().max() if len(num) else 0.0
        nan_mismatch = int((a[num].isna() != b[num].isna()).sum().sum())
        text = [c for c in a.columns if c not in num]
        text_mismatch = int((a[text].astype(object).fillna("").astype(str).values != b[text].astype(object).fillna("").astype(str).values).sum())
        r.update(max_abs_numeric_difference=float(diff), max_rel_numeric_difference=float(0.0 if pd.isna(rel) else rel),
                 values_outside_tolerance=excess, missingness_mismatches=nan_mismatch,
                 text_mismatches=text_mismatch, atol=atol, rtol=rtol,
                 passed=bool(excess == 0 and nan_mismatch == 0 and text_mismatch == 0))
    else:
        r["passed"] = False
    ok &= r["passed"]; report["files"][name] = r
    print(f"{'PASS' if r['passed'] else 'FAIL'}  {name}  max abs diff {r.get('max_abs_numeric_difference')}  max rel diff {r.get('max_rel_numeric_difference')}")
report["passed"] = ok
open(f"{run}/LOCKED_REPRODUCTION_REPORT.json", "w").write(json.dumps(report, indent=2) + "\n")
print("OVERALL:", "PASS" if ok else "FAIL", f"(report: {run}/LOCKED_REPRODUCTION_REPORT.json)")
sys.exit(0 if ok else 1)
PYEOF
