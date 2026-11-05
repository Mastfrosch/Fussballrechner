/* Fußballrechner – offline Web-App (keine Server nötig). Alle Daten in localStorage. */
(function(){
'use strict';

// ---------- Stammdaten ----------
const TEAMS = {};
window.FR_TEAMS.forEach(t => { TEAMS[t[0]] = {id:t[0], name:t[1], bl:t[2], rang:t[3], schnitt:t[4], crest:'wappen/'+t[5]}; });

const AREA_BY_BL = {
  'Bremen':'NS','Niedersachsen':'NS',
  'Hamburg':'NN','Schleswig-Holstein':'NN','Mecklenburg-Vorpommern':'NN',
  'Berlin':'ON','Brandenburg':'ON','Sachsen-Anhalt':'ON',
  'Sachsen':'OS','Thüringen':'OS',
  'Bayern':'BY','Baden-Württemberg':'BW','Nordrhein-Westfalen':'NRW',
  'Hessen':'SW','Rheinland-Pfalz':'SW','Saarland':'SW'
};
const RL_BY_AREA = {NS:'RLN',NN:'RLN',ON:'RLO',OS:'RLO',BY:'RLS',BW:'RLS',NRW:'RLW',SW:'RLW'};

// level, size, up, down, upTo
const LEAGUES = [
  {id:'BL',  name:'Bundesliga',            short:'BL',      level:1, size:20, up:0, down:3},
  {id:'BL2', name:'2. Bundesliga',         short:'2. BL',   level:2, size:20, up:3, down:3, upTo:'BL'},
  {id:'L3',  name:'3. Liga',               short:'3. Liga', level:3, size:20, up:3, down:3, upTo:'BL2'},
  {id:'L4',  name:'4. Liga',               short:'4. Liga', level:4, size:22, up:3, down:4, upTo:'L3'},
  {id:'RLN', name:'Regionalliga Nord',     short:'RL Nord', level:5, size:18, up:1, down:2, upTo:'L4'},
  {id:'RLO', name:'Regionalliga Ost',      short:'RL Ost',  level:5, size:18, up:1, down:2, upTo:'L4'},
  {id:'RLS', name:'Regionalliga Süd',      short:'RL Süd',  level:5, size:18, up:1, down:2, upTo:'L4'},
  {id:'RLW', name:'Regionalliga West',     short:'RL West', level:5, size:18, up:1, down:2, upTo:'L4'},
  {id:'OLNS',name:'Oberliga Nord – Staffel Süd',  short:'OL Nord-S', level:6, size:18, up:2, down:0, upTo:'RLN', area:'NS'},
  {id:'OLNN',name:'Oberliga Nord – Staffel Nord', short:'OL Nord-N', level:6, size:18, up:2, down:0, upTo:'RLN', area:'NN'},
  {id:'OLON',name:'Oberliga Ost – Staffel Nord',  short:'OL Ost-N',  level:6, size:18, up:2, down:0, upTo:'RLO', area:'ON'},
  {id:'OLOS',name:'Oberliga Ost – Staffel Süd',   short:'OL Ost-S',  level:6, size:18, up:2, down:0, upTo:'RLO', area:'OS'},
  {id:'OLBY',name:'Oberliga Bayern',              short:'OL BY',     level:6, size:18, up:2, down:0, upTo:'RLS', area:'BY'},
  {id:'OLBW',name:'Oberliga Baden-Württemberg',   short:'OL BW',     level:6, size:18, up:2, down:0, upTo:'RLS', area:'BW'},
  {id:'OLNRW',name:'Oberliga Nordrhein-Westfalen',short:'OL NRW',    level:6, size:18, up:2, down:0, upTo:'RLW', area:'NRW'},
  {id:'OLSW',name:'Oberliga Südwest',             short:'OL SW',     level:6, size:18, up:2, down:0, upTo:'RLW', area:'SW'}
];
const POOLS = [
  {id:'AMNS', name:'Amateurliga Nord – Staffel Süd', area:'NS', ol:'OLNS', desc:'Bremen, Niedersachsen'},
  {id:'AMNN', name:'Amateurliga Nord – Staffel Nord', area:'NN', ol:'OLNN', desc:'Hamburg, Schleswig-Holstein, Mecklenburg-Vorpommern'},
  {id:'AMON', name:'Amateurliga Ost – Staffel Nord', area:'ON', ol:'OLON', desc:'Berlin, Brandenburg, Sachsen-Anhalt'},
  {id:'AMOS', name:'Amateurliga Ost – Staffel Süd', area:'OS', ol:'OLOS', desc:'Sachsen, Thüringen'},
  {id:'AMBY', name:'Amateurliga Bayern', area:'BY', ol:'OLBY', desc:'Bayern'},
  {id:'AMBW', name:'Amateurliga Baden-Württemberg', area:'BW', ol:'OLBW', desc:'Baden-Württemberg'},
  {id:'AMNRW',name:'Amateurliga Nordrhein-Westfalen', area:'NRW', ol:'OLNRW', desc:'Nordrhein-Westfalen'},
  {id:'AMSW', name:'Amateurliga Südwest', area:'SW', ol:'OLSW', desc:'Hessen, Rheinland-Pfalz, Saarland'}
];
const L = {}; LEAGUES.forEach(l => L[l.id] = l);
const P = {}; POOLS.forEach(p => P[p.id] = p);

function homeLeague(id, level){
  const area = AREA_BY_BL[TEAMS[id].bl] || 'NRW';
  if (level >= 7) return 'AM'+area;
  if (level === 6) return 'OL'+area;
  if (level === 5) return RL_BY_AREA[area];
  return {1:'BL',2:'BL2',3:'L3',4:'L4'}[level];
}
function leagueName(id){ return L[id] ? L[id].name : P[id] ? P[id].name : id; }
function leagueShort(id){ return L[id] ? L[id].short : P[id] ? 'Amateur' : id; }

// ---------- Hilfen ----------
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.remove('hidden'); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.add('hidden'),2600); }
function nextSeasonName(n){ const y=parseInt(n.slice(0,4),10)+1; return y+'/'+String((y+1)%100).padStart(2,'0'); }
function byRang(a,b){ return (TEAMS[a].rang||99999)-(TEAMS[b].rang||99999) || TEAMS[a].name.localeCompare(TEAMS[b].name,'de'); }
function deNum(x, digits){ return (x==null||!isFinite(x)?'–':Number(x).toFixed(digits).replace('.',',')); }
function seasonYear(name){ return parseInt(String(name).slice(0,4),10)||0; }

// Ansehen: Liga über 30 Saisons, die jüngsten 10 davon 1,5-fach.
// Pokal über 15 Saisons, die jüngsten 5 davon 1,5-fach. Jahre ohne Teilnahme zählen 0,
// der Schnitt teilt durch das ganze Fenster. Die Anzeige endet bei der gerade geöffneten Saison.
function dataEndYear(){
  if (endYearGen===ansehenGen && endYearCache) return endYearCache;
  let y=2025;
  (S.chronicle||[]).forEach(r=>{ const k=seasonYear(r.season); if(k>y) y=k; });
  endYearCache=y; endYearGen=ansehenGen;
  return y;
}
function windowEndYear(){
  const y=dataEndYear();
  const view=S && S.seasons && S.seasons[S.view];
  const vy=view ? seasonYear(view.name) : 0;
  return vy && vy<y ? vy : y;
}
function seasonWeight(seasonName, endYear){
  const y=seasonYear(seasonName);
  if (y>endYear || y<endYear-29) return 0;
  return y>=endYear-9 ? 1.5 : 1;
}
function pokalWindowSum(){ return 10*1+5*1.5; }
let ansehenGen=1, chronIndex=null, chronBuilt=-1, runIndex=null, runBuilt=-1, endYearCache=0, endYearGen=0;
const ansehenMemo=new Map();
let ansehenMemoGen=0;
const infoMemo=new Map();
let infoMemoGen=0;
let orderCacheIds=null, chronSeen=null, runSeasons=null;
function touchAnsehen(){ ansehenGen++; ansehenMemo.clear(); infoMemo.clear(); endYearCache=0; orderCacheIds=null; }
function resetDerivedIndex(){ chronIndex=null; chronBuilt=-1; runIndex=null; runBuilt=-1; chronSeen=null; runSeasons=null; orderCacheIds=null; touchAnsehen(); }
function ensureChronSeen(){
  const all=S.chronicle||[];
  if (!chronSeen || chronSeen.size>all.length){
    chronSeen=new Set();
    all.forEach(c=>chronSeen.add(c.season+'|'+c.id));
  }
}
function chronicleHas(season, id){
  ensureChronSeen();
  return chronSeen.has(season+'|'+id);
}
function ensureRunSeasons(){
  const all=S.pokalRuns||[];
  if (!runSeasons){
    runSeasons=new Set();
    all.forEach(r=>runSeasons.add(r.season));
  }
}
function runsHaveSeason(name){
  ensureRunSeasons();
  return runSeasons.has(name);
}
function chronicleById(id){
  const all=S.chronicle||[];
  if (!chronIndex || chronBuilt>all.length){ chronIndex=new Map(); chronBuilt=0; }
  for (let i=chronBuilt;i<all.length;i++){
    const r=all[i];
    let a=chronIndex.get(r.id);
    if (!a){ a=[]; chronIndex.set(r.id, a); }
    a.push(r);
  }
  chronBuilt=all.length;
  return chronIndex.get(id)||[];
}
function runsById(id){
  const all=allPokalRuns();
  if (!runIndex || runBuilt>all.length){ runIndex=new Map(); runBuilt=0; }
  for (let i=runBuilt;i<all.length;i++){
    const r=all[i];
    let a=runIndex.get(r.id);
    if (!a){ a=[]; runIndex.set(r.id, a); }
    a.push(r);
  }
  runBuilt=all.length;
  return runIndex.get(id)||[];
}
function historyEntries(id, fromYear){
  const H=window.FR_HISTORY, out=[];
  if (H && H.rows && H.rows[id]){
    H.rows[id].forEach(r=>{
      const season=H.seasons[r[0]];
      if (fromYear && seasonYear(season)<fromYear) return;
      out.push({season, liga:H.ligas[r[1]], ebene:r[2], n:r[3], pl:r[4], pts:r[5]/100, src:'historie'});
    });
  }
  const chron=chronicleById(id);
  if (fromYear){
    for (let i=chron.length-1;i>=0;i--){
      const r=chron[i];
      if (seasonYear(r.season)<fromYear) break;
      out.push({season:r.season, liga:r.liga, ebene:r.ebene, n:r.n, pl:r.pl, pts:r.pts, src:'rechner'});
    }
  } else chron.forEach(r=>out.push({season:r.season, liga:r.liga, ebene:r.ebene, n:r.n, pl:r.pl, pts:r.pts, src:'rechner'}));
  out.sort((a,b)=>a.season<b.season?-1:a.season>b.season?1:0);
  return out;
}
function ansehenInfo(id, endYear, full){
  const end=endYear||windowEndYear();
  if (infoMemoGen!==ansehenGen){ infoMemo.clear(); infoMemoGen=ansehenGen; }
  const cached=infoMemo.get(id+'|'+(full?'f':'w')+'|'+end);
  if (cached) return cached;
  let sw=0, sp=0, n=0;
  const rows=historyEntries(id, full?0:end-29).map(r=>{
    const w=seasonWeight(r.season, end);
    if (w>0){ sw+=w; sp+=w*r.pts; n++; }
    return Object.assign({w}, r);
  });
  const liga=n?sp/sw:null;
  const dfb=pokalPart(id, 'dfb', end, full);
  const land=pokalPart(id, 'land', end, full);
  const value=(liga==null && !dfb.sp && !land.sp) ? null : (liga||0)+dfb.value+land.value;
  const out={end, rows, n, sw, value, liga, dfb, land};
  infoMemo.set(id+'|'+(full?'f':'w')+'|'+end, out);
  return out;
}
function ansehenValue(id){
  const tr=window.FR_TIMING;
  const t0=tr?performance.now():0;
  if (ansehenMemoGen!==ansehenGen){ ansehenMemo.clear(); ansehenMemoGen=ansehenGen; }
  const end=dataEndYear();
  const key=id+'|'+end;
  let v=ansehenMemo.get(key);
  if (v==null){
    const info=ansehenInfo(id, end);
    v=info.value!=null ? info.value : (TEAMS[id].schnitt || 12);
    ansehenMemo.set(key, v);
  }
  if (tr){ tr.ansehenMs+=performance.now()-t0; tr.ansehenN++; }
  return v;
}
// Pokalpunkte: der Rundenwert zählt voll. Über 15 Saisons ist es ein gewichteter
// Schnitt wie bei der Liga (jüngste 5 ×1,5). Jahre ohne Teilnahme zählen 0 und
// stecken im Nenner 17,5. Wer jede Saison die 1. DFB-Runde erreicht, hat +26.
const DFB_ROUND_PTS={'1. Runde':26,'2. Runde':32,'Achtelfinale':38,'Viertelfinale':44,'Halbfinale':50,'Finale':56};
const DFB_TITLE_PTS=4;
function dfbRunPoints(roundName, won){ return (DFB_ROUND_PTS[roundName]||26)+(won?DFB_TITLE_PTS:0); }
// Landespokal: erste Runde 3, jede weitere +2, Sieger +2 gegenüber dem Finalisten.
function landRunPoints(roundNames, roundName, won){
  const names=roundNames||[];
  let idx=names.indexOf(roundName);
  if (idx<0) idx=0;
  return 3+2*idx+(won?2:0);
}
function recomputePokalPoints(){
  const namesOf={};
  (S.seasons||[]).forEach(s=>{
    if (!s.cups||!s.cups.land) return;
    Object.keys(s.cups.land).forEach(bl=>{
      const cup=s.cups.land[bl];
      namesOf[s.name+'|'+bl]=cup.roundNames&&cup.roundNames.length?cup.roundNames:(cup.rounds||[]).map(r=>r.name);
    });
  });
  (S.pokalRuns||[]).forEach(r=>{
    if (r.comp==='dfb') r.pts=dfbRunPoints(r.round, r.won);
    else {
      const names=namesOf[r.season+'|'+(r.bl||'')]||[];
      r.pts=landRunPoints(names.length?names:(r.round?[r.round]:[]), r.round, r.won);
    }
  });
  touchAnsehen();
}
function allPokalRuns(){
  if (S && S.pokalRuns && S.pokalRuns.length) return S.pokalRuns;
  const out=[];
  ((S && S.pokalHistory)||[]).forEach(r=>{
    if (r.dfb) out.push({season:r.season, id:r.dfb, comp:'dfb', round:'Finale', won:true, pts:dfbRunPoints('Finale', true)});
    if (r.land) Object.keys(r.land).forEach(bl=>{
      const id=r.land[bl];
      if (id) out.push({season:r.season, id, comp:'land', bl, round:'Finale', won:true, pts:landRunPoints(null,'Finale',true)});
    });
  });
  return out;
}
function pokalWeight(seasonName, end){
  const y=seasonYear(seasonName);
  if (y>end || y<end-14) return 0;
  return y>=end-4 ? 1.5 : 1;
}
function pokalPart(id, comp, end, full){
  const sw=pokalWindowSum();
  const best={};
  const from=full?0:end-14;
  runsById(id).forEach(r=>{
    if (r.comp!==comp || seasonYear(r.season)<from) return;
    const prev=best[r.season];
    if (!prev || (r.pts||0)>(prev.pts||0)) best[r.season]=r;
  });
  let sp=0;
  const rows=Object.keys(best).map(season=>{
    const r=best[season];
    const w=pokalWeight(season, end);
    if (w>0) sp+=w*(r.pts||0);
    return Object.assign({w}, r);
  });
  rows.sort((a,b)=>seasonYear(a.season)-seasonYear(b.season));
  return {sw, sp, value:sw?sp/sw:0, rows};
}
const POINT_BANDS={1:[81,100],2:[61,80],3:[41,60],4:[26,40],5:[16,25],6:[9,15],7:[4,8]};
function seasonStrengthPoints(ebene, n, place){
  const band=POINT_BANDS[ebene]||[1,3];
  if (n<=1) return band[1];
  return band[0]+(band[1]-band[0])*(n-place)/(n-1);
}
function clubLeagueId(season, id){
  for (const lid in season.leagues) if (season.leagues[lid].teams.includes(id)) return lid;
  for (const pid in season.pools) if ((season.pools[pid]||[]).includes(id)) return pid;
  return '';
}

// Rechnerisch sicher: nur, wenn kein anderes Team die Punktzahl noch erreichen kann.
// Gleiche Punkte gelten nicht als sicher, weil die Tordifferenz offen ist.
function pointsEnvelope(season, lid){
  const lg=season.leagues[lid]; if(!lg) return {};
  if (!lg.md){
    const out={};
    leagueTable(season, lid).forEach(r=>{ out[r.id]={min:r.pkt, max:r.pkt}; });
    return out;
  }
  const rem={}; lg.teams.forEach(id=>rem[id]=0);
  lg.md.forEach(md=>md.forEach(m=>{
    if (m[2]==null||m[3]==null){ rem[lg.teams[m[0]]]++; rem[lg.teams[m[1]]]++; }
  }));
  const out={};
  leagueTable(season, lid).forEach(r=>{ out[r.id]={min:r.pkt, max:r.pkt+3*(rem[r.id]||0)}; });
  return out;
}
function certaintyFromEnv(env, up, down){
  const ids=Object.keys(env), n=ids.length, res={};
  ids.forEach(id=>{
    const t=env[id]; let canPass=0, sureAbove=0;
    ids.forEach(oid=>{
      if (oid===id) return;
      const o=env[oid];
      if (o.max>=t.min) canPass++;
      if (o.min>t.max) sureAbove++;
    });
    res[id] = (up && canPass<up) ? 'up' : (down && sureAbove>=n-down) ? 'down' : '';
  });
  return res;
}
function certaintyMap(season, lid){
  const spec=L[lid]; if(!spec || !spec.up) return {};
  const lg=season.leagues[lid]; if(!lg) return {};
  const table=leagueTable(season, lid);
  const rem={};
  lg.teams.forEach(id=>rem[id]=0);
  if (lg.md) lg.md.forEach(md=>md.forEach(m=>{ if(m[2]==null||m[3]==null){ rem[lg.teams[m[0]]]++; rem[lg.teams[m[1]]]++; } }));
  const threat={};
  if (lg.decide && lg.decide.length){
    const byG={};
    lg.decide.forEach(m=>{ (byG[m.group]||(byG[m.group]=[])).push(m); });
    Object.keys(byG).forEach(g=>{
      if (decideSettled(byG[g])) return;
      byG[g].forEach(m=>{ threat[m.h]=g; threat[m.a]=g; });
    });
  }
  const info=table.map(r=>({id:r.id, pl:r.pl, min:r.pkt, max:r.pkt+3*(rem[r.id]||0), rem:rem[r.id]||0}));
  const res={};
  info.forEach(t=>{
    let worst=0;
    info.forEach(o=>{
      if (o.id===t.id) return;
      if (o.min>t.max) worst++;
      else if (o.max<t.min) {}
      else if (t.rem||o.rem) worst++;
      else if (threat[t.id]!=null && threat[t.id]===threat[o.id]) worst++;
      else if (o.pl<t.pl) worst++;
    });
    if (worst<spec.up) res[t.id]='up';
  });
  return res;
}
// Abstiegszahl dieser Saison. Bis zur 4. Liga fest.
// Regionalliga: zwei Absteiger sind fest, dazu der bisherige Ausgleich (Ankömmlinge aus der 4. Liga + 1),
// weil der Meister geht und aus jeder der beiden Oberligen zwei Vereine nachrücken.
// Oberliga: zwei Aufsteiger sind fest (Plätze 1 und 2). Abstieg nur die Ankömmlinge aus der Regionalliga,
// weil zwei gehen und zwei aus der Amateurliga nachkommen.
function relegationProfile(season, lid){
  const lg=L[lid];
  if (!lg) return {down:0, nominal:0, incoming:[], reason:''};
  const nominal=lg.down||0;
  if (lg.level<=4) return {down:nominal, nominal, incoming:[], reason:''};
  const parent = lg.level===5 ? 'L4' : lg.upTo;
  const parentDown = lg.level===5 ? (L.L4.down||0) : relegationProfile(season, parent).down;
  const incoming = leagueTable(season, parent).slice(-parentDown).map(r=>r.id).filter(id=>homeLeague(id, lg.level)===lid);
  const names = incoming.map(id=>TEAMS[id].name).join(', ');
  const from = lg.level===5 ? 'der 4. Liga' : ('der '+L[parent].name);
  const arrive = incoming.length===0 ? 'kommt niemand' : (incoming.length===1 ? 'kommt '+names : 'kommen '+incoming.length+' Vereine ('+names+')');
  const abText = n=>n===0?'steigt niemand ab':n===1?'steigt eine Mannschaft ab':'steigen '+n+' Mannschaften ab';
  if (lg.level===5){
    const variable=incoming.length+1;
    const down=2+variable;
    const reason='Zwei Absteiger sind fest. Dazu der Ausgleich: Aus '+from+' '+arrive+'. Der Meister steigt in die 4. Liga auf, aus jeder der beiden Oberligen rücken zwei Vereine nach. Damit die Staffel bei '+lg.size+' bleibt, '+abText(down)+' ('+2+' fest und '+variable+' als Ausgleich).';
    return {down, nominal:2, incoming, reason};
  }
  const down=incoming.length;
  const reason='Zwei Aufsteiger sind fest, die Plätze 1 und 2. Aus '+from+' '+arrive+'. Zwei Vereine kommen aus der Amateurliga nach. Damit die Staffel bei '+lg.size+' bleibt, '+abText(down)+'.';
  return {down, nominal:0, incoming, reason};
}
// Abstiegskampf: noch nicht sicher gerettet und noch nicht rechnerisch abgestiegen.
// Sicher erst, wenn mindestens so viele Teams dahinter stehen, wie absteigen, und die auch im besten Fall nicht mehr herankommen.
function relegationBattle(season, lid, mi){
  const down=relegationProfile(season, lid).down||0, lg=season.leagues[lid], n=lg.teams.length;
  const table=mi>0 ? tableBefore(season, lid, mi) : leagueTable(season, lid);
  const env=pointsEnvelope(season, lid);
  const out={};
  table.forEach(r=>{
    const t=env[r.id]||{min:r.pkt, max:r.pkt};
    let behind=0, ahead=0;
    table.forEach(o=>{
      if (o.id===r.id) return;
      const u=env[o.id]||{min:o.pkt, max:o.pkt};
      if (u.max<t.min) behind++;
      if (u.min>t.max) ahead++;
    });
    const dead=!!(down && ahead>=n-down);
    const safe=down ? behind>=down : true;
    const near=r.pl>=n-down-3;
    out[r.id]={pkt:r.pkt, pl:r.pl, battle:!dead && !safe && near && down>0};
  });
  return out;
}

// Spielplan: Kreis/Berger mit kanonischem Heimrecht.
// Die Hinrunde hat insgesamt n-2 Breaks, je Verein höchstens einen.
// Die Rückrunde ist dieselbe Kreisrunde rückwärts, um zwei Spieltage versetzt, Heimrecht getauscht.
// Damit bleibt auch die Rückrunde bei n-2 Breaks, niemand spielt denselben Gegner zweimal hintereinander,
// und über die ganze Saison einschließlich des Übergangs hat kein Verein mehr als zwei Breaks.
// Wer zwei Breaks hat, hat genau einen Heim-Break und einen Auswärts-Break.
// Zufall nur über die Zuordnung Verein → Position, nicht über die Spieltagsreihenfolge.
function bergerRounds(n){
  let t=Array.from({length:n},(_,i)=>i);
  const rounds=[];
  for (let r=0;r<n-1;r++){
    const pairs=[];
    for (let i=0;i<n/2;i++){
      let a=t[i], b=t[n-1-i];
      const homeLeft = i===0 ? r%2===0 : i%2===1;
      if (!homeLeft) [a,b]=[b,a];
      pairs.push([a,b]);
    }
    rounds.push(pairs);
    const rest=t.slice(1);
    rest.push(rest.shift());
    t=[t[0], ...rest];
  }
  return rounds;
}
function returnRoundOrder(n){
  const m=n-1, order=[];
  for (let r=m-3;r>=0;r--) order.push(r);
  order.push(m-1, m-2);
  return order;
}
function breakCount(str){ let b=0; for (let i=1;i<str.length;i++) if (str[i]===str[i-1]) b++; return b; }
function breakKinds(str){
  let hh=0, aa=0;
  for (let i=1;i<str.length;i++) if (str[i]===str[i-1]){ if (str[i]==='H') hh++; else aa++; }
  return {hh, aa};
}
function validateFixtures(md){
  const issues=[];
  if (!md||!md.length||!md[0]) return {ok:false, issues:['leer'], maxBreaks:0, halfBreaks:[0,0]};
  const n=md[0].length*2, half=n-1;
  if (md.length!==half*2) issues.push('Spielfolgenlänge');
  const pairKey=(h,a)=>h<a?h+'-'+a:a+'-'+h;
  const directed=new Set();
  for (const part of [0,1]){
    const seenPairs=new Set();
    for (let r=part*half; r<(part+1)*half && r<md.length; r++){
      const seen=new Set();
      md[r].forEach(m=>{
        if (seen.has(m[0])||seen.has(m[1])) issues.push('doppelt am Spieltag '+(r+1));
        seen.add(m[0]); seen.add(m[1]);
        const key=pairKey(m[0],m[1]);
        if (seenPairs.has(key)) issues.push('Paarung doppelt');
        seenPairs.add(key);
        const dir=m[0]+'>'+m[1];
        if (directed.has(dir)) issues.push('Heimrichtung doppelt');
        directed.add(dir);
      });
      if (seen.size!==n) issues.push('unvollständig '+(r+1));
    }
  }
  for (let t=0;t<n;t++){
    let prev=-1;
    for (let r=0;r<md.length;r++){
      const m=md[r].find(x=>x[0]===t||x[1]===t);
      if (!m){ issues.push('fehlt Spieltag '+(r+1)); break; }
      const opp=m[0]===t?m[1]:m[0];
      if (opp===prev) issues.push('gleicher Gegner am Stück');
      prev=opp;
    }
  }
  const seq=Array.from({length:n},()=>'');
  const halfSeq=[Array.from({length:n},()=>''), Array.from({length:n},()=>'')];
  md.forEach((round,r)=>round.forEach(m=>{
    seq[m[0]]+='H'; seq[m[1]]+='A';
    const part=r<half?0:1;
    halfSeq[part][m[0]]+='H'; halfSeq[part][m[1]]+='A';
  }));
  const breaks=seq.map(breakCount);
  const kinds=seq.map(breakKinds);
  let sameKind=0;
  seq.forEach((s,i)=>{
    if (/HHH|AAA/.test(s)) issues.push('Serie bei '+i);
    if (kinds[i].hh>1 || kinds[i].aa>1){ sameKind++; issues.push('gleichartige Breaks bei '+i); }
  });
  const maxBreaks=breaks.length?Math.max(...breaks):0;
  if (maxBreaks>2) issues.push('Breaks max '+maxBreaks);
  const halfBreaks=[0,1].map(p=>halfSeq[p].reduce((a,s)=>a+breakCount(s),0));
  return {ok:issues.length===0, issues, maxBreaks, breaks, halfBreaks, sameKind, kinds};
}
function makeSchedule(n){
  const rounds=bergerRounds(n);
  const perm=shuffle(Array.from({length:n},(_,i)=>i));
  const hin=rounds.map(ps=>ps.map(([h,a])=>[perm[h],perm[a],null,null]));
  const rueck=returnRoundOrder(n).map(r=>rounds[r].map(([h,a])=>[perm[a],perm[h],null,null]));
  const all=hin.concat(rueck);
  const v=validateFixtures(all);
  if (!v.ok) console.warn('Spielplan-Prüfung', v.issues.slice(0,8));
  return all;
}

// ---------- Zustand ----------
const KEY = 'fussballrechner_v3';
const OLD_KEY = 'fussballrechner_v2';
let S;
function newGame(){
  const season = {name:'2026/27', status:'running', leagues:{}, pools:{}, markers:{}};
  LEAGUES.forEach(l => { const teams=[...window.FR_INITIAL[l.id]].sort(byRang); season.leagues[l.id]={teams, md:makeSchedule(teams.length)}; });
  POOLS.forEach(p => season.pools[p.id] = [...window.FR_INITIAL[p.id]].sort(byRang));
  season.cups = buildCups(season, null);
  return {v:1, created:new Date().toISOString(), seasons:[season], view:0, ui:{league:'BL', tab:'tabelle', md:{}, autoNext:true}};
}
let saveHold=0;
function packRows(rows){
  return (rows||[]).map(r=>[r.id, r.pl, r.sp, r.s, r.u, r.n, r.tg, r.gt, r.pkt, (r.form||[]).join('')]);
}
function unpackRows(rows){
  if (!rows || !rows.length || !Array.isArray(rows[0])) return rows||[];
  return rows.map(r=>({id:r[0], pl:r[1], sp:r[2], s:r[3], u:r[4], n:r[5], tg:r[6], gt:r[7], pkt:r[8], diff:r[6]-r[7], form:r[9]?String(r[9]).split(''):[]}));
}
function packMatch(m){
  if (!m || Array.isArray(m)) return m;
  const slot=m.slot? [m.slot.dow||'', m.slot.time||'', m.slot.kind||'', m.slot.kracher?1:0] : null;
  return [m.h, m.a, m.hg, m.ag, m.et?1:0, m.peh==null?null:m.peh, m.pea==null?null:m.pea, m.neutral?1:0, slot];
}
function unpackMatch(m){
  if (!m || !Array.isArray(m)) return m;
  const slot=m[8];
  return {h:m[0], a:m[1], hg:m[2], ag:m[3], et:!!m[4], peh:m[5], pea:m[6], neutral:!!m[7], slot:slot?{dow:slot[0], time:slot[1], kind:slot[2]||'', kracher:!!slot[3]}:null};
}
function packCup(cup){
  if (!cup) return cup;
  const rounds=(cup.rounds||[]).map(r=>{
    const out={name:r.name, drawn:!!r.drawn, neutral:!!r.neutral, byes:r.byes||[], matches:(r.matches||[]).map(packMatch)};
    if (r.archived) out.archived=true;
    return out;
  });
  const out={id:cup.id, name:cup.name, kind:cup.kind, bl:cup.bl, entrants:cup.entrants, pro:cup.pro, amateur:cup.amateur, spots:cup.spots, rounds};
  if (cup.roundNames) out.roundNames=cup.roundNames;
  if (cup.archived) out.archived=true;
  return out;
}
function unpackCup(cup){
  if (!cup || !cup.rounds) return cup;
  cup.rounds.forEach(r=>{ if (r.matches) r.matches=r.matches.map(unpackMatch); });
  return cup;
}
function packCups(cups){
  if (!cups) return cups;
  const land={};
  if (cups.land) for (const bl in cups.land) land[bl]=packCup(cups.land[bl]);
  return {dfb:packCup(cups.dfb), land};
}
function unpackCups(cups){
  if (!cups) return cups;
  unpackCup(cups.dfb);
  if (cups.land) for (const bl in cups.land) unpackCup(cups.land[bl]);
  return cups;
}
function packSeason(s){
  if (!s || !s.compact) return s;
  const leagues={};
  for (const id in s.leagues){
    const lg=s.leagues[id];
    const tables={};
    if (lg.tables) ['all','home','away','hin','rueck'].forEach(k=>{ if (lg.tables[k]) tables[k]=packRows(lg.tables[k]); });
    leagues[id]={teams:lg.teams, tables};
  }
  let end=null;
  if (s.endData) end={moves:s.endData.moves, notes:s.endData.notes, need:s.endData.need, picks:s.endData.picks, step:s.endData.step, downOf:s.endData.downOf};
  const out={name:s.name, status:s.status, compact:true, absorbed:!!s.absorbed, leagues, pools:s.pools, markers:s.markers, endData:end, cups:packCups(s.cups), supercup:s.supercup};
  if (s.slim) out.slim=s.slim;
  if (s.lgStat) out.lgStat=1;
  if (s.h2h && s.h2h.length) out.h2h=s.h2h;
  if (s.fx) out.fx=s.fx;
  return out;
}
function packRun(r){
  const row=[r.season, r.id, r.comp, r.bl||'', r.round, r.won?1:0];
  if (r.opp) row.push(r.opp, r.home?1:0, r.hg, r.ag, r.et?1:0, r.peh==null?'':r.peh, r.pea==null?'':r.pea);
  return row;
}
function unpackRun(r){
  const o={season:r[0], id:r[1], comp:r[2], bl:r[3]||'', round:r[4], won:!!r[5], pts:0};
  if (r[6]){
    o.opp=r[6]; o.home=!!r[7]; o.hg=r[8]; o.ag=r[9]; o.et=!!r[10];
    o.peh=r[11]===''||r[11]==null?null:r[11];
    o.pea=r[12]===''||r[12]==null?null:r[12];
  }
  return o;
}
function packForDisk(state){
  return {
    v:state.v||1, packed:2, created:state.created, view:state.view, ui:state.ui,
    chronicle:(state.chronicle||[]).map(c=>[c.season, c.id, c.liga, c.ebene, c.n, c.pl, c.pts]),
    pokalRuns:(state.pokalRuns||[]).map(packRun),
    pokalHistory:state.pokalHistory||[],
    seasons:(state.seasons||[]).map(packSeason),
    stats:packStats(state.stats),
    h2hBlocks:state.h2hBlocks||[],
    h2hFold:state.h2hFold|0
  };
}
function unpackState(d){
  if (!d || !d.packed) return d;
  if (Array.isArray(d.chronicle) && d.chronicle.length && Array.isArray(d.chronicle[0])){
    d.chronicle=d.chronicle.map(c=>({season:c[0], id:c[1], liga:c[2], ebene:c[3], n:c[4], pl:c[5], pts:c[6]}));
  }
  if (Array.isArray(d.pokalRuns) && d.pokalRuns.length && Array.isArray(d.pokalRuns[0])){
    d.pokalRuns=d.pokalRuns.map(unpackRun);
  }
  if (d.stats && Array.isArray(d.stats.c)){
    const c={}, p={};
    d.stats.c.forEach(r=>{ const b=c[r[0]]||(c[r[0]]={}); b[r[1]]={sp:r[2], s:r[3], u:r[4], n:r[5], tg:r[6], gt:r[7], pkt:r[8]}; });
    d.stats.p.forEach(r=>{ const b=p[r[0]]||(p[r[0]]={}); b[r[1]]={sp:r[2], sL:r[3], u:r[4], gfL:r[5], gfH:r[6]}; });
    d.stats={c, p};
  }
  (d.seasons||[]).forEach(s=>{
    if (!s || !s.compact || !s.leagues) return;
    for (const id in s.leagues){
      const lg=s.leagues[id];
      if (!lg.tables) continue;
      for (const k in lg.tables) lg.tables[k]=unpackRows(lg.tables[k]);
    }
    if (s.cups) unpackCups(s.cups);
    if (s.endData && !s.endData.tables){
      s.endData.tables={};
      for (const id in s.leagues){
        const rows=s.leagues[id].tables && s.leagues[id].tables.all;
        if (rows) s.endData.tables[id]=rows.map(r=>({id:r.id, pl:r.pl, sp:r.sp, s:r.s, u:r.u, n:r.n, tg:r.tg, gt:r.gt, pkt:r.pkt}));
      }
    }
  });
  return d;
}
function parseSave(raw){
  if (!raw) return null;
  try{
    const d=unpackState(typeof raw==='string'?JSON.parse(raw):raw);
    if (d && d.seasons && d.seasons.length && structureOk(d)) return d;
  }catch(e){}
  return null;
}
let idbPromise=null;
function idbOpen(){
  if (!idbPromise) idbPromise=new Promise((resolve, reject)=>{
    if (!window.indexedDB){ reject(new Error('no idb')); return; }
    const req=indexedDB.open('fussballrechner', 1);
    req.onupgradeneeded=()=>{ const db=req.result; if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv'); };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  return idbPromise;
}
function idbGet(key){
  return idbOpen().then(db=>new Promise((resolve, reject)=>{
    const tx=db.transaction('kv','readonly');
    const q=tx.objectStore('kv').get(key);
    q.onsuccess=()=>resolve(q.result==null?null:q.result);
    q.onerror=()=>reject(q.error);
  }));
}
function idbSet(key, val){
  return idbOpen().then(db=>new Promise((resolve, reject)=>{
    const tx=db.transaction('kv','readwrite');
    tx.objectStore('kv').put(val, key);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  }));
}
function idbMany(keys){
  if (!keys.length) return Promise.resolve([]);
  return idbOpen().then(db=>new Promise((resolve, reject)=>{
    const tx=db.transaction('kv','readonly');
    const store=tx.objectStore('kv');
    const out=new Array(keys.length);
    let left=keys.length;
    keys.forEach((k,i)=>{
      const q=store.get(k);
      q.onsuccess=()=>{ out[i]=q.result==null?null:q.result; if (--left===0) resolve(out); };
      q.onerror=()=>reject(q.error);
    });
  }));
}
function idbPutMany(pairs){
  if (!pairs.length) return Promise.resolve();
  return idbOpen().then(db=>new Promise((resolve, reject)=>{
    const tx=db.transaction('kv','readwrite');
    const store=tx.objectStore('kv');
    pairs.forEach(([k,v])=>store.put(v, k));
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  }));
}
function idbDelMany(keys){
  if (!keys.length) return Promise.resolve();
  return idbOpen().then(db=>new Promise((resolve, reject)=>{
    const tx=db.transaction('kv','readwrite');
    const store=tx.objectStore('kv');
    keys.forEach(k=>store.delete(k));
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  }));
}
const SPLIT='frsplit:';
const diskToken=new WeakMap();
let saveChain=Promise.resolve();
let saveQueued=0;
let chronSaved=0, runsSaved=0, chronKeys=[], runKeys=[], h2hDiskLen=[];
function seasonDiskToken(s){
  return (s.slim||'')+'|'+(s.status||'')+'|'+(s.compact?1:0)+'|'+(s.h2h?s.h2h.length:0)+'|'+(s.lgStat?1:0)+'|'+(s.fx?1:0);
}
function rememberDisk(state){
  chronSaved=(state.chronicle||[]).length;
  runsSaved=(state.pokalRuns||[]).length;
  h2hDiskLen=(state.h2hBlocks||[]).map(s=>s.length);
  (state.seasons||[]).forEach((s,i)=>{ if (i<state.seasons.length-1) diskToken.set(s, seasonDiskToken(s)); });
}
function loadSplit(meta){
  chronKeys=(meta.chronKeys||[]).slice();
  runKeys=(meta.runKeys||[]).slice();
  const keys=[];
  for (let i=0;i<meta.n;i++) keys.push(SPLIT+'s:'+i);
  chronKeys.forEach(k=>keys.push(SPLIT+'c:'+k));
  runKeys.forEach(k=>keys.push(SPLIT+'r:'+k));
  const h2hN=meta.h2hN|0;
  for (let i=0;i<h2hN;i++) keys.push(SPLIT+'h:'+i);
  return idbMany(keys).then(vals=>{
    const seasons=vals.slice(0, meta.n);
    let p=meta.n;
    const chronicle=[];
    chronKeys.forEach(()=>{ (vals[p++]||[]).forEach(row=>chronicle.push(row)); });
    const pokalRuns=[];
    runKeys.forEach(()=>{ (vals[p++]||[]).forEach(row=>pokalRuns.push(row)); });
    const h2hBlocks=[];
    for (let i=0;i<h2hN;i++) h2hBlocks.push(vals[p++]||'');
    const d={v:meta.v, packed:2, created:meta.created, view:meta.view, ui:meta.ui, stats:meta.stats, pokalHistory:meta.pokalHistory||[], h2hBlocks, h2hFold:meta.h2hFold|0, seasons, chronicle, pokalRuns};
    const state=unpackState(d);
    rememberDisk(state);
    return state;
  });
}
function doSave(){
  ageSeasons();
  const tr=window.FR_TIMING;
  const t0=tr?performance.now():0;
  const writes=[], mark=[];
  S.seasons.forEach((s,i)=>{
    const token=seasonDiskToken(s);
    const last=i===S.seasons.length-1;
    if (!last && diskToken.get(s)===token) return;
    writes.push([SPLIT+'s:'+i, packSeason(s)]);
    if (!last) mark.push([s, token]);
  });
  const chronSaved0=chronSaved, runsSaved0=runsSaved, keysC0=chronKeys.slice(), keysR0=runKeys.slice(), h2hDisk0=h2hDiskLen.slice();
  const blocks=S.h2hBlocks||[];
  blocks.forEach((raw,i)=>{ if (h2hDiskLen[i]!==raw.length) writes.push([SPLIT+'h:'+i, raw]); });
  const chron=S.chronicle||[];
  if (chron.length<chronSaved){ chronSaved=0; chronKeys=[]; }
  if (chron.length>chronSaved){
    writes.push([SPLIT+'c:'+chronSaved, chron.slice(chronSaved).map(c=>[c.season, c.id, c.liga, c.ebene, c.n, c.pl, c.pts])]);
    chronKeys.push(chronSaved);
  }
  const runs=S.pokalRuns||[];
  if (runs.length<runsSaved){ runsSaved=0; runKeys=[]; }
  if (runs.length>runsSaved){
    writes.push([SPLIT+'r:'+runsSaved, runs.slice(runsSaved).map(packRun)]);
    runKeys.push(runsSaved);
  }
  const meta={split:1, v:S.v||1, packed:2, created:S.created, view:S.view, ui:S.ui, stats:packStats(S.stats), pokalHistory:S.pokalHistory||[], n:S.seasons.length, chronKeys:chronKeys.slice(), runKeys:runKeys.slice(), h2hN:blocks.length, h2hFold:S.h2hFold|0};
  writes.push([SPLIT+'meta', meta]);
  const chronAt=chron.length, runsAt=runs.length, keysC=chronKeys.slice(), keysR=runKeys.slice();
  if (tr){ tr.packMs=(tr.packMs||0)+performance.now()-t0; tr.saves=(tr.saves||0)+1; tr.parts=writes.length; }
  const t1=tr?performance.now():0;
  return idbGet(SPLIT+'meta').then(prev=>{
    const dels=[];
    if (prev){
      for (let i=S.seasons.length;i<(prev.n||0);i++) dels.push(SPLIT+'s:'+i);
      (prev.chronKeys||[]).forEach(k=>{ if (keysC.indexOf(k)<0) dels.push(SPLIT+'c:'+k); });
      (prev.runKeys||[]).forEach(k=>{ if (keysR.indexOf(k)<0) dels.push(SPLIT+'r:'+k); });
      for (let i=(S.h2hBlocks||[]).length;i<(prev.h2hN||0);i++) dels.push(SPLIT+'h:'+i);
    }
    return idbDelMany(dels).then(()=>idbPutMany(writes));
  }).then(()=>{
    mark.forEach(([s,token])=>diskToken.set(s, token));
    chronSaved=chronAt; runsSaved=runsAt;
    h2hDiskLen=(S.h2hBlocks||[]).map(s=>s.length);
    if (tr) tr.writeMs=(tr.writeMs||0)+performance.now()-t1;
    try{ localStorage.removeItem(KEY); }catch(e){}
  }).catch(err=>{
    chronSaved=chronSaved0; runsSaved=runsSaved0; chronKeys=keysC0; runKeys=keysR0; h2hDiskLen=h2hDisk0;
    try {
      const json=JSON.stringify(packForDisk(S));
      localStorage.setItem(KEY, json);
      if (tr){ tr.writeMs=(tr.writeMs||0)+performance.now()-t1; tr.bytes=json.length; tr.fallback=1; }
    } catch(e){
      alert('Speichern im Browser fehlgeschlagen ('+(e&&e.name||err)+'). Bitte den Spielstand exportieren, damit nichts verloren geht.');
    }
  });
}
function save(){
  if (saveHold){ saveHold=2; return saveChain; }
  saveQueued++;
  const run=()=>{ saveQueued--; if (saveQueued>0) return; return doSave(); };
  saveChain=saveChain.then(run, run);
  return saveChain;
}
function whenSaved(){ return saveChain; }
function load(){
  try { return parseSave(localStorage.getItem(KEY)); } catch(e){ return null; }
}
function structureOk(d){
  const s=d&&d.seasons&&d.seasons[d.seasons.length-1];
  if(!s||!s.leagues||s.leagues.L5NO||s.leagues.L5SW) return false;
  return LEAGUES.every(l=>s.leagues[l.id]&&s.leagues[l.id].teams&&s.leagues[l.id].teams.length===l.size);
}
const cur = () => S.seasons[S.view];
const latest = () => S.seasons[S.seasons.length-1];
const isEditable = () => S.view === S.seasons.length-1 && cur().status === 'running';

// ---------- Tabellen-Berechnung ----------
function matchesOf(season, lid, filt){
  const lg = season.leagues[lid]; if (!lg || !lg.md) return [];
  const half = lg.teams.length-1, out=[];
  lg.md.forEach((md,mi) => {
    if (filt==='hin' && mi>=half) return;
    if (filt==='rueck' && mi<half) return;
    md.forEach(m => { if (m[2]!=null && m[3]!=null) out.push({md:mi, h:lg.teams[m[0]], a:lg.teams[m[1]], hg:m[2], ag:m[3]}); });
  });
  return out;
}
function emptyRow(id){ return {id, sp:0,s:0,u:0,n:0,tg:0,gt:0,pkt:0,aw:0,form:[]}; }
function addRes(r, gf, ga, md, away){
  r.sp++; r.tg+=gf; r.gt+=ga;
  if (away) r.aw+=gf;
  const res = gf>ga?'S':gf<ga?'N':'U';
  if (res==='S'){r.s++; r.pkt+=3;} else if (res==='U'){r.u++; r.pkt+=1;} else r.n++;
  r.form.push([md,res]);
}
function h2hStats(ids, matches){
  const set=new Set(ids), mini={};
  ids.forEach(id=>{ mini[id]={pkt:0,tg:0,gt:0,aw:0}; });
  matches.forEach(m=>{
    if (!set.has(m.h) || !set.has(m.a) || m.hg==null || m.ag==null) return;
    const H=mini[m.h], A=mini[m.a];
    H.tg+=m.hg; H.gt+=m.ag;
    A.tg+=m.ag; A.gt+=m.hg; A.aw+=m.ag;
    if (m.hg>m.ag) H.pkt+=3;
    else if (m.ag>m.hg) A.pkt+=3;
    else { H.pkt++; A.pkt++; }
  });
  return mini;
}
function tieSig(r){
  return [r.pkt, r.diff, r.tg, r.h2hP||0, r.h2hD||0, r.h2hG||0, r.h2hA||0, r.aw||0].join(',');
}
function computeTable(teamIds, matches, mode){
  const rows = {}; teamIds.forEach(id => rows[id]=emptyRow(id));
  matches.forEach(m => {
    if (mode!=='away' && rows[m.h]) addRes(rows[m.h], m.hg, m.ag, m.md, false);
    if (mode!=='home' && rows[m.a]) addRes(rows[m.a], m.ag, m.hg, m.md, true);
  });
  let list = Object.values(rows);
  list.forEach(r => { r.diff=r.tg-r.gt; r.form.sort((a,b)=>a[0]-b[0]); r.form=r.form.slice(-5).map(f=>f[1]); });
  const base = (a,b) => b.pkt-a.pkt || b.diff-a.diff || b.tg-a.tg;
  list.sort(base);
  const out=[]; let i=0;
  while (i<list.length){
    let j=i+1; while (j<list.length && base(list[i],list[j])===0) j++;
    let grp = list.slice(i,j);
    if (grp.length>1){
      const mini=h2hStats(grp.map(r=>r.id), matches);
      grp.forEach(r=>{
        const x=mini[r.id];
        r.h2hP=x.pkt; r.h2hD=x.tg-x.gt; r.h2hG=x.tg; r.h2hA=x.aw;
      });
      grp.sort((a,b)=> b.h2hP-a.h2hP || b.h2hD-a.h2hD || b.h2hG-a.h2hG || b.h2hA-a.h2hA || b.aw-a.aw || a.id.localeCompare(b.id));
    }
    grp.forEach(r=>{ r.tieSig=tieSig(r); });
    out.push(...grp); i=j;
  }
  out.forEach((r,k)=>r.pl=k+1);
  return out;
}
function leagueFinished(season, lid){
  const lg=season.leagues[lid]; if (!lg) return false;
  if (season.compact || !lg.md) return !!season.compact;
  return lg.md.every(md=>md.every(m=>m[2]!=null && m[3]!=null));
}
function twoLegWinner(leg1, leg2){
  if (!leg1 || !leg2 || leg1.hg==null || leg1.ag==null || leg2.hg==null || leg2.ag==null) return null;
  const goals=id=>(leg1.h===id?leg1.hg:leg1.ag)+(leg2.h===id?leg2.hg:leg2.ag);
  const A=leg1.h, B=leg1.a, ga=goals(A), gb=goals(B);
  if (ga!==gb) return ga>gb ? A : B;
  if (leg2.peh!=null && leg2.pea!=null && leg2.peh!==leg2.pea) return leg2.peh>leg2.pea ? leg2.h : leg2.a;
  return null;
}
function aggregateLevel(leg1, leg2){
  if (!leg1 || !leg2 || leg1.hg==null || leg2.hg==null) return false;
  const goals=id=>(leg1.h===id?leg1.hg:leg1.ag)+(leg2.h===id?leg2.hg:leg2.ag);
  return goals(leg1.h)===goals(leg1.a);
}
function rankPlayoff(ids, ms){
  if (ids.length===2){
    const w=twoLegWinner(ms.find(m=>m.leg===1), ms.find(m=>m.leg===2));
    if (!w) return null;
    return [w, w===ids[0]?ids[1]:ids[0]];
  }
  const rows={};
  ids.forEach(id=>{ rows[id]={id, pkt:0, gd:0, gf:0}; });
  ms.forEach(m=>{
    if (m.hg==null || m.ag==null) return;
    rows[m.h].gf+=m.hg; rows[m.h].gd+=m.hg-m.ag;
    rows[m.a].gf+=m.ag; rows[m.a].gd+=m.ag-m.hg;
    if (m.hg>m.ag) rows[m.h].pkt+=3;
    else if (m.ag>m.hg) rows[m.a].pkt+=3;
    else { rows[m.h].pkt++; rows[m.a].pkt++; }
  });
  const list=ids.map(id=>rows[id]);
  list.sort((a,b)=>{
    const c=b.pkt-a.pkt || b.gd-a.gd || b.gf-a.gf;
    if (c) return c;
    const pair=ms.filter(m=>(m.h===a.id&&m.a===b.id)||(m.h===b.id&&m.a===a.id));
    const w=twoLegWinner(pair.find(m=>m.leg===1), pair.find(m=>m.leg===2));
    if (w===a.id) return -1;
    if (w===b.id) return 1;
    return a.id.localeCompare(b.id);
  });
  return list.map(r=>r.id);
}
function decideSettled(matches){
  if (!matches || !matches.length) return true;
  if (matches.some(m=>m.hg==null || m.ag==null)) return false;
  const keys=[...new Set(matches.map(m=>m.key))];
  return keys.every(key=>{
    const pair=matches.filter(m=>m.key===key);
    return !!twoLegWinner(pair.find(m=>m.leg===1), pair.find(m=>m.leg===2));
  });
}
function applyDecide(season, lid, rows){
  const lg=season.leagues[lid];
  if (!lg || !lg.decide || !lg.decide.length || !decideSettled(lg.decide)) return rows;
  const byG={};
  lg.decide.forEach(m=>{ (byG[m.group]||(byG[m.group]=[])).push(m); });
  const out=rows.map(r=>Object.assign({}, r));
  Object.keys(byG).forEach(g=>{
    const ms=byG[g];
    const members=[...new Set(ms.flatMap(m=>[m.h, m.a]))];
    const ranked=rankPlayoff(members, ms);
    if (!ranked) return;
    const map={};
    out.forEach(r=>{ map[r.id]=r; });
    const idx=out.map((r,i)=>members.includes(r.id)?i:-1).filter(i=>i>=0);
    idx.forEach((at,k)=>{ if (map[ranked[k]]) out[at]=Object.assign({}, map[ranked[k]]); });
  });
  out.forEach((r,i)=>r.pl=i+1);
  return out;
}
function leagueTable(season, lid, mode, filt){
  const lg=season.leagues[lid];
  if (lg && lg.tables && !lg.md){
    const key=filt==='hin'?'hin':filt==='rueck'?'rueck':mode==='home'?'home':mode==='away'?'away':'all';
    const rows=lg.tables[key]||lg.tables.all||[];
    return rows.map(r=>Object.assign({}, r, {form:(r.form||[]).slice()}));
  }
  const rows=computeTable(lg.teams, matchesOf(season,lid,filt), mode||'all');
  if ((mode && mode!=='all') || filt) return rows;
  return applyDecide(season, lid, rows);
}
function syncDecide(season, lid){
  const lg=season.leagues[lid]; if (!lg) return;
  if (!leagueFinished(season, lid)){ if (lg.decide) delete lg.decide; return; }
  const table=computeTable(lg.teams, matchesOf(season, lid), 'all');
  const groups=[];
  for (let i=0;i<table.length;){
    let j=i+1;
    while (j<table.length && table[j].tieSig===table[i].tieSig) j++;
    if (j-i>1) groups.push(table.slice(i,j).map(r=>r.id));
    i=j;
  }
  if (!groups.length){ delete lg.decide; return; }
  const old=lg.decide||[];
  const slot=finalSaturdaySlot(lid);
  const next=[];
  groups.forEach((ids, gi)=>{
    for (let a=0;a<ids.length;a++) for (let b=a+1;b<ids.length;b++){
      const x=ids[a], y=ids[b], key=x<y?x+'|'+y:y+'|'+x;
      let leg1=old.find(m=>m.key===key && m.leg===1);
      let leg2=old.find(m=>m.key===key && m.leg===2);
      if (!leg1 || !leg2){
        const home=Math.random()<0.5?x:y, away=home===x?y:x;
        leg1={key, leg:1, h:home, a:away, hg:null, ag:null, et:false, peh:null, pea:null, slot, group:gi};
        leg2={key, leg:2, h:away, a:home, hg:null, ag:null, et:false, peh:null, pea:null, slot, group:gi};
      } else { leg1.group=gi; leg2.group=gi; leg1.slot=slot; leg2.slot=slot; }
      next.push(leg1, leg2);
    }
  });
  lg.decide=next;
}
function decidePending(season){
  return LEAGUES.some(l=>{
    const d=season.leagues[l.id] && season.leagues[l.id].decide;
    return d && d.length && !decideSettled(d);
  });
}
function fixedPlaces(season, lid){
  const lg=season.leagues[lid]; if (!lg) return {};
  const table=leagueTable(season, lid);
  const rem={};
  lg.teams.forEach(id=>rem[id]=0);
  if (!lg.md){ const fixed={}; table.forEach(r=>{ fixed[r.pl]=r.id; }); return fixed; }
  lg.md.forEach(md=>md.forEach(m=>{ if (m[2]==null||m[3]==null){ rem[lg.teams[m[0]]]++; rem[lg.teams[m[1]]]++; } }));
  const info=table.map(r=>({id:r.id, pl:r.pl, min:r.pkt, max:r.pkt+3*(rem[r.id]||0), rem:rem[r.id]||0}));
  const fixed={};
  info.forEach(t=>{
    const overlap=info.some(o=>o.id!==t.id && o.max>=t.min && t.max>=o.min);
    if (!overlap){
      const ahead=info.filter(o=>o.min>t.max).length;
      fixed[ahead+1]=t.id;
    }
  });
  if (info.every(t=>t.rem===0)){
    const pending=new Set();
    if (!decideSettled(lg.decide)) (lg.decide||[]).forEach(m=>{ pending.add(m.h); pending.add(m.a); });
    table.forEach(r=>{ if (!pending.has(r.id)) fixed[r.pl]=r.id; });
  }
  return fixed;
}
function leagueProgress(season, lid){
  const lg=season.leagues[lid]; if (!lg) return {done:0,total:0};
  if (!lg.md){ const n=lg.teams.length, total=n*(n-1); return {done:total, total}; }
  let done=0,total=0; lg.md.forEach(md=>md.forEach(m=>{total++; if(m[2]!=null&&m[3]!=null) done++;})); return {done,total};
}
function seasonProgress(season){ let d=0,t=0; LEAGUES.forEach(l=>{const p=leagueProgress(season,l.id); d+=p.done; t+=p.total;}); return {done:d,total:t}; }
function zoneOf(lg, pl, n, down){
  if (!lg) return '';
  const d = down==null ? (lg.down||0) : down;
  if (lg.id==='BL'){
    if (pl>n-lg.down) return 'ab';
    if (pl===1) return 'meister';
    if (pl<=4) return 'cl';
    if (pl<=6) return 'el';
    if (pl===7) return 'ecl';
    return '';
  }
  if (lg.up && pl<=lg.up) return 'auf';
  if (d && pl>n-d) return 'ab';
  return '';
}

// ---------- Simulation (optional) ----------
function poisson(l){ const L0=Math.exp(-l); let k=0,p=1; do{k++;p*=Math.random();}while(p>L0); return k-1; }
function simStrength(id){
  const base=TEAMS[id].schnitt??50;
  const an=ansehenValue(id);
  if (an==null || !isFinite(an)) return base;
  return base*0.8+an*0.2;
}
function simMatch(h,a){
  const sh=simStrength(h), sa=simStrength(a), d=(sh-sa)/10;
  return [Math.min(9,poisson(Math.max(.25,1.5*Math.exp(.25*d)))), Math.min(9,poisson(Math.max(.2,1.15*Math.exp(-.25*d))))];
}
function simLeague(season, lid, mdIdx){
  const lg=season.leagues[lid]; let c=0;
  const fill=mi=>{ if(!isScheduled(season,lid,mi)) return; lg.md[mi].forEach(m=>{ if(m[2]==null||m[3]==null){const r=simMatch(lg.teams[m[0]],lg.teams[m[1]]); m[2]=r[0]; m[3]=r[1]; c++;} }); };
  if (mdIdx!=null){ fill(mdIdx); maybeAdvance(season, lid); return c; }
  if (lastScheduled(season, lid)<0) scheduleNextBlock(season, lid);
  for (let guard=0; guard<80; guard++){
    const last=lastScheduled(season, lid);
    if (last<0) break;
    for (let mi=0; mi<=last; mi++) fill(mi);
    if (!maybeAdvance(season, lid)) break;
  }
  return c;
}
function simDecide(season, lid){
  syncDecide(season, lid);
  const lg=season.leagues[lid]; if (!lg || !lg.decide) return 0;
  let c=0;
  [1,2].forEach(leg=>{
    lg.decide.filter(m=>m.leg===leg).forEach(m=>{
      if (m.hg!=null && m.ag!=null) return;
      const r=simMatch(m.h, m.a);
      m.hg=r[0]; m.ag=r[1]; m.et=false; m.peh=null; m.pea=null;
      if (leg===2){
        const leg1=lg.decide.find(x=>x.key===m.key && x.leg===1);
        if (aggregateLevel(leg1, m)){
          if (m.hg!==m.ag && Math.random()<0.5){ m.et=true; }
          if (aggregateLevel(leg1, m)){
            let peh=3+Math.floor(Math.random()*4), pea=3+Math.floor(Math.random()*4);
            if (peh===pea) peh++;
            if (simStrength(m.h)<simStrength(m.a)) [peh,pea]=[pea,peh];
            m.peh=peh; m.pea=pea;
          }
        }
      }
      c++;
    });
  });
  lg.decide.filter(m=>m.leg===2).forEach(m=>{
    const leg1=lg.decide.find(x=>x.key===m.key && x.leg===1);
    if (twoLegWinner(leg1, m) || !aggregateLevel(leg1, m)) return;
    let peh=3+Math.floor(Math.random()*4), pea=3+Math.floor(Math.random()*4);
    if (peh===pea) peh++;
    if (simStrength(m.h)<simStrength(m.a)) [peh,pea]=[pea,peh];
    m.peh=peh; m.pea=pea; m.et=false;
    c++;
  });
  return c;
}
function simSeason(season){
  const tr=window.FR_TIMING;
  let c=0;
  const t0=tr?performance.now():0;
  LEAGUES.forEach(l=>{ c+=simLeague(season, l.id); c+=simDecide(season, l.id); });
  if (tr) tr.leagueMs=(tr.leagueMs||0)+performance.now()-t0;
  const t1=tr?performance.now():0;
  c += simAllCups(season);
  if (tr) tr.cupMs=(tr.cupMs||0)+performance.now()-t1;
  c += simSupercup(season);
  return c;
}
function blockRangeOf(n, mi){
  let from=0;
  while (from< (n-1)*2){
    const range=nextBlockRange(n, from);
    if (!range) return null;
    if (mi>=range[0] && mi<=range[1]) return range;
    from=range[1]+1;
  }
  return null;
}
function simBlock(season, lid){
  const lg=season.leagues[lid]; if(!lg) return 0;
  const n=lg.teams.length;
  const mi=currentMd(season, lid);
  if (!isScheduled(season, lid, mi)){
    if (mi!==lastScheduled(season, lid)+1) return 0;
    scheduleNextBlock(season, lid);
    if (!isScheduled(season, lid, mi)) return 0;
  }
  const range=blockRangeOf(n, mi); if(!range) return 0;
  let c=0;
  for (let i=range[0];i<=range[1];i++) c+=simLeague(season, lid, i);
  return c;
}

// ---------- Saisonabschluss ----------
function computeTransition(season){
  const tables={}, moves=[], notes=[], newT={}, prof={}, downOf={};
  LEAGUES.forEach(l => { newT[l.id]=[]; prof[l.id]=relegationProfile(season, l.id); downOf[l.id]=prof[l.id].down; });
  const pools={}; POOLS.forEach(p=>pools[p.id]=[...season.pools[p.id]]);
  LEAGUES.forEach(l => {
    const t = leagueTable(season, l.id, 'all');
    tables[l.id] = t.map(r=>({id:r.id,pl:r.pl,sp:r.sp,s:r.s,u:r.u,n:r.n,tg:r.tg,gt:r.gt,pkt:r.pkt}));
    const ids=t.map(r=>r.id), n=ids.length, down=downOf[l.id];
    ids.forEach((id,k)=>{
      const pl=k+1;
      if (l.up && pl<=l.up){ newT[l.upTo].push(id); moves.push({id,from:l.id,to:l.upTo,type:'auf',pl}); }
      else if (down && pl>n-down){ const to=homeLeague(id,l.level+1); (L[to]?newT[to]:pools[to]).push(id); moves.push({id,from:l.id,to,type:'ab',pl}); }
      else newT[l.id].push(id);
    });
    if (l.level>=5 && down!==l.down) notes.push(l.name+': '+down+' Absteiger statt '+l.down+'. '+prof[l.id].reason);
  });
  const need={};
  LEAGUES.filter(l=>l.level===6).forEach(l=>{ need[l.id]=Math.max(0, l.size-newT[l.id].length); });
  return {tables, moves, notes, newT, pools, need, picks:{}, step:1, downOf};
}
function startSeasonEnd(){
  const s=latest();
  if (decidePending(s)){ alert('Die Entscheidungsspiele sind noch nicht beendet. Der Saisonwechsel wartet darauf.'); return; }
  if (supercupPending(s)){ alert('Der Supercup dieser Saison ist noch nicht entschieden.'); return; }
  s.endData = computeTransition(s); s.status='ending'; S.view=S.seasons.length-1; S.ui.tab='aufab'; save(); render();
}
function cancelSeasonEnd(){ const s=latest(); delete s.endData; s.status='running'; S.ui.tab='tabelle'; save(); render(); }
function suggestPicks(e){
  POOLS.forEach(p=>{ const need=e.need[p.ol]; e.picks[p.ol]=[...e.pools[p.id]].filter(id=>!e.moves.some(m=>m.id===id&&m.type==='ab'&&L[m.from]&&L[m.from].level===6)).sort(byRang).slice(0,need); });
}
function snapRows(rows){
  return rows.map(r=>({id:r.id, pl:r.pl, sp:r.sp, s:r.s, u:r.u, n:r.n, tg:r.tg, gt:r.gt, diff:r.diff, pkt:r.pkt, form:(r.form||[]).slice()}));
}
function packStats(st){
  if (!st) return {c:[], p:[]};
  const c=[], p=[];
  for (const id in st.c||{}) for (const comp in st.c[id]){
    const b=st.c[id][comp];
    c.push([id, comp, b.sp, b.s, b.u, b.n, b.tg, b.gt, b.pkt]);
  }
  for (const key in st.p||{}) for (const comp in st.p[key]){
    const b=st.p[key][comp];
    if (!b.sp) continue;
    p.push([key, comp, b.sp, b.sL, b.u, b.gfL, b.gfH]);
  }
  return {c, p};
}
function ensureStats(){ if (!S.stats) S.stats={c:{}, p:{}}; return S.stats; }
function clubBucket(id, comp){
  const c=ensureStats().c;
  const row=c[id]||(c[id]={});
  return row[comp]||(row[comp]={sp:0,s:0,u:0,n:0,tg:0,gt:0,pkt:0});
}
function addClubStat(comp, id, gf, ga, leaguePts, result){
  if (!id) return;
  const b=clubBucket(id, comp);
  b.sp++; b.tg+=gf; b.gt+=ga;
  const res=result||(gf>ga?'s':gf<ga?'n':'u');
  if (res==='s'){ b.s++; if (leaguePts) b.pkt+=3; }
  else if (res==='n') b.n++;
  else { b.u++; if (leaguePts) b.pkt+=1; }
}
function addPairStat(comp, home, away, hg, ag, winner){
  if (!home || !away || home===away) return;
  let lo=home, hi=away, gfL=hg, gfH=ag;
  if (hi<lo){ lo=away; hi=home; gfL=ag; gfH=hg; }
  const key=lo+'|'+hi;
  const p=ensureStats().p;
  const row=p[key]||(p[key]={});
  const b=row[comp]||(row[comp]={sp:0,sL:0,u:0,gfL:0,gfH:0});
  b.sp++; b.gfL+=gfL; b.gfH+=gfH;
  if (winner){ if (winner===lo) b.sL++; }
  else if (gfL>gfH) b.sL++;
  else if (gfL===gfH) b.u++;
}
function rememberMatch(season, comp, h, a, hg, ag, et, peh, pea){
  if (!season.h2h) season.h2h=[];
  season.h2h.push([comp, h, a, hg, ag, et?1:0, peh==null?'':peh, pea==null?'':pea]);
}
function teamNo(id){ return parseInt(String(id).replace(/\D/g,''),10)||0; }
function encH2H(comp, h, a, hg, ag, et, peh, pea){
  if (hg==null || ag==null || !comp) return '';
  let s=comp+','+teamNo(h)+','+teamNo(a)+','+hg+','+ag;
  if (peh!=null && pea!=null && +peh!==+pea) s+=',i,'+peh+','+pea;
  else if (et) s+=',n';
  return s;
}
function decH2H(rec, season){
  const p=String(rec).split(',');
  const o={season:season, comp:p[0], h:idNum(+p[1]||0), a:idNum(+p[2]||0), hg:+p[3], ag:+p[4], et:false, peh:null, pea:null};
  if (p[5]==='n') o.et=true;
  if (p[5]==='i'){ o.peh=+p[6]; o.pea=+p[7]; }
  return o;
}
function fxAsH2H(season){
  const league={};
  LEAGUES.forEach(l=>{
    const teams=season.leagues&&season.leagues[l.id]&&season.leagues[l.id].teams||[];
    teams.forEach(id=>{ league[id]=l.id; });
  });
  const parts=[];
  String(season.fx||'').split(';').forEach(rec=>{
    if (!rec || rec.charAt(0)==='B') return;
    const o=decShared(rec);
    if (o.hg==null || o.ag==null || !o.homeId || !o.awayId) return;
    let comp=league[o.homeId]||league[o.awayId]||'liga';
    if (o.kind==='D') comp='dfb';
    else if (o.kind==='A') comp='land';
    else if (o.kind==='S') comp='sc';
    const line=encH2H(comp, o.homeId, o.awayId, o.hg, o.ag, o.et, o.peh, o.pea);
    if (line) parts.push(line);
  });
  return parts.join(';');
}
function h2hLine(season){
  let body='';
  if (season.h2h && season.h2h.length){
    body=season.h2h.map(r=>encH2H(r[0], r[1], r[2], r[3], r[4], !!r[5], r[6]===''||r[6]==null?null:r[6], r[7]===''||r[7]==null?null:r[7])).filter(Boolean).join(';');
  } else if (typeof season.fx==='string' && season.fx) body=fxAsH2H(season);
  return season.name+'|'+body;
}
let h2hIndexFold=-1, h2hIndexMap=null;
function h2hBlockIndex(){
  const fold=S.h2hFold|0;
  if (h2hIndexMap && h2hIndexFold===fold && h2hIndexMap.n===(S.h2hBlocks||[]).length) return h2hIndexMap;
  const map={};
  (S.h2hBlocks||[]).forEach((raw,bi)=>{
    String(raw||'').split('\n').forEach(line=>{
      const bar=line.indexOf('|');
      if (bar>0) map[line.slice(0,bar)]=bi;
    });
  });
  h2hIndexFold=fold;
  h2hIndexMap={fold, n:(S.h2hBlocks||[]).length, map};
  return h2hIndexMap;
}
function foldOldH2H(){
  const done=(S.seasons||[]).filter(s=>s && s.status==='done');
  if (!S.h2hBlocks) S.h2hBlocks=[];
  let fold=S.h2hFold|0;
  if (fold<0 || fold>done.length) fold=0;
  let changed=false;
  while (done.length-fold>10){
    const s=done[fold];
    const bi=Math.floor(fold/10);
    const line=h2hLine(s);
    const cur=S.h2hBlocks[bi]||'';
    const have=cur.split('\n').some(x=>x.slice(0, x.indexOf('|'))===s.name);
    if (!have) S.h2hBlocks[bi]=cur?cur+'\n'+line:line;
    if (s.h2h){ delete s.h2h; changed=true; }
    fold++;
    changed=true;
  }
  S.h2hFold=fold;
  if (changed){ h2hIndexFold=-1; h2hIndexMap=null; }
}
function idNum(id){ return 't'+String(id).padStart(3,'0'); }
function decShared(rec){
  const p=String(rec).split(',');
  const hn=+p[2]||0, an=+p[3]||0;
  const o={kind:p[0], md:+p[1]||0, homeId:hn?idNum(hn):'', awayId:an?idNum(an):'', hg:p[4]===''||p[4]==null?null:+p[4], ag:p[5]===''||p[5]==null?null:+p[5], et:false, peh:null, pea:null};
  let i=6;
  if (p[i]==='n'){ o.et=true; i++; }
  else if (p[i]==='i'){ o.peh=+p[i+1]; o.pea=+p[i+2]; i+=3; }
  if (p[i]==='k'){ o.dow=p[i+1]||''; o.time=p[i+2]||''; o.top=p[i+3]==='1'; }
  return o;
}
function buildFixtureLog(season){
  const parts=[];
  const line=(kind, md, h, a, hg, ag, et, peh, pea, slot)=>{
    const hn=parseInt(String(h).replace(/\D/g,''),10)||0;
    const an=parseInt(String(a).replace(/\D/g,''),10)||0;
    if (!hn||!an) return;
    let s=kind+','+md+','+hn+','+an+','+(hg==null?'':hg)+','+(ag==null?'':ag);
    if (peh!=null && pea!=null && peh!==pea) s+=',i,'+peh+','+pea;
    else if (et) s+=',n';
    if (slot && slot.dow && slot.time) s+=',k,'+slot.dow+','+slot.time+','+(slot.kind==='top'||slot.kracher?'1':'0');
    parts.push(s);
  };
  LEAGUES.forEach(l=>{
    const lg=season.leagues&&season.leagues[l.id];
    if (!lg||!lg.md) return;
    const kicks=season.kickoffs&&season.kickoffs[l.id];
    lg.md.forEach((md,mi)=>md.forEach((m,ki)=>{
      const slot=kicks&&kicks[mi]&&kicks[mi][ki];
      line('L', mi+1, lg.teams[m[0]], lg.teams[m[1]], m[2], m[3], false, null, null, slot);
    }));
    (lg.decide||[]).forEach(m=>line('E', m.leg||1, m.h, m.a, m.hg, m.ag, !!m.et, m.peh, m.pea, m.slot));
  });
  const addCup=(cup, kind)=>{
    if (!cup) return;
    (cup.rounds||[]).forEach((round,ri)=>{
      (round.byes||[]).forEach(id=>{
        const n=parseInt(String(id).replace(/\D/g,''),10)||0;
        if (n) parts.push('B,'+kind+','+ri+','+n);
      });
      (round.matches||[]).forEach(m=>line(kind, ri, m.h, m.a, m.hg, m.ag, !!m.et, m.peh, m.pea, m.slot));
    });
  };
  if (season.cups){
    addCup(season.cups.dfb, 'D');
    if (season.cups.land) Object.keys(season.cups.land).forEach(bl=>addCup(season.cups.land[bl], 'A'));
  }
  const sc=season.supercup;
  if (sc && sc.h && sc.a) line('S', 0, sc.h, sc.a, sc.hg, sc.ag, !!sc.et, sc.peh, sc.pea);
  if (parts.length) season.fx=parts.join(';');
}
function absorbSeason(season){
  if (!season || season.absorbed) return;
  ensureStats();
  let fromMatches=false;
  LEAGUES.forEach(l=>{
    const lg=season.leagues&&season.leagues[l.id];
    if (!lg) return;
    if (lg.md){
      fromMatches=true;
      lg.md.forEach(md=>md.forEach(m=>{
        if (m[2]==null||m[3]==null) return;
        const h=lg.teams[m[0]], a=lg.teams[m[1]];
        addClubStat(l.id, h, m[2], m[3], true);
        addClubStat(l.id, a, m[3], m[2], true);
        addPairStat(l.id, h, a, m[2], m[3]);
        rememberMatch(season, l.id, h, a, m[2], m[3], false, null, null);
      }));
      (lg.decide||[]).forEach(m=>{
        if (m.hg==null||m.ag==null) return;
        addClubStat(l.id, m.h, m.hg, m.ag, true);
        addClubStat(l.id, m.a, m.ag, m.hg, true);
        addPairStat(l.id, m.h, m.a, m.hg, m.ag);
        rememberMatch(season, l.id, m.h, m.a, m.hg, m.ag, !!m.et, m.peh, m.pea);
      });
    }
  });
  if (!fromMatches){
    LEAGUES.forEach(l=>{
      const rows=season.leagues&&season.leagues[l.id]&&season.leagues[l.id].tables&&season.leagues[l.id].tables.all;
      (rows||[]).forEach(r=>{
        const b=clubBucket(r.id, l.id);
        b.sp+=r.sp||0; b.s+=r.s||0; b.u+=r.u||0; b.n+=r.n||0; b.tg+=r.tg||0; b.gt+=r.gt||0; b.pkt+=r.pkt||0;
      });
    });
  }
  const addCup=(cup, comp)=>{
    if (!cup) return;
    (cup.rounds||[]).forEach(round=>(round.matches||[]).forEach(m=>{
      if (m.hg==null||m.ag==null) return;
      const w=cupWinner(m);
      if (!w) return;
      addClubStat(comp, m.h, m.hg, m.ag, false, w===m.h?'s':'n');
      addClubStat(comp, m.a, m.ag, m.hg, false, w===m.a?'s':'n');
      addPairStat(comp, m.h, m.a, m.hg, m.ag, w);
      rememberMatch(season, comp, m.h, m.a, m.hg, m.ag, !!m.et, m.peh, m.pea);
    }));
  };
  if (season.cups){
    addCup(season.cups.dfb, 'dfb');
    if (season.cups.land) Object.keys(season.cups.land).forEach(bl=>addCup(season.cups.land[bl], 'land'));
  }
  if (season.supercup && season.supercup.hg!=null && season.supercup.ag!=null){
    const m=season.supercup;
    const w=cupWinner(m);
    if (w){
      addClubStat('sc', m.h, m.hg, m.ag, false, w===m.h?'s':'n');
      addClubStat('sc', m.a, m.ag, m.hg, false, w===m.a?'s':'n');
      addPairStat('sc', m.h, m.a, m.hg, m.ag, w);
      rememberMatch(season, 'sc', m.h, m.a, m.hg, m.ag, !!m.et, m.peh, m.pea);
    }
  }
  if (fromMatches) buildFixtureLog(season);
  season.lgStat=1;
  season.absorbed=true;
}
function compactSeason(season){
  if (!season || season.status!=='done' || season.compact) return false;
  LEAGUES.forEach(l=>{
    const lg=season.leagues[l.id];
    if (!lg || !lg.md) return;
    lg.tables={
      all:snapRows(leagueTable(season, l.id)),
      home:snapRows(leagueTable(season, l.id, 'home')),
      away:snapRows(leagueTable(season, l.id, 'away')),
      hin:snapRows(leagueTable(season, l.id, 'all', 'hin')),
      rueck:snapRows(leagueTable(season, l.id, 'all', 'rueck'))
    };
    delete lg.md;
    delete lg.decide;
  });
  if (season.kickoffs) delete season.kickoffs;
  season.compact=true;
  return true;
}
// Volle Pokalrunden und die Neben-Tabellen bleiben für die letzten Saisons.
// Ältere Saisons behalten Gesamttabelle, Finale, Ansehen, Titel und Bilanzen.
const KEEP_FULL=16;
function shrinkCup(cup){
  if (!cup || cup.archived) return;
  const names=cup.roundNames&&cup.roundNames.length?cup.roundNames:(cup.rounds||[]).map(r=>r.name);
  let fin=null;
  (cup.rounds||[]).forEach(r=>{
    if (r.name==='Finale' && r.matches && r.matches.length) fin=r.matches[0];
  });
  cup.roundNames=names;
  cup.archived=true;
  cup.rounds=[{name:'Finale', drawn:true, neutral:true, archived:false, byes:[], matches:fin?[fin]:[]}];
  delete cup.entrants; delete cup.pro; delete cup.amateur;
}
function shrinkSeason(season){
  if (!season || season.slim==='core' || season.status!=='done' || !season.compact) return false;
  if (season.cups){
    shrinkCup(season.cups.dfb);
    if (season.cups.land) Object.keys(season.cups.land).forEach(bl=>shrinkCup(season.cups.land[bl]));
  }
  LEAGUES.forEach(l=>{
    const lg=season.leagues[l.id];
    if (!lg || !lg.tables || !lg.tables.all) return;
    lg.tables={all:lg.tables.all.map(r=>({id:r.id, pl:r.pl, sp:r.sp, s:r.s, u:r.u, n:r.n, tg:r.tg, gt:r.gt, pkt:r.pkt, diff:r.diff, form:[]}))};
  });
  season.slim='core';
  return true;
}
function ageSeasons(){
  const done=(S.seasons||[]).filter(s=>s && s.status==='done' && s.compact);
  const cut=Math.max(0, done.length-KEEP_FULL);
  for (let i=0;i<cut;i++) shrinkSeason(done[i]);
  foldOldH2H();
}
function backfillLeagueStats(){
  (S.seasons||[]).forEach(s=>{
    if (!s || s.status!=='done' || s.lgStat) return;
    let any=false;
    LEAGUES.forEach(l=>{
      const rows=s.leagues&&s.leagues[l.id]&&s.leagues[l.id].tables&&s.leagues[l.id].tables.all;
      if (!rows) return;
      any=true;
      rows.forEach(r=>{
        const b=clubBucket(r.id, l.id);
        b.sp+=r.sp||0; b.s+=r.s||0; b.u+=r.u||0; b.n+=r.n||0; b.tg+=r.tg||0; b.gt+=r.gt||0; b.pkt+=r.pkt||0;
      });
    });
    if (any) s.lgStat=1;
  });
}
function migrateArchive(){
  let n=0;
  ensureStats();
  (S.seasons||[]).forEach(s=>{
    if (!s || s.status!=='done') return;
    if (!runsHaveSeason(s.name)) recordCupHistory(s);
    if (!s.absorbed) absorbSeason(s);
    if (!s.compact && compactSeason(s)) n++;
  });
  backfillLeagueStats();
  return n;
}
function rollSimulatedSeason(){
  const s=latest();
  if (!s || s.status!=='running') return {c:0, rolled:false};
  saveHold=1;
  let c=0, rolled=false;
  const tr=window.FR_TIMING;
  const tSim=tr?performance.now():0;
  try {
    c=simSeason(s);
    if (tr) tr.onlySim=(tr.onlySim||0)+performance.now()-tSim;
    for (let i=0; i<4 && (decidePending(s) || supercupPending(s)); i++){
      LEAGUES.forEach(l=>{ c+=simDecide(s, l.id); });
      c+=simSupercup(s);
    }
    if (decidePending(s) || supercupPending(s)) rolled=false;
    else {
      const tEnd=tr?performance.now():0;
      s.endData=computeTransition(s);
      s.status='ending';
      suggestPicks(s.endData);
      const before=S.seasons.length;
      finalizeSeason({quiet:true, batch:true});
      if (tr) tr.endMs=(tr.endMs||0)+performance.now()-tEnd;
      rolled=S.seasons.length>before;
    }
  } finally {
    saveHold=0;
  }
  save();
  const tR=tr?performance.now():0;
  render();
  if (tr) tr.renderMs=(tr.renderMs||0)+performance.now()-tR;
  return {c, rolled};
}
function finalizeSeason(opts){
  const quiet=!!(opts && opts.quiet);
  const s=latest(), e=s.endData;
  for (const ol in e.need){ if ((e.picks[ol]||[]).length!==e.need[ol]) { if (!quiet) alert('Bitte für '+L[ol].name+' genau '+e.need[ol]+' Aufsteiger wählen.'); return; } }
  const ns={name:nextSeasonName(s.name), status:'running', leagues:{}, pools:{}, markers:{}};
  const pools={}; POOLS.forEach(p=>pools[p.id]=[...e.pools[p.id]]);
  const newT={}; for (const k in e.newT) newT[k]=[...e.newT[k]];
  for (const ol in e.picks){ e.picks[ol].forEach(id=>{ for(const pid in pools){ const i=pools[pid].indexOf(id); if(i>=0) pools[pid].splice(i,1);} newT[ol].push(id); }); }
  // Prüfung Mannschaftszahlen
  const bad = LEAGUES.filter(l=>newT[l.id].length!==l.size);
  if (bad.length){ if (!quiet) alert('Fehler: falsche Teamzahl in '+bad.map(l=>l.name+' ('+newT[l.id].length+')').join(', ')); return; }
  LEAGUES.forEach(l=>{ const teams=newT[l.id].sort(byRang); ns.leagues[l.id]={teams, md:makeSchedule(teams.length)}; });
  POOLS.forEach(p=>ns.pools[p.id]=pools[p.id].sort(byRang));
  // Markierungen: (Auf) Aufsteiger, (Ab) Absteiger, (M) Vorjahresmeister
  const mk=(id,x)=>{ (ns.markers[id]||(ns.markers[id]=[])).push(x); };
  e.moves.forEach(m=>{ if (L[m.to]) mk(m.id, m.type==='auf'?'Auf':'Ab'); });
  for (const ol in e.picks) e.picks[ol].forEach(id=>mk(id,'Auf'));
  (e.tables.BL||[]).forEach(r=>{
    if (r.pl===1) mk(r.id,'M');
    else if (r.pl<=4) mk(r.id,'CL');
    else if (r.pl<=6) mk(r.id,'EL');
    else if (r.pl===7) mk(r.id,'UECL');
  });
  e.step=3; s.status='done';
  if (!S.chronicle) S.chronicle=[];
  LEAGUES.forEach(l=>{
    const t=e.tables[l.id]||[];
    t.forEach(r=>{
      if (chronicleHas(s.name, r.id)) return;
      const pts=seasonStrengthPoints(l.level, t.length, r.pl);
      const row={season:s.name, id:r.id, liga:l.name, ebene:l.level, n:t.length, pl:r.pl, pts:Math.round(pts*100)/100};
      S.chronicle.push(row);
      chronSeen.add(s.name+'|'+r.id);
    });
  });
  recordCupHistory(s);
  absorbSeason(s);
  touchAnsehen();
  ns.cups = buildCups(ns, s);
  ns.supercup = buildSupercup(s);
  compactSeason(s);
  S.seasons.push(ns); S.view=S.seasons.length-1; S.ui.tab='tabelle'; S.ui.md={};
  if (!(opts && opts.batch)){ save(); render(); }
  toast('Saison '+ns.name+' wurde erstellt.');
}

// ---------- Pokal ----------
const DFB_ROUNDS = [
  {name:'1. Runde', slots:[{dow:'Fr',time:'18:00',kind:'regional',n:6},{dow:'Sa',time:'13:30',kind:'konferenz',n:8},{dow:'Sa',time:'16:30',kind:'konferenz',n:8},{dow:'Sa',time:'20:30',kind:'top',n:2},{dow:'So',time:'13:30',kind:'konferenz',n:4},{dow:'So',time:'16:30',kind:'regional',n:4}]},
  {name:'2. Runde', slots:[{dow:'Mi',time:'18:00',n:6},{dow:'Mi',time:'20:30',kind:'top',n:2},{dow:'Do',time:'18:00',n:6},{dow:'Do',time:'20:30',kind:'top',n:2}]},
  {name:'Achtelfinale', slots:[{dow:'Mi',time:'18:00',n:2},{dow:'Mi',time:'20:30',kind:'top',n:2},{dow:'Do',time:'18:00',n:2},{dow:'Do',time:'20:30',kind:'top',n:2}]},
  {name:'Viertelfinale', slots:[{dow:'Mi',time:'20:30',kind:'top',n:2},{dow:'Do',time:'20:30',kind:'top',n:2}]},
  {name:'Halbfinale', slots:[{dow:'Mi',time:'20:30',kind:'top',n:1},{dow:'Do',time:'20:30',kind:'top',n:1}]},
  {name:'Finale', neutral:true, slots:[{dow:'Sa',time:'20:45',kind:'top',n:1}]}
];
const CUP_DOW={Fr:0,Sa:1,So:2,Mi:3,Do:4};
const VIA_TEXT={sieger:'Landespokalsieger', finalist:'Finalist, der Sieger ist schon über die Liga qualifiziert', staat:'bester noch nicht qualifizierter Verein des Landes', liga:'nächster freier Platz der 3. Liga'};
function cupMatch(h,a,neutral){ return {h,a,hg:null,ag:null,et:false,peh:null,pea:null,slot:null,neutral:!!neutral}; }
function cupWinner(m){
  if (!m || m.hg==null || m.ag==null) return null;
  if (m.hg>m.ag) return m.h;
  if (m.ag>m.hg) return m.a;
  if (m.peh==null || m.pea==null || m.peh===m.pea) return null;
  return m.peh>m.pea ? m.h : m.a;
}
let standHold=null, standMemo=null;
function standingOf(season){
  if (standHold===season && standMemo) return standMemo;
  const map={}, lists={};
  const fromTable=season.endData && season.endData.tables;
  LEAGUES.forEach(l=>{
    let rows=[];
    if (fromTable && season.endData.tables[l.id]) rows=season.endData.tables[l.id].map(r=>({id:r.id,pl:r.pl}));
    else if (season.leagues && season.leagues[l.id]) rows=leagueTable(season, l.id).map(r=>({id:r.id,pl:r.pl}));
    lists[l.id]=rows.map(r=>r.id);
    rows.forEach(r=>{ map[r.id]={level:l.level, place:r.pl, lid:l.id, short:l.short}; });
  });
  POOLS.forEach(p=>{
    const ids=((season.pools&&season.pools[p.id])||[]).slice().sort(byRang);
    lists[p.id]=ids;
    ids.forEach((id,i)=>{ if (!map[id]) map[id]={level:7, place:i+1, lid:p.id, short:'Amateur'}; });
  });
  const out={map, lists};
  if (standHold===season) standMemo=out;
  return out;
}
function rankOf(st, id){ return st.map[id] || {level:8, place:999, lid:'', short:''}; }
function koName(teams){
  if (teams===2) return 'Finale';
  if (teams===4) return 'Halbfinale';
  if (teams===8) return 'Viertelfinale';
  if (teams===16) return 'Achtelfinale';
  if (teams===32) return 'Runde der 32';
  if (teams===64) return 'Runde der 64';
  if (teams===128) return 'Runde der 128';
  if (teams===256) return 'Runde der 256';
  return 'Runde der '+teams;
}
function landParticipants(season, bl){
  const ids=[];
  LEAGUES.forEach(l=>{
    if (l.level<3 || !season.leagues[l.id]) return;
    season.leagues[l.id].teams.forEach(id=>{ if (TEAMS[id] && TEAMS[id].bl===bl) ids.push(id); });
  });
  POOLS.forEach(p=>{
    ((season.pools&&season.pools[p.id])||[]).forEach(id=>{ if (TEAMS[id] && TEAMS[id].bl===bl) ids.push(id); });
  });
  return ids;
}
function planLandRounds(ids, st){
  const ranked=ids.slice().sort((a,b)=>rankOf(st,a).level-rankOf(st,b).level || rankOf(st,a).place-rankOf(st,b).place || byRang(a,b));
  const n=ranked.length;
  if (n<2) return [{name:'Finale', drawn:false, byes:ranked.slice(), matches:[]}];
  const target=1<<Math.ceil(Math.log2(n));
  const byeN=target-n;
  const rounds=[];
  let left;
  if (byeN>0){
    rounds.push({name:'Vorrunde', drawn:false, byes:ranked.slice(0, byeN), field:ranked.slice(byeN), matches:[]});
    left=target/2;
  } else {
    rounds.push({name:koName(n), drawn:false, byes:[], field:ranked.slice(), matches:[]});
    left=n/2;
  }
  while (left>=2){
    rounds.push({name:koName(left), drawn:false, byes:[], matches:[]});
    left=left/2;
  }
  return rounds;
}
function cupFinalists(cup){
  if (!cup || !cup.rounds || !cup.rounds.length) return null;
  const last=cup.rounds[cup.rounds.length-1];
  if (!last.drawn || last.matches.length!==1) return null;
  const m=last.matches[0], w=cupWinner(m);
  if (!w) return null;
  return {winner:w, finalist:w===m.h?m.a:m.h, match:m};
}
function buildCups(season, prev){
  const src=prev||season;
  const st=standingOf(src);
  const top=new Set();
  (st.lists.BL||[]).forEach(id=>top.add(id));
  (st.lists.BL2||[]).forEach(id=>top.add(id));
  (st.lists.L3||[]).slice(0,8).forEach(id=>top.add(id));
  const pro=(st.lists.BL||[]).concat((st.lists.BL2||[]).slice(0,12));
  const amateurLeague=(st.lists.BL2||[]).slice(12,20).concat((st.lists.L3||[]).slice(0,8));
  const taken=new Set(top);
  const l3=st.lists.L3||[];
  let cursor=8;
  function nextL3(){
    while (cursor<l3.length){
      const id=l3[cursor++];
      if (id && !taken.has(id)){ taken.add(id); return id; }
    }
    const spare=Object.keys(st.map).filter(id=>!taken.has(id) && st.map[id].level>=3);
    spare.sort((a,b)=>st.map[a].level-st.map[b].level || st.map[a].place-st.map[b].place || byRang(a,b));
    if (spare[0]){ taken.add(spare[0]); return spare[0]; }
    return null;
  }
  function bestOfState(bl){
    const cands=Object.keys(st.map).filter(id=>TEAMS[id] && TEAMS[id].bl===bl && st.map[id].level>=3 && !taken.has(id));
    cands.sort((a,b)=>st.map[a].level-st.map[b].level || st.map[a].place-st.map[b].place || byRang(a,b));
    return cands[0]||null;
  }
  const spots=[];
  BL_ORDER.forEach(bl=>{
    const fin=prev && prev.cups && prev.cups.land ? cupFinalists(prev.cups.land[bl]) : null;
    let id=null, via='';
    if (fin && fin.winner && !taken.has(fin.winner)){ id=fin.winner; via='sieger'; }
    else if (fin && fin.finalist && !taken.has(fin.finalist)){ id=fin.finalist; via='finalist'; }
    else if (fin){ id=nextL3(); via='liga'; }
    else {
      id=bestOfState(bl); via=id?'staat':'';
      if (!id){ id=nextL3(); via='liga'; }
    }
    if (id){
      taken.add(id);
      const place=via==='liga' && st.map[id] ? st.map[id].place : null;
      spots.push({bl, id, via, place});
    }
  });
  const landIds=spots.map(s=>s.id);
  const amateur=amateurLeague.concat(landIds);
  const entrants=pro.concat(amateurLeague).concat(landIds);
  const dfb={
    id:'dfb', name:'DFB-Pokal', kind:'dfb',
    entrants, pro, amateur, spots,
    rounds:DFB_ROUNDS.map(r=>({name:r.name, neutral:!!r.neutral, drawn:false, byes:[], matches:[]}))
  };
  const byeSt=placementStanding(season, prev);
  const land={};
  BL_ORDER.forEach(bl=>{
    const ids=landParticipants(season, bl);
    land[bl]={id:'land:'+bl, name:'Landespokal '+bl, kind:'land', bl, entrants:ids, rounds:planLandRounds(ids, byeSt)};
  });
  return {dfb, land};
}
function ensureCups(season){
  if (season.cups && season.cups.dfb && season.cups.land) return season.cups;
  const idx=S && S.seasons ? S.seasons.indexOf(season) : -1;
  const prev=idx>0 ? S.seasons[idx-1] : null;
  season.cups=buildCups(season, prev);
  return season.cups;
}
function ensureAllCups(){ (S.seasons||[]).forEach(ensureCups); }
function cupAppeal(st, h, a){
  const hs=rankOf(st,h), as=rankOf(st,a);
  const an=(ansehenValue(h)||0)+(ansehenValue(a)||0);
  let both=0;
  if (hs.level<=1 && as.level<=1) both=160;
  else if (hs.level<=2 && as.level<=2) both=90;
  else if (hs.level<=3 && as.level<=3) both=35;
  return (8-hs.level)*28+(8-as.level)*28+an*0.35+both;
}
function expandPlan(plan){
  const out=[];
  plan.forEach(s=>{ for (let i=0;i<(s.n||1);i++) out.push({dow:s.dow, time:s.time, kind:s.kind||''}); });
  return out;
}
function landSlotPlan(n, isFinal){
  if (isFinal) return [{dow:'Sa', time:'15:30', n:Math.max(1,n)}];
  if (n<=1) return [{dow:'Sa', time:'14:30', n:1}];
  const sa=Math.ceil(n/2), so=n-sa, out=[];
  if (sa) out.push({dow:'Sa', time:'14:30', n:sa});
  if (so) out.push({dow:'So', time:'14:30', n:so});
  return out;
}
function assignCupSlots(matches, plan, st){
  const slots=expandPlan(plan);
  const info=matches.map((m,i)=>({i, score:cupAppeal(st,m.h,m.a), km:kmBetween(m.h,m.a)}));
  info.forEach(o=>{ if (o.km==null) o.km=99999; });
  const takenM=new Set(), takenS=new Set();
  const byAppeal=info.slice().sort((a,b)=>b.score-a.score || a.i-b.i);
  slots.forEach((slot,si)=>{
    if (slot.time!=='20:30' && slot.time!=='20:45') return;
    const m=byAppeal.find(o=>!takenM.has(o.i));
    if (!m) return;
    matches[m.i].slot=Object.assign({}, slot);
    takenM.add(m.i); takenS.add(si);
  });
  const byKm=info.slice().sort((a,b)=>a.km-b.km || a.i-b.i);
  slots.forEach((slot,si)=>{
    if (takenS.has(si) || slot.kind!=='regional') return;
    const m=byKm.find(o=>!takenM.has(o.i));
    if (!m) return;
    matches[m.i].slot=Object.assign({}, slot);
    takenM.add(m.i); takenS.add(si);
  });
  const restS=[], restM=[];
  slots.forEach((s,i)=>{ if (!takenS.has(i)) restS.push(s); });
  info.forEach(o=>{ if (!takenM.has(o.i)) restM.push(o.i); });
  restM.forEach((mi,k)=>{ if (restS[k]) matches[mi].slot=Object.assign({}, restS[k]); });
}
function placementStanding(season, prev){
  if (prev && prev.endData && prev.endData.tables) return standingOf(prev);
  const map={}, lists={};
  LEAGUES.forEach(l=>{
    const ids=(season.leagues[l.id]&&season.leagues[l.id].teams||[]).slice();
    lists[l.id]=ids;
    ids.forEach((id,i)=>{ map[id]={level:l.level, place:i+1, lid:l.id, short:l.short}; });
  });
  POOLS.forEach(p=>{
    const ids=((season.pools&&season.pools[p.id])||[]).slice();
    lists[p.id]=ids;
    ids.forEach((id,i)=>{ if (!map[id]) map[id]={level:7, place:i+1, lid:p.id, short:'Amateur'}; });
  });
  return {map, lists};
}
function pairLowerHome(ids, st){
  const buckets={};
  ids.forEach(id=>{ const lv=rankOf(st,id).level; (buckets[lv]=buckets[lv]||[]).push(id); });
  const order=[];
  Object.keys(buckets).map(Number).sort((a,b)=>b-a).forEach(lv=>{
    order.push(...shuffle(buckets[lv].slice()));
  });
  const homeN=Math.floor(order.length/2);
  const homes=order.slice(0, homeN);
  const aways=shuffle(order.slice(homeN));
  return homes.map((h,i)=>cupMatch(h, aways[i], false));
}
function pairDfb(ids, proSet, neutral){
  if (neutral){
    const bag=shuffle(ids.slice()), matches=[];
    for (let i=0;i+1<bag.length;i+=2) matches.push(cupMatch(bag[i], bag[i+1], true));
    return matches;
  }
  const am=shuffle(ids.filter(id=>!proSet.has(id)));
  const pro=shuffle(ids.filter(id=>proSet.has(id)));
  const matches=[];
  while (am.length && pro.length) matches.push(cupMatch(am.shift(), pro.shift(), false));
  while (am.length>=2) matches.push(cupMatch(am.shift(), am.shift(), false));
  while (pro.length>=2) matches.push(cupMatch(pro.shift(), pro.shift(), false));
  return matches;
}
function roundField(cup, ri){
  const round=cup.rounds[ri];
  if (ri===0) return (round.field && round.field.length) ? round.field.slice() : (cup.entrants||[]).slice();
  const prev=cup.rounds[ri-1];
  return prev.matches.map(cupWinner).filter(Boolean).concat(prev.byes||[]);
}
function roundComplete(round){ return !!round && round.drawn && round.matches.every(cupWinner); }
function drawCupRound(season, cup, ri){
  if (!cup || cup.rounds[ri].drawn) return false;
  if (ri>0 && !roundComplete(cup.rounds[ri-1])) return false;
  const field=roundField(cup, ri);
  const st=standingOf(season);
  const round=cup.rounds[ri];
  let matches;
  if (cup.kind==='dfb') matches=pairDfb(field, new Set(cup.pro||[]), !!round.neutral);
  else matches=pairLowerHome(field, st);
  const plan=cup.kind==='dfb' ? DFB_ROUNDS[ri].slots : landSlotPlan(matches.length, round.name==='Finale');
  assignCupSlots(matches, plan, st);
  round.matches=matches;
  round.drawn=true;
  return true;
}
function clearLaterRounds(cup, ri){
  for (let j=ri+1;j<cup.rounds.length;j++){
    cup.rounds[j].drawn=false;
    cup.rounds[j].matches=[];
  }
}
function simCupScore(h,a){
  const r=simMatch(h,a);
  let hg=r[0], ag=r[1];
  if (hg===ag){
    let peh=0, pea=0, guard=0;
    const homeFav=simStrength(h)>=simStrength(a);
    while (peh===pea && guard++<30){
      peh=3+Math.floor(Math.random()*5);
      pea=3+Math.floor(Math.random()*5);
      if (homeFav && peh<pea) [peh,pea]=[pea,peh];
      if (!homeFav && pea<peh) [peh,pea]=[pea,peh];
    }
    if (peh===pea) peh++;
    return {hg, ag, et:false, peh, pea};
  }
  return {hg, ag, et:Math.random()<0.22, peh:null, pea:null};
}
function simCup(season, cup){
  let c=0;
  for (let ri=0; ri<cup.rounds.length; ri++){
    if (!cup.rounds[ri].drawn){ if (!drawCupRound(season, cup, ri)) break; }
    cup.rounds[ri].matches.forEach(m=>{
      if (cupWinner(m)) return;
      const res=simCupScore(m.h, m.a);
      m.hg=res.hg; m.ag=res.ag; m.et=res.et; m.peh=res.peh; m.pea=res.pea;
      c++;
    });
  }
  return c;
}
function simAllCups(season){
  ensureCups(season);
  standHold=season; standMemo=null;
  let c=0;
  try {
    c=simCup(season, season.cups.dfb);
    BL_ORDER.forEach(bl=>{ if (season.cups.land[bl]) c+=simCup(season, season.cups.land[bl]); });
  } finally { standHold=null; standMemo=null; }
  return c;
}
function cupReached(cup){
  const best={};
  const last=cup.rounds.length-1;
  const touch=(id, ri, name, won)=>{
    if (!id) return;
    const prev=best[id];
    if (!prev || ri>prev.ri) best[id]={ri, name, won:!!won};
    else if (ri===prev.ri && won) prev.won=true;
  };
  cup.rounds.forEach((round, ri)=>{
    (round.byes||[]).forEach(id=>touch(id, ri, round.name, ri===last));
    (round.matches||[]).forEach(m=>{
      const w=cupWinner(m);
      touch(m.h, ri, round.name, w===m.h && ri===last);
      touch(m.a, ri, round.name, w===m.a && ri===last);
    });
  });
  return best;
}
function recordCupHistory(season){
  if (!season.cups) return;
  if (!S.pokalHistory) S.pokalHistory=[];
  if (!S.pokalRuns) S.pokalRuns=[];
  if (runsHaveSeason(season.name)) return;
  runSeasons.add(season.name);
  const land={};
  BL_ORDER.forEach(bl=>{
    const cup=season.cups.land[bl];
    const fin=cupFinalists(cup);
    land[bl]=fin?fin.winner:null;
    if (!cup) return;
    const names=cup.rounds.map(r=>r.name);
    const reached=cupReached(cup);
    Object.keys(reached).forEach(id=>{
      const x=reached[id];
      const run={season:season.name, id, comp:'land', bl, round:x.name, won:!!x.won, pts:landRunPoints(names, x.name, x.won)};
      attachOpp(run, lastPlayed(cup, id));
      S.pokalRuns.push(run);
    });
  });
  const dfbCup=season.cups.dfb;
  const dfb=cupFinalists(dfbCup);
  if (dfbCup){
    const reached=cupReached(dfbCup);
    Object.keys(reached).forEach(id=>{
      const x=reached[id];
      const run={season:season.name, id, comp:'dfb', round:x.name, won:!!x.won, pts:dfbRunPoints(x.name, x.won)};
      attachOpp(run, lastPlayed(dfbCup, id));
      S.pokalRuns.push(run);
    });
  }
  S.pokalHistory.push({season:season.name, dfb:dfb?dfb.winner:null, land});
}
function lastPlayed(cup, id){
  let found=null;
  if (!cup) return null;
  (cup.rounds||[]).forEach(r=>(r.matches||[]).forEach(m=>{
    if ((m.h===id||m.a===id) && m.hg!=null && m.ag!=null) found=m;
  }));
  return found;
}
function attachOpp(run, m){
  if (!m) return run;
  run.opp=m.h===run.id?m.a:m.h;
  run.home=m.h===run.id;
  run.hg=m.hg; run.ag=m.ag; run.et=!!m.et; run.peh=m.peh; run.pea=m.pea;
  return run;
}
function getCup(season, key){
  if (!season.cups) return null;
  if (key==='dfb') return season.cups.dfb;
  return season.cups.land ? season.cups.land[key] : null;
}
function cupSlotOrder(a,b){
  if (!a||!b) return 0;
  return (CUP_DOW[a.dow]-CUP_DOW[b.dow]) || String(a.time).localeCompare(String(b.time)) || String(a.kind).localeCompare(String(b.kind));
}
function cupSlotLabel(slot, neutral){
  if (neutral) return 'Sa 20:45 · Finale in Berlin';
  if (!slot) return 'ohne Anstoßzeit';
  const k=slot.kind==='top'?' Topspiel':slot.kind==='konferenz'?' Konferenz':slot.kind==='regional'?' regional':'';
  return slot.dow+' '+slot.time+k;
}
function cupScoreBits(m){
  if (!m || m.hg==null || m.ag==null) return null;
  const pen=m.hg===m.ag && m.peh!=null && m.pea!=null && m.peh!==m.pea;
  return {main:m.hg+':'+m.ag+(m.hg!==m.ag && m.et?' n.V.':''), above:pen?m.peh+':'+m.pea+' i.E.':''};
}

// ---------- Darstellung ----------
function clubHTML(id, opts={}){
  const t=TEAMS[id]; const mk = opts.marker ? [].concat(opts.marker).map(x=>'<span class="mk">('+x+')</span>').join('') : '';
  const img='<img src="'+esc(t.crest)+'" alt="" data-club="'+id+'" title="'+esc(t.name)+'" loading="lazy">';
  const nm=opts.markerBefore ? (mk?mk+' ':'')+esc(t.name) : esc(t.name)+(mk?' '+mk:'');
  const txt='<div class="txt"><div class="nm">'+nm+'</div>'+(opts.nobl?'':'<div class="bl">'+esc(t.bl)+'</div>')+'</div>';
  return '<div class="club'+(opts.crestRight?' crest-right':'')+'" data-club="'+id+'" title="'+esc(t.name)+'">'+(opts.crestRight?txt+img:img+txt)+'</div>';
}
// Jede Partie: Heimname, Wappen, Ergebnis, Wappen, Auswärtsname.
function matchLineHTML(o){
  const h=o.h, a=o.a;
  if (!h || !a || !TEAMS[h] || !TEAMS[a]) return '';
  const crest=id=>'<img class="ml-crest" src="'+esc(TEAMS[id].crest)+'" alt="" data-club="'+id+'" title="'+esc(TEAMS[id].name)+'">';
  const nm=id=>{
    const mk=o.marker && o.marker[id];
    const tags=mk?[].concat(mk).filter(Boolean).map(x=>'<span class="mk">('+esc(x)+')</span>').join(''):'';
  const name='<span class="ml-name">'+esc(TEAMS[id].name)+(tags?' '+tags:'')+'</span>';
  if (!o.bl && !o.cup) return name;
  return '<span class="who">'+name+'<span class="ml-bl">'+esc(TEAMS[id].bl)+'</span></span>';
};
  const played=o.hg!=null && o.ag!=null && !o.open;
  const pen=played && o.hg===o.ag && o.peh!=null && o.pea!=null && +o.peh!==+o.pea;
  const nv=played && o.et && o.hg!==o.ag;
  const keep=html=>html && html.replace(/<span class="ie-slot"><\/span>/g,'').trim() ? html : '';
  const above=keep(o.above!=null?o.above:(pen?'<span class="ie-link ie-static">'+o.peh+':'+o.pea+' i.E.</span>':(nv?'<span class="ie-box">n.V.</span>':'')));
  const below=keep(o.below!=null?o.below:'');
  const step0=o.step?o.step(0):'';
  const step1=o.step?o.step(1):'';
  const score=o.open
    ? '<span class="tone-open">offen</span>'
    : '<span class="scoreline"><span class="goals" data-side="0">'+(played?o.hg:'-')+'</span><b>:</b><span class="goals" data-side="1">'+(played?o.ag:'-')+'</span></span>';
  const km=o.km!=null?'<div class="km-line">'+o.km+' km</div>':'';
  const edge=id=>(o.liga && o.season)?'<span class="liga-edge">'+esc(ligaEdge(o.season, id))+'</span>':'';
  const cls=['match'];
  if (o.cup) cls.push('cup');
  if (played || o.done) cls.push('done');
  if (o.klass) cls.push(o.klass);
  if (o.tone) cls.push('tone-'+o.tone);
  if (o.box) cls.push('fx-box');
  if (o.bl) cls.push('sp-line');
  if (o.nodel) cls.push('match-nodel');
  const del=o.nodel?'':(o.del!=null?o.del:'<span></span>');
  const home=edge(h)+nm(h)+crest(h);
  const away=crest(a)+nm(a)+edge(a);
  return '<div class="'+cls.join(' ')+'"'+(o.attr||'')+'><div class="side side-home">'+home+'</div><div class="scorecol">'+(above?above:'')+'<div class="score">'+step0+score+step1+'</div>'+(below?'<div class="under">'+below+'</div>':'')+km+'</div><div class="side side-away">'+away+'</div>'+del+'</div>';
}
function sortHead(label, key, cls){
  return '<th'+(cls?' class="'+cls+'"':'')+(key?' data-sort="'+key+'"':'')+'>'+label+'</th>';
}
function sortCell(n, html, cls){
  const raw=(n==null||n==='')?'':String(n);
  return '<td'+(raw!==''?' data-n="'+raw+'"':'')+(cls?' class="'+cls+'"':'')+'>'+html+'</td>';
}
function tableHTML(rows, lg, opts={}){
  const n=rows.length, season=opts.season||cur();
  const sure = opts.zones===false || !lg ? {} : certaintyMap(season, lg.id);
  const down = !lg || opts.zones===false ? 0 : relegationProfile(season, lg.id).down;
  const th=sortHead, td=sortCell;
  let h='<table class="tbl"><thead><tr>'+th('Pl.','pl')+th('Verein','','l')+th('Sp.','sp')+th('S','s')+th('U','u')+th('N','n')+th('T/GT','tg')+th('Diff.','diff')+th('Pkt.','pkt')+(opts.form===false?'':th('Form',''))+'</tr></thead><tbody>';
  rows.forEach(r=>{
    const flag=sure[r.id]||'';
    let z = opts.zones===false ? '' : zoneOf(lg, r.pl, n, down);
    if (flag==='up') z='sure-up';
    h+='<tr class="'+(z?'z-'+z:'')+'">'+td(r.pl, r.pl)+'<td class="l">'+clubHTML(r.id,{nobl:!!opts.nobl,marker:opts.markers===false?null:season.markers[r.id]})+'</td>'+td(r.sp, r.sp)+td(r.s, r.s)+td(r.u, r.u)+td(r.n, r.n)+td(r.tg, r.tg+':'+r.gt)+td(r.diff, (r.diff>0?'+':'')+r.diff)+td(r.pkt, r.pkt, 'pts')+
      (opts.form===false?'':'<td><span class="form">'+r.form.map(f=>'<span class="f-'+f+'" title="'+({S:'Sieg',U:'Unentschieden',N:'Niederlage'}[f])+'">'+f+'</span>').join('')+'</span></td>')+'</tr>';
  });
  h+='</tbody></table>';
  if (opts.zones!==false && lg){
    h+=legendHTML(lg, season);
    h+=fixedPlaceHTML(season, lg, n);
  }
  return h;
}
function fixedPlaceHTML(season, lg, n){
  const fixed=fixedPlaces(season, lg.id);
  let h='<div class="fixed-row" title="Plätze, die rechnerisch niemand mehr ändern kann">';
  for (let pl=1; pl<=n; pl++){
    const id=fixed[pl];
    const num='<span class="pl">'+pl+'.</span>';
    if (!id) h+='<span class="fp muted">'+num+'</span>';
    else h+='<span class="fp" data-club="'+id+'" title="'+esc(TEAMS[id].name)+'">'+num+'<img src="'+esc(TEAMS[id].crest)+'" alt="'+esc(TEAMS[id].name)+'"></span>';
  }
  h+='</div>';
  return h;
}
function legendSwatch(zone, label){ return '<span><i class="sw sw-'+zone+'"></i>'+label+'</span>'; }
function legendHTML(lg, season){
  const it=[];
  const prof=!lg?null:relegationProfile(season||cur(), lg.id);
  if (lg.id==='BL'){
    it.push(legendSwatch('meister','Meister'));
    it.push(legendSwatch('cl','Champions League'));
    it.push(legendSwatch('el','Europa League'));
    it.push(legendSwatch('ecl','Conference League'));
    it.push(legendSwatch('ab','Abstieg'));
  } else {
    if (lg.level===6) it.push(legendSwatch('auf','Zwei Aufsteiger → '+leagueName(lg.upTo)));
    else if (lg.up===1) it.push(legendSwatch('auf','Meister &amp; Aufstieg → '+leagueName(lg.upTo)));
    else if (lg.up>1) it.push(legendSwatch('auf','Aufstieg → '+leagueName(lg.upTo)));
    if (lg.up) it.push(legendSwatch('sure-up','Aufstieg rechnerisch sicher'));
    if (lg.down || (prof && prof.down)){
      const ab = lg.level>=5 && prof ? 'Abstieg (diesmal '+prof.down+')' : (prof && prof.down!==lg.down ? 'Abstieg (diesmal '+prof.down+' statt '+lg.down+')' : 'Abstieg');
      it.push(legendSwatch('ab', ab));
    }
  }
  it.push('<span class="muted">'+(lg.id==='BL'?'(M) Meister · (CL) (EL) (UECL) · ':'')+'(Auf) Aufsteiger · (Ab) Absteiger · sicher nur ohne jede Punktchance</span>');
  return '<div class="legend">'+it.join('')+'</div>';
}

function setActions(html){
  const el=$('#headActions');
  if (el) el.innerHTML=html||'';
}
function seasonActions(s, withEnd){
  if (!s) return '';
  const live=s.status==='running' && S.view===S.seasons.length-1;
  if (live){
    let h='<button class="btn" data-act="simSeason">Saison simulieren</button>';
    if (withEnd!==false) h+='<button class="btn primary" data-act="end">Saison abschließen</button>';
    return h;
  }
  if (withEnd!==false && s.status==='ending') return '<button class="btn primary" data-act="toEnd">Auf/Abstiege</button>';
  return '';
}
function renderNav(){
  const tab=S.ui.tab, pokal=tab==='pokal', ansehen=tab==='ansehen', amateur=S.ui.league==='AM'||!!P[S.ui.league];
  const special=pokal||ansehen||tab==='verein'||tab==='supercup'||tab==='info';
  let amN=0; POOLS.forEach(p=>amN+=(cur().pools[p.id]||[]).length);
  const link=(label, active, attrs, title)=>'<a class="nav-item'+(active?' active':'')+'" '+attrs+(title?' title="'+esc(title)+'"':'')+'>'+label+'</a>';
  const menu=(id, title, on, body)=>'<div class="nav-menu'+(on?' has-active':'')+'"><button type="button" class="nav-menu-btn'+(on?' active':'')+'" data-menu="'+id+'">'+title+'</button><div class="nav-drop">'+body+'</div></div>';
  const leagueOn=id=>!special && !amateur && S.ui.league===id;
  const lv=L[S.ui.league];
  const profi=LEAGUES.filter(l=>l.level<=4).map(l=>link(esc(l.name), leagueOn(l.id), 'data-league="'+l.id+'"')).join('');
  const rl=LEAGUES.filter(l=>l.level===5).map(l=>link(esc(l.short), leagueOn(l.id), 'data-league="'+l.id+'"', l.name)).join('');
  const ol=LEAGUES.filter(l=>l.level===6).map(l=>link(esc(l.short), leagueOn(l.id), 'data-league="'+l.id+'"', l.name)).join('');
  let h=menu('ligen','Ligen', !!(lv&&lv.level<=4&&!special&&!amateur), profi);
  h+=menu('rl','Regionalliga', !!(lv&&lv.level===5&&!special&&!amateur), rl);
  h+=menu('ol','Oberliga', !!(lv&&lv.level===6&&!special&&!amateur), ol);
  h+=menu('breit','Breitensport', !special && amateur, link('Amateurliga<span class="cnt">'+amN+'</span>', !special && amateur, 'data-league="AM"'));
  let comp=link('Pokal', pokal, 'data-tab="pokal"');
  if (featOn('supercup')) comp+=link('Supercup', tab==='supercup', 'data-tab="supercup"');
  h+=menu('wett','Wettbewerbe', pokal||tab==='supercup', comp);
  h+=menu('verein','Verein', tab==='info'||ansehen, link('Vereinsinfo', tab==='info', 'data-tab="info"')+link('Ansehen', ansehen, 'data-tab="ansehen"'));
  $('#leagueNav').innerHTML=h;
  const sel=id=>!pokal && S.ui.league===id?' selected':'';
  let o=LEAGUES.map(l=>'<option value="'+l.id+'"'+sel(l.id)+'>'+esc(l.name)+'</option>').join('');
  o+='<option value="AM"'+(amateur&&!pokal?' selected':'')+'>Amateurliga</option>';
  o+='<option value="pokal"'+(pokal?' selected':'')+'>Pokal</option>';
  $('#mobileLeague').innerHTML=o;
  $('#seasonSelect').innerHTML=S.seasons.map((s,i)=>'<option value="'+i+'"'+(i===S.view?' selected':'')+'>'+s.name+(s.status==='done'?' (abgeschlossen)':s.status==='ending'?' (Abschluss)':'')+'</option>').join('');
}

const TABS=[['tabelle','Tabelle'],['karte','Karte'],['terminierung','Terminierung'],['heimaus','Heim/Auswärts'],['hinrueck','Hin/Rückrunde'],['ewig','Ewige Tabelle'],['historie','Historie'],['rekorde','Rekorde'],['aufab','Auf/Abstiege']];
function renderMigrate(){
  let el=$('#migrate');
  if(!S.ui.showMigrate){ if(el) el.remove(); return; }
  if(!el){ el=document.createElement('div'); el.id='migrate'; el.className='notice'; $('#main').prepend(el); }
  el.innerHTML='Die Terminierung läuft jetzt in Blöcken von vier Spieltagen. Ein älterer Spielstand wird nicht übernommen. <button type="button" class="btn small" id="btnMigrate">Neu starten</button>';
  $('#btnMigrate').onclick=()=>{ try{ localStorage.removeItem(OLD_KEY); localStorage.removeItem('fussballrechner_v1'); }catch(e){} S=newGame(); save(); render(); toast('Neuer Spielstand gestartet.'); };
}
function renderPokal(s){
  ensureCups(s);
  if (isEditable()){
    let drew=maybeAutoFinal(s, s.cups.dfb);
    BL_ORDER.forEach(bl=>{ if (s.cups.land[bl] && maybeAutoFinal(s, s.cups.land[bl])) drew=true; });
    if (drew) save();
  }
  const key=S.ui.cup && (S.ui.cup==='dfb' || (s.cups.land&&s.cups.land[S.ui.cup])) ? S.ui.cup : 'dfb';
  S.ui.cup=key;
  const cup=getCup(s, key);
  const view=S.ui.cupView||'spiele';
  $('#title').textContent=cup?cup.name:'Pokal';
  let sub='DFB-Pokal und 16 Landespokale';
  if (s.status==='done') sub+=' · abgeschlossene Saison';
  $('#subline').innerHTML=sub;
  setActions(seasonActions(s, false));
  $('#tabs').innerHTML='';
  $('#view').innerHTML=viewPokal(s, cup, view);
}
function cupSelectHTML(key){
  let h='<select id="cupSelect" title="Pokal">';
  h+='<option value="dfb"'+(key==='dfb'?' selected':'')+'>DFB-Pokal</option>';
  h+='<optgroup label="Landespokale">';
  BL_ORDER.forEach(bl=>{ h+='<option value="'+esc(bl)+'"'+(key===bl?' selected':'')+'>'+esc(bl)+'</option>'; });
  h+='</optgroup></select>';
  return h;
}
function viewPokal(s, cup, view){
  const ed=isEditable();
  const key=S.ui.cup;
  let h='<div class="pokal-bar">'+cupSelectHTML(key);
  h+='<span class="toggle" data-toggle="cupView">'+[['spiele','Spielplan'],['baum','Turnierbaum'],['sieger','Sieger'],['uebersicht','Übersicht'],['qualifikation','Qualifikation'],['rekorde','Rekorde']].map(([k,n])=>'<button data-v="'+k+'" class="'+(view===k?'active':'')+'">'+n+'</button>').join('')+'</span>';
  h+='</div>';
  if (!cup && view!=='qualifikation' && view!=='rekorde') return h+'<div class="box">Dieser Pokal fehlt.</div>';
  if (view==='sieger') return h+viewCupWinners(s);
  if (view==='baum') return h+viewCupTree(s, cup);
  if (view==='uebersicht') return h+viewCupOverview(s, cup);
  if (view==='rekorde') return h+viewCupRekorde(key);
  if (view==='qualifikation'){
    const dfb=s.cups&&s.cups.dfb;
    return h+(dfb?viewCupSpots(dfb):'<div class="box">In dieser Saison gibt es keine Landespokal-Qualifikation.</div>');
  }
  return h+viewCupRound(s, cup, ed);
}
function viewCupRound(s, cup, ed){
  const key=S.ui.cup;
  let ri=S.ui.cupRound;
  if (ri==null || ri<0 || ri>=cup.rounds.length){
    const open=cup.rounds.findIndex(r=>!roundComplete(r));
    ri=open<0?cup.rounds.length-1:open;
  }
  S.ui.cupRound=ri;
  const round=cup.rounds[ri];
  const done=(round.matches||[]).filter(cupWinner).length;
  let h='<div class="card"><div class="card-title"><span>'+esc(round.name)+' <span class="progress">('+(round.drawn?done+'/'+(round.matches||[]).length+' entschieden':'nicht ausgelost')+')</span></span>';
  h+='<span class="md-nav"><button class="btn" data-act="cupPrev">‹</button><select id="cupRound">';
  cup.rounds.forEach((r,i)=>{ h+='<option value="'+i+'"'+(i===ri?' selected':'')+'>'+esc(r.name)+(roundComplete(r)?' ✓':'')+'</option>'; });
  h+='</select><button class="btn" data-act="cupNext">›</button></span></div>';
  if (round.archived && !(round.matches&&round.matches.length)){
    h+='<p class="muted">Die einzelnen Spiele dieser Runde sind nicht mehr gespeichert. Wer welche Runde erreicht hat, steht auf der Vereinsseite. Das Finale bleibt in der Siegerliste.</p></div>';
    return h;
  }
  if (cup.kind==='dfb' && ri===0){
    h+='<p class="cup-note">64 Mannschaften. Profitopf: die 20 der Bundesliga und die Plätze 1–12 der 2. Bundesliga. Amateurtopf: Plätze 13–20 der 2. Bundesliga, Plätze 1–8 der 3. Liga und 16 über die Landespokale. In der 1. Runde spielt jeder Amateurverein zu Hause gegen einen Profi.</p>';
  }
  if (cup.archived) h+='<p class="cup-note">Ältere Runden dieses Pokals sind abgelegt. Das Finale bleibt hier, die erreichte Runde jedes Vereins in der Vereinsinfo.</p>';
  if (cup.kind==='land' && ri===0 && cup.entrants && cup.entrants.length){
    h+='<p class="cup-note">'+cup.entrants.length+' Vereine aus '+esc(cup.bl)+', von der 3. Liga bis zur Amateurliga. Freilose gehen an die bestplatzierten Vereine des Vorjahres. Die schwächere Liga hat Heimrecht, innerhalb derselben Liga der zuerst gezogene. Der Sieger zieht in den DFB-Pokal der nächsten Saison ein.</p>';
  }
  if (!round.drawn){
    const ready=ri===0 || roundComplete(cup.rounds[ri-1]);
    const isFinal=round.name==='Finale';
    h+='<div class="sp-tools">';
    if (isFinal) h+='<span class="muted">Das Finale wird ausgelost, sobald beide Halbfinals feststehen.</span>';
    else if (ed && ready) h+='<button class="btn primary" data-act="cupDraw" data-cup="'+esc(key)+'" data-ri="'+ri+'">Auslosen</button>';
    else h+='<span class="muted">'+(ed?'Zuerst die vorherige Runde zu Ende spielen.':'Diese Runde ist nicht ausgelost.')+'</span>';
    h+='</div></div>';
    if (round.byes && round.byes.length) h+='<div class="box"><b>Freilos in dieser Runde:</b> '+round.byes.map(id=>esc(TEAMS[id].name)).join(', ')+'</div>';
    return h;
  }
  const rows=round.matches.map((m,i)=>({m,i})).sort((a,b)=>cupSlotOrder(a.m.slot,b.m.slot)||a.i-b.i);
  let prev='', buf=[];
  const flush=()=>{
    if (!buf.length) return;
    const one=buf.length===1;
    const lines=Math.ceil(buf.length/2);
    h+='<div class="cup-cols'+(one?' one':'')+'"'+(one?'':' style="grid-template-rows:repeat('+lines+',auto)"')+'>'+buf.join('')+'</div>';
    buf=[];
  };
  rows.forEach(({m,i})=>{
    const lab=cupSlotLabel(m.slot, m.neutral||round.neutral);
    if (lab!==prev){ flush(); h+='<div class="slot-head">'+esc(lab)+'</div>'; prev=lab; }
    buf.push(cupMatchHTML(s, m, key, ri, i, ed));
  });
  flush();
  if (round.byes && round.byes.length) h+='<div class="sp-hint"><b>Freilos:</b> '+round.byes.map(id=>esc(TEAMS[id].name)).join(', ')+'</div>';
  h+='<div class="sp-hint">Ein Sieg trägt den Sieger ein. „n.V.“ markiert eine Entscheidung nach Verlängerung. Beim Unentschieden entscheidet das Elfmeterschießen, das über dem Spielstand steht.</div>';
  h+='</div>';
  return h;
}
function viewCupSpots(cup){
  const main=(cup.spots||[]).filter(sp=>sp.via!=='liga');
  const liga=(cup.spots||[]).filter(sp=>sp.via==='liga');
  let h='<div class="box"><h3>Qualifikation über die Landespokale</h3><table class="tbl"><thead><tr><th class="l">Land</th><th class="l">Verein</th><th class="l">Weg</th></tr></thead><tbody>';
  main.forEach(sp=>{
    h+='<tr><td class="l">'+esc(sp.bl)+'</td><td class="l">'+clubHTML(sp.id,{nobl:true})+'</td><td class="l">'+esc(VIA_TEXT[sp.via]||sp.via)+'</td></tr>';
  });
  h+='</tbody></table>';
  if (liga.length){
    h+='<h3 style="margin-top:14px">Nachgerückt aus der 3. Liga</h3><p class="muted">Beide Finalisten dieses Landes waren schon qualifiziert. Der Platz geht an den nächsten freien Verein der 3. Liga, nicht an den Pokalsieger.</p><table class="tbl"><thead><tr><th class="l">Platz</th><th class="l">Verein</th></tr></thead><tbody>';
    liga.forEach(sp=>{
      const label=(sp.place?sp.place+'. ':'')+'3. Liga (für '+sp.bl+')';
      h+='<tr><td class="l">'+esc(label)+'</td><td class="l">'+clubHTML(sp.id,{nobl:true})+'</td></tr>';
    });
    h+='</tbody></table>';
  }
  h+='</div>';
  return h;
}
const OV_ORDER=['Bundesliga','2. Bundesliga','3. Liga','4. Liga','Regionalliga','Oberliga','Amateurliga'];
function leagueBucket(season, id){
  const lid=clubLeagueId(season, id);
  if (lid==='BL') return 'Bundesliga';
  if (lid==='BL2') return '2. Bundesliga';
  if (lid==='L3') return '3. Liga';
  if (lid==='L4') return '4. Liga';
  if (L[lid] && L[lid].level===5) return 'Regionalliga';
  if (L[lid] && L[lid].level===6) return 'Oberliga';
  return 'Amateurliga';
}
function cupAliveSet(cup){
  if (cup && cup.archived){
    const fin=cupFinalists(cup);
    const alive=new Set();
    if (fin && fin.winner) alive.add(fin.winner);
    return alive;
  }
  const alive=new Set(cup.entrants||[]);
  (cup.rounds||[]).forEach((round, ri)=>{
    (round.byes||[]).forEach(id=>alive.add(id));
    (round.matches||[]).forEach(m=>{
      alive.add(m.h); alive.add(m.a);
      const w=cupWinner(m);
      if (!w) return;
      if (m.h!==w) alive.delete(m.h);
      if (m.a!==w) alive.delete(m.a);
    });
  });
  return alive;
}
function cupExitMatch(cup, id){
  if (!cup) return null;
  let found=null;
  (cup.rounds||[]).forEach(round=>{
    (round.matches||[]).forEach(m=>{
      if (m.hg==null||m.ag==null) return;
      const w=cupWinner(m);
      if ((m.h===id||m.a===id) && w && w!==id) found=m;
    });
  });
  return found;
}
function ovLostCard(cup, id){
  const t=TEAMS[id];
  const m=cupExitMatch(cup, id);
  if (!m) return '<div class="nm">'+esc(t.name)+'</div>';
  return '<div class="nm">'+esc(t.name)+'</div>'+matchLineHTML({h:m.h, a:m.a, hg:m.hg, ag:m.ag, et:m.et, peh:m.peh, pea:m.pea, nodel:true, klass:'tip-match'});
}
function ovGroupsHTML(season, ids, alive, cup){
  const G={};
  ids.forEach(id=>{ const g=leagueBucket(season, id); (G[g]=G[g]||[]).push(id); });
  let h='';
  OV_ORDER.filter(g=>G[g]&&G[g].length).forEach(g=>{
    const list=G[g].slice().sort(byRang);
    const n=list.length, left=list.filter(id=>alive.has(id)).length;
    h+='<div class="ov-lg"><div class="ov-lg-h"><span>'+esc(g)+'</span><span class="c"><b>'+left+'</b> / '+n+'</span></div><div class="ov-row">';
    list.forEach(id=>{
      const t=TEAMS[id], out=!alive.has(id);
      const tip=out?ovLostCard(cup, id):'<div class="nm">'+esc(t.name)+'</div>';
      h+='<div class="ov-c'+(out?' out':'')+'" data-club="'+id+'"><img src="'+esc(t.crest)+'" alt="" data-club="'+id+'"><div class="ov-tip'+(out?' wide':'')+'">'+tip+'</div></div>';
    });
    h+='</div></div>';
  });
  return h;
}
function viewCupOverview(s, cup){
  if (cup.archived){
    const fin=cupFinalists(cup);
    let h='<div class="box"><p class="muted">'+esc(cup.name)+' '+esc(s.name)+' · die einzelnen Spiele sind abgelegt. Das Finale bleibt erhalten.</p>';
    if (fin && fin.winner){
      const b=fin.match?cupScoreBits(fin.match):null;
      const home=fin.match?fin.match.h:fin.winner, away=fin.match?fin.match.a:fin.finalist;
      const line=b?((b.above?b.above+' ':'')+b.main):'';
      h+='<p><b>Finale:</b> '+esc(TEAMS[home].name)+' '+esc(line)+' '+esc(TEAMS[away].name)+'</p>';
    }
    h+='</div>';
    return h;
  }
  const alive=cupAliveSet(cup);
  const total=(cup.entrants||[]).length;
  const left=alive.size;
  let doneName='', nextName='';
  for (let i=0;i<cup.rounds.length;i++){
    const r=cup.rounds[i];
    if (r.drawn && roundComplete(r)) doneName=r.name;
    else { nextName=r.name; break; }
  }
  const stand=doneName ? 'nach '+doneName : 'vor dem Start';
  let h='<div class="box ov-plain"><p class="muted">'+esc(cup.name)+' '+esc(s.name)+' · '+esc(stand)+' · '+left+' von '+total+' noch dabei. Bei einem Ausgeschiedenen steht das verlorene Spiel.</p>';
  if (cup.kind==='dfb'){
    const pro=new Set(cup.pro||[]);
    const pros=(cup.entrants||[]).filter(id=>pro.has(id));
    const ams=(cup.entrants||[]).filter(id=>!pro.has(id));
    h+='<h3 class="ov-pot">Profitopf</h3>'+ovGroupsHTML(s, pros, alive, cup);
    h+='<h3 class="ov-pot">Amateurtopf</h3>'+ovGroupsHTML(s, ams, alive, cup);
  } else h+=ovGroupsHTML(s, cup.entrants||[], alive, cup);
  h+='</div>';
  return h;
}
function cupMatchHTML(s, m, key, ri, i, ed){
  const played=m.hg!=null && m.ag!=null;
  const win=cupWinner(m);
  const draw=played && m.hg===m.ag;
  const km=m.neutral ? null : kmBetween(m.h, m.a);
  const step=side=>ed?'<span class="stepper"><button type="button" data-act="cupGoal" data-cup="'+esc(key)+'" data-ri="'+ri+'" data-mi="'+i+'" data-side="'+side+'" data-dir="1" title="Tor">+</button><button type="button" data-act="cupGoal" data-cup="'+esc(key)+'" data-ri="'+ri+'" data-mi="'+i+'" data-side="'+side+'" data-dir="-1" title="Tor zurück">−</button></span>':'';
  let meta=m.neutral ? '' : (km!=null ? km+' km' : '');
  const hasPen=m.peh!=null && m.pea!=null && m.peh!==m.pea;
  const ieLabel=hasPen ? m.peh+':'+m.pea+' i.E.' : 'i.E.';
  let above='<span class="ie-slot"></span>';
  if (draw && hasPen){
    above=ed
      ? '<button type="button" class="ie-link" data-act="cupIe" data-cup="'+esc(key)+'" data-ri="'+ri+'" data-mi="'+i+'">'+ieLabel+'</button>'
      : '<span class="ie-link ie-static">'+ieLabel+'</span>';
  } else if (draw && !hasPen && ed){
    above='<button type="button" class="ie-link" data-act="cupIe" data-cup="'+esc(key)+'" data-ri="'+ri+'" data-mi="'+i+'">i.E.</button>';
  } else if (!draw && ed){
    above='<label class="ie-box"><input type="checkbox" data-cup-et="1" data-cup="'+esc(key)+'" data-ri="'+ri+'" data-mi="'+i+'"'+((played && m.et)?' checked':'')+(played?'':' disabled')+'> n.V.</label>';
  } else if (!draw && m.et) above='<span class="ie-box">n.V.</span>';
  const below='<span class="ie-slot"></span>';
  return matchLineHTML({h:m.h, a:m.a, hg:played?m.hg:null, ag:played?m.ag:null, season:s, liga:true, cup:true, klass:'cup-spiel', done:!!win, step, above, below, km:meta?km:null, attr:' data-mi="'+i+'"', del:ed?'<button type="button" class="del" data-act="cupDel" data-cup="'+esc(key)+'" data-ri="'+ri+'" data-mi="'+i+'" title="Zurücksetzen">×</button>':'<span></span>'});
}
let penEdit=null;
function openPenDialog(cupKey, ri, mi){
  const s=cur(); if (!isEditable()) return;
  ensureCups(s);
  const cup=getCup(s, cupKey);
  const m=cup && cup.rounds[ri] && cup.rounds[ri].matches[mi];
  if (!m || m.hg==null || m.ag==null || m.hg!==m.ag) return;
  penEdit={cup:cupKey, ri, mi, h:m.peh==null?0:m.peh, a:m.pea==null?0:m.pea};
  const side=(id, which)=>{
    const t=TEAMS[id];
    return '<div class="pen-side"><img src="'+esc(t.crest)+'" alt=""><div class="nm">'+esc(t.name)+'</div><div class="pen-num" id="pen'+which+'">0</div><span class="stepper pen-step"><button type="button" data-act="penAdj" data-side="'+(which==='H'?0:1)+'" data-dir="1" title="Elfmeter">+</button><button type="button" data-act="penAdj" data-side="'+(which==='H'?0:1)+'" data-dir="-1" title="Elfmeter zurück">−</button></span></div>';
  };
  openModal('<div class="pen-dlg"><h3>Elfmeterschießen</h3><p class="muted">'+m.hg+':'+m.ag+' nach 90 Minuten und Verlängerung. Unentschieden im Elfmeterschießen ist nicht möglich.</p><div class="pen-sides">'+side(m.h,'H')+'<b class="pen-colon">:</b>'+side(m.a,'A')+'</div><div class="pen-actions"><button type="button" class="btn" data-act="penCancel">Abbrechen</button><button type="button" class="btn primary" id="penOk" data-act="penOk" disabled>OK</button></div></div>');
  paintPen();
}
function paintPen(){
  if (!penEdit) return;
  const h=$('#penH'), a=$('#penA'), ok=$('#penOk');
  if (h) h.textContent=String(penEdit.h);
  if (a) a.textContent=String(penEdit.a);
  if (ok) ok.disabled=penEdit.h===penEdit.a;
}
function closePen(){ penEdit=null; $('#modal').classList.add('hidden'); }
function ligaEdge(season, id){
  const lid=clubLeagueId(season, id);
  if (L[lid]) return L[lid].short;
  if (P[lid]) return 'Amateur';
  return '';
}
function crestTip(id){
  const t=TEAMS[id];
  return '<img src="'+esc(t.crest)+'" alt="" data-club="'+id+'" title="'+esc(t.name)+'">';
}
function viewCupTree(s, cup){
  let h='';
  cup.rounds.forEach(round=>{
    h+='<div class="card br-round"><div class="card-title"><span>'+esc(round.name)+'</span></div>';
    if (round.archived && !(round.matches&&round.matches.length)) h+='<p class="muted br-note">Spiele nicht gespeichert</p>';
    else if (!round.drawn) h+='<p class="muted br-note">noch nicht ausgelost</p>';
    else {
      const lines=round.matches.map(m=>'<div class="br-m">'+matchLineHTML({h:m.h, a:m.a, hg:m.hg, ag:m.ag, et:m.et, peh:m.peh, pea:m.pea, nodel:true, klass:'br-line'})+'</div>');
      h+='<div class="cup-cols'+(lines.length===1?' one':'')+'">'+lines.join('')+'</div>';
    }
    if (round.byes&&round.byes.length) h+='<p class="muted br-note">Freilos: '+round.byes.map(id=>esc(TEAMS[id].name)).join(', ')+'</p>';
    h+='</div>';
  });
  return h;
}
function seasonLeagueTag(season, id){
  const lid=season ? clubLeagueId(season, id) : '';
  if (L[lid]) return L[lid].short;
  if (P[lid]) return 'Amateur';
  return '';
}
function siegerRow(year, winnerId, finalistId, match, season, liga){
  const home=match ? match.h : winnerId;
  const away=match ? match.a : finalistId;
  return '<div class="sieger-row"><div class="sieger-year">'+esc(year)+'</div><div class="sieger-who">'+clubHTML(winnerId,{nobl:true})+'</div><div class="sieger-who">'+clubHTML(finalistId,{nobl:true})+'</div><div class="sieger-final">'+matchLineHTML({h:home, a:away, hg:match&&match.hg, ag:match&&match.ag, et:match&&match.et, peh:match&&match.peh, pea:match&&match.pea, season, liga:!!liga, nodel:true, klass:'sieger-match'})+'</div></div>';
}
function siegerHead(){
  return '<div class="sieger-row sieger-head"><div>Jahr</div><div>Sieger</div><div>Finalist</div><div>Finale</div></div>';
}
function viewCupWinners(){
  const key=S.ui.cup||'dfb';
  const rows=[];
  S.seasons.forEach(sea=>{
    if (!sea.cups) return;
    const cup=key==='dfb' ? sea.cups.dfb : (sea.cups.land && sea.cups.land[key]);
    const fin=cupFinalists(cup);
    if (fin) rows.push(siegerRow(sea.name, fin.winner, fin.finalist, fin.match, sea, true));
  });
  const title=key==='dfb' ? 'DFB-Pokal' : key;
  if (!rows.length) return '<div class="box"><h3>Sieger '+esc(title)+'</h3><p class="muted">Noch kein entschiedenes Finale.</p></div>';
  return '<div class="box sieger-box"><h3>Sieger '+esc(title)+'</h3>'+siegerHead()+rows.reverse().join('')+'</div>';
}
function touchDecide(lid, idx, fn){
  if (!isEditable()) return;
  const list=cur().leagues[lid] && cur().leagues[lid].decide;
  const m=list && list[idx]; if (!m) return;
  fn(m);
  const leg1=list.find(x=>x.key===m.key && x.leg===1);
  if (m.leg===2 && !aggregateLevel(leg1, m)){ m.peh=null; m.pea=null; }
  save(); render();
}
function applyDecideGoal(lid, idx, side, dir){
  touchDecide(lid, idx, m=>{
    const unplayed=m.hg==null||m.ag==null;
    if (unplayed){
      if (dir>0){ m.hg=side===0?1:0; m.ag=side===0?0:1; }
      else { m.hg=0; m.ag=0; }
      return;
    }
    if (dir<0 && m.hg===0 && m.ag===0){ m.hg=null; m.ag=null; m.et=false; m.peh=null; m.pea=null; return; }
    if (side===0) m.hg=Math.max(0, m.hg+dir); else m.ag=Math.max(0, m.ag+dir);
  });
}
function openDecidePen(idx){
  const lid=S.ui.league, list=cur().leagues[lid] && cur().leagues[lid].decide;
  const m=list && list[idx]; if (!m) return;
  const leg1=list.find(x=>x.key===m.key && x.leg===1);
  if (m.leg!==2 || !aggregateLevel(leg1, m)) return;
  penEdit={decide:idx, h:m.peh==null?0:m.peh, a:m.pea==null?0:m.pea};
  const side=(id, which)=>{
    const t=TEAMS[id];
    return '<div class="pen-side"><img src="'+esc(t.crest)+'" alt=""><div class="nm">'+esc(t.name)+'</div><div class="pen-num" id="pen'+which+'">0</div><span class="stepper pen-step"><button type="button" data-act="penAdj" data-side="'+(which==='H'?0:1)+'" data-dir="1">+</button><button type="button" data-act="penAdj" data-side="'+(which==='H'?0:1)+'" data-dir="-1">−</button></span></div>';
  };
  openModal('<div class="pen-dlg"><h3>Elfmeterschießen im Rückspiel</h3><p class="muted">Hin- und Rückspiel stehen gesamt gleich. Das Elfmeterschießen entscheidet, Auswärtstore zählen hier nicht.</p><div class="pen-sides">'+side(m.h,'H')+'<b class="pen-colon">:</b>'+side(m.a,'A')+'</div><div class="pen-actions"><button type="button" class="btn" data-act="penCancel">Abbrechen</button><button type="button" class="btn primary" id="penOk" data-act="penOk" disabled>OK</button></div></div>');
  paintPen();
}
function applyCupGoal(key, ri, mi, side, dir){
  mutateCup(key, ri, mi, m=>{
    const unplayed=m.hg==null||m.ag==null;
    if (unplayed){
      if (dir>0){ m.hg=side===0?1:0; m.ag=side===0?0:1; }
      else { m.hg=0; m.ag=0; }
      return;
    }
    if (dir<0 && m.hg===0 && m.ag===0){ m.hg=null; m.ag=null; m.et=false; m.peh=null; m.pea=null; return; }
    if (side===0) m.hg=Math.max(0, m.hg+dir); else m.ag=Math.max(0, m.ag+dir);
  });
}
function mutateCup(cupKey, ri, mi, fn){
  const s=cur(); if (!isEditable()) return;
  if (penEdit) closePen();
  ensureCups(s);
  const cup=getCup(s, cupKey); if (!cup) return;
  const m=cup.rounds[ri] && cup.rounds[ri].matches[mi]; if (!m) return;
  fn(m);
  if (m.hg!=null && m.ag!=null && m.hg!==m.ag){ m.peh=null; m.pea=null; }
  if (m.hg!=null && m.ag!=null && m.hg===m.ag) m.et=false;
  clearLaterRounds(cup, ri);
  maybeAutoFinal(s, cup);
  save(); render();
}
function maybeAutoFinal(season, cup){
  if (!cup || !cup.rounds || cup.rounds.length<2) return false;
  const fin=cup.rounds[cup.rounds.length-1];
  if (!fin || fin.name!=='Finale' || fin.drawn) return false;
  if (!roundComplete(cup.rounds[cup.rounds.length-2])) return false;
  return drawCupRound(season, cup, cup.rounds.length-1);
}
function render(){
  if (S.ui.tab==='abschluss') S.ui.tab='aufab';
  if (S.ui.tab==='derbys') S.ui.tab='tabelle';
  renderMigrate();
  renderSettings();
  renderNav();
  setActions('');
  const s=cur(), lid=S.ui.league;
  if (S.ui.tab==='info'){ renderInfo(); return; }
  if (S.ui.tab==='ansehen'){
    $('#title').textContent='Ansehen';
    $('#subline').innerHTML='';
    $('#tabs').innerHTML='';
    $('#view').innerHTML=S.ui.ansehenId?viewAnsehenDetail(S.ui.ansehenId):viewAnsehen();
    return;
  }
  if (S.ui.tab==='aufab'){ renderAufAb(); return; }
  if (S.ui.tab==='supercup'){ renderSupercup(); return; }
  if (S.ui.tab==='verein'){ renderVerein(); return; }
  if (S.ui.tab==='pokal'){
    renderPokal(s);
    return;
  }
  if (lid==='AM' || P[lid]){ renderAmateur(); return; }
  const lg=L[lid];
  $('#title').textContent=lg.name;
  const pr=seasonProgress(s), lp=leagueProgress(s,lid);
  let sub = '<a data-act="rules">Regeln &amp; Auf-/Abstieg</a> · Liga '+lp.done+'/'+lp.total+' · alle Ligen '+pr.done+'/'+pr.total;
  if (s.status==='done') sub+=' · abgeschlossene Saison';
  $('#subline').innerHTML=sub;
  setActions(seasonActions(s));
  $('#tabs').innerHTML=TABS.map(([k,n])=>'<a class="tab'+(S.ui.tab===k?' active':'')+'" data-tab="'+k+'">'+n+'</a>').join('');
  const v=$('#view');
  if (S.ui.tab==='tabelle') v.innerHTML=viewTabelle(s,lid);
  else if (S.ui.tab==='karte') v.innerHTML=viewKarte(s,lid);
  else if (S.ui.tab==='terminierung') v.innerHTML=viewTerminierung(s,lid);
  else if (S.ui.tab==='heimaus') v.innerHTML=viewToggle(s,lid,'ha');
  else if (S.ui.tab==='hinrueck') v.innerHTML=viewToggle(s,lid,'hr');
  else if (S.ui.tab==='ewig') v.innerHTML=viewEwig(lid);
  else if (S.ui.tab==='historie') v.innerHTML=viewHistorie(lid);
  else if (S.ui.tab==='rekorde') v.innerHTML=viewRekorde(lid);
  if (S.ui.tab==='karte') bindMap();
}
function currentMd(s,lid){
  const key=S.view+':'+lid;
  const lg=s.leagues[lid];
  if (!lg || !lg.md) return 0;
  if (S.ui.md[key]!=null) return S.ui.md[key];
  const md=lg.md; const i=md.findIndex(d=>d.some(m=>m[2]==null||m[3]==null));
  return i<0 ? md.length-1 : i;
}
function viewTabelle(s,lid){
  return '<div class="split"><div class="card" id="tableCard">'+tableHTML(leagueTable(s,lid),L[lid],{nobl:true})+'</div><div class="card" id="spCard">'+spielplanHTML(s,lid)+'</div></div>';
}
let shownMd=0;
function spielplanHTML(s,lid){
  const lg=s.leagues[lid];
  if (!lg || !lg.md) return '<div class="card-title"><span>Spielplan</span></div><p class="muted">Die einzelnen Spiele dieser Saison sind nicht mehr gespeichert. Tabelle, Heim/Auswärts und Hin/Rückrunde bleiben erhalten.</p>';
  const mi=currentMd(s,lid);
  shownMd=mi; S.ui.md[S.view+':'+lid]=mi;
  const md=lg.md[mi], ed=isEditable();
  const done=md.filter(m=>m[2]!=null&&m[3]!=null).length;
  let h='<div class="card-title"><span>Spielplan <span class="progress">('+done+'/'+md.length+' eingetragen)</span></span><span class="md-nav"><button class="btn" data-act="mdPrev" title="Vorheriger Spieltag">‹</button><select id="mdSelect">'+
    lg.md.map((d,i)=>{const c=d.every(m=>m[2]!=null&&m[3]!=null); return '<option value="'+i+'"'+(i===mi?' selected':'')+'>'+(i+1)+'. Spieltag'+(c?' ✓':'')+'</option>';}).join('')+
    '</select><button class="btn" data-act="mdNext" title="Nächster Spieltag">›</button></span></div>';
  const slots=isScheduled(s,lid,mi)?s.kickoffs[lid][mi]:null;
  if (!slots){
    h+='<div class="slot-head">nicht terminiert</div>';
    md.forEach((m,k)=>{
      const hid=lg.teams[m[0]], aid=lg.teams[m[1]], km=kmBetween(hid,aid);
      const mk=id=>(s.markers&&s.markers[id])||null;
      const marks={}; if(mk(hid)) marks[hid]=mk(hid); if(mk(aid)) marks[aid]=mk(aid);
      h+=matchLineHTML({h:hid, a:aid, km, marker:marks, bl:true, klass:'unscheduled', attr:' data-k="'+k+'"'});
    });
    if (ed && lastScheduled(s,lid)<0) h+='<div class="sp-tools"><button class="btn primary" data-act="termBlock">Spieltage 1–4 terminieren</button></div><div class="sp-hint">Erst nach der Terminierung können Ergebnisse eingetragen werden. Danach folgen die nächsten Blöcke automatisch.</div>';
    else if (ed) h+='<div class="sp-hint">Dieser Spieltag ist noch nicht terminiert.</div>';
    return h;
  }
  const ordered=md.map((m,k)=>({m,k,slot:slots[k]})).sort((a,b)=>slotOrder(a.slot,b.slot)||a.k-b.k);
  const simultaneous=isClosingDay(lg.md.length, mi);
  let prevSlot='';
  ordered.forEach(({m,k,slot})=>{
    const lab=slotLabel(slot, simultaneous);
    if (lab!==prevSlot){ h+='<div class="slot-head">'+esc(lab)+'</div>'; prevSlot=lab; }
    const has=m[2]!=null&&m[3]!=null;
    const hid=lg.teams[m[0]], aid=lg.teams[m[1]];
    const km=kmBetween(hid,aid);
    const mk=id=>(s.markers&&s.markers[id])||null;
    const step=side=>ed?'<span class="stepper"><button type="button" data-act="goal" data-k="'+k+'" data-side="'+side+'" data-dir="1" title="Tor">+</button><button type="button" data-act="goal" data-k="'+k+'" data-side="'+side+'" data-dir="-1" title="Tor zurück">−</button></span>':'';
    const marks={}; if(mk(hid)) marks[hid]=mk(hid); if(mk(aid)) marks[aid]=mk(aid);
    h+=matchLineHTML({h:hid, a:aid, hg:has?m[2]:null, ag:has?m[3]:null, km, marker:marks, bl:true, step, attr:' data-k="'+k+'"', del:ed?'<button type="button" class="del" data-act="del" data-k="'+k+'" title="Auf -:- zurücksetzen">×</button>':'<span></span>'});
  });
  if (ed){
    h+='<div class="sp-tools"><button class="btn small" data-act="simMd" title="Nur leere Spiele dieses Spieltags">Spieltag simulieren</button><button class="btn small" data-act="simBlock" title="Die vier Spieltage des aktuellen Blocks">Block simulieren</button><button class="btn small" data-act="simLeague">Liga zu Ende simulieren</button></div>'+
      '<div class="sp-hint">＋ und − ändern die Tore. Offenes Spiel: Heim-＋ wird 1:0, Gast-＋ wird 0:1, − wird 0:0. Bei 0:0 setzen − oder × das Spiel auf -:- zurück. Ist der letzte angesetzte Spieltag voll, wird der nächste Block terminiert.</div>';
  }
  if (lg.decide && lg.decide.length && shownMd===lg.md.length-1) h+=decideHTML(s, lid);
  return h;
}
function decideHTML(s, lid){
  const lg=s.leagues[lid], ed=isEditable();
  const slot=lg.decide[0] && lg.decide[0].slot;
  let h='<div class="slot-head">Entscheidungsspiel'+(slot?' · '+slot.dow+' '+slot.time:'')+'</div>';
  h+='<p class="cup-note">Diese Vereine sind nach allen Wertungskriterien gleich. Hin- und Rückspiel, das Hinspiel wurde ausgelost. Es zählt das Gesamtergebnis, keine Auswärtstore. Steht es danach gleich, entscheiden Verlängerung oder Elfmeterschießen im Rückspiel.</p>';
  lg.decide.forEach((m,i)=>{
    const played=m.hg!=null && m.ag!=null;
    const leg1=lg.decide.find(x=>x.key===m.key && x.leg===1);
    const needPen=m.leg===2 && aggregateLevel(leg1, m);
    const hasPen=m.peh!=null && m.pea!=null && m.peh!==m.pea;
    const km=kmBetween(m.h, m.a);
    const step=side=>ed?'<span class="stepper"><button type="button" data-act="decideGoal" data-di="'+i+'" data-side="'+side+'" data-dir="1">+</button><button type="button" data-act="decideGoal" data-di="'+i+'" data-side="'+side+'" data-dir="-1">−</button></span>':'';
    let above='<span class="ie-slot"></span>';
    if (needPen && hasPen) above=ed
      ? '<button type="button" class="ie-link" data-act="decideIe" data-di="'+i+'">'+m.peh+':'+m.pea+' i.E.</button>'
      : '<span class="ie-link ie-static">'+m.peh+':'+m.pea+' i.E.</span>';
    else if (m.leg===2 && needPen && !hasPen && ed) above='<button type="button" class="ie-link" data-act="decideIe" data-di="'+i+'">i.E.</button>';
    else if (m.leg===2 && !needPen && ed) above='<label class="ie-box"><input type="checkbox" data-decide-et="'+i+'"'+(m.et?' checked':'')+(played?'':' disabled')+'> n.V.</label>';
    else if (m.leg===2 && !needPen && m.et) above='<span class="ie-box">n.V.</span>';
    const below='<span class="ie-box">'+(m.leg===1?'Hinspiel':'Rückspiel')+'</span>';
    h+=matchLineHTML({h:m.h, a:m.a, hg:played?m.hg:null, ag:played?m.ag:null, bl:true, cup:true, done:!!twoLegWinner(leg1, lg.decide.find(x=>x.key===m.key&&x.leg===2)), step, above, below, km, del:ed?'<button type="button" class="del" data-act="decideDel" data-di="'+i+'">×</button>':'<span></span>'});
  });
  return h;
}
function viewToggle(s,lid,kind){
  const lg=s.leagues[lid];
  const splitKey=kind==='ha'?'home':'hin';
  if (lg && lg.tables && !lg.md && !lg.tables[splitKey]){
    return '<div class="box"><p class="muted">Für diese ältere Saison ist nur die Gesamttabelle gespeichert. Sie steht unter Tabelle. Heim, Auswärts, Hinrunde und Rückrunde wurden abgelegt.</p></div>';
  }
  if (kind==='ha'){
    return '<div class="twin"><div class="card"><div class="card-title">Heimtabelle</div>'+tableHTML(leagueTable(s,lid,'home'),L[lid],{zones:false})+'</div><div class="card"><div class="card-title">Auswärtstabelle</div>'+tableHTML(leagueTable(s,lid,'away'),L[lid],{zones:false})+'</div></div>';
  }
  return '<div class="twin"><div class="card"><div class="card-title">Hinrunde</div>'+tableHTML(leagueTable(s,lid,'all','hin'),L[lid],{zones:false})+'</div><div class="card"><div class="card-title">Rückrunde</div>'+tableHTML(leagueTable(s,lid,'all','rueck'),L[lid],{zones:false})+'</div></div>';
}
function blLoyalSet(){
  const banned=new Set(), marked=new Set();
  const seasons=S.seasons||[];
  if (!seasons.length || !seasons[0].leagues || !seasons[0].leagues.BL) return marked;
  (seasons[0].leagues.BL.teams||[]).forEach(id=>marked.add(id));
  seasons.forEach(s=>{
    ((s.endData&&s.endData.moves)||[]).forEach(m=>{
      if (m.from==='BL' && m.type==='ab'){ banned.add(m.id); marked.delete(m.id); }
    });
    ((s.endData&&s.endData.moves)||[]).forEach(m=>{
      if (m.to==='BL' && m.type==='auf' && !banned.has(m.id)) marked.add(m.id);
    });
  });
  return marked;
}
function viewEwig(lid){
  const agg={}, seasons={};
  S.seasons.forEach(s=>{ if(!s.leagues[lid]) return;
    s.leagues[lid].teams.forEach(id=>{ seasons[id]=(seasons[id]||0)+1; });
    const rows = s.leagues[lid].tables && !s.leagues[lid].md ? s.leagues[lid].tables.all : computeTable(s.leagues[lid].teams, matchesOf(s,lid), 'all');
    rows.forEach(r=>{
      const a=agg[r.id]||(agg[r.id]=emptyRow(r.id)); ['sp','s','u','n','tg','gt','pkt'].forEach(k=>a[k]+=r[k]); });
  });
  const rows=Object.values(agg); rows.forEach(r=>r.diff=r.tg-r.gt);
  rows.sort((a,b)=>b.pkt-a.pkt||b.diff-a.diff||b.tg-a.tg||byRang(a.id,b.id));
  const loyal=lid==='BL'?blLoyalSet():null;
  let h='<div class="card"><div class="legend">Alle Spiele aller Saisons in der '+esc(L[lid].name)+' (inkl. laufender Saison), Wertung 3-Punkte-Regel.'+(loyal?' Hervorgehoben: seit dem Eintritt nie aus der Bundesliga abgestiegen. Nach dem ersten Abstieg ist die Markierung dauerhaft weg. Die Vereine der ersten Saison zählen als nie abgestiegen.':'')+'</div><table class="tbl"><thead><tr>'+sortHead('Pl.','pl')+sortHead('Verein','','l')+sortHead('Saisons','seasons')+sortHead('Sp.','sp')+sortHead('S','s')+sortHead('U','u')+sortHead('N','n')+sortHead('T/GT','tg')+sortHead('Diff.','diff')+sortHead('Pkt.','pkt')+'</tr></thead><tbody>';
  rows.forEach((r,i)=>{ h+='<tr'+(loyal&&loyal.has(r.id)?' class="loyal"':'')+'>'+sortCell(i+1, i+1)+'<td class="l">'+clubHTML(r.id)+'</td>'+sortCell(seasons[r.id], seasons[r.id])+sortCell(r.sp, r.sp)+sortCell(r.s, r.s)+sortCell(r.u, r.u)+sortCell(r.n, r.n)+sortCell(r.tg, r.tg+':'+r.gt)+sortCell(r.diff, (r.diff>0?'+':'')+r.diff)+sortCell(r.pkt, r.pkt, 'pts')+'</tr>'; });
  h+='</tbody></table></div>';
  return h;
}
function clubPlacements(id){
  const out=[];
  S.seasons.forEach(s=>{
    let found=false;
    for (const lid in s.leagues){ if (s.leagues[lid].teams.includes(id)){
      let row; if (s.endData && s.endData.tables) row=s.endData.tables[lid].find(r=>r.id===id);
      else row=leagueTable(s,lid).find(r=>r.id===id);
      out.push({season:s.name, lid, pl:row.pl, n:s.leagues[lid].teams.length, pkt:row.pkt, tore:row.tg+':'+row.gt, final:s.status==='done'||s.status==='ending'}); found=true; }}
    if (!found){ for (const pid in s.pools) if (s.pools[pid].includes(id)) out.push({season:s.name, lid:pid, pl:null}); }
  });
  return out;
}
function seasonLoggedMatches(season){
  try{
    if (!season) return [];
    if (season.h2h && season.h2h.length) return season.h2h.map(r=>loggedMatch(season, r)).filter(m=>m && TEAMS[m.h] && TEAMS[m.a] && m.hg!=null && m.ag!=null && isFinite(+m.hg) && isFinite(+m.ag));
    const idx=h2hBlockIndex();
    const bi=idx && idx.map ? idx.map[season.name] : null;
    if (bi==null || !S.h2hBlocks || !S.h2hBlocks[bi]) return [];
    const line=String(S.h2hBlocks[bi]).split('\n').find(l=>l.slice(0, l.indexOf('|'))===season.name);
    if (!line) return [];
    const body=line.slice(line.indexOf('|')+1);
    return body.split(';').filter(Boolean).map(rec=>decH2H(rec, season.name)).filter(m=>m && TEAMS[m.h] && TEAMS[m.a] && isFinite(+m.hg) && isFinite(+m.ag));
  }catch(e){ return []; }
}
function leagueMatchList(lid){
  const out=[];
  (S.seasons||[]).forEach(season=>{
    if (!season) return;
    const lg=season.leagues && season.leagues[lid];
    if (lg && Array.isArray(lg.md)){
      lg.md.forEach(md=>{
        (md||[]).forEach(m=>{
          if (!m || m[2]==null || m[3]==null) return;
          const h=lg.teams && lg.teams[m[0]], a=lg.teams && lg.teams[m[1]];
          if (!h || !a || !TEAMS[h] || !TEAMS[a]) return;
          out.push({season:season.name||'', h, a, hg:+m[2], ag:+m[3]});
        });
      });
      return;
    }
    seasonLoggedMatches(season).forEach(m=>{
      if (m.comp===lid) out.push({season:season.name||m.season||'', h:m.h, a:m.a, hg:+m.hg, ag:+m.ag});
    });
  });
  return out;
}
function seasonStatRows(lid){
  const out=[];
  (S.seasons||[]).forEach(season=>{
    if (!season || season.status!=='done') return;
    let rows=null;
    try{
      const end=season.endData && season.endData.tables && season.endData.tables[lid];
      if (Array.isArray(end)) rows=end;
      else {
        const all=season.leagues && season.leagues[lid] && season.leagues[lid].tables && season.leagues[lid].tables.all;
        if (Array.isArray(all)) rows=all;
      }
    }catch(e){ rows=null; }
    (rows||[]).forEach(r=>{
      if (!r || !r.id || !TEAMS[r.id] || !(+r.sp>0)) return;
      const num=k=>{ if (r[k]==null || r[k]==='') return null; const n=+r[k]; return isFinite(n)?n:null; };
      out.push({season:season.name||'', id:r.id, tg:num('tg'), gt:num('gt'), pkt:num('pkt')});
    });
  });
  return out;
}
function takeExtreme(list, valueOf, higher){
  let best=null; const hits=[];
  (list||[]).forEach(item=>{
    const v=valueOf(item);
    if (v==null || !isFinite(v)) return;
    if (best==null || (higher?v>best:v<best)){ best=v; hits.length=0; hits.push(item); }
    else if (v===best) hits.push(item);
  });
  return hits;
}
function leagueStreaks(lid){
  const matches=leagueMatchList(lid);
  const byName={};
  matches.forEach(m=>{ (byName[m.season]=byName[m.season]||[]).push(m); });
  const open={};
  const holders={S:[],U:[],N:[]};
  const best={S:-1,U:-1,N:-1};
  const close=id=>{
    const o=open[id];
    delete open[id];
    if (!o || o.len<1) return;
    const row={id, len:o.len, season:o.season};
    if (o.len>best[o.type]){ best[o.type]=o.len; holders[o.type]=[row]; }
    else if (o.len===best[o.type]) holders[o.type].push(row);
  };
  (S.seasons||[]).forEach(season=>{
    if (!season) return;
    const name=season.name||'';
    const list=byName[name]||[];
    const lg=season.leagues && season.leagues[lid];
    if (!list.length){
      if (lg && Array.isArray(lg.teams) && lg.teams.length) Object.keys(open).forEach(close);
      return;
    }
    const seq={};
    list.forEach(m=>{
      const hr=m.hg>m.ag?'S':m.hg<m.ag?'N':'U';
      const ar=m.ag>m.hg?'S':m.ag<m.hg?'N':'U';
      (seq[m.h]=seq[m.h]||[]).push(hr);
      (seq[m.a]=seq[m.a]||[]).push(ar);
    });
    const present=new Set(Object.keys(seq));
    Object.keys(open).forEach(id=>{ if (!present.has(id)) close(id); });
    present.forEach(id=>{
      seq[id].forEach(res=>{
        const o=open[id];
        if (o && o.type===res){ o.len++; o.season=name; }
        else { if (o) close(id); open[id]={type:res, len:1, season:name}; }
      });
    });
  });
  Object.keys(open).forEach(close);
  return holders;
}
function recClub(id){ return id && TEAMS[id] ? clubHTML(id,{nobl:true}) : ''; }
function recMatchLine(m){
  return '<div class="rec-line"><span class="rec-meta">'+esc(m.season||'')+'</span>'+recClub(m.h)+'<span class="rec-sc">'+m.hg+':'+m.ag+'</span>'+recClub(m.a)+'</div>';
}
function recTeamLine(id, value, season){
  return '<div class="rec-line">'+recClub(id)+'<span class="rec-val">'+esc(value)+'</span><span class="rec-meta">'+esc(season||'')+'</span></div>';
}
function recBlock(title, inner){
  return '<section class="rec"><h4>'+esc(title)+'</h4>'+(inner||'<div class="rec-line"><span class="muted">–</span></div>')+'</section>';
}
function viewRekorde(lid){
  const lg=L[lid];
  if (!lg) return '<div class="box"><p class="muted">Keine Rekorde.</p></div>';
  try{
    const matches=leagueMatchList(lid);
    const stats=seasonStatRows(lid);
    const wins=takeExtreme(matches, m=>m.hg===m.ag?null:Math.abs(m.hg-m.ag), true);
    const rich=takeExtreme(matches, m=>m.hg+m.ag, true);
    const streaks=leagueStreaks(lid);
    const statLines=(key, higher, unit)=>{
      const rows=takeExtreme(stats, r=>r[key], higher);
      return rows.map(r=>recTeamLine(r.id, r[key]+' '+unit, r.season)).join('');
    };
    const streakLines=(type, unit)=>{
      return (streaks[type]||[]).map(r=>recTeamLine(r.id, r.len+' '+unit, r.season)).join('');
    };
    const blocks=[
      recBlock('Höchster Sieg', wins.map(recMatchLine).join('')),
      recBlock('Torreichstes Spiel', rich.map(recMatchLine).join('')),
      recBlock('Meiste Tore', statLines('tg', true, 'Tore')),
      recBlock('Wenigste Tore', statLines('tg', false, 'Tore')),
      recBlock('Meiste Gegentore', statLines('gt', true, 'Gegentore')),
      recBlock('Wenigste Gegentore', statLines('gt', false, 'Gegentore')),
      recBlock('Längste Siegesserie', streakLines('S', 'Siege')),
      recBlock('Längste Unentschieden-Serie', streakLines('U', 'Unentschieden')),
      recBlock('Längste Niederlagenserie', streakLines('N', 'Niederlagen')),
      recBlock('Meiste Punkte', statLines('pkt', true, 'Punkte')),
      recBlock('Wenigste Punkte', statLines('pkt', false, 'Punkte'))
    ];
    return '<div class="rec-board"><h3>Rekorde der '+esc(lg.name)+'</h3>'+blocks.join('')+'</div>';
  }catch(e){
    return '<div class="box"><p class="muted">Für diese Liga liegen keine Rekorde vor.</p></div>';
  }
}
function cupMatchList(key){
  const out=[], seen=new Set();
  const push=m=>{
    if (!m || !TEAMS[m.h] || !TEAMS[m.a] || m.hg==null || m.ag==null || !isFinite(+m.hg) || !isFinite(+m.ag)) return;
    const k=(m.season||'')+'|'+m.h+'|'+m.a+'|'+m.hg+'|'+m.ag;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({season:m.season||'', h:m.h, a:m.a, hg:+m.hg, ag:+m.ag});
  };
  (S.seasons||[]).forEach(season=>{
    if (!season) return;
    const cup=key==='dfb' ? (season.cups&&season.cups.dfb) : (season.cups&&season.cups.land&&season.cups.land[key]);
    const direct=[];
    if (cup && Array.isArray(cup.rounds)){
      cup.rounds.forEach(round=>{
        (round.matches||[]).forEach(m=>{
          if (m && m.hg!=null && m.ag!=null) direct.push({season:season.name||'', h:m.h, a:m.a, hg:+m.hg, ag:+m.ag});
        });
      });
    }
    if (direct.length && !(cup&&cup.archived)){ direct.forEach(push); return; }
    direct.forEach(push);
    seasonLoggedMatches(season).forEach(m=>{
      if (key==='dfb'){ if (m.comp==='dfb') push({season:season.name||'', h:m.h, a:m.a, hg:+m.hg, ag:+m.ag}); }
      else if (m.comp==='land' && TEAMS[m.h].bl===key && TEAMS[m.a].bl===key) push({season:season.name||'', h:m.h, a:m.a, hg:+m.hg, ag:+m.ag});
    });
  });
  return out;
}
function cupHonours(key){
  const titles={}, finals={};
  const add=(map, id, season)=>{
    if (!id || !TEAMS[id] || !season) return;
    const a=map[id]||(map[id]=[]);
    if (a.indexOf(season)<0) a.push(season);
  };
  (S.seasons||[]).forEach(season=>{
    if (!season) return;
    const cup=key==='dfb' ? (season.cups&&season.cups.dfb) : (season.cups&&season.cups.land&&season.cups.land[key]);
    let winner=null, finalist=null;
    try{
      const fin=cupFinalists(cup);
      if (fin){ winner=fin.winner; finalist=fin.finalist; }
    }catch(e){}
    if (!winner){
      const hist=(S.pokalHistory||[]).find(h=>h && h.season===season.name);
      if (hist) winner=key==='dfb' ? (hist.dfb||null) : (hist.land&&hist.land[key])||null;
    }
    (S.pokalRuns||[]).forEach(r=>{
      if (!r || r.season!==season.name || r.round!=='Finale') return;
      if (key==='dfb' && r.comp==='dfb') add(finals, r.id, season.name);
      if (key!=='dfb' && r.comp==='land' && r.bl===key) add(finals, r.id, season.name);
    });
    if (winner){ add(titles, winner, season.name); add(finals, winner, season.name); }
    if (finalist) add(finals, finalist, season.name);
  });
  return {titles, finals};
}
function topHonour(map){
  let best=0; const ids=[];
  Object.keys(map||{}).forEach(id=>{
    const n=(map[id]||[]).length;
    if (n>best){ best=n; ids.length=0; ids.push(id); }
    else if (n===best && n>0) ids.push(id);
  });
  ids.sort((a,b)=>TEAMS[a].name.localeCompare(TEAMS[b].name,'de'));
  return {best, ids};
}
function viewCupRekorde(key){
  const title=key==='dfb'?'DFB-Pokal':('Landespokal '+(key||''));
  try{
    const matches=cupMatchList(key);
    const wins=takeExtreme(matches, m=>m.hg===m.ag?null:Math.abs(m.hg-m.ag), true);
    const rich=takeExtreme(matches, m=>m.hg+m.ag, true);
    const hon=cupHonours(key);
    const champs=topHonour(hon.titles);
    const fins=topHonour(hon.finals);
    const champLines=champs.best?champs.ids.map(id=>recTeamLine(id, champs.best+' Titel', (hon.titles[id]||[]).join(', '))).join(''):'';
    const finLines=fins.best?fins.ids.map(id=>recTeamLine(id, fins.best+' '+(fins.best===1?'Finalteilnahme':'Finalteilnahmen'), (hon.finals[id]||[]).join(', '))).join(''):'';
    const blocks=[
      recBlock('Höchster Sieg', wins.map(recMatchLine).join('')),
      recBlock('Torreichstes Spiel', rich.map(recMatchLine).join('')),
      recBlock('Rekordsieger', champLines),
      recBlock('Meiste Finalteilnahmen', finLines)
    ];
    return '<div class="rec-board"><h3>Rekorde · '+esc(title)+'</h3>'+blocks.join('')+'</div>';
  }catch(e){
    return '<div class="box"><p class="muted">Für diesen Pokal liegen keine Rekorde vor.</p></div>';
  }
}
function viewHistorie(lid){
  const done=S.seasons.filter(s=>s.endData&&s.endData.tables);
  let h='<div class="box"><h3>Saisons der '+esc(L[lid].name)+'</h3>';
  if (!done.length) h+='<p class="muted">Noch keine abgeschlossene Saison. Nach dem ersten Saisonabschluss stehen hier Meister, Aufsteiger und Absteiger.</p>';
  else {
    const lg=L[lid];
    const bl=lid==='BL';
    const showUp=!bl && lg.up>1;
    const showDown=lg.down>0 || done.some(s=>((s.endData&&s.endData.moves)||[]).some(m=>m&&m.from===lid && m.type==='ab'));
    const slot=item=>{
      const id=item&&(item.id||item);
      const t=id&&TEAMS[id]; if(!t) return '';
      const pl=item&&typeof item==='object'&&item.pl!=null?item.pl:'';
      return '<span class="hist-slot"><b>'+pl+'</b><img class="hist-crest" src="'+esc(t.crest)+'" alt="" data-club="'+id+'" title="'+esc(t.name)+'"></span>';
    };
    const slots=list=>{
      const items=(list||[]).slice().sort((a,b)=>((a&&a.pl)||0)-((b&&b.pl)||0));
      return items.length?items.map(slot).join(''):'<span class="muted">–</span>';
    };
    const cols=bl?['Meister','Champions League','Europa League','Conference League','Absteiger']:(['Meister'].concat(showUp?['Aufsteiger']:[]).concat(showDown?['Absteiger']:[]));
    h+='<table class="tbl hist-seasons"><thead><tr><th class="l">Saison</th>'+cols.map(c=>'<th class="l">'+c+'</th>').join('')+'</tr></thead><tbody>';
    done.slice().reverse().forEach(s=>{ const e=s.endData||{}, raw=e.tables&&e.tables[lid], t=Array.isArray(raw)?raw:[];
      const up=(e.moves||[]).filter(m=>m&&m.from===lid&&m.type==='auf');
      const dn=(e.moves||[]).filter(m=>m&&m.from===lid&&m.type==='ab');
      const cell=list=>'<td class="l names"><div class="hist-row">'+slots(list)+'</div></td>';
      let cells='';
      if (bl){
        cells=cell(t.filter(r=>r&&r.pl===1))+cell(t.filter(r=>r&&r.pl>=2&&r.pl<=4))+cell(t.filter(r=>r&&r.pl>=5&&r.pl<=6))+cell(t.filter(r=>r&&r.pl===7))+cell(dn);
      } else {
        cells=cell(t.filter(r=>r&&r.pl===1));
        if (showUp) cells+=cell(up.filter(m=>m&&(m.pl||0)>1));
        if (showDown) cells+=cell(dn);
      }
      h+='<tr><td class="l">'+s.name+'</td>'+cells+'</tr>';
    });
    h+='</tbody></table>';
  }
  h+='</div>';
  return h;
}
const BL_ORDER=['Schleswig-Holstein','Hamburg','Mecklenburg-Vorpommern','Bremen','Niedersachsen','Berlin','Brandenburg','Sachsen-Anhalt','Sachsen','Thüringen','Nordrhein-Westfalen','Hessen','Rheinland-Pfalz','Saarland','Baden-Württemberg','Bayern'];
function renderAmateur(){
  const s=cur();
  const counts={};
  const ids=[]; POOLS.forEach(p=>(s.pools[p.id]||[]).forEach(id=>{ ids.push(id); const bl=TEAMS[id].bl; counts[bl]=(counts[bl]||0)+1; }));
  if (!S.ui.amateurBl || !counts[S.ui.amateurBl]) S.ui.amateurBl=BL_ORDER.find(bl=>counts[bl])||BL_ORDER[0];
  const bl=S.ui.amateurBl;
  $('#title').textContent='Amateurliga';
  $('#subline').innerHTML=esc(bl)+' · kein Spielbetrieb. Zum Saisonende wählst du je Oberliga zwei Aufsteiger.';
  setActions(seasonActions(s));
  $('#tabs').innerHTML=BL_ORDER.filter(b=>counts[b]).map(b=>'<a class="tab'+(b===bl?' active':'')+'" data-amateur="'+esc(b)+'">'+esc(b)+'</a>').join('');
  const list=ids.filter(id=>TEAMS[id].bl===bl).sort(byRang);
  let h='<div class="box"><input class="searchbox" id="poolSearch" placeholder="Verein suchen …"><p class="muted">'+list.length+' Vereine in '+esc(bl)+'.</p><div class="amateur-list">'+
    list.map(id=>'<div data-name="'+esc(TEAMS[id].name.toLowerCase())+'">'+clubHTML(id,{nobl:true})+'<span class="muted" style="font-size:11px;margin-left:38px">'+(TEAMS[id].rang?'Rang '+TEAMS[id].rang:'ohne Wertung')+'</span></div>').join('')+
    '</div></div>';
  $('#view').innerHTML=h;
}
function coordOf(id){
  const c=window.FR_COORDS&&window.FR_COORDS[id];
  if(!c) return null;
  return {lat:+c[0], lon:+c[1], stadion:c[2]||''};
}
const kmCache=new Map();
function kmBetween(a,b){
  const key=a<b?a+'|'+b:b+'|'+a;
  if (kmCache.has(key)) return kmCache.get(key);
  const A=coordOf(a), B=coordOf(b);
  let v=null;
  if (A && B){
    const R=6371, rad=Math.PI/180, dLat=(B.lat-A.lat)*rad, dLon=(B.lon-A.lon)*rad;
    const s=Math.sin(dLat/2)**2+Math.cos(A.lat*rad)*Math.cos(B.lat*rad)*Math.sin(dLon/2)**2;
    v=Math.round(2*R*Math.asin(Math.min(1,Math.sqrt(s))));
  }
  kmCache.set(key, v);
  return v;
}
const DOW={Fr:0,Sa:1,So:2};
function expandSlots(list){ const out=[]; list.forEach(s=>{ for(let i=0;i<(s.n||1);i++) out.push({dow:s.dow,time:s.time,kind:s.kind||''}); }); return out; }
const SLOT_CACHE={};
function slotTemplate(lid){
  if (SLOT_CACHE[lid]) return SLOT_CACHE[lid].map(s=>({dow:s.dow,time:s.time,kind:s.kind}));
  let src;
  if(lid==='BL') src=expandSlots([{dow:'Fr',time:'20:30'},{dow:'Sa',time:'15:30',kind:'konferenz',n:6},{dow:'Sa',time:'18:30',kind:'top'},{dow:'So',time:'15:30',kind:'regional'},{dow:'So',time:'17:30',kind:'regional'}]);
  else if(lid==='BL2') src=expandSlots([{dow:'Fr',time:'18:30',n:2},{dow:'Sa',time:'13:30',kind:'konferenz',n:4},{dow:'Sa',time:'20:30',kind:'top'},{dow:'So',time:'13:30',kind:'konferenz',n:3}]);
  else if(lid==='L3') src=expandSlots([{dow:'Fr',time:'19:00',kind:'top'},{dow:'Sa',time:'14:00',kind:'konferenz',n:5},{dow:'Sa',time:'16:30',kind:'top'},{dow:'So',time:'13:30'},{dow:'So',time:'16:30',kind:'regional'},{dow:'So',time:'19:30',kind:'regional'}]);
  else if(lid==='L4') src=expandSlots([{dow:'Fr',time:'19:00',kind:'top'},{dow:'Sa',time:'14:00',kind:'konferenz',n:6},{dow:'Sa',time:'16:30',kind:'top'},{dow:'So',time:'13:30'},{dow:'So',time:'16:30',kind:'regional'},{dow:'So',time:'19:30',kind:'regional'}]);
  else src=expandSlots([{dow:'Fr',time:'18:30',kind:'top'},{dow:'Sa',time:'14:30',kind:'konferenz',n:8}]);
  SLOT_CACHE[lid]=src;
  return src.map(s=>({dow:s.dow,time:s.time,kind:s.kind}));
}
function finalSaturdaySlot(lid){
  if(lid==='BL') return {dow:'Sa', time:'15:30', kind:'konferenz'};
  if(lid==='BL2') return {dow:'Sa', time:'13:30', kind:'konferenz'};
  if(lid==='L3' || lid==='L4') return {dow:'Sa', time:'14:00', kind:'konferenz'};
  return {dow:'Sa', time:'14:30', kind:'konferenz'};
}
function isClosingDay(total, mi){ return total>1 && mi>=total-2; }
function lateSeason(total, mi){ return mi>=Math.floor(total*0.70); }
function slotLabel(s, simultaneous){
  if (simultaneous) return s.dow+' '+s.time+' · alle Spiele gleichzeitig';
  if (s.kracher) return s.dow+' '+s.time+' Topspiel · Abstiegskracher';
  return s.dow+' '+s.time+(s.kind==='konferenz'?' Konferenz':s.kind==='top'?' Topspiel':s.kind==='regional'?' regional':'');
}
function slotCuts(n){ return {top:5, upper:n>=20?8:6}; }
function lastScheduled(season, lid){
  const bag=season.kickoffs&&season.kickoffs[lid]; if(!bag) return -1;
  let m=-1; for (const k in bag) if (bag[k]) m=Math.max(m, +k); return m;
}
function isScheduled(season, lid, mi){ return !!(season.kickoffs&&season.kickoffs[lid]&&season.kickoffs[lid][mi]); }
function nextBlockRange(n, from){
  const half=n-1, total=half*2;
  if (from>=total) return null;
  const halfEnd=from<half ? half-1 : total-1;
  return [from, Math.min(from+3, halfEnd)];
}
function hungarian(cost){
  const n=cost.length, u=Array(n+1).fill(0), v=Array(n+1).fill(0), p=Array(n+1).fill(0), way=Array(n+1).fill(0);
  for (let i=1;i<=n;i++){
    p[0]=i; let j0=0; const minv=Array(n+1).fill(Infinity), used=Array(n+1).fill(false);
    do {
      used[j0]=true; const i0=p[j0]; let delta=Infinity, j1=0;
      for (let j=1;j<=n;j++) if (!used[j]){
        const cur=cost[i0-1][j-1]-u[i0]-v[j];
        if (cur<minv[j]){ minv[j]=cur; way[j]=j0; }
        if (minv[j]<delta){ delta=minv[j]; j1=j; }
      }
      for (let j=0;j<=n;j++){ if (used[j]){ u[p[j]]+=delta; v[j]-=delta; } else minv[j]-=delta; }
      j0=j1;
    } while (p[j0]!==0);
    do { const j1=way[j0]; p[j0]=p[j1]; j0=j1; } while (j0!==0);
  }
  const assign=Array(n); for (let j=1;j<=n;j++) if (p[j]) assign[p[j]-1]=j-1; return assign;
}
function slotOrder(a,b){ return (DOW[a.dow]-DOW[b.dow]) || a.time.localeCompare(b.time) || a.kind.localeCompare(b.kind); }
function tableBefore(season, lid, mi){
  const lg=season.leagues[lid], matches=[];
  lg.md.forEach((md,i)=>{ if(i>=mi) return; md.forEach(m=>{ if(m[2]!=null&&m[3]!=null) matches.push({md:i,h:lg.teams[m[0]],a:lg.teams[m[1]],hg:m[2],ag:m[3]}); }); });
  return computeTable(lg.teams, matches, 'all');
}
function appealOf(season, lid, teamId, mi){
  if(mi>0){ const row=tableBefore(season,lid,mi).find(r=>r.id===teamId); return row?row.pl:999; }
  const idx=S.seasons.indexOf(season), prev=idx>0?S.seasons[idx-1]:null;
  if(prev){
    let best=null;
    const tables=prev.endData&&prev.endData.tables?prev.endData.tables:null;
    if(tables){ for(const k in tables){ const row=tables[k].find(r=>r.id===teamId); if(row&&L[k]){ const sc=L[k].level*100+row.pl; if(best==null||sc<best) best=sc; } } }
    else { for(const k in prev.leagues){ if(prev.leagues[k].teams.includes(teamId)){ const row=leagueTable(prev,k).find(r=>r.id===teamId); if(row) best=L[k].level*100+row.pl; } } }
    if(best!=null) return best;
  }
  return 10000+(TEAMS[teamId].rang||99999);
}
function emptySlotCount(){ return {fr:0,so:0,konferenz:0,top:0,regional:0,total:0}; }
function slotTally(season, lid){
  const ids=season.leagues[lid].teams, map={};
  ids.forEach(id=>map[id]=emptySlotCount());
  const bag=season.kickoffs&&season.kickoffs[lid]||{};
  season.leagues[lid].md.forEach((md,mi)=>{
    const slots=bag[mi]; if(!slots) return;
    md.forEach((m,k)=>{
      const slot=slots[k]; if(!slot) return;
      [season.leagues[lid].teams[m[0]], season.leagues[lid].teams[m[1]]].forEach(id=>{
        const c=map[id]; c.total++;
        if(slot.dow==='Fr') c.fr++;
        if(slot.dow==='So') c.so++;
        if(slot.kind==='konferenz') c.konferenz++;
        if(slot.kind==='top') c.top++;
        if(slot.kind==='regional') c.regional++;
      });
    });
  });
  return map;
}
function hotCut(lid, n){
  if (lid==='BL') return 7;
  const up=(L[lid]&&L[lid].up)||1;
  return Math.min(Math.ceil(n/2), up+3);
}
function topKind(rh, ra, needH, needA, n){
  const upper=n>=20?8:6;
  const hi=Math.min(rh,ra), lo=Math.max(rh,ra);
  if (lo<=upper) return 'both';
  const lowerNeeds=(rh===lo?needH:needA);
  if (hi<=upper && lowerNeeds) return 'rescue';
  return 'no';
}
function teamPower(id, pkt, sp, mi, total){
  const an=ansehenValue(id);
  const now=sp>0 ? Math.max(0, Math.min(100, (pkt/sp)*40)) : an;
  const t=total>0 ? mi/total : 0;
  // Saisonanfang fast nur Ansehen (etwa 0,95), zum Ende noch rund ein Drittel.
  const anShare=0.32 + 0.63*Math.pow(Math.max(0, 1-t), 1.35);
  return anShare*an + (1-anShare)*now;
}
function powerSnapshot(season, lid, mi){
  const lg=season.leagues[lid];
  const rows=mi>0 ? tableBefore(season, lid, mi) : [];
  const by={}; rows.forEach(r=>by[r.id]=r);
  const total=lg.md.length;
  const list=lg.teams.map(id=>{
    const r=by[id], pkt=r?r.pkt:0, sp=r?r.sp:0;
    return {id, pkt, sp, power:teamPower(id, pkt, sp, mi, total)};
  });
  list.sort((a,b)=>b.power-a.power || byRang(a.id,b.id));
  const rank={}, info={};
  list.forEach((s,i)=>{ rank[s.id]=i+1; info[s.id]=s; });
  return {rank, info, total};
}
function pairScore(h, a, snap){
  const H=snap.info[h], A=snap.info[a];
  const gap=Math.abs(H.pkt-A.pkt);
  let gapPen;
  if (H.sp<4 && A.sp<4) gapPen=Math.abs(H.power-A.power)*0.18;
  else if (gap<=4) gapPen=gap*0.5;
  else if (gap<=10) gapPen=2+(gap-4)*2.6;
  else gapPen=17.6+(gap-10)*7;
  const n=Object.keys(snap.rank).length||20;
  const rh=snap.rank[h]||n, ra=snap.rank[a]||n, half=Math.ceil(n/2);
  let bonus=0;
  if (rh<=half && ra<=half) bonus+=70;
  if (rh<=7 && ra<=7) bonus+=45;
  if (rh<=4 && ra<=4) bonus+=35;
  return Math.min(H.power,A.power)*2 + (H.power+A.power)*0.1 - gapPen + bonus;
}
function rankedIds(ids){
  if (orderCacheIds!==ids){
    orderCacheIds=ids;
    rankedIds.order=ids.slice().sort((a,b)=>ansehenValue(a)-ansehenValue(b) || byRang(a,b));
  }
  return rankedIds.order;
}
function firstTopTarget(id, ids, total){
  const order=rankedIds(ids);
  const i=Math.max(0, order.indexOf(id));
  return Math.round((0.12 + 0.55*(i/Math.max(1, order.length-1)))*(total-1));
}
function rescueUrge(id, mi, total, ids){
  const late=mi-firstTopTarget(id, ids, total);
  if (late<0) return Math.max(0, 5000*(1-(firstTopTarget(id, ids, total)-mi)/Math.max(1,total)));
  return 7000 + late*3800;
}
function kCombinations(n, k){
  const out=[], acc=[];
  (function rec(start){
    if (acc.length===k){ out.push(acc.slice()); return; }
    for (let i=start; i<=n-(k-acc.length); i++){ acc.push(i); rec(i+1); acc.pop(); }
  })(0);
  return out;
}
const COMBO_CACHE={};
function combinations(n, k){
  const key=n+':'+k;
  if (!COMBO_CACHE[key]) COMBO_CACHE[key]=kCombinations(n, k);
  return COMBO_CACHE[key];
}
function assignExactDayRow(md, tmpl, conf, ctx){
  const {teams, counts, rankOf, upper, mi, rem, n, total, ids, pairQ}=ctx;
  const confSlots=tmpl.filter(s=>s.kind==='konferenz');
  const freeSlots=tmpl.filter(s=>s.kind!=='konferenz');
  const row=md.map(()=>null);
  const freeArr=[];
  let t=0;
  for (let i=0;i<md.length;i++){
    if (conf.has(i)) row[i]=confSlots[Math.min(t++, confSlots.length-1)];
    else freeArr.push(i);
  }
  const topClass=i=>{
    const h=teams[md[i][0]], a=teams[md[i][1]];
    const rh=rankOf(h), ra=rankOf(a), hi=Math.min(rh,ra), lo=Math.max(rh,ra);
    if (lo<=upper) return 0;
    if (hi<=upper && counts[rh===lo?h:a].top===0) return 1;
    if (hi<=upper) return 2;
    return 3;
  };
  if (freeArr.length===freeSlots.length && freeArr.length){
    const costF=freeArr.map(i=>{
      const h=teams[md[i][0]], a=teams[md[i][1]];
      const dist=kmBetween(h,a);
      const distKm=dist==null?400:dist;
      return freeSlots.map(slot=>{
        let c=0;
        if (slot.kind==='top'){
          const q=pairQ(h,a);
          const kind=topKind(rankOf(h), rankOf(a), counts[h].top===0, counts[a].top===0, n);
          if (topClass(i)>=3) c += 900000;
          else if (kind==='both') c += -q*280;
          else if (kind==='rescue') c += 20000;
          else if (Math.min(rankOf(h), rankOf(a))<=upper) c += 80000;
          else c += 900000;
        }
        if (slot.kind==='regional') c += distKm*4-9000;
        for (const id of [h,a]){
          const cnt=counts[id];
          if (slot.dow==='Fr'){
            const fairFr=(2/n)*mi;
            if (cnt.fr>=5 || (mi<n-1 && cnt.fr>=3)) c += 8000000;
            else c -= (fairFr-cnt.fr)*50000 + (cnt.fr<2 && rem<16 ? 220000 : 0);
          }
          if (slot.dow==='So' && cnt.so===0) c -= rem<=10?150000:5000;
          if (slot.kind==='regional' && cnt.regional===0) c -= rem<=12?150000:5000;
        }
        return c;
      });
    });
    hungarian(costF).forEach((col,i)=>{ row[freeArr[i]]=freeSlots[col]; });
    const repairTops=()=>{
      row.forEach((slot,i)=>{
        if (!slot || slot.kind!=='top' || topClass(i)<3) return;
        let alt=null;
        freeArr.forEach(j=>{
          if (j===i || row[j].kind==='top' || topClass(j)>=3) return;
          const q=pairQ(teams[md[j][0]], teams[md[j][1]]);
          const cls=topClass(j);
          if (!alt || cls<alt.cls || (cls===alt.cls && q>alt.q)) alt={j,cls,q};
        });
        if (alt){ const tmp=row[i]; row[i]=row[alt.j]; row[alt.j]=tmp; }
      });
    };
    repairTops();
    row.forEach((slot,i)=>{
      if (!slot || slot.kind!=='top') return;
      const here=[teams[md[i][0]], teams[md[i][1]]];
      if (here.some(id=>counts[id].top===0)) return;
      let best=null;
      freeArr.forEach(j=>{
        if (j===i || row[j].kind==='top' || topClass(j)>2) return;
        const tms=[teams[md[j][0]], teams[md[j][1]]];
        const urge=Math.max(...tms.map(id=>counts[id].top===0 ? rescueUrge(id, mi, total, ids) : 0));
        if (urge<=0) return;
        if (!best || urge>best.urge) best={j,urge};
      });
      if (best && (best.urge>18000 || rem<=6)){ const tmp=row[i]; row[i]=row[best.j]; row[best.j]=tmp; }
    });
    repairTops();
    const fri=freeArr.find(i=>row[i]&&row[i].dow==='Fr');
    if (fri!=null){
      const frScore=j=>{
        const ids=[teams[md[j][0]], teams[md[j][1]]];
        const mx=Math.max(counts[ids[0]].fr, counts[ids[1]].fr);
        const zero=ids.some(id=>counts[id].fr===0);
        if (mx>=6) return (zero?250:500)+mx;
        return (zero?0:100)+mx;
      };
      let alt=null;
      freeArr.forEach(j=>{
        if (topClass(j)>=3) return;
        const sc=frScore(j);
        if (!alt || sc<alt.sc) alt={j,sc};
      });
      if (alt && alt.j!==fri && alt.sc<frScore(fri)){ const tmp=row[fri]; row[fri]=row[alt.j]; row[alt.j]=tmp; }
    }
    repairTops();
  }
  return row;
}
function tallyExcept(season, lid, skip){
  const ids=season.leagues[lid].teams, map={};
  ids.forEach(id=>map[id]=emptySlotCount());
  const bag=season.kickoffs&&season.kickoffs[lid]||{};
  season.leagues[lid].md.forEach((md,mi)=>{
    if (mi===skip) return;
    const slots=bag[mi]; if (!slots) return;
    md.forEach((m,k)=>{
      const slot=slots[k]; if (!slot) return;
      [ids[m[0]], ids[m[1]]].forEach(id=>{
        const c=map[id]; c.total++;
        if (slot.dow==='Fr') c.fr++;
        if (slot.dow==='So') c.so++;
        if (slot.kind==='konferenz') c.konferenz++;
        if (slot.kind==='top') c.top++;
        if (slot.kind==='regional') c.regional++;
      });
    });
  });
  return map;
}
function noteKick(md, row, lg, counts){
  row.forEach((slot,i)=>{
    if (!slot) return;
    const h=lg.teams[md[i][0]], a=lg.teams[md[i][1]];
    for (const id of [h,a]){
      const cnt=counts[id]; cnt.total++;
      if (slot.dow==='Fr') cnt.fr++;
      if (slot.dow==='So') cnt.so++;
      if (slot.kind==='konferenz') cnt.konferenz++;
      if (slot.kind==='top') cnt.top++;
      if (slot.kind==='regional') cnt.regional++;
    }
  });
}
function assignMatchday(season, lid, mi, snap, counts){
  const lg=season.leagues[lid], md=lg.md[mi], tmpl=slotTemplate(lid), n=lg.teams.length;
  const total=md.length? lg.md.length : 0;
  if (total && isClosingDay(total, mi)){
    const slot=finalSaturdaySlot(lid);
    const row=md.map(()=>slot);
    noteKick(md, row, lg, counts);
    return row;
  }
  const rem=total-mi;
  const flexLeft=Math.max(0, (total-2)-mi);
  const konfPer=tmpl.filter(s=>s.kind==='konferenz').length;
  const hasSo=tmpl.some(s=>s.dow==='So');
  const topSlots=tmpl.filter(s=>s.kind==='top').length;
  const upper=n>=20?8:6;
  const rankOf=id=>snap.rank[id]||n;
  const bothOn=round=>round.some(g=>Math.max(rankOf(lg.teams[g[0]]), rankOf(lg.teams[g[1]]))<=upper);
  const bothCount=md.filter(m=>Math.max(rankOf(lg.teams[m[0]]), rankOf(lg.teams[m[1]]))<=upper).length;
  const canRescue=round=>round.some(g=>{
    const h=lg.teams[g[0]], a=lg.teams[g[1]];
    const hi=Math.min(rankOf(h), rankOf(a)), lo=Math.max(rankOf(h), rankOf(a));
    if (hi>upper || lo<=upper) return false;
    const lower=rankOf(h)===lo?h:a;
    return counts[lower].top===0;
  });
  let usefulZero=0;
  for (let j=mi;j<total-2;j++) if (!bothOn(lg.md[j]) && canRescue(lg.md[j])) usefulZero++;
  const needsLeft=lg.teams.filter(id=>counts[id].top===0).length;
  const rescueChance=(id)=>{
    let n=0;
    for (let j=mi;j<total-2;j++){
      if (bothOn(lg.md[j])) continue;
      if (lg.md[j].some(g=>{
        const h=lg.teams[g[0]], a=lg.teams[g[1]];
        if (h!==id && a!==id) return false;
        return rankOf(h===id?a:h)<=upper;
      })) n++;
    }
    return n;
  };
  const uncovered=lg.teams.some(id=>counts[id].top===0 && rescueChance(id)===0);
  let konfMax=0, konfMin=0;
  if (konfPer){
    konfMax=-1; konfMin=1e9;
    lg.teams.forEach(id=>{ const v=counts[id].konferenz; if (v>konfMax) konfMax=v; if (v<konfMin) konfMin=v; });
  }
  const cost=md.map(m=>{
    const h=lg.teams[m[0]], a=lg.teams[m[1]];
    const dist=kmBetween(h,a);
    const distKm=dist==null?400:dist;
    return tmpl.map(slot=>{
      let c=0;
      const needH=counts[h].top===0, needA=counts[a].top===0;
      if (slot.kind==='top'){
        const kind=topKind(rankOf(h), rankOf(a), needH, needA, n);
        const q=pairScore(h, a, snap);
        const bothHalf=Math.max(rankOf(h), rankOf(a))<=Math.ceil(n/2);
        const bothHot=Math.max(rankOf(h), rankOf(a))<=hotCut(lid, n);
        const mustSave=!uncovered && needsLeft<=usefulZero && bothCount>=topSlots;
        const urgeOf=id=>rescueUrge(id, mi, total, lg.teams);
        if (kind==='both'){
          c += -q*520 - (bothHot?160000:40000);
          if (needH) c -= urgeOf(h)*0.35;
          if (needA) c -= urgeOf(a)*0.35;
        } else if (kind==='rescue' && !mustSave){
          const urge=Math.max(needH?urgeOf(h):0, needA?urgeOf(a):0);
          c += 14000 - urge - q*20 - (bothHalf?6000:0);
        } else if (kind==='rescue') c += 95000;
        else if (Math.min(rankOf(h), rankOf(a))<=upper && (needH||needA)){
          const urge=Math.max(needH?urgeOf(h):0, needA?urgeOf(a):0);
          c += 12000 - urge - q*25 - (bothHalf?8000:0);
        } else if (Math.min(rankOf(h), rankOf(a))<=upper) c += 420000 - (bothHalf?50000:0);
        else c += 900000;
        if ((needH||needA) && flexLeft>0 && flexLeft<=6 && Math.min(rankOf(h), rankOf(a))<=upper) c -= 2000000;
        if (slot.dow==='Fr'){
          c += (counts[h].fr*counts[h].fr + counts[a].fr*counts[a].fr)*700;
          if (counts[h].fr>=7 || counts[a].fr>=7) c += 40000;
        }
      }
      if (slot.kind==='regional'){
        c += distKm*4 - 9000 + (counts[h].so*counts[h].so + counts[a].so*counts[a].so)*8;
      }
      const targetMin=total/2;
      const exactKonf=konfPer>0 && Math.abs(konfPer*2*total - n*targetMin)<1e-6;
      for (const id of [h,a]){
        const cnt=counts[id];
        const urge=missing=>missing ? (rem<=6?350000: rem<=14?90000:6000) : 0;
        const frUrge=missing=>missing ? (rem<=6?60000: rem<=12?9000:2500) : 0;
        if (konfPer){
          let pull=0;
          if (exactKonf){
            if (cnt.konferenz>=konfMax && konfMin<konfMax) pull -= 8000000;
            else pull += (konfMax-cnt.konferenz+1)*1000000;
          }
          if (lid==='L3'){
            const need=18;
            if (cnt.konferenz+(flexLeft-1) < need) pull += 6000000;
            else if (cnt.konferenz>=need) pull -= 6000000;
          } else if (cnt.konferenz+(flexLeft-1)+2 < targetMin) pull += 5000000;
          else if (!exactKonf && rem<=16 && cnt.konferenz < targetMin-2) pull += 2000000;
          else if (!exactKonf && rem<=12 && cnt.top>0 && cnt.konferenz < targetMin-1) pull += 1500000;
          else if (!exactKonf && cnt.top>=1 && cnt.konferenz+(rem-1) < targetMin+2) pull += 280000;
          else if (!exactKonf && rem<=14 && cnt.konferenz+(rem-1) < targetMin+1) pull += 350000;
          else if (!exactKonf && cnt.konferenz+(rem-1)<targetMin+6) pull += 90000;
          if (slot.kind==='konferenz') c -= pull; else c += pull;
        }
        if (slot.dow==='Fr'){
          if (lid==='L3'){
            const fairFr=(2/n)*mi;
            if (cnt.fr>=5 || (mi<n-1 && cnt.fr>=3)) c += 8000000;
            else c -= (fairFr-cnt.fr)*50000 + (cnt.fr<2 && rem<16 ? 220000 : 0);
          } else {
            c-=frUrge(cnt.fr===0); c+=cnt.fr*cnt.fr*120;
            if (cnt.fr>=7) c += 40000;
            if (lid==='L4' && cnt.fr===0 && rem<=8) c -= 350000;
          }
        }
        if (slot.dow==='So' && hasSo) c -= urge(cnt.so===0);
        if (slot.kind==='regional') c -= urge(cnt.regional===0);
        if (slot.kind==='top') c -= (flexLeft>0 && flexLeft<=6 && cnt.top===0) ? 2500000 : 0;
        if (slot.dow==='Fr' && cnt.fr===0 && flexLeft>0 && flexLeft<=6) c -= 1800000;
        if (slot.dow==='So' && cnt.so===0 && flexLeft>0 && flexLeft<=6) c -= 1800000;
        if (slot.kind==='regional' && cnt.regional===0 && flexLeft>0 && flexLeft<=6) c -= 1800000;
      }
      return c;
    });
  });
  const asg=hungarian(cost);
  const row=md.map(()=>null);
  asg.forEach((col,i)=>{ row[i]=tmpl[col]; });
  const halfN=n-1;
  // Die letzten zwei Spieltage sind komplett Konferenz, deshalb trägt die Spiegel-Konstruktion nicht mehr exakt 19.
  const exactMirror=false;
  const topClass=i=>{
    const h=lg.teams[md[i][0]], a=lg.teams[md[i][1]];
    const rh=rankOf(h), ra=rankOf(a), hi=Math.min(rh,ra), lo=Math.max(rh,ra);
    if (lo<=upper) return 0;
    if (hi<=upper && counts[rh===lo?h:a].top===0) return 1;
    if (hi<=upper) return 2;
    return 3;
  };
  if (exactMirror && mi>=halfN && season.kickoffs[lid] && season.kickoffs[lid][mi-halfN]){
    const src=season.kickoffs[lid][mi-halfN];
    const baseConf=new Set();
    src.forEach((slot,i)=>{ if (slot.kind!=='konferenz') baseConf.add(i); });
    const filled=assignExactDayRow(md, tmpl, baseConf, {
      teams:lg.teams, counts, rankOf, upper, mi, rem, n, total, ids:lg.teams, pairQ:(h,a)=>pairScore(h,a,snap)
    });
    for (let i=0;i<row.length;i++) row[i]=filled[i];
  }
  if (exactMirror && mi<halfN){
    const ranked=lg.teams.slice().sort((a,b)=>ansehenValue(b)-ansehenValue(a)||byRang(a,b));
    const must=ranked.slice(0,2);
    const matchOf=id=>{ for (let i=0;i<md.length;i++) if (lg.teams[md[i][0]]===id||lg.teams[md[i][1]]===id) return i; return -1; };
    const legalFree=()=>{ let c=0; row.forEach((slot,i)=>{ if (slot&&slot.kind!=='konferenz'&&topClass(i)<3) c++; }); return c; };
    const pull=(idx, illegalOnly)=>{
      if (idx<0 || !row[idx] || row[idx].kind==='konferenz') return false;
      let donor=null, donorCls=-1;
      row.forEach((slot,i)=>{
        if (!slot || slot.kind!=='konferenz') return;
        const ids=[lg.teams[md[i][0]], lg.teams[md[i][1]]];
        if (ids.some(id=>id===must[0]||id===must[1])) return;
        const cls=topClass(i);
        if (illegalOnly && cls<3) return;
        if (donor==null || cls>donorCls){ donor=i; donorCls=cls; }
      });
      if (donor==null) return false;
      const tmp=row[idx]; row[idx]=row[donor]; row[donor]=tmp;
      if (legalFree()<topSlots){ const back=row[idx]; row[idx]=row[donor]; row[donor]=back; return false; }
      return true;
    };
    must.forEach(id=>pull(matchOf(id), false));
    if (matchOf(must[0])===matchOf(must[1])){
      const third=ranked.slice(2).find(id=>{ const i=matchOf(id); return i>=0 && topClass(i)<3; });
      if (third) pull(matchOf(third), false);
    }
    for (let guard=0; guard<4 && legalFree()>topSlots; guard++){
      let idx=null;
      row.forEach((slot,i)=>{
        if (!slot || slot.kind==='konferenz' || slot.kind==='top' || topClass(i)>=3) return;
        idx=i;
      });
      if (idx==null || !pull(idx, true)) break;
    }
  }
  row.forEach((slot,i)=>{
    if (!slot || slot.kind!=='top' || topClass(i)<3) return;
    let swap=null;
    row.forEach((other,j)=>{
      if (j===i || !other || other.kind==='top' || other.kind==='konferenz') return;
      const cls=topClass(j);
      if (cls>=3) return;
      const q=pairScore(lg.teams[md[j][0]], lg.teams[md[j][1]], snap);
      if (!swap || cls<swap.cls || (cls===swap.cls && q>swap.q)) swap={j,cls,q};
    });
    if (!swap && (!exactMirror || mi<halfN)){
      const halfTarget=total/2;
      row.forEach((other,j)=>{
        if (j===i || !other || other.kind!=='konferenz') return;
        const cls=topClass(j);
        if (cls>=3) return;
        const ids=[lg.teams[md[j][0]], lg.teams[md[j][1]]];
        if (!exactMirror && ids.some(id=>counts[id].konferenz+(rem-1)<halfTarget)) return;
        const q=pairScore(lg.teams[md[j][0]], lg.teams[md[j][1]], snap);
        if (!swap || cls<swap.cls || (cls===swap.cls && q>swap.q)) swap={j,cls,q};
      });
    }
    if (swap){ const tmp=row[i]; row[i]=row[swap.j]; row[swap.j]=tmp; }
  });
  row.forEach((slot,i)=>{
    if (!slot || slot.kind!=='top') return;
    const here=[lg.teams[md[i][0]], lg.teams[md[i][1]]];
    if (here.some(id=>counts[id].top===0)) return;
    const cls=topClass(i);
    const glam=cls===0 && Math.max(rankOf(here[0]), rankOf(here[1]))<=hotCut(lid, n);
    const threshold=glam?90000:cls===0?55000:18000;
    let best=null;
    row.forEach((other,j)=>{
      if (j===i || !other || other.kind==='top' || other.kind==='konferenz' || topClass(j)>2) return;
      const ids=[lg.teams[md[j][0]], lg.teams[md[j][1]]];
      const urge=Math.max(...ids.map(id=>counts[id].top===0 ? rescueUrge(id, mi, total, lg.teams) : 0));
      if (urge<=0) return;
      if (!best || urge>best.urge) best={j, urge};
    });
    if (best && (best.urge>threshold || (!glam && cls!==0 && rem<=6))){ const tmp=row[i]; row[i]=row[best.j]; row[best.j]=tmp; }
  });
  if (konfPer && !exactMirror){
    const share=(konfPer*2)/n, fair=share*mi, targetMin=total/2;
    const exactKonf=false;
    for (let guard=0; guard<n; guard++){
      let crit=null;
      for (let i=0;i<row.length;i++){
        if (row[i].kind==='konferenz') continue;
        for (const id of [lg.teams[md[i][0]], lg.teams[md[i][1]]]){
          if (counts[id].konferenz+(rem-1)<targetMin) crit=i;
        }
      }
      if (crit==null) break;
      let best=null;
      row.forEach((slot,j)=>{
        if (j===crit || slot.kind!=='konferenz') return;
        const ids=[lg.teams[md[j][0]], lg.teams[md[j][1]]];
        if (ids.some(id=>counts[id].konferenz+(rem-1)<targetMin)) return;
        if (exactKonf && ids.some(id=>counts[id].konferenz<fair-0.15)) return;
        if (row[crit].dow==='Fr' && ids.some(id=>counts[id].fr>=5)) return;
        const slack=Math.min(...ids.map(id=>counts[id].konferenz-fair));
        if (!best || slack>best.slack) best={j, slack};
      });
      if (!best) break;
      const tmp=row[crit]; row[crit]=row[best.j]; row[best.j]=tmp;
    }
    const fixTop=()=>{
      row.forEach((slot,i)=>{
        if (!slot || slot.kind!=='top' || topClass(i)<3) return;
        let alt=null;
        row.forEach((other,j)=>{
          if (j===i || !other || other.kind==='top' || other.kind==='konferenz') return;
          const cls=topClass(j);
          if (cls>=3) return;
          const q=pairScore(lg.teams[md[j][0]], lg.teams[md[j][1]], snap);
          if (!alt || cls<alt.cls || (cls===alt.cls && q>alt.q)) alt={j,cls,q};
        });
        if (alt){ const tmp=row[i]; row[i]=row[alt.j]; row[alt.j]=tmp; }
      });
    };
    fixTop();
    row.forEach((slot,i)=>{
      if (!slot || slot.kind==='top' || topClass(i)>=3) return;
      const ids=[lg.teams[md[i][0]], lg.teams[md[i][1]]];
      if (!ids.some(id=>counts[id].top===0)) return;
      if (ids.some(id=>counts[id].konferenz+(rem-1)<total/2)) return;
      const urge=Math.max(...ids.map(id=>counts[id].top===0?rescueUrge(id, mi, total, lg.teams):0));
      let chances=0;
      ids.forEach(id=>{
        if (counts[id].top!==0) return;
        for (let j=mi+1;j<total-2;j++){
          const g=lg.md[j].find(m=>lg.teams[m[0]]===id||lg.teams[m[1]]===id);
          if (!g) continue;
          const opp=lg.teams[g[0]]===id ? lg.teams[g[1]] : lg.teams[g[0]];
          if (rankOf(opp)<=upper) chances++;
        }
      });
      let alt=null, altRank=99;
      row.forEach((other,j)=>{
        if (!other || other.kind!=='top') return;
        const t2=[lg.teams[md[j][0]], lg.teams[md[j][1]]];
        if (t2.some(id=>counts[id].top===0)) return;
        if (slot.kind==='konferenz' && t2.some(id=>counts[id].konferenz+(rem-1)<total/2)) return;
        const cls=topClass(j);
        const hot=cls===0 && Math.max(rankOf(t2[0]), rankOf(t2[1]))<=hotCut(lid, n);
        const rank=hot?2:cls===0?1:0;
        if (rank<altRank){ alt=j; altRank=rank; }
      });
      if (alt==null) return;
      if (altRank===2 && urge<90000 && rem>4 && chances>1) return;
      if (altRank===1 && urge<50000 && rem>8 && chances>1) return;
      const tmp=row[i]; row[i]=row[alt]; row[alt]=tmp;
    });
    const must=new Set();
    lg.teams.forEach(id=>{
      const cnt=counts[id].konferenz;
      if (cnt+(rem-1) < total/2) must.add(id);
    });
    const mustOutside=md.some((m,i)=>row[i] && row[i].kind!=='konferenz' && (must.has(lg.teams[m[0]])||must.has(lg.teams[m[1]])));
    if (mustOutside || row.some((slot,i)=>slot && slot.kind==='top' && topClass(i)>=3)){
      const konfN=tmpl.filter(s=>s.kind==='konferenz').length;
      const matchOf={};
      md.forEach((m,i)=>{ matchOf[lg.teams[m[0]]]=i; matchOf[lg.teams[m[1]]]=i; });
      let best=null;
      combinations(md.length, konfN).forEach(combo=>{
        const conf=new Set(combo);
        for (const id of must) if (!conf.has(matchOf[id])) return;
        let legalFree=0;
        for (let i=0;i<md.length;i++) if (!conf.has(i) && topClass(i)<3) legalFree++;
        if (legalFree<topSlots) return;
        let flips=0;
        for (let i=0;i<md.length;i++) if (conf.has(i)!==(row[i].kind==='konferenz')) flips++;
        if (!best || flips<best.flips) best={conf,flips};
      });
      if (best && best.flips){
        const out=[], inn=[];
        for (let i=0;i<md.length;i++){
          const was=row[i].kind==='konferenz', now=best.conf.has(i);
          if (was&&!now) out.push(i);
          if (!was&&now) inn.push(i);
        }
        for (let k=0;k<out.length;k++){ const tmp=row[out[k]]; row[out[k]]=row[inn[k]]; row[inn[k]]=tmp; }
        fixTop();
      }
    }
  }
  if (lid==='L3'){
    const fri=row.findIndex(s=>s&&s.dow==='Fr');
    if (fri>=0){
      const frScore=j=>{
        const ids=[lg.teams[md[j][0]], lg.teams[md[j][1]]];
        const mx=Math.max(counts[ids[0]].fr, counts[ids[1]].fr);
        const zero=ids.some(id=>counts[id].fr===0);
        if (mx>=6) return (zero?250:500)+mx;
        return (zero?0:100)+mx;
      };
      let alt=null;
      row.forEach((slot,j)=>{
        if (!slot || slot.kind==='konferenz' || topClass(j)>=3) return;
        const sc=frScore(j);
        if (!alt || sc<alt.sc) alt={j,sc};
      });
      if (alt && alt.j!==fri && alt.sc<frScore(fri)){ const tmp=row[fri]; row[fri]=row[alt.j]; row[alt.j]=tmp; }
    }
  }
  if (flexLeft>0 && flexLeft<=8){
    const twoLower=i=>{
      const h=lg.teams[md[i][0]], a=lg.teams[md[i][1]];
      return Math.min(rankOf(h), rankOf(a))>upper;
    };
    const steal=(want, hasIt)=>{
      for (let guard=0; guard<n; guard++){
        let needy=null;
        for (let i=0;i<row.length;i++){
          if (!row[i] || want(row[i])) continue;
          const ids=[lg.teams[md[i][0]], lg.teams[md[i][1]]];
          if (ids.some(id=>!hasIt(id))) { needy=i; break; }
        }
        if (needy==null) break;
        let donor=null;
        for (let j=0;j<row.length;j++){
          if (j===needy || !row[j] || !want(row[j])) continue;
          if (row[j].kind==='top' && twoLower(needy)) continue;
          const ids=[lg.teams[md[j][0]], lg.teams[md[j][1]]];
          if (ids.every(hasIt)) { donor=j; break; }
        }
        if (donor==null) break;
        const tmp=row[needy]; row[needy]=row[donor]; row[donor]=tmp;
      }
    };
    if (topSlots) steal(s=>s.kind==='top', id=>counts[id].top>0);
    if (tmpl.some(s=>s.dow==='Fr')) steal(s=>s.dow==='Fr', id=>counts[id].fr>0);
    if (hasSo) steal(s=>s.dow==='So', id=>counts[id].so>0);
    if (tmpl.some(s=>s.kind==='regional')) steal(s=>s.kind==='regional', id=>counts[id].regional>0);
  }
  if (lateSeason(total, mi)){
    const battle=relegationBattle(season, lid, mi);
    const info=i=>{
      const h=lg.teams[md[i][0]], a=lg.teams[md[i][1]];
      const H=battle[h], A=battle[a];
      const gap=H&&A?Math.abs(H.pkt-A.pkt):99;
      const upperHit=Math.min(rankOf(h), rankOf(a))<=upper;
      const both=Math.max(rankOf(h), rankOf(a))<=upper;
      return {h, a, gap, upperHit, both, score:pairScore(h, a, snap), kracher:!!(H&&A&&H.battle&&A.battle&&gap<=6)};
    };
    let bestU=null, bestK=null;
    for (let i=0;i<md.length;i++){
      const x=info(i);
      if (x.upperHit && (!bestU || x.score>bestU.score)) bestU={i, ...x};
      if (x.kracher && (!bestK || x.score>bestK.score)) bestK={i, ...x};
    }
    const kScore=bestK ? bestK.score + Math.max(0, 36-bestK.gap*6) : 0;
    const good=bestU && ((bestU.both && bestU.gap<=8) || bestU.score>=80);
    const clear=bestU && bestK && kScore>=bestU.score+12;
    if (bestK && (!good || clear) && row[bestK.i] && row[bestK.i].kind!=='top'){
      let weak=null;
      row.forEach((slot,j)=>{
        if (!slot || slot.kind!=='top' || j===bestK.i) return;
        const x=info(j);
        const hosts=lg.teams[md[j][0]], guest=lg.teams[md[j][1]];
        if (flexLeft<=2 && (counts[hosts].top===0 || counts[guest].top===0)) return;
        if (!weak || x.score<weak.score) weak={j, score:x.score};
      });
      if (weak){
        const tmp=row[bestK.i];
        row[bestK.i]=Object.assign({}, row[weak.j], {kracher:true});
        row[weak.j]=tmp;
      }
    }
  }
  noteKick(md, row, lg, counts);
  return row;
}
function recomputeConfDebt(season, lid){
  const lg=season.leagues[lid], half=lg.teams.length-1, bag=season.kickoffs[lid];
  const debt={}; lg.teams.forEach(id=>debt[id]=0);
  if (!bag) return debt;
  for (let mi=half; mi<lg.md.length; mi++){
    const src=bag[mi-half], row=bag[mi];
    if (!src || !row) continue;
    row.forEach((slot,i)=>{
      const plan=src[i].kind!=='konferenz', now=slot.kind==='konferenz';
      if (plan===now) return;
      const delta=plan&&!now?1:-1;
      debt[lg.teams[lg.md[mi][i][0]]]+=delta;
      debt[lg.teams[lg.md[mi][i][1]]]+=delta;
    });
  }
  if (!season.confDebt) season.confDebt={};
  season.confDebt[lid]=debt;
  return debt;
}
function settleExactBlock(season, lid, from, to){
  const lg=season.leagues[lid], bag=season.kickoffs[lid], n=lg.teams.length, total=lg.md.length, half=n-1;
  const upper=n>=20?8:6, tmpl=slotTemplate(lid);
  const konfCount=tmpl.filter(s=>s.kind==='konferenz').length;
  const topNeed=Math.max(1, tmpl.filter(s=>s.kind==='top').length);
  const snap=powerSnapshot(season, lid, from);
  const rankOf=id=>snap.rank[id]||n;
  const indexOf={}; lg.teams.forEach((id,i)=>indexOf[id]=i);
  const days=[]; for (let mi=from; mi<=to; mi++) if (bag[mi] && bag[mi-half]) days.push(mi);
  if (!days.length) return recomputeConfDebt(season, lid);
  const optionCache={};
  const optionsFor=mi=>{
    if (optionCache[mi]) return optionCache[mi];
    const md=lg.md[mi], src=bag[mi-half], opts=[];
    const legal=i=>Math.min(rankOf(lg.teams[md[i][0]]), rankOf(lg.teams[md[i][1]]))<=upper;
    combinations(md.length, konfCount).forEach(combo=>{
      const conf=new Set(combo);
      let legalFree=0, flips=0;
      const delta=new Array(n).fill(0), add=new Array(n).fill(0);
      for (let i=0;i<md.length;i++){
        const now=conf.has(i), plan=src[i].kind!=='konferenz';
        if (!now && legal(i)) legalFree++;
        if (now){ add[indexOf[lg.teams[md[i][0]]]]=1; add[indexOf[lg.teams[md[i][1]]]]=1; }
        if (plan===now) continue;
        flips++;
        const dlt=plan&&!now?1:-1;
        delta[indexOf[lg.teams[md[i][0]]]]+=dlt;
        delta[indexOf[lg.teams[md[i][1]]]]+=dlt;
      }
      if (legalFree>=topNeed) opts.push({conf, delta, add, flips});
    });
    optionCache[mi]=opts;
    return opts;
  };
  const debtVector=skip=>{
    const v=new Array(n).fill(0), skipSet=new Set(skip);
    for (let mi=half; mi<total; mi++){
      if (skipSet.has(mi) || !bag[mi] || !bag[mi-half]) continue;
      const src=bag[mi-half], row=bag[mi];
      for (let i=0;i<row.length;i++){
        const plan=src[i].kind!=='konferenz', now=row[i].kind==='konferenz';
        if (plan===now) continue;
        const dlt=plan&&!now?1:-1;
        v[indexOf[lg.teams[lg.md[mi][i][0]]]]+=dlt;
        v[indexOf[lg.teams[lg.md[mi][i][1]]]]+=dlt;
      }
    }
    return v;
  };
  const sumSq=v=>{ let s=0; for (let t=0;t<n;t++) s+=v[t]*v[t]; return s; };
  const sig=d=>{ let s=''; for (let t=0;t<n;t++) s+=d[t]+','; return s; };
  const fillDay=(mi, conf)=>{
    const counts=tallyExcept(season, lid, mi);
    bag[mi]=assignExactDayRow(lg.md[mi], tmpl, conf, {
      teams:lg.teams, counts, rankOf, upper, mi, rem:total-mi, n, total, ids:lg.teams, pairQ:(h,a)=>pairScore(h,a,snap)
    });
  };
  const currentLegal=mi=>{
    const row=bag[mi], md=lg.md[mi];
    let c=0;
    for (let i=0;i<row.length;i++){
      if (row[i].kind==='konferenz') continue;
      if (Math.min(rankOf(lg.teams[md[i][0]]), rankOf(lg.teams[md[i][1]]))<=upper) c++;
    }
    return c>=topNeed;
  };
  const outside=debtVector(days);
  const outsideSS=sumSq(outside);
  const allLegal=days.every(currentLegal);
  if (outsideSS===0 && allLegal){
    days.forEach(mi=>{
      const row=bag[mi];
      const bad=row.some((slot,i)=>slot.kind==='top' && Math.min(rankOf(lg.teams[lg.md[mi][i][0]]), rankOf(lg.teams[lg.md[mi][i][1]]))>upper);
      if (bad){
        const conf=new Set();
        row.forEach((slot,i)=>{ if (slot.kind==='konferenz') conf.add(i); });
        fillDay(mi, conf);
      }
    });
    return recomputeConfDebt(season, lid);
  }
  const optLists=days.map(optionsFor);
  let solved=null;
  const target=outside.map(x=>-x);
  if (optLists.every(o=>o.length)){
    const mid=Math.floor(days.length/2);
    const enumerate=(lists)=>{
      if (lists.length===1) return lists[0].map(o=>({delta:o.delta, flips:o.flips, picks:[o]}));
      const A=lists[0], B=lists[1], out=[];
      for (let i=0;i<A.length;i++) for (let j=0;j<B.length;j++){
        const da=A[i].delta, db=B[j].delta, delta=new Array(n);
        for (let t=0;t<n;t++) delta[t]=da[t]+db[t];
        out.push({delta, flips:A[i].flips+B[j].flips, picks:[A[i], B[j]]});
      }
      return out;
    };
    const left=enumerate(optLists.slice(0, mid));
    const right=enumerate(optLists.slice(mid));
    const map=new Map();
    right.forEach(r=>{
      const k=sig(r.delta);
      const prev=map.get(k);
      if (!prev || r.flips<prev.flips) map.set(k, r);
    });
    const need=new Array(n);
    left.forEach(L=>{
      for (let t=0;t<n;t++) need[t]=target[t]-L.delta[t];
      const R=map.get(sig(need));
      if (!R) return;
      const flips=L.flips+R.flips;
      if (!solved || flips<solved.flips) solved={flips, picks:L.picks.concat(R.picks)};
    });
  }
  if (solved){
    days.forEach((mi,i)=>fillDay(mi, solved.picks[i].conf));
  } else {
    days.forEach(mi=>{
      if (currentLegal(mi) && outsideSS===0) return;
      const base=debtVector([mi]);
      let best=null;
      optionsFor(mi).forEach(opt=>{
        let ssv=0;
        for (let t=0;t<n;t++){ const dd=base[t]+opt.delta[t]; ssv+=dd*dd; }
        if (!best || ssv<best.ss || (ssv===best.ss && opt.flips<best.flips)) best={opt, ss:ssv};
      });
      if (best) fillDay(mi, best.opt.conf);
    });
  }
  return recomputeConfDebt(season, lid);
}
function nudgeNonExactBlock(season, lid, from, to, snap){
  const lg=season.leagues[lid], bag=season.kickoffs[lid], n=lg.teams.length, total=lg.md.length;
  const upper=n>=20?8:6, konfN=slotTemplate(lid).filter(s=>s.kind==='konferenz').length;
  const topNeed=Math.max(1, slotTemplate(lid).filter(s=>s.kind==='top').length);
  const rankOf=id=>snap.rank[id]||n;
  const legalAt=(mi,i)=>Math.min(rankOf(lg.teams[lg.md[mi][i][0]]), rankOf(lg.teams[lg.md[mi][i][1]]))<=upper;
  const hasBad=mi=>bag[mi]&&bag[mi].some((slot,i)=>slot.kind==='top'&&!slot.kracher&&!legalAt(mi,i));
  const countBefore=mi=>{
    const c={}; lg.teams.forEach(id=>c[id]=0);
    for (let d=0; d<mi; d++) if (bag[d]) bag[d].forEach((slot,i)=>{
      if (slot.kind!=='konferenz') return;
      c[lg.teams[lg.md[d][i][0]]]++; c[lg.teams[lg.md[d][i][1]]]++;
    });
    return c;
  };
  const placeTops=mi=>{
    const row=bag[mi];
    row.forEach((slot,i)=>{
      if (slot.kind!=='top' || slot.kracher || legalAt(mi,i)) return;
      let alt=null;
      row.forEach((other,j)=>{
        if (j===i || other.kind==='top' || other.kind==='konferenz' || !legalAt(mi,j)) return;
        alt=j;
      });
      if (alt!=null){ const t=row[i]; row[i]=row[alt]; row[alt]=t; }
    });
  };
  const trySolve=mi=>{
    const cnt=countBefore(mi), rem=total-mi, target=total/2, row=bag[mi];
    const must=new Set();
    lg.teams.forEach(id=>{ if (cnt[id]+(rem-1)<target) must.add(id); });
    const at={};
    lg.md[mi].forEach((m,i)=>{ at[lg.teams[m[0]]]=i; at[lg.teams[m[1]]]=i; });
    let best=null;
    combinations(lg.md[mi].length, konfN).forEach(combo=>{
      const conf=new Set(combo);
      for (const id of must) if (!conf.has(at[id])) return;
      let legalFree=0;
      for (let i=0;i<lg.md[mi].length;i++) if (!conf.has(i) && legalAt(mi,i)) legalFree++;
      if (legalFree<topNeed) return;
      let flips=0;
      for (let i=0;i<row.length;i++) if (conf.has(i)!==(row[i].kind==='konferenz')) flips++;
      if (!best || flips<best.flips) best={conf,flips};
    });
    if (!best) return false;
    if (best.flips){
      const out=[], inn=[];
      for (let i=0;i<row.length;i++){
        const was=row[i].kind==='konferenz', now=best.conf.has(i);
        if (was&&!now) out.push(i);
        if (!was&&now) inn.push(i);
      }
      for (let k=0;k<out.length;k++){ const t=row[out[k]]; row[out[k]]=row[inn[k]]; row[inn[k]]=t; }
    }
    placeTops(mi);
    return !hasBad(mi);
  };
  for (let guard=0; guard<8; guard++){
    let stuck=null;
    for (let mi=from; mi<=to; mi++) if (hasBad(mi)) stuck=mi;
    if (stuck==null) return;
    if (trySolve(stuck)) continue;
    const cnt=countBefore(stuck), rem=total-stuck, target=total/2;
    const must=[];
    lg.teams.forEach(id=>{ if (cnt[id]+(rem-1)<target) must.push(id); });
    let moved=false;
    for (const id of must){
      if (moved) break;
      for (let d=from; d<stuck && !moved; d++){
        const row=bag[d];
        const idx=lg.md[d].findIndex(m=>lg.teams[m[0]]===id||lg.teams[m[1]]===id);
        if (idx<0 || row[idx].kind==='konferenz') continue;
        const before=countBefore(d);
        let donor=null;
        row.forEach((slot,j)=>{
          if (slot.kind!=='konferenz' || j===idx) return;
          const ids=[lg.teams[lg.md[d][j][0]], lg.teams[lg.md[d][j][1]]];
          const remD=total-d;
          if (ids.some(x=>before[x]+(remD-1)<target)) return;
          donor=j;
        });
        if (donor==null) continue;
        const backD=row.slice(), backS=bag[stuck].slice();
        const tmp=row[idx]; row[idx]=row[donor]; row[donor]=tmp;
        placeTops(d);
        if (hasBad(d) || !trySolve(stuck)){
          for (let i=0;i<row.length;i++) row[i]=backD[i];
          for (let i=0;i<bag[stuck].length;i++) bag[stuck][i]=backS[i];
          continue;
        }
        moved=true;
      }
    }
    if (!moved) return;
  }
}
function prepareFinalDay(season, lid, from, to, snap){
  const lg=season.leagues[lid], total=lg.md.length, last=total-1;
  if (to!==last-1) return;
  const bag=season.kickoffs[lid], n=lg.teams.length, upper=n>=20?8:6, target=total/2;
  const rankOf=id=>snap.rank[id]||n;
  const legal=(mi,i)=>Math.min(rankOf(lg.teams[lg.md[mi][i][0]]), rankOf(lg.teams[lg.md[mi][i][1]]))<=upper;
  const tally=()=>{
    const c={}; lg.teams.forEach(id=>c[id]=0);
    for (let d=0; d<=to; d++) if (bag[d]) bag[d].forEach((slot,i)=>{
      if (slot.kind!=='konferenz') return;
      c[lg.teams[lg.md[d][i][0]]]++; c[lg.teams[lg.md[d][i][1]]]++;
    });
    return c;
  };
  const pressureOf=cnt=>lg.md[last].reduce((nPress,m,i)=>{
    if (!legal(last,i)) return nPress;
    const ids=[lg.teams[m[0]], lg.teams[m[1]]];
    return nPress+ids.filter(id=>cnt[id]<target).length;
  },0);
  const cleanOf=cnt=>lg.md[last].reduce((nClean,m,i)=>{
    if (!legal(last,i)) return nClean;
    const ids=[lg.teams[m[0]], lg.teams[m[1]]];
    return nClean+(ids.every(id=>cnt[id]>=target)?1:0);
  },0);
  const fixTops=mi=>{
    const row=bag[mi];
    row.forEach((slot,i)=>{
      if (slot.kind!=='top' || slot.kracher || legal(mi,i)) return;
      let alt=null;
      row.forEach((other,j)=>{
        if (j===i || other.kind==='top' || other.kind==='konferenz' || !legal(mi,j)) return;
        alt=j;
      });
      if (alt!=null){ const t=row[i]; row[i]=row[alt]; row[alt]=t; }
    });
  };
  for (let guard=0; guard<10; guard++){
    const cnt=tally();
    if (cleanOf(cnt)>=2) return;
    const pressure=pressureOf(cnt);
    const must=lg.teams.filter(id=>cnt[id]<target);
    let did=false;
    for (const id of must){
      if (did) break;
      const onLast=lg.md[last].findIndex(m=>lg.teams[m[0]]===id||lg.teams[m[1]]===id);
      if (onLast<0 || !legal(last,onLast)) continue;
      for (let d=from; d<=to && !did; d++){
        const row=bag[d];
        const idx=lg.md[d].findIndex(m=>lg.teams[m[0]]===id||lg.teams[m[1]]===id);
        if (idx<0 || row[idx].kind==='konferenz') continue;
        for (let donor=0; donor<row.length && !did; donor++){
          if (row[donor].kind!=='konferenz' || donor===idx) continue;
          const donors=[lg.teams[lg.md[d][donor][0]], lg.teams[lg.md[d][donor][1]]];
          if (donors.some(x=>cnt[x]-1<target-1)) continue;
          const back=row.slice();
          const tmp=row[idx]; row[idx]=row[donor]; row[donor]=tmp;
          fixTops(d);
          const bad=bag[d].some((slot,i)=>slot.kind==='top'&&!legal(d,i));
          if (bad || pressureOf(tally())>=pressure){ for (let i=0;i<row.length;i++) row[i]=back[i]; continue; }
          did=true;
        }
      }
    }
    if (!did) return;
  }
}
function scheduleNextBlock(season, lid){
  const tr=window.FR_TIMING; const t0=tr?performance.now():0;
  const lg=season.leagues[lid], n=lg.teams.length;
  const from=lastScheduled(season, lid)+1;
  const range=nextBlockRange(n, from);
  if (!range) return null;
  season.kickoffs=season.kickoffs||{};
  const bag=season.kickoffs[lid]||(season.kickoffs[lid]={});
  const snap=powerSnapshot(season, lid, range[0]);
  const counts=slotTally(season, lid);
  for (let mi=range[0]; mi<=range[1]; mi++) bag[mi]=assignMatchday(season, lid, mi, snap, counts);
  const half=n-1, total=lg.md.length, konfPer=slotTemplate(lid).filter(s=>s.kind==='konferenz').length;
  const exact=false;
  if (exact && range[0]>=half) settleExactBlock(season, lid, range[0], range[1]);
  else if (konfPer && !exact){
    nudgeNonExactBlock(season, lid, range[0], range[1], snap);
    if (range[0]===total-1){
      let prevFrom=0, b=0;
      while (b<total-1){
        const halfEnd=b<half?half-1:total-1;
        const end=Math.min(b+3, halfEnd);
        if (end>=total-2){ prevFrom=b; break; }
        b=end+1;
      }
      prepareFinalDay(season, lid, prevFrom, total-2, snap);
      delete bag[total-1];
      bag[total-1]=assignMatchday(season, lid, total-1, snap, slotTally(season, lid));
    }
  }
  if (tr) tr.schedMs=(tr.schedMs||0)+performance.now()-t0;
  return range;
}
function maybeAdvance(season, lid){
  const last=lastScheduled(season, lid);
  if (last<0) return null;
  const md=season.leagues[lid].md;
  if (last>=md.length-1) return null;
  if (!md[last].every(m=>m[2]!=null&&m[3]!=null)) return null;
  return scheduleNextBlock(season, lid);
}
function maxRun(str){ let m=0,c=0,p=''; for (const ch of str){ if(ch===p){c++;} else {c=1;p=ch;} if(c>m)m=c; } return m; }
function viewTerminierung(s, lid){
  const lg=s.leagues[lid];
  if (!lg || !lg.md) return '<div class="box"><p class="muted">Die einzelnen Spiele und Anstoßzeiten dieser Saison sind nicht mehr gespeichert.</p></div>';
  const total=lg.md.length;
  const fix=validateFixtures(lg.md);
  const tmpl=slotTemplate(lid);
  const has={fr:tmpl.some(x=>x.dow==='Fr'), so:tmpl.some(x=>x.dow==='So'), konferenz:tmpl.some(x=>x.kind==='konferenz'), top:tmpl.some(x=>x.kind==='top'), regional:tmpl.some(x=>x.kind==='regional')};
  const counts=slotTally(s, lid);
  let h='<div class="box"><h3>Spielplan-Prüfung</h3><p class="'+(fix.ok?'ok':'bad')+'">'+(fix.ok?'Jede Paarung einmal zu Hause und einmal auswärts. Keine drei Heim- oder Auswärtsspiele in Folge, auch nicht am Übergang. Höchstens '+fix.maxBreaks+' Breaks pro Verein, und wer zwei hat, einen zu Hause und einen auswärts.':'Auffälligkeiten: '+esc(fix.issues.slice(0,5).join(' · ')))+'</p>';
  const last=lastScheduled(s,lid);
  if (last<0 && isEditable()) h+='<button class="btn primary" data-act="termBlock">Spieltage 1–4 terminieren</button>';
  else if (last>=0 && last<total-1) h+='<p class="muted">Angesetzt bis Spieltag '+(last+1)+'. Der nächste Block folgt automatisch, sobald dieser Spieltag vollständig ist. Blöcke enden an der Hin- bzw. Rückrunde.</p>';
  else if (last>=total-1) h+='<p class="muted">Die ganze Saison ist terminiert.</p>';
  h+='</div>';
  const cols=[];
  if (has.fr) cols.push(['fr','Fr']);
  if (has.konferenz) cols.push(['konferenz','Konferenz']);
  if (has.top) cols.push(['top','Topspiel']);
  if (has.so) cols.push(['so','Sonntag']);
  if (has.regional) cols.push(['regional','regional']);
  h+='<div class="box"><h3>Je Verein</h3><p class="muted">Sortiert nach dem aktuellen Tabellenplatz. Spiele ist die Zahl der terminierten Partien. Breaks zählen zweimal dieselbe Platzseite in Folge, den Übergang von Hin- zu Rückrunde eingeschlossen.</p><div style="overflow:auto"><table class="tbl"><thead><tr>'+sortHead('Pl.','pl')+sortHead('Verein','','l')+sortHead('Spiele','spiele')+cols.map(c=>sortHead(c[1], c[0])).join('')+sortHead('Breaks','breaks')+sortHead('Regeln','','l')+'</tr></thead><tbody>';
  const placeOf={}; leagueTable(s,lid).forEach(r=>placeOf[r.id]=r.pl);
  lg.teams.slice().sort((x,y)=>(placeOf[x]||999)-(placeOf[y]||999)).forEach(id=>{
    const idx=lg.teams.indexOf(id);
    const c=counts[id];
    const full=haString(lg.md, idx, 0, total);
    const run=maxRun(full), br=breakCount(full), kinds=breakKinds(full);
    const open=last<total-1;
    const problems=[];
    if (!open) cols.forEach(([key,label])=>{
      if (key==='konferenz'){ if (c.konferenz<total/2) problems.push('Konferenz '+c.konferenz+'/'+(total/2)); }
      else if (!c[key]) problems.push(label+' fehlt');
    });
    if (run>2) problems.push('Serie '+run);
    if (br>2) problems.push(br+' Breaks');
    if (kinds.hh>1 || kinds.aa>1) problems.push('zweimal '+ (kinds.hh>1?'Heim':'Auswärts'));
    const bad=problems.length>0;
    h+='<tr>'+sortCell(placeOf[id], placeOf[id])+'<td class="l">'+clubHTML(id,{nobl:true})+'</td>'+sortCell(c.total, c.total)+cols.map(([key])=>{
      const v=c[key];
      const warn=!open && (key==='konferenz'?v<total/2:v===0);
      return sortCell(v, v, warn?'bad':'');
    }).join('')+sortCell(br, br, (run>2||br>2||kinds.hh>1||kinds.aa>1?'bad':'ok'))+'<td class="l '+(bad?'bad':(open?'':'ok'))+'">'+(bad?esc(problems.join(', ')):(open?'offen':'erfüllt'))+'</td></tr>';
  });
  h+='</tbody></table></div><p class="muted">Mindestens die Hälfte der Spiele in der Konferenz, jede Ansetzungsart mindestens einmal, keine drei Heim- oder Auswärtsspiele in Folge, höchstens zwei Breaks pro Verein und davon einer heim und einer auswärts. Die letzten zwei Spieltage laufen komplett gleichzeitig zur Samstags-Konferenzzeit und zählen als Konferenz. Rot erst, wenn die Saison terminiert ist und eine Regel reißt. Topspiel: die punktstärkste enge Paarung, sonst ein unterer Verein, der sein Topspiel noch braucht, gegen einen Verein aus dem oberen Bereich. Zwei untere Vereine nur nach etwa 70 % der Saison, und nur als echtes Abstiegsduell, wenn es stärker ist als das beste Spiel mit einem oberen Verein.</p></div>';
  return h;
}
function haString(md, idx, from, to){
  let s='';
  for (let r=from;r<to;r++) md[r].forEach(m=>{ if(m[0]===idx) s+='H'; else if(m[1]===idx) s+='A'; });
  return s;
}
function leagueStateNames(lid){
  const lg=L[lid];
  if (!lg || lg.level<=4) return null;
  return Object.keys(AREA_BY_BL).filter(bl=>{
    const area=AREA_BY_BL[bl];
    if (lg.up===1) it.push(legendSwatch('auf','Meister &amp; Aufstieg → '+leagueName(lg.upTo)));
    else if (lg.level===6) it.push(legendSwatch('auf','Zwei Aufsteiger → '+leagueName(lg.upTo)));
    else if (lg.up>1) it.push(legendSwatch('auf','Aufstieg → '+leagueName(lg.upTo)));
    if (lg.level===5) return RL_BY_AREA[area]===lid;
    return true;
  });
}
let mapView={lid:null,z:1,cx:320,cy:380};
function viewKarte(s, lid){
  const ids=s.leagues[lid].teams, states=window.FR_STATES;
  if(!states) return '<div class="box">Kartendaten fehlen.</div>';
  const allow=leagueStateNames(lid);
  const features=states.features.filter(f=>!allow || allow.includes(f.properties.name));
  const rings=[];
  features.forEach(f=>{
    const g=f.geometry, polys=g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
    polys.forEach(poly=>poly.forEach(ring=>rings.push(ring)));
  });
  let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  const lat0=51.2, cos=Math.cos(lat0*Math.PI/180);
  const xy=(lon,lat)=>{ const x=(lon-10.4)*cos, y=-(lat-lat0); return [x,y]; };
  rings.forEach(ring=>ring.forEach(p=>{ const [x,y]=xy(p[0],p[1]); if(x<minX)minX=x; if(y<minY)minY=y; if(x>maxX)maxX=x; if(y>maxY)maxY=y; }));
  const W=760,H=820,pad=28;
  const spanX=Math.max(0.01,maxX-minX), spanY=Math.max(0.01,maxY-minY);
  const sc=Math.min((W-2*pad)/spanX, (H-2*pad)/spanY);
  const offX=(W-(spanX*sc))/2, offY=(H-(spanY*sc))/2;
  const px=(lon,lat)=>{ const [x,y]=xy(lon,lat); return [(x-minX)*sc+offX, (y-minY)*sc+offY]; };
  let paths='';
  features.forEach(f=>{
    const g=f.geometry, polys=g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
    let d='';
    polys.forEach(poly=>poly.forEach(ring=>{
      ring.forEach((p,i)=>{ const [x,y]=px(p[0],p[1]); d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1); });
      d+='Z';
    }));
    paths+='<path d="'+d+'"><title>'+esc(f.properties.name)+'</title></path>';
  });
  const marks=ids.map(id=>{ const c=coordOf(id); if(!c) return null; const [x,y]=px(c.lon,c.lat); return {id,x,y,name:TEAMS[id].name,stadion:c.stadion,crest:TEAMS[id].crest}; }).filter(Boolean);
  const crests=marks.map(m=>{
    const tip=esc(m.name);
    return '<g class="crest"><title>'+tip+'</title><image href="'+esc(m.crest)+'" data-cx="'+m.x.toFixed(2)+'" data-cy="'+m.y.toFixed(2)+'" x="'+(m.x-17).toFixed(1)+'" y="'+(m.y-17).toFixed(1)+'" width="34" height="34"/></g>';
  }).join('');
  const scope=allow?allow.join(', '):'Deutschland';
  return '<div class="card map-card"><div class="card-title"><span>'+esc(L[lid].name)+' – Vereine</span><span class="map-tools"><button class="btn small" data-act="mapReset">Ansicht zurücksetzen</button></span></div><div class="map-wrap"><svg class="de-map" data-lid="'+esc(lid)+'" data-w="'+W+'" data-h="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Karte '+esc(L[lid].name)+'">'+paths+crests+'</svg></div><p class="map-credit">'+esc(scope)+' · Mausrad zoomt, Ziehen verschiebt. In der Übersicht sind die Wappen etwas größer; beim Heranzoomen bleiben sie auf dem Bildschirm gleich groß und liegen am Spielort. Kartendaten © OpenStreetMap-Mitwirkende, europlan-online.de · Grenzen: Natural Earth</p></div>';
}
function clampMap(W, H){
  const z=mapView.z||1, w=W/z, h=H/z;
  const slackX=w*0.12, slackY=h*0.12;
  const minCx=w/2-slackX, maxCx=W-w/2+slackX;
  const minCy=h/2-slackY, maxCy=H-h/2+slackY;
  mapView.cx=Math.min(Math.max(mapView.cx, minCx), Math.max(minCx, maxCx));
  mapView.cy=Math.min(Math.max(mapView.cy, minCy), Math.max(minCy, maxCy));
}
function applyMap(){
  const svg=document.querySelector('.de-map'); if(!svg) return;
  const W=+svg.dataset.w, H=+svg.dataset.h, z=mapView.z;
  clampMap(W, H);
  const w=W/z, h=H/z, x=mapView.cx-w/2, y=mapView.cy-h/2;
  svg.setAttribute('viewBox', x+' '+y+' '+w+' '+h);
  const rect=svg.getBoundingClientRect();
  const size=Math.max(6, 34*(W/(rect.width||W))/z);
  svg.querySelectorAll('.crest image').forEach(img=>{
    const cx=+img.dataset.cx, cy=+img.dataset.cy;
    img.setAttribute('x', (cx-size/2).toFixed(2));
    img.setAttribute('y', (cy-size/2).toFixed(2));
    img.setAttribute('width', size.toFixed(2));
    img.setAttribute('height', size.toFixed(2));
  });
}
function bindMap(){
  const svg=document.querySelector('.de-map'); if(!svg) return;
  const W=+svg.dataset.w, H=+svg.dataset.h, lid=svg.dataset.lid;
  if (mapView.lid!==lid) mapView={lid, z:1, cx:W/2, cy:H/2};
  applyMap();
  svg.addEventListener('wheel', ev=>{
    ev.preventDefault();
    const rect=svg.getBoundingClientRect();
    const z0=mapView.z;
    const z1=Math.max(1, Math.min(18, z0*(ev.deltaY<0?1.16:1/1.16)));
    const px=(ev.clientX-rect.left)/rect.width, py=(ev.clientY-rect.top)/rect.height;
    const w0=W/z0, h0=H/z0;
    const vx=mapView.cx-w0/2+px*w0, vy=mapView.cy-h0/2+py*h0;
    const w1=W/z1, h1=H/z1;
    mapView.cx=vx-px*w1+w1/2;
    mapView.cy=vy-py*h1+h1/2;
    mapView.z=z1;
    applyMap();
  }, {passive:false});
  let drag=null;
  svg.addEventListener('pointerdown', ev=>{
    if (ev.button!==0) return;
    drag={x:ev.clientX,y:ev.clientY,cx:mapView.cx,cy:mapView.cy};
    svg.classList.add('dragging');
    svg.setPointerCapture(ev.pointerId);
  });
  svg.addEventListener('pointermove', ev=>{
    if (!drag) return;
    const rect=svg.getBoundingClientRect();
    const w=W/mapView.z, h=H/mapView.z;
    mapView.cx=drag.cx-(ev.clientX-drag.x)/rect.width*w;
    mapView.cy=drag.cy-(ev.clientY-drag.y)/rect.height*h;
    applyMap();
  });
  const end=()=>{ drag=null; svg.classList.remove('dragging'); };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
}
function transitionOf(s){
  if (s.endData) return s.endData;
  return computeTransition(s);
}
function moveReasonHTML(s, e){
  let h='<div class="box"><h3>Warum diese Zahlen</h3>';
  LEAGUES.filter(l=>l.level<=4).forEach(l=>{
    const text=l.id==='BL'
      ? 'Die Bundesliga steigt nicht auf und gibt immer die letzten drei ab. Daran ändert nichts, was darunter passiert.'
      : 'Es bleiben '+l.up+' Aufsteiger und '+l.down+' Absteiger. Diese Zahlen sind fest.';
    h+='<p><b>'+esc(l.name)+'.</b> '+text+'</p>';
  });
  h+='<p><b>Regionalliga.</b> Zwei Absteiger sind fest. Dazu kommt der Ausgleich: einer, weil vier Vereine aus den Oberligen nachrücken und nur der Meister aufsteigt, plus einer je Absteiger aus der 4. Liga. Das gilt für alle vier Regionalligen.</p>';
  h+='<p><b>Oberliga.</b> Die Plätze 1 und 2 steigen fest auf, zwei Vereine kommen aus der Amateurliga nach. Die Abstiegszahl ist genau die Zahl der Absteiger aus der eigenen Regionalliga. Das gilt für alle acht Oberligen.</p>';
  h+='<p><b>Amateurliga.</b> Aus jedem der acht Gebiete steigen zwei Vereine in die zugehörige Oberliga auf, 16 insgesamt. Die Absteiger aus den Oberligen kommen in die Amateurliga ihres Gebiets.</p>';
  h+='</div>';
  return h;
}
function pickBlockHTML(s, e){
  let h='<div class="box"><h3>Aufsteiger aus der Amateurliga</h3><p class="muted">Wähle pro Oberliga die Aufsteiger aus der Amateurliga desselben Gebiets. Die Anzahl sind die freien Plätze. Absteiger aus der Oberliga dieser Saison können nicht sofort wieder aufsteigen.</p>'+
    '<button class="btn small" data-act="suggest">Vorschlag: jeweils die historisch stärksten übernehmen</button> <button class="btn small" data-act="clearPicks">Auswahl leeren</button> <label style="margin-left:10px"><input type="checkbox" id="allPools"'+(S.ui.allPools?' checked':'')+'> alle Amateurvereine anzeigen (auch andere Regionen)</label></div><div class="grid2">';
  let ok=true;
  POOLS.forEach(p=>{
    const need=e.need[p.ol], picks=(e.picks&&e.picks[p.ol])||[];
    if (picks.length!==need) ok=false;
    let cand = S.ui.allPools ? POOLS.flatMap(x=>e.pools[x.id]) : [...e.pools[p.id]];
    cand = cand.filter(id=>!e.moves.some(m=>m.id===id&&m.type==='ab'&&L[m.from]&&L[m.from].level===6)).sort(byRang);
    const takenElse = new Set(Object.entries(e.picks||{}).filter(([k])=>k!==p.ol).flatMap(([,v])=>v));
    h+='<div class="box"><div class="pick-head"><h3 style="margin:0">'+esc(L[p.ol].name)+'</h3><span class="'+(picks.length===need?'ok':'bad')+'">'+picks.length+' / '+need+'</span></div><div class="muted" style="margin-bottom:6px">aus: '+esc(p.name)+' ('+esc(p.desc)+')</div><div class="pick-list" data-ol="'+esc(p.ol)+'">'+
      cand.filter(id=>!takenElse.has(id)).map(id=>'<label class="pick-row'+(picks.includes(id)?' sel':'')+'"><input type="checkbox" data-pick="'+p.ol+'" value="'+id+'"'+(picks.includes(id)?' checked':'')+'>'+clubHTML(id,{nobl:true})+'<span class="r">'+(TEAMS[id].rang?'Rang '+TEAMS[id].rang:'ohne Wertung')+'</span></label>').join('')+'</div></div>';
  });
  h+='</div><div style="display:flex;gap:8px;margin-top:6px"><button class="btn" data-act="endCancel">Abbrechen</button><button class="btn primary" data-act="finalize"'+(ok?'':' disabled')+'>Saison '+nextSeasonName(s.name)+' starten</button></div>';
  return h;
}
function renderAufAb(){
  const s=cur();
  $('#title').textContent='Auf/Abstiege';
  const pr=seasonProgress(s);
  let sub=s.status==='done'?'Abgeschlossene Saison':'Auf- und Absteiger dieser Saison';
  $('#subline').innerHTML=sub;
  setActions(seasonActions(s));
  $('#tabs').innerHTML=TABS.map(([k,n])=>'<a class="tab'+(k==='aufab'?' active':'')+'" data-tab="'+k+'">'+n+'</a>').join('');
  const e=transitionOf(s);
  const preview=!s.endData;
  let h='';
  if (s.status==='ending' && pr.done<pr.total) h+='<div class="notice">Achtung: '+(pr.total-pr.done)+' Spiele sind noch nicht eingetragen. Die Tabellen werden so gewertet, wie sie gerade stehen. <button class="btn small" data-act="endSimAll">Fehlende Spiele zufällig simulieren</button> <button class="btn small" data-act="endCancel">Zurück zur Saison</button></div>';
  else if (preview && pr.done<pr.total) h+='<div class="notice">Noch nicht alle Spiele sind eingetragen. Die Pyramide folgt dem aktuellen Tabellenstand und kann sich ändern.</div>';
  else if (preview && (decidePending(s)||supercupPending(s))) h+='<div class="notice">Entscheidungsspiel oder Supercup ist noch offen. Die Aufsteiger wählst du, sobald das erledigt ist.</div>';
  else if (preview && s.status==='running' && S.view===S.seasons.length-1) h+='<div class="box"><p>Alle Spiele sind eingetragen.</p><button class="btn primary" data-act="end">Aufsteiger aus der Amateurliga wählen</button></div>';
  h+=moveBoardHTML(e, s);
  h+=moveReasonHTML(s, e);
  if (s.status==='ending') h+=pickBlockHTML(s, e);
  $('#view').innerHTML=h;
}
const PY_PAIRS=[
  {rl:'RLN', cap:'Nord', ols:['OLNS','OLNN'], sub:'OL Nord-S / OL Nord-N'},
  {rl:'RLO', cap:'Ost', ols:['OLON','OLOS'], sub:'OL Ost-N / OL Ost-S'},
  {rl:'RLS', cap:'Süd', ols:['OLBY','OLBW'], sub:'OL Bayern / OL Baden-Württemberg'},
  {rl:'RLW', cap:'West', ols:['OLNRW','OLSW'], sub:'OL NRW / OL Südwest'}
];
function mvRow(id, path){
  const t=TEAMS[id]; if(!t) return '';
  const route=path?'<span class="mv-path">'+esc(path)+'</span>':'';
  return '<div class="mv-row"><img src="'+esc(t.crest)+'" alt="" data-club="'+id+'" title="'+esc(t.name)+'"><span class="mv-name" title="'+esc(t.name)+'">'+esc(t.name)+'</span>'+route+'</div>';
}
function mvSec(kind, title, inner){
  if (!inner) return '';
  return '<section class="mv-sec '+kind+'"><h4>'+title+'</h4><div class="mv-rows">'+inner+'</div></section>';
}
const TREE_POS={};
['BL','BL2','L3','L4','RLN','RLO','RLS','RLW','OLNS','OLNN','OLON','OLOS','OLBY','OLBW','OLNRW','OLSW'].forEach((id,i)=>{ TREE_POS[id]=i; });
POOLS.forEach((p,i)=>{ TREE_POS[p.id]=100+i; });
function targetRank(id){ return TREE_POS[id]!=null?TREE_POS[id]:500; }
function groupedSecs(groups, kind, word, withPath, cardKind){
  const list=groups.slice().sort((a,b)=>targetRank(a.k)-targetRank(b.k)||String(a.k).localeCompare(String(b.k),'de'));
  const split=list.length>1 && cardKind!=='ol' && list.length<=4;
  const html=list.map(g=>mvSec(kind, word+' → '+leagueShort(g.k), mvRows(g.list, withPath && !split))).join('');
  if (!split) return html;
  return '<div class="mv-split n'+list.length+'">'+html+'</div>';
}
function mvGroup(list, keyFn){
  const out=[];
  (list||[]).forEach(m=>{
    const k=keyFn(m);
    let g=out.find(x=>x.k===k);
    if (!g){ g={k:k, list:[]}; out.push(g); }
    g.list.push(m);
  });
  return out;
}
function mvPath(m){ return leagueShort(m.from)+' → '+leagueShort(m.to); }
function mvRows(list, withPath){ return (list||[]).map(m=>mvRow(m.id, withPath?mvPath(m):'')).join(''); }
function teamN(s, lid){
  const lg=s&&s.leagues&&s.leagues[lid];
  if (lg&&lg.teams) return lg.teams.length;
  return (L[lid]&&L[lid].size)||0;
}
function ruleLine(s, e, l){
  const moves=(e&&e.moves)||[];
  const prof=relegationProfile(s, l.id);
  const von=moves.filter(m=>m.type==='ab' && m.to===l.id).length;
  const hoch=moves.filter(m=>m.type==='auf' && m.from===l.id).length;
  const runter=moves.filter(m=>m.type==='ab' && m.from===l.id).length;
  const aus=moves.filter(m=>m.type==='auf' && m.to===l.id).length;
  const ausName=l.id==='BL'?'2. BL':l.id==='BL2'?'3. Liga':l.id==='L3'?'4. Liga':l.id==='L4'?'Regionalliga':l.level===5?'Oberliga':'Amateurliga';
  const parts=[];
  if (von) parts.push(von+' von oben');
  if (hoch) parts.push(hoch+' hoch');
  if (runter){
    let bit=runter+' runter';
    const fest=l.down||0;
    if (l.level>=5 && runter!==fest && fest>0) bit+=' ('+fest+' fest + '+(runter-fest)+' durch Abstieg von oben)';
    else if (l.level===6 && runter) bit+=' (durch Abstieg von oben)';
    parts.push(bit);
  }
  if (l.level===6){
    const n=((e.picks&&e.picks[l.id])||[]).length || ((e.need&&e.need[l.id])||0);
    if (n) parts.push(n+' aus Amateurliga');
  } else if (aus) parts.push(aus+' aus '+ausName);
  const dec=s.leagues&&s.leagues[l.id]&&s.leagues[l.id].decide;
  if (dec&&dec.length) parts.push('Entscheidung');
  return parts.join(' · ');
}
function leagueCard(s, e, l, kind){
  const moves=(e&&e.moves)||[];
  const auf=moves.filter(m=>m.type==='auf' && m.from===l.id);
  const ab=moves.filter(m=>m.type==='ab' && m.from===l.id);
  const withPath=kind==='top';
  let body='';
  body+=groupedSecs(mvGroup(auf, m=>m.to), 'auf', 'Auf', withPath, kind);
  body+=groupedSecs(mvGroup(ab, m=>m.to), 'ab', 'Ab', withPath, kind);
  const n=teamN(s, l.id);
  const rules=ruleLine(s, e, l);
  const label=kind==='top'?l.name:l.short;
  return '<article class="mv-card '+kind+'"><header class="mv-head"><b title="'+esc(l.name)+'">'+esc(label)+'</b><span>'+n+' '+(n===1?'Team':'Teams')+'</span></header>'+(rules?'<p class="mv-rules">'+esc(rules)+'</p>':'')+body+'</article>';
}
function amateurCard(s, e){
  const down=((e&&e.moves)||[]).filter(m=>m.type==='ab' && P[m.to]);
  let hoch=0;
  const cols=PY_PAIRS.map(p=>p.ols.map(ol=>{
    const picks=((e.picks&&e.picks[ol])||[]);
    hoch+=picks.length;
    const sec=picks.length?mvSec('auf','Auf → '+leagueShort(ol), picks.map(id=>mvRow(id,'')).join('')):'';
    return '<div class="mv-am-col">'+sec+'</div>';
  }).join('')).join('');
  let n=0; POOLS.forEach(p=>{ n+=((s.pools&&s.pools[p.id])||[]).length; });
  const rules=[hoch?hoch+' hoch':'', down.length?down.length+' von oben':''].filter(Boolean).join(' · ');
  return '<article class="mv-card am"><header class="mv-head"><b>Amateurliga</b><span>'+n+' '+(n===1?'Team':'Teams')+'</span></header>'+(rules?'<p class="mv-rules">'+esc(rules)+'</p>':'')+'<div class="mv-am-grid">'+cols+'</div></article>';
}
function pyDrops(){
  let h='<div class="py-drops">';
  for (let i=0;i<8;i++) h+='<span class="py-drop"></span>';
  return h+'</div>';
}
function pyStem(){ return '<div class="py-stem"></div>'; }
function pyFork(n, dir){
  let arms='';
  for (let i=0;i<n;i++) arms+='<span class="py-arm"></span>';
  return '<div class="py-fork '+dir+' n'+n+'">'+arms+'</div>';
}
function pyPairFork(){
  return '<div class="py-fork pairs down">'+PY_PAIRS.map(()=>'<div class="py-pair"><span class="py-arm"></span><span class="py-arm"></span></div>').join('')+'</div>';
}
function moveBoardHTML(e, s){
  e=e||{moves:[], picks:{}};
  s=s||cur();
  const one=id=>'<div class="py-level one">'+leagueCard(s, e, L[id], 'top')+'</div>';
  let h='<div class="py-scroll"><div class="py-tree">';
  h+=one('BL')+pyStem()+one('BL2')+pyStem()+one('L3')+pyStem()+one('L4')+pyStem();
  h+=pyFork(4, 'down');
  h+='<div class="py-level rl">'+PY_PAIRS.map(p=>leagueCard(s, e, L[p.rl], 'rl')).join('')+'</div>';
  h+=pyPairFork();
  h+='<div class="py-level ol">'+PY_PAIRS.map(p=>p.ols.map(id=>leagueCard(s, e, L[id], 'ol')).join('')).join('')+'</div>';
  h+=pyDrops();
  h+='<div class="py-level one">'+amateurCard(s, e)+'</div>';
  h+='</div></div>';
  return h;
}
function rulesHTML(){
  const s=cur();
  let h='<h3>Ligensystem &amp; Regeln</h3><p>Sieg 3 Punkte, Unentschieden 1 Punkt. Reihenfolge bei Gleichstand: Punkte → Tordifferenz → mehr Tore → direkter Vergleich (Punkte, Tordifferenz, Tore) → historische Stärke.</p><table class="tbl fit"><thead><tr>'+sortHead('Liga','','l')+sortHead('Teams','size')+sortHead('Auf','up')+sortHead('Ab geplant','plan')+sortHead('Ab jetzt','now')+sortHead('Aufstieg in','','l')+'</tr></thead><tbody>';
  LEAGUES.forEach(l=>{
    const p=relegationProfile(s, l.id);
    const mark=p.down!==l.down;
    h+='<tr><td class="l">'+esc(l.name)+'</td>'+sortCell(l.size, l.size)+sortCell(l.up||0, l.up||'–')+sortCell(l.down, l.down)+sortCell(p.down, p.down, mark?'pts':'')+'<td class="l">'+(l.upTo?esc(leagueName(l.upTo)):'–')+'</td></tr>';
  });
  h+='</tbody></table><p>Bundesliga bis 4. Liga haben feste Zahlen. Die vier Absteiger der 4. Liga gehen nur in die Regionalliga ihres Bundeslandes (Nord: Bremen, Niedersachsen, Hamburg, Schleswig-Holstein, Mecklenburg-Vorpommern; Ost: Berlin, Brandenburg, Sachsen-Anhalt, Sachsen, Thüringen; Süd: Bayern, Baden-Württemberg; West: Nordrhein-Westfalen, Hessen, Rheinland-Pfalz, Saarland). Jede Regionalliga gibt einen Meister an die 4. Liga ab und hat zwei feste Absteiger. Aus jeder der beiden Oberligen rücken zwei Vereine nach. Kommen k Absteiger aus der 4. Liga dazu, steigen zusätzlich k+1 Vereine ab, damit die Staffel bei 18 bleibt. In der Oberliga steigen die Plätze 1 und 2 fest auf. k Absteiger aus der eigenen Regionalliga bedeuten k Absteiger, und zwei Amateurvereine rücken nach. Niemand wird in eine fremde Region verschoben. „Ab jetzt“ folgt dem aktuellen Tabellenstand.</p>';
  const changed=LEAGUES.filter(l=>l.level>=5 && relegationProfile(s, l.id).down!==l.down);
  if (changed.length){
    h+='<p><b>In der Saison '+esc(s.name)+' weicht die Abstiegszahl ab:</b></p><ul>';
    changed.forEach(l=>{ const p=relegationProfile(s, l.id); h+='<li><b>'+esc(l.name)+': '+p.down+' statt '+l.down+'.</b> '+esc(p.reason)+'</li>'; });
    h+='</ul>';
  } else h+='<p>In der Saison '+esc(s.name)+' hat nach dem aktuellen Stand jede Staffel die geplante Abstiegszahl.</p>';
  h+='<p>Die Amateurliga hat keinen Spielbetrieb und keine Staffeln in der Navigation. Zum Saisonende wählst du pro Oberliga zwei Aufsteiger aus der Amateurliga desselben Gebiets; Oberliga-Absteiger gehen in die Amateurliga ihres Bundeslandes.</p>';
  return h;
}
function ansehenRanks(endYear){
  const rows=Object.keys(TEAMS).map(id=>{
    const info=ansehenInfo(id, endYear);
    return {id, value:info.value};
  }).filter(r=>r.value!=null);
  rows.sort((a,b)=>b.value-a.value || TEAMS[a.id].name.localeCompare(TEAMS[b.id].name,'de'));
  const rank={};
  rows.forEach((r,i)=>rank[r.id]=i+1);
  return rank;
}
function rankDeltaHTML(now, prev){
  if (now==null || prev==null) return '<span class="muted">–</span>';
  const d=prev-now;
  if (d>0) return '<span class="up-d">▲'+d+'</span>';
  if (d<0) return '<span class="dn-d">▼'+(-d)+'</span>';
  return '<span class="muted">–</span>';
}
function viewAnsehen(){
  const season=cur();
  const liga=S.ui.ansehenLiga||'';
  const bl=S.ui.ansehenBl||'';
  const end=windowEndYear();
  const nowRank=ansehenRanks(end);
  const prevRank=ansehenRanks(end-1);
  const list=Object.keys(TEAMS).map(id=>{
    const info=ansehenInfo(id);
    return {id, info, lid:clubLeagueId(season, id), bl:TEAMS[id].bl};
  }).filter(r=>(!liga || r.lid===liga) && (!bl || r.bl===bl));
  list.sort((a,b)=>(b.info.value==null?-1:b.info.value)-(a.info.value==null?-1:a.info.value) || TEAMS[a.id].name.localeCompare(TEAMS[b.id].name,'de'));
  const opts='<option value="">Alle Ligen</option>'+LEAGUES.map(l=>'<option value="'+l.id+'"'+(liga===l.id?' selected':'')+'>'+esc(l.name)+'</option>').join('')+POOLS.map(p=>'<option value="'+p.id+'"'+(liga===p.id?' selected':'')+'>'+esc(p.name)+'</option>').join('');
  const blOpts='<option value="">Alle Bundesländer</option>'+BL_ORDER.map(b=>'<option value="'+esc(b)+'"'+(bl===b?' selected':'')+'>'+esc(b)+'</option>').join('');
  let h='<div class="box"><h3>Ansehen aller Vereine</h3><p>Liga und Pokal sind gewichtete Schnitte. Die Liga über 30 Saisons, die jüngsten 10 davon 1,5-fach. DFB-Pokal und Landespokal über 15 Saisons, die jüngsten 5 davon 1,5-fach. Eine Saison ohne Teilnahme zählt im Pokal als 0. Wer jede Saison dieselbe Runde erreicht, hat genau deren Punktwert. Die Liste gilt bis zur geöffneten Saison. Der Pfeil vergleicht den Rang mit dem Fenster bis zur Vorsaison.</p>'+ansehenLegendHTML()+'<div class="ansehen-tools"><input id="ansehenSearch" class="searchbox" placeholder="Verein suchen" autocomplete="off"><select id="ansehenLiga">'+opts+'</select><select id="ansehenBl">'+blOpts+'</select><span class="muted">'+list.length+' Vereine</span></div>';
  h+='<div style="overflow:auto"><table class="tbl" id="ansehenList"><thead><tr>'+sortHead('Rang','rang')+'<th></th>'+sortHead('Verein','','l')+sortHead('Gesamt','value')+sortHead('Liga','liga')+sortHead('DFB-Pokal','dfb')+sortHead('Landespokal','land')+sortHead('Aktuelle Liga','','l')+'</tr></thead><tbody>';
  list.forEach((r,i)=>{
    const name=TEAMS[r.id].name;
    const num=v=>v==null?'–':deNum(v,2);
    h+='<tr data-ansehen="'+r.id+'" data-name="'+esc(name.toLowerCase())+'" style="cursor:pointer">'+sortCell(nowRank[r.id], nowRank[r.id]||'–')+'<td>'+rankDeltaHTML(nowRank[r.id], prevRank[r.id])+'</td><td class="l">'+clubHTML(r.id,{nobl:true})+'</td>'+sortCell(r.info.value, num(r.info.value), 'pts')+sortCell(r.info.liga, num(r.info.liga))+sortCell(r.info.dfb.value, num(r.info.dfb.value))+sortCell(r.info.land.value, num(r.info.land.value))+'<td class="l">'+esc(leagueLabel(r.lid))+'</td></tr>';
  });
  h+='</tbody></table></div></div>';
  return h;
}
function leagueLabel(lid){
  if (L[lid]) return L[lid].name+' ('+L[lid].level+')';
  if (P[lid]) return P[lid].name+' (7)';
  return lid ? leagueName(lid) : '–';
}
function ansehenLegendHTML(){
  const cell=(a,b)=>'<tr><td class="l">'+a+'</td><td>'+b+'</td></tr>';
  return '<div class="ansehen-legend"><div class="ansehen-card"><h3>Landespokal</h3><p>Die erste Runde gibt 3 Punkte. Jede weitere Runde gibt 2 Punkte mehr, gezählt ab der ersten Runde dieses Landespokals, nicht vom Finale her. Der Sieger erhält 2 Punkte mehr als der Finalist. Ein Pokal mit mehr Runden bringt dem Sieger mehr Punkte. Der Titel im größten Landespokal bleibt unter der 1. DFB-Runde (26).</p></div><div class="ansehen-card"><h3>DFB-Pokal</h3><table class="tbl"><thead><tr><th class="l">Runde</th><th>Pkt.</th></tr></thead><tbody>'
    +cell('1. Runde','26')+cell('2. Runde','32')+cell('Achtelfinale','38')+cell('Viertelfinale','44')+cell('Halbfinale','50')+cell('Finale','56')+cell('Sieger','60')
    +'</tbody></table></div></div><p class="muted">Der Rundenwert zählt voll. Über 15 Saisons läuft ein gewichteter Schnitt, die jüngsten 5 mit 1,5. Jahre ohne Teilnahme zählen als 0. Wer immer die 1. DFB-Runde erreicht, hat +26. Gesamt = Liga + DFB-Pokal + Landespokal.</p>';
}
function weightClass(w){ return w>1?'w-hot':w>0?'w-on':'w-off'; }
function viewAnsehenDetail(id){
  const info=ansehenInfo(id, null, true), t=TEAMS[id];
  const end=info.end, from=end-29, hot=end-9;
  const part=(label, value, note)=>'<div'+(label==='Ansehen'?' class="tot"':'')+'><span>'+label+'</span><b>'+(value==null?'–':deNum(value,2))+'</b><i>'+note+'</i></div>';
  let h='<div class="box"><button class="btn small" data-act="ansehenBack">← Zurück zur Rangliste</button><div style="display:flex;gap:12px;align-items:center;margin-top:12px"><img src="'+esc(t.crest)+'" alt="" data-club="'+id+'" style="width:64px;height:64px;object-fit:contain"><div><h3 style="margin:0">'+esc(t.name)+'</h3><div class="muted">'+esc(t.bl)+' · Ansehen <b>'+(info.value==null?'ohne Wertung':deNum(info.value,2))+'</b></div></div></div>';
  h+='<div class="ansehen-break">'+part('Liga', info.liga, '30 Saisons, letzte 10 ×1,5')+part('DFB-Pokal', info.dfb.value, '15 Saisons, letzte 5 ×1,5')+part('Landespokal', info.land.value, '15 Saisons, letzte 5 ×1,5')+part('Ansehen', info.value, 'Liga + DFB-Pokal + Landespokal')+'</div>';
  h+='<p>Liga: Fenster '+from+'/'+String((from+1)%100).padStart(2,'0')+' bis '+end+'/'+String((end+1)%100).padStart(2,'0')+'. Grün markiert sind die letzten 10 Saisons (×1,5), normal gezählt die übrigen im Fenster. Graue Zeilen liegen außerhalb. Pokal: die letzten 15 Saisons, davon die letzten 5 grün. Der Schnitt teilt durch das ganze Fenster (17,5). Jahre ohne Teilnahme zählen als 0.</p>'+ansehenLegendHTML();
  h+='<h3 style="margin:8px 0">Liga</h3><table class="tbl fit"><thead><tr>'+sortHead('Saison','','l')+sortHead('Liga','','l')+sortHead('Platz','pl')+sortHead('Punkte','pts')+sortHead('Gewicht','w')+sortHead('Beitrag','beitrag')+'</tr></thead><tbody>';
  let seenSplit=false;
  info.rows.forEach(r=>{
    const rechner=r.src==='rechner' || seasonYear(r.season)>2025;
    if (rechner && !seenSplit){ seenSplit=true; h+='<tr data-pin="1"><td class="hist-split" colspan="6">Start Fußballrechner</td></tr>'; }
    const beitrag=r.w>0?r.w*r.pts:null;
    h+='<tr class="'+weightClass(r.w)+'"><td class="l">'+r.season+'</td><td class="l">'+esc(r.liga)+(r.ebene?' ('+r.ebene+')':'')+'</td>'+sortCell(r.pl, r.pl+'. / '+r.n)+sortCell(r.pts, deNum(r.pts,2))+sortCell(r.w||'', r.w?deNum(r.w,1):'–')+sortCell(beitrag, beitrag==null?'–':deNum(beitrag,2))+'</tr>';
  });
  if (!seenSplit) h+='<tr data-pin="1"><td class="hist-split" colspan="6">Start Fußballrechner</td></tr>';
  h+='<tr data-pin="1"><td class="l" colspan="4"><b>Liga</b></td><td><b>'+deNum(info.sw,1)+'</b></td><td><b>'+(info.liga==null?'–':deNum(info.liga,2))+'</b></td></tr>';
  h+='</tbody></table>';
  const pokalTable=(title, part)=>{
    let x='<h3 style="margin:16px 0 8px">'+title+'</h3><table class="tbl fit"><thead><tr>'+sortHead('Saison','','l')+sortHead('Runde','','l')+sortHead('Punkte','pts')+sortHead('Gewicht','w')+sortHead('Beitrag','beitrag')+'</tr></thead><tbody>';
    if (!part.rows.length) x+='<tr data-pin="1"><td class="l" colspan="5"><span class="muted">Keine Pokalteilnahme im Rechner.</span></td></tr>';
    part.rows.forEach(r=>{
      const beitrag=r.w>0?r.w*r.pts:null;
      x+='<tr class="'+weightClass(r.w)+'"><td class="l">'+esc(r.season)+(r.bl?' · '+esc(r.bl):'')+'</td><td class="l">'+esc(r.round)+(r.won?' · Sieger':'')+'</td>'+sortCell(r.pts, deNum(r.pts,1))+sortCell(r.w||'', r.w?deNum(r.w,1):'–')+sortCell(beitrag, beitrag==null?'–':deNum(beitrag,2))+'</tr>';
    });
    x+='<tr data-pin="1"><td class="l" colspan="3"><b>Schnitt (Jahre ohne Teilnahme = 0)</b></td><td><b>'+deNum(part.sw,1)+'</b></td><td><b>'+deNum(part.value,2)+'</b></td></tr></tbody></table>';
    return x;
  };
  h+=pokalTable('DFB-Pokal', info.dfb);
  h+=pokalTable('Landespokal', info.land);
  h+='<p>Ansehen = '+(info.liga==null?'0':deNum(info.liga,2))+' + '+deNum(info.dfb.value,2)+' + '+deNum(info.land.value,2)+' = <b>'+(info.value==null?'–':deNum(info.value,2))+'</b>. Das Fenster der Liga endet '+end+', die ×1,5-Staffel beginnt '+hot+'.</p>';
  h+='</div>';
  return h;
}
// ---------- Vereinsinfo ----------
function foldName(s){
  return String(s||'').toLowerCase().replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ß/g,'ss').replace(/ae/g,'a').replace(/oe/g,'o').replace(/ue/g,'u');
}
function clubSearch(q, except){
  const f=foldName(String(q||'').trim());
  if (!f) return [];
  const scored=[];
  for (const id in TEAMS){
    if (id===except) continue;
    const name=foldName(TEAMS[id].name);
    let score=0;
    if (name.startsWith(f)) score=4;
    else if (name.split(/[^a-z0-9]+/).some(w=>w.startsWith(f))) score=3;
    else if (name.includes(f)) score=2;
    else if (f.length>=3){
      let i=0;
      for (let k=0;k<name.length && i<f.length;k++) if (name[k]===f[i]) i++;
      if (i===f.length) score=1;
    }
    if (score) scored.push({id, score});
  }
  scored.sort((a,b)=>b.score-a.score || TEAMS[a.id].name.localeCompare(TEAMS[b.id].name,'de'));
  return scored.slice(0,12).map(x=>x.id);
}
function clubNowLeague(id){
  const s=latest();
  const lid=s?clubLeagueId(s, id):'';
  if (L[lid]) return L[lid].short;
  if (P[lid]) return 'Amateur';
  return '';
}
function suggestHTML(ids, act, hi){
  if (!ids.length) return '<p class="muted suggest-empty">Kein Verein gefunden.</p>';
  return ids.map((id,i)=>{
    const t=TEAMS[id];
    return '<button type="button" class="suggest-item'+(i===hi?' on':'')+'" data-act="'+act+'" data-id="'+id+'"><img src="'+esc(t.crest)+'" alt=""><span class="nm">'+esc(t.name)+'</span><span class="lg">'+esc(clubNowLeague(id))+'</span></button>';
  }).join('');
}
function wireSuggest(inputId, listId, act, except){
  const input=document.getElementById(inputId);
  const list=document.getElementById(listId);
  if (!input || !list) return;
  let hi=0;
  const paint=()=>{
    const ids=clubSearch(input.value, except);
    if (!String(input.value||'').trim()){ list.innerHTML=''; list.hidden=true; return; }
    list.hidden=false;
    hi=Math.max(0, Math.min(hi, Math.max(0, ids.length-1)));
    list.innerHTML=suggestHTML(ids, act, hi);
  };
  input.addEventListener('input', ()=>{ hi=0; paint(); });
  input.addEventListener('keydown', ev=>{
    const buttons=[...list.querySelectorAll('button')];
    if (ev.key==='ArrowDown'){ ev.preventDefault(); hi=Math.min(buttons.length-1, hi+1); paint(); }
    else if (ev.key==='ArrowUp'){ ev.preventDefault(); hi=Math.max(0, hi-1); paint(); }
    else if (ev.key==='Enter'){ ev.preventDefault(); const b=buttons[hi]; if (b) b.click(); }
    else if (ev.key==='Escape'){ list.hidden=true; }
  });
  input.addEventListener('focus', paint);
}
function iconSchale(){
  return '<svg class="trophy" viewBox="0 0 64 48" aria-hidden="true"><ellipse cx="32" cy="18" rx="26" ry="9" fill="#e7ebf0" stroke="#6d7580" stroke-width="2"/><ellipse cx="32" cy="18" rx="16" ry="5" fill="none" stroke="#9aa3ad"/><path d="M8 18c2 3 6 5 10 5M56 18c-2 3-6 5-10 5" fill="none" stroke="#6d7580" stroke-width="2"/><rect x="29" y="27" width="6" height="8" fill="#6d7580"/><rect x="20" y="35" width="24" height="5" rx="1" fill="#4d555e"/></svg>';
}
function iconCup(fill, stroke){
  return '<svg class="trophy" viewBox="0 0 64 64" aria-hidden="true"><path d="M18 10h28v8c0 10-6 18-14 20-8-2-14-10-14-20z" fill="'+fill+'" stroke="'+stroke+'"/><path d="M18 14h-8c0 8 4 12 8 14M46 14h8c0 8-4 12-8 14" fill="none" stroke="'+stroke+'" stroke-width="2"/><rect x="28" y="38" width="8" height="8" fill="'+stroke+'"/><rect x="20" y="46" width="24" height="5" rx="1" fill="'+stroke+'"/></svg>';
}
function iconLaurel(){
  return '<svg class="trophy" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 8c-6 8-10 16-10 26 6-2 10-8 10-16 0 8 4 14 10 16 0-10-4-18-10-26z" fill="#1d6b45"/><path d="M16 30c6 2 8 8 8 14-6-1-10-6-10-12 0-1 .1-1.5.2-2zM48 30c-6 2-8 8-8 14 6-1 10-6 10-12 0-1-.1-1.5-.2-2z" fill="#1d6b45"/><circle cx="32" cy="40" r="6" fill="none" stroke="#1d6b45" stroke-width="2"/></svg>';
}
function trophyFor(key){
  if (key==='Bundesliga') return iconSchale();
  if (key==='DFB-Pokal') return iconCup('#e6c15a','#8a6a12');
  if (key.indexOf('Landespokal')===0) return iconCup('#7dcea0','#1d6b45');
  if (key==='Supercup') return iconCup('#d5d8dc','#5d6b76');
  return iconLaurel();
}
function pyramidOf(season){
  const list=[];
  LEAGUES.forEach(l=>{
    const lg=season.leagues&&season.leagues[l.id];
    if (!lg) return;
    let rows=lg.tables&&lg.tables.all;
    if (!rows && season.endData&&season.endData.tables&&season.endData.tables[l.id]) rows=season.endData.tables[l.id];
    if (!rows && lg.md){ try{ rows=leagueTable(season, l.id); }catch(e){ rows=null; } }
    if (!rows) return;
    rows.slice().sort((a,b)=>(a.pl||999)-(b.pl||999)).forEach(r=>list.push({id:r.id, liga:l.name, level:l.level, pl:r.pl}));
  });
  const am=[];
  POOLS.forEach(p=>((season.pools&&season.pools[p.id])||[]).forEach(id=>am.push(id)));
  am.sort(byRang);
  am.forEach((id,i)=>list.push({id, liga:'Amateurliga', level:7, pl:i+1}));
  const map={};
  list.forEach((r,i)=>map[r.id]=Object.assign({rank:i+1, n:list.length}, r));
  return map;
}
function cupRunLine(run, empty){
  if (!run) return '<span class="muted">'+esc(empty||'nicht teilgenommen')+'</span>';
  const label=run.won?'Sieger':(run.round||'');
  const opp=run.opp && TEAMS[run.opp];
  if (run.hg==null || run.ag==null || !opp) return esc(label);
  const mine=run.home?run.hg:run.ag, theirs=run.home?run.ag:run.hg;
  const myPen=run.home?run.peh:run.pea, opPen=run.home?run.pea:run.peh;
  let sc=mine+':'+theirs;
  if (run.et && mine!==theirs) sc+=' n.V.';
  if (myPen!=null && opPen!=null && myPen!==opPen) sc+=', '+myPen+':'+opPen+' i.E.';
  const verb=run.won?'':'Aus ';
  return '<span class="cup-round">'+esc(label)+'</span><span class="cup-detail">'+verb+esc(sc)+' gegen <img class="mini-crest" src="'+esc(opp.crest)+'" alt="" title="'+esc(opp.name)+'">'+esc(opp.name)+'</span>';
}
function resultTone(clubIsHome, hg, ag, peh, pea){
  if (hg==null || ag==null) return 'open';
  const mine=clubIsHome?hg:ag, theirs=clubIsHome?ag:hg;
  if (mine!==theirs) return mine>theirs?'win':'loss';
  if (peh!=null && pea!=null && +peh!==+pea){
    const myPen=clubIsHome?+peh:+pea, opPen=clubIsHome?+pea:+peh;
    return myPen>opPen?'win':'loss';
  }
  return 'draw';
}
function shortComp(comp){
  if (L[comp]) return L[comp].short;
  if (comp==='dfb') return 'DFB-Pokal';
  if (comp==='land') return 'Landespokal';
  if (comp==='sc') return 'Supercup';
  if (comp==='liga') return 'Liga';
  return compLabel(comp);
}
function pairRow(comp, h, a, hg, ag, et, peh, pea, tone){
  const open=hg==null || ag==null;
  return '<div class="pair"><span class="pair-comp">'+esc(comp)+'</span>'+matchLineHTML({h, a, hg, ag, et, peh, pea, tone:open?'open':tone, open, nodel:true, klass:'pair-match'})+'</div>';
}
function roundTitle(season, kind, idx, clubId){
  if (kind==='D') return (DFB_ROUNDS[idx]&&DFB_ROUNDS[idx].name)||('Runde '+(idx+1));
  if (kind==='E') return (idx===2?'Rückspiel':'Hinspiel')+' Entscheidung';
  if (kind==='A'){
    const bl=TEAMS[clubId]&&TEAMS[clubId].bl;
    const cup=season&&season.cups&&season.cups.land&&bl&&season.cups.land[bl];
    const names=(cup&&cup.roundNames&&cup.roundNames.length)?cup.roundNames:(cup&&cup.rounds||[]).map(r=>r.name);
    return names[idx]||('Runde '+(idx+1));
  }
  return 'Supercup';
}
function parseClubFx(raw, id){
  if (!raw) return [];
  const out=[];
  String(raw).split(';').forEach(rec=>{
    if (!rec) return;
    if (rec.charAt(0)==='B'){
      const p=rec.split(',');
      const who=idNum(+p[3]||0);
      if (who!==id) return;
      out.push({kind:p[1]||'D', md:+p[2]||0, bye:true});
      return;
    }
    const o=decShared(rec);
    if (!o.homeId||!o.awayId||!TEAMS[o.homeId]||!TEAMS[o.awayId]) return;
    if (o.homeId!==id && o.awayId!==id) return;
    const home=o.homeId===id;
    out.push({kind:o.kind, md:o.md, home, opp:home?o.awayId:o.homeId, hg:o.hg, ag:o.ag, et:o.et, peh:o.peh, pea:o.pea, dow:o.dow||'', time:o.time||'', top:!!o.top});
  });
  return out;
}
function liveClubFx(season, id){
  const out=[];
  LEAGUES.forEach(l=>{
    const lg=season.leagues&&season.leagues[l.id];
    if (!lg||!lg.md) return;
    const i=lg.teams.indexOf(id);
    if (i<0) return;
    const kicks=season.kickoffs&&season.kickoffs[l.id];
    lg.md.forEach((md,mi)=>md.forEach((m,ki)=>{
      if (m[0]!==i && m[1]!==i) return;
      const home=m[0]===i;
      const slot=kicks&&kicks[mi]&&kicks[mi][ki];
      out.push({kind:'L', md:mi+1, home, opp:lg.teams[home?m[1]:m[0]], hg:m[2], ag:m[3], et:false, peh:null, pea:null, dow:slot&&slot.dow||'', time:slot&&slot.time||'', top:!!(slot&&(slot.kind==='top'||slot.kracher))});
    }));
    (lg.decide||[]).forEach(m=>{
      if (m.h!==id && m.a!==id) return;
      const home=m.h===id;
      out.push({kind:'E', md:m.leg||1, home, opp:home?m.a:m.h, hg:m.hg, ag:m.ag, et:!!m.et, peh:m.peh, pea:m.pea, dow:m.slot&&m.slot.dow||'', time:m.slot&&m.slot.time||'', top:!!(m.slot&&(m.slot.kind==='top'||m.slot.kracher))});
    });
  });
  const addCup=(cup, kind)=>{
    if (!cup) return;
    (cup.rounds||[]).forEach((round,ri)=>{
      (round.byes||[]).forEach(bid=>{ if (bid===id) out.push({kind, md:ri, bye:true, round:round.name}); });
      (round.matches||[]).forEach(m=>{
        if (m.h!==id && m.a!==id) return;
        const home=m.h===id;
        out.push({kind, md:ri, round:round.name, home, opp:home?m.a:m.h, hg:m.hg, ag:m.ag, et:!!m.et, peh:m.peh, pea:m.pea, dow:m.slot&&m.slot.dow||'', time:m.slot&&m.slot.time||'', top:!!(m.slot&&m.slot.kind==='top')});
      });
    });
  };
  if (season.cups){
    addCup(season.cups.dfb,'D');
    const bl=TEAMS[id]&&TEAMS[id].bl;
    if (bl && season.cups.land && season.cups.land[bl]) addCup(season.cups.land[bl],'A');
  }
  const sc=season.supercup;
  if (sc && (sc.h===id||sc.a===id)){
    const home=sc.h===id;
    out.push({kind:'S', md:0, home, opp:home?sc.a:sc.h, hg:sc.hg, ag:sc.ag, et:!!sc.et, peh:sc.peh, pea:sc.pea});
  }
  return out;
}
function clubFixtureItems(season, id){
  if (!season) return null;
  if (typeof season.fx==='string' && season.fx) return parseClubFx(season.fx, id);
  const live=liveClubFx(season, id);
  return live.length?live:null;
}
const DOW_LONG={Fr:'Freitag',Sa:'Samstag',So:'Sonntag',Mi:'Mittwoch',Do:'Donnerstag'};
function terminText(dow, time){
  if (!dow || !time) return '–';
  return (DOW_LONG[dow]||dow)+' · '+time;
}
function spieleText(list){
  const n=list.filter(it=>!it.bye).length;
  if (!n && list.some(it=>it.bye)) return 'Freilos';
  return n+' '+(n===1?'Spiel':'Spiele');
}
function fxMatchRow(id, it, roundLabel){
  if (it.bye) return '<tr class="fx-bye"><td class="fx-md"><b>'+esc(roundLabel)+'</b></td><td class="fx-when">–</td><td class="fx-spiel">Freilos</td></tr>';
  const homeId=it.home?id:it.opp, awayId=it.home?it.opp:id;
  const open=it.hg==null || it.ag==null;
  const tone=open?'open':resultTone(!!it.home, it.hg, it.ag, it.peh, it.pea);
  const line=matchLineHTML({h:homeId, a:awayId, hg:it.hg, ag:it.ag, et:!!it.et, peh:it.peh, pea:it.pea, tone, open, nodel:true, box:true, klass:'fx-line'});
  const badge=it.top?'<span class="fx-badge">Topspiel</span>':'';
  return '<tr class="'+(it.top?'fx-top':'')+'"><td class="fx-md"><b>'+esc(roundLabel)+'</b>'+badge+'</td><td class="fx-when">'+esc(terminText(it.dow, it.time))+'</td><td class="fx-spiel">'+line+'</td></tr>';
}
function renderTerminplan(id){
  const seasons=S.seasons||[];
  let idx=S.ui.infoFx!=null?+S.ui.infoFx:S.view;
  if (!(idx>=0 && idx<seasons.length)) idx=seasons.length-1;
  S.ui.infoFx=idx;
  const season=seasons[idx];
  let h='<div class="fx-bar"><label>Saison <select id="infoFxSeason">'+seasons.map((s,i)=>'<option value="'+i+'"'+(i===idx?' selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select></label></div>';
  const stored=typeof season.fx==='string' && !!season.fx;
  const items=clubFixtureItems(season, id);
  if (!items || !items.length) return h+'<p class="muted">'+(stored?'Keine Spiele in dieser Saison.':'Der Spielplan dieser Saison ist nicht mehr gespeichert.')+'</p>';
  const league=items.filter(it=>it.kind==='L').sort((a,b)=>a.md-b.md);
  const decide=items.filter(it=>it.kind==='E').sort((a,b)=>a.md-b.md);
  const dfb=items.filter(it=>it.kind==='D').sort((a,b)=>a.md-b.md);
  const land=items.filter(it=>it.kind==='A').sort((a,b)=>a.md-b.md);
  const sc=items.filter(it=>it.kind==='S');
  const lid=clubLeagueId(season, id);
  const leagueName=L[lid]?L[lid].name:(lid?'Amateurliga':'Liga');
  const landName='Landespokal '+((TEAMS[id]&&TEAMS[id].bl)||'');
  const block=(title, list, label)=>{
    if (!list.length) return '';
    const body=list.map(it=>fxMatchRow(id, it, label(it))).join('');
    return '<section class="fx-block"><header class="fx-head"><div><b>'+esc(title)+'</b><small>Saison '+esc(season.name)+'</small></div><span class="fx-count">'+spieleText(list)+'</span></header><table class="fx-grid"><thead><tr><th>Spieltag / Runde</th><th>Termin</th><th>Spiel</th></tr></thead><tbody>'+body+'</tbody></table></section>';
  };
  if (!league.length && !decide.length && !stored) h+='<p class="muted">Die Ligaspiele dieser Saison sind nicht mehr gespeichert.</p>';
  h+=block(leagueName, league, it=>it.md+'. Spieltag');
  h+=block('Entscheidung', decide, it=>roundTitle(season, 'E', it.md, id));
  h+=block('DFB-Pokal', dfb, it=>it.round||roundTitle(season, 'D', it.md, id));
  h+=block(landName, land, it=>it.round||roundTitle(season, 'A', it.md, id));
  if (sc.length) h+=block('Supercup', sc, ()=>'Supercup');
  return h;
}
function cupRunOf(id, seasonName, comp){
  const runs=(S.pokalRuns||[]).filter(r=>r.id===id && r.season===seasonName && r.comp===comp);
  if (!runs.length) return null;
  return runs.slice().sort((a,b)=>(b.pts||0)-(a.pts||0))[0];
}
function pyramidLabel(rank){
  let left=rank;
  for (let i=0;i<LEAGUES.length;i++){
    const l=LEAGUES[i];
    if (left<=l.size) return l.short+' '+left+'.';
    left-=l.size;
  }
  return 'Amateur';
}
function infoRankChart(pts){
  if (pts.length<2) return '<p class="muted">Zu wenige Saisons für eine Kurve.</p>';
  const w=740, h=280, padL=92, padR=12, padT=16, padB=28;
  let lo=Math.min.apply(null, pts.map(p=>p.rank));
  let hi=Math.max.apply(null, pts.map(p=>p.rank));
  const span=Math.max(1, hi-lo);
  const pad=Math.max(1, Math.round(span*0.25));
  lo=Math.max(1, lo-pad);
  hi=hi+pad;
  if (hi-lo<4) hi=lo+4;
  const X=i=>padL+(w-padL-padR)*i/(pts.length-1);
  const Y=rank=>padT+(h-padT-padB)*((rank-lo)/Math.max(1, hi-lo));
  const ticks=[];
  if (hi-lo<=8){ for (let r=lo;r<=hi;r++) ticks.push(r); }
  else { const step=Math.max(1, Math.round((hi-lo)/4)); for (let r=lo;r<hi;r+=step) ticks.push(r); if (ticks[ticks.length-1]!==hi) ticks.push(hi); }
  let grid='';
  ticks.forEach(rank=>{
    const y=Y(rank);
    grid+='<line x1="'+padL+'" x2="'+(w-padR)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" class="band"/><text x="6" y="'+(y+4).toFixed(1)+'">'+esc(pyramidLabel(rank))+'</text>';
  });
  const line=pts.map((p,i)=>X(i).toFixed(1)+','+Y(p.rank).toFixed(1)).join(' ');
  const dots=pts.map((p,i)=>'<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(p.rank).toFixed(1)+'" r="3.2"><title>'+esc(p.season+' · '+p.liga+' '+p.pl+'. · Pyramide '+p.rank)+'</title></circle>').join('');
  return '<svg class="place-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Pyramidenplatz">'+grid+'<polyline points="'+line+'"/>'+dots+'<text x="'+padL+'" y="'+(h-8)+'">'+esc(pts[0].season)+'</text><text x="'+(w-140)+'" y="'+(h-8)+'" text-anchor="end">'+esc(pts[pts.length-1].season)+'</text></svg><p class="muted">Die Achse zeigt nur den Bereich, den der Verein belegt hat, mit etwas Luft. Oben ist der bessere Platz, von '+esc(pyramidLabel(lo))+' bis '+esc(pyramidLabel(hi))+'</p>';
}
function emptyStat(){ return {sp:0,s:0,u:0,n:0,tg:0,gt:0,pkt:0}; }
function addInto(b, gf, ga, leaguePts, result){
  b.sp++; b.tg+=gf; b.gt+=ga;
  const res=result||(gf>ga?'s':gf<ga?'n':'u');
  if (res==='s'){ b.s++; if (leaguePts) b.pkt+=3; }
  else if (res==='n') b.n++;
  else { b.u++; if (leaguePts) b.pkt+=1; }
}
function eachOpenMatch(id, fn){
  const s=latest();
  if (!s || s.absorbed || !id) return;
  LEAGUES.forEach(l=>{
    const lg=s.leagues&&s.leagues[l.id];
    if (!lg||!lg.md) return;
    const i=lg.teams.indexOf(id);
    if (i<0) return;
    lg.md.forEach(md=>md.forEach(m=>{
      if (m[2]==null||m[3]==null||(m[0]!==i&&m[1]!==i)) return;
      const home=m[0]===i;
      fn(l.id, lg.teams[home?m[1]:m[0]], home?m[2]:m[3], home?m[3]:m[2], true);
    }));
    (lg.decide||[]).forEach(m=>{
      if (m.hg==null||(m.h!==id&&m.a!==id)) return;
      const home=m.h===id;
      fn(l.id, home?m.a:m.h, home?m.hg:m.ag, home?m.ag:m.hg, true);
    });
  });
  const take=(cup, comp)=>{
    if (!cup) return;
    (cup.rounds||[]).forEach(round=>(round.matches||[]).forEach(m=>{
      if (m.hg==null||(m.h!==id&&m.a!==id)) return;
      const w=cupWinner(m);
      if (!w) return;
      const home=m.h===id;
      fn(comp, home?m.a:m.h, home?m.hg:m.ag, home?m.ag:m.hg, false, w===id?'s':'n');
    }));
  };
  if (s.cups){ take(s.cups.dfb,'dfb'); if (s.cups.land) Object.keys(s.cups.land).forEach(bl=>take(s.cups.land[bl],'land')); }
  const sc=s.supercup;
  if (sc&&sc.hg!=null&&(sc.h===id||sc.a===id)){
    const w=cupWinner(sc);
    if (w){
      const home=sc.h===id;
      fn('sc', home?sc.a:sc.h, home?sc.hg:sc.ag, home?sc.ag:sc.hg, false, w===id?'s':'n');
    }
  }
}
function statOf(id, comp){
  const row=S.stats&&S.stats.c&&S.stats.c[id];
  const b=Object.assign(emptyStat(), (row&&row[comp])||{});
  eachOpenMatch(id, (c, opp, gf, ga, pts, result)=>{ if (c===comp) addInto(b, gf, ga, pts, result); });
  return b;
}
function sumStat(id, comps){
  const t=emptyStat();
  comps.forEach(c=>{ const b=statOf(id, c); ['sp','s','u','n','tg','gt','pkt'].forEach(k=>t[k]+=b[k]||0); });
  return t;
}
function pairSide(id, opp, raw){
  if (!raw) return null;
  const low=id<opp;
  const s=low?raw.sL:(raw.sp-raw.sL-raw.u);
  return {sp:raw.sp, s, u:raw.u, n:raw.sp-s-raw.u, gf:low?raw.gfL:raw.gfH, ga:low?raw.gfH:raw.gfL};
}
function pairSum(id, opp, comps){
  const key=id<opp?id+'|'+opp:opp+'|'+id;
  const bag=S.stats&&S.stats.p&&S.stats.p[key];
  const t={sp:0,s:0,u:0,n:0,gf:0,ga:0};
  const want={};
  comps.forEach(c=>want[c]=1);
  if (bag) comps.forEach(c=>{
    const side=pairSide(id, opp, bag[c]);
    if (!side) return;
    t.sp+=side.sp; t.s+=side.s; t.u+=side.u; t.n+=side.n; t.gf+=side.gf; t.ga+=side.ga;
  });
  eachOpenMatch(id, (c, other, gf, ga, pts, result)=>{
    if (other!==opp || !want[c]) return;
    t.sp++; t.gf+=gf; t.ga+=ga;
    const res=result||(gf>ga?'s':gf<ga?'n':'u');
    if (res==='s') t.s++; else if (res==='n') t.n++; else t.u++;
  });
  return t;
}
function allStatComps(){
  return LEAGUES.map(l=>l.id).concat(['liga','dfb','land','sc']);
}
function allOpponents(id){
  const comps=allStatComps();
  const P=S.stats&&S.stats.p||{};
  const map={};
  for (const key in P){
    const parts=key.split('|');
    if (parts[0]!==id && parts[1]!==id) continue;
    const opp=parts[0]===id?parts[1]:parts[0];
    if (!map[opp]) map[opp]=pairSum(id, opp, comps);
  }
  eachOpenMatch(id, (c, opp)=>{
    if (!map[opp]) map[opp]=pairSum(id, opp, comps);
  });
  const out=Object.keys(map).map(opp=>Object.assign({id:opp}, map[opp])).filter(o=>o.sp);
  out.forEach(o=>{ o.rate=(o.s*3+o.u)/o.sp; o.diff=o.gf-o.ga; });
  return out;
}
function opponentsOf(id){
  const out=allOpponents(id);
  out.sort((a,b)=>b.sp-a.sp || TEAMS[a.id].name.localeCompare(TEAMS[b.id].name,'de'));
  if (!out.length) return out;
  const cut=out[Math.min(9, out.length-1)].sp;
  return out.filter((o,i)=>i<10 || o.sp===cut);
}
function balanceLists(id){
  const all=allOpponents(id).filter(o=>o.sp>=4);
  const byRate=(a,b)=>b.rate-a.rate || b.diff-a.diff || b.sp-a.sp || TEAMS[a.id].name.localeCompare(TEAMS[b.id].name,'de');
  const best=all.slice().sort(byRate).slice(0,5);
  const skip=new Set(best.map(o=>o.id));
  const worst=all.filter(o=>!skip.has(o.id)).slice().sort((a,b)=>-byRate(a,b)).slice(0,5);
  return {best, worst};
}
function compLabel(comp){
  if (L[comp]) return L[comp].name;
  if (comp==='dfb') return 'DFB-Pokal';
  if (comp==='land') return 'Landespokal';
  if (comp==='sc') return 'Supercup';
  if (comp==='liga') return 'Liga';
  return String(comp||'');
}
function loggedMatch(season, rec){
  return {season:season.name, comp:rec[0], h:rec[1], a:rec[2], hg:rec[3], ag:rec[4], et:!!rec[5], peh:rec[6]===''||rec[6]==null?null:rec[6], pea:rec[7]===''||rec[7]==null?null:rec[7]};
}
function h2hWindows(){
  const all=(S.seasons||[]).filter(s=>s && (s.status==='done' || s.status==='running'));
  const wins=[];
  for (let end=all.length; end>0; end-=10){
    const slice=all.slice(Math.max(0, end-10), end);
    const y1=String(slice[0].name||'').slice(0,4);
    const y2=String(parseInt(String(slice[slice.length-1].name||'').slice(0,4),10)||'');
    wins.push({label:y1+'–'+y2, names:slice.map(s=>s.name)});
  }
  return wins;
}
function readH2HBlock(raw, want, a, b, push){
  String(raw||'').split('\n').forEach(line=>{
    const bar=line.indexOf('|');
    if (bar<1) return;
    const name=line.slice(0, bar);
    if (want && !want.has(name)) return;
    const body=line.slice(bar+1);
    if (!body) return;
    body.split(';').forEach(rec=>{
      const m=decH2H(rec, name);
      if ((m.h===a&&m.a===b)||(m.h===b&&m.a===a)) push(m);
    });
  });
}
function h2hMatches(a, b, names){
  const out=[], seen=new Set();
  const want=names?new Set(names):null;
  const push=m=>{
    if (!m || !TEAMS[m.h] || !TEAMS[m.a]) return;
    if (want && !want.has(m.season)) return;
    const k=m.season+'|'+m.comp+'|'+m.h+'|'+m.a+'|'+m.hg+'|'+m.ag;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(m);
  };
  const packed=h2hBlockIndex().map;
  (S.seasons||[]).forEach(season=>{
    if (want && !want.has(season.name)) return;
    (season.h2h||[]).forEach(rec=>{
      const m=loggedMatch(season, rec);
      if ((m.h===a&&m.a===b)||(m.h===b&&m.a===a)) push(m);
    });
    if (season.h2h || packed[season.name]!=null) return;
    LEAGUES.forEach(l=>{
      const lg=season.leagues&&season.leagues[l.id];
      if (!lg||!lg.md) return;
      const ia=lg.teams.indexOf(a), ib=lg.teams.indexOf(b);
      if (ia<0||ib<0) return;
      lg.md.forEach(md=>md.forEach(m=>{
        if (m[2]==null||m[3]==null) return;
        if (!((m[0]===ia&&m[1]===ib)||(m[0]===ib&&m[1]===ia))) return;
        push({season:season.name, comp:l.id, h:lg.teams[m[0]], a:lg.teams[m[1]], hg:m[2], ag:m[3], et:false, peh:null, pea:null});
      }));
    });
    const pushCup=(cup, comp)=>{
      if (!cup) return;
      (cup.rounds||[]).forEach(round=>(round.matches||[]).forEach(m=>{
        if (m.hg==null||m.ag==null) return;
        if (!((m.h===a&&m.a===b)||(m.h===b&&m.a===a))) return;
        push({season:season.name, comp, h:m.h, a:m.a, hg:m.hg, ag:m.ag, et:!!m.et, peh:m.peh, pea:m.pea});
      }));
    };
    if (season.cups){
      pushCup(season.cups.dfb, 'dfb');
      if (season.cups.land) Object.keys(season.cups.land).forEach(bl=>pushCup(season.cups.land[bl], 'land'));
    }
    const sc=season.supercup;
    if (sc && sc.hg!=null && ((sc.h===a&&sc.a===b)||(sc.h===b&&sc.a===a))) push({season:season.name, comp:'sc', h:sc.h, a:sc.a, hg:sc.hg, ag:sc.ag, et:!!sc.et, peh:sc.peh, pea:sc.pea});
  });
  if (want){
    const seenBi=new Set();
    names.forEach(n=>{
      const bi=packed[n];
      if (bi==null || seenBi.has(bi)) return;
      seenBi.add(bi);
      readH2HBlock(S.h2hBlocks[bi], want, a, b, push);
    });
  }
  out.sort((x,y)=>x.season<y.season?1:x.season>y.season?-1:0);
  return out;
}
function clubLeagueIn(season, id){
  if (!season) return '';
  for (const lid in season.leagues||{}) if ((season.leagues[lid].teams||[]).indexOf(id)>=0) return L[lid]?L[lid].short:'';
  for (const pid in season.pools||{}) if ((season.pools[pid]||[]).indexOf(id)>=0) return 'Amateur';
  return '';
}
function seasonByName(name){
  return (S.seasons||[]).find(s=>s.name===name)||null;
}
function bilanzTable(id){
  const row=(label, b, pts, pin)=>'<tr'+(pin?' data-pin="1" class="tot"':'')+'><td class="l">'+label+'</td>'+sortCell(b.sp, b.sp)+sortCell(b.s, b.s)+sortCell(b.u, b.u)+sortCell(b.n, b.n)+sortCell(b.tg, b.tg+':'+b.gt)+sortCell(b.tg-b.gt, (b.tg-b.gt>0?'+':'')+(b.tg-b.gt))+sortCell(pts?b.pkt:'', pts?b.pkt:'–')+'</tr>';
  const leagues=LEAGUES.map(l=>({l, b:statOf(id, l.id)})).filter(x=>x.b.sp);
  const legacy=leagues.length?emptyStat():statOf(id,'liga');
  const dfb=statOf(id,'dfb'), land=statOf(id,'land'), sc=statOf(id,'sc');
  const keys=leagues.map(x=>x.l.id).concat(leagues.length?[]:['liga']).concat(['dfb','land','sc']);
  const all=sumStat(id, keys);
  let body=leagues.map(x=>row(esc(x.l.name), x.b, true)).join('');
  if (!leagues.length && legacy.sp) body+=row('Liga', legacy, true);
  body+=row('DFB-Pokal', dfb, false)+row('Landespokal', land, false)+row('Supercup', sc, false)+row('<b>Gesamt</b>', all, true, true);
  return '<table class="tbl fit bilanz"><thead><tr>'+sortHead('Wettbewerb','','l')+sortHead('Sp.','sp')+sortHead('S','s')+sortHead('U','u')+sortHead('N','n')+sortHead('Tore','tg')+sortHead('Diff.','diff')+sortHead('Pkt.','pkt')+'</tr></thead><tbody>'
    +body+'</tbody></table><p class="muted">Jede Liga, in der der Verein gespielt hat, hat eine eigene Zeile. Im Pokal gibt es kein Unentschieden: Verlängerung und Elfmeterschießen zählen als Sieg oder Niederlage. Elfmetertore zählen nicht. Punkte nur in den Ligen.</p>';
}
function renderInfo(){
  $('#tabs').innerHTML='';
  $('#subline').innerHTML='';
  $('#title').textContent='Vereinsinfo';
  const id=S.ui.infoId;
  let h='<div class="box"><h3>Verein wählen</h3><div class="suggest"><input id="infoQ" class="searchbox" placeholder="Vereinsname" autocomplete="off" value="'+esc(S.ui.infoQ||'')+'"><div id="infoHits" class="suggest-list" hidden></div></div></div>';
  if (!id || !TEAMS[id]){ $('#view').innerHTML=h; wireSuggest('infoQ', 'infoHits', 'infoPick', ''); return; }
  const t=TEAMS[id];
  const secs=[['historie','Historie'],['bilanz','Gesamtbilanz'],['gegner','Häufigste Gegner'],['vergleich','Direkter Vergleich'],['termin','Terminplan'],['erfolge','Erfolge']];
  let sec=S.ui.infoSec||'historie';
  if (!secs.some(x=>x[0]===sec)) sec='historie';
  S.ui.infoSec=sec;
  h+='<div class="box"><div class="verein-head"><img src="'+esc(t.crest)+'" alt=""><div><h2>'+esc(t.name)+'</h2><div class="muted">'+esc(t.bl)+'</div></div></div>';
  h+='<div class="toggle info-tabs">'+secs.map(([k,n])=>'<button type="button" data-act="infoSec" data-v="'+k+'" class="'+(sec===k?'active':'')+'">'+n+'</button>').join('')+'</div>';
  if (sec==='historie'){
    const hist=S.ui.infoHist||'liga';
    const landName='Landespokal '+(t.bl||'');
    const tabs=[['liga','Liga'],['dfb','DFB-Pokal'],['land',landName]];
    const curH=tabs.some(x=>x[0]===hist)?hist:'liga';
    S.ui.infoHist=curH;
    h+='<div class="toggle subtabs">'+tabs.map(([k,n])=>'<button type="button" data-act="infoHist" data-v="'+k+'" class="'+(curH===k?'active':'')+'">'+esc(n)+'</button>').join('')+'</div>';
    const seasons=(S.seasons||[]).slice().reverse();
    if (curH==='liga'){
      let rows='';
      seasons.forEach(season=>{
        const here=pyramidOf(season)[id];
        rows+='<tr><td class="l">'+esc(season.name)+'</td><td class="l">'+(here?esc(here.liga):'<span class="muted">–</span>')+'</td><td class="pl">'+(here?here.pl+'.':'<span class="muted">–</span>')+'</td></tr>';
      });
      h+='<table class="tbl compact info-hist info-liga"><thead><tr><th class="l">Saison</th><th class="l">Liga</th><th class="pl">Platz</th></tr></thead><tbody>'+rows+'</tbody></table>';
    } else {
      const comp=curH==='dfb'?'dfb':'land';
      const head=curH==='dfb'?'DFB-Pokal':landName;
      let rows='';
      seasons.forEach(season=>{
        rows+='<tr><td class="l">'+esc(season.name)+'</td><td class="l cup">'+cupRunLine(cupRunOf(id, season.name, comp), 'nicht qualifiziert')+'</td></tr>';
      });
      h+='<table class="tbl compact info-hist info-cup"><thead><tr><th class="l">Saison</th><th class="l">'+esc(head)+'</th></tr></thead><tbody>'+rows+'</tbody></table>';
    }
  } else if (sec==='bilanz'){
    h+=bilanzTable(id);
  } else if (sec==='gegner'){
    const opps=opponentsOf(id);
    const bal=balanceLists(id);
    const mini=list=>{
      if (!list.length) return '<p class="muted">Noch zu wenige Spiele.</p>';
      return '<table class="tbl fit"><thead><tr>'+sortHead('Gegner','','l')+sortHead('Sp.','sp')+sortHead('S','s')+sortHead('U','u')+sortHead('N','n')+sortHead('Tore','tg')+sortHead('Pkt/Sp','rate')+'</tr></thead><tbody>'
        +list.map(o=>'<tr><td class="l">'+clubHTML(o.id,{nobl:true})+'</td>'+sortCell(o.sp, o.sp)+sortCell(o.s, o.s)+sortCell(o.u, o.u)+sortCell(o.n, o.n)+sortCell(o.gf, o.gf+':'+o.ga)+sortCell(o.rate, deNum(o.rate,2))+'</tr>').join('')
        +'</tbody></table>';
    };
    if (!opps.length) h+='<p class="muted">Noch keine Gegner.</p>';
    else {
      h+='<h3>Häufigste Gegner</h3><table class="tbl fit"><thead><tr>'+sortHead('Gegner','','l')+sortHead('Sp.','sp')+sortHead('S','s')+sortHead('U','u')+sortHead('N','n')+sortHead('Tore','tg')+'</tr></thead><tbody>';
      opps.forEach(o=>{ h+='<tr><td class="l">'+clubHTML(o.id,{nobl:true})+'</td>'+sortCell(o.sp, o.sp)+sortCell(o.s, o.s)+sortCell(o.u, o.u)+sortCell(o.n, o.n)+sortCell(o.gf, o.gf+':'+o.ga)+'</tr>'; });
      h+='</tbody></table>';
    }
    h+='<div class="info-split"><div><h3>Positivste Bilanz</h3><p class="muted">Beste Punktzahl pro Spiel, mindestens vier Spiele.</p>'+mini(bal.best)+'</div><div><h3>Negativste Bilanz</h3><p class="muted">Wenigste Punkte pro Spiel, mindestens vier Spiele.</p>'+mini(bal.worst)+'</div></div>';
  } else if (sec==='termin'){
    h+=renderTerminplan(id);
  } else if (sec==='vergleich'){
    h+='<div class="suggest"><input id="infoOppQ" class="searchbox" placeholder="Zweiter Verein" autocomplete="off" value="'+esc(S.ui.infoOppQ||'')+'"><div id="infoOppHits" class="suggest-list" hidden></div></div>';
    const opp=S.ui.infoOpp;
    if (opp && TEAMS[opp] && opp!==id){
      const leagueKeys=LEAGUES.map(l=>l.id).concat(['liga']);
      const comps=[['Gesamt', allStatComps()],['Liga', leagueKeys],['DFB-Pokal',['dfb']],['Landespokal',['land']],['Supercup',['sc']]];
      h+='<div class="narrow">';
      h+='<p class="h2h-title"><b>'+esc(t.name)+'</b> gegen <b>'+esc(TEAMS[opp].name)+'</b></p>';
      h+='<table class="tbl fit"><thead><tr>'+sortHead('','')+sortHead('Sp.','sp')+sortHead('S','s')+sortHead('U','u')+sortHead('N','n')+sortHead('Tore','tg')+'</tr></thead><tbody>';
      comps.forEach(([label, keys])=>{
        const rec=pairSum(id, opp, keys);
        if (!rec.sp && label!=='Gesamt') return;
        h+='<tr'+(label==='Gesamt'?' data-pin="1"':'')+'><td class="l">'+label+'</td>'+sortCell(rec.sp, rec.sp)+sortCell(rec.s, rec.s)+sortCell(rec.u, rec.u)+sortCell(rec.n, rec.n)+sortCell(rec.gf, rec.gf+':'+rec.ga)+'</tr>';
      });
      h+='</tbody></table>';
      const wins=h2hWindows();
      let wi=S.ui.infoH2H|0;
      if (!(wi>=0 && wi<wins.length)) wi=0;
      S.ui.infoH2H=wi;
      if (wins.length>1) h+='<div class="h2h-nav">'+wins.map((w,i)=>'<button type="button" data-act="infoH2H" data-v="'+i+'" class="'+(i===wi?'active':'')+'">'+esc(w.label)+'</button>').join('')+'</div>';
      const win=wins[wi];
      const matches=win?h2hMatches(id, opp, win.names):[];
      if (!win) h+='<p class="muted">Noch keine Saison.</p>';
      else if (!matches.length) h+='<p class="muted">In '+esc(win.label)+' ist kein Spiel gespeichert.</p>';
      else {
        const rank=c=>L[c]||c==='liga'?0:c==='dfb'?1:c==='land'?2:c==='sc'?3:9;
        const groups=[];
        matches.forEach(m=>{
          let g=groups[groups.length-1];
          if (!g || g.season!==m.season){ g={season:m.season, list:[]}; groups.push(g); }
          g.list.push(m);
        });
        h+='<div class="pair-wrap">';
        groups.forEach(g=>{
          g.list.sort((a,b)=>rank(a.comp)-rank(b.comp));
          h+='<div class="pair-season">Saison '+esc(g.season)+'</div>';
          g.list.forEach(m=>{ h+=pairRow(shortComp(m.comp), m.h, m.a, m.hg, m.ag, m.et, m.peh, m.pea); });
        });
        h+='</div>';
      }
      h+='</div>';
    }
  } else {
    const titles=[];
    (S.chronicle||[]).forEach(c=>{ if (c.id===id && c.pl===1) titles.push({k:c.liga, y:c.season, level:c.ebene||99}); });
    (S.pokalRuns||[]).forEach(r=>{ if (r.id===id && r.won) titles.push({k:(r.comp==='dfb'?'DFB-Pokal':'Landespokal'+(r.bl?' '+r.bl:'')), y:r.season, level:r.comp==='dfb'?0.2:0.4}); });
    (S.seasons||[]).forEach(s=>{ if (s.supercup && supercupWinner(s.supercup)===id) titles.push({k:'Supercup', y:s.name, level:0.6}); });
    if (!titles.length) h+='<p class="muted">Noch kein Titel im Rechner.</p>';
    else {
      const by={};
      titles.forEach(x=>{ const g=by[x.k]||(by[x.k]={y:[], level:x.level}); g.y.push(x.y); });
      const keys=Object.keys(by).sort((a,b)=>{
        const la=by[a].level, lb=by[b].level;
        const ga=la>=1?0:1, gb=lb>=1?0:1;
        if (ga!==gb) return ga-gb;
        return la-lb || a.localeCompare(b,'de');
      });
      h+='<div class="trophy-grid">';
      keys.forEach(k=>{
        const years=by[k].y.slice().sort();
        h+='<article class="trophy-card">'+trophyFor(k)+'<b>'+by[k].y.length+'×</b><div class="trophy-name">'+esc(k)+'</div><div class="trophy-years">'+esc(years.join(', '))+'</div></article>';
      });
      h+='</div>';
    }
  }
  h+='</div>';
  $('#view').innerHTML=h;
  wireSuggest('infoQ', 'infoHits', 'infoPick', '');
  if (sec==='vergleich') wireSuggest('infoOppQ', 'infoOppHits', 'infoOpp', id);
}
// ---------- Modul Supercup und Vereinsseite (Supercup abschaltbar über das Spielstand-Menü) ----------
function featOn(key){ return !S.ui || S.ui[key]!==false; }
function stadionName(id){
  const c=coordOf(id);
  return c && c.stadion ? c.stadion : '';
}
function renderSettings(){
  const host=document.querySelector('.side-tools'); if(!host) return;
  let box=document.querySelector('#featSettings');
  if(!box){ box=document.createElement('div'); box.id='featSettings'; box.className='feat-settings'; host.insertBefore(box, host.firstChild); }
  box.innerHTML='<label><input type="checkbox" id="optSupercup"'+(featOn('supercup')?' checked':'')+'> Supercup</label>';
}
function buildSupercup(prev){
  if (!featOn('supercup')) return null;
  const table=prev && prev.endData && prev.endData.tables && prev.endData.tables.BL;
  const fin=prev && prev.cups && cupFinalists(prev.cups.dfb);
  if (!table || !fin || !fin.winner) return null;
  const rows=table.slice().sort((a,b)=>a.pl-b.pl);
  const meister=rows.find(r=>r.pl===1)||rows[0];
  const second=rows.find(r=>r.pl===2)||rows[1];
  if (!meister) return null;
  let away=fin.winner, note='';
  if (away===meister.id){
    if (!second) return null;
    away=second.id;
    note='Der Meister hat auch den DFB-Pokal gewonnen. Gegner ist der Zweite der Bundesliga.';
  }
  return {h:meister.id, a:away, hg:null, ag:null, et:false, peh:null, pea:null, note};
}
function supercupWinner(m){
  if (!m || m.hg==null || m.ag==null) return null;
  return cupWinner(m);
}
function supercupPending(season){
  if (!featOn('supercup')) return false;
  const m=season && season.supercup;
  return !!(m && !supercupWinner(m));
}
function simSupercup(season){
  const m=season && season.supercup;
  if (!m || supercupWinner(m)) return 0;
  if (m.hg==null || m.ag==null){
    const res=simCupScore(m.h, m.a);
    m.hg=res.hg; m.ag=res.ag; m.et=res.et; m.peh=res.peh; m.pea=res.pea;
    return 1;
  }
  if (m.hg===m.ag){
    const res=simCupScore(m.h, m.a);
    m.peh=res.peh; m.pea=res.pea; m.et=false;
    if (m.peh==null || m.pea==null || m.peh===m.pea){ m.peh=4; m.pea=3; }
    return 1;
  }
  return 0;
}
function touchSupercup(fn){
  const s=cur(); if (!isEditable() || !s.supercup) return;
  fn(s.supercup);
  if (s.supercup.hg!=null && s.supercup.hg!==s.supercup.ag){ s.supercup.peh=null; s.supercup.pea=null; }
  if (s.supercup.hg!=null && s.supercup.hg===s.supercup.ag) s.supercup.et=false;
  save(); render();
}
function applySupercupGoal(side, dir){
  touchSupercup(m=>{
    const unplayed=m.hg==null||m.ag==null;
    if (unplayed){
      if (dir>0){ m.hg=side===0?1:0; m.ag=side===0?0:1; }
      else { m.hg=0; m.ag=0; }
      return;
    }
    if (dir<0 && m.hg===0 && m.ag===0){ m.hg=null; m.ag=null; m.et=false; m.peh=null; m.pea=null; return; }
    if (side===0) m.hg=Math.max(0, m.hg+dir); else m.ag=Math.max(0, m.ag+dir);
  });
}
function openSupercupPen(){
  const m=cur().supercup;
  if (!m || m.hg==null || m.hg!==m.ag) return;
  penEdit={supercup:true, h:m.peh==null?0:m.peh, a:m.pea==null?0:m.pea};
  const side=(id, which)=>{
    const t=TEAMS[id];
    return '<div class="pen-side"><img src="'+esc(t.crest)+'" alt=""><div class="nm">'+esc(t.name)+'</div><div class="pen-num" id="pen'+which+'">0</div><span class="stepper pen-step"><button type="button" data-act="penAdj" data-side="'+(which==='H'?0:1)+'" data-dir="1">+</button><button type="button" data-act="penAdj" data-side="'+(which==='H'?0:1)+'" data-dir="-1">−</button></span></div>';
  };
  openModal('<div class="pen-dlg"><h3>Elfmeterschießen</h3><p class="muted">'+m.hg+':'+m.ag+' nach 90 Minuten und Verlängerung. Unentschieden im Elfmeterschießen ist nicht möglich.</p><div class="pen-sides">'+side(m.h,'H')+'<b class="pen-colon">:</b>'+side(m.a,'A')+'</div><div class="pen-actions"><button type="button" class="btn" data-act="penCancel">Abbrechen</button><button type="button" class="btn primary" id="penOk" data-act="penOk" disabled>OK</button></div></div>');
  paintPen();
}
function supercupMatchHTML(s, m){
  const ed=isEditable() && s===latest();
  const played=m.hg!=null && m.ag!=null;
  const draw=played && m.hg===m.ag;
  const hasPen=m.peh!=null && m.pea!=null && m.peh!==m.pea;
  const step=side=>ed?'<span class="stepper"><button type="button" data-act="scGoal" data-side="'+side+'" data-dir="1">+</button><button type="button" data-act="scGoal" data-side="'+side+'" data-dir="-1">−</button></span>':'';
  let above='<span class="ie-slot"></span>';
  if (draw && hasPen) above=ed?'<button type="button" class="ie-link" data-act="scIe">'+m.peh+':'+m.pea+' i.E.</button>':'<span class="ie-link ie-static">'+m.peh+':'+m.pea+' i.E.</span>';
  else if (draw && !hasPen && ed) above='<button type="button" class="ie-link" data-act="scIe">i.E.</button>';
  else if (!draw && ed) above='<label class="ie-box"><input type="checkbox" data-sc-et="1"'+(m.et?' checked':'')+(played?'':' disabled')+'> n.V.</label>';
  else if (!draw && m.et) above='<span class="ie-box">n.V.</span>';
  const below='<span class="ie-slot"></span>';
  const km=kmBetween(m.h, m.a);
  return '<div class="match-solo">'+matchLineHTML({h:m.h, a:m.a, hg:played?m.hg:null, ag:played?m.ag:null, cup:true, done:!!supercupWinner(m), step, above, below, km, del:ed?'<button type="button" class="del" data-act="scDel">×</button>':'<span></span>'})+'</div>';
}
function renderSupercup(){
  $('#tabs').innerHTML='';
  $('#title').textContent='Supercup';
  const s=cur();
  $('#subline').innerHTML='Meister gegen den DFB-Pokalsieger der Vorsaison.';
  setActions(seasonActions(s, false));
  const m=s.supercup;
  let h='<div class="box"><p>Der Supercup steht vor der neuen Saison, sobald die Vorsaison einen Meister und einen DFB-Pokalsieger hat. Heimrecht hat immer der Meister. Gewinnt derselbe Verein beides, spielt er gegen den Zweiten der Bundesliga. Es gilt das Pokalrecht: bei Gleichstand n.V. und i.E.</p></div>';
  if (!m) h+='<div class="box"><h3>'+esc(s.name)+'</h3><p class="muted">In dieser Saison gibt es keinen Supercup. Die erste Saison hat noch keinen, und ohne beendeten DFB-Pokal auch nicht.</p></div>';
  else {
    h+='<div class="card"><div class="card-title"><span>Supercup '+esc(s.name)+'</span></div>';
    if (m.note) h+='<p class="cup-note">'+esc(m.note)+'</p>';
    h+=supercupMatchHTML(s, m)+'</div>';
  }
  const past=S.seasons.filter(x=>x.supercup && supercupWinner(x.supercup));
  h+='<div class="box sieger-box"><h3>Sieger</h3>';
  if (!past.length) h+='<p class="muted">Noch kein entschiedener Supercup.</p>';
  else {
    h+=siegerHead();
    past.slice().reverse().forEach(x=>{
      const w=supercupWinner(x.supercup);
      const opp=w===x.supercup.h?x.supercup.a:x.supercup.h;
      h+=siegerRow(x.name, w, opp, x.supercup, x);
    });
  }
  h+='</div>';
  $('#view').innerHTML=h;
}
function openVerein(id){
  if (!TEAMS[id]) return;
  const modal=$('#modal'); if (modal) modal.classList.add('hidden');
  S.ui.vereinFrom=S.ui.tab==='verein'?(S.ui.vereinFrom||'tabelle'):S.ui.tab;
  S.ui.vereinId=id;
  S.ui.tab='verein';
  save(); render();
}
function seasonCupRuns(season){
  if (!season || !season.cups) return [];
  const out=[];
  const add=(cup, comp, bl)=>{
    if (!cup) return;
    const names=(cup.rounds||[]).map(r=>r.name);
    const reached=cupReached(cup);
    Object.keys(reached).forEach(id=>{
      const x=reached[id];
      out.push({season:season.name, id, comp, bl:bl||'', round:x.name, won:!!x.won});
    });
  };
  add(season.cups.dfb, 'dfb', '');
  if (season.cups.land) BL_ORDER.forEach(bl=>add(season.cups.land[bl], 'land', bl));
  return out;
}
function vereinPokalRuns(id){
  const seen=new Set(), out=[];
  (S.pokalRuns||[]).forEach(r=>{
    if (r.id!==id) return;
    const k=r.season+'|'+r.comp+'|'+(r.bl||'');
    if (seen.has(k)) return;
    seen.add(k); out.push(r);
  });
  (S.seasons||[]).forEach(season=>{
    seasonCupRuns(season).forEach(r=>{
      if (r.id!==id) return;
      const k=r.season+'|'+r.comp+'|'+(r.bl||'');
      if (seen.has(k)) return;
      seen.add(k); out.push(r);
    });
  });
  out.sort((a,b)=>a.season<b.season?-1:a.season>b.season?1:(a.comp==='dfb'?-1:1));
  return out;
}
function renderVerein(){
  const id=S.ui.vereinId;
  $('#tabs').innerHTML='';
  $('#subline').innerHTML='';
  if (!id || !TEAMS[id]){ $('#title').textContent='Verein'; $('#view').innerHTML='<div class="box">Unbekannter Verein.</div>'; return; }
  $('#title').textContent=TEAMS[id].name;
  $('#view').innerHTML=viewVerein(id);
}
function pyramidScore(ebene, n, pl){
  const span=Math.max(1,(n||18)-1);
  return (8-(ebene||7))*100 + (1-(pl-1)/span)*90;
}
function leagueHistoryPoints(id){
  const pts=[];
  historyEntries(id).forEach(r=>{
    if (r.pl==null || !r.ebene) return;
    pts.push({season:r.season, ebene:r.ebene, n:r.n, pl:r.pl, liga:r.liga, y:pyramidScore(r.ebene, r.n, r.pl), final:true});
  });
  clubPlacements(id).forEach(p=>{
    if (!p.pl || pts.some(x=>x.season===p.season)) return;
    const lg=L[p.lid];
    if (!lg) return;
    pts.push({season:p.season, ebene:lg.level, n:p.n, pl:p.pl, liga:lg.name, y:pyramidScore(lg.level, p.n, p.pl), final:!!p.final});
  });
  pts.sort((a,b)=>a.season<b.season?-1:1);
  return pts;
}
function placementChart(pts){
  if (!pts.length) return '<p class="muted">Noch keine Ligaplatzierung.</p>';
  if (pts.length<2) return '<p>'+esc(pts[0].season+' · '+pts[0].liga+' '+pts[0].pl+'.')+'</p><p class="muted">Zu wenige Saisons für eine Kurve.</p>';
  const w=680, h=250, padL=64, padR=12, padT=12, padB=26;
  const min=pyramidScore(7, 18, 18), max=pyramidScore(1, 20, 1), spn=max-min;
  const X=i=>padL+(w-padL-padR)*i/(pts.length-1);
  const Y=v=>padT+(h-padT-padB)*(1-(v-min)/spn);
  const line=pts.map((p,i)=>X(i).toFixed(1)+','+Y(p.y).toFixed(1)).join(' ');
  const bands=[[1,'BL'],[2,'2. BL'],[3,'3. Liga'],[4,'4. Liga'],[5,'RL'],[6,'OL'],[7,'Amateur']];
  let grid='';
  bands.forEach(([eb,lab])=>{
    const y=Y(pyramidScore(eb, 18, 1));
    grid+='<line x1="'+padL+'" x2="'+(w-padR)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" class="band"/><text x="4" y="'+(y+4).toFixed(1)+'">'+lab+'</text>';
  });
  const dots=pts.map((p,i)=>'<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(p.y).toFixed(1)+'" r="2.4"><title>'+esc(p.season+' · '+p.liga+' '+p.pl+'.')+'</title></circle>').join('');
  return '<svg class="place-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Platzierungskurve">'+grid+'<polyline points="'+line+'"/>'+dots+'<text x="'+padL+'" y="'+(h-8)+'">'+esc(pts[0].season)+'</text><text x="'+(w-96)+'" y="'+(h-8)+'" text-anchor="end">'+esc(pts[pts.length-1].season)+'</text></svg><p class="muted">Oben ist die bessere Liga und der bessere Platz. Die Bänder sind die Ligastufen. Historie plus Saisons im Rechner.</p>';
}
function viewVerein(id){
  const t=TEAMS[id];
  const stad=stadionName(id);
  const info=ansehenInfo(id);
  const hist=leagueHistoryPoints(id);
  let h='<div class="box"><button class="btn small" data-act="vereinBack">← Zurück</button><div class="verein-head"><img src="'+esc(t.crest)+'" alt=""><div><h2>'+esc(t.name)+'</h2><div class="muted">'+esc(t.bl)+(stad?' · '+esc(stad):' · Stadionname nicht hinterlegt')+'</div></div></div>';
  h+='<h3>Liga-Verlauf</h3>'+placementChart(hist);
  h+='<h3>Ansehen</h3><div class="ansehen-break">'+
    '<div><span>Liga</span><b>'+(info.liga==null?'–':deNum(info.liga,2))+'</b></div>'+
    '<div><span>DFB-Pokal</span><b>'+deNum(info.dfb.value,2)+'</b></div>'+
    '<div><span>Landespokal</span><b>'+deNum(info.land.value,2)+'</b></div>'+
    '<div class="tot"><span>Ansehen</span><b>'+(info.value==null?'–':deNum(info.value,2))+'</b></div></div>';
  const runs=vereinPokalRuns(id);
  h+='<h3>Pokal</h3><table class="tbl fit"><thead><tr><th class="l">Saison</th><th class="l">Wettbewerb</th><th class="l">Runde</th></tr></thead><tbody>';
  if (!runs.length) h+='<tr><td class="l" colspan="3"><span class="muted">Noch keine Pokalrunde im Rechner.</span></td></tr>';
  runs.forEach(r=>{ h+='<tr><td class="l">'+esc(r.season)+'</td><td class="l">'+(r.comp==='dfb'?'DFB-Pokal':'Landespokal'+(r.bl?' '+esc(r.bl):''))+'</td><td class="l">'+esc(r.round)+(r.won?' · Sieger':'')+'</td></tr>'; });
  h+='</tbody></table>';
  const byLiga={};
  hist.forEach(p=>{ if (p.pl===1 && p.final!==false) (byLiga[p.liga]||(byLiga[p.liga]=[])).push(p.season); });
  const cups=runs.filter(r=>r.won);
  const supers=S.seasons.filter(s=>s.supercup && supercupWinner(s.supercup)===id);
  const ligaKeys=Object.keys(byLiga);
  h+='<h3>Titel</h3><div class="title-grid">';
  h+='<div><b>Meisterschaften</b>'+(ligaKeys.length?ligaKeys.map(liga=>'<div><span class="muted">'+esc(liga)+'</span> '+byLiga[liga].length+'×<div class="seasons">'+esc(byLiga[liga].join(', '))+'</div></div>').join(''):'<div class="muted">keine</div>')+'</div>';
  h+='<div><b>Pokalsiege</b>'+(cups.length?cups.map(r=>'<div>'+esc(r.season)+' · '+(r.comp==='dfb'?'DFB-Pokal':'Landespokal'+(r.bl?' '+esc(r.bl):''))+'</div>').join(''):'<div class="muted">keine</div>')+'</div>';
  h+='<div><b>Supercup</b>'+(supers.length?supers.map(s=>'<div>'+esc(s.name)+'</div>').join(''):'<div class="muted">keine</div>')+'</div></div>';
  h+='</div>';
  return h;
}
function clubModal(id){
  const t=TEAMS[id], pl=clubPlacements(id);
  let h='<div style="display:flex;gap:12px;align-items:center"><img src="'+esc(t.crest)+'" style="width:68px;height:68px;object-fit:contain"><div><h2 style="margin:0">'+esc(t.name)+'</h2><div class="muted">'+esc(t.bl)+' · historische Rangliste: '+(t.rang?'Rang '+t.rang+', Schnitt '+t.schnitt.toFixed(2).replace('.',','):'ohne Wertung')+'</div></div></div>';
  h+='<h3 style="margin-top:16px">Platzierungen im Fußballrechner</h3><table class="tbl fit"><thead><tr>'+sortHead('Saison','','l')+sortHead('Liga','','l')+sortHead('Platz','pl')+sortHead('Tore','tg')+'</tr></thead><tbody>';
  pl.forEach(p=>{ const tg=p.tore?parseInt(p.tore,10):''; h+='<tr><td class="l">'+p.season+'</td><td class="l">'+esc(leagueName(p.lid))+'</td>'+sortCell(p.pl||'', p.pl?p.pl+'. / '+p.n+(p.final?'':' (laufend)'):'–')+sortCell(tg, p.tore||'–')+'</tr>'; });
  h+='</tbody></table>';
  openModal(h);
}
function openModal(h){ $('#modalBody').innerHTML=h; $('#modal').classList.remove('hidden'); }

// ---------- Ergebnis-Eingabe ----------
function refreshTableOnly(){
  const s=cur(), lid=S.ui.league;
  const tc=$('#tableCard'); if (tc) tc.innerHTML=tableHTML(leagueTable(s,lid),L[lid],{nobl:true});
  const lp=leagueProgress(s,lid), pr=seasonProgress(s);
  const sp=$('#subline .muted'); if (sp) sp.textContent='Liga: '+lp.done+'/'+lp.total+' Spiele · alle Ligen: '+pr.done+'/'+pr.total;
  const md=s.leagues[lid].md[shownMd], done=md.filter(m=>m[2]!=null&&m[3]!=null).length;
  const pg=$('#spCard .progress'); if (pg) pg.textContent='('+done+'/'+md.length+' eingetragen)';
  const opt=$('#mdSelect option:checked'); if (opt) opt.textContent=(shownMd+1)+'. Spieltag'+(done===md.length?' ✓':'');
}
function paintMatch(k){
  const m=cur().leagues[S.ui.league].md[shownMd][k];
  const row=document.querySelector('#spCard .match[data-k="'+k+'"]'); if (!row) return;
  const played=m[2]!=null&&m[3]!=null;
  row.classList.toggle('done', played);
  row.querySelector('.goals[data-side="0"]').textContent=played?m[2]:'-';
  row.querySelector('.goals[data-side="1"]').textContent=played?m[3]:'-';
}
function applyScore(k, hg, ag){
  if (!isEditable()) return;
  const lid=S.ui.league;
  if (!isScheduled(cur(), lid, shownMd)) return;
  const m=cur().leagues[lid].md[shownMd][k];
  m[2]=hg; m[3]=ag;
  syncDecide(cur(), lid);
  const adv=maybeAdvance(cur(), lid);
  save();
  if (adv || cur().leagues[lid].decide){ render(); if (adv) toast('Spieltage '+(adv[0]+1)+'–'+(adv[1]+1)+' terminiert.'); }
  else { paintMatch(k); refreshTableOnly(); }
}
function adjustGoal(k, side, dir){
  if (!isEditable()) return;
  const m=cur().leagues[S.ui.league].md[shownMd][k];
  const unplayed=m[2]==null||m[3]==null;
  if (unplayed){
    if (dir>0) applyScore(k, side===0?1:0, side===0?0:1);
    else applyScore(k, 0, 0);
    return;
  }
  if (dir<0 && m[2]===0 && m[3]===0){ applyScore(k, null, null); return; }
  let h=m[2], a=m[3];
  if (side===0) h=Math.max(0, h+dir); else a=Math.max(0, a+dir);
  applyScore(k, h, a);
}

// ---------- Events ----------
document.addEventListener('click', ev=>{
  const t=ev.target;
  const sortTh=t.closest('th[data-sort]');
  if (sortTh && !t.closest('#tabs')){
    const table=sortTh.closest('table');
    const body=table && table.tBodies[0];
    if (body){
      if (body.dataset.base!=='1'){ [...body.rows].forEach((r,i)=>r.dataset.ord=String(i)); body.dataset.base='1'; }
      const next=sortTh.classList.contains('sort-desc')?'asc':sortTh.classList.contains('sort-asc')?'':'desc';
      table.querySelectorAll('th[data-sort]').forEach(h=>h.classList.remove('sort-asc','sort-desc'));
      const rows=[...body.rows];
      const place=rows.map(r=>r.dataset.pin?r:null);
      const movable=rows.filter(r=>!r.dataset.pin);
      if (!next){
        rows.sort((a,b)=>(+a.dataset.ord)-(+b.dataset.ord));
        rows.forEach(r=>body.appendChild(r));
      } else {
        sortTh.classList.add(next==='asc'?'sort-asc':'sort-desc');
        const idx=sortTh.cellIndex;
        const num=r=>{ const cell=r.cells[idx]; const n=parseFloat(cell&&cell.dataset.n); return isNaN(n)?-1e15:n; };
        movable.sort((a,b)=>next==='asc'?num(a)-num(b):num(b)-num(a));
        let k=0;
        place.map(r=>r||movable[k++]).forEach(r=>body.appendChild(r));
      }
    }
    return;
  }
  const menuBtn=t.closest('[data-menu]');
  if (menuBtn){
    const menu=menuBtn.parentElement;
    const on=menu.classList.contains('open');
    document.querySelectorAll('.nav-menu.open,.top-tools.open').forEach(el=>el.classList.remove('open'));
    if (!on) menu.classList.add('open');
    return;
  }
  if (!t.closest('.nav-drop')) document.querySelectorAll('.nav-menu.open,.top-tools.open').forEach(el=>el.classList.remove('open'));
  const amTab=t.closest('[data-amateur]'); if (amTab){ S.ui.amateurBl=amTab.dataset.amateur; save(); render(); return; }
  const nav=t.closest('[data-league]'); if (nav){ S.ui.league=nav.dataset.league; if(S.ui.tab==='abschluss'||S.ui.tab==='pokal'||S.ui.tab==='ansehen'||S.ui.tab==='verein'||S.ui.tab==='supercup'||S.ui.tab==='info') S.ui.tab='tabelle'; save(); render(); return; }
  const tab=t.closest('[data-tab]'); if (tab){
    if (tab.dataset.tab==='terminierung' && S.ui.termBlock) delete S.ui.termBlock[S.view+':'+S.ui.league];
    if (tab.dataset.tab==='ansehen') S.ui.ansehenId=null;
    S.ui.tab=tab.dataset.tab; save(); render(); return;
  }
  const tg=t.closest('[data-toggle] button'); if (tg){ S.ui[tg.parentNode.dataset.toggle]=tg.dataset.v; save(); render(); return; }
  if (t.closest('.pick-row')) return;
  const crest=t.closest('img[data-club], [data-club] img');
  if (crest){ const id=crest.dataset.club||(crest.closest('[data-club]')&&crest.closest('[data-club]').dataset.club); if(id&&TEAMS[id]){ openVerein(id); return; } }
  const hist=t.closest('[data-ansehen]'); if (hist && S.ui.tab==='ansehen'){ S.ui.ansehenId=hist.dataset.ansehen; render(); return; }
  const club=t.closest('[data-club]'); if (club && !t.closest('.score')){ clubModal(club.dataset.club); return; }
  const a=t.closest('[data-act]'); if (!a) return;
  const act=a.dataset.act, s=cur(), lid=S.ui.league;
  if (act==='cupDraw'){
    ensureCups(s);
    const cup=getCup(s, a.dataset.cup);
    const ri=+a.dataset.ri;
    if (cup && drawCupRound(s, cup, ri)){ S.ui.cupRound=ri; save(); render(); toast(cup.rounds[ri].name+' ausgelost.'); }
    else toast('Diese Runde kann noch nicht ausgelost werden.');
  }
  else if (act==='cupPrev'||act==='cupNext'){
    const cup=getCup(s, S.ui.cup||'dfb'); if(!cup) return;
    let i=(S.ui.cupRound||0)+(act==='cupNext'?1:-1);
    S.ui.cupRound=Math.max(0, Math.min(cup.rounds.length-1, i));
    save(); render();
  }
  else if (act==='cupGoal'){ applyCupGoal(a.dataset.cup, +a.dataset.ri, +a.dataset.mi, +a.dataset.side, +a.dataset.dir); }
  else if (act==='cupIe'){ openPenDialog(a.dataset.cup, +a.dataset.ri, +a.dataset.mi); }
  else if (act==='decideGoal'){ applyDecideGoal(S.ui.league, +a.dataset.di, +a.dataset.side, +a.dataset.dir); }
  else if (act==='decideDel'){ touchDecide(S.ui.league, +a.dataset.di, m=>{ m.hg=m.ag=null; m.et=false; m.peh=m.pea=null; }); }
  else if (act==='decideIe'){ openDecidePen(+a.dataset.di); }
  else if (act==='penAdj'){
    if (!penEdit) return;
    if (+a.dataset.side===0) penEdit.h=Math.max(0, penEdit.h+(+a.dataset.dir));
    else penEdit.a=Math.max(0, penEdit.a+(+a.dataset.dir));
    paintPen();
  }
  else if (act==='penCancel'){ closePen(); }
  else if (act==='penOk'){
    if (!penEdit || penEdit.h===penEdit.a) return;
    const edit=penEdit;
    closePen();
    if (edit.decide!=null){
      const m=cur().leagues[S.ui.league].decide[edit.decide];
      if (m){ m.peh=edit.h; m.pea=edit.a; m.et=false; save(); render(); }
    } else if (edit.supercup){
      const m=cur().supercup;
      if (m && m.hg===m.ag){ m.peh=edit.h; m.pea=edit.a; m.et=false; save(); render(); }
    } else mutateCup(edit.cup, edit.ri, edit.mi, m=>{ if (m.hg===m.ag){ m.peh=edit.h; m.pea=edit.a; m.et=false; } });
  }
  else if (act==='cupDel'){ mutateCup(a.dataset.cup, +a.dataset.ri, +a.dataset.mi, m=>{ m.hg=m.ag=null; m.et=false; m.peh=m.pea=null; }); }
  else if (act==='mdPrev'||act==='mdNext'){ const n=s.leagues[lid].md.length; let i=currentMd(s,lid)+(act==='mdNext'?1:-1); i=Math.max(0,Math.min(n-1,i)); S.ui.md[S.view+':'+lid]=i; save(); render(); }
  else if (act==='goal'){ adjustGoal(+a.dataset.k, +a.dataset.side, +a.dataset.dir); }
  else if (act==='del'){ applyScore(+a.dataset.k, null, null); }
  else if (act==='termBlock'){ const r=scheduleNextBlock(s,lid); save(); render(); if(r) toast('Spieltage '+(r[0]+1)+'–'+(r[1]+1)+' terminiert.'); }
  else if (act==='termPrev'||act==='termNext'){
    const key=S.view+':'+lid;
    S.ui.termBlock=S.ui.termBlock||{};
    const lg=s.leagues[lid], blocks=[];
    for (let from=0; from<lg.md.length; ){ const range=nextBlockRange(lg.teams.length, from); if(!range) break; blocks.push(range); from=range[1]+1; }
    let bi=S.ui.termBlock[key];
    if (bi==null){ bi=0; blocks.forEach((b,i)=>{ if(isScheduled(s,lid,b[0])) bi=i; }); }
    bi += act==='termNext'?1:-1;
    S.ui.termBlock[key]=Math.max(0, Math.min(blocks.length-1, bi));
    save(); render();
  }
  else if (act==='ansehenBack'){ S.ui.ansehenId=null; render(); }
  else if (act==='infoSec'){ S.ui.infoSec=a.dataset.v; render(); }
  else if (act==='infoHist'){ S.ui.infoHist=a.dataset.v; render(); }
  else if (act==='infoPick'){ S.ui.infoId=a.dataset.id; S.ui.infoQ=''; save(); render(); }
  else if (act==='infoOpp'){ S.ui.infoOpp=a.dataset.id; S.ui.infoOppQ=''; S.ui.infoH2H=0; save(); render(); }
  else if (act==='infoH2H'){ S.ui.infoH2H=+a.dataset.v; render(); }
  else if (act==='vereinBack'){ S.ui.tab=S.ui.vereinFrom||'tabelle'; render(); }
  else if (act==='scGoal'){ applySupercupGoal(+a.dataset.side, +a.dataset.dir); }
  else if (act==='scDel'){ touchSupercup(m=>{ m.hg=m.ag=null; m.et=false; m.peh=m.pea=null; }); }
  else if (act==='scIe'){ openSupercupPen(); }
  else if (act==='mapReset'){
    const svg=document.querySelector('.de-map'); if(!svg) return;
    mapView={lid:svg.dataset.lid, z:1, cx:(+svg.dataset.w)/2, cy:(+svg.dataset.h)/2};
    applyMap();
  }
  else if (act==='simMd'){ if(!isScheduled(s,lid,currentMd(s,lid))){ toast('Spieltag ist noch nicht terminiert.'); return; } const c=simLeague(s,lid,currentMd(s,lid)); save(); render(); toast(c+' Spiele zufällig eingetragen.'); }
  else if (act==='simBlock'){ if(confirm('Den aktuellen Block der '+L[lid].name+' simulieren? Offene Spiele dieser vier Spieltage werden zufällig aufgefüllt.')){ const c=simBlock(s,lid); save(); render(); toast(c?c+' Spiele simuliert.':'Nichts zu simulieren.'); } }
  else if (act==='simSeason'){ const r=rollSimulatedSeason(); if(!r.rolled){ toast('Die Saison konnte nicht gewechselt werden.'); return; } toast(r.c+' Spiele simuliert.'); }
  else if (act==='simLeague'){ if(confirm('Alle noch offenen Spiele der '+L[lid].name+' zufällig simulieren? Nicht terminierte Blöcke werden dabei der Reihe nach angesetzt.')){ const c=simLeague(s,lid); save(); render(); toast(c+' Spiele simuliert.'); } }
  else if (act==='rules'){ openModal(rulesHTML()); }
  else if (act==='end'){ const pr=seasonProgress(s); if (pr.done<pr.total && !confirm('Es fehlen noch '+(pr.total-pr.done)+' Spiele. Trotzdem zum Saisonabschluss? (Du kannst dort noch abbrechen oder die fehlenden Spiele simulieren.)')) return; startSeasonEnd(); }
  else if (act==='toEnd'){ S.view=S.seasons.length-1; S.ui.tab='aufab'; render(); }
  else if (act==='endCancel'){ cancelSeasonEnd(); }
  else if (act==='endSimAll'){ const l=latest(); LEAGUES.forEach(x=>{ simLeague(l,x.id); simDecide(l,x.id); }); simAllCups(l); l.endData=computeTransition(l); save(); render(); }
  else if (act==='endStep2'){ latest().endData.step=2; save(); render(); window.scrollTo(0,0); }
  else if (act==='endStep1'){ latest().endData.step=1; save(); render(); }
  else if (act==='suggest'){ suggestPicks(latest().endData); save(); render(); }
  else if (act==='clearPicks'){ latest().endData.picks={}; save(); render(); }
  else if (act==='finalize'){ finalizeSeason(); }
});
document.addEventListener('change', ev=>{
  const t=ev.target;
  if (t.id==='seasonSelect'){ S.view=+t.value; if (S.ui.tab==='abschluss') S.ui.tab='aufab'; if (cur().status==='ending') S.ui.tab='aufab'; save(); render(); }
  else if (t.id==='mobileLeague'){ if(t.value==='pokal'){ S.ui.tab='pokal'; } else { S.ui.league=t.value; if(S.ui.tab==='abschluss'||S.ui.tab==='pokal'||S.ui.tab==='ansehen'||S.ui.tab==='verein'||S.ui.tab==='supercup'||S.ui.tab==='info') S.ui.tab='tabelle'; } save(); render(); }
  else if (t.id==='mdSelect'){ S.ui.md[S.view+':'+S.ui.league]=+t.value; save(); render(); }
  else if (t.id==='autoNext'){ S.ui.autoNext=t.checked; save(); }
  else if (t.id==='allPools'){ S.ui.allPools=t.checked; save(); render(); }
  else if (t.id==='ansehenLiga'){ S.ui.ansehenLiga=t.value; save(); render(); }
  else if (t.id==='cupSelect'){ S.ui.cup=t.value; S.ui.cupRound=null; S.ui.cupView=S.ui.cupView||'spiele'; save(); render(); }
  else if (t.id==='cupRound'){ S.ui.cupRound=+t.value; save(); render(); }
  else if (t.dataset.cupEt){ mutateCup(t.dataset.cup, +t.dataset.ri, +t.dataset.mi, m=>{ m.et=t.checked; }); }
  else if (t.dataset.scEt!=null){ touchSupercup(m=>{ m.et=t.checked; }); }
  else if (t.dataset.decideEt!=null){ touchDecide(S.ui.league, +t.dataset.decideEt, m=>{ m.et=t.checked; }); }
  else if (t.id==='infoFxSeason'){ S.ui.infoFx=+t.value; render(); }
  else if (t.id==='ansehenBl'){ S.ui.ansehenBl=t.value; save(); render(); }
  else if (t.id==='optSupercup'){ S.ui.supercup=t.checked; if(!t.checked && S.ui.tab==='supercup') S.ui.tab='tabelle'; save(); render(); }
  else if (t.dataset.pick){ const e=latest().endData, ol=t.dataset.pick; const arr=e.picks[ol]||(e.picks[ol]=[]);
    if (t.checked){ if (arr.length>=e.need[ol]){ t.checked=false; toast('Für '+L[ol].name+' sind nur '+e.need[ol]+' Aufsteiger möglich.'); return; } arr.push(t.value); }
    else arr.splice(arr.indexOf(t.value),1);
    save();
    const y=window.scrollY;
    const tops=[...document.querySelectorAll('.pick-list')].map(el=>({ol:el.dataset.ol, top:el.scrollTop}));
    const side=document.querySelector('#sidebar');
    const sy=side?side.scrollTop:0;
    render();
    const restore=()=>{
      window.scrollTo(0, y);
      const side2=document.querySelector('#sidebar'); if (side2) side2.scrollTop=sy;
      document.querySelectorAll('.pick-list').forEach(el=>{ const f=tops.find(x=>x.ol===el.dataset.ol); if (f) el.scrollTop=f.top; });
    };
    restore(); requestAnimationFrame(restore);
  }
  else if (t.id==='fileImport'){ importFile(t.files[0]); t.value=''; }
});
document.addEventListener('input', ev=>{
  const t=ev.target;
  if (t.id==='poolSearch'){ const q=t.value.toLowerCase(); document.querySelectorAll('#view .amateur-list > div').forEach(d=>d.style.display=d.dataset.name.includes(q)?'':'none'); }
  else if (t.id==='ansehenSearch'){ const q=t.value.toLowerCase(); document.querySelectorAll('#ansehenList tr[data-ansehen]').forEach(tr=>{ tr.style.display=(tr.dataset.name||'').includes(q)?'':'none'; }); }
});
document.addEventListener('keydown', ev=>{
  if (ev.key==='Escape'){ $('#modal').classList.add('hidden'); document.querySelectorAll('.nav-menu.open,.top-tools.open').forEach(el=>el.classList.remove('open')); }
});
$('#modalClose').onclick=()=>$('#modal').classList.add('hidden');
$('#modal').addEventListener('click', ev=>{ if (ev.target.id==='modal') $('#modal').classList.add('hidden'); });
$('#btnExport').onclick=()=>{
  const blob=new Blob([JSON.stringify(packForDisk(S))],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='fussballrechner-spielstand-'+new Date().toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},500);
  toast('Spielstand exportiert.');
};
function importFile(f){
  if (!f) return;
  const r=new FileReader();
  r.onload=()=>{ try{ const d=JSON.parse(r.result); if(!d.seasons||!d.seasons.length||!d.seasons[0].leagues) throw new Error('kein Spielstand');
    if(!structureOk(d)){ alert('Dieser Spielstand passt nicht zur aktuellen Ligastruktur (ohne 5. Liga, Regionalliga und Oberliga mit 18 Mannschaften).'); return; }
    if(!confirm('Spielstand aus „'+f.name+'“ laden? Der aktuelle Stand im Browser wird ersetzt.')) return;
    d.ui=d.ui||{league:'BL',tab:'tabelle',md:{},autoNext:true}; d.view=Math.min(d.view||0,d.seasons.length-1); adopt(unpackState(d), false); toast('Spielstand geladen.'); }
    catch(e){ alert('Die Datei ist kein gültiger Fußballrechner-Spielstand.'); } };
  r.readAsText(f);
}
$('#btnReset').onclick=()=>{ if(confirm('Wirklich alles zurücksetzen? Alle Saisons und Ergebnisse gehen verloren (vorher exportieren!).')){ S=newGame(); save(); render(); } };

// ---------- Start ----------
function adopt(data, empty){
  resetDerivedIndex();
  S = data || newGame();
  S.ui = Object.assign({league:'BL', tab:'tabelle', md:{}, autoNext:true, supercup:true}, S.ui||{});
  if (empty && (localStorage.getItem(OLD_KEY)||localStorage.getItem('fussballrechner_v1'))) S.ui.showMigrate = true;
  if (S.view==null || S.view>=S.seasons.length) S.view=S.seasons.length-1;
  if (S.ui.tab==='abschluss') S.ui.tab='aufab';
  if (S.ui.tab==='derbys') S.ui.tab='tabelle';
  if (latest().status==='ending' && S.view===S.seasons.length-1) S.ui.tab='aufab';
  ensureAllCups();
  migrateArchive();
  recomputePokalPoints();
  save(); render();
}
function boot(){
  let ls=null;
  try { ls=parseSave(localStorage.getItem(KEY)); } catch(e){ ls=null; }
  const finish=(data, empty)=>adopt(data, empty);
  idbGet(SPLIT+'meta').then(meta=>{
    if (meta && meta.split && meta.n) return loadSplit(meta).then(d=>finish(d, false));
    return idbGet(KEY).then(raw=>{
      const idb=parseSave(raw);
      if (idb) finish(idb, false);
      else finish(ls, !ls);
    });
  }).catch(()=>finish(ls, !ls));
}
boot();

// Für Tests/Debugging
window.FR = {computeTransition, get state(){return S;}, L, LEAGUES, POOLS, TEAMS, BL_ORDER, computeTable, leagueTable, simLeague, simSeason, simBlock, simAllCups, simDecide, syncDecide, fixedPlaces, decideSettled, twoLegWinner, homeLeague, AREA_BY_BL, validateFixtures, makeSchedule, relegationProfile, scheduleNextBlock, slotTally, topKind, ansehenInfo, pairScore, powerSnapshot, certaintyFromEnv, certaintyMap, seasonStrengthPoints, suggestPicks, finalizeSeason, rollSimulatedSeason, compactSeason, migrateArchive, packForDisk, unpackState, recomputePokalPoints, blLoyalSet, buildSupercup, supercupWinner, supercupPending, stadionName, pointsEnvelope, relegationBattle, isClosingDay, lateSeason, finalSaturdaySlot, buildCups, drawCupRound, cupWinner, cupFinalists, maybeAutoFinal, standingOf, DFB_ROUNDS, whenSaved, save};
})();
