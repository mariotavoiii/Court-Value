#!/usr/bin/env python3
"""Audit a frozen CV candidate without fitting or modifying its scores.

Inputs are the release CSVs and declared local validation sources. This module
does not import the legacy research calculator. Audit CSVs are evidence, not a
claim of independent basketball truth or a substitute for clean reproduction.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd

KEY = ["player_id", "season", "lg"]
TOL = 1e-9


def bools(series):
    return series.fillna(False).astype(str).str.lower().isin(["true", "1"])


def corr(a, b, rank=False):
    q = pd.concat([a, b], axis=1).dropna()
    if len(q) < 3 or q.iloc[:, 0].nunique() < 2 or q.iloc[:, 1].nunique() < 2:
        return np.nan
    if rank:
        q = q.rank(method="average")
    return float(q.iloc[:, 0].corr(q.iloc[:, 1]))


def sha(path):
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def save(frame, out, name):
    frame.to_csv(out / (name + ".csv"), index=False, float_format="%.15g")
    return frame


def fractional_top(values, k):
    weights = pd.Series(0.0, index=values.index)
    v = values.dropna()
    if not len(v) or k <= 0:
        return weights
    k = min(int(k), len(v))
    cutoff = v.nlargest(k).iloc[-1]
    weights.loc[v.index[v.gt(cutoff)]] = 1
    tied = v.eq(cutoff)
    weights.loc[v.index[tied]] = (k - int(v.gt(cutoff).sum())) / int(tied.sum())
    return weights


def checks_and_panels(p, s, out):
    checks = []

    def check(name, violations, evidence, blocking=True):
        checks.append(dict(check=name, violations=int(violations), passed=int(violations) == 0,
                           blocking=blocking, evidence=evidence))

    check("unique player-season-league", p.duplicated(KEY).sum(), "Primary unit is player × season × league")
    check("unique player-team-season-league", s.duplicated(KEY + ["team"]).sum(), "Stints cannot be double counted")
    check("only declared leagues", (~p.lg.isin(["NBA", "ABA"])).sum(), "No NBA/ABA crossover aggregate is substituted for league rows")
    check("finite available scores", np.isinf(p[["base_score", "frozen_score", "def_credit_universal"]].to_numpy()).sum(), "Missing values remain missing; infinity is invalid")
    expected_full = p.base_score + p.def_credit_universal
    full_error = (p.frozen_score - expected_full).abs()
    check("full CV addition and missingness", ((full_error > TOL) | p.frozen_score.isna().ne(expected_full.isna())).sum(),
          f"CV = CV_BASE + defensive credit; max absolute arithmetic error {full_error.max():.3g}")
    check("defensive compression bounds", (p.def_credit_universal.gt(1.5 + TOL) | p.def_credit_universal.lt(-.75 - TOL)).sum(), "Declared asymmetric tanh bounds are -0.75 to +1.5")
    check("qualification never below 70 percent", (p.qualified & p.availability.lt(.70)).sum(), "Qualification is >=0.70; no direct availability score multiplier")
    check("availability capped at one", (p.availability.gt(1 + TOL) | p.availability.lt(0)).sum(), "Research export retains raw availability separately when provided")
    if "missing_team_payload" in p:
        expected_q = (10 * p.G >= 7 * p.max_team_games) & ~bools(p.missing_team_payload)
        check("exact qualification rule", p.qualified.ne(expected_q).sum(), "Integer-exact: 10*G >= 7*team schedule, and complete team context")
    sched = "qualification_team_games" if "qualification_team_games" in s else "team_games"
    totals = s.groupby(KEY, as_index=False).agg(stint_G=("g", "sum"), stint_MP=("mp", "sum"), schedule_denominator=(sched, "max"))
    joined = p.merge(totals, on=KEY, validate="one_to_one")
    check("stint games aggregate", (joined.G.sub(joined.stint_G).abs() > TOL).sum(), "Player-season games are the sum across own league stints")
    check("stint minutes aggregate", (joined.MP.sub(joined.stint_MP).abs() > TOL).sum(), "Player-season minutes are the sum across own league stints")
    av_error = joined.availability - (joined.G / joined.schedule_denominator).clip(upper=1)
    check("schedule-aware availability", (av_error.abs() > TOL).sum(), f"G / max team schedule, capped at 1; max error {av_error.abs().max():.3g}")
    covered = p.base_score.notna() & p.MP.gt(0)
    check("full CV on every scored positive-minute row", (covered & p.frozen_score.isna()).sum(),
          "CV 1.1: one defensive rule covers NBA 1952-2026 and ABA 1968-76")
    for col in ["raw", "standardize_value"]:
        if col in p and col == "raw" and "standardize_value" in p:
            error = p.standardize_value - p.raw / p.G.replace(0, np.nan)
            check("no direct availability multiplier", (error.abs() > TOL).sum(), f"Standardization value equals raw/G; max error {error.abs().max():.3g}")
    def wmom(d):
        d = d[d.base_score.notna()]
        m = np.average(d.base_score, weights=d.G)
        return pd.Series(dict(n=len(d), mean=m, sd=np.sqrt(np.average((d.base_score - m) ** 2, weights=d.G)),
                              unweighted_mean=d.base_score.mean(), unweighted_sd=d.base_score.std(ddof=0)))
    moments = p[p.base_score.notna()].groupby(["season", "lg"]).apply(wmom, include_groups=False).reset_index()
    valid = moments.n.gt(1)
    check("games-weighted league-season base standardization", (valid & (moments["mean"].abs().gt(1e-9) | moments.sd.sub(3).abs().gt(1e-9))).sum(), "All available player-seasons, weighted by games; weighted mean 0 and weighted population SD 3")
    save(moments, out, "league_season_base_moments")
    eligible_col = next((x for x in ["mov_eligible", "eligible", "appearance_mov_eligible"] if x in s), None)
    used_col = next((x for x in ["mov_used", "used_mov", "release_mov"] if x in s), None)
    if eligible_col:
        eligible = bools(s[eligible_col])
        for col in ["appearance_games", "margin_games"]:
            if col in s:
                check("eligible MOV " + col, (eligible & s[col].ne(s.g)).sum(), "Exact official stint appearance count is required")
        if used_col:
            check("literal appearance MOV adopted", (eligible & s[used_col].sub(s.played_mov).abs().gt(TOL)).sum(), "Eligible input equals verified appearance-game MOV; no official-total anchoring")
            check("explicit full-season MOV fallback", (~eligible & s[used_col].sub(s.mov).abs().gt(TOL)).sum(), "Ineligible input equals full-season MOV")
    else:
        check("MOV gate inspectable", 1, "No recognized MOV eligibility field found")
    save(pd.DataFrame(checks), out, "mechanical_checks")

    p = joined.copy()
    p["full_rank_all_qualified"] = p.frozen_score.where(p.qualified).rank(ascending=False, method="min")
    p["full_rank_in_league_season"] = p.frozen_score.where(p.qualified).groupby([p.season, p.lg]).rank(ascending=False, method="min")
    p["base_rank_in_league_season"] = p.base_score.where(p.qualified).groupby([p.season, p.lg]).rank(ascending=False, method="min")
    p["defense_fraction_of_absolute_base"] = p.def_credit_universal / p.base_score.abs().replace(0, np.nan)
    p["mechanical_arithmetic_passed"] = (p.frozen_score - (p.base_score + p.def_credit_universal)).abs().le(TOL) | p.frozen_score.isna()
    full = p[p.qualified & p.frozen_score.notna()].copy()
    panels = {
        "top100_qualified_full": full.sort_values(["frozen_score"] + KEY, ascending=[False, True, True, True]).head(100),
        "bottom100_qualified_full": full.sort_values(["frozen_score"] + KEY).head(100),
        "largest_positive_defense": p.nlargest(50, "def_credit_universal"),
        "largest_negative_defense": p.nsmallest(50, "def_credit_universal"),
        "low_games_full_extremes": pd.concat([p[p.G.le(10)].nlargest(25, "frozen_score"), p[p.G.le(10)].nsmallest(25, "frozen_score")]).drop_duplicates(KEY),
        "low_games_base_extremes": pd.concat([p[p.G.le(10)].nlargest(25, "base_score"), p[p.G.le(10)].nsmallest(25, "base_score")]).drop_duplicates(KEY),
        "traded_qualified_full": full[full.stints.gt(1)].sort_values("frozen_score", ascending=False),
        "shortened_season_cases": p[p.season.isin([1999, 2012, 2020, 2021])].sort_values(["season", "base_score"], ascending=[True, False]).groupby("season").head(20),
        "aba_cases": p[p.lg.eq("ABA")].sort_values("base_score", ascending=False),
        "league_crossover_cases": p[p.groupby(["player_id", "season"]).lg.transform("nunique").gt(1)],
    }
    if "control_base" in p:
        p["base_change"] = p.base_score - p.control_base
        panels["largest_mov_changes"] = pd.concat([p.nlargest(50, "base_change"), p.nsmallest(50, "base_change")]).drop_duplicates(KEY)
    selected_keys = pd.concat([q[KEY] for q in panels.values()]).drop_duplicates(KEY)
    save(s.merge(selected_keys, on=KEY, validate="many_to_one"), out, "selected_case_stints")
    for name, frame in panels.items():
        save(frame, out, name)
    return p, pd.DataFrame(checks)


def adjacent(p, out):
    rows, samples = [], []
    for score, label in [("frozen_score", "qualified full CV"), ("base_score", "qualified CV_BASE")]:
        q = p[p.qualified & p[score].notna()].copy()
        q["within_season_percentile"] = q.groupby(["season", "lg"])[score].rank(pct=True)
        a = q[KEY + ["player", score, "G", "MP", "within_season_percentile"]]
        b = a.drop(columns="player").copy()
        b.season -= 1
        pairs = a.merge(b, on=KEY, suffixes=("_year1", "_year2"), validate="one_to_one")
        pairs["score_basis"] = label
        pairs["score_change"] = pairs[score + "_year2"] - pairs[score + "_year1"]
        samples.append(pairs)
        for league, g in pairs.groupby("lg"):
            rows.append(dict(score_basis=label, lg=league, adjacent_pairs=len(g),
                             first_season=int(g.season.min()), last_first_season=int(g.season.max()),
                             pearson=corr(g[score + "_year1"], g[score + "_year2"]),
                             spearman=corr(g[score + "_year1"], g[score + "_year2"], True),
                             percentile_pearson=corr(g.within_season_percentile_year1, g.within_season_percentile_year2),
                             median_absolute_change=float(g.score_change.abs().median()),
                             mean_absolute_change=float(g.score_change.abs().mean())))
    save(pd.DataFrame(rows), out, "adjacent_season_summary")
    save(pd.concat(samples, ignore_index=True), out, "adjacent_season_pairs")
    return rows


def distribution(p, out):
    rows = []
    for score, label in [("frozen_score", "qualified full CV"), ("base_score", "qualified CV_BASE")]:
        q = p[p.qualified & p[score].notna()].copy()
        q["decade"] = (q.season // 10 * 10).astype(str) + "s"
        q["top100_weight"] = fractional_top(q[score], 100)
        for (league, era), g in q.groupby(["lg", "decade"]):
            rows.append(dict(score_basis=label, lg=league, era=era, n=len(g), seasons=g.season.nunique(),
                             mean=g[score].mean(), population_sd=g[score].std(ddof=0), median=g[score].median(),
                             p90=g[score].quantile(.90), p95=g[score].quantile(.95), p99=g[score].quantile(.99),
                             minimum=g[score].min(), maximum=g[score].max(), top100_count=g.top100_weight.sum(),
                             share_of_eligible_population=len(g)/len(q), top100_expected_under_exchangeability=100*len(g)/len(q)))
    save(pd.DataFrame(rows), out, "era_distribution")
    season_rows=[]
    for (season, league), g in p.groupby(["season", "lg"]):
        season_rows.append(dict(season=season, lg=league, players=len(g), teams=g.teams.str.split(",").explode().nunique(),
                                qualified=int(g.qualified.sum()), full=int(g.frozen_score.notna().sum()),
                                qualified_full=int((g.qualified & g.frozen_score.notna()).sum()),
                                base_only=int((g.base_score.notna() & g.frozen_score.isna()).sum()),
                                min_schedule=g.schedule_denominator.min(), max_schedule=g.schedule_denominator.max()))
    save(pd.DataFrame(season_rows), out, "season_structure_and_coverage")
    return rows


def external_metrics(p, source, out):
    a = pd.read_csv(source / "Advanced.csv")
    aggregate = a.team.astype(str).str.fullmatch(r"\d+TM")
    counts = a.groupby(KEY).team.transform("size")
    a = a[(counts.eq(1)) | aggregate].copy()
    if a.duplicated(KEY).any():
        raise ValueError("Advanced aggregate rows are not unique")
    metrics = ["per", "ws", "ws_48", "bpm", "vorp"]
    q = p.merge(a[KEY + metrics], on=KEY, how="left", validate="one_to_one")
    ledger_path = source / "outputs/cv_player_seasons_1952_2026/CV_Player_Seasons_1952_2026.csv"
    if ledger_path.exists():
        ledger = pd.read_csv(ledger_path, usecols=["player_id", "season", "phase", "league", "laker_total", "laker_war", "laker_war82"])
        l = ledger[ledger.phase.eq("RS") & ledger.league.eq("NBA")].rename(columns={"league": "lg"})
        metrics += ["laker_total", "laker_war", "laker_war82"]
        q = q.merge(l[KEY + metrics[-3:]], on=KEY, how="left", validate="one_to_one")
    rows = []
    qualified = q[q.qualified & q.frozen_score.notna() & q.control_cv.notna()]
    cohorts = {"qualified full CV all available": qualified}
    if "season_high_confidence" in q:
        cohorts["qualified full CV high confidence defense"] = qualified[bools(qualified.season_high_confidence)]
    for panel, panel_data in cohorts.items():
        for metric in metrics:
            d = panel_data.dropna(subset=[metric, "control_cv", "frozen_score"])
            if d.empty:
                continue
            rows.append(dict(panel=panel, metric=metric, n=len(d), season_min=int(d.season.min()), season_max=int(d.season.max()),
                             leagues=",".join(sorted(d.lg.unique())), control_spearman=corr(d.control_cv,d[metric],True),
                             candidate_spearman=corr(d.frozen_score,d[metric],True), control_pearson=corr(d.control_cv,d[metric]),
                             candidate_pearson=corr(d.frozen_score,d[metric])))
    result = pd.DataFrame(rows)
    result["spearman_change"] = result.candidate_spearman - result.control_spearman
    save(result, out, "external_metric_comparison")
    common = qualified[qualified.lg.eq("NBA")].dropna(subset=metrics[:5]).copy()
    for metric in metrics[:5] + ["frozen_score"]:
        common[metric + "_percentile"] = common.groupby(["season", "lg"])[metric].rank(pct=True)
    common["external_mean_percentile"] = common[[x + "_percentile" for x in metrics[:5]]].mean(axis=1)
    common["cv_minus_external_percentile_points"] = 100*(common.frozen_score_percentile-common.external_mean_percentile)
    save(pd.concat([common.nlargest(30,"cv_minus_external_percentile_points"), common.nsmallest(30,"cv_minus_external_percentile_points")]), out, "external_disagreements")
    if "laker_total" in q:
        lk = qualified[qualified.lg.eq("NBA")].dropna(subset=["laker_total"]).copy()
        lk["cv_percentile"] = lk.groupby("season").frozen_score.rank(pct=True)
        lk["laker_percentile"] = lk.groupby("season").laker_total.rank(pct=True)
        lk["cv_minus_laker_percentile_points"] = 100*(lk.cv_percentile-lk.laker_percentile)
        save(pd.concat([lk.nlargest(20,"cv_minus_laker_percentile_points"),lk.nsmallest(20,"cv_minus_laker_percentile_points")]), out,"laker_disagreements")
    return q, rows


def recognition(p, source, out):
    allstar = pd.read_csv(source / "All-Star Selections.csv")
    allnba = pd.read_csv(source / "End of Season Teams.csv")
    awards = pd.read_csv(source / "Player Award Shares.csv")
    mvp = awards[awards.award.eq("nba mvp")].copy()
    outcomes = {"all_star": allstar[allstar.lg.eq("NBA")], "all_nba": allnba[allnba.lg.eq("NBA") & allnba.type.eq("All-NBA")]}
    q = p[p.qualified & p.lg.eq("NBA")].dropna(subset=["frozen_score", "control_cv"])
    rows, ballots = [], []
    for score, label in [("control_cv", "full-season MOV control"), ("frozen_score", "CV candidate")]:
        b = q.copy()
        b["rank"] = b.groupby("season")[score].rank(ascending=False, method="min")
        result = dict(metric=label, n=len(b), season_min=int(b.season.min()), season_max=int(b.season.max()))
        for name, actual in outcomes.items():
            actual = actual.drop_duplicates(["season", "player_id"])
            hit = total = 0.0
            years = 0
            for season, chosen in actual.groupby("season"):
                pool = b[b.season.eq(season)]
                ids = set(chosen.player_id) & set(pool.player_id)
                if not ids:
                    continue
                years += 1
                weights = fractional_top(pool[score], len(ids))
                hit += weights[pool.player_id.isin(ids)].sum()
                total += len(ids)
            result.update({name + "_topn_overlap":hit/total if total else np.nan, name + "_hit_credit":hit,
                           name + "_matched_selections":int(total), name + "_matched_seasons":years})
        winners = mvp[bools(mvp.winner)].merge(b[["season", "player_id", "rank"]], on=["season", "player_id"], validate="one_to_one")
        result["mvp_winner_seasons"] = len(winners)
        for k in [1,3,5]:
            result[f"mvp_winner_top{k}"] = winners["rank"].le(k).mean()
        rhos = []
        for season, votes in mvp.groupby("season"):
            pool = votes.merge(b[b.season.eq(season)][["player_id", score]], on="player_id", validate="one_to_one")
            rho = corr(pool.share, pool[score], True)
            if pd.notna(rho):
                rhos.append(rho)
                ballots.append(dict(metric=label, season=season, matched_ballot_rows=len(pool), spearman=rho))
        result["mvp_vote_mean_season_spearman"] = np.mean(rhos) if rhos else np.nan
        result["mvp_vote_seasons"] = len(rhos)
        rows.append(result)
    save(pd.DataFrame(rows), out, "recognition_comparison")
    save(pd.DataFrame(ballots), out, "recognition_mvp_by_season")
    return rows


def availability_scenarios(out):
    # Hold active-game production and responsibility fixed. This isolates the
    # mathematical cancellation; it is not a roster counterfactual with new tiers.
    rows = []
    for schedule in [82, 66, 50, 72]:
        for games in [82,70,60,50,40,25]:
            if games > schedule:
                continue
            rows.append(dict(schedule_games=schedule, games=games, availability=games/schedule,
                             qualified=games/schedule>=.70, production_while_active=30.0,
                             fixed_pace=1.0, fixed_role_weight=1.0, fixed_context_z=1.0,
                             context=1+.125*np.tanh(.75), raw=games*30*(1+.125*np.tanh(.75)),
                             standardization_value=30*(1+.125*np.tanh(.75)),
                             direct_availability_multiplier=1.0,
                             interpretation="Fixed role/context and reference population; actual role may change when availability changes"))
    save(pd.DataFrame(rows), out, "availability_scenarios")


def audit_added_mov(p, s, source, out):
    """Rejoin newly admitted appearances from original research evidence.

    Uses no candidate-engine identity/MOV functions. It independently checks
    literal appearance means, verified reciprocal finals and original counts.
    """
    def normalized(value):
        value = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode().lower()
        value = re.sub(r"\s+(jr|sr|ii|iii|iv)\.?$", "", value)
        return re.sub("[^a-z0-9]", "", value)

    old_dir = source / "outputs/cv_verified_mov_2026_09"
    extra = s[bools(s.eligible) & ~bools(s.prior_trial_eligible)].copy()
    keys = extra[KEY + ["team"]]
    appearances = pd.read_csv(old_dir / "appearance_score_join.csv", low_memory=False)
    ledger = pd.read_csv(source / "outputs/cv_player_seasons_1952_2026/CV_Player_Seasons_1952_2026.csv", usecols=["season", "player_id", "nba_person_id", "player"])
    ids = ledger[["season", "player_id", "nba_person_id"]].dropna().drop_duplicates()
    ids["personId"] = ids.nba_person_id.astype(str).str.split("|")
    ids = ids.explode("personId")
    ids["personId"] = pd.to_numeric(ids.personId)
    ids = ids[["season", "personId", "player_id"]].drop_duplicates()
    ids = ids[ids.groupby(["season", "personId"]).player_id.transform("nunique").eq(1)]
    appearances = appearances.merge(ids, on=["season", "personId"], how="left", validate="many_to_one")
    names = ledger[["season", "player_id", "player"]].drop_duplicates()
    names["name_key"] = names.player.map(normalized)
    names = names[["season", "name_key", "player_id"]].drop_duplicates()
    names = names[names.groupby(["season", "name_key"]).player_id.transform("nunique").eq(1)]
    appearances = appearances.merge(names.rename(columns={"player_id": "name_player_id"}), on=["season", "name_key"], how="left", validate="many_to_one")
    appearances["identity_conflict_check"] = appearances.player_id.notna() & appearances.name_player_id.notna() & appearances.player_id.ne(appearances.name_player_id)
    appearances["player_id"] = appearances.player_id.fillna(appearances.name_player_id)
    teams = pd.read_csv(source / "Team Totals.csv")
    teams = teams[teams.lg.eq("NBA") & teams.abbreviation.notna()][["season", "team", "abbreviation"]].drop_duplicates()
    teams["team_key"] = teams.team.map(normalized)
    appearances["team_key"] = appearances.team_name.map(normalized).replace({"ftwaynezollnerpistons":"fortwaynepistons", "oklahomacityhornets":"neworleansoklahomacityhornets", "laclippers":"losangelesclippers"})
    appearances = appearances.merge(teams[["season", "team_key", "abbreviation"]].rename(columns={"abbreviation":"team"}), on=["season", "team_key"], how="left", validate="many_to_one")
    appearances["lg"] = "NBA"
    added = appearances.merge(keys, on=KEY+["team"], validate="many_to_one")
    final = pd.read_csv(old_dir / "team_game_results.csv", low_memory=False)
    final = final[final.gameId.notna()][["season", "gameId", "team", "opponent", "final_points", "final_opponent_points", "verified", "margin", "source_url", "corroborating_source_url"]]
    reverse = final[["season","gameId","team","opponent","final_points","final_opponent_points","verified"]].rename(columns={"team":"opponent", "opponent":"team", "final_points":"reciprocal_points", "final_opponent_points":"reciprocal_opponent_points", "verified":"reciprocal_verified"})
    final = final.merge(reverse,on=["season","gameId","team","opponent"],how="left",validate="one_to_one")
    final["independent_paired_verified"] = bools(final.verified) & bools(final.reciprocal_verified) & final.final_points.eq(final.reciprocal_opponent_points) & final.final_opponent_points.eq(final.reciprocal_points)
    final["independent_margin"] = (final.final_points-final.final_opponent_points).where(final.independent_paired_verified)
    added = added.rename(columns={"margin":"prior_join_margin", "verified":"prior_join_verified"}).merge(final,on=["season","gameId","team"],how="left",validate="many_to_one")
    added["duplicate_appearance_check"] = added.duplicated(KEY+["team","gameId"],keep=False)
    agg = added.groupby(KEY+["team"],as_index=False).agg(rechecked_unique_games=("gameId","nunique"), rechecked_rows=("gameId","size"), rechecked_verified_games=("independent_margin","count"), independent_played_mov=("independent_margin","mean"), identity_conflicts=("identity_conflict_check","sum"), duplicate_appearances=("duplicate_appearance_check","sum"))
    audit = extra.merge(agg,on=KEY+["team"],how="left",validate="one_to_one")
    audit["count_error"] = audit.rechecked_unique_games-audit.g
    audit["mov_error"] = audit.independent_played_mov-audit.mov_used
    audit["independently_passed"] = audit.rechecked_unique_games.eq(audit.g) & audit.rechecked_rows.eq(audit.g) & audit.rechecked_verified_games.eq(audit.g) & audit.identity_conflicts.eq(0) & audit.duplicate_appearances.eq(0) & audit.mov_error.abs().le(TOL)
    save(audit,out,"additional_mov_stints_independent_audit")
    save(added,out,"additional_mov_game_evidence")
    old = pd.read_csv(old_dir / "candidate/player_season_comparison.csv")
    old = old[KEY+["literal_played_mov_base","literal_played_mov_cv","all_stints_eligible"]]
    comp = p.merge(old,on=KEY,validate="one_to_one",suffixes=("","_prior"))
    additional = keys.groupby(KEY).size().rename("newly_eligible_stints").reset_index()
    comp = comp.merge(additional,on=KEY,how="left",validate="one_to_one")
    comp["newly_eligible_stints"] = comp.newly_eligible_stints.fillna(0).astype(int)
    comp["versus_prior_literal_base"] = comp.base_score-comp.literal_played_mov_base
    comp["versus_prior_literal_full"] = comp.frozen_score-comp.literal_played_mov_cv
    save(comp,out,"prior_literal_comparison")
    cohorts = {"all rows":comp, "player-seasons with newly eligible stint":comp[comp.newly_eligible_stints.gt(0)], "previously fully eligible":comp[bools(comp.all_stints_eligible_prior if "all_stints_eligible_prior" in comp else comp.all_stints_eligible)]}
    rows=[]
    for label, q in cohorts.items():
        for score, oldscore in [("base_score","literal_played_mov_base"),("frozen_score","literal_played_mov_cv")]:
            g=q.dropna(subset=[score,oldscore])
            rows.append(dict(cohort=label,score_basis=score,n=len(g),spearman=corr(g[score],g[oldscore],True),mean_absolute_change=(g[score]-g[oldscore]).abs().mean(),max_absolute_change=(g[score]-g[oldscore]).abs().max()))
    save(pd.DataFrame(rows),out,"prior_literal_summary")
    return dict(additional_stints=len(audit),additional_player_seasons=len(additional),independently_failed_stints=int((~audit.independently_passed).sum()),maximum_mov_error=float(audit.mov_error.abs().max()),verified_appearance_rows=len(added))


def named_cases(p, out):
    cases = [("jamesle01",2009,"high production and responsibility"),("jordami01",1988,"high production and responsibility"),
             ("russebi01",1964,"defense-first historical center"),("chambwi01",1962,"extreme historical production"),
             ("ervinju01",1976,"ABA superstar"),("mcadobo01",1975,"high production center"),
             ("greendr01",2017,"defensive leader"),("jacksja02",2023,"DPOY disagreement"),
             ("cambyma01",2007,"DPOY disagreement"),("eatonma01",1985,"DPOY disagreement"),
             ("poolejo01",2023,"volume role versus LAKER impact"),("rodmade01",1992,"rebounding/defense specialist"),
             ("lillada01",2023,"largest qualified MOV increase"),("mccolcj01",2022,"traded MOV attribution"),
             ("hoodro01",2018,"largest qualified MOV decrease"),("leonaka01",2019,"availability/context tradeoff"),
             ("embiijo01",2024,"high unqualified active-game performance"),("grayra01",2023,"one-game sample"),
             ("jokicni01",2025,"current season base-only"),("duncati01",1999,"shortened season"),
             ("jamesle01",2012,"shortened season"),("jamesle01",2020,"unequal shortened schedules")]
    q = pd.DataFrame(cases, columns=["player_id","season","audit_archetype"])
    save(q.merge(p,on=["player_id","season"],how="left",validate="one_to_many"),out,"representative_archetypes")


def defense_rule_checks(p, input_dir, reference_dir, candidate_dir, out):
    """CV 1.1 checks: frozen estimator reproduces, team defense recomputes, base unchanged vs reference."""
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from cv1 import defense_estimator as de
    rows, result = [], {}
    def add(name, violations, evidence):
        rows.append(dict(check=name, violations=int(violations), passed=int(violations) == 0, blocking=True, evidence=evidence))
    if input_dir is not None:
        tt = pd.read_csv(input_dir / "Team Totals.csv", float_precision="round_trip", low_memory=False)
        ot = pd.read_csv(input_dir / "Opponent Totals.csv", float_precision="round_trip", low_memory=False)
        beta = de.fit_coefficients(de.team_frame(tt, ot))
        err = float(np.max(np.abs(beta - np.asarray(de.COEFFICIENTS))))
        add("defense coefficients reproduce from inputs", err > 1e-12, f"refit {beta.tolist()}; max difference {err:.3g}")
        td = de.team_defense(tt, ot)
        cand = pd.read_csv(candidate_dir / "team_defense.csv", float_precision="round_trip")
        m = cand.merge(td, on=["season", "lg", "team"], suffixes=("", "_re"), validate="one_to_one")
        d = (m.team_def_z_universal - m.team_def_z_universal_re).abs()
        add("team defense recomputes", int((d > TOL).sum()) + abs(len(m) - len(cand)), f"{len(m)} team-seasons; max difference {d.max():.3g}")
        # Diagnostic only: agreement with TeamDef built on recorded opponent attempts where recorded.
        rec = td.dropna(subset=["recorded_opp_attempts"]).copy()
        rec["psa_rec"] = rec.league_psa - rec.opp_pts / rec.recorded_opp_attempts
        rec["z_rec"] = rec.groupby(["season", "lg"]).psa_rec.transform(lambda x: (x - x.mean()) / x.std(ddof=0))
        rec["team_def_recorded_attempts"] = 0.8 * rec.z_rec + 0.2 * rec.ppg_suppression_z
        diag = [dict(league=lg, seasons=f"{int(g.season.min())}-{int(g.season.max())}", team_seasons=len(g),
                     pearson_vs_recorded=float(g.team_def_z_universal.corr(g.team_def_recorded_attempts))) for lg, g in rec.groupby("lg")]
        save(pd.DataFrame(diag), out, "defense_estimate_vs_recorded_attempts")
        result["defense_estimate_vs_recorded"] = diag
    if reference_dir is not None:
        ref = pd.read_csv(reference_dir / "cv_player_seasons.csv", float_precision="round_trip", low_memory=False)
        m = p.merge(ref[KEY + ["cv_base", "cv_full", "def_credit"]], on=KEY, how="outer", validate="one_to_one", indicator=True)
        d = (m.base_score - m.cv_base).abs()
        add("CV_BASE unchanged vs reference release", int(m._merge.ne("both").sum() + (d > 0).sum() + m.base_score.isna().ne(m.cv_base.isna()).sum()),
            f"reference {reference_dir}; max difference {d.max():.3g}")
        q = m[bools(m.qualified) & m.frozen_score.notna() & m.cv_full.notna()]
        result["vs_reference_qualified_full"] = dict(rows=len(q), spearman=corr(q.cv_full, q.frozen_score, True),
            mean_abs_change=float((q.frozen_score - q.cv_full).abs().mean()), max_abs_change=float((q.frozen_score - q.cv_full).abs().max()),
            newly_full_qualified=int((bools(m.qualified) & m.frozen_score.notna() & m.cv_full.isna()).sum()))
        ch = q.assign(change=q.frozen_score - q.cv_full, abs_change=(q.frozen_score - q.cv_full).abs()).nlargest(100, "abs_change")
        save(ch[KEY + ["player", "cv_full", "frozen_score", "def_credit", "def_credit_universal", "change"]].rename(
            columns={"cv_full": "reference_cv_full", "frozen_score": "cv_full", "def_credit": "reference_def_credit", "def_credit_universal": "def_credit"}),
            out, "largest_changes_vs_reference")
    return pd.DataFrame(rows), result


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--candidate-dir",type=Path,required=True)
    ap.add_argument("--source-dir",type=Path,required=True)
    ap.add_argument("--output-dir",type=Path,required=True)
    ap.add_argument("--input-dir",type=Path,default=None,help="declared input snapshot (defense-rule checks)")
    ap.add_argument("--reference-dir",type=Path,default=None,help="previous release outputs (CV_BASE invariance)")
    args = ap.parse_args()
    out = args.output_dir
    out.mkdir(parents=True,exist_ok=True)
    player_path = args.candidate_dir / "cv_player_seasons.csv"
    stint_path = args.candidate_dir / "cv_player_stints.csv"
    # Exact round-trip parsing: the default fast parser can move a value by one ULP
    # and misclassify exact 70 percent availability boundaries.
    p = pd.read_csv(player_path,low_memory=False,float_precision="round_trip")
    s = pd.read_csv(stint_path,low_memory=False,float_precision="round_trip")
    p = p.rename(columns={"cv_base": "base_score", "cv_full": "frozen_score", "def_credit": "def_credit_universal",
                          "control_cv_full": "control_cv", "control_cv_base": "control_base", "rate": "standardize_value"})
    s = s.rename(columns={"mov_full_season": "mov"})
    p["qualified"] = bools(p.qualified)
    p, checks = checks_and_panels(p,s,out)
    rule_checks, rule_result = defense_rule_checks(p, args.input_dir, args.reference_dir, args.candidate_dir, out)
    if len(rule_checks):
        checks = pd.concat([checks, rule_checks], ignore_index=True)
        save(checks, out, "mechanical_checks")
    year = adjacent(p,out)
    eras = distribution(p,out)
    metrics, external = external_metrics(p,args.source_dir,out)
    awards = recognition(p,args.source_dir,out)
    availability_scenarios(out)
    named_cases(metrics,out)
    extra_mov = audit_added_mov(p,s,args.source_dir,out)
    common = p[p.qualified & p.frozen_score.notna() & p.control_cv.notna()]
    summary = dict(candidate_dir=args.candidate_dir.name, rows=len(p), stints=len(s),
                   qualified_full=int((p.qualified&p.frozen_score.notna()).sum()),
                   full_available=int(p.frozen_score.notna().sum()),
                   base_only=int((p.base_score.notna()&p.frozen_score.isna()).sum()),
                   qualified_base=int((p.qualified&p.base_score.notna()).sum()),
                   blocking_mechanical_failures=int((~checks.passed & checks.blocking).sum()),
                   control_candidate_qualified_full_spearman=corr(common.control_cv,common.frozen_score,True),
                   mean_absolute_qualified_full_change=float((common.frozen_score-common.control_cv).abs().mean()),
                   maximum_absolute_qualified_full_change=float((common.frozen_score-common.control_cv).abs().max()),
                   additional_mov_audit=extra_mov, defense_rule=rule_result,
                   adjacent_season=year, external_metrics=external, recognition=awards,
                   scope="Descriptive validation, exact mechanical checks, and audit selections; no coefficients fitted",
                   qualitative_review="See docs/VALIDATION.md and anomaly_log.csv. CSV selection alone is not certification.")
    (out/"summary.json").write_text(json.dumps(summary,indent=2,allow_nan=False)+"\n")
    sources=[player_path,stint_path]+[args.source_dir/x for x in ["Advanced.csv","Player Award Shares.csv","End of Season Teams.csv","All-Star Selections.csv"]]
    ledger=args.source_dir/"outputs/cv_player_seasons_1952_2026/CV_Player_Seasons_1952_2026.csv"
    if ledger.exists():
        sources.append(ledger)
    def label(x):
        for base, tag in [(args.candidate_dir, "candidate"), (args.source_dir, "source")]:
            try:
                return f"{tag}/{x.resolve().relative_to(base.resolve())}"
            except ValueError:
                pass
        return x.name
    (out/"audit_input_hashes.json").write_text(json.dumps({label(x):sha(x) for x in sources},indent=2)+"\n")
    print(json.dumps({k:v for k,v in summary.items() if k not in ["external_metrics","recognition","adjacent_season"]},indent=2))
    if summary["blocking_mechanical_failures"] or extra_mov["independently_failed_stints"]:
        raise SystemExit(1)


if __name__=="__main__":
    main()
