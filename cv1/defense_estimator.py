"""CV 1.1 team defense: season-totals possession estimate of opponent scoring attempts.

The NBA did not record opponent field-goal and free-throw attempts before 1970-71.
CV 1.1 therefore estimates them for every NBA and ABA season with one frozen rule
that uses only team statistics recorded since 1951-52: points scored, points
allowed, field-goal attempts, free-throw attempts and total rebounds.

    OwnAtt  = FGA + 0.44 * FTA
    d(x)    = ln(x) - mean over the league-season's teams of ln(x)
    ln(OppAtt_hat / OwnAtt) = b1*d(OppPTS/PTS) + b2*d(PTS/OwnAtt) + b3*d(TRB/OwnAtt)   (+ a league-season level)

The league-season level cancels in the within-season standardization and is not
estimated. The coefficients were fitted once, by ordinary least squares without
an intercept, on NBA 1971-2026 team-seasons whose opponent attempts are recorded
(`fit_coefficients`), and are frozen here. Recorded opponent attempts are never
used to score a season; the same estimate is applied to every season.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

# Frozen 2026-09-29 (CV 1.1.0) from the declared input snapshot cv1-inputs-2026-09-29.
COEFFICIENTS = (0.6020313823981741, 0.8571267229514948, 0.32977975821588174)
FEATURES = ("ln_opp_pts_over_pts", "ln_pts_per_attempt", "ln_trb_per_attempt")
LEAGUES = ("NBA", "ABA")
FIRST_SEASON, LAST_SEASON = 1952, 2026


def team_frame(team_totals: pd.DataFrame, opponent_totals: pd.DataFrame) -> pd.DataFrame:
    """One row per league-season team with the official inputs the estimator needs.

    Teams without an official payload (only 1955 NBA Baltimore) are excluded; their
    players are unscored by the base model."""
    t = team_totals.loc[
        team_totals["lg"].isin(LEAGUES)
        & team_totals["season"].between(FIRST_SEASON, LAST_SEASON)
        & team_totals["abbreviation"].notna()
        & team_totals["team"].ne("League Average"),
        ["season", "lg", "abbreviation", "g", "pts", "fga", "fta", "trb"],
    ]
    o = opponent_totals.loc[
        opponent_totals["lg"].isin(LEAGUES) & opponent_totals["team"].ne("League Average"),
        ["season", "lg", "abbreviation", "opp_pts", "opp_fga", "opp_fta"],
    ]
    if t.duplicated(["season", "lg", "abbreviation"]).any() or o.duplicated(["season", "lg", "abbreviation"]).any():
        raise ValueError("Defense estimator: duplicate team-season rows")
    d = t.merge(o, on=["season", "lg", "abbreviation"], how="left", validate="one_to_one")
    d = d.rename(columns={"abbreviation": "team"})
    required = ["g", "pts", "fga", "fta", "trb", "opp_pts"]
    d["official_payload"] = d[required].notna().all(axis=1) & d[["g", "pts", "fga", "trb", "opp_pts"]].gt(0).all(axis=1)
    return d.sort_values(["season", "lg", "team"], kind="mergesort").reset_index(drop=True)


def features(d: pd.DataFrame) -> pd.DataFrame:
    """League-season log deviations for rows with an official payload."""
    d = d.loc[d["official_payload"]].copy()
    d["own_att"] = d["fga"] + 0.44 * d["fta"]
    group = [d["season"], d["lg"]]
    raw = {
        "ln_opp_pts_over_pts": np.log(d["opp_pts"] / d["pts"]),
        "ln_pts_per_attempt": np.log(d["pts"] / d["own_att"]),
        "ln_trb_per_attempt": np.log(d["trb"] / d["own_att"]),
    }
    for name, value in raw.items():
        d[name] = value - value.groupby(group).transform("mean")
    return d


def fit_coefficients(d: pd.DataFrame) -> np.ndarray:
    """Reproduce the frozen coefficients from recorded NBA 1971-2026 opponent attempts."""
    f = features(d)
    fit = f.loc[f["lg"].eq("NBA") & f["opp_fga"].notna() & f["opp_fta"].notna()].copy()
    y = np.log((fit["opp_fga"] + 0.44 * fit["opp_fta"]) / fit["own_att"])
    y = y - y.groupby([fit["season"], fit["lg"]]).transform("mean")
    beta, *_ = np.linalg.lstsq(fit[list(FEATURES)].to_numpy(), y.to_numpy(), rcond=None)
    return beta


def pop_z(s: pd.Series) -> pd.Series:
    sd = s.std(ddof=0)
    return (s - s.mean()) / sd if sd > 0 else s * np.nan


def team_defense(team_totals: pd.DataFrame, opponent_totals: pd.DataFrame,
                 coefficients=None) -> pd.DataFrame:
    """TeamDef for every NBA/ABA league-season 1952-2026 using the frozen estimate."""
    beta = np.asarray(COEFFICIENTS if coefficients is None else coefficients, dtype=float)
    d = team_frame(team_totals, opponent_totals)
    f = features(d)
    f["est_opp_attempts"] = f["own_att"] * np.exp(f[list(FEATURES)].to_numpy() @ beta)
    f["recorded_opp_attempts"] = f["opp_fga"] + 0.44 * f["opp_fta"]  # diagnostic only
    g = [f["season"], f["lg"]]
    f["league_psa"] = f.groupby(["season", "lg"])["pts"].transform("sum") / f.groupby(["season", "lg"])["own_att"].transform("sum")
    f["opp_psa_est"] = f["opp_pts"] / f["est_opp_attempts"]
    f["team_opp_ppg"] = f["opp_pts"] / f["g"]
    f["league_opp_ppg"] = f.groupby(["season", "lg"])["team_opp_ppg"].transform("mean")
    f["psa_suppression"] = f["league_psa"] - f["opp_psa_est"]
    f["ppg_suppression"] = f["league_opp_ppg"] - f["team_opp_ppg"]
    f["psa_suppression_z"] = f.groupby(["season", "lg"])["psa_suppression"].transform(pop_z)
    f["ppg_suppression_z"] = f.groupby(["season", "lg"])["ppg_suppression"].transform(pop_z)
    f["team_def_z_universal"] = 0.80 * f["psa_suppression_z"] + 0.20 * f["ppg_suppression_z"]
    f["season_complete"] = f["team_def_z_universal"].notna().groupby(g).transform("all")
    f["season_high_confidence"] = f["season_complete"]
    cols = ["season", "lg", "team", "g", "pts", "opp_pts", "own_att", "est_opp_attempts", "recorded_opp_attempts",
            "league_psa", "opp_psa_est", "team_opp_ppg", "league_opp_ppg", "psa_suppression", "ppg_suppression",
            "psa_suppression_z", "ppg_suppression_z", "team_def_z_universal", "season_complete", "season_high_confidence"]
    return f[cols].reset_index(drop=True)
