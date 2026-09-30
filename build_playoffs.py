#!/usr/bin/env python3
"""Build Playoff CV (Run and Rate) and Full-Season CV from a declared playoff input snapshot.

Usage:
    python build_playoffs.py --input-dir private_inputs/playoffs-2026-09-29b --output-dir releases/playoffs-1.0.0/outputs

The output directory must not exist (immutability). No network access.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cv1 import playoffs  # noqa: E402
from cv1 import defense_estimator  # noqa: E402

PLAYOFF_MODEL_VERSION = "1.0.0"
DATA_REVISION = "2026-09-29"
FLOAT = "%.17g"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_inputs(input_dir: Path) -> dict:
    m = json.loads((input_dir / "input_manifest.json").read_text())
    expected = {f["path"]: f["sha256"] for f in m["files"]}
    present = {p.name for p in input_dir.glob("*.csv")}
    if present != set(expected):
        raise SystemExit(f"Input set differs from manifest: {sorted(present ^ set(expected))}")
    bad = [n for n, h in expected.items() if sha(input_dir / n) != h]
    if bad:
        raise SystemExit(f"Input hash mismatch: {bad}")
    return m


def evidence_label(share: pd.Series) -> pd.Series:
    return pd.Series(np.select([share.isna() | share.eq(0), share.lt(1)], ["NONE", "PARTIAL"], "COMPLETE"), index=share.index)


def build(input_dir: Path, out: Path) -> dict:
    declared = verify_inputs(input_dir)
    out.mkdir(parents=True, exist_ok=False)
    p, teams, rounds, qc, full = playoffs.compute(input_dir)
    p["box_evidence"] = evidence_label(p["box_share"])
    p["score_status"] = np.select([~p["scored"], p["rate_qualified"]], ["UNSCORED_NO_BOX_EVIDENCE", "SCORED_RATE_QUALIFIED"], "SCORED")
    p["playoff_model_version"] = PLAYOFF_MODEL_VERSION
    p["data_revision"] = DATA_REVISION
    research_cols = [
        "player_id", "player", "season", "lg", "team", "team_id", "g", "team_games", "availability", "box_games", "box_share",
        "box_evidence", "pts", "ast", "trb", "fga", "fta", "rounds_appeared", "entry_round", "last_round", "rounds_played",
        "possible_path_rounds", "received_bye", "champion", "wins", "mov", "z_mov", "pace_adj", "league_psa", "team_def_z",
        "rs_rate_mean", "rs_rate_sd", "rs_def_mean", "rs_def_sd",
        "role_tier", "role_weight", "def_tier", "def_weight", "context", "raw", "rate_value", "rate_base", "rate_defense",
        "playoff_cv_rate", "rate_qualified", "run_raw", "path_availability", "run_base", "run_defense", "run_performance",
        "championship_share", "championship_credit", "playoff_cv_run", "playoff_cv_run_rank_season", "playoff_cv_run_rank_alltime",
        "playoff_cv_rate_rank_season", "playoff_cv_rate_rank_alltime", "score_status", "playoff_model_version", "data_revision"]
    p = p[research_cols]
    p.to_csv(out / "playoff_player_postseasons.csv", index=False, float_format=FLOAT, lineterminator="\n")
    teams.to_csv(out / "playoff_team_postseasons.csv", index=False, float_format=FLOAT, lineterminator="\n")
    rounds.sort_values(["season", "team_id", "player_id", "round_order"]).to_csv(
        out / "playoff_player_rounds.csv", index=False, float_format=FLOAT, lineterminator="\n")
    public = p[["player_id", "player", "season", "lg", "team", "g", "team_games", "rounds_appeared", "champion", "box_evidence",
                "rate_qualified", "score_status", "playoff_cv_run", "run_performance", "championship_credit", "playoff_cv_rate",
                "playoff_cv_run_rank_season", "playoff_cv_run_rank_alltime", "playoff_cv_rate_rank_season",
                "playoff_cv_rate_rank_alltime", "playoff_model_version", "data_revision"]].copy()
    for c in ["playoff_cv_run", "run_performance", "championship_credit", "playoff_cv_rate"]:
        public[c] = public[c].round(4)
    public = public.rename(columns={"lg": "league", "g": "games"})
    public.to_csv(out / "PUBLIC_playoff_cv_scores.csv", index=False, lineterminator="\n")
    full["playoff_model_version"] = PLAYOFF_MODEL_VERSION
    full["data_revision"] = DATA_REVISION
    full.to_csv(out / "full_season_cv.csv", index=False, float_format=FLOAT, lineterminator="\n")
    fpub = full[["player_id", "player", "season", "lg", "teams", "rs_games", "po_games_counted", "qualified", "playoff_status",
                 "champion", "rs_cv_full", "playoff_cv_rate", "title_bonus", "full_season_cv", "full_season_rank_season",
                 "full_season_rank_alltime", "playoff_model_version", "data_revision"]].copy()
    for c in ["rs_cv_full", "playoff_cv_rate", "title_bonus", "full_season_cv"]:
        fpub[c] = fpub[c].round(4)
    fpub.rename(columns={"lg": "league"}).to_csv(out / "PUBLIC_full_season_cv_scores.csv", index=False, lineterminator="\n")
    summary = {"playoff_model_version": PLAYOFF_MODEL_VERSION, "data_revision": DATA_REVISION, "qc": qc,
               "status_counts": p["score_status"].value_counts().sort_index().to_dict(),
               "box_evidence_counts": p["box_evidence"].value_counts().sort_index().to_dict(),
               "full_season_playoff_status": full["playoff_status"].value_counts().sort_index().to_dict(),
               "defense_coefficients": list(defense_estimator.COEFFICIENTS)}
    files = sorted(out.glob("*.csv"))
    manifest = {"playoff_model_version": PLAYOFF_MODEL_VERSION, "data_revision": DATA_REVISION,
                "environment": {"python": platform.python_version(), "pandas": pd.__version__, "numpy": np.__version__,
                                "platform": platform.platform()},
                "code": {n: sha(Path(__file__).resolve().parent / n) for n in
                         ["build_playoffs.py", "cv1/playoffs.py", "cv1/defense_estimator.py"]},
                "input_snapshot_id": declared.get("snapshot_id"), "input_manifest_sha256": sha(input_dir / "input_manifest.json"),
                "outputs": {f.name: {"bytes": f.stat().st_size, "sha256": sha(f)} for f in files}}
    (out / "build_summary.json").write_text(json.dumps(summary, indent=2, default=int) + "\n")
    (out / "build_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return summary


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input-dir", type=Path, required=True)
    ap.add_argument("--output-dir", type=Path, required=True)
    a = ap.parse_args()
    print(json.dumps(build(a.input_dir, a.output_dir), indent=2, default=int))
