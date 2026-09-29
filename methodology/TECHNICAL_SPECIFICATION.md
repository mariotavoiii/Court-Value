# Court Value 1.1: technical specification

This specification defines the CV 1.1 regular-season methodology. It is identical to CV 1.0 except for team defense (section 7). Release status, the exact executable snapshot and audit outcome are established by the release manifest and decisions document, not by this document's title. The base architecture is the documented **v2026.5-derived reconstruction**. The missing original v2026.5 executable has not been recovered, and exact historical equivalence is not claimed.

## 1. Unit, notation and statistical conventions

The primary unit is `(player_id, season, league)`, with season meaning the ending year. Team-specific calculations use player-team-season-league stints. NBA and ABA are separate normalization populations; crossover player-years retain one result in each league. A consolidated display is not a new model rule. No BAA player scores are created by the current input universe.

For a finite observed vector in cohort C:

```text
Z_C(x_i) = (x_i − mean_C(x)) / sqrt(mean_C((x − mean_C(x))²))
```

Means and standard deviations are unweighted and use `ddof=0`, **except CV_BASE**, which uses the games-weighted form defined in §5. Missing values remain missing. A zero standard deviation produces zero Z for observed values. Nonfinite required scoring inputs are invalid, rather than members of a normalization population. Calculations use double precision without intermediate display rounding; machine-readable results preserve precision. Published display rounding must not determine rank equality.

| Quantity | Reference population |
| --- | --- |
| Team MOV mean and SD | Unique teams in the same league-season, using official full-season MOV |
| Visible-role and stint-availability Z | Source player stints on the same team in the same league-season |
| CV_BASE Z | All scorable player-season-league records, including unqualified records, **weighted by games played** (weighted mean and weighted population SD) |
| Team defensive suppression Z | Teams in the same covered NBA season |
| Player defensive Z | All available player-season-league defensive raw values, including unqualified records |

The 70% qualification threshold is applied to recognized rankings, not to these standardization populations. No subjective era, league-strength, league-size or ABA penalty is applied.

## 2. Required inputs and validation

The base uses player `G, MP, PTS, AST, TRB, FGA, FTA`; team `G, PTS, FGA, FTA`; opponent `PTS`; player/team/league/season identities; and a verified appearance/result table for appearance MOV. Defense (1.1) additionally uses team `TRB` and nothing else; the declared game-team scoring archive is read only by the frozen 1.0 control. The [source register](SOURCES.md) identifies local schemas, snapshots and acquisition gaps.

Aggregate `TOT`/multi-team rows must not be added to their component stints. Scoring keys must be unique. Positive game denominators, finite required statistics and unambiguous team joins are necessary. Missing required team context in **any** stint invalidates the player's entire base result; a traded player's valid stint must not be silently scored as the whole season. In the inherited data, the affected cases touch 1955 Baltimore. Incomplete research rows remain visible with unavailable status.

Unknown appearances cannot be inferred from a missing row; zero margin is a valid game result and is distinct from missing margin. Team/game and player/game identities must be unique before aggregation.

## 3. Full-season team quantities

For team t in league-season L:

```text
TeamAttempts_t = TeamFGA_t + 0.44 × TeamFTA_t
LeaguePSA_L = Σ_t TeamPTS_t / Σ_t TeamAttempts_t
FullSeasonMOV_t = (TeamPTS_t − OppPTS_t) / TeamGames_t
MOVMean_L = mean_t(FullSeasonMOV_t)
MOVSD_L = population_sd_t(FullSeasonMOV_t)
PaceAdj_t = 2 × TeamPTS_t / (TeamPTS_t + OppPTS_t)
```

League sums use unique team rows; they are not repeated once per player. Source `League Average` rows are excluded. `PaceAdj` is an inherited variable name for a scoring-ratio factor, not a possessions-based pace estimate. It remains full-season in CV 1.0. No unrelated coefficients change with MOV adoption.

## 4. Verified literal appearance-game MOV

