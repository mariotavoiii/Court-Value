"""Literal verified appearance-game margin; no full-season anchor adjustment."""
import re
import unicodedata
import numpy as np
import pandas as pd

KEY=['player_id','season','lg','team']
ALIASES={'ftwaynezollnerpistons':'fortwaynepistons','oklahomacityhornets':'neworleansoklahomacityhornets','laclippers':'losangelesclippers'}

def name_key(value):
    text=unicodedata.normalize('NFKD',str(value)).encode('ascii','ignore').decode('ascii').lower()
    text=re.sub(r'\s+(jr|sr|ii|iii|iv)\.?$','',text)
    return re.sub(r'[^a-z0-9]','',text)

def compute_mov(input_dir):
    p=pd.read_csv(input_dir/'Player Totals.csv')
    t=pd.read_csv(input_dir/'Team Totals.csv').rename(columns={'team':'team_name','abbreviation':'team','g':'team_games','pts':'team_pts'})
    o=pd.read_csv(input_dir/'Opponent Totals.csv')
    o=o[o.team.ne('League Average')].drop(columns='team').rename(columns={'abbreviation':'team'})
    t=t[t.team_name.ne('League Average')].merge(o[['season','lg','team','opp_pts']],on=['season','lg','team'],validate='one_to_one')
    t['mov']=(t.team_pts-t.opp_pts)/t.team_games
    t['team_key']=t.team_name.map(name_key).replace(ALIASES)
    names=t[t.lg.eq('NBA')][['season','team','team_key']]
    assert not names.duplicated(['season','team_key']).any()
    a=pd.read_csv(input_dir/'appearance_records.csv',dtype={'gameId':'Int64','personId':'Int64'})
    a['team_key']=a.team_name.map(name_key).replace(ALIASES)
    assert not a.duplicated(['season','gameId','team_key','personId']).any(), 'Duplicate source appearance'
    bridge=pd.read_csv(input_dir/'identity_map.csv',dtype={'personId':'Int64'})
    bridge=bridge.drop_duplicates()
    unique=bridge.groupby(['season','personId']).player_id.transform('nunique').eq(1)
    a=a.merge(bridge[unique],on=['season','personId'],how='left',validate='many_to_one')
    nm=p[['season','player_id','player']].drop_duplicates()
    nm['name_key']=nm.player.map(name_key)
    nm=nm[['season','player_id','name_key']].drop_duplicates()
    nm=nm[nm.groupby(['season','name_key']).player_id.transform('nunique').eq(1)]
    a=a.merge(nm.rename(columns={'player_id':'name_id'}),on=['season','name_key'],how='left',validate='many_to_one')
    a['identity_conflict']=a.player_id.notna()&a.name_id.notna()&a.player_id.ne(a.name_id)
    a['identity_method']=np.where(a.player_id.notna(),'NBA_ID',np.where(a.name_id.notna(),'UNIQUE_EXACT_NAME','UNRESOLVED'))
    a['player_id']=a.player_id.fillna(a.name_id)
    a=a.merge(names,on=['season','team_key'],how='left',validate='many_to_one')
    r=pd.read_csv(input_dir/'verified_team_results.csv',dtype={'gameId':'Int64'},low_memory=False)
    r=r[r.gameId.notna()].copy().reset_index(drop=True)
    assert not r.duplicated(['season','gameId','team']).any(), 'Duplicate final-score identity'
    verified=r.verified.eq(True)
    assert r.loc[verified,'paired_ok'].eq(True).all()
    assert np.isfinite(r.loc[verified,['final_points','final_opponent_points','margin']]).all().all()
    assert ((r.loc[verified,'final_points']-r.loc[verified,'final_opponent_points'])-r.loc[verified,'margin']).abs().max()<1e-12
    assert r.loc[~verified,'margin'].isna().all(), 'Unverified margin present'
    # Pair-score consistency is checked independently, not inferred from a saved flag.
    reverse=r[['season','gameId','team','opponent','final_points','final_opponent_points','verified']].rename(columns={'team':'opponent','opponent':'team','final_points':'reverse_points','final_opponent_points':'reverse_opponent_points','verified':'reverse_is_verified'})
    paired=r.merge(reverse,on=['season','gameId','team','opponent'],suffixes=('','_check'),how='left',validate='one_to_one')
    assert paired.loc[verified,'reverse_is_verified'].eq(True).all()
    assert paired.loc[verified,'final_points'].eq(paired.loc[verified,'reverse_opponent_points_check']).all()
    assert paired.loc[verified,'final_opponent_points'].eq(paired.loc[verified,'reverse_points_check']).all()
    a=a.merge(r[['season','gameId','team','margin','verified']],on=['season','gameId','team'],how='left',validate='many_to_one')
    known=a.dropna(subset=['player_id','team']).copy()
    known['duplicate_resolved_game']=known.duplicated(['player_id','season','team','gameId'],keep=False)
    played=known.groupby(['player_id','season','team'],as_index=False).agg(
        appearance_games=('gameId','nunique'),appearance_rows=('gameId','size'),margin_games=('margin','count'),
        played_mov=('margin','mean'),identity_conflict=('identity_conflict','any'),
        duplicate_resolved_game=('duplicate_resolved_game','any'),name_fallback_games=('identity_method',lambda s:int(s.eq('UNIQUE_EXACT_NAME').sum())))
    tq=r.groupby(['season','team'],as_index=False).agg(log_games=('gameId','nunique'),valid_margins=('margin','count'),log_points=('final_points','sum'),log_opp_points=('final_opponent_points','sum'),verified_full_schedule_mov=('margin','mean'))
    tq=t[t.lg.eq('NBA')].merge(tq,on=['season','team'],how='left',validate='one_to_one')
    tq['points_error_share']=(tq.log_points-tq.team_pts).abs()/tq.team_pts
    tq['opp_points_error_share']=(tq.log_opp_points-tq.opp_pts).abs()/tq.opp_pts
    tq['prior_team_eligible']=tq.log_games.eq(tq.team_games)&tq.valid_margins.eq(tq.team_games)&tq.points_error_share.le(.01)&tq.opp_points_error_share.le(.01)
    st=p.merge(t[['season','lg','team','team_games','mov']],on=['season','lg','team'],how='left',validate='many_to_one')
    played['lg']='NBA'
    st=st.merge(played,on=KEY,how='left',validate='one_to_one')
    st=st.merge(tq[['season','lg','team','prior_team_eligible','points_error_share','opp_points_error_share','log_games','valid_margins','verified_full_schedule_mov']],on=['season','lg','team'],how='left',validate='many_to_one')
    conflict=st.identity_conflict.fillna(False).astype(bool)
    duplicate=st.duplicate_resolved_game.fillna(False).astype(bool)
    st['eligible']=st.lg.eq('NBA')&st.appearance_games.eq(st.g)&st.margin_games.eq(st.g)&st.appearance_rows.eq(st.g)&~conflict&~duplicate&st.played_mov.notna()&st.team_games.notna()
    st['prior_trial_eligible']=st.eligible & st.prior_team_eligible.fillna(False).astype(bool)
    st['fallback_reason']=np.select([st.eligible,~st.lg.eq('NBA'),st.team_games.isna(),conflict,duplicate,st.appearance_games.isna(),st.appearance_games.ne(st.g),st.margin_games.ne(st.g)],
        ['', 'ABA_APPEARANCE_DATA_UNAVAILABLE','TEAM_CONTEXT_MISSING','IDENTITY_CONFLICT','DUPLICATE_RESOLVED_APPEARANCE','APPEARANCES_UNAVAILABLE','APPEARANCE_COUNT_MISMATCH','UNVERIFIED_APPEARANCE_MARGIN'],default='INCOMPLETE_APPEARANCE_SET')
    st['mov_used']=st.played_mov.where(st.eligible,st.mov)
    st['mov_method']=np.where(st.eligible,'VERIFIED_LITERAL_APPEARANCE','FULL_SEASON_FALLBACK')
    st.loc[st.mov.isna()&~st.eligible,'mov_method']='UNAVAILABLE_TEAM_CONTEXT'
    # Never convert missing fallback context into a zero margin.
    assert st.loc[st.eligible,'mov_used'].eq(st.loc[st.eligible,'played_mov']).all()
    assert not st.duplicated(KEY).any()
    qc={'appearance_rows':len(a),'identity_conflict_rows':int(a.identity_conflict.sum()),
        'unresolved_identity_rows':int(a.player_id.isna().sum()),'duplicate_resolved_game_rows':int(known.duplicate_resolved_game.sum()),
        'eligible_stints':int(st.eligible.sum()),'prior_trial_eligible_stints':int(st.prior_trial_eligible.sum()),
        'additional_complete_appearance_stints':int((st.eligible&~st.prior_trial_eligible).sum()),
        'fallback_counts':st.loc[~st.eligible,'fallback_reason'].value_counts().to_dict()}
    return st,tq,known,qc
