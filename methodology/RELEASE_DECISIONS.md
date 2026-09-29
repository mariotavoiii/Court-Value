# Court Value Release Decisions (1.0 Gate 1, amended for 1.1)

Decision date: 2026-09-29. **Status: Gate 1 recorded.** Authority: the model owner's instructions of 2026-09-29. They supersede older handoffs, frozen-development notes, confidentiality suggestions and earlier no-promotion decisions.

**Supersession notice.** The readiness review of the same morning (`outputs/cv_1_0_readiness_2026_09_29/`) recommended retaining full-season MOV and deferring games-played MOV. **That recommendation is superseded.** The earlier full-season-MOV decision was a freeze/no-promotion decision taken while testing. It was not a finding that full-season MOV is superior. The readiness package remains preserved as a dated assessment.

The release process is **Freeze → Audit → Document → Publish**. This document settles the methodology. It does not certify the candidate or announce a public release. Certification evidence is in `docs/VALIDATION.md` and `anomaly_log.csv`.

## Settled decisions

These are not reopened unless an audit shows an internal inconsistency or a technical impossibility.

| # | Decision | CV 1.0 rule |
| --- | --- | --- |
| 1 | What CV measures | Historically portable **realized player-season value/responsibility** through production, responsibility, team context and defense. Not latent talent, hypothetical healthy value, contract value, prediction, a tracking/plus-minus replacement, career greatness, causal impact or wins above replacement. |
| 2 | Authoritative implementation | The current documented **v2026.5-derived reconstruction** is the base architecture. CV 1.0 becomes the public authority once frozen. **No identity with the lost original v2026.5 executable is claimed.** Historical v2026.5 materials remain development/control artifacts. Known differences are documented (anomaly A15). |
| 3 | Team context | **Adopt verified literal games-played (appearance-game) MOV**, per team stint: the mean verified final margin over games the player appeared in for that team. No anchoring to official season MOV. |
| 4 | MOV verification and fallback | A stint is eligible only when all of these hold: the identity-resolved appearance set exactly matches official stint games; player/team/game records are unique; and every appearance has a corroborated, paired final margin. Otherwise the stint uses **explicit full-season MOV fallback** with a stint-level reason code. A complete team schedule is diagnostic, not required. |
| 5 | MOV normalization | Keep the official full-season team-MOV mean and population SD per league-season as the reference distribution. Substitute only the stint MOV. |
| 6 | Limited changes | Relative to the frozen control, CV 1.0 makes exactly two methodology changes (CV 1.1 adds a third: the team-defense estimate, #12): games-played MOV (#3) and games-weighted base standardization (#11, added 2026-09-29 in rc.2). A variant scan showed that coefficient changes do not improve agreement with awards or external metrics. All other coefficients and components are unchanged: .44 FTA; .65 AST/TRB; .25 attempts in VisibleRole only; .30 efficiency with a .92 baseline; scoring-ratio factor; .85/.15 role score; role weights 1/.85/.35/.15; .125 context with .75 tanh slope; base Z ×3. In 1.0, candidate defense was identical to control (max difference 0); in 1.1 it deliberately differs. |
| 7 | Control | The full-season-MOV reconstruction is preserved as the frozen comparison/control. It is emitted with every build (`control_cv_full`, `control_cv_base`). |
| 8 | Availability | **No direct availability multiplier. `sqrt(Availability)` remains rejected.** Production is normalized by games played before league-season standardization, so identical per-game production does not automatically receive a lower CV_BASE for fewer games. Availability acts through role/responsibility, qualification and confidence. CV is not a literal cumulative sum over scheduled games. |
| 9 | Qualification | Availability ≥ 70% of the player's actual team schedule (shortened seasons use the real schedule), with complete team context. **Exception (decided 2026-09-29):** stints on franchises that folded mid-season (1976 ABA Utah, San Diego) use the league-season's longest schedule. The convention is integer-exact: `10·G ≥ 7·TeamGamesReference`. Qualification does not restrict normalization populations. Unqualified rows remain in research exports. |
| 10 | Primary unit and scope | **Player × season × league, regular season.** NBA and ABA both count, with league identity explicit and normalization separate. Crossover display is an export convention, not a model rule. |
| 11 | Historical normalization | League-season standardization of CV_BASE, **weighted by games played** (decided 2026-09-29): the environment is the season's typical player-game, not a roster head count. Defensive index standardization is unchanged. **No subjective era correction and no ABA penalty.** Relative standing does not prove equal absolute strength; this is stated as a limitation. |
| 12 | Defense | **Amended in 1.1 (see below):** team defense uses the frozen season-totals possession estimate for every NBA and ABA season. Otherwise preserve the framework: .80/.20 team suppression; minutes tiers 1/.60/.25/0; Z ×3; 1.5·tanh(index/6); negative credit halved. **Ties:** stable sort by minutes, VisibleRole, stint games and points (all descending), then player ID ascending. **Traded players:** minutes-weight stint DefRaw into one player-season DefRaw, then standardize and compress. **Missing defense:** full CV unavailable, never zero-filled. No defensive coverage is inferred from the MOV sources. |
| 13 | Full CV vs CV_BASE | Never mixed in one leaderboard. Full-CV rankings include only qualified rows with full CV. CV_BASE rankings are separate. Current seasons without defense are labeled **CV_BASE**. Every row carries `score_basis`, `score_status`, `defense_coverage` and `mov_basis`. Since 1.1, full CV covers every scored row: NBA 1952–2026 and ABA 1968–76. |
| 14 | Validation role | Awards, voting, recognition and outside metrics (EPM, RAPTOR, LEBRON/LAKER, BPM, VORP, WS, PER) are validation/falsification evidence, never formula inputs. **Famous players are diagnostics, never tuning targets.** |
| 15 | Out of the 1.0 critical path | Career CV, GOAT points, HOF models, peak composites, best-N formulas, combined regular/playoff CV, projections and comparison apps. Playoff Run (primary) and Playoff Rate (companion) remain separate products. |
| 16 | Disclosure | Exact formulas, coefficients, thresholds, tiers, populations, bounds, MOV handling, missing-data rules, aggregation order, tie rules, qualification and numerical conventions are public. This supersedes older private-coefficient notes. Raw data are not redistributed without established rights. |
| 17 | Versioning | Public release `1.0.0` (identical scores to rc.2/rc.3; candidates preserved), data revision `2026-09-29`. Public `1.0.0` only after acceptance. Immutable output directories, input/output manifests with SHA-256, dependency lock and changelog. Future methodological changes get new versions. |

## MOV construction note

Literal appearance MOV does not require a complete verified team schedule, because it does not subtract a verified full-season MOV. This admits 323 stints (306 player-seasons) beyond the earlier anchored trial's 25,806. All 323 were independently re-derived from the original game evidence with zero failures (anomaly A14).

## Decisions taken after the first audit (2026-09-29)

The model owner reviewed rc.1 and a variant scan (`experiments/2026-09-29_variant_scan/`). They were open to formula changes if agreement with modern metrics and awards improved. The scan showed that the efficiency coefficient, the context coefficient and per-minute scoring do not improve agreement, and per-minute scoring worsens awards agreement and stability. Two changes were adopted:

1. **A05 resolved: games-weighted CV_BASE standardization.** It cuts the qualified-mean era drift by about one third (0.83 → 0.55) at 0.999 rank agreement, with unchanged awards and external agreement. A residual era tail remains and is disclosed.
2. **A04 resolved: folded-franchise qualification** against the league schedule (6 ABA 1976 rows leave the CV_BASE leaderboard; no scores change).

A comparison with 1952-rules PER and Win Shares, their modern versions, BPM, VORP, LAKER and awards is in `experiments/2026-09-29_1952_metrics_comparison/`.

## Decision for 1.1 (2026-09-29): one defensive rule for all of history

The model owner wanted defense measured consistently from 1952 on. Two facts from `experiments/2026-09-29_defense_coverage/` informed the decision:

1. 1.0 defense covered only NBA 1958–2024. The limit came from its game-level player-box archive (gaps in 1952–57, 6 games short in 2025, no 2026, no ABA), not from the model.
2. 1.0's universal attempt allocation agreed with defense built on recorded opponent attempts (NBA 1971+) at only r = 0.78.

**Adopted:** opponent attempts are estimated from season team totals recorded since 1951-52 (points, opponent points, FGA, FTA, TRB). Three coefficients are fitted once on NBA 1971–2026 recorded attempts and frozen. The same rule scores every NBA and ABA season, and recorded opponent attempts never score a season. TECHNICAL_SPECIFICATION §7 has the formula.

**Rejected:** using recorded opponent attempts from 1971 on. It would be somewhat more accurate for those seasons (the estimate agrees at r = 0.88), but it would give CV two information rules. The owner's words: "better to be philosophically and methodologically consistent than like .004 off on all star and all nba agreement." The awards cost of the adopted rule is 0.004 in All-Star and All-NBA agreement for 1977–2024.

**Consequences:**
- Model version 1.1.0.
- CV_BASE is unchanged.
- 1.0.0 remains archived and citable.
- The frozen control still carries the 1.0 defense for comparison.

## Gates after this document

**All four gates are closed for `1.0.0`.** Gate 2: 0 blocking failures and a cross-platform reproduction PASS. Gate 3: specification, worked examples and validation match the release. Gate 4: licences, citation, public repository and website are prepared. Gate 3 (documentation) has drafts. Gate 4 (publication) needs rights review, authorship/licence metadata, a website and an archive. No gate is inferred from this document alone.
