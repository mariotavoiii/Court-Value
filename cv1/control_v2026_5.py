"""FROZEN CONTROL (identical to the 1.0.0-rc.1 engine; full-season MOV when mov_stints is None). Do not edit.

Court Value 1.0 regular-season calculator.

The v2026.5-derived reconstruction is the architectural control. The optional
MOV table supplies verified appearance-game MOV or explicitly flagged fallback
MOV; the caller is responsible for constructing its appearance evidence.
No research scripts, network access, or output writes are used by this module.
"""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd

PLAYER_KEY = ["player_id", "season", "lg"]
TEAM_KEY = ["season", "lg", "team"]
STINT_KEY = PLAYER_KEY + ["team"]
ROLE_MAP = {1: 1.00, 2: 0.85, 3: 0.35, 4: 0.15}
DEF_ROLE_MAP = {1: 1.00, 2: 0.60, 3: 0.25, 4: 0.00}
SCORE_RECONCILIATION_TOLERANCE = 0.01


def pop_z(s: pd.Series) -> pd.Series:
    """Unweighted population Z, preserving missing values and degenerate zero."""
    x = pd.to_numeric(s, errors="raise").astype(float)
    if np.isinf(x).any():
        raise ValueError("Infinite input to population standardization")
    out = pd.Series(np.nan, index=x.index, dtype=float)
    ok = x.notna()
    if not ok.any():
        return out
    sd = x.loc[ok].std(ddof=0)
    if not np.isfinite(sd):
        raise ValueError("Nonfinite population standard deviation")
    out.loc[ok] = 0.0 if sd == 0 else (x.loc[ok] - x.loc[ok].mean()) / sd
    return out


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]", "", value.lower())


def _require(frame: pd.DataFrame, columns: list[str], label: str) -> None:
    missing = sorted(set(columns).difference(frame.columns))
    if missing:
        raise ValueError(f"{label}: missing columns {missing}")


def _unique(frame: pd.DataFrame, keys: list[str], label: str) -> None:
    _require(frame, keys, label)
    for key in keys:
        if frame[key].isna().any() or frame[key].astype(str).str.strip().eq("").any():
            raise ValueError(f"{label}: missing/empty identity {key}")
    if frame.duplicated(keys).any():
        raise ValueError(f"{label}: duplicate key {keys}")


def _numbers(frame: pd.DataFrame, columns: list[str], label: str,
             allow_missing: pd.Series | None = None) -> None:
    _require(frame, columns, label)
    allowed = pd.Series(False, index=frame.index) if allow_missing is None else allow_missing
    for column in columns:
        frame[column] = pd.to_numeric(frame[column], errors="raise")
        if np.isinf(frame[column]).any() or (frame[column].isna() & ~allowed).any():
            raise ValueError(f"{label}: nonfinite or missing {column}")
        if frame[column].lt(0).any():
            raise ValueError(f"{label}: negative {column}")


