# Court Value 1.0.0-rc.2: validation summary

Candidate: model `1.0.0-rc.2`, data revision `2026-09-29`, built by `build_release.py` from `private_inputs/2026-09-29` (hash-verified against `input_manifest.json`). Audit: `audit_candidate.py` on the candidate outputs. Evidence tables are in `releases/1.0.0-rc.2/audit/`. The rc.1 evidence is preserved in `releases/1.0.0-rc.1/`. Every issue raised is recorded in `anomaly_log.csv` as a **bug**, an **accepted consequence** or **unresolved**.

These checks are descriptive. No coefficient was fitted or changed in response to any result.

## 1. Reproduction

| Check | Result |
| --- | --- |
| Declared inputs | 7 files; SHA-256 verified against the input manifest before every build |
| Clean-room rebuild (fresh directory, copied code and inputs, empty environment) | **Byte-identical** on all 6 output files and the build summary |
| Frozen control (`cv1/control_v2026_5.py`, full-season MOV) vs saved frozen reconstruction (`frozen_defense_player_seasons.csv`, built on pandas 2.2.3) | 26,219/26,219 keys; max difference **0.0** for base, defensive credit and full CV; no missingness or qualification changes |
| Worked examples recomputed from raw totals, independently of the engine | max difference 1.1e-13 |
| Locked-dependency rebuild (pandas 2.2.3 / numpy 2.3.5) | **Not yet run** (A18). The candidate was built on pandas 3.0.2 / numpy 2.4.4. |

"Independently reproducible" may not be claimed until an outside-style rebuild from obtainable inputs succeeds under the locked environment.

## 2. Mechanical checks (19 of 19 pass)

These checks cover: unique player-season-league and stint keys; declared leagues only; finite scores; CV = CV_BASE + DefCredit (max error 5e-15); DefCredit within [−0.75, +1.5]; the exact integer qualification rule; stint games and minutes summing to player-season totals; schedule-aware availability; no availability multiplier (rate = raw/G, max error 2e-14); games-weighted CV_BASE mean 0 and weighted population SD 3 in every league-season; eligible stints with exactly the official appearance count and verified margins; eligible MOV equal to the literal appearance mean; fallback MOV equal to full-season MOV; and the defensive layer identical between candidate and control.

## 3. MOV adoption

| Quantity | Value |
| --- | --- |
| Stints using verified appearance MOV | 26,129 of 29,342 |
| Explicit fallbacks | ABA unavailable 1,461; appearance count mismatch 1,050; unverified margin 453; appearances unavailable 238; team context missing 11 |
| Player-season MOV basis | all-appearance 23,279; mixed 148; all-fallback 2,792 |
| Newly admitted vs earlier trial | 323 stints; **323/323 independently re-derived**; max MOV error 0 |
| MOV effect alone (rc.1 vs control), qualified full CV (13,597) | Spearman 0.99991; mean abs change 0.027; max 0.745 (Lillard 2023) |
| rc.2 vs control (MOV + games-weighting) | Spearman 0.9990; mean change −0.75 (a level shift from the new zero point) |
| vs prior anchored trial, previously eligible rows | max change 0.018 (the anchoring term) |

The largest movements match known team-with/without patterns. Examples: Embiid 2024 (+0.82), Lillard 2023 (+0.75), Morant 2022 (−0.71; Memphis was better in the games he missed) and Jefferson 2005 (−0.76). Recognition (All-Star overlap 0.749 → 0.750, All-NBA 0.771 → 0.772, mean MVP-vote Spearman 0.701 → 0.703) and external correlations (changes ≤ 0.0012) move negligibly. These metrics were **not** adoption criteria.

## 4. Case review

This review was performed on rc.1. rc.2 shifts values by about −0.75 (rank Spearman 0.999), and the dispositions are unchanged. Score values quoted below are on the rc.1 scale; current values are in `releases/1.0.0-rc.2/audit/`.

