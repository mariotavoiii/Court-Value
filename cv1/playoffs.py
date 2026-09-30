"""Court Value Playoff CV (Run and Rate) and Full-Season CV, playoff model 1.0.0.

Scores one NBA postseason per player (1952-2026) from the playoff player-game
archive, with the CV 1.1 conventions and **no use of minutes played**: the
archive's playoff minutes are incomplete before 1969-70, so every
responsibility rule here uses production, shot attempts and games instead.

Two scores, never added together or to regular-season CV:

Both playoff scores are measured on the **regular season's ruler**: a playoff
per-game value is standardized against that season's regular-season reference
(the games-weighted mean and SD of regular-season per-game value, and the
regular-season defensive reference), so a playoff game is read exactly like a
regular-season game.

* Playoff CV Rate - quality while active: production per appearance plus
  bounded team-defense credit.
* Playoff CV Run - the postseason resume and headline score. Each round is one
  opportunity unit (series length neutral), averaged over the rounds available
  on the team's championship path (unplayed rounds count zero), plus
  path-moderated defense and responsibility-weighted championship credit
  (capped at 3 = one CV standard deviation, reached at a 25% share).
* Full-Season CV - regular season plus playoffs: every playoff game counts as
  one more game of the season on the same ruler, plus the championship credit
  scaled by the playoffs' share of the season's games.

ABA postseasons are not covered: there is no ABA playoff game archive.

Box-score completeness: points and free-throw attempts are recorded for every
archived playoff game, but many 1952-1964 team-games lack assists, rebounds or
field-goal attempts. A team-game is *box-complete* when the team's rebounds,
assists and field-goal attempts are all positive and at least half of the
players who scored have a recorded rebound and field-goal attempt. For every
player-round, AST, TRB and FGA are the player's per-game values in his
box-complete games of that round (else of that postseason) times his games in
the round. The rule applies identically to every season; from 1965 on every
team-game is box-complete, so it changes nothing there.
"""
from __future__ import annotations

import re
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd

try:
    from . import defense_estimator as de
except ImportError:  # pragma: no cover
    from cv1 import defense_estimator as de

ROLE_MAP = {1: 1.00, 2: 0.85, 3: 0.35, 4: 0.15}
DEF_ROLE_MAP = {1: 1.00, 2: 0.60, 3: 0.25, 4: 0.00}
CHAMPIONSHIP_CREDIT_CAP = 3.0
CHAMPIONSHIP_FULL_CREDIT_SHARE = 0.25
FIRST_SEASON, LAST_SEASON = 1952, 2026
EXCLUDED_COMMENT = re.compile(r"\b(?:DNP|DND|NWT|inactive|did not)\b", re.IGNORECASE)
SCALED = ["ast", "trb", "fga"]   # incomplete in some early box scores; estimated from box-complete games
BOX_PLAYER_SHARE = 0.5
STATS = ["pts", "ast", "trb", "fga", "fta"]
TEAM_ALIASES = {"laclippers": "losangelesclippers", "ftwaynezollnerpistons": "fortwaynepistons",
                "oklahomacityhornets": "neworleansoklahomacityhornets"}


def normalize_text(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]", "", text)


def pop_z(s: pd.Series) -> pd.Series:
    sd = s.std(ddof=0)
    return (s - s.mean()) / sd if sd > 0 else s * 0.0


def weighted_z(x: pd.Series, w: pd.Series) -> pd.Series:
    ok = x.notna()
    m = np.average(x[ok], weights=w[ok])
    sd = float(np.sqrt(np.average((x[ok] - m) ** 2, weights=w[ok])))
    return (x - m) / sd if sd > 0 else x * 0.0


def bounded_defense(index: pd.Series) -> pd.Series:
    full = 1.5 * np.tanh(index / 6.0)
    return pd.Series(np.where(full >= 0, full, 0.5 * full), index=index.index)


