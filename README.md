# Court Value (CV)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23045497.svg)](https://doi.org/10.5281/zenodo.23045497)

**One number for a player's season, measured the same way since 1952.**

Court Value rates every NBA (1952–present) and ABA (1968–76) regular season on one historically portable scale. It uses only information that exists for every season:
- box-score production;
- responsibility within the team;
- the team's margin of victory in the games the player actually played;
- a bounded team-defense credit.

Each league-season is measured against itself: there are no era bonuses, no ABA penalty, and no awards or reputation in the formula.

- **Website:** https://mariotavoiii.github.io/Court-Value/
- **Scores:** [`data/PUBLIC_cv_scores.csv`](data/PUBLIC_cv_scores.csv), 26,208 player-seasons with full CV, CV_BASE, defensive credit, ranks and coverage flags.
- **How it works:** [plain-English overview](methodology/OVERVIEW.md) · [technical specification](methodology/TECHNICAL_SPECIFICATION.md) · [worked examples](methodology/WORKED_EXAMPLES.md)
- **Evidence:** [validation](methodology/VALIDATION.md) · [limitations](methodology/LIMITATIONS.md) · [anomaly log](anomaly_log.csv) · [release decisions](methodology/RELEASE_DECISIONS.md)

## Reading the scores

| CV | Typical meaning |
|---:|---|
| 12+ | All-time season (37 qualified seasons) |
| ~11 | Median MVP season |
| ~7.5 | Median All-NBA season |
| ~6 | Median All-Star season |
| 0 | The season's average player-game |

Three CV points equal one games-weighted standard deviation within the league-season.

**Full CV** includes defense and, since version 1.1, covers every NBA and ABA season under one defensive rule. **CV_BASE** is the same score without defense. Never rank the two together. Leaderboards require at least 70% of team games.

CV measures realized value and responsibility. It is not a causal impact estimate or wins above replacement, and it does not rate talent or career greatness.

## Reproducing the scores

The calculator is `build_release.py` with the `cv1/` package. It builds from a declared input snapshot and refuses to run unless every input matches [`data/input_manifest.json`](data/input_manifest.json).

The raw inputs are Basketball-Reference-derived season totals and game logs. They are **not redistributed**; see [methodology/SOURCES.md](methodology/SOURCES.md) for provenance and how to obtain them. With the inputs in place:

```bash
bash verify_locked_build.sh   # Python 3.11+; installs requirements.lock in a throwaway env, rebuilds, compares
```

Audit evidence tables and research experiments are kept with the private inputs; their results are summarized in [methodology/VALIDATION.md](methodology/VALIDATION.md).

## Versions

- **1.1.0:** one defensive rule for every season. Opponent shot attempts, unrecorded before 1970–71, are estimated the same way for all of history, so full CV now covers NBA 1952–2026 and the ABA. Base scores are unchanged. See the [changelog](CHANGELOG.md). [Zenodo](https://doi.org/10.5281/zenodo.23045497).
- **1.0.1 / 1.0.0:** first public release ([Zenodo](https://doi.org/10.5281/zenodo.23040991)).

## Citation and licences

Please cite as described in [`CITATION.cff`](CITATION.cff):

> Tavolieri, Mario, III. *Court Value (CV): a historically portable NBA/ABA player-season value metric.* Version 1.1.0. Zenodo, 2026. https://doi.org/10.5281/zenodo.23045497

- **Scores and documentation:** [CC BY 4.0](LICENSE-DATA).
- **Code:** [MIT](LICENSE-CODE).
- **Underlying statistics:** Basketball-Reference, via the Kaggle dataset *NBA Stats (1947–present)* by Sumitro Datta.

## Feedback

Found a season that looks wrong? [Open an issue](https://github.com/mariotavoiii/Court-Value/issues) with the player, season and what you expected.
