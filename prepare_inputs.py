"""Prepare a private, declared snapshot from the existing research files."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import pandas as pd

def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for part in iter(lambda:f.read(1024*1024),b''): h.update(part)
    return h.hexdigest()

def prepare(source, destination):
    destination.mkdir(parents=True, exist_ok=False)
    mapping={name:name for name in ['Player Totals.csv','Team Totals.csv','Opponent Totals.csv']}
    mapping.update({
        'defense_game_team.csv':'outputs/cv_workmode_2026_09/tables/nba_regular_game_team_points_v2.csv',
        'verified_team_results.csv':'outputs/cv_verified_mov_2026_09/team_game_results.csv',
    })
    provenance=[]
    for target, original in mapping.items():
        shutil.copyfile(source/original,destination/target)
        provenance.append({'prepared_file':target,'source_path':original,'source_sha256':sha(source/original),'transformation':'Exact copy'})
    original='outputs/cv_games_played_mov_2026_09/appearance_margins.csv'
    appearances=pd.read_csv(source/original,usecols=['season','gameId','team_name','personId','name_key'])
    cup=appearances.gameId.astype('Int64').astype(str).str.zfill(10).str.startswith('006')
    appearances=appearances[~cup].copy()
    appearances.to_csv(destination/'appearance_records.csv',index=False)
    provenance.append({'prepared_file':'appearance_records.csv','source_path':original,'source_sha256':sha(source/original),'transformation':'Select appearance identity fields only; remove NBA Cup final game IDs prefix 006; no player-sum margins used','excluded_cup_rows':int(cup.sum())})
    original='outputs/cv_player_seasons_1952_2026/CV_Player_Seasons_1952_2026.csv'
    ledger=pd.read_csv(source/original,usecols=['season','player_id','nba_person_id'])
    bridge=ledger.dropna().drop_duplicates().copy()
    bridge['nba_person_id']=bridge.nba_person_id.astype(str).str.split('|')
    bridge=bridge.explode('nba_person_id')
    bridge['personId']=pd.to_numeric(bridge.nba_person_id,errors='raise').astype('Int64')
    bridge[['season','personId','player_id']].drop_duplicates().sort_values(['season','personId','player_id']).to_csv(destination/'identity_map.csv',index=False)
    provenance.append({'prepared_file':'identity_map.csv','source_path':original,'source_sha256':sha(source/original),'transformation':'Extract identifiers only; expand person IDs; no scores imported'})
    inputs=[{'path':p.name,'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(destination.glob('*.csv'))]
    manifest={'snapshot_id':'cv1-inputs-2026-09-29','data_revision':'2026-09-29','season_labels':[1952,2026],
              'source_retrieval_cutoff':'Not established uniformly; these are supplied local snapshots, not newly refreshed data.',
              'distribution':'Private input snapshot. Do not include in public release unless rights are established.',
              'preprocessing_scope':'Prepared appearance and defensive caches originate in prior documented research; original raw archive-to-cache reconstruction is not rerun here.',
              'files':inputs,'provenance':provenance}
    (destination/'input_manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'inputs':len(inputs),'appearance_rows':len(appearances),'path':str(destination)}))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source-dir',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True)
    a=p.parse_args();prepare(a.source_dir,a.output_dir)