def round_of(label: object) -> tuple[str, int]:
    text = str(label if isinstance(label, str) else "").lower()
    if "nba finals" in text:
        return "Finals", 4
    if "conf. finals" in text or "conference finals" in text:
        return "Conference Finals", 3
    if "semifinals" in text:
        return "Conference Semifinals", 2
    if "first round" in text:
        return "First Round", 1
    return "Unlabeled", 0


def assign_tiers(frame: pd.DataFrame, score: str, prefix: str, weights: dict) -> pd.DataFrame:
    """ceil(sqrt N) groups within each team postseason; stable ties (same rule as the regular season)."""
    keys = ["season", "team_id"]
    out = frame.sort_values(keys + [score, "visible_role", "g", "pts", "player_id"],
                            ascending=[True, True, False, False, False, False, True], kind="mergesort").copy()
    out[f"{prefix}_rank"] = out.groupby(keys).cumcount() + 1
    n = out.groupby(keys)["player_id"].transform("size").astype(float)
    k = np.ceil(np.sqrt(n))
    out[f"{prefix}_tier"] = np.minimum(np.floor((out[f"{prefix}_rank"] - 1) * k / n) + 1, 4).astype(int)
    out[f"{prefix}_weight"] = out[f"{prefix}_tier"].map(weights).astype(float)
    return out.sort_index()


# ---------------------------------------------------------------- inputs
def load_games(input_dir: Path) -> tuple[pd.DataFrame, dict]:
    """Player appearances in NBA playoff games, 1952-2026, with the regular-season appearance rule."""
    raw = pd.read_csv(input_dir / "playoff_player_games.csv", low_memory=False)
    qc = {"archive_rows": len(raw)}
    d = raw.copy()
    d["game_date"] = pd.to_datetime(d["gameDate"], errors="coerce")
    d["season"] = d["game_date"].dt.year
    d = d[d["season"].between(FIRST_SEASON, LAST_SEASON)].copy()
    rename = {"points": "pts", "assists": "ast", "reboundsTotal": "trb", "fieldGoalsAttempted": "fga",
              "freeThrowsAttempted": "fta"}
    d = d.rename(columns=rename)
    d["win"] = pd.to_numeric(d["win"], errors="coerce").fillna(0).astype(int)
    for c in STATS:
        d[c] = pd.to_numeric(d[c], errors="coerce").fillna(0.0)
    other = ["steals", "blocks", "turnovers", "foulsPersonal", "fieldGoalsMade", "freeThrowsMade"]
    anystat = d[STATS + [c for c in other if c in d]].apply(pd.to_numeric, errors="coerce").fillna(0).abs().sum(axis=1).gt(0)
    minutes_value = pd.to_numeric(d["numMinutes"], errors="coerce")
    excluded = d["comment"].astype(str).str.contains(EXCLUDED_COMMENT, na=False)
    # Appearance evidence only (identical to the regular-season rule); minutes never weight anything.
    d["appeared"] = ~excluded & (anystat | minutes_value.notna())
    qc["excluded_comment_rows"] = int(excluded.sum())
    qc["no_evidence_rows"] = int((~excluded & ~(anystat | minutes_value.notna())).sum())
    d = d[d["appeared"]].copy()
    d["person_id"] = pd.to_numeric(d["personId"], errors="coerce").astype("Int64")
    d["game_id"] = pd.to_numeric(d["gameId"], errors="coerce").astype("Int64")
    d["team_name"] = (d["playerteamCity"].fillna("").str.strip() + " " + d["playerteamName"].fillna("").str.strip()).str.strip()
    d["opp_name"] = (d["opponentteamCity"].fillna("").str.strip() + " " + d["opponentteamName"].fillna("").str.strip()).str.strip()
    d["team_id"] = pd.to_numeric(d["playerteamId"], errors="coerce")
    d["opp_id"] = pd.to_numeric(d["opponentteamId"], errors="coerce")
    # Source repair: 2022 rows carry names but blank team IDs; recover the stable franchise ID
    # from the same name in other rows of the archive.
    known = d.loc[d["team_id"].notna(), ["team_name", "team_id"]]
    name_map = known.groupby("team_name")["team_id"].agg(lambda v: v.value_counts().index[0]).to_dict()
    qc["repaired_team_ids"] = int(d["team_id"].isna().sum())
    qc["repaired_opponent_ids"] = int(d["opp_id"].isna().sum())
    d.loc[d["team_id"].isna(), "team_id"] = d.loc[d["team_id"].isna(), "team_name"].map(name_map)
    d.loc[d["opp_id"].isna(), "opp_id"] = d.loc[d["opp_id"].isna(), "opp_name"].map(name_map)
    rr = d["gameLabel"].map(round_of)
    d["round"] = rr.map(lambda v: v[0])
    d["round_order"] = rr.map(lambda v: v[1]).astype(int)
    # The 1954 opening division round-robin is the archive's lone unlabeled stage; it is one round opportunity.
    rr54 = d["season"].eq(1954) & d["round_order"].eq(0)
    d.loc[rr54, ["round", "round_order"]] = ["Division Round Robin", 2]
    qc["unlabeled_rows_after_1954_rule"] = int(d["round_order"].eq(0).sum())
    before = len(d)
    d = d.drop_duplicates(["season", "game_id", "person_id", "team_id"])
    qc["duplicate_rows_removed"] = before - len(d)
    qc["appearance_rows"] = len(d)
    d["player_name"] = (d["firstName"].fillna("").str.strip() + " " + d["lastName"].fillna("").str.strip()).str.strip()
    return d, qc