For stint s, let A_s contain that player's verified regular-season appearances for its team. For each game g, let `Margin_tg = FinalPTS_tg − FinalPTS_opponent,g`.

```text
AppearanceMOV_s = Σ_(g in A_s) Margin_tg / |A_s|
MOVUsed_s = AppearanceMOV_s, when the appearance evidence passes all gates
MOVUsed_s = FullSeasonMOV_t, otherwise
ContextZ_s = (MOVUsed_s − MOVMean_L) / MOVSD_L
```

If `MOVSD_L` is zero, observed context Z is zero. The same full-season team reference distribution is used for all stints in the league-season. Appearance averages are not standardized across players or against a separate appearance-MOV distribution.

Eligibility requires an unambiguous player/team/game mapping, exactly the official number of distinct stint appearances, and a verified paired final score for every appearance. Every selected game must have one valid score for each of two teams, with opposing margins. Duplicate or conflicting identity/result evidence fails eligibility. The full team's nonappearance schedule need not be complete when the exact player's appearances are independently complete. Team schedule/reconciliation coverage remains exported diagnostic evidence. Fallback is explicit at stint level and summarized as all-appearance, mixed or all-fallback at player-season level.

This is **literal** appearance MOV: do not calculate `official MOV + (appearance MOV − archive schedule MOV)`. The earlier repaired research trial used that anchored expression and also required complete team schedules; it remains a comparison artifact. The 1.0 candidate must be audited using the literal expression and its declared eligibility rule.

The source appearance extractor excludes explicit `DNP`, `DND`, `NWT`, `inactive` and `did not` comments. A remaining row counts as played if minutes are positive, any recorded stat is nonzero, or an explicit numeric minutes value exists (including a rounded zero). It deduplicates player-game-team records and checks the resulting count against official G. A very brief appearance receives the whole game's margin; there is no minutes weighting or on-court interpretation.

Game processing accepts regular-season and qualifying NBA Cup games, excludes Cup championship IDs beginning `006`, and excludes other non-regular events. Ending year is calendar year plus one for July–December, except July–October 2020 remains season 2020. Historical team-name aliases and protested-game date repairs are preserved as explicit mappings. The verified result chain distinguishes FiveThirtyEight/Paine's shared lineage from the NBA-index family and ESPN corroboration; their agreement is not falsely counted as multiple independent versions of the same lineage.

Missing verified appearance coverage uses full-season MOV. It does not create fabricated game margins or a new uncertainty coefficient. ABA currently falls back because its verified appearance pipeline is unavailable. Normal league-season restandardization can change a fallback player's result even when that player's own stint context remains unchanged.

## 5. Offensive/base responsibility and raw production

For each stint s:

```text
Attempts_s = FGA_s + 0.44 × FTA_s
BoxImpact_s = PTS_s + 0.65 × AST_s + 0.65 × TRB_s
VisibleRole_s = BoxImpact_s + 0.25 × Attempts_s
StintAvailability_s = min(1, G_s / TeamGames_s)
RoleScore_s = 0.85 × Z_team(VisibleRole_s) + 0.15 × Z_team(StintAvailability_s)
```

Within a team-season-league, sort by `RoleScore`, `VisibleRole`, `G`, `PTS` descending, then `player_id` ascending, using stable mergesort. Let ordinal rank r start at one and N be the number of source player stints on that team.

```text
K = ceil(sqrt(N))
Tier_s = min(4, floor((r − 1) × K / N) + 1)
RoleWeight_s = {1: 1.00, 2: 0.85, 3: 0.35, 4: 0.15}[Tier_s]
EfficiencyAdj_s = 0.30 × (PTS_s − 0.92 × LeaguePSA_L × Attempts_s)
Context_s = 1 + 0.125 × RoleWeight_s × tanh(0.75 × ContextZ_s)
Raw_s = (BoxImpact_s + EfficiencyAdj_s) × PaceAdj_t × Context_s
```

The `.25 × Attempts` term affects role ranking only, not raw production directly. Context approaches 0.875 and 1.125 at the maximum role weight, with smaller ranges at lower weights. There is no base-score cap and no direct availability multiplier.

