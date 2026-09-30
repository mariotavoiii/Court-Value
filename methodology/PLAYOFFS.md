# Playoff CV 1.0 and Full-Season CV: specification, validation and limitations

Playoff CV scores one NBA postseason per player, 1951–52 through 2025–26. It is published with Court Value release 1.2.0. The regular-season scores in that release are unchanged (model 1.1.0).

There are three scores.

| Score | Question it answers | Role |
|---|---|---|
| **Playoff CV Run** | How valuable was the player's postseason, including his share of completing a championship? | Headline playoff résumé score |
| **Playoff CV Rate** | How good was he while he played in the playoffs? | Companion playoff quality score |
| **Full-Season CV** | How good was his whole season, regular season and playoffs together? | Combined score |

**One ruler.** Every playoff score is measured on the regular season's ruler: the same season's regular-season mean and spread of per-game value, and the same season's regular-season defensive reference. A playoff score of 10 therefore means what a regular-season 10 means.

An earlier candidate (`releases/playoffs-1.0.0-rc.1`, briefly shown on the website) standardized each postseason against only its own players. Most playoff players contribute little, so the stars sat six or seven standard deviations above that group. Runs of 20–23 resulted, next to regular-season peaks of about 14. The model owner judged that inflated, and the ruler was changed before release.

The design follows the model owner's earlier playoff research (Run as headline, round-normalized, responsibility-weighted championship credit). It is rebuilt on CV 1.1 conventions, and minutes played are removed from every calculation.

## 1. Sources and appearances

- **Source:** the NBA player-game archive (`PlayerStatistics.csv`, Eoin Moore, Kaggle), playoff rows only.
  - The declared snapshot is `cv-playoff-inputs-2026-09-29b`. It adds `regular_season_cv.csv`, 12 columns of the release 1.1.0 regular-season outputs, as the ruler and the regular-season half of Full-Season CV.
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
RS ruler for season s: μ_s, σ_s = games-weighted mean and population SD of regular-season Raw/G (NBA);
                       δ_s, τ_s = mean and population SD of regular-season DefRaw
