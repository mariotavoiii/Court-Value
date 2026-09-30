# Court Value (CV)

**One number for a player's season, measured the same way since 1952.**

Court Value rates every NBA season since 1951–52 and every ABA season (1967–68 to 1975–76) on one historically portable scale, regular season and playoffs together. Every season is measured against the other players in that same league-season. There are no era bonuses and no ABA penalty, and no awards or reputation go into the score.

- **Website:** https://mariotavoiii.github.io/Court-Value/
- **Scores:** [`data/PUBLIC_cv_2_0_scores.csv`](data/PUBLIC_cv_2_0_scores.csv), 26,204 player-seasons.

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
| 12+ | All-time season (57 qualified seasons) |
| 9–13 | Where most MVP seasons land (middle half 9.2–12.7) |
| ~6 | Median All-NBA season |
| ~4.5 | Median All-Star season |
| 0 | The season's average player-game |

Three points equal one standard deviation within the league-season.

CV measures realized value and responsibility in a real season. It is not a causal impact estimate or wins above replacement, and it does not rate talent or career greatness.

## Method

Court Value draws on:
- box-score production and efficiency;
- each player's share of his team's load;
- how the team did in the games he played, and with and without him;
- each team's actual defense, shared among its players;
- postseason games judged against the players who actually played them.

Everything used has been recorded in every season since 1952. **From version 2.0 the formula is proprietary**; this repository publishes the scores and the website.

## Versions

- **2.0.0 (2026-09-30):**
  - One season score combining the regular season and postseason.
  - Every ABA postseason is added.
  - New treatment of defense, of team results with and without each player, and of playoff games.
  - Scores are **not comparable** with 1.x.
- **1.1.0:** regular season only ([Zenodo](https://doi.org/10.5281/zenodo.23045497)).
- **1.0.x:** first public release ([Zenodo](https://doi.org/10.5281/zenodo.23040991)).

Earlier releases remain available from their archives under their original licences. See the [changelog](CHANGELOG.md).

## Citation and licence

Please cite as described in [`CITATION.cff`](CITATION.cff).

- **Scores and documentation:** [CC BY 4.0](LICENSE-DATA).
- **Underlying statistics:** Basketball-Reference, via the Kaggle dataset *NBA Stats (1947–present)* by Sumitro Datta, plus ABA game logs. Raw statistics are not redistributed.

## Feedback

Found a season that looks wrong? [Open an issue](https://github.com/mariotavoiii/Court-Value/issues) with the player, season and what you expected.
