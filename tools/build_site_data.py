"""Usage: python tools/build_site_data.py PUBLIC_cv_scores.csv docs/data/scores.json VERSION [KaggleFullPlayerTotals.csv] [research_ledger.csv]

Build the website score file. Positions (optional inputs) are display-only.
"""
"""Build the website's compact score file from PUBLIC_cv_scores.csv."""
import json, sys, pandas as pd, numpy as np
src, out, version = sys.argv[1], sys.argv[2], sys.argv[3]
pos_src = sys.argv[4] if len(sys.argv) > 4 else None   # full Kaggle Player Totals (has `pos`); display only
POS = {}
if pos_src:
    t = pd.read_csv(pos_src, usecols=["season", "lg", "player_id", "team", "pos", "g"])
    t["agg"] = t.team.astype(str).str.fullmatch(r"TOT|\d+TM")
    t = t.sort_values(["agg", "g"], ascending=[False, False]).drop_duplicates(["season", "lg", "player_id"])
    POS = {(int(a), b, c): str(d).split("-")[0] for a, b, c, d in zip(t.season, t.lg, t.player_id, t.pos) if isinstance(d, str)}
ledger = sys.argv[5] if len(sys.argv) > 5 else None   # research ledger: fills seasons newer than the Kaggle copy (2026)
if ledger:
    l = pd.read_csv(ledger, usecols=["player_id", "season", "league", "phase", "position"], low_memory=False)
    l = l[l.phase.eq("RS") & l.position.notna()]
    for a, b, c, d in zip(l.season, l.league, l.player_id, l.position):
        POS.setdefault((int(a), b, c), str(d).split("-")[0])
POS = {k: v for k, v in POS.items() if v in ("PG", "SG", "SF", "PF", "C")}
p = pd.read_csv(src, float_precision="round_trip", low_memory=False)
cov = {"COMPLETE_SEASON_TOTALS_ESTIMATE": "C", "COMPLETE_HIGH_CONFIDENCE": "H", "COMPLETE_LOWER_CONFIDENCE": "L",
       "UNAVAILABLE_SEASON_NOT_COVERED": "S", "UNAVAILABLE_ABA_NOT_RECONSTRUCTED": "A", "UNAVAILABLE_ZERO_MINUTES": "Z"}
def num(x, d=None):
    if pd.isna(x): return None
    return round(float(x), d) if d is not None else int(x)
rows = []
for r in p.itertuples(index=False):
    rows.append([r.player_id, r.player, int(r.season), 0 if r.league == "NBA" else 1, r.teams, int(r.games), int(r.minutes),
                 1 if r.qualified else 0, cov.get(r.defense_coverage, "?"), num(r.cv_full, 4), num(r.cv_base, 4), num(r.def_credit, 4),
                 num(r.full_rank_season), num(r.full_rank_alltime), num(r.base_rank_season), num(r.base_rank_alltime),
                 POS.get((int(r.season), r.league, r.player_id))])
meta = {"version": version, "data_revision": str(p.data_revision.iloc[0]),
        "fields": ["id", "player", "season", "lg", "teams", "g", "mp", "q", "cov", "cv", "base", "def", "rs", "ra", "brs", "bra", "pos"],
        "counts": {"rows": len(p), "qualified_full": int((p.qualified & p.cv_full.notna()).sum()),
                   "qualified_base": int((p.qualified & p.cv_base.notna()).sum())}}
meta["position_source"] = "Basketball-Reference listed position (display and filtering only; not a model input)"
json.dump({"meta": meta, "rows": rows}, open(out, "w"), separators=(",", ":"), ensure_ascii=False)
print(meta, "missing pos", sum(r[16] is None for r in rows))