def attach_ids(games: pd.DataFrame, input_dir: Path) -> tuple[pd.DataFrame, dict]:
    """Map NBA person IDs to Basketball-Reference player IDs; team names to BRef abbreviations."""
    idm = pd.read_csv(input_dir / "identity_map.csv")
    idm = idm.drop_duplicates(["season", "personId"])
    g = games.merge(idm.rename(columns={"personId": "person_id"}).astype({"person_id": "Int64"}),
                    on=["season", "person_id"], how="left", validate="many_to_one")
    pt = pd.read_csv(input_dir / "Player Totals.csv", usecols=["season", "lg", "player", "player_id", "team"])
    pt = pt[pt.lg.eq("NBA")]
    tt = pd.read_csv(input_dir / "Team Totals.csv", usecols=["season", "lg", "team", "abbreviation"])
    tt = tt[tt.lg.eq("NBA") & tt.abbreviation.notna()].copy()
    tt["key"] = tt["team"].map(normalize_text).replace(TEAM_ALIASES)
    abbr = {(s, k): a for s, k, a in zip(tt.season, tt.key, tt.abbreviation)}
    g["team_key"] = g["team_name"].map(normalize_text).replace(TEAM_ALIASES)
    g["team"] = [abbr.get((s, k)) for s, k in zip(g.season, g.team_key)]
    # Name fallback for playoff-only person IDs: unique normalized name on that season's roster of that team.
    miss = g["player_id"].isna()
    pt["name_key"] = pt["player"].map(normalize_text)
    roster = pt.groupby(["season", "team", "name_key"])["player_id"].agg(lambda v: v.iloc[0] if v.nunique() == 1 else None)
    g.loc[miss, "player_id"] = [roster.get((s, t, normalize_text(n))) for s, t, n in
                                zip(g.loc[miss, "season"], g.loc[miss, "team"], g.loc[miss, "player_name"])]
    names = pt.drop_duplicates("player_id").set_index("player_id")["player"]
    g["player"] = g["player_id"].map(names).fillna(g["player_name"])
    qc = {"unmapped_appearance_rows": int(g["player_id"].isna().sum()),
          "name_fallback_rows": int(miss.sum() - g.loc[miss, "player_id"].isna().sum()),
          "unmapped_team_rows": int(g["team"].isna().sum())}
    return g, qc


