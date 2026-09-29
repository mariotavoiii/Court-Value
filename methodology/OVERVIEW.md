# Court Value 1.1: a reader's guide

Court Value (CV) measures player-season value through production, responsibility, team context and defense. It is designed to apply a broadly consistent set of information across basketball history. The primary result is one player in one regular season in one league. NBA and ABA seasons are both included, with league identity preserved.

The base component evaluates production while a player was active relative to that player's league-season environment. Points, assists and rebounds supply the production measure. An efficiency adjustment compares scoring with the league's scoring per estimated attempt. Team context receives a limited adjustment, with more responsibility assigned to players carrying larger roles.

CV uses the team's average scoring margin in the games the player actually appeared in, where those appearances and final scores can be verified. An appearance counts as one game regardless of its length. Where the evidence is incomplete, the calculation uses the full-season team's average margin and flags the fallback. This is team context; it does not measure the scoring margin during only that player's minutes.

Full CV adds a bounded defensive adjustment. It rates each team's defense by how far it held opponents below the league's scoring per shot attempt. Opponent attempts were not recorded before 1970-71, so CV 1.1 estimates them the same way for every season from team statistics kept since 1951-52. It then assigns responsibility by minutes-based tiers and produces the player-season adjustment. The method can recognize responsibility for strong team defense, but it cannot isolate an individual's causal defensive effect.

## Reading the score

Higher values indicate stronger measured production and responsibility relative to the relevant league-season. CV_BASE has a mean of zero and a standard deviation of three across that league-season's scorable player-seasons, with each player counted in proportion to games played. The zero point is the average *player-game* of that season, not the average name on the roster, so short-stint call-ups do not drag the reference down. Full CV adds defensive credit to CV_BASE, so its distribution is not exactly a three-point standard-deviation scale. Zero means the reference population's mean on the base measure; it is not replacement level.

Full CV and CV_BASE are separate products:

- **Full CV:** base plus the defensive adjustment. This is the headline score.
- **CV_BASE:** the base calculation alone, published separately.
- **Unavailable:** required inputs are missing; a blank score is not zero.

The research export also retains unqualified and incomplete records. Recognized leaderboards require at least 70% of the applicable team schedule. Since 1.1, full CV covers every scored season: NBA 1952–2026 and ABA 1968–1976, all under one defensive rule. (CV 1.0 covered NBA 1958–2024 only.) The only unscored rows are 11 players who touched the 1955 Baltimore Bullets, whose team statistics are missing, and 4 zero-minute seasons that have base scores but no defense.

## Availability and the meaning of a season

CV is a measure of realized season performance and responsibility, with an active-game base. Availability affects role assignment and leaderboard qualification. It is not a direct linear or square-root multiplier.

Mathematically, the base divides adjusted production by games played before league-season standardization. Identical per-game production does not automatically earn a lower CV_BASE because it occurred in fewer games. Actual differences can arise through offensive responsibility, minutes-based defensive responsibility and the reference population. A shortened season uses its actual team schedule for qualification.

CV should therefore not be read as a literal sum of value accumulated over every scheduled game. Two otherwise comparable seasons can have similar CV scores despite different games played. Read games, availability and qualification alongside the score.

## What CV can and cannot answer

CV summarizes measured value and responsibility in a particular season. **Impact** asks how much a player causally changes team performance; CV is not a causal estimate. **Ability** includes talent and hypothetical healthy performance; CV does not estimate that. **Peak** is a question about a player's best period, while **career greatness** also involves longevity and other choices. A season score does not settle either question by itself.

Awards, MVP voting and outside metrics are checks against the results, never regular-season formula inputs. Famous-player rankings are useful diagnostics and are not tuning targets. League-season normalization handles differences in statistical environment, but it does not establish that all leagues and eras had equal absolute strength. No subjective era bonus or ABA penalty is applied.

## The 1.x implementation

CV adopts the documented v2026.5-derived reconstruction as its base architecture and makes verified appearance-game MOV its team-context input. The lost original v2026.5 executable has not been recovered. Historical saved values and reconstructed values are distinguishable development records; CV makes no claim of exact identity with that lost implementation. CV 1.1 changes only team defense, replacing a game-archive reconstruction that covered 1958–2024 with a season-totals estimate that covers every season and agrees better with recorded opponent attempts where they exist.

The [technical specification](TECHNICAL_SPECIFICATION.md) discloses the calculation. The [limitations](LIMITATIONS.md), [sources](SOURCES.md) and release audit describe what the evidence supports. Worked examples in [WORKED_EXAMPLES.md](WORKED_EXAMPLES.md) cover the team-defense estimate, an ordinary season, a trade, a shortened season, an ABA season, a pre-1958 season and the latest completed season. Career, peak composites, projections and playoff synthesis are outside the regular-season release.