def _read_inputs(input_dir: Path) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    p = pd.read_csv(input_dir / "Player Totals.csv")
    tt = pd.read_csv(input_dir / "Team Totals.csv")
    ot = pd.read_csv(input_dir / "Opponent Totals.csv")
    gt = pd.read_csv(input_dir / "defense_game_team.csv")
    for label, frame in [("Team Totals", tt), ("Opponent Totals", ot)]:
        _require(frame, ["team", "season", "lg", "abbreviation"], label)
    tt = tt.loc[tt["team"].astype(str).str.strip().ne("League Average")].copy()
    ot = ot.loc[ot["team"].astype(str).str.strip().ne("League Average")].copy()
    _require(p, ["player"], "Player Totals")
    _unique(p, STINT_KEY, "Player Totals")
    if p["player"].isna().any() or p["player"].astype(str).str.strip().eq("").any():
        raise ValueError("Player Totals: missing player display name")
    if p["team"].astype(str).str.fullmatch(r"(?i)(TOT|\d+TM|League Average)").any():
        raise ValueError("Player Totals: aggregate player rows are forbidden")
    _numbers(p, ["season", "g", "mp", "pts", "ast", "trb", "fga", "fta"], "Player Totals")
    if p["g"].le(0).any() or p["g"].mod(1).ne(0).any():
        raise ValueError("Player Totals: games must be positive integers")
    for label, frame, payload in [
        ("Team Totals", tt, ["g", "pts", "fga", "fta"]),
        ("Opponent Totals", ot, ["opp_pts"]),
    ]:
        _unique(frame, ["season", "lg", "abbreviation"], label)
        _numbers(frame, ["season"], label)
        exception = frame["season"].eq(1955) & frame["lg"].eq("NBA") & frame["abbreviation"].eq("BLB")
        _numbers(frame, payload, label, allow_missing=exception)
        if frame.loc[exception, payload].notna().any().any():
            raise ValueError(f"{label}: 1955 BLB exception must remain entirely unavailable until separately audited")
        for col in payload:
            if col != "fta" and frame.loc[~exception, col].le(0).any():
                raise ValueError(f"{label}: {col} must be positive")
    for label, frame in [("Player Totals", p), ("Team Totals", tt), ("Opponent Totals", ot)]:
        if frame["season"].mod(1).ne(0).any():
            raise ValueError(f"{label}: noninteger season")
        allowed_leagues = ["NBA", "ABA"] if label == "Player Totals" else ["NBA", "ABA", "BAA"]
        if not frame["lg"].isin(allowed_leagues).all():
            raise ValueError(f"{label}: unsupported league")
    if tt["g"].dropna().mod(1).ne(0).any():
        raise ValueError("Team Totals: games must be integers")
    _unique(gt, ["season", "gameId", "nba_team"], "defense_game_team")
    _numbers(gt, ["season", "gameId", "game_team_pts"], "defense_game_team")
    if gt["season"].mod(1).ne(0).any() or gt["gameId"].mod(1).ne(0).any():
        raise ValueError("defense_game_team: noninteger game or season identifier")
    return p, tt, ot, gt


def _team_context(tt: pd.DataFrame, ot: pd.DataFrame) -> pd.DataFrame:
    key = ["season", "lg", "abbreviation"]
    team = tt[key + ["team", "g", "pts", "fga", "fta"]].rename(columns={
        "abbreviation": "team", "team": "team_name", "g": "team_games",
        "pts": "team_pts", "fga": "team_fga", "fta": "team_fta",
    })
    opp = ot[key + ["opp_pts"]].rename(columns={"abbreviation": "team"})
    team = team.merge(opp, on=TEAM_KEY, how="outer", validate="one_to_one", indicator=True)
    if not team["_merge"].eq("both").all():
        raise ValueError("Team and opponent identities do not agree")
    team = team.drop(columns="_merge")
    team["mov"] = (team["team_pts"] - team["opp_pts"]) / team["team_games"]
    group = team.groupby(["season", "lg"])
    team["z_mov"] = group["mov"].transform(pop_z)
    team["mov_league_mean"] = group["mov"].transform("mean")
    team["mov_league_sd"] = group["mov"].transform(lambda s: s.std(ddof=0))
    team["pace_adj"] = 2 * team["team_pts"] / (team["team_pts"] + team["opp_pts"])
    team["league_pts"] = group["team_pts"].transform("sum")
    team["league_fga"] = group["team_fga"].transform("sum")
    team["league_fta"] = group["team_fta"].transform("sum")
    team["league_psa"] = team["league_pts"] / (team["league_fga"] + 0.44 * team["league_fta"])
    return team


def _assign_weights(p: pd.DataFrame, score_col: str, prefix: str,
                    weights: dict[int, float]) -> pd.DataFrame:
    out = p.sort_values(TEAM_KEY + [score_col, "visible_role", "g", "pts", "player_id"],
                        ascending=[True, True, True, False, False, False, False, True],
                        kind="mergesort").copy()
    out[f"{prefix}_rank"] = out.groupby(TEAM_KEY).cumcount() + 1
    n = out["roster_n"].astype(float)
    k = np.ceil(np.sqrt(n))
    tier = np.floor((out[f"{prefix}_rank"] - 1) * k / n) + 1
    out[f"{prefix}_tier"] = np.minimum(tier, 4).astype(int)
    out[f"{prefix}_weight"] = out[f"{prefix}_tier"].map(weights).astype(float)
    return out.sort_index()