# ---------------------------------------------------------------- teams
def team_games(g: pd.DataFrame) -> pd.DataFrame:
    tg = g.assign(scored=g["pts"].gt(0), has_trb=g["trb"].gt(0), has_fga=g["fga"].gt(0)).groupby(
        ["season", "game_id", "team_id", "team", "opp_id", "round", "round_order"], as_index=False, dropna=False).agg(
        pts=("pts", "sum"), fga=("fga", "sum"), fta=("fta", "sum"), trb=("trb", "sum"), ast=("ast", "sum"), win=("win", "max"),
        n_scored=("scored", "sum"), n_trb=("has_trb", "sum"), n_fga=("has_fga", "sum"))
    tg["box_complete"] = (tg["trb"].gt(0) & tg["ast"].gt(0) & tg["fga"].gt(0)
                          & tg["n_trb"].ge(BOX_PLAYER_SHARE * tg["n_scored"]) & tg["n_fga"].ge(BOX_PLAYER_SHARE * tg["n_scored"]))
    opp = tg[["season", "game_id", "team_id", "pts"]].rename(columns={"team_id": "opp_id", "pts": "opp_pts"})
    tg = tg.merge(opp, on=["season", "game_id", "opp_id"], how="left", validate="one_to_one")
    tg["valid"] = tg["opp_pts"].notna()
    return tg


