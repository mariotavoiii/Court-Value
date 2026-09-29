# Court Value 1.1: validation summary

**Release:** model `1.1.0`, data revision `2026-09-29`, with the same declared input snapshot as 1.0.
- 1.1 changes only team defense (TECHNICAL_SPECIFICATION §7). CV_BASE is identical to 1.0.0; the maximum difference is 0.
- **Final release:** `1.1.0` scores are identical to `1.1.0-rc.1` (max difference 0); only the version label differs. Its audit is repeated in `releases/1.1.0/audit/`.
- **Audited candidate:** `1.1.0-rc.1`, built by `build_release.py` from `private_inputs/2026-09-29`, which was hash-verified against `input_manifest.json`.
- **Audit:** `audit_candidate.py` with `--input-dir` and `--reference-dir releases/1.0.0/outputs`. Evidence is in `releases/1.1.0-rc.1/audit/`.
- **Earlier evidence:** the 1.0 evidence is preserved in `releases/1.0.0-rc.2/audit/` and `releases/1.0.0/`.
- **Issues:** every one is logged in `anomaly_log.csv` (A01–A24).

The three defense coefficients are the only fitted numbers in CV. They were fitted once to **recorded opponent shot attempts**, not to awards, outside metrics or named players, and then frozen. All other checks below are descriptive.

## 1. Reproduction

| Check | Result |
| --- | --- |
| Declared inputs | 7 files; SHA-256 verified before every build (unchanged from 1.0) |
| Clean-room rebuild (fresh directory, copied code and inputs) | **Byte-identical** on all 7 outputs and the build summary |
| Defense coefficients refitted from the inputs | Exact (max difference 0) |
| Team defense recomputed independently of the engine | 1,758 team-seasons; max difference 0 |
| CV_BASE vs 1.0.0 release | Identical on all 26,219 rows (max difference 0) |
| Frozen control columns vs 1.0.0 | Identical (max difference 0) |
| Worked examples recomputed from raw totals, including one team's defense | Max difference 1.1e-13 |

The 1.0 cross-platform result (macOS, Python 3.14.7, against Linux, Python 3.11.15; max difference 0.0) used the same locked environment. 1.1 adds only numpy/pandas arithmetic of the same kind.

## 2. Mechanical checks (22 of 22 pass)

These are the 19 checks from 1.0 plus three for 1.1:
- Full CV exists on every scored positive-minute row.
- The defense coefficients reproduce from the inputs.
- Team defense recomputes exactly.

The 1.0 check "defensive layer unchanged vs control" is retired, because 1.1 changes the defensive layer on purpose. It is replaced by "CV_BASE unchanged vs reference release", which passes.

## 3. Defense: one rule for every season

| | CV 1.0 | CV 1.1 |
|---|---|---|
| Seasons with full CV | NBA 1958–2024 | NBA 1952–2026, ABA 1968–76 |
| Qualified full-CV rows | 13,597 | **15,301** (every qualified scored row) |
| All full-CV rows | 23,161 | 26,204 (all rows except 11 unscored and 4 zero-minute) |
| TeamDef vs TeamDef from recorded opponent attempts, NBA 1971–2026 | r = 0.777 | **r = 0.884** |
| Same, ABA 1968–76 (not used in fitting) | n/a | **r = 0.838** |

Transfer tests use split samples and are scored against TeamDef built from recorded attempts:

| Fitted on → tested on | Estimate | Own attempts only (baseline) |
|---|---:|---:|
| NBA 1971–95 → NBA 1996–2026 | 0.902 | 0.808 |
| NBA 1996–2026 → NBA 1971–95 | 0.851 | 0.694 |
| NBA 1996–2026 → NBA 1971–80 | 0.843 | 0.697 |
| NBA 1971–2026 → ABA | 0.838 | 0.693 |

The estimate holds up in the earliest recorded decade and in a league it never saw, which is the best available evidence that it can be applied before 1971. Scripts: `experiments/2026-09-29_defense_coverage/`.

**Change from 1.0** (13,597 qualified rows scored in both):
- Spearman 0.995, mean absolute change 0.196, maximum 1.79.
- The largest moves are whole teams re-rated:
  - 1976 Chicago rises; the estimate overshoots.
  - 1970 San Francisco rises.
  - 2014 Miami falls. The recorded attempts agree with 1.1 there: −0.22 recorded, −0.40 in 1.1, +1.21 in 1.0.
- `largest_changes_vs_reference.csv` lists the top 100.

## 4. Awards, stability and outside metrics

Qualified NBA seasons, 1977–2024 (n = 11,543), the panel where every metric exists:

