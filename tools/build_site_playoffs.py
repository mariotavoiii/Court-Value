"""Usage: python tools/build_site_playoffs.py PUBLIC_playoff_cv_scores.csv docs/data/scores.json docs/data/playoffs.json

Compact website file for Playoff CV. Position is copied from the same season's regular-season row (display only)."""
import json, sys
import pandas as pd

src, reg, out = sys.argv[1:4]
research = sys.argv[4] if len(sys.argv) > 4 else None   # optional: playoff_player_postseasons.csv, for Finals appearances
p = pd.read_csv(src, float_precision="round_trip")
fin = {}
if research:
    rr = pd.read_csv(research, usecols=["player_id", "season", "last_round"])
    fin = {(a, int(b)): int(c == 4) for a, b, c in zip(rr.player_id, rr.season, rr.last_round)}
pos = {(r[0], r[2]): r[16] for r in json.load(open(reg))["rows"] if r[3] == 0}
ev = {"COMPLETE": "C", "PARTIAL": "P", "NONE": "N"}
num = lambda x, d=None: None if pd.isna(x) else (round(float(x), d) if d is not None else int(x))
rows = [[r.player_id, r.player, int(r.season), 0, r.team, int(r.games), int(r.team_games), 1 if r.rate_qualified else 0,
         ev[r.box_evidence], num(r.playoff_cv_run, 3), num(r.playoff_cv_rate, 3), num(r.championship_credit, 3),
         num(r.playoff_cv_run_rank_season), num(r.playoff_cv_run_rank_alltime), num(r.playoff_cv_rate_rank_season),
         num(r.playoff_cv_rate_rank_alltime), pos.get((r.player_id, int(r.season))), 1 if r.champion else 0, num(r.rounds_appeared), fin.get((r.player_id, int(r.season)))]
        for r in p.itertuples(index=False)]
meta = {"playoff_model_version": str(p.playoff_model_version.iloc[0]), "data_revision": str(p.data_revision.iloc[0]),
        "fields": ["id", "player", "season", "lg", "team", "g", "team_games", "rate_q", "box_evidence", "run", "rate", "credit",
                   "run_rs", "run_ra", "rate_rs", "rate_ra", "pos", "champion", "rounds", "finals"], "rows": len(rows)}
json.dump({"meta": meta, "rows": rows}, open(out, "w"), separators=(",", ":"), ensure_ascii=False)
print(meta)