def _stints(p: pd.DataFrame, team: pd.DataFrame, mov_stints: pd.DataFrame | None) -> pd.DataFrame:
    p = p.merge(team, on=TEAM_KEY, how="left", validate="many_to_one", indicator=True)
    if not p["_merge"].eq("both").all():
        raise ValueError("Player stint has no declared team context row")
    p = p.drop(columns="_merge")
    p["attempts"] = p["fga"] + 0.44 * p["fta"]
    p["box_impact"] = p["pts"] + 0.65 * p["ast"] + 0.65 * p["trb"]
    p["visible_role"] = p["box_impact"] + 0.25 * p["attempts"]
    p["availability_stint_raw"] = p["g"] / p["team_games"]
    p["availability_stint"] = p["availability_stint_raw"].clip(upper=1.0)
    p["visible_z"] = p.groupby(TEAM_KEY)["visible_role"].transform(pop_z)
    p["availability_z"] = p.groupby(TEAM_KEY)["availability_stint"].transform(pop_z)
    p["role_score"] = 0.85 * p["visible_z"] + 0.15 * p["availability_z"]
    p["roster_n"] = p.groupby(TEAM_KEY)["player_id"].transform("size")
    p["team_mp_total"] = p.groupby(TEAM_KEY)["mp"].transform("sum")
    p["mp_share"] = p["mp"] / p["team_mp_total"].replace(0, np.nan)
    p = _assign_weights(p, "role_score", "role", ROLE_MAP)
    p["w_hard"] = p["role_weight"]
    p = _assign_weights(p, "mp", "def", DEF_ROLE_MAP)
    p["eff_adj"] = 0.30 * (p["pts"] - 0.92 * p["league_psa"] * p["attempts"])
    p["prod_eff"] = p["box_impact"] + p["eff_adj"]
    p["z_mov_control"] = p["z_mov"]
    if mov_stints is None:
        p["mov_used"] = p["mov"]
        p["mov_method"] = "full_season_control"
    else:
        mov = mov_stints.copy()
        _require(mov, STINT_KEY + ["mov_used", "mov_method"], "MOV table")
        _unique(mov, STINT_KEY, "MOV table")
        if mov["mov_method"].isna().any() or mov["mov_method"].astype(str).str.strip().eq("").any():
            raise ValueError("MOV table: missing method flag")
        mov["mov_used"] = pd.to_numeric(mov["mov_used"], errors="raise")
        if np.isinf(mov["mov_used"]).any():
            raise ValueError("MOV table: infinite MOV")
        columns = STINT_KEY + ["mov_used", "mov_method"]
        p = p.merge(mov[columns], on=STINT_KEY, how="outer", validate="one_to_one", indicator=True)
        if not p["_merge"].eq("both").all():
            raise ValueError("MOV table must match every source stint exactly")
        p = p.drop(columns="_merge")
        if (p["mov_used"].isna() & p["team_games"].notna()).any():
            raise ValueError("MOV table: missing MOV for otherwise scorable stint")
        if (p["mov_used"].notna() & p["team_games"].isna()).any():
            raise ValueError("MOV table must retain unavailable team context")
        sd = p["mov_league_sd"]
        p["z_mov"] = ((p["mov_used"] - p["mov_league_mean"]) / sd).where(sd.ne(0), 0.0)
        p.loc[p["mov_used"].isna(), "z_mov"] = np.nan
    p["variant_prod"] = p["box_impact"] + p["eff_adj"]
    p["variant_pre_context"] = p["variant_prod"] * p["pace_adj"]
    p["variant_context"] = 1 + 0.125 * p["role_weight"] * np.tanh(0.75 * p["z_mov"])
    p["variant_raw"] = p["variant_pre_context"] * p["variant_context"]
    p["context"] = p["variant_context"]
    p["raw_stint"] = p["variant_raw"]
    return p


