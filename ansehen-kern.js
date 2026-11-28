(function(){
'use strict';
const TEAMS={};
(window.FR_TEAMS||[]).forEach(function(row){ TEAMS[row[0]]={id:row[0], name:row[1], bl:row[2]||''}; });
function seasonYear(name){ return parseInt(String(name).slice(0,4),10)||0; }
const DFB_ROUNDS=[{name:'1. Runde'},{name:'2. Runde'},{name:'Achtelfinale'},{name:'Viertelfinale'},{name:'Halbfinale'},{name:'Finale'}];
const DFB_ROUND_PTS={'1. Runde':26,'2. Runde':32,Achtelfinale:38,Viertelfinale:44,Halbfinale:50,Finale:56};
const DFB_TITLE_PTS=4;
function dfbRunPoints(roundName, won){ return (DFB_ROUND_PTS[roundName]||26)+(won?DFB_TITLE_PTS:0); }
function landRunPoints(roundNames, roundName, won){ const names=roundNames||[]; let idx=names.indexOf(roundName); if (idx<0) idx=0; return 3+2*idx+(won?2:0); }
function cupWinner(m){ if (!m||m.hg==null||m.ag==null) return null; if (m.hg>m.ag) return m.h; if (m.ag>m.hg) return m.a; if (m.peh==null||m.pea==null||m.peh===m.pea) return null; return m.peh>m.pea?m.h:m.a; }
function cupFinalists(cup){ if (!cup||!cup.rounds||!cup.rounds.length) return null; const last=cup.rounds[cup.rounds.length-1]; if (!last.drawn||!last.matches||last.matches.length!==1) return null; const m=last.matches[0], w=cupWinner(m); if (!w) return null; return {winner:w, finalist:w===m.h?m.a:m.h, match:m}; }
function cupAliveSet(cup){ const alive=new Set((cup&&cup.entrants)||[]); (cup&&cup.rounds||[]).forEach(function(round){ (round.matches||[]).forEach(function(m){ const w=cupWinner(m); if (!w) return; if (m.h!==w) alive.delete(m.h); if (m.a!==w) alive.delete(m.a); }); }); return alive; }
function supercupWinner(m){ return cupWinner(m); }
function leagueTable(season, lid){ const lg=season&&season.leagues&&season.leagues[lid]; return (lg&&lg.tables&&lg.tables.all)||[]; }
function asRun(r){ return Array.isArray(r)?{season:r[0], id:r[1], comp:r[2], bl:r[3]||'', round:r[4], won:!!r[5]}:r; }
function allPokalRuns(){
  if (S && S.pokalRuns && S.pokalRuns.length) return S.pokalRuns;
  const out=[];
  ((S && S.pokalHistory)||[]).forEach(function(r){
    if (r.dfb) out.push({season:r.season, id:r.dfb, comp:'dfb', round:'Finale', won:true});
    if (r.land) Object.keys(r.land).forEach(function(bl){ if (r.land[bl]) out.push({season:r.season, id:r.land[bl], comp:'land', bl:bl, round:'Finale', won:true}); });
  });
  return out;
}
function roundRank(name){ const dfb=DFB_ROUNDS.findIndex(function(r){ return r.name===name; }); if (dfb>=0) return dfb; const order=['Vorrunde','Runde der 128','Runde der 64','Runde der 32','1. Runde','2. Runde','Achtelfinale','Viertelfinale','Halbfinale','Finale']; const i=order.indexOf(name||''); return i>=0?i:40; }
const S={seasons:[{name:'2026/27', status:'running', leagues:{}, cups:{}}], chronicle:[], pokalRuns:[], pokalHistory:[], view:0};
const LEAGUES = [
  {id:'BL',  name:'Bundesliga', short:'BL', level:1, size:20, up:0, down:3},
  {id:'BL2', name:'2. Bundesliga', short:'2. BL', level:2, size:20, up:3, down:3, upTo:'BL'},
  {id:'L3', name:'3. Liga', short:'3. Liga', level:3, size:20, up:3, down:4, upTo:'BL2'},
  {id:'L4SW', name:'4. Liga Südwest', short:'4. Liga SW', level:4, fourth:true, size:20, up:2, down:1, upTo:'L3'},
  {id:'L4NO', name:'4. Liga Nordost', short:'4. Liga NO', level:4, fourth:true, size:20, up:2, down:1, upTo:'L3'},
  {id:'RLN', name:'Regionalliga Nord', short:'RL Nord', level:5, size:20, up:1, down:2, upTo:'L4NO'},
  {id:'RLNO', name:'Regionalliga Nordost', short:'RL Nordost', level:5, size:20, up:1, down:1, upTo:'L4NO'},
  {id:'RLW', name:'Regionalliga West', short:'RL West', level:5, size:20, up:1, down:2, upTo:'L4SW'},
  {id:'RLS', name:'Regionalliga Süd', short:'RL Süd', level:5, size:20, up:1, down:2, upTo:'L4SW'},
  {id:'OLN', name:'Oberliga Nord', short:'OL Nord', level:6, size:16, up:1, down:1, upTo:'RLN'},
  {id:'OLNIW', name:'Oberliga Niedersachsen West', short:'OL NI West', level:6, size:16, up:1, down:1, upTo:'RLN'},
  {id:'OLNIO', name:'Oberliga Niedersachsen Ost', short:'OL NI Ost', level:6, size:16, up:1, down:1, upTo:'RLN'},
  {id:'OLNON', name:'Oberliga Nordost Staffel Nord', short:'OL NO Nord', level:6, size:16, up:1, down:1, upTo:'RLNO'},
  {id:'OLNOS', name:'Oberliga Nordost Staffel Süd', short:'OL NO Süd', level:6, size:16, up:1, down:1, upTo:'RLNO'},
  {id:'OLRH', name:'Oberliga Rheinland', short:'OL Rheinland', level:6, size:16, up:1, down:1, upTo:'RLW'},
  {id:'OLWN', name:'Oberliga Westfalen/Nordhessen', short:'OL Westfalen', level:6, size:16, up:1, down:1, upTo:'RLW'},
  {id:'OLSW', name:'Oberliga Südwest', short:'OL Südwest', level:6, size:16, up:1, down:1, upTo:'RLW'},
  {id:'OLBYN', name:'Oberliga Bayern Staffel Nord', short:'OL BY Nord', level:6, size:16, up:1, down:1, upTo:'RLS'},
  {id:'OLBYS', name:'Oberliga Bayern Staffel Süd', short:'OL BY Süd', level:6, size:16, up:1, down:1, upTo:'RLS'},
  {id:'OLBW', name:'Oberliga Baden-Württemberg', short:'OL BW', level:6, size:16, up:1, down:1, upTo:'RLS'}
];
const L = {}; LEAGUES.forEach(l => L[l.id] = l);
const LEVEL_NAME = {1:'Bundesliga',2:'2. Bundesliga',3:'3. Liga',4:'4. Liga',5:'Regionalliga',6:'Oberliga',7:'Amateurliga'};
function deNum(x, digits){ return (x==null||!isFinite(x)?'–':Number(x).toFixed(digits).replace('.',',')); }

[
  {id:'BL3', name:'3. Bundesliga', level:3, size:20, up:3, down:3},
  {id:'BL4', name:'4. Bundesliga', level:4, size:20, up:3, down:4},
  {id:'L5NO', name:'5. Liga Nordost', level:5, size:18, up:2, down:4},
  {id:'L5SW', name:'5. Liga Südwest', level:5, size:18, up:2, down:4},
  {id:'RGNW', name:'Regionalliga Nordwest', level:6, size:18, up:1, down:1},
  {id:'RGN', name:'Regionalliga Nord', level:6, size:18, up:1, down:1},
  {id:'RGNO', name:'Regionalliga Nordost', level:6, size:18, up:1, down:1},
  {id:'RGSO', name:'Regionalliga Südost', level:6, size:18, up:1, down:1},
  {id:'RGBY', name:'Regionalliga Bayern', level:6, size:18, up:1, down:1},
  {id:'RGBW', name:'Regionalliga Baden-Württemberg', level:6, size:18, up:1, down:1},
  {id:'RGSW', name:'Regionalliga Südwest', level:6, size:18, up:1, down:1},
  {id:'RGW', name:'Regionalliga Nordrhein-Westfalen', level:6, size:18, up:1, down:1}
].forEach(function(l){ LEAGUES.push(l); L[l.id]=l; });
function dataEndYear(){
  if (endYearGen===ansehenGen && endYearCache) return endYearCache;
  let y=2025;
  ((S&&S.chronicle)||[]).forEach(r=>{ const k=seasonYear(r.season); if(k>y) y=k; });
  endYearCache=y; endYearGen=ansehenGen;
  return y;
}
let ansehenGen=1, chronIndex=null, chronBuilt=-1, runIndex=null, runBuilt=-1, endYearCache=0, endYearGen=0, fixtureEpoch=1;
const ansehenMemo=new Map();
let ansehenMemoGen=0;
const infoMemo=new Map();
let infoMemoGen=0;
let orderCacheIds=null, chronSeen=null, runSeasons=null;
let ansehenCaches=null;
function touchAnsehen(){ ansehenGen++; ansehenMemo.clear(); infoMemo.clear(); endYearCache=0; orderCacheIds=null; ansehenCaches=null; chronIndex=null; chronBuilt=-1; runIndex=null; runBuilt=-1; chronSeen=null; runSeasons=null; }
function ensureAnsehenCaches(){
  const seasons=S.seasons||[];
  const runs=S.pokalRuns||[];
  if (ansehenCaches && ansehenCaches.gen===ansehenGen && ansehenCaches.seasons===seasons && ansehenCaches.n===seasons.length && ansehenCaches.runs===runs && ansehenCaches.rn===runs.length) return ansehenCaches;
  const byName=new Map();
  const fallback=new Map();
  const promo=new Map();
  const supercup=new Map();
  const dfbWins=new Map();
  (S.pokalRuns||[]).forEach(raw=>{
    const r=asRun(raw);
    if (!r||r.comp!=='dfb'||!r.won||!r.id||!r.season) return;
    let set=dfbWins.get(r.id);
    if (!set){ set=new Set(); dfbWins.set(r.id, set); }
    set.add(r.season);
  });
  seasons.forEach(season=>{
    if (!season||!season.name) return;
    byName.set(season.name, season);
    if (season.status!=='done') return;
    const tables=season.endData && season.endData.tables;
    const placed=new Set();
    LEAGUES.forEach(l=>{
      const lg=season.leagues && season.leagues[l.id];
      const rows=(tables && tables[l.id]) || (lg && lg.tables && lg.tables.all);
      if (!rows || !rows.length) return;
      const n=(lg && lg.teams && lg.teams.length) || rows.length || l.size;
      rows.forEach(row=>{
        if (!row || !row.id || row.pl==null) return;
        const mark=season.name+'|'+row.id;
        if (placed.has(mark)) return;
        placed.add(mark);
        const rec={season:season.name, liga:l.name, ebene:l.level, n, pl:row.pl, src:'rechner'};
        let list=fallback.get(row.id);
        if (!list){ list=[]; fallback.set(row.id, list); }
        list.push(rec);
      });
    });
    if (season.supercup){
      let winner=null;
      try{ winner=supercupWinner(season.supercup); }catch(e){ winner=null; }
      if (winner){
        let list=supercup.get(winner);
        if (!list){ list=[]; supercup.set(winner, list); }
        list.push(season);
      }
    }
    if (!season.endData) return;
    const y=seasonYear(season.name);
    if (!y) return;
    const moved=new Set();
    (season.endData.moves||[]).forEach(m=>{
      if (!(m&&m.id&&m.type==='auf'&&L[m.to]&&L[m.from]&&L[m.to].level<L[m.from].level)) return;
      const mark=season.name+'|'+m.id;
      if (moved.has(mark)) return;
      moved.add(mark);
      const rec={season:season.name, year:y, to:L[m.to].level, from:L[m.from].level, pl:m.pl, n:L[m.from].size, src:'rechner', via:'move'};
      let list=promo.get(m.id);
      if (!list){ list=[]; promo.set(m.id, list); }
      list.push(rec);
    });
    const picks=season.endData.picks||{};
    Object.keys(picks).forEach(lid=>{
      if (!L[lid]) return;
      (picks[lid]||[]).forEach(id=>{
        const rec={season:season.name, year:y, to:L[lid].level, from:7, src:'rechner', via:'pick'};
        let list=promo.get(id);
        if (!list){ list=[]; promo.set(id, list); }
        list.push(rec);
      });
    });
  });
  ansehenCaches={gen:ansehenGen, seasons, n:seasons.length, runs, rn:runs.length, byName, fallback, promo, supercup, dfbWins, eighth:new Map(), land:new Map()};
  return ansehenCaches;
}
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
    all.forEach(r=>{ const o=asRun(r); if (o&&o.season) runSeasons.add(o.season); });
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
    const raw=all[i];
    const o=asRun(raw);
    if (!o||!o.id) continue;
    let a=runIndex.get(o.id);
    if (!a){ a=[]; runIndex.set(o.id, a); }
    a.push(raw);
  }
  runBuilt=all.length;
  return (runIndex.get(id)||[]).map(asRun);
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
// ---------- Ansehen = Vereinserfolg, nicht Spielstärke ----------
// Punkteskala, Alterskurve und Titelregel. Reine Funktion der gespeicherten
// Platzierungen und Pokalrunden, nichts wird aufsummiert in den Spielstand geschrieben.
const ANSEHEN = {
  levels:{
    1:{title:180, euroUntil:7, euroFirst:420, euroLast:360, midFirst:336, midLast:300, relStep:4},
    2:{title:0, safeFirst:200, safeLast:174, promoStep:6, relStep:2},
    3:{title:0, safeFirst:112, safeLast:86, promoStep:4, relStep:2},
    4:{title:0, safeFirst:37, safeLast:27.2, promoStep:1, relStep:0.7},
    5:{title:0, safeFirst:22, safeLast:16.4, promoStep:0, relStep:0.4},
    6:{title:0, safeFirst:8, safeLast:6.5, promoStep:0.4, relStep:0.2}
  },
  amateurUp:4,
  euro:{CL:175,EL:130,UECL:90},
  dfb:{'1. Runde':40,'2. Runde':60,'Achtelfinale':80,'Viertelfinale':110,'Halbfinale':140,'Finale':170,title:50},
  land:{levelW:{1:0,2:0,3:9,4:4.75,5:3,6:1.8,7:0.6}, unknownW:0.4, roundK:0.15, winnerCap:35, titleShare:0.28, capBudget:35/1.28},
  supercup:{title:0.2},
  rechnerFloorW:0.12,
  curve:{fullUntil:4, midUntil:10, midStep:0.035, gentleUntil:20, gentleAt10:0.79, gentleStep:0.012, lateAt20:0.67, floorAt:50}
};
function ansehenRound2(x){ return Math.round((+x||0)*100)/100; }
function ageWeight(age){
  const a=Math.max(0, age|0);
  const c=ANSEHEN.curve;
  if (a<=c.fullUntil) return 1;
  if (a<=c.midUntil) return ansehenRound2(1-(a-c.fullUntil)*c.midStep);
  if (a<=c.gentleUntil) return ansehenRound2(c.gentleAt10-(a-c.midUntil)*c.gentleStep);
  if (a<c.floorAt){
    const span=c.floorAt-c.gentleUntil;
    return ansehenRound2(c.lateAt20-(c.lateAt20-ANSEHEN.rechnerFloorW)*((a-c.gentleUntil)/span));
  }
  return 0;
}
function meisterDurable(level){ return level===1; }
function titleFactor(age, durable){
  const a=Math.max(0, age|0);
  const raw=ansehenRound2(Math.max(0, 1-0.01*a));
  if (durable===false) return a>=100 ? 0 : raw;
  return ansehenRound2(Math.max(0.4, 1-0.01*a));
}
function titleNote(durable, rechner){
  const src=rechner?'Rechner-Titel':'historischer Titel';
  return durable
    ? src+' · 1 % des Ursprungswerts pro Jahr, ab Alter 60 bei 40 %'
    : src+' · 1 % des Ursprungswerts pro Jahr, ohne Boden, ab Alter 100 bei 0';
}
function ansehenAgeBase(end){
  const y=end==null?ansehenEndYear():(end|0);
  const ref=((S&&S.seasons)||[]).find(s=>s && seasonYear(s.name)===y);
  // Offene Saison zählt noch nicht. Die fünf jüngsten abgeschlossenen liegen dann bei Alter 1–5.
  if (ref && ref.status!=='done') return 1;
  return 0;
}
function seasonFactor(age, rechner, end){
  const a=Math.max(0, age|0);
  if (a>=50) return rechner ? ANSEHEN.rechnerFloorW : 0;
  const base=ansehenAgeBase(end);
  // Genau fünf abgeschlossene Saisons ×2, die nächsten fünf ×1,5.
  // Bei offener Saison ist Alter 0 die laufende Saison und liegt vor diesem Fenster.
  if (a>=base && a<=base+4) return 2;
  if (a>=base+5 && a<=base+9) return 1.5;
  return ageWeight(a);
}
function seasonWeightMark(age, end){
  const a=Math.max(0, age|0);
  const base=ansehenAgeBase(end);
  if (a>=base && a<=base+4) return '×2';
  if (a>=base+5 && a<=base+9) return '×1,5';
  return '';
}
function seasonPair(start){
  const y=start|0;
  return y+'/'+String((y+1)%100).padStart(2,'0');
}
function ansehenWeightText(end){
  const e=end==null?ansehenEndYear():(end|0);
  const base=ansehenAgeBase(e);
  const x2=seasonPair(e-(base+4))+'–'+seasonPair(e-base);
  const x15=seasonPair(e-(base+9))+'–'+seasonPair(e-(base+5));
  const old=seasonPair(e-(base+10));
  return '×2: '+x2+' · ×1,5: '+x15+' · ab '+old+': bisherige Kurve (Faktor je Saison in der Tabelle)';
}
function ansehenWeightLegend(end){
  const text=ansehenWeightText(end);
  const html=esc(text).replace('×2','<span class="w-mark">×2</span>').replace('×1,5','<span class="w-mark">×1,5</span>');
  return '<p class="an-weight">'+html+'</p>';
}
function formatFactor(f){
  if (f===2) return '×2';
  if (f===1.5) return '×1,5';
  return '×'+deNum(f, 2);
}
function rowSeasonFactor(row, end){
  const lines=(row.lines||[]).filter(l=>l.kind!=='titel');
  if (!lines.length) return seasonFactor(end-seasonYear(row.season), true, end);
  const liga=lines.find(l=>l.kind==='liga');
  return (liga||lines[0]).factor;
}
function leagueSample(level){ return LEAGUES.find(l=>l.level===level)||null; }
function zoneCounts(level, n, downOverride, upOverride){
  const sample=leagueSample(level);
  const nn=Math.max(1, n|0);
  let up=upOverride!=null?upOverride:(sample?(sample.up||0):0);
  let down=downOverride!=null?downOverride:(sample?(sample.down||0):0);
  up=Math.max(0, Math.min(up, nn-1));
  down=Math.max(0, Math.min(down, nn-up-1));
  return {n:nn, up, down, safeFirst:up+1, safeLast:nn-down};
}
function placeSpan(first, last, i, count){
  if (count<=1) return ansehenRound2(first);
  return ansehenRound2(first+(last-first)*i/(count-1));
}
function placePoints(level, n, place, downOverride, upOverride){
  const spec=ANSEHEN.levels[level];
  const z=zoneCounts(level, n, downOverride, upOverride);
  const pl=Math.min(Math.max(1, place|0), z.n);
  if (!spec || level>=7) return 0;
  if (z.n<=1) return ansehenRound2(level===1?spec.euroFirst:spec.safeFirst);
  const safeCount=z.safeLast-z.safeFirst+1;
  const safeAt=idx=>level===1
    ? placeSpan(spec.midFirst, spec.midLast, idx, safeCount)
    : placeSpan(spec.safeFirst, spec.safeLast, idx, safeCount);
  if (level===1){
    const euroN=Math.min(spec.euroUntil||7, z.safeLast);
    if (pl<=euroN) return placeSpan(spec.euroFirst, spec.euroLast, pl-1, euroN);
    if (pl<=z.safeLast) return placeSpan(spec.midFirst, spec.midLast, pl-euroN-1, z.safeLast-euroN);
  } else if (pl>=z.safeFirst && pl<=z.safeLast){
    return safeAt(pl-z.safeFirst);
  }
  if (pl<=z.up){
    const edge=ansehenRound2((level===1?spec.euroFirst:spec.safeFirst)*1.15);
    return ansehenRound2(edge+(z.up-pl)*(spec.promoStep||0));
  }
  const base=level===1?spec.midLast:spec.safeLast;
  const edge=ansehenRound2(base*0.9);
  return ansehenRound2(edge-(pl-z.safeLast-1)*(spec.relStep||0));
}
function euroRank(key){ return {CL:3,EL:2,UECL:1}[key]||0; }
function euroOf(level, place, eighth){
  if (level!==1) return null;
  if (place<=4) return {key:'CL', pts:ANSEHEN.euro.CL};
  if (place<=6) return {key:'EL', pts:ANSEHEN.euro.EL};
  if (place===7 || (place===8 && eighth)) return {key:'UECL', pts:ANSEHEN.euro.UECL};
  return null;
}
function dfbWon(id, season){
  try{
    const set=ensureAnsehenCaches().dfbWins.get(id);
    return !!(set && set.has(season));
  }catch(e){ return false; }
}
function euroClaim(src, level, place, id, season){
  if (src!=='rechner') return null;
  const eighth=level===1 ? eighthForSeason(season) : false;
  const league=euroOf(level, place, eighth);
  let key=league?league.key:null;
  const cup=dfbWon(id, season);
  if (cup && euroRank(key)<euroRank('UECL')) key='UECL';
  if (!key) return null;
  return {key, pts:ANSEHEN.euro[key]};
}
function landTitleOf(scale){
  if (!scale || scale.budget==null) return 0;
  return ansehenRound2(scale.budget*ANSEHEN.land.titleShare);
}
function dfbWinnerOf(season){
  if (!season) return '';
  const fin=season.cups&&season.cups.dfb?cupFinalists(season.cups.dfb):null;
  if (fin&&fin.winner) return fin.winner;
  const hist=(S.pokalHistory||[]).find(h=>h&&h.season===season.name&&h.dfb);
  if (hist&&hist.dfb) return hist.dfb;
  const run=asRun((S.pokalRuns||[]).find(r=>{ const o=asRun(r); return o&&o.comp==='dfb'&&o.won&&o.season===season.name; }));
  return run?run.id:'';
}
function blPlaceOf(season){
  const map={};
  try{ leagueTable(season,'BL').forEach(r=>{ if(r&&r.id) map[r.id]=r.pl; }); }catch(e){}
  return map;
}
function dfbEighthOpen(season){
  if (!season||!season.leagues||!season.leagues.BL) return false;
  const places=blPlaceOf(season);
  const top=id=>places[id]&&places[id]<=7;
  if (season.status==='done'||season.status==='ending'){
    const w=dfbWinnerOf(season);
    return !!(w&&top(w));
  }
  const cup=season.cups&&season.cups.dfb;
  if (!cup) return false;
  const alive=cupAliveSet(cup);
  if (!alive.size) return false;
  let ok=true;
  alive.forEach(id=>{ if(!top(id)) ok=false; });
  return ok;
}
function seasonEuroMarks(blTable, cupWinner){
  const marks={};
  const add=(id,x)=>{ if (!id) return; const a=marks[id]||(marks[id]=[]); if (a.indexOf(x)<0) a.push(x); };
  const top7={};
  (blTable||[]).forEach(r=>{ if (r&&r.pl<=7) top7[r.id]=1; });
  const inside=!!(cupWinner&&top7[cupWinner]);
  (blTable||[]).forEach(r=>{
    if (!r||!r.id) return;
    if (r.pl===1) add(r.id,'M');
    else if (r.pl<=4) add(r.id,'CL');
    else if (r.pl<=6) add(r.id,'EL');
    else if (r.pl===7 || (r.pl===8 && inside)) add(r.id,'UECL');
  });
  if (cupWinner){
    if (!top7[cupWinner]) add(cupWinner,'UECL');
    add(cupWinner,'P');
  }
  return marks;
}
function eighthForSeason(name){
  const caches=ensureAnsehenCaches();
  if (caches.eighth.has(name)) return caches.eighth.get(name);
  const season=caches.byName.get(name);
  const open=!!(season&&(season.status==='done'||season.status==='ending')&&dfbEighthOpen(season));
  caches.eighth.set(name, open);
  return open;
}
function sameSpielklasse(a, b){
  const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
  const left=norm(a&&a.liga), right=norm(b&&b.liga);
  return !!left && left===right;
}
function promotionsOf(id, end){
  const rows=collectPlacements(id).filter(p=>p&&p.season&&p.pl!=null&&seasonYear(p.season)<=end);
  rows.sort((a,b)=>seasonYear(a.season)-seasonYear(b.season));
  const found=[], seen={};
  for (let i=0;i<rows.length-1;i++){
    const a=rows[i], b=rows[i+1];
    if (seasonYear(b.season)!==seasonYear(a.season)+1) continue;
    if (a.ebene==null || b.ebene==null) continue;
    const from=a.ebene, to=b.ebene;
    if (!(to<from) || sameSpielklasse(a, b)) continue;
    found.push({season:a.season, to, from, src:a.src==='rechner'?'rechner':'historie', via:'chronik', gate:seasonYear(b.season)});
    seen[a.season]=1;
  }
  (ensureAnsehenCaches().promo.get(id)||[]).forEach(rec=>{
    if (seen[rec.season]||rec.year>end) return;
    if (rec.via==='move') found.push({season:rec.season, to:rec.to, from:rec.from, pl:rec.pl, n:rec.n, src:'rechner', via:'move'});
    else found.push({season:rec.season, to:rec.to, from:rec.from, src:'rechner', via:'pick'});
    seen[rec.season]=1;
  });
  return found;
}
function landWinnerTotal(budget){
  const b=ansehenRound2(budget);
  return ansehenRound2(b+ansehenRound2(b*ANSEHEN.land.titleShare));
}
function landBudgetForWinner(target){
  const cap=Math.round(ANSEHEN.land.capBudget*100);
  for (let c=1;c<=cap;c++) if (landWinnerTotal(c/100)===target) return c/100;
  return ansehenRound2(target/(1+ANSEHEN.land.titleShare));
}
function cappedLandBudget(raw){
  const limit=ANSEHEN.land.winnerCap;
  const mathCap=limit/(1+ANSEHEN.land.titleShare);
  const capped=Math.min(Math.max(0, +raw||0), mathCap);
  let cents=Math.round(capped*100);
  if (capped>=mathCap-1e-8) cents=Math.min(cents, Math.floor(mathCap*100+1e-6));
  while (cents>0 && landWinnerTotal(cents/100)>limit) cents--;
  return cents/100;
}
function finishLandScale(field, rounds, n, unknown, byLevel, opts){
  const names=(rounds||[]).filter(Boolean);
  const roundN=Math.max(1, names.length||1);
  const raw=(field/8)*(1+ANSEHEN.land.roundK*(roundN-1));
  let budget=cappedLandBudget(raw);
  if (!(opts && opts.noFloor) && landWinnerTotal(budget)<10) budget=landBudgetForWinner(10);
  const title=ansehenRound2(budget*ANSEHEN.land.titleShare);
  return {budget, title, rounds:names.slice(), n:n||0, field:ansehenRound2(field), unknown:unknown||0, byLevel:byLevel||{}};
}
function landWinnerSum(scale){
  if (!scale || scale.missing || !(scale.rounds||[]).length) return 0;
  const fin=landRoundPoints(scale, scale.rounds[scale.rounds.length-1]);
  return ansehenRound2(fin+landTitleOf(scale));
}
function landScaleFromStored(stored){
  const byLevel={};
  let field=0;
  Object.keys((stored&&stored.byLevel)||{}).forEach(k=>{
    const c=+stored.byLevel[k]||0;
    byLevel[k]=c;
    const w=ANSEHEN.land.levelW[k];
    field+=c*(w!=null?w:ANSEHEN.land.unknownW);
  });
  const unknown=+((stored&&stored.unknown)||0);
  field+=unknown*ANSEHEN.land.unknownW;
  const scale=finishLandScale(field, stored.rounds||[], stored.n||0, unknown, byLevel);
  scale.migrated=true;
  return scale;
}
function landAnsehenScale(ids, season, roundNames){
  const names=(roundNames||[]).filter(Boolean);
  let field=0, unknown=0;
  const byLevel={};
  (ids||[]).forEach(id=>{
    if (!TEAMS[id]){ unknown++; field+=ANSEHEN.land.unknownW; return; }
    let level=null;
    try{
      const lid=season?clubLeagueId(season, id):'';
      if (L[lid]) level=L[lid].level;
      else if (lid) level=7;
    }catch(e){ level=null; }
    if (level==null){ unknown++; field+=ANSEHEN.land.unknownW; return; }
    byLevel[level]=(byLevel[level]||0)+1;
    field+=ANSEHEN.land.levelW[level]!=null?ANSEHEN.land.levelW[level]:ANSEHEN.land.unknownW;
  });
  return finishLandScale(field, names, (ids||[]).length, unknown, byLevel);
}
function landRoundPoints(scale, roundName){
  if (!scale || scale.missing) return 0;
  const names=scale.rounds||[];
  const idx=names.indexOf(roundName);
  if (idx<0) return 0;
  return ansehenRound2(scale.budget*(idx+1)/Math.max(1, names.length));
}
function ageBand(age, end){
  const a=Math.max(0, age|0), c=ANSEHEN.curve;
  const base=ansehenAgeBase(end);
  if (a<base) return {id:'open', label:'Offene Saison', detail:'Alter 0 zählt nicht zu den fünf, Faktor der bisherigen Kurve', mark:''};
  if (a<=base+4) return {id:'full', label:'Letzte 5', detail:'fünf jüngste abgeschlossene Saisons, ×2', mark:'×2'};
  if (a<=base+9) return {id:'mid', label:'Jahre 6–10', detail:'×1,5', mark:'×1,5'};
  if (a<=c.gentleUntil) return {id:'gentle', label:'Ab der 11. Saison', detail:'bisherige Kurve, Alter '+a, mark:''};
  if (a<c.floorAt) return {id:'late', label:'22. bis 50. Saison', detail:'bisherige Kurve, Alter '+a, mark:''};
  return {id:'floor', label:'Ab Alter 50', detail:'Rechner bleibt bei 12 %, importierte Platzierungen sind 0', mark:''};
}
function landScaleOf(seasonName, bl){
  const caches=ensureAnsehenCaches();
  const key=String(seasonName)+'|'+String(bl||'');
  if (caches.land.has(key)) return caches.land.get(key);
  const scale=landScaleCompute(seasonName, bl, caches);
  if (scale && !scale.missing) caches.land.set(key, scale);
  return scale;
}
function landScaleCompute(seasonName, bl, caches){
  try{
    const season=caches.byName.get(seasonName)||null;
    const cup=season&&season.cups&&season.cups.land&&season.cups.land[bl];
    if (!cup) return {missing:true, reason:'Landespokal nicht gespeichert'};
    const stored=cup.ansehenScale;
    const names=(cup.roundNames&&cup.roundNames.length)?cup.roundNames:(cup.rounds||[]).map(r=>r&&r.name).filter(Boolean);
    const ids=cup.entrants||[];
    if (stored&&stored.byLevel&&Object.keys(stored.byLevel).length){
      const scale=landScaleFromStored(stored);
      if (!(scale.rounds||[]).length && names.length) scale.rounds=names.slice();
      return scale;
    }
    if (ids.length){
      const scale=landAnsehenScale(ids, season, names.length?names:((stored&&stored.rounds)||[]));
      if (!(stored&&stored.budget!=null)) cup.ansehenScale=scale;
      return scale;
    }
    if (stored&&stored.field!=null) return finishLandScale(stored.field, stored.rounds||names, stored.n||0, stored.unknown||0, stored.byLevel||{});
    return {missing:true, reason:'Teilnehmerfeld nicht gespeichert'};
  }catch(e){ return {missing:true, reason:'Teilnehmerfeld nicht lesbar'}; }
}
function ansehenEndYear(){
  try{
    const view=S&&S.seasons&&S.seasons[S.view];
    const vy=view?seasonYear(view.name):0;
    return vy||dataEndYear();
  }catch(e){ return dataEndYear(); }
}
function collectPlacements(id){
  const by={};
  try{
    historyEntries(id).forEach(r=>{
      if (!r||!r.season||r.pl==null) return;
      if (!by[r.season]||r.src==='rechner') by[r.season]=r;
    });
  }catch(e){}
  (ensureAnsehenCaches().fallback.get(id)||[]).forEach(row=>{
    if (!by[row.season]) by[row.season]={season:row.season, liga:row.liga, ebene:row.ebene, n:row.n, pl:row.pl, src:'rechner'};
  });
  return Object.keys(by).map(k=>by[k]);
}
function titelSeason(comp, year){
  const y=+year;
  const pair=(n)=> (n-1)+'/'+String(n).slice(-2);
  if (comp==='bl' || comp==='de') return pair(y);
  if (comp==='ddr') return (y>=1956 && y<=1960) ? String(y) : pair(y);
  if (comp==='fdgb') return [1949,1950,1955,1956,1957,1958,1959,1960].indexOf(y)>=0 ? String(y) : pair(y);
  if (comp==='dfb') return (y<=1943 || (y>=1956 && y<=1963)) ? String(y) : pair(y);
  return pair(y);
}
function titelLabel(comp){
  return {de:'Deutscher Meister', bl:'Meistertitel Bundesliga', ddr:'DDR-Meister', dfb:'DFB-Pokal-Titel', fdgb:'FDGB-Pokal-Titel'}[comp]||comp;
}
function titelGroup(comp){
  return {de:'Deutsche Meister vor der Bundesliga', bl:'Bundesliga', ddr:'DDR-Oberliga', dfb:'DFB-Pokal', fdgb:'FDGB-Pokal'}[comp]||comp;
}
function titelOriginalPoints(comp){
  return (comp==='dfb' || comp==='fdgb') ? ANSEHEN.dfb.title : ANSEHEN.levels[1].title;
}
function historicalTitleRows(){
  return (window.FR_TITEL && window.FR_TITEL.rows) || [];
}
function schauRows(){
  return (window.FR_SCHAU && window.FR_SCHAU.rows) || [];
}
function blockedClubNeedles(){
  const packs=[
    [82,66,32,76,101,105,112,122,105,103],
    [82,97,115,101,110,66,97,108,108,115,112,111,114,116],
    [70,67,32,83,97,99,104,115,101,110,32,76,101,105,112,122,105,103],
    [82,101,100,32,66,117,108,108,32,76,101,105,112,122,105,103]
  ];
  return packs.map(p=>String.fromCharCode.apply(null,p).toLowerCase());
}
function blockedClubHit(text){
  const s=String(text||'').toLowerCase();
  return blockedClubNeedles().some(n=>s.indexOf(n)>=0);
}
function schauEndYear(season){
  const s=String(season||'');
  const m=s.match(/^(\d{4})\/(\d{2})$/);
  if (m){ let end=Math.floor(+m[1]/100)*100+(+m[2]); if (end<=+m[1]) end+=100; return end; }
  if (/^\d{4}$/.test(s)) return +s;
  return null;
}
function schauAudit(){
  const fails=[];
  const seen={};
  schauRows().forEach(r=>{
    if (!r) return;
    if (r.comp==='sc'){ if (r.ansehen!==false) fails.push('Supercup-Ansehen '+r.year); }
    else if (r.ansehen!==true) fails.push('Landespokal-Ansehen '+r.comp+' '+r.year);
    if (!(r.year<=2026)) fails.push('Jahr '+r.year+' '+(r.cupName||r.land||r.comp));
    if (schauEndYear(r.season)!==r.year) fails.push('Saison '+r.season+' '+r.year);
    const key=(r.comp==='sc'?'sc':(r.assign?('land:'+r.land):(r.cupName||r.comp)))+'|'+r.year;
    if (seen[key]) fails.push('doppelt '+key);
    seen[key]=1;
    if (reserveName(r.original||'')) fails.push('zweite '+(r.original||''));
  });
  return fails;
}
const ANSEHEN_HIST_COMP={de:1, bl:1, ddr:1, dfb:1, fdgb:1};
function histLandScale(){
  if (histLandScale.cached) return histLandScale.cached;
  const rounds=['Vorrunde','Sechzehntelfinale','Achtelfinale','Viertelfinale','Halbfinale','Finale'];
  const n=32;
  const field=n*ANSEHEN.land.unknownW;
  histLandScale.cached=finishLandScale(field, rounds, n, n, {}, {noFloor:true});
  return histLandScale.cached;
}
function applySchauLandTitles(id, end, lines, push){
  const scale=histLandScale();
  const original=landTitleOf(scale);
  schauRows().forEach(r=>{
    if (!r || r.id!==id || r.ansehen!==true || (r.comp!=='land' && r.comp!=='verband')) return;
    const season=String(r.season||r.year||'');
    const y=seasonYear(season)||r.year||0;
    if (!y || y>end) return;
    const label=r.assign?('Landespokal-Titel '+(r.land||'')):('Landespokal-Titel '+(r.cupName||''));
    if (lines.some(l=>l && l.kind==='titel' && l.season===season && l.label===label)) return;
    const age=end-y;
    push({season, src:'historie', kind:'titel', durable:true, label, original, age, factor:titleFactor(age, true), note:titleNote(true, false)+' · historischer Landespokal, Feld nicht gespeichert: 32 Teilnehmer ohne bekannte Liga, sechs Runden, dieselbe Titelquote', factorKind:'title'});
  });
}
function applyHistoricalTitles(id, end, lines, push){
  historicalTitleRows().forEach(r=>{
    if (!r || r.id!==id || !ANSEHEN_HIST_COMP[r.comp]) return;
    const season=titelSeason(r.comp, r.year);
    const y=seasonYear(season);
    if (!y || y>end) return;
    const label=titelLabel(r.comp);
    const already=lines.some(l=>l.kind==='titel' && l.season===season && l.label===label);
    if (already) return;
    const age=end-y;
    const original=titelOriginalPoints(r.comp);
    const who=r.original && TEAMS[id] && r.original!==TEAMS[id].name ? ' · damals '+r.original : '';
    push({season, src:'historie', kind:'titel', durable:true, histKey:r.comp+'|'+r.year, label, original, age, factor:titleFactor(age, true), note:titleNote(true, false)+who+(r.note?' · '+r.note:'')});
  });
}
function ansehenLedger(id, endYear){
  const end=endYear||ansehenEndYear();
  if (!TEAMS[id]) return {end, lines:[], value:0};
  const caches=ensureAnsehenCaches();
  if (!caches.raw) caches.raw=new Map();
  let raw=caches.raw.get(id);
  if (!raw){ raw=assembleAnsehenRaw(id); caches.raw.set(id, raw); }
  return projectAnsehen(raw, end);
}
function projectAnsehen(raw, end){
  const lines=[];
  raw.forEach(src=>{
    if (!src || !(src.year>0) || src.year>end || (src.gate>end)) return;
    const age=end-src.year;
    const rechner=src.rechner!==false;
    let factor=0;
    if (src.factorKind==='title') factor=titleFactor(age, src.durable!==false);
    else if (src.factorKind==='season') factor=seasonFactor(age, rechner, end);
    const note=src.noteKind==='liga'
      ? (age>=50?(rechner?'Rechner-Saison, dauerhafter Grundwert':'importierte Historie, älter als 50 Jahre'):(rechner?'im Rechner gespielt':'importierte Historie'))
      : src.note;
    const line={season:src.season, src:src.origin, kind:src.kind, label:src.label, original:src.original, age, factor, note, today:ansehenRound2((src.original||0)*factor)};
    if (src.durable!=null) line.durable=src.durable;
    if (src.histKey) line.histKey=src.histKey;
    lines.push(line);
  });
  lines.sort((a,b)=>a.season===b.season?(a.kind===b.kind?0:(a.kind==='liga'?-1:1)):(a.season<b.season?1:-1));
  const value=ansehenRound2(lines.reduce((s,l)=>s+(l.today||0),0));
  return {end, lines, value};
}
function assembleAnsehenRaw(id){
  const end=1000000;
  const lines=[];
  const push=line=>{
    const year=seasonYear(line.season);
    lines.push({year, gate:line.gate||year, factorKind:line.factorKind||'season', rechner:line.src!=='historie', origin:line.src, kind:line.kind, season:line.season, label:line.label, original:line.original, note:line.note, noteKind:line.noteKind||'', durable:line.durable, histKey:line.histKey});
  };
  if (TEAMS[id]){
    collectPlacements(id).forEach(p=>{
      if (!p || p.live || p.pl==null) return;
      const y=seasonYear(p.season);
      if (!y||y>end) return;
      const age=end-y;
      const stored=p.ebene||0;
      const rechner=p.src==='rechner';
      // Import: 5 Regionalliga, 6 Oberliga, 7 Amateur. Dieselben Nummern wie die Ligen.
      const level=stored;
      const spec=ANSEHEN.levels[level];
      if (!spec || level>=7) return;
      const factor=seasonFactor(age, rechner);
      let down=null, up=null;
      if (rechner){
        const sea=ensureAnsehenCaches().byName.get(p.season);
        const lg=LEAGUES.find(l=>l.name===p.liga);
        if (sea&&sea.endData&&sea.endData.downOf&&lg&&sea.endData.downOf[lg.id]!=null) down=sea.endData.downOf[lg.id];
        if (sea&&sea.endData&&sea.endData.upOf&&lg&&sea.endData.upOf[lg.id]!=null) up=sea.endData.upOf[lg.id];
      } else if (stored===5){
        up=1; down=2;
      } else if (stored===6){
        up=2; down=0;
      }
      const nn=p.n||(leagueSample(level)&&leagueSample(level).size)||18;
      const note=age>=50?(rechner?'Rechner-Saison, dauerhafter Grundwert':'importierte Historie, älter als 50 Jahre'):(rechner?'im Rechner gespielt':'importierte Historie');
      push({season:p.season, src:rechner?'rechner':'historie', kind:'liga', label:(p.liga||'Liga')+' '+p.pl+'.'+(p.n?'/'+p.n:''), original:placePoints(level, nn, p.pl, down, up), age, factor, note, factorKind:'season', noteKind:'liga'});
      if (p.pl===1 && level===1 && spec.title){
        push({season:p.season, src:rechner?'rechner':'historie', kind:'titel', durable:true, label:'Meistertitel '+(p.liga||''), original:spec.title, age, factor:titleFactor(age, true), note:titleNote(true, rechner), factorKind:'title'});
      }
      const euro=euroClaim(rechner?'rechner':'historie', level, p.pl, id, p.season);
      if (euro) push({season:p.season, src:'rechner', kind:'euro', label:'Qualifikation '+euro.key, original:euro.pts, age, factor, note:'Rechner-Regel: Bundesliga 1–4 CL, 5–6 EL, 7 UECL. Platz 8 UECL, wenn der Pokalsieger in den Top 7 steht. Sonst bekommt der Sieger selbst UECL. Nur der höchste Wettbewerb.', factorKind:'season'});
    });
    let runs=[];
    try{ runs=runsById(id)||[]; }catch(e){ runs=[]; }
    const dfbBest={}, landBest={};
    runs.forEach(r=>{
      if (!r||!r.season||seasonYear(r.season)>end) return;
      if (r.comp==='dfb'){
        const pts=ANSEHEN.dfb[r.round];
        if (pts==null) return;
        const prev=dfbBest[r.season];
        if (!prev||pts>prev.pts||(pts===prev.pts&&r.won&&!prev.won)) dfbBest[r.season]={round:r.round, pts, won:!!r.won};
      } else if (r.comp==='land'){
        const key=r.season+'|'+(r.bl||'');
        const rank=roundRank(r.round);
        const prev=landBest[key];
        if (!prev||rank>prev.rank||(rank===prev.rank&&r.won&&!prev.won)) landBest[key]={season:r.season, bl:r.bl||'', round:r.round||'', won:!!r.won, rank};
      }
    });
    Object.keys(dfbBest).forEach(season=>{
      const r=dfbBest[season];
      const age=end-seasonYear(season);
      const factor=seasonFactor(age, true);
      push({season, src:'rechner', kind:'dfb', label:'DFB-Pokal '+r.round, original:r.pts, age, factor, note:'erreichte Runde, nicht kumuliert', factorKind:'season'});
      if (r.won){
        push({season, src:'rechner', kind:'titel', durable:true, label:'DFB-Pokal-Titel', original:ANSEHEN.dfb.title, age, factor:titleFactor(age, true), note:titleNote(true, true), factorKind:'title'});
        const hasEuro=lines.some(l=>l.kind==='euro' && l.season===season);
        const sea=ensureAnsehenCaches().byName.get(season);
        const closed=!sea || sea.status==='done' || sea.status==='ending';
        if (!hasEuro && closed) push({season, src:'rechner', kind:'euro', label:'Qualifikation UECL', original:ANSEHEN.euro.UECL, age, factor, note:'DFB-Pokalsieger ohne höheren Ligaplatz, auch außerhalb der Bundesliga. Keine erfundene Ligaplatzierung.', factorKind:'season'});
      }
    });
    Object.keys(landBest).forEach(key=>{
      const r=landBest[key];
      const age=end-seasonYear(r.season);
      const scale=landScaleOf(r.season, r.bl);
      const reached=landRoundPoints(scale, r.round);
      const title=landTitleOf(scale);
      const note=scale.missing?(scale.reason||'Teilnehmerfeld nicht gespeichert'):('Feld '+scale.n+' Vereine, '+((scale.rounds||[]).length)+' Runden, Feldwert '+deNum(scale.field,1)+(scale.unknown?' · '+scale.unknown+' ohne Liga':''));
      push({season:r.season, src:'rechner', kind:'land', label:'Landespokal '+(r.bl||'')+' '+r.round, original:reached, age, factor:scale.missing?0:seasonFactor(age, true), note, factorKind:scale.missing?'zero':'season'});
      if (r.won&&!scale.missing) push({season:r.season, src:'rechner', kind:'titel', durable:true, label:'Landespokal-Titel '+(r.bl||''), original:title, age, factor:titleFactor(age, true), note:titleNote(true, true), factorKind:'title'});
    });
    (ensureAnsehenCaches().supercup.get(id)||[]).forEach(season=>{
      if (seasonYear(season.name)>end) return;
      const age=end-seasonYear(season.name);
      push({season:season.name, src:'rechner', kind:'titel', durable:true, label:'Supercup-Titel', original:ANSEHEN.supercup.title, age, factor:titleFactor(age, true), note:titleNote(true, true), factorKind:'title'});
    });
    promotionsOf(id, end).forEach(p=>{
      if (lines.some(l=>l.season===p.season && l.kind==='liga')) return;
      const age=end-seasonYear(p.season);
      const rechner=p.src==='rechner';
      const factor=seasonFactor(age, rechner);
      if (p.from>=7){
        push({season:p.season, src:rechner?'rechner':'historie', kind:'liga', label:'Aufstieg aus der Amateurliga', original:ANSEHEN.amateurUp, age, factor, note:'Einmal 4 Ligapunkte für den belegten Aufstieg. Kein weiterer Bonus und kein Meistertitel. Wer nicht aufsteigt, hat keine Amateur-Platzierung.', factorKind:'season', gate:p.gate||seasonYear(p.season)});
        return;
      }
      if (p.via==='move' && p.pl && p.from && ANSEHEN.levels[p.from]){
        const nn=p.n||(leagueSample(p.from)&&leagueSample(p.from).size)||18;
        const names=LEVEL_NAME;
        push({season:p.season, src:'rechner', kind:'liga', label:(names[p.from]||'Liga')+' '+p.pl+'.'+(nn?'/'+nn:''), original:placePoints(p.from, nn, p.pl), age, factor, note:'Ligaplatz der abgeschlossenen Saison. Ein Aufstiegsplatz enthält die 15 Prozent. Keine zweite Aufstiegszeile.', factorKind:'season', gate:p.gate||seasonYear(p.season)});
      }
    });
    applyHistoricalTitles(id, end, lines, (line)=>{ line.factorKind='title'; push(line); });
    applySchauLandTitles(id, end, lines, push);
  }
  return lines;
}
function ansehenInfo(id, endYear){
  const end=endYear||ansehenEndYear();
  if (infoMemoGen!==ansehenGen){ infoMemo.clear(); infoMemoGen=ansehenGen; }
  const key=id+'|'+end;
  let v=infoMemo.get(key);
  if (!v){ v=ansehenLedger(id, end); infoMemo.set(key, v); }
  return v;
}
function ansehenValue(id){
  const tr=window.FR_TIMING;
  const t0=tr?performance.now():0;
  if (ansehenMemoGen!==ansehenGen){ ansehenMemo.clear(); ansehenMemoGen=ansehenGen; }
  if (!TEAMS[id]) return 0;
  const end=ansehenEndYear();
  const key=id+'|'+end;
  let v=ansehenMemo.get(key);
  if (v==null){ v=ansehenInfo(id, end).value; ansehenMemo.set(key, v); infoMemo.delete(key); }
  if (tr){ tr.ansehenMs+=performance.now()-t0; tr.ansehenN++; }
  return v;
}

window.FR_AN={S:S, value:ansehenValue, info:ansehenInfo, touch:touchAnsehen, end:ansehenEndYear, base:ansehenAgeBase};
})();
