# Changelog

Published scores never change silently. Method changes get a new version; corrections and new seasons get a new data revision. Older releases stay available from their archives.

## Website updates (2026-10-02)

The website changed; **the scores did not.** Season scores remain 2.1.0 and Career CV remains 2.1.1.

- Player pages: Career CV with its prime and other-season parts, the five prime seasons, every season's ranks and playoff context, and the five most similar careers (`docs/data/career_detail.json`, `docs/data/comps.json`).
- Shareable addresses for every ranking, comparison, matchup, decade and franchise.
- Search for players, franchises and team-seasons; simpler navigation; rankings that work on phones.
- Ranking views: best season per player, championship seasons, biggest playoff lifts.
- Franchise hub with season-by-season team ratings.

## 2.1.1 (2026-09-30)

- **Career CV centers on the prime.** A career is built on the player's five best qualified seasons, with the playoffs weighing more than they do in a single season. Every other qualified season adds a little, but only for what it gives above All-Star level, so long stretches of ordinary years no longer lift a career.
- **Season scores are unchanged** from 2.1.0.
- Career scores are published as `PUBLIC_cv_2_1_1_careers.csv` and are not comparable with 2.1.0 career scores.
- Archived: [Zenodo DOI 10.5281/zenodo.23071104](https://doi.org/10.5281/zenodo.23071104). 2.1.0 was not archived separately; this release includes it.

## 2.1.0 (2026-09-30)

- **Defense by role.** Team defense is now shared among players by their role only, removing a tilt that favoured big men.
- **ABA league strength.** Each ABA season is adjusted by that year's measured gap to the NBA, estimated from players who moved between the leagues. The gap is largest in 1967–68 and closes by 1975–76.
- **One scale per postseason.** Each postseason's team defense is measured on a common scale, so thin early playoff records no longer swing scores.
- **Career CV.** A player's five best qualified seasons count in full, plus a smaller share of every other positive qualified season. Published in its own file.
- **Not comparable with 2.0.** Scores are on a new basis.

## 2.0.0 (2026-09-30)

- **One season score.** Season CV combines the regular season (RS) and the postseason (PO) on one scale. RS and PO are published beside it.
- **Every ABA postseason** (1967–68 to 1975–76) is added. Together with every NBA postseason since 1951–52, all playoffs in both leagues are now scored.
- **Missed playoffs** count as league average for the playoff part of the season score.
- **New treatment** of team defense, of team results with and without each player, and of playoff games, which are judged against the players who actually played them. Short playoff samples are read cautiously.
- **Proprietary formula.** From this version the formula and calculator are no longer published. Scores remain CC BY 4.0.
- **Not comparable with 1.x.** Scores are on a new basis.
- Archived: [Zenodo DOI 10.5281/zenodo.23066109](https://doi.org/10.5281/zenodo.23066109).

## 1.2 preview (2026-09-29, superseded)

Playoff CV (Run and Rate) and Full-season CV were shown on the website as a preview. They were never archived and are replaced by 2.0.

## 1.1.0 (2026-09-29)

Regular season only. One defensive rule for every NBA and ABA season. [Zenodo DOI 10.5281/zenodo.23045497](https://doi.org/10.5281/zenodo.23045497).

## 1.0.0 / 1.0.1 (2026-09-29)

First public release, regular season only. [Zenodo DOI 10.5281/zenodo.23040991](https://doi.org/10.5281/zenodo.23040991).