def _player_base(p: pd.DataFrame) -> pd.DataFrame:
    player = p.groupby(PLAYER_KEY, as_index=False).agg(
        player=("player", "first"), G=("g", "sum"), MP=("mp", "sum"), PTS=("pts", "sum"),
        AST=("ast", "sum"), REB=("trb", "sum"), FGA=("fga", "sum"), FTA=("fta", "sum"),
        attempts=("attempts", "sum"), box_impact=("box_impact", "sum"),
        eff_adj=("eff_adj", lambda s: s.sum(min_count=1)),
        prod_eff=("prod_eff", lambda s: s.sum(min_count=1)), stints=("team", "size"),
        teams=("team", lambda s: ",".join(s.astype(str))), max_team_games=("team_games", "max"),
        max_role_tier=("role_tier", "min"), min_def_tier=("def_tier", "min"),
        missing_team_payload=("team_games", lambda s: bool(s.isna().any())),
        raw=("variant_raw", lambda s: s.sum(min_count=1)),
        pre_context=("variant_pre_context", lambda s: s.sum(min_count=1)),
        prod=("variant_prod", lambda s: s.sum(min_count=1)),
    )
    missing = player["missing_team_payload"]
    player.loc[missing, ["eff_adj", "prod_eff", "raw", "pre_context", "prod"]] = np.nan
    player["context_delta"] = player["raw"] - player["pre_context"]
    player["availability_raw"] = player["G"] / player["max_team_games"]
    player["availability"] = player["availability_raw"].clip(upper=1.0)
    player["qualified"] = player["availability"].ge(0.70) & ~missing
    player["standardize_value"] = player["raw"] / player["G"]
    player["base_score"] = 3 * player.groupby(["season", "lg"])["standardize_value"].transform(pop_z)
    return player