def team_postseasons(tg: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    v = tg[tg["valid"]].copy()
    rounds = v.groupby(["season", "team_id", "team", "round_order", "round"], as_index=False, dropna=False).agg(
        team_round_games=("game_id", "nunique"), round_wins=("win", "sum"))
    t = v.groupby(["season", "team_id", "team"], as_index=False, dropna=False).agg(
        team_games=("game_id", "nunique"), wins=("win", "sum"), pts=("pts", "sum"), opp_pts=("opp_pts", "sum"),
        fta=("fta", "sum"), box_games=("box_complete", "sum"),
        entry_round=("round_order", "min"), last_round=("round_order", "max"), rounds_played=("round_order", "nunique"))
    cg = v[v["box_complete"]].groupby(["season", "team_id"])[["fga", "trb"]].sum()
    for c in ["fga", "trb"]:
        per = pd.Series([cg[c].get((s, i), np.nan) for s, i in zip(t.season, t.team_id)], index=t.index) / t["box_games"]
        t[c] = per * t["team_games"]
    t["box_share"] = t["box_games"] / t["team_games"]
    t["possible_path_rounds"] = 5 - t["entry_round"]
    t["received_bye"] = t["entry_round"].gt(t.groupby("season")["entry_round"].transform("min"))
    finals = v[v["round_order"].eq(4)].groupby(["season", "team_id"])["win"].sum()
    champs = set(finals[finals.eq(finals.groupby("season").transform("max"))].index)
    t["champion"] = [(s, i) in champs for s, i in zip(t.season, t.team_id)]
    t["mov"] = (t["pts"] - t["opp_pts"]) / t["team_games"]
    t["z_mov"] = t.groupby("season")["mov"].transform(pop_z)
    t["pace_adj"] = 2 * t["pts"] / (t["pts"] + t["opp_pts"])
    t["own_att"] = t["fga"] + 0.44 * t["fta"]
    t["league_psa"] = t.groupby("season")["pts"].transform("sum") / t.groupby("season")["own_att"].transform("sum")
    # Team defense: the frozen CV 1.1 season-totals estimate, applied to each postseason's team totals.
    grp = t.groupby("season")
    feats = {"x1": np.log(t.opp_pts / t.pts), "x2": np.log(t.pts / t.own_att), "x3": np.log(t.trb / t.own_att)}
    for k, val in feats.items():
        t[k] = val - val.groupby(t["season"]).transform("mean")
    b = de.COEFFICIENTS
    t["est_opp_attempts"] = t["own_att"] * np.exp(b[0] * t.x1 + b[1] * t.x2 + b[2] * t.x3)
    t["psa_suppression"] = t["league_psa"] - t["opp_pts"] / t["est_opp_attempts"]
    t["opp_ppg"] = t["opp_pts"] / t["team_games"]
    t["ppg_suppression"] = grp["opp_ppg"].transform("mean") - t["opp_ppg"]
    t["team_def_z"] = (0.80 * t.groupby("season")["psa_suppression"].transform(pop_z)
                       + 0.20 * t.groupby("season")["ppg_suppression"].transform(pop_z))
    return t.drop(columns=["x1", "x2", "x3"]), rounds


# ---------------------------------------------------------------- players
def regular_reference(rs: pd.DataFrame) -> pd.DataFrame:
    """Regular-season rulers per NBA season, exactly as the regular-season engine standardizes."""
    rows = []
    for season, g in rs[rs["lg"].eq("NBA")].groupby("season"):
        r = g[g["rate"].notna()]
        mu = np.average(r["rate"], weights=r["G"])
        sd = float(np.sqrt(np.average((r["rate"] - mu) ** 2, weights=r["G"])))
        d = g["def_raw"].dropna()
        rows.append(dict(season=season, rs_rate_mean=mu, rs_rate_sd=sd, rs_def_mean=d.mean(), rs_def_sd=d.std(ddof=0)))
    return pd.DataFrame(rows)


def compute(input_dir: Path) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, dict]:
    input_dir = Path(input_dir)
    games, qc = load_games(input_dir)
    games, qc_id = attach_ids(games, input_dir)
    qc.update(qc_id)
    tg = team_games(games)
    qc["invalid_team_games"] = int((~tg["valid"]).sum())
    teams, rounds = team_postseasons(tg)
    g = games[games["player_id"].notna()].copy()
    valid_games = set(map(tuple, tg.loc[tg["valid"], ["season", "game_id", "team_id"]].to_numpy()))
    g = g[[k in valid_games for k in map(tuple, g[["season", "game_id", "team_id"]].to_numpy())]]

    key = ["season", "player_id", "team_id"]
    # Box-completeness estimate (see module docstring), at the player-round level.
    bc = tg[["season", "game_id", "team_id", "box_complete"]]
    g = g.merge(bc, on=["season", "game_id", "team_id"], how="left", validate="many_to_one")
    g["box_complete"] = g["box_complete"].fillna(False).astype(bool)
    for c in SCALED:
        g[c + "_c"] = g[c].where(g["box_complete"], 0.0)
    rk = key + ["round_order"]
    r = g.groupby(rk, as_index=False, dropna=False).agg(player_games=("game_id", "nunique"), box_games=("box_complete", "sum"),
                                                        pts=("pts", "sum"), fta=("fta", "sum"), **{c + "_c": (c + "_c", "sum") for c in SCALED})
    ps = r.groupby(key)[["box_games"] + [c + "_c" for c in SCALED]].transform("sum")
    for c in SCALED:
        per_round = r[c + "_c"] / r["box_games"].where(r["box_games"] > 0)
        per_post = ps[c + "_c"] / ps["box_games"].where(ps["box_games"] > 0)
        r[c] = per_round.fillna(per_post) * r["player_games"]
    qc["player_rounds_estimated_from_postseason"] = int((r["box_games"].eq(0) & ps["box_games"].gt(0)).sum())
    qc["player_postseasons_without_box_evidence"] = int((ps["box_games"].eq(0)).groupby([r.season, r.player_id]).any().sum())
    p = r.groupby(key, as_index=False, dropna=False).agg(g=("player_games", "sum"), box_games=("box_games", "sum"),
                                                         **{c: (c, "sum") for c in STATS})
    p["box_share"] = p["box_games"] / p["g"]
    # No box-complete game at all in this postseason: AST/TRB/FGA are unknown, so the row is unscored
    # and stays out of every reference population.
    p.loc[p["box_games"].eq(0), SCALED] = np.nan
    names = g.drop_duplicates(key).set_index(key)[["player", "team"]]
    p = p.join(names, on=key)
    if p.duplicated(["season", "player_id"]).any():
        raise ValueError("A player appears for two teams in one postseason")
    p = p.merge(teams[["season", "team_id", "team_games", "wins", "champion", "z_mov", "pace_adj", "league_psa",
                       "team_def_z", "entry_round", "last_round", "rounds_played", "possible_path_rounds", "received_bye", "mov"]],
                on=["season", "team_id"], how="left", validate="many_to_one")
    p["attempts"] = p["fga"] + 0.44 * p["fta"]
    p["box_impact"] = p["pts"] + 0.65 * p["ast"] + 0.65 * p["trb"]
    p["visible_role"] = p["box_impact"] + 0.25 * p["attempts"]
    p["availability"] = (p["g"] / p["team_games"]).clip(upper=1.0)
    p["visible_z"] = p.groupby(["season", "team_id"])["visible_role"].transform(pop_z)
    p["availability_z"] = p.groupby(["season", "team_id"])["availability"].transform(pop_z)
    p["role_score"] = 0.85 * p["visible_z"] + 0.15 * p["availability_z"]
    p = assign_tiers(p, "role_score", "role", ROLE_MAP)
    # No minutes: defensive responsibility follows the same visible-load-and-availability ranking.
    p = assign_tiers(p, "role_score", "def", DEF_ROLE_MAP)
    p["eff_adj"] = 0.30 * (p["pts"] - 0.92 * p["league_psa"] * p["attempts"])
    p["context"] = 1 + 0.125 * p["role_weight"] * np.tanh(0.75 * p["z_mov"])
    p["raw"] = (p["box_impact"] + p["eff_adj"]) * p["pace_adj"] * p["context"]
    p["rate_value"] = p["raw"] / p["g"]

    # ---- Rate: games-weighted within the postseason (CV 1.1 convention)
    rs = pd.read_csv(input_dir / "regular_season_cv.csv", float_precision="round_trip", low_memory=False)
    ref = regular_reference(rs)
    p = p.merge(ref, on="season", how="left", validate="many_to_one")
    if p["rs_rate_sd"].isna().any():
        raise ValueError("Postseason without a regular-season reference")
    p["rate_base"] = 3 * (p["rate_value"] - p["rs_rate_mean"]) / p["rs_rate_sd"]
    p["def_raw"] = p["team_def_z"] * p["def_weight"]
    p["rate_def_index"] = 3 * (p["def_raw"] - p["rs_def_mean"]) / p["rs_def_sd"]
    p["rate_defense"] = bounded_defense(p["rate_def_index"])
    p["playoff_cv_rate"] = p["rate_base"] + p["rate_defense"]
    p["scored"] = p["playoff_cv_rate"].notna()
    p["rate_qualified"] = (10 * p["g"] >= 7 * p["team_games"]) & p["scored"]

    # ---- Run: rounds as opportunity units
    r = r.merge(rounds[["season", "team_id", "round_order", "team_round_games"]], on=["season", "team_id", "round_order"],
                how="left", validate="many_to_one")
    r = r.merge(p[key + ["league_psa", "pace_adj", "context", "possible_path_rounds"]], on=key, how="left", validate="many_to_one")
    r["prod"] = (r["pts"] + 0.65 * r["ast"] + 0.65 * r["trb"]
                 + 0.30 * (r["pts"] - 0.92 * r["league_psa"] * (r["fga"] + 0.44 * r["fta"])))
    r["round_contribution"] = r["prod"] * r["pace_adj"] * r["context"] / r["team_round_games"]
    r["round_availability"] = r["player_games"] / r["team_round_games"]
    run = r.groupby(key, as_index=False).agg(rounds_appeared=("round_order", "nunique"),
                                             run_sum=("round_contribution", "sum"), avail_sum=("round_availability", "sum"))
    p = p.merge(run, on=key, how="left", validate="one_to_one")
    p["run_raw"] = (p["run_sum"] / p["possible_path_rounds"]).where(p["box_games"].gt(0))
    p["path_availability"] = p["avail_sum"] / p["possible_path_rounds"]
    p["run_base"] = 3 * (p["run_raw"] - p["rs_rate_mean"]) / p["rs_rate_sd"]
    p["run_def_raw"] = p["team_def_z"] * p["def_weight"] * p["path_availability"]
    p["run_def_index"] = 3 * (p["run_def_raw"] - p["rs_def_mean"]) / p["rs_def_sd"]
    p["run_defense"] = bounded_defense(p["run_def_index"])
    p["run_performance"] = p["run_base"] + p["run_defense"]
    pos = p["run_raw"].clip(lower=0)
    team_pos = pos.groupby([p["season"], p["team_id"]]).transform("sum")
    p["championship_share"] = np.where(team_pos.gt(0), pos / team_pos, 0.0)
    mult = CHAMPIONSHIP_CREDIT_CAP / CHAMPIONSHIP_FULL_CREDIT_SHARE
    p["championship_credit"] = np.where(p["champion"], np.minimum(CHAMPIONSHIP_CREDIT_CAP, mult * p["championship_share"]), 0.0)
    p["playoff_cv_run"] = p["run_performance"] + p["championship_credit"]

    for col, q in [("playoff_cv_run", None), ("playoff_cv_rate", "rate_qualified")]:
        s = p[col] if q is None else p[col].where(p[q])
        p[col + "_rank_season"] = s.groupby(p["season"]).rank(ascending=False, method="min").astype("Int64")
        p[col + "_rank_alltime"] = s.rank(ascending=False, method="min").astype("Int64")
    p["lg"] = "NBA"
    qc.update({"player_postseasons": len(p), "team_postseasons": len(teams), "seasons": int(p["season"].nunique()),
               "champions": int(teams["champion"].sum())})
    p = p.sort_values(["season", "player_id"]).reset_index(drop=True)
    full = full_season(rs, p)
    qc["full_season_rows"] = len(full)
    return p, teams, r, qc, full


