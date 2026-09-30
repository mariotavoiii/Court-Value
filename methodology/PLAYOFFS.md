# Playoff CV 1.0: specification, validation and limitations

Playoff CV scores one NBA postseason per player, 1951–52 through 2025–26. It is published with Court Value release 1.2.0. The regular-season scores in that release are unchanged (model 1.1.0).

There are two scores. Neither is added to the other or to regular-season CV.

| Score | Question it answers | Role |
|---|---|---|
| **Playoff CV Run** | How valuable was the player's postseason, including his share of completing a championship? | Headline résumé score |
| **Playoff CV Rate** | How good was he while he played? | Companion quality score |

The design follows the model owner's earlier playoff research (Run as headline, round-normalized, responsibility-weighted championship credit). It is rebuilt on CV 1.1 conventions, and minutes played are removed from every calculation.

## 1. Sources and appearances

- **Source:** the NBA player-game archive (`PlayerStatistics.csv`, Eoin Moore, Kaggle), playoff rows only.
  - The declared snapshot is `cv-playoff-inputs-2026-09-29`.
  - It has 102,249 rows and 30 projected columns; SHA-256 values are in its `input_manifest.json`.
  - Player IDs come from the same identity bridge as the regular season, with no unmatched rows. Team abbreviations come from `Team Totals.csv`.
- **Appearances:** the rule is identical to the regular season.
  - Rows commented `DNP`, `DND`, `NWT`, `inactive` or `did not` are excluded.
  - A remaining row counts as played if any recorded stat is nonzero or a numeric minutes value exists.
  - Minutes are used only as evidence that an appearance happened. They never weight anything. The audit proves this by setting every recorded minutes value to 1: no score changes.
- **Source repair:** the archive's 2022 rows carry team names but blank team IDs (1,891 rows). Stable franchise IDs are recovered from the same names elsewhere in the archive.
- **Rounds:** First Round, Conference (Division) Semifinals, Conference (Division) Finals and Finals. The 1954 opening division round-robin, the archive's only unlabeled stage, counts as one round.
- **Scope:** ABA postseasons are not covered because no ABA playoff game archive exists in the sources.

## 2. Box-score completeness (one rule for every season)

Points and free-throw attempts are recorded for every archived playoff game. Many 1952–64 team-games lack assists, rebounds or field-goal attempts.

- **Box-complete team-game:** the team's rebounds, assists and field-goal attempts are all positive, and at least half of the players who scored have a recorded rebound and field-goal attempt.
- **Estimating the missing stats:** a player's AST, TRB and FGA in each round are his per-game values over the box-complete games of that round, times his games in the round. If he has no box-complete game in the round, his whole-postseason box-complete values are used instead. Points and FTA always come from every game.
- **Unscored rows:** a player with no box-complete game in the entire postseason is unscored and excluded from every reference population. This affects 217 player-postseasons, all from 1952–62. The 22 team-postseasons with no box-complete game include 1960 Minneapolis (Elgin Baylor) and 1962 Detroit.
- **From 1964–65 on,** every team-game is box-complete, so the rule changes nothing there.
- **Evidence labels:** every row carries `box_evidence` = `COMPLETE`, `PARTIAL` (some games estimated) or `NONE` (unscored). See `audit/box_evidence_by_season.csv`.

| Postseasons | Share of team-games box-complete |
|---|---|
| 1952–1955 | 15–37% |
| 1956–1962 | 36–78% |
| 1963–1964 | 88–93% |
| 1965–2026 | 100% |

## 3. Team postseason context

All quantities below are per team postseason, standardized within that postseason.

- **Margin context:** `MOV` = (points − opponent points) / team playoff games, then `Z_MOV` across the postseason's teams.
- **`PaceAdj`** = 2·PTS / (PTS + OppPTS).
- **`LeaguePSA`** = the postseason's total points / (FGA + 0.44·FTA).
- **Team defense:** the frozen CV 1.1 season-totals estimate (TECHNICAL_SPECIFICATION §7), with the same three coefficients. It is applied to each team's postseason totals, with FGA and TRB from box-complete games scaled to all games. Then `TeamDef = 0.80·Z(PSA suppression) + 0.20·Z(PPG suppression)`.
- **Path:** `PossiblePathRounds = 5 − EntryRound`, so a bye shortens the path. From 1951–52 to 1973–74 every team entered at the Division Semifinals, giving three possible rounds. From 1974–75 there are four possible rounds, less byes; 67 team-postseasons received a bye.
- **Champion:** the team with the most Finals wins.

## 4. Player production and responsibility (no minutes anywhere)

```text
Attempts      = FGA + 0.44·FTA
BoxImpact     = PTS + 0.65·AST + 0.65·TRB
VisibleRole   = BoxImpact + 0.25·Attempts
Availability  = min(1, G / TeamPlayoffGames)
RoleScore     = 0.85·Z_team(VisibleRole) + 0.15·Z_team(Availability)
Role tier     = ceil(√N) groups by RoleScore within the team postseason → weights 1 / .85 / .35 / .15
Defense tier  = the same RoleScore ranking → weights 1 / .60 / .25 / 0
EffAdj        = 0.30·(PTS − 0.92·LeaguePSA·Attempts)
Context       = 1 + 0.125·RoleWeight·tanh(0.75·Z_MOV)
Raw           = (BoxImpact + EffAdj) · PaceAdj · Context
```

