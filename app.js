(function(){
'use strict';

const TEAMS={};
(window.FR_TEAMS||[]).forEach(function(row){
  TEAMS[row[0]]={id:row[0], name:row[1], bl:row[2]||'', crest:'wappen/'+row[4]};
});
const COMP={de:'Deutsche Meisterschaft', bl:'Deutsche Meisterschaft', dfb:'DFB-Pokal', ddr:'DDR-Meisterschaft', fdgb:'FDGB-Pokal', land:'Landespokal'};
const PY=[
  {id:'BL', name:'Bundesliga', level:1, size:20, up:0, down:3},
  {id:'BL2', name:'2. Bundesliga', level:2, size:20, up:3, down:3, upTo:'BL'},
  {id:'BL3', name:'3. Bundesliga', level:3, size:20, up:3, down:3, upTo:'BL2'},
  {id:'BL4', name:'4. Bundesliga', level:4, size:20, up:3, down:4, upTo:'BL3'},
  {id:'L5NO', name:'5. Liga Nordost', level:5, size:18, up:2, upTo:'BL4', half:'NO'},
  {id:'L5SW', name:'5. Liga Südwest', level:5, size:18, up:2, upTo:'BL4', half:'SW'},
  {id:'RGNW', name:'Regionalliga Nordwest', level:6, size:18, up:1, upTo:'L5NO', half:'NO', states:['Niedersachsen','Bremen']},
  {id:'RGN', name:'Regionalliga Nord', level:6, size:18, up:1, upTo:'L5NO', half:'NO', states:['Schleswig-Holstein','Hamburg','Mecklenburg-Vorpommern']},
  {id:'RGNO', name:'Regionalliga Nordost', level:6, size:18, up:1, upTo:'L5NO', half:'NO', states:['Berlin','Brandenburg','Sachsen-Anhalt']},
  {id:'RGSO', name:'Regionalliga Südost', level:6, size:18, up:1, upTo:'L5NO', half:'NO', states:['Sachsen','Thüringen']},
  {id:'RGBY', name:'Regionalliga Bayern', level:6, size:18, up:1, upTo:'L5SW', half:'SW', states:['Bayern']},
  {id:'RGBW', name:'Regionalliga Baden-Württemberg', level:6, size:18, up:1, upTo:'L5SW', half:'SW', states:['Baden-Württemberg']},
  {id:'RGSW', name:'Regionalliga Südwest', level:6, size:18, up:1, upTo:'L5SW', half:'SW', states:['Hessen','Rheinland-Pfalz','Saarland']},
  {id:'RGW', name:'Regionalliga Nordrhein-Westfalen', level:6, size:18, up:1, upTo:'L5SW', half:'SW', states:['Nordrhein-Westfalen']}
];
const L={}; PY.forEach(function(l){ L[l.id]=l; });
const STATE_RG={};
PY.filter(function(l){ return l.states; }).forEach(function(l){ l.states.forEach(function(st){ STATE_RG[st]=l.id; }); });
const NAV=[
  {id:'BL', label:'Bundesliga'},
  {id:'BL2', label:'2. Bundesliga'},
  {id:'BL3', label:'3. Bundesliga'},
  {id:'BL4', label:'4. Bundesliga'},
  {id:'L5', label:'5. Liga', ids:['L5NO','L5SW']},
  {id:'RG', label:'Regionalliga', ids:['RGNW','RGN','RGNO','RGSO','RGBY','RGBW','RGSW','RGW']},
  {id:'UN', label:'Unterbau'},
  {id:'AN', label:'Ansehen'},
  {id:'PK', label:'Pokal'},
  {id:'MV', label:'Auf/Abstieg'}
];

function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function secondTeam(name){
  const s=String(name||'');
  if (s==='SSV Jeddeloh II') return false;
  if (/\b(II|III|IV)\b/.test(s)) return true;
  if (/\bU\s?(19|21|23)\b/i.test(s)) return true;
  if (/\bReserve\b/i.test(s)) return true;
  if (/\bzwei(te|ten)?\b/i.test(s)) return true;
  if (/\bAmateure\b/i.test(s) && s!=='SC Berliner Amateure') return true;
  if (/(?:^|\s)2\.$/.test(s) || /\s2$/.test(s)) return true;
  if (/\s[Bb]$/.test(s)) return true;
  return false;
}
function blocked(name){
  const s=String(name||'').toLowerCase();
  return s.indexOf('rb leipzig')>=0 || s.indexOf('rasenballsport')>=0 || s.indexOf('red bull leipzig')>=0;
}
function hidden(team){ return !team || blocked(team.name) || secondTeam(team.name); }
function showName(name){
  if (/greuther\s+f[uü]rth/i.test(String(name||''))) return 'SpVgg Fürth';
  return name||'';
}
function coordOf(id){
  const c=window.FR_COORDS&&window.FR_COORDS[id];
  if (!c) return null;
  return {lat:+c[0], lon:+c[1], stadion:c[2]||''};
}
function regionOf(id){ return STATE_RG[TEAMS[id]&&TEAMS[id].bl]||''; }
function halfOf(id){ const rg=L[regionOf(id)]; return rg?rg.half:''; }
function realLevel(){
  const map={};
  ((window.FR_REAL&&window.FR_REAL.levels)||[]).forEach(function(level){
    (level.leagues||[]).forEach(function(lg){ (lg.ids||[]).forEach(function(id){ map[id]=level.level; }); });
  });
  return map;
}
function yearOf(season){ return parseInt(String(season).slice(0,4),10)||0; }
function ansehenValue(id){ return window.FR_AN.value(id); }
function ansehenBuckets(id){
  const info=window.FR_AN.info(id);
  const b={liga:0, titel:0, pokal:0, euro:0, sum:info.value, end:info.end};
  (info.lines||[]).forEach(function(l){
    if (l.kind==='liga') b.liga+=l.today||0;
    else if (l.kind==='titel') b.titel+=l.today||0;
    else if (l.kind==='euro') b.euro+=l.today||0;
    else b.pokal+=l.today||0;
  });
  return b;
}
function de2(n){ return (Math.round((+n||0)*100)/100).toFixed(2).replace('.', ','); }
function historyRows(id){
  const H=window.FR_HISTORY;
  if (!H||!H.rows||!H.rows[id]) return [];
  return H.rows[id].map(function(r){
    return {season:H.seasons[r[0]]||'', liga:H.ligas[r[1]]||'', ebene:r[2], n:r[3], pl:r[4]};
  }).filter(function(r){ return r.season&&r.pl!=null; });
}
function realHome(){
  const map={};
  ((window.FR_REAL&&window.FR_REAL.levels)||[]).forEach(function(level){
    if (level.level<6) return;
    (level.leagues||[]).forEach(function(lg, i){
      const key=level.level+':'+i;
      (lg.ids||[]).forEach(function(id){ if (!map[id]) map[id]={key:key, name:lg.name, level:level.level}; });
    });
  });
  return map;
}
function byStrength(a, b){
  const la=realLevel()[a]||9, lb=realLevel()[b]||9;
  if (la!==lb) return la-lb;
  const d=ansehenValue(b)-ansehenValue(a);
  if (d) return d;
  return showName(TEAMS[a].name).localeCompare(showName(TEAMS[b].name), 'de');
}
function buildWorld(){
  const levels=realLevel();
  const order=Object.keys(TEAMS).filter(function(id){ return id!=='t697' && !hidden(TEAMS[id]) && levels[id]; });
  order.sort(byStrength);
  const leagues={};
  PY.forEach(function(l){ leagues[l.id]=[]; });
  const taken={};
  let i=0;
  ['BL','BL2','BL3','BL4'].forEach(function(id){
    while (leagues[id].length<L[id].size && i<order.length){ leagues[id].push(order[i]); taken[order[i]]=1; i++; }
  });
  function fillHalf(half, l5, rgs){
    const pool=order.filter(function(id){ return !taken[id] && halfOf(id)===half; });
    pool.sort(byStrength);
    pool.slice(0, L[l5].size).forEach(function(id){ leagues[l5].push(id); taken[id]=1; });
    rgs.forEach(function(rg){
      const sub=order.filter(function(id){ return !taken[id] && regionOf(id)===rg; });
      sub.sort(byStrength);
      sub.slice(0, L[rg].size).forEach(function(id){ leagues[rg].push(id); taken[id]=1; });
    });
  }
  fillHalf('NO','L5NO',['RGNW','RGN','RGNO','RGSO']);
  fillHalf('SW','L5SW',['RGBY','RGBW','RGSW','RGW']);
  const home=realHome();
  const unterMap={};
  Object.keys(home).forEach(function(id){
    if (taken[id]||hidden(TEAMS[id])||id==='t697') return;
    const h=home[id];
    if (!unterMap[h.key]) unterMap[h.key]={id:h.key, name:h.name, level:h.level, teams:[]};
    unterMap[h.key].teams.push(id);
  });
  const unter=Object.keys(unterMap).map(function(k){ return unterMap[k]; }).filter(function(u){ return u.teams.length>=2; });
  unter.forEach(function(u){
    const count={};
    u.teams.forEach(function(id){ const rg=regionOf(id)||''; count[rg]=(count[rg]||0)+1; });
    let best='', n=0;
    Object.keys(count).forEach(function(rg){ if (count[rg]>n){ best=rg; n=count[rg]; } });
    u.parent=best;
  });
  return {leagues:leagues, unter:unter};
}
function poisson(l){ const L0=Math.exp(-l); let k=0, p=1; do{ k++; p*=Math.random(); }while(p>L0); return k-1; }
function roundRobin(ids){
  const src=ids.slice();
  if (src.length<2) return [];
  if (src.length%2) src.push(null);
  const n=src.length, rounds=[];
  const arr=src.slice();
  for (let r=0;r<n-1;r++){
    const pairs=[];
    for (let i=0;i<n/2;i++){
      const a=arr[i], b=arr[n-1-i];
      if (a&&b) pairs.push(r%2?[b,a]:[a,b]);
    }
    rounds.push(pairs);
    const rest=arr.slice(1);
    rest.unshift(rest.pop());
    arr.length=0; arr.push(src[0]); rest.forEach(function(x){ arr.push(x); });
  }
  return rounds.concat(rounds.map(function(rd){ return rd.map(function(p){ return [p[1], p[0]]; }); }));
}
function playMatch(h, a){
  return {h:h, a:a, hg:Math.min(8, poisson(1.45)), ag:Math.min(8, poisson(1.15))};
}
function tableOf(ids, matches){
  const seed={};
  const row={};
  ids.forEach(function(id, i){ seed[id]=i; row[id]={id:id, sp:0, s:0, u:0, n:0, tg:0, gt:0, pkt:0}; });
  (matches||[]).forEach(function(m){
    if (!row[m.h]||!row[m.a]||m.hg==null) return;
    const h=row[m.h], a=row[m.a];
    h.sp++; a.sp++; h.tg+=m.hg; h.gt+=m.ag; a.tg+=m.ag; a.gt+=m.hg;
    if (m.hg>m.ag){ h.s++; h.pkt+=3; a.n++; }
    else if (m.hg<m.ag){ a.s++; a.pkt+=3; h.n++; }
    else { h.u++; a.u++; h.pkt++; a.pkt++; }
  });
  const list=ids.map(function(id){ return row[id]; });
  list.sort(function(a,b){
    if (b.pkt!==a.pkt) return b.pkt-a.pkt;
    const gd=(b.tg-b.gt)-(a.tg-a.gt); if (gd) return gd;
    if (b.tg!==a.tg) return b.tg-a.tg;
    if (!a.sp && !b.sp) return seed[a.id]-seed[b.id];
    return showName(TEAMS[a.id].name).localeCompare(showName(TEAMS[b.id].name),'de');
  });
  list.forEach(function(r,i){ r.pl=i+1; r.ppg=r.sp?r.pkt/r.sp:0; });
  return list;
}
function simLeague(ids){
  const matches=[];
  roundRobin(ids).forEach(function(rd){ rd.forEach(function(p){ matches.push(playMatch(p[0], p[1])); }); });
  return {matches:matches, table:tableOf(ids, matches)};
}
function roundLabel(n){
  if (n<=2) return 'Finale';
  if (n<=4) return 'Halbfinale';
  if (n<=8) return 'Viertelfinale';
  if (n<=16) return 'Achtelfinale';
  if (n<=32) return '2. Runde';
  return '1. Runde';
}
function knockout(ids){
  let round=ids.slice();
  const rounds=[];
  while (round.length>1){
    if (round.length%2) round.push(null);
    const played=[], next=[];
    for (let i=0;i<round.length;i+=2){
      const h=round[i], a=round[i+1];
      if (!a){ next.push(h); continue; }
      const m=playMatch(h, a);
      m.winner=m.hg===m.ag?(Math.random()<0.5?h:a):(m.hg>m.ag?h:a);
      played.push(m); next.push(m.winner);
    }
    rounds.push({name:roundLabel(round.filter(Boolean).length), played:played});
    round=next;
  }
  rounds.reverse();
  return {winner:round[0]||'', rounds:rounds};
}

let S={seasons:[], view:0};
function freshSeason(name, leagues, unter){
  const pack={name:name, status:'running', leagues:{}, unter:unter, tables:{}, cups:null};
  PY.forEach(function(l){ pack.leagues[l.id]={teams:leagues[l.id].slice(), matches:null}; });
  return pack;
}
function ensureSeason(){
  if (S.seasons.length) return;
  const world=buildWorld();
  S.seasons.push(freshSeason('2026/27', world.leagues, world.unter));
  S.view=0;
}
function cur(){ return S.seasons[S.view]; }
function nextName(name){ const y=yearOf(name)+1; return y+'/'+String((y+1)%100).padStart(2,'0'); }

function downCount(season, lid){
  const lg=L[lid];
  if (!lg) return 0;
  if (lg.level<=4) return lg.down;
  const tables=season.tables||{};
  if (lg.level===5){
    const from=(tables.BL4||[]).slice(-L.BL4.down).filter(function(r){ return halfOf(r.id)===lg.half; }).length;
    return from+2;
  }
  const parents=lg.half==='NO'?'L5NO':'L5SW';
  const pd=downCount(season, parents);
  const arrivals=(pd>0?(tables[parents]||[]).slice(-pd):[]).filter(function(r){ return regionOf(r.id)===lid; }).length;
  return 1+arrivals;
}
function betterPick(a, b){
  if (b.ppg!==a.ppg) return b.ppg-a.ppg;
  if ((b.tg||0)!==(a.tg||0)) return (b.tg||0)-(a.tg||0);
  const an=ansehenValue(b.id)-ansehenValue(a.id);
  if (an) return an;
  return showName(TEAMS[a.id].name).localeCompare(showName(TEAMS[b.id].name), 'de');
}
function unterPicks(season){
  const by={};
  (season.unter||[]).forEach(function(u){
    if (!u.parent||!u.table||!u.table.length) return;
    (by[u.parent]||(by[u.parent]=[])).push(u);
  });
  const picks={};
  Object.keys(by).forEach(function(rg){
    const leagues=by[rg];
    const champs=leagues.map(function(u){
      const r=u.table[0];
      return {id:r.id, ppg:r.ppg||0, tg:r.tg||0, pl:1, from:u.name};
    }).sort(betterPick);
    const chosen=champs.slice(0, 2);
    if (chosen.length<2){
      const seconds=[];
      leagues.forEach(function(u){
        const r=u.table[1];
        if (r) seconds.push({id:r.id, ppg:r.ppg||0, tg:r.tg||0, pl:2, from:u.name});
      });
      seconds.sort(betterPick);
      seconds.forEach(function(row){
        if (chosen.length<2 && !chosen.some(function(c){ return c.id===row.id; })) chosen.push(row);
      });
    }
    picks[rg]=chosen;
  });
  return picks;
}
function transition(season){
  const tables=season.tables;
  const champs=unterPicks(season);
  const moves=[];
  const next={};
  PY.forEach(function(l){ next[l.id]=[]; });
  const unterTeams={};
  (season.unter||[]).forEach(function(u){ unterTeams[u.id]=(u.table||[]).map(function(r){ return r.id; }); });
  function sendDown(id, from, to, pl){
    moves.push({id:id, from:from, to:to, type:'ab', pl:pl});
    if (L[to]) next[to].push(id);
    else {
      const home=realHome()[id];
      const key=home&&unterTeams[home.key]?home.key:Object.keys(unterTeams).filter(function(k){
        return (season.unter.find(function(u){ return u.id===k; })||{}).parent===regionOf(id);
      })[0];
      if (key) unterTeams[key].push(id);
    }
  }
  PY.forEach(function(l){
    const table=tables[l.id]||[];
    const d=downCount(season, l.id);
    const downIds={};
    (d>0?table.slice(-d):[]).forEach(function(r){ downIds[r.id]=r.pl; });
    table.forEach(function(r){
      if (l.up && r.pl<=l.up){ next[l.upTo].push(r.id); moves.push({id:r.id, from:l.id, to:l.upTo, type:'auf', pl:r.pl}); }
      else if (downIds[r.id]){
        const to=l.id==='BL'?'BL2':l.id==='BL2'?'BL3':l.id==='BL3'?'BL4':l.id==='BL4'?(halfOf(r.id)==='SW'?'L5SW':'L5NO'):l.level===5?regionOf(r.id):'unter';
        sendDown(r.id, l.id, to, r.pl);
      } else next[l.id].push(r.id);
    });
  });
  Object.keys(champs).forEach(function(rg){
    (champs[rg]||[]).forEach(function(c){
      next[rg].push(c.id);
      moves.push({id:c.id, from:c.from, to:rg, type:'auf', pl:c.pl, unter:true});
      Object.keys(unterTeams).forEach(function(k){
        const i=unterTeams[k].indexOf(c.id);
        if (i>=0) unterTeams[k].splice(i,1);
      });
    });
  });
  return {moves:moves, next:next, unterTeams:unterTeams, champs:champs};
}
function simulateCurrent(){
  const season=cur();
  if (season.status==='done') return;
  season.tables={};
  PY.forEach(function(l){
    const pack=simLeague(season.leagues[l.id].teams);
    season.leagues[l.id].matches=pack.matches;
    season.tables[l.id]=pack.table;
  });
  (season.unter||[]).forEach(function(u){ u.table=simLeague(u.teams).table; });
  const lands={};
  const byState={};
  Object.keys(TEAMS).forEach(function(id){
    if (hidden(TEAMS[id])||id==='t697') return;
    const st=TEAMS[id].bl; if (!st) return;
    let inPlay=false;
    PY.forEach(function(l){ if ((season.leagues[l.id].teams||[]).indexOf(id)>=0) inPlay=true; });
    (season.unter||[]).forEach(function(u){ if (u.teams.indexOf(id)>=0) inPlay=true; });
    if (!inPlay) return;
    (byState[st]||(byState[st]=[])).push(id);
  });
  Object.keys(byState).forEach(function(st){
    const field=byState[st].slice().sort(function(a,b){ return ansehenValue(b)-ansehenValue(a); }).slice(0, 32);
    lands[st]=knockout(field);
  });
  const dfb=PY.filter(function(l){ return l.level<=3; }).reduce(function(acc,l){ return acc.concat(season.leagues[l.id].teams); }, []);
  const fill=season.leagues.BL4.teams.slice().sort(function(a,b){ return ansehenValue(b)-ansehenValue(a); });
  fill.forEach(function(id){ if (dfb.length<64 && dfb.indexOf(id)<0) dfb.push(id); });
  season.cups={dfb:knockout(dfb), land:lands};
  season.status='done';
  publishAnsehen();
}
function kernCup(cup){
  if (!cup) return null;
  const rounds=(cup.rounds||[]).map(function(r){
    return {name:r.name, drawn:true, matches:(r.played||[]).map(function(m){
      const draw=m.hg===m.ag;
      return {h:m.h, a:m.a, hg:m.hg, ag:m.ag, peh:draw?(m.winner===m.h?1:0):null, pea:draw?(m.winner===m.a?1:0):null};
    })};
  });
  const entrants=[];
  rounds.forEach(function(r){ r.matches.forEach(function(m){ if (entrants.indexOf(m.h)<0) entrants.push(m.h); if (entrants.indexOf(m.a)<0) entrants.push(m.a); }); });
  return {rounds:rounds, entrants:entrants, roundNames:rounds.map(function(r){ return r.name; })};
}
function cupRuns(season, comp, cup, bl){
  const order=['1. Runde','2. Runde','Achtelfinale','Viertelfinale','Halbfinale','Finale'];
  const best={};
  (cup.rounds||[]).forEach(function(round){
    (round.played||[]).forEach(function(m){
      [m.h, m.a].forEach(function(id){
        if (!id) return;
        const prev=best[id];
        if (!prev || order.indexOf(round.name)>order.indexOf(prev)) best[id]=round.name;
      });
    });
  });
  return Object.keys(best).map(function(id){
    return {season:season.name, id:id, comp:comp, bl:bl||'', round:best[id], won:id===cup.winner};
  });
}
function publishAnsehen(){
  const kern=window.FR_AN;
  const chronicle=[], runs=[];
  const seasons=S.seasons.map(function(season){
    if (season.status!=='done') return {name:season.name, status:'running', leagues:{}, cups:{}};
    const leagues={}, downOf={}, upOf={}, tables={};
    const plan=transition(season);
    PY.forEach(function(l){
      const rows=(season.tables[l.id]||[]).map(function(r){ return {id:r.id, pl:r.pl}; });
      leagues[l.id]={teams:season.leagues[l.id].teams.slice(), tables:{all:rows}};
      tables[l.id]=rows;
      downOf[l.id]=downCount(season, l.id);
      upOf[l.id]=l.up||0;
      rows.forEach(function(r){ chronicle.push({season:season.name, id:r.id, liga:l.name, ebene:l.level, n:rows.length, pl:r.pl, pts:0}); });
    });
    const moves=plan.moves.filter(function(m){ return m.type==='auf' && !m.unter; });
    const picks={};
    plan.moves.forEach(function(m){ if (m.unter) (picks[m.to]||(picks[m.to]=[])).push(m.id); });
    if (season.cups&&season.cups.dfb) cupRuns(season, 'dfb', season.cups.dfb, '').forEach(function(r){ runs.push(r); });
    const land={};
    Object.keys((season.cups&&season.cups.land)||{}).forEach(function(bl){
      land[bl]=kernCup(season.cups.land[bl]);
      cupRuns(season, 'land', season.cups.land[bl], bl).forEach(function(r){ runs.push(r); });
    });
    return {name:season.name, status:'done', leagues:leagues, cups:{dfb:kernCup(season.cups&&season.cups.dfb), land:land}, endData:{tables:tables, downOf:downOf, upOf:upOf, moves:moves, picks:picks}};
  });
  kern.S.seasons=seasons;
  kern.S.view=S.view;
  kern.S.chronicle=chronicle;
  kern.S.pokalRuns=runs;
  kern.touch();
}
function applyTransition(){
  const season=cur();
  if (season.status!=='done') return;
  const plan=transition(season);
  const unter=(season.unter||[]).map(function(u){
    return {id:u.id, name:u.name, level:u.level, parent:u.parent, teams:(plan.unterTeams[u.id]||[]).slice()};
  }).filter(function(u){ return u.teams.length>=2; });
  const leagues={};
  PY.forEach(function(l){ leagues[l.id]=plan.next[l.id].slice(); });
  S.seasons.push(freshSeason(nextName(season.name), leagues, unter));
  S.view=S.seasons.length-1;
  publishAnsehen();
}

const view={mode:'BL', sub:0, club:null};
function parseHash(){
  const h=(location.hash||'').replace(/^#/,'');
  const club=h.match(/^v\/([A-Za-z0-9]+)$/);
  if (club){ view.club=club[1]; return; }
  view.club=null;
  const m=h.match(/^m\/([^/]+)(?:\/(\d+))?$/);
  if (m){ view.mode=m[1]; view.sub=+m[2]||0; }
}
function go(hash){ if (location.hash===hash) render(); else location.hash=hash; }
function zone(lid, pl, n){
  const lg=L[lid];
  if (!lg) return '';
  const season=cur();
  const done=season.status==='done';
  if (lid==='BL'){
    if (pl>n-3) return 'ab';
    if (pl===1) return 'meister';
    if (pl<=4) return 'cl';
    if (pl<=6) return 'el';
    if (pl===7) return 'ecl';
    return '';
  }
  if (lg.up && pl<=lg.up) return 'auf';
  if (lg.level<=4){ if (lg.down && pl>n-lg.down) return 'ab'; return ''; }
  if (!done){
    if (lg.level===5 && pl>n-4) return 'ab';
    if (lg.level===6 && pl===n) return 'ab';
    return '';
  }
  const d=downCount(season, lid);
  if (d && pl>n-d) return 'ab';
  return '';
}
function legend(lid){
  const bits=[];
  const sw=function(z, t){ return '<span><i class="sw-'+z+'"></i>'+t+'</span>'; };
  if (lid==='BL'){
    bits.push(sw('meister','Meister'), sw('cl','Champions League'), sw('el','Europa League'), sw('ecl','Conference League'), sw('ab','Abstieg'));
  } else if (L[lid]){
    bits.push(sw('auf', L[lid].up===1?'Aufstieg':'Aufstieg'));
    bits.push(sw('ab', L[lid].level===6?'Abstieg, der letzte Platz ist fest':'Abstieg'));
  }
  return '<div class="legend">'+bits.join('')+'</div>';
}
function tableHTML(lid){
  const season=cur();
  const lg=L[lid];
  const ids=season.leagues[lid].teams;
  const rows=season.status==='done'?season.tables[lid]:tableOf(ids, season.leagues[lid].matches||[]);
  const body=rows.map(function(r){
    const t=TEAMS[r.id], c=coordOf(r.id);
    const z=zone(lid, r.pl, rows.length);
    return '<tr class="'+(z?'z-'+z:'')+'"><td>'+r.pl+'</td><td class="l"><button type="button" class="club-link" data-club="'+r.id+'"><img src="'+esc(t.crest)+'" alt="">'+esc(showName(t.name))+'</button></td><td>'+r.sp+'</td><td>'+r.s+'</td><td>'+r.u+'</td><td>'+r.n+'</td><td>'+(r.tg+':'+r.gt)+'</td><td>'+(r.tg-r.gt)+'</td><td><b>'+r.pkt+'</b></td></tr>';
  }).join('');
  return '<div class="league-head"><h1>'+esc(lg.name)+'</h1><p>'+esc(season.name)+'</p></div>'+
    '<table class="tbl stand"><thead><tr><th>Pl.</th><th class="l">Verein</th><th>Sp.</th><th>S</th><th>U</th><th>N</th><th>Tore</th><th>Diff.</th><th>Pkt.</th></tr></thead><tbody>'+body+'</tbody></table>'+legend(lid);
}
function navHTML(){
  return NAV.map(function(item){
    const on=view.mode===item.id && !view.club;
    return '<button type="button" class="nav-link'+(on?' active':'')+'" data-mode="'+item.id+'">'+esc(item.label)+'</button>';
  }).join('');
}
function staffelHTML(){
  const item=NAV.find(function(n){ return n.id===view.mode; });
  if (view.mode==='UN'){
    const list=cur().unter||[];
    const opts=list.map(function(u,i){ return '<option value="'+i+'"'+(i===view.sub?' selected':'')+'>'+esc(u.name)+'</option>'; }).join('');
    return '<select id="staffelSelect">'+opts+'</select><span class="staffel-count">'+(list[view.sub]?list[view.sub].teams.length:0)+' Vereine</span>';
  }
  if (item&&item.ids){
    const opts=item.ids.map(function(id,i){ return '<option value="'+i+'"'+(i===view.sub?' selected':'')+'>'+esc(L[id].name)+'</option>'; }).join('');
    return '<select id="staffelSelect">'+opts+'</select><span class="staffel-count">'+L[item.ids[view.sub]||item.ids[0]].size+' Vereine</span>';
  }
  return '<span class="staffel-count">'+esc(cur().name)+'</span>';
}
function movesHTML(){
  const season=cur();
  if (season.status!=='done') return '<div class="league-head"><h1>Auf- und Abstieg</h1></div><p class="note">Die Saison ist noch nicht gespielt. Es gibt keine Relegation und keine Entscheidungsspiele.</p>';
  const plan=transition(season);
  const by={};
  plan.moves.forEach(function(m){
    const key=L[m.from]?m.from:m.to;
    (by[key]||(by[key]=[])).push(m);
  });
  const cards=PY.map(function(l){
    const list=by[l.id]||[];
    const up=list.filter(function(m){ return m.type==='auf' && m.from===l.id; });
    const down=list.filter(function(m){ return m.type==='ab' && m.from===l.id; });
    const inn=list.filter(function(m){ return m.to===l.id; });
    return '<article class="py-card"><h3>'+esc(l.name)+'</h3><ul>'+
      up.map(function(m){ return '<li class="up">'+esc(showName(TEAMS[m.id].name))+' ↑</li>'; }).join('')+
      down.map(function(m){ return '<li class="down">'+esc(showName(TEAMS[m.id].name))+' ↓</li>'; }).join('')+
      inn.filter(function(m){ return m.unter; }).map(function(m){ return '<li class="up">'+esc(showName(TEAMS[m.id].name))+' aus dem Unterbau</li>'; }).join('')+
      '</ul></article>';
  }).join('');
  return '<div class="league-head"><h1>Auf- und Abstieg '+esc(season.name)+'</h1></div>'+
    '<p class="note">Keine Relegation, keine Entscheidungsspiele. Die Plätze entscheiden. Jede Regionalliga hat einen festen Absteiger plus so viele weitere, wie aus ihrem Gebiet von der 5. Liga kommen. Damit 18 Teams bleiben, steigen je Regionalliga zwei Vereine aus dem Unterbau auf. Die 5. Liga gibt so viele ab, wie aus der 4. Bundesliga kommen, plus zwei.</p>'+
    '<div class="py"><div class="py-row">'+cards+'</div></div>';
}
function ansehenHTML(){
  const ids=Object.keys(TEAMS).filter(function(id){ return !hidden(TEAMS[id]); });
  ids.sort(function(a,b){ return ansehenValue(b)-ansehenValue(a)||showName(TEAMS[a].name).localeCompare(showName(TEAMS[b].name),'de'); });
  const rows=ids.slice(0, 80).map(function(id, i){
    const p=ansehenBuckets(id), t=TEAMS[id];
    return '<tr><td>'+(i+1)+'</td><td class="l"><button type="button" class="club-link" data-club="'+id+'"><img src="'+esc(t.crest)+'" alt="">'+esc(showName(t.name))+'</button></td><td>'+de2(p.sum)+'</td><td>'+de2(p.liga)+'</td><td>'+de2(p.titel)+'</td><td>'+de2(p.pokal)+'</td><td>'+de2(p.euro)+'</td></tr>';
  }).join('');
  return '<div class="league-head"><h1>Ansehen</h1><p>Stand '+window.FR_AN.end()+'</p></div><p class="note">Dieselbe Rechnung wie im letzten vollen Rechner: Platzpunkte, Europapunkte, DFB-Pokalrunden, Titel und die Alterskurve. Bei offener Saison liegen die fünf jüngsten abgeschlossenen Saisons bei Faktor 2, die fünf davor bei 1,5.</p><table class="tbl stand"><thead><tr><th>Pl.</th><th class="l">Verein</th><th>Ansehen</th><th>Liga</th><th>Titel</th><th>Pokal</th><th>Europa</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function pokalHTML(){
  const season=cur();
  if (!season.cups) return '<div class="league-head"><h1>Pokal</h1></div><p class="note">Die Pokale werden mit der Saison ausgespielt.</p>';
  const dfb=season.cups.dfb;
  const fin=dfb.rounds[dfb.rounds.length-1];
  const lands=Object.keys(season.cups.land).sort(function(a,b){ return a.localeCompare(b,'de'); }).map(function(st){
    const w=season.cups.land[st].winner;
    return '<li>'+esc(st)+': '+esc(w&&TEAMS[w]?showName(TEAMS[w].name):'–')+'</li>';
  }).join('');
  return '<div class="league-head"><h1>Pokal '+esc(season.name)+'</h1></div><div class="cup-grid"><article class="cup-card"><h3>DFB-Pokal</h3><p>Sieger: <b>'+esc(dfb.winner&&TEAMS[dfb.winner]?showName(TEAMS[dfb.winner].name):'–')+'</b></p><p class="muted">Teilnehmer sind die drei obersten Ligen und die auffüllenden Vereine der 4. Bundesliga bis 64. Ein Spiel, kein Rückspiel.</p></article><article class="cup-card"><h3>Landespokale</h3><ul>'+lands+'</ul></article></div>';
}
function unterHTML(){
  const u=(cur().unter||[])[view.sub];
  if (!u) return '<p class="empty">Keine Unterbau-Liga.</p>';
  const rows=(cur().status==='done'&&u.table?u.table:u.teams.map(function(id,i){ return {id:id, pl:i+1, sp:0, pkt:0, tg:0, gt:0}; }));
  const body=rows.map(function(r){
    const t=TEAMS[r.id];
    return '<tr><td>'+r.pl+'</td><td class="l"><button type="button" class="club-link" data-club="'+r.id+'"><img src="'+esc(t.crest)+'" alt="">'+esc(showName(t.name))+'</button></td><td>'+(r.sp||0)+'</td><td>'+(r.pkt||0)+'</td></tr>';
  }).join('');
  return '<div class="league-head"><h1>'+esc(u.name)+'</h1><p>'+esc((L[u.parent]&&L[u.parent].name)||'')+'</p></div><table class="tbl stand"><thead><tr><th>Pl.</th><th class="l">Verein</th><th>Sp.</th><th>Pkt.</th></tr></thead><tbody>'+body+'</tbody></table>';
}
function infoHTML(id){
  const t=TEAMS[id];
  if (!t||hidden(t)) return '<p class="empty">Dieser Verein wird nicht angezeigt.</p>';
  const c=coordOf(id);
  const p=ansehenBuckets(id);
  const titles=[];
  ((window.FR_TITEL&&window.FR_TITEL.rows)||[]).forEach(function(r){ if (r&&r.id===id) titles.push(r); });
  ((window.FR_SCHAU&&window.FR_SCHAU.rows)||[]).forEach(function(r){ if (r&&r.id===id) titles.push({year:r.year, comp:'land', original:r.original, note:r.cupName||''}); });
  titles.sort(function(a,b){ return (b.year||0)-(a.year||0); });
  const titleTable=titles.length?'<table class="tbl"><thead><tr><th>Jahr</th><th>Wettbewerb</th><th>Damals</th></tr></thead><tbody>'+titles.map(function(r){
    return '<tr><td>'+(r.year||'')+'</td><td>'+esc(COMP[r.comp]||r.note||r.comp||'')+'</td><td>'+esc(r.original&&r.original!==t.name?r.original:'')+'</td></tr>';
  }).join('')+'</tbody></table>':'<p class="muted">Keine gespeicherten Titel.</p>';
  const hist=historyRows(id).sort(function(a,b){ return a.season<b.season?1:-1; });
  const histTable=hist.length?'<table class="tbl"><thead><tr><th>Saison</th><th>Liga</th><th>Platz</th></tr></thead><tbody>'+hist.map(function(r){
    return '<tr><td>'+esc(r.season)+'</td><td>'+esc(r.liga)+'</td><td>'+r.pl+'</td></tr>';
  }).join('')+'</tbody></table>':'<p class="muted">Keine Ligahistorie gespeichert.</p>';
  return '<div class="bfv-page"><header class="bfv-stage"><div class="bfv-stage-row"><img class="bfv-crest" src="'+esc(t.crest)+'" alt=""><div><div class="bfv-kicker">Ansehen '+p.sum.toFixed(2).replace('.',',')+'</div><h2>'+esc(showName(t.name))+'</h2><div class="bfv-meta">'+esc([t.bl, c&&c.stadion].filter(Boolean).join(' · '))+'</div><button type="button" class="bfv-back" data-go="#m/BL">Zurück</button></div></div></header><div class="bfv-card"><h3>Titel</h3>'+titleTable+'<h3>Ligahistorie</h3>'+histTable+'</div></div>';
}
function render(){
  ensureSeason();
  parseHash();
  const item=NAV.find(function(n){ return n.id===view.mode; });
  if (item&&item.ids && (view.sub<0||view.sub>=item.ids.length)) view.sub=0;
  document.getElementById('leagueNav').innerHTML=navHTML();
  document.getElementById('staffelBar').innerHTML=staffelHTML();
  const btn=document.getElementById('simBtn');
  btn.textContent=cur().status==='done'?'Nächste Saison':'Saison simulieren';
  let html='';
  if (view.club) html=infoHTML(view.club);
  else if (view.mode==='AN') html=ansehenHTML();
  else if (view.mode==='PK') html=pokalHTML();
  else if (view.mode==='MV') html=movesHTML();
  else if (view.mode==='UN') html=unterHTML();
  else if (item&&item.ids) html=tableHTML(item.ids[view.sub]||item.ids[0]);
  else html=tableHTML(view.mode);
  document.getElementById('view').innerHTML=html;
}
document.addEventListener('click', function(ev){
  const mode=ev.target.closest('[data-mode]');
  if (mode){ view.sub=0; go('#m/'+mode.getAttribute('data-mode')+'/0'); return; }
  const club=ev.target.closest('[data-club]');
  if (club){ go('#v/'+club.getAttribute('data-club')); return; }
  const back=ev.target.closest('[data-go]');
  if (back){ go(back.getAttribute('data-go')); return; }
  if (ev.target.id==='simBtn'){
    if (cur().status==='done') applyTransition();
    else simulateCurrent();
    render();
  }
});
document.addEventListener('change', function(ev){
  if (ev.target.id!=='staffelSelect') return;
  go('#m/'+view.mode+'/'+ev.target.value);
});
window.addEventListener('hashchange', render);

function selfTest(){
  const fails=[];
  const backup={seasons:S.seasons, view:S.view};
  const kern0=window.FR_AN;
  const ansehenKeep={seasons:kern0.S.seasons, chronicle:kern0.S.chronicle, pokalRuns:kern0.S.pokalRuns, view:kern0.S.view};
  try{
    S={seasons:[], view:0};
    ensureSeason();
    const season=cur();
    const seen={};
    PY.forEach(function(l){
      const teams=season.leagues[l.id].teams;
      if (teams.length!==l.size) fails.push(l.id+' Start '+teams.length);
      teams.forEach(function(id){
        if (seen[id]) fails.push('doppelt '+id);
        seen[id]=1;
        if (hidden(TEAMS[id])) fails.push('gesperrt '+id);
        if (!TEAMS[id].crest) fails.push('Wappen '+id);
      });
    });
    if (seen.t697) fails.push('t697 hat eine Liga');
    if (!Object.keys(TEAMS).some(function(id){ return TEAMS[id].name==='SSV Jeddeloh II' && (seen[id]||(season.unter||[]).some(function(u){ return u.teams.indexOf(id)>=0; })); })) fails.push('Jeddeloh fehlt');
    if (showName(TEAMS.t022.name)!=='SpVgg Fürth') fails.push('Fürth');
    Object.keys(TEAMS).forEach(function(id){ if (blocked(TEAMS[id].name) && seen[id]) fails.push('RB'); });
    simulateCurrent();
    PY.forEach(function(l){
      const t=season.tables[l.id];
      if (!t || t.length!==l.size) fails.push(l.id+' Tabelle');
      const games={};
      (season.leagues[l.id].matches||[]).forEach(function(m){ games[m.h]=(games[m.h]||0)+1; games[m.a]=(games[m.a]||0)+1; });
      season.leagues[l.id].teams.forEach(function(id){
        if (games[id]!==(l.size-1)*2) fails.push(l.id+' Spiele '+id);
      });
    });
    const plan=transition(season);
    PY.forEach(function(l){
      if (plan.next[l.id].length!==l.size) fails.push(l.id+' danach '+plan.next[l.id].length);
    });
    const replay=plan.moves.filter(function(m){ return m.relegation||m.decide; });
    if (replay.length) fails.push('Relegation');
    ['BL','BL2','BL3','BL4'].forEach(function(id){
      const down=plan.moves.filter(function(m){ return m.type==='ab'&&m.from===id; }).map(function(m){ return m.id; }).sort();
      const bottom=season.tables[id].slice(-L[id].down).map(function(r){ return r.id; }).sort();
      if (down.join()!==bottom.join()) fails.push(id+' letzte');
    });
    ['L5NO','L5SW'].forEach(function(id){
      const A=season.tables.BL4.slice(-4).filter(function(r){ return halfOf(r.id)===L[id].half; }).length;
      const d=plan.moves.filter(function(m){ return m.type==='ab'&&m.from===id; });
      if (d.length!==A+2) fails.push(id+' Ab '+d.length+'/'+(A+2));
    });
    ['RGNW','RGN','RGNO','RGSO','RGBY','RGBW','RGSW','RGW'].forEach(function(id){
      const parent=L[id].upTo;
      const pd=downCount(season, parent);
      const K=(pd>0?season.tables[parent].slice(-pd):[]).filter(function(r){ return regionOf(r.id)===id; }).length;
      const d=plan.moves.filter(function(m){ return m.type==='ab'&&m.from===id; });
      const up=plan.moves.filter(function(m){ return m.unter&&m.to===id; });
      if (d.length!==1+K) fails.push(id+' Ab '+d.length+'/'+(1+K));
      if (up.length!==2) fails.push(id+' Unterbau '+up.length);
      const last=season.tables[id][season.tables[id].length-1].id;
      if (!d.some(function(m){ return m.id===last; })) fails.push(id+' fester Letzter');
    });
    ansehenProof().forEach(function(msg){ fails.push(msg); });
  }catch(e){ fails.push(String(e&&e.message||e)); }
  S.seasons=backup.seasons; S.view=backup.view;
  const kern=window.FR_AN;
  kern.S.seasons=ansehenKeep.seasons; kern.S.chronicle=ansehenKeep.chronicle; kern.S.pokalRuns=ansehenKeep.pokalRuns; kern.S.view=ansehenKeep.view;
  kern.touch();
  if (!S.seasons.length) ensureSeason();
  return {ok:!fails.length, fails:fails};
}
function ansehenProof(){
  const kern=window.FR_AN;
  const fails=[];
  const saved={seasons:kern.S.seasons, chronicle:kern.S.chronicle, pokalRuns:kern.S.pokalRuns, view:kern.S.view};
  try{
    kern.S.seasons=[{name:'2026/27', status:'running', leagues:{}, cups:{}}];
    kern.S.chronicle=[]; kern.S.pokalRuns=[]; kern.S.view=0; kern.touch();
    const expect={t001:17189.1, t002:12274.78, t004:9526.98, t007:9966.52, t022:5820.11, t084:1259.9, t095:607.62, t181:465.59, t2329:0};
    Object.keys(expect).forEach(function(id){ if (kern.value(id)!==expect[id]) fails.push('Ansehen '+id+' '+kern.value(id)); });
    if (kern.base(2026)!==1) fails.push('Fünferfenster');
    const fin={h:'t010', a:'t099', hg:1, ag:0};
    kern.S.seasons=[{name:'2097/98', status:'done', leagues:{BL:{teams:['t001','t010'], tables:{all:[{id:'t001', pl:1},{id:'t010', pl:8}]}}}, cups:{dfb:{rounds:[{name:'Finale', drawn:true, matches:[fin]}]}}, endData:{downOf:{BL:3}, upOf:{BL:0}}}];
    kern.S.view=0;
    kern.S.chronicle=[
      {season:'2097/98', id:'t001', liga:'Bundesliga', ebene:1, n:20, pl:1, pts:0},
      {season:'2097/98', id:'t010', liga:'Bundesliga', ebene:1, n:20, pl:8, pts:0}
    ];
    kern.S.pokalRuns=[
      {season:'2097/98', id:'t010', comp:'dfb', round:'Finale', won:true},
      {season:'2097/98', id:'t099', comp:'dfb', round:'Finale', won:false}
    ];
    kern.touch();
    const lines=function(id, kind){ return kern.info(id, 2097).lines.filter(function(l){ return l.season==='2097/98' && l.kind===kind; }); };
    const e1=lines('t001','euro'), e8=lines('t010','euro'), dfb=lines('t010','dfb');
    if (!(e1.length===1 && e1[0].label.indexOf('CL')>=0)) fails.push('Europa CL');
    if (!(e8.length===1 && e8[0].label.indexOf('UECL')>=0)) fails.push('Europa UECL');
    if (!(dfb.length===1 && dfb[0].original===170)) fails.push('DFB-Runde');
  }finally{
    kern.S.seasons=saved.seasons; kern.S.chronicle=saved.chronicle; kern.S.pokalRuns=saved.pokalRuns; kern.S.view=saved.view;
    kern.touch();
  }
  return fails;
}
function seasonAudit(n){
  const rows=[];
  S={seasons:[], view:0};
  ensureSeason();
  for (let i=0;i<(n||6);i++){
    simulateCurrent();
    const season=cur();
    const plan=transition(season);
    const row={season:season.name, teams:{}, down:{}};
    PY.forEach(function(l){ row.teams[l.id]=plan.next[l.id].length; });
    ['L5NO','L5SW','RGNW','RGN','RGNO','RGSO','RGBY','RGBW','RGSW','RGW'].forEach(function(id){
      row.down[id]=plan.moves.filter(function(m){ return m.type==='ab'&&m.from===id; }).length;
    });
    rows.push(row);
    applyTransition();
  }
  return rows;
}
window.FR={teams:TEAMS, leagues:PY, selfTest:selfTest, ansehenValue:ansehenValue, seasonAudit:seasonAudit};
if (!location.hash) location.replace('#m/BL/0');
render();
})();