def full_season(rs: pd.DataFrame, p: pd.DataFrame) -> pd.DataFrame:
    """Regular season + playoffs on one ruler, plus the title credit scaled by the playoff share of games."""
    f = rs[rs["cv_full"].notna()][["player_id", "player", "season", "lg", "teams", "G", "qualified", "cv_full"]].copy()
    po = p[["player_id", "season", "lg", "g", "playoff_cv_rate", "championship_credit", "champion", "box_evidence"]
           ].rename(columns={"g": "po_g"}) if "box_evidence" in p else p[["player_id", "season", "lg", "g", "playoff_cv_rate",
           "championship_credit", "champion"]].rename(columns={"g": "po_g"})
    f = f.merge(po, on=["player_id", "season", "lg"], how="left", validate="one_to_one")
    scored = f["playoff_cv_rate"].notna()
    f["po_games_counted"] = np.where(scored, f["po_g"], 0).astype(int)
    total = f["G"] + f["po_games_counted"]
    f["playoff_share"] = f["po_games_counted"] / total
    f["title_bonus"] = np.where(scored, f["championship_credit"].fillna(0) * f["playoff_share"], 0.0)
    f["full_season_cv"] = (f["G"] * f["cv_full"] + f["po_games_counted"] * f["playoff_cv_rate"].fillna(0)) / total + f["title_bonus"]
    f["playoff_status"] = np.select([f["po_g"].isna(), ~scored], ["NO_PLAYOFFS", "PLAYOFFS_UNSCORED"], "INCLUDED")
    f["full_season_rank_season"] = f["full_season_cv"].where(f["qualified"]).groupby([f["season"], f["lg"]]).rank(ascending=False, method="min").astype("Int64")
    f["full_season_rank_alltime"] = f["full_season_cv"].where(f["qualified"]).rank(ascending=False, method="min").astype("Int64")
    return f.drop(columns=["championship_credit"]).rename(columns={"G": "rs_games", "cv_full": "rs_cv_full"})
