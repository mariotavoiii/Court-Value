#!/usr/bin/env python3
"""Audit a Playoff CV build: exact mechanical checks, a no-minutes invariance test,
source coverage, and descriptive validation. Nothing here fits or changes scores.

Usage:
    python audit_playoffs.py --candidate-dir releases/playoffs-1.0.0/outputs \
        --input-dir private_inputs/playoffs-2026-09-29 --paine /path/to/paine.csv --output-dir releases/playoffs-1.0.0/audit
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cv1 import playoffs  # noqa: E402

TOL = 1e-9


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--candidate-dir", type=Path, required=True)
    ap.add_argument("--input-dir", type=Path, required=True)
    ap.add_argument("--paine", type=Path, required=True)
    ap.add_argument("--output-dir", type=Path, required=True)
    a = ap.parse_args()
    out = a.output_dir
    out.mkdir(parents=True, exist_ok=True)
    rt = dict(float_precision="round_trip", low_memory=False)
    p = pd.read_csv(a.candidate_dir / "playoff_player_postseasons.csv", **rt)
    t = pd.read_csv(a.candidate_dir / "playoff_team_postseasons.csv", **rt)
    checks = []

    def check(name, violations, evidence):
        checks.append(dict(check=name, violations=int(violations), passed=int(violations) == 0, evidence=evidence))

    s = p[p.playoff_cv_run.notna()]
    check("unique player-postseason", p.duplicated(["season", "player_id"]).sum(), "One team per player per postseason")
    check("one champion per postseason", (t.groupby("season").champion.sum() != 1).sum(), f"{t.season.nunique()} postseasons")
    check("path rounds valid", ((t.possible_path_rounds < 1) | (t.possible_path_rounds > 4) | (t.rounds_played > t.possible_path_rounds)).sum(),
          "1 <= possible path rounds <= 4; rounds played never exceed the path")
    check("Run = performance + championship credit", ((s.playoff_cv_run - s.run_performance - s.championship_credit).abs() > TOL).sum(), "exact")
    check("performance = base + defense", ((s.run_performance - s.run_base - s.run_defense).abs() > TOL).sum(), "exact")
    check("Rate = base + defense", ((s.playoff_cv_rate - s.rate_base - s.rate_defense).abs() > TOL).sum(), "exact")
    check("championship credit bounds", ((s.championship_credit < -TOL) | (s.championship_credit > 3 + TOL)).sum(), "0 to 3")
    check("credit only for champions", (s.championship_credit.gt(0) & ~s.champion.astype(bool)).sum(), "")
    share = s[s.champion.astype(bool)].groupby("season").championship_share.sum()
    check("champion responsibility shares sum to 1", ((share - 1).abs() > 1e-9).sum(), f"max deviation {(share - 1).abs().max():.2g}")
    check("defense bounds", ((s[["run_defense", "rate_defense"]] > 1.5 + TOL) | (s[["run_defense", "rate_defense"]] < -0.75 - TOL)).sum().sum(),
          "bounded tanh, negative halved")
    # The regular-season ruler must reproduce the regular season's own scores exactly.
    rs = pd.read_csv(a.input_dir / "regular_season_cv.csv", **rt)
    ref = playoffs.regular_reference(rs)
    x = rs[rs.lg.eq("NBA")].merge(ref, on="season")
    base_err = (3 * (x.rate - x.rs_rate_mean) / x.rs_rate_sd - x.cv_base).abs().max()
    di = 3 * (x.def_raw - x.rs_def_mean) / x.rs_def_sd
    dc = pd.Series(np.where(1.5 * np.tanh(di / 6) >= 0, 1.5 * np.tanh(di / 6), 0.75 * np.tanh(di / 6)), index=x.index)
    def_err = (dc - x.def_credit).abs().max()
    check("regular-season ruler reproduces CV_BASE and defensive credit", int(base_err > 1e-9) + int(def_err > 1e-9),
          f"max errors {base_err:.2g} (base), {def_err:.2g} (defense), NBA 1952-2026")
    chk = s.merge(ref, on="season", suffixes=("", "_r"))
    e1 = (chk.rate_base - 3 * (chk.rate_value - chk.rs_rate_mean_r) / chk.rs_rate_sd_r).abs().max()
    e2 = (chk.run_base - 3 * (chk.run_raw - chk.rs_rate_mean_r) / chk.rs_rate_sd_r).abs().max()
    check("playoff bases use that season's regular-season ruler", int(max(e1, e2) > 1e-9), f"max error {max(e1, e2):.2g}")
    f = pd.read_csv(a.candidate_dir / "full_season_cv.csv", **rt)
    fe = ((f.rs_games * f.rs_cv_full + f.po_games_counted * f.playoff_cv_rate.fillna(0)) / (f.rs_games + f.po_games_counted) + f.title_bonus - f.full_season_cv).abs().max()
    check("Full-Season CV identity", int(fe > 1e-9), f"max error {fe:.2g}")
    nop = f[f.playoff_status.ne("INCLUDED")]
    check("no playoffs counted -> Full-Season CV equals regular-season CV", int(((nop.full_season_cv - nop.rs_cv_full).abs() > 1e-12).sum()), f"{len(nop)} rows")
    check("title bonus bounds", int(((f.title_bonus < -1e-12) | (f.title_bonus > 3 * f.po_games_counted / (f.rs_games + f.po_games_counted) + 1e-12)).sum()), "0 to 3 x playoff share of games")
    check("box-complete from 1965", (t[t.season >= 1965].box_share < 1).sum(), "every team-game 1965-2026 has a complete box score")
    check("unscored only without box evidence", (p.playoff_cv_run.isna() & p.box_games.gt(0)).sum(), "")
    check("rate qualification rule", (p.rate_qualified.astype(bool) != ((10 * p.g >= 7 * p.team_games) & p.playoff_cv_run.notna())).sum(),
          "10*G >= 7*team playoff games, scored rows only")

    # No-minutes invariance: replace every recorded minutes value with an arbitrary constant; scores must not move.
    tmp = Path(tempfile.mkdtemp())
    for f in a.input_dir.glob("*.csv"):
        shutil.copy(f, tmp / f.name)
    g = pd.read_csv(tmp / "playoff_player_games.csv", low_memory=False)
    mins = pd.to_numeric(g["numMinutes"], errors="coerce")
    g.loc[mins.notna(), "numMinutes"] = 1.0
    g.to_csv(tmp / "playoff_player_games.csv", index=False)
    q = playoffs.compute(tmp)[0]
    m = p.merge(q[["season", "player_id", "playoff_cv_run", "playoff_cv_rate"]], on=["season", "player_id"], suffixes=("", "_m"))
    diff = max((m.playoff_cv_run - m.playoff_cv_run_m).abs().max(), (m.playoff_cv_rate - m.playoff_cv_rate_m).abs().max())
    check("no dependence on minutes played", int(diff > 1e-12) + abs(len(m) - len(p)), f"all recorded minutes set to 1: max score change {diff:.2g}")
    shutil.rmtree(tmp)

    # Source coverage: appearances vs Neil Paine's postseason games, 1977-2026 (validation source).
    pa = pd.read_csv(a.paine, skiprows=1, low_memory=False)
    pa = pa[pa.Type.eq("PO")].rename(columns={"player_ID": "player_id", "Year": "season"})
    for c in ["season", "G", "WAR", "Tot"]:
        pa[c] = pd.to_numeric(pa[c], errors="coerce")
    pa = pa.groupby(["season", "player_id"], as_index=False).agg(paine_g=("G", "sum"), laker_war=("WAR", "sum"), laker=("Tot", "mean"))
    j = p[p.season >= 1977].merge(pa, on=["season", "player_id"], how="outer", indicator=True)
    both = j[j._merge.eq("both")]
    cov = dict(cv_rows_1977=int((j._merge != "right_only").sum()), paine_rows=int((j._merge != "left_only").sum()),
               matched=len(both), games_exact=float((both.g == both.paine_g).mean()), games_within_one=float(((both.g - both.paine_g).abs() <= 1).mean()))
    j[j._merge.ne("both")][["season", "player_id", "player", "g", "paine_g", "_merge"]].to_csv(out / "paine_unmatched.csv", index=False)

    # Descriptive validation (never used to fit): within-postseason Spearman with LAKER postseason metrics.
    v = both[both.playoff_cv_run.notna()]

    def mean_spearman(x, y, data):
        r = [g[x].rank().corr(g[y].rank()) for _, g in data.groupby("season") if len(g.dropna(subset=[x, y])) > 10]
        return float(np.nanmean(r))
    val = dict(run_vs_laker_war=mean_spearman("playoff_cv_run", "laker_war", v),
               rate_vs_laker_rate_qualified=mean_spearman("playoff_cv_rate", "laker", v[v.rate_qualified.astype(bool)]))

    # Evidence by season
    ev = t.groupby("season").agg(teams=("team", "size"), box_share=("box_share", "mean"), teams_no_box=("box_games", lambda x: int((x == 0).sum())))
    ev = ev.join(p.groupby("season").agg(players=("player_id", "size"), unscored=("playoff_cv_run", lambda x: int(x.isna().sum())),
                                         partial=("box_evidence", lambda x: int((x == "PARTIAL").sum()))))
    ev.to_csv(out / "box_evidence_by_season.csv")
    leaders = s.sort_values("playoff_cv_run", ascending=False).groupby("season").head(1)[
        ["season", "player", "team", "champion", "playoff_cv_run", "championship_credit", "playoff_cv_rate", "box_evidence"]]
    leaders.to_csv(out / "run_leader_by_postseason.csv", index=False)
    s.nlargest(100, "playoff_cv_run").to_csv(out / "top100_run.csv", index=False)
    s[s.rate_qualified.astype(bool)].nlargest(100, "playoff_cv_rate").to_csv(out / "top100_rate_qualified.csv", index=False)
    champs = s[s.champion.astype(bool)].sort_values("playoff_cv_run", ascending=False).groupby("season").head(1)
    check_df = pd.DataFrame(checks)
    check_df.to_csv(out / "mechanical_checks.csv", index=False)
    summary = dict(blocking_failures=int((~check_df.passed).sum()), checks=len(check_df), paine_coverage=cov, validation=val,
                   run_leader_is_champion_share=float(leaders.champion.astype(bool).mean()),
                   champion_top_run_player_is_postseason_leader=float(champs.set_index("season").playoff_cv_run.reindex(leaders.season).values.__eq__(leaders.playoff_cv_run.values).mean()))
    (out / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(check_df[["check", "violations", "passed", "evidence"]].to_string(index=False))
    print(json.dumps(summary, indent=2))
    if summary["blocking_failures"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