For each player-season-league p:

```text
RawTotal_p = Σ_s Raw_s
Games_p = Σ_s G_s
Rate_p = RawTotal_p / Games_p
w_p = Games_p
M_L = Σ_p w_p·Rate_p / Σ_p w_p
SD_L = sqrt( Σ_p w_p·(Rate_p − M_L)² / Σ_p w_p )
CV_BASE_p = 3 × (Rate_p − M_L) / SD_L
```

The league-season reference is **games-weighted**: every player-season scorable in that league-season enters, and each counts in proportion to the games he played. A one-game call-up therefore shapes the reference as one player-game, not as one full player. The rationale is that the environment a season's production is measured against is the typical *game's* participants, not a head count of everyone who appeared. That head count changed markedly across eras with roster churn: the qualified share of the pool fell from about 75% in the 1950s to 43% in the 2020s. Games-weighting was selected in 1.0.0-rc.2 after a documented variant scan. It cut the cross-era drift in the qualified mean by about one third, with no loss in agreement with awards, external metrics or year-to-year stability. It is a definition of the environment, not an era coefficient; no era-specific constant exists.

Aggregate raw stint contributions before dividing by games and standardizing. Do not average stint Z-scores. Multiplying every rate in a league-season by 82 before standardization is algebraically equivalent apart from floating-point rounding; it does not turn this calculation into cumulative value.

## 6. Availability, qualification, trades and shortened seasons

```text
TeamGamesReference_p = max_s(QualTeamGames_s)
QualTeamGames_s = LeagueMaxTeamGames_L  if team(s) is in FOLDED_FRANCHISES, else TeamGames_s
AvailabilityRaw_p = Games_p / TeamGamesReference_p
Availability_p = min(1, AvailabilityRaw_p)
Qualified_p = (Availability_p >= 0.70) AND valid required base inputs
```

Qualification is evaluated in exact integer arithmetic as `10 × Games_p ≥ 7 × TeamGamesReference_p`. This is equivalent to the IEEE comparison of the correctly rounded quotient with 0.70, but it is immune to CSV parsing that may move a stored value by one unit in the last place; consumers should parse exported floats with round-trip precision. The reference uses the actual team schedule(s) represented by the player's stints. `FOLDED_FRANCHISES` = {1976 ABA Utah Stars (UTS, 16 G), 1976 ABA San Diego Sails (SDS, 11 G)}. These are the only franchises in 1952–2026 that folded before completing the league schedule; 1955 Baltimore is unscored for missing team data. For their stints, qualification uses the league-season's longest schedule (84), because a folded franchise is a truncated season for its players, not a league-shortened one. This affects qualification only; role and context calculations still use the actual team schedule. It does not assume 82 games in shortened seasons. For an 82-game schedule the minimum is 58 games. Trades can produce raw availability above one; preserve that raw diagnostic and cap the role/qualification presentation at one. League crossover records remain separate. Rankings on full CV also require full defense; rankings on CV_BASE require a valid base score.

At fixed per-game production, role weights, context, defense and reference distributions, fewer appearances do not independently lower CV_BASE. Changes in total production, games or minutes can move offensive or defensive tiers; normalization pools may also change. Qualification changes at the threshold. The rejected `sqrt(Availability)` experiment remains excluded.

## 7. Team defense (CV 1.1: season-totals possession estimate)

Team defense measures how well a team held opponents below the league's scoring per attempt, with a small weight on points allowed per game. The NBA did not record opponent field-goal and free-throw attempts before 1970-71, so CV 1.1 **estimates opponent attempts for every NBA and ABA season with one frozen rule**. The rule uses only team statistics recorded since 1951-52: `G, PTS, FGA, FTA, TRB` and opponent `PTS`. Recorded opponent attempts, where they exist, are used only to fit the three coefficients once and as a diagnostic; they never score a season. Implementation: `cv1/defense_estimator.py`.

