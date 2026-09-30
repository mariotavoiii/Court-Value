# Court Value (CV)

**One number for a player's season, measured the same way since 1952.**

Court Value rates every NBA season since 1951–52 and every ABA season (1967–68 to 1975–76) on one historically portable scale, regular season and playoffs together. Every season is measured against the other players in that same league-season. There are no era bonuses, and no awards or reputation go into the score. ABA seasons carry one measured league-strength adjustment, estimated from players who moved between the leagues.

- **Website:** https://mariotavoiii.github.io/Court-Value/
- **Season scores:** [`data/PUBLIC_cv_2_1_scores.csv`](data/PUBLIC_cv_2_1_scores.csv), 26,204 player-seasons.
- **Career scores:** [`data/PUBLIC_cv_2_1_1_careers.csv`](data/PUBLIC_cv_2_1_1_careers.csv), 2,934 players with a qualified season.

## The three numbers

| Column | Meaning |
|---|---|
| `cv` | **Season CV**: the regular season and the postseason combined into one score |
| `rs` | The regular season alone |
| `po` | The postseason alone, on the same scale (blank when the team missed the playoffs) |

A team that missed the playoffs counts as league average for the playoff part of the season score. Seasons with no complete playoff box score use the regular season alone. Leaderboards require at least 70% of team games.

## Reading the scores

| CV | Typical meaning |
|---:|---|
| 12+ | All-time season (27 qualified seasons) |
| 8–12 | Where most MVP seasons land (middle half 8.2–11.5) |
| ~6 | Median All-NBA season |
| ~4 | Median All-Star season |
| 0 | The season's average player-game |

Three points equal one standard deviation within the league-season.

CV measures realized value and responsibility in a real season. It is not a causal impact estimate or wins above replacement, and it does not rate talent.

## Career CV

Career CV is built on a player's five best qualified seasons, with the playoffs weighing more than they do in a single season. Every other qualified season adds a little, but only for what it gives above All-Star level. A great prime decides it; long stretches of ordinary years don't.

## Method

Court Value draws on:
- box-score production and efficiency;
- each player's share of his team's load;
- how the team did in the games he played, and with and without him;
- each team's actual defense, shared among its players by role;
- postseason games judged against the players who actually played them;
- for the ABA, the league's measured strength against the NBA in that year.

Everything used has been recorded in every season since 1952. **From version 2.0 the formula is proprietary**; this repository publishes the scores and the website.

## Versions

- **2.1.1 (2026-09-30):** Career CV now centers on the prime (five best seasons, playoffs weighted more, other seasons count only above All-Star level). Season scores are unchanged from 2.1.0.
- **2.1.0 (2026-09-30):**
  - Defense is shared by role only, removing a tilt toward big men.
  - ABA seasons are adjusted for league strength, measured from players who moved between the leagues.
  - Each postseason's team defense is measured on one common scale.
  - Adds Career CV.
  - Scores are **not comparable** with 2.0.
- **2.0.0 (2026-09-30)** ([Zenodo](https://doi.org/10.5281/zenodo.23066109)):
  - One season score combining the regular season and postseason.
  - Every ABA postseason is added.
  - New treatment of defense, of team results with and without each player, and of playoff games.
  - Scores are **not comparable** with 1.x.
- **1.1.0:** regular season only ([Zenodo](https://doi.org/10.5281/zenodo.23045497)).
- **1.0.x:** first public release ([Zenodo](https://doi.org/10.5281/zenodo.23040991)).

Earlier releases remain available from their archives under their original licences. See the [changelog](CHANGELOG.md).

## Citation and licence

Please cite as described in [`CITATION.cff`](CITATION.cff).

> Tavolieri, Mario, III. *Court Value (CV): a historically portable NBA/ABA player-season value metric.* Version 2.1.1. 2026. https://mariotavoiii.github.io/Court-Value/

- **Scores and documentation:** [CC BY 4.0](LICENSE-DATA).
- **Underlying statistics:** Basketball-Reference, via the Kaggle dataset *NBA Stats (1947–present)* by Sumitro Datta, plus ABA game logs. Raw statistics are not redistributed.

## Feedback

Found a season that looks wrong? [Open an issue](https://github.com/mariotavoiii/Court-Value/issues) with the player, season and what you expected.
