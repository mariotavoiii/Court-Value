# Court Value 1.1: limitations

**CV is a historically portable season value/responsibility model. It is not a causal impact estimate, a wins-above-replacement measure, a prediction of talent, or a literal cumulative sum of value.** These limits apply to its interpretation even when the calculation reproduces exactly.

## Production and availability

The base standardizes adjusted production per game. A player does not receive an automatic base-score deduction simply for playing fewer games at identical per-game production. Games and totals affect role assignment, minutes affect defensive responsibility, and at least 70% schedule availability is required for recognized leaderboards. The threshold is a discontinuous publication rule, not a smooth missed-game penalty. The denominator is the player's own team schedule, which handles league-shortened seasons (1999, 2012, 2020, 2021). The two franchises that folded mid-season (ABA 1976 Utah and San Diego) are an explicit exception measured against the league schedule. Research exports retain low-game seasons because their behavior is useful evidence; their extremes should not be confused with qualified leaders.

The box-score constitution omits individual turnovers, steals, blocks, modern tracking and adjusted plus-minus. Its compact inputs support historical portability while losing information those variables can provide. The chosen production coefficients and efficiency transform are model assumptions, not estimates of causal point value. The inherited `PaceAdj` factor is a team scoring ratio, not measured pace or possessions.

## Team context

Appearance-game margin of victory measures the team's final margin in games a player entered. It gives a brief appearance the same game-level context as a long one, does not remove teammate or opponent effects, and cannot distinguish injury, rest or transaction causes. Schedule strength and lineup context remain embedded in observed team results. The full-season team-MOV reference distribution, scoring-ratio adjustment and defensive component continue to use their documented season-level information.

Coverage failures use explicitly flagged full-season MOV fallback. A traded season can mix verified appearance MOV and fallback stints. Even a fallback player's base can change relative to the old control because other players' updated context changes the league-season normalization pool. The literal appearance formula can differ slightly for an all-games player when verified final scores do not exactly sum to the supplied official season totals; CV does not conceal that discrepancy by anchoring the appearance average to the official season average.

## Defense

The defensive framework allocates team defensive responsibility by minutes-based tiers. It does not establish which player caused a team's suppression of scoring, and tier boundaries can create discontinuities. A zero defensive responsibility weight produces zero raw responsibility, which need not become zero final credit after league-season centering.

Opponent shot attempts were not recorded before 1970-71. CV 1.1 estimates them for every season, NBA and ABA, from team points scored, points allowed, attempts and rebounds, using three coefficients fitted once on 1971–2026 NBA teams. It is one rule for all of history, and that choice has a measurable cost:
- Where attempts are recorded, TeamDef from the estimate agrees with TeamDef from the recorded numbers at r = 0.88 (NBA 1971–2026) and 0.84 (ABA). About one team in nine is noticeably misrated. For example, the 1976 Bulls rate +1.31 on the estimate against −0.25 on recorded attempts.
- From 1971 on, CV deliberately does not use the recorded attempts, so these errors are accepted in exchange for consistency.
- The estimate assumes that the relationship between those team totals and opponent attempts, learned from 1971–2026, also held in 1952–70. Tests across eras and on the ABA, which was not used in fitting, support this but cannot prove it.

Full CV now covers NBA 1952–2026 and ABA 1968–76. Team-based defensive credit lowers agreement with All-ABA selections (0.784 for CV_BASE against 0.693 for full CV). The drop occurs with recorded attempts too, so it comes from the team-responsibility allocation, not from the estimate.

## Comparisons across leagues and history

NBA and ABA normalize separately. A high score expresses separation from a specified league-season population. It is not proof that the same absolute basketball performance would produce the same value in another era or league. Rule changes, talent pools, league size, expansion, roster churn and recording practices can alter those populations. No ad hoc era or ABA-strength coefficient is inserted to hide that uncertainty.

Every scorable player-season enters base normalization, including low-game players. Small or unusual populations affect the scale. Recognized rankings then apply qualification. Roster structure still leaves a residual cross-era effect. CV weights the reference by games played, which removes about one third of the drift that an unweighted head count produced. The mean qualified full CV still rises from about 0.35–0.45 in the NBA 1950s–60s to about 1.0 in the 2020s. The all-time top 100 still over-represents the 2010s–2020s (43 against about 28 expected) and under-represents the NBA 1970s–80s (13 against about 25) and ABA (2 against about 5). Some of this may reflect real changes in how production is concentrated; the model cannot tell. Within-season ranks are unaffected. All-time comparisons of raw values should be read with this in mind. The population mean is not replacement level. Full CV adds asymmetric bounded defense to the base and therefore does not retain an exact zero mean or standard deviation of three.

## Historical identity and validation

The original v2026.5 executable is unavailable. CV deliberately adopts the documented reconstruction and verified appearance MOV as a new public methodology. It does not retroactively certify reconstructed scores as identical to historical saved v2026.5 values. The earlier readiness review documents five historical anchors with full-score differences up to roughly 0.152 and a Jordan 1996/LeBron 2009 ordering reversal between historical documentation and the full-season reconstructed control.

Agreement with awards or existing metrics is useful validation evidence, not ground truth. Many outside metrics share box inputs and related assumptions, so several correlations are not several independent confirmations. Famous-player and archetype reviews can expose problems; they cannot justify adjusting coefficients simply to reproduce conventional rankings. Surprising results remain accepted consequences unless a documented error explains them.

## Data, reproducibility and public use

Reproduction depends on exact source snapshots, identity bridges, repaired game dates and the declared numerical environment. Hashes establish file identity, not original source accuracy, permission, or permanent preservation. A successful local rebuild is narrower than independent reproduction by an outside person from obtainable, permitted inputs.

The [source register](SOURCES.md) records gaps in root-table acquisition and source permissions. Publicly visible data and derived results do not automatically establish unrestricted redistribution rights. Separate code/methodology publication from raw or derived data publication while those specific questions remain unresolved. Do not describe a local candidate, draft citation or working website as an archived public release.
