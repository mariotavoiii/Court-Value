# Changelog

All published outputs are immutable. Methodological changes receive a new model version; new or corrected data receive a new data revision.

## Post-1.1.0 tooling (2026-09-29): no score changes

- **Cross-platform reproduction of 1.1.0: PASS.** macOS 15.8 with Python 3.14.7, pandas 3.0.2 and numpy 2.4.4 reproduces all 7 outputs. The public score file is byte-identical in value. Full-precision scores differ by at most 8e-14 (relative 1.5e-12), and ranks and qualification are identical.
- **Fixed: `verify_locked_build.sh` tolerance.** The pure absolute test (1e-12) failed on `team_defense.csv`. There, a ~9,000 estimated-attempt value differed in its last binary digit between platform math libraries, a difference of 3.6e-12 absolute and 4e-16 relative. The test is now `|a − b| ≤ 1e-12 + 1e-12·|a|` (public file: 1e-4) and reports both absolute and relative differences (A25).
- The copy of the verifier inside the archived 1.1.0 release keeps the old, stricter test; use the current one.

## 1.1.0 (2026-09-29, data revision 2026-09-29): one defensive rule for all of history

- **Changed: team defense.** Opponent shot attempts are estimated from season team totals recorded since 1951-52, with three frozen coefficients. The same rule applies to every NBA and ABA season (TECHNICAL_SPECIFICATION §7). Recorded opponent attempts (1971+) are used only to fit the coefficients and for diagnostics.
- **Coverage:** full CV now covers NBA 1952–2026 and ABA 1968–76: 15,301 qualified seasons, up from 13,597 (NBA 1958–2024). There is no longer a CV_BASE-only tier for qualified seasons.
- **Accuracy:** team defense agrees with recorded-attempt defense at r = 0.884 (NBA 1971–2026), up from 0.777, and at 0.838 for the ABA, which was not used in fitting.
- **Scores:** CV_BASE is identical to 1.0.0. Full CV against 1.0.0 on the overlapping seasons: Spearman 0.995, mean absolute change 0.196, maximum 1.79.
- **Validation (1977–2024):**
  - All-Star 0.750 (1.0: 0.754), All-NBA 0.777 (0.781).
  - MVP winner #1 0.52 (0.48), MVP top 3 0.96 (0.94), MVP-vote ρ 0.734 (0.744).
  - All-Defensive 0.284 (0.265).
- **Status fields:** `defense_coverage` is now `COMPLETE_SEASON_TOTALS_ESTIMATE` for every covered row. The 1.0 high/lower-confidence labels (archive reconciliation) no longer apply (A17 superseded).
- **Audit:** 22 of 22 mechanical checks pass, including the coefficient refit, the team-defense recompute and CV_BASE invariance against 1.0. The clean rebuild is byte-identical. Anomalies A21–A24 are added.
- **Unchanged:** inputs, base model, MOV, qualification and licences. The frozen control keeps the 1.0 defense.

## 1.0.0 (2026-09-29, data revision 2026-09-29): first public release

- **Scores:** identical to 1.0.0-rc.3; only the version label differs.
- **Reproduction:** verified cross-platform. macOS with Python 3.14.7 and Linux with Python 3.11.15, both on pandas 3.0.2 and numpy 2.4.4, produce all outputs with maximum difference 0.0.
- **`requirements.lock`** now pins the actual build environment. The previous pandas 2.2.3 pin is kept as `requirements.lock.pandas2_legacy`.
- **Public outputs:** `PUBLIC_cv_scores.csv`, the website and the methodology.
- **Licences:** scores and documentation under CC BY 4.0, code under MIT. Author: Mario Tavolieri III.

## 1.0.0-rc.3 (2026-09-29, data revision 2026-09-29): packaging candidate

- **Added:** `PUBLIC_cv_scores.csv`, the public score sheet. No raw box-score totals are included.
- **Built under the locked dependencies** (pandas 2.2.3, numpy 2.3.5) on the owner's machine, to close A18.
- **Unchanged:** methodology and scores (verified against rc.2).

## 1.0.0-rc.2 (2026-09-29, data revision 2026-09-29): current release candidate, not published

- **Changed: CV_BASE league-season standardization is weighted by games played.** CV_BASE has weighted mean 0 and weighted SD 3.
  - Qualified scores shift down by 0.75 on average: the zero point is now the average player-game, which is higher than the average roster name.
  - Rank agreement with rc.1 is 0.999.
  - The all-time top 100 moves from 11 to 13 seasons for the 1970s–80s and from 45 to 42 for the 2010s–20s.
- **Changed: folded-franchise qualification.** 1976 ABA Utah/San Diego stints qualify against the league schedule, so 6 rows become unqualified. No score changes.
- **Unchanged:** games-played MOV, defense, all coefficients.
- **Frozen control** kept as `cv1/control_v2026_5.py` (identical to the rc.1 engine).

## 1.0.0-rc.1 (2026-09-29, data revision 2026-09-29): release candidate, not published

First release candidate of the public CV 1.0 regular-season player-season metric.

**Methodology relative to the frozen v2026.5-derived control (full-season MOV reconstruction):**

- **Changed: team context uses verified literal games-played (appearance-game) MOV** per team stint. Full-season MOV is an explicit fallback with stint-level reason codes. 26,129 of 29,342 stints use appearance MOV.
- **Unchanged:** every other coefficient, transform, tier rule, normalization population and the defensive framework. The candidate's defensive credit is identical to the control's.
- **Specified for 1.0:** defensive equal-minute tie order; traded-player defense aggregated before standardization/compression; integer-exact 70% qualification (`10·G ≥ 7·TeamGames`); separate full-CV and CV_BASE products with row-level status fields; minimum ranks on full-precision ties.

**Compared with the control:** qualified full-CV Spearman 0.99991, mean absolute change 0.027, maximum 0.745.

**Engineering:**

- New single entry point `build_release.py`, with input-manifest verification and output manifests.
- Fixed a crash in `cv1/mov.py` (duplicate `team` column; the module had never executed).
- Audit reads CSVs with round-trip float precision.

**Relationship to history:** this is not a recovered copy of the lost original v2026.5 executable. Historical saved v2026.5 values remain development artifacts.

**Open before 1.0.0:** A04, A05 and A18 in `anomaly_log.csv`.

## Pre-release lineage (for provenance, not public versions)

- **CELTIC v2025.1/v2025.2** (2025; `arctest/archive/lineage/CELTIC_v2025/CELTIC_Manual_v2025.2_full.txt`). This is the first documented form of the model. It introduced the core that CV still uses: BoxImpact = PTS + .65·AST + .65·REB; efficiency .30·(PTS − .92·LeaguePSA·attempts); scoring-ratio "pace" factor; √N rank-group tiers with weights 1/.85/.35/.15; tanh(.75·Z_MOV) context; per-82 rate; 3·Z within season and league. It differs from CV in three ways: the context coefficient was .25 (CV: .125); tiers used the mean of Z(box), Z(MP) and Z(MP/G) (CV: VisibleRole and availability); and it had no defensive component. Its per-82 rate is algebraically equivalent to CV's per-game rate under within-season Z.
- **ARC v2026.x** (2026): renamed and extended with defense and responsibility; v2026.4 is `arc_pipeline.py`. The v2026.5 executable is lost; CV 1.0 adopts the documented v2026.5-derived reconstruction.