def _team_defense(
    tt: pd.DataFrame, ot: pd.DataFrame, game_team: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    totals = tt.copy()
    totals = totals.loc[
        totals["lg"].eq("NBA")
        & totals["season"].between(1952, 2025, inclusive="both")
        & totals["abbreviation"].notna(),
        ["season", "team", "abbreviation", "g", "pts", "fga", "fta"],
    ].drop_duplicates(["season", "abbreviation"])
    totals = totals.rename(columns={
        "team": "team_name", "abbreviation": "team", "g": "official_games",
        "pts": "official_pts", "fga": "team_fga", "fta": "team_fta",
    })
    totals["team_key"] = totals["team_name"].map(normalize_text)
    totals["team_attempts"] = totals["team_fga"] + 0.44 * totals["team_fta"]

    gt = game_team.copy()
    gt["team_key"] = gt["nba_team"].map(normalize_text)
    aliases = {
        "ftwaynezollnerpistons": "fortwaynepistons",
        "oklahomacityhornets": "neworleansoklahomacityhornets",
        "laclippers": "losangelesclippers",
    }
    gt["team_key"] = gt["team_key"].replace(aliases)
    gt = gt.merge(
        totals[["season", "team_key", "team"]],
        on=["season", "team_key"], how="left", validate="many_to_one",
    )

    raw_game_counts = gt.groupby(["season", "gameId"])["nba_team"].nunique()
    mapped_game_counts = gt.loc[gt["team"].notna()].groupby(["season", "gameId"])["team"].nunique()
    valid_index = raw_game_counts.loc[raw_game_counts.eq(2)].index.intersection(
        mapped_game_counts.loc[mapped_game_counts.eq(2)].index
    )
    valid = gt.set_index(["season", "gameId"]).loc[valid_index].reset_index()
    opponents = valid[["season", "gameId", "team", "game_team_pts"]].rename(columns={
        "team": "opp_team", "game_team_pts": "opp_game_pts",
    })
    games = valid.merge(opponents, on=["season", "gameId"], how="inner")
    games = games.loc[games["team"].ne(games["opp_team"])].copy()
    games = games.drop_duplicates(["season", "gameId", "team"])
    games = games.merge(
        totals[["season", "team", "team_attempts", "official_pts"]],
        on=["season", "team"], how="left", validate="many_to_one",
    )
    games["archive_team_pts_sum"] = games.groupby(["season", "team"])["game_team_pts"].transform("sum")
    if games["archive_team_pts_sum"].le(0).any():
        raise ValueError("Defense archive: zero team-season scoring denominator")
    # The archive contains complete schedules well before every player-point
    # sum reconciles perfectly to the official team season total.  Rescaling
    # those raw game scores preserves their relative game pattern while making
    # the score weights reconcile to the known season points.
    games["reconciled_game_team_pts"] = (
        games["game_team_pts"] * games["official_pts"]
        / games["archive_team_pts_sum"].replace(0, np.nan)
    )
    reconciled_opponents = games[[
        "season", "gameId", "team", "reconciled_game_team_pts"
    ]].rename(columns={
        "team": "opp_team", "reconciled_game_team_pts": "reconciled_opp_game_pts",
    })
    games = games.merge(
        reconciled_opponents, on=["season", "gameId", "opp_team"],
        how="left", validate="one_to_one",
    )
    games["combined_pts"] = games["reconciled_game_team_pts"] + games["reconciled_opp_game_pts"]
    games["combined_pts_sum"] = games.groupby(["season", "team"])["combined_pts"].transform("sum")
    if games["combined_pts_sum"].le(0).any():
        raise ValueError("Defense archive: zero combined scoring denominator")
    games["reconstructed_team_attempts"] = (
        games["team_attempts"] * games["combined_pts"] / games["combined_pts_sum"].replace(0, np.nan)
    )
    opponent_attempts = games[[
        "season", "gameId", "team", "reconstructed_team_attempts"
    ]].rename(columns={
        "team": "opp_team", "reconstructed_team_attempts": "reconstructed_opp_attempts",
    })
    games = games.merge(
        opponent_attempts, on=["season", "gameId", "opp_team"], how="left", validate="one_to_one"
    )

    archive_team = games.groupby(["season", "team"], as_index=False).agg(
        archive_games=("gameId", "nunique"), archive_pts=("game_team_pts", "sum"),
        universal_opp_attempts=("reconstructed_opp_attempts", "sum"),
        reconstruction_missing_games=("reconstructed_opp_attempts", lambda s: int(s.isna().sum())),
    )
    coverage = totals.merge(archive_team, on=["season", "team"], how="left", validate="one_to_one")
    coverage[["archive_games", "archive_pts", "reconstruction_missing_games"]] = coverage[[
        "archive_games", "archive_pts", "reconstruction_missing_games"
    ]].fillna(0)
    coverage["games_complete"] = coverage["archive_games"].eq(coverage["official_games"])
    coverage["points_complete"] = coverage["archive_pts"].eq(coverage["official_pts"])
    coverage["points_delta"] = coverage["archive_pts"] - coverage["official_pts"]
    coverage["abs_points_delta_pct"] = (
        coverage["points_delta"].abs() / coverage["official_pts"].replace(0, np.nan)
    )
    coverage["team_complete"] = (
        coverage["games_complete"]
        & coverage["reconstruction_missing_games"].eq(0)
    )

    raw_by_season = gt.groupby("season").agg(
        archive_game_team_rows=("gameId", "size"),
        archive_games=("gameId", "nunique"),
        unmapped_game_team_rows=("team", lambda s: int(s.isna().sum())),
    )
    season_coverage = coverage.groupby("season").agg(
        official_teams=("team", "size"), complete_teams=("team_complete", "sum"),
        exact_points_teams=("points_complete", "sum"),
        official_team_games=("official_games", "sum"), valid_team_games=("archive_games", "sum"),
        max_abs_points_delta_pct=("abs_points_delta_pct", "max"),
        mean_abs_points_delta_pct=("abs_points_delta_pct", "mean"),
        max_game_shortfall=("official_games", "max"),
    ).join(raw_by_season, how="left").reset_index()
    shortfall = coverage.assign(shortfall=coverage["official_games"] - coverage["archive_games"])
    max_shortfall = shortfall.groupby("season")["shortfall"].max()
    season_coverage["max_game_shortfall"] = season_coverage["season"].map(max_shortfall)
    season_coverage["season_complete"] = (
        season_coverage["complete_teams"].eq(season_coverage["official_teams"])
        & season_coverage["unmapped_game_team_rows"].fillna(0).eq(0)
    )
    season_coverage["season_high_confidence"] = (
        season_coverage["season_complete"]
        & season_coverage["max_abs_points_delta_pct"].le(SCORE_RECONCILIATION_TOLERANCE)
    )

    opp = ot.copy()
    opp = opp.loc[
        opp["lg"].eq("NBA") & opp["season"].between(1952, 2025, inclusive="both"),
        ["season", "abbreviation", "opp_pts"],
    ].rename(columns={"abbreviation": "team"})
    team_def = coverage.merge(opp, on=["season", "team"], how="left", validate="one_to_one")
    team_def["season_complete"] = team_def["season"].map(
        season_coverage.set_index("season")["season_complete"]
    ).astype("boolean").fillna(False).astype(bool)
    team_def["season_high_confidence"] = team_def["season"].map(
        season_coverage.set_index("season")["season_high_confidence"]
    ).astype("boolean").fillna(False).astype(bool)
    team_def["league_pts"] = team_def.groupby("season")["official_pts"].transform("sum")
    team_def["league_fga"] = team_def.groupby("season")["team_fga"].transform("sum")
    team_def["league_fta"] = team_def.groupby("season")["team_fta"].transform("sum")
    team_def["league_psa"] = team_def["league_pts"] / (
        team_def["league_fga"] + 0.44 * team_def["league_fta"]
    )
    team_def["opp_psa_universal"] = team_def["opp_pts"] / team_def["universal_opp_attempts"]
    team_def["team_opp_ppg"] = team_def["opp_pts"] / team_def["official_games"]
    team_def["league_opp_ppg"] = team_def.groupby("season")["team_opp_ppg"].transform("mean")
    team_def["psa_suppression_universal"] = team_def["league_psa"] - team_def["opp_psa_universal"]
    team_def["ppg_suppression"] = team_def["league_opp_ppg"] - team_def["team_opp_ppg"]
    team_def["psa_suppression_z_universal"] = team_def.groupby("season")[
        "psa_suppression_universal"
    ].transform(pop_z)
    team_def["ppg_suppression_z"] = team_def.groupby("season")["ppg_suppression"].transform(pop_z)
    team_def["team_def_z_universal"] = (
        0.80 * team_def["psa_suppression_z_universal"]
        + 0.20 * team_def["ppg_suppression_z"]
    )
    team_def.loc[~team_def["season_complete"], "team_def_z_universal"] = np.nan
    allocation_check = games.groupby(["season", "team"], as_index=False).agg(
        allocated_attempts=("reconstructed_team_attempts", "sum"),
        known_attempts=("team_attempts", "first"),
    )
    allocation_check["allocation_error"] = allocation_check["allocated_attempts"] - allocation_check["known_attempts"]
    team_def["lg"] = "NBA"
    return team_def, season_coverage, allocation_check


def _player_defense(player: pd.DataFrame, stints: pd.DataFrame,
                    team_def: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    stints = stints.merge(team_def[TEAM_KEY + [
        "team_def_z_universal", "season_complete", "season_high_confidence",
    ]], on=TEAM_KEY, how="left", validate="many_to_one")
    for column in ["season_complete", "season_high_confidence"]:
        stints[column] = stints[column].astype("boolean").fillna(False).astype(bool)
    stints["def_raw_universal"] = stints["team_def_z_universal"] * stints["def_weight"]
    stints["def_num_universal"] = stints["def_raw_universal"] * stints["mp"]
    stints["def_mp_universal"] = np.where(stints["def_raw_universal"].notna(), stints["mp"], 0.0)
    ties = stints.groupby(TEAM_KEY + ["mp"], as_index=False).agg(
        tied_players=("player_id", "size"), tier_min=("def_tier", "min"), tier_max=("def_tier", "max"),
    )
    boundaries = ties.loc[ties["tied_players"].gt(1) & ties["tier_min"].ne(ties["tier_max"])]
    boundary_keys = set(map(tuple, boundaries[TEAM_KEY + ["mp"]].to_numpy()))
    stints["def_tie_boundary_ambiguous"] = [
        row in boundary_keys for row in stints[TEAM_KEY + ["mp"]].itertuples(index=False, name=None)
    ]
    agg = stints.groupby(PLAYER_KEY, as_index=False).agg(
        def_num_universal=("def_num_universal", lambda s: s.sum(min_count=1)),
        def_mp_universal=("def_mp_universal", "sum"),
        tie_ambiguous=("def_tie_boundary_ambiguous", "any"),
        universal_stints=("team", "size"),
        season_complete=("season_complete", "all"),
        season_high_confidence=("season_high_confidence", "all"),
    )
    # Complete league-season coverage applies to every stint. A partial traded
    # season must never receive defense computed from only available stints.
    agg.loc[~agg["season_complete"], "def_num_universal"] = np.nan
    agg["def_raw_universal"] = agg["def_num_universal"] / agg["def_mp_universal"].replace(0, np.nan)
    player = player.merge(agg, on=PLAYER_KEY, how="left", validate="one_to_one")
    player["def_index_universal"] = 3 * player.groupby(["season", "lg"])["def_raw_universal"].transform(pop_z)
    full = 1.5 * np.tanh(player["def_index_universal"] / 6)
    player["def_credit_universal"] = np.where(full >= 0, full, 0.5 * full)
    player["frozen_score"] = player["base_score"] + player["def_credit_universal"]
    player["frozen_score_high_confidence"] = player["frozen_score"].where(player["season_high_confidence"])
    qc = {
        "defensive_tier_boundary_equal_minute_groups": len(boundaries),
        "defensive_tier_boundary_stints": int(stints["def_tie_boundary_ambiguous"].sum()),
        "defensive_tier_boundary_qualified_full_rows": int((
            player["qualified"] & player["tie_ambiguous"] & player["frozen_score"].notna()
        ).sum()),
    }
    return player, stints, qc


def compute(input_dir: Path, mov_stints: pd.DataFrame | None = None
            ) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, dict]:
    """Return player results, stint intermediates, team defense, and JSON-safe QC.

    Required input files: Player Totals.csv, Team Totals.csv, Opponent Totals.csv,
    defense_game_team.csv. MOV rows must match every player/season/league/team
    source stint, with numeric mov_used and nonempty mov_method. When omitted,
    the historical full-season-MOV control is computed. Scores are unrounded.
    The only allowed incomplete official payload is 1955 NBA Baltimore (BLB);
    the entire player-season touching that team remains unscored.
    """
    p, tt, ot, gt = _read_inputs(Path(input_dir))
    team = _team_context(tt, ot)
    stints = _stints(p, team, mov_stints)
    player = _player_base(stints)
    team_def, coverage, allocation = _team_defense(tt, ot, gt)
    player, stints, qc = _player_defense(player, stints, team_def)
    _unique(player, PLAYER_KEY, "Player results")
    _unique(stints, STINT_KEY, "Stint results")
    for label, frame in [("Player results", player), ("Stint results", stints), ("Team defense", team_def)]:
        values = frame.select_dtypes(include="number")
        if np.isinf(values.to_numpy(dtype=float)).any():
            raise ValueError(f"{label}: infinite computed output")
    scorable = ~player["missing_team_payload"]
    if player.loc[scorable, "base_score"].isna().any():
        raise ValueError("Unexpected missing base score")
    covered_positive_minutes = player["season_complete"] & player["MP"].gt(0) & scorable
    if player.loc[covered_positive_minutes, "frozen_score"].isna().any():
        raise ValueError("Unexpected missing full CV on a covered player-season")
    error = float(allocation["allocation_error"].abs().max()) if len(allocation) else 0.0
    if error > 1e-8:
        raise ValueError(f"Defense allocation fails conservation: {error}")
    qc.update({
        "player_stints": len(stints), "player_seasons": len(player),
        "base_rows": int(player["base_score"].notna().sum()),
        "qualified_base_rows": int((player["qualified"] & player["base_score"].notna()).sum()),
        "full_rows": int(player["frozen_score"].notna().sum()),
        "qualified_full_rows": int((player["qualified"] & player["frozen_score"].notna()).sum()),
        "high_confidence_full_rows": int(player["frozen_score_high_confidence"].notna().sum()),
        "missing_team_payload_rows": int(player["missing_team_payload"].sum()),
        "zero_minute_stints": int(stints["mp"].eq(0).sum()),
        "zero_minute_player_seasons": int(player["MP"].eq(0).sum()),
        "complete_defense_seasons": coverage.loc[coverage["season_complete"], "season"].astype(int).tolist(),
        "high_confidence_defense_seasons": coverage.loc[coverage["season_high_confidence"], "season"].astype(int).tolist(),
        "max_attempt_allocation_error": error,
        "mov_methods": {str(k): int(v) for k, v in stints["mov_method"].value_counts().items()},
        "season_coverage": coverage.replace({np.nan: None}).to_dict("records"),
    })
    return player, stints, team_def, qc