| Panel | Finding | Disposition |
| --- | --- | --- |
| Top 100 qualified full CV | All tier-1 high-usage stars; led by O'Neal 2000 (15.21), Harden 2019, Curry 2016, Chamberlain 1962, Abdul-Jabbar 1972 | No errors found |
| Bottom 100 | Low-minute rotation players (median ≈10.6 MPG), 1959–2019 | A07, accepted: per-game value, not per-minute quality |
| Low-games extremes | e.g. World Peace 2005 (7 G) CV_BASE 7.56 | A06, accepted: all unqualified, excluded from leaderboards |
| Largest defensive credits | Whole tier-1 cores of elite defensive teams (1976 GSW, 1970 NYK, 2016–17 SAS/GSW) share near-maximum credit | A08, accepted: team-responsibility allocation |
| Largest negative credits | Tier-1 players on the worst defenses (1993 DAL, 2023 SAS, 2012 CHA) | A09, accepted |
| Traded seasons | Chamberlain 1965, Anthony 2011, McAdoo 1977, Harden 2022; stint context computed per team | Checked by the worked example (McCollum 2022) |
| Shortened seasons | 1999 (50 G), 2012 (66), 2020 (64–75, unequal), 2021 (72); qualification uses actual team schedules | Correct. Duncan 1999 worked example. |
| Folded franchises | ABA 1976 Utah (16 G) / San Diego (11 G) players qualify on their own team's schedule | **A04 unresolved** (leaderboard membership only) |
| ABA | CV_BASE only; Haywood 1970 (11.30), Erving 1974 (10.65) lead; fallback MOV | Correct. Erving 1976 worked example. |
| League crossovers | 84 player-season-league rows remain separate per league | Correct |
| Zero-minute seasons | 4 rows; defense unavailable; unqualified | A12, accepted |
| Archetypes | 22 named diagnostics in `representative_archetypes.csv` (Russell, Rodman, Green, Poole, DPOY disagreements, Leonard 2019, Embiid 2024, Jokić 2025) | Diagnostics only; no tuning |

## 5. Stability and eras

Adjacent-season correlation among qualified returning players: NBA full CV r = 0.856 (Spearman 0.813, 9,601 pairs, 1958–2023); NBA CV_BASE r = 0.866 (10,215 pairs); ABA CV_BASE r = 0.776. Median absolute year-to-year change is about 1.06 CV.

**Era distribution (A05, resolved in rc.2 with a residual).** Games-weighted standardization reduced the drift in the qualified mean. The mean qualified full CV by decade is now 0.42 (1950s), 0.47 (1960s), 0.53 (1970s), 0.55 (1980s), 0.68 (1990s), 0.74 (2000s), 0.82 (2010s) and 1.02 (2020s). The 1960s-to-2020s gap is 0.55, down from 0.83 in rc.1.

The all-time top 100 still over-represents the 2010s–2020s (42 against about 28 expected) and under-represents the 1970s–80s (13 against about 28). The remaining tail is accepted and disclosed; no era coefficient is used.

## 6. External metrics and disagreements

On 13,597 qualified full-CV seasons, Spearman correlation with WS is 0.86, VORP 0.79, PER 0.78, LAKER WAR 0.83 and BPM 0.72. These are unchanged from rc.1 to within 0.006. These metrics share box-score inputs, so they are one correlated evidence family rather than independent confirmations.

The largest disagreements fall into two coherent groups:

- **CV above consensus (A10):** high-minute, high-volume, below-average-efficiency starters, e.g. RJ Barrett 2023, Dillon Brooks 2021/2023, Andrew Wiggins 2018–19, Monta Ellis 2010, Reggie Jackson 2022. CV credits per-game volume and top-tier responsibility, and its efficiency term is mild (0.30 × points above 92% of league scoring per attempt). Per-possession metrics penalize the same seasons heavily. This is the intended difference between a value/responsibility score and an efficiency-rate score.
- **CV below consensus (A11):** efficient low-minute bigs and specialists, e.g. Mitchell Robinson 2019–20, Ekpe Udoh 2018, Luke Kornet 2023, JaVale McGee 2018, Jakob Poeltl 2019–20. CV is per game, not per minute, and these players carry little box-score volume or role.