```text
OwnAtt_t          = FGA_t + 0.44 × FTA_t
d(x)_t            = ln(x_t) − mean over the league-season's teams of ln(x)
ln(OppAttHat_t / OwnAtt_t) = 0.6020313823981741 × d(OppPTS_t / PTS_t)
                           + 0.8571267229514948 × d(PTS_t / OwnAtt_t)
                           + 0.32977975821588174 × d(TRB_t / OwnAtt_t)
                           (+ a league-season level, which cancels in the within-season Z and is not estimated)
LeaguePSA_L       = Σ_t PTS_t / Σ_t OwnAtt_t
OppPSA_t          = OppPTS_t / OppAttHat_t
TeamOppPPG_t      = OppPTS_t / G_t
LeagueOppPPG_L    = unweighted mean_t(TeamOppPPG_t)
PSASuppression_t  = LeaguePSA_L − OppPSA_t
PPGSuppression_t  = LeagueOppPPG_L − TeamOppPPG_t
TeamDef_t         = 0.80 × Z_teams(PSASuppression_t) + 0.20 × Z_teams(PPGSuppression_t)
```

Z uses the population SD across the league-season's teams. NBA and ABA are separate populations.

**Coefficient fit.** The fit is ordinary least squares without an intercept. Both sides are centered within each league-season. It uses the 1,484 NBA team-seasons of 1971–2026 whose opponent `FGA` and `FTA` are recorded in the declared snapshot. `defense_estimator.fit_coefficients` reproduces the frozen values exactly, and the audit checks this. The coefficients are part of the 1.1.0 model; refitting on a later data revision would be a new model version.

**Interpretation.**
- *Opponent scoring relative to own scoring:* a team outscored by its opponents faced more opponent attempts than its own count suggests.
- *Own points per attempt:* efficient teams use fewer attempts per possession, so their own attempt count understates the possessions both teams shared.
- *Rebounds per attempt:* defensive rebounds come from opponent misses, so a team with more rebounds relative to its own shots saw more opponent shots.

**Accuracy against recorded attempts.** The comparison is TeamDef from estimated attempts against TeamDef from recorded attempts:
- NBA 1971–2026: r = 0.884.
- ABA 1968–76, not used in fitting: r = 0.838.
- Split-sample transfer: fitted on 1971–95 and tested on 1996–2026, r = 0.90; in the reverse direction, 0.85.
- The 1.0 universal-attempt method scored r = 0.78 on the same test.
- The residual error is disclosed in LIMITATIONS; about one team in nine is noticeably misrated.

**Coverage.** TeamDef exists for every league-season team with an official payload. The only team without one is 1955 NBA Baltimore, whose players are unscored by the base model. There is no game-level input and no reconciliation criterion. `season_complete` is true for every covered league-season, and `season_high_confidence` equals it.

**1.0 method (control only).** CV 1.0 allocated each team's season attempts across games by game scoring shares from a player-box game archive (the "universal-attempt" reconstruction). That covered NBA 1958–2024 only. The method is preserved unchanged in the frozen control engine (`cv1/control_v2026_5.py`), whose `control_cv_full` column is emitted with every build. Internal column names ending in `_universal` are retained for continuity; in 1.1 they hold the season-totals estimate.

## 8. Player-season defense and full CV

Within each team-season-league, sort by total `MP`, `VisibleRole`, `G`, `PTS` descending, then `player_id` ascending, using stable mergesort. Compute the same N, K and tier grouping as in section 5, now from minutes rank. This is the frozen defensive equal-minute tie rule.

```text
DefWeight_s = {1: 1.00, 2: 0.60, 3: 0.25, 4: 0.00}[DefTier_s]
DefRaw_s = TeamDef_t × DefWeight_s
DefRaw_p = Σ_s(MP_s × DefRaw_s) / Σ_s MP_s
DefIndex_p = 3 × Z_player-season-league(DefRaw_p)
SignedCredit_p = 1.5 × tanh(DefIndex_p / 6)
DefCredit_p = SignedCredit_p                 when SignedCredit_p >= 0
DefCredit_p = 0.5 × SignedCredit_p           when SignedCredit_p < 0
CV_FULL_p = CV_BASE_p + DefCredit_p
```