| Metric | All-Star | All-NBA | MVP #1 | MVP top 3 | MVP-vote ρ | Year-to-year r |
|---|---:|---:|---:|---:|---:|---:|
| **CV 1.1** | 0.750 | 0.777 | **0.52** | **0.96** | 0.734 | 0.80 |
| CV 1.0 | **0.754** | **0.781** | 0.48 | 0.94 | **0.744** | 0.80 |
| CV_BASE | 0.750 | 0.780 | 0.48 | 0.85 | 0.729 | 0.81 |
| CV with recorded-attempt defense (reference only) | 0.750 | 0.775 | 0.48 | 0.92 | 0.719 | 0.80 |
| PER_1952 | 0.640 | 0.677 | 0.46 | 0.77 | 0.645 | 0.83 |
| WS_1952 | 0.556 | 0.531 | 0.48 | 0.65 | 0.507 | 0.73 |
| PER (modern) | 0.643 | 0.708 | 0.56 | 0.83 | 0.675 | 0.78 |
| WS (modern) | 0.663 | 0.694 | 0.56 | 0.83 | 0.633 | 0.69 |
| BPM | 0.624 | 0.679 | 0.54 | 0.83 | 0.637 | 0.73 |
| VORP | 0.678 | 0.714 | 0.54 | 0.85 | 0.654 | 0.74 |
| LAKER WAR | 0.660 | 0.676 | 0.54 | 0.73 | 0.627 | 0.71 |

**Other checks:**
- **All-Defensive teams, 1971–2024** (overlap between defensive credit and selections): 1.1 scores 0.284, against 0.265 for 1.0 and 0.271 for recorded attempts.
- **New coverage, NBA 1952–57 and 2025–26** (932 qualified rows): All-Star 0.770 (CV_BASE 0.793), All-NBA 0.789 (0.763), MVP-vote ρ 0.818 (0.798).
- **ABA:** All-Star 0.770, All-ABA 0.693. CV_BASE scores 0.781 and 0.784, so team-based defense lowers All-ABA agreement (A24).
- **Stability:** year-to-year correlation for qualified full CV is r = 0.855 in the NBA (10,215 pairs, 1952–2026) and 0.785 in the ABA.
- **Outside metrics** (mean within-season Spearman, 1977–2024): WS 0.856, LAKER WAR 0.824, VORP 0.790, PER 0.785, LAKER 0.738, BPM 0.720. Each is within 0.004 of 1.0.

**Reading.**
- 1.1 gives up 0.004 in All-Star/All-NBA agreement and 0.010 in MVP-vote ρ.
- In exchange it gains better agreement with recorded defense, All-Defensive selections and MVP winners, and it covers every season with one rule.
- The comparisons from 1.0 still hold: CV agrees with awards more than the 1952-rules PER/WS and every modern metric tested, except at naming the MVP exactly #1: 25 of 48 seasons, against 26–28 for the modern metrics.
- The 1.0 caveats also still hold. Voters reward volume, which CV also rewards by design, and these metrics share box-score inputs.

## 5. Eras

| NBA decade | 1950s | 1960s | 1970s | 1980s | 1990s | 2000s | 2010s | 2020s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Mean qualified full CV | 0.35 | 0.45 | 0.53 | 0.56 | 0.67 | 0.73 | 0.82 | 1.00 |

ABA means are 0.67 (1968–69) and 0.57 (1970s). The all-time top 100 contains:
- 2010s–20s: 43 seasons, against about 28 expected.
- NBA 1970s–80s: 13, against about 25.
- NBA 1950s: 2, against about 4.
- ABA: 2, against about 5.

The residual era tail is disclosed (A05); no era coefficient is used.

## 6. Case review

- **All-time top 10 qualified full CV:** O'Neal 2000 (14.49), Curry 2016, Chamberlain 1966, Abdul-Jabbar 1972, Durant 2014, Antetokounmpo 2020, Chamberlain 1964, James 2010, Chamberlain 1962, Durant 2013.
- **Newly covered leaders:**
  - Mikan 1952: 11.31.
  - Johnston 1956: 9.85.
  - Haywood 1970 ABA: 12.23, the ABA's best.
  - Erving 1974 ABA: 11.20.
  - Gilgeous-Alexander 2025: 12.48, the best season since 2020.
  - Jokić 2025: 12.09, and 12.02 in 2026.

No arithmetic or data errors were found. Team-level estimation error (A23) is the main new accepted consequence.

## 7. Status

All gates for `1.1.0` are closed: 0 blocking failures, byte-identical rebuild, documentation regenerated from the release, and the model owner's approval of the defense rule (2026-09-29).
