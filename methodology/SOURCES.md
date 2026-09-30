# Court Value 1.1: sources and data provenance

**Distribution status: raw inputs are private and not redistributed** until rights are established for each source. The release publishes code, methodology, manifests and permitted derived outputs. Hashes below identify the exact local snapshot; they do not establish source accuracy, permission or a uniform retrieval date.

## Declared input snapshot `cv1-inputs-2026-09-29`

| Prepared file | Origin (local research path) | Used for | Notes |
| --- | --- | --- | --- |
| `Player Totals.csv` | root `Player Totals.csv` (exact copy) | Player stints: G, MP, PTS, AST, TRB, FGA, FTA; IDs, team, league | A 12-column subset of the Kaggle dataset **NBA Stats (1947–present)** by Sumitro Datta (`sumitrodatta/nba-aba-baa-stats`), which is derived from Basketball-Reference. The identification rests on identical file names (`Player Totals.csv`, `Advanced.csv`, `Player Award Shares.csv`, `Player Career Info.csv`, `End of Season Teams (Voting).csv`) and the 33-column schema. An earlier full download on the owner's machine (`arctest/archive/lineage/kaggle_bref_download_2025-07/` (originally `arctest/archive/lineage/kaggle_bref_download_2025-07/`), file dates 2025-07-10) matches this input exactly on every scoring field for all 28,681 NBA/ABA stints from 1952–2025. The 2026 rows come from a later refresh whose date is **not recorded**. NBA 1952–2026, ABA 1968–1976. |
| `Team Totals.csv` | root (exact copy) | Team games, points, FGA, FTA, TRB; league PSA; full-season MOV; scoring-ratio factor; team defense (1.1 estimate) | Same CSV family. 1955 BLB payload intentionally unavailable. |
| `Opponent Totals.csv` | root (exact copy) | Opponent points (MOV, defense). Recorded opponent FGA/FTA (NBA 1971–2026) are used only to fit the three frozen defense coefficients and as a diagnostic; they never score a season. | Same CSV family. |
| `defense_game_team.csv` | `outputs/cv_workmode_2026_09/tables/nba_regular_game_team_points_v2.csv` | 1.0 universal-attempt defense, **frozen control only** (not used by CV 1.1 scores) | Derived from the player box-score archive (`PlayerStatistics.csv`, Eoin Moore's historical NBA dataset on Kaggle). The archive-to-cache step is prior documented research and is not rerun by the build. |
| `appearance_records.csv` | `outputs/cv_games_played_mov_2026_09/appearance_margins.csv` (identity columns only; 25 NBA Cup final rows removed) | Player appearances per game | Derived from the same player archive. The DNP/DND/NWT/inactive exclusion rules are documented in the technical specification §4. |
| `verified_team_results.csv` | `outputs/cv_verified_mov_2026_09/team_game_results.csv` (exact copy) | Verified final margins | Recorded final scores corroborated across the NBA game index (Kaggle `Games.csv`), FiveThirtyEight/Neil Paine Elo files (one lineage) and ESPN (2025–26 and selected conflicts). Agreement is not proof of fully independent collection. 28 unresolved disagreements (pre-1997) are withheld. |
| `identity_map.csv` | IDs extracted from `outputs/cv_player_seasons_1952_2026/CV_Player_Seasons_1952_2026.csv` | NBA person ID → player_id bridge | Identifiers only; no scores imported. |

Exact bytes and SHA-256 values are in `private_inputs/2026-09-29/input_manifest.json`.

## Playoff CV input snapshot `cv-playoff-inputs-2026-09-29b` (release 1.2.0)

| Prepared file | Origin | Used for | Notes |
| --- | --- | --- | --- |
| `playoff_player_games.csv` | Playoff rows (`gameType == "Playoffs"`) of `PlayerStatistics.csv`, the Eoin Moore historical NBA player box-score archive on Kaggle already used for regular-season appearances. It has 30 projected columns and 102,249 rows. | Playoff appearances, points, assists, rebounds, FGA, FTA, rounds, team and opponent | 2022 team IDs are repaired from team names (A28). 1952–64 box scores are partly incomplete (A26). Minutes are used only as appearance evidence (A27). |
| `identity_map.csv`, `Player Totals.csv`, `Team Totals.csv` | Identical copies from `private_inputs/2026-09-29` | Player IDs and names; team abbreviations | — |
| `regular_season_cv.csv` | 12 columns of release 1.1.0 `outputs/cv_player_seasons.csv`, written with 17 significant digits (source SHA-256 in the manifest notes) | The regular-season ruler for playoff scores, and the regular-season half of Full-Season CV | Derived Court Value output, not raw data |

Neil Paine's postseason player file (`paine.csv`) is a validation source only. It supplies games played and LAKER for 1977–2026 and is never a formula input. SHA-256 values are in `private_inputs/playoffs-2026-09-29b/input_manifest.json`. The first snapshot (`playoffs-2026-09-29`, without the regular-season file) built the superseded candidate `playoffs-1.0.0-rc.1`. `prepare_inputs.py` regenerates the snapshot from the research workspace.

## Validation-only sources (never formula inputs)

`Advanced.csv` (PER, WS, WS/48, BPM, VORP), `paine.csv` (LAKER), `Player Award Shares.csv`, `End of Season Teams.csv` and `All-Star Selections.csv`. Their hashes are recorded in `audit/audit_input_hashes.json`.

## Acquisition instructions for outside reproduction

1. Obtain NBA/ABA player, team and opponent season totals with Basketball-Reference-compatible `player_id` and team abbreviations for 1952–2026.
2. Obtain the historical NBA player box-score archive and game index (Kaggle, Eoin Moore) and the FiveThirtyEight/Paine Elo game files. Use ESPN for 2025–26 corroboration.
3. Rebuild the three derived tables with the documented research scripts (`cv_games_played_mov.py`, `cv_verified_game_results.py`, `cv_workmode_audit.py`), or compare against the published input hashes.
4. Run `build_release.py`. It refuses to run unless every input matches the manifest.

## Open provenance items

- **Licence findings (checked 2026-09-29).**
  - The Kaggle dataset `sumitrodatta/nba-aba-baa-stats` is labelled **CC0: Public Domain**, last updated 2026-04-13, and credits Basketball-Reference as its source.
  - Sports Reference's data-use policy (https://www.sports-reference.com/data_use.html) says facts are not copyrightable and may be reused. It prohibits using its material to build a database or service that "competes with or constitutes a material substitute for" its services, and prohibits using it to train AI models.
  - Working publication policy:
    - Publish CV scores and methodology, with attribution to Basketball-Reference and the Kaggle dataset.
    - Do not republish the raw season-total tables as downloads.
    - Keep the public player-season export limited to identifiers, games, minutes, availability, qualification and CV fields.
  - This is a practical reading of the published terms, not legal advice.
- The root season-total CSVs are identified as the Sumitro Datta Kaggle dataset, with a 1952–2025 snapshot matching the 2025-07-10 download. Still missing: the dataset version and retrieval date for the refresh that added 2026, and the dataset's stated licence (check the Kaggle page before publishing).
- Redistribution rights for each source and for derived outputs, specifically whether player-season CV scores may be published under a chosen licence.
- The data cutoff is per source. The snapshot contains season labels through 2026 (2025–26 regular season), but no uniform retrieval date is established.
