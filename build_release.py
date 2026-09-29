#!/usr/bin/env python3
"""Build a Court Value 1.0 release-candidate output set from a declared input snapshot.

Usage:
    python build_release.py --input-dir private_inputs/2026-09-29 --output-dir releases/1.0.0-rc.1

The build computes (1) CV 1.0 with verified literal appearance-game MOV and
explicit full-season fallback, and (2) the full-season-MOV control, using the
same engine. It writes research exports with score-basis/status fields,
separate full-CV and CV_BASE leaderboards, and a manifest with hashes.
No network access. The output directory must not already exist (immutability).
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
from cv1 import engine  # noqa: E402
from cv1.mov import compute_mov  # noqa: E402
from cv1 import control_v2026_5 as control_engine  # noqa: E402

MODEL_VERSION = "1.0.0"
DATA_REVISION = "2026-09-29"
KEY = ["player_id", "season", "lg"]
STINT_KEY = KEY + ["team"]
FLOAT = "%.17g"


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def write(frame: pd.DataFrame, path: Path) -> None:
    frame.to_csv(path, index=False, float_format=FLOAT, lineterminator="\n")


def mov_basis(stints: pd.DataFrame) -> pd.DataFrame:
    s = stints.assign(appearance=stints["mov_method"].eq("VERIFIED_LITERAL_APPEARANCE"))
    g = s.groupby(KEY).agg(
        mov_stints=("team", "size"),
        mov_appearance_stints=("appearance", "sum"),
        mov_fallback_reasons=("fallback_reason", lambda x: "|".join(sorted({v for v in x if isinstance(v, str) and v}))),
    ).reset_index()
    g["mov_basis"] = np.select(
        [g.mov_appearance_stints.eq(g.mov_stints), g.mov_appearance_stints.eq(0)],
        ["ALL_APPEARANCE", "ALL_FALLBACK"], default="MIXED")
    return g


def status_columns(p: pd.DataFrame) -> pd.DataFrame:
    p = p.copy()
    has_base = p["cv_base"].notna()
    has_full = p["cv_full"].notna()
    p["score_basis"] = np.select([has_full, has_base], ["CV_FULL", "CV_BASE_ONLY"], default="UNSCORED")
    p["score_status"] = np.select(
        [has_full & p.qualified, has_full, has_base & p.qualified, has_base],
        ["FULL_QUALIFIED", "FULL_UNQUALIFIED", "BASE_ONLY_QUALIFIED", "BASE_ONLY_UNQUALIFIED"],
        default="UNSCORED_MISSING_TEAM_CONTEXT")
    complete = p["season_complete"].fillna(False).astype(bool)
    high = p["season_high_confidence"].fillna(False).astype(bool)
    p["defense_coverage"] = np.select(
        [~has_base, p.lg.eq("ABA"), ~complete, has_full & high, has_full, p.MP.eq(0)],
        ["NOT_APPLICABLE_UNSCORED", "UNAVAILABLE_ABA_NOT_RECONSTRUCTED", "UNAVAILABLE_SEASON_NOT_COVERED",
         "COMPLETE_HIGH_CONFIDENCE", "COMPLETE_LOWER_CONFIDENCE", "UNAVAILABLE_ZERO_MINUTES"],
        default="UNAVAILABLE_OTHER")
    p["full_rank_alltime"] = p["cv_full"].where(p.qualified).rank(ascending=False, method="min")
    p["full_rank_season"] = p["cv_full"].where(p.qualified).groupby([p.season, p.lg]).rank(ascending=False, method="min")
    p["base_rank_alltime"] = p["cv_base"].where(p.qualified).rank(ascending=False, method="min")
    p["base_rank_season"] = p["cv_base"].where(p.qualified).groupby([p.season, p.lg]).rank(ascending=False, method="min")
    for c in ["full_rank_alltime", "full_rank_season", "base_rank_alltime", "base_rank_season"]:
        p[c] = p[c].astype("Int64")
    return p


def verify_inputs(input_dir: Path) -> dict:
    """Refuse to build unless every declared input matches input_manifest.json exactly."""
    manifest_path = input_dir / "input_manifest.json"
    if not manifest_path.exists():
        raise SystemExit(f"Missing declared input manifest: {manifest_path}")
    declared = json.loads(manifest_path.read_text())
    expected = {f["path"]: f["sha256"] for f in declared["files"]}
    present = {p.name for p in input_dir.glob("*.csv")}
    if present != set(expected):
        raise SystemExit(f"Input set differs from manifest: extra={sorted(present - set(expected))} missing={sorted(set(expected) - present)}")
    bad = [name for name, digest in expected.items() if sha(input_dir / name) != digest]
    if bad:
        raise SystemExit(f"Input hash mismatch: {bad}")
    return declared


def build(input_dir: Path, out: Path) -> dict:
    declared = verify_inputs(input_dir)
    out.mkdir(parents=True, exist_ok=False)
    mov, team_mov_diag, _, mov_qc = compute_mov(input_dir)
    mov_cols = STINT_KEY + ["mov_used", "mov_method"]
    player, stints, team_def, qc = engine.compute(input_dir, mov[mov_cols])
    c_player, c_stints, _, c_qc = control_engine.compute(input_dir, None)

    # Invariance: MOV may change only the base via context; defense layer is identical.
    ctl = c_player[KEY + ["base_score", "frozen_score", "def_credit_universal"]].rename(columns={
        "base_score": "control_cv_base", "frozen_score": "control_cv_full", "def_credit_universal": "control_def_credit"})
    player = player.merge(ctl, on=KEY, how="left", validate="one_to_one")
    d = (player.def_credit_universal - player.control_def_credit).abs()
    if not (d.max(skipna=True) <= 1e-12 or d.isna().all()) or player.def_credit_universal.isna().ne(player.control_def_credit.isna()).any():
        raise ValueError("Defense changed between control and candidate")

    extra = ["appearance_games", "appearance_rows", "margin_games", "played_mov", "eligible", "prior_trial_eligible",
             "fallback_reason", "name_fallback_games", "verified_full_schedule_mov", "prior_team_eligible"]
    stints = stints.merge(mov[STINT_KEY + extra], on=STINT_KEY, how="left", validate="one_to_one")
    stints = stints.merge(c_stints[STINT_KEY + ["variant_context", "variant_raw"]].rename(columns={
        "variant_context": "control_context", "variant_raw": "control_raw_stint"}), on=STINT_KEY, validate="one_to_one")
    player = player.merge(mov_basis(stints), on=KEY, how="left", validate="one_to_one")

    player = player.rename(columns={"base_score": "cv_base", "frozen_score": "cv_full", "def_credit_universal": "def_credit",
                                    "def_index_universal": "def_index", "def_raw_universal": "def_raw",
                                    "standardize_value": "rate"})
    player = status_columns(player)
    player["model_version"] = MODEL_VERSION
    player["data_revision"] = DATA_REVISION
    player = player.sort_values(["season", "lg", "player_id"], kind="mergesort").reset_index(drop=True)

    cols = (["player_id", "player", "season", "lg", "teams", "stints", "G", "MP", "max_team_games", "max_own_team_games", "folded_franchise", "availability_raw",
             "availability", "qualified", "score_basis", "score_status", "defense_coverage", "cv_full", "cv_base", "def_credit",
             "full_rank_alltime", "full_rank_season", "base_rank_alltime", "base_rank_season",
             "mov_basis", "mov_stints", "mov_appearance_stints", "mov_fallback_reasons",
             "control_cv_full", "control_cv_base",
             "PTS", "AST", "REB", "FGA", "FTA", "attempts", "box_impact", "eff_adj", "prod", "pre_context", "raw", "context_delta", "rate",
             "max_role_tier", "min_def_tier", "def_raw", "def_index", "def_mp_universal", "tie_ambiguous",
             "season_complete", "season_high_confidence", "missing_team_payload", "model_version", "data_revision"])
    player = player[cols]

    stints = stints.sort_values(["season", "lg", "player_id", "team"], kind="mergesort").reset_index(drop=True)
    scols = (["player_id", "player", "season", "lg", "team", "g", "mp", "pts", "ast", "trb", "fga", "fta", "team_games", "folded_franchise", "qualification_team_games",
              "availability_stint_raw", "availability_stint", "attempts", "box_impact", "visible_role", "visible_z",
              "availability_z", "role_score", "roster_n", "role_rank", "role_tier", "role_weight", "def_rank", "def_tier",
              "def_weight", "league_psa", "eff_adj", "pace_adj", "mov", "mov_league_mean", "mov_league_sd", "mov_used",
              "mov_method", "fallback_reason", "eligible", "prior_trial_eligible", "appearance_games", "appearance_rows",
              "margin_games", "played_mov", "name_fallback_games", "z_mov_control", "z_mov", "variant_context",
              "variant_pre_context", "variant_raw", "control_context", "control_raw_stint", "team_def_z_universal",
              "def_raw_universal", "def_tie_boundary_ambiguous", "season_complete", "season_high_confidence"])
    stints = stints[scols].rename(columns={"variant_context": "context", "variant_pre_context": "pre_context",
                                           "variant_raw": "raw_stint", "team_def_z_universal": "team_def_z",
                                           "def_raw_universal": "def_raw_stint", "mov": "mov_full_season"})
    stints["model_version"] = MODEL_VERSION

    full_board = player[player.score_status.eq("FULL_QUALIFIED")].sort_values(
        ["cv_full", "season", "lg", "player_id"], ascending=[False, True, True, True], kind="mergesort")
    base_board = player[player.qualified & player.cv_base.notna()].sort_values(
        ["cv_base", "season", "lg", "player_id"], ascending=[False, True, True, True], kind="mergesort")
    board_cols = ["player_id", "player", "season", "lg", "teams", "G", "availability", "score_basis", "defense_coverage",
                  "mov_basis", "model_version", "data_revision"]
    full_board = full_board[["full_rank_alltime", "full_rank_season", "cv_full", "cv_base", "def_credit"] + board_cols]
    base_board = base_board[["base_rank_alltime", "base_rank_season", "cv_base"] + board_cols]
    base_board = base_board.assign(board_basis="CV_BASE (no defensive component; not comparable to full CV)")

    # Public score sheet: CV scores and the minimum context needed to read them.
    # No raw box-score totals are published (see docs/SOURCES.md, licence findings).
    public_cols = ["player_id", "player", "season", "lg", "teams", "G", "MP", "qualified", "score_basis", "score_status",
                   "defense_coverage", "cv_full", "cv_base", "def_credit", "full_rank_season", "full_rank_alltime",
                   "base_rank_season", "base_rank_alltime", "model_version", "data_revision"]
    public = player.loc[player.score_basis.ne("UNSCORED"), public_cols].copy()
    for c in ["cv_full", "cv_base", "def_credit"]:
        public[c] = public[c].round(4)
    public = public.rename(columns={"lg": "league", "G": "games", "MP": "minutes"})
    public.to_csv(out / "PUBLIC_cv_scores.csv", index=False, lineterminator="\n")
    write(player, out / "cv_player_seasons.csv")
    write(stints, out / "cv_player_stints.csv")
    write(full_board, out / "leaderboard_cv_full_qualified.csv")
    write(base_board, out / "leaderboard_cv_base_qualified.csv")
    td = team_def.sort_values(["season", "team"]).reset_index(drop=True)
    write(td, out / "team_defense.csv")
    write(team_mov_diag.sort_values(["season", "team"]).reset_index(drop=True), out / "team_mov_diagnostics.csv")

    summary = {
        "model_version": MODEL_VERSION, "data_revision": DATA_REVISION,
        "rows": len(player), "stints": len(stints),
        "score_status_counts": player.score_status.value_counts().sort_index().to_dict(),
        "defense_coverage_counts": player.defense_coverage.value_counts().sort_index().to_dict(),
        "mov_basis_counts": player.mov_basis.value_counts().sort_index().to_dict(),
        "stint_mov_method_counts": stints.mov_method.value_counts().sort_index().to_dict(),
        "full_cv_seasons": sorted(int(x) for x in player.loc[player.cv_full.notna(), "season"].unique()),
        "mov_qc": mov_qc,
        "engine_qc": {k: v for k, v in qc.items() if k != "season_coverage"},
        "control_engine_qc": {k: v for k, v in c_qc.items() if k not in ("season_coverage",)},
    }
    files = sorted(p for p in out.glob("*.csv"))
    manifest = {
        "model_version": MODEL_VERSION, "data_revision": DATA_REVISION,
        "status": "RELEASE CANDIDATE - not a public release until audit acceptance",
        "environment": {"python": platform.python_version(), "pandas": pd.__version__, "numpy": np.__version__,
                        "platform": platform.platform()},
        "code": {str(p.relative_to(Path(__file__).resolve().parent)): sha(p) for p in
                 [Path(__file__).resolve(), Path(engine.__file__).resolve(), Path(control_engine.__file__).resolve(),
                  Path(sys.modules["cv1.mov"].__file__).resolve()]},
        "input_snapshot_id": declared.get("snapshot_id"),
        "input_manifest_sha256": sha(input_dir / "input_manifest.json"),
        "inputs": {p.name: sha(p) for p in sorted(input_dir.glob("*.csv"))},
        "outputs": {p.name: {"bytes": p.stat().st_size, "sha256": sha(p)} for p in files},
    }
    (out / "build_summary.json").write_text(json.dumps(summary, indent=2, default=int) + "\n")
    (out / "build_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return summary


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input-dir", type=Path, required=True)
    ap.add_argument("--output-dir", type=Path, required=True)
    a = ap.parse_args()
    s = build(a.input_dir, a.output_dir)
    print(json.dumps({k: s[k] for k in ["rows", "stints", "score_status_counts", "mov_basis_counts", "defense_coverage_counts"]}, indent=2))