RateBase   = 3 × (Raw/G − μ_s) / σ_s
RateDef    = bounded(3 × (TeamDef × DefWeight − δ_s) / τ_s)            (bounded: 1.5·tanh(x/6), negative halved)
PlayoffCVRate = RateBase + RateDef
```

Applied to regular-season rows, this ruler reproduces every published regular-season CV_BASE and defensive credit exactly (audit check).

Rate leaderboards require `10·G ≥ 7·TeamPlayoffGames` (the regular-season 70% rule, in exact integers). The rule qualifies 8,409 of 11,082 scored player-postseasons.

## 6. Playoff CV Run

```text
RoundContribution_r = (BoxImpact_r + EffAdj_r) · PaceAdj · Context / TeamGamesInRound_r
RunRaw              = Σ_r RoundContribution_r / PossiblePathRounds
RunBase             = 3 × (RunRaw − μ_s) / σ_s          (regular-season ruler)
PathAvailability    = Σ_r (PlayerGames_r / TeamGames_r) / PossiblePathRounds
RunDef              = bounded(3 × (TeamDef × DefWeight × PathAvailability − δ_s) / τ_s)
Performance         = RunBase + RunDef
Share               = max(RunRaw, 0) / Σ_team max(RunRaw, 0)
ChampionshipCredit  = champion ? min(3, 12 × Share) : 0
PlayoffCVRun        = Performance + ChampionshipCredit
```

- **Series-length neutral:** each round is one opportunity unit, so a seven-game series does not count more than a sweep.
- **Missed games and rounds:** unplayed future rounds and missed games contribute zero.
- **Championship credit:** capped at 3, one CV standard deviation, which is reached at a 25% share of the champion's positive contribution. Fringe players get little or none. There is no flat ring bonus.
- **What a Run means:** RunRaw is the player's average per-game contribution over his team's whole possible path, with unplayed rounds counted as zero. A star who plays every game of a title run therefore scores about his playoff Rate plus title credit. A first-round exit scores well below his Rate. The median Run is about −4, because most playoff teams go out early.

## 6b. Full-Season CV (regular season + playoffs)

```text
PlayoffShare   = G_po / (G_rs + G_po)
FullSeasonCV   = (G_rs × RegularSeasonCV + G_po × PlayoffCVRate) / (G_rs + G_po)  +  ChampionshipCredit × PlayoffShare
```

- **Every playoff game counts as one more game of the season** on the same ruler. The playoffs lift or lower the season through how well the player played in them.
- **Title bonus:** a champion adds his championship credit (0–3) scaled by the playoffs' share of his games. The bonus is about +0.6 for a title-run leader who played 20 of about 100 games.
- **No playoff games counted** (no playoffs, or unscored early playoffs): Full-Season CV equals regular-season full CV.
- **Qualification:** the regular season's 70% rule. There are 26,204 rows, NBA and ABA. ABA seasons have no playoff component.
- **Size of the effect:** for the 11,064 seasons that include playoffs, the average change is −0.08 (SD 0.22). The range runs from −1.2 (Rick Mahorn 1988) to +1.6 (Jamal Murray 2023; Kawhi Leonard 2019, from 8.9 to 10.4).
- **Highest Full-Season CV:** O'Neal 2000 (14.75), LeBron James 2012 (13.86), then Chamberlain 1966 and 1964 and Abdul-Jabbar 1972 (13.3–13.4).

## 7. Validation

The audit is `audit_playoffs.py`, with evidence in `releases/playoffs-1.0.0/audit/`.

**All 19 mechanical checks pass.** They confirm:
- the arithmetic identities;
- one champion per postseason;
- champion responsibility shares summing to 1;
- credit bounds and defense bounds;
- the regular-season ruler reproducing regular-season CV exactly, and every playoff base using its season's ruler;
- the Full-Season identity, including that it equals regular-season CV when no playoff games count, and title-bonus bounds;
- box completeness from 1965;
- the qualification rule;
- the no-minutes invariance test.

**Reproduction:** a clean-room rebuild is byte-identical. A rebuild on the owner's computer workspace (Linux, pandas 2.3.3, from an independently re-extracted input snapshot whose SHA-256 matches) agrees on all 11,299 rows to a relative 9e-15.

**Coverage against Neil Paine's postseason player file (1977–2026):**
- 9,434 of 9,435 player-postseasons match.
- Playoff games are identical in 99.76% of matches and within one game in all of them.

**Descriptive validation** (never used to fit anything):
- Mean within-postseason Spearman correlation of Run with LAKER postseason WAR is 0.64.
- Rate against LAKER per-possession impact, qualified rows, is 0.65.
- Ranks within a postseason barely change from the candidate: mean within-postseason Spearman is 0.999 for Run and 0.9995 for Rate. The ruler moves scale, not order.
- These metrics share box inputs and LAKER counts games, so this is a representation check, not truth.

**Postseason leaders:** the Run leader played for the champion in 71 of 75 postseasons. The four exceptions:

| Postseason | Run leader | Team | Result |
|---|---|---|---|
| 1963–64 | Wilt Chamberlain | San Francisco | lost the Finals |
| 1969–70 | Jerry West | Los Angeles Lakers | lost the Finals |
| 1973–74 | Kareem Abdul-Jabbar | Milwaukee | lost the Finals |
| 2013–14 | LeBron James | Miami | lost the Finals |

**Named cases (diagnostics, not targets):**
- **The 1980s:** Bird led the 1984 and 1986 postseasons (13.9, 14.5); Magic led 1985, 1987 and 1988 (10.5, 11.8, 10.1).
- **Highest Runs:** O'Neal 2001 (17.7), LeBron 2012 (17.2), Jordan 1992 (16.9), Jokić 2023 (16.4), Curry 2015 (16.2). Each includes the full 3-point title credit.
- **Highest qualified Rates:** LeBron 2009 (16.0), O'Neal 2001 (14.9), LeBron 2015 (14.7), LeBron 2012 (14.3), Abdul-Jabbar 1977 (14.2).

## 8. Limitations

- **1952–62 rests on partial box scores.** About a third of 1950s playoff players are unscored, and many scored rows are `PARTIAL`. Those postseasons are measured with the same rule but much weaker evidence. Read them with their `box_evidence` label.
- **Small reference populations.** Early postseasons had 6–8 teams, which limits how far any player can stand above his postseason. As in the regular season, nothing adjusts for era.
- **Championship credit is a résumé choice.** It rewards completing the title path; it is not an estimate of causal impact. Performance without the credit is published as `run_performance`.
- **Team defense is team defense.** It is shared by a visible-load ranking, not measured for each defender, and it inherits the estimate's error (about one team in nine noticeably misrated).
- **No ABA postseasons**, and no career score. Full-Season CV averages games; it is not a career or cumulative total.

## 9. Files

- **Public:**
  - `PUBLIC_playoff_cv_scores.csv`: identity, team, games, rounds appeared, champion, box evidence, qualification, status, Run, Run performance, championship credit, Rate and ranks.
  - `PUBLIC_full_season_cv_scores.csv`: regular-season CV, playoff Rate, games of each, title bonus, Full-Season CV and ranks.
- **Private research files:** `playoff_player_postseasons.csv`, `playoff_team_postseasons.csv`, `playoff_player_rounds.csv` and `full_season_cv.csv`. The playoff files include box-score inputs, which are not redistributed.
- **Code:** `cv1/playoffs.py`, `build_playoffs.py` and `audit_playoffs.py`.