The defensive mean uses available defensive stints and their minutes; a zero available-minute denominator yields missing defense. Under the season-wide coverage gate, every valid team in a covered player-season has defensive context. A release must not silently label a partially reconstructed player-season as fully covered. **Aggregation precedes player-season Z and compression.** Standardizing/compressing each stint and then averaging is a different method and is not CV 1.0.

Defensive credit approaches bounds −0.75 and +1.50. Zero raw responsibility need not produce zero credit after centering. Missing defense stays missing; it is never filled with zero and relabeled full CV.

## 9. Export and ranking contract

Row status fields: `score_basis` ∈ {CV_FULL, CV_BASE_ONLY, UNSCORED}; `score_status` ∈ {FULL_QUALIFIED, FULL_UNQUALIFIED, BASE_ONLY_QUALIFIED, BASE_ONLY_UNQUALIFIED, UNSCORED_MISSING_TEAM_CONTEXT}; `defense_coverage` ∈ {COMPLETE_SEASON_TOTALS_ESTIMATE, UNAVAILABLE_ZERO_MINUTES, NOT_APPLICABLE_UNSCORED} (1.1; `UNAVAILABLE_SEASON_NOT_COVERED` is reserved and currently unused; the 1.0 values COMPLETE_HIGH_CONFIDENCE, COMPLETE_LOWER_CONFIDENCE and UNAVAILABLE_ABA_NOT_RECONSTRUCTED no longer occur); `mov_basis` ∈ {ALL_APPEARANCE, MIXED, ALL_FALLBACK}. Stint rows carry `mov_method` and `fallback_reason`. Exports write floats with 17 significant digits.

Every research row preserves player ID, name, season, league, teams, games, minutes, availability, qualification, separate base/full/defense values, coverage and score-status flags, MOV basis and fallback information, model version and data revision. The source/input and output manifests identify the exact build.

Full-CV leaderboards contain only qualified rows with valid full CV. CV_BASE leaderboards are separate. Equal **full-precision** values share minimum rank (`1, 2, 2, 4`); a stable display order uses season, league and player ID when scores tie. All-time and within-season ranks must identify their scope. Do not rank the old mixed-basis `cv` field or a collapsed NBA/ABA export as though either were this primary model.

CSV blanks are unavailable values, not zero. Presentation rounding does not feed subsequent calculations. A release directory is immutable: methodological changes require a version change, new/corrected source data require a data revision, and older results remain archived.

## 10. Inherited, selected and deferred components

| Status | Components |
| --- | --- |
| Selected for CV 1.0 and kept in 1.1 | Reconstructed base architecture; literal verified appearance MOV with flagged fallback; all coefficients above; deterministic role/defense ties; player-season defense aggregation before Z/compression; 70% qualification |
| Inherited/reconstructed | v2026.5-derived box, efficiency, role and context architecture; scoring-ratio factor; defensive tiers and compression; 1.0 universal-attempt defense (control only) |
| Changed in CV 1.1 | Team defense from the frozen season-totals possession estimate for every NBA and ABA season (section 7) |
| Historical controls | Saved v2026.5 documentary results; full-season-MOV reconstructed control; prior anchored appearance-MOV trial |
| Rejected or experimental | Direct square-root availability multiplier; alternative coefficient, tier, Z-population and defensive-order variants |
| Deferred | Career/GOAT/HOF scores; peak composites; predictive talent; combined regular/playoff scoring |

Worked numerical examples are recorded in [WORKED_EXAMPLES.md](WORKED_EXAMPLES.md), generated from the final candidate's actual intermediates. They must cover the team-defense estimate, an ordinary season, a traded season, a shortened season, an ABA season, a pre-1958 season and the latest completed season. Candidate-specific validation and the anomaly register are separate release artifacts. Reproduction claims require the completed clean-build evidence; specification alone is not that evidence.