Neither group reveals a data or arithmetic error.

## 7. CV versus 1952-rules PER and Win Shares, modern metrics and awards

The original goal was to do better than Win Shares and PER as they can be computed from 1952-available data. PER_1952 and WS_1952 were computed for every NBA and ABA season from 1952–2025 using Basketball-Reference's historical formulas: no 3P, TOV, STL, BLK or ORB; VOP = 1; DRB% = .7; estimated pace. For NBA 1952–73, where Basketball-Reference itself uses these formulas, the recomputation matches its published PER and WS at r = 0.999/1.000 with mean absolute error 0.03. Full tables are in `experiments/2026-09-29_1952_metrics_comparison/`.

Qualified NBA seasons from 1977–2024, the panel where every metric exists (n = 11,543):

| Metric | All-Star overlap | All-NBA overlap | MVP winner #1 | MVP winner top 3 | MVP-vote ρ | Year-to-year r |
|---|---:|---:|---:|---:|---:|---:|
| **CV** | **0.754** | **0.781** | 0.48 | **0.94** | **0.744** | 0.80 |
| CV_BASE | 0.750 | 0.780 | 0.48 | 0.85 | 0.729 | 0.81 |
| PER_1952 | 0.640 | 0.677 | 0.46 | 0.77 | 0.645 | **0.83** |
| WS_1952 | 0.556 | 0.531 | 0.48 | 0.65 | 0.507 | 0.73 |
| PER (modern) | 0.643 | 0.708 | 0.56 | 0.83 | 0.675 | 0.78 |
| WS (modern) | 0.663 | 0.694 | 0.56 | 0.83 | 0.633 | 0.69 |
| BPM | 0.624 | 0.679 | 0.54 | 0.83 | 0.637 | 0.73 |
| VORP | 0.678 | 0.714 | 0.54 | 0.85 | 0.654 | 0.74 |
| LAKER WAR | 0.660 | 0.676 | 0.54 | 0.73 | 0.627 | 0.71 |

Mean within-season Spearman correlation with modern metrics, same panel:

| | PER | WS | WS/48 | BPM | VORP | LAKER | LAKER WAR |
|---|---:|---:|---:|---:|---:|---:|---:|
| CV | 0.787 | **0.859** | 0.632 | **0.724** | **0.793** | **0.742** | **0.827** |
| PER_1952 | **0.927** | 0.705 | 0.632 | 0.653 | 0.676 | 0.618 | 0.649 |
| WS_1952 | 0.746 | 0.832 | **0.808** | 0.640 | 0.666 | 0.689 | 0.708 |

**Reading.**

- CV beats both 1952-rules metrics on every awards measure and on agreement with the modern total-value metrics (WS, VORP, BPM, LAKER).
- The 1952-rules metrics agree more only with their own modern descendants, and WS_1952 more with the per-minute WS/48.
- Using only 1952-available box scores, CV's agreement with awards is also higher than every modern metric tested, including those built on play-by-play and tracking-era data. The exception is naming the MVP winner exactly #1: 23 of 48 seasons for CV versus 26–27 for the modern metrics. Each season is worth about 0.02, so that gap is roughly three seasons.

**Caveats.**

- Voters historically reward volume and responsibility, which CV also rewards by design. Higher awards agreement shows that CV captures what voters valued. It does not prove CV is closer to true impact.
- The metrics compared share box-score inputs, so they are not independent confirmations.
- PER_1952 is slightly more stable year to year than CV.
- These results were not used to fit anything.

## 8. Open items before 1.0.0

1. A18: locked-dependency rebuild and comparison, tolerance 1e-12.
2. Gate 4 items: rights review of each source, authorship and licence metadata, website, archive/DOI.
