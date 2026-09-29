# Court Value 1.0: a reader's guide

Court Value (CV) measures player-season value through production, responsibility, team context and defense. It is designed to apply a broadly consistent set of information across basketball history. The primary result is one player in one regular season in one league. NBA and ABA seasons are both included, with league identity preserved.

The base component evaluates production while a player was active relative to that player's league-season environment. Points, assists and rebounds supply the production measure. An efficiency adjustment compares scoring with the league's scoring per estimated attempt. Team context receives a limited adjustment, with more responsibility assigned to players carrying larger roles.

CV 1.0 uses the team's average scoring margin in the games the player actually appeared in, where those appearances and final scores can be verified. An appearance counts as one game regardless of its length. Where the evidence is incomplete, the calculation uses the full-season team's average margin and flags the fallback. This is team context; it does not measure the scoring margin during only that player's minutes.

Full CV adds a bounded defensive adjustment. It estimates team defensive performance with the same historical framework, assigns responsibility by minutes-based tiers, then produces the player-season adjustment. The method can recognize responsibility for strong team defense, but it cannot isolate an individual's causal defensive effect.

## Reading the score

Higher values indicate stronger measured production and responsibility relative to the relevant league-season. CV_BASE has a mean of zero and a standard deviation of three across that league-season's scorable player-seasons, with each player counted in proportion to games played. The zero point is the average *player-game* of that season, not the average name on the roster, so short-stint call-ups do not drag the reference down. Full CV adds defensive credit to CV_BASE, so its distribution is not exactly a three-point standard-deviation scale. Zero means the reference population's mean on the base measure; it is not replacement level.

Full CV and CV_BASE are separate products:

- **Full CV:** base plus an available defensive adjustment, with defensive confidence disclosed.
- **CV_BASE:** the base calculation, published separately whether or not full defense is available.
- **Unavailable:** required inputs are missing; a blank score is not zero.

The research export also retains unqualified and incomplete records. Recognized leaderboards require at least 70% of the applicable team schedule. Current full-defense coverage is NBA 1958–2024; ABA, NBA 1952–1957, and NBA 2025–2026 have no full defensive score in this reconstruction. A file spanning 1952–2026 is therefore not a uniform full-CV history. See the release's coverage and validation files for the exact counts and confidence flags.

## Availability and the meaning of a season

CV is a measure of realized season performance and responsibility, with an active-game base. Availability affects role assignment and leaderboard qualification. It is not a direct linear or square-root multiplier.

Mathematically, the base divides adjusted production by games played before league-season standardization. Identical per-game production does not automatically earn a lower CV_BASE because it occurred in fewer games. Actual differences can arise through offensive responsibility, minutes-based defensive responsibility and the reference population. A shortened season uses its actual team schedule for qualification.

CV should therefore not be read as a literal sum of value accumulated over every scheduled game. Two otherwise comparable seasons can have similar CV scores despite different games played. Read games, availability and qualification alongside the score.

## What CV can and cannot answer

CV summarizes measured value and responsibility in a particular season. **Impact** asks how much a player causally changes team performance; CV is not a causal estimate. **Ability** includes talent and hypothetical healthy performance; CV does not estimate that. **Peak** is a question about a player's best period, while **career greatness** also involves longevity and other choices. A season score does not settle either question by itself.

Awards, MVP voting and outside metrics are checks against the results, never regular-season formula inputs. Famous-player rankings are useful diagnostics and are not tuning targets. League-season normalization handles differences in statistical environment, but it does not establish that all leagues and eras had equal absolute strength. No subjective era bonus or ABA penalty is applied.

## The 1.0 implementation

CV 1.0 adopts the documented v2026.5-derived reconstruction as its base architecture and makes verified appearance-game MOV its team-context input. The lost original v2026.5 executable has not been recovered. Historical saved values and reconstructed values are distinguishable development records; CV 1.0 makes no claim of exact identity with that lost implementation.

The [technical specification](TECHNICAL_SPECIFICATION.md) discloses the calculation. The [limitations](LIMITATIONS.md), [sources](SOURCES.md) and release audit describe what the evidence supports. Worked examples in [WORKED_EXAMPLES.md](WORKED_EXAMPLES.md) cover an ordinary season, a trade, a shortened season, an ABA season and unavailable defense. Career, peak composites, projections and playoff synthesis are outside the CV 1.0 regular-season release.