- **Defense tiers:** the regular season ranks defensive responsibility by minutes. Playoff minutes are incomplete before 1969–70, so every postseason ranks it by the same visible-load-and-availability score as offense.
- **Ties:** broken by VisibleRole, games, points, then player ID. This is the regular-season tie rule.

## 5. Playoff CV Rate

```text
RateBase   = 3 × Z_games-weighted(Raw / G) within the postseason     (CV 1.1 convention)
RateDef    = bounded(3 × Z(TeamDef × DefWeight))                       (bounded: 1.5·tanh(x/6), negative halved)
PlayoffCVRate = RateBase + RateDef
```

Rate leaderboards require `10·G ≥ 7·TeamPlayoffGames` (the regular-season 70% rule, in exact integers). The rule qualifies 8,409 of 11,082 scored player-postseasons.

## 6. Playoff CV Run

```text
RoundContribution_r = (BoxImpact_r + EffAdj_r) · PaceAdj · Context / TeamGamesInRound_r
RunRaw              = Σ_r RoundContribution_r / PossiblePathRounds
RunBase             = 3 × Z(RunRaw) within the postseason
PathAvailability    = Σ_r (PlayerGames_r / TeamGames_r) / PossiblePathRounds
RunDef              = bounded(3 × Z(TeamDef × DefWeight × PathAvailability))
Performance         = RunBase + RunDef
Share               = max(RunRaw, 0) / Σ_team max(RunRaw, 0)
ChampionshipCredit  = champion ? min(3, 12 × Share) : 0
PlayoffCVRun        = Performance + ChampionshipCredit
```

- **Series-length neutral:** each round is one opportunity unit, so a seven-game series does not count more than a sweep.
- **Missed games and rounds:** unplayed future rounds and missed games contribute zero.
- **Championship credit:** capped at 3, one CV standard deviation, which is reached at a 25% share of the champion's positive contribution. Fringe players get little or none. There is no flat ring bonus.
- **Reference weighting:** the reference population for Run is every scored player in the postseason, unweighted. Weighting by games would reintroduce the series-length effect that Run is built to remove.

## 7. Validation

The audit is `audit_playoffs.py`, with evidence in `releases/playoffs-1.0.0/audit/`.

**All 16 mechanical checks pass.** They confirm:
- the arithmetic identities;
- one champion per postseason;
- champion responsibility shares summing to 1;
- credit bounds and defense bounds;
- base moments in every postseason: Rate games-weighted mean 0 and SD 3, Run mean 0 and SD 3;
- box completeness from 1965;
- the qualification rule;
- the no-minutes invariance test.

**Reproduction:** a clean-room rebuild is byte-identical.

**Coverage against Neil Paine's postseason player file (1977–2026):**
- 9,434 of 9,435 player-postseasons match.
- Playoff games are identical in 99.76% of matches and within one game in all of them.

**Descriptive validation** (never used to fit anything):
- Mean within-postseason Spearman correlation of Run with LAKER postseason WAR is 0.64.
- Rate against LAKER per-possession impact, qualified rows, is 0.65.
- These metrics share box inputs and LAKER counts games, so this is a representation check, not truth.

**Postseason leaders:** the Run leader played for the champion in 70 of 75 postseasons. The five exceptions:

| Postseason | Run leader | Team | Result |
|---|---|---|---|
| 1963–64 | Wilt Chamberlain | San Francisco | lost the Finals |
| 1969–70 | Jerry West | Los Angeles Lakers | lost the Finals |
| 1973–74 | Kareem Abdul-Jabbar | Milwaukee | lost the Finals |
| 1988–89 | Michael Jordan | Chicago | lost the conference finals |
| 2013–14 | LeBron James | Miami | lost the Finals |

**Named cases (diagnostics, not targets):**
- The 1980s: Bird led the 1984 and 1986 postseasons (19.63, 18.66). Magic led 1985, 1987 and 1988 (15.82, 17.18, 15.67).
- Highest Runs overall: Jordan 1993 (22.92), Jokić 2023, LeBron 2012, Jordan 1998, Shaq 2000 and 2001.

## 8. Limitations

- **1952–62 rests on partial box scores.** About a third of 1950s playoff players are unscored, and many scored rows are `PARTIAL`. Those postseasons are measured with the same rule but much weaker evidence. Read them with their `box_evidence` label.
- **Small reference populations.** Early postseasons had 6–8 teams, which limits how far any player can stand above his postseason. As in the regular season, nothing adjusts for era.
- **Championship credit is a résumé choice.** It rewards completing the title path; it is not an estimate of causal impact. Performance without the credit is published as `run_performance`.
- **Team defense is team defense.** It is shared by a visible-load ranking, not measured for each defender, and it inherits the estimate's error (about one team in nine noticeably misrated).
- **No ABA postseasons**, and no career or combined regular-plus-playoff score.

## 9. Files

- **Public:** `PUBLIC_playoff_cv_scores.csv`, containing identity, team, games, rounds appeared, champion, box evidence, qualification, status, Run, Run performance, championship credit, Rate and ranks.
- **Private research files:** `playoff_player_postseasons.csv`, `playoff_team_postseasons.csv` and `playoff_player_rounds.csv`. They include box-score inputs, which are not redistributed.
- **Code:** `cv1/playoffs.py`, `build_playoffs.py` and `audit_playoffs.py`.
