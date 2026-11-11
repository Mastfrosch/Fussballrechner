/* Fußballrechner – offline Web-App (keine Server nötig). Alle Daten in localStorage. */
(function(){
'use strict';

// ---------- Stammdaten ----------
const TEAMS = {};
window.FR_TEAMS.forEach(t => { TEAMS[t[0]] = {id:t[0], name:t[1], bl:t[2], rang:t[3], crest:'wappen/'+t[4]}; });

// Nordost: die Länder von Regionalliga Nord und Ost. Südwest: Süd und West. Die Listen sind 1:1 dieselben.
const RL_STATES = {
  RLN:['Bremen','Niedersachsen','Hamburg','Schleswig-Holstein','Mecklenburg-Vorpommern'],
  RLO:['Berlin','Brandenburg','Sachsen-Anhalt','Sachsen','Thüringen'],
  RLS:['Bayern','Baden-Württemberg'],
  RLW:['Nordrhein-Westfalen','Hessen','Rheinland-Pfalz','Saarland']
};
const L5_FEED = [
  {id:'L5NO', rls:['RLN','RLO']},
  {id:'L5SW', rls:['RLS','RLW']}
];
const BL_RL = {};
const BL_L5 = {};
const BL_POOL = {
  'Schleswig-Holstein':'AMSH','Hamburg':'AMHH','Mecklenburg-Vorpommern':'AMMV','Bremen':'AMHB','Niedersachsen':'AMNI',
  'Berlin':'AMBE','Brandenburg':'AMBB','Sachsen-Anhalt':'AMST','Sachsen':'AMSN','Thüringen':'AMTH',
  'Nordrhein-Westfalen':'AMNW','Hessen':'AMHE','Rheinland-Pfalz':'AMRP','Saarland':'AMSL','Baden-Württemberg':'AMBW','Bayern':'AMBY'
};
L5_FEED.forEach(feed=>feed.rls.forEach(rl=>(RL_STATES[rl]||[]).forEach(bl=>{ BL_RL[bl]=rl; BL_L5[bl]=feed.id; })));

// level, size, up, down, upTo
// 4. Liga: 20 Teams, 3 Aufsteiger, 4 Absteiger, Terminierung wie die 3. Liga.
// 5. Liga: 22 Teams, Plätze 1 und 2 fest hoch, 2 feste Absteiger plus Ausgleich.
// Regionalliga: nur der Meister steigt auf. 2 feste Absteiger plus Ausgleich.
const LEAGUES = [
  {id:'BL',  name:'Bundesliga',            short:'BL',         level:1, size:20, up:0, down:3},
  {id:'BL2', name:'2. Bundesliga',         short:'2. BL',      level:2, size:20, up:3, down:3, upTo:'BL'},
  {id:'L3',  name:'3. Liga',               short:'3. Liga',    level:3, size:20, up:3, down:3, upTo:'BL2'},
  {id:'L4',  name:'4. Liga',               short:'4. Liga',    level:4, size:20, up:3, down:4, upTo:'L3'},
  {id:'L5NO',name:'5. Liga Nordost',       short:'5. Liga NO', level:5, size:22, up:2, down:2, upTo:'L4'},
  {id:'L5SW',name:'5. Liga Südwest',       short:'5. Liga SW', level:5, size:22, up:2, down:2, upTo:'L4'},
  {id:'RLN', name:'Regionalliga Nord',     short:'RL Nord',    level:6, size:18, up:1, down:2, upTo:'L5NO'},
  {id:'RLO', name:'Regionalliga Ost',      short:'RL Ost',     level:6, size:18, up:1, down:2, upTo:'L5NO'},
  {id:'RLS', name:'Regionalliga Süd',      short:'RL Süd',     level:6, size:18, up:1, down:2, upTo:'L5SW'},
  {id:'RLW', name:'Regionalliga West',     short:'RL West',    level:6, size:18, up:1, down:2, upTo:'L5SW'}
];
const POOLS = Object.keys(BL_POOL).map(bl=>({id:BL_POOL[bl], name:'Amateurliga '+bl, bl, rl:BL_RL[bl], desc:bl}));
const L = {}; LEAGUES.forEach(l => L[l.id] = l);
const P = {}; POOLS.forEach(p => P[p.id] = p);
const LEVEL_NAME = {1:'Bundesliga',2:'2. Bundesliga',3:'3. Liga',4:'4. Liga',5:'5. Liga',6:'Regionalliga',7:'Amateurliga'};

function homeLeague(id, level){
  const bl = TEAMS[id] ? TEAMS[id].bl : '';
  if (level >= 7) return BL_POOL[bl] || 'AMBY';
  if (level === 6) return BL_RL[bl] || 'RLW';
  if (level === 5) return BL_L5[bl] || 'L5SW';
  return {1:'BL',2:'BL2',3:'L3',4:'L4'}[level];
}
function leagueName(id){ return L[id] ? L[id].name : id==='RL' ? 'Regionalliga' : id==='L5' ? '5. Liga' : P[id] ? P[id].name : id; }
function leagueShort(id){ return L[id] ? L[id].short : id==='RL' ? 'Regionalliga' : id==='L5' ? '5. Liga' : P[id] ? 'Amateur' : id; }

// ---------- Hilfen ----------
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.remove('hidden'); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.add('hidden'),2600); }
function nextSeasonName(n){ const y=parseInt(n.slice(0,4),10)+1; return y+'/'+String((y+1)%100).padStart(2,'0'); }
function byRang(a,b){ return (TEAMS[a].rang||99999)-(TEAMS[b].rang||99999) || TEAMS[a].name.localeCompare(TEAMS[b].name,'de'); }
function deNum(x, digits){ return (x==null||!isFinite(x)?'–':Number(x).toFixed(digits).replace('.',',')); }
function seasonYear(name){ return parseInt(String(name).slice(0,4),10)||0; }

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
function touchAnsehen(){ ansehenGen++; ansehenMemo.clear(); infoMemo.clear(); endYearCache=0; orderCacheIds=null; ansehenCaches=null; }
function ensureAnsehenCaches(){
  const seasons=S.seasons||[];
  const runs=S.pokalRuns||[];
  if (ansehenCaches && ansehenCaches.gen===ansehenGen && ansehenCaches.seasons===seasons && ansehenCaches.n===seasons.length && ansehenCaches.runs===runs && ansehenCaches.rn===runs.length) return ansehenCaches;
  const byName=new Map();
  const fallback=new Map();
  const promo=new Map();
  const supercup=new Map();
  const dfbWins=new Map();
  (S.pokalRuns||[]).forEach(r=>{
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
// ---------- Ansehen = Vereinserfolg, nicht Spielstärke ----------
// Punkteskala, Alterskurve und Titelregel. Reine Funktion der gespeicherten
// Platzierungen und Pokalrunden, nichts wird aufsummiert in den Spielstand geschrieben.
const ANSEHEN = {
  levels:{
    1:{title:180, euroUntil:7, euroFirst:420, euroLast:360, midFirst:336, midLast:300, relStep:4},
    2:{title:0, safeFirst:200, safeLast:174, promoStep:6, relStep:2},
    3:{title:0, safeFirst:112, safeLast:86, promoStep:4, relStep:2},
    4:{title:0, safeFirst:52, safeLast:38, promoStep:2, relStep:1},
    5:{title:0, safeFirst:22, safeLast:16.4, promoStep:0, relStep:0.4},
    6:{title:0, safeFirst:8, safeLast:6.5, promoStep:0.4, relStep:0.2}
  },
  amateurUp:4,
  euro:{CL:175,EL:130,UECL:90},
  dfb:{'1. Runde':40,'2. Runde':60,'Achtelfinale':80,'Viertelfinale':110,'Halbfinale':140,'Finale':170,title:50},
  land:{levelW:{1:0,2:0,3:9,4:6.5,5:3,6:1.8,7:0.6}, unknownW:0.4, roundK:0.15, winnerCap:35, titleShare:0.28, capBudget:35/1.28},
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
function seasonFactor(age, rechner){
  const a=Math.max(0, age|0);
  if (a>=50) return rechner ? ANSEHEN.rechnerFloorW : 0;
  return ageWeight(a);
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
  const run=(S.pokalRuns||[]).find(r=>r&&r.comp==='dfb'&&r.won&&r.season===season.name);
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
function ageBand(age){
  const a=Math.max(0, age|0), c=ANSEHEN.curve;
  if (a<=c.fullUntil) return {id:'full', label:'Letzte 5', detail:'Alter 0–4, Faktor 1'};
  if (a<=c.midUntil) return {id:'mid', label:'6. bis 11. Saison', detail:'Alter 5–10'};
  if (a<=c.gentleUntil) return {id:'gentle', label:'12. bis 21. Saison', detail:'Alter 11–20'};
  if (a<c.floorAt) return {id:'late', label:'22. bis 50. Saison', detail:'Alter 21–49'};
  return {id:'floor', label:'Ab Alter 50', detail:'Rechner bleibt bei 12 %, importierte Platzierungen sind 0'};
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
    if (/Amateure|\bU23\b|\bII\b|Reserve/i.test(r.original||'')) fails.push('zweite '+(r.original||''));
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
    else if (src.factorKind==='season') factor=seasonFactor(age, rechner);
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
      const level=p.ebene||0;
      const spec=ANSEHEN.levels[level];
      if (!spec || level>=7) return;
      const rechner=p.src==='rechner';
      const factor=seasonFactor(age, rechner);
      let down=null, up=null;
      if (rechner){
        const sea=ensureAnsehenCaches().byName.get(p.season);
        const lg=LEAGUES.find(l=>l.name===p.liga);
        if (sea&&sea.endData&&sea.endData.downOf&&lg&&sea.endData.downOf[lg.id]!=null) down=sea.endData.downOf[lg.id];
      } else if (level===5){
        // Importierte Ebene 5 ist die damalige Regionalliga, nicht die neue 5. Liga.
        up=1; down=2;
      } else if (level===6){
        // Importierte Ebene 6 ist die damalige Oberliga: zwei Aufsteiger, kein fester Abstieg.
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
  if (v==null){ v=ansehenInfo(id, end).value; ansehenMemo.set(key, v); }
  if (tr){ tr.ansehenMs+=performance.now()-t0; tr.ansehenN++; }
  return v;
}
function ansehenSelfTest(){
  const navMuteWas=navMute; navMute++;
  const fails=[];
  try{ return ansehenSelfTestBody(fails); }
  finally{ navMute=navMuteWas; }
}
function ansehenSelfTestBody(fails){
  const check=(name, ok, extra)=>{ if(!ok) fails.push(name+(extra?' · '+extra:'')); };
  let geoProof=null;
  let worstLeague={gap:Infinity, age:-1, lv:0, champ:0, last:0};
  const sizeOfLevel=lv=>{ const s=leagueSample(lv); return s?s.size:18; };
  for (let age=0; age<=150; age++){
    const w=seasonFactor(age, true);
    for (let lv=2; lv<=6; lv++){
      const champ=ansehenRound2(placePoints(lv, sizeOfLevel(lv), 1)*w);
      const aboveN=sizeOfLevel(lv-1);
      const last=ansehenRound2(placePoints(lv-1, aboveN, aboveN)*w);
      const gap=ansehenRound2(last-champ);
      if (gap<worstLeague.gap) worstLeague={gap, age, lv, champ, last};
    }
    const am=ansehenRound2(ANSEHEN.amateurUp*w);
    const olLast=ansehenRound2(placePoints(6, 18, 18, 7)*w);
    const gapAm=ansehenRound2(olLast-am);
    if (gapAm<worstLeague.gap) worstLeague={gap:gapAm, age, lv:7, champ:am, last:olLast};
  }
  check('Ligahierarchie jedes Rechner-Alter 0–150', worstLeague.gap>0, 'knapp Stufe '+worstLeague.lv+' Alter '+worstLeague.age+' Rest '+worstLeague.gap+' ('+worstLeague.champ+' gegen '+worstLeague.last+')');
  const bl1=placePoints(1,20,1)+ANSEHEN.levels[1].title, bl2=placePoints(1,20,2);
  check('BL-Meister deutlich vor Platz 2', bl1>bl2+150, bl1+' gegen '+bl2);
  let worstBl={ratio:Infinity, age:-1, meister:0, p2:0};
  for (let age=0; age<=150; age++){
    const w=seasonFactor(age, true), tf=titleFactor(age);
    const meister=ansehenRound2(placePoints(1,20,1)*w)+ansehenRound2(ANSEHEN.levels[1].title*tf);
    const p2=ansehenRound2(bl2*w);
    const ratio=p2>0?meister/p2:Infinity;
    if (ratio<worstBl.ratio) worstBl={ratio, age, meister, p2};
  }
  check('BL-Meister bleibt vor Platz 2', worstBl.meister>worstBl.p2 && worstBl.ratio>1.25, 'knapp Alter '+worstBl.age+' '+worstBl.meister+' gegen '+worstBl.p2);
  check('Alter 5 > 6', ageWeight(5)>ageWeight(6));
  check('Alter 10 > 11', ageWeight(10)>ageWeight(11));
  check('Alter 20 > 21', ageWeight(20)>ageWeight(21));
  check('Anker Alter 10', ageWeight(10)===ANSEHEN.curve.gentleAt10);
  check('Anker Alter 20', ageWeight(20)===ANSEHEN.curve.lateAt20);
  check('kein Sprung 10/11', ageWeight(10)-ageWeight(11)<0.03);
  check('kein Sprung 20/21', ageWeight(20)-ageWeight(21)<0.03);
  let maxLate=0, maxLateAt=0, rose=false;
  for (let age=0; age<150; age++){
    const d=ansehenRound2(seasonFactor(age, true)-seasonFactor(age+1, true));
    if (d<0) rose=true;
    if (age>=20 && d>maxLate){ maxLate=d; maxLateAt=age; }
  }
  check('Rechner-Kurve fällt nicht wieder', !rose);
  check('kein Sprung 49/50', ansehenRound2(seasonFactor(49, true)-seasonFactor(50, true))<=0.03 && seasonFactor(49, true)>seasonFactor(50, true), seasonFactor(49,true)+' → '+seasonFactor(50,true));
  check('später Abfall bleibt ein Jahresschritt', maxLate<=0.03, 'Alter '+maxLateAt+' Schritt '+maxLate);
  const slopeEarly=(seasonFactor(10, true)-seasonFactor(20, true))/10;
  const slopeLate=(seasonFactor(20, true)-seasonFactor(50, true))/30;
  check('ab 21 stärker als 11–20', slopeLate>slopeEarly, slopeLate+' gegen '+slopeEarly);
  check('Alter 50 Historie raus', ageWeight(50)===0 && seasonFactor(50, false)===0);
  check('Alter 51 und 150 Historie raus', seasonFactor(51, false)===0 && seasonFactor(150, false)===0);
  check('Rechner 50 bis 150 bleibt Grundwert', seasonFactor(50, true)===ANSEHEN.rechnerFloorW && seasonFactor(51, true)===ANSEHEN.rechnerFloorW && seasonFactor(150, true)===ANSEHEN.rechnerFloorW);
  [0,1,59,60,99,100,150].forEach(age=>{
    const big=titleFactor(age, true), low=titleFactor(age, false);
    const raw=ansehenRound2(Math.max(0, 1-0.01*age));
    check('großer Titel Alter '+age, big===(age>=60?0.4:raw), String(big));
    check('unterer Meistertitel Alter '+age, low===(age>=100?0:raw), String(low));
  });
  check('Bundesliga-Meistertitel hat Boden', meisterDurable(1) && !meisterDurable(2) && !meisterDurable(7));
  check('Titel 0', titleFactor(0)===1);
  check('Titel 60 bleibt 40 %', titleFactor(60)===0.4 && titleFactor(150)===0.4);
  const landCap=finishLandScale(400*ANSEHEN.land.levelW[3], ['1','2','3','4','5','6','7','8'], 400, 0, {3:400});
  const landCapSum=landWinnerSum(landCap);
  let centOk=true, centBad='';
  for (let c=0;c<=2735;c++){
    const total=landWinnerTotal(c/100);
    if (c<=2734 && total>35){ centOk=false; centBad=c+' → '+total; break; }
    if (c===2735 && !(total>35)){ centOk=false; centBad='2735 bleibt '+total; break; }
  }
  check('Landespokalsieger bleibt bei höchstens 35', landCap.budget===27.34 && landCapSum===35 && centOk && Math.abs(ANSEHEN.land.capBudget-35/1.28)<1e-12, landCap.budget+'/'+landCapSum+'/'+centBad);
  check('3. und 4. Liga wiegen im Landespokal mehr', ANSEHEN.land.levelW[3]>6 && ANSEHEN.land.levelW[4]>4.5, ANSEHEN.land.levelW[3]+'/'+ANSEHEN.land.levelW[4]);
  const dfbRounds=['1. Runde','2. Runde','Achtelfinale','Viertelfinale','Halbfinale','Finale'];
  let dfbRise=true;
  for (let i=1;i<dfbRounds.length;i++) if (!(ANSEHEN.dfb[dfbRounds[i]]>ANSEHEN.dfb[dfbRounds[i-1]])) dfbRise=false;
  check('DFB-Runden sind die erreichte Runde und der Sieger hat 220', dfbRise && ANSEHEN.dfb['1. Runde']===40 && ANSEHEN.dfb['2. Runde']===60 && ANSEHEN.dfb.Finale===170 && ANSEHEN.dfb.title===50 && ANSEHEN.dfb.Finale+ANSEHEN.dfb.title===220);
  const allIds=Object.keys(TEAMS);
  const slice=(from,n)=>allIds.slice(from, from+n);
  const fake=(pairs)=>{
    const leagues={}, pools={};
    pairs.forEach(([lid, ids])=>{ if (L[lid]) leagues[lid]={teams:ids}; else pools[lid]=ids; });
    return {leagues, pools};
  };
  const bayern=fake([['L3', slice(0,4)],['L4', slice(4,8)],['RLS', slice(12,10)],['L5SW', slice(22,12)],['AMBY', slice(34,20)]]);
  const bremen=fake([['AMHB', slice(80,16)]]);
  const bIds=[].concat(bayern.leagues.L3.teams, bayern.leagues.L4.teams, bayern.leagues.RLS.teams, bayern.leagues.L5SW.teams, bayern.pools.AMBY);
  const bScale=landAnsehenScale(bIds, bayern, ['Vorrunde','Sechzehntelfinale','Achtelfinale','Viertelfinale','Halbfinale','Finale']);
  const rScale=landAnsehenScale(bremen.pools.AMHB, bremen, ['Achtelfinale','Viertelfinale','Halbfinale','Finale']);
  check('Bayern-Feld wertvoller als Bremen-Feld', bScale.budget>rScale.budget*2, bScale.budget+' gegen '+rScale.budget);
  const roundPts=(scale, name)=>ansehenRound2(scale.budget*((scale.rounds.indexOf(name)+1)/scale.rounds.length));
  check('Freilos gleiche Runde', roundPts(bScale,'Achtelfinale')===roundPts(bScale,'Achtelfinale'));
  const euro1=euroOf(1,1), euro4=euroOf(1,4), euro5=euroOf(1,5), euro7=euroOf(1,7), euro8=euroOf(1,8);
  check('CL vor EL vor UECL', euro1.pts===175 && euro5.pts===130 && euro7.pts===90 && euro1.key==='CL' && euro4.key==='CL' && !euro8);
  check('Landespokale bleiben abgestuft und höchstens 35', landWinnerSum(bScale)<=35 && landWinnerSum(rScale)<=35 && landWinnerSum(bScale)>landWinnerSum(rScale), landWinnerSum(bScale)+'/'+landWinnerSum(rScale));
  const openLand=cur()&&cur().cups&&cur().cups.land;
  if (openLand){
    const sums=BL_ORDER.map(bl=>openLand[bl]?landWinnerSum(landScaleOf(cur().name, bl)):null).filter(v=>v!=null);
    const uniq=new Set(sums.map(String));
    check('alle geöffneten Landespokale liegen zwischen 10 und 35', sums.length===BL_ORDER.length && uniq.size>1 && sums.every(v=>v>=10 && v<=35), sums.join(' · '));
  }
  const a=ansehenLedger('t001'), b=ansehenLedger('t001');
  const sum=ansehenRound2(a.lines.reduce((s,l)=>s+l.today,0));
  check('Summe der Übersicht', a.value===sum && a.value===b.value, a.value+' gegen '+sum);
  check('zweiter Aufruf identisch', a.value===ansehenLedger('t001').value);
  const histBefore=historyEntries('t001').filter(r=>r.src==='historie'&&r.pl!=null).length;
  check('importierte Historie bleibt', histBefore>0, String(histBefore));
  const saved={seasons:S.seasons, chronicle:S.chronicle, view:S.view, chronSeen, chronIndex, chronBuilt};
  try{
    const id='t001';
    const others=[];
    for (let i=2;i<=20;i++) others.push('t'+String(i).padStart(3,'0'));
    const teams=[id].concat(others);
    const rows=teams.map((tid,i)=>({id:tid, pl:i+1}));
    const running={name:'2098/99', status:'running', leagues:{BL:{teams, tables:{all:rows.slice()}}}, pools:{AMBY:[id].concat(others)}, endData:{tables:{BL:rows.slice()}}};
    const fresh={name:'2099/00', status:'running', leagues:{BL:{teams}}, pools:{AMBY:[id].concat(others)}};
    const done={name:'2097/98', status:'done', compact:true, leagues:{BL:{teams, tables:{all:rows.slice()}}}, endData:{tables:{BL:rows.slice()}}, pools:{AMBY:others.concat([id])}};
    const poolOnly={name:'2096/97', status:'done', compact:true, leagues:{}, pools:{AMBY:[id].concat(others)}, endData:{tables:{}}};
    S.chronicle=[];
    chronSeen=new Set(); chronIndex=null; chronBuilt=-1;
    S.seasons=[poolOnly, done, running, fresh];
    S.view=3;
    touchAnsehen();
    const lines=ansehenLedger(id, 2099).lines.filter(l=>l.season>='2096');
    const of=(season, kind)=>lines.filter(l=>l.season===season&&l.kind===kind);
    check('neue Saison ohne Spiel kein Titel', of('2099/00','titel').length===0 && of('2099/00','liga').length===0 && of('2099/00','euro').length===0);
    check('Tabellenführer mitten in der Saison kein Titel', of('2098/99','titel').length===0 && of('2098/99','euro').length===0 && of('2098/99','liga').length===0);
    check('Pool-Reihenfolge ist keine Platzierung', of('2096/97','titel').length===0 && of('2096/97','liga').length===0 && of('2096/97','euro').length===0);
    const doneLiga=of('2097/98','liga')[0], doneEuro=of('2097/98','euro')[0];
    check('abgeschlossene Saison ohne Chronik zählt', of('2097/98','liga').length===1 && of('2097/98','titel').length===1 && of('2097/98','euro').length===1, of('2097/98','liga').length+'/'+of('2097/98','titel').length+'/'+of('2097/98','euro').length);
    check('Platz 1 der abgeschlossenen Saison ist Meister', !!(doneLiga && doneLiga.label.indexOf('1./')>=0 && doneEuro && doneEuro.label.indexOf('CL')>=0), (doneLiga&&doneLiga.label)+' / '+(doneEuro&&doneEuro.label));
    S.chronicle=[{season:'2097/98', id, liga:'Bundesliga', ebene:1, n:20, pl:1, pts:80}];
    chronSeen=null; chronIndex=null; chronBuilt=-1;
    touchAnsehen();
    const once=ansehenLedger(id, 2099).lines.filter(l=>l.season==='2097/98'&&l.kind==='titel');
    check('Chronik und Abschlusstabelle nicht doppelt', once.length===1, String(once.length));
    const kept=collectPlacements(id).filter(r=>r.src==='historie'&&r.pl!=null).length;
    check('Historie neben der Fixture erhalten', kept===histBefore, kept+' gegen '+histBefore);
  }finally{
    S.seasons=saved.seasons; S.chronicle=saved.chronicle; S.view=saved.view;
    chronSeen=saved.chronSeen; chronIndex=saved.chronIndex; chronBuilt=saved.chronBuilt;
    touchAnsehen();
  }
  const liveNow=(S.seasons||[]).filter(s=>s && s.status!=='done').map(s=>s.name);
  const bayernNow=ansehenLedger('t001');
  check('laufende Saison des Spielstands ohne Meistertitel', !bayernNow.lines.some(l=>l.kind==='titel' && liveNow.indexOf(l.season)>=0));
  check('laufende Saison des Spielstands ohne Europa', !bayernNow.lines.some(l=>l.kind==='euro' && liveNow.indexOf(l.season)>=0));
  check('keine erfundene historische Europa-Qualifikation', !bayernNow.lines.some(l=>l.src==='historie'&&l.kind==='euro'));
  const byeCup={rounds:[
    {name:'1. Runde', byes:['tBye'], matches:[{h:'tWin', a:'tOpp', hg:3, ag:1}]},
    {name:'2. Runde', byes:[], matches:[{h:'tBye', a:'tWin', hg:null, ag:null}]}
  ]};
  const byeReached=cupReached(byeCup);
  const byePts=id=>ANSEHEN.dfb[byeReached[id].name];
  check('Freilos und Sieger erreichen dieselbe 2. Runde', byeReached.tBye.name==='2. Runde' && byeReached.tWin.name==='2. Runde' && byeReached.tOpp.name==='1. Runde');
  check('Freilos und Sieger haben dieselben Runde-2-Punkte', byePts('tBye')===byePts('tWin') && byePts('tBye')===ANSEHEN.dfb['2. Runde'] && byePts('tOpp')===ANSEHEN.dfb['1. Runde']);
  const stamp={
    seasons:S.seasons, chronicle:S.chronicle, pokalRuns:S.pokalRuns, view:S.view,
    chronSeen, chronIndex, chronBuilt, runIndex, runBuilt, runSeasons,
    n:(S.seasons||[]).length, an:ansehenValue('t001')
  };
  try{
    const id='t010';
    const teams=['t010'];
    for (let i=11;i<=29;i++) teams.push('t'+String(i).padStart(3,'0'));
    const rows=teams.map((tid,i)=>({id:tid, pl:i+1}));
    const early={name:'2088/89', status:'done', compact:true, leagues:{BL:{teams, tables:{all:rows}}}, endData:{tables:{BL:rows}}, pools:{}};
    const mid={name:'2094/95', status:'done', compact:true, leagues:{BL:{teams, tables:{all:rows.map((r,i)=>({id:r.id, pl:((i+3)%20)+1}))}}}, endData:{tables:{}}, pools:{}};
    const future={name:'2099/00', status:'done', compact:true, leagues:{BL:{teams, tables:{all:rows}}}, endData:{tables:{BL:rows}}, pools:{}};
    S.seasons=[early, mid, future];
    S.view=1;
    S.chronicle=[{season:'2088/89', id, liga:'Bundesliga', ebene:1, n:20, pl:1, pts:80}];
    S.pokalRuns=[
      {season:'2088/89', id, comp:'land', bl:'Bayern', round:'Achtelfinale', won:false},
      {season:'2088/89', id, comp:'land', bl:'Bayern', round:'Finale', won:false},
      {season:'2088/89', id:'t011', comp:'dfb', round:'Finale', won:true},
      {season:'2088/89', id:'t012', comp:'dfb', round:'Finale', won:true}
    ];
    chronSeen=null; chronIndex=null; chronBuilt=-1; runIndex=null; runBuilt=-1; runSeasons=null;
    touchAnsehen();
    const land=ansehenLedger(id, 2094).lines.filter(l=>l.kind==='land'&&l.season==='2088/89');
    check('weiteste Landespokalrunde', land.length===1 && land[0].label.indexOf('Finale')>=0 && land[0].label.indexOf('Achtelfinale')<0, land.map(l=>l.label).join(','));
    S.chronicle.push({season:'2088/89', id:'t011', liga:'Bundesliga', ebene:1, n:20, pl:8, pts:40});
    S.chronicle.push({season:'2088/89', id:'t012', liga:'Bundesliga', ebene:1, n:20, pl:1, pts:80});
    chronIndex=null; chronBuilt=-1; chronSeen=null;
    touchAnsehen();
    const euro8=ansehenLedger('t011', 2094).lines.filter(l=>l.kind==='euro'&&l.season==='2088/89');
    const euro1=ansehenLedger('t012', 2094).lines.filter(l=>l.kind==='euro'&&l.season==='2088/89');
    check('DFB-Sieger auf Platz 8 bekommt UECL', euro8.length===1 && euro8[0].label.indexOf('UECL')>=0, euro8.map(l=>l.label).join(','));
    check('DFB-Sieger mit CL behält nur CL', euro1.length===1 && euro1[0].label.indexOf('CL')>=0 && euro1[0].label.indexOf('EL')<0, euro1.map(l=>l.label).join(','));
    const atEarly=ansehenInfo(id, 2088).value;
    const atMid=ansehenInfo(id, 2094);
    const discounted=ansehenRound2(atMid.lines.filter(l=>l.season==='2088/89').reduce((s,l)=>s+l.today,0));
    const head=ansehenHead(id);
    check('Verlauf ist der damalige Gesamtstand', head.indexOf('2088/89 '+deNum(atEarly,2))>=0 && head.indexOf('2094/95 '+deNum(atMid.value,2))>=0, head);
    check('Verlauf ist nicht der heutige Saisonbeitrag', atEarly>discounted, atEarly+' gegen '+discounted);
    check('Verlauf schließt die Zukunft aus', head.indexOf('2099/00')<0 && !atMid.lines.some(l=>l.season==='2099/00'));
    const scale={budget:3.25, title:0.59, rounds:['Finale'], n:2, field:1.2, unknown:0, byLevel:{7:2}};
    const keptCup={id:'land:Bayern', kind:'land', bl:'Bayern', name:'Landespokal Bayern', entrants:['t010','t011'], rounds:[{name:'Finale', matches:[]}], ansehenScale:scale};
    const freshIds=['t020','t021','t022','t023'];
    const fresh={name:'2077/78', status:'done', compact:true, pools:{}, leagues:{L3:{teams:freshIds, tables:{all:freshIds.map((tid,i)=>({id:tid, pl:i+1}))}}}, cups:{dfb:null, land:{Bayern:{id:'land:Bayern', kind:'land', bl:'Bayern', name:'Landespokal Bayern', entrants:freshIds.slice(), rounds:[{name:'Halbfinale'},{name:'Finale'}]}}}};
    const expected=landAnsehenScale(freshIds, fresh, ['Halbfinale','Finale']);
    const disk=packForDisk({v:1, seasons:[
      {name:'2080/81', status:'done', compact:true, leagues:{}, pools:{}, cups:{dfb:null, land:{Bayern:keptCup}}}
    ], chronicle:[], pokalRuns:[], view:0});
    const back=unpackState(JSON.parse(JSON.stringify(disk)));
    const got=back.seasons[0].cups.land.Bayern.ansehenScale;
    check('ansehenScale übersteht pack und reload', !!got && got.budget===3.25 && got.field===1.2 && got.rounds[0]==='Finale', JSON.stringify(got));
    shrinkSeason(fresh);
    check('Archiv friert die Skala ein und löscht das Feld', !fresh.cups.land.Bayern.entrants && fresh.cups.land.Bayern.ansehenScale.budget===expected.budget, JSON.stringify(fresh.cups.land.Bayern.ansehenScale));
    const disk2=packForDisk({v:1, seasons:[fresh], chronicle:[], pokalRuns:[], view:0});
    const back2=unpackState(JSON.parse(JSON.stringify(disk2)));
    check('eingefrorene Skala übersteht Archiv und Reload', back2.seasons[0].cups.land.Bayern.ansehenScale.budget===expected.budget && !back2.seasons[0].cups.land.Bayern.entrants);
    const base=ansehenValue(id);
    S.chronicle.push({season:'2090/91', id, liga:'Bundesliga', ebene:1, n:20, pl:1, pts:80});
    chronIndex=null; chronBuilt=-1; chronSeen=null;
    check('Cache hält den alten Wert bis zur Invalidierung', ansehenValue(id)===base);
    touchAnsehen();
    check('touchAnsehen verwirft den Cache', ansehenValue(id)!==base);
    S.seasons=stamp.seasons; S.view=stamp.view; S.pokalRuns=stamp.pokalRuns; S.chronicle=stamp.chronicle;
    chronSeen=null; chronIndex=null; chronBuilt=-1; runIndex=null; runBuilt=-1; runSeasons=null;
    touchAnsehen();
    if (stamp.seasons.length>1){
      const firstYear=seasonYear(stamp.seasons[0].name);
      const lastName=stamp.seasons[stamp.seasons.length-1].name;
      S.view=0;
      touchAnsehen();
      const earlyLines=ansehenLedger('t001', firstYear).lines;
      check('Saisonwechsel blendet spätere Jahre aus', firstYear<seasonYear(lastName) && !earlyLines.some(l=>l.season===lastName));
    }
  }finally{
    S.seasons=stamp.seasons; S.chronicle=stamp.chronicle; S.pokalRuns=stamp.pokalRuns; S.view=stamp.view;
    chronSeen=stamp.chronSeen; chronIndex=stamp.chronIndex; chronBuilt=stamp.chronBuilt;
    runIndex=stamp.runIndex; runBuilt=stamp.runBuilt; runSeasons=stamp.runSeasons;
    touchAnsehen();
  }
  check('Tests stellen den Spielstand wieder her', S.seasons===stamp.seasons && S.chronicle===stamp.chronicle && S.pokalRuns===stamp.pokalRuns && S.view===stamp.view && (S.seasons||[]).length===stamp.n && ansehenValue('t001')===stamp.an);
  const keptSeasons=S.seasons, keptChron=S.chronicle, keptView=S.view;
  try{
    S.seasons=[{name:'2000/01', status:'done'}];
    S.view=0;
    S.chronicle=[
      {season:'1900/01', id:'t090', liga:'2. Bundesliga', ebene:2, n:18, pl:1, pts:60},
      {season:'1900/01', id:'t091', liga:'Bundesliga', ebene:1, n:18, pl:1, pts:70}
    ];
    chronSeen=null; chronIndex=null; chronBuilt=-1;
    touchAnsehen();
    const low=ansehenLedger('t090', 2000).lines.filter(l=>l.kind==='titel')[0];
    const big=ansehenLedger('t091', 2000).lines.filter(l=>l.kind==='titel' && String(l.label).indexOf('Meistertitel')>=0)[0];
    check('Zweitliga-Meister ist kein Titel', !low);
    check('historischer Bundesliga-Titel behält 40 %', big && big.durable===true && big.age===100 && big.factor===0.4, big&&big.factor);
  }finally{
    S.seasons=keptSeasons; S.chronicle=keptChron; S.view=keptView;
    chronSeen=null; chronIndex=null; chronBuilt=-1;
    touchAnsehen();
  }
  const p7=placePoints(1,20,7), p8=placePoints(1,20,8), p17=placePoints(1,20,17), p18=placePoints(1,20,18), p20=placePoints(1,20,20);
  const midStep=ansehenRound2((p8-p17)/9);
  check('Bundesliga 20: Platz 17 ist die Basis, 18 bis 20 sind Abstieg', zoneCounts(1,20).safeLast===17 && p18===ansehenRound2(p17*0.9) && p20<p18 && p17>p18 && p7-p8>midStep, p7+'/'+p8+'/'+p17+'/'+p18+'/'+p20);
  LEAGUES.forEach(l=>{
    const z=zoneCounts(l.level, l.size);
    const promoStep=ANSEHEN.levels[l.level].promoStep||0;
    const strict=(()=>{ let prev=1e9; for (let pl=1;pl<=l.size;pl++){ const v=placePoints(l.level, l.size, pl); if (v>prev) return false; if (v===prev && !(promoStep===0 && pl<=z.up)) return false; prev=v; } return true; })();
    const promo=z.up?placePoints(l.level, l.size, z.up)===ansehenRound2(placePoints(l.level, l.size, z.up+1)*1.15):true;
    const rel=z.down?placePoints(l.level, l.size, z.safeLast+1)===ansehenRound2(placePoints(l.level, l.size, z.safeLast)*0.9):true;
    const above=leagueSample(l.level-1);
    const under=above?placePoints(l.level, l.size, 1)<placePoints(above.level, above.size, above.size):true;
    check(l.short+' hält 15 Prozent, 10 Prozent und die Liga darüber', strict && promo && rel && under, l.short);
  });
  check('Stufe 5 mit sieben Absteigern bleibt über Stufe 6', placePoints(5,18,1)>placePoints(6,18,18,7) && placePoints(6,18,18,7)>ANSEHEN.amateurUp);
  check('Amateur ohne Aufstieg hat keine Platzpunkte', placePoints(7,87,1)===0 && placePoints(7,87,87)===0);
  check('gespeicherter Landestitel folgt 28 Prozent des Budgets', landTitleOf({budget:10, title:1.8})===2.8);
  const squad=buildInitialSquads();
  const squadOk=LEAGUES.every(l=>{
    const n=squad.leagues[l.id] && squad.leagues[l.id].length;
    return l.level>=5 ? n>=16 && n<=20 : n===l.size;
  });
  check('Startaufteilung setzt 919 Vereine einmal in die richtigen Größen', squad.used===919 && squad.total===919 && LEAGUES.every(l=>squad.leagues[l.id].length===l.size), squad.used+'/'+L5_IDS.map(id=>squad.leagues[id].length).join(',')+'/'+RL_IDS.map(id=>squad.leagues[id].length).join(','));
  check('5. Liga trägt Nordost und Südwest', L.L5NO.name==='5. Liga Nordost' && L.L5SW.name==='5. Liga Südwest' && L.L5NO.size===22 && L.L5SW.size===22 && L.L5NO.up===2 && L.L5NO.down===2 && L.L4.size===20 && L.L4.down===4 && !L.OLBY);
  check('Regionalliga-Namen bleiben', L.RLN.name==='Regionalliga Nord' && L.RLO.name==='Regionalliga Ost' && L.RLS.name==='Regionalliga Süd' && L.RLW.name==='Regionalliga West' && RL_IDS.every(id=>L[id].level===6 && L[id].size===18 && L[id].up===1 && L[id].down===2));
  check('Startstaffeln folgen dem Bundesland', squad.leagues.L5NO.every(id=>BL_L5[TEAMS[id].bl]==='L5NO') && squad.leagues.L5SW.every(id=>BL_L5[TEAMS[id].bl]==='L5SW') && squad.leagues.RLN.every(id=>BL_RL[TEAMS[id].bl]==='RLN') && squad.leagues.RLS.every(id=>BL_RL[TEAMS[id].bl]==='RLS'));
  check('kein Geocluster und kein Einteilungsreiter', leagueTabs().every(t=>t[0]!=='einteilung') && typeof clusterLevel==='undefined');
  const navWas={league:S.ui.league, tab:S.ui.tab, sec:S.ui.ansehenSec};
  S.ui.league='BL'; S.ui.tab='tabelle';
  renderNav();
  const nav=$('#leagueNav').innerHTML;
  const mob=$('#mobileLeague').innerHTML;
  check('Bundesliga und Regionalligen stehen in der Seitenleiste', nav.indexOf('>Ligen<')>=0 && nav.indexOf('>Bundesliga<')>=0 && nav.indexOf('title="Bundesliga"')>=0 && nav.indexOf('>2. Bundesliga<')>=0 && nav.indexOf('title="2. Bundesliga"')>=0 && ['RLN','RLO','RLS','RLW'].every(id=>nav.indexOf('data-league="'+id+'"')>=0 && nav.indexOf('>Regionalliga '+(id==='RLN'?'Nord':id==='RLO'?'Ost':id==='RLS'?'Süd':'West')+'<')>=0));
  check('5. Liga steht in der Seitenleiste', nav.indexOf('data-league="L5NO"')>=0 && nav.indexOf('data-league="L5SW"')>=0 && nav.indexOf('>5. Liga Nordost<')>=0 && nav.indexOf('>5. Liga Südwest<')>=0 && nav.indexOf('title="5. Liga Nordost"')>=0 && nav.indexOf('>Amateurliga<')>=0 && nav.indexOf('nav-cnt')<0 && nav.indexOf('>Oberliga<')<0 && nav.indexOf('OL Bayern')<0);
  check('Pokale stehen in der Seitenleiste', nav.indexOf('>Pokale<')>=0 && nav.indexOf('data-tab="pokal"')>=0 && nav.indexOf('>DFB-Pokal<')>=0 && nav.indexOf('>Landespokale<')>=0 && nav.indexOf('>Wettbewerbe<')<0);
  check('schmale Auswahl enthält alle Staffeln und den Pokal', ['L5NO','L5SW','RLN','RLW','pokal','ansehen','info'].every(v=>mob.indexOf('value="'+v+'"')>=0) && mob.indexOf('5. Liga Nordost')>=0 && mob.indexOf('Oberliga')<0);
  S.ui.league='L5NO'; S.ui.tab='tabelle'; renderNav();
  check('aktive 5. Liga', $('#leagueNav a.nav-link.active[data-league="L5NO"]') && $('#leagueNav a.nav-link.active[data-league="L5NO"]').textContent==='5. Liga Nordost' && $('#leagueNav a.nav-link.active[data-league="L5NO"]').title==='5. Liga Nordost');
  S.ui.tab='pokal'; renderNav();
  check('aktiver Pokal', !!$('#leagueNav a.nav-link.active[data-tab="pokal"]'));
  S.ui.league=navWas.league; S.ui.tab=navWas.tab; S.ui.ansehenSec=navWas.sec; renderNav();
  let reformFalse=0;
  Object.keys(TEAMS).forEach(id=>{
    const rows=historyEntries(id);
    const a=rows.find(r=>r.season==='2007/08'), b=rows.find(r=>r.season==='2008/09');
    if (!a||!b) return;
    const family=x=>/Regionalliga/.test(x)?'rl':/Oberliga|Bayernliga|Hessenliga|NRW-Liga|NOFV/.test(x)?'ol':'';
    if (family(a.liga) && family(a.liga)===family(b.liga) && b.ebene<a.ebene) reformFalse++;
  });
  check('Reform 2008 erzeugt keinen Aufstieg innerhalb derselben Spielklasse', reformFalse===0, String(reformFalse));
  ['t118','t745','t760'].forEach(id=>{
    const line=ansehenLedger(id, 2012).lines.find(l=>l.season==='2011/12' && l.label==='Aufstieg aus der Amateurliga');
    check(id+' bleibt 2011/12 in derselben Landesliga ohne Amateurpunkte', !line);
  });
  const realAm=ansehenLedger('t768', 2010).lines.filter(l=>l.season==='2009/10' && l.label==='Aufstieg aus der Amateurliga');
  check('belegter Aufstieg aus der Landesliga bleibt bei 4', realAm.length===1 && realAm[0].original===4 && !ansehenLedger('t768', 2010).lines.some(l=>l.season==='2009/10' && l.kind==='titel'));
  let sameClassBonus=0;
  Object.keys(TEAMS).forEach(id=>{
    const rows=historyEntries(id).filter(r=>r.src==='historie');
    for (let i=0;i<rows.length-1;i++){
      const a=rows[i], b=rows[i+1];
      if (seasonYear(b.season)!==seasonYear(a.season)+1 || a.liga!==b.liga || !(b.ebene<a.ebene)) continue;
      if (ansehenLedger(id, seasonYear(a.season)+1).lines.some(l=>l.season===a.season && l.label==='Aufstieg aus der Amateurliga')) sameClassBonus++;
    }
  });
  check('keine gleiche Spielklasse wird als Amateur-Aufstieg gebucht', sameClassBonus===0, String(sameClassBonus));
  const histSmall=ansehenLedger('t118', 2012).lines.find(l=>l.season==='2011/12' && l.kind==='liga');
  check('Ebene 7 ohne Aufstieg hat keine Ligazeile', !histSmall);
  check('historische Bundesliga mit 18 Mannschaften zont anders als mit 20', placePoints(1,18,17)!==placePoints(1,20,17) && zoneCounts(1,18).safeLast===15 && zoneCounts(1,20).safeLast===17, placePoints(1,18,17)+'/'+placePoints(1,20,17));
  const openCup={name:'2080/81', status:'running', leagues:{BL:{teams:['t001','t007','t018'], tables:{all:[{id:'t001',pl:1},{id:'t007',pl:7},{id:'t018',pl:18}]}}}, cups:{dfb:{entrants:['t001','t007','t018'], rounds:[{name:'Halbfinale', drawn:true, byes:['t007'], matches:[{h:'t001',a:'t018',hg:null,ag:null}]}]}}};
  check('Offener Außenseiter hält Platz 8 grau', dfbEighthOpen(openCup)===false);
  openCup.cups.dfb.rounds[0].matches[0].hg=1; openCup.cups.dfb.rounds[0].matches[0].ag=0;
  check('Bye und Restfeld in den Top 7 färben Platz 8', dfbEighthOpen(openCup)===true);
  openCup.leagues.BL.tables.all.find(r=>r.id==='t007').pl=9;
  openCup.leagues.BL.tables.all.find(r=>r.id==='t001').pl=7;
  check('Tabellenwechsel nimmt die grüne Zone zurück', dfbEighthOpen(openCup)===false);
  const finalTop={name:'2081/82', status:'done', leagues:{BL:{teams:['t001'], tables:{all:[{id:'t001',pl:1},{id:'t005',pl:5},{id:'t007',pl:7},{id:'t008',pl:8}]}}}, cups:{dfb:{rounds:[{name:'Finale', drawn:true, matches:[{h:'t001',a:'t005',hg:1,ag:0}]}]}}};
  const finalOut={name:'2081/82', status:'done', leagues:finalTop.leagues, cups:{dfb:{rounds:[{name:'Finale', drawn:true, matches:[{h:'t008',a:'t001',hg:1,ag:0}]}]}}};
  check('Finalsieg in den Top 7 gibt Platz 8 weiter', dfbEighthOpen(finalTop)===true && dfbEighthOpen(finalOut)===false);
  const marksIn=seasonEuroMarks(finalTop.leagues.BL.tables.all, 't005');
  const marksOut=seasonEuroMarks(finalTop.leagues.BL.tables.all, 't008');
  const marksAm=seasonEuroMarks(finalTop.leagues.BL.tables.all, 't090');
  check('Top-7-Sieger behält EL und gibt UECL an Platz 8', marksIn.t005.indexOf('EL')>=0 && marksIn.t005[marksIn.t005.length-1]==='P' && marksIn.t008.indexOf('UECL')>=0 && !marksIn.t008.includes('P'));
  check('Sieger auf Platz 8 bekommt genau eine UECL und P', marksOut.t008.filter(x=>x==='UECL').length===1 && marksOut.t008[marksOut.t008.length-1]==='P');
  check('Amateur-Sieger bekommt UECL und P, Platz 8 nicht', marksAm.t090.indexOf('UECL')>=0 && marksAm.t090[marksAm.t090.length-1]==='P' && !(marksAm.t008||[]).includes('UECL'));
  check('offenes Finale sperrt den Abschluss', seasonEndBlock({status:'running', leagues:{}, cups:{dfb:{rounds:[{name:'Finale', drawn:true, matches:[{h:'t001',a:'t002',hg:null,ag:null}]}]}}})==='DFB-Pokal');
  check('entschiedenes Finale gibt den Abschluss frei', seasonEndBlock({status:'running', leagues:{}, cups:{dfb:{rounds:[{name:'Finale', drawn:true, matches:[{h:'t001',a:'t002',hg:1,ag:0}]}]}}})==='');
  check('fehlendes DFB-Objekt sperrt den Abschluss nicht', seasonEndBlock({status:'running', leagues:{}})==='');
  check('leerer DFB-Pokal sperrt den Abschluss nicht', seasonEndBlock({status:'running', leagues:{}, cups:{dfb:{rounds:[]}}})==='');
  const keepS=S.seasons, keepC=S.chronicle, keepR=S.pokalRuns, keepV=S.view;
  try{
    const ids=['t010'];
    for (let i=11;i<=20;i++) ids.push('t'+String(i).padStart(3,'0'));
    S.seasons=[{name:'2092/93', status:'done', leagues:{BL2:{teams:ids, tables:{all:ids.map((id,i)=>({id, pl:i+1}))}}}, pools:{AMBY:['t090']}, cups:{dfb:{rounds:[{name:'Finale', drawn:true, matches:[{h:'t090',a:'t010',hg:1,ag:0}]}]}}}];
    S.view=0;
    S.chronicle=[
      {season:'2091/92', id:'t011', liga:'3. Liga', ebene:3, n:20, pl:1, pts:70},
      {season:'2092/93', id:'t011', liga:'2. Bundesliga', ebene:2, n:18, pl:10, pts:40},
      {season:'2091/92', id:'t012', liga:'3. Liga', ebene:3, n:20, pl:3, pts:60},
      {season:'2092/93', id:'t012', liga:'2. Bundesliga', ebene:2, n:18, pl:16, pts:30},
      {season:'2091/92', id:'t013', liga:'Regionalliga', ebene:5, n:18, pl:1, pts:70},
      {season:'2092/93', id:'t013', liga:'Regionalliga', ebene:5, n:18, pl:4, pts:50},
      {season:'2091/92', id:'t014', liga:'2. Bundesliga', ebene:2, n:18, pl:16, pts:30},
      {season:'2092/93', id:'t014', liga:'3. Liga', ebene:3, n:20, pl:1, pts:70}
    ];
    S.pokalRuns=[{season:'2092/93', id:'t090', comp:'dfb', round:'Finale', won:true}];
    chronSeen=null; chronIndex=null; chronBuilt=-1; runIndex=null; runBuilt=-1; runSeasons=null;
    touchAnsehen();
    const up=ansehenLedger('t011', 2092).lines.filter(l=>l.season==='2091/92'&&l.kind==='aufstieg');
    const upAlso=ansehenLedger('t012', 2092).lines.filter(l=>l.season==='2091/92'&&l.kind==='aufstieg');
    const liga1=ansehenLedger('t011', 2092).lines.filter(l=>l.season==='2091/92'&&l.kind==='liga');
    const liga3=ansehenLedger('t012', 2092).lines.filter(l=>l.season==='2091/92'&&l.kind==='liga');
    const stay=ansehenLedger('t013', 2092).lines.filter(l=>l.season==='2091/92'&&(l.kind==='aufstieg'||l.kind==='titel'));
    const stayLiga=ansehenLedger('t013', 2092).lines.filter(l=>l.season==='2091/92'&&l.kind==='liga');
    const down=ansehenLedger('t014', 2092).lines.filter(l=>l.season==='2091/92'&&l.kind==='aufstieg');
    const downLiga=ansehenLedger('t014', 2092).lines.filter(l=>l.season==='2091/92'&&l.kind==='liga');
    const noTitle=ansehenLedger('t011', 2092).lines.filter(l=>l.season==='2091/92'&&l.kind==='titel');
    check('Aufstiegsplätze stecken im Ligawert und unterscheiden sich', up.length===0 && upAlso.length===0 && noTitle.length===0 && liga1.length===1 && liga3.length===1 && liga1[0].original===placePoints(3,20,1) && liga3[0].original===placePoints(3,20,3) && liga1[0].original>liga3[0].original, liga1.map(l=>l.original).join(',')+'/'+liga3.map(l=>l.original).join(','));
    check('gleich gebliebener Staffelsieger hat keinen Extra-Bonus, der Absteiger den Abschlag', stay.length===0 && stayLiga.length===1 && stayLiga[0].original===placePoints(5,18,1) && down.length===0 && downLiga.length===1 && downLiga[0].original===placePoints(2,18,16));
    const last={name:'2094/95', status:'done', leagues:{}, pools:{}, endData:{moves:[{id:'t015', from:'L3', to:'BL2', type:'auf', pl:2},{id:'t016', from:'BL2', to:'L3', type:'ab', pl:18}], picks:{RLS:['t017']}}};
    S.seasons.push(last);
    touchAnsehen();
    const lastLiga=ansehenLedger('t015', 2094).lines.filter(l=>l.season==='2094/95'&&l.kind==='liga');
    const lastUp=ansehenLedger('t015', 2094).lines.filter(l=>l.kind==='aufstieg'&&l.season==='2094/95');
    const lastDown=ansehenLedger('t016', 2094).lines.filter(l=>l.season==='2094/95'&&(l.kind==='aufstieg'||l.kind==='liga'));
    const amUp=ansehenLedger('t017', 2094).lines.filter(l=>l.season==='2094/95');
    check('Bewegung ohne Tabelle bucht den Ligaplatz einmal, Amateur genau 4', lastUp.length===0 && lastLiga.length===1 && lastLiga[0].original===placePoints(3,20,2) && lastDown.length===0 && amUp.length===1 && amUp[0].kind==='liga' && amUp[0].original===4 && !amUp.some(l=>l.kind==='titel'||l.kind==='aufstieg'));
    const amEuro=ansehenLedger('t090', 2092).lines.filter(l=>l.season==='2092/93');
    check('Amateur-Pokalsieger bekommt UECL 90 ohne Ligaplatz', amEuro.filter(l=>l.kind==='euro').length===1 && amEuro.some(l=>l.kind==='euro'&&l.original===90) && !amEuro.some(l=>l.kind==='liga'));
  }finally{
    S.seasons=keepS; S.chronicle=keepC; S.pokalRuns=keepR; S.view=keepV;
    chronSeen=null; chronIndex=null; chronBuilt=-1; runIndex=null; runBuilt=-1; runSeasons=null;
    touchAnsehen();
  }
  const endKeepS=S.seasons, endKeepC=S.chronicle, endKeepV=S.view;
  try{
    S.chronicle=[];
    chronSeen=null; chronIndex=null; chronBuilt=-1;
    const rlIds=[];
    for (let i=0;i<18;i++) rlIds.push('t'+String(200+i).padStart(3,'0'));
    rlIds[11]='t040';
    const rlRows=rlIds.map((id,i)=>({id, pl:i+1}));
    const dlg={name:'2096/97', status:'ending', leagues:{RLN:{teams:rlIds.slice(), tables:{all:rlRows}}}, pools:{}, endData:{
      moves:[{id:'t041', from:'L3', to:'BL2', type:'auf', pl:1}],
      picks:{RLS:['t042']},
      downOf:{RLN:7},
      tables:{RLN:rlRows}
    }};
    S.seasons=[dlg]; S.view=0; touchAnsehen();
    const at=id=>ansehenLedger(id, 2096).lines.filter(l=>l.season==='2096/97');
    check('offener Abschluss bucht noch keine Saisonpunkte', at('t041').length===0 && at('t042').length===0 && at('t040').length===0);
    dlg.status='running'; delete dlg.endData; touchAnsehen();
    check('Abbruch nimmt die vorläufige Wertung zurück', at('t041').length===0 && at('t042').length===0 && at('t040').length===0);
    dlg.status='ending';
    dlg.endData={moves:[{id:'t041', from:'L3', to:'BL2', type:'auf', pl:1}], picks:{RLS:['t043']}, downOf:{RLN:7}, tables:{RLN:rlRows}};
    touchAnsehen();
    check('eine andere Auswahl im Dialog bleibt ohne Punkte', at('t041').length===0 && at('t042').length===0 && at('t043').length===0 && at('t040').length===0);
    dlg.status='done'; touchAnsehen();
    const moved=at('t041'), picked=at('t043'), dropped=at('t042'), stayed=at('t040');
    check('nach dem Abschluss steht jede Zeile einmal', moved.length===1 && moved[0].kind==='liga' && moved[0].original===placePoints(3,20,1) && picked.length===1 && picked[0].kind==='liga' && picked[0].original===4 && dropped.length===0 && stayed.length===1 && stayed[0].original===placePoints(6,18,12,7), (stayed[0]&&stayed[0].original)+'/'+placePoints(6,18,12,7));
    LEAGUES.forEach(l=>{
      const z=zoneCounts(l.level, l.size, l.level>=5?7:null);
      const edge=l.up?placePoints(l.level, l.size, l.up)===ansehenRound2(placePoints(l.level, l.size, l.up+1)*1.15):true;
      const rel=z.down?placePoints(l.level, l.size, z.safeLast+1, l.level>=5?7:null)===ansehenRound2(placePoints(l.level, l.size, z.safeLast, l.level>=5?7:null)*0.9):true;
      check(l.id+' zont die konfigurierte Größe', edge && rel && placePoints(l.level, l.size, 1, l.level>=5?7:null)>placePoints(l.level, l.size, l.size, l.level>=5?7:null));
    });
  }finally{
    S.seasons=endKeepS; S.chronicle=endKeepC; S.view=endKeepV;
    chronSeen=null; chronIndex=null; chronBuilt=-1;
    touchAnsehen();
  }
  const bayernParts=ansehenParts(ansehenLedger('t001'));
  check('Bayern-Spalten summieren sich zum Ansehen', bayernParts.sum===ansehenLedger('t001').value, bayernParts.sum+' gegen '+ansehenLedger('t001').value);
  const reg=historicalTitleRows();
  const nComp=c=>reg.filter(r=>r.comp===c).length;
  check('Titelregister 51, 63, 81, 41 und 40', nComp('de')===51 && nComp('bl')===63 && nComp('dfb')===81 && nComp('ddr')===41 && nComp('fdgb')===40 && reg.length===276);
  check('Pokalsiege 2022 und 2023 sind ersatzlos draußen', !reg.some(r=>r.comp==='dfb' && (r.year===2022||r.year===2023)));
  ['de','bl','ddr'].forEach(comp=>{
    const row=reg.find(r=>r.comp===comp);
    check(comp+' hat den Bundesliga-Titelwert', !!row && titelOriginalPoints(comp)===180 && titelOriginalPoints(comp)===ANSEHEN.levels[1].title);
  });
  check('DFB und FDGB haben denselben Pokalwert 50', titelOriginalPoints('dfb')===50 && titelOriginalPoints('fdgb')===50 && titelOriginalPoints('dfb')===ANSEHEN.dfb.title);
  check('große Titel altern gleich bis 40 Prozent', titleFactor(0,true)===1 && titleFactor(59,true)===0.41 && titleFactor(60,true)===0.4 && titleFactor(150,true)===0.4);
  check('volle historische Saison aus der Quelle', seasonFull('1908/09')==='1908/1909' && seasonFull('1954/55')==='1954/1955' && seasonFull('2003/04')==='2003/2004' && seasonFull('1999/00')==='1999/2000' && seasonFull('1956')==='1956');
  const usedCup=new Set();
  const takeCup=(bl,n)=>{
    const out=[];
    Object.keys(TEAMS).forEach(id=>{
      if (out.length>=n || usedCup.has(id)) return;
      if (bl && TEAMS[id].bl!==bl) return;
      usedCup.add(id); out.push(id);
    });
    return out;
  };
  const cupBl=takeCup(null,20), cupBl2=takeCup(null,20), cupL3=takeCup(null,20);
  const landWinners={};
  let landShort=false;
  BL_ORDER.forEach(st=>{ const id=takeCup(st,1)[0]; if(!id) landShort=true; else landWinners[st]=id; });
  const emptyLeagues=()=>{ const leagues={}; LEAGUES.forEach(l=>{ leagues[l.id]={teams:[], tables:{all:[]}}; }); return leagues; };
  const fill=ids=>ids.map((id,i)=>({id, pl:i+1}));
  const seasonOf=(teamsBl, teamsBl2, teamsL3)=>{
    const leagues=emptyLeagues();
    leagues.BL={teams:teamsBl.slice(), tables:{all:fill(teamsBl)}};
    leagues.BL2={teams:teamsBl2.slice(), tables:{all:fill(teamsBl2)}};
    leagues.L3={teams:teamsL3.slice(), tables:{all:fill(teamsL3)}};
    const pools={}; POOLS.forEach(p=>{ pools[p.id]=[]; });
    return {name:'2080/81', status:'done', leagues, pools};
  };
  const landCups=winner=>{
    const land={};
    BL_ORDER.forEach(st=>{
      const id=winner&&winner[st];
      if (!id) return;
      land[st]={rounds:[{name:'Finale', drawn:true, matches:[{h:id, a:cupBl[0], hg:1, ag:0}]}]};
    });
    return land;
  };
  const prevBase=seasonOf(cupBl, cupBl2, cupL3);
  prevBase.cups={dfb:{rounds:[{name:'Finale', drawn:true, matches:[{h:cupBl[0], a:cupBl2[0], hg:1, ag:0}]}]}, land:landCups(landWinners)};
  const nextBase=seasonOf(cupBl, cupBl2, cupL3);
  const checkField=(label, cup, expect)=>{
    const ids=cup.entrants||[];
    const uniq=new Set(ids);
    const landOk=BL_ORDER.every(st=>uniq.has(landWinners[st]));
    const pro=new Set(cup.pro||[]), am=new Set(cup.amateur||[]);
    const split=ids.every(id=>(pro.has(id)?1:0)+(am.has(id)?1:0)===1);
    const matches=pairDfb(ids, pro, false);
    const homeOk=matches.every(m=>am.has(m.h) && pro.has(m.a));
    const once=new Set(matches.map(m=>m.h+'>'+m.a));
    check(label, !landShort && ids.length===64 && uniq.size===64 && cup.pro.length===32 && cup.amateur.length===32 && landOk && split && matches.length===32 && homeOk && once.size===32 && expect(cup), ids.length+'/'+cup.pro.length+'/'+cup.amateur.length);
  };
  checkField('Titelverteidiger der Bundesliga ändert die Töpfe nicht', buildCups(nextBase, prevBase).dfb, cup=>{
    return cup.defender===cupBl[0] && cupL3.slice(0,8).every(id=>cup.entrants.indexOf(id)>=0) && cup.pro.indexOf(cupBl2[11])>=0 && cup.amateur.indexOf(cupBl2[12])>=0 && cup.amateur.indexOf(cupBl[0])<0;
  });
  const firstSeason=seasonOf(cupBl, cupBl2, cupL3);
  const firstPool=POOLS[0] && POOLS[0].id;
  if (firstPool) firstSeason.pools[firstPool]=BL_ORDER.map(st=>takeCup(st,1)[0]).filter(Boolean);
  const first=buildCups(firstSeason, null).dfb;
  check('erste Saison ohne Titelverteidiger bleibt bei 64 und 32 zu 32', !first.defender && first.entrants.length===64 && new Set(first.entrants).size===64 && first.pro.length===32 && first.amateur.length===32 && cupL3.slice(0,8).every(id=>first.entrants.indexOf(id)>=0) && first.pro.indexOf(cupBl2[11])>=0 && first.amateur.indexOf(cupBl2[12])>=0 && first.spots.length===16);
  const defend=(id, nextBl, nextBl2)=>{
    const prev=seasonOf(cupBl, cupBl2, cupL3);
    prev.cups={dfb:{rounds:[{name:'Finale', drawn:true, matches:[{h:id, a:cupBl[0]===id?cupBl[1]:cupBl[0], hg:1, ag:0}]}]}, land:landCups(landWinners)};
    const next=seasonOf(nextBl||cupBl, nextBl2||cupBl2, cupL3);
    return buildCups(next, prev).dfb;
  };
  checkField('Titelverteidiger der Bundesliga bleibt einmal im Profitopf', defend(cupBl[3]), cup=>cup.pro.indexOf(cupBl[3])>=0 && cup.entrants.filter(id=>id===cupBl[3]).length===1 && cupL3.slice(0,8).every(id=>cup.entrants.indexOf(id)>=0) && cup.amateur.indexOf(cupBl2[11])<0);
  checkField('Titelverteidiger der 2. Liga auf Platz 1 bleibt im Profitopf', defend(cupBl2[0]), cup=>cup.pro.indexOf(cupBl2[0])>=0 && cup.amateur.indexOf(cupBl2[0])<0 && cupL3[7] && cup.entrants.indexOf(cupL3[7])>=0);
  checkField('schwächster Zweitligist rückt, der Titelverteidiger aus der unteren 2. Liga nicht', defend(cupBl2[14]), cup=>cup.pro.indexOf(cupBl2[14])>=0 && cup.amateur.indexOf(cupBl2[14])<0 && cup.amateur.indexOf(cupBl2[11])>=0 && cup.pro.indexOf(cupBl2[11])<0 && cup.entrants.indexOf(cupL3[7])>=0);
  checkField('Drittligist im Fenster bleibt im Feld und im Profitopf', defend(cupL3[2]), cup=>cup.pro.indexOf(cupL3[2])>=0 && cup.amateur.indexOf(cupL3[2])<0 && cup.entrants.indexOf(cupL3[7])>=0 && BL_ORDER.every(st=>cup.entrants.indexOf(landWinners[st])>=0));
  checkField('Drittligist außerhalb ersetzt den letzten 3.-Liga-Platz', defend(cupL3[10]), cup=>cup.entrants.indexOf(cupL3[10])>=0 && cup.pro.indexOf(cupL3[10])>=0 && cup.entrants.indexOf(cupL3[7])<0 && cup.entrants.indexOf(cupL3[6])>=0 && cup.amateur.indexOf(cupBl2[11])>=0 && BL_ORDER.every(st=>cup.entrants.indexOf(landWinners[st])>=0));
  const regional=takeCup(null,1)[0];
  checkField('Regionalliga-Titelverteidiger ersetzt den 3.-Liga-Platz und spielt im Profitopf', defend(regional), cup=>cup.pro.indexOf(regional)>=0 && cup.amateur.indexOf(regional)<0 && cup.entrants.indexOf(cupL3[7])<0 && BL_ORDER.every(st=>cup.entrants.indexOf(landWinners[st])>=0));
  const amateurDef=landWinners[BL_ORDER[0]];
  checkField('Amateur-Titelverteidiger bleibt und verdrängt keinen Landespokalsieger', defend(amateurDef), cup=>cup.entrants.filter(id=>id===amateurDef).length===1 && cup.pro.indexOf(amateurDef)>=0 && cup.amateur.indexOf(amateurDef)<0 && BL_ORDER.every(st=>cup.entrants.indexOf(landWinners[st])>=0));
  const promoted=cupL3[0], relegated=cupBl2[19];
  const nextBl=cupBl.slice();
  const nextBl2=cupBl2.slice(0,19).concat([promoted]);
  const setKey=arr=>(arr||[]).slice().sort().join('|');
  const classic=buildCups(nextBase, prevBase).dfb;
  const shifted=buildCups(seasonOf(nextBl, nextBl2, cupL3), prevBase).dfb;
  check('Auf- und Abstieg lassen das Vorsaison-Feld gleich', setKey(shifted.entrants)===setKey(classic.entrants) && setKey(shifted.pro)===setKey(classic.pro) && shifted.entrants.indexOf(relegated)>=0 && shifted.entrants.filter(id=>id===promoted).length===1 && shifted.entrants.indexOf(cupL3[7])>=0);
  check('bereits qualifizierter Sieger ändert das Feld nicht', setKey(defend(cupBl[3]).entrants)===setKey(classic.entrants) && setKey(defend(cupBl2[0]).entrants)===setKey(classic.entrants) && setKey(defend(cupBl2[14]).entrants)===setKey(classic.entrants) && setKey(defend(cupL3[2]).entrants)===setKey(classic.entrants));
  check('unterer Zweitligist wechselt nur den Topf', (()=>{ const c=defend(cupBl2[14]); return setKey(c.entrants)===setKey(classic.entrants) && c.pro.indexOf(cupBl2[14])>=0 && c.amateur.indexOf(cupBl2[11])>=0 && c.pro.indexOf(cupBl2[11])<0; })());
  const defendedPromoted=defend(promoted, nextBl, nextBl2);
  check('Drittliga-Aufsteiger als Titelverteidiger bleibt einmal im Feld, der Zweitliga-Absteiger auch', defendedPromoted.entrants.filter(id=>id===promoted).length===1 && defendedPromoted.pro.indexOf(promoted)>=0 && defendedPromoted.entrants.indexOf(relegated)>=0 && defendedPromoted.entrants.indexOf(cupL3[7])>=0 && setKey(defendedPromoted.entrants)===setKey(classic.entrants));
  const relegatedWinner=cupBl[19];
  const nextAfterDropBl=cupBl.slice(0,19).concat([cupBl2[0]]);
  const nextAfterDropBl2=[relegatedWinner].concat(cupBl2.slice(1));
  checkField('abgestiegener Titelverteidiger bleibt im Profitopf', defend(relegatedWinner, nextAfterDropBl, nextAfterDropBl2), cup=>{
    return setKey(cup.entrants)===setKey(classic.entrants) && cup.pro.indexOf(relegatedWinner)>=0 && cup.amateur.indexOf(relegatedWinner)<0 && cup.pro.indexOf(cupBl2[11])>=0 && cup.amateur.indexOf(cupBl2[12])>=0 && cup.entrants.filter(id=>id===relegatedWinner).length===1;
  });
  const keptLand=seasonOf(cupBl, cupBl2, cupL3);
  keptLand.cups={dfb:{rounds:[]}, land:{Bayern:{entrants:['keep-land'], rounds:[{name:'Finale'}]}}};
  check('leerer Pokal im laufenden Feld sperrt nicht', seasonEndBlock(keptLand)==='');
  ensureCups(keptLand);
  check('fehlender DFB-Pokal wird ergänzt und der Landespokal bleibt', keptLand.cups.dfb && keptLand.cups.dfb.rounds.length===6 && keptLand.cups.land.Bayern.entrants[0]==='keep-land' && seasonEndBlock(keptLand)==='DFB-Pokal');
  check('1904, 1922 und 1945 haben keinen Meister', !reg.some(r=>r.comp==='de' && (r.year===1904||r.year===1922||r.year===1945)));
  check('keine historischen Titel ab 2027', !reg.some(r=>r.year>=2027));
  check('kein Landespokal im Register', !reg.some(r=>r.comp==='land'));
  const fdgb1957=reg.filter(r=>r.comp==='fdgb'&&r.year===1957);
  check('FDGB 1957 steht einmal als SC Lokomotive Leipzig', fdgb1957.length===1 && fdgb1957[0].original==='SC Lokomotive Leipzig' && fdgb1957[0].id==='t084');
  check('1952 ist Volkspolizei, 1963 Motor Jena, 1964 Aufbau Magdeburg', historicalTitleRows().find(r=>r.comp==='fdgb'&&r.year===1952).original==='SG Volkspolizei Dresden' && historicalTitleRows().find(r=>r.comp==='ddr'&&r.year===1963).original==='SC Motor Jena' && historicalTitleRows().find(r=>r.comp==='fdgb'&&r.year===1964).original==='SC Aufbau Magdeburg');
  check('Wismut liegt bei Aue, Karl-Marx-Stadt bei Chemnitz', reg.filter(r=>r.original.indexOf('Wismut')>=0).every(r=>r.id==='t033') && reg.find(r=>r.comp==='ddr'&&r.year===1967).id==='t056');
  const blLines=ansehenLedger('t001').lines.filter(l=>l.kind==='titel' && l.label==='Meistertitel Bundesliga');
  const seenBl={}; let blDup=0;
  blLines.forEach(l=>{ if(seenBl[l.season]) blDup++; seenBl[l.season]=1; });
  const de1932=ansehenLedger('t001').lines.find(l=>l.histKey==='de|1932');
  check('Bayern-Bundesligatitel nicht doppelt', blDup===0 && blLines.length>=34);
  check('Bayern 1932 ist ein großer Titel', !!de1932 && de1932.durable===true && de1932.original===180 && de1932.factor===titleFactor(de1932.age, true));
  const lok1957=ansehenLedger('t084').lines.filter(l=>l.histKey==='fdgb|1957');
  const chem1957=ansehenLedger('t139').lines.filter(l=>l.histKey==='fdgb|1957');
  check('FDGB 1957 zählt einmal nur bei Lok', lok1957.length===1 && chem1957.length===0 && lok1957[0].original===50 && lok1957[0].label==='FDGB-Pokal-Titel', lok1957.length+'/'+chem1957.length);
  const frozenOnly=landScaleFromStored({budget:99, title:40, rounds:['Finale'], n:2, field:12, unknown:0, byLevel:{3:2}});
  check('eingefrorene Ligazahlen werden neu gerechnet und nicht geraten', frozenOnly.byLevel[3]===2 && frozenOnly.field===ansehenRound2(2*ANSEHEN.land.levelW[3]) && frozenOnly.budget!==99 && landWinnerSum(frozenOnly)<=35);
  check('unterer Meistertitel bleibt ohne Boden', titleFactor(99, false)===0.01 && titleFactor(100, false)===0 && titleFactor(60, true)===0.4);
  return {ok:!fails.length, fails, geoProof, sample:{bayern:bScale.budget, bremen:rScale.budget, neunkirchen:ansehenLedger('t181').value, bayernAnsehen:ansehenLedger('t001').value, historie:histBefore, worstLeague, worstBl:{age:worstBl.age, meister:worstBl.meister, platz2:worstBl.p2, ratio:ansehenRound2(worstBl.ratio)}, curve:{a49:seasonFactor(49,true), a50:seasonFactor(50,true), slopeEarly, slopeLate}}};
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
const clubLeagueIdx=new WeakMap();
function clubLeagueId(season, id){
  let rec=clubLeagueIdx.get(season);
  const leagues=season.leagues, pools=season.pools;
  if (!rec || rec.leagues!==leagues || rec.pools!==pools){
    const map=new Map();
    for (const lid in leagues){
      const teams=leagues[lid].teams;
      for (let i=0;i<teams.length;i++) if (!map.has(teams[i])) map.set(teams[i], lid);
    }
    for (const pid in pools){
      const teams=pools[pid]||[];
      for (let i=0;i<teams.length;i++) if (!map.has(teams[i])) map.set(teams[i], pid);
    }
    rec={leagues, pools, map};
    clubLeagueIdx.set(season, rec);
  }
  return rec.map.get(id)||'';
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
  const spec=L[lid]; if(!spec) return {};
  const lg=season.leagues[lid]; if(!lg) return {};
  const table=leagueTable(season, lid);
  const rem={};
  (lg.teams||[]).forEach(id=>rem[id]=0);
  if (lg.md) lg.md.forEach(md=>md.forEach(m=>{ if(m[2]==null||m[3]==null){ rem[lg.teams[m[0]]]++; rem[lg.teams[m[1]]]++; } }));
  const pairs=settledPairs(lg);
  const down=relegationProfile(season, lid).down||0;
  const info=table.map(r=>({id:r.id, pl:r.pl, min:r.pkt, max:r.pkt+3*(rem[r.id]||0), rem:rem[r.id]||0, key:r.tieSig||sportingKey(r)}));
  const n=info.length, res={};
  info.forEach(t=>{
    let worst=0, certain=0;
    info.forEach(o=>{
      if (o.id===t.id) return;
      const rel=placeRelation(o, t, pairs);
      if (rel!=='behind') worst++;
      if (rel==='ahead') certain++;
    });
    const upSure=promotionCount(season, lid);
    if (upSure && worst<upSure) res[t.id]='up';
    else if (down && certain>=n-down) res[t.id]='down';
  });
  return res;
}
function l5Balance(k){
  const kk=Math.max(0, k|0);
  if (kk<=0) return {r:4, down:2, vice:2, mode:'beide'};
  if (kk===1) return {r:3, down:2, vice:1, mode:'relegation'};
  return {r:2, down:kk, vice:0, mode:'meister'};
}
function l5Incoming(season, lid){
  const parentDown=L.L4.down||0;
  if (!parentDown || !season || !season.leagues || !season.leagues.L4) return [];
  return leagueTable(season, 'L4').slice(-parentDown).map(r=>r.id).filter(id=>homeLeague(id, 5)===lid);
}
function rowQuot(row){
  const sp=row&&row.sp||0;
  if (!sp) return row&&row.pkt||0;
  return (row.pkt||0)/sp;
}
function rowDiff(row){ return row&&row.diff!=null ? row.diff : ((row&&row.tg)||0)-((row&&row.gt)||0); }
function betterCandidate(a, b){
  const qa=rowQuot(a.row), qb=rowQuot(b.row);
  if (qa!==qb) return qa>qb?-1:1;
  const da=rowDiff(a.row), db=rowDiff(b.row);
  if (da!==db) return da>db?-1:1;
  const ga=(a.row.tg||0), gb=(b.row.tg||0);
  if (ga!==gb) return ga>gb?-1:1;
  return a.order-b.order;
}
// Freie Plätze = 4 − k. Beide Meister steigen immer auf.
// k = 0: beide Vizemeister direkt. k = 1: Relegation der Vizemeister. Ab k = 2 nur die Meister, Absteiger = k.
function promotionPlan(season, lid){
  const lg=L[lid];
  if (!lg || lg.level!==6) return {up:lg?lg.up||0:0, slots:{}, k:0, total:0, note:'', decided:'', mode:'', down:0};
  if (season) syncRelay(season);
  const l5=lg.upTo;
  const rls=(L5_FEED.find(p=>p.id===l5)||{rls:[]}).rls.slice();
  const incoming=l5Incoming(season, l5);
  const k=incoming.length;
  const bal=l5Balance(k);
  const slots={};
  rls.forEach(id=>slots[id]=1);
  const rel=bal.mode==='relegation'?relayOf(season, l5):null;
  const w=relayWinner(rel);
  let decided='';
  if (bal.mode==='beide'){
    rls.forEach(id=>slots[id]=2);
    decided='Weil niemand aus der 4. Liga kommt, steigen beide Meister und beide Vizemeister auf.';
  } else if (bal.mode==='relegation'){
    if (w && rel){
      const winRl=w===rel.better?rel.rlBetter:rel.rlWorse;
      if (slots[winRl]!=null) slots[winRl]=2;
      const loser=w===rel.better?rel.worse:rel.better;
      decided=(TEAMS[w]?TEAMS[w].name:w)+' gewinnt die Relegation und steigt auf. '+(TEAMS[loser]?TEAMS[loser].name:loser)+' bleibt in der Regionalliga.';
    } else decided='Die beiden Vizemeister spielen die Relegation: Hin- und Rückspiel, Gesamtergebnis, keine Auswärtstore und keine Verlängerung. Steht es danach gleich, entscheidet das Elfmeterschießen. Das Heimrecht im Rückspiel hat der bessere Punktequotient.';
  } else if (k===2) decided='Das ist der Normalfall. Es steigen nur die beiden Meister auf, und in der 5. Liga bleiben es zwei Absteiger.';
  else decided='Es steigen nur die beiden Meister auf. Zu den zwei festen Absteigern der 5. Liga kommen '+(k-2)+' als Ausgleich.';
  const openPlay=bal.mode==='relegation' && !w;
  const bits=openPlay?'beide Meister und der Sieger der Relegation':rls.map(id=>L[id].name+' '+(slots[id]>1?'Meister und Vizemeister':'Meister')).join(', ');
  const downBit=bal.down===2?' Es bleiben die zwei festen Absteiger.':' Zu den zwei festen Absteigern kommen '+(bal.down-2)+' als Ausgleich.';
  const note='In die '+L[l5].name+' kommen '+k+' Absteiger aus der 4. Liga. Freie Plätze: '+(4-k)+'. Die Plätze 1 und 2 steigen fest auf.'+downBit+' Aus den Regionalligen '+(openPlay?'kommen 3 Vereine, sobald die Relegation steht':'kommen '+bal.r+' Vereine')+': '+bits+'. '+decided;
  return {up:slots[lid]||1, slots, k, total:openPlay?2:bal.r, note, decided, mode:bal.mode, down:bal.down, open:openPlay};
}
function promotionCount(season, lid){
  const lg=L[lid];
  if (!lg) return 0;
  if (lg.level!==6) return lg.up||0;
  return promotionPlan(season, lid).up;
}
// Abstiegszahl dieser Saison. Bis zur 4. Liga fest.
// 5. Liga: zwei feste Absteiger, ab k = 3 zusätzlich der Ausgleich. Absteiger = max(2, k).
// Regionalliga: zwei feste Absteiger, plus so viele, wie mehr ankommen als nach oben gehen.
function relegationProfile(season, lid){
  const lg=L[lid];
  if (!lg) return {down:0, nominal:0, incoming:[], reason:'', up:0, amateur:0};
  const nominal=lg.down||0;
  if (lg.level<=4) return {down:nominal, nominal, incoming:[], reason:'', up:lg.up||0, amateur:0};
  const abText = n=>n===0?'steigt niemand ab':n===1?'steigt eine Mannschaft ab':'steigen '+n+' Mannschaften ab';
  const arriveText = (list, from)=>{
    const names=list.map(id=>TEAMS[id]&&TEAMS[id].name).filter(Boolean).join(', ');
    if (!list.length) return 'Aus '+from+' kommt niemand';
    if (list.length===1) return 'Aus '+from+' kommt '+names;
    return 'Aus '+from+' kommen '+list.length+' Vereine ('+names+')';
  };
  if (lg.level===5){
    const incoming=l5Incoming(season, lid);
    const bal=l5Balance(incoming.length);
    const feed=L5_FEED.find(p=>p.id===lid);
    const plan=feed?promotionPlan(season, feed.rls[0]):{note:''};
    const reason='Die Plätze 1 und 2 steigen fest in die 4. Liga auf. Zwei Absteiger sind fest. '+arriveText(incoming, 'der 4. Liga')+'. '+plan.note+' Damit die Staffel bei '+lg.size+' bleibt, '+abText(bal.down)+'.';
    return {down:bal.down, nominal, incoming, reason, up:2, amateur:0};
  }
  const parent=lg.upTo;
  const plan=promotionPlan(season, lid);
  const parentDown=relegationProfile(season, parent).down;
  const incoming=parentDown && season.leagues && season.leagues[parent]?leagueTable(season, parent).slice(-parentDown).map(r=>r.id).filter(id=>homeLeague(id, 6)===lid):[];
  const i=incoming.length, u=plan.up;
  const down=2+Math.max(0, i-u);
  const amateur=2+Math.max(0, u-i);
  const states=(RL_STATES[lid]||[]).join(', ');
  let upLine='Nur der Meister steigt auf.';
  if (u>1) upLine='Meister und Vizemeister steigen auf.';
  else if (plan.mode==='relegation'){
    const rel=relayOf(season, parent), w=relayWinner(rel);
    upLine=w?'Der Meister steigt fest auf. Der Vizemeister hat die Relegation verloren und bleibt.':'Der Meister steigt fest auf. Der Vizemeister spielt die Relegation gegen den anderen Vizemeister.';
  }
  const reason=plan.note+' '+arriveText(incoming, 'der '+L[parent].name)+' und '+((i===1)?'geht':'gehen')+' in die Regionalliga des eigenen Bundeslandes. '+upLine+' Zwei Absteiger sind fest'+(down>2?', dazu '+(down-2)+' als Ausgleich':'')+'. Aus der Amateurliga ('+states+') rücken '+amateur+' Vereine nach. Damit die Staffel bei '+lg.size+' bleibt, '+abText(down)+'.';
  return {down, nominal, incoming, reason, up:u, amateur};
}
function leagueReady(season, lid){
  const lg=season && season.leagues && season.leagues[lid];
  if (!lg) return false;
  if (leagueFinished(season, lid)) return true;
  return !!(lg.tables && lg.tables.all && lg.tables.all.length && !lg.md);
}
function relayOf(season, l5){ return season && season.relay && season.relay[l5] || null; }
function relayWinner(rel){
  if (!rel || !rel.matches) return null;
  return twoLegWinner(rel.matches.find(m=>m.leg===1), rel.matches.find(m=>m.leg===2));
}
function relayPair(season, l5){
  const feed=L5_FEED.find(p=>p.id===l5);
  if (!feed) return null;
  const cands=feed.rls.map((id, order)=>{
    let table=[];
    try{ table=leagueTable(season, id)||[]; }catch(e){ table=[]; }
    const row=table[1]||{id:'', pkt:0, sp:0, tg:0, gt:0, diff:0};
    return {id, order, row, team:row.id};
  }).filter(c=>c.team && TEAMS[c.team]);
  if (cands.length<2) return null;
  cands.sort(betterCandidate);
  return {better:cands[0], worse:cands[1]};
}
function syncRelay(season, force){
  if (!season || !season.leagues) return;
  if (!season.relay) season.relay={};
  L5_IDS.forEach(l5=>{
    const feed=L5_FEED.find(p=>p.id===l5);
    const ready=!!(feed && leagueReady(season, 'L4') && feed.rls.every(rl=>leagueReady(season, rl)));
    const old=season.relay[l5];
    if (!ready && !force){
      if (!(old && old.forced)) delete season.relay[l5];
      return;
    }
    if (season.compact && !old) return;
    if (!feed){ delete season.relay[l5]; return; }
    let k=0;
    try{ k=l5Incoming(season, l5).length; }catch(e){ k=0; }
    if (l5Balance(k).mode!=='relegation'){ delete season.relay[l5]; return; }
    const pair=relayPair(season, l5);
    if (!pair){ delete season.relay[l5]; return; }
    const same=old && old.better===pair.better.team && old.worse===pair.worse.team && old.matches && old.matches.length===2;
    if (same){ old.k=k; old.forced=!ready; return; }
    const slot=finalSaturdaySlot(l5);
    const leg1={leg:1, h:pair.worse.team, a:pair.better.team, hg:null, ag:null, et:false, peh:null, pea:null, slot};
    const leg2={leg:2, h:pair.better.team, a:pair.worse.team, hg:null, ag:null, et:false, peh:null, pea:null, slot};
    season.relay[l5]={l5, k, forced:!ready, better:pair.better.team, worse:pair.worse.team, rlBetter:pair.better.id, rlWorse:pair.worse.id, matches:[leg1, leg2]};
  });
  if (!Object.keys(season.relay).length) delete season.relay;
}
function relayPending(season){
  if (!season || !season.leagues) return false;
  if (season.relay && Object.keys(season.relay).some(id=>season.relay[id] && !relayWinner(season.relay[id]))) return true;
  return L5_IDS.some(id=>{
    const feed=L5_FEED.find(p=>p.id===id);
    if (!feed || !leagueReady(season, 'L4') || feed.rls.some(rl=>!leagueReady(season, rl))) return false;
    let k=0;
    try{ k=l5Incoming(season, id).length; }catch(e){ return false; }
    return l5Balance(k).mode==='relegation' && !relayWinner(relayOf(season, id));
  });
}
function simRelay(season){
  syncRelay(season);
  if (!season || !season.relay) return 0;
  let c=0;
  Object.keys(season.relay).forEach(l5=>{
    const rel=season.relay[l5];
    const leg1=rel.matches.find(m=>m.leg===1);
    const leg2=rel.matches.find(m=>m.leg===2);
    [leg1, leg2].forEach(m=>{
      if (!m || (m.hg!=null && m.ag!=null)) return;
      const r=simMatch(m.h, m.a);
      m.hg=r[0]; m.ag=r[1]; m.et=false; m.peh=null; m.pea=null;
      c++;
    });
    if (!leg1 || !leg2 || relayWinner(rel) || !aggregateLevel(leg1, leg2)) return;
    const pens=simShootout();
    leg2.peh=pens[0]; leg2.pea=pens[1]; leg2.et=false;
    c++;
  });
  return c;
}
function relayInvolving(season, id){
  if (!season || !season.relay || !id) return null;
  const keys=Object.keys(season.relay);
  for (let i=0;i<keys.length;i++){
    const rel=season.relay[keys[i]];
    if (rel && (rel.better===id || rel.worse===id)) return rel;
  }
  return null;
}
function relayHistNote(season, id){
  const rel=relayInvolving(season, id);
  if (!rel || !TEAMS[id]) return '';
  const opp=rel.better===id?rel.worse:rel.better;
  const oppName=TEAMS[opp]?TEAMS[opp].name:opp;
  const leg1=(rel.matches||[]).find(m=>m.leg===1), leg2=(rel.matches||[]).find(m=>m.leg===2);
  const w=relayWinner(rel);
  if (!leg1 || !leg2 || leg1.hg==null || leg2.hg==null || !w) return 'Relegation gegen '+oppName+', noch offen.';
  const mine=m=>m.h===id?m.hg+':'+m.ag:m.ag+':'+m.hg;
  let pen='';
  if (leg2.peh!=null && leg2.pea!=null && leg2.peh!==leg2.pea){
    const mp=leg2.h===id?leg2.peh:leg2.pea, op=leg2.h===id?leg2.pea:leg2.peh;
    pen=', '+mp+':'+op+' i.E.';
  }
  const end=w===id?'Sieger, Aufstieg in die '+(L[rel.l5]?L[rel.l5].name:'5. Liga'):'Verlierer, bleibt in der Regionalliga';
  return 'Relegation gegen '+oppName+': Hinspiel '+mine(leg1)+', Rückspiel '+mine(leg2)+pen+', '+end+'.';
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

// Spielplan: Kreis/Berger. Die Rückrunde ist dieselbe Reihenfolge, Heimrecht getauscht,
// Spieltag 1 also genau N−1 Spieltage später. Heim und Auswärts wechseln so, dass nirgends
// drei gleiche Platzseiten aufeinanderfolgen, den Übergang eingeschlossen.
// Bei vier Vereinen ist das mit dieser Spiegelung nicht möglich; größere gerade Felder schon.
// Zufall nur über Verein → Position. Die Gesamtzahl der Breaks ist keine Grenze.
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
  for (let r=0;r<m;r++) order.push(r);
  return order;
}
function scheduleMirrorHolds(md){
  if (!md||!md.length||!md[0]) return false;
  const games=md[0].length;
  const evenN=games*2, oddN=games*2+1;
  const bye=md.length===oddN*2;
  const n=bye?oddN:evenN, half=bye?oddN:(evenN-1);
  if (md.length!==half*2) return false;
  for (let r=0;r<half;r++){
    const a=md[r], b=md[r+half];
    if (!a||!b||a.length!==b.length) return false;
    const want={};
    a.forEach(m=>{ if(m[0]===m[1]) return; want[m[1]+'>'+m[0]]=1; });
    if (Object.keys(want).length!==a.length) return false;
    for (const m of b) if (!want[m[0]+'>'+m[1]]) return false;
    if (bye){
      const seen={};
      a.forEach(m=>{ seen[m[0]]=seen[m[1]]=1; });
      let miss=0;
      for (let i=0;i<n;i++) if (!seen[i]) miss++;
      if (miss!==1) return false;
    }
  }
  return true;
}
function repairOpenReturns(season){
  const report={fixed:[], skipped:[]};
  if (!season||!season.leagues||season.status!=='running') return report;
  LEAGUES.forEach(l=>{
    const lg=season.leagues[l.id];
    if (!lg||!lg.md||!lg.md[0]||!lg.teams) return;
    const half=seasonShape(lg.teams.length).half;
    if (lg.md.length!==half*2){ report.skipped.push(l.id+':form'); return; }
    if (scheduleMirrorHolds(lg.md)) return;
    for (let r=half;r<lg.md.length;r++){
      if ((lg.md[r]||[]).some(m=>m&&(m[2]!=null||m[3]!=null))){ report.skipped.push(l.id+':ergebnis'); return; }
    }
    const kicks=season.kickoffs&&season.kickoffs[l.id];
    if (kicks){
      for (let r=half;r<lg.md.length;r++) if (kicks[r]){ report.skipped.push(l.id+':termin'); return; }
    }
    for (let r=0;r<half;r++) lg.md[half+r]=lg.md[r].map(m=>[m[1], m[0], null, null]);
    report.fixed.push(l.id);
    fixtureEpoch++;
  });
  return report;
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
  const games=md[0].length;
  const bye=md.length===(games*2+1)*2;
  const n=bye?games*2+1:games*2, half=bye?n:n-1;
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
      if (seen.size!==(bye?n-1:n)) issues.push('unvollständig '+(r+1));
    }
  }
  for (let t=0;t<n;t++){
    let prev=-1, misses=0;
    for (let r=0;r<md.length;r++){
      const m=md[r].find(x=>x[0]===t||x[1]===t);
      if (!m){ misses++; continue; }
      const opp=m[0]===t?m[1]:m[0];
      if (opp===prev) issues.push('gleicher Gegner am Stück');
      prev=opp;
    }
    if (bye){ if (misses!==2) issues.push('spielfrei '+t); }
    else if (misses) issues.push('fehlt Spieltag');
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
  let sameKind=0, maxRun=1;
  seq.forEach((s,i)=>{
    let run=1;
    for (let k=1;k<s.length;k++){ if (s[k]===s[k-1]) run++; else run=1; if (run>maxRun) maxRun=run; }
    if (run>2 || /HHH|AAA/.test(s)) issues.push('Serie bei '+i);
    if (kinds[i].hh>1 || kinds[i].aa>1) sameKind++;
  });
  const maxBreaks=breaks.length?Math.max(...breaks):0;
  const halfBreaks=[0,1].map(p=>halfSeq[p].reduce((a,s)=>a+breakCount(s),0));
  return {ok:issues.length===0, issues, maxBreaks, maxRun, breaks, halfBreaks, sameKind, kinds};
}
const CANON_SCHEDULE={};
function canonRng(seed){
  let a=seed>>>0;
  return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15, 1|a); t=t+Math.imul(t^t>>>7, 61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
}
function firstHalfStreaks(first){
  const n=first[0].length*2, seq=Array.from({length:n},()=>'');
  first.concat(first.map(ps=>ps.map(([h,a])=>[a,h]))).forEach(ps=>ps.forEach(([h,a])=>{ seq[h]+='H'; seq[a]+='A'; }));
  let bad=0;
  seq.forEach(s=>{ let c=1; for (let i=1;i<s.length;i++){ if (s[i]===s[i-1]) c++; else c=1; if (c>=3) bad++; } });
  return bad;
}
function canonicalFirstHalf(n){
  if (CANON_SCHEDULE[n]) return CANON_SCHEDULE[n];
  const base=bergerRounds(n);
  const last=Array(n).fill(''), used=Array(base.length).fill(false), first=[];
  for (let step=0; step<base.length; step++){
    let best=null;
    for (let r=0;r<base.length;r++) if (!used[r]){
      const pairs=base[r].map(p=>p.slice()), next=last.slice();
      let breaks=0;
      for (let i=0;i<pairs.length;i++){
        const score=(h,aw)=>(last[h]==='H'?1:0)+(last[aw]==='A'?1:0);
        const [a,b]=pairs[i];
        if (score(b,a)<score(a,b)) pairs[i]=[b,a];
        next[pairs[i][0]]='H'; next[pairs[i][1]]='A';
        if (last[pairs[i][0]]==='H') breaks++;
        if (last[pairs[i][1]]==='A') breaks++;
      }
      if (!best || breaks<best.breaks) best={r, pairs, next, breaks};
    }
    used[best.r]=true; first.push(best.pairs);
    for (let i=0;i<n;i++) last[i]=best.next[i];
  }
  let bad=firstHalfStreaks(first);
  const rnd=canonRng(n*97+3);
  for (let guard=0; guard<20000 && bad; guard++){
    const r=Math.floor(rnd()*first.length), i=Math.floor(rnd()*first[r].length);
    const p=first[r][i];
    first[r][i]=[p[1], p[0]];
    const next=firstHalfStreaks(first);
    if (next<=bad) bad=next; else first[r][i]=p;
  }
  if (bad){
    CANON_SCHEDULE[n]={rounds:null, bad, unsolved:true};
    return CANON_SCHEDULE[n];
  }
  CANON_SCHEDULE[n]={rounds:first, bad:0, unsolved:false};
  return CANON_SCHEDULE[n];
}
function bergerWithBye(n){
  const raw=bergerRounds(n+1);
  return raw.map(ps=>ps.filter(([h,a])=>h!==n && a!==n).map(p=>p.slice()));
}
function streakBad(first, n){
  const seq=Array.from({length:n},()=>'');
  first.concat(first.map(ps=>ps.map(([h,a])=>[a,h]))).forEach(ps=>ps.forEach(([h,a])=>{ seq[h]+='H'; seq[a]+='A'; }));
  let bad=0;
  seq.forEach(s=>{ let c=1; for (let i=1;i<s.length;i++){ if (s[i]===s[i-1]) c++; else c=1; if (c>=3) bad++; } });
  return bad;
}
function canonicalByeHalf(n){
  const key='b'+n;
  if (CANON_SCHEDULE[key]) return CANON_SCHEDULE[key];
  const base=bergerWithBye(n);
  const last=Array(n).fill(''), used=Array(base.length).fill(false), first=[];
  for (let step=0; step<base.length; step++){
    let best=null;
    for (let r=0;r<base.length;r++) if (!used[r]){
      const pairs=base[r].map(p=>p.slice()), next=last.slice();
      let breaks=0;
      for (let i=0;i<pairs.length;i++){
        const score=(h,aw)=>(last[h]==='H'?1:0)+(last[aw]==='A'?1:0);
        const [a,b]=pairs[i];
        if (score(b,a)<score(a,b)) pairs[i]=[b,a];
        next[pairs[i][0]]='H'; next[pairs[i][1]]='A';
        if (last[pairs[i][0]]==='H') breaks++;
        if (last[pairs[i][1]]==='A') breaks++;
      }
      if (!best || breaks<best.breaks) best={r, pairs, next, breaks};
    }
    used[best.r]=true; first.push(best.pairs);
    for (let i=0;i<n;i++) last[i]=best.next[i]||last[i];
  }
  let bad=streakBad(first, n);
  const rnd=canonRng(n*97+11);
  for (let guard=0; guard<20000 && bad; guard++){
    const r=Math.floor(rnd()*first.length), i=Math.floor(rnd()*first[r].length);
    const p=first[r][i];
    first[r][i]=[p[1], p[0]];
    const next=streakBad(first, n);
    if (next<=bad) bad=next; else first[r][i]=p;
  }
  CANON_SCHEDULE[key]=bad?{rounds:null, bad, unsolved:true}:{rounds:first, bad:0, unsolved:false};
  return CANON_SCHEDULE[key];
}
function makeSchedule(n){
  if (n && n%2 && n>=3){
    const canon=canonicalByeHalf(n);
    if (!canon.rounds || canon.unsolved || canon.bad){
      const err=new Error('Spielplan für '+n+' Vereine hält die Serie 2 nicht (Rest '+(canon.bad||0)+').');
      err.scheduleUnsolved=true; err.size=n; err.bad=canon.bad||0;
      throw err;
    }
    const perm=shuffle(Array.from({length:n},(_,i)=>i));
    const hin=canon.rounds.map(ps=>ps.map(([h,a])=>[perm[h],perm[a],null,null]));
    const rueck=canon.rounds.map(ps=>ps.map(([h,a])=>[perm[a],perm[h],null,null]));
    return hin.concat(rueck);
  }
  if (!n || n<2){
    const rounds=bergerRounds(n);
    const perm=shuffle(Array.from({length:n},(_,i)=>i));
    const hin=rounds.map(ps=>ps.map(([h,a])=>[perm[h],perm[a],null,null]));
    const rueck=returnRoundOrder(n).map(r=>rounds[r].map(([h,a])=>[perm[a],perm[h],null,null]));
    return hin.concat(rueck);
  }
  const canon=canonicalFirstHalf(n);
  if (!canon.rounds || canon.unsolved || canon.bad){
    const err=new Error(n<6
      ? 'Vier Vereine: Spiegelung und höchstens zwei gleiche Platzseiten sind zugleich unlösbar.'
      : 'Spielplan für '+n+' Vereine hält die Serie 2 nicht (Rest '+(canon.bad||0)+').');
    err.scheduleUnsolved=true;
    err.size=n;
    err.bad=canon.bad||0;
    throw err;
  }
  const perm=shuffle(Array.from({length:n},(_,i)=>i));
  const hin=canon.rounds.map(ps=>ps.map(([h,a])=>[perm[h],perm[a],null,null]));
  const rueck=canon.rounds.map(ps=>ps.map(([h,a])=>[perm[a],perm[h],null,null]));
  return hin.concat(rueck);
}

// ---------- Zustand ----------
const KEY = 'fussballrechner_v3';
const OLD_KEY = 'fussballrechner_v2';
let S;
function withHistoryOnly(fn){
  const prev=S;
  S={seasons:[], chronicle:[], pokalRuns:[], view:0, ui:{}};
  resetDerivedIndex();
  try { return fn(); }
  finally { S=prev; resetDerivedIndex(); }
}
const RL_IDS=['RLN','RLO','RLS','RLW'];
const L5_IDS=['L5NO','L5SW'];
function buildInitialSquads(){
  return withHistoryOnly(()=>{
    const ids=Object.keys(TEAMS).sort((a,b)=>ansehenValue(b)-ansehenValue(a) || TEAMS[a].name.localeCompare(TEAMS[b].name,'de'));
    const used=new Set();
    const take=n=>{
      const out=[];
      ids.forEach(id=>{ if(out.length>=n || used.has(id)) return; out.push(id); used.add(id); });
      return out;
    };
    const takeRegion=(lid, size, match)=>{
      const pool=ids.filter(id=>!used.has(id) && match(TEAMS[id].bl));
      const out=pool.slice(0, size);
      out.forEach(id=>used.add(id));
      return out;
    };
    const leagues={};
    ['BL','BL2','L3','L4'].forEach(id=>{ leagues[id]=take(L[id].size); });
    L5_IDS.forEach(lid=>{ leagues[lid]=takeRegion(lid, L[lid].size, bl=>BL_L5[bl]===lid); });
    RL_IDS.forEach(lid=>{ leagues[lid]=takeRegion(lid, L[lid].size, bl=>BL_RL[bl]===lid); });
    const pools={};
    POOLS.forEach(pp=>{
      pools[pp.id]=ids.filter(id=>!used.has(id) && TEAMS[id].bl===pp.bl);
      pools[pp.id].forEach(id=>used.add(id));
    });
    return {leagues, pools, used:used.size, total:ids.length};
  });
}
function newGame(){
  const squads=buildInitialSquads();
  const season={name:'2026/27', status:'running', leagues:{}, pools:{}, markers:{}, seed:'ansehen'};
  LEAGUES.forEach(l=>{
    const teams=squads.leagues[l.id].slice();
    season.leagues[l.id]={teams, md:makeSchedule(teams.length)};
  });
  POOLS.forEach(pp=>{ season.pools[pp.id]=squads.pools[pp.id].slice(); });
  season.cups=withHistoryOnly(()=>buildCups(season, null));
  return {v:1, created:new Date().toISOString(), seasons:[season], view:0, ui:{league:'BL', tab:'tabelle', md:{}, autoNext:true, supercup:true}};
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
  const row=[m.h, m.a, m.hg, m.ag, m.et?1:0, m.peh==null?null:m.peh, m.pea==null?null:m.pea, m.neutral?1:0, slot];
  if (m.at!=null) row.push(m.at);
  return row;
}
function unpackMatch(m){
  if (!m || !Array.isArray(m)) return m;
  const slot=m[8];
  const out={h:m[0], a:m[1], hg:m[2], ag:m[3], et:!!m[4], peh:m[5], pea:m[6], neutral:!!m[7], slot:slot?{dow:slot[0], time:slot[1], kind:slot[2]||'', kracher:!!slot[3]}:null};
  if (m.length>9 && m[9]!=null && m[9]!=='') out.at=m[9]|0;
  return out;
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
  if (cup.ansehenScale && cup.ansehenScale.budget!=null) out.ansehenScale=cup.ansehenScale;
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
    if (lg.downN!=null) leagues[id].downN=lg.downN;
  }
  let end=null;
  if (s.endData) end={moves:s.endData.moves, notes:s.endData.notes, need:s.endData.need, picks:s.endData.picks, step:s.endData.step, downOf:s.endData.downOf, pending:s.endData.pending};
  const out={name:s.name, status:s.status, compact:true, absorbed:!!s.absorbed, leagues, pools:s.pools, markers:s.markers, endData:end, cups:packCups(s.cups), supercup:s.supercup};
  if (s.slim) out.slim=s.slim;
  if (s.lgStat) out.lgStat=1;
  if (s.relay) out.relay=s.relay;
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
function structureOk(d){
  const s=d&&d.seasons&&d.seasons[d.seasons.length-1];
  if(!s||!s.leagues) return false;
  if(s.leagues.OLBY||s.leagues.OLNS) return false;
  return LEAGUES.every(l=>s.leagues[l.id]&&s.leagues[l.id].teams&&s.leagues[l.id].teams.length===l.size);
}
const cur = () => S.seasons[S.view];
const latest = () => S.seasons[S.seasons.length-1];
const isEditable = () => S.view === S.seasons.length-1 && cur().status === 'running';

// ---------- Tabellen-Berechnung ----------
function seasonShape(n){
  const even=!n || n%2===0;
  const half=even ? Math.max(0, n-1) : n;
  return {n:n||0, half, total:half*2, games:even ? n/2 : (n-1)/2, bye:!even && n>0};
}
function confHalf(total, lg){
  const n=lg&&lg.teams?lg.teams.length:0;
  if (n>1 && n%2) return n-1;
  return Math.ceil((total||0)/2);
}
function matchesOf(season, lid, filt){
  const lg = season.leagues[lid]; if (!lg || !lg.md) return [];
  const half = seasonShape(lg.teams.length).half, out=[];
  lg.md.forEach((md,mi) => {
    if (filt==='hin' && mi>=half) return;
    if (filt==='rueck' && mi<half) return;
    md.forEach(m => { if (m[2]!=null && m[3]!=null) out.push({md:mi, h:lg.teams[m[0]], a:lg.teams[m[1]], hg:m[2], ag:m[3]}); });
  });
  return out;
}
function emptyRow(id){ return {id, sp:0,s:0,u:0,n:0,tg:0,gt:0,pkt:0,aw:0,form:[]}; }
function addRes(r, gf, ga, md, away, match){
  r.sp++; r.tg+=gf; r.gt+=ga;
  if (away) r.aw+=gf;
  const res = gf>ga?'S':gf<ga?'N':'U';
  if (res==='S'){r.s++; r.pkt+=3;} else if (res==='U'){r.u++; r.pkt+=1;} else r.n++;
  const game=match&&match.h&&match.a&&match.hg!=null&&match.ag!=null?{md, res, h:match.h, a:match.a, hg:match.hg, ag:match.ag}:null;
  r.form.push(game||[md, res]);
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
function byAnsehen(a,b){
  const an=id=>{ try{ const v=ansehenValue(id); return v!=null && isFinite(+v) ? +v : 0; }catch(e){ return 0; } };
  return an(b)-an(a) || (TEAMS[a]&&TEAMS[b] ? TEAMS[a].name.localeCompare(TEAMS[b].name,'de') : 0) || String(a).localeCompare(String(b));
}
function sortUnplayedTable(rows){
  if (!rows || !rows.length || rows.some(r=>!r || r.sp!==0)) return rows;
  const out=rows.map(r=>Object.assign({}, r));
  out.sort((a,b)=>byAnsehen(a.id, b.id));
  out.forEach((r,i)=>r.pl=i+1);
  return out;
}
function computeTable(teamIds, matches, mode){
  const rows = {}; teamIds.forEach(id => rows[id]=emptyRow(id));
  matches.forEach(m => {
    if (mode!=='away' && rows[m.h]) addRes(rows[m.h], m.hg, m.ag, m.md, false, m);
    if (mode!=='home' && rows[m.a]) addRes(rows[m.a], m.ag, m.hg, m.md, true, m);
  });
  let list = Object.values(rows);
  list.forEach(r => {
    r.diff=r.tg-r.gt;
    r.form.sort((a,b)=>(a.md!=null?a.md:a[0])-(b.md!=null?b.md:b[0]));
    const last=r.form.slice(-5);
    r.formGames=last.filter(f=>f && !Array.isArray(f));
    r.form=last.map(f=>Array.isArray(f)?f[1]:f.res);
  });
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
const leagueTableCache=new WeakMap();
function leagueTableKey(season, lid, mode, filt){
  const lg=season.leagues[lid];
  let s=(mode||'all')+'|'+(filt||'')+'|';
  const teams=lg&&lg.teams||[];
  for (let i=0;i<teams.length;i++) s+=teams[i]+',';
  if (season.seed) s+='@'+season.seed;
  s+='#';
  if (!lg || !lg.md) return s+'F';
  const md=lg.md;
  for (let i=0;i<md.length;i++){
    const row=md[i];
    for (let k=0;k<row.length;k++){
      const m=row[k];
      s+=m[2]==null?'.':m[2];
      s+=m[3]==null?'.':m[3];
      s+=';';
    }
    s+='|';
  }
  const decide=lg.decide;
  if (decide) for (let i=0;i<decide.length;i++){
    const m=decide[i];
    s+=m.hg+'/'+m.ag+'/'+(m.peh==null?'':m.peh)+'/'+(m.pea==null?'':m.pea)+'/'+(m.et?1:0)+';';
  }
  return s;
}
function cloneTableRows(rows){
  return rows.map(r=>{
    const c=Object.assign({}, r);
    if (r.form) c.form=r.form.slice();
    if (r.formGames) c.formGames=r.formGames.slice();
    return c;
  });
}
function leagueTable(season, lid, mode, filt){
  const lg=season.leagues[lid];
  if (lg && lg.tables && !lg.md){
    const key=filt==='hin'?'hin':filt==='rueck'?'rueck':mode==='home'?'home':mode==='away'?'away':'all';
    const rows=lg.tables[key]||lg.tables.all||[];
    return rows.map(r=>Object.assign({}, r, {form:(r.form||[]).slice()}));
  }
  let box=leagueTableCache.get(season);
  if (!box){ box=new Map(); leagueTableCache.set(season, box); }
  const cacheKey=leagueTableKey(season, lid, mode, filt);
  const hit=box.get(cacheKey);
  if (hit) return cloneTableRows(hit);
  let rows=computeTable(lg.teams, matchesOf(season,lid,filt), mode||'all');
  if (season.seed==='ansehen' && rows.length && rows.every(r=>!(r.sp>0))){
    const pos=id=>{ const i=(lg.teams||[]).indexOf(id); return i<0?9999:i; };
    rows.sort((a,b)=>pos(a.id)-pos(b.id));
    rows.forEach((r,i)=>{ r.pl=i+1; });
  }
  if (!((mode && mode!=='all') || filt)) rows=applyDecide(season, lid, rows);
  box.set(cacheKey, rows);
  return cloneTableRows(rows);
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
function sportingKey(r){
  return [r.pkt, r.diff, r.tg, r.h2hP||0, r.h2hD||0, r.h2hG||0, r.h2hA||0, r.aw||0].join(',');
}
function settledPairs(lg){
  const set=new Set();
  if (!lg || !lg.decide || !decideSettled(lg.decide)) return set;
  lg.decide.forEach(m=>{ set.add(m.h); set.add(m.a); });
  return set;
}
function placeRelation(o, t, pairs){
  if (o.min>t.max) return 'ahead';
  if (t.min>o.max) return 'behind';
  if ((t.rem||0) || (o.rem||0)) return 'open';
  if ((o.key||'')!==(t.key||'')) return o.pl<t.pl ? 'ahead' : 'behind';
  if (pairs && pairs.has(o.id) && pairs.has(t.id)) return o.pl<t.pl ? 'ahead' : 'behind';
  return 'open';
}
function fixedPlaces(season, lid){
  const lg=season.leagues[lid]; if (!lg) return {};
  const table=leagueTable(season, lid);
  if (!lg.md){ const fixed={}; table.forEach(r=>{ fixed[r.pl]=r.id; }); return fixed; }
  const rem={};
  lg.teams.forEach(id=>rem[id]=0);
  lg.md.forEach(md=>md.forEach(m=>{ if (m[2]==null||m[3]==null){ rem[lg.teams[m[0]]]++; rem[lg.teams[m[1]]]++; } }));
  const pairs=settledPairs(lg);
  const info=table.map(r=>({id:r.id, pl:r.pl, min:r.pkt, max:r.pkt+3*(rem[r.id]||0), rem:rem[r.id]||0, key:r.tieSig||sportingKey(r)}));
  const fixed={};
  info.forEach(t=>{
    const open=info.some(o=>o.id!==t.id && placeRelation(o, t, pairs)==='open');
    if (open) return;
    const ahead=info.filter(o=>o.id!==t.id && placeRelation(o, t, pairs)==='ahead').length;
    fixed[ahead+1]=t.id;
  });
  return fixed;
}
function firstLegLine(lg, mi, hIdx, aIdx){
  if (!lg || !lg.md || !lg.teams) return null;
  const half=seasonShape(lg.teams.length).half;
  if (!(mi>=half)) return null;
  const home=lg.teams[hIdx], away=lg.teams[aIdx];
  if (!home || !away) return null;
  for (let i=0;i<half && i<lg.md.length;i++){
    const swapped=(lg.md[i]||[]).find(m=>lg.teams[m[0]]===away && lg.teams[m[1]]===home);
    if (swapped && swapped[2]!=null && swapped[3]!=null) return swapped[3]+':'+swapped[2];
  }
  return null;
}
function leagueProgress(season, lid){
  const lg=season.leagues[lid]; if (!lg) return {done:0,total:0};
  if (!lg.md){ const n=lg.teams.length, total=n*(n-1); return {done:total, total}; }
  let done=0,total=0; lg.md.forEach(md=>md.forEach(m=>{total++; if(m[2]!=null&&m[3]!=null) done++;})); return {done,total};
}
function seasonProgress(season){ let d=0,t=0; LEAGUES.forEach(l=>{const p=leagueProgress(season,l.id); d+=p.done; t+=p.total;}); return {done:d,total:t}; }
function marksSettled(season, lid){
  const lg=L[lid];
  if (!lg || lg.level<=4) return true;
  if (!season || !season.leagues || !leagueFinished(season, 'L4')) return false;
  if (lg.level===5) return true;
  if (!leagueFinished(season, lg.upTo)) return false;
  let plan=null;
  try{ plan=promotionPlan(season, lid); }catch(e){ plan=null; }
  return !(plan && plan.open);
}
// Vizemeister und Relegationssieger: nur die 4. Liga, bei k = 1 zusätzlich die Relegation.
// Die Zusatzabsteiger bleiben bei marksSettled und warten auf die 5. Liga.
function viceMarksSettled(season, lid){
  const lg=L[lid];
  if (!lg || lg.level!==6) return true;
  if (!season || !season.leagues || !leagueFinished(season, 'L4')) return false;
  let plan=null;
  try{ plan=promotionPlan(season, lid); }catch(e){ plan=null; }
  return !(plan && plan.open);
}
function zoneOf(lg, pl, n, down, eighth){
  if (!lg) return '';
  const d = down==null ? (lg.down||0) : down;
  if (lg.id==='BL'){
    if (pl>n-lg.down) return 'ab';
    if (pl===1) return 'meister';
    if (pl<=4) return 'cl';
    if (pl<=6) return 'el';
    if (pl===7 || (pl===8 && eighth)) return 'ecl';
    return '';
  }
  const up=lg.upShow!=null?lg.upShow:(lg.up||0);
  const fixDown=lg.level>=5?2:d;
  const settled=lg.settled!==false;
  const viceSettled=lg.viceSettled==null ? settled : lg.viceSettled!==false;
  if (lg.level===6 && pl===2 && up>1 && !viceSettled) return 'auf-aus';
  if (lg.viceOpen && pl===2) return 'auf-aus';
  if (up && pl<=up) return 'auf';
  if (d && pl>n-d){
    if (!settled && lg.level>=5 && d<fixDown) return 'ab-aus';
    if (!settled && lg.level>=5 && d>fixDown && pl<=n-fixDown) return 'ab-aus';
    return 'ab';
  }
  return '';
}

// ---------- Simulation (optional) ----------
function poisson(l){ const L0=Math.exp(-l); let k=0,p=1; do{k++;p*=Math.random();}while(p>L0); return k-1; }
function simMatch(){
  return [Math.min(9, poisson(1.4)), Math.min(9, poisson(1.4))];
}
function simShootout(){
  let peh=3+Math.floor(Math.random()*4), pea=3+Math.floor(Math.random()*4);
  if (peh===pea){ if (Math.random()<0.5) peh++; else pea++; }
  return [peh, pea];
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
            const pens=simShootout();
            m.peh=pens[0]; m.pea=pens[1];
          }
        }
      }
      c++;
    });
  });
  lg.decide.filter(m=>m.leg===2).forEach(m=>{
    const leg1=lg.decide.find(x=>x.key===m.key && x.leg===1);
    if (twoLegWinner(leg1, m) || !aggregateLevel(leg1, m)) return;
    const pens=simShootout();
    m.peh=pens[0]; m.pea=pens[1]; m.et=false;
    c++;
  });
  return c;
}
function simSeason(season){
  const tr=window.FR_TIMING;
  let c=0;
  const t0=tr?performance.now():0;
  LEAGUES.forEach(l=>{ c+=simLeague(season, l.id); c+=simDecide(season, l.id); });
  c+=simRelay(season);
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
  try{ syncRelay(season); }catch(e){}
  const tables={}, moves=[], notes=[], newT={}, prof={}, downOf={}, upOf={};
  LEAGUES.forEach(l => { newT[l.id]=[]; prof[l.id]=relegationProfile(season, l.id); downOf[l.id]=prof[l.id].down; upOf[l.id]=promotionCount(season, l.id); });
  const pools={}; POOLS.forEach(p=>pools[p.id]=[...season.pools[p.id]]);
  LEAGUES.forEach(l => {
    const t = leagueTable(season, l.id, 'all');
    tables[l.id] = t.map(r=>({id:r.id,pl:r.pl,sp:r.sp,s:r.s,u:r.u,n:r.n,tg:r.tg,gt:r.gt,pkt:r.pkt}));
    const ids=t.map(r=>r.id), n=ids.length, down=downOf[l.id], up=upOf[l.id];
    ids.forEach((id,k)=>{
      const pl=k+1;
      if (up && pl<=up){ newT[l.upTo].push(id); moves.push({id,from:l.id,to:l.upTo,type:'auf',pl}); }
      else if (down && pl>n-down){ const to=homeLeague(id,l.level+1); (L[to]?newT[to]:pools[to]).push(id); moves.push({id,from:l.id,to,type:'ab',pl}); }
      else newT[l.id].push(id);
    });
    if (l.level>=5 && down!==l.down) notes.push(l.name+': '+down+' Absteiger statt '+l.down+'. '+prof[l.id].reason);
    if (l.level===6 && up!==l.up) notes.push(l.name+': '+up+' Aufsteiger statt '+l.up+'. '+prof[l.id].reason);
  });
  const need={};
  LEAGUES.filter(l=>l.level===6).forEach(l=>{ need[l.id]=Math.max(0, l.size-newT[l.id].length); });
  return {tables, moves, notes, newT, pools, need, picks:{}, step:1, downOf, upOf};
}
function dfbPending(season){
  const cup=season && season.cups && season.cups.dfb;
  if (!cup || !cup.rounds || !cup.rounds.length) return false;
  return !cupFinalists(cup);
}
function seasonEndBlock(season){
  if (!season) return 'Saison';
  if (decidePending(season)) return 'Entscheidungsspiele';
  if (relayPending(season)) return 'Relegation';
  if (dfbPending(season)) return 'DFB-Pokal';
  if (supercupPending(season)) return 'Supercup';
  return '';
}
function startSeasonEnd(){
  const s=latest();
  try { ensureCups(s); } catch(e){}
  try { syncRelay(s, true); } catch(e){}
  const block=seasonEndBlock(s);
  if (block){
    const msg=block==='DFB-Pokal'?'Der DFB-Pokal ist noch nicht entschieden. Die Europaplätze warten auf den Sieger.':block==='Supercup'?'Der Supercup dieser Saison ist noch nicht entschieden.':block==='Relegation'?'Die Relegation der Regionalliga-Vizemeister ist noch nicht entschieden. Sie steht auf der Seite der 5. Liga und der beiden Regionalligen.':'Die Entscheidungsspiele sind noch nicht beendet. Der Saisonwechsel wartet darauf.';
    alert(msg); save(); render(); return;
  }
  s.endData = computeTransition(s); s.status='ending'; S.view=S.seasons.length-1; S.ui.tab='aufab'; save(); render();
}
function cancelSeasonEnd(){ const s=latest(); delete s.endData; s.status='running'; S.ui.tab='tabelle'; save(); render(); }
function suggestPicks(e){
  const blocked=id=>e.moves.some(m=>m.id===id&&m.type==='ab'&&L[m.from]&&L[m.from].level===6);
  RL_IDS.forEach(rl=>{
    const need=e.need[rl]||0;
    const cand=[];
    POOLS.filter(p=>p.rl===rl).forEach(p=>(e.pools[p.id]||[]).forEach(id=>{ if(!blocked(id)) cand.push(id); }));
    cand.sort(byRang);
    e.picks[rl]=cand.slice(0, need);
  });
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
    else if (o.kind==='R') comp='rel';
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
  if (season.relay) Object.keys(season.relay).forEach(l5=>{
    (season.relay[l5].matches||[]).forEach(m=>line('R', m.leg||1, m.h, m.a, m.hg, m.ag, false, m.peh, m.pea, m.slot));
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
  if (sc && sc.h && sc.a){
    const slot=sc.slot&&sc.slot.dow&&sc.slot.time?sc.slot:{dow:'Sa', time:'21:00'};
    line('S', 0, sc.h, sc.a, sc.hg, sc.ag, !!sc.et, sc.peh, sc.pea, slot);
  }
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
  if (season.relay) Object.keys(season.relay).forEach(l5=>{
    (season.relay[l5].matches||[]).forEach(m=>{
      if (m.hg==null||m.ag==null) return;
      const res=m.hg>m.ag?'s':m.hg<m.ag?'n':'u';
      addClubStat('rel', m.h, m.hg, m.ag, false, res);
      addClubStat('rel', m.a, m.ag, m.hg, false, res==='s'?'n':res==='n'?'s':'u');
      addPairStat('rel', m.h, m.a, m.hg, m.ag);
      rememberMatch(season, 'rel', m.h, m.a, m.hg, m.ag, false, m.peh, m.pea);
    });
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
  cup.rounds=[{name:'Finale', drawn:true, neutral:cup.kind==='dfb', archived:false, byes:[], matches:fin?[fin]:[]}];
  delete cup.entrants; delete cup.pro; delete cup.amateur;
}
function freezeLandScale(season){
  if (!season || !season.cups || !season.cups.land) return;
  Object.keys(season.cups.land).forEach(bl=>{
    const cup=season.cups.land[bl];
    if (!cup || (cup.ansehenScale && cup.ansehenScale.budget!=null)) return;
    const ids=cup.entrants||[];
    if (!ids.length) return;
    const names=(cup.roundNames&&cup.roundNames.length)?cup.roundNames:(cup.rounds||[]).map(r=>r&&r.name).filter(Boolean);
    cup.ansehenScale=landAnsehenScale(ids, season, names);
  });
}
function shrinkSeason(season){
  if (!season || season.slim==='core' || season.status!=='done' || !season.compact) return false;
  freezeLandScale(season);
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
    try { ensureCups(s); } catch(e){}
    for (let i=0; i<4 && seasonEndBlock(s); i++){
      if (dfbPending(s)) c+=simAllCups(s);
      LEAGUES.forEach(l=>{ c+=simDecide(s, l.id); });
      c+=simRelay(s);
      c+=simSupercup(s);
    }
    if (seasonEndBlock(s)) rolled=false;
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
  const bad = LEAGUES.filter(l=>newT[l.id].length!==l.size);
  if (bad.length){ if (!quiet) alert('Fehler: falsche Teamzahl in '+bad.map(l=>l.name+' ('+newT[l.id].length+')').join(', ')); return; }
  LEAGUES.forEach(l=>{ const teams=newT[l.id].sort(byRang); ns.leagues[l.id]={teams, md:makeSchedule(teams.length)}; });
  POOLS.forEach(p=>ns.pools[p.id]=pools[p.id].sort(byRang));
  // Markierungen: (Auf) Aufsteiger, (Ab) Absteiger, (M) Vorjahresmeister
  const mk=(id,x)=>{ (ns.markers[id]||(ns.markers[id]=[])).push(x); };
  e.moves.forEach(m=>{ if (L[m.to]) mk(m.id, m.type==='auf'?'Auf':'Ab'); });
  for (const ol in e.picks) e.picks[ol].forEach(id=>mk(id,'Auf'));
  const euroMarks=seasonEuroMarks(e.tables.BL||[], dfbWinnerOf(s));
  Object.keys(euroMarks).forEach(id=>euroMarks[id].forEach(x=>mk(id, x)));
  e.step=3; s.status='done';
  if (!S.chronicle) S.chronicle=[];
  LEAGUES.forEach(l=>{
    const t=e.tables[l.id]||[];
    t.forEach(r=>{
      if (chronicleHas(s.name, r.id)) return;
      const row={season:s.name, id:r.id, liga:l.name, ebene:l.level, n:t.length, pl:r.pl};
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
  if (!(opts && opts.batch)){ save(); render(); toast('Saison '+ns.name+' wurde erstellt.'); }
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
function cupKnownAt(season){
  if (!season || !season.leagues || !season.leagues.BL || !season.leagues.BL.md) return null;
  return lastScheduled(season, 'BL');
}
function stampCupDecision(season, m){
  if (!m) return;
  if (!cupWinner(m)){ m.at=null; return; }
  const at=cupKnownAt(season);
  if (at==null) return;
  if (m.at==null || at>m.at) m.at=at;
}
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
  const n=ids.length;
  if (n<2) return [{name:'Finale', drawn:false, byes:ids.slice(), matches:[]}];
  const target=1<<Math.ceil(Math.log2(n));
  const byeN=target-n;
  const rounds=[];
  let left;
  if (byeN>0){
    const an=id=>{ try{ return ansehenValue(id)||0; }catch(e){ return 0; } };
    const byAn=(ids||[]).slice().sort((a,b)=>an(a)-an(b) || byRang(b,a));
    const playN=n-byeN;
    rounds.push({name:'Vorrunde', drawn:false, byes:byAn.slice(playN), field:byAn.slice(0, playN), matches:[]});
    left=target/2;
  } else {
    const ranked=ids.slice().sort((a,b)=>rankOf(st,a).level-rankOf(st,b).level || rankOf(st,a).place-rankOf(st,b).place || byRang(a,b));
    rounds.push({name:koName(n), drawn:false, byes:[], field:ranked.slice(), matches:[]});
    left=n/2;
  }
  while (left>=2){
    rounds.push({name:koName(left), drawn:false, byes:[], matches:[]});
    left=left/2;
  }
  return rounds;
}
function prevDfbWinner(season){
  try{
    const list=S&&S.seasons||[];
    const idx=list.indexOf(season);
    if (!(idx>0)) return '';
    const prev=list[idx-1];
    if (!prev) return '';
    const fin=prev.cups&&prev.cups.dfb?cupFinalists(prev.cups.dfb):null;
    if (fin&&fin.winner&&TEAMS[fin.winner]) return fin.winner;
    const hist=(S.pokalHistory||[]).find(h=>h&&h.season===prev.name&&h.dfb);
    if (hist&&TEAMS[hist.dfb]) return hist.dfb;
    const run=(S.pokalRuns||[]).find(r=>r&&r.comp==='dfb'&&r.won&&r.season===prev.name&&TEAMS[r.id]);
    return run?run.id:'';
  }catch(e){ return ''; }
}
function cupFinalists(cup){
  if (!cup || !cup.rounds || !cup.rounds.length) return null;
  const last=cup.rounds[cup.rounds.length-1];
  if (!last.drawn || last.matches.length!==1) return null;
  const m=last.matches[0], w=cupWinner(m);
  if (!w) return null;
  return {winner:w, finalist:w===m.h?m.a:m.h, match:m};
}
function dfbDefender(season, prev){
  if (prev && prev.cups && prev.cups.dfb){
    const fin=cupFinalists(prev.cups.dfb);
    if (fin && fin.winner && TEAMS[fin.winner]) return fin.winner;
  }
  if (prev && prev.name){
    const hist=(S.pokalHistory||[]).find(h=>h&&h.season===prev.name&&h.dfb);
    if (hist && TEAMS[hist.dfb]) return hist.dfb;
    const run=(S.pokalRuns||[]).find(r=>r&&r.comp==='dfb'&&r.won&&r.season===prev.name&&TEAMS[r.id]);
    if (run) return run.id;
  }
  try{ return prevDfbWinner(season)||''; }catch(e){ return ''; }
}
function buildCups(season, prev){
  const st=standingOf(prev||season);
  const bl=(st.lists.BL||[]).slice();
  const bl2=(st.lists.BL2||[]).slice();
  const l3=(st.lists.L3||[]).slice();
  const taken=new Set();
  bl.forEach(id=>taken.add(id));
  bl2.forEach(id=>taken.add(id));
  const l3Ids=[];
  l3.forEach(id=>{
    if (!id || taken.has(id) || l3Ids.length>=8) return;
    l3Ids.push(id);
    taken.add(id);
  });
  const defender=dfbDefender(season, prev);
  let cursor=0;
  while (cursor<l3.length && taken.has(l3[cursor])) cursor++;
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
  const entrants=[];
  const seen=new Set();
  const pushEntrant=id=>{ if (!id || seen.has(id)) return; seen.add(id); entrants.push(id); };
  bl.concat(bl2, l3Ids, landIds).forEach(pushEntrant);
  if (defender && !seen.has(defender)){
    const landSet=new Set(landIds);
    let drop=null;
    for (let i=l3Ids.length-1;i>=0;i--){ if (!landSet.has(l3Ids[i])){ drop=l3Ids[i]; break; } }
    if (drop){
      const at=entrants.indexOf(drop);
      if (at>=0) entrants.splice(at,1);
      seen.delete(drop);
    }
    pushEntrant(defender);
  }
  const pro=[];
  const proSet=new Set();
  const addPro=id=>{ if (id && seen.has(id) && !proSet.has(id)){ pro.push(id); proSet.add(id); } };
  bl.forEach(addPro);
  bl2.slice(0,12).forEach(addPro);
  if (defender) addPro(defender);
  for (let i=bl2.length-1; i>=0 && pro.length>32; i--){
    const id=bl2[i];
    if (!id || id===defender || !proSet.has(id)) continue;
    proSet.delete(id);
    pro.splice(pro.indexOf(id),1);
  }
  const amateur=entrants.filter(id=>!proSet.has(id));
  const dfb={
    id:'dfb', name:'DFB-Pokal', kind:'dfb',
    entrants, pro, amateur, spots, defender:defender||'',
    rounds:DFB_ROUNDS.map(r=>({name:r.name, neutral:!!r.neutral, drawn:false, byes:[], matches:[]}))
  };
  const byeSt=placementStanding(season, prev);
  const land={};
  BL_ORDER.forEach(bl=>{
    const ids=landParticipants(season, bl);
    const rounds=planLandRounds(ids, byeSt);
    const names=rounds.map(r=>r.name);
    land[bl]={id:'land:'+bl, name:'Landespokal '+bl, kind:'land', bl, entrants:ids, rounds, ansehenScale:landAnsehenScale(ids, season, names)};
  });
  return {dfb, land};
}
function ensureCups(season){
  if (!season) return null;
  const dfbOk=season.cups && season.cups.dfb && season.cups.dfb.rounds && season.cups.dfb.rounds.length;
  const landOk=season.cups && season.cups.land;
  if (dfbOk && landOk) return season.cups;
  const idx=S && S.seasons ? S.seasons.indexOf(season) : -1;
  const prev=idx>0 ? S.seasons[idx-1] : null;
  const built=buildCups(season, prev);
  if (!season.cups) season.cups={};
  if (!dfbOk) season.cups.dfb=built.dfb;
  if (!landOk) season.cups.land=built.land;
  return season.cups;
}
function ensureAllCups(){ (S.seasons||[]).forEach(ensureCups); }
// 0 ist das kleinste, 100 das größte Ansehen der Wertung. Die Summe mal 0,35
// bleibt damit in derselben Größenordnung wie der frühere Stärke-Anteil.
function cupAnsehenUnit(st, id){
  if (!st._anScale || st._anScale.gen!==ansehenGen){
    const ids=[];
    Object.keys(st.lists||{}).forEach(k=>((st.lists[k])||[]).forEach(x=>ids.push(x)));
    if (!ids.length) Object.keys(st.map||{}).forEach(x=>ids.push(x));
    let lo=Infinity, hi=-Infinity;
    const val={};
    ids.forEach(x=>{
      let v=0;
      try{ v=ansehenValue(x)||0; }catch(e){ v=0; }
      val[x]=v;
      if (v<lo) lo=v;
      if (v>hi) hi=v;
    });
    st._anScale={val, lo, span:hi-lo, gen:ansehenGen};
  }
  let v=st._anScale.val[id];
  if (v==null){ try{ v=ansehenValue(id)||0; }catch(e){ v=0; } }
  if (!(st._anScale.span>0)) return 50;
  return (v-st._anScale.lo)/st._anScale.span*100;
}
function cupAppeal(st, h, a){
  const hs=rankOf(st,h), as=rankOf(st,a);
  const an=cupAnsehenUnit(st,h)+cupAnsehenUnit(st,a);
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
  if (cup.kind==='dfb') matches=pairDfb(field, new Set(cup.pro||[]), dfbFinal(cup, round));
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
    while (peh===pea && guard++<30){
      peh=3+Math.floor(Math.random()*5);
      pea=3+Math.floor(Math.random()*5);
    }
    if (peh===pea){ if (Math.random()<0.5) peh++; else pea++; }
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
      stampCupDecision(season, m);
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
function dfbFinal(cup, round){ return !!(cup && cup.kind==='dfb' && round && round.name==='Finale'); }
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
function moveSpan(delta){
  if (delta==null || !isFinite(+delta)) return '<span class="mv same"></span>';
  const n=+delta;
  if (n>0) return '<span class="mv up" title="'+n+' '+(n===1?'Platz':'Plätze')+' nach oben">▲'+n+'</span>';
  if (n<0){ const d=-n; return '<span class="mv dn" title="'+d+' '+(d===1?'Platz':'Plätze')+' nach unten">▼'+d+'</span>'; }
  return '<span class="mv same" title="Platz gehalten"></span>';
}
function moveMarks(season, lid){
  try{
    const lg=season && season.leagues && season.leagues[lid];
    if (!lg || !Array.isArray(lg.md) || !Array.isArray(lg.teams)) return null;
    let last=-1;
    lg.md.forEach((md,i)=>{ if ((md||[]).some(m=>m && m[2]!=null && m[3]!=null)) last=i; });
    const start=lg.teams.filter(id=>TEAMS[id]).slice().sort(byRang);
    const prev={};
    if (last<=0){ start.forEach((id,i)=>{ prev[id]=i+1; }); return prev; }
    const matches=matchesOf(season, lid).filter(m=>m && m.md<last);
    computeTable(lg.teams, matches, 'all').forEach(r=>{ if(r&&r.id) prev[r.id]=r.pl; });
    return prev;
  }catch(e){ return null; }
}
function clubHTML(id, opts={}){
  const t=TEAMS[id]; if(!t) return '';
  const mk = opts.marker ? [].concat(opts.marker).filter(Boolean).map(x=>'<span class="mk">('+esc(x)+')</span>').join(' ') : '';
  const img='<img src="'+esc(t.crest)+'" alt="" data-club="'+id+'" title="'+esc(t.name)+'" loading="lazy">';
  const base=(opts.ligaTag||mk)?'<span class="nm-txt">'+esc(t.name)+'</span>':esc(t.name);
  const liga=opts.ligaTag?' <span class="liga-tag">'+esc(opts.ligaTag)+'</span>':'';
  const nm=opts.markerBefore ? (mk?mk+' ':'')+base+liga : base+(mk?' '+mk:'')+liga;
  const txt='<div class="txt"><div class="nm">'+nm+'</div>'+(opts.nobl?'':'<div class="bl">'+esc(t.bl)+'</div>')+'</div>';
  const mv=opts.move==null?'':moveSpan(opts.move);
  const body=opts.crestRight?txt+mv+img:mv+img+txt;
  return '<div class="club'+(opts.crestRight?' crest-right':'')+'" data-club="'+id+'" title="'+esc(t.name)+'">'+body+'</div>';
}
// Jede Partie: Heimname, Wappen, Ergebnis, Wappen, Auswärtsname.
function matchLineHTML(o){
  const h=o.h, a=o.a;
  if (!h || !a || !TEAMS[h] || !TEAMS[a]) return '';
  const crest=id=>'<img class="ml-crest" src="'+esc(TEAMS[id].crest)+'" alt="" data-club="'+id+'" title="'+esc(TEAMS[id].name)+'">';
  // Liga-Spielplan, fest: Heim-Status vor dem Namen, Gast-Status hinter dem Namen.
  const nm=(id, side)=>{
    const mk=o.marker && o.marker[id];
    const tags=(!o.markOuter && mk)?[].concat(mk).filter(Boolean).map(x=>'<span class="mk">('+esc(x)+')</span>').join(' '):'';
    let after='';
    if (o.ligaAfter && o.season){ try{ const liga=ligaEdge(o.season, id); if(liga) after=' <span class="liga-tag">'+esc(liga)+'</span>'; }catch(e){} }
    const name='<span class="ml-name" data-club="'+id+'">'+esc(TEAMS[id].name)+after+'</span>';
    let line=name;
    if (tags && o.markOut) line=side==='h'?'<span class="ml-line">'+tags+' '+name+'</span>':'<span class="ml-line">'+name+' '+tags+'</span>';
    else if (tags) line='<span class="ml-name" data-club="'+id+'">'+esc(TEAMS[id].name)+' '+tags+after+'</span>';
    const under=[];
    if (o.ansehen) under.push(ansehenMark(id));
    if (o.bl) under.push('<span class="ml-bl">'+esc(TEAMS[id].bl)+'</span>');
    if (o.km!=null && side==='h') under.push('<span class="km-line">'+o.km+' km</span>');
    if (!under.length) return line;
    return '<span class="who">'+line+'<span class="ml-under">'+under.join('')+'</span></span>';
  };
  const outer=id=>{
    if (!o.markOuter || !o.marker || !o.marker[id]) return '';
    return [].concat(o.marker[id]).filter(Boolean).map(x=>'<span class="mk mk-out">('+esc(x)+')</span>').join('');
  };
  const ansehenMark=id=>{
    try{
      const v=ansehenValue(id);
      if (v==null || !isFinite(+v)) return '<span class="ml-an"></span>';
      return '<span class="ml-an" title="Ansehen">'+esc(deNum(+v,2))+'</span>';
    }catch(e){ return '<span class="ml-an"></span>'; }
  };
  const played=o.hg!=null && o.ag!=null && !o.open;
  const pen=played && o.hg===o.ag && o.peh!=null && o.pea!=null && +o.peh!==+o.pea;
  const nv=played && o.et && o.hg!==o.ag;
  const keep=html=>html && html.replace(/<span class="ie-slot"><\/span>/g,'').trim() ? html : '';
  const above=o.cup
    ? (o.above!=null && keep(o.above) ? o.above : '<span class="ie-slot"></span>')
    : keep(o.above!=null?o.above:(pen?'<span class="ie-link ie-static">'+o.peh+':'+o.pea+' i.E.</span>':(nv?'<span class="ie-box">n.V.</span>':'')));
  const below=keep(o.below!=null?o.below:'');
  const step0=o.step?o.step(0):'';
  const step1=o.step?o.step(1):'';
  const score=o.open
    ? '<span class="tone-open">offen</span>'
    : '<span class="scoreline"><span class="goals" data-side="0">'+(played?o.hg:'-')+'</span><b>:</b><span class="goals" data-side="1">'+(played?o.ag:'-')+'</span></span>';
  const edge=id=>{
    if (!((o.liga || o.ligaInName) && !o.ligaAfter)) return '';
    if (typeof o.ligaOf==='function'){
      let text='';
      try{ text=o.ligaOf(id)||''; }catch(e){ text=''; }
      return text?'<span class="liga-edge" title="'+esc(text)+'">'+esc(text)+'</span>':'';
    }
    if (!(o.season && typeof o.season==='object')) return '';
    let text='';
    try{ text=ligaEdge(o.season, id)||''; }catch(e){ text=''; }
    return '<span class="liga-edge">'+esc(text)+'</span>';
  };
  const cls=['match'];
  if (o.cup) cls.push('cup');
  if (played || o.done) cls.push('done');
  if (o.klass) cls.push(o.klass);
  if (o.tone) cls.push('tone-'+o.tone);
  if (o.box) cls.push('fx-box');
  if (o.bl) cls.push('sp-line');
  if (o.ansehen) cls.push('with-an');
  if (o.nodel) cls.push('match-nodel');
  if (o.hin) cls.push('has-hin');
  const del=o.nodel?'':(o.del!=null?o.del:'<span></span>');
  const home=outer(h)+edge(h)+nm(h,'h')+crest(h);
  const away=crest(a)+nm(a,'a')+edge(a)+outer(a);
  return '<div class="'+cls.join(' ')+'"'+(o.attr||'')+'><div class="side side-home">'+home+'</div><div class="scorecol">'+(above?above:'')+'<div class="score">'+step0+score+step1+'</div>'+(below?'<div class="under">'+below+'</div>':'')+'</div><div class="side side-away">'+away+'</div>'+del+'</div>';
}
function sortHead(label, key, cls){
  return '<th'+(cls?' class="'+cls+'"':'')+(key?' data-sort="'+key+'"':'')+'>'+label+'</th>';
}
function sortCell(n, html, cls){
  const raw=(n==null||n==='')?'':String(n);
  return '<td'+(raw!==''?' data-n="'+raw+'"':'')+(cls?' class="'+cls+'"':'')+'>'+html+'</td>';
}
function placeCell(rank, label){
  if (rank==null || rank==='') return '<td class="rank"><span class="nfix w-pl"><span class="rank-now">–</span></span></td>';
  const shown=label==null?String(rank):String(label);
  return '<td data-n="'+rank+'" data-rank="'+rank+'" data-rank-label="'+esc(shown)+'" class="rank"><span class="nfix w-pl"><span class="rank-now">'+shown+'</span></span></td>';
}
function paintRankView(body){
  if (!body) return;
  let vis=0;
  [...body.rows].forEach(r=>{
    if (r.dataset.pin) return;
    const cell=r.querySelector('td[data-rank]');
    if (!cell) return;
    const orig=cell.dataset.rank;
    const now=cell.querySelector('.rank-now');
    if (!now) return;
    let extra=cell.querySelector('.rank-orig');
    const hidden=r.style.display==='none';
    if (hidden){
      now.textContent=cell.dataset.rankLabel||orig;
      if (extra) extra.remove();
      return;
    }
    vis++;
    const label=String(vis);
    now.textContent=label;
    if (label===orig){ if (extra) extra.remove(); }
    else {
      if (!extra){ extra=document.createElement('span'); extra.className='rank-orig'; now.insertAdjacentElement('afterend', extra); }
      extra.textContent='('+orig+')';
    }
  });
}
function formSpan(letter, game){
  const word={S:'Sieg',U:'Unentschieden',N:'Niederlage'}[letter]||'';
  if (!game || !TEAMS[game.h] || !TEAMS[game.a] || game.hg==null || game.ag==null) return '<span class="f-'+letter+'" title="'+esc(word)+'">'+letter+'</span>';
  const tip='<span class="ov-tip form-pop"><span class="ft-day">'+(game.md+1)+'. Spieltag</span><span class="ft-pair"><span class="ft-name">'+esc(TEAMS[game.h].name)+'</span><img src="'+esc(TEAMS[game.h].crest)+'" alt=""><span class="ft-score">'+game.hg+':'+game.ag+'</span><img src="'+esc(TEAMS[game.a].crest)+'" alt=""><span class="ft-name">'+esc(TEAMS[game.a].name)+'</span></span></span>';
  return '<span class="form-wrap"><span class="form-bit f-'+letter+'">'+letter+'</span>'+tip+'</span>';
}
function tableHTML(rows, lg, opts={}){
  rows=sortUnplayedTable(rows);
  const n=rows.length, season=opts.season||cur();
  const sure = opts.zones===false || !lg ? {} : certaintyMap(season, lg.id);
  const down = !lg || opts.zones===false ? 0 : relegationProfile(season, lg.id).down;
  const upNow = !lg || opts.zones===false ? 0 : promotionCount(season, lg.id);
  let viceOpen=false;
  if (lg && lg.level===6 && opts.zones!==false){
    try{ const plan=promotionPlan(season, lg.id); viceOpen=!!(plan && plan.open && (plan.up|0)<2); }catch(e){ viceOpen=false; }
  }
  const settled=!lg || opts.zones===false ? true : marksSettled(season, lg.id);
  const viceSettled=!lg || opts.zones===false ? true : viceMarksSettled(season, lg.id);
  const lgZone = lg ? Object.assign({}, lg, {upShow:upNow, viceOpen:viceOpen, settled:settled, viceSettled:viceSettled}) : lg;
  const th=sortHead, td=sortCell;
  const nf=(n, html, w, cls)=>td(n, '<span class="nfix '+w+'">'+html+'</span>', cls);
  const moves=opts.move && lg ? moveMarks(season, lg.id) : null;
  let pokalId='';
  if (opts.ansehen){ try{ pokalId=prevDfbWinner(season)||''; }catch(e){ pokalId=''; } }
  let h='<table class="tbl stand"><thead><tr>'+th('Pl.','pl')+th('Verein','','l')+th('Sp.','sp')+th('S','s')+th('U','u')+th('N','n')+th('T/GT','tg')+th('Diff.','diff')+th('Pkt.','pkt')+(opts.form===false?'':th('Form',''))+(opts.ansehen?th('Ansehen','an'):'')+'</tr></thead><tbody>';
  const eighth=lg&&lg.id==='BL'&&opts.zones!==false&&dfbEighthOpen(season);
  rows.forEach(r=>{
    const flag=sure[r.id]||'';
    let z = opts.zones===false ? '' : zoneOf(lgZone, r.pl, n, down, eighth);
    const provisional=z==='auf-aus' || z==='ab-aus';
    if (!provisional && flag==='up') z='sure-up';
    else if (!provisional && flag==='down') z='sure-down';
    const delta=moves && moves[r.id]!=null ? moves[r.id]-r.pl : null;
    let marks=opts.markers===false||!(season.markers&&season.markers[r.id])?[]:[].concat(season.markers[r.id]).filter(Boolean);
    if (pokalId && r.id===pokalId && marks.indexOf('P')<0) marks.push('P');
    const clubOpts={nobl:!!opts.nobl, marker:marks.length?marks:null};
    if (moves) clubOpts.move=delta==null?0:delta;
    const form=Array.isArray(r.form)?r.form:[];
    const diff=r.tg!=null && r.gt!=null ? r.tg-r.gt : r.diff;
    let an=null;
    if (opts.ansehen){ try{ const v=ansehenValue(r.id); if (v!=null && isFinite(+v)) an=+v; }catch(e){ an=null; } }
    h+='<tr data-tid="'+(r.id||'')+'" class="'+(z?'z-'+z:'')+'">'+placeCell(r.pl)+'<td class="l">'+clubHTML(r.id, clubOpts)+'</td>'+nf(r.sp, r.sp, 'w-sp')+nf(r.s, r.s, 'w-sp')+nf(r.u, r.u, 'w-sp')+nf(r.n, r.n, 'w-sp')+nf(r.tg, (r.tg!=null?r.tg:'–')+':'+(r.gt!=null?r.gt:'–'), 'w-tg')+nf(diff, (diff>0?'+':'')+(diff!=null?diff:'–'), 'w-df')+nf(r.pkt, r.pkt!=null?r.pkt:'–', 'w-pk', 'pts')+
      (opts.form===false?'':'<td class="formc"><span class="form">'+form.map((f,i)=>formSpan(f, (r.formGames||[])[i])).join('')+'</span></td>')+
      (opts.ansehen?nf(an, an==null?'–':deNum(an,2), 'w-an'):'')+'</tr>';
  });
  h+='</tbody></table>';
  if (opts.zones!==false && lg) h+=fixedPlaceHTML(season, lg, n);
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
    it.push(legendSwatch('ab','Abstiegszone, noch offen'));
  } else {
    const upNow=promotionCount(season||cur(), lg.id);
    const settled=marksSettled(season||cur(), lg.id);
    if (lg.level===6){
      it.push(legendSwatch('auf','Meister, fest → '+leagueName(lg.upTo)));
      let plan=null;
      try{ plan=promotionPlan(season||cur(), lg.id); }catch(e){ plan=null; }
      if (plan && plan.open) it.push(legendSwatch('auf-aus','Vizemeister, Relegation, provisorisch'));
      else if (upNow>1 && !viceMarksSettled(season||cur(), lg.id)) it.push(legendSwatch('auf-aus','Vizemeister, provisorisch bis die 4. Liga feststeht'));
      else if (upNow>1) it.push(legendSwatch('auf','Vizemeister, fest'));
    }
    else if (upNow===1) it.push(legendSwatch('auf','Meister &amp; Aufstieg → '+leagueName(lg.upTo)));
    else if (upNow>1) it.push(legendSwatch('auf','Aufstieg, fest → '+leagueName(lg.upTo)));
    if (upNow) it.push(legendSwatch('sure-up','Aufstieg rechnerisch sicher'));
    if (lg.down || (prof && prof.down)){
      if (lg.level>=5 && prof){
        if (!settled && prof.down>2){
          it.push(legendSwatch('ab','Zwei feste Absteiger'));
          it.push(legendSwatch('ab-aus','Provisorisch, hängt von der Liga darüber ab'));
        } else if (!settled && prof.down<2) it.push(legendSwatch('ab-aus','Provisorisch, diesmal '+prof.down+' statt 2'));
        else it.push(legendSwatch('ab', prof.down===2?'Zwei feste Absteiger':prof.down+' Absteiger, fest'));
      } else {
        const ab=prof && prof.down!==lg.down ? 'Abstiegszone (diesmal '+prof.down+' statt '+lg.down+')' : 'Abstiegszone, noch offen';
        it.push(legendSwatch('ab', ab));
      }
      if (prof && prof.down) it.push(legendSwatch('sure-down','Abstieg rechnerisch sicher'));
    }
  }
  if (lg.id==='BL') it.push(legendSwatch('sure-down','Abstieg rechnerisch sicher'));
  it.push('<span class="muted">'+(lg.id==='BL'?'(M) Meister · (CL) (EL) (UECL) · ':'')+'(Auf) Aufsteiger · (Ab) Absteiger · kräftig nur, wenn kein Ergebnis die Zone noch ändern kann</span>');
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
    if (withEnd!==false) return '<button class="btn primary" data-act="end">Saison abschließen</button>';
    return '';
  }
  if (withEnd!==false && s.status==='ending') return '<button class="btn primary" data-act="toEnd">Auf/Abstiege</button>';
  return '';
}
function renderNav(){
  const tab=S.ui.tab, pokal=tab==='pokal', ansehen=tab==='ansehen', amateur=S.ui.league==='AM'||!!P[S.ui.league];
  const special=pokal||ansehen||tab==='verein'||tab==='supercup'||tab==='info';
  let amN=0; POOLS.forEach(p=>amN+=(cur().pools[p.id]||[]).length);
  const leagueOn=id=>!special && !amateur && S.ui.league===id;
  const side=(label, active, attrs, title, sub)=>'<a class="nav-link'+(sub?' nav-sub':'')+(active?' active':'')+'" '+attrs+(title?' title="'+esc(title)+'"':'')+'>'+label+'</a>';
  const onWelt=key=>!special && !amateur && S.ui.tab===key;
  let h='<div class="side-sec"><div class="side-label">Ligen</div>';
  LEAGUES.forEach(l=>{ h+=side(esc(l.name), leagueOn(l.id), 'data-league="'+l.id+'"', l.name, l.level>=5); });
  h+=side('Amateurliga', !special && amateur, 'data-league="AM"', 'Amateurliga'+(amN?' · '+amN+' Vereine':''));
  h+='</div><div class="side-sec"><div class="side-label">Pokale</div>';
  const cupKey=S.ui.cup||'dfb';
  h+=side('DFB-Pokal', pokal && cupKey==='dfb', 'data-tab="pokal" data-cup="dfb"', 'DFB-Pokal');
  h+=side('Landespokale', pokal && cupKey!=='dfb', 'data-tab="pokal" data-cup="land"', 'Landespokale');
  if (featOn('supercup')) h+=side('Supercup', tab==='supercup', 'data-tab="supercup"', 'Supercup');
  h+='</div><div class="side-sec"><div class="side-label">Welt</div>';
  h+=side('Ansehen', ansehen, 'data-tab="ansehen"', 'Ansehen');
  h+=side('Karte', onWelt('karte'), 'data-tab="karte"', 'Karte');
  h+=side('Historie', onWelt('historie'), 'data-tab="historie"', 'Historie');
  h+=side('Rekorde', onWelt('rekorde'), 'data-tab="rekorde"', 'Rekorde');
  h+=side('Ewige Tabelle', onWelt('ewig'), 'data-tab="ewig"', 'Ewige Tabelle');
  h+=side('Regeln', onWelt('regeln'), 'data-tab="regeln"', 'Regeln');
  h+=side('Verein', tab==='info', 'data-tab="info"', 'Verein');
  h+='</div>';
  $('#leagueNav').innerHTML=h;
  const opt=(value, label, on)=>'<option value="'+value+'"'+(on?' selected':'')+'>'+esc(label)+'</option>';
  const group=(label, body)=>'<optgroup label="'+esc(label)+'">'+body+'</optgroup>';
  let o=group('Ligen', LEAGUES.filter(l=>l.level<=4).map(l=>opt(l.id, l.name, !pokal && S.ui.league===l.id)).join(''));
  o+=group('5. Liga', LEAGUES.filter(l=>l.level===5).map(l=>opt(l.id, l.name, !pokal && S.ui.league===l.id)).join(''));
  o+=group('Regionalliga', LEAGUES.filter(l=>l.level===6).map(l=>opt(l.id, l.name, !pokal && S.ui.league===l.id)).join(''));
  o+=group('Weiteres', opt('AM','Amateurliga', amateur&&!pokal)+opt('pokal','Pokal', pokal)+(featOn('supercup')?opt('supercup','Supercup', tab==='supercup'):'')+opt('ansehen','Ansehen', ansehen)+opt('info','Verein', tab==='info'));
  $('#mobileLeague').innerHTML=o;
  $('#seasonSelect').innerHTML=S.seasons.map((s,i)=>'<option value="'+i+'"'+(i===S.view?' selected':'')+'>'+s.name+(s.status==='done'?' (abgeschlossen)':s.status==='ending'?' (Abschluss)':'')+'</option>').join('');
}

const TABS=[['tabelle','Tabelle'],['karte','Karte'],['terminierung','Terminierung'],['heimaus','Heim/Auswärts'],['hinrueck','Hin/Rückrunde'],['ewig','Ewige Tabelle'],['historie','Historie'],['rekorde','Rekorde'],['aufab','Auf/Abstiege'],['regeln','Regeln']];
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
  const allowed=['spiele','sieger','uebersicht','qualifikation','rekorde'];
  if (['spiele','sieger','uebersicht','qualifikation','rekorde','karte','punkte','regeln'].indexOf(S.ui.cupView)<0) S.ui.cupView='spiele';
  if (S.ui.cupView==='punkte' && (!cup || cup.kind!=='land')) S.ui.cupView='spiele';
  const view=S.ui.cupView;
  $('#title').textContent=cup?cup.name:'Pokal';
  let sub='DFB-Pokal und 16 Landespokale';
  if (s.status==='done') sub+=' · abgeschlossene Saison';
  $('#subline').innerHTML=sub;
  setActions(seasonActions(s, false));
  $('#tabs').innerHTML='';
  $('#view').innerHTML=viewPokal(s, cup, view);
  if (S.ui.cupView==='karte') bindMap();
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
  const cupTabs=[['spiele','Spielplan'],['karte','Karte'],['sieger','Sieger'],['uebersicht','Übersicht'],['qualifikation','Qualifikation'],['rekorde','Rekorde'],['regeln','Regeln']];
  if (cup && cup.kind==='land') cupTabs.splice(3, 0, ['punkte','Wertung']);
  h+='<span class="toggle" data-toggle="cupView">'+cupTabs.map(([k,n])=>'<button data-v="'+k+'" class="'+(view===k?'active':'')+'">'+n+'</button>').join('')+'</span>';
  h+='</div>';
  if (!cup && view!=='qualifikation' && view!=='rekorde') return h+'<div class="box">Dieser Pokal fehlt.</div>';
  if (view==='karte'){
    const states=cup&&cup.kind==='land'&&cup.bl?[cup.bl]:null;
    return h+viewMap((cup&&cup.name)||'Pokal', cupParticipantIds(cup), states, 'cup:'+(cup&&(cup.id||cup.bl)||key));
  }
  if (view==='regeln') return h+cupRulesHTML(cup);
  if (view==='punkte' && cup && cup.kind==='land') return h+landPointsHTML(s, cup);
  if (view==='sieger') return h+viewCupWinners(s);
  if (view==='uebersicht') return h+viewCupOverview(s, cup);
  if (view==='rekorde') return h+viewCupRekorde(key);
  if (view==='qualifikation'){
    const dfb=s.cups&&s.cups.dfb;
    return h+(dfb?viewCupSpots(dfb, s):'<div class="box">In dieser Saison gibt es keine Landespokal-Qualifikation.</div>');
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
    h+='<p class="cup-note">64 Mannschaften aus der Vorsaison: die Bundesliga, die 2. Bundesliga, die Plätze 1–8 der 3. Liga und 16 über die Landespokale. Absteiger aus diesen Ligen bleiben dabei. Der Titelverteidiger ist immer dabei und immer im Profitopf, auch nach Auf- oder Abstieg. Liegt er unterhalb der 2. Liga und hätte sonst keinen Platz, ersetzt er den letzten Startplatz der 3. Liga. Damit die Töpfe 32 zu 32 bleiben, rückt der Tabellenzwölfte der 2. Liga in den Amateurtopf. Das ist nie der Titelverteidiger. In der 1. Runde hat der Amateurtopf Heimrecht.</p>';
  }
  if (cup.archived) h+='<p class="cup-note">Ältere Runden dieses Pokals sind abgelegt. Das Finale bleibt hier, die erreichte Runde jedes Vereins in der Vereinsinfo.</p>';
  if (cup.kind==='land' && ri===0 && cup.entrants && cup.entrants.length){
    h+='<p class="cup-note">'+cup.entrants.length+' Vereine aus '+esc(cup.bl)+', von der 3. Liga bis zur Amateurliga. Freilose gehen an die Vereine mit dem höchsten Ansehen. Die schwächere Liga hat Heimrecht, innerhalb derselben Liga der zuerst gezogene. Der Sieger zieht in den DFB-Pokal der nächsten Saison ein.</p>';
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
    const lab=cupSlotLabel(m.slot, dfbFinal(cup, round));
    if (lab!==prev){ flush(); h+='<div class="slot-head cup-slot">'+esc(lab)+'</div>'; prev=lab; }
    buf.push(cupMatchHTML(s, m, key, ri, i, ed));
  });
  flush();
  if (round.byes && round.byes.length) h+='<div class="sp-hint"><b>Freilos:</b> '+round.byes.map(id=>esc(TEAMS[id].name)).join(', ')+'</div>';
  h+='</div>';
  return h;
}
function yearLiga(season, id){
  try{ return season&&id? (ligaEdge(season, id)||'') : ''; }catch(e){ return ''; }
}
function seasonKeys(label){
  const s=String(label||'');
  const out=[];
  const add=x=>{ if (x && out.indexOf(x)<0) out.push(x); };
  add(s);
  try{ add(seasonFull(s)); }catch(e){}
  const long=s.match(/^(\d{4})\/(\d{4})$/);
  if (long) add(long[1]+'/'+long[2].slice(-2));
  return out;
}
function storedLiga(id, label){
  if (!id || !TEAMS[id] || label==null || label==='') return '';
  if (typeof label==='object') return yearLiga(label, id);
  const keys=seasonKeys(label);
  if (!keys.length) return '';
  let hit='';
  try{
    historyEntries(id).some(r=>{
      if (!r || !r.liga || keys.indexOf(r.season)<0) return false;
      hit=r.liga;
      return true;
    });
  }catch(e){ hit=''; }
  if (!hit) return '';
  const known=LEAGUES.find(l=>l.name===hit);
  return known?known.short:hit;
}
function honourClub(id, name, season, showBl, reserve){
  if ((name && blockedClubHit(name)) || (id && TEAMS[id] && blockedClubHit(TEAMS[id].name))) return '<span class="muted">–</span>';
  if (id && TEAMS[id]) return seasonClubHTML(season, id, showBl, null, name);
  if (!name) return '<span class="muted">–</span>';
  return '<span class="sieger-name">'+esc(name)+(reserve?' <span class="muted">zweite Mannschaft</span>':'')+'</span>';
}
function honourMatch(match, season, showBl){
  if (!match || !match.h || !match.a || !TEAMS[match.h] || !TEAMS[match.a] || match.hg==null || match.ag==null) return '<span class="muted">–</span>';
  const ligaOf=cid=>{
    try{ return storedLiga(cid, season)||''; }catch(e){ return ''; }
  };
  const pen=match.hg===match.ag && match.peh!=null && match.pea!=null && +match.peh!==+match.pea;
  const nv=!pen && match.et && match.hg!==match.ag;
  const above=pen?'<span class="ie-link ie-static">'+match.peh+':'+match.pea+' i.E.</span>':(nv?'<span class="ie-box">n.V.</span>':'<span class="ie-slot"></span>');
  return matchLineHTML({h:match.h, a:match.a, hg:match.hg, ag:match.ag, et:!!nv, peh:pen?match.peh:null, pea:pen?match.pea:null, season:season&&typeof season==='object'?season:null, cup:true, liga:true, bl:showBl!==false, nodel:true, klass:'sieger-match axis', ligaOf, above});
}
function viewCupSpots(cup, season){
  const sea=season||cur();
  const tag=id=>yearLiga(sea, id);
  const main=(cup.spots||[]).filter(sp=>sp.via!=='liga');
  const liga=(cup.spots||[]).filter(sp=>sp.via==='liga');
  let h='<div class="box"><h3>Qualifikation über die Landespokale</h3><table class="tbl"><thead><tr><th class="l">Land</th><th class="l">Verein</th><th class="l">Weg</th></tr></thead><tbody>';
  main.forEach(sp=>{
    if (!sp || !TEAMS[sp.id]) return;
    h+='<tr><td class="l">'+esc(sp.bl)+'</td><td class="l">'+clubHTML(sp.id,{nobl:true, ligaTag:tag(sp.id)})+'</td><td class="l">'+esc(VIA_TEXT[sp.via]||sp.via)+'</td></tr>';
  });
  h+='</tbody></table>';
  if (liga.length){
    h+='<h3 style="margin-top:14px">Nachgerückt aus der 3. Liga</h3><p class="muted">Beide Finalisten dieses Landes waren schon qualifiziert. Der Platz geht an den nächsten freien Verein der 3. Liga, nicht an den Pokalsieger.</p><table class="tbl"><thead><tr><th class="l">Platz</th><th class="l">Verein</th></tr></thead><tbody>';
    liga.forEach(sp=>{
      if (!sp || !TEAMS[sp.id]) return;
      const label=(sp.place?sp.place+'. ':'')+'3. Liga (für '+sp.bl+')';
      h+='<tr><td class="l">'+esc(label)+'</td><td class="l">'+clubHTML(sp.id,{nobl:true, ligaTag:tag(sp.id)})+'</td></tr>';
    });
    h+='</tbody></table>';
  }
  h+='</div>';
  return h;
}
const OV_ORDER=['Bundesliga','2. Bundesliga','3. Liga','4. Liga','5. Liga','Regionalliga','Amateurliga'];
function leagueBucket(season, id){
  const lid=clubLeagueId(season, id);
  if (lid==='BL') return 'Bundesliga';
  if (lid==='BL2') return '2. Bundesliga';
  if (lid==='L3') return '3. Liga';
  if (lid==='L4') return '4. Liga';
  if (L[lid] && L[lid].level===5) return '5. Liga';
  if (L[lid] && L[lid].level===6) return 'Regionalliga';
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
      if (!m || m.hg==null||m.ag==null) return;
      const w=cupWinner(m);
      if ((m.h===id||m.a===id) && w && w!==id) found={m, round:round.name||''};
    });
  });
  return found;
}
function ovLostCard(season, cup, id){
  const t=TEAMS[id]; if(!t) return '';
  const liga=yearLiga(season, id);
  const name='<div class="nm">'+esc(t.name)+(liga?' <span class="liga-tag">'+esc(liga)+'</span>':'')+'</div>';
  const hit=cupExitMatch(cup, id);
  if (!hit || !hit.m) return name;
  const m=hit.m;
  const round=hit.round?'<div class="ov-round">'+esc(hit.round)+'</div>':'';
  return name+round+matchLineHTML({h:m.h, a:m.a, hg:m.hg, ag:m.ag, et:m.et, peh:m.peh, pea:m.pea, nodel:true, cup:true, ligaInName:true, season:season, klass:'tip-match'});
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
      const liga=yearLiga(season, id);
      const tip=out?ovLostCard(season, cup, id):'<div class="nm">'+esc(t.name)+(liga?' <span class="liga-tag">'+esc(liga)+'</span>':'')+'</div>';
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
  const cup=getCup(s, key);
  const round=cup && cup.rounds && cup.rounds[ri];
  const neutral=dfbFinal(cup, round);
  const km=neutral ? null : kmBetween(m.h, m.a);
  const step=side=>ed?'<span class="stepper"><button type="button" data-act="cupGoal" data-cup="'+esc(key)+'" data-ri="'+ri+'" data-mi="'+i+'" data-side="'+side+'" data-dir="1" title="Tor">+</button><button type="button" data-act="cupGoal" data-cup="'+esc(key)+'" data-ri="'+ri+'" data-mi="'+i+'" data-side="'+side+'" data-dir="-1" title="Tor zurück">−</button></span>':'';
  let meta=neutral ? '' : (km!=null ? km+' km' : '');
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
  const dfb=key==='dfb';
  let marker=null;
  if (dfb){
    const pid=prevDfbWinner(s);
    if (pid && (m.h===pid || m.a===pid)) marker={[pid]:['P']};
  }
  return matchLineHTML({h:m.h, a:m.a, hg:played?m.hg:null, ag:played?m.ag:null, season:s, liga:true, cup:true, bl:dfb, marker, markOuter:!!marker, klass:'cup-spiel axis', done:!!win, step, above, below, km:meta?km:null, attr:' data-mi="'+i+'"', del:ed?'<button type="button" class="del" data-act="cupDel" data-cup="'+esc(key)+'" data-ri="'+ri+'" data-mi="'+i+'" title="Zurücksetzen">×</button>':'<span></span>'});
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
function seasonClubHTML(season, id, showBl, ligaText, nameText){
  const t=id&&TEAMS[id]; if(!t) return '';
  if (blockedClubHit(t.name) || (nameText && blockedClubHit(nameText))) return '<span class="muted">–</span>';
  const liga=ligaText!=null?ligaText:(typeof season==='object' && season ? yearLiga(season, id) : storedLiga(id, season));
  const shown=nameText && nameText!==t.name ? nameText : t.name;
  const tag=liga?' <span class="liga-tag">'+esc(liga)+'</span>':'';
  const img='<img src="'+esc(t.crest)+'" alt="" data-club="'+id+'" title="'+esc(t.name)+'">';
  const bl=showBl===false?'':'<span class="ml-bl">'+esc(t.bl)+'</span>';
  const who='<span class="who"><span class="ml-name"><span class="nm-txt">'+esc(shown)+'</span>'+tag+'</span>'+bl+'</span>';
  return '<div class="sieger-club" data-club="'+id+'">'+img+who+'</div>';
}
function siegerRow(year, winnerId, finalistId, match, season, liga, showBl){
  const bl=showBl!==false;
  return '<div class="sieger-row"><div class="sieger-year">'+esc(year)+'</div><div class="sieger-who">'+honourClub(winnerId, '', season, bl)+'</div><div class="sieger-who">'+honourClub(finalistId, '', season, bl)+'</div><div class="sieger-final">'+honourMatch(match, season, bl)+'</div></div>';
}
function siegerHead(){
  return '<div class="sieger-row sieger-head"><div>Jahr</div><div>Sieger</div><div>Finalist</div><div>Ergebnis</div></div>';
}
function simulatedTitleRows(comp){
  const out=[];
  (S.seasons||[]).forEach(sea=>{
    const start=seasonYear(sea&&sea.name);
    if (!start || start<2026) return;
    if (comp==='bl'){
      const table=sea.endData && sea.endData.tables && sea.endData.tables.BL;
      const row=(table||[]).find(r=>r&&r.pl===1);
      if (row && row.id) out.push({comp:'bl', year:start+1, season:sea.name, original:TEAMS[row.id]?TEAMS[row.id].name:'', id:row.id, map:'simulation', note:''});
    } else if (comp==='dfb'){
      const fin=sea.cups && cupFinalists(sea.cups.dfb);
      if (fin && fin.winner){
        const m=fin.match||{};
        let score=m.hg==null?'':m.hg+':'+m.ag;
        if (score && m.et && m.hg!==m.ag) score+=' n.V.';
        if (score && m.peh!=null && m.pea!=null && +m.peh!==+m.pea) score+=' / '+m.peh+':'+m.pea+' i.E.';
        out.push({comp:'dfb', year:start+1, season:sea.name, original:TEAMS[fin.winner]?TEAMS[fin.winner].name:'', id:fin.winner, finalist:fin.finalist, score, map:'simulation', note:''});
      }
    }
  });
  return out;
}
function titleRowsFor(comp){
  const hist=historicalTitleRows().filter(r=>r.comp===comp);
  const seen={};
  hist.forEach(r=>{ seen[r.year]=1; });
  return hist.concat(simulatedTitleRows(comp).filter(r=>!seen[r.year]));
}
function titleWinnerHTML(r){
  const hist=r.original||'';
  const now=r.id && TEAMS[r.id];
  if (!now) return '<b class="title-hist">'+esc(hist)+'</b>';
  const crest='<img class="ml-crest" src="'+esc(now.crest)+'" alt="">';
  if (!hist || hist===now.name) return '<span class="title-who">'+crest+'<b>'+esc(now.name)+'</b></span>';
  return '<span class="title-who">'+crest+'<b>'+esc(hist)+'</b><span class="muted">heute '+esc(now.name)+'</span></span>';
}
function titleAudit(endYear){
  const end=endYear||ansehenEndYear();
  const clubs={};
  historicalTitleRows().forEach(r=>{
    const key=r.id||('offen:'+r.original);
    let row=clubs[key];
    if (!row){
      row=clubs[key]={id:r.id||'', name:r.id&&TEAMS[r.id]?TEAMS[r.id].name:r.original, crest:r.id&&TEAMS[r.id]?TEAMS[r.id].crest:'', open:!r.id, map:r.map||'', de:0, blNew:0, blOld:0, dfb:0, ddr:0, fdgb:0, delta:0, note:r.note||'', originals:[]};
      clubs[key]=row;
    }
    if (!r.id) row.open=true;
    if (r.original && row.originals.indexOf(r.original)<0 && r.original!==row.name) row.originals.push(r.original);
    if (r.comp==='de') row.de++;
    else if (r.comp==='ddr') row.ddr++;
    else if (r.comp==='fdgb') row.fdgb++;
    else if (r.comp==='dfb') row.dfb++;
    else if (r.comp==='bl'){
      const season=titelSeason('bl', r.year);
      const info=r.id?ansehenInfo(r.id, end):null;
      const old=info && info.lines.some(l=>l.kind==='titel' && l.season===season && l.label==='Meistertitel Bundesliga' && !l.histKey);
      if (old) row.blOld++; else row.blNew++;
    }
    if (r.id){
      const line=ansehenInfo(r.id, end).lines.find(l=>l.histKey===r.comp+'|'+r.year);
      if (line) row.delta=ansehenRound2((row.delta||0)+(line.today||0));
    }
  });
  const list=Object.keys(clubs).map(k=>{
    const row=clubs[k];
    row.delta=ansehenRound2(row.delta||0);
    row.after=row.id?ansehenInfo(row.id, end).value:0;
    row.before=ansehenRound2((row.after||0)-row.delta);
    row.added=(row.de||0)+(row.blNew||0)+(row.dfb||0)+(row.ddr||0)+(row.fdgb||0);
    return row;
  });
  list.sort((a,b)=>b.delta-a.delta || a.name.localeCompare(b.name,'de'));
  return {end, season:(cur()&&cur().name)||'', list};
}
const LAND_LEVEL=LEVEL_NAME;
function landPointsHTML(s, cup){
  const scale=landScaleOf(s.name, cup.bl);
  if (!scale || scale.missing) return '<div class="box"><h3>Wertung '+esc(cup.name||cup.bl)+'</h3><p class="muted">'+(scale&&scale.reason?esc(scale.reason):'Für diese Saison liegt keine Wertung vor.')+'</p></div>';
  const rounds=scale.rounds||[];
  const fin=rounds[rounds.length-1];
  const finPts=fin?landRoundPoints(scale, fin):0;
  const titleNow=landTitleOf(scale);
  const sum=ansehenRound2(finPts+titleNow);
  const levels=Object.keys(scale.byLevel||{}).map(k=>+k).sort((a,b)=>a-b);
  let mix='<table class="tbl fit"><thead><tr><th class="l">Liga</th><th>Vereine</th><th>Gewicht je Verein</th></tr></thead><tbody>';
  if (!levels.length) mix+='<tr><td class="l" colspan="3"><span class="muted">Die gespeicherte Skala dieser Saison nennt das Feld nicht mehr einzeln.</span></td></tr>';
  levels.forEach(lv=>{
    const n=scale.byLevel[lv];
    const w=ANSEHEN.land.levelW[lv]!=null?ANSEHEN.land.levelW[lv]:ANSEHEN.land.unknownW;
    mix+='<tr><td class="l">'+esc(LAND_LEVEL[lv]||('Stufe '+lv))+'</td>'+sortCell(n, n)+sortCell(w, ansehenPts(w))+'</tr>';
  });
  if (scale.unknown) mix+='<tr><td class="l">ohne Liga</td>'+sortCell(scale.unknown, scale.unknown)+sortCell(ANSEHEN.land.unknownW, ansehenPts(ANSEHEN.land.unknownW))+'</tr>';
  mix+='</tbody></table>';
  let roundsHtml='<table class="tbl fit"><thead><tr><th class="l">Erreichte Runde</th><th>Punkte</th></tr></thead><tbody>';
  rounds.forEach(name=>{ roundsHtml+='<tr><td class="l">'+esc(name)+'</td>'+sortCell(landRoundPoints(scale, name), ansehenPts(landRoundPoints(scale, name)))+'</tr>'; });
  roundsHtml+='<tr><td class="l">Titel, einmalig für den Sieger</td>'+sortCell(titleNow, ansehenPts(titleNow))+'</tr>';
  roundsHtml+='<tr data-pin="1"><td class="l"><b>Sieger insgesamt</b></td>'+sortCell(sum, ansehenPts(sum))+'</tr>';
  roundsHtml+='</tbody></table>';
  return '<div class="box"><h3>Wertung '+esc(s.name)+'</h3><p class="muted">Gezählt wird nur die erreichte Runde, nicht die Summe der Runden davor. Ein Freilos ist keine zusätzliche Runde. Feldgewicht '+ansehenPts(scale.field)+' bei '+scale.n+' Vereinen, geteilt durch 8 und je weiterer Runde um 15 Prozent höher. Das Budget bleibt bei höchstens '+ansehenPts(cappedLandBudget(ANSEHEN.land.capBudget))+'. Finalrunde plus Titel sind zusammen mindestens 10 und höchstens '+ansehenPts(ANSEHEN.land.winnerCap)+'. Liegt das Feld darunter, werden Budget und alle Runden im selben Verhältnis angehoben. Der Titel ist '+ansehenPts(ANSEHEN.land.titleShare*100)+' Prozent dieses Budgets, auch wenn eine ältere Skala noch einen anderen Titel gespeichert hat.</p>'+mix+roundsHtml+'</div>';
}
function rowSeason(r){
  if (r.season) return r.season;
  return titelSeason(r.comp, r.year);
}
function championRows(leftComps, rightComp){
  const by={};
  const put=(r, side)=>{
    const row=by[r.year]||(by[r.year]={year:r.year, left:null, right:null});
    row[side]=r;
    by[r.year]=row;
  };
  leftComps.forEach(comp=>titleRowsFor(comp).forEach(r=>put(r,'left')));
  if (rightComp) titleRowsFor(rightComp).forEach(r=>put(r,'right'));
  return Object.keys(by).map(k=>by[k]).sort((a,b)=>b.year-a.year);
}
function resultBit(r){
  if (!r || !r.finalist || !TEAMS[r.finalist]) return '';
  return '<div class="muted">Finalist '+esc(TEAMS[r.finalist].name)+(r.score?' · '+esc(r.score):'')+'</div>';
}
function championBoardHTML(leftComps, rightComp, leftTitle, rightTitle){
  const rows=championRows(leftComps, rightComp);
  const heading=rightTitle?leftTitle+' · '+rightTitle:leftTitle;
  let h='<div class="box"><h3>'+esc(heading)+'</h3><p class="muted">Ein Jahr ist eine Zeile. Links '+esc(leftTitle)+(rightTitle?', rechts '+esc(rightTitle)+' nur in den Jahren, in denen er ausgespielt wurde':'')+'. Der historische Name steht zuerst, der heutige Nachfolger dahinter.</p>';
  if (!rows.length) return h+'<p class="muted">Noch kein Sieger.</p></div>';
  h+='<table class="tbl fit pair-board"><thead><tr><th>Jahr</th><th class="l">'+esc(leftTitle)+'</th>'+(rightTitle?'<th class="l">'+esc(rightTitle)+'</th>':'')+'</tr></thead><tbody>';
  rows.forEach(row=>{
    const season=row.left?titleYearLabel(row.left):(row.right?titleYearLabel(row.right):String(row.year));
    const other=row.left&&row.right&&rowSeason(row.left)!==rowSeason(row.right)?titleYearLabel(row.right):'';
    h+='<tr><td><b>'+esc(season)+'</b>'+(other?'<div class="muted">'+esc(other)+'</div>':'')+'</td><td class="l">'+(row.left?titleWinnerHTML(row.left)+resultBit(row.left):'<span class="muted">–</span>')+'</td>';
    if (rightTitle) h+='<td class="l">'+(row.right?titleWinnerHTML(row.right):'<span class="muted">–</span>')+'</td>';
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  return h;
}
function titleRegisterHTML(comp){
  const rows=titleRowsFor(comp).slice().sort((a,b)=>b.year-a.year);
  let h='<div class="box"><h3>'+esc(titelGroup(comp))+'</h3><p class="muted">Zuerst der Verein, der den Titel in diesem Jahr gewonnen hat. Dahinter steht der heutige Nachfolger, wenn er im Spiel ist. Fehlt er, bleibt nur der historische Name.</p>';
  if (!rows.length) return h+'<p class="muted">Noch kein Sieger.</p></div>';
  h+='<table class="tbl fit title-reg"><thead><tr><th>Jahr</th><th class="l">Sieger</th></tr></thead><tbody>';
  rows.forEach(r=>{ h+='<tr><td>'+r.year+'</td><td class="l">'+titleWinnerHTML(r)+'</td></tr>'; });
  h+='</tbody></table></div>';
  return h;
}
function titleHonourRow(r, showBl){
  const sea=r&&r.map==='simulation'?(S.seasons||[]).find(s=>s&&s.name===r.season):null;
  const season=sea||rowSeason(r);
  let match=null;
  if (sea && r.comp==='dfb' && sea.cups){
    const fin=cupFinalists(sea.cups.dfb);
    match=fin&&fin.match?fin.match:null;
  }
  const fin=r.finalist&&TEAMS[r.finalist]?honourClub(r.finalist, '', season, showBl):'<span class="muted">–</span>';
  return '<div class="sieger-row"><div class="sieger-year">'+esc(titleYearLabel(r))+'</div><div class="sieger-who">'+honourClub(r.id, r.original, season, showBl)+'</div><div class="sieger-who">'+fin+'</div><div class="sieger-final">'+honourMatch(match, season, showBl)+'</div></div>';
}
function honourList(title, note, rows, showBl){
  let h='<div class="box sieger-box"><h3>'+esc(title)+'</h3>';
  if (note) h+='<p class="muted">'+note+'</p>';
  if (!rows.length) return h+'<p class="muted">Noch kein Sieger.</p></div>';
  return h+siegerHead()+rows.map(r=>titleHonourRow(r, showBl)).join('')+'</div>';
}
function viewDfbModern(){
  const rows=titleRowsFor('dfb').slice().sort((a,b)=>b.year-a.year);
  return honourList('DFB-Pokal', 'Finalist, Ergebnis und die Liga zum Zeitpunkt stehen nur, wenn sie gespeichert sind. Historische Jahre ohne diese Angaben bleiben leer. n.V. und i.E. bleiben stehen, wenn das Finale sie hat. Der FDGB-Pokal endet 1991 und steht darunter.', rows, true);
}
function viewDfbHistoric(){
  const rows=titleRowsFor('fdgb').filter(r=>r.year<=1991).sort((a,b)=>b.year-a.year);
  return honourList('FDGB-Pokal bis 1991', 'Finalist und Ergebnis sind für diese Jahre nicht gespeichert. Die Liga steht nur, wenn die Saison in den Tabellendaten liegt.', rows, true);
}
function offenRows(){
  return (window.FR_OFFEN && window.FR_OFFEN.eintraege) || [];
}
function cupGaps(){
  const sets={};
  const add=(k,y)=>{ if(!k || !(y>0)) return; (sets[k]=sets[k]||new Set()).add(y); };
  schauRows().forEach(r=>{ if(!r || r.comp==='sc') return; add(r.assign?('Landespokal '+r.land):r.cupName, r.year); });
  offenRows().forEach(e=>add(e.wettbewerb, e.jahr));
  const gaps=[];
  Object.keys(sets).sort().forEach(k=>{
    const ys=[...sets[k]].sort((a,b)=>a-b);
    for(let y=ys[0]; y<=ys[ys.length-1]; y++) if(!sets[k].has(y)) gaps.push(k+' '+y);
  });
  return gaps;
}
function landHistWinners(land){
  const cup='Landespokal '+land;
  const out=[], seen={};
  const add=row=>{
    if (!row || !row.season || seen[row.season]) return;
    if (row.name==='ausgeschlossener Verein') return;
    if (!row.name && !row.leer && !row.none) return;
    seen[row.season]=1;
    out.push(row);
  };
  schauRows().forEach(r=>{
    if (!r || !r.assign || r.land!==land) return;
    add({season:String(r.season||r.year||''), year:r.year||0, id:r.id||'', name:r.original||(TEAMS[r.id]&&TEAMS[r.id].name)||'', reserve:false});
  });
  offenRows().forEach(e=>{
    if (!e || e.wettbewerb!==cup) return;
    if (e.grund && String(e.grund).indexOf('ausgeschlossener Verein')>=0) return;
    const leer=e.grund==='leer';
    const none=e.grund==='nicht ausgetragen';
    add({season:String(e.saison||''), year:e.jahr||schauEndYear(e.saison)||0, id:'', name:leer?'':(e.original||''), reserve:String(e.grund||'').indexOf('Zweite')>=0, leer:leer, none:none});
  });
  return out;
}
function landHistRow(r){
  const season=r.season||'';
  const who=r.leer||!r.name ? '<span class="muted">–</span>' : r.none ? '<span class="muted">nicht ausgetragen</span>' : honourClub(r.id, r.name, season, false, r.reserve);
  return '<div class="sieger-row"><div class="sieger-year">'+esc(r.season||String(r.year||''))+'</div><div class="sieger-who">'+who+'</div><div class="sieger-who"><span class="muted">–</span></div><div class="sieger-final"><span class="muted">–</span></div></div>';
}
function viewCupWinners(){
  const key=S.ui.cup||'dfb';
  if (key!=='dfb'){
    const rows=[];
    S.seasons.forEach(sea=>{
      if (!sea.cups) return;
      const cup=sea.cups.land && sea.cups.land[key];
      const fin=cupFinalists(cup);
      if (fin) rows.push(siegerRow(sea.name, fin.winner, fin.finalist, fin.match, sea, true, false));
    });
    const have={};
    S.seasons.forEach(sea=>{ if (sea && sea.name && sea.cups && sea.cups.land && sea.cups.land[key] && cupFinalists(sea.cups.land[key])) have[sea.name]=1; });
    const hist=landHistWinners(key).filter(r=>!have[r.season]).sort((a,b)=>(b.year||0)-(a.year||0) || (String(a.season)<String(b.season)?1:-1));
    let histHtml='';
    if (hist.length){
      histHtml='<h3>Historische Sieger</h3><p class="muted">Jahrgänge dieses Landespokals. Vereine im Rechner sind verknüpft, andere stehen als Name. Zweite Mannschaften sind gekennzeichnet. Finalist und Ergebnis sind hier nicht gespeichert. Die Liga steht nur, wenn die Saison in den Tabellendaten liegt.</p>'+siegerHead()+hist.map(landHistRow).join('');
    }
    if (!rows.length && !hist.length) return '<div class="box"><h3>Sieger '+esc(key)+'</h3><p class="muted">Noch kein entschiedenes Finale.</p></div>';
    return '<div class="box sieger-box"><h3>Sieger '+esc(key)+'</h3>'+(rows.length?siegerHead()+rows.reverse().join(''):'<p class="muted">Noch kein Finale im Rechner.</p>')+histHtml+'</div>';
  }
  return viewDfbModern()+viewDfbHistoric();
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
function touchRelay(l5, leg, fn){
  if (!isEditable()) return;
  const rel=cur().relay && cur().relay[l5];
  const m=rel && rel.matches && rel.matches.find(x=>x.leg===leg);
  if (!m) return;
  fn(m);
  const leg1=rel.matches.find(x=>x.leg===1);
  const leg2=rel.matches.find(x=>x.leg===2);
  if (leg2 && !aggregateLevel(leg1, leg2)){ leg2.peh=null; leg2.pea=null; }
  save(); render();
}
function applyRelayGoal(l5, leg, side, dir){
  touchRelay(l5, leg, m=>{
    const unplayed=m.hg==null||m.ag==null;
    if (unplayed){
      if (dir>0){ m.hg=side===0?1:0; m.ag=side===0?0:1; }
      else { m.hg=0; m.ag=0; }
      return;
    }
    if (dir<0 && m.hg===0 && m.ag===0){ m.hg=null; m.ag=null; m.et=false; m.peh=null; m.pea=null; return; }
    if (side===0) m.hg=Math.max(0, m.hg+dir); else m.ag=Math.max(0, m.ag+dir);
    m.et=false;
  });
}
function openRelayPen(l5){
  const rel=cur().relay && cur().relay[l5];
  const leg2=rel && rel.matches && rel.matches.find(m=>m.leg===2);
  const leg1=rel && rel.matches && rel.matches.find(m=>m.leg===1);
  if (!leg2 || !aggregateLevel(leg1, leg2)) return;
  penEdit={relay:l5, h:leg2.peh==null?0:leg2.peh, a:leg2.pea==null?0:leg2.pea};
  const side=(id, which)=>{
    const t=TEAMS[id];
    return '<div class="pen-side"><img src="'+esc(t.crest)+'" alt=""><div class="nm">'+esc(t.name)+'</div><div class="pen-num" id="pen'+which+'">0</div><span class="stepper pen-step"><button type="button" data-act="penAdj" data-side="'+(which==='H'?0:1)+'" data-dir="1">+</button><button type="button" data-act="penAdj" data-side="'+(which==='H'?0:1)+'" data-dir="-1">−</button></span></div>';
  };
  openModal('<div class="pen-dlg"><h3>Elfmeterschießen im Rückspiel</h3><p class="muted">Hin- und Rückspiel stehen gesamt gleich. Keine Auswärtstore, keine Verlängerung. Das Elfmeterschießen entscheidet.</p><div class="pen-sides">'+side(leg2.h,'H')+'<b class="pen-colon">:</b>'+side(leg2.a,'A')+'</div><div class="pen-actions"><button type="button" class="btn" data-act="penCancel">Abbrechen</button><button type="button" class="btn primary" id="penOk" data-act="penOk" disabled>OK</button></div></div>');
  paintPen();
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
  stampCupDecision(s, m);
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
let navIndex=0, navMax=0, navMute=0, navReady=false;
const NAV_KEYS=['league','tab','cup','cupView','titleList','infoId','infoSec','infoHist','amateurBl','amateurView','ansehenSec','ansehenId','ansehenLiga','ansehenBl','ansehenKind','ansehenGuide','scView','vereinId','vereinFrom','allPools','infoOpp','infoH2H','infoFx','infoTermin'];
const CMP_FILTERS={all:1, liga:1, dfb:1, land:1, sc:1, rel:1};
function normalizeInfoUi(){
  if (!S || !S.ui) return;
  const fx=S.ui.infoFx;
  const numeric=fx!=null && fx!=='' && isFinite(+fx) && String(+fx)===String(fx).trim();
  if (numeric){
    if (S.ui.infoTermin==null || S.ui.infoTermin==='') S.ui.infoTermin=+fx;
    S.ui.infoFx='all';
  } else if (!CMP_FILTERS[fx]) S.ui.infoFx='all';
}
function navVal(v){ return v===undefined?null:v; }
function navState(){
  const u=S.ui||{};
  const o={view:S.view};
  NAV_KEYS.forEach(k=>{ o[k]=navVal(u[k]); });
  const mdKey=S.view+':'+(u.league||'');
  o.md=u.md && u.md[mdKey]!=null ? u.md[mdKey] : null;
  o.cupRound=navVal(u.cupRound);
  const tbKey=S.view+':'+(u.league||'');
  o.termBlock=u.termBlock && u.termBlock[tbKey]!=null ? u.termBlock[tbKey] : null;
  return JSON.stringify(o);
}
function knownViewTab(tab){
  return TABS.some(t=>t[0]===tab) || tab==='info' || tab==='ansehen' || tab==='supercup' || tab==='verein' || tab==='pokal';
}
function normalizeRemovedTab(){
  if (!S || !S.ui) return;
  if (S.ui.tab==='abschluss') S.ui.tab='aufab';
  if (S.ui.tab==='derbys') S.ui.tab='tabelle';
  if (!knownViewTab(S.ui.tab)) S.ui.tab='tabelle';
}
function navNormalize(){
  if (!S || !S.ui) return;
  settleLeagueNav();
  normalizeRemovedTab();
  if (S.ui.tab==='ansehen' && S.ui.ansehenSec!=='wertung') S.ui.ansehenSec='liste';
  if (S.ui.tab==='pokal'){
    const s=cur();
    try{ ensureCups(s); }catch(e){}
    const land=s.cups && s.cups.land;
    const key=S.ui.cup && (S.ui.cup==='dfb' || (land && land[S.ui.cup])) ? S.ui.cup : 'dfb';
    S.ui.cup=key;
    const cup=getCup(s, key);
    if (['spiele','sieger','uebersicht','qualifikation','rekorde','karte','punkte','regeln'].indexOf(S.ui.cupView)<0) S.ui.cupView='spiele';
    if (S.ui.cupView==='punkte' && (!cup || cup.kind!=='land')) S.ui.cupView='spiele';
    if (cup && cup.rounds && cup.rounds.length){
      let ri=S.ui.cupRound;
      if (ri==null || ri<0 || ri>=cup.rounds.length){
        const open=cup.rounds.findIndex(r=>!roundComplete(r));
        ri=open<0?cup.rounds.length-1:open;
      }
      S.ui.cupRound=ri;
    }
  }
  if (S.ui.tab==='info'){
    if (['historie','bilanz','rekorde','gegner','vergleich','termin','erfolge','ansehen'].indexOf(S.ui.infoSec)<0) S.ui.infoSec='historie';
    if (S.ui.infoSec==='historie' && ['liga','dfb','land'].indexOf(S.ui.infoHist)<0) S.ui.infoHist='liga';
  }
  if (S.ui.tab==='supercup' && S.ui.scView!=='spiel' && S.ui.scView!=='rekorde') S.ui.scView='spiel';
  normalizeInfoUi();
  const lid=S.ui.league;
  if (S.ui.tab==='tabelle' && L[lid]){
    const s=cur();
    const lg=s.leagues && s.leagues[lid];
    if (lg && lg.md){
      if (!S.ui.md) S.ui.md={};
      const key=S.view+':'+lid;
      if (S.ui.md[key]==null) S.ui.md[key]=currentMd(s, lid);
    }
  }
}
function navApply(snap){
  const o=JSON.parse(snap);
  if (o.view!=null && S.seasons[o.view]) S.view=o.view;
  NAV_KEYS.forEach(k=>{ if (k in o) S.ui[k]=o[k]; });
  if (!S.ui.md) S.ui.md={};
  const mdKey=S.view+':'+(S.ui.league||'');
  if (o.md==null) delete S.ui.md[mdKey];
  else S.ui.md[mdKey]=o.md;
  S.ui.cupRound=o.cupRound;
  if (!S.ui.termBlock) S.ui.termBlock={};
  const tbKey=S.view+':'+(S.ui.league||'');
  if (o.termBlock==null) delete S.ui.termBlock[tbKey];
  else S.ui.termBlock[tbKey]=o.termBlock;
}
function navRemember(){
  if (!navReady || !S || !S.ui) return;
  const snap=navState();
  const cur=history.state;
  if (navMute){
    if (cur && typeof cur.fr==='string' && cur.fr!==snap && cur.i===navIndex) history.replaceState({fr:snap, i:navIndex, y:cur.y||0}, '', location.href);
    return;
  }
  if (cur && cur.fr===snap) return;
  if (cur && cur.fr && cur.i===navIndex) history.replaceState({fr:cur.fr, i:cur.i, y:window.scrollY||0}, '', location.href);
  navIndex++;
  navMax=navIndex;
  history.pushState({fr:snap, i:navIndex, y:window.scrollY||0}, '', location.href);
  navPaint();
}
function navInstall(){
  if (!S || !S.ui) return;
  const snap=navState();
  const prev=history.state;
  const i=prev && typeof prev.i==='number' ? prev.i : 0;
  navIndex=i;
  navMax=i;
  try{ history.scrollRestoration='manual'; }catch(e){}
  history.replaceState({fr:snap, i, y:0}, '', location.href);
  navReady=true;
  navPaint();
}
function navGo(dir){
  if (dir<0 && navIndex<=0) return;
  if (dir>0 && navIndex>=navMax) return;
  const cur=history.state;
  if (cur && cur.fr && cur.i===navIndex) history.replaceState({fr:cur.fr, i:cur.i, y:window.scrollY||0}, '', location.href);
  if (dir<0) history.back();
  else history.forward();
}
function navPaint(){
  const back=document.getElementById('navBack');
  const fwd=document.getElementById('navFwd');
  if (back){ back.disabled=navIndex<=0; back.title=navIndex<=0?'Kein Schritt zurück':'Zurück'; }
  if (fwd){ fwd.disabled=navIndex>=navMax; fwd.title=fwd.disabled?'Kein Schritt vor':'Vorwärts'; }
}
window.addEventListener('popstate', ev=>{
  const st=ev.state;
  if (!st || typeof st.i!=='number' || typeof st.fr!=='string') return;
  navIndex=st.i;
  if (st.i>navMax) navMax=st.i;
  navMute++;
  try{
    navApply(st.fr);
    render();
    window.scrollTo(0, st.y||0);
  }finally{
    navMute--;
  }
  navPaint();
});
let navScrollTick=0;
window.addEventListener('scroll', ()=>{
  if (navScrollTick || !navReady || navMute) return;
  navScrollTick=1;
  requestAnimationFrame(()=>{
    navScrollTick=0;
    const cur=history.state;
    if (!cur || cur.fr==null || cur.i!==navIndex) return;
    const y=window.scrollY||0;
    if (cur.y===y) return;
    history.replaceState({fr:cur.fr, i:cur.i, y}, '', location.href);
  });
}, {passive:true});
function render(){
  try{ if (S && isEditable()) repairOpenReturns(cur()); }catch(e){}
  navNormalize();
  try{ renderMain(); }
  finally{ navRemember(); }
}
function renderMain(){
  normalizeRemovedTab();
  renderMigrate();
  renderSettings();
  renderNav();
  setActions('');
  const headEl=document.querySelector('.head');
  if (headEl) headEl.classList.remove('head-off');
  const s=cur(), lid=S.ui.league;
  if (S.ui.tab==='info'){ renderInfo(); return; }
  if (S.ui.tab==='ansehen'){
    const sec=S.ui.ansehenSec==='wertung'?'wertung':'liste';
    S.ui.ansehenSec=sec;
    const head=document.querySelector('.head');
    if (head) head.classList.add('head-off');
    $('#title').textContent='Ansehen';
    $('#subline').innerHTML='';
    const anTabs=[['liste','Rangliste'],['wertung','Wertungsübersicht']];
    $('#tabs').innerHTML='<h1 class="tab-title">Ansehen</h1>'+anTabs.map(([k,n])=>'<a class="tab'+(sec===k?' active':'')+'" data-tab="ansehen" data-sec="'+k+'">'+n+'</a>').join('');
    $('#view').innerHTML=S.ui.ansehenId?viewAnsehenDetail(S.ui.ansehenId):(sec==='liste'?viewAnsehen():ansehenGuideHTML());
    return;
  }
  if (S.ui.tab==='aufab'){ renderAufAb(); return; }
  if (S.ui.tab==='regeln'){ renderRegeln(); return; }
  if (S.ui.tab==='supercup'){ renderSupercup(); return; }
  if (S.ui.tab==='verein'){ renderVerein(); return; }
  if (S.ui.tab==='pokal'){
    renderPokal(s);
    return;
  }
  if (lid==='AM' || P[lid]){ renderAmateur(); return; }
  const lg=L[lid];
  leagueChrome(lid, S.ui.tab);
  setActions(seasonActions(s));
  const v=$('#view');
  if (S.ui.tab==='tabelle'){ v.innerHTML=viewTabelle(s,lid); paintLiveRows(); alignStandToPlan(); }
  else if (S.ui.tab==='karte') v.innerHTML=viewKarte(s,lid);
  else if (S.ui.tab==='terminierung') v.innerHTML=viewTerminierung(s,lid);
  else if (S.ui.tab==='heimaus') v.innerHTML=viewToggle(s,lid,'ha');
  else if (S.ui.tab==='hinrueck') v.innerHTML=viewToggle(s,lid,'hr');
  else if (S.ui.tab==='ewig') v.innerHTML=viewEwig(lid);
  else if (S.ui.tab==='historie') v.innerHTML=viewHistorie(lid);
  else if (S.ui.tab==='rekorde') v.innerHTML=viewRekorde(lid);
  if (S.ui.tab==='karte') bindMap();
}
function leagueTabs(){
  return TABS.slice();
}
function leagueChrome(lid, tab){
  const lg=L[lid];
  const head=document.querySelector('.head');
  if (head) head.classList.add('head-off');
  $('#title').textContent=lg?lg.name:'';
  $('#subline').innerHTML='';
  $('#tabs').innerHTML='<h1 class="tab-title">'+esc(lg?lg.name:'')+'</h1>'+leagueTabs().map(([k,n])=>'<a class="tab'+(tab===k?' active':'')+'" data-tab="'+k+'">'+n+'</a>').join('');
}
function settleLeagueNav(){
  if (!S || !S.ui) return;
  const id=S.ui.league;
  if (L[id] || id==='AM' || P[id]) return;
  if (id==='OL' || id==='Oberliga' || String(id).indexOf('OL')===0) S.ui.league='L5NO';
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
  try{ syncRelay(s); }catch(e){}
  return '<div class="split"><div class="card stand-card" id="tableCard">'+tableHTML(leagueTable(s,lid),L[lid],{nobl:true,move:true,ansehen:true})+'</div><div class="card entry" id="spCard">'+spielplanHTML(s,lid)+'</div>'+relayHTML(s,lid)+'</div>';
}
function alignStandToPlan(){
  const card=document.getElementById('tableCard');
  const plan=document.getElementById('spCard');
  if(!card||!plan) return;
  const rows=[...card.querySelectorAll(':scope > table.tbl.stand > tbody > tr')];
  rows.forEach(r=>{ r.style.height=''; });
  plan.style.minHeight='';
  card.style.minHeight='';
  const c0=card.getBoundingClientRect();
  const p0=plan.getBoundingClientRect();
  if(Math.abs(c0.top-p0.top)>8||!rows.length) return;
  const lid=S&&S.ui&&S.ui.league;
  const lg=lid&&cur()&&cur().leagues&&cur().leagues[lid];
  const games=lg&&lg.md&&lg.md[0]?lg.md[0].length:0;
  let maxHeads=1;
  try{
    const seen={};
    slotTemplate(lid, games||undefined).forEach(s=>{ seen[s.dow+'|'+s.time+'|'+(s.kind||'')]=1; });
    maxHeads=Math.max(1, Object.keys(seen).length);
  }catch(e){ maxHeads=1; }
  const headEls=[...plan.querySelectorAll('.slot-head')];
  const headH=headEls.length?headEls[0].getBoundingClientRect().height:0;
  const hint=plan.querySelector('.sp-hint');
  const hintH=hint?hint.getBoundingClientRect().height:0;
  const full=p0.height-hintH-headEls.length*headH+maxHeads*headH;
  const target=Math.max(p0.height, c0.height, full);
  plan.style.minHeight=target+'px';
  let gap=plan.getBoundingClientRect().bottom-card.getBoundingClientRect().bottom;
  if(Math.abs(gap)>0.4){
    const add=gap/rows.length;
    rows.forEach(r=>{
      const h=r.getBoundingClientRect().height+add;
      const need=Math.max(0, ...[...r.children].map(td=>td.scrollHeight));
      r.style.height=Math.max(h, need)+'px';
    });
  }
  const left=plan.getBoundingClientRect().bottom-card.getBoundingClientRect().bottom;
  if(Math.abs(left)>0.3){
    const last=rows[rows.length-1];
    const next=last.getBoundingClientRect().height+left;
    const need=Math.max(0, ...[...last.children].map(td=>td.scrollHeight));
    if(next+0.5>=need) last.style.height=next+'px';
    else plan.style.minHeight=(plan.getBoundingClientRect().height+ (card.getBoundingClientRect().bottom-plan.getBoundingClientRect().bottom))+'px';
  }
}
function relayHTML(season, lid){
  const spec=L[lid];
  if (!spec || (spec.level!==5 && spec.level!==6)) return '';
  const l5=spec.level===5?lid:spec.upTo;
  const feed=L5_FEED.find(p=>p.id===l5);
  if (!feed || !L[l5]) return '';
  if (spec.level===6 && feed.rls.indexOf(lid)<0) return '';
  try{ syncRelay(season); }catch(e){}
  const rel=relayOf(season, l5);
  let k=0;
  try{ k=l5Incoming(season, l5).length; }catch(e){ k=0; }
  const bal=l5Balance(k);
  if (!rel && bal.mode!=='relegation') return '';
  const ed=typeof isEditable==='function'?isEditable():false;
  let h='<div class="card relay-card"><div class="card-title"><span>Relegation</span></div>';
  h+='<p class="cup-note">Freie Plätze in der '+esc(L[l5].name)+': '+(4-Math.max(0,k))+' bei '+k+' Absteiger'+(k===1?'':'n')+' aus der 4. Liga. Beide Meister steigen auf. Die Vizemeister spielen Hin- und Rückspiel, jeder einmal zu Hause. Es zählt das Gesamtergebnis. Auswärtstore zählen nicht, es gibt keine Verlängerung. Steht es danach gleich, entscheidet das Elfmeterschießen im Rückspiel. Das Heimrecht im Rückspiel hat der Vizemeister mit dem besseren Punktequotienten. Bei Gleichstand zählen Tordifferenz, Tore und dann Nord vor Ost beziehungsweise Süd vor West. Der Sieger steigt auf, der Verlierer bleibt.</p>';
  if (!rel){
    h+='<p class="muted">Die Paarung steht, sobald die 4. Liga und beide Regionalligen beendet sind.</p></div>';
    return h;
  }
  const w=relayWinner(rel);
  if (w && TEAMS[w]){
    const loser=w===rel.better?rel.worse:rel.better;
    h+='<p><b>'+esc(TEAMS[w].name)+' steigt auf.</b> '+(TEAMS[loser]?esc(TEAMS[loser].name)+' bleibt.':'')+'</p>';
  }
  rel.matches.forEach(m=>{
    const played=m.hg!=null && m.ag!=null;
    const leg1=rel.matches.find(x=>x.leg===1);
    const needPen=m.leg===2 && aggregateLevel(leg1, m);
    const hasPen=m.peh!=null && m.pea!=null && m.peh!==m.pea;
    const step=side=>ed?'<span class="stepper"><button type="button" data-act="relayGoal" data-l5="'+l5+'" data-leg="'+m.leg+'" data-side="'+side+'" data-dir="1">+</button><button type="button" data-act="relayGoal" data-l5="'+l5+'" data-leg="'+m.leg+'" data-side="'+side+'" data-dir="-1">−</button></span>':'';
    let above='<span class="ie-slot"></span>';
    if (needPen && hasPen) above=ed?'<button type="button" class="ie-link" data-act="relayIe" data-l5="'+l5+'">'+m.peh+':'+m.pea+' i.E.</button>':'<span class="ie-link ie-static">'+m.peh+':'+m.pea+' i.E.</span>';
    else if (needPen && !hasPen && ed) above='<button type="button" class="ie-link" data-act="relayIe" data-l5="'+l5+'">Elfmeterschießen</button>';
    const below='<span class="ie-box">'+(m.leg===1?'Hinspiel':'Rückspiel')+'</span>';
    const km=kmBetween(m.h, m.a);
    h+=matchLineHTML({h:m.h, a:m.a, hg:played?m.hg:null, ag:played?m.ag:null, bl:true, cup:true, done:!!w, step, above, below, km, del:ed?'<button type="button" class="del" data-act="relayDel" data-l5="'+l5+'" data-leg="'+m.leg+'">×</button>':'<span></span>'});
  });
  if (ed && !w) h+='<div class="sp-tools"><button type="button" class="btn small" data-act="simRelay" data-l5="'+l5+'">Relegation simulieren</button></div>';
  h+='</div>';
  return h;
}
let shownMd=0;
function spielplanHTML(s,lid){
  const lg=s.leagues[lid];
  if (!lg || !lg.md) return '<div class="card-title"><span>Spielplan</span></div><p class="muted">Die einzelnen Spiele dieser Saison sind nicht mehr gespeichert. Tabelle, Heim/Auswärts und Hin/Rückrunde bleiben erhalten.</p>';
  const mi=currentMd(s,lid);
  shownMd=mi; S.ui.md[S.view+':'+lid]=mi;
  const md=lg.md[mi], ed=isEditable();
  const done=md.filter(m=>m[2]!=null&&m[3]!=null).length;
  let h='<div class="card-title"><span>Eintragen <span class="progress">'+done+' von '+md.length+'</span></span><span class="md-nav"><button class="btn" data-act="mdPrev" title="Vorheriger Spieltag">‹</button><select id="mdSelect">'+
    lg.md.map((d,i)=>{const c=d.every(m=>m[2]!=null&&m[3]!=null); return '<option value="'+i+'"'+(i===mi?' selected':'')+'>'+(i+1)+'. Spieltag'+(c?' ✓':'')+'</option>';}).join('')+
    '</select><button class="btn" data-act="mdNext" title="Nächster Spieltag">›</button></span></div>';
  const slots=isScheduled(s,lid,mi)?s.kickoffs[lid][mi]:null;
  if (!slots){
    h+='<div class="slot-head">nicht terminiert</div>';
    md.forEach((m,k)=>{
      const hid=lg.teams[m[0]], aid=lg.teams[m[1]], km=kmBetween(hid,aid);
      const hin=firstLegLine(lg, mi, m[0], m[1]);
      const above='<span class="hin-score"'+(hin?' title="Hinspiel"':'')+'>'+(hin||'')+'</span>';
      h+=matchLineHTML({h:hid, a:aid, km, bl:true, ansehen:true, klass:'unscheduled', above, hin:true, attr:' data-k="'+k+'"'});
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
    const hin=firstLegLine(lg, mi, m[0], m[1]);
    const above='<span class="hin-score"'+(hin?' title="Hinspiel"':'')+'>'+(hin||'')+'</span>';
    const step=side=>ed?'<span class="stepper"><button type="button" data-act="goal" data-k="'+k+'" data-side="'+side+'" data-dir="1" title="Tor">+</button><button type="button" data-act="goal" data-k="'+k+'" data-side="'+side+'" data-dir="-1" title="Tor zurück">−</button></span>':'';
    h+=matchLineHTML({h:hid, a:aid, hg:has?m[2]:null, ag:has?m[3]:null, km, bl:true, ansehen:true, step, above, hin:true, attr:' data-k="'+k+'"', del:ed?'<button type="button" class="del" data-act="del" data-k="'+k+'" title="Auf -:- zurücksetzen">×</button>':'<span></span>'});
  });
  if (ed) h+='<div class="sp-tools"><button class="btn small" data-act="simMd" title="Nur leere Spiele dieses Spieltags">Spieltag simulieren</button><button class="btn small" data-act="simBlock" title="Die vier Spieltage des aktuellen Blocks">Block simulieren</button><button class="btn small" data-act="simLeague">Liga zu Ende simulieren</button><button class="btn small" data-act="simSeason" title="Alle Ligen und Pokale dieser Saison simulieren">Komplette Saison simulieren</button></div>';
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
    return '<div class="twin"><div class="card"><div class="card-title">Heimtabelle</div>'+tableHTML(leagueTable(s,lid,'home'),L[lid],{zones:false,nobl:true})+'</div><div class="card"><div class="card-title">Auswärtstabelle</div>'+tableHTML(leagueTable(s,lid,'away'),L[lid],{zones:false,nobl:true})+'</div></div>';
  }
  return '<div class="twin"><div class="card"><div class="card-title">Hinrunde</div>'+tableHTML(leagueTable(s,lid,'all','hin'),L[lid],{zones:false,nobl:true})+'</div><div class="card"><div class="card-title">Rückrunde</div>'+tableHTML(leagueTable(s,lid,'all','rueck'),L[lid],{zones:false,nobl:true})+'</div></div>';
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
  const title=L[lid]?L[lid].name:String(lid||'');
  const agg={}, seasons={};
  S.seasons.forEach(s=>{
    const key=lid;
    {
      const lg=s.leagues&&s.leagues[key];
      if (!lg) return;
      const seen={};
      (lg.teams||[]).forEach(id=>{
        const mark=s.name+'|'+key+'|'+id;
        if (seen[mark]) return;
        seen[mark]=1;
        seasons[id]=(seasons[id]||0)+1;
      });
      let rows=[];
      if (lg.tables && !lg.md && lg.tables.all) rows=lg.tables.all;
      else if (lg.md && lg.teams) rows=computeTable(lg.teams, matchesOf(s,key), 'all');
      const rowSeen={};
      rows.forEach(r=>{
        if (!r || !r.id) return;
        const mark=s.name+'|'+key+'|'+r.id;
        if (rowSeen[mark]) return;
        rowSeen[mark]=1;
        const a=agg[r.id]||(agg[r.id]=emptyRow(r.id));
        ['sp','s','u','n','tg','gt','pkt'].forEach(k=>{ a[k]+=(r[k]||0); });
      });
    }
  });
  const rows=Object.values(agg); rows.forEach(r=>r.diff=r.tg-r.gt);
  rows.sort((a,b)=>b.pkt-a.pkt||b.diff-a.diff||b.tg-a.tg||byRang(a.id,b.id));
  const loyal=lid==='BL'?blLoyalSet():null;
  let h='<div class="card"><h3>'+esc(title)+'</h3><div class="legend">Alle Spiele aller Saisons in der '+esc(title)+' (inkl. laufender Saison), Wertung 3-Punkte-Regel.'+(loyal?' Hervorgehoben: seit dem Eintritt nie aus der Bundesliga abgestiegen. Nach dem ersten Abstieg ist die Markierung dauerhaft weg. Die Vereine der ersten Saison zählen als nie abgestiegen.':'')+'</div><table class="tbl"><thead><tr>'+sortHead('Pl.','pl')+sortHead('Verein','','l')+sortHead('Saisons','seasons')+sortHead('Sp.','sp')+sortHead('S','s')+sortHead('U','u')+sortHead('N','n')+sortHead('T/GT','tg')+sortHead('Diff.','diff')+sortHead('Pkt.','pkt')+'</tr></thead><tbody>';
  rows.forEach((r,i)=>{ h+='<tr'+(loyal&&loyal.has(r.id)?' class="loyal"':'')+'>'+placeCell(i+1)+'<td class="l">'+clubHTML(r.id)+'</td>'+sortCell(seasons[r.id], seasons[r.id])+sortCell(r.sp, r.sp)+sortCell(r.s, r.s)+sortCell(r.u, r.u)+sortCell(r.n, r.n)+sortCell(r.tg, r.tg+':'+r.gt)+sortCell(r.diff, (r.diff>0?'+':'')+r.diff)+sortCell(r.pkt, r.pkt, 'pts')+'</tr>'; });
  h+='</tbody></table></div>';
  return h;
}
function clubPlacements(id){
  const out=[];
  S.seasons.forEach(s=>{
    let found=false;
    for (const lid in s.leagues){ if (s.leagues[lid].teams.includes(id)){
      let row;
      if (s.endData && s.endData.tables && s.endData.tables[lid]) row=s.endData.tables[lid].find(r=>r.id===id);
      else {
        const table=leagueTable(s,lid);
        const live=s.status==='running' && table.length && table.every(r=>r && r.sp===0);
        row=(live?sortUnplayedTable(table):table).find(r=>r.id===id);
      }
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
      lg.md.forEach((md, mi)=>{
        (md||[]).forEach(m=>{
          if (!m || m[2]==null || m[3]==null) return;
          const h=lg.teams && lg.teams[m[0]], a=lg.teams && lg.teams[m[1]];
          if (!h || !a || !TEAMS[h] || !TEAMS[a]) return;
          out.push({season:season.name||'', h, a, hg:+m[2], ag:+m[3], md:mi+1});
        });
      });
      return;
    }
    if (lg && lg.teams && typeof season.fx==='string' && season.fx){
      const teamSet=new Set(lg.teams);
      const rows=[];
      season.fx.split(';').forEach(rec=>{
        if (!rec || rec.charAt(0)!=='L') return;
        let o=null;
        try{ o=decShared(rec); }catch(e){ o=null; }
        if (!o || o.hg==null || o.ag==null || !teamSet.has(o.homeId) || !teamSet.has(o.awayId)) return;
        rows.push({season:season.name||'', h:o.homeId, a:o.awayId, hg:+o.hg, ag:+o.ag, md:o.md||null});
      });
      if (rows.length){ rows.sort((a,b)=>(a.md||0)-(b.md||0)); rows.forEach(r=>out.push(r)); return; }
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
function winRank(m){
  if (!m || m.hg==null || m.ag==null || +m.hg===+m.ag || !isFinite(+m.hg) || !isFinite(+m.ag)) return null;
  const diff=Math.abs(m.hg-m.ag), gf=Math.max(m.hg, m.ag);
  return diff*1000+gf;
}
function richRank(m){
  if (!m || !isFinite(+m.hg) || !isFinite(+m.ag)) return null;
  return (m.hg+m.ag)*1000+Math.max(m.hg, m.ag);
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
    const row={id, len:o.len, live:!!o.live, season:o.startSeason&&o.startSeason!==o.endSeason?(o.startSeason+' – '+o.endSeason):o.season, startSeason:o.startSeason||o.season, endSeason:o.endSeason||o.season, startMd:o.startMd, endMd:o.endMd};
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
      (seq[m.h]=seq[m.h]||[]).push({res:hr, md:m.md||null});
      (seq[m.a]=seq[m.a]||[]).push({res:ar, md:m.md||null});
    });
    const present=new Set(Object.keys(seq));
    Object.keys(open).forEach(id=>{ if (!present.has(id)) close(id); });
    present.forEach(id=>{
      seq[id].forEach(step=>{
        const o=open[id];
        const res=step.res;
        if (o && o.type===res){ o.len++; o.season=name; o.endSeason=name; o.endMd=step.md; }
        else { if (o) close(id); open[id]={type:res, len:1, season:name, startSeason:name, endSeason:name, startMd:step.md, endMd:step.md}; }
      });
    });
  });
  const lastSeason=(S.seasons||[])[(S.seasons||[]).length-1];
  const liveName=lastSeason && lastSeason.status!=='done' && lastSeason.status!=='ending' ? lastSeason.name : '';
  if (liveName) Object.keys(open).forEach(id=>{ if (open[id] && open[id].endSeason===liveName) open[id].live=true; });
  Object.keys(open).forEach(close);
  return holders;
}
function recCupKey(cup){ return typeof cup==='string' && cup ? cup : ''; }
function recMatchLine(m, cup){
  const key=recCupKey(cup);
  const season=seasonByName(m.season);
  return '<div class="rec-line rec-pairline"><span class="rec-meta">'+esc(m.season||'')+'</span>'+matchLineHTML({h:m.h, a:m.a, hg:m.hg, ag:m.ag, season, liga:!!key, bl:!key || key==='dfb', nodel:true, klass:'rec-match axis'})+'</div>';
}
function recordTable(title, rows, note){
  const body=(rows&&rows.length)?rows.map(r=>'<tr><td class="l">'+esc(r.label)+'</td><td>'+r.value+'</td><td class="l">'+(r.who||'')+'</td><td class="l">'+(r.when||'')+'</td><td class="l">'+(r.extra||'')+'</td></tr>').join('')
    :'<tr><td class="l" colspan="5">Keine gespeicherten Werte.</td></tr>';
  return '<div class="rec-scroll"><h3>'+esc(title)+'</h3><table class="tbl rec-table"><thead><tr><th class="l">Rekord</th><th>Wert</th><th class="l">Verein</th><th class="l">Wann</th><th class="l">Hinweis</th></tr></thead><tbody>'+body+'</tbody></table>'+(note?'<p class="muted">'+note+'</p>':'')+'</div>';
}
function streakWhen(r){
  if (!r) return '';
  if (r.startMd==null || r.endMd==null) return esc(r.season||'');
  const bit=(season, md)=>esc(season||'')+', '+md+'. Spieltag';
  if (r.startSeason===r.endSeason && r.startMd===r.endMd) return bit(r.startSeason, r.startMd);
  return bit(r.startSeason, r.startMd)+' – '+bit(r.endSeason, r.endMd);
}
function tieNote(n){ return n>1?(n+' gleichauf'):''; }
function matchRecordRow(label, matches){
  return (matches||[]).map(m=>{
    const who=TEAMS[m.h]&&TEAMS[m.a]?matchLineHTML({h:m.h, a:m.a, hg:m.hg, ag:m.ag, nodel:true, klass:'rec-match axis'}):'';
    return {label, value:'<b>'+esc((m.hg!=null?m.hg:'–')+':'+(m.ag!=null?m.ag:'–'))+'</b>', who, when:esc(m.season||''), extra:tieNote(matches.length)};
  });
}
function teamRecordRows(label, hits, textOf){
  return (hits||[]).map(r=>({label, value:'<b>'+esc(textOf(r))+'</b>', who:clubHTML(r.id,{nobl:true}), when:streakWhen(r)||esc(r.season||''), extra:[tieNote(hits.length), r.live?'läuft noch':''].filter(Boolean).join(' · ')}));
}
function viewRekorde(lid){
  const lg=L[lid];
  if (!lg) return '<div class="box"><p class="muted">Keine Rekorde.</p></div>';
  try{
    const matches=leagueMatchList(lid);
    const stats=seasonStatRows(lid);
    const streaks=leagueStreaks(lid);
    const rows=[]
      .concat(matchRecordRow('Höchster Sieg', takeExtreme(matches, winRank, true)))
      .concat(matchRecordRow('Torreichstes Spiel', takeExtreme(matches, richRank, true)))
      .concat(teamRecordRows('Meiste Tore', takeExtreme(stats, r=>r.tg, true), r=>r.tg+' Tore'))
      .concat(teamRecordRows('Wenigste Tore', takeExtreme(stats, r=>r.tg, false), r=>r.tg+' Tore'))
      .concat(teamRecordRows('Meiste Gegentore', takeExtreme(stats, r=>r.gt, true), r=>r.gt+' Gegentore'))
      .concat(teamRecordRows('Wenigste Gegentore', takeExtreme(stats, r=>r.gt, false), r=>r.gt+' Gegentore'))
      .concat(teamRecordRows('Meiste Punkte', takeExtreme(stats, r=>r.pkt, true), r=>r.pkt+' Punkte'))
      .concat(teamRecordRows('Wenigste Punkte', takeExtreme(stats, r=>r.pkt, false), r=>r.pkt+' Punkte'))
      .concat(teamRecordRows('Längste Siegesserie', streaks.S, r=>r.len+' Siege'))
      .concat(teamRecordRows('Längste Unentschieden-Serie', streaks.U, r=>r.len+' Unentschieden'))
      .concat(teamRecordRows('Längste Niederlagenserie', streaks.N, r=>r.len+' Niederlagen'));
    return recordTable('Rekorde der '+lg.name, rows, 'Punkte sind die gespeicherten Ligapunkte, drei pro Sieg. Serien zählen nur Ligaspieltage dieser Liga und können über die Saison gehen. Pokale zählen nicht. Bei Gleichstand stehen alle Vereine in der Tabelle.');
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
  if (key!=='dfb'){
    schauRows().forEach(r=>{
      if (!r || !r.assign || r.land!==key || !r.id || !TEAMS[r.id]) return;
      add(titles, r.id, r.season||String(r.year));
    });
  }
  return {titles, finals};
}
function cupRecordTable(title, matches, hon, note){
  const champs=topHonour(hon.titles);
  const fins=topHonour(hon.finals);
  const rows=[]
    .concat(matchRecordRow('Höchster Sieg', takeExtreme(matches, winRank, true)))
    .concat(matchRecordRow('Torreichstes Spiel', takeExtreme(matches, richRank, true)));
  if (champs.best) champs.ids.forEach(id=>rows.push({label:'Rekordsieger', value:'<b>'+champs.best+' Titel</b>', who:clubHTML(id,{nobl:true}), when:esc((hon.titles[id]||[]).join(', ')), extra:tieNote(champs.ids.length)}));
  if (fins.best) fins.ids.forEach(id=>rows.push({label:'Meiste Finalteilnahmen', value:'<b>'+fins.best+'</b>', who:clubHTML(id,{nobl:true}), when:esc((hon.finals[id]||[]).join(', ')), extra:tieNote(fins.ids.length)}));
  return recordTable(title, rows, note||'Höchster Sieg und torreichstes Spiel kommen aus gespeicherten Ergebnissen. Historische Sieger ohne Gegner zählen beim Titel, nicht beim Spielrekord.');
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
    return cupRecordTable('Rekorde · '+title, cupMatchList(key), cupHonours(key), key==='dfb'
      ? 'Dieselben Rekordarten wie bisher. Die Jahre 2022 und 2023 bleiben aus der historischen DFB-Pokal-Liste draußen.'
      : 'Historische Sieger dieses Verbands stehen beim Rekordsieger, wenn der Pokal dem Rechner-Landespokal entspricht. Spielrekorde nur aus gespeicherten Ergebnissen.');
  }catch(e){
    return '<div class="box"><p class="muted">Für diesen Pokal liegen keine Rekorde vor.</p></div>';
  }
}
function viewHistorie(lid){
  const done=S.seasons.filter(s=>s.endData&&s.endData.tables);
  let h='';
  if (lid==='BL') h+=championBoardHTML(['bl','de'], 'ddr', 'Bundesliga und deutsche Meisterschaft', 'DDR-Meister');
  h+='<div class="box"><h3>Saisons der '+esc(L[lid].name)+'</h3>';
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
  if (L[lid] && (L[lid].level===5 || L[lid].level===6)) h+=relayChronicleHTML(lid);
  return h;
}
function relayChronicleHTML(lid){
  const spec=L[lid];
  if (!spec) return '';
  const l5=spec.level===5?lid:spec.upTo;
  const rows=[];
  (S.seasons||[]).forEach(season=>{
    const rel=season && season.relay && season.relay[l5];
    if (!rel || !TEAMS[rel.better] || !TEAMS[rel.worse]) return;
    if (spec.level===6 && rel.rlBetter!==lid && rel.rlWorse!==lid) return;
    const w=relayWinner(rel);
    const legs=(rel.matches||[]).map(m=>{
      if (m.hg==null || m.ag==null) return (m.leg===1?'Hinspiel':'Rückspiel')+' offen';
      let s=(m.leg===1?'Hinspiel ':'Rückspiel ')+m.hg+':'+m.ag;
      if (m.leg===2 && m.peh!=null && m.pea!=null && m.peh!==m.pea) s+=', '+m.peh+':'+m.pea+' i.E.';
      return s;
    }).join(', ');
    const out=w?esc(TEAMS[w].name)+' steigt auf, '+esc(TEAMS[w===rel.better?rel.worse:rel.better].name)+' bleibt':'noch offen';
    rows.push('<tr><td class="l">'+esc(season.name)+'</td><td class="l">'+esc(TEAMS[rel.worse].name)+' – '+esc(TEAMS[rel.better].name)+'</td><td class="l">'+esc(legs)+'</td><td class="l">'+out+'</td></tr>');
  });
  if (!rows.length) return '';
  return '<div class="box"><h3>Relegation</h3><p class="muted">Hin- und Rückspiel der Vizemeister. Das Heimrecht im Rückspiel steht beim besseren Punktequotienten. Keine Auswärtstore, keine Verlängerung, bei Gleichstand Elfmeterschießen.</p><table class="tbl hist-seasons"><thead><tr><th class="l">Saison</th><th class="l">Paarung</th><th class="l">Spiele</th><th class="l">Ausgang</th></tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
}
const BL_ORDER=['Schleswig-Holstein','Hamburg','Mecklenburg-Vorpommern','Bremen','Niedersachsen','Berlin','Brandenburg','Sachsen-Anhalt','Sachsen','Thüringen','Nordrhein-Westfalen','Hessen','Rheinland-Pfalz','Saarland','Baden-Württemberg','Bayern'];
function renderAmateur(){
  const s=cur();
  const counts={};
  const ids=[]; POOLS.forEach(p=>(s.pools[p.id]||[]).forEach(id=>{ ids.push(id); const bl=TEAMS[id].bl; counts[bl]=(counts[bl]||0)+1; }));
  if (!S.ui.amateurBl || !counts[S.ui.amateurBl]) S.ui.amateurBl=BL_ORDER.find(bl=>counts[bl])||BL_ORDER[0];
  const bl=S.ui.amateurBl;
  $('#title').textContent='Amateurliga';
  $('#subline').innerHTML=esc(bl)+' · kein Spielbetrieb. Zum Saisonende rücken je Regionalliga mindestens zwei Vereine nach.';
  setActions(seasonActions(s));
  $('#tabs').innerHTML='<a class="tab'+(S.ui.amateurView==='karte'?'':' active')+'" data-act="amateurList">Vereine</a><a class="tab'+(S.ui.amateurView==='karte'?' active':'')+'" data-act="amateurMap">Karte</a>'+BL_ORDER.filter(b=>counts[b]).map(b=>'<a class="tab'+(b===bl?' active':'')+'" data-amateur="'+esc(b)+'">'+esc(b)+'</a>').join('');
  const list=ids.filter(id=>TEAMS[id].bl===bl);
  list.sort(byAnsehen);
  if (S.ui.amateurView==='karte'){
    $('#view').innerHTML=viewMap('Amateurliga '+bl, list, [bl], 'am:'+bl);
    bindMap();
    return;
  }
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
function slotTemplate(lid, games){
  const copy=src=>src.map(s=>({dow:s.dow,time:s.time,kind:s.kind}));
  const cacheKey=games==null?lid:lid+'#'+games;
  if (SLOT_CACHE[cacheKey]) return copy(SLOT_CACHE[cacheKey]);
  let src;
  if(lid==='BL') src=expandSlots([{dow:'Fr',time:'20:30',kind:'top'},{dow:'Sa',time:'15:30',kind:'konferenz',n:6},{dow:'Sa',time:'18:30',kind:'top'},{dow:'So',time:'15:30',kind:'regional'},{dow:'So',time:'17:30',kind:'regional'}]);
  else if(lid==='BL2') src=expandSlots([{dow:'Fr',time:'18:30',kind:'regional',n:2},{dow:'Sa',time:'13:30',kind:'konferenz',n:4},{dow:'Sa',time:'20:30',kind:'top'},{dow:'So',time:'13:30',kind:'konferenz',n:3}]);
  else if(lid==='L3' || lid==='L4') src=expandSlots([{dow:'Fr',time:'19:00',kind:'top'},{dow:'Sa',time:'14:00',kind:'konferenz',n:5},{dow:'Sa',time:'16:30',kind:'top'},{dow:'So',time:'13:30',kind:'regional'},{dow:'So',time:'16:30',kind:'regional'},{dow:'So',time:'19:30',kind:'regional'}]);
  else if(lid==='L5NO' || lid==='L5SW') src=expandSlots([{dow:'Fr',time:'19:00',kind:'top'},{dow:'Sa',time:'14:00',kind:'konferenz',n:6},{dow:'Sa',time:'16:30',kind:'top'},{dow:'So',time:'13:30',kind:'regional'},{dow:'So',time:'16:30',kind:'regional'},{dow:'So',time:'19:30',kind:'regional'}]);
  else src=expandSlots([{dow:'Fr',time:'18:30',kind:'top'},{dow:'Sa',time:'14:30',kind:'konferenz',n:Math.max(0,(games||9)-1)}]);
  SLOT_CACHE[cacheKey]=src;
  return copy(src);
}
function leagueGames(lg){
  const row=lg&&lg.md&&lg.md.find(r=>r&&r.length);
  if (row) return row.length;
  const n=lg&&lg.teams?lg.teams.length:0;
  return n?Math.floor(n/2):9;
}
function finalSaturdaySlot(lid){
  if(lid==='BL') return {dow:'Sa', time:'15:30', kind:'konferenz'};
  if(lid==='BL2') return {dow:'Sa', time:'13:30', kind:'konferenz'};
  if(lid==='L3' || lid==='L4' || lid==='L5NO' || lid==='L5SW') return {dow:'Sa', time:'14:00', kind:'konferenz'};
  return {dow:'Sa', time:'14:30', kind:'konferenz'};
}
function isClosingDay(total, mi){ return total>1 && mi>=total-2; }
function lateSeason(total, mi){ return mi>=Math.floor(total*0.70); }
function slotLabel(s, simultaneous){
  if (simultaneous) return s.dow+' '+s.time+' · alle Spiele gleichzeitig';
  if (s.kracher) return s.dow+' '+s.time+' Topspiel · Abstiegskracher';
  return s.dow+' '+s.time+(s.kind==='konferenz'?' Konferenz':s.kind==='top'?' Topspiel':s.kind==='regional'?' regional':'');
}
function lastScheduled(season, lid){
  const bag=season.kickoffs&&season.kickoffs[lid]; if(!bag) return -1;
  let m=-1; for (const k in bag) if (bag[k]) m=Math.max(m, +k); return m;
}
function isScheduled(season, lid, mi){ return !!(season.kickoffs&&season.kickoffs[lid]&&season.kickoffs[lid][mi]); }
function nextBlockRange(n, from){
  const sh=seasonShape(n);
  if (from>=sh.total) return null;
  const halfEnd=from<sh.half ? sh.half-1 : sh.total-1;
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
function emptySlotCount(){ return {fr:0,so:0,konferenz:0,top:0,frTop:0,saTop:0,regional:0,einzel:0,total:0,topSum:0,topN:0,regSum:0,regN:0,byTime:{}}; }
function slotTimeKey(slot){ return (slot&&slot.dow||'')+' '+(slot&&slot.time||''); }
function templateTimes(lid){
  const out=[], seen={};
  slotTemplate(lid).forEach(s=>{
    const key=slotTimeKey(s);
    if (seen[key]){ seen[key].n++; return; }
    const row={key, dow:s.dow, time:s.time, n:1};
    seen[key]=row; out.push(row);
  });
  return out;
}
function bumpSlot(c, slot){
  if (!c || !slot) return;
  c.total++;
  if (!c.byTime) c.byTime={};
  const tk=slotTimeKey(slot);
  c.byTime[tk]=(c.byTime[tk]||0)+1;
  if (slot.dow==='Fr') c.fr++;
  if (slot.dow==='So') c.so++;
  if (slot.kind==='konferenz') c.konferenz++;
  if (slot.kind==='top'){
    c.top++;
    if (slot.dow==='Fr') c.frTop++;
    if (slot.dow==='Sa') c.saTop++;
    if (slot.wert && slot.wert.total!=null){ c.topSum+=slot.wert.total; c.topN++; }
  }
  if (slot.kind==='regional'){
    c.regional++;
    if (slot.wert && slot.wert.km!=null){ c.regSum+=slot.wert.km; c.regN++; }
  }
  if (!slot.kind) c.einzel++;
}
function slotTally(season, lid){
  const ids=season.leagues[lid].teams, map={};
  ids.forEach(id=>map[id]=emptySlotCount());
  const bag=season.kickoffs&&season.kickoffs[lid]||{};
  season.leagues[lid].md.forEach((md,mi)=>{
    const slots=bag[mi]; if(!slots) return;
    md.forEach((m,k)=>{
      const slot=slots[k]; if(!slot) return;
      [season.leagues[lid].teams[m[0]], season.leagues[lid].teams[m[1]]].forEach(id=>bumpSlot(map[id], slot));
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
// Topspiel 0–100: Gesamtansehen der Staffel und der sportliche Zielkampf, gewichtet nach Saisonphase.
// Ohne gespielte Partie gibt es keinen Tabellenbonus. Die Ansehen-Skala ist das vorhandene Gesamtansehen.
function sportSignal(pkt, sp){
  if (!(sp>0)) return null;
  const ppg=Math.max(0, Math.min(3, pkt/sp))/3;
  const trust=Math.min(1, sp/5);
  return 0.5*(1-trust)+ppg*trust;
}
function ansehenUnit(ids, endYear){
  const vals=(ids||[]).map(id=>({id, v:(endYear!=null?ansehenInfo(id, endYear).value:ansehenValue(id))||0}));
  const lo=vals.reduce((m,s)=>Math.min(m,s.v), Infinity);
  const hi=vals.reduce((m,s)=>Math.max(m,s.v), -Infinity);
  const span=hi-lo;
  vals.sort((a,b)=>b.v-a.v || String(a.id).localeCompare(String(b.id)));
  const unit={}, rank={};
  vals.forEach((s,i)=>{
    rank[s.id]=i+1;
    unit[s.id]=vals.length<=1 || span<=0 ? 50 : (s.v-lo)/span*100;
  });
  return {unit, rank};
}
function phaseWeights(total, mi){
  const md=Math.max(1, (mi|0)+1), n=Math.max(1, total|0);
  let cuts;
  if (n===38) cuts=[[4,0.60,0.40],[8,0.40,0.60],[12,0.30,0.70],[38,0.25,0.75]];
  else if (n===42) cuts=[[4,0.60,0.40],[9,0.40,0.60],[13,0.30,0.70],[42,0.25,0.75]];
  else if (n===34) cuts=[[4,0.60,0.40],[7,0.40,0.60],[11,0.30,0.70],[34,0.25,0.75]];
  else {
    const marks=[[4/38,0.60,0.40],[8/38,0.40,0.60],[12/38,0.30,0.70],[1,0.25,0.75]];
    cuts=[];
    let prev=0;
    marks.forEach(([k,h,s])=>{
      let end=Math.max(prev+1, Math.round(k*n));
      if (k===1) end=n;
      cuts.push([end,h,s]);
      prev=end;
    });
  }
  let prev=0;
  for (let i=0;i<cuts.length;i++){
    const end=cuts[i][0], h=cuts[i][1], s=cuts[i][2];
    if (md<=end) return {h, s, from:prev+1, to:end, label:(prev+1)+'–'+end};
    prev=end;
  }
  const last=cuts[cuts.length-1];
  return {h:last[1], s:last[2], from:prev, to:n, label:prev+'–'+n};
}
function downFromKnown(season, lid, mi){
  const spec=L[lid];
  if (!spec) return 0;
  if (spec.level<=4) return spec.down||0;
  if (spec.level===5){
    const parentLg=season.leagues&&season.leagues.L4;
    if (!parentLg || !parentLg.md) return spec.down||2;
    const cut=Math.max(0, Math.min(mi|0, parentLg.md.length));
    let table=[];
    try{ table=tableBefore(season, 'L4', cut); }catch(e){ table=[]; }
    const parentDown=L.L4.down||0;
    const k=parentDown?table.slice(-parentDown).map(r=>r.id).filter(id=>homeLeague(id, 5)===lid).length:0;
    return l5Balance(k).down;
  }
  const parent=spec.upTo;
  const parentSpec=L[parent];
  const parentDown=parentSpec?downFromKnown(season, parent, mi):0;
  const lg=season.leagues&&season.leagues[parent];
  if (!lg || !lg.md) return spec.down||2;
  const cut=Math.max(0, Math.min(mi|0, lg.md.length));
  let table=[];
  try{ table=tableBefore(season, parent, cut); }catch(e){ table=[]; }
  const incoming=parentDown?table.slice(-parentDown).map(r=>r.id).filter(id=>homeLeague(id, 6)===lid):[];
  const l4=season.leagues&&season.leagues.L4;
  let k=0;
  if (l4 && l4.md){
    let upper=[];
    try{ upper=tableBefore(season, 'L4', Math.max(0, Math.min(mi|0, l4.md.length))); }catch(e){ upper=[]; }
    const parentDownL4=L.L4.down||0;
    k=parentDownL4?upper.slice(-parentDownL4).map(r=>r.id).filter(id=>homeLeague(id, 5)===parent).length:0;
  }
  const u=l5Balance(k).mode==='beide'?2:1;
  return 2+Math.max(0, incoming.length-u);
}
function eighthKnown(season, mi){
  if (!season||!season.leagues||!season.leagues.BL) return false;
  let rows=[];
  try{ rows=mi>0?tableBefore(season,'BL',mi):[]; }catch(e){ rows=[]; }
  const top={};
  rows.forEach(r=>{ if (r.pl<=7) top[r.id]=1; });
  const cup=season.cups&&season.cups.dfb;
  if (!cup||!cup.rounds) return false;
  // at ist der letzte schon terminierte Bundesliga-Spieltag zum Zeitpunkt der Entscheidung.
  // Gespeicherte Pokalspiele ohne at bleiben undatiert und gelten nicht als bekannt.
  const known=m=>!!(m && m.at!=null && (m.at|0)<(mi|0));
  const alive=new Set();
  (cup.entrants||[]).forEach(id=>alive.add(id));
  let saw=false;
  cup.rounds.forEach(r=>{
    (r.matches||[]).forEach(m=>{
      if (!known(m)) return;
      const w=cupWinner(m);
      if (!w) return;
      saw=true;
      if (m.h!==w) alive.delete(m.h);
      if (m.a!==w) alive.delete(m.a);
    });
  });
  if (!saw || !alive.size) return false;
  let ok=true;
  alive.forEach(id=>{ if (!top[id]) ok=false; });
  return ok;
}
function schedulingAnsehenEnd(season){
  const y=seasonYear(season&&season.name);
  // Pokal und Chronik der laufenden Saison haben keinen Spieltag. Der Termin-Snapshot
  // nimmt das Gesamtansehen zum Ende der Vorsaison. Die Ansehen-Formel bleibt gleich.
  return y>0?y-1:0;
}
function zoneProfile(season, lid, mi){
  const spec=L[lid]||{};
  const lg=season.leagues[lid];
  const n=lg&&lg.teams?lg.teams.length:(spec.size||18);
  const down=downFromKnown(season, lid, mi|0);
  const zones={n, up:spec.up||0, down:down|0, meister:1, cl:0, el:0, uecl:0};
  if (lid==='BL'){
    zones.cl=4; zones.el=6; zones.uecl=eighthKnown(season, mi)?8:7;
  }
  return zones;
}
function powerSnapshot(season, lid, mi){
  const lg=season.leagues[lid];
  const rows=mi>0 ? tableBefore(season, lid, mi) : [];
  const by={}; rows.forEach(r=>by[r.id]=r);
  const anEnd=schedulingAnsehenEnd(season);
  const an=ansehenUnit(lg.teams, anEnd);
  const raw={};
  lg.teams.forEach(id=>{ raw[id]=ansehenInfo(id, anEnd).value; });
  const list=lg.teams.map(id=>{
    const r=by[id]||{};
    const pkt=r.pkt||0, sp=r.sp||0;
    const sport=sportSignal(pkt, sp);
    const ansehen=an.unit[id]==null?0:an.unit[id];
    const appeal=sport==null?ansehen:(0.65*(sport*100)+0.35*ansehen);
    return {id, pkt, sp, diff:r.diff||0, tg:r.tg||0, form:r.form||[], sport, ansehen, anRank:an.rank[id]||lg.teams.length, appeal, power:appeal};
  });
  const played=list.filter(s=>s.sp>0).sort((a,b)=>b.pkt-a.pkt || b.diff-a.diff || b.tg-a.tg || String(a.id).localeCompare(String(b.id)));
  let place=1;
  played.forEach((s,i)=>{
    if (i>0){
      const p=played[i-1];
      if (s.pkt!==p.pkt || s.diff!==p.diff || s.tg!==p.tg) place=i+1;
    }
    s.sportPlace=place;
  });
  list.sort((a,b)=>b.appeal-a.appeal || b.ansehen-a.ansehen || String(a.id).localeCompare(String(b.id)));
  const rank={}, info={};
  list.forEach((s,i)=>{ rank[s.id]=i+1; info[s.id]=s; });
  const table=played.map(s=>({id:s.id, pl:s.sportPlace, pkt:s.pkt, sp:s.sp, form:(s.form||[]).slice()}));
  const ansehen={};
  lg.teams.forEach(id=>{ ansehen[id]=an.unit[id]==null?0:an.unit[id]; });
  const form={};
  list.forEach(s=>{ form[s.id]=(s.form||[]).slice(); });
  return {rank, info, total:lg.md.length, table, zones:zoneProfile(season, lid, mi), at:mi, ansehen, raw, ansehenEnd:anEnd, form};
}
function formEdge(row){
  const f=row&&row.form;
  if (!f || !f.length) return 0;
  const pts=f.map(x=>x==='S'?1:x==='U'?0.5:0);
  return pts.reduce((s,v)=>s+v,0)/pts.length;
}
function pktByPlace(table, pl){
  const row=(table||[]).find(r=>r.pl===pl);
  return row?row.pkt:null;
}
function zoneHeat(row, snap){
  if (!row || row.sportPlace==null || !(row.sp>0)) return {heat:0, why:''};
  const z=snap.zones||{};
  const table=snap.table||[];
  const swing=3*Math.max(1, snap.rem||1);
  const gapTo=otherPl=>{
    if (otherPl<1 || otherPl>z.n || otherPl===row.sportPlace) return null;
    const pkt=pktByPlace(table, otherPl);
    if (pkt==null) return null;
    return Math.abs(row.pkt-pkt);
  };
  let best=0, why='';
  const lines=[];
  if (z.down) lines.push(['Abstieg', z.n-z.down]);
  if (z.up) lines.push(['Aufstieg', z.up]);
  if (z.meister) lines.push(['Meisterschaft', 1]);
  if (z.cl) lines.push(['Champions League', z.cl]);
  if (z.el) lines.push(['Europa League', z.el]);
  if (z.uecl) lines.push(['Conference League', z.uecl]);
  lines.forEach(([label, linePl])=>{
    if (linePl<1 || linePl>z.n) return;
    const dist=Math.abs(row.sportPlace-linePl);
    if (dist>2) return;
    const other=row.sportPlace<=linePl?linePl+1:linePl;
    const gap=gapTo(other);
    if (gap==null) return;
    const alive=Math.max(0, 1-gap/swing);
    const near=1-dist/3;
    const trust=Math.min(1, row.sp/4);
    const heat=alive*near*trust;
    if (heat>best){ best=heat; why=label; }
  });
  return {heat:best, why};
}
function sportPair(h, a, snap){
  const H=snap.info[h], A=snap.info[a];
  if (!H || !A || !(H.sp>0) || !(A.sp>0)) return {score:0, note:'noch keine Tabelle'};
  const zh=zoneHeat(H, snap), za=zoneHeat(A, snap);
  const both=Math.min(zh.heat, za.heat);
  const same=zh.why && zh.why===za.why && both>0.12;
  const gap=Math.abs((H.pkt||0)-(A.pkt||0));
  const swing=3*Math.max(1, snap.rem||1);
  const duel=Math.max(0, 1-gap/swing);
  const progress=snap.total>1 ? (snap.mdIndex||0)/Math.max(1, snap.total-1) : 0;
  const sample=Math.min(1, Math.min(H.sp, A.sp)/5);
  const sig=s=>s.sport==null?0:s.sport;
  const ppgTerm=Math.min(sig(H), sig(A));
  let fight=same?both*(0.45+0.55*duel):0;
  let score=100*fight*(0.3+0.7*progress);
  if (same) score+=ppgTerm*12*progress;
  const form=(formEdge(H)+formEdge(A)-1)*5;
  if (same) score+=form;
  score=Math.max(0, Math.min(100, score));
  const note=same?(zh.why+(duel>0.55?' · eng':'')+(sample<1?' · ungleiche Spiele':'')):'kein gemeinsamer Zielkampf';
  return {score, note, zone:same?zh.why:''};
}
const matchValueCache=new WeakMap();
function matchValue(h, a, snap, mi){
  let box=null, mkey='';
  if (snap && typeof snap==='object'){
    box=matchValueCache.get(snap);
    if (!box){ box=new Map(); matchValueCache.set(snap, box); }
    mkey=h+'|'+a+'|'+mi;
    const hit=box.get(mkey);
    if (hit) return {total:hit.total, hist:hit.hist, sport:hit.sport, wh:hit.wh, ws:hit.ws, label:hit.label, note:hit.note};
  }
  const phase=phaseWeights(snap.total||1, mi);
  const H=snap.info&&snap.info[h], A=snap.info&&snap.info[a];
  const hv=H&&H.ansehen!=null?H.ansehen:0, av=A&&A.ansehen!=null?A.ansehen:0;
  const hist=0.4*((hv+av)/2)+0.6*Math.min(hv, av);
  const ctx=Object.assign({}, snap, {rem:Math.max(1,(snap.total||1)-mi), mdIndex:mi});
  const sport=sportPair(h, a, ctx);
  const total=phase.h*hist+phase.s*sport.score;
  const result={total:Math.round(total*10)/10, hist:Math.round(hist*10)/10, sport:Math.round(sport.score*10)/10, wh:phase.h, ws:phase.s, label:phase.label, note:sport.note};
  if (box) box.set(mkey, {total:result.total, hist:result.hist, sport:result.sport, wh:result.wh, ws:result.ws, label:result.label, note:result.note});
  return result;
}
function pairScore(h, a, snap, mi){
  const at=mi!=null?mi:(snap&&snap.at!=null?snap.at:0);
  return matchValue(h, a, snap, at).total;
}
function rescueAnsehen(id, snap){
  const raw=snap && snap.raw && snap.raw[id];
  if (raw!=null && isFinite(raw)) return raw;
  const info=snap && snap.info && snap.info[id];
  if (info && info.ansehen!=null && isFinite(info.ansehen)) return info.ansehen;
  try{ return ansehenValue(id)||0; }catch(e){ return 0; }
}
function rankedIds(ids, snap){
  return (ids||[]).slice().sort((a,b)=>rescueAnsehen(a, snap)-rescueAnsehen(b, snap) || byRang(a,b));
}
function firstTopTarget(id, ids, total, snap){
  const order=rankedIds(ids, snap);
  const i=Math.max(0, order.indexOf(id));
  return Math.round((0.12 + 0.55*(i/Math.max(1, order.length-1)))*(total-1));
}
function rescueUrge(id, mi, total, ids, snap){
  const target=firstTopTarget(id, ids, total, snap);
  const late=mi-target;
  if (late<0) return Math.max(0, 5000*(1-(target-mi)/Math.max(1,total)));
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
function noteKick(md, row, lg, counts){
  row.forEach((slot,i)=>{
    if (!slot) return;
    const h=lg.teams[md[i][0]], a=lg.teams[md[i][1]];
    for (const id of [h,a]) bumpSlot(counts[id], slot);
  });
}
function assignMatchday(season, lid, mi, snap, counts){
  const lg=season.leagues[lid], md=lg.md[mi], tmpl=slotTemplate(lid, md.length), n=lg.teams.length;
  const total=md.length? lg.md.length : 0;
  if (total && isClosingDay(total, mi)){
    const slot=finalSaturdaySlot(lid);
    const row=md.map((m,i)=>{
      const h=lg.teams[m[0]], a=lg.teams[m[1]];
      const v=matchValue(h, a, snap, mi);
      return Object.assign({}, slot, {wert:{total:v.total, hist:v.hist, sport:v.sport, wh:v.wh, ws:v.ws, phase:v.label, note:v.note, km:kmBetween(h,a)}});
    });
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
  const distRank=new Map();
  const known=[];
  md.forEach(m=>{
    const h=lg.teams[m[0]], a=lg.teams[m[1]], km=kmBetween(h,a);
    if (km!=null) known.push({key:h+'|'+a, km});
  });
  known.sort((a,b)=>a.km-b.km);
  known.forEach((row,i)=>distRank.set(row.key, known.length<=1?0:i/(known.length-1)));
  const timeSpecs=templateTimes(lid);
  const regLeft=mi>=total-2?0:(total-2-mi);
  const zeroOf={};
  if (regLeft>0) timeSpecs.forEach(spec=>{
    let z=0;
    lg.teams.forEach(id=>{ const bt=counts[id]&&counts[id].byTime; if (bt && !bt[spec.key]) z++; });
    zeroOf[spec.key]=z;
  });
  const cost=md.map(m=>{
    const h=lg.teams[m[0]], a=lg.teams[m[1]];
    return tmpl.map(slot=>{
      let hard=0, quality=0, soft=0;
      const confNeed=confHalf(total, lg);
      for (const id of [h,a]){
        const cnt=counts[id];
        if (konfPer){
          const slack=cnt.konferenz+rem-confNeed;
          const pull=slack<1?8000000:slack<2?6000000:slack<3?4000000:slack<4?2000000:0;
          if (pull){
            if (slot.kind==='konferenz') hard -= pull; else hard += pull;
          } else {
            const fair=confNeed*(mi+1)/total;
            const behind=fair-cnt.konferenz;
            if (behind>0.5) soft += slot.kind==='konferenz' ? -behind*40 : behind*40;
          }
        }
        if (slot.kind==='top') continue;
        const urge=missing=>missing ? (rem<=6?80: rem<=14?30:8) : 0;
        if (slot.dow==='Fr'){
          soft -= urge(cnt.fr===0);
          soft += Math.min(40, cnt.fr*cnt.fr);
        }
        if (slot.dow==='So' && hasSo) soft -= urge(cnt.so===0);
        if (slot.kind==='regional') soft -= urge(cnt.regional===0);
      }
      if (slot.kind==='top'){
        const v=matchValue(h, a, snap, mi);
        quality -= v.total*1000;
        const skew=(id,dow)=>dow==='Fr' ? ((counts[id].frTop||0)-(counts[id].saTop||0)) : ((counts[id].saTop||0)-(counts[id].frTop||0));
        if (slot.dow==='Fr' || slot.dow==='Sa') soft += (skew(h, slot.dow)+skew(a, slot.dow))*40;
      }
      if (slot.kind==='regional'){
        const dKey=h+'|'+a;
        soft += (distRank.has(dKey)?distRank.get(dKey):0.5)*40;
      }
      if (regLeft>0){
        const key=slotTimeKey(slot);
        const closingKey=slotTimeKey(finalSaturdaySlot(lid));
        const specOf=timeSpecs.find(spec=>spec.key===key);
        const seats=Math.max(1, (specOf?specOf.n:1)*2);
        const pressure=(zeroOf[key]||0)/seats;
        for (const id of [h,a]){
          const bt=counts[id]&&counts[id].byTime;
          if (!bt) continue;
          const confSlack=(counts[id].konferenz||0)+(total-mi)-confHalf(total, lg);
          const missingThis=key!==closingKey && !bt[key];
          if (missingThis && confSlack>=1) hard -= 7000000+Math.round(Math.min(pressure, 12)*150000);
          else if (!missingThis && key!==closingKey && bt[key] && (zeroOf[key]||0)>0 && confSlack>=2) hard += 1000000;
          timeSpecs.forEach(spec=>{
            if (spec.key===closingKey || bt[spec.key]) return;
            if ((zeroOf[spec.key]||0)>regLeft-1){ if (spec.key===key) hard -= 8000000; else hard += 8000000; }
          });
        }
      }
      soft=Math.max(-2000, Math.min(2000, soft));
      return hard+quality+soft;
    });
  });
  const asg=hungarian(cost);
  const row=md.map(()=>null);
  asg.forEach((col,i)=>{ row[i]=tmpl[col]; });
  const worth=md.map(m=>matchValue(lg.teams[m[0]], lg.teams[m[1]], snap, mi));
  const rankedWorth=worth.map(w=>w.total).sort((a,b)=>b-a);
  const worthCut=rankedWorth[Math.min(rankedWorth.length-1, Math.max(0, topSlots-1))]||0;
  const topClass=i=>{
    const t=worth[i].total;
    if (t>=worthCut-0.05) return 0;
    if (t>=worthCut-2) return 2;
    return 3;
  };
  row.forEach((slot,i)=>{
    if (!slot || slot.kind!=='top' || topClass(i)<3) return;
    let swap=null;
    row.forEach((other,j)=>{
      if (j===i || !other || other.kind==='top' || other.kind==='konferenz') return;
      const cls=topClass(j);
      if (cls>=3) return;
      const q=pairScore(lg.teams[md[j][0]], lg.teams[md[j][1]], snap, mi);
      if (!swap || cls<swap.cls || (cls===swap.cls && q>swap.q)) swap={j,cls,q};
    });
    if (!swap){
      const halfTarget=total/2;
      row.forEach((other,j)=>{
        if (j===i || !other || other.kind!=='konferenz') return;
        const cls=topClass(j);
        if (cls>=3) return;
        const ids=[lg.teams[md[j][0]], lg.teams[md[j][1]]];
        if (ids.some(id=>counts[id].konferenz+(rem-1)<halfTarget)) return;
        const q=pairScore(lg.teams[md[j][0]], lg.teams[md[j][1]], snap, mi);
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
      const urge=Math.max(...ids.map(id=>counts[id].top===0 ? rescueUrge(id, mi, total, lg.teams, snap) : 0));
      if (urge<=0) return;
      if (!best || urge>best.urge) best={j, urge};
    });
    if (best && worth[i].total<=worth[best.j].total+2){ const tmp=row[i]; row[i]=row[best.j]; row[best.j]=tmp; }
  });
  if (konfPer){
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
          const q=pairScore(lg.teams[md[j][0]], lg.teams[md[j][1]], snap, mi);
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
      if (ids.some(id=>counts[id].konferenz+(rem-1)<confHalf(total, lg))) return;
      let alt=null;
      row.forEach((other,j)=>{
        if (!other || other.kind!=='top') return;
        const t2=[lg.teams[md[j][0]], lg.teams[md[j][1]]];
        if (t2.some(id=>counts[id].top===0)) return;
        if (slot.kind==='konferenz' && t2.some(id=>counts[id].konferenz+(rem-1)<confHalf(total, lg))) return;
        if (worth[j].total>worth[i].total+2) return;
        if (alt==null || worth[j].total<worth[alt].total) alt=j;
      });
      if (alt==null) return;
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
      if (alt && alt.j!==fri && alt.sc<frScore(fri) && worth[fri].total<=worth[alt.j].total+2){ const tmp=row[fri]; row[fri]=row[alt.j]; row[alt.j]=tmp; }
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
          if (row[j].kind==='top' && worth[j].total>worth[needy].total+2) continue;
          if (row[needy].kind==='konferenz'){
            const keep=[lg.teams[md[needy][0]], lg.teams[md[needy][1]]];
            if (keep.some(id=>(counts[id].konferenz+(rem-1))<confHalf(total, lg))) continue;
          }
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
  const confTarget=confHalf(total, lg);
  for (let guard=0; guard<md.length; guard++){
    let crit=null, critScore=1e9;
    row.forEach((slot,i)=>{
      if (!slot || slot.kind==='konferenz') return;
      const ids=[lg.teams[md[i][0]], lg.teams[md[i][1]]];
      if (!ids.some(id=>(counts[id].konferenz||0)+(rem-1)<confTarget)) return;
      if (worth[i].total<critScore){ crit=i; critScore=worth[i].total; }
    });
    if (crit==null) break;
    let donor=null;
    row.forEach((slot,j)=>{
      if (j===crit || !slot || slot.kind!=='konferenz') return;
      const ids=[lg.teams[md[j][0]], lg.teams[md[j][1]]];
      if (ids.some(id=>(counts[id].konferenz||0)+(rem-1)<confTarget)) return;
      if (donor==null || worth[j].total>worth[donor].total) donor=j;
    });
    if (donor==null) break;
    const tmp=row[crit]; row[crit]=row[donor]; row[donor]=tmp;
  }
  const topIdx=row.map((s,i)=>s&&s.kind==='top'?i:-1).filter(i=>i>=0);
  const frTop=topIdx.find(i=>row[i].dow==='Fr'), saTop=topIdx.find(i=>row[i].dow==='Sa');
  if (frTop!=null && saTop!=null && Math.abs(worth[frTop].total-worth[saTop].total)<=2){
    const idsOf=idx=>[lg.teams[md[idx][0]], lg.teams[md[idx][1]]];
    const score=swapped=>{
      const map={};
      const add=(id, fr, sa)=>{
        if (!map[id]) map[id]={fr:counts[id].frTop||0, sa:counts[id].saTop||0};
        map[id].fr+=fr; map[id].sa+=sa;
      };
      idsOf(frTop).forEach(id=>add(id, swapped?0:1, swapped?1:0));
      idsOf(saTop).forEach(id=>add(id, swapped?1:0, swapped?0:1));
      let s=0;
      Object.keys(map).forEach(id=>{ s+=Math.abs(map[id].fr-map[id].sa); });
      return s;
    };
    if (score(true)<score(false)){ const tmp=row[frTop]; row[frTop]=row[saTop]; row[saTop]=tmp; }
  }
  forceOpenTimes(row, md, lg.teams, counts, mi, total, lid, season);
  row.forEach((slot,i)=>{
    if (!slot) return;
    const h=lg.teams[md[i][0]], a=lg.teams[md[i][1]];
    const v=worth[i];
    row[i]=Object.assign({}, slot, {wert:{total:v.total, hist:v.hist, sport:v.sport, wh:v.wh, ws:v.ws, phase:v.label, note:v.note, km:kmBetween(h,a)}});
  });
  noteKick(md, row, lg, counts);
  return row;
}
function assignmentKeepsTimes(season, lid, mi, to, beforeRow, afterRow){
  const lg=season.leagues[lid], bag=season.kickoffs[lid], total=lg.md.length;
  if (!beforeRow || !afterRow) return true;
  const times=templateTimes(lid);
  const closingKey=slotTimeKey(finalSaturdaySlot(lid));
  let closingLeft=0;
  for (let d=mi+1; d<total; d++) if (isClosingDay(total, d)) closingLeft++;
  const count=src=>{
    const map={};
    const add=(id,key)=>{ if (!map[id]) map[id]={}; map[id][key]=(map[id][key]||0)+1; };
    for (let d=0; d<=to; d++){
      const r=d===mi?src:bag[d];
      if (!r) continue;
      lg.md[d].forEach((m,k)=>{
        if (!r[k]) return;
        const key=slotTimeKey(r[k]);
        add(lg.teams[m[0]], key); add(lg.teams[m[1]], key);
      });
    }
    return map;
  };
  const before=count(beforeRow), after=count(afterRow), ids={};
  lg.md[mi].forEach(m=>{ ids[lg.teams[m[0]]]=1; ids[lg.teams[m[1]]]=1; });
  for (const id in ids){
    for (const spec of times){
      if (after[id] && after[id][spec.key]>0) continue;
      if (!(before[id] && before[id][spec.key]>0)) continue;
      if (spec.key===closingKey && closingLeft>0) continue;
      return false;
    }
  }
  return true;
}
function nudgeNonExactBlock(season, lid, from, to, snap){
  const lg=season.leagues[lid], bag=season.kickoffs[lid], n=lg.teams.length, total=lg.md.length;
  const konfN=slotTemplate(lid, leagueGames(lg)).filter(s=>s.kind==='konferenz').length;
  const topNeed=Math.max(1, slotTemplate(lid, leagueGames(lg)).filter(s=>s.kind==='top').length);
  const valueAt=(mi,i)=>matchValue(lg.teams[lg.md[mi][i][0]], lg.teams[lg.md[mi][i][1]], snap, mi).total;
  const cutAt=mi=>{
    const vals=[];
    lg.md[mi].forEach((_,j)=>vals.push(valueAt(mi,j)));
    vals.sort((a,b)=>b-a);
    return vals[Math.min(vals.length-1, Math.max(0, topNeed-1))]||0;
  };
  const legalAt=(mi,i)=>valueAt(mi,i)>=cutAt(mi)-2;
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
      const cands=[];
      row.forEach((other,j)=>{
        if (j===i || !other || other.kind==='top' || other.kind==='konferenz' || !legalAt(mi,j)) return;
        cands.push({j, v:valueAt(mi,j)});
      });
      cands.sort((a,b)=>b.v-a.v);
      const alt=cands.find(c=>swapKeepsTimes(season, lid, mi, to, i, c.j));
      if (alt){ const t=row[i]; row[i]=row[alt.j]; row[alt.j]=t; }
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
    const back=row.slice();
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
    if (!assignmentKeepsTimes(season, lid, mi, to, back, row)){
      for (let i=0;i<row.length;i++) row[i]=back[i];
      return false;
    }
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
          if (!swapKeepsTimes(season, lid, d, to, idx, j)) return;
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
function reserveTightClubs(season, lid, from, to, snap){
  const lg=season.leagues[lid], bag=season.kickoffs[lid], total=lg.md.length;
  const need=confHalf(total, lg);
  const konfPer=slotTemplate(lid, leagueGames(lg)).filter(s=>s.kind==='konferenz').length;
  const confOf=()=>{
    const c={}; lg.teams.forEach(id=>c[id]=0);
    for (let d=0; d<=to; d++){
      const row=bag[d]; if (!row) continue;
      lg.md[d].forEach((m,i)=>{ if (row[i] && row[i].kind==='konferenz'){ c[lg.teams[m[0]]]++; c[lg.teams[m[1]]]++; } });
    }
    return c;
  };
  const val=(mi,i)=>matchValue(lg.teams[lg.md[mi][i][0]], lg.teams[lg.md[mi][i][1]], snap, mi).total;
  for (let guard=0; guard<lg.teams.length*4; guard++){
    const c=confOf();
    const regular=[]; let closing=0;
    for (let d=to+1; d<total; d++){ if (isClosingDay(total, d)) closing++; else regular.push(d); }
    const must=lg.teams.filter(id=> (need-c[id]-closing) > 0 && (need-c[id]-closing) >= regular.length);
    if (!must.length || !regular.length) return true;
    const mustSet=new Set(must);
    let overcrowded=false;
    for (const d of regular){
      let matches=0;
      lg.md[d].forEach(m=>{ if (mustSet.has(lg.teams[m[0]]) || mustSet.has(lg.teams[m[1]])) matches++; });
      if (matches>konfPer){ overcrowded=true; break; }
    }
    if (!overcrowded) return true;
    let best=null;
    for (let mi=from; mi<=to; mi++){
      if (isClosingDay(total, mi)) continue;
      const row=bag[mi]; if (!row) continue;
      row.forEach((slot,i)=>{
        if (!slot || slot.kind==='konferenz') return;
        const ids=[lg.teams[lg.md[mi][i][0]], lg.teams[lg.md[mi][i][1]]];
        if (!ids.some(id=>mustSet.has(id))) return;
        row.forEach((other,j)=>{
          if (j===i || !other || other.kind!=='konferenz') return;
          const donors=[lg.teams[lg.md[mi][j][0]], lg.teams[lg.md[mi][j][1]]];
          if (donors.some(id=> (need-(c[id]-1)-closing) > regular.length)) return;
          if (!swapKeepsTimes(season, lid, mi, to, i, j)) return;
          if (!conferenceSwapOk(season, lid, to, c, donors, ids)) return;
          const score=val(mi,j)-val(mi,i);
          if (!best || score>best.score) best={mi,i,j,score};
        });
      });
    }
    if (!best) return false;
    const row=bag[best.mi];
    const tmp=row[best.i]; row[best.i]=row[best.j]; row[best.j]=tmp;
  }
  return false;
}
function raiseTops(season, lid, from, to, snap){
  const lg=season.leagues[lid], bag=season.kickoffs[lid], total=lg.md.length;
  for (let mi=from; mi<=to; mi++){
    if (isClosingDay(total, mi)) continue;
    const row=bag[mi]; if (!row) continue;
    for (let guard=0; guard<row.length; guard++){
      let moved=false;
      for (let i=0; i<row.length && !moved; i++){
        const slot=row[i];
        if (!slot || slot.kind!=='top') continue;
        const here=matchValue(lg.teams[lg.md[mi][i][0]], lg.teams[lg.md[mi][i][1]], snap, mi).total;
        const cands=[];
        for (let j=0; j<row.length; j++){
          const other=row[j];
          if (j===i || !other || other.kind==='top' || other.kind==='konferenz') continue;
          const v=matchValue(lg.teams[lg.md[mi][j][0]], lg.teams[lg.md[mi][j][1]], snap, mi).total;
          if (v>here+0.05) cands.push({j, v});
        }
        cands.sort((a,b)=>b.v-a.v);
        const alt=cands.find(c=>swapKeepsTimes(season, lid, mi, to, i, c.j));
        if (alt){ const t=row[i]; row[i]=row[alt.j]; row[alt.j]=t; moved=true; }
      }
      if (!moved) break;
    }
  }
}
function topCanTakeConference(season, lid, to, donorIds){
  const lg=season.leagues[lid], bag=season.kickoffs[lid], total=lg.md.length;
  const need=confHalf(total, lg);
  const konf=slotTemplate(lid, leagueGames(lg)).filter(s=>s.kind==='konferenz').length;
  const c={}; lg.teams.forEach(id=>c[id]=0);
  for (let d=0; d<=to; d++){
    const row=bag[d]; if (!row) continue;
    lg.md[d].forEach((m,i)=>{ if (row[i] && row[i].kind==='konferenz'){ c[lg.teams[m[0]]]++; c[lg.teams[m[1]]]++; } });
  }
  donorIds.forEach(id=>{ c[id]--; });
  const future=Math.max(0, total-(to+1));
  if (donorIds.some(id=>c[id]+future<need+4)) return false;
  const regular=[]; let closing=0;
  for (let d=to+1; d<total; d++){ if (isClosingDay(total, d)) closing++; else regular.push(d); }
  const must=lg.teams.filter(id=> (need-c[id]-closing)>0 && (need-c[id]-closing)>=regular.length);
  const set=new Set(must);
  for (const d of regular){
    let matches=0;
    lg.md[d].forEach(m=>{ if (set.has(lg.teams[m[0]]) || set.has(lg.teams[m[1]])) matches++; });
    if (matches>konf) return false;
  }
  return sharedConferenceOk(season, lid, to, c);
}
function liftConferenceTops(season, lid, from, to, snap){
  const lg=season.leagues[lid], bag=season.kickoffs[lid], total=lg.md.length;
  for (let guard=0; guard<lg.teams.length; guard++){
    let best=null;
    for (let mi=from; mi<=to; mi++){
      if (isClosingDay(total, mi)) continue;
      const row=bag[mi]; if (!row) continue;
      row.forEach((slot,i)=>{
        if (!slot || slot.kind!=='top') return;
        const here=matchValue(lg.teams[lg.md[mi][i][0]], lg.teams[lg.md[mi][i][1]], snap, mi).total;
        row.forEach((other,j)=>{
          if (j===i || !other || other.kind!=='konferenz') return;
          const donors=[lg.teams[lg.md[mi][j][0]], lg.teams[lg.md[mi][j][1]]];
          const v=matchValue(donors[0], donors[1], snap, mi).total;
          if (v<=here+0.05) return;
          if (!topCanTakeConference(season, lid, to, donors)) return;
          if (!swapKeepsTimes(season, lid, mi, to, i, j)) return;
          if (!best || v-here>best.gain) best={mi, i, j, gain:v-here};
        });
      });
    }
    if (!best) return;
    const row=bag[best.mi];
    const tmp=row[best.i]; row[best.i]=row[best.j]; row[best.j]=tmp;
  }
}
function swapKeepsTimes(season, lid, mi, to, i, j){
  const lg=season.leagues[lid], bag=season.kickoffs[lid], total=lg.md.length, row=bag[mi];
  if (!row || !row[i] || !row[j]) return true;
  const times=templateTimes(lid);
  const closingKey=slotTimeKey(finalSaturdaySlot(lid));
  let future=0, closingLeft=0;
  for (let d=mi+1; d<total; d++){ if (isClosingDay(total, d)) closingLeft++; else future++; }
  const have=id=>{
    const c={};
    for (let d=0; d<=to; d++){
      const r=bag[d]; if (!r) continue;
      lg.md[d].forEach((m,k)=>{
        if (!r[k]) return;
        if (lg.teams[m[0]]!==id && lg.teams[m[1]]!==id) return;
        const key=slotTimeKey(r[k]);
        c[key]=(c[key]||0)+1;
      });
    }
    return c;
  };
  const touch=[lg.teams[lg.md[mi][i][0]], lg.teams[lg.md[mi][i][1]], lg.teams[lg.md[mi][j][0]], lg.teams[lg.md[mi][j][1]]];
  const uniq=[]; touch.forEach(id=>{ if (uniq.indexOf(id)<0) uniq.push(id); });
  const before={}; uniq.forEach(id=>before[id]=have(id));
  const keyI=slotTimeKey(row[i]), keyJ=slotTimeKey(row[j]);
  const after={};
  uniq.forEach(id=>after[id]=Object.assign({}, before[id]));
  [lg.teams[lg.md[mi][i][0]], lg.teams[lg.md[mi][i][1]]].forEach(id=>{ after[id][keyI]=(after[id][keyI]||0)-1; after[id][keyJ]=(after[id][keyJ]||0)+1; });
  [lg.teams[lg.md[mi][j][0]], lg.teams[lg.md[mi][j][1]]].forEach(id=>{ after[id][keyJ]=(after[id][keyJ]||0)-1; after[id][keyI]=(after[id][keyI]||0)+1; });
  for (const id of uniq){
    for (const spec of times){
      if ((after[id][spec.key]||0)>0) continue;
      if ((before[id][spec.key]||0)<=0) continue;
      if (spec.key===closingKey && closingLeft>0) continue;
      return false;
    }
  }
  return true;
}
function balanceFrSaBlock(season, lid, from, to, snap){
  const lg=season.leagues[lid], bag=season.kickoffs[lid], total=lg.md.length;
  const tally=()=>{
    const c={}; lg.teams.forEach(id=>c[id]={fr:0, sa:0});
    for (let d=0; d<=to; d++){
      const row=bag[d]; if (!row) continue;
      lg.md[d].forEach((m,i)=>{
        const slot=row[i];
        if (!slot || slot.kind!=='top') return;
        const key=slot.dow==='Fr'?'fr':slot.dow==='Sa'?'sa':'';
        if (!key) return;
        c[lg.teams[m[0]]][key]++; c[lg.teams[m[1]]][key]++;
      });
    }
    return c;
  };
  const absSum=(map, ids)=>{ let s=0; ids.forEach(id=>{ const x=map[id]||{fr:0,sa:0}; s+=Math.abs(x.fr-x.sa); }); return s; };
  for (let guard=0; guard<lg.teams.length*2; guard++){
    const c=tally();
    let best=null;
    for (let mi=from; mi<=to; mi++){
      if (isClosingDay(total, mi)) continue;
      const row=bag[mi]; if (!row) continue;
      let fr=-1, sa=-1;
      row.forEach((slot,i)=>{
        if (!slot || slot.kind!=='top') return;
        if (slot.dow==='Fr') fr=i;
        if (slot.dow==='Sa') sa=i;
      });
      if (fr<0 || sa<0) continue;
      const vf=matchValue(lg.teams[lg.md[mi][fr][0]], lg.teams[lg.md[mi][fr][1]], snap, mi).total;
      const vs=matchValue(lg.teams[lg.md[mi][sa][0]], lg.teams[lg.md[mi][sa][1]], snap, mi).total;
      if (Math.abs(vf-vs)>2) continue;
      const ids=[lg.teams[lg.md[mi][fr][0]], lg.teams[lg.md[mi][fr][1]], lg.teams[lg.md[mi][sa][0]], lg.teams[lg.md[mi][sa][1]]];
      const uniq=[]; ids.forEach(id=>{ if (uniq.indexOf(id)<0) uniq.push(id); });
      const before=absSum(c, uniq);
      const next={};
      uniq.forEach(id=>{ next[id]={fr:c[id].fr, sa:c[id].sa}; });
      ids.slice(0,2).forEach(id=>{ next[id].fr--; next[id].sa++; });
      ids.slice(2).forEach(id=>{ next[id].sa--; next[id].fr++; });
      const after=absSum(next, uniq);
      if (after<before && swapKeepsTimes(season, lid, mi, to, fr, sa) && (!best || before-after>best.gain)) best={mi, fr, sa, gain:before-after};
    }
    if (!best) return true;
    const row=bag[best.mi];
    const tmp=row[best.fr]; row[best.fr]=row[best.sa]; row[best.sa]=tmp;
  }
  return false;
}
function repairBlockConference(season, lid, from, to, snap){
  const lg=season.leagues[lid], bag=season.kickoffs[lid], total=lg.md.length;
  const need=confHalf(total, lg), future=Math.max(0, total-(to+1));
  const confOf=()=>{
    const c={}; lg.teams.forEach(id=>c[id]=0);
    for (let d=0; d<=to; d++){
      const row=bag[d]; if (!row) continue;
      lg.md[d].forEach((m,i)=>{
        if (row[i] && row[i].kind==='konferenz'){ c[lg.teams[m[0]]]++; c[lg.teams[m[1]]]++; }
      });
    }
    return c;
  };
  const val=(mi,i)=>matchValue(lg.teams[lg.md[mi][i][0]], lg.teams[lg.md[mi][i][1]], snap, mi).total;
  for (let guard=0; guard<lg.teams.length*6; guard++){
    const c=confOf();
    const short=new Set(lg.teams.filter(id=>c[id]+future<need));
    if (!short.size) return true;
    let best=null;
    for (let mi=from; mi<=to; mi++){
      if (isClosingDay(total, mi)) continue;
      const row=bag[mi]; if (!row) continue;
      row.forEach((slot,i)=>{
        if (!slot || slot.kind==='konferenz') return;
        const ids=[lg.teams[lg.md[mi][i][0]], lg.teams[lg.md[mi][i][1]]];
        if (!ids.some(id=>short.has(id))) return;
        row.forEach((other,j)=>{
          if (j===i || !other || other.kind!=='konferenz') return;
          const donors=[lg.teams[lg.md[mi][j][0]], lg.teams[lg.md[mi][j][1]]];
          if (donors.some(id=>c[id]-1+future<need)) return;
          if (!swapKeepsTimes(season, lid, mi, to, i, j)) return;
          if (!conferenceSwapOk(season, lid, to, c, donors, ids)) return;
          const score=val(mi,j)-val(mi,i);
          if (!best || score>best.score) best={mi,i,j,score};
        });
      });
    }
    if (!best) return false;
    const row=bag[best.mi];
    const tmp=row[best.i]; row[best.i]=row[best.j]; row[best.j]=tmp;
  }
  return false;
}
function forceOpenTimes(row, md, teams, counts, mi, total, lid, season){
  if (!row || mi>=total-2) return;
  const left=total-2-mi;
  const times=templateTimes(lid);
  const zeroOf={};
  times.forEach(spec=>{
    let z=0;
    teams.forEach(id=>{ const bt=counts[id]&&counts[id].byTime; if (bt && !bt[spec.key]) z++; });
    zeroOf[spec.key]=z;
  });
  const closingKey=slotTimeKey(finalSaturdaySlot(lid));
  teams.forEach(id=>{
    const bt=counts[id]&&counts[id].byTime;
    if (!bt) return;
    const missing=times.filter(spec=>spec.key!==closingKey && !bt[spec.key]);
    missing.sort((a,b)=>(zeroOf[b.key]||0)-(zeroOf[a.key]||0));
    const confSlack=(counts[id].konferenz||0)+(total-mi)-confHalf(total, {teams});
    const reserve=missing.length>0 && confSlack>=1;
    if (!reserve && missing.length<left) return;
    const want=missing.find(spec=>!row.some((slot,i)=>slotTimeKey(slot)===spec.key && (teams[md[i][0]]===id || teams[md[i][1]]===id)));
    if (!want) return;
    let mine=-1, donor=-1;
    for (let i=0;i<row.length;i++){
      if (teams[md[i][0]]===id || teams[md[i][1]]===id) mine=i;
      if (slotTimeKey(row[i])===want.key) donor=i;
    }
    if (mine<0 || donor<0 || mine===donor) return;
    const holders=[teams[md[donor][0]], teams[md[donor][1]]];
    if (holders.some(hid=>{
      const hist=counts[hid]&&counts[hid].byTime;
      if (!(hist&&hist[want.key]>0)) return true;
      if (row[donor].kind==='konferenz' && (counts[hid].konferenz||0)+(total-mi)-confHalf(total, {teams})<1) return true;
      return false;
    })) return;
    const tmp=row[mine]; row[mine]=row[donor]; row[donor]=tmp;
    if (!rowConferenceOk(season, lid, mi, teams, counts, md, row)){ const back=row[mine]; row[mine]=row[donor]; row[donor]=back; }
  });
  times.forEach(spec=>{
    if (!(zeroOf[spec.key]>left-1)) return;
    for (let guard=0; guard<row.length; guard++){
      let needy=-1;
      for (let i=0;i<row.length;i++){
        if (!row[i] || slotTimeKey(row[i])===spec.key) continue;
        const ids=[teams[md[i][0]], teams[md[i][1]]];
        if (ids.some(id=>counts[id]&&counts[id].byTime&&!counts[id].byTime[spec.key])) { needy=i; break; }
      }
      if (needy<0) break;
      let donor=-1;
      for (let j=0;j<row.length;j++){
        if (!row[j] || slotTimeKey(row[j])!==spec.key) continue;
        const ids=[teams[md[j][0]], teams[md[j][1]]];
        if (ids.every(id=>counts[id]&&counts[id].byTime&&counts[id].byTime[spec.key]>0)) { donor=j; break; }
      }
      if (donor<0) break;
      const tmp=row[needy]; row[needy]=row[donor]; row[donor]=tmp;
      if (!rowConferenceOk(season, lid, mi, teams, counts, md, row)){ const back=row[needy]; row[needy]=row[donor]; row[donor]=back; break; }
    }
  });
}
const RESIDUAL_STATS={calls:0, nodes:0, ms:0, maxMs:0, capped:0, repairs:0};
// Exakte Rest-Machbarkeit der Konferenzquote. Schlusstermine sind für alle Konferenz.
// An jedem offenen regulären Spieltag hat jeder Verein genau eine feste Begegnung;
// ein Konferenzplatz deckt beide Vereine. Reicht die Platzzahl schon ohne dieses
// Teilen, ist der Rest machbar. Sonst sucht die Funktion die Belegungen vollständig.
// Pflichtzeiten nutzen dieselbe Paarung: ein Platz deckt nur die beiden Vereine der Begegnung.
const confOkCache=new WeakMap();
function sharedConferenceOk(season, lid, to, conf){
  const lg=season.leagues[lid];
  const teams=lg.teams;
  let sig=fixtureEpoch+'|'+to+'|';
  for (let i=0;i<teams.length;i++) sig+=(conf[teams[i]]|0)+',';
  let map=confOkCache.get(lg);
  if (!map){ map=new Map(); confOkCache.set(lg, map); }
  if (map.has(sig)) return map.get(sig);
  const ok=sharedConferenceSearch(season, lid, to, conf);
  map.set(sig, ok);
  return ok;
}
function sharedConferenceSearch(season, lid, to, conf){
  const lg=season.leagues[lid], total=lg.md.length;
  const need=confHalf(total, lg);
  const konfPer=slotTemplate(lid, leagueGames(lg)).filter(s=>s.kind==='konferenz').length;
  const regular=[]; let closing=0;
  for (let d=to+1; d<total; d++){ if (isClosingDay(total, d)) closing++; else regular.push(d); }
  const extras=lg.teams.map(id=>{ const e=need-(conf[id]||0)-closing; return e>0?e:0; });
  if (extras.some(e=>e>regular.length)) return false;
  if (!regular.length) return true;
  const days=regular.map(d=>lg.md[d].map(m=>[m[0], m[1]]));
  const left0=days.length;
  let demand0=0;
  for (let i=0;i<extras.length;i++) demand0+=extras[i];
  if (demand0>2*konfPer*left0) return false;
  if (demand0<=konfPer*left0) return true;
  const memo=new Map();
  function key(di){
    let s=di+'|';
    for (let i=0;i<extras.length;i++) if (extras[i]>0) s+=i+':'+extras[i]+',';
    return s;
  }
  function search(di){
    const left=days.length-di;
    let demand=0;
    for (let i=0;i<extras.length;i++){
      if (extras[i]>left) return false;
      if (extras[i]>0) demand+=extras[i];
    }
    if (!demand) return true;
    if (demand>2*konfPer*left) return false;
    if (demand<=konfPer*left) return true;
    const sig=key(di);
    if (memo.has(sig)) return memo.get(sig);
    const pairs=days[di];
    const forced=[], optional=[];
    for (let i=0;i<pairs.length;i++){
      const ea=extras[pairs[i][0]]||0, eb=extras[pairs[i][1]]||0;
      if (ea>=left || eb>=left) forced.push(i);
      else if (ea>0 || eb>0) optional.push(i);
    }
    if (forced.length>konfPer){ memo.set(sig,false); return false; }
    const budget=konfPer-forced.length;
    const touch=[];
    function decList(list){
      for (const i of list) for (const id of pairs[i]) if (extras[id]>0){ extras[id]--; touch.push(id); }
    }
    function undo(n){ while (touch.length>n) extras[touch.pop()]++; }
    decList(forced);
    let ok=false;
    if (optional.length<=budget){
      decList(optional);
      ok=search(di+1);
    } else {
      optional.sort((i,j)=>((extras[pairs[j][0]]||0)+(extras[pairs[j][1]]||0))-((extras[pairs[i][0]]||0)+(extras[pairs[i][1]]||0)));
      const mark=touch.length;
      decList(optional.slice(0, budget));
      if (search(di+1)) ok=true;
      else {
        undo(mark);
        ok=combine(0, budget);
      }
    }
    undo(0);
    memo.set(sig, ok);
    return ok;
    function combine(start, needPick){
      if (!needPick) return search(di+1);
      if (optional.length-start<needPick) return false;
      for (let i=start;i<=optional.length-needPick;i++){
        const mark=touch.length;
        decList([optional[i]]);
        if (combine(i+1, needPick-1)){ undo(mark); return true; }
        undo(mark);
      }
      return false;
    }
  }
  return search(0);
}
function conferenceSwapOk(season, lid, to, conf, loseIds, gainIds){
  const next=Object.assign({}, conf);
  loseIds.forEach(id=>{ next[id]=(next[id]||0)-1; });
  (gainIds||[]).forEach(id=>{ next[id]=(next[id]||0)+1; });
  return sharedConferenceOk(season, lid, to, next);
}
function rowConferenceOk(season, lid, mi, teams, counts, md, row){
  const conf={};
  teams.forEach(id=>{ conf[id]=(counts[id]&&counts[id].konferenz)||0; });
  row.forEach((slot,i)=>{
    if (!slot || slot.kind!=='konferenz' || !md[i]) return;
    conf[teams[md[i][0]]]=(conf[teams[md[i][0]]]||0)+1;
    conf[teams[md[i][1]]]=(conf[teams[md[i][1]]]||0)+1;
  });
  return sharedConferenceOk(season, lid, mi, conf);
}
function templateGroups(lid, games){
  const map={}, order=[];
  slotTemplate(lid, games).forEach(s=>{
    const key=slotTimeKey(s);
    if (!map[key]){ map[key]={key, n:0, kind:s.kind||''}; order.push(map[key]); }
    map[key].n++;
  });
  return order;
}
function popcount(x){ let n=0; x>>>=0; while (x){ n++; x&=x-1; } return n; }
function residualBase(season, lid, before){
  const lg=season.leagues[lid], total=lg.md.length, bag=season.kickoffs&&season.kickoffs[lid]||{};
  const n=lg.teams.length, need=confHalf(total, lg);
  const have=[], conf=[];
  for (let i=0;i<n;i++){ have[i]={}; conf[i]=0; }
  for (let d=0; d<before; d++){
    const row=bag[d]; if (!row) continue;
    lg.md[d].forEach((m,i)=>{
      if (!row[i]) return;
      const key=slotTimeKey(row[i]);
      have[m[0]][key]=(have[m[0]][key]||0)+1;
      have[m[1]][key]=(have[m[1]][key]||0)+1;
      if (row[i].kind==='konferenz'){ conf[m[0]]++; conf[m[1]]++; }
    });
  }
  let closing=0;
  const days=[];
  for (let d=before; d<total; d++){
    if (isClosingDay(total, d)) closing++;
    else days.push(d);
  }
  return {lg, total, n, need, have, conf, closing, days};
}
function solveResidual(season, lid, before, recordFrom, recordTo){
  const t0=Date.now();
  RESIDUAL_STATS.calls++;
  const base=residualBase(season, lid, before);
  const groups=templateGroups(lid, leagueGames(base.lg));
  const groupBy={};
  groups.forEach(g=>{ groupBy[g.key]=g; });
  const closingKey=slotTimeKey(finalSaturdaySlot(lid));
  const miss={};
  groups.forEach(g=>{
    if (g.key===closingKey && base.closing>0) return;
    let mask=0;
    for (let i=0;i<base.n;i++) if (!(base.have[i][g.key]>0)) mask|=(1<<i);
    if (mask) miss[g.key]=mask>>>0;
  });
  const extra=base.conf.map(c=>{ const e=base.need-c-base.closing; return e>0?e:0; });
  // Eine Konferenz-Uhrzeit deckt die Uhr und einen Konferenzpunkt im selben Spiel.
  function daysNeeded(i, missMap, extraArr){
    let plain=0, confTimes=0;
    for (const key in missMap){
      if (!((missMap[key]>>>0)&(1<<i))) continue;
      const g=groupBy[key];
      if (g && g.kind==='konferenz') confTimes++;
      else plain++;
    }
    return plain+Math.max(confTimes, extraArr[i]||0);
  }
  const finish=(ok, reason)=>{
    const ms=Date.now()-t0;
    RESIDUAL_STATS.ms+=ms;
    if (ms>RESIDUAL_STATS.maxMs) RESIDUAL_STATS.maxMs=ms;
    return {ok, reason:reason||'', plan:null};
  };
  for (const key in miss){
    const g=groupBy[key];
    if (popcount(miss[key])>g.n*base.days.length*2) return finish(false, 'zeit '+key);
  }
  for (let i=0;i<base.n;i++){
    if (daysNeeded(i, miss, extra)>base.days.length) return finish(false, 'zeit bund');
  }
  const confMap={};
  base.lg.teams.forEach((id,i)=>{ confMap[id]=base.conf[i]; });
  if (!sharedConferenceOk(season, lid, before-1, confMap)) return finish(false, 'kapazitaet');
  const open=Object.keys(miss).length || extra.some(e=>e>0);
  if (!open) return finish(true);
  if (!base.days.length) return finish(false, 'zeit rest');
  const pairs=base.days.map(d=>base.lg.md[d].map(m=>[m[0], m[1]]));
  const nonConf=groups.filter(g=>g.kind!=='konferenz');
  const confGroups=groups.filter(g=>g.kind==='konferenz');
  const planG=[];
  function greedyWitness(){
    const missC=Object.assign({}, miss);
    const extraC=extra.slice();
    for (let di=0; di<pairs.length; di++){
      const used=[];
      const choice=[];
      const left=pairs.length-di;
      const ordered=nonConf.slice().sort((a,b)=>popcount(missC[b.key]||0)-popcount(missC[a.key]||0));
      for (const g of ordered){
        const mask=(missC[g.key]||0)>>>0;
        const cand=[];
        for (let i=0;i<pairs[di].length;i++) cand.push(i);
        cand.sort((a,b)=>{
          const pa=pairs[di][a], pb=pairs[di][b];
          const ca=covered(mask, pa[0], pa[1]), cb=covered(mask, pb[0], pb[1]);
          if (cb!==ca) return cb-ca;
          return (extraC[pa[0]]+extraC[pa[1]])-(extraC[pb[0]]+extraC[pb[1]]);
        });
        const take=[];
        for (const i of cand){ if (used[i]) continue; if (take.length>=g.n) break; take.push(i); }
        if (take.length<g.n) return false;
        take.forEach(i=>{
          used[i]=1;
          choice[i]=g.key;
          const pair=pairs[di][i];
          if (missC[g.key]) missC[g.key]=(missC[g.key]&~((1<<pair[0])|(1<<pair[1])))>>>0;
        });
        if (missC[g.key]===0) delete missC[g.key];
      }
      let rest=[];
      for (let i=0;i<pairs[di].length;i++) if (!used[i]) rest.push(i);
      const confOrdered=confGroups.slice().sort((a,b)=>popcount(missC[b.key]||0)-popcount(missC[a.key]||0));
      for (const g of confOrdered){
        rest.sort((a,b)=>covered((missC[g.key]||0)>>>0, pairs[di][b][0], pairs[di][b][1])-covered((missC[g.key]||0)>>>0, pairs[di][a][0], pairs[di][a][1]));
        const take=rest.splice(0, g.n);
        if (take.length<g.n) return false;
        take.forEach(i=>{
          choice[i]=g.key;
          const pair=pairs[di][i];
          if (missC[g.key]) missC[g.key]=(missC[g.key]&~((1<<pair[0])|(1<<pair[1])))>>>0;
          if (missC[g.key]===0) delete missC[g.key];
          if (extraC[pair[0]]>0) extraC[pair[0]]--;
          if (extraC[pair[1]]>0) extraC[pair[1]]--;
        });
      }
      if (rest.length) return false;
      if (choice.length<pairs[di].length || choice.some(k=>!k)) return false;
      planG[di]=choice.slice();
      for (let i=0;i<extraC.length;i++){
        if (daysNeeded(i, missC, extraC)>left-1) return false;
      }
    }
    for (const key in missC) if (missC[key]) return false;
    return extraC.every(e=>e<=0);
  }
  if (greedyWitness()){
    const byDay={};
    base.days.forEach((d,i)=>{ if (d>=recordFrom && d<=recordTo) byDay[d]=planG[i]; });
    const ms=Date.now()-t0;
    RESIDUAL_STATS.ms+=ms;
    if (ms>RESIDUAL_STATS.maxMs) RESIDUAL_STATS.maxMs=ms;
    return {ok:true, reason:'', plan:byDay};
  }
  if (base.days.length>6){
    RESIDUAL_STATS.capped++;
    return finish(false, 'zeit suche');
  }
  const CAP=100000;
  let nodes=0, capped=false;
  const plan=[];
  function covered(mask, a, b){
    let n=0;
    if (mask&(1<<a)) n++;
    if (mask&(1<<b)) n++;
    return n;
  }
  function search(di, missNow, extraNow){
    if (capped) return false;
    if (++nodes>CAP){ capped=true; RESIDUAL_STATS.capped++; return false; }
    RESIDUAL_STATS.nodes++;
    const left=base.days.length-di;
    for (const key in missNow){
      const g=groupBy[key];
      if (popcount(missNow[key])>g.n*left*2) return false;
    }
    for (let i=0;i<extraNow.length;i++){
      if (daysNeeded(i, missNow, extraNow)>left) return false;
    }
    let pending=false;
    for (const key in missNow) if (missNow[key]) pending=true;
    if (!pending && extraNow.every(e=>e<=0)) return true;
    if (!left) return false;
    const choice=[];
    function place(list, idx, used, miss2, extra2){
      if (capped) return false;
      if (idx===list.length){
        const rest=[];
        for (let i=0;i<pairs[di].length;i++) if (!(used&(1<<i))) rest.push(i);
        let ci=0, leftMatches=rest.slice();
        const miss3=Object.assign({}, miss2);
        const extra3=extra2.slice();
        const confOrdered=confGroups.slice().sort((a,b)=>popcount((miss2[b.key]||0))-popcount((miss2[a.key]||0)));
        for (const g of confOrdered){
          leftMatches.sort((a,b)=>covered((miss3[g.key]||0)>>>0, pairs[di][b][0], pairs[di][b][1])-covered((miss3[g.key]||0)>>>0, pairs[di][a][0], pairs[di][a][1]));
          const take=leftMatches.splice(0, g.n);
          if (take.length<g.n) return false;
          take.forEach(i=>{
            choice[i]=g.key;
            const pair=pairs[di][i];
            if (miss3[g.key]) miss3[g.key]=(miss3[g.key]&~((1<<pair[0])|(1<<pair[1])))>>>0;
            if (extra3[pair[0]]>0) extra3[pair[0]]--;
            if (extra3[pair[1]]>0) extra3[pair[1]]--;
          });
          ci++;
        }
        if (leftMatches.length) return false;
        for (const key in miss3) if (!miss3[key]) delete miss3[key];
        plan[di]=choice.slice();
        if (search(di+1, miss3, extra3)) return true;
        return false;
      }
      const g=list[idx];
      const mask=(miss2[g.key]||0)>>>0;
      const picks=[];
      function rec(start, leftN, acc, bits){
        if (!leftN){ picks.push({acc:acc.slice(), bits}); return; }
        for (let i=start; i<pairs[di].length; i++){
          if (bits&(1<<i)) continue;
          acc.push(i);
          rec(i+1, leftN-1, acc, bits|(1<<i));
          acc.pop();
          if (!mask && picks.length) return;
        }
      }
      if (!mask){
        const acc=[];
        for (let i=0; i<pairs[di].length && acc.length<g.n; i++) if (!(used&(1<<i))){
          const pair=pairs[di][i];
          acc.push(i);
        }
        if (acc.length<g.n) return false;
        acc.sort((a,b)=>{
          const pa=pairs[di][a], pb=pairs[di][b];
          return (extra2[pa[0]]+extra2[pa[1]])-(extra2[pb[0]]+extra2[pb[1]]);
        });
        // keep the n lowest-pressure matches; rec already needs a single combo
        const chosen=acc.slice(0, g.n);
        let bits=used;
        chosen.forEach(i=>{ bits|=(1<<i); });
        const missNext=Object.assign({}, miss2);
        chosen.forEach(i=>{ choice[i]=g.key; });
        return place(list, idx+1, bits, missNext, extra2);
      }
      rec(0, g.n, [], used);
      picks.sort((p,q)=>{
        const sc=item=>item.acc.reduce((s,i)=>s+covered(mask, pairs[di][i][0], pairs[di][i][1]), 0);
        return sc(q)-sc(p);
      });
      for (const pick of picks){
        const missNext=Object.assign({}, miss2);
        let bits=used;
        pick.acc.forEach(i=>{
          bits|=(1<<i);
          choice[i]=g.key;
          const pair=pairs[di][i];
          if (missNext[g.key]) missNext[g.key]=(missNext[g.key]&~((1<<pair[0])|(1<<pair[1])))>>>0;
        });
        if (missNext[g.key]===0) delete missNext[g.key];
        if (place(list, idx+1, bits, missNext, extra2)) return true;
        if (capped) return false;
      }
      return false;
    }
    const ordered=nonConf.slice().sort((a,b)=>popcount((missNow[b.key]||0))-popcount((missNow[a.key]||0)));
    return place(ordered, 0, 0, missNow, extraNow);
  }
  const ok=search(0, miss, extra);
  const ms=Date.now()-t0;
  RESIDUAL_STATS.ms+=ms;
  if (ms>RESIDUAL_STATS.maxMs) RESIDUAL_STATS.maxMs=ms;
  if (capped){ RESIDUAL_STATS.last={reason:'cap', nodes, days:base.days.length}; return {ok:false, reason:'zeit suche', plan:null}; }
  if (!ok){ RESIDUAL_STATS.last={reason:'paar', nodes, days:base.days.length, miss:Object.keys(miss).map(k=>k+':'+popcount(miss[k]))}; return {ok:false, reason:'zeit paar', plan:null}; }
  const byDay={};
  base.days.forEach((d,i)=>{ if (d>=recordFrom && d<=recordTo) byDay[d]=plan[i]; });
  return {ok:true, reason:'', plan:byDay};
}
function applyResidualPlan(season, lid, plan){
  const lg=season.leagues[lid], bag=season.kickoffs&&season.kickoffs[lid];
  if (!bag || !plan) return false;
  for (const d in plan){
    const row=bag[d];
    const keys=plan[d];
    if (!row || !keys || keys.length!==row.length) return false;
    const pool=row.slice(), used=[];
    const next=keys.map(key=>{
      for (let j=0;j<pool.length;j++){
        if (used[j]) continue;
        if (slotTimeKey(pool[j])===key){ used[j]=1; return pool[j]; }
      }
      return null;
    });
    if (next.some(s=>!s)) return false;
    for (let i=0;i<row.length;i++) row[i]=next[i];
  }
  return true;
}
function hardResidualOk(season, lid, to){
  return solveResidual(season, lid, to+1, to+1, to);
}
function repairHardResiduals(season, lid, from, to){
  if (hardResidualOk(season, lid, to).ok) return true;
  const solved=solveResidual(season, lid, from, from, to);
  RESIDUAL_STATS.repairLast={ok:solved.ok, reason:solved.reason, days:solved.plan?Object.keys(solved.plan).length:0, last:RESIDUAL_STATS.last};
  if (!solved.ok || !solved.plan) return false;
  if (!applyResidualPlan(season, lid, solved.plan)){ RESIDUAL_STATS.repairLast.apply=false; return false; }
  RESIDUAL_STATS.repairs++;
  return hardResidualOk(season, lid, to).ok;
}
function blockObligations(season, lid, to){
  return hardResidualOk(season, lid, to);
}
function coverSlotGaps(season, lid, from, to){
  const lg=season.leagues[lid], bag=season.kickoffs[lid], total=lg.md.length;
  const times=templateTimes(lid);
  const closingKey=slotTimeKey(finalSaturdaySlot(lid));
  const need=confHalf(total, lg);
  const future=Math.max(0, total-(to+1));
  let regularAfter=0;
  for (let d=to+1; d<total; d++) if (!isClosingDay(total, d)) regularAfter++;
  const counts=()=>{
    const c={}, conf={};
    lg.teams.forEach(id=>{ c[id]={}; conf[id]=0; });
    for (let d=0; d<=to; d++){
      const row=bag[d]; if (!row) continue;
      lg.md[d].forEach((m,i)=>{
        if (!row[i]) return;
        const k=slotTimeKey(row[i]);
        [lg.teams[m[0]], lg.teams[m[1]]].forEach(id=>{
          c[id][k]=(c[id][k]||0)+1;
          if (row[i].kind==='konferenz') conf[id]++;
        });
      });
    }
    return {c, conf};
  };
  for (let guard=0; guard<lg.teams.length*6; guard++){
    const got=counts();
    let moved=false;
    for (const spec of times){
      const closingAhead=(total-(to+1))>regularAfter;
      if (spec.key===closingKey && closingAhead) continue;
      const zeros=lg.teams.filter(id=>!(got.c[id][spec.key]>0));
      if (!zeros.length) continue;
      const needSet=new Set(zeros);
      let best=null;
      for (let mi=from; mi<=to && !best; mi++){
        if (isClosingDay(total, mi)) continue;
        const row=bag[mi]; if (!row) continue;
        for (let i=0; i<row.length && !best; i++){
          if (!row[i] || slotTimeKey(row[i])===spec.key) continue;
          const ids=[lg.teams[lg.md[mi][i][0]], lg.teams[lg.md[mi][i][1]]];
          if (!ids.some(id=>needSet.has(id))) continue;
          for (let j=0; j<row.length; j++){
            if (j===i || !row[j] || slotTimeKey(row[j])!==spec.key) continue;
            const donors=[lg.teams[lg.md[mi][j][0]], lg.teams[lg.md[mi][j][1]]];
            const donorOk=donors.every(id=>(got.c[id][spec.key]||0)>=2);
            if (!donorOk) continue;
            if (row[j].kind==='konferenz' && donors.some(id=>got.conf[id]-1+future<need)) continue;
            if (row[i].kind==='konferenz' && ids.some(id=>got.conf[id]-1+future<need)) continue;
            const nextConf=Object.assign({}, got.conf);
            const shift=(clubIds, fromSlot, toSlot)=>{
              if (fromSlot&&fromSlot.kind==='konferenz') clubIds.forEach(id=>{ nextConf[id]=(nextConf[id]||0)-1; });
              if (toSlot&&toSlot.kind==='konferenz') clubIds.forEach(id=>{ nextConf[id]=(nextConf[id]||0)+1; });
            };
            shift(ids, row[i], row[j]);
            shift(donors, row[j], row[i]);
            if (!sharedConferenceOk(season, lid, to, nextConf)) continue;
            best={mi, i, j}; break;
          }
        }
      }
      if (!best) continue;
      const row=bag[best.mi];
      const tmp=row[best.i]; row[best.i]=row[best.j]; row[best.j]=tmp;
      moved=true; break;
    }
    if (!moved) break;
  }
  const got=counts();
  if (!sharedConferenceOk(season, lid, to, got.conf)) return false;
  const closingLeft=(total-(to+1))-regularAfter;
  for (const spec of times){
    if (spec.key===closingKey && closingLeft>0) continue;
    const z=lg.teams.filter(id=>!(got.c[id][spec.key]>0)).length;
    if (z>regularAfter*spec.n*2) return false;
  }
  return true;
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
  const konfPer=slotTemplate(lid, leagueGames(lg)).filter(s=>s.kind==='konferenz').length;
  let repairOk=true;
  let dropBlock=false;
  const cloneRows=()=>{
    const out={};
    for (let mi=range[0]; mi<=range[1]; mi++) out[mi]=(bag[mi]||[]).map(s=>Object.assign({}, s));
    return out;
  };
  const restoreRows=(saved)=>{
    for (let mi=range[0]; mi<=range[1]; mi++) bag[mi]=(saved[mi]||[]).map(s=>Object.assign({}, s));
  };
  if (konfPer){
    const raw=cloneRows();
    nudgeNonExactBlock(season, lid, range[0], range[1], snap);
    repairBlockConference(season, lid, range[0], range[1], snap);
    reserveTightClubs(season, lid, range[0], range[1], snap);
    const pre=cloneRows();
    coverSlotGaps(season, lid, range[0], range[1]);
    raiseTops(season, lid, range[0], range[1], snap);
    liftConferenceTops(season, lid, range[0], range[1], snap);
    balanceFrSaBlock(season, lid, range[0], range[1], snap);
    const polish=()=>{
      let held=blockObligations(season, lid, range[1]);
      if (held.ok) return held;
      if (repairHardResiduals(season, lid, range[0], range[1])) held=blockObligations(season, lid, range[1]);
      return held;
    };
    let held=polish();
    if (!held.ok){
      restoreRows(pre);
      held=polish();
      if (!held.ok){
        restoreRows(raw);
        held=polish();
        if (!held.ok) dropBlock=true;
      }
    }
    repairOk=held.ok && !dropBlock;
  }
  if (dropBlock){
    for (let mi=range[0]; mi<=range[1]; mi++) delete bag[mi];
  }
  if (!season.termRepair) season.termRepair={};
  if (!season.termRepair[lid]) season.termRepair[lid]=[];
  season.termRepair[lid].push({at:range[0], ok:repairOk!==false});
  if (repairOk===false){
    season.termNotes=season.termNotes||{};
    const note='Block '+(range[0]+1)+'–'+(range[1]+1)+': Konferenz im offenen Block nicht herstellbar';
    const prev=season.termNotes[lid]||[];
    if (prev.indexOf(note)<0) season.termNotes[lid]=prev.concat([note]);
  }
  if (!dropBlock){
  for (let mi=range[0]; mi<=range[1]; mi++){
    const row=bag[mi]; if (!row) continue;
    lg.md[mi].forEach((m,i)=>{
      if (!row[i]) return;
      const h=lg.teams[m[0]], a=lg.teams[m[1]];
      const v=matchValue(h, a, snap, mi);
      row[i]=Object.assign({}, row[i], {wert:{total:v.total, hist:v.hist, sport:v.sport, wh:v.wh, ws:v.ws, phase:v.label, note:v.note, km:kmBetween(h,a), zone:snap.zones}});
    });
  }
  if (!season.termSnap) season.termSnap={};
  if (!season.termSnap[lid]) season.termSnap[lid]={};
  season.termSnap[lid][range[0]]={at:snap.at, zones:JSON.parse(JSON.stringify(snap.zones)), ansehen:Object.assign({}, snap.ansehen), raw:Object.assign({}, snap.raw||{}), ansehenEnd:snap.ansehenEnd, form:JSON.parse(JSON.stringify(snap.form||{})), table:(snap.table||[]).map(r=>({id:r.id, pl:r.pl, pkt:r.pkt, sp:r.sp, form:(r.form||[]).slice()}))};
  }
  if (!dropBlock && range[1]>=lg.md.length-1){
    const tall=slotTally(season, lid), need=confHalf(lg.md.length, lg), short=[];
    lg.teams.forEach(id=>{ if ((tall[id].konferenz||0)<need) short.push((TEAMS[id]?TEAMS[id].name:id)+' '+tall[id].konferenz+'/'+need); });
    season.termNotes=season.termNotes||{};
    if (short.length){
      const prev=season.termNotes[lid]||[];
      season.termNotes[lid]=prev.concat(short.filter(x=>prev.indexOf(x)<0));
    }
  }
  if (tr) tr.schedMs=(tr.schedMs||0)+performance.now()-t0;
  return dropBlock ? null : range;
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
  const tmpl=slotTemplate(lid);
  const has={fr:tmpl.some(x=>x.dow==='Fr'), so:tmpl.some(x=>x.dow==='So'), konferenz:tmpl.some(x=>x.kind==='konferenz'), top:tmpl.some(x=>x.kind==='top'), regional:tmpl.some(x=>x.kind==='regional')};
  const counts=slotTally(s, lid);
  const last=lastScheduled(s,lid);
  let h='';
  const times=templateTimes(lid);
  const cols=[];
  if (has.fr) cols.push(['fr','Fr']);
  if (has.konferenz) cols.push(['konferenz','Konferenz']);
  if (has.top) cols.push(['top','Top'], ['frTop','Fr-Top'], ['saTop','Sa-Top'], ['topAvg','Ø Top']);
  if (has.so) cols.push(['so','Sonntag']);
  if (has.regional) cols.push(['regional','regional'], ['regAvg','Ø km']);
  times.forEach(spec=>cols.push(['time:'+spec.key, spec.key]));
  h+='<div class="box"><h3>Je Verein</h3><p class="muted">Sortiert nach dem aktuellen Tabellenplatz. Spiele ist die Zahl der terminierten Partien. Eine Serie ist dreimal dieselbe Platzseite hintereinander. Ein Break ist nur zweimal hintereinander; mehrere einzelne Breaks sind erlaubt.</p><div style="overflow:auto"><table class="tbl"><thead><tr>'+sortHead('Pl.','pl')+sortHead('Verein','','l')+sortHead('Spiele','spiele')+cols.map(c=>sortHead(c[1], c[0])).join('')+sortHead('Breaks','breaks')+sortHead('Regeln','','l')+'</tr></thead><tbody>';
  const placeOf={}; leagueTable(s,lid).forEach(r=>placeOf[r.id]=r.pl);
  lg.teams.slice().sort((x,y)=>(placeOf[x]||999)-(placeOf[y]||999)).forEach(id=>{
    const idx=lg.teams.indexOf(id);
    const c=counts[id];
    const full=haString(lg.md, idx, 0, total);
    const run=maxRun(full), br=breakCount(full), kinds=breakKinds(full);
    const open=last<total-1;
    const problems=[];
    if (!open && c.konferenz<confHalf(total, lg)) problems.push('Konferenz '+c.konferenz+'/'+confHalf(total, lg));
    if (run>2) problems.push('Serie '+run);
    if (!open) times.forEach(spec=>{ if (!(c.byTime&&c.byTime[spec.key]>0)) problems.push(spec.key+' fehlt'); });
    const bad=problems.length>0;
    let marks=[].concat((s.markers&&s.markers[id])||[]).filter(Boolean);
    const pokal=prevDfbWinner(s);
    if (pokal===id && marks.indexOf('P')<0) marks.push('P');
    const show=key=>{
      if (key==='topAvg') return c.topN?Math.round(c.topSum/c.topN*10)/10:0;
      if (key==='regAvg') return c.regN?Math.round(c.regSum/c.regN):0;
      if (key.indexOf('time:')===0) return (c.byTime&&c.byTime[key.slice(5)])||0;
      return c[key]||0;
    };
    h+='<tr>'+placeCell(placeOf[id])+'<td class="l">'+clubHTML(id,{nobl:true, marker:marks.length?marks:null})+'</td>'+sortCell(c.total, c.total)+cols.map(([key])=>{
      const v=show(key);
      const timeMiss=!open && key.indexOf('time:')===0 && v<1;
      const warn=timeMiss || (!open && key==='konferenz' && v<confHalf(total, lg));
      return sortCell(v, key==='topAvg'?deNum(v,1):v, warn?'bad':'');
    }).join('')+sortCell(br, br, '')+'<td class="l '+(bad?'bad':(open?'':'ok'))+'">'+(bad?esc(problems.join(', ')):(open?'offen':'erfüllt'))+'</td></tr>';
  });
  h+='</tbody></table></div><p class="muted">Jeder Verein spielt jede Anstoßzeit mindestens einmal. Mindestens die Hälfte der Spiele liegt in der Konferenz. Die letzten zwei Spieltage laufen gleichzeitig zur Samstags-Konferenzzeit und zählen als Konferenz, ohne zusätzliches Topspiel. In der 3. Liga, der 4. Liga und der 5. Liga sind alle drei Sonntagsspiele regional, auch 13:30 Uhr. Der Topspielwert ist beim Ansetzen gespeichert. Rot, wenn die Saison terminiert ist und eine Zeit, die Konferenzquote oder die Serie von drei fehlt.</p>';
  const gaps=s.termNotes&&s.termNotes[lid];
  if (gaps&&gaps.length) h+='<p class="bad">Konferenz nicht für jeden Verein erreichbar: '+esc(gaps.join(' · '))+'</p>';
  h+='</div>';
  let tops='';
  const bag=s.kickoffs&&s.kickoffs[lid]||{};
  lg.md.forEach((md,mi)=>{
    const slots=bag[mi]; if (!slots) return;
    md.forEach((m,k)=>{
      const slot=slots[k];
      if (!slot || slot.kind!=='top' || !slot.wert) return;
      const w=slot.wert;
      tops+='<tr><td>'+(mi+1)+'</td><td>'+esc(slot.dow+' '+slot.time)+'</td><td class="l">'+clubHTML(lg.teams[m[0]],{nobl:true})+' – '+clubHTML(lg.teams[m[1]],{nobl:true})+'</td><td>'+deNum(w.total,1)+'</td><td class="l">Historie '+deNum(w.hist,1)+' · Sport '+deNum(w.sport,1)+' · H '+Math.round(w.wh*100)+' / S '+Math.round(w.ws*100)+' · '+esc(w.phase||'')+' · '+esc(w.note||'')+'</td></tr>';
    });
  });
  if (tops) h+='<div class="box"><h3>Topspiele</h3><p class="muted">Die Zahlen sind die beim Ansetzen festgehaltene Rechnung, nicht eine nachträgliche Neubewertung.</p><div style="overflow:auto"><table class="tbl"><thead><tr><th>ST</th><th>Anstoß</th><th class="l">Paarung</th><th>Wert</th><th class="l">Rechnung</th></tr></thead><tbody>'+tops+'</tbody></table></div></div>';
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
  if (lg.level===5){
    const feed=L5_FEED.find(p=>p.id===lid);
    return feed ? feed.rls.reduce((a,rl)=>a.concat(RL_STATES[rl]||[]), []) : [];
  }
  return (RL_STATES[lid]||[]).slice();
}
function seasonClubIds(season, lid){
  const lg=season&&season.leagues&&season.leagues[lid];
  if (lg&&lg.teams&&lg.teams.length) return lg.teams.filter(id=>TEAMS[id]);
  const rows=lg&&lg.tables&&lg.tables.all;
  return (rows||[]).map(r=>r&&r.id).filter(id=>TEAMS[id]);
}
function cupParticipantIds(cup){
  const ids=[], seen={};
  const add=id=>{ if(id&&TEAMS[id]&&!seen[id]){ seen[id]=1; ids.push(id); } };
  if(!cup) return ids;
  (cup.entrants||[]).forEach(add);
  (cup.pro||[]).forEach(add);
  (cup.amateur||[]).forEach(add);
  (cup.rounds||[]).forEach(r=>{
    (r.byes||[]).forEach(add);
    (r.field||[]).forEach(add);
    (r.matches||[]).forEach(m=>{ if(m){ add(m.h); add(m.a); } });
  });
  return ids;
}
let mapView={lid:null,z:1,cx:320,cy:380};
function viewKarte(s, lid){
  const name=L[lid]?L[lid].name:(P[lid]?P[lid].name:String(lid||''));
  const allow=leagueStateNames(lid);
  return viewMap(name+' – Vereine', seasonClubIds(s, lid), allow, lid);
}
function viewMap(title, ids, allow, key){
  const states=window.FR_STATES;
  if(!states) return '<div class="box">Kartendaten fehlen.</div>';
  const unique=[], seen={};
  (ids||[]).forEach(id=>{ if(id&&TEAMS[id]&&!seen[id]){ seen[id]=1; unique.push(id); } });
  if(!unique.length) return '<div class="box"><h3>'+esc(title)+'</h3><p class="muted">In dieser Saison sind keine Vereine eingetragen.</p></div>';
  let features=states.features.filter(f=>!allow || allow.includes(f.properties.name));
  if (!features.length) features=states.features.slice();
  const rings=[];
  features.forEach(f=>{
    const g=f.geometry, polys=g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
    polys.forEach(poly=>poly.forEach(ring=>rings.push(ring)));
  });
  let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  const lat0=51.2, cos=Math.cos(lat0*Math.PI/180);
  const xy=(lon,lat)=>{ const x=(lon-10.4)*cos, y=-(lat-lat0); return [x,y]; };
  rings.forEach(ring=>ring.forEach(p=>{ const [x,y]=xy(p[0],p[1]); if(x<minX)minX=x; if(y<minY)minY=y; if(x>maxX)maxX=x; if(y>maxY)maxY=y; }));
  unique.forEach(id=>{
    const c=coordOf(id);
    if (!c) return;
    const [x,y]=xy(c.lon, c.lat);
    if (x<minX) minX=x; if (y<minY) minY=y; if (x>maxX) maxX=x; if (y>maxY) maxY=y;
  });
  if (!(isFinite(minX) && isFinite(maxX) && maxX>minX && maxY>minY)) return '<div class="box"><h3>'+esc(title)+'</h3><p class="muted">Die Karte hat keinen Ausschnitt.</p></div>';
  const padX=(maxX-minX)*0.06||0.05, padY=(maxY-minY)*0.06||0.05;
  minX-=padX; maxX+=padX; minY-=padY; maxY+=padY;
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
  const missing=[];
  const marks=unique.map(id=>{ const c=coordOf(id); if(!c){ missing.push(id); return null; } const [x,y]=px(c.lon,c.lat); return {id,x,y,name:TEAMS[id].name,stadion:c.stadion,crest:TEAMS[id].crest}; }).filter(Boolean);
  const crests=marks.map(m=>{
    const tip=esc(m.name);
    return '<g class="crest"><title>'+tip+'</title><image href="'+esc(m.crest)+'" data-cx="'+m.x.toFixed(2)+'" data-cy="'+m.y.toFixed(2)+'" x="'+(m.x-17).toFixed(1)+'" y="'+(m.y-17).toFixed(1)+'" width="34" height="34"/></g>';
  }).join('');
  const scope=allow?allow.join(', '):'Deutschland';
  const gap=missing.length?'<p class="muted">Ohne gespeicherten Standort: '+missing.map(id=>esc(TEAMS[id].name)).join(', ')+'.</p>':'';
  return '<div class="card map-card"><div class="card-title"><span>'+esc(title)+'</span><span class="map-tools"><button class="btn small" data-act="mapReset">Ansicht zurücksetzen</button></span></div><div class="map-wrap"><svg class="de-map" data-lid="'+esc(key||title)+'" data-w="'+W+'" data-h="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Karte '+esc(title)+'">'+paths+crests+'</svg></div>'+gap+'<p class="map-credit">'+esc(scope)+' · '+marks.length+' von '+unique.length+' Vereinen mit Standort. Mausrad zoomt, Ziehen verschiebt. In der Übersicht sind die Wappen etwas größer; beim Heranzoomen bleiben sie auf dem Bildschirm gleich groß und liegen am Spielort. Kartendaten © OpenStreetMap-Mitwirkende, europlan-online.de · Grenzen: Natural Earth</p></div>';
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
  h+='<p><b>5. Liga.</b> Plätze 1 und 2 steigen fest auf. Zwei Absteiger sind fest. Freie Plätze sind 4 minus k, also die Absteiger aus der 4. Liga in diese Staffel. Bei k = 0 steigen beide Meister und beide Vizemeister auf. Bei k = 1 steigen beide Meister auf, die Vizemeister spielen eine Relegation. Ab k = 2 steigen nur die Meister auf. Bei k = 3 oder 4 kommen ein beziehungsweise zwei Ausgleichsabsteiger dazu.</p>';
  h+='<p><b>Regionalliga.</b> Der Meister steigt fest auf. Der Vizemeister steigt bei k = 0 direkt mit auf. Bei k = 1 spielt er die Relegation, Hin- und Rückspiel, Gesamtergebnis, keine Auswärtstore, keine Verlängerung, bei Gleichstand Elfmeterschießen. Der Sieger steigt auf, der Verlierer bleibt. Zwei Absteiger sind fest. Kommen mehr Vereine aus der 5. Liga, als nach oben gehen, steigen zusätzlich so viele ab. Aus der Amateurliga kommen mindestens zwei, und weitere, bis die Staffel wieder 18 hat.</p>';
  h+='<p><b>Amateurliga.</b> Sie hat keinen Spielbetrieb. Die Nachrücker kommen aus den Bundesländern der Regionalliga. Absteiger können nicht sofort wieder aufsteigen.</p>';
  h+='</div>';
  return h;
}
function pickBlockHTML(s, e){
  let h='<div class="box"><h3>Aufsteiger aus der Amateurliga</h3><p class="muted">Wähle pro Regionalliga die Nachrücker aus ihren Bundesländern. Mindestens zwei, mehr nur als Ausgleich. Absteiger dieser Saison können nicht sofort wieder aufsteigen.</p>'+
    '<button class="btn small" data-act="suggest">Vorschlag: jeweils die historisch stärksten übernehmen</button> <button class="btn small" data-act="clearPicks">Auswahl leeren</button> <label style="margin-left:10px"><input type="checkbox" id="allPools"'+(S.ui.allPools?' checked':'')+'> alle Amateurvereine anzeigen (auch andere Regionen)</label></div><div class="grid2">';
  let ok=true;
  RL_IDS.forEach(rl=>{
    const need=e.need[rl]||0, picks=(e.picks&&e.picks[rl])||[];
    if (picks.length!==need) ok=false;
    const own=POOLS.filter(p=>p.rl===rl).flatMap(p=>e.pools[p.id]||[]);
    let cand = S.ui.allPools ? POOLS.flatMap(x=>e.pools[x.id]||[]) : own;
    cand = cand.filter(id=>!e.moves.some(m=>m.id===id&&m.type==='ab'&&L[m.from]&&L[m.from].level===6)).sort(byRang);
    const takenElse = new Set(Object.entries(e.picks||{}).filter(([k])=>k!==rl).flatMap(([,v])=>v));
    const states=(RL_STATES[rl]||[]).join(', ');
    h+='<div class="box"><div class="pick-head"><h3 style="margin:0">'+esc(L[rl].name)+'</h3><span class="'+(picks.length===need?'ok':'bad')+'">'+picks.length+' / '+need+'</span></div><div class="muted" style="margin-bottom:6px">aus: '+esc(states)+'</div><div class="pick-list" data-ol="'+esc(rl)+'">'+
      cand.filter(id=>!takenElse.has(id)).map(id=>'<label class="pick-row'+(picks.includes(id)?' sel':'')+'"><input type="checkbox" data-pick="'+rl+'" value="'+id+'"'+(picks.includes(id)?' checked':'')+'>'+clubHTML(id,{nobl:true})+'<span class="r">'+(TEAMS[id].rang?'Rang '+TEAMS[id].rang:'ohne Wertung')+'</span></label>').join('')+'</div></div>';
  });
  h+='</div><div style="display:flex;gap:8px;margin-top:6px"><button class="btn" data-act="endCancel">Abbrechen</button><button class="btn primary" data-act="finalize"'+(ok?'':' disabled')+'>Saison '+nextSeasonName(s.name)+' starten</button></div>';
  return h;
}
function renderAufAb(){
  const s=cur();
  leagueChrome(S.ui.league, 'aufab');
  const pr=seasonProgress(s);
  setActions(seasonActions(s));
  const e=transitionOf(s);
  const preview=!s.endData;
  let h='<p class="muted tab-note">'+(s.status==='done'?'Abgeschlossene Saison.':'Auf- und Absteiger dieser Saison.')+'</p>';
  if (s.status==='ending' && pr.done<pr.total) h+='<div class="notice">Achtung: '+(pr.total-pr.done)+' Spiele sind noch nicht eingetragen. Die Tabellen werden so gewertet, wie sie gerade stehen. <button class="btn small" data-act="endSimAll">Fehlende Spiele zufällig simulieren</button> <button class="btn small" data-act="endCancel">Zurück zur Saison</button></div>';
  else if (preview && pr.done<pr.total) h+='<div class="notice">Noch nicht alle Spiele sind eingetragen. Die Pyramide folgt dem aktuellen Tabellenstand und kann sich ändern.</div>';
  else if (preview && (decidePending(s)||relayPending(s)||supercupPending(s))) h+='<div class="notice">Entscheidungsspiel, Relegation oder Supercup ist noch offen. Die Aufsteiger wählst du, sobald das erledigt ist.</div>';
  else if (preview && s.status==='running' && S.view===S.seasons.length-1) h+='<div class="box"><p>Alle Spiele sind eingetragen.</p><button class="btn primary" data-act="end">Aufsteiger aus der Amateurliga wählen</button></div>';
  h+=moveBoardHTML(e, s);
  h+=moveReasonHTML(s, e);
  if (s.status==='ending') h+=pickBlockHTML(s, e);
  $('#view').innerHTML=h;
}
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
['BL','BL2','L3','L4','L5NO','L5SW','RLN','RLO','RLS','RLW'].forEach((id,i)=>{ TREE_POS[id]=i; });
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
  const ausName=l.id==='BL'?'2. BL':l.id==='BL2'?'3. Liga':l.id==='L3'?'4. Liga':l.id==='L4'?'5. Liga':l.level===5?'Regionalliga':'Amateurliga';
  const parts=[];
  if (von) parts.push(von+' von oben');
  if (hoch) parts.push(hoch+' hoch'+(l.level===6 && hoch!==l.up?' (Ausgleich, statt '+l.up+')':''));
  if (runter){
    let bit=runter+' runter';
    const fest=l.down||0;
    if (l.level===6 && runter) bit+=' (so viele, wie aus der 5. Liga kommen)';
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
  const cols=RL_IDS.map(rl=>{
    const picks=((e.picks&&e.picks[rl])||[]);
    hoch+=picks.length;
    const sec=picks.length?mvSec('auf','Auf → '+leagueShort(rl), picks.map(id=>mvRow(id,'')).join('')):'';
    return '<div class="mv-am-col">'+sec+'</div>';
  }).join('');
  let n=0; POOLS.forEach(p=>{ n+=((s.pools&&s.pools[p.id])||[]).length; });
  const rules=[hoch?hoch+' hoch':'', down.length?down.length+' von oben':''].filter(Boolean).join(' · ');
  return '<article class="mv-card am"><header class="mv-head"><b>Amateurliga</b><span>'+n+' '+(n===1?'Team':'Teams')+'</span></header>'+(rules?'<p class="mv-rules">'+esc(rules)+'</p>':'')+'<div class="mv-am-grid">'+cols+'</div></article>';
}
function pyDrops(){
  let h='<div class="py-drops">';
  for (let i=0;i<4;i++) h+='<span class="py-drop"></span>';
  return h+'</div>';
}
function pyStem(){ return '<div class="py-stem"></div>'; }
function pyFork(n, dir){
  let arms='';
  for (let i=0;i<n;i++) arms+='<span class="py-arm"></span>';
  return '<div class="py-fork '+dir+' n'+n+'">'+arms+'</div>';
}
function moveBoardHTML(e, s){
  e=e||{moves:[], picks:{}};
  s=s||cur();
  const one=id=>'<div class="py-level one">'+leagueCard(s, e, L[id], 'top')+'</div>';
  let h='<div class="py-scroll"><div class="py-tree">';
  h+=one('BL')+pyStem()+one('BL2')+pyStem()+one('L3')+pyStem()+one('L4')+pyStem();
  h+=pyFork(2, 'down');
  h+='<div class="py-level l5">'+L5_FEED.map(p=>leagueCard(s, e, L[p.id], 'rl')).join('')+'</div>';
  h+='<div class="py-fork pairs l5 down">'+L5_FEED.map(p=>'<div class="py-pair">'+p.rls.map(()=>'<span class="py-arm"></span>').join('')+'</div>').join('')+'</div>';
  h+='<div class="py-level rl">'+L5_FEED.map(p=>p.rls.map(id=>leagueCard(s, e, L[id], 'rl')).join('')).join('')+'</div>';
  h+=pyDrops();
  h+='<div class="py-level one">'+amateurCard(s, e)+'</div>';
  h+='</div></div>';
  return h;
}
function inputHelpHTML(){
  return '<div class="box spread"><h3>Tore eintragen</h3><p>＋ und − ändern die Tore. Ein offenes Spiel wird mit Heim-＋ zu 1:0, mit Gast-＋ zu 0:1 und mit − zu 0:0. Bei 0:0 setzen − oder × das Spiel auf -:- zurück. Ist der letzte angesetzte Spieltag voll, wird der nächste Block terminiert.</p><p>Im Pokal trägt ein Sieg den Sieger ein. „n.V.“ markiert eine Entscheidung nach Verlängerung. Beim Unentschieden entscheidet das Elfmeterschießen, das über dem Spielstand steht. Ein Freilos ist keine eigene Runde.</p></div>';
}
function renderRegeln(){
  const s=cur(), lid=S.ui.league;
  const lg=L[lid];
  leagueChrome(lid, 'regeln');
  setActions(seasonActions(s));
  let h='<p class="muted tab-note">Farben, Kürzel, Gleichstand, Auf- und Abstieg, Europa.</p>'+rulesHTML();
  h+=inputHelpHTML();
  if (lg) h+='<div class="box spread"><h3>Farben der '+esc(lg.name)+'</h3>'+legendHTML(lg, s)+'<p class="muted">Die Farben stehen an der Tabelle. Diese Erklärung bleibt hier.</p></div>';
  h+='<div class="box spread"><h3>Europa</h3><p>Champions League: Plätze 1 bis 4. Europa League: Plätze 5 und 6. Conference League: Platz 7. Platz 8 bekommt dieselbe grüne Zone, sobald jeder noch mögliche DFB-Sieger dieser Saison in den aktuellen Top 7 steht. Das ist eine Vorschau und keine Garantie. Erst der abgeschlossene Endstand vergibt die Qualifikation. Steht der Pokalsieger dann in den Top 7, behält er seinen Ligaplatz und Platz 8 erhält die Conference League. Steht er außerhalb, bekommt er selbst im Folgejahr Conference League und (P), egal in welcher Liga, und Platz 8 nicht. (P) steht in der Tabelle als letztes Kürzel und im DFB-Spielplan außen. Der Ligaspielplan trägt keine Statuskürzel.</p></div>';
  $('#view').innerHTML=h;
}
function cupRulesHTML(cup){
  const dfb=cup&&cup.kind!=='land';
  let h='<div class="box"><h3>Regeln '+(cup?esc(cup.name):'Pokal')+'</h3>';
  h+='<p>Ein Sieg trägt den Sieger ein. „n.V.“ markiert eine Entscheidung nach Verlängerung. Beim Unentschieden entscheidet das Elfmeterschießen über dem Spielstand. Ein Freilos ist keine eigene Runde und gibt keine Punkte.</p>';
  if (dfb) h+='<p>(P) steht außen neben dem Titelverteidiger. Der Sieger erhält im Folgejahr die Conference League, wenn er nicht schon über die Bundesliga-Plätze 1 bis 6 höher qualifiziert ist. Liegt er in den Top 7, geht der zusätzliche Conference-League-Platz an Bundesliga-Platz 8.</p><p>Das Teilnehmerfeld kommt aus der Vorsaison: Bundesliga, 2. Bundesliga, die ersten acht der 3. Liga und die Landespokalsieger. Ein Absteiger aus diesen Ligen bleibt im Pokal. Der Titelverteidiger ist zusätzlich automatisch dabei und immer im Profitopf, auch nach Auf- oder Abstieg. Ist er über Liga oder Landespokal schon qualifiziert, bleibt das Feld dasselbe; nur der Topf kann sich ändern. Sonst nimmt er den letzten Startplatz der 3. Liga. Ein Landespokalsieger wird dafür nicht gestrichen. Der Tabellenzwölfte der 2. Liga rückt dann in den Amateurtopf. Das ist nie der Titelverteidiger. In der 1. Runde spielt der Amateurtopf zu Hause.</p>';
  else h+='<p>Der Landespokal-Titel ist '+ansehenPts(ANSEHEN.land.titleShare*100)+' Prozent des Saisonbudgets. Das Budget folgt dem gespeicherten Feld und wird nicht aus den heutigen Ligen neu gerechnet.</p>';
  h+='</div>';
  return h;
}
function rulesHTML(){
  const s=cur();
  let h='<div class="box spread"><h3>Ligensystem &amp; Gleichstand</h3><p>Sieg 3 Punkte, Unentschieden 1 Punkt. Die Tabelle sortiert genau so: Punkte, Tordifferenz, geschossene Tore. Sind diese drei gleich, zählt der direkte Vergleich: Punkte, Tordifferenz, geschossene Tore, Auswärtstore in diesen Spielen. Danach die Auswärtstore insgesamt. Ist danach noch alles gleich, entscheidet ein Hin- und Rückspiel, sobald die Saison beendet ist. Die interne Kennung legt nur die Anzeigereihenfolge fest, bis dieses Spiel steht. Sie ist keine sportliche Qualifikation. Eine historische Stärke entscheidet die Tabelle nicht.</p><table class="tbl fit"><thead><tr>'+sortHead('Liga','','l')+sortHead('Teams','size')+sortHead('Auf','up')+sortHead('Ab geplant','plan')+sortHead('Ab jetzt','now')+sortHead('Aufstieg in','','l')+'</tr></thead><tbody>';
  LEAGUES.forEach(l=>{
    const p=relegationProfile(s, l.id);
    const upNow=promotionCount(s, l.id);
    const mark=p.down!==l.down;
    const upMark=upNow!==(l.up||0);
    h+='<tr><td class="l">'+esc(l.name)+'</td>'+sortCell(l.size, l.size)+sortCell(upNow, upNow||'–', upMark?'pts':'')+sortCell(l.down, l.down)+sortCell(p.down, p.down, mark?'pts':'')+'<td class="l">'+(l.upTo?esc(leagueName(l.upTo)):'–')+'</td></tr>';
  });
  h+='</tbody></table><p>Bundesliga bis 4. Liga haben feste Zahlen. Die 4. Liga hat 20 Mannschaften, drei Aufsteiger und vier Absteiger. Diese vier gehen in die 5. Liga ihres Bundeslandes. Nordost sind Bremen, Niedersachsen, Hamburg, Schleswig-Holstein, Mecklenburg-Vorpommern, Berlin, Brandenburg, Sachsen-Anhalt, Sachsen und Thüringen. Südwest sind Bayern, Baden-Württemberg, Nordrhein-Westfalen, Hessen, Rheinland-Pfalz und Saarland. Jede 5. Liga hat 22 Mannschaften. Die Plätze 1 und 2 steigen fest auf. Zwei Absteiger sind fest. Freie Plätze sind 4 minus k. Bei k = 0 steigen beide Regionalliga-Meister und beide Vizemeister auf. Bei k = 1 steigen beide Meister auf, und die Vizemeister spielen Hin- und Rückspiel. Es zählt das Gesamtergebnis, ohne Auswärtstore und ohne Verlängerung. Steht es danach gleich, entscheidet das Elfmeterschießen. Das Heimrecht im Rückspiel hat der bessere Punktequotient. Der Sieger steigt auf, der Verlierer bleibt. Bei k = 2 steigen nur die beiden Meister auf. Bei k = 3 oder 4 steigen ebenfalls nur die Meister auf, und in der 5. Liga kommen ein beziehungsweise zwei Ausgleichsabsteiger zu den zwei festen Plätzen dazu. In der Regionalliga steigt der Meister fest auf. Der Vizemeister nur über k = 0 oder die Relegation. Zwei Absteiger sind fest. Kommen mehr Vereine aus der 5. Liga, als die Staffel nach oben abgibt, steigen entsprechend mehr ab. Aus der Amateurliga rücken mindestens diese zwei festen Absteiger nach, und so viele weitere, dass die Staffel bei 18 bleibt. Niemand wird in eine fremde Region verschoben. Feste Plätze sind vollfarbig, Ausgleichsplätze gestreift. „Auf“ und „Ab jetzt“ folgen dem aktuellen Tabellenstand.</p>';
  const changed=LEAGUES.filter(l=>l.level>=6 && (relegationProfile(s, l.id).down!==l.down || promotionCount(s, l.id)!==l.up));
  if (changed.length){
    h+='<p><b>In der Saison '+esc(s.name)+' weicht die Regionalliga vom Normalfall ab:</b></p><ul>';
    changed.forEach(l=>{ const p=relegationProfile(s, l.id); h+='<li><b>'+esc(l.name)+': '+promotionCount(s, l.id)+' Aufsteiger, '+p.down+' Absteiger.</b> '+esc(p.reason)+'</li>'; });
    h+='</ul>';
  } else h+='<p>In der Saison '+esc(s.name)+' steigt nach dem aktuellen Stand aus jeder Regionalliga nur der Meister auf.</p>';
  h+='<p>Die Amateurliga hat keinen Spielbetrieb und keine Staffeln in der Navigation. Zum Saisonende wählst du pro Regionalliga mindestens zwei Aufsteiger, und weitere, wenn die Staffel mehr nach oben abgibt als von oben kommt. Regionalliga-Absteiger gehen in die Amateurliga ihres Bundeslandes. Ein Meistertitel unterhalb der Bundesliga gibt kein Ansehen. Ein Aufstiegsplatz ist im Ligawert schon 15 Prozent über dem besten Platz dahinter. Ein Abstiegsplatz liegt 10 Prozent unter dem letzten Nichtabstiegsplatz. Das ist der Tabellenwert, kein zusätzlicher Aufstiegsbonus. In der 5. Liga und der Regionalliga kann die Abstiegszahl über die zwei festen Plätze hinausgehen. Ein Abstiegsplatz ist kein Aufstieg.</p></div>';
  return h;
}
function ansehenParts(info){
  const keys=['liga','dfb','land','titel','aufstieg','euro'];
  const raw={liga:0,dfb:0,land:0,titel:0,aufstieg:0,euro:0};
  (info&&info.lines||[]).forEach(l=>{ if (raw[l.kind]!=null) raw[l.kind]+=l.today||0; });
  const parts={};
  keys.forEach(k=>{ parts[k]=ansehenRound2(raw[k]); });
  let sum=ansehenRound2(keys.reduce((s,k)=>s+parts[k],0));
  const target=ansehenRound2(info&&info.value||0);
  const drift=ansehenRound2(target-sum);
  if (drift){
    let k=keys[0];
    keys.forEach(key=>{ if (Math.abs(parts[key])>=Math.abs(parts[k])) k=key; });
    parts[k]=ansehenRound2(parts[k]+drift);
    sum=ansehenRound2(keys.reduce((s,key)=>s+parts[key],0));
  }
  parts.sum=sum;
  return parts;
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
  const end=ansehenEndYear();
  const nowRank=ansehenRanks(end);
  const prevRank=ansehenRanks(end-1);
  const list=Object.keys(TEAMS).map(id=>{
    const info=ansehenInfo(id, end);
    return {id, info, parts:ansehenParts(info), lid:clubLeagueId(season, id), bl:TEAMS[id].bl};
  }).filter(r=>(!liga || r.lid===liga) && (!bl || r.bl===bl));
  list.sort((a,b)=>(b.info.value==null?-1:b.info.value)-(a.info.value==null?-1:a.info.value) || TEAMS[a.id].name.localeCompare(TEAMS[b.id].name,'de'));
  const opts='<option value="">Alle Ligen</option>'+LEAGUES.map(l=>'<option value="'+l.id+'"'+(liga===l.id?' selected':'')+'>'+esc(l.name)+'</option>').join('')+POOLS.map(p=>'<option value="'+p.id+'"'+(liga===p.id?' selected':'')+'>'+esc(p.name)+'</option>').join('');
  const blOpts='<option value="">Alle Bundesländer</option>'+BL_ORDER.map(b=>'<option value="'+esc(b)+'"'+(bl===b?' selected':'')+'>'+esc(b)+'</option>').join('');
  let h='<div class="box"><h3>Ansehen aller Vereine</h3><p>Ansehen bis '+end+' ist die Summe aus Liga, DFB-Pokal, Landespokal, Titeln und Europa. Der Amateur-Aufstieg steckt mit 4 Punkten in der Liga. Ein Aufstiegsplatz einer gespielten Liga steckt ebenfalls im Ligawert, die Spalte Aufstieg bleibt deshalb leer. Der Supercup steckt in der Titelspalte. Nach einer Sortierung oder Suche steht vorn die sichtbare Position, klein daneben der ursprüngliche Gesamtrang. In der Grundordnung ohne Filter ist das dieselbe Zahl. Ein Klick öffnet die Vereinsinfo.</p><div class="ansehen-tools"><input id="ansehenSearch" class="searchbox" placeholder="Verein suchen" autocomplete="off"><select id="ansehenLiga">'+opts+'</select><select id="ansehenBl">'+blOpts+'</select><span class="muted">'+list.length+' Vereine</span></div>';
  h+='<div style="overflow:auto"><table class="tbl" id="ansehenList"><thead><tr>'+sortHead('Rang','rang')+'<th></th>'+sortHead('Verein','','l')+sortHead('Liga','liga')+sortHead('DFB-Pokal','dfb')+sortHead('Landespokal','land')+sortHead('Titel','titel')+sortHead('Aufstieg','aufstieg')+sortHead('Europa','euro')+sortHead('Gesamt','value')+sortHead('Aktuelle Liga','','l')+'</tr></thead><tbody>';
  list.forEach(r=>{
    const name=TEAMS[r.id].name;
    const p=r.parts;
    h+='<tr data-ansehen="'+r.id+'" data-name="'+esc(name.toLowerCase())+'" style="cursor:pointer">'+placeCell(nowRank[r.id])+'<td>'+rankDeltaHTML(nowRank[r.id], prevRank[r.id])+'</td><td class="l">'+clubHTML(r.id)+'</td>'+sortCell(p.liga, deNum(p.liga,2))+sortCell(p.dfb, deNum(p.dfb,2))+sortCell(p.land, deNum(p.land,2))+sortCell(p.titel, deNum(p.titel,2))+sortCell(p.aufstieg, deNum(p.aufstieg,2))+sortCell(p.euro, deNum(p.euro,2))+sortCell(p.sum, deNum(p.sum,2), 'pts')+'<td class="l">'+esc(leagueLabel(r.lid))+'</td></tr>';
  });
  h+='</tbody></table></div></div>';
  return h;
}
function leagueLabel(lid){
  if (L[lid]) return L[lid].name+' ('+L[lid].level+')';
  if (P[lid]) return P[lid].name+' (7)';
  return lid ? leagueName(lid) : '–';
}
function ansehenPts(x){
  const n=ansehenRound2(x);
  const d=Math.abs(n-Math.round(n))<1e-9?0:(Math.abs(n*10-Math.round(n*10))<1e-9?1:2);
  return deNum(n, d);
}
function ansehenLegendHTML(){
  const cell=(a,b)=>'<tr><td class="l">'+a+'</td><td>'+esc(String(b))+'</td></tr>';
  const names=LEVEL_NAME;
  let liga='';
  [1,2,3,4,5,6].forEach(level=>{
    const sample=leagueSample(level);
    const n=sample?sample.size:18;
    liga+=cell(names[level]+' Platz 1 / Letzter', ansehenPts(placePoints(level,n,1))+' / '+ansehenPts(placePoints(level,n,n)));
    liga+=cell(names[level]+' Meistertitel', ansehenPts(ANSEHEN.levels[level].title));
  });
  liga+=cell('Amateur-Aufsteiger', ansehenPts(ANSEHEN.amateurUp));
  let dfb='';
  ['1. Runde','2. Runde','Achtelfinale','Viertelfinale','Halbfinale','Finale'].forEach(r=>{ dfb+=cell(r, ansehenPts(ANSEHEN.dfb[r])); });
  dfb+=cell('Sieger-Titel, zusätzlich', ansehenPts(ANSEHEN.dfb.title));
  dfb+=cell('Sieger insgesamt', ansehenPts(ANSEHEN.dfb.Finale+ANSEHEN.dfb.title));
  return '<div class="ansehen-legend"><div class="ansehen-card"><h3>Liga und Meistertitel</h3><p>Die Bundesliga hat 20 Mannschaften. Platz 17 ist dort der letzte Nichtabstiegsplatz, die Plätze 18 bis 20 liegen 10 Prozent darunter. Aufstiegsplätze der anderen Ligen liegen 15 Prozent über dem besten Platz dahinter. Der Meistertitel steht nur bei Platz 1 der Bundesliga extra dazu.</p><table class="tbl"><thead><tr><th class="l">Stufe</th><th>Punkte</th></tr></thead><tbody>'+liga+'</tbody></table></div><div class="ansehen-card"><h3>DFB-Pokal</h3><p>Gezählt wird nur die erreichte Runde. Der Titel ist ein eigener Posten. FDGB-Siege haben denselben Titelwert, ohne erfundene Runden.</p><table class="tbl"><thead><tr><th class="l">Runde</th><th>Punkte</th></tr></thead><tbody>'+dfb+'</tbody></table></div></div>'+ageScaleHTML();
}
function ageScaleHTML(){
  const ages=[0,1,4,5,10,11,20,21,49,50,59,60,99,100,150];
  let rows='';
  ages.forEach(age=>{
    const band=ageBand(age);
    rows+='<tr class="band-'+band.id+'"><td class="l">'+esc(band.label)+'</td><td>'+age+'</td><td>'+deNum(seasonFactor(age, true),2)+'</td><td>'+deNum(seasonFactor(age, false),2)+'</td><td>'+deNum(titleFactor(age, true),2)+'</td><td>'+deNum(titleFactor(age, false),2)+'</td></tr>';
  });
  return '<div class="ansehen-card"><h3>Alter</h3><p>Alter 0 ist die Saison des Stichtags. Die letzten fünf Saisons sind Alter 0 bis 4. Ab Alter 50 bleibt eine Rechner-Saison bei '+deNum(ANSEHEN.rechnerFloorW*100,0)+' %. Eine importierte Platzierung ist dann 0. Deutsche Meisterschaft, Bundesliga, DDR-Meisterschaft, DFB-Pokal, FDGB-Pokal, Landespokal und Supercup verlieren jedes Jahr 1 % des Ursprungswerts und bleiben ab Alter 60 bei 40 %. Ligapunkte, auch die 4 Punkte eines Amateur-Aufsteigers, altern wie die Rechner-Saison.</p><table class="tbl age-scale"><thead><tr><th class="l">Abschnitt</th><th>Alter</th><th>Rechner</th><th>Import</th><th>Großer Titel</th><th>ohne Boden</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function landMixText(scale){
  if (!scale || scale.missing) return '–';
  const parts=[];
  Object.keys(scale.byLevel||{}).map(k=>+k).sort((a,b)=>a-b).forEach(lv=>{
    parts.push((LAND_LEVEL[lv]||('Stufe '+lv))+' '+scale.byLevel[lv]);
  });
  if (scale.unknown) parts.push('ohne Liga '+scale.unknown);
  return parts.join(' · ')||'–';
}
function landCompareHTML(){
  const s=cur();
  const seasonName=s&&s.name||'';
  const head=BL_ORDER.map(bl=>'<th>'+esc(bl)+'</th>').join('');
  const cells=fn=>BL_ORDER.map(bl=>{
    const cup=s&&s.cups&&s.cups.land&&s.cups.land[bl];
    let scale={missing:true};
    if (cup){ try{ scale=landScaleOf(seasonName, bl)||scale; }catch(e){ scale={missing:true}; } }
    return '<td>'+fn(cup, scale)+'</td>';
  }).join('');
  const row=(label, fn)=>'<tr><th class="l">'+label+'</th>'+cells(fn)+'</tr>';
  const weights=[3,4,5,6,7].map(lv=>(LAND_LEVEL[lv]||lv)+' '+ansehenPts(ANSEHEN.land.levelW[lv])).join(' · ');
  let h='<div class="ansehen-card"><h3>Landespokale '+esc(seasonName)+'</h3>';
  h+='<p>Alle 16 Pokale der geöffneten Saison stehen nebeneinander. Gezählt wird das Feld dieser Saison. Eine eingefrorene Mischung behält ihre Ligazahlen und wird mit den aktuellen Gewichten neu gerechnet, ohne die heutigen Ligen zu raten. Gewichte: '+weights+'. Der Titel ist '+ansehenPts(ANSEHEN.land.titleShare*100)+' Prozent des Budgets. Finalrunde plus Titel sind zusammen mindestens 10 und höchstens '+ansehenPts(ANSEHEN.land.winnerCap)+'. Die Wertung jedes einzelnen Pokals bleibt im Wettbewerb.</p>';
  h+='<div class="hscroll land-matrix"><table class="tbl"><thead><tr><th class="l">Vergleich</th>'+head+'</tr></thead><tbody>';
  h+=row('Anzahl', (cup,scale)=>scale.missing?'–':String(scale.n||0));
  h+=row('Ligaverteilung', (cup,scale)=>esc(landMixText(scale)));
  h+=row('Feldgewicht', (cup,scale)=>scale.missing?'–':ansehenPts(scale.field));
  h+=row('Budget', (cup,scale)=>scale.missing?'–':ansehenPts(scale.budget));
  h+=row('Runden', (cup,scale)=>scale.missing?'–':esc((scale.rounds||[]).join(', ')||'–'));
  h+=row('Titel', (cup,scale)=>scale.missing?'–':ansehenPts(landTitleOf(scale)));
  h+=row('Sieger gesamt', (cup,scale)=>scale.missing||!(scale.rounds||[]).length?'–':ansehenPts(landWinnerSum(scale)));
  h+='</tbody></table></div></div>';
  return h;
}
function ansehenGuideHTML(){
  const names=Object.assign({dfb:'DFB-Pokal', land:'Landespokal', alter:'Alter'}, LEVEL_NAME);
  const guide=S.ui.ansehenGuide||'1';
  const tabs=[['1','Bundesliga'],['2','2. Bundesliga'],['3','3. Liga'],['4','4. Liga'],['5','5. Liga'],['6','Regionalliga'],['7','Amateurliga'],['dfb','DFB-Pokal'],['land','Landespokal'],['alter','Alter']];
  const bar='<div class="toggle">'+tabs.map(([k,n])=>'<button type="button" data-act="ansehenGuide" data-v="'+k+'" class="'+(guide===k?'active':'')+'">'+n+'</button>').join('')+'</div>';
  let body='';
  if (guide==='dfb'){
    let dfb='';
    ['1. Runde','2. Runde','Achtelfinale','Viertelfinale','Halbfinale','Finale'].forEach(r=>{ dfb+='<tr><td class="l">'+r+'</td><td>'+ansehenPts(ANSEHEN.dfb[r])+'</td></tr>'; });
    dfb+='<tr><td class="l">Titel extra</td><td>'+ansehenPts(ANSEHEN.dfb.title)+'</td></tr>';
    dfb+='<tr><td class="l">Sieger insgesamt</td><td>'+ansehenPts(ANSEHEN.dfb.Finale+ANSEHEN.dfb.title)+'</td></tr>';
    body='<div class="ansehen-card"><h3>DFB-Pokal</h3><p>Gezählt wird nur die erreichte Runde, nicht die Summe der Runden davor. Der Sieger hat die Finalrunde plus '+ansehenPts(ANSEHEN.dfb.title)+' Titel, zusammen '+ansehenPts(ANSEHEN.dfb.Finale+ANSEHEN.dfb.title)+'. Der FDGB-Pokal hat denselben Titelwert und keine erfundenen Runden. Europa steht extra und nur einmal: CL '+ansehenPts(ANSEHEN.euro.CL)+', EL '+ansehenPts(ANSEHEN.euro.EL)+', UECL '+ansehenPts(ANSEHEN.euro.UECL)+'. Der Pokalsieger erhält UECL, wenn das höher ist als sein Ligaplatz, auch ohne Ligazeile. Supercup: '+ansehenPts(ANSEHEN.supercup.title)+'.</p><table class="tbl"><thead><tr><th class="l">Runde</th><th>Punkte</th></tr></thead><tbody>'+dfb+'</tbody></table></div>';
  } else if (guide==='land'){
    body=landCompareHTML();
  } else if (guide==='alter'){
    body=ageScaleHTML();
  } else if (guide==='7'){
    body='<div class="ansehen-card"><h3>Amateurliga</h3><p>Die Amateurliga wird nicht gespielt. Es gibt keine Platzrangliste und keine Punkte für Vereine, die bleiben. Wer tatsächlich aufsteigt, bekommt einmal '+ansehenPts(ANSEHEN.amateurUp)+' Ligapunkte, in jeder Staffel gleich, ohne weiteren Bonus und ohne Meistertitel.</p><table class="tbl"><thead><tr><th class="l">Wertung</th><th>Liga</th><th>Gesamt</th></tr></thead><tbody><tr><td class="l">Aufsteiger</td><td>'+ansehenPts(ANSEHEN.amateurUp)+'</td><td>'+ansehenPts(ANSEHEN.amateurUp)+'</td></tr></tbody></table></div>';
  } else {
    const level=+guide||1;
    const sample=leagueSample(level);
    const n=sample?sample.size:18;
    const z=zoneCounts(level, n);
    let rows='';
    for (let pl=1; pl<=n; pl++){
      const liga=placePoints(level, n, pl);
      const euro=euroOf(level, pl, false);
      const euro8=level===1&&pl===8?euroOf(1, 8, true):null;
      const title=pl===1&&level===1?ANSEHEN.levels[1].title:0;
      const euroPts=euro?euro.pts:0;
      const gesamt=ansehenRound2(liga+euroPts+title);
      let zone='Mittelfeld';
      if (z.up && pl===z.up) zone='Aufstiegsplatz +15 %';
      else if (pl<=z.up) zone='Aufstiegsplatz';
      else if (z.down && pl===z.safeLast+1) zone='Abstieg −10 %';
      else if (z.down && pl>z.safeLast) zone='Abstieg';
      else if (level===1 && pl<=7) zone='Europa';
      const euroCell=euro?euro.key+' '+ansehenPts(euro.pts):(euro8?'UECL '+ansehenPts(euro8.pts)+', nur wenn der Pokalsieger in den Top 7 steht':'–');
      rows+='<tr><td>'+pl+'</td><td class="l">'+zone+'</td><td>'+ansehenPts(liga)+'</td><td>'+euroCell+'</td><td>'+(title?ansehenPts(title):'–')+'</td><td>'+ansehenPts(gesamt)+'</td></tr>';
    }
    const note=level===1
      ? 'Die Bundesliga hat 20 Mannschaften. Platz 17 ist der letzte Nichtabstiegsplatz, die Plätze 18 bis 20 haben 10 Prozent weniger. Die Europaplätze 1 bis 7 liegen weiter auseinander als die Plätze 8 bis 17. Der Meistertitel steht nur bei Platz 1. Europa ist eine eigene Zeile und kommt nicht noch einmal in den Ligapunkt.'
      : 'Ein Aufstiegsplatz hat 15 Prozent mehr als der beste Platz dahinter, auch wenn der Verein am Ende nicht aufsteigt. Ein Abstiegsplatz hat 10 Prozent weniger als der letzte Nichtabstiegsplatz. Das ist der Rangzonenwert, kein zusätzlicher Aufstiegsbonus. Vier Punkte gibt es nur für den tatsächlich vollzogenen Aufstieg aus der Amateurliga. '+(level>=6?'Die Abstiegszahl der Regionalliga folgt den Ankömmlingen aus der 5. Liga. Hier steht die geplante Aufsteigerzahl.':'Die Auf- und Abstiegszahlen sind fest.');
    body='<div class="ansehen-card"><h3>'+names[level]+'</h3><p>'+n+' Plätze. '+note+'</p><table class="tbl"><thead><tr><th>Platz</th><th class="l">Zone</th><th>Liga</th><th>Europa</th><th>Titel</th><th>Gesamt</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  }
  return '<div class="box ansehen-guide"><h3>So wird Ansehen gezählt</h3>'+bar+body+'</div>';
}
function ansehenDonut(parts){
  const sum=parts.reduce((s,p)=>s+(p.value||0),0);
  const r=54, c=72, circ=2*Math.PI*r;
  let off=0;
  const arcs=!sum?`<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#e4e8eb" stroke-width="16"/>`:parts.map(p=>{
    const len=(p.value/sum)*circ;
    const el=`<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${p.color}" stroke-width="16" stroke-dasharray="${len.toFixed(2)} ${(circ-len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${c} ${c})"><title>${esc(p.label)} ${esc(deNum(p.value,2))}</title></circle>`;
    off+=len;
    return el;
  }).join('');
  const legs=parts.map(p=>'<div class="an-leg"><i style="background:'+p.color+'"></i><span>'+esc(p.label)+'</span><b>'+deNum(p.value,2)+'</b></div>').join('');
  return '<div class="an-donut-wrap"><svg class="an-donut" viewBox="0 0 144 144" role="img" aria-label="Aufteilung des Ansehens">'+arcs+'<text x="72" y="68" text-anchor="middle" class="an-donut-k">Ansehen</text><text x="72" y="88" text-anchor="middle" class="an-donut-v">'+esc(deNum(sum,0))+'</text></svg><div class="an-legs">'+legs+'</div></div>';
}
function seasonShort(name){
  const m=String(name||'').match(/^(\d{4})\/(\d{2})$/);
  return m ? m[1].slice(2)+'/'+m[2] : String(name||'');
}
function seasonFull(name){
  const s=String(name||'');
  const pair=s.match(/^(\d{4})\/(\d{2})$/);
  if (!pair) return s;
  const start=+pair[1];
  let end=Math.floor(start/100)*100+(+pair[2]);
  if (end<=start) end+=100;
  return start+'/'+end;
}
function histTitleSeason(line){
  return !!(line && line.kind==='titel' && (line.histKey || line.src==='historie'));
}
function titleYearLabel(r){
  const label=rowSeason(r);
  return r && r.map==='simulation' ? label : seasonFull(label);
}
function ansehenSeasonRows(info){
  const keys=['liga','dfb','land','titel','aufstieg','euro'];
  const by={};
  (info.lines||[]).forEach(l=>{
    const row=by[l.season]||(by[l.season]={season:l.season, liga:0, dfb:0, land:0, titel:0, aufstieg:0, euro:0, lines:[]});
    if (keys.indexOf(l.kind)>=0) row[l.kind]=ansehenRound2(row[l.kind]+(l.today||0));
    row.lines.push(l);
  });
  return Object.keys(by).map(k=>{
    const r=by[k];
    r.sum=ansehenRound2(keys.reduce((s,key)=>s+r[key],0));
    return r;
  }).sort((a,b)=>a.season<b.season?1:-1);
}
function ansehenCourseSVG(id){
  const end=ansehenEndYear();
  const seen=new Set(), years=[];
  (S.seasons||[]).forEach(s=>{
    const y=seasonYear(s&&s.name);
    if (!s||!y||y>end||seen.has(y)) return;
    seen.add(y);
    years.push({y, name:s.name, v:ansehenInfo(id, y).value});
  });
  years.sort((a,b)=>a.y-b.y);
  if (years.length<2) return '<p class="muted">Der Gesamtverlauf braucht mindestens zwei Saisons im Rechner.</p>';
  const step=72, h=188, padL=48, padR=16, padT=16, padB=36;
  const w=padL+padR+step*(years.length-1);
  const max=Math.max.apply(null, years.map(p=>p.v))||1;
  const X=i=>padL+step*i;
  const Y=v=>padT+(h-padT-padB)*(1-v/max);
  const line=years.map((p,i)=>X(i).toFixed(1)+','+Y(p.v).toFixed(1)).join(' ');
  const area=line+' '+X(years.length-1).toFixed(1)+','+(h-padB)+' '+X(0).toFixed(1)+','+(h-padB);
  const dots=years.map((p,i)=>'<g><circle cx="'+X(i).toFixed(1)+'" cy="'+Y(p.v).toFixed(1)+'" r="3.5"/><title>'+esc(p.name+' · Gesamtansehen '+deNum(p.v,2))+'</title></g>').join('');
  const labels=years.map((p,i)=>'<text x="'+X(i).toFixed(1)+'" y="'+(h-12)+'" text-anchor="middle">'+esc(seasonShort(p.name))+'</text>').join('');
  return '<div class="hscroll"><svg class="an-course-svg" style="width:'+w+'px;height:'+h+'px" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Verlauf des Gesamtansehens"><polygon points="'+area+'" class="area"/><polyline points="'+line+'"/>'+dots+'<text x="4" y="14">'+esc(deNum(max,0))+'</text>'+labels+'</svg></div><p class="muted">Jeder Punkt ist das gesamte Ansehen am Ende dieser Saison, ohne spätere Jahre. Die Jahreszahlen stehen unten.</p>';
}
function viewAnsehenDetail(id, embedded){
  const info=ansehenInfo(id), t=TEAMS[id];
  const rows=ansehenSeasonRows(info);
  const rowSum=ansehenRound2(rows.reduce((s,r)=>s+r.sum,0));
  const sumKind=k=>ansehenRound2((info.lines||[]).filter(l=>l.kind===k).reduce((s,l)=>s+(l.today||0),0));
  const parts=[
    {key:'liga', label:'Liga', value:sumKind('liga'), color:'#1d6b45'},
    {key:'titel', label:'Titel', value:sumKind('titel'), color:'#c4a15a'},
    {key:'dfb', label:'DFB-Pokal', value:sumKind('dfb'), color:'#2f6f9f'},
    {key:'land', label:'Landespokal', value:sumKind('land'), color:'#6d8f78'},
    {key:'euro', label:'Europa', value:sumKind('euro'), color:'#8a5a9a'}
  ];
  let h=embedded?'<div class="ansehen-embed">':'<div class="box ansehen-embed"><button class="btn small" data-act="ansehenBack">← Zurück zur Rangliste</button>';
  if (!embedded) h+='<div class="an-hero-name"><img src="'+esc(t.crest)+'" alt=""><div><h3>'+esc(t.name)+'</h3><div class="muted">'+esc(t.bl)+'</div></div></div>';
  h+='<div class="an-hero"><div><div class="an-kicker">Ansehen bis '+info.end+'</div><div class="an-total">'+deNum(info.value,2)+'</div>';
  h+='<p class="an-aging">Eine Zeile ist eine Saison. Liga, DFB-Pokal und Landespokal sind die Runden- und Platzpunkte. Titel stehen extra und nicht noch einmal in der Pokalspalte. Der Supercup ist ein kleiner Titel von '+deNum(ANSEHEN.supercup.title,2)+'.</p></div>'+ansehenDonut(parts)+'</div>';
  h+='<table class="tbl an-season"><thead><tr><th class="l">Saison</th><th>Liga</th><th>DFB</th><th>Land</th><th>Titel</th><th>Aufstieg</th><th>Europa</th><th>Summe</th></tr></thead><tbody>';
  if (!rows.length) h+='<tr><td class="l" colspan="8"><span class="muted">Keine gespeicherten Erfolge bis zu dieser Saison.</span></td></tr>';
  rows.forEach(r=>{
    const hist=(info.lines||[]).some(l=>l.season===r.season && histTitleSeason(l));
    h+='<tr><td class="l">'+esc(hist?seasonFull(r.season):seasonShort(r.season))+'</td><td>'+deNum(r.liga,2)+'</td><td>'+deNum(r.dfb,2)+'</td><td>'+deNum(r.land,2)+'</td><td>'+deNum(r.titel,2)+'</td><td>'+deNum(r.aufstieg||0,2)+'</td><td>'+deNum(r.euro,2)+'</td><td><b>'+deNum(r.sum,2)+'</b></td></tr>';
  });
  h+='<tr data-pin="1"><td class="l"><b>Summe</b></td><td colspan="6"></td><td><b>'+deNum(rowSum,2)+'</b></td></tr>';
  h+='</tbody></table>';
  h+='<h3>Verlauf</h3>'+ansehenCourseSVG(id);
  h+='<details class="an-fold"><summary>Einzelposten</summary><p class="muted">Grün die letzten fünf Saisons, dann die Abschnitte bis Alter 50. Ab Alter 50 bleibt der Rechner bei 12 %, importierte Platzierungen fallen weg.</p><table class="tbl fit age-lines"><thead><tr><th class="l">Saison</th><th class="l">Quelle</th><th class="l">Erfolg</th><th>Ursprung</th><th>Alter</th><th>Faktor</th><th>Beitrag</th></tr></thead><tbody>';
  (info.lines||[]).forEach(l=>{
    const band=ageBand(l.age);
    const when=histTitleSeason(l)?seasonFull(l.season):seasonShort(l.season);
    h+='<tr class="band-'+band.id+'" title="'+esc(band.detail)+'"><td class="l">'+esc(when)+'</td><td class="l">'+(l.src==='rechner'?'Rechner':'Import')+'</td><td class="l">'+esc(l.label)+'</td><td>'+deNum(l.original,2)+'</td><td>'+l.age+'</td><td>'+deNum(l.factor,2)+'</td><td>'+deNum(l.today,2)+'</td></tr>';
  });
  h+='</tbody></table></details>';
  h+='<details class="an-fold"><summary>Punkteskala und Alter</summary>'+ansehenLegendHTML()+'</details></div>';
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
    sortUnplayedTable(rows).forEach(r=>list.push({id:r.id, liga:l.name, level:l.level, pl:r.pl}));
  });
  const am=[];
  POOLS.forEach(p=>((season.pools&&season.pools[p.id])||[]).forEach(id=>am.push(id)));
  am.sort(byAnsehen);
  am.forEach((id,i)=>list.push({id, liga:'Amateurliga', level:7, pl:i+1}));
  const map={};
  list.forEach((r,i)=>map[r.id]=Object.assign({rank:i+1, n:list.length}, r));
  return map;
}
function roundRank(name){
  const dfb=DFB_ROUNDS.findIndex(r=>r.name===name);
  if (dfb>=0) return dfb;
  const order=['Vorrunde','Runde der 128','Runde der 64','Runde der 32','1. Runde','2. Runde','Achtelfinale','Viertelfinale','Halbfinale','Finale'];
  const i=order.indexOf(name||'');
  return i>=0?i:40;
}
function roundNameAt(comp, idx){
  if (comp==='dfb' && DFB_ROUNDS[idx]) return DFB_ROUNDS[idx].name;
  return 'Runde '+((idx|0)+1);
}
function cupHistoryRows(id, comp){
  const out=[];
  const covered=new Set();
  const add=row=>{ if (row && row.season) out.push(row); };
  try{
    (S.seasons||[]).forEach(season=>{
      if (!season || !season.name) return;
      const found=[];
      const cups=[];
      if (season.cups){
        if (comp==='dfb' && season.cups.dfb) cups.push(season.cups.dfb);
        if (comp==='land' && season.cups.land){
          const bl=TEAMS[id] && TEAMS[id].bl;
          if (bl && season.cups.land[bl]) cups.push(season.cups.land[bl]);
        }
      }
      cups.forEach(cup=>{
        (cup.rounds||[]).forEach((round,ri)=>{
          (round.matches||[]).forEach(m=>{
            if (!m || (m.h!==id && m.a!==id)) return;
            const home=m.h===id;
            found.push({season:season.name, round:round.name||roundNameAt(comp, ri), ri, opp:home?m.a:m.h, home, hg:m.hg, ag:m.ag, et:!!m.et, peh:m.peh, pea:m.pea});
          });
        });
      });
      if (!found.length && typeof season.fx==='string' && season.fx){
        const kind=comp==='dfb'?'D':'A';
        String(season.fx).split(';').forEach(rec=>{
          if (!rec || rec.charAt(0)==='B') return;
          let o; try{ o=decShared(rec); }catch(e){ return; }
          if (!o || o.kind!==kind || (o.homeId!==id && o.awayId!==id)) return;
          const home=o.homeId===id;
          found.push({season:season.name, round:roundNameAt(comp, o.md|0), ri:o.md|0, opp:home?o.awayId:o.homeId, home, hg:o.hg, ag:o.ag, et:!!o.et, peh:o.peh, pea:o.pea});
        });
      }
      if (found.length){ found.forEach(add); covered.add(season.name); }
    });
    vereinPokalRuns(id).forEach(r=>{
      if (!r || r.comp!==comp || covered.has(r.season)) return;
      if (comp==='land' && r.bl && TEAMS[id] && TEAMS[id].bl && r.bl!==TEAMS[id].bl) return;
      add({season:r.season, round:r.round||'', ri:roundRank(r.round), opp:r.opp, home:!!r.home, hg:r.hg, ag:r.ag, et:!!r.et, peh:r.peh, pea:r.pea});
      covered.add(r.season);
    });
  }catch(e){}
  out.sort((a,b)=>a.season===b.season?(a.ri||0)-(b.ri||0):(a.season<b.season?1:-1));
  return out;
}
function cupSideScore(row){
  if (!row || row.hg==null || row.ag==null || !isFinite(+row.hg) || !isFinite(+row.ag)) return '<span class="muted">–</span>';
  const mine=row.home?+row.hg:+row.ag, theirs=row.home?+row.ag:+row.hg;
  let sc=mine+':'+theirs;
  if (row.et && mine!==theirs) sc+=' n.V.';
  const myPen=row.home?row.peh:row.pea, opPen=row.home?row.pea:row.peh;
  if (myPen!=null && opPen!=null && myPen!=='' && opPen!=='' && isFinite(+myPen) && isFinite(+opPen) && +myPen!==+opPen) sc+=', '+myPen+':'+opPen+' i.E.';
  return esc(sc);
}
function oppCell(id){
  const t=id && TEAMS[id];
  if (!t) return '<span class="muted">–</span>';
  return '<img class="mini-crest" src="'+esc(t.crest)+'" alt="" data-club="'+id+'" title="'+esc(t.name)+'"> '+esc(t.name);
}
function cupHistTable(id, comp){
  let rows=[];
  try{ rows=cupHistoryRows(id, comp); }catch(e){ rows=[]; }
  const have=new Set(rows.map(r=>r.season));
  (S.seasons||[]).forEach(season=>{
    if (season && season.name && !have.has(season.name)) rows.push({season:season.name, empty:true, ri:0});
  });
  rows.sort((a,b)=>a.season===b.season?(a.ri||0)-(b.ri||0):(a.season<b.season?1:-1));
  if (!rows.length) return '<p class="muted">Keine Pokaldaten gespeichert.</p>';
  let body='';
  rows.forEach(r=>{
    if (r.empty) body+='<tr><td class="l">'+esc(r.season)+'</td><td class="l"><span class="muted">nicht qualifiziert</span></td><td class="l"><span class="muted">–</span></td><td><span class="muted">–</span></td></tr>';
    else body+='<tr><td class="l">'+esc(r.season||'')+'</td><td class="l">'+esc(r.round||'–')+'</td><td class="l">'+oppCell(r.opp)+'</td><td>'+cupSideScore(r)+'</td></tr>';
  });
  return '<table class="tbl info-hist info-cup"><thead><tr><th class="l">Saison</th><th class="l">Runde</th><th class="l">Gegner</th><th>Ergebnis</th></tr></thead><tbody>'+body+'</tbody></table>';
}
function ligaCourseRows(id){
  const by={};
  try{
    (historyEntries(id)||[]).forEach(r=>{
      if (!r || !r.season || r.pl==null) return;
      if (!by[r.season] || r.src==='rechner') by[r.season]={season:r.season, liga:r.liga||'', pl:r.pl};
    });
  }catch(e){}
  (S.seasons||[]).forEach(season=>{
    if (!season || !season.name) return;
    let here=null;
    try{ here=pyramidOf(season)[id]; }catch(e){ here=null; }
    if (here) by[season.name]={season:season.name, liga:here.liga||'', pl:here.pl};
    else if (!by[season.name]) by[season.name]={season:season.name, liga:'', pl:null};
  });
  return Object.keys(by).map(k=>by[k]).sort((a,b)=>a.season<b.season?1:-1);
}
function ansehenHead(id){
  let cur=null, course='';
  try{ const v=ansehenValue(id); if (v!=null && isFinite(+v)) cur=+v; }catch(e){ cur=null; }
  try{
    const end=ansehenEndYear();
    const seen=new Set(), years=[];
    (S.seasons||[]).forEach(s=>{
      const y=seasonYear(s&&s.name);
      if (!s||!s.name||!y||y>end||seen.has(y)) return;
      seen.add(y);
      years.push({y, name:s.name});
    });
    years.sort((a,b)=>b.y-a.y);
    course=years.slice(0,8).map(s=>esc(s.name)+' '+esc(deNum(ansehenInfo(id, s.y).value,2))).join(' · ');
  }catch(e){ course=''; }
  let h='<div class="ansehen-now">Ansehen <b>'+(cur==null?'–':esc(deNum(cur,2)))+'</b></div>';
  if (course) h+='<div class="an-course" title="Gesamtansehen zum jeweiligen Saisonende, ohne spätere Jahre"><b>Verlauf</b> '+course+'</div>';
  return h;
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
  if (kind==='R') return (idx===2?'Rückspiel':'Hinspiel')+' Relegation';
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
    let dow=o.dow||'', time=o.time||'';
    if (o.kind==='S'){ dow='Sa'; time='21:00'; }
    out.push({kind:o.kind, md:o.md, home, opp:home?o.awayId:o.homeId, hg:o.hg, ag:o.ag, et:o.et, peh:o.peh, pea:o.pea, dow, time, top:!!o.top});
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
  if (season.relay) Object.keys(season.relay).forEach(l5=>{
    (season.relay[l5].matches||[]).forEach(m=>{
      if (m.h!==id && m.a!==id) return;
      const home=m.h===id;
      out.push({kind:'R', md:m.leg||1, home, opp:home?m.a:m.h, hg:m.hg, ag:m.ag, et:false, peh:m.peh, pea:m.pea, dow:(m.slot&&m.slot.dow)||'Sa', time:(m.slot&&m.slot.time)||'14:00', top:false});
    });
  });
  const sc=season.supercup;
  if (sc && (sc.h===id||sc.a===id)){
    const home=sc.h===id;
    out.push({kind:'S', md:0, home, opp:home?sc.a:sc.h, hg:sc.hg, ag:sc.ag, et:!!sc.et, peh:sc.peh, pea:sc.pea, dow:'Sa', time:'21:00', top:true});
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
function fxMatchRow(id, it, roundLabel, season){
  if (it.bye) return '<tr class="fx-bye"><td class="fx-md"><b>'+esc(roundLabel)+'</b></td><td class="fx-when">–</td><td class="fx-spiel">Freilos</td></tr>';
  const homeId=it.home?id:it.opp, awayId=it.home?it.opp:id;
  const open=it.hg==null || it.ag==null;
  const tone=open?'open':resultTone(!!it.home, it.hg, it.ag, it.peh, it.pea);
  const land=it.kind==='A';
  const league=it.kind==='L';
  const line=matchLineHTML({h:homeId, a:awayId, hg:it.hg, ag:it.ag, et:!!it.et, peh:it.peh, pea:it.pea, tone, open, nodel:true, box:true, klass:'fx-line', season:season, bl:!land, liga:!league});
  const badge=it.top?'<span class="fx-badge">Topspiel</span>':'';
  return '<tr class="'+(it.top?'fx-top':'')+'"><td class="fx-md"><b>'+esc(roundLabel)+'</b>'+badge+'</td><td class="fx-when">'+esc(terminText(it.dow, it.time))+'</td><td class="fx-spiel">'+line+'</td></tr>';
}
function renderTerminplan(id){
  const seasons=S.seasons||[];
  let idx=S.ui.infoTermin!=null && S.ui.infoTermin!=='' ? +S.ui.infoTermin : S.view;
  if (!(idx>=0 && idx<seasons.length)) idx=seasons.length?seasons.length-1:0;
  S.ui.infoTermin=idx;
  const season=seasons[idx];
  let h='<div class="fx-bar"><label>Saison <select id="infoTermin">'+seasons.map((s,i)=>'<option value="'+i+'"'+(i===idx?' selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select></label></div>';
  const stored=typeof season.fx==='string' && !!season.fx;
  const items=clubFixtureItems(season, id);
  if (!items || !items.length) return h+'<p class="muted">'+(stored?'Keine Spiele in dieser Saison.':'Der Spielplan dieser Saison ist nicht mehr gespeichert.')+'</p>';
  const league=items.filter(it=>it.kind==='L').sort((a,b)=>a.md-b.md);
  const decide=items.filter(it=>it.kind==='E').sort((a,b)=>a.md-b.md);
  const dfb=items.filter(it=>it.kind==='D').sort((a,b)=>a.md-b.md);
  const land=items.filter(it=>it.kind==='A').sort((a,b)=>a.md-b.md);
  const sc=items.filter(it=>it.kind==='S');
  const relFx=items.filter(it=>it.kind==='R').sort((a,b)=>a.md-b.md);
  const lid=clubLeagueId(season, id);
  const leagueName=L[lid]?L[lid].name:(lid?'Amateurliga':'Liga');
  const landName='Landespokal '+((TEAMS[id]&&TEAMS[id].bl)||'');
  const block=(title, list, label)=>{
    if (!list.length) return '';
    const body=list.map(it=>fxMatchRow(id, it, label(it), season)).join('');
    return '<section class="fx-block"><header class="fx-head"><div><b>'+esc(title)+'</b><small>Saison '+esc(season.name)+'</small></div><span class="fx-count">'+spieleText(list)+'</span></header><table class="fx-grid"><thead><tr><th>Spieltag / Runde</th><th>Termin</th><th>Spiel</th></tr></thead><tbody>'+body+'</tbody></table></section>';
  };
  if (!league.length && !decide.length && !stored) h+='<p class="muted">Die Ligaspiele dieser Saison sind nicht mehr gespeichert.</p>';
  h+=block(leagueName, league, it=>it.md+'. Spieltag');
  h+=block('Entscheidung', decide, it=>roundTitle(season, 'E', it.md, id));
  h+=block('DFB-Pokal', dfb, it=>it.round||roundTitle(season, 'D', it.md, id));
  h+=block(landName, land, it=>it.round||roundTitle(season, 'A', it.md, id));
  if (sc.length) h+=block('Supercup', sc, ()=>'Supercup');
  h+=block('Relegation', relFx, it=>roundTitle(season, 'R', it.md, id));
  return h;
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
  if (s.relay) Object.keys(s.relay).forEach(l5=>{
    (s.relay[l5].matches||[]).forEach(m=>{
      if (m.hg==null||(m.h!==id&&m.a!==id)) return;
      const home=m.h===id;
      const res=m.hg>m.ag?'s':m.hg<m.ag?'n':'u';
      fn('rel', home?m.a:m.h, home?m.hg:m.ag, home?m.ag:m.hg, false, home?res:(res==='s'?'n':res==='n'?'s':'u'));
    });
  });
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
  return out.slice(0, 20);
}
function balanceLists(id){
  const all=allOpponents(id).filter(o=>o.sp>=4);
  const byRate=(a,b)=>b.rate-a.rate || b.diff-a.diff || b.sp-a.sp || TEAMS[a.id].name.localeCompare(TEAMS[b.id].name,'de');
  const best=all.slice().sort(byRate).slice(0, 10);
  const skip=new Set(best.map(o=>o.id));
  const worst=all.filter(o=>!skip.has(o.id)).slice().sort((a,b)=>-byRate(a,b)).slice(0, 10);
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
  const wins=[{label:'Alle Saisons', names:null}];
  if (all.length<=10) return wins;
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
    if (season.relay) Object.keys(season.relay).forEach(l5=>{
      (season.relay[l5].matches||[]).forEach(m=>{
        if (m.hg==null||m.ag==null) return;
        if (!((m.h===a&&m.a===b)||(m.h===b&&m.a===a))) return;
        push({season:season.name, comp:'rel', h:m.h, a:m.a, hg:m.hg, ag:m.ag, et:false, peh:m.peh, pea:m.pea});
      });
    });
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
function seasonByName(name){
  return ensureAnsehenCaches().byName.get(name)||null;
}
function landCupsPlayed(id){
  const by={};
  const add=(bl, season)=>{
    if (!bl || !season) return;
    if (!by[bl]) by[bl]=new Set();
    by[bl].add(season);
  };
  (S.pokalRuns||[]).forEach(r=>{ if (r && r.id===id && r.comp==='land') add(r.bl, r.season); });
  (S.seasons||[]).forEach(season=>{
    const land=season && season.cups && season.cups.land;
    if (!land) return;
    Object.keys(land).forEach(bl=>{
      const cup=land[bl];
      if (!cup) return;
      const hit=(cup.entrants||[]).indexOf(id)>=0 || (cup.rounds||[]).some(r=>((r.byes||[]).indexOf(id)>=0) || (r.matches||[]).some(m=>m && (m.h===id || m.a===id)));
      if (hit) add(bl, season.name);
    });
  });
  return by;
}
function landStatVisible(id, bl){
  const b=emptyStat();
  (S.seasons||[]).forEach(season=>{
    const cup=season && season.cups && season.cups.land && season.cups.land[bl];
    if (!cup) return;
    (cup.rounds||[]).forEach(r=>(r.matches||[]).forEach(m=>{
      if (!m || m.hg==null || m.ag==null || (m.h!==id && m.a!==id)) return;
      const w=cupWinner(m);
      if (!w) return;
      const home=m.h===id;
      addInto(b, home?m.hg:m.ag, home?m.ag:m.hg, false, w===id?'s':'n');
    }));
  });
  return b;
}
function amateurSeasons(id){
  const years=new Set();
  (S.seasons||[]).forEach(season=>{
    if (!season) return;
    let inLeague=false;
    Object.keys(season.leagues||{}).forEach(lid=>{ if ((season.leagues[lid].teams||[]).indexOf(id)>=0) inLeague=true; });
    if (inLeague) return;
    Object.keys(season.pools||{}).forEach(pid=>{ if ((season.pools[pid]||[]).indexOf(id)>=0) years.add(season.name); });
  });
  try{
    historyEntries(id).forEach(r=>{
      if (!r || !r.season) return;
      if (r.ebene===7 || /amateur/i.test(String(r.liga||''))) years.add(r.season);
    });
  }catch(e){}
  return years;
}
function bilanzTable(id){
  const row=(label, b, pts, pin)=>'<tr'+(pin?' data-pin="1" class="tot"':'')+'><td class="l">'+label+'</td>'+sortCell(b.sp, b.sp)+sortCell(b.s, b.s)+sortCell(b.u, b.u)+sortCell(b.n, b.n)+sortCell(b.tg, b.tg+':'+b.gt)+sortCell(b.tg-b.gt, (b.tg-b.gt>0?'+':'')+(b.tg-b.gt))+sortCell(pts?b.pkt:'', pts?b.pkt:'–')+'</tr>';
  const leagues=LEAGUES.map(l=>({l, b:statOf(id, l.id)})).filter(x=>x.b.sp);
  const legacy=leagues.length?emptyStat():statOf(id,'liga');
  const dfb=statOf(id,'dfb'), land=statOf(id,'land'), sc=statOf(id,'sc'), rel=statOf(id,'rel');
  const keys=leagues.map(x=>x.l.id).concat(leagues.length?[]:['liga']).concat(['dfb','land','sc']).concat(rel.sp?['rel']:[]);
  const all=sumStat(id, keys);
  let body=leagues.map(x=>row(esc(x.l.name), x.b, true)).join('');
  if (!leagues.length && legacy.sp) body+=row('Liga', legacy, true);
  body+=row('DFB-Pokal', dfb, false);
  const cups=landCupsPlayed(id);
  const bls=Object.keys(cups).sort((a,b)=>a.localeCompare(b,'de'));
  if (bls.length<=1) body+=row(bls.length?('Landespokal '+bls[0]):'Landespokal', land, false);
  else bls.forEach(bl=>{ body+=row('Landespokal '+bl, landStatVisible(id, bl), false); });
  body+=row('Supercup', sc, false);
  if (rel.sp) body+=row('Relegation', rel, false);
  const years=amateurSeasons(id);
  if (years.size) body+='<tr><td class="l">Amateurliga</td><td colspan="7">'+years.size+(years.size===1?' Jahr':' Jahre')+', kein Spielbetrieb</td></tr>';
  body+=row('<b>Gesamt</b>', all, true, true);
  return '<table class="tbl fit bilanz"><thead><tr>'+sortHead('Wettbewerb','','l')+sortHead('Sp.','sp')+sortHead('S','s')+sortHead('U','u')+sortHead('N','n')+sortHead('Tore','tg')+sortHead('Diff.','diff')+sortHead('Pkt.','pkt')+'</tr></thead><tbody>'
    +body+'</tbody></table><p class="muted">Jede Liga hat eine eigene Zeile. Der Landespokal trägt das Land, in dem der Verein ihn gespielt hat. Die Amateurliga zählt nur Saisons ohne Ligaspielbetrieb. Im Pokal gibt es kein Unentschieden. Punkte nur in den Ligen.</p>';
}
function clubTitles(id){
  const titles=[], seenTitle={};
  const addTitle=(k,y,level)=>{
    const key=k+'|'+y;
    if (seenTitle[key]) return;
    seenTitle[key]=1;
    titles.push({k:k, y:String(y), level:level});
  };
  (S.chronicle||[]).forEach(c=>{ if (c.id===id && c.pl===1) addTitle(c.liga, c.season, c.ebene||99); });
  (S.pokalRuns||[]).forEach(r=>{ if (r.id===id && r.won) addTitle(r.comp==='dfb'?'DFB-Pokal':'Landespokal'+(r.bl?' '+r.bl:''), r.season, r.comp==='dfb'?0.2:0.4); });
  (S.seasons||[]).forEach(s=>{ if (s.supercup && supercupWinner(s.supercup)===id) addTitle('Supercup', s.name, 0.6); });
  historicalTitleRows().forEach(r=>{ if (r.id===id) addTitle(titelGroup(r.comp), seasonFull(titelSeason(r.comp, r.year)), r.comp==='dfb'||r.comp==='fdgb'?0.2:0.1); });
  schauRows().forEach(r=>{
    if (!r || r.id!==id || !TEAMS[id]) return;
    const name=r.comp==='sc'?'Supercup':(r.assign?('Landespokal '+(r.land||'')):(r.cupName||'Titel'));
    addTitle(name, r.season||String(r.year), r.comp==='sc'?0.6:0.45);
  });
  return titles;
}
function opponentBoardHTML(id){
  const opps=opponentsOf(id);
  const bal=balanceLists(id);
  const cols='<colgroup><col class="opp-name"><col class="opp-n"><col class="opp-n"><col class="opp-n"><col class="opp-n"><col class="opp-tg">';
  const mini=(list, empty)=>{
    if (!list.length) return '<p class="muted">'+empty+'</p>';
    return '<table class="tbl fit opp-board">'+cols+'<col class="opp-rate"></colgroup><thead><tr>'+sortHead('Gegner','','l')+sortHead('Sp.','sp')+sortHead('S','s')+sortHead('U','u')+sortHead('N','n')+sortHead('Tore','tg')+sortHead('Pkt/Sp','rate')+'</tr></thead><tbody>'
      +list.map(o=>'<tr><td class="l">'+clubHTML(o.id,{nobl:true})+'</td>'+sortCell(o.sp, o.sp)+sortCell(o.s, o.s)+sortCell(o.u, o.u)+sortCell(o.n, o.n)+sortCell(o.gf, o.gf+':'+o.ga)+sortCell(o.rate, deNum(o.rate,2))+'</tr>').join('')
      +'</tbody></table>';
  };
  let h='<div class="opp-row">';
  h+='<div><h3>Häufigste Gegner</h3><p class="muted">Die 20 Gegner mit den meisten Spielen. Bei weniger Gegnern nur diese.</p>';
  if (!opps.length) h+='<p class="muted">Noch keine Gegner.</p>';
  else {
    h+='<table class="tbl fit opp-board">'+cols+'</colgroup><thead><tr>'+sortHead('Gegner','','l')+sortHead('Sp.','sp')+sortHead('S','s')+sortHead('U','u')+sortHead('N','n')+sortHead('Tore','tg')+'</tr></thead><tbody>';
    opps.forEach(o=>{ h+='<tr><td class="l">'+clubHTML(o.id,{nobl:true})+'</td>'+sortCell(o.sp, o.sp)+sortCell(o.s, o.s)+sortCell(o.u, o.u)+sortCell(o.n, o.n)+sortCell(o.gf, o.gf+':'+o.ga)+'</tr>'; });
    h+='</tbody></table>';
  }
  h+='</div>';
  h+='<div><h3>Beste Bilanz</h3><p class="muted">Die 10 besten Punktzahlen pro Spiel, mindestens vier Spiele.</p>'+mini(bal.best, 'Noch zu wenige Spiele.')+'</div>';
  h+='<div><h3>Schlechteste Bilanz</h3><p class="muted">Die 10 schwächsten Punktzahlen pro Spiel, mindestens vier Spiele. Die beste Liste ist ausgenommen.</p>'+mini(bal.worst, 'Noch zu wenige Spiele.')+'</div>';
  h+='</div>';
  return h;
}
function compareTally(matches, id){
  const t={sp:0,s:0,u:0,n:0,gf:0,ga:0};
  matches.forEach(m=>{
    if (!m || m.hg==null || m.ag==null) return;
    const gf=m.h===id?+m.hg:+m.ag, ga=m.h===id?+m.ag:+m.hg;
    t.sp++; t.gf+=gf; t.ga+=ga;
    if (gf>ga) t.s++; else if (gf<ga) t.n++; else t.u++;
  });
  return t;
}
function directCompareHTML(id){
  const opp=S.ui.infoOpp;
  normalizeInfoUi();
  const fx=CMP_FILTERS[S.ui.infoFx]?S.ui.infoFx:'all';
  const filters=[['all','Alle Wettbewerbe'],['liga','Liga'],['dfb','DFB-Pokal'],['land','Landespokal'],['sc','Supercup'],['rel','Relegation']];
  const crest=cid=>TEAMS[cid]?'<img class="cmp-crest" src="'+esc(TEAMS[cid].crest)+'" alt="" data-club="'+cid+'">':'<span class="cmp-crest cmp-empty"></span>';
  let h='<div class="cmp">';
  h+='<div class="cmp-picks">';
  h+='<div class="cmp-side"><div class="cmp-who">'+crest(id)+'<div><b>'+esc(TEAMS[id].name)+'</b><div class="suggest"><input id="cmpLeftQ" class="searchbox" placeholder="Verein links" autocomplete="off" value="'+esc(S.ui.cmpLeftQ||'')+'"><div id="cmpLeftHits" class="suggest-list" hidden></div></div></div></div></div>';
  h+='<button type="button" class="btn cmp-swap" data-act="infoSwap"'+(opp&&TEAMS[opp]&&opp!==id?'':' disabled')+'>Seiten tauschen</button>';
  h+='<div class="cmp-side"><div class="cmp-who">'+(opp&&TEAMS[opp]&&opp!==id?crest(opp):'<span class="cmp-crest cmp-empty"></span>')+'<div><b>'+(opp&&TEAMS[opp]&&opp!==id?esc(TEAMS[opp].name):'Zweiter Verein')+'</b><div class="suggest"><input id="infoOppQ" class="searchbox" placeholder="Verein rechts" autocomplete="off" value="'+esc(S.ui.infoOppQ||'')+'"><div id="infoOppHits" class="suggest-list" hidden></div></div></div></div></div>';
  h+='</div>';
  h+='<p class="cmp-note">Wettbewerb und Zeitraum gelten nur für die Begegnungen. Ansehen und Titel sind der heutige Gesamtstand und folgen dem Filter nicht. Ansehen ist nicht die Simulationsstärke. Fehlende Werte bleiben leer.</p>';
  const shown=x=>{
    try{ const v=ansehenValue(x); if (v==null || !isFinite(+v)) return null; return +v; }catch(e){ return null; }
  };
  const leftA=shown(id), rightA=opp&&TEAMS[opp]&&opp!==id?shown(opp):null;
  const bar=(a,b)=>{
    if (a==null || b==null) return '';
    const m=Math.max(a,b,0.0001);
    return '<div class="cmp-dual"><div><i style="width:'+(100*a/m).toFixed(1)+'%"></i></div><div><i style="width:'+(100*b/m).toFixed(1)+'%"></i></div></div>';
  };
  h+='<div class="cmp-grid"><section><h3>Ansehen</h3><div class="cmp-fig"><span>'+(leftA==null?'–':deNum(leftA,2))+'</span><span>'+(rightA==null?'–':deNum(rightA,2))+'</span></div>'+bar(leftA, rightA)+'<p class="muted">Heutiger Stand beider Vereine.</p></section>';
  const lt=clubTitles(id), rt=opp&&TEAMS[opp]&&opp!==id?clubTitles(opp):[];
  const keys=[];
  const count=list=>{ const m={}; list.forEach(x=>{ m[x.k]=(m[x.k]||0)+1; if (keys.indexOf(x.k)<0) keys.push(x.k); }); return m; };
  const lc=count(lt), rc=count(rt);
  h+='<section><h3>Titel</h3>';
  if (!keys.length) h+='<p class="muted">Kein gespeicherter Titel.</p>';
  else {
    h+='<table class="tbl fit"><thead><tr><th class="l">Titel</th><th>'+esc(TEAMS[id].name)+'</th><th>'+(opp&&TEAMS[opp]?esc(TEAMS[opp].name):'–')+'</th></tr></thead><tbody>';
    keys.forEach(k=>{
      const a=lc[k]||0, b=rc[k]||0;
      h+='<tr><td class="l">'+esc(k)+'</td><td>'+(a?a+'×':'–')+'</td><td>'+(opp&&TEAMS[opp]?(b?b+'×':'–'):'–')+'</td></tr>';
    });
    h+='</tbody></table>';
  }
  h+='</section></div>';
  if (!(opp && TEAMS[opp] && opp!==id)){
    h+='<p class="muted">Wähle den zweiten Verein. Die Suche nimmt Pfeile und Enter.</p></div>';
    return h;
  }
  h+='<div class="cmp-filters">'+filters.map(([k,n])=>'<button type="button" data-act="infoFx" data-v="'+k+'" class="'+(fx===k?'active':'')+'">'+n+'</button>').join('')+'</div>';
  const wins=h2hWindows();
  let wi=S.ui.infoH2H|0;
  if (!(wi>=0 && wi<wins.length)) wi=0;
  S.ui.infoH2H=wi;
  if (wins.length>1) h+='<div class="h2h-nav">'+wins.map((w,i)=>'<button type="button" data-act="infoH2H" data-v="'+i+'" class="'+(i===wi?'active':'')+'">'+esc(w.label)+'</button>').join('')+'</div>';
  const win=wins[wi];
  let matches=win?h2hMatches(id, opp, win.names):[];
  const keep=m=>fx==='all'||(fx==='liga'?(!!L[m.comp]||m.comp==='liga'):m.comp===fx);
  matches=matches.filter(keep);
  const rec=compareTally(matches, id);
  h+='<section class="cmp-meet"><h3>Begegnungen aus Sicht von '+esc(TEAMS[id].name)+'</h3>';
  if (!rec.sp) h+='<p class="muted">In diesem Filter ist keine Begegnung gespeichert.</p>';
  else {
    const w=n=>rec.sp?(100*n/rec.sp).toFixed(1):'0';
    h+='<div class="cmp-fig"><span>'+rec.s+' Siege</span><span>'+rec.u+' Unentschieden</span><span>'+rec.n+' Niederlagen</span></div>';
    h+='<div class="cmp-bar" aria-hidden="true"><i class="s" style="width:'+w(rec.s)+'%"></i><i class="u" style="width:'+w(rec.u)+'%"></i><i class="n" style="width:'+w(rec.n)+'%"></i></div>';
    h+='<p>Tore '+rec.gf+':'+rec.ga+' · '+rec.sp+' Spiele, jedes einmal.</p>';
  }
  h+='</section>';
  if (!win) h+='<p class="muted">Noch keine Saison.</p>';
  else if (!matches.length) h+='';
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
  return h;
}
function walkResultStreaks(events, liveSeason){
  const open={};
  const holders={S:[],U:[],N:[]};
  const best={S:-1,U:-1,N:-1};
  const close=key=>{
    const o=open[key];
    delete open[key];
    if (!o || o.len<1) return;
    if (o.len>best[o.type]){ best[o.type]=o.len; holders[o.type]=[o]; }
    else if (o.len===best[o.type]) holders[o.type].push(o);
  };
  (events||[]).forEach(ev=>{
    if (!ev || ev.gap){ Object.keys(open).forEach(close); return; }
    const key=(ev.id||'')+'|'+(ev.lid||'');
    const o=open[key];
    if (o && o.type===ev.res){ o.len++; o.endSeason=ev.season; o.endMd=ev.md; }
    else {
      if (o) close(key);
      open[key]={id:ev.id, type:ev.res, len:1, liga:ev.liga||'', startSeason:ev.season, startMd:ev.md, endSeason:ev.season, endMd:ev.md, season:ev.season};
    }
  });
  if (liveSeason) Object.keys(open).forEach(key=>{ if (open[key] && open[key].endSeason===liveSeason) open[key].live=true; });
  Object.keys(open).forEach(close);
  ['S','U','N'].forEach(t=>holders[t].sort((a,b)=>String(a.startSeason)<String(b.startSeason)?-1:String(a.startSeason)>String(b.startSeason)?1:(a.startMd||0)-(b.startMd||0)));
  return holders;
}
function clubSeasonStats(id){
  const out=[];
  (S.seasons||[]).forEach(season=>{
    if (!season || season.status!=='done') return;
    Object.keys(season.leagues||{}).forEach(lid=>{
      const lg=season.leagues[lid];
      if (!lg) return;
      let rows=null;
      try{
        const end=season.endData && season.endData.tables && season.endData.tables[lid];
        rows=Array.isArray(end)?end:(lg.tables && lg.tables.all);
      }catch(e){ rows=null; }
      const row=(rows||[]).find(r=>r && r.id===id && +r.sp>0);
      if (!row) return;
      const num=k=>{ if (row[k]==null || row[k]==='') return null; const n=+row[k]; return isFinite(n)?n:null; };
      out.push({season:season.name||'', liga:(L[lid]&&L[lid].name)||'', pl:row.pl!=null?+row.pl:null, tg:num('tg'), gt:num('gt'), pkt:num('pkt'), s:num('s'), u:num('u'), n:num('n'), lid});
    });
  });
  return out;
}
function clubLeagueStreaks(id){
  const events=[];
  (S.seasons||[]).forEach(season=>{
    if (!season) return;
    let inLeague=false, missingMd=false;
    Object.keys(season.leagues||{}).forEach(lid=>{
      const lg=season.leagues[lid];
      if (!lg || !(lg.teams||[]).includes(id)) return;
      inLeague=true;
      const liga=(L[lid]&&L[lid].name)||lid;
      if (!Array.isArray(lg.md)){
        if (typeof season.fx==='string' && season.fx){
          const got=[];
          season.fx.split(';').forEach(rec=>{
            if (!rec || rec.charAt(0)!=='L') return;
            let o=null;
            try{ o=decShared(rec); }catch(e){ o=null; }
            if (!o || o.hg==null || o.ag==null) return;
            let res=null;
            if (o.homeId===id) res=+o.hg>+o.ag?'S':+o.hg<+o.ag?'N':'U';
            else if (o.awayId===id) res=+o.ag>+o.hg?'S':+o.ag<+o.hg?'N':'U';
            if (res) got.push({id, res, season:season.name||'', md:o.md||null, liga, lid});
          });
          if (got.length){ got.sort((a,b)=>(a.md||0)-(b.md||0)); got.forEach(ev=>events.push(ev)); return; }
        }
        missingMd=true;
        return;
      }
      const idx=lg.teams.indexOf(id);
      lg.md.forEach((round, mi)=>{
        (round||[]).forEach(m=>{
          if (!m || m[2]==null || m[3]==null) return;
          let res=null;
          if (m[0]===idx) res=+m[2]>+m[3]?'S':+m[2]<+m[3]?'N':'U';
          else if (m[1]===idx) res=+m[3]>+m[2]?'S':+m[3]<+m[2]?'N':'U';
          if (!res) return;
          events.push({id, res, season:season.name||'', md:mi+1, liga, lid});
        });
      });
    });
    if (!inLeague || missingMd) events.push({gap:true, season:season.name||''});
  });
  const last=(S.seasons||[])[(S.seasons||[]).length-1];
  const live=last && last.status!=='done' && last.status!=='ending' ? last.name : '';
  return walkResultStreaks(events, live);
}
function youngerSeason(a, b){
  const ya=seasonYear(a), yb=seasonYear(b);
  if (ya!==yb) return ya-yb;
  return String(a||'')<String(b||'')?-1:String(a||'')>String(b||'')?1:0;
}
function placeLevel(row){
  if (!row) return 0;
  if (row.ebene!=null && isFinite(+row.ebene) && +row.ebene>0) return +row.ebene;
  const name=String(row.liga||'');
  const known=LEAGUES.find(l=>l.name===name);
  if (known) return known.level;
  if (name==='Bundesliga') return 1;
  if (/^2\./.test(name)) return 2;
  if (/^3\./.test(name)) return 3;
  if (/^4\./.test(name)) return 4;
  if (/^5\./.test(name)) return 5;
  if (/Regionalliga|Oberliga/.test(name)) return 6;
  if (/Amateur/.test(name)) return 7;
  return 0;
}
function pickPlace(rows, worst){
  const usable=(rows||[]).filter(r=>r && r.pl!=null && isFinite(+r.pl) && +r.pl>0 && placeLevel(r)>=1 && placeLevel(r)<=6);
  if (!usable.length) return null;
  let best=usable[0];
  usable.forEach(r=>{
    const la=placeLevel(r), lb=placeLevel(best);
    const levelWins=worst?la>lb:la<lb;
    const same=la===lb;
    const placeWins=worst?+r.pl>+best.pl:+r.pl<+best.pl;
    if (levelWins || (same && placeWins)) best=r;
  });
  const level=placeLevel(best), pl=+best.pl;
  const hits=usable.filter(r=>placeLevel(r)===level && +r.pl===pl).sort((a,b)=>youngerSeason(a.season, b.season));
  return {value:pl, level, row:hits[hits.length-1], n:hits.length};
}
function latestWhen(season, n, md){
  let s='zuletzt '+esc(season||'');
  if (md!=null && md!=='') s+=', '+md+'. Spieltag';
  if (n>1) s+=', '+n+'× erreicht';
  return s;
}
function latestStreak(list){
  let hit=list[0];
  list.forEach(r=>{
    const y=youngerSeason(r.endSeason||r.season, hit.endSeason||hit.season);
    if (y>0 || (y===0 && (r.endMd||0)>(hit.endMd||0))) hit=r;
  });
  return hit;
}
function clubExtreme(list, key, higher){
  const usable=(list||[]).filter(r=>r && r[key]!=null && isFinite(+r[key]));
  if (!usable.length) return null;
  let best=null;
  usable.forEach(r=>{ const v=+r[key]; if (best==null || (higher?v>best:v<best)) best=v; });
  const hits=usable.filter(r=>+r[key]===best).sort((a,b)=>youngerSeason(a.season, b.season));
  return {value:best, row:hits[hits.length-1], n:hits.length};
}
function clubPlaceRows(id){
  const by={};
  const put=(season, row)=>{
    if (!season) return;
    const cur=by[season];
    if (!cur || (row.pl!=null && cur.pl==null) || row.src==='rechner') by[season]=row;
  };
  try{
    (historyEntries(id)||[]).forEach(r=>{
      if (!r || !r.season) return;
      const amateur=(+r.ebene>=7) || /Amateur/i.test(r.liga||'');
      const pl=r.pl!=null && isFinite(+r.pl) && +r.pl>0 && !amateur ? +r.pl : null;
      put(r.season, {season:r.season, liga:r.liga||'', pl, ebene:r.ebene!=null?+r.ebene:null, excluded:pl==null, src:r.src||''});
    });
  }catch(e){}
  (S.seasons||[]).forEach(season=>{
    if (!season || !season.name) return;
    let table=null;
    Object.keys(season.leagues||{}).forEach(lid=>{
      const lg=season.leagues[lid];
      if (!lg || !((lg.teams||[]).includes(id))) return;
      let rows=null;
      try{
        const end=season.endData && season.endData.tables && season.endData.tables[lid];
        rows=Array.isArray(end)?end:(lg.tables && lg.tables.all);
      }catch(e){ rows=null; }
      const row=(rows||[]).find(x=>x && x.id===id && x.pl!=null && isFinite(+x.pl) && +x.pl>0);
      const liga=(L[lid]&&L[lid].name)||'';
      const ebene=L[lid]?L[lid].level:null;
      table=row?{season:season.name, liga, pl:+row.pl, ebene, excluded:false, src:'rechner'}:{season:season.name, liga, pl:null, ebene, excluded:true, src:'rechner'};
    });
    if (table){ by[season.name]=table; return; }
    let poolName='';
    Object.keys(season.pools||{}).forEach(pid=>{
      if ((season.pools[pid]||[]).includes(id)){ const p=POOLS.find(x=>x.id===pid); poolName=(p&&p.name)||'Amateurliga'; }
    });
    if (poolName) by[season.name]={season:season.name, liga:poolName, pl:null, excluded:true, src:'rechner'};
  });
  const rows=Object.keys(by).map(k=>by[k]);
  return {rows:rows.filter(r=>r.pl!=null && !r.excluded), excluded:rows.filter(r=>r.excluded || r.pl==null).length};
}
function clubRecordHTML(id){
  const places=clubPlaceRows(id);
  const place=places.rows;
  const stats=clubSeasonStats(id);
  const histN=place.filter(r=>!stats.some(s=>s.season===r.season)).length;
  const noTable=places.excluded?places.excluded+' Saisons ohne Tabelle, nicht als Platzierung gezählt.':'';
  const streaks=clubLeagueStreaks(id);
  const rows=[];
  const addPlace=(label, worst)=>{
    const hit=pickPlace(place, worst);
    if (!hit){ rows.push({label, value:'<b>–</b>', who:'', when:'', extra:noTable?'keine Tabellendaten':'nicht gespeichert'}); return; }
    rows.push({label, value:'<b>'+hit.value+'.</b> '+esc(hit.row.liga||''), who:clubHTML(id,{nobl:true}), when:latestWhen(hit.row.season, hit.n), extra:''});
  };
  const addStat=(label, key, higher, unit)=>{
    const hit=clubExtreme(stats, key, higher);
    if (!hit){ rows.push({label, value:'<b>–</b>', who:'', when:'', extra:'nicht gespeichert'}); return; }
    rows.push({label, value:'<b>'+hit.value+' '+esc(unit)+'</b>', who:clubHTML(id,{nobl:true}), when:latestWhen(hit.row.season, hit.n), extra:esc(hit.row.liga||'')});
  };
  const addStreak=(label, type, unit)=>{
    const list=streaks[type]||[];
    if (!list.length){ rows.push({label, value:'<b>–</b>', who:'', when:'', extra:'keine Ligaspieltage'}); return; }
    const hit=latestStreak(list);
    rows.push({label, value:'<b>'+hit.len+' '+esc(unit)+'</b>', who:clubHTML(id,{nobl:true}), when:'zuletzt '+streakWhen(hit)+(list.length>1?', '+list.length+'× erreicht':''), extra:[esc(hit.liga||''), hit.live?'läuft noch':''].filter(Boolean).join(' · ')});
  };
  addPlace('Beste Platzierung', false);
  addPlace('Schlechteste Platzierung', true);
  addStat('Meiste Tore', 'tg', true, 'Tore');
  addStat('Wenigste Tore', 'tg', false, 'Tore');
  addStat('Meiste Gegentore', 'gt', true, 'Gegentore');
  addStat('Wenigste Gegentore', 'gt', false, 'Gegentore');
  addStat('Meiste Punkte', 'pkt', true, 'Punkte');
  addStat('Wenigste Punkte', 'pkt', false, 'Punkte');
  addStat('Meiste Siege', 's', true, 'Siege');
  addStat('Wenigste Siege', 's', false, 'Siege');
  addStat('Meiste Unentschieden', 'u', true, 'Unentschieden');
  addStat('Wenigste Unentschieden', 'u', false, 'Unentschieden');
  addStat('Meiste Niederlagen', 'n', true, 'Niederlagen');
  addStat('Wenigste Niederlagen', 'n', false, 'Niederlagen');
  addStreak('Längste Siegesserie', 'S', 'Siege');
  addStreak('Längste Unentschieden-Serie', 'U', 'Unentschieden');
  addStreak('Längste Niederlagenserie', 'N', 'Niederlagen');
  const gap=histN?(' '+histN+' Saisons mit Tabelle haben keine gespeicherten Tore oder Punkte.'):'';
  const amateur=noTable?(' '+noTable+' Die Ligazugehörigkeit bleibt, der Listenplatz einer Amateurstaffel zählt nicht.'):'';
  return recordTable('Rekorde', rows, 'Platzierung nur aus echten Tabellen, je Saison. Eine höhere Liga zählt vor einem besseren Platz in einer niedrigeren Liga. Bei der schlechtesten Platzierung zählt zuerst die niedrigste Liga, darin der schlechteste Platz. Tore, Punkte, Siege, Unentschieden und Niederlagen nur aus Ligatabellen des Rechners, drei Punkte pro Sieg. Serien nur aus Ligaspieltagen, auch über die Saison, und enden bei einer Saison ohne Spieltage oder beim Wechsel der Liga. Eine Serie bis zum letzten gespielten Spieltag der laufenden Saison ist noch offen. Genannt ist immer das jüngste Vorkommen.'+gap+amateur);
}
function renderInfo(){
  $('#tabs').innerHTML='';
  $('#subline').innerHTML='';
  $('#title').textContent='Vereinsinfo';
  const id=S.ui.infoId;
  let h='<div class="box"><h3>Verein wählen</h3><div class="suggest"><input id="infoQ" class="searchbox" placeholder="Vereinsname" autocomplete="off" value="'+esc(S.ui.infoQ||'')+'"><div id="infoHits" class="suggest-list" hidden></div></div></div>';
  if (!id || !TEAMS[id]){ $('#view').innerHTML=h; wireSuggest('infoQ', 'infoHits', 'infoPick', ''); return; }
  const t=TEAMS[id];
  const secs=[['historie','Historie'],['bilanz','Gesamtbilanz'],['rekorde','Rekorde'],['gegner','Häufigste Gegner'],['vergleich','Direkter Vergleich'],['termin','Terminplan'],['erfolge','Erfolge'],['ansehen','Ansehen']];
  let sec=S.ui.infoSec||'historie';
  if (!secs.some(x=>x[0]===sec)) sec='historie';
  S.ui.infoSec=sec;
  h+='<div class="box"><div class="verein-head"><img src="'+esc(t.crest)+'" alt="" data-club="'+id+'"><div><h2>'+esc(t.name)+'</h2><div class="muted">'+esc(t.bl)+'</div>'+ansehenHead(id)+'</div></div>';
  h+='<div class="toggle info-tabs">'+secs.map(([k,n])=>'<button type="button" data-act="infoSec" data-v="'+k+'" class="'+(sec===k?'active':'')+'">'+n+'</button>').join('')+'</div>';
  if (sec==='historie'){
    h+='<div class="info-roomy">';
    const hist=S.ui.infoHist||'liga';
    const landName='Landespokal '+(t.bl||'');
    const tabs=[['liga','Liga'],['dfb','DFB-Pokal'],['land',landName]];
    const curH=tabs.some(x=>x[0]===hist)?hist:'liga';
    S.ui.infoHist=curH;
    h+='<div class="toggle subtabs">'+tabs.map(([k,n])=>'<button type="button" data-act="infoHist" data-v="'+k+'" class="'+(curH===k?'active':'')+'">'+esc(n)+'</button>').join('')+'</div>';
    if (curH==='liga'){
      let chart='';
      try{ chart=placementChart(leagueHistoryPoints(id)); }catch(e){ chart=''; }
      let rows='';
      ligaCourseRows(id).forEach(r=>{
        const sea=(S.seasons||[]).find(s=>s && s.name===r.season);
        const note=sea?relayHistNote(sea, id):'';
        rows+='<tr><td class="l">'+esc(r.season)+'</td><td class="l">'+(r.liga?esc(r.liga):'<span class="muted">–</span>')+(note?'<div class="muted">'+esc(note)+'</div>':'')+'</td><td class="pl">'+(r.pl!=null?r.pl+'.':'<span class="muted">–</span>')+'</td></tr>';
      });
      h+=chart+'<table class="tbl info-hist info-liga"><thead><tr><th class="l">Saison</th><th class="l">Liga</th><th class="pl">Platz</th></tr></thead><tbody>'+rows+'</tbody></table>';
    } else {
      h+=cupHistTable(id, curH==='dfb'?'dfb':'land');
    }
    h+='</div>';
  } else if (sec==='bilanz'){
    h+='<div class="info-roomy">'+bilanzTable(id)+'</div>';
  } else if (sec==='rekorde'){
    h+='<div class="info-roomy">'+clubRecordHTML(id)+'</div>';
  } else if (sec==='gegner'){
    h+='<div class="info-roomy">'+opponentBoardHTML(id)+'</div>';
  } else if (sec==='termin'){
    h+='<div class="info-roomy">'+renderTerminplan(id)+'</div>';
  } else if (sec==='vergleich'){
    h+='<div class="info-roomy">'+directCompareHTML(id)+'</div>';
  } else if (sec==='ansehen'){
    h+=viewAnsehenDetail(id, true);
  } else {
    const titles=clubTitles(id);
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
  if (sec==='vergleich'){
    wireSuggest('cmpLeftQ', 'cmpLeftHits', 'infoPick', S.ui.infoOpp||'');
    wireSuggest('infoOppQ', 'infoOppHits', 'infoOpp', id);
  }
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
  return {h:meister.id, a:away, hg:null, ag:null, et:false, peh:null, pea:null, slot:{dow:'Sa', time:'21:00'}, note};
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
    if (m.peh==null || m.pea==null || m.peh===m.pea){
      const pens=simShootout();
      m.peh=pens[0]; m.pea=pens[1];
    }
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
  const when={dow:'Sa', time:'21:00'};
  return '<div class="slot-head">'+esc(terminText(when.dow, when.time))+'</div><div class="match-solo">'+matchLineHTML({h:m.h, a:m.a, hg:played?m.hg:null, ag:played?m.ag:null, season:s, cup:true, liga:true, done:!!supercupWinner(m), step, above, below, km, del:ed?'<button type="button" class="del" data-act="scDel">×</button>':'<span></span>'})+'</div>';
}
function schauSiegerHTML(r){
  const season=String(r&&(r.season||r.year)||'');
  const year=r&&(r.season||String(r.year||''))||'';
  const opp=r && r.opp && TEAMS[r.opp] ? r.opp : '';
  const who=honourClub(r&&r.id, r&&r.original, season, true);
  const other=opp?honourClub(opp, '', season, true):'<span class="muted">–</span>';
  let match=null;
  if (r && r.home && r.away && TEAMS[r.home] && TEAMS[r.away] && r.hg!=null && r.ag!=null){
    const pen=String(r.score||'').match(/\/\s*(\d+)\s*:\s*(\d+)\s*i\.?\s*E\.?/i);
    match={h:r.home, a:r.away, hg:+r.hg, ag:+r.ag, peh:pen?+pen[1]:null, pea:pen?+pen[2]:null};
  }
  return '<div class="sieger-row"><div class="sieger-year">'+esc(year)+'</div><div class="sieger-who">'+who+'</div><div class="sieger-who">'+other+'</div><div class="sieger-final">'+honourMatch(match, season, true)+'</div></div>';
}
function supercupHonours(){
  const titles={}, finals={}, matches=[];
  const add=(map, id, season)=>{
    if (!id || !TEAMS[id] || !season) return;
    const a=map[id]||(map[id]=[]);
    if (a.indexOf(season)<0) a.push(season);
  };
  (S.seasons||[]).forEach(season=>{
    const m=season && season.supercup;
    if (!m) return;
    const w=supercupWinner(m);
    if (w){ add(titles, w, season.name); add(finals, w, season.name); }
    if (m.h && TEAMS[m.h]) add(finals, m.h, season.name);
    if (m.a && TEAMS[m.a]) add(finals, m.a, season.name);
    if (m.hg!=null && m.ag!=null && TEAMS[m.h] && TEAMS[m.a]) matches.push({season:season.name||'', h:m.h, a:m.a, hg:+m.hg, ag:+m.ag});
  });
  schauRows().forEach(r=>{
    if (!r || r.comp!=='sc' || !r.id || !TEAMS[r.id]) return;
    const season=String(r.year||r.season||'');
    add(titles, r.id, season);
    add(finals, r.id, season);
    if (r.opp && TEAMS[r.opp]) add(finals, r.opp, season);
    const home=r.home && TEAMS[r.home] ? r.home : '';
    const away=r.away && TEAMS[r.away] ? r.away : '';
    if (home && away && r.hg!=null && r.ag!=null) matches.push({season, h:home, a:away, hg:+r.hg, ag:+r.ag});
  });
  return {titles, finals, matches};
}
function renderSupercup(){
  $('#tabs').innerHTML='';
  $('#title').textContent='Supercup';
  const s=cur();
  $('#subline').innerHTML='Meister gegen den DFB-Pokalsieger der Vorsaison.';
  setActions(seasonActions(s, false));
  const m=s.supercup;
  if (S.ui.scView!=='rekorde') S.ui.scView='spiel';
  const recOn=S.ui.scView==='rekorde';
  let h='<div class="toggle" data-toggle="scView"><button type="button" data-v="spiel" class="'+(recOn?'':'active')+'">Spiel</button><button type="button" data-v="rekorde" class="'+(recOn?'active':'')+'">Rekorde</button></div>';
  if (recOn){
    let hon={titles:{}, finals:{}, matches:[]};
    try{ hon=supercupHonours(); }catch(e){}
    $('#view').innerHTML=h+cupRecordTable('Rekorde · Supercup', hon.matches, hon, 'Dieselben Rekordarten wie im DFB-Pokal. Offizielle Supercups 1987–1996 und ab 2010 sind enthalten, soweit beide Vereine im Rechner stehen. Inoffizielle Spiele sind nicht enthalten. Ein Spiel ohne Gegner im Rechner zählt nur als Titel.');
    return;
  }
  h+='<div class="box"><p>Der Supercup steht vor der neuen Saison, sobald die Vorsaison einen Meister und einen DFB-Pokalsieger hat. Heimrecht hat immer der Meister. Gewinnt derselbe Verein beides, spielt er gegen den Zweiten der Bundesliga. Es gilt das Pokalrecht: bei Gleichstand n.V. und i.E. Der Supercup hat keine Karte.</p></div>';
  if (!m) h+='<div class="box"><h3>'+esc(s.name)+'</h3><p class="muted">In dieser Saison gibt es keinen Supercup. Die erste Saison hat noch keinen, und ohne beendeten DFB-Pokal auch nicht.</p></div>';
  else {
    h+='<div class="card"><div class="card-title"><span>Supercup '+esc(s.name)+'</span></div>';
    if (m.note) h+='<p class="cup-note">'+esc(m.note)+'</p>';
    h+=supercupMatchHTML(s, m)+'</div>';
  }
  const past=S.seasons.filter(x=>x.supercup && supercupWinner(x.supercup));
  const hist=schauRows().filter(r=>r && r.comp==='sc' && r.id && TEAMS[r.id]).slice().sort((a,b)=>(+b.year)-(+a.year));
  h+='<div class="box sieger-box"><h3>Sieger</h3>';
  if (!past.length && !hist.length) h+='<p class="muted">Noch kein entschiedener Supercup.</p>';
  if (past.length){
    h+=siegerHead();
    past.slice().reverse().forEach(x=>{
      const w=supercupWinner(x.supercup);
      const opp=w===x.supercup.h?x.supercup.a:x.supercup.h;
      h+=siegerRow(x.name, w, opp, x.supercup, x, true);
    });
  }
  if (hist.length){
    h+='<h3>Historische Sieger</h3><p class="muted">Offizielle Ausgaben 1987–1996 und ab 2010. Inoffizielle Spiele sind nicht enthalten. Das Ergebnis steht so, wie es gespielt wurde.</p>'+siegerHead()+hist.map(schauSiegerHTML).join('');
  }
  h+='</div>';
  $('#view').innerHTML=h;
}
function openClubPage(id, sec){
  if (!id || !TEAMS[id]) return;
  const modal=$('#modal'); if (modal) modal.classList.add('hidden');
  const same=S.ui.tab==='info' && S.ui.infoId===id;
  S.ui.infoId=id;
  S.ui.infoQ='';
  S.ui.tab='info';
  if (sec) S.ui.infoSec=sec;
  else if (!same){ S.ui.infoSec='historie'; S.ui.infoHist='liga'; }
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
  if (pts.length<2) return '<p>'+esc(pts[0].season+' · '+(pts[0].liga||'Liga nicht gespeichert')+' · Platz '+pts[0].pl)+'</p><p class="muted">Zu wenige Saisons für eine Kurve.</p>';
  const step=64, h=300, padL=16, padR=24, padT=16, padB=32;
  const w=Math.max(520, padL+padR+step*Math.max(1, pts.length-1));
  const min=pyramidScore(7, 18, 18), max=pyramidScore(1, 20, 1), spn=max-min;
  const X=i=>padL+step*i;
  const Y=v=>padT+(h-padT-padB)*(1-(v-min)/spn);
  const bands=[[1,'Bundesliga'],[2,'2. Bundesliga'],[3,'3. Liga'],[4,'4. Liga'],[5,'5. Liga'],[6,'Regionalliga'],[7,'Amateur']];
  let grid='', ylabs='';
  bands.forEach(([eb,lab])=>{
    const y=Y(pyramidScore(eb, 18, 1));
    grid+='<line x1="0" x2="'+(w-padR)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" class="band"/>';
    ylabs+='<span style="top:'+(y-7).toFixed(1)+'px">'+esc(lab)+'</span>';
  });
  let segs='';
  for (let i=1;i<pts.length;i++){
    const gap=seasonYear(pts[i].season)-seasonYear(pts[i-1].season);
    if (gap>1) continue;
    const cls=pts[i].ebene<pts[i-1].ebene?' up':pts[i].ebene>pts[i-1].ebene?' down':'';
    segs+='<line class="seg'+cls+'" x1="'+X(i-1).toFixed(1)+'" y1="'+Y(pts[i-1].y).toFixed(1)+'" x2="'+X(i).toFixed(1)+'" y2="'+Y(pts[i].y).toFixed(1)+'"/>';
  }
  const dots=pts.map((p,i)=>{
    const next=pts[i+1];
    const gap=next?seasonYear(next.season)-seasonYear(p.season):0;
    const moved=next&&gap===1?(next.ebene<p.ebene?' up':next.ebene>p.ebene?' down':''):'';
    const change=moved===' up'?' · Aufstieg am Saisonende':moved===' down'?' · Abstieg am Saisonende':'';
    const liga=p.liga||'Liga nicht gespeichert';
    return '<g class="dot'+moved+'"><circle cx="'+X(i).toFixed(1)+'" cy="'+Y(p.y).toFixed(1)+'" r="9"/><text x="'+X(i).toFixed(1)+'" y="'+(Y(p.y)+3).toFixed(1)+'">'+p.pl+'</text><title>'+esc(p.season+' · '+liga+' · Platz '+p.pl+(p.n?' von '+p.n:'')+change)+'</title></g>';
  }).join('');
  const labels=pts.map((p,i)=>'<text x="'+X(i).toFixed(1)+'" y="'+(h-8)+'" text-anchor="middle">'+esc(seasonShort(p.season))+'</text>').join('');
  return '<div class="chart-frame"><div class="chart-y" style="height:'+h+'px">'+ylabs+'</div><div class="hscroll"><svg class="place-chart" style="width:'+w+'px;height:'+h+'px" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Platzierungskurve">'+grid+segs+dots+labels+'</svg></div></div><p class="muted">Die Zahl im Punkt ist der Platz. Rot oder grün ist die Saison, an deren Ende der Verein ab- oder aufsteigt, und die Linie in die nächste Ligastufe. Der Kreis der neuen Saison bleibt neutral. Die Saisons stehen unten. Die Ligastufen links bleiben stehen, wenn du die Jahre verschiebst. Eine Lücke in den Jahren bleibt offen.</p>';
}
function viewVerein(id){
  const t=TEAMS[id];
  const stad=stadionName(id);
  const info=ansehenInfo(id);
  const parts=ansehenParts(info);
  const hist=leagueHistoryPoints(id);
  let h='<div class="box"><button class="btn small" data-act="vereinBack">← Zurück</button><div class="verein-head"><img src="'+esc(t.crest)+'" alt=""><div><h2>'+esc(t.name)+'</h2><div class="muted">'+esc(t.bl)+(stad?' · '+esc(stad):' · Stadionname nicht hinterlegt')+'</div></div></div>';
  h+='<h3>Liga-Verlauf</h3>'+placementChart(hist);
  h+='<h3>Ansehen</h3><div class="ansehen-break">'+
    '<div><span>Liga</span><b>'+deNum(parts.liga,2)+'</b></div>'+
    '<div><span>DFB-Pokal</span><b>'+deNum(parts.dfb,2)+'</b></div>'+
    '<div><span>Landespokal</span><b>'+deNum(parts.land,2)+'</b></div>'+
    '<div class="tot"><span>Ansehen</span><b>'+deNum(info.value,2)+'</b></div></div>';
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
  let h='<div style="display:flex;gap:12px;align-items:center"><img src="'+esc(t.crest)+'" style="width:68px;height:68px;object-fit:contain"><div><h2 style="margin:0">'+esc(t.name)+'</h2><div class="muted">'+esc(t.bl)+'</div></div></div>';
  h+='<h3 style="margin-top:16px">Platzierungen im Fußballrechner</h3><table class="tbl fit"><thead><tr>'+sortHead('Saison','','l')+sortHead('Liga','','l')+sortHead('Platz','pl')+sortHead('Tore','tg')+'</tr></thead><tbody>';
  pl.forEach(p=>{ const tg=p.tore?parseInt(p.tore,10):''; h+='<tr><td class="l">'+p.season+'</td><td class="l">'+esc(leagueName(p.lid))+'</td>'+sortCell(p.pl||'', p.pl?p.pl+'. / '+p.n+(p.final?'':' (laufend)'):'–')+sortCell(tg, p.tore||'–')+'</tr>'; });
  h+='</tbody></table>';
  openModal(h);
}
function openModal(h){ $('#modalBody').innerHTML=h; $('#modal').classList.remove('hidden'); }

// ---------- Ergebnis-Eingabe ----------
function refreshTableOnly(){
  const s=cur(), lid=S.ui.league;
  const tc=$('#tableCard'); if (tc) tc.innerHTML=tableHTML(leagueTable(s,lid),L[lid],{nobl:true,move:true,ansehen:true});
  const lp=leagueProgress(s,lid), pr=seasonProgress(s);
  const sp=$('#subline .muted'); if (sp) sp.textContent='Liga: '+lp.done+'/'+lp.total+' Spiele · alle Ligen: '+pr.done+'/'+pr.total;
  const md=s.leagues[lid].md[shownMd], done=md.filter(m=>m[2]!=null&&m[3]!=null).length;
  const pg=$('#spCard .progress'); if (pg) pg.textContent='('+done+'/'+md.length+' eingetragen)';
  const opt=$('#mdSelect option:checked'); if (opt) opt.textContent=(shownMd+1)+'. Spieltag'+(done===md.length?' ✓':'');
  paintLiveRows();
  alignStandToPlan();
}
function clubsOfMatch(row){
  const ids=[];
  if (!row) return ids;
  row.querySelectorAll('img.ml-crest[data-club]').forEach(img=>{
    if (img.dataset.club && ids.indexOf(img.dataset.club)<0) ids.push(img.dataset.club);
  });
  return ids;
}
function paintLiveRows(){
  const row=document.querySelector('#spCard .match:hover');
  const ids=clubsOfMatch(row);
  document.querySelectorAll('#tableCard tbody tr[data-tid]').forEach(tr=>{
    tr.classList.toggle('row-live', ids.indexOf(tr.dataset.tid)>=0);
  });
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
function placeOvTip(el){
  const tip=el.querySelector('.ov-tip'); if(!tip) return;
  tip.classList.add('fixed');
  const pad=8, vw=window.innerWidth, vh=window.innerHeight;
  tip.style.maxWidth=Math.max(160, vw-pad*2)+'px';
  const cre=el.getBoundingClientRect();
  let tw=tip.offsetWidth, th=tip.offsetHeight;
  let left=cre.left+cre.width/2-tw/2;
  left=Math.max(pad, Math.min(left, vw-tw-pad));
  const preferBelow=el.classList.contains('form-wrap');
  let top=preferBelow?cre.bottom+12:cre.top-th-12, below=preferBelow;
  if (top<pad){ top=cre.bottom+12; below=true; }
  if (top+th>vh-pad){
    const above=cre.top-th-12;
    if (above>=pad){ top=above; below=false; }
    else top=Math.max(pad, vh-th-pad);
  }
  tip.style.left=Math.round(left)+'px';
  tip.style.top=Math.round(top)+'px';
  tip.classList.toggle('below', below);
  const mid=cre.left+cre.width/2-left;
  tip.style.setProperty('--arrow', Math.max(14, Math.min(tw-14, mid))+'px');
}
document.addEventListener('mouseover', ev=>{
  const row=ev.target.closest && ev.target.closest('#spCard .match');
  if (row) paintLiveRows();
});
document.addEventListener('mouseout', ev=>{
  const row=ev.target.closest && ev.target.closest('#spCard .match');
  if (!row) return;
  const next=ev.relatedTarget;
  if (next && row.contains(next)) return;
  paintLiveRows();
});
document.addEventListener('mouseover', ev=>{
  const el=ev.target.closest&&ev.target.closest('.ov-c, .form-wrap');
  if (!el || el.classList.contains('hover')) return;
  document.querySelectorAll('.ov-c.hover, .form-wrap.hover').forEach(x=>{ if(x!==el) x.classList.remove('hover'); });
  el.classList.add('hover');
  placeOvTip(el);
});
document.addEventListener('mouseout', ev=>{
  const el=ev.target.closest&&ev.target.closest('.ov-c, .form-wrap');
  if (!el || (ev.relatedTarget && el.contains(ev.relatedTarget))) return;
  el.classList.remove('hover');
  const tip=el.querySelector('.ov-tip');
  if (tip){ tip.classList.remove('fixed','below'); tip.style.left=''; tip.style.top=''; tip.style.maxWidth=''; }
});
window.addEventListener('scroll', ()=>{
  document.querySelectorAll('.ov-c.hover, .form-wrap.hover').forEach(placeOvTip);
}, true);
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
      paintRankView(body);
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
  const nav=t.closest('[data-league]'); if (nav){ S.ui.league=nav.dataset.league; if(L[S.ui.league]&&L[S.ui.league].level===6) S.ui.olLeague=S.ui.league; if(S.ui.tab==='abschluss'||S.ui.tab==='pokal'||S.ui.tab==='ansehen'||S.ui.tab==='verein'||S.ui.tab==='supercup'||S.ui.tab==='info') S.ui.tab='tabelle'; save(); render(); return; }
  const tab=t.closest('[data-tab]'); if (tab){
    if (tab.dataset.tab==='terminierung' && S.ui.termBlock) delete S.ui.termBlock[S.view+':'+S.ui.league];
    if (tab.dataset.tab==='ansehen'){ S.ui.ansehenId=null; S.ui.ansehenSec=tab.dataset.sec==='wertung'?'wertung':'liste'; }
    if (tab.dataset.tab==='pokal' && tab.dataset.cup==='dfb') S.ui.cup='dfb';
    if (tab.dataset.tab==='pokal' && tab.dataset.cup==='land' && (!S.ui.cup || S.ui.cup==='dfb')) S.ui.cup=BL_ORDER[0];
    S.ui.tab=tab.dataset.tab; save(); render(); return;
  }
  const tg=t.closest('[data-toggle] button'); if (tg){ S.ui[tg.parentNode.dataset.toggle]=tg.dataset.v; save(); render(); return; }
  if (t.closest('.pick-row')) return;
  const crest=t.closest('img[data-club], [data-club] img');
  if (crest){ const id=crest.dataset.club||(crest.closest('[data-club]')&&crest.closest('[data-club]').dataset.club); if(id&&TEAMS[id]){ openClubPage(id); return; } }
  const hist=t.closest('[data-ansehen]'); if (hist){ openClubPage(hist.dataset.ansehen, 'ansehen'); return; }
  const club=t.closest('[data-club]'); if (club && !t.closest('.score') && !t.closest('button') && !t.closest('.stepper')){ if(club.dataset.club&&TEAMS[club.dataset.club]){ openClubPage(club.dataset.club); return; } }
  const a=t.closest('[data-act]'); if (!a) return;
  const act=a.dataset.act, s=cur(), lid=S.ui.league;
  if (act==='amateurList'){ S.ui.amateurView=''; save(); render(); return; }
  if (act==='amateurMap'){ S.ui.amateurView='karte'; save(); render(); return; }
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
  else if (act==='relayGoal'){ applyRelayGoal(a.dataset.l5, +a.dataset.leg, +a.dataset.side, +a.dataset.dir); }
  else if (act==='relayDel'){ touchRelay(a.dataset.l5, +a.dataset.leg, m=>{ m.hg=m.ag=null; m.et=false; m.peh=m.pea=null; }); }
  else if (act==='relayIe'){ openRelayPen(a.dataset.l5); }
  else if (act==='simRelay'){ simRelay(cur()); save(); render(); }
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
    } else if (edit.relay){
      const rel=cur().relay && cur().relay[edit.relay];
      const m=rel && rel.matches && rel.matches.find(x=>x.leg===2);
      const leg1=rel && rel.matches && rel.matches.find(x=>x.leg===1);
      if (m && aggregateLevel(leg1, m)){ m.peh=edit.h; m.pea=edit.a; m.et=false; save(); render(); }
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
  else if (act==='ansehenKind'){ S.ui.ansehenKind=a.dataset.v||'alle'; render(); }
  else if (act==='ansehenGuide'){ S.ui.ansehenGuide=a.dataset.v||'1'; render(); }
  else if (act==='ansehenBack'){ S.ui.ansehenId=null; S.ui.tab='ansehen'; render(); }
  else if (act==='infoSec'){ S.ui.infoSec=a.dataset.v; render(); }
  else if (act==='infoHist'){ S.ui.infoHist=a.dataset.v; render(); }
  else if (act==='infoPick'){ S.ui.infoId=a.dataset.id; S.ui.infoQ=''; save(); render(); }
  else if (act==='infoOpp'){ S.ui.infoOpp=a.dataset.id; S.ui.infoOppQ=''; S.ui.infoH2H=0; save(); render(); }
  else if (act==='infoSwap'){
    const left=S.ui.infoId, right=S.ui.infoOpp;
    if (right && TEAMS[right] && right!==left){ S.ui.infoId=right; S.ui.infoOpp=left; S.ui.infoQ=''; S.ui.infoOppQ=''; S.ui.cmpLeftQ=''; save(); render(); }
  }
  else if (act==='infoFx'){ S.ui.infoFx=a.dataset.v||'all'; render(); }
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
  else if (act==='rules'){ S.ui.tab='regeln'; render(); }
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
  else if (t.id==='mobileLeague'){
    const v=t.value;
    if (v==='ansehen'){ S.ui.tab='ansehen'; S.ui.ansehenId=null; S.ui.ansehenSec='liste'; }
    else if (v==='pokal'||v==='supercup'||v==='info') S.ui.tab=v;
    else { S.ui.league=v; if(S.ui.tab==='abschluss'||S.ui.tab==='pokal'||S.ui.tab==='ansehen'||S.ui.tab==='verein'||S.ui.tab==='supercup'||S.ui.tab==='info') S.ui.tab='tabelle'; }
    save(); render();
  }
  else if (t.id==='mdSelect'){ S.ui.md[S.view+':'+S.ui.league]=+t.value; save(); render(); }
  else if (t.id==='autoNext'){ S.ui.autoNext=t.checked; save(); }
  else if (t.id==='allPools'){ S.ui.allPools=t.checked; save(); render(); }
  else if (t.id==='ansehenLiga'){ S.ui.ansehenLiga=t.value; save(); render(); }
  else if (t.id==='cupSelect'){ S.ui.cup=t.value; S.ui.cupRound=null; S.ui.cupView=S.ui.cupView||'spiele'; save(); render(); }
  else if (t.id==='cupRound'){ S.ui.cupRound=+t.value; save(); render(); }
  else if (t.dataset.cupEt){ mutateCup(t.dataset.cup, +t.dataset.ri, +t.dataset.mi, m=>{ m.et=t.checked; }); }
  else if (t.dataset.scEt!=null){ touchSupercup(m=>{ m.et=t.checked; }); }
  else if (t.dataset.decideEt!=null){ touchDecide(S.ui.league, +t.dataset.decideEt, m=>{ m.et=t.checked; }); }
  else if (t.id==='infoTermin'){ S.ui.infoTermin=+t.value; render(); }
  else if (t.id==='ansehenBl'){ S.ui.ansehenBl=t.value; save(); render(); }
  else if (t.id==='optSupercup'){ S.ui.supercup=t.checked; if(!t.checked && S.ui.tab==='supercup') S.ui.tab='tabelle'; save(); render(); }
  else if (t.dataset.pick){ const e=latest().endData, ol=t.dataset.pick; const arr=e.picks[ol]||(e.picks[ol]=[]);
    const cap=e.need[ol], label=L[ol]?L[ol].name:'die Regionalliga';
    if (t.checked){ if (arr.length>=cap){ t.checked=false; toast('Für '+label+' sind nur '+cap+' Aufsteiger möglich.'); return; } arr.push(t.value); }
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
  else if (t.id==='ansehenSearch'){
    const q=t.value.toLowerCase();
    document.querySelectorAll('#ansehenList tr[data-ansehen]').forEach(tr=>{ tr.style.display=(tr.dataset.name||'').includes(q)?'':'none'; });
    const body=document.querySelector('#ansehenList tbody');
    if (body) paintRankView(body);
  }
});
document.addEventListener('keydown', ev=>{
  if (ev.key==='Escape'){ $('#modal').classList.add('hidden'); document.querySelectorAll('.nav-menu.open,.top-tools.open').forEach(el=>el.classList.remove('open')); }
  const typing=ev.target && ev.target.closest && ev.target.closest('input,textarea,select');
  if (!typing && ev.altKey && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey && (ev.key==='ArrowLeft' || ev.key==='ArrowRight')){
    ev.preventDefault();
    navGo(ev.key==='ArrowLeft'?-1:1);
  }
});
const navBackBtn=document.getElementById('navBack');
const navFwdBtn=document.getElementById('navFwd');
if (navBackBtn) navBackBtn.addEventListener('click', ()=>navGo(-1));
if (navFwdBtn) navFwdBtn.addEventListener('click', ()=>navGo(1));
window.addEventListener('resize', ()=>{ if(S&&S.ui&&S.ui.tab==='tabelle') alignStandToPlan(); });
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
    if(!structureOk(d)){ alert('Dieser Spielstand passt nicht zur aktuellen Ligastruktur (5. Liga Nordost und Südwest, vier Regionalligen, keine Oberliga).'); return; }
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
  normalizeRemovedTab();
  if (latest().status==='ending' && S.view===S.seasons.length-1) S.ui.tab='aufab';
  ensureAllCups();
  migrateArchive();
  recomputePokalPoints();
  save(); render();
  navInstall();
}
function mulberry32(seed){
  let a=seed>>>0;
  return function(){
    a|=0; a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15, 1|a);
    t=t+Math.imul(t^t>>>7, 61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
function expectedAnsehenFactor(line){
  if (!line) return 0;
  if (line.kind==='titel') return titleFactor(line.age, line.durable!==false);
  if (!(line.original||0) && !(line.factor||0)) return 0;
  return seasonFactor(line.age, line.src==='rechner');
}
function measureBoard(endYear){
  const ids=Object.keys(TEAMS);
  const kinds=['liga','dfb','land','titel','euro'];
  const field={liga:0,dfb:0,land:0,titel:0,euro:0};
  const audit={clubs:ids.length, lines:0, nan:0, negative:0, duplicateKeys:0, factorMismatch:0, supercupDoubles:0, historieOver50:0, rechnerBelowFloor:0, sumMismatch:0};
  const rows=ids.map(id=>{
    const info=ansehenLedger(id, endYear);
    const parts={liga:0,dfb:0,land:0,titel:0,euro:0};
    const seen={}, scSeen={};
    info.lines.forEach(l=>{
      audit.lines++;
      if (!isFinite(l.today)) audit.nan++;
      else if (l.today<0) audit.negative++;
      if (parts[l.kind]!=null && isFinite(l.today)) parts[l.kind]+=l.today;
      const key=l.season+'|'+l.kind+'|'+l.label+'|'+l.original;
      if (seen[key]) audit.duplicateKeys++;
      else seen[key]=1;
      if (l.label==='Supercup-Titel'){
        if (scSeen[l.season]) audit.supercupDoubles++;
        scSeen[l.season]=1;
      }
      if (l.src==='historie' && l.age>=50 && l.kind!=='titel' && l.factor!==0) audit.historieOver50++;
      if (l.src==='rechner' && l.age>=50 && l.kind!=='titel' && (l.original||0)>0 && Math.abs((l.factor||0)-ANSEHEN.rechnerFloorW)>0.001) audit.rechnerBelowFloor++;
      const expect=expectedAnsehenFactor(l);
      if (Math.abs((l.factor||0)-expect)>0.001) audit.factorMismatch++;
    });
    kinds.forEach(k=>{ parts[k]=ansehenRound2(parts[k]); field[k]+=parts[k]; });
    const partSum=ansehenRound2(kinds.reduce((s,k)=>s+parts[k],0));
    if (Math.abs(partSum-info.value)>0.05) audit.sumMismatch++;
    return {id, name:TEAMS[id].name, value:info.value, liga:parts.liga, dfb:parts.dfb, land:parts.land, titel:parts.titel, euro:parts.euro};
  });
  rows.sort((a,b)=>b.value-a.value || a.name.localeCompare(b.name,'de'));
  const vals=rows.map(r=>r.value).filter(v=>isFinite(v));
  kinds.forEach(k=>field[k]=ansehenRound2(field[k]));
  field.sum=ansehenRound2(kinds.reduce((s,k)=>s+field[k],0));
  const share=k=>field.sum?ansehenRound2(100*field[k]/field.sum):0;
  return {
    stichtag:endYear,
    clubs:rows.length,
    dist:{max:vals[0]||0, p10:vals[Math.floor(vals.length*0.1)]||0, median:vals[Math.floor(vals.length/2)]||0, min:vals[vals.length-1]||0, sum:ansehenRound2(vals.reduce((s,v)=>s+v,0))},
    field, fieldShare:{liga:share('liga'), dfb:share('dfb'), land:share('land'), titel:share('titel'), euro:share('euro')},
    audit,
    order:rows.map(r=>r.id),
    top:rows.slice(0,10).map((r,i)=>Object.assign({rank:i+1}, r))
  };
}
function heritageSplit(id, endYear){
  const info=ansehenLedger(id, endYear);
  const g={value:info.value, historie:0, historieAge50:0, rechnerAge0to4:0, rechnerAge50:0, titel:0, titelAge60:0, lines:info.lines.length};
  info.lines.forEach(l=>{
    const v=l.today||0;
    if (l.src==='historie'){ g.historie+=v; if (l.age>=50) g.historieAge50+=v; }
    else {
      if (l.age<=4) g.rechnerAge0to4+=v;
      if (l.age>=50) g.rechnerAge50+=v;
    }
    if (l.kind==='titel'){ g.titel+=v; if (l.age>=60) g.titelAge60+=v; }
  });
  ['historie','historieAge50','rechnerAge0to4','rechnerAge50','titel','titelAge60'].forEach(k=>g[k]=ansehenRound2(g[k]));
  return g;
}
function clubLeagueName(season, id){
  if (!season) return '';
  const lid=clubLeagueId(season, id);
  if (L[lid]) return L[lid].name;
  if (P[lid] || Object.keys(season.pools||{}).some(pid=>(season.pools[pid]||[]).indexOf(id)>=0)) return 'Amateurliga';
  return '';
}
let simHold=null;
function releaseSim(){
  if (!simHold) return false;
  Math.random=simHold.random;
  S=simHold.state;
  saveHold=0;
  resetDerivedIndex();
  simHold=null;
  return true;
}
function simulateIsolated(n, seed, hold){
  const backup=S;
  const random=Math.random;
  const t0=performance.now();
  const user={seasons:(backup.seasons||[]).length, view:backup.view, name:backup.seasons&&backup.seasons[backup.view]?backup.seasons[backup.view].name:'', ansehen:ansehenValue('t001')};
  const report={seed:seed==null?20261106:seed|0, asked:n|0, done:0, seasons:[], milestones:{}, moves:{auf:[], ab:[]}, error:null, userBefore:user, stichtag:'Jahr der abgeschlossenen Saison. Die danach geöffnete Saison ist nicht enthalten.'};
  try{
    Math.random=mulberry32(report.seed);
    S=newGame();
    resetDerivedIndex();
    saveHold=1;
    const first=S.seasons[0];
    report.startSeason=first.name;
    report.startYear=dataEndYear();
    report.milestones['0']=measureBoard(report.startYear);
    report.milestones['0'].label='vor '+first.name;
    for(let i=0;i<(n|0);i++){
      const s=latest();
      if(!s || s.status!=='running'){ report.error='keine laufende Saison vor Schritt '+(i+1); break; }
      simSeason(s);
      let guard=0;
      while((decidePending(s)||supercupPending(s)) && guard<8){
        LEAGUES.forEach(l=>{ try{ simDecide(s, l.id); }catch(e){} });
        try{ simSupercup(s); }catch(e){}
        guard++;
      }
      if(decidePending(s)||supercupPending(s)){ report.error='Saison '+s.name+' nicht entscheidbar'; break; }
      s.endData=computeTransition(s);
      s.status='ending';
      suggestPicks(s.endData);
      const moving=(s.endData&&s.endData.moves)||[];
      finalizeSeason({quiet:true, batch:true});
      ageSeasons();
      const done=S.seasons[S.seasons.length-2];
      const bl=(done.endData&&done.endData.tables&&done.endData.tables.BL)||[];
      const champ=bl.find(r=>r&&r.pl===1);
      let dfb=null, sc=null;
      try{ const fin=cupFinalists(done.cups&&done.cups.dfb); dfb=fin&&fin.winner; }catch(e){}
      try{ sc=supercupWinner(done.supercup); }catch(e){}
      report.seasons.push({i:i+1, season:done.name, year:seasonYear(done.name), meister:champ&&TEAMS[champ.id]?TEAMS[champ.id].name:'', dfb:dfb&&TEAMS[dfb]?TEAMS[dfb].name:'', supercup:sc&&TEAMS[sc]?TEAMS[sc].name:''});
      moving.forEach(m=>{
        if (!m || !TEAMS[m.id] || !L[m.from]) return;
        const row={season:done.name, year:seasonYear(done.name), id:m.id, name:TEAMS[m.id].name, from:m.from, fromName:L[m.from].name, fromLevel:L[m.from].level, to:m.to, toName:L[m.to]?L[m.to].name:(P[m.to]?'Amateurliga':String(m.to||'')), toLevel:L[m.to]?L[m.to].level:7, pl:m.pl, type:m.type};
        if (m.type==='auf' && report.moves.auf.length<40 && L[m.to] && L[m.to].level<L[m.from].level) report.moves.auf.push(row);
        if (m.type==='ab' && report.moves.ab.length<40) report.moves.ab.push(row);
      });
      report.done=i+1;
      if (report.done===10||report.done===50||report.done===n){
        const board=measureBoard(seasonYear(done.name));
        board.label='Ende '+done.name;
        report.milestones[String(report.done)]=board;
      }
    }
    const last=S.seasons[S.seasons.length-2];
    const opened=latest();
    report.endSeason=last?last.name:'';
    report.endYear=last?seasonYear(last.name):0;
    report.openSeason=opened?opened.name:'';
    report.openYear=opened?seasonYear(opened.name):0;
    if (last && report.milestones['100']){
      const closed=report.milestones['100'];
      const openBoard=measureBoard(report.openYear);
      report.crosscheck={
        closedYear:report.endYear, closedMax:closed.dist.max, closedBayern:(closed.top.find(r=>r.id==='t001')||{}).value,
        openYear:report.openYear, openMax:openBoard.dist.max, openBayern:(openBoard.order.indexOf('t001')>=0?ansehenLedger('t001', report.openYear).value:null)
      };
      const bayernClosed=closed.top.find(r=>r.id==='t001')||closed.order.indexOf('t001');
      report.crosscheck.closedBayern=ansehenLedger('t001', report.endYear).value;
      report.crosscheck.bayernRankClosed=closed.order.indexOf('t001')+1;
      report.crosscheck.bayernRankOpen=openBoard.order.indexOf('t001')+1;
      void bayernClosed;
    }
    const startOrder=report.milestones['0']?report.milestones['0'].order:[];
    const startRank=id=>startOrder.indexOf(id)+1;
    const pick=(list, pred)=>list.find(pred)||list[0]||null;
    const auf=pick(report.moves.auf, m=>m.fromLevel>=3 && startRank(m.id)>30);
    const ab=pick(report.moves.ab, m=>m.fromLevel<=2 && startRank(m.id)>10 && (!auf || m.id!==auf.id));
    const describe=m=>{
      if (!m) return null;
      const end=report.endYear;
      return Object.assign({}, m, {
        startRank:startRank(m.id),
        endRank:report.milestones['100']?report.milestones['100'].order.indexOf(m.id)+1:0,
        atMove:heritageSplit(m.id, m.year),
        atEnd:heritageSplit(m.id, end),
        atStart:heritageSplit(m.id, report.startYear),
        leagueAtEnd:clubLeagueName(latest(), m.id)
      });
    };
    report.examples={auf:describe(auf), ab:describe(ab), bayern:Object.assign({id:'t001', name:TEAMS.t001.name, startRank:startRank('t001'), endRank:report.milestones['100']?report.milestones['100'].order.indexOf('t001')+1:0, leagueAtEnd:clubLeagueName(latest(), 't001')}, {atStart:heritageSplit('t001', report.startYear), atEnd:heritageSplit('t001', report.endYear)})};
    const mileKeys=['0','10','50','100'].filter(k=>report.milestones[k]);
    mileKeys.forEach(key=>{
      report.milestones[key].top.forEach(r=>{
        r.ranks={};
        mileKeys.forEach(k=>r.ranks[k]=report.milestones[k].order.indexOf(r.id)+1);
      });
    });
    mileKeys.forEach(key=>delete report.milestones[key].order);
    report.moves={auf:report.moves.auf.length, ab:report.moves.ab.length};
  }catch(e){
    report.error=String(e&&e.stack||e&&e.message||e);
  }finally{
    report.ms=Math.round(performance.now()-t0);
    Math.random=random;
    if (hold && !report.error && report.done===(n|0)){
      simHold={state:backup, random};
      saveHold=1;
    } else {
      S=backup;
      saveHold=0;
      resetDerivedIndex();
    }
  }
  return report;
}
function uiSelfTest(){
  const navMuteWas=navMute; navMute++;
  const fails=[];
  try{ return uiSelfTestBody(fails); }
  finally{ navMute=navMuteWas; try{ navPaint(); }catch(e){} }
}
function uiSelfTestBody(fails){
  const check=(name, ok, extra)=>{ if(!ok) fails.push(name+(extra?' · '+extra:'')); };
  const matches=[
    {md:0,h:'t001',a:'t002',hg:1,ag:0},
    {md:1,h:'t002',a:'t001',hg:0,ag:2},
    {md:2,h:'t001',a:'t002',hg:0,ag:0}
  ];
  const home=computeTable(['t001','t002'], matches, 'home');
  const away=computeTable(['t001','t002'], matches, 'away');
  check('Heimform nur Heimspiele', home.find(r=>r.id==='t001').form.join('')==='SU', home.find(r=>r.id==='t001').form.join(''));
  const blankIds=['t003','t001','t002'];
  const blankSeason={name:'2099/00', status:'running', seed:'ansehen', leagues:{BL:{teams:blankIds.slice(), md:[[[0,1,null,null]]]}}, markers:{}};
  const blankLogic=leagueTable(blankSeason,'BL').map(r=>r.id).join();
  const blankShown=sortUnplayedTable(leagueTable(blankSeason,'BL')).map(r=>r.id);
  const blankWant=blankIds.slice().sort(byAnsehen);
  const blankHome=sortUnplayedTable(leagueTable(blankSeason,'BL','home')).map(r=>r.id).join();
  const blankRueck=sortUnplayedTable(leagueTable(blankSeason,'BL','all','rueck')).map(r=>r.id).join();
  const playedRows=computeTable(['t001','t002'], [{md:0,h:'t001',a:'t002',hg:0,ag:1}], 'all');
  const playedOrder=playedRows.map(r=>r.id).join();
  const playedShown=sortUnplayedTable(playedRows).map(r=>r.id).join();
  check('ungespielte Tabelle zeigt Ansehen, die Wertung bleibt die Teamreihenfolge', blankLogic==='t003,t001,t002' && blankShown.join()===blankWant.join() && blankHome===blankShown.join() && blankRueck===blankShown.join() && playedOrder==='t002,t001' && playedShown===playedOrder, blankLogic+' / '+blankShown.join()+' / '+playedShown);
  const placeKeep=S.seasons;
  try{
    const donePlace={name:'2098/99', status:'done', leagues:{BL:{teams:blankIds.slice(), md:[[[0,1,1,0]]]}}, endData:{tables:{BL:[{id:'t003',pl:1,sp:1,tg:1,gt:0},{id:'t001',pl:2,sp:1,tg:0,gt:1},{id:'t002',pl:3,sp:0,tg:0,gt:0}]}}, markers:{}};
    S.seasons=[donePlace, blankSeason];
    const livePlace=clubPlacements('t001').find(p=>p.season==='2099/00');
    const closedPlace=clubPlacements('t001').find(p=>p.season==='2098/99');
    check('Verlauf und Platzierungen der laufenden Saison zeigen den Ansehen-Platz', !!livePlace && livePlace.pl===blankWant.indexOf('t001')+1 && !!closedPlace && closedPlace.pl===2, (livePlace&&livePlace.pl)+'/'+(closedPlace&&closedPlace.pl));
  }finally{ S.seasons=placeKeep; }
  check('Auswärtsform nur Auswärtsspiele', away.find(r=>r.id==='t001').form.join('')==='S', away.find(r=>r.id==='t001').form.join(''));
  const plain=matchLineHTML({h:'t001', a:'t002', hg:1, ag:0, bl:true, ansehen:true});
  check('Ligaspielplan ohne Status', plain.indexOf('(P)')<0 && plain.indexOf('(CL)')<0 && plain.indexOf('(Auf)')<0 && plain.indexOf('ml-an')>=0);
  const dfb=matchLineHTML({h:'t001', a:'t002', hg:4, ag:2, season:cur(), liga:true, bl:true, marker:{t001:['P']}, markOuter:true, cup:true, nodel:true, klass:'axis'});
  const pAt=dfb.indexOf('mk-out'), nameAt=dfb.indexOf(TEAMS.t001.name), ligaAt=dfb.indexOf('liga-edge');
  check('P steht außen vor Liga und Name', pAt>=0 && pAt<ligaAt && ligaAt<nameAt, dfb.slice(0, 180));
  check('P nur am berechtigten Verein', dfb.split('(P)').length===2);
  const land=matchLineHTML({h:'t001', a:'t002', hg:1, ag:0, season:cur(), liga:true, bl:false, cup:true, nodel:true});
  check('Landespokal ohne Bundesland', land.indexOf('ml-bl')<0 && land.indexOf('(P)')<0);
  const snap=(S.seasons[0].leagues.BL.teams||[]).join();
  const nSeasons=S.seasons.length;
  const squads=buildInitialSquads();
  check('bestehender Spielstand bleibt', S.seasons.length===nSeasons && (S.seasons[0].leagues.BL.teams||[]).join()===snap);
  const seen=new Set();
  let dup=false, regionBad=0;
  LEAGUES.forEach(l=>{
    const n=squads.leagues[l.id].length;
    const sizeOk=n===l.size;
    check(l.id+' hat die Sollgröße', sizeOk, String(n));
    squads.leagues[l.id].forEach(id=>{
      if (seen.has(id)) dup=true;
      seen.add(id);
    });
  });
  POOLS.forEach(p=>squads.pools[p.id].forEach(id=>{
    if (seen.has(id)) dup=true;
    seen.add(id);
    if (TEAMS[id].bl!==p.bl){ regionBad++; check('Region '+p.id+' '+TEAMS[id].name, false, TEAMS[id].bl); }
  }));
  check('keine doppelten Vereine', !dup);
  check('kein Verein fehlt', seen.size===Object.keys(TEAMS).length, seen.size+' von '+Object.keys(TEAMS).length);
  check('Regionen stimmen', regionBad===0, String(regionBad));
  const again=buildInitialSquads();
  check('Zuteilung ist stabil', squads.leagues.BL.join()===again.leagues.BL.join() && squads.leagues.RLN.join()===again.leagues.RLN.join());
  const ranked=withHistoryOnly(()=>Object.keys(TEAMS).sort((a,b)=>ansehenValue(b)-ansehenValue(a) || TEAMS[a].name.localeCompare(TEAMS[b].name,'de')));
  check('Bundesliga sind die 20 mit dem höchsten Ansehen', squads.leagues.BL.join()===ranked.slice(0,20).join());
  check('Spielstand nach der Zuteilung noch derselbe', (S.seasons[0].leagues.BL.teams||[]).join()===snap);
  const pyramidKeep=S;
  try{
    S=newGame();
    resetDerivedIndex();
    const histId=S.seasons[0].leagues.BL.teams[0];
    S.chronicle=[{season:'1998/99', id:histId, liga:'Oberliga Bayern', ebene:6, n:18, pl:4, pts:6.8},{season:'1999/00', id:histId, liga:'Regionalliga Nord', ebene:5, n:18, pl:2, pts:12}];
    chronSeen=null; chronIndex=null; chronBuilt=-1;
    const histLigas=ligaCourseRows(histId).map(r=>r.liga);
    let oldOl=0, oldRl=0;
    Object.keys(TEAMS).some(id=>{
      historyEntries(id).forEach(r=>{
        if (r.src!=='historie') return;
        if (/Oberliga/.test(r.liga||'')) oldOl++;
        if (/Regionalliga/.test(r.liga||'')) oldRl++;
      });
      return oldOl>20 && oldRl>20;
    });
    check('historische Oberliga und Regionalliga bleiben lesbar', histLigas.indexOf('Oberliga Bayern')>=0 && histLigas.indexOf('Regionalliga Nord')>=0 && oldOl>0 && oldRl>0, histLigas.filter(Boolean).slice(0,6).join(' · ')+' / '+oldOl+'/'+oldRl);
    const rolls=[];
    for (let i=0;i<5;i++) rolls.push(rollSimulatedSeason());
    check('Start und fünf Folgesaisons', rolls.every(r=>r.rolled) && S.seasons.length===6, rolls.map(r=>!!r.rolled).join(','));
    check('mehrere Saisons laufen fehlerfrei', rolls.every(r=>r.rolled) && S.seasons.length===6, rolls.map(r=>!!r.rolled).join(','));
    const chronFresh=(S.chronicle||[]).filter(r=>r.season===S.seasons[0].name);
    check('neue Chronik speichert den Platz ohne Stärke-Punkte', chronFresh.length>0 && chronFresh.every(r=>r.pl!=null && r.pts==null), String(chronFresh.length));
    const regionWrong=[], sizeWrong=[];
    S.seasons.forEach(sea=>{
      const ids=new Set();
      LEAGUES.forEach(l=>{
        const teams=(sea.leagues[l.id]&&sea.leagues[l.id].teams)||[];
        if (teams.length!==l.size) sizeWrong.push(sea.name+' '+l.id+' '+teams.length);
        teams.forEach(id=>{
          if (ids.has(id)) regionWrong.push('doppelt '+id);
          ids.add(id);
          if (l.level===5 && BL_L5[TEAMS[id].bl]!==l.id) regionWrong.push(l.id+' '+id+' '+TEAMS[id].bl);
          if (l.level===6 && BL_RL[TEAMS[id].bl]!==l.id) regionWrong.push(l.id+' '+id+' '+TEAMS[id].bl);
        });
      });
      POOLS.forEach(p=>(sea.pools[p.id]||[]).forEach(id=>{
        if (ids.has(id)) regionWrong.push('doppelt '+id);
        ids.add(id);
        if (TEAMS[id].bl!==p.bl) regionWrong.push(p.id+' '+id+' '+TEAMS[id].bl);
      }));
      if (ids.size!==919) sizeWrong.push(sea.name+' vereine '+ids.size);
      if (!sea.endData) return;
      L5_IDS.forEach(lid=>{
        const up=sea.endData.moves.filter(m=>m.type==='auf' && m.from===lid).length;
        const down=sea.endData.moves.filter(m=>m.type==='ab' && m.from===lid).length;
        const k=sea.endData.moves.filter(m=>m.type==='ab' && m.to===lid).length;
        const fromRl=sea.endData.moves.filter(m=>m.type==='auf' && m.to===lid && L[m.from]&&L[m.from].level===6).length;
        const wantDown=Math.max(2, k), wantR=Math.max(2, 4-k);
        if (up!==2 || down!==wantDown || fromRl!==wantR) sizeWrong.push(sea.name+' '+lid+' auf '+up+' ab '+down+'/'+wantDown+' k '+k+' aus RL '+fromRl+'/'+wantR);
        if (k===1){
          const rel=sea.relay && sea.relay[lid];
          const w=rel && relayWinner(rel);
          if (!w || !sea.endData.moves.some(m=>m.type==='auf' && m.id===w)) sizeWrong.push(sea.name+' '+lid+' Relegation offen');
          if (rel && (rel.matches||[]).some(m=>m.et)) sizeWrong.push(sea.name+' '+lid+' Verlängerung');
        }
      });
      L5_FEED.forEach(feed=>{
        const ups={};
        feed.rls.forEach(id=>ups[id]=0);
        sea.endData.moves.filter(m=>m.type==='auf' && feed.rls.indexOf(m.from)>=0).forEach(m=>{ ups[m.from]++; });
        const kFeed=sea.endData.moves.filter(m=>m.type==='ab' && m.to===feed.id).length;
        const wantR=Math.max(2, 4-kFeed);
        const sum=feed.rls.reduce((n,id)=>n+(ups[id]||0),0);
        if (sum!==wantR) sizeWrong.push(sea.name+' '+feed.id+' RL-Summe '+sum+'/'+wantR);
        feed.rls.forEach(lid=>{
          const up=ups[lid];
          const down=sea.endData.moves.filter(m=>m.type==='ab' && m.from===lid).length;
          const incoming=sea.endData.moves.filter(m=>m.type==='ab' && m.to===lid).length;
          const picks=((sea.endData.picks&&sea.endData.picks[lid])||[]).length;
          const expectDown=2+Math.max(0, incoming-up);
          const expectPicks=2+Math.max(0, up-incoming);
          const badUp=kFeed===0?up!==2:kFeed>=2?up!==1:(up<1||up>2);
          if (badUp || down!==expectDown || picks!==expectPicks) sizeWrong.push(sea.name+' '+lid+' auf '+up+' ab '+down+'/'+expectDown+' ankunft '+incoming+' picks '+picks+'/'+expectPicks+' k '+kFeed);
        });
      });
    });
    check('Staffelgrößen bleiben und 919 Vereine je einmal', sizeWrong.length===0, sizeWrong.slice(0,8).join(' · '));
    check('niemand spielt regionsfremd', regionWrong.length===0, regionWrong.slice(0,8).join(' · '));
  }finally{
    S=pyramidKeep;
    chronSeen=null; chronIndex=null; chronBuilt=-1;
    resetDerivedIndex();
    try{ save(); }catch(e){}
  }
  [0,1,2,3,4].forEach(kNo=>{
    const squad=buildInitialSquads();
    const national=['BL','BL2','L3'];
    function have(region){ return squad.leagues.L4.filter(id=>BL_L5[TEAMS[id].bl]===region).length; }
    function pull(region){
      while (have(region)<4){
        let donor=null, from='';
        national.forEach(lid=>{
          if (donor) return;
          donor=squad.leagues[lid].find(id=>BL_L5[TEAMS[id].bl]===region)||null;
          if (donor) from=lid;
        });
        const victim=squad.leagues.L4.find(id=>BL_L5[TEAMS[id].bl]!==region);
        if (!donor || !victim) break;
        squad.leagues[from][squad.leagues[from].indexOf(donor)]=victim;
        squad.leagues.L4[squad.leagues.L4.indexOf(victim)]=donor;
      }
    }
    pull('L5NO'); pull('L5SW');
    const no=squad.leagues.L4.filter(id=>BL_L5[TEAMS[id].bl]==='L5NO');
    const sw=squad.leagues.L4.filter(id=>BL_L5[TEAMS[id].bl]==='L5SW');
    const bottom=no.slice(0, kNo).concat(sw.slice(0, 4-kNo));
    const rest=squad.leagues.L4.filter(id=>bottom.indexOf(id)<0);
    const l4=rest.concat(bottom);
    const tableOf=(ids, pts)=>ids.map((id,i)=>({id, pl:i+1, sp:34, pkt:pts[i], tg:pts[i], gt:0, diff:pts[i], s:0, u:0, n:0}));
    const put=(ids, pts)=>ids.map((id,i)=>tableOf(ids, pts)[i]);
    const leagues={};
    function install(lid, ids, pts){
      leagues[lid]={teams:ids.slice(), tables:{all:tableOf(ids, pts)}};
    }
    ['BL','BL2','L3'].forEach(lid=>install(lid, squad.leagues[lid], squad.leagues[lid].map((_,i)=>200-i)));
    install('L4', l4, l4.map((_,i)=>300-i));
    L5_IDS.forEach(lid=>install(lid, squad.leagues[lid], squad.leagues[lid].map((_,i)=>180-i)));
    const rlScore={RLN:[90,30,30], RLO:[80,70,60], RLS:[90,30,30], RLW:[80,70,60]};
    RL_IDS.forEach(lid=>{
      const ids=squad.leagues[lid].slice();
      const pts=ids.map((_,i)=>rlScore[lid][i]!=null?rlScore[lid][i]:20-i);
      install(lid, ids, pts);
    });
    const pools={};
    POOLS.forEach(p=>pools[p.id]=squad.pools[p.id].slice());
    const season={name:'2090/91', status:'done', leagues, pools};
    syncRelay(season);
    const penBad=[];
    L5_IDS.forEach(lid=>{
      const expectK=lid==='L5NO'?kNo:4-kNo;
      const rel=season.relay && season.relay[lid];
      if (expectK!==1){
        if (rel) penBad.push('Relegation zu viel '+lid);
        return;
      }
      if (!rel){ penBad.push('keine Relegation '+lid); return; }
      const feed=L5_FEED.find(p=>p.id===lid);
      const leg1=rel.matches.find(m=>m.leg===1);
      const leg2=rel.matches.find(m=>m.leg===2);
      if (rel.rlBetter!==feed.rls[1] || leg2.h!==rel.better) penBad.push('Heimrecht '+lid+' '+rel.rlBetter);
      leg1.hg=0; leg1.ag=0;
      leg2.hg=1; leg2.ag=1; leg2.et=false; leg2.peh=4; leg2.pea=2;
      if (relayWinner(rel)!==rel.better) penBad.push('Elfmeter '+lid);
      if (leg2.et) penBad.push('Verlängerung '+lid);
      const html=relayHTML(season, lid)+relayHTML(season, rel.rlBetter);
      if (html.indexOf('Elfmeterschießen')<0 || html.indexOf('4:2')<0 || html.indexOf('Relegation')<0) penBad.push('Anzeige '+lid);
      const winNote=relayHistNote(season, rel.better);
      const loseNote=relayHistNote(season, rel.worse);
      if (winNote.indexOf('i.E.')<0 || winNote.indexOf('Sieger')<0) penBad.push('Chronik '+winNote);
      if (loseNote.indexOf('bleibt')<0) penBad.push('Verlierer '+loseNote);
      const keptSeasons=S.seasons;
      try{
        S.seasons=(keptSeasons||[]).concat([season]);
        const box=relayChronicleHTML(lid);
        if (box.indexOf('4:2 i.E.')<0 || box.indexOf('steigt auf')<0) penBad.push('Chronikblock '+lid);
      }finally{ S.seasons=keptSeasons; }
    });
    const e=computeTransition(season);
    suggestPicks(e);
    const bad=[];
    L5_IDS.forEach(lid=>{
      const up=e.moves.filter(m=>m.type==='auf' && m.from===lid).length;
      const down=e.moves.filter(m=>m.type==='ab' && m.from===lid).length;
      const k=e.moves.filter(m=>m.type==='ab' && m.to===lid).length;
      const fromRl=e.moves.filter(m=>m.type==='auf' && m.to===lid && L[m.from]&&L[m.from].level===6).length;
      const expect=lid==='L5NO'?kNo:4-kNo;
      const wantDown=Math.max(2, expect), wantR=Math.max(2, 4-expect);
      if (up!==2 || down!==wantDown || k!==expect || fromRl!==wantR) bad.push(lid+' auf '+up+' ab '+down+'/'+wantDown+' k '+k+' rl '+fromRl+'/'+wantR);
      if (e.newT[lid].length!==22) bad.push(lid+' größe '+e.newT[lid].length);
    });
    L5_FEED.forEach(feed=>{
      feed.rls.forEach((lid, idx)=>{
        const up=e.moves.filter(m=>m.type==='auf' && m.from===lid).length;
        const down=e.moves.filter(m=>m.type==='ab' && m.from===lid).length;
        const incoming=e.moves.filter(m=>m.type==='ab' && m.to===lid).length;
        const picks=(e.picks[lid]||[]).length;
        const kFeed=feed.id==='L5NO'?kNo:4-kNo;
        const rel=season.relay && season.relay[feed.id];
        const w=rel && relayWinner(rel);
        const winRl=w?(w===rel.better?rel.rlBetter:rel.rlWorse):'';
        const expect=kFeed===0?2:(kFeed===1?(lid===winRl?2:1):1);
        const expectDown=2+Math.max(0, incoming-up);
        const expectPicks=2+Math.max(0, up-incoming);
        if (up!==expect || picks!==expectPicks || down!==expectDown) bad.push(lid+' auf '+up+'/'+expect+' ab '+down+'/'+expectDown+' an '+incoming+' picks '+picks+'/'+expectPicks);
        if (e.newT[lid].length+picks!==18) bad.push(lid+' summe '+(e.newT[lid].length+picks));
      });
    });
    const seen=new Set();
    let dup=false, foreign=0;
    LEAGUES.forEach(l=>{
      const extra=l.level===6?(e.picks[l.id]||[]):[];
      e.newT[l.id].concat(extra).forEach(id=>{
        if (seen.has(id)) dup=true;
        seen.add(id);
        if (l.level===5 && BL_L5[TEAMS[id].bl]!==l.id) foreign++;
        if (l.level===6 && BL_RL[TEAMS[id].bl]!==l.id) foreign++;
      });
    });
    POOLS.forEach(p=>(e.pools[p.id]||[]).forEach(id=>{
      if ((e.picks && Object.keys(e.picks).some(rl=>(e.picks[rl]||[]).indexOf(id)>=0))) return;
      if (seen.has(id)) dup=true;
      seen.add(id);
      if (TEAMS[id].bl!==p.bl) foreign++;
    }));
    check('k='+kNo+' hält die freien Plätze und die Staffelgrößen', bad.length===0 && penBad.length===0 && !dup && foreign===0 && seen.size===919, bad.slice(0,3).join(' · ')+' '+penBad.slice(0,3).join(' · ')+' fremd '+foreign+' n '+seen.size);
  });
  const ruleText=rulesHTML();
  check('Regel nennt Relegation ohne Verlängerung', ruleText.indexOf('ohne Verlängerung')>=0 && ruleText.indexOf('Elfmeterschießen')>=0 && ruleText.indexOf('beide Vizemeister')>=0);
  const openLg={level:6, upShow:1, viceOpen:false, settled:false, down:2};
  const nRl=18;
  check('provisorische Absteiger bleiben schraffiert', zoneOf(openLg, 14, nRl, 4)==='' && zoneOf(openLg, 15, nRl, 4)==='ab-aus' && zoneOf(openLg, 16, nRl, 4)==='ab-aus' && zoneOf(openLg, 17, nRl, 4)==='ab' && zoneOf(openLg, 18, nRl, 4)==='ab');
  const shutLg={level:6, upShow:1, viceOpen:false, settled:true, down:2};
  check('feststehende zusätzliche Absteiger werden fest', zoneOf(shutLg, 14, nRl, 4)==='' && zoneOf(shutLg, 15, nRl, 4)==='ab' && zoneOf(shutLg, 16, nRl, 4)==='ab' && zoneOf(shutLg, 17, nRl, 4)==='ab');
  const openUp={level:6, upShow:2, viceOpen:false, settled:false};
  const shutUp={level:6, upShow:2, viceOpen:false, settled:true};
  check('provisorischer Vizemeister wird fest, sobald die 4. Liga steht', zoneOf(openUp, 1, nRl, 2)==='auf' && zoneOf(openUp, 2, nRl, 2)==='auf-aus' && zoneOf(shutUp, 2, nRl, 2)==='auf');
  const lost={level:6, upShow:1, viceOpen:false, settled:true};
  check('ausgeschiedener Vizemeister verliert die Markierung', zoneOf(lost, 2, nRl, 2)==='');
  const splitLg={level:6, upShow:2, viceOpen:false, settled:false, viceSettled:true};
  check('Vizemeister wird fest, während die Zusatzabsteiger offen bleiben', zoneOf(splitLg, 1, nRl, 4)==='auf' && zoneOf(splitLg, 2, nRl, 4)==='auf' && zoneOf(splitLg, 15, nRl, 4)==='ab-aus' && zoneOf(splitLg, 17, nRl, 4)==='ab');
  (()=>{
    const used=new Set();
    const pool=()=>Object.keys(TEAMS).filter(id=>!used.has(id)).sort();
    const take=(pred, n, high)=>{
      const ids=pool().filter(pred);
      const out=(high?ids.slice(-n):ids.slice(0,n));
      if (out.length<n) return null;
      out.forEach(id=>used.add(id));
      return out;
    };
    const isNO=id=>BL_L5[TEAMS[id].bl]==='L5NO';
    const isSW=id=>BL_L5[TEAMS[id].bl]==='L5SW';
    const isRL=rl=>id=>BL_RL[TEAMS[id].bl]===rl;
    const drawn=ids=>{
      const round=[];
      for (let i=0;i<ids.length;i+=2) round.push([i, i+1, 0, 0]);
      return {teams:ids.slice(), md:[round]};
    };
    const opened=lg=>({teams:lg.teams.slice(), md:lg.md.map(r=>r.map(m=>m.slice())).concat([[[0,1,null,null]]])});
    const under=(high, low)=>low.slice().sort().pop()<high.slice().sort()[0];
    const zoneAt=(html, id)=>{
      const hit=html.match(new RegExp('data-tid="'+id+'" class="([^"]*)"'));
      return hit?hit[1]:'fehlt';
    };
    const rowZone=(season, lid)=>{
      const table=leagueTable(season, lid);
      const html=tableHTML(table, L[lid], {season, form:false});
      return {table, html, at:id=>zoneAt(html, id), legend:legendHTML(L[lid], season)};
    };
    const bottomL4=take(id=>TEAMS[id].bl==='Bayern', 4, true);
    const bottomSW=take(id=>TEAMS[id].bl==='Bayern', 4, true);
    const restL4=take(()=>true, 16, false);
    const restSW=take(isSW, 18, false);
    const teamsNO=take(isNO, 22, false);
    const teamsN=take(isRL('RLN'), 18, false);
    const teamsS=take(isRL('RLS'), 18, false);
    const built=bottomL4&&bottomSW&&restL4&&restSW&&teamsNO&&teamsN&&teamsS&&under(bottomL4, restL4)&&under(bottomSW, restSW);
    check('Fenster 4. Liga fertig lässt sich aufbauen', !!built);
    if (!built) return;
    const zero={name:'2096/97', status:'running', leagues:{
      L4:drawn(restL4.concat(bottomL4)),
      L5NO:opened(drawn(teamsNO)),
      L5SW:opened(drawn(restSW.concat(bottomSW))),
      RLN:opened(drawn(teamsN)),
      RLS:opened(drawn(teamsS))
    }};
    const early={name:'2096/97', status:'running', leagues:Object.assign({}, zero.leagues, {L4:opened(zero.leagues.L4)})};
    const earlyN=rowZone(early, 'RLN');
    const earlyVice=earlyN.table[1];
    check('vor der 4. Liga bleibt der Vizemeister provisorisch', leagueFinished(early, 'L4')===false && earlyN.at(earlyVice.id)==='z-auf-aus' && earlyN.legend.indexOf('provisorisch bis die 4. Liga feststeht')>=0);
    const planN=promotionPlan(zero, 'RLN');
    const planS=promotionPlan(zero, 'RLS');
    const nord=rowZone(zero, 'RLN');
    const sued=rowZone(zero, 'RLS');
    const viceN=nord.table[1], profS=relegationProfile(zero, 'RLS');
    const extraS=sued.table.filter(r=>r.pl>sued.table.length-profS.down && r.pl<=sued.table.length-2);
    const fixedS=sued.table.filter(r=>r.pl>sued.table.length-2);
    check('k=0: Vizemeister ist fest, obwohl die 5. Liga offen ist', leagueFinished(zero, 'L4') && !leagueFinished(zero, 'L5NO') && planN.k===0 && planN.up===2 && !planN.open && viceMarksSettled(zero, 'RLN') && !marksSettled(zero, 'RLN') && nord.at(nord.table[0].id)==='z-auf' && nord.at(viceN.id)==='z-auf' && nord.legend.indexOf('Vizemeister, fest')>=0 && nord.legend.indexOf('provisorisch bis die 4. Liga')<0 && nord.legend.indexOf('Relegation, provisorisch')<0, 'k '+planN.k+' klasse '+nord.at(viceN.id));
    check('k>=2: Vizemeister verliert die Markierung, der Ausgleich wartet auf die 5. Liga', planS.k>=2 && planS.up===1 && !planS.open && viceMarksSettled(zero, 'RLS') && !marksSettled(zero, 'RLS') && !leagueFinished(zero, 'L5SW') && profS.down>2 && sued.at(sued.table[1].id)==='' && extraS.length>0 && extraS.every(r=>sued.at(r.id)==='z-ab-aus') && fixedS.every(r=>sued.at(r.id)==='z-ab') && sued.legend.indexOf('Vizemeister')<0 && sued.legend.indexOf('Provisorisch, hängt von der Liga darüber ab')>=0 && sued.legend.indexOf('Zwei feste Absteiger')>=0, 'k '+planS.k+' ab '+profS.down+' platz2 '+sued.at(sued.table[1].id));
    used.clear();
    const oneNO=take(id=>TEAMS[id].bl==='Hamburg', 1, true);
    const threeSW=take(id=>TEAMS[id].bl==='Bayern', 3, true);
    const dropNO=take(id=>TEAMS[id].bl==='Niedersachsen', 2, true);
    const lowL4=take(()=>true, 16, false);
    const dropCeil=dropNO?dropNO.slice().sort()[0]:'';
    const lowNO=take(id=>isNO(id) && id<dropCeil, 20, false);
    const playN=take(isRL('RLN'), 18, false);
    const playO=take(id=>TEAMS[id].bl==='Brandenburg', 18, false);
    const relayBuilt=oneNO&&threeSW&&dropNO&&lowL4&&lowNO&&playN&&playO&&under(oneNO.concat(threeSW), lowL4)&&under(dropNO, lowNO);
    check('Fenster mit k=1 lässt sich aufbauen', !!relayBuilt);
    if (!relayBuilt) return;
    const one={name:'2095/96', status:'running', leagues:{
      L4:drawn(lowL4.concat(oneNO, threeSW)),
      L5NO:opened(drawn(lowNO.concat(dropNO))),
      RLN:drawn(playN),
      RLO:drawn(playO)
    }};
    const openPlan=promotionPlan(one, 'RLN');
    const openNord=rowZone(one, 'RLN');
    const openOst=rowZone(one, 'RLO');
    check('k=1: Relegation bleibt provisorisch, solange sie offen ist', leagueFinished(one, 'L4') && !leagueFinished(one, 'L5NO') && openPlan.k===1 && openPlan.open && !viceMarksSettled(one, 'RLN') && openNord.at(openNord.table[1].id)==='z-auf-aus' && openOst.at(openOst.table[1].id)==='z-auf-aus' && openNord.legend.indexOf('Vizemeister, Relegation, provisorisch')>=0 && openNord.legend.indexOf('Vizemeister, fest')<0 && openNord.legend.indexOf('bis die 4. Liga')<0, 'k '+openPlan.k+' offen '+openPlan.open);
    const rel=one.relay && one.relay.L5NO;
    const leg1=rel&&rel.matches.find(m=>m.leg===1), leg2=rel&&rel.matches.find(m=>m.leg===2);
    if (leg1&&leg2){ leg1.hg=1; leg1.ag=0; leg2.hg=0; leg2.ag=0; }
    const decided=promotionPlan(one, 'RLO');
    const won=rowZone(one, 'RLO');
    const stayed=rowZone(one, 'RLN');
    const stayedDown=relegationProfile(one, 'RLN');
    const stayedExtra=stayed.table.filter(r=>r.pl>stayed.table.length-stayedDown.down && r.pl<=stayed.table.length-2);
    const winner=rel&&relayWinner(rel);
    check('k=1: Relegationssieger ist fest, der Verlierer frei, der Ausgleich wartet', !!rel && winner===rel.worse && decided.k===1 && !decided.open && decided.up===2 && viceMarksSettled(one, 'RLO') && viceMarksSettled(one, 'RLN') && !marksSettled(one, 'RLN') && !leagueFinished(one, 'L5NO') && won.at(won.table[1].id)==='z-auf' && won.table[1].id===winner && stayed.at(stayed.table[1].id)==='' && stayedDown.down>2 && stayedExtra.length>0 && stayedExtra.every(r=>stayed.at(r.id)==='z-ab-aus') && won.legend.indexOf('Vizemeister, fest')>=0 && won.legend.indexOf('provisorisch')<0 && stayed.legend.indexOf('Vizemeister')<0 && stayed.legend.indexOf('Provisorisch, hängt von der Liga darüber ab')>=0, 'sieger '+(winner===rel.worse)+' auf '+decided.up+' ab '+stayedDown.down+' klasse '+won.at(won.table[1].id)+'/'+stayed.at(stayed.table[1].id));
  })();
  const navBar=document.querySelector('#leagueNav');
  const navLink=navBar&&navBar.querySelector('.nav-link');
  const linkCs=navLink?getComputedStyle(navLink):null;
  const navNames=['Bundesliga','2. Bundesliga','3. Liga','4. Liga','5. Liga Nordost','5. Liga Südwest','Regionalliga Nord','Regionalliga Ost','Regionalliga Süd','Regionalliga West','Amateurliga','Pokal','Supercup','Ansehen','Verein'];
  const navText=navBar?navBar.textContent:'';
  const navItems=navBar?[...navBar.querySelectorAll('.nav-link')].map(el=>{
    const r=el.getBoundingClientRect();
    return {top:Math.round(r.top), left:r.left, right:r.right, bottom:r.bottom, clip:el.scrollWidth>el.clientWidth+1};
  }):[];
  let navOverlap=false;
  navItems.forEach((a,i)=>{
    navItems.slice(i+1).forEach(b=>{
      const x=Math.min(a.right,b.right)-Math.max(a.left,b.left);
      const y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
      if (x>0.5 && y>0.5) navOverlap=true;
    });
  });
  const navScreen=window.innerWidth||0;
  const side=navBar?navBar.getBoundingClientRect():null;
  const mainBox=document.querySelector('#main')?document.querySelector('#main').getBoundingClientRect():null;
  check('Leiste nennt die vollen Namen', !!navBar && navNames.every(name=>navText.indexOf(name)>=0) && !!linkCs && parseFloat(linkCs.fontSize)>=11 && navItems.length>=14 && !navOverlap && navItems.every(b=>!b.clip) && !!side && !!mainBox && side.right<=mainBox.left+1, navItems.filter(b=>b.clip).length+' beschnitten');
  const barBoxes=[...document.querySelectorAll('#topbar > *')].map(el=>el.getBoundingClientRect()).filter(r=>r.width>1 && r.height>1);
  let barOverlap=false, barGap=999, barRows={};
  barBoxes.forEach(r=>{ const k=Math.round(r.top); (barRows[k]||(barRows[k]=[])).push(r); });
  Object.keys(barRows).forEach(k=>{
    const row=barRows[k].slice().sort((a,b)=>a.left-b.left);
    for (let i=1;i<row.length;i++) barGap=Math.min(barGap, row[i].left-row[i-1].right);
  });
  for (let i=0;i<barBoxes.length;i++) for (let j=i+1;j<barBoxes.length;j++){
    const a=barBoxes[i], b=barBoxes[j];
    const x=Math.min(a.right,b.right)-Math.max(a.left,b.left);
    const y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
    if (x>0.5 && y>0.5) barOverlap=true;
  }
  const barWide=(window.innerWidth||0)>=1600;
  const brandBox=document.querySelector('.brand');
  check('Leiste überlappt nicht und hält 12 px', !barOverlap && (!barWide || barGap>=12) && !!brandBox && brandBox.closest('#topbar'), 'abstand '+Math.round(barGap));
  const barActs=document.querySelector('#headActions');
  check('Leiste ohne Knopf Saison simulieren', !!barActs && barActs.textContent.indexOf('Saison simulieren')<0 && barActs.textContent.indexOf('Saison abschließen')>=0);
  (()=>{
    const sPlan=cur(), lidPlan='BL', lgPlan=sPlan&&sPlan.leagues&&sPlan.leagues.BL;
    if (!sPlan || !lgPlan || !lgPlan.md) return;
    const key=S.view+':BL';
    const mdWas=S.ui.md?S.ui.md[key]:undefined;
    const kickWas=sPlan.kickoffs&&sPlan.kickoffs.BL?sPlan.kickoffs.BL[0]:undefined;
    sPlan.kickoffs=sPlan.kickoffs||{};
    sPlan.kickoffs.BL=sPlan.kickoffs.BL||{};
    if (!sPlan.kickoffs.BL[0]) sPlan.kickoffs.BL[0]=lgPlan.md[0].map(()=>({dow:'Sa',time:'15:30',kind:''}));
    if (!S.ui.md) S.ui.md={};
    S.ui.md[key]=0;
    const planHtml=spielplanHTML(sPlan, lidPlan);
    if (kickWas===undefined) delete sPlan.kickoffs.BL[0];
    if (mdWas===undefined) delete S.ui.md[key]; else S.ui.md[key]=mdWas;
    const ligaAt=planHtml.indexOf('Liga zu Ende simulieren'), saisonAt=planHtml.indexOf('Komplette Saison simulieren');
    check('Spielplan simuliert die komplette Saison neben der Liga', ligaAt>=0 && saisonAt>ligaAt);
  })();
  if (navScreen>=2500){
    const tools=document.querySelector('.top-tools');
    const actions=document.querySelector('#headActions');
    const season=document.querySelector('.season-field');
    const headItems=[brandBox, tools, actions, season].filter(Boolean).map(el=>el.getBoundingClientRect());
    const headTops=headItems.map(b=>Math.round(b.top));
    let headEdge=999;
    const sorted=headItems.slice().sort((a,b)=>a.left-b.left);
    for (let i=1;i<sorted.length;i++) if (Math.abs(sorted[i].top-sorted[0].top)<=2) headEdge=Math.min(headEdge, sorted[i].left-sorted[i-1].right);
    check('Kopfzeile ist eine Zeile, die Seitenleiste steht links', headTops.every(t=>t===headTops[0]) && headEdge>=8 && !!actions && actions.closest('#topbar') && !!season && season.closest('#topbar') && actions.textContent.indexOf('Saison simulieren')<0 && !!side && side.left<=8 && side.width>=200 && side.width<=248, 'abstand '+Math.round(headEdge)+' breite '+Math.round(side?side.width:0)+' links '+Math.round(side?side.left:0));
  }
  if (navScreen>=1200 && navScreen<=1400){
    const keepTab=S.ui.tab, keepLeague=S.ui.league;
    S.ui.league='BL'; S.ui.tab='tabelle';
    render();
    const card=document.querySelector('#tableCard');
    const table=card&&card.querySelector('table');
    const cardW=card?card.clientWidth:0, tableW=table?Math.round(table.getBoundingClientRect().width):0;
    check('Tabelle bei 1280 ohne Querscrollen', !!card && card.scrollWidth<=card.clientWidth+1 && tableW<=cardW+1, 'karte '+cardW+' tabelle '+tableW);
    S.ui.tab=keepTab; S.ui.league=keepLeague;
    render();
  }
  (()=>{
    const keep={tab:S.ui.tab, league:S.ui.league};
    S.ui.league='L5NO'; S.ui.tab='tabelle';
    render();
    const sub=document.querySelector('#subline');
    const head=document.querySelector('.head');
    const tabs=document.querySelector('#tabs');
    const top=document.querySelector('#topbar');
    const cell=document.querySelector('#tableCard tbody td');
    const pxOf=raw=>{
      const s=String(raw==null?'':raw).trim();
      if (!/^[0-9.]+px$/i.test(s)) return null;
      const n=parseFloat(s);
      return isFinite(n)&&n>0?n:null;
    };
    const fromStyle=style=>{
      if (!style || !style.getPropertyValue) return null;
      try{ return pxOf(style.getPropertyValue('font-size')); }catch(e){ return null; }
    };
    let measured=null;
    try{ measured=cell?fromStyle(getComputedStyle(cell)):null; }catch(e){ measured=null; }
    let declared=null;
    const walk=list=>{
      if (!list) return;
      for (let i=0;i<list.length;i++){
        const rule=list[i];
        if (rule.cssRules) walk(rule.cssRules);
        const sel=(rule.selectorText||'').replace(/\s+/g,'');
        const size=fromStyle(rule.style);
        if (size==null || sel.indexOf('#tableCard>table.tbl.stand')<0) continue;
        if (sel.indexOf('td')<0 && sel!=='#tableCard>table.tbl.stand') continue;
        declared=size;
      }
    };
    try{
      const sheets=document.styleSheets||[];
      for (let i=0;i<sheets.length;i++){ try{ walk(sheets[i].cssRules); }catch(e){} }
    }catch(e){}
    const fontOk=measured!=null?measured>=13:declared!=null?declared>=13:false;
    const fontNote=measured!=null?measured+'px':declared!=null?declared+'px aus CSS':'nicht messbar';
    const gap=tabs&&top?tabs.getBoundingClientRect().top-top.getBoundingClientRect().bottom:99;
    check('Hauptansicht ohne Unterzeile, Reiter direkt unter der Leiste', !!head && head.classList.contains('head-off') && !!sub && sub.textContent.trim()==='' && gap<=16 && fontOk, 'abstand '+Math.round(gap)+' schrift '+fontNote);
    if ((window.innerWidth||0)>=1600 && cell){
      let pad=0;
      try{ pad=parseFloat(getComputedStyle(cell).paddingTop)||0; }catch(e){ pad=0; }
      check('Tabellenzeile ist einen Tick höher', pad>=2 && pad<=3, String(pad));
      const crest=document.querySelector('#spCard .match.sp-line .ml-crest');
      let crestW=0;
      try{ crestW=crest?parseFloat(getComputedStyle(crest).width)||0:0; }catch(e){ crestW=0; }
      check('Spielplan-Wappen hat wieder 32 px', !!crest && crestW>=31 && crestW<=33, String(crestW));
    }
    if (navScreen>=2500 && (window.innerHeight||0)>=1200 && (window.innerHeight||0)<=1450) check('5. Liga passt ohne senkrechtes Scrollen', document.documentElement.scrollHeight<=window.innerHeight+1, document.documentElement.scrollHeight+'/'+window.innerHeight);
    S.ui.tab=keep.tab; S.ui.league=keep.league;
    render();
  })();
  const info=ansehenInfo('t001');
  const seasonRows=ansehenSeasonRows(info);
  check('Saisonzeilen ergeben das Ansehen', ansehenRound2(seasonRows.reduce((s,r)=>s+r.sum,0))===info.value, ansehenRound2(seasonRows.reduce((s,r)=>s+r.sum,0))+' gegen '+info.value);
  check('Titel steckt nicht in der DFB-Spalte', !info.lines.some(l=>l.kind==='dfb' && /Titel/.test(l.label)));
  check('Supercup-Titel klein', ANSEHEN.supercup.title===0.2 && ANSEHEN.supercup.title<ANSEHEN.land.capBudget*ANSEHEN.land.titleShare && ANSEHEN.supercup.title<ANSEHEN.levels[1].title);
  check('Supercup-Titel altert auf 40 %', ansehenRound2(ANSEHEN.supercup.title*titleFactor(100))===0.08);
  const savedSeasons=S.seasons, savedRuns=S.pokalRuns, savedView=S.view;
  try{
    S.seasons=(S.seasons||[]).slice();
    S.seasons.push({name:'2095/96', status:'done', leagues:{}, pools:{AMBY:['t522']}, supercup:{h:'t055', a:'t001', hg:1, ag:0}});
    S.pokalRuns=(S.pokalRuns||[]).concat([{id:'t055', comp:'land', bl:'Bayern', season:'2094/95', round:'Finale', won:false},{id:'t055', comp:'land', bl:'Hessen', season:'2093/94', round:'Finale', won:false}]);
    touchAnsehen();
    const cupLines=ansehenLedger('t055', 2095).lines.filter(l=>l.season==='2095/96' && l.label==='Supercup-Titel');
    check('Supercup zählt einmal', cupLines.length===1 && cupLines[0].original===0.2, String(cupLines.length));
    const bill=bilanzTable('t055');
    check('Würzburger Kickers heißt Landespokal Bayern', bill.indexOf('Landespokal Bayern')>=0, bill.slice(0,400));
    check('Wechsel zeigt auch Hessen', bill.indexOf('Landespokal Hessen')>=0);
    const am=amateurSeasons('t522');
    check('Amateur zählt die Saison einmal', am.has('2095/96') && am.size>=1);
    check('Amateurzeile ohne Spielzahlen', bilanzTable('t522').indexOf('kein Spielbetrieb')>=0);
  }finally{
    S.seasons=savedSeasons; S.pokalRuns=savedRuns; S.view=savedView; touchAnsehen();
  }
  check('Gegnerliste höchstens 20', opponentsOf('t001').length<=20);
  const bal=balanceLists('t001');
  check('Bilanzen höchstens 10', bal.best.length<=10 && bal.worst.length<=10);
  const oppKeep={seasons:S.seasons, stats:S.stats};
  let oppBoard='';
  try{
    const foes=[];
    for (let n=2;n<=13;n++) foes.push('t'+String(n).padStart(3,'0'));
    const teams=['t001'].concat(foes);
    const md=[];
    foes.forEach((opp,i)=>{
      const j=i+1;
      for (let g=0;g<4;g++) md.push(i<8?[0,j,2,0]:[0,j,0,1]);
    });
    S.stats={c:{}, p:{}};
    S.seasons=[{name:'2090/91', status:'running', leagues:{BL:{teams, md:[md]}}}];
    oppBoard=opponentBoardHTML('t001');
  }finally{
    S.seasons=oppKeep.seasons;
    S.stats=oppKeep.stats;
  }
  check('drei Gegnertabellen stehen zusammen', oppBoard.indexOf('opp-row')>=0 && oppBoard.indexOf('Häufigste Gegner')>=0 && oppBoard.indexOf('Beste Bilanz')>=0 && oppBoard.indexOf('Schlechteste Bilanz')>=0 && oppBoard.indexOf('opp-board')>=0 && oppBoard.indexOf('opp-rate')>=0 && oppBoard.indexOf('title=')>=0);
  const cmpKeep={opp:S.ui.infoOpp, fx:S.ui.infoFx, h2h:S.ui.infoH2H, seasons:S.seasons};
  try{
    S.seasons=[{name:'2090/91', status:'running', leagues:{}, pools:{}}];
    S.ui.infoOpp='t002'; S.ui.infoFx='all'; S.ui.infoH2H=0;
    const emptyCmp=directCompareHTML('t001');
    check('leere Begegnung bleibt leer', emptyCmp.indexOf('keine Begegnung gespeichert')>=0 && emptyCmp.indexOf('cmp-bar')<0 && emptyCmp.indexOf('nur für die Begegnungen')>=0 && emptyCmp.indexOf('Seiten tauschen')>=0);
    check('Ansehen bleibt vom Filter getrennt', emptyCmp.indexOf('folgen dem Filter nicht')>=0 && emptyCmp.indexOf('>Ansehen<')>=0);
    const ownTitles=clubTitles('t001');
    check('DFB-Pokal 2021/22 und 2022/23 bleibt draußen', !ownTitles.some(t=>t.k==='DFB-Pokal' && /2021\/2022|2022\/2023|^2022$|^2023$/.test(String(t.y))));
  }finally{
    S.ui.infoOpp=cmpKeep.opp; S.ui.infoFx=cmpKeep.fx; S.ui.infoH2H=cmpKeep.h2h; S.seasons=cmpKeep.seasons;
  }
  const fxKeep={tab:S.ui.tab, sec:S.ui.infoSec, id:S.ui.infoId, opp:S.ui.infoOpp, fx:S.ui.infoFx, termin:S.ui.infoTermin, h2h:S.ui.infoH2H, seasons:S.seasons, view:S.view, verein:S.ui.vereinId, runs:S.pokalRuns, anId:S.ui.ansehenId, anSec:S.ui.ansehenSec, hold:saveHold};
  try{
    saveHold=1;
    S.seasons=[
      {name:'2090/91', status:'done', leagues:{}, pools:{}, cups:{dfb:{rounds:[{name:'Finale', matches:[{h:'t001', a:'t002', hg:2, ag:1}]}]}}},
      {name:'2091/92', status:'running', leagues:{}, pools:{}}
    ];
    S.view=1;
    S.ui.infoId='t001'; S.ui.infoOpp='t002'; S.ui.infoH2H=0; S.ui.infoTermin=0; S.ui.infoFx='dfb'; S.ui.infoSec='vergleich'; S.ui.tab='info';
    render();
    let cmpHtml=$('#view').innerHTML;
    check('DFB-Filter übersteht die Saison 0', S.ui.infoFx==='dfb' && S.ui.infoTermin===0 && cmpHtml.indexOf('data-v="dfb" class="active"')>=0 && cmpHtml.indexOf('keine Begegnung gespeichert')<0 && cmpHtml.indexOf('2:1')>=0);
    S.ui.infoSec='termin';
    render();
    check('Terminplan liest den eigenen Saisonindex 0', S.ui.infoFx==='dfb' && $('#infoTermin') && $('#infoTermin').value==='0' && $('#view').innerHTML.indexOf('2090/91')>=0);
    S.ui.infoTermin=1;
    render();
    check('Terminplan hält einen Index über 0', S.ui.infoFx==='dfb' && $('#infoTermin').value==='1');
    S.ui.infoSec='vergleich';
    render();
    cmpHtml=$('#view').innerHTML;
    check('Rückkehr zum Vergleich behält den DFB-Filter', S.ui.infoFx==='dfb' && S.ui.infoTermin===1 && cmpHtml.indexOf('data-v="dfb" class="active"')>=0 && cmpHtml.indexOf('keine Begegnung gespeichert')<0);
    ['all','liga','dfb','land','sc'].forEach(key=>{
      S.ui.infoFx=key;
      render();
      const on=document.querySelector('.cmp-filters button.active');
      check('Wettbewerbsfilter '+key+' bleibt aktiv', on && on.dataset.v===key && S.ui.infoTermin===1);
    });
    S.ui.infoFx='liga';
    render();
    check('Ligafilter ohne Spiel nennt keine Begegnung', $('#view').innerHTML.indexOf('keine Begegnung gespeichert')>=0 && S.ui.infoFx==='liga');
    S.ui.infoFx='dfb';
    document.querySelector('[data-act="infoSwap"]').click();
    check('Tausch lässt Filter und Terminplan stehen', S.ui.infoId==='t002' && S.ui.infoOpp==='t001' && S.ui.infoFx==='dfb' && S.ui.infoTermin===1);
    S.ui.infoFx='land'; S.ui.infoTermin=1;
    const packed=unpackState(JSON.parse(JSON.stringify(packForDisk(S))));
    check('Speichern behält Filter und Saisonindex', packed.ui.infoFx==='land' && packed.ui.infoTermin===1);
    S.ui.infoFx=1; S.ui.infoTermin=null;
    normalizeInfoUi();
    check('alter Saisonindex wird nicht zum Filter', S.ui.infoFx==='all' && S.ui.infoTermin===1);
    S.ui.infoFx=0; delete S.ui.infoTermin;
    normalizeInfoUi();
    check('Saisonindex 0 bleibt eine Saison', S.ui.infoFx==='all' && S.ui.infoTermin===0);
    S.ui.infoFx='dfb'; S.ui.infoTermin=0;
    normalizeInfoUi();
    check('gesetzter Filter bleibt neben Saison 0', S.ui.infoFx==='dfb' && S.ui.infoTermin===0);
    const snapFx=navState();
    S.ui.infoFx='sc'; S.ui.infoTermin=1;
    navApply(snapFx);
    check('Zurücknavigieren trennt Filter und Saison', S.ui.infoFx==='dfb' && S.ui.infoTermin===0);
    const shape=ansehenInfo('t001');
    const shapeParts=ansehenParts(shape);
    check('Ansehen-Ledger hat Linien und Summe, keine verschachtelten Pokalfelder', shape && Array.isArray(shape.lines) && shape.value!=null && shape.dfb==null && shape.land==null && typeof shapeParts.liga==='number' && typeof shapeParts.dfb==='number' && typeof shapeParts.land==='number');
    S.pokalRuns=(S.pokalRuns||[]).concat([{id:'t001', comp:'dfb', season:'2090/91', round:'Finale', won:true}]);
    S.ui.tab='verein'; S.ui.vereinId='t001';
    render();
    const vereinCup=$('#view').innerHTML;
    check('Vereinsseite mit Pokal zeigt das Ledger', $('#title').textContent===TEAMS.t001.name && vereinCup.indexOf('DFB-Pokal')>=0 && vereinCup.indexOf(deNum(shapeParts.dfb,2))>=0 && vereinCup.indexOf(deNum(shape.value,2))>=0 && vereinCup.indexOf('2090/91')>=0);
    const quietId=Object.keys(TEAMS).filter(id=>id>='t800').find(id=>!(S.pokalRuns||[]).some(r=>r.id===id && r.won) && ansehenParts(ansehenInfo(id)).dfb===0);
    if (!quietId) check('Vereinsseite ohne Pokalsieg rendert das Ledger', false, 'kein Verein');
    else {
      S.ui.vereinId=quietId;
      render();
      const vereinQuiet=$('#view').innerHTML;
      const quietParts=ansehenParts(ansehenInfo(quietId));
      check('Vereinsseite ohne Pokalsieg rendert das Ledger', $('#title').textContent===TEAMS[quietId].name && vereinQuiet.indexOf('Pokalsiege')>=0 && vereinQuiet.indexOf('keine')>=0 && vereinQuiet.indexOf(deNum(quietParts.dfb,2))>=0 && vereinQuiet.indexOf(deNum(ansehenInfo(quietId).value,2))>=0, quietId);
    }
    S.ui.tab='ansehen'; S.ui.ansehenId=null; S.ui.ansehenSec='liste';
    render();
    check('Ansehen-Ansicht bleibt offen', $('#title').textContent==='Ansehen' && $('#view').innerHTML.indexOf('Ansehen aller Vereine')>=0 && $('#view').innerHTML.indexOf('DFB-Pokal')>=0);
    S.ui.tab='info'; S.ui.infoId='t001'; S.ui.infoSec='gegner';
    render();
    check('Gegnertabellen rendern auf der Seite', $('#view').innerHTML.indexOf('opp-row')>=0 && $('#view').innerHTML.indexOf('Häufigste Gegner')>=0);
    S.ui.infoSec='vergleich'; S.ui.infoOpp='t002'; S.ui.infoFx='dfb';
    render();
    check('Vergleich rendert nach der Vereinsseite', $('#view').innerHTML.indexOf('data-v="dfb" class="active"')>=0);
  }finally{
    S.ui.tab=fxKeep.tab; S.ui.infoSec=fxKeep.sec; S.ui.infoId=fxKeep.id; S.ui.infoOpp=fxKeep.opp; S.ui.infoFx=fxKeep.fx; S.ui.infoTermin=fxKeep.termin; S.ui.infoH2H=fxKeep.h2h; S.seasons=fxKeep.seasons; S.view=fxKeep.view; S.ui.vereinId=fxKeep.verein; S.pokalRuns=fxKeep.runs; S.ui.ansehenId=fxKeep.anId; S.ui.ansehenSec=fxKeep.anSec; saveHold=fxKeep.hold;
  }
  const sizes={};
  LEAGUES.forEach(l=>{ sizes[l.id]=squads.leagues[l.id].length+'/'+l.size; });
  POOLS.forEach(p=>{ sizes[p.id]=squads.pools[p.id].length; });
  const ties=[
    {season:cur().name, h:'t001', a:'t002', hg:8, ag:0},
    {season:cur().name, h:'t003', a:'t004', hg:7, ag:0}
  ];
  const leagueRec=ties.map(recMatchLine).join('');
  const leagueArrow=ties.map(m=>recMatchLine(m)).join('');
  check('Liga-Gleichstand ohne Liga-Tag, auch über map', leagueRec.indexOf('liga-edge')<0 && leagueArrow.indexOf('liga-edge')<0 && (leagueRec.match(/ml-bl/g)||[]).length===4, String((leagueRec.match(/liga-edge/g)||[]).length));
  const dfbRec=ties.map(m=>recMatchLine(m, 'dfb')).join('');
  check('DFB-Gleichstand beide mit Liga und Bundesland', (dfbRec.match(/liga-edge/g)||[]).length===4 && (dfbRec.match(/ml-bl/g)||[]).length===4);
  const landRec=ties.map(m=>recMatchLine(m, 'Bayern')).join('');
  check('Landespokal-Gleichstand mit Liga ohne Bundesland', (landRec.match(/liga-edge/g)||[]).length===4 && landRec.indexOf('ml-bl')<0);
  check('Index als cup erzwingt keinen Liga-Tag', recMatchLine(ties[1], 1).indexOf('liga-edge')<0);
  const tieSeason=(md, lid)=>{
    const teams=['t001','t002','t003','t004'];
    return {name:'2098/99', status:'running', leagues:{[lid]:{teams, md}}};
  };
  const doneSplit=tieSeason([[[0,1,2,0]],[[1,0,1,0]]],'L3');
  const doneFixed=fixedPlaces(doneSplit, 'L3');
  check('Abgeschlossen, gleiche Punkte, verschiedene Tordifferenz: beide Plätze fest', doneFixed[1]==='t001' && doneFixed[2]==='t002', JSON.stringify(doneFixed));
  const even=tieSeason([[[0,1,1,1]],[[1,0,1,1]]],'L3');
  const evenFixed=fixedPlaces(even, 'L3');
  check('Komplett gleich bleibt offen', !evenFixed[1] && !evenFixed[2], JSON.stringify(evenFixed));
  const live=tieSeason([[[0,1,2,0]],[[1,0,null,null]]],'L3');
  const liveFixed=fixedPlaces(live, 'L3');
  check('Laufend und punktlich einholbar bleibt offen', !liveFixed[1] && !liveFixed[2], JSON.stringify(liveFixed));
  const safe=tieSeason([[[0,1,1,0],[0,2,1,0],[0,3,1,0]]],'BL');
  const safeMap=certaintyMap(safe, 'BL');
  check('Mathematisch sicherer Abstieg ist kräftig rot', safeMap.t002==='down' && safeMap.t004==='down' && safeMap.t001!=='down', JSON.stringify(safeMap));
  const openDown=tieSeason([[[0,1,1,0]],[[1,0,null,null]]],'BL');
  const openMap=certaintyMap(openDown, 'BL');
  check('Einholbarer Abstieg bleibt ohne sicheres Rot', openMap.t002!=='down', JSON.stringify(openMap));
  const html=tableHTML(leagueTable(safe, 'BL'), L.BL, {season:safe, form:false, ansehen:false, zones:true});
  const blPlain=tableHTML(leagueTable(cur(), 'BL'), L.BL, {form:false, ansehen:false});
  const l3Plain=tableHTML(leagueTable(cur(), 'L3'), L.L3, {form:false, ansehen:false});
  check('Keine dicken Zonenlinien', html.indexOf('zone-cut')<0 && blPlain.indexOf('zone-cut')<0 && l3Plain.indexOf('zone-cut')<0);
  check('Hinspiel aus Sicht des Rückspiels', firstLegLine({teams:['t010','t011'], md:[[[0,1,3,1]],[[1,0,null,null]]]}, 1, 1, 0)==='1:3');
  check('Hinspiel zeigt keine erfundene Zahl', firstLegLine({teams:['t010','t011'], md:[[[0,1,null,null]],[[1,0,null,null]]]}, 1, 1, 0)===null && firstLegLine({teams:['t010','t011'], md:[[[0,1,3,1]]]}, 0, 0, 1)===null);
  const played=computeTable(['t010','t011'], [{md:0,h:'t010',a:'t011',hg:3,ag:1}], 'all');
  const homeRow=played.find(r=>r.id==='t010');
  check('Form merkt das echte Spiel', homeRow.form.join('')==='S' && homeRow.formGames[0].h==='t010' && homeRow.formGames[0].hg===3 && homeRow.formGames[0].ag===1);
  const formHtml=formSpan('S', homeRow.formGames[0]);
  check('Tooltip nennt Spieltag und Paarung', formHtml.indexOf('1. Spieltag')>=0 && formHtml.indexOf('3:1')>=0 && formHtml.indexOf(TEAMS.t010.name)>=0 && formHtml.indexOf(TEAMS.t011.name)>=0);
  const tipHost=document.createElement('div');
  tipHost.innerHTML='<span class="form">'+formHtml+'</span>';
  document.body.appendChild(tipHost);
  const tipPop=tipHost.querySelector('.form-pop');
  if (tipPop) tipPop.style.display='block';
  const tipName=tipHost.querySelector('.ft-name');
  const tipScore=tipHost.querySelector('.ft-score');
  const tipDay=tipHost.querySelector('.ft-day');
  const ink=el=>getComputedStyle(el).color;
  const dark=c=>c && c!=='rgb(255, 255, 255)' && c!=='rgba(255, 255, 255, 1)';
  check('Tooltip-Text ist dunkel und nicht auf 16px gequetscht', !!tipName && !!tipScore && !!tipDay && dark(ink(tipName)) && dark(ink(tipScore)) && dark(ink(tipDay)) && tipName.getBoundingClientRect().width>40 && tipScore.getBoundingClientRect().width>12, ink(tipName)+' '+Math.round(tipName?tipName.getBoundingClientRect().width:0));
  tipHost.remove();
  check('Alter 4 bleibt voll, Alter 5 beginnt den nächsten Abschnitt', ageBand(4).id==='full' && ageBand(5).id==='mid' && ageBand(10).id==='mid' && ageBand(11).id==='gentle' && ageBand(20).id==='gentle' && ageBand(21).id==='late' && ageBand(49).id==='late' && ageBand(50).id==='floor');
  const guideWas=S.ui.ansehenGuide;
  S.ui.ansehenGuide='1';
  const guideBl=ansehenGuideHTML();
  S.ui.ansehenGuide='2';
  const guideL2=ansehenGuideHTML();
  S.ui.ansehenGuide='7';
  const guideAm=ansehenGuideHTML();
  S.ui.ansehenGuide='land';
  const guideLand=ansehenGuideHTML();
  S.ui.ansehenGuide='dfb';
  const guideDfb=ansehenGuideHTML();
  S.ui.ansehenGuide=guideWas;
  check('Wertungsreiter nutzt die Ligafunktion', guideBl.indexOf(String(placePoints(1,20,1)))>=0 && guideDfb.indexOf(String(ANSEHEN.dfb['2. Runde']))>=0 && guideDfb.indexOf('220')>=0 && guideDfb.indexOf(ansehenPts(ANSEHEN.supercup.title))>=0 && guideBl.indexOf('Landespokal')>=0);
  check('Bundesliga ohne Aufstiegsspalte, 2. Liga mit Aufstiegsplatz', guideBl.indexOf('Aufstiegsplatz')<0 && guideBl.indexOf('Abstieg −10 %')>=0 && guideL2.indexOf('Aufstiegsplatz +15 %')>=0 && guideL2.indexOf('<th>Aufstieg</th>')<0);
  check('Amateur zeigt nur den Aufsteiger', guideAm.indexOf('Aufsteiger')>=0 && guideAm.indexOf('>1<')<0 && guideAm.indexOf(ansehenPts(ANSEHEN.amateurUp))>=0);
  check('alle Landespokale stehen nebeneinander', BL_ORDER.every(bl=>guideLand.indexOf(bl)>=0) && guideLand.indexOf('Sieger gesamt')>=0 && guideLand.indexOf('land-matrix')>=0);
  const sortTab=S.ui.tab, sortLeague=S.ui.league, sortSec=S.ui.ansehenSec, sortId=S.ui.ansehenId;
  const rankText=table=>{
    const row=table.tBodies[0].rows[0];
    const cell=row.querySelector('td[data-rank]');
    return {now:row.querySelector('.rank-now').textContent, orig:cell.dataset.rank, paren:row.querySelector('.rank-orig')?row.querySelector('.rank-orig').textContent:'', klass:row.className};
  };
  S.ui.tab='tabelle'; S.ui.league='BL';
  render();
  const liga=document.querySelector('#tableCard table');
  const pl1=liga.querySelector('tr.z-meister');
  const pl1Class=pl1.className;
  check('Liga zeigt den Platz ohne Klammer', !liga.querySelector('.rank-orig') && liga.tBodies[0].rows[0].querySelector('.rank-now').textContent==='1');
  liga.querySelector('th[data-sort="an"]').click();
  const ligaSort=rankText(liga);
  check('Liga sortiert sichtbar ab 1', ligaSort.now==='1');
  check('Liga nennt den ursprünglichen Rang klein', ligaSort.orig==='1' || ligaSort.paren==='('+ligaSort.orig+')');
  check('Meisterfarbe bleibt am echten Platz 1', pl1.className===pl1Class && pl1.querySelector('td[data-rank]').dataset.rank==='1');
  liga.querySelector('th[data-sort="an"]').click();
  liga.querySelector('th[data-sort="an"]').click();
  check('Liga-Sortierung setzt auf den Tabellenrang zurück', !liga.querySelector('.rank-orig') && liga.tBodies[0].rows[0].querySelector('.rank-now').textContent==='1');
  S.ui.tab='ewig';
  render();
  const ewig=document.querySelector('#view table');
  check('Ewige Tabelle startet bei 1', ewig.tBodies[0].rows[0].querySelector('.rank-now').textContent==='1' && !ewig.querySelector('.rank-orig'));
  ewig.querySelector('th[data-sort="pkt"]').click();
  ewig.querySelector('th[data-sort="pkt"]').click();
  const ewigAsc=rankText(ewig);
  check('Ewige Tabelle aufsteigend zählt neu', ewigAsc.now==='1' && (ewigAsc.orig==='1' || ewigAsc.paren==='('+ewigAsc.orig+')'));
  ewig.querySelector('th[data-sort="pkt"]').click();
  check('Ewige Tabelle kehrt zum Punktestand zurück', !ewig.querySelector('.rank-orig') && ewig.tBodies[0].rows[0].querySelector('td[data-rank]').dataset.rank==='1');
  S.ui.tab='heimaus';
  render();
  const heim=document.querySelector('#view table');
  const heimTop=heim.querySelector('td[data-rank="1"]').closest('tr');
  const heimClass=heimTop.className;
  heim.querySelector('th[data-sort="pkt"]').click();
  check('Heimtabelle zählt die sichtbare Reihenfolge', rankText(heim).now==='1');
  check('Heimfarbe bleibt am Heimtabellenplatz', heimTop.className===heimClass && heimTop.querySelector('td[data-rank]').dataset.rank==='1');
  S.ui.tab='ansehen'; S.ui.ansehenSec='liste'; S.ui.ansehenId='';
  render();
  const an=document.querySelector('#ansehenList');
  check('Ansehen startet beim Gesamtrang', !an.querySelector('.rank-orig') && an.tBodies[0].rows[0].querySelector('.rank-now').textContent===an.tBodies[0].rows[0].querySelector('td[data-rank]').dataset.rank);
  an.querySelector('th[data-sort="titel"]').click();
  const anSort=rankText(an);
  check('Ansehen nach Titel zählt ab 1', anSort.now==='1' && (anSort.orig==='1' || anSort.paren==='('+anSort.orig+')'));
  an.querySelector('th[data-sort="titel"]').click();
  an.querySelector('th[data-sort="titel"]').click();
  check('Ansehen setzt den Gesamtrang zurück', !an.querySelector('.rank-orig') && an.tBodies[0].rows[0].querySelector('.rank-now').textContent===an.tBodies[0].rows[0].querySelector('td[data-rank]').dataset.rank);
  const search=document.querySelector('#ansehenSearch');
  search.value='nürnberg';
  search.dispatchEvent(new Event('input', {bubbles:true}));
  const shown=[...an.tBodies[0].rows].filter(r=>r.style.display!=='none' && !r.dataset.pin);
  check('Suche nummeriert nur sichtbare Vereine', shown.length>0 && shown.every((r,i)=>r.querySelector('.rank-now').textContent===String(i+1)) && shown.some(r=>r.querySelector('.rank-orig')));
  search.value='';
  search.dispatchEvent(new Event('input', {bubbles:true}));
  check('Leere Suche stellt den Gesamtrang wieder her', !an.querySelector('.rank-orig'));
  S.ui.tab=sortTab; S.ui.league=sortLeague; S.ui.ansehenSec=sortSec; S.ui.ansehenId=sortId;
  render();
  [16,17,18,19,20,22,38].forEach(n=>{
    const md=makeSchedule(n);
    const sh=seasonShape(n), half=sh.half;
    let self=false, twice=true, once=true, swapped=true;
    const meet={};
    md.forEach(round=>{
      const seen={};
      if (round.length!==sh.games) once=false;
      round.forEach(m=>{
        if (m[0]===m[1]) self=true;
        if (seen[m[0]]||seen[m[1]]){ self=true; once=false; }
        seen[m[0]]=seen[m[1]]=1;
        const k=m[0]<m[1]?m[0]+'|'+m[1]:m[1]+'|'+m[0];
        meet[k]=(meet[k]||0)+1;
      });
    });
    Object.keys(meet).forEach(k=>{ if(meet[k]!==2) twice=false; });
    for (let r=0;r<half;r++){
      const back={};
      md[r+half].forEach(m=>{ back[m[0]+'>'+m[1]]=1; });
      md[r].forEach(m=>{ if(!back[m[1]+'>'+m[0]]) swapped=false; });
    }
    const fixN=validateFixtures(md);
    check('Rückrunde spiegelt '+n, scheduleMirrorHolds(md) && md.length===sh.total && !self && twice && once && swapped && fixN.ok, 'len '+md.length+' '+(fixN.issues||[]).slice(0,3).join(','));
  });
  const rawRounds=bergerRounds(4);
  const base=rawRounds.map(ps=>ps.map(([h,a])=>[h,a,null,null])).concat(rawRounds.map(ps=>ps.map(([h,a])=>[a,h,null,null])));
  const broken=base.map(round=>round.map(m=>m.slice()));
  broken[3]=broken[0].map(m=>[m[0], m[1], null, null]);
  broken[0][0][2]=2; broken[0][0][3]=1;
  const hinFrozen=JSON.stringify(broken[0]);
  const openSeason={status:'running', leagues:{BL:{teams:['t001','t002','t003','t004'], md:broken}}, kickoffs:{}};
  const rep=repairOpenReturns(openSeason);
  check('offene Rückrunde wird gespiegelt', rep.fixed.indexOf('BL')>=0 && scheduleMirrorHolds(openSeason.leagues.BL.md) && JSON.stringify(openSeason.leagues.BL.md[0])===hinFrozen);
  const playedMd=base.map(round=>round.map(m=>m.slice()));
  playedMd[3]=playedMd[0].map(m=>[m[0], m[1], null, null]);
  playedMd[3][0][2]=1; playedMd[3][0][3]=0;
  const frozen=JSON.stringify(playedMd);
  const playedSeason={status:'running', leagues:{BL:{teams:['t001','t002','t003','t004'], md:playedMd}}};
  const repPlayed=repairOpenReturns(playedSeason);
  check('gespielte Rückrunde bleibt stehen', repPlayed.skipped.join(' ').indexOf('ergebnis')>=0 && JSON.stringify(playedSeason.leagues.BL.md)===frozen);
  const timed=base.map(round=>round.map(m=>m.slice()));
  timed[3]=timed[0].map(m=>[m[0], m[1], null, null]);
  const timedFrozen=JSON.stringify(timed);
  const timedSeason={status:'running', leagues:{BL:{teams:['t001','t002','t003','t004'], md:timed}}, kickoffs:{BL:{3:[{dow:'Sa',time:'15:30'}]}}};
  const repTimed=repairOpenReturns(timedSeason);
  check('gesetzte Rückrunden-Termine bleiben stehen', repTimed.skipped.join(' ').indexOf('termin')>=0 && JSON.stringify(timedSeason.leagues.BL.md)===timedFrozen);
  const doneSeason={status:'done', leagues:{BL:{teams:['t001','t002','t003','t004'], md:playedMd}}};
  const doneFrozen=JSON.stringify(playedMd);
  repairOpenReturns(doneSeason);
  check('abgeschlossene Saison wird nicht umgebaut', JSON.stringify(doneSeason.leagues.BL.md)===doneFrozen);
  const srcLg=cur().leagues.BL;
  if (srcLg && srcLg.md){
    const mdCopy=srcLg.md.map(round=>round.map(m=>m.slice()));
    const pairsBefore=JSON.stringify(mdCopy.map(round=>round.map(m=>[m[0],m[1]])));
    const fake={name:cur().name, status:'running', leagues:{BL:{teams:srcLg.teams.slice(), md:mdCopy}}, kickoffs:{}, markers:{}};
    try{ for (let g=0;g<40 && scheduleNextBlock(fake,'BL');g++){} }catch(e){}
    check('Terminieren lässt die Paarungen auf ihrem Spieltag', JSON.stringify(mdCopy.map(round=>round.map(m=>[m[0],m[1]])))===pairsBefore);
    const kept=JSON.stringify(fake.kickoffs.BL[0]||null);
    fake.kickoffs.BL[0]=[{dow:'Fr',time:'20:30',kind:'sentinel'}];
    const sentinel=JSON.stringify(fake.kickoffs.BL[0]);
    try{ scheduleNextBlock(fake,'BL'); }catch(e){}
    check('schon terminierter Spieltag bleibt stehen', JSON.stringify(fake.kickoffs.BL[0])===sentinel && JSON.stringify(fake.kickoffs.BL[0])!==kept);
  }
  ['L4','RLN'].forEach(lid=>{
    const lg=cur().leagues[lid];
    if (!lg||!lg.md) return;
    const mdCopy=lg.md.map(round=>round.map(m=>m.slice()));
    const before=JSON.stringify(mdCopy.map(round=>round.map(m=>[m[0],m[1]])));
    const fake={name:cur().name, status:'running', leagues:{[lid]:{teams:lg.teams.slice(), md:mdCopy}}, kickoffs:{}, markers:{}};
    try{ for (let g=0;g<50 && scheduleNextBlock(fake,lid);g++){} }catch(e){}
    check('Terminieren lässt die Paarungen in '+lid, JSON.stringify(mdCopy.map(round=>round.map(m=>[m[0],m[1]])))===before && scheduleMirrorHolds(mdCopy));
  });
  const blIds=cur().leagues.BL.teams.slice();
  const startSnap=powerSnapshot({leagues:{BL:{teams:blIds, md:cur().leagues.BL.md}}}, 'BL', 0);
  const anOrder=blIds.slice().sort((a,b)=>(ansehenValue(b)||0)-(ansehenValue(a)||0) || String(a).localeCompare(String(b)));
  const snapOrder=blIds.slice().sort((a,b)=>startSnap.rank[a]-startSnap.rank[b]);
  check('Saisonstart sortiert nach Ansehen, nicht nach Poolreihenfolge', snapOrder.join()===anOrder.join() && startSnap.info[blIds[0]].sport==null);
  const row=(id, sport, sp, sportPlace, ansehen)=>({id, sport, sp, sportPlace, ansehen, pkt:0, diff:0, tg:0, form:[], appeal:0, power:0});
  const early={info:{p:row('p',null,0,null,90), q:row('q',null,0,null,80), r:row('r',null,0,null,10)}, total:38, table:[], zones:{n:20,up:0,down:3,meister:1,cl:4,el:6,uecl:7}};
  const bothHigh=matchValue('p','q',early,0), oneHigh=matchValue('p','r',early,0);
  check('frühe Saison ohne Ergebnisse bevorzugt zwei hohe Ansehen', bothHigh.sport===0 && oneHigh.sport===0 && bothHigh.total>oneHigh.total, bothHigh.total+'/'+oneHigh.total);
  let amateurId='';
  POOLS.some(p=>((cur().pools[p.id])||[]).some(id=>{
    if (!amateurId && TEAMS[id] && !/Leipzig/i.test(TEAMS[id].name)) amateurId=id;
    return !!amateurId;
  }));
  let bayWins=0, amWins=0, draws=0;
  for (let i=0;i<500;i++){
    const home=simMatch('t001', amateurId), away=simMatch(amateurId, 't001');
    if (home[0]>home[1]) bayWins++; else if (home[0]<home[1]) amWins++; else draws++;
    if (away[0]>away[1]) amWins++; else if (away[0]<away[1]) bayWins++; else draws++;
  }
  check('Bayern gewinnt gegen einen Amateur etwa so oft wie umgekehrt', !!amateurId && Math.abs(bayWins-amWins)<=120 && bayWins>=250 && amWins>=250, bayWins+'/'+amWins+'/'+draws+' '+amateurId);
  let gHome=0, gAway=0, gDraw=0, gGoals=0;
  for (let i=0;i<1000;i++){
    const r=simMatch();
    gGoals+=r[0]+r[1];
    if (r[0]>r[1]) gHome++; else if (r[0]<r[1]) gAway++; else gDraw++;
  }
  check('tausend Spiele ohne Heimvorteil', Math.abs(gHome-gAway)<=120 && gHome>=250 && gAway>=250, gHome+'/'+gDraw+'/'+gAway+' '+(gGoals/2000).toFixed(3));
  let penL=0, penR=0;
  for (let i=0;i<400;i++){
    const p=simShootout();
    if (p[0]>p[1]) penL++; else penR++;
  }
  check('Elfmeterschießen bleibt ohne Seitenbias', penL>=120 && penR>=120 && Math.abs(penL-penR)<=90, penL+'/'+penR);
  clubModal('t001');
  const clubText=$('#modalBody').textContent||'';
  check('Vereinsinfo nennt das Bundesland ohne Rang und Schnitt', clubText.indexOf(TEAMS.t001.bl)>=0 && clubText.indexOf('Schnitt')<0 && clubText.indexOf('historische Rangliste')<0 && clubText.indexOf('Rang ') <0);
  $('#modal').classList.add('hidden');
  const relPts=[
    {season:'2015/16', ebene:2, n:18, pl:2, liga:'2. Bundesliga', y:pyramidScore(2,18,2)},
    {season:'2016/17', ebene:1, n:18, pl:17, liga:'Bundesliga', y:pyramidScore(1,18,17)},
    {season:'2017/18', ebene:2, n:18, pl:14, liga:'2. Bundesliga', y:pyramidScore(2,18,14)},
    {season:'2018/19', ebene:2, n:18, pl:6, liga:'2. Bundesliga', y:pyramidScore(2,18,6)}
  ];
  const relSvg=placementChart(relPts);
  const relDots=[...relSvg.matchAll(/class="dot([^"]*)"/g)].map(m=>m[1].trim());
  const relSegs=[...relSvg.matchAll(/class="seg([^"]*)"/g)].map(m=>m[1].trim());
  check('Abstieg färbt die 17 und die Linie danach, nicht die 14', relDots[1]==='down' && relSegs[1]==='down' && relDots[2]==='' && relSegs[0]==='up', relDots.join('|')+' / '+relSegs.join('|'));
  const rankHtml=viewAnsehen();
  check('Rangliste zeigt Liga, Pokale, Titel, Europa und Gesamt', rankHtml.indexOf('>Liga<')>=0 && rankHtml.indexOf('DFB-Pokal')>=0 && rankHtml.indexOf('Landespokal')>=0 && rankHtml.indexOf('>Titel<')>=0 && rankHtml.indexOf('Europa')>=0 && rankHtml.indexOf('Gesamt')>=0 && rankHtml.indexOf('class="bl"')>=0);
  const dfbReg=titleRegisterHTML('dfb');
  check('DFB-Siegerliste nennt Jahr und Sieger', dfbReg.indexOf('Jahr')>=0 && dfbReg.indexOf('Sieger')>=0 && dfbReg.indexOf('Finalist')<0 && dfbReg.indexOf('2026')>=0);
  const lok57=titleWinnerHTML(historicalTitleRows().find(r=>r.comp==='fdgb'&&r.year===1957));
  const frei=titleWinnerHTML(historicalTitleRows().find(r=>r.comp==='de'&&r.year===1907));
  const bay26=titleWinnerHTML(historicalTitleRows().find(r=>r.comp==='bl'&&r.year===2026));
  check('1957 nennt zuerst SC Lokomotive Leipzig und dann Lok', lok57.indexOf('SC Lokomotive Leipzig')>=0 && lok57.indexOf('SC Lokomotive Leipzig')<lok57.indexOf('1. FC Lokomotive Leipzig') && lok57.indexOf('heute')>=0);
  check('fehlender Verein bleibt nur der Name', frei.indexOf('Freiburger FC')>=0 && frei.indexOf('<img')<0);
  check('gleicher Name wird nicht doppelt genannt', bay26.indexOf('heute')<0 && bay26.indexOf('FC Bayern München')>=0 && bay26.indexOf('<img')>=0);
  const cupWas=S.ui.cup;
  S.ui.cup='Bayern';
  const landReg=viewCupWinners();
  S.ui.cup=cupWas;
  check('Landespokal behält Finalist oder die leere Liste', landReg.indexOf('Finalist')>=0 || landReg.indexOf('Noch kein entschiedenes Finale')>=0);
  const step=side=>'<span class="stepper"><button type="button">+</button><button type="button">−</button></span>';
  const host=document.createElement('div');
  host.style.cssText='position:absolute;left:0;top:0;width:760px;visibility:hidden';
  host.innerHTML=matchLineHTML({h:'t001', a:'t002', km:12, bl:true, ansehen:true, above:'<span class="hin-score"></span>', hin:true, step})
    +matchLineHTML({h:'t001', a:'t002', hg:11, ag:0, km:12, bl:true, ansehen:true, above:'<span class="hin-score">11:0</span>', hin:true, step})
    +matchLineHTML({h:'t001', a:'t002', km:12, bl:true, ansehen:true, above:'<span class="hin-score"></span>', hin:true})
    +matchLineHTML({h:'t001', a:'t002', hg:1, ag:0, cup:true, klass:'cup-spiel', above:'<span class="ie-slot"></span>', step, km:12})
    +matchLineHTML({h:'t001', a:'t002', hg:2, ag:1, et:true, cup:true, klass:'cup-spiel', above:'<span class="ie-box">n.V.</span>', step, km:12})
    +matchLineHTML({h:'t001', a:'t002', hg:1, ag:1, peh:5, pea:4, cup:true, klass:'cup-spiel', above:'<span class="ie-link ie-static">5:4 i.E.</span>', step, km:12});
  document.body.appendChild(host);
  const rows=host.querySelectorAll('.match');
  const lh=Math.round(rows[0].getBoundingClientRect().height), lh2=Math.round(rows[1].getBoundingClientRect().height), lh3=Math.round(rows[2].getBoundingClientRect().height);
  const ch=Math.round(rows[3].getBoundingClientRect().height), cn=Math.round(rows[4].getBoundingClientRect().height), ci=Math.round(rows[5].getBoundingClientRect().height);
  const r1=rows[0].querySelector('.km-line').getBoundingClientRect();
  const r2=rows[1].querySelector('.hin-score').getBoundingClientRect();
  check('Ligazeilen mit und ohne Hinspiel gleich hoch', lh>0 && lh===lh2 && lh===lh3, lh+'/'+lh2+'/'+lh3);
  check('Hinspiel liegt über dem eigenen Spielstand', r2.top>=r1.bottom-1 && r2.width>0);
  check('Pokalzeilen 90, n.V. und i.E. gleich hoch', ch>0 && ch===cn && ch===ci, ch+'/'+cn+'/'+ci);
  host.remove();
  check('Karte ist ein Ligarreiter', TABS.some(t=>t[0]==='karte'));
  const blMap=viewKarte(cur(),'BL');
  check('Bundesliga-Karte zeigt die Saison', blMap.indexOf('de-map')>=0 && blMap.indexOf('Bundesliga')>=0);
  const l5=LEAGUES.filter(l=>l.level===5)[0];
  const l5Map=viewKarte(cur(), l5.id);
  check('5.-Liga-Karte zeigt die Staffel', l5Map.indexOf('de-map')>=0 && l5Map.indexOf(l5.name)>=0);
  const rl=LEAGUES.filter(l=>l.level===6)[0];
  check('Regionalliga-Karte zeigt die Staffel', viewKarte(cur(), rl.id).indexOf(rl.name)>=0);
  const mapInside=html=>{
    if (html.indexOf('de-map')<0) return false;
    const marks=[...html.matchAll(/data-cx="([\d.-]+)" data-cy="([\d.-]+)"/g)];
    if (!marks.length || html.indexOf('<path')<0) return false;
    return marks.every(m=>{ const x=+m[1], y=+m[2]; return x>=0 && y>=0 && x<=760 && y<=820; });
  };
  check('jede Liga hat eine Karte', LEAGUES.every(l=>mapInside(viewKarte(cur(), l.id))));
  check('unbekanntes Bundesland fällt auf Deutschland zurück', mapInside(viewMap('Fallback', ['t001'], ['Kein Land'], 't:fallback')));
  const dfbIds=cupParticipantIds(cur().cups&&cur().cups.dfb);
  check('DFB-Karte nimmt das ganze Feld', viewMap('DFB-Pokal', dfbIds, null, 't:dfb').indexOf(dfbIds.length?'de-map':'keine Vereine')>=0);
  const landKey=Object.keys((cur().cups&&cur().cups.land)||{})[0];
  const landCup=landKey&&cur().cups.land[landKey];
  if (landCup) check('Landespokal-Karte nimmt das Feld', viewMap(landCup.name, cupParticipantIds(landCup), landCup.bl?[landCup.bl]:null, 't:land').indexOf('de-map')>=0 || viewMap(landCup.name, cupParticipantIds(landCup), null, 't:land2').indexOf('keine Vereine')>=0);
  check('leerer Wettbewerb bleibt leer', viewMap('Leer', [], null, 't:empty').indexOf('keine Vereine')>=0);
  const cupIds=cupParticipantIds({entrants:['t001','t001'], rounds:[{matches:[{h:'t002',a:'t001'}], byes:['t003']}]});
  check('Kartenteilnehmer ohne Doppelte', cupIds.length===3 && cupIds.indexOf('t001')>=0 && cupIds.indexOf('t003')>=0);
  const missingId=Object.keys(TEAMS).filter(id=>!coordOf(id))[0];
  if (missingId) check('fehlender Standort wird genannt', viewMap('Lücke', [missingId,'t001'], null, 't:gap').indexOf(TEAMS[missingId].name)>=0);
  const dfbHtml=viewPokal(cur(), cur().cups&&cur().cups.dfb, 'karte');
  check('DFB-Pokal hat den Kartenreiter', dfbHtml.indexOf('data-v="karte"')>=0 && (dfbHtml.indexOf('de-map')>=0 || dfbHtml.indexOf('keine Vereine')>=0));
  if (landCup){
    const landHtml=viewPokal(cur(), landCup, 'karte');
    check('Landespokal hat den Kartenreiter', landHtml.indexOf('data-v="karte"')>=0);
  }
  const scWas=S.ui.scView, tabWas=S.ui.tab, leagueWas=S.ui.league, amWas=S.ui.amateurView, secWas=S.ui.infoSec, idWas=S.ui.infoId;
  S.ui.scView='karte';
  renderSupercup();
  const scHtml=(document.querySelector('#view')||{}).innerHTML||'';
  check('Supercup hat keine Karte', scHtml.indexOf('data-v="karte"')<0 && scHtml.indexOf('de-map')<0 && scHtml.indexOf('data-v="rekorde"')>=0);
  S.ui.scView='rekorde';
  renderSupercup();
  const scRec=(document.querySelector('#view')||{}).innerHTML||'';
  check('Supercup-Rekorde wie der DFB-Pokal', scRec.indexOf('rec-table')>=0 && scRec.indexOf('Höchster Sieg')>=0 && scRec.indexOf('Rekordsieger')>=0 && scRec.indexOf('de-map')<0);
  S.ui.amateurView='karte';
  renderAmateur();
  check('Amateurstaffel-Karte', !!document.querySelector('#view .de-map') || (document.querySelector('#view')||{}).textContent.indexOf('keine Vereine')>=0);
  S.ui.amateurBl='Hamburg';
  renderAmateur();
  const hhMap=(document.querySelector('#view')||{}).innerHTML||'';
  check('Amateurkarte Hamburg nur Hamburg', hhMap.indexOf('Amateurliga Hamburg')>=0 && hhMap.indexOf('Schleswig-Holstein')<0 && hhMap.indexOf('Hamburg')>=0);
  S.ui.league='L5NO'; S.ui.tab='tabelle';
  renderMain();
  check('5. Liga hat keine Oberliga-Unterreiter', !document.querySelector('#tabs .ol-staffeln') && document.querySelector('#title').textContent==='5. Liga Nordost' && !!document.querySelector('#leagueNav a.nav-link.active[data-league="L5NO"]'));
  S.ui.league='OL';
  render();
  check('alter Oberliga-Eintrag öffnet die 5. Liga Nordost', S.ui.league==='L5NO' && document.querySelector('#title').textContent==='5. Liga Nordost');
  S.ui.cup='Sachsen'; S.ui.tab='pokal'; S.ui.cupView='sieger';
  const sachsen=viewCupWinners();
  check('Sachsenpokal-Siegerliste', sachsen.indexOf('Chemnitzer FC')>=0 && sachsen.indexOf('Historische Sieger')>=0 && sachsen.indexOf('ausgeschlossener Verein')<0);
  const blobs=[JSON.stringify(window.FR_OFFEN||{}), JSON.stringify(window.FR_SCHAU||{}), sachsen];
  BL_ORDER.forEach(bl=>{ S.ui.cup=bl; blobs.push(viewCupWinners()); });
  S.ui.cup=cupWas;
  check('Siegerlisten ohne gesperrten Vereinsnamen', blobs.every(b=>!blockedClubHit(b)));
  check('gesperrte Sachsenjahrgänge ohne Namen', ['1992/93','1993/94','1994/95','2004/05','2010/11','2012/13'].every(y=>sachsen.indexOf(y)>=0) && !blockedClubHit(sachsen));
  const gaps=cupGaps();
  check('jede Pokalsaison zwischen erster und letzter Austragung hat einen Eintrag', gaps.length===0, gaps.slice(0,4).join(' · '));
  const amMaps=POOLS.every(p=>{
    const ids=(cur().pools&&cur().pools[p.id])||[];
    const states=[p.bl];
    const html=viewMap(p.name, ids, states, 'am:'+p.id);
    return ids.length ? mapInside(html) : html.indexOf('keine Vereine')>=0;
  });
  check('jede Amateurstaffel hat eine Karte', amMaps);
  const span=walkResultStreaks([
    {id:'t001', lid:'BL', liga:'Bundesliga', res:'S', season:'2024/25', md:33},
    {id:'t001', lid:'BL', liga:'Bundesliga', res:'S', season:'2024/25', md:34},
    {id:'t001', lid:'BL', liga:'Bundesliga', res:'S', season:'2025/26', md:1}
  ]);
  check('Siegesserie geht über die Saison', span.S.length===1 && span.S[0].len===3 && span.S[0].startMd===33 && span.S[0].endMd===1 && span.S[0].startSeason==='2024/25');
  const cut=walkResultStreaks([
    {id:'t001', lid:'BL', liga:'Bundesliga', res:'S', season:'2024/25', md:34},
    {gap:true},
    {id:'t001', lid:'BL', liga:'Bundesliga', res:'S', season:'2025/26', md:1}
  ]);
  check('Lücke beendet die Siegesserie', cut.S.length===2 && cut.S.every(r=>r.len===1));
  S.ui.tab='info'; S.ui.infoId='t001'; S.ui.infoSec='rekorde';
  renderInfo();
  const infoHtml=(document.querySelector('#view')||{}).innerHTML||'';
  const recBtn=infoHtml.indexOf('data-v="rekorde"');
  const bilanzBtn=infoHtml.indexOf('data-v="bilanz"');
  check('Rekorde stehen rechts neben der Gesamtbilanz', recBtn>bilanzBtn && bilanzBtn>=0 && infoHtml.indexOf('Beste Platzierung')>=0 && infoHtml.indexOf('Pokale zählen nicht')<0 && infoHtml.indexOf('zuletzt')>=0 && infoHtml.indexOf('rec-table')>=0);
  const placeHits=[
    {season:'2030/31', liga:'2. Bundesliga', ebene:2, pl:5},
    {season:'2031/32', liga:'2. Bundesliga', ebene:2, pl:5},
    {season:'2032/33', liga:'3. Liga', ebene:3, pl:1},
    {season:'2022/23', liga:'Regionalliga Nord', ebene:6, pl:18},
    {season:'2024/25', liga:'Regionalliga Nord', ebene:6, pl:18},
    {season:'2021/22', liga:'3. Liga', ebene:3, pl:20}
  ];
  const bestPlace=pickPlace(placeHits, false);
  const worstPlace=pickPlace(placeHits, true);
  check('höhere Liga schlägt den Meister darunter', bestPlace && bestPlace.value===5 && bestPlace.level===2 && bestPlace.row.season==='2031/32' && bestPlace.n===2, bestPlace && (bestPlace.value+'. '+bestPlace.row.season+' ×'+bestPlace.n));
  check('niedrigste Liga und darin der schlechteste Platz', worstPlace && worstPlace.value===18 && worstPlace.level===6 && worstPlace.row.season==='2024/25' && worstPlace.n===2, worstPlace && (worstPlace.level+'/'+worstPlace.value+'. '+worstPlace.row.season));
  check('jüngstes Vorkommen nennt die Anzahl', latestWhen('2031/32', 2).indexOf('zuletzt 2031/32')>=0 && latestWhen('2031/32', 2).indexOf('2× erreicht')>=0 && latestWhen('2031/32', 1).indexOf('× erreicht')<0);
  const keptRecSeasons=S.seasons;
  try{
    S.seasons=[
      {name:'2090/91', status:'done', leagues:{BL:{teams:['t010','t011'], md:[[[0,1,1,0]],[[0,1,2,0]],[[0,1,0,1]]]}}, cups:{dfb:{rounds:[{matches:[{h:'t010',a:'t011',hg:8,ag:0}]}]}}},
      {name:'2092/93', status:'done', leagues:{BL:{teams:['t010','t011'], md:[[[0,1,3,0]],[[1,0,0,2]],[[0,1,0,1]]]}}}
    ];
    const bareStreak=clubLeagueStreaks('t010');
    const bareHtml=clubRecordHTML('t010');
    check('Serie zählt nur Ligaspiele', bareStreak.S.length===2 && bareStreak.S.every(r=>r.len===2) && bareHtml.indexOf('8:0')<0, bareStreak.S.map(r=>r.len+' '+r.endSeason+'/'+r.endMd).join(' · '));
    check('jüngste Serie und wie oft', bareHtml.indexOf('zuletzt 2092/93, 1. Spieltag – 2092/93, 2. Spieltag, 2× erreicht')>=0 && bareHtml.indexOf('Pokale')<0, bareHtml.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,500));
  }finally{ S.seasons=keptRecSeasons; }
  const before=ansehenValue('t001');
  const leaked=(ansehenLedger('t001').lines||[]).some(l=>l && l.label==='Supercup-Titel' && String(l.season)==='1987');
  check('historische Supercups ändern das Ansehen nicht', !leaked && ansehenValue('t001')===before);
  const titles=clubTitles('t001');
  check('historischer Supercup wird angezeigt', titles.some(t=>t.k==='Supercup' && String(t.y)==='1987'));
  const audit=schauAudit();
  check('Titelliste je Wettbewerb und Jahr eindeutig', audit.length===0, audit.slice(0,3).join(' · '));
  check('Energie Cottbus ist zugeordnet', schauRows().filter(r=>r.original==='Energie Cottbus' && r.land==='Brandenburg').length===10);
  check('Rot-Weiß Erfurt ist zugeordnet', schauRows().filter(r=>r.original==='FC Rot-Weiß Erfurt' && r.land==='Thüringen').length===9);
  check('Würzburger Kickers sind zugeordnet', schauRows().filter(r=>r.original==='Würzburger Kickers' && r.land==='Bayern').length===4);
  check('nackte Jahreszahl ist das Endjahr', schauRows().filter(r=>/^\d{4}$/.test(String(r.season))).every(r=>+r.season===r.year));
  const sc25=schauRows().find(r=>r && r.comp==='sc' && r.year===2025);
  const sc26=schauRows().find(r=>r && r.comp==='sc' && r.year===2026);
  check('Supercup 2025 und 2026 auswärts', sc25 && sc25.home==='t007' && sc25.away==='t001' && sc25.hg===1 && sc25.ag===2 && sc26 && sc26.home==='t002' && sc26.away==='t001' && sc26.hg===1 && sc26.ag===2);
  const amRec=clubRecordHTML('t697');
  check('Amateur ohne Listenplatz', amRec.indexOf('605')<0 && amRec.indexOf('keine Tabellendaten')>=0 && amRec.indexOf('Amateurstaffel')>=0);
  const liveStreak=walkResultStreaks([{id:'t001', lid:'BL', liga:'Bundesliga', res:'S', season:'2028/29', md:4}], '2028/29');
  check('laufende Serie', liveStreak.S[0] && liveStreak.S[0].live===true);
  const doneStreak=walkResultStreaks([{id:'t001', lid:'BL', liga:'Bundesliga', res:'S', season:'2026/27', md:4}], '');
  check('beendete Serie bleibt zu', doneStreak.S[0] && !doneStreak.S[0].live);
  check('DFB-Pokal 2022 und 2023 bleiben draußen', !historicalTitleRows().some(r=>r && r.comp==='dfb' && (r.year===2022 || r.year===2023)) && !schauRows().some(r=>r && r.comp==='dfb'));
  check('Ligarekorde sind eine Tabelle', viewRekorde('BL').indexOf('rec-table')>=0 && viewRekorde('BL').indexOf('rec-board')<0);
  check('Pokalrekorde sind eine Tabelle', viewCupRekorde('dfb').indexOf('rec-table')>=0);
  S.ui.scView=scWas; S.ui.tab=tabWas; S.ui.league=leagueWas; S.ui.amateurView=amWas; S.ui.infoSec=secWas; S.ui.infoId=idWas;
  const sea=cur();
  const idsAt=(level, n)=>{
    const out=[];
    const take=list=>{ (list||[]).forEach(id=>{
      if (out.length>=n || !TEAMS[id]) return;
      const lid=clubLeagueId(sea, id);
      const lv=L[lid]?L[lid].level:(lid?7:null);
      if (lv===level) out.push(id);
    }); };
    Object.keys(sea.leagues||{}).forEach(lid=>take(sea.leagues[lid].teams));
    Object.keys(sea.pools||{}).forEach(pid=>take(sea.pools[pid]));
    return out;
  };
  const rounds=['1. Runde','Achtelfinale','Viertelfinale','Halbfinale','Finale'];
  const mixed=idsAt(3,6).concat(idsAt(5,8), idsAt(7,10));
  const small=idsAt(6,4).concat(idsAt(7,4));
  const bigS=landAnsehenScale(mixed, sea, rounds);
  const smallS=landAnsehenScale(small, sea, rounds);
  const shortS=landAnsehenScale(mixed, sea, ['Finale']);
  check('anderes Feld und andere Ligaverteilung ändern die Punkte', mixed.length>small.length && bigS.budget>smallS.budget && bigS.field>smallS.field && Object.keys(bigS.byLevel).length>=2);
  check('weniger Runden senken das Budget derselben Mannschaften', shortS.budget<bigS.budget);
  check('ein Freilos ist keine Extra-Runde', landRoundPoints(bigS, 'Freilos')===0);
  const floorCup=landAnsehenScale(idsAt(7, 4), sea, ['Halbfinale','Finale']);
  const floorRaw=(floorCup.field/8)*(1+ANSEHEN.land.roundK);
  check('kleiner Landespokal hebt Finale plus Titel auf 10', landWinnerTotal(floorRaw)<10 && landWinnerSum(floorCup)===10 && floorCup.budget===landBudgetForWinner(10), landWinnerSum(floorCup)+'/'+floorCup.budget);
  const ratio=floorCup.budget/cappedLandBudget(floorRaw);
  const half=landRoundPoints(floorCup, 'Halbfinale');
  check('die Runden steigen im selben Verhältnis', Math.abs(half-ansehenRound2(cappedLandBudget(floorRaw)*ratio*0.5))<0.02, half+'/'+ratio);
  check('historischer Landespokaltitel bleibt 0,78', landTitleOf(histLandScale())===0.78, String(landTitleOf(histLandScale())));
  const summed=ansehenRound2(rounds.reduce((a,name)=>a+landRoundPoints(bigS, name),0));
  check('die Finalpunkte sind nicht die Summe aller Runden', landRoundPoints(bigS, 'Finale')>0 && landRoundPoints(bigS, 'Finale')<summed);
  const ghost={name:'2099/00', cups:{land:{Saarland:{bl:'Saarland', kind:'land', name:'Saarlandpokal', ansehenScale:Object.assign({}, bigS), entrants:mixed.slice()}}}};
  S.seasons.push(ghost);
  const storedScale=landScaleOf('2099/00','Saarland');
  const punkte=landPointsHTML(ghost, ghost.cups.land.Saarland);
  S.seasons.pop();
  const finPts=landRoundPoints(storedScale, 'Finale');
  const sieger=ansehenRound2(finPts+(storedScale.title||0));
  check('die angezeigte Wertung ist die gespeicherte Skala', storedScale.budget===bigS.budget && punkte.indexOf(ansehenPts(finPts))>=0 && punkte.indexOf(ansehenPts(sieger))>=0 && punkte.indexOf('nicht die Summe')>=0 && punkte.indexOf('3. Liga')>=0);
  if (landCup && landCup.bl){
    const prevScale=landCup.ansehenScale;
    const live=landScaleOf(sea.name, landCup.bl);
    const liveHtml=viewPokal(sea, landCup, 'punkte');
    if (prevScale) landCup.ansehenScale=prevScale; else delete landCup.ansehenScale;
    if (!live.missing && live.rounds && live.rounds.length){
      const liveFin=landRoundPoints(live, live.rounds[live.rounds.length-1]);
      check('offener Landespokal zeigt die Ledger-Skala', liveHtml.indexOf('data-v="punkte"')>=0 && liveHtml.indexOf(ansehenPts(live.budget))>=0 && liveHtml.indexOf(ansehenPts(ansehenRound2(liveFin+(live.title||0))))>=0);
    } else check('fehlendes Feld wird nicht erfunden', liveHtml.indexOf('nicht')>=0);
  }
  const keptForGeo=S.seasons, keptViewGeo=S.view;
  try{
    let n=1;
    const take=count=>{ const ids=[]; for (let i=0;i<count;i++) ids.push('t'+String(n++).padStart(3,'0')); return ids; };
    const tableOf=(ids, pts)=>{ return ids.map((id,i)=>({id, pl:i+1, sp:30, s:0, u:0, n:0, tg:pts[i]||10, gt:5, pkt:pts[i]||10, form:[]})); };
    const leagues={};
    const addFixed=(id, count)=>{ const ids=take(count); leagues[id]={teams:ids, tables:{all:tableOf(ids, ids.map((_,i)=>90-i))}}; };
    addFixed('BL',20); addFixed('BL2',20); addFixed('L3',20); addFixed('L4',22);
    L5_IDS.forEach(id=>addFixed(id, 20));
    const rlPts={RLN:[90,80], RLO:[75,20], RLW:[74,19], RLS:[40,30]};
    RL_IDS.forEach(id=>{
      const ids=take(18);
      const pts=ids.map((_,i)=>rlPts[id][i]!=null?rlPts[id][i]:10-i);
      leagues[id]={teams:ids, tables:{all:tableOf(ids, pts)}, downN:4};
    });
    const pools={}; POOLS.forEach(p=>{ pools[p.id]=[]; });
    S.seasons=[{name:'2098/99', status:'done', geo:true, leagues, pools}];
    S.view=0;
    syncRelay(S.seasons[0]);
    simRelay(S.seasons[0]);
    const e=computeTransition(S.seasons[0]);
    const upFrom={}; RL_IDS.forEach(id=>upFrom[id]=0);
    e.moves.filter(m=>m.type==='auf' && RL_IDS.indexOf(m.from)>=0).forEach(m=>{ upFrom[m.from]++; });
    const counts=RL_IDS.map(id=>upFrom[id]);
    const l5From={}; L5_IDS.forEach(id=>l5From[id]=0);
    e.moves.filter(m=>m.type==='auf' && L5_IDS.indexOf(m.from)>=0).forEach(m=>{ l5From[m.from]++; });
    const l5Down={}; L5_IDS.forEach(id=>l5Down[id]=0);
    e.moves.filter(m=>m.type==='ab' && L5_IDS.indexOf(m.from)>=0).forEach(m=>{ l5Down[m.from]++; });
    const l5Counts=L5_IDS.map(id=>l5From[id]);
    const l5Ab=L5_IDS.map(id=>l5Down[id]);
    check('jede 5. Liga stellt genau zwei Aufsteiger', l5Counts.length===2 && l5Counts.every(x=>x===2), l5Counts.join(',')+' / '+l5Ab.join(','));
    L5_FEED.forEach(feed=>{
      const k=e.moves.filter(m=>m.type==='ab' && m.to===feed.id).length;
      const fromRl=e.moves.filter(m=>m.type==='auf' && m.to===feed.id && feed.rls.indexOf(m.from)>=0).length;
      const down=e.moves.filter(m=>m.type==='ab' && m.from===feed.id).length;
      const wantDown=Math.max(2, k), wantR=Math.max(2, 4-k);
      check(feed.id+' hält max(2, k) Absteiger und max(2, 4-k) Aufsteiger', fromRl===wantR && down===wantDown, 'k '+k+' aus RL '+fromRl+' ab '+down);
    });
    const one={name:'2090/91', status:'done', leagues:{RLN:{teams:['t010'], tables:{all:[{id:'t010',sp:10,s:6,u:2,n:2,tg:20,gt:10,pkt:20},{id:'t010',sp:10,s:6,u:2,n:2,tg:20,gt:10,pkt:20}]}}, RLS:{teams:['t010'], tables:{all:[{id:'t010',sp:8,s:4,u:0,n:4,tg:12,gt:12,pkt:12}]}}}};
    S.seasons=[one, {name:'2091/92', status:'done', leagues:{RLN:{teams:['t010'], tables:{all:[{id:'t010',sp:4,s:1,u:0,n:3,tg:4,gt:6,pkt:3}]}}}}];
    const ew=viewEwig('RLN');
    const ewS=viewEwig('RLS');
    check('Ewige Tabelle heißt die einzelne Staffel', ew.indexOf('<h3>Regionalliga Nord</h3>')>=0 && ew.indexOf('<h3>Regionalliga</h3>')<0);
    check('dieselbe Staffel zählt die doppelte Zeile nur einmal', ew.indexOf('>23<')>=0 && ew.indexOf('>14<')>=0 && ew.indexOf('>40<')<0);
    check('die andere Staffel bleibt eine eigene Tabelle', ewS.indexOf('<h3>Regionalliga Süd</h3>')>=0 && ewS.indexOf('>12<')>=0 && ewS.indexOf('>23<')<0 && ew.indexOf('>12<')<0);
  }finally{ S.seasons=keptForGeo; S.view=keptViewGeo; }
  const master=championRows(['bl','de'],'ddr');
  const y1963=master.find(r=>r.year===1963);
  const y1955=master.find(r=>r.year===1955);
  const y1903=master.find(r=>r.year===1903);
  check('1963 steht Dortmund neben Jena', !!(y1963 && y1963.left && y1963.left.original.indexOf('Dortmund')>=0 && y1963.right && y1963.right.original.indexOf('Jena')>=0));
  check('1955 ist Essen und Erfurt, ohne Übergangsrunde', !!(y1955 && y1955.left && y1955.left.original.indexOf('Essen')>=0 && y1955.right && y1955.right.original==='SC Turbine Erfurt'));
  check('1903 hat keinen DDR-Meister daneben', !!(y1903 && y1903.left && !y1903.right));
  check('1945 ist kein Meisterjahr', !master.some(r=>r.year===1945 || r.year===1904 || r.year===1922));
  const board=championBoardHTML(['bl','de'],'ddr','Bundesliga und deutsche Meisterschaft','DDR-Meister');
  check('1961/1962 steht in der Meisterliste', board.indexOf('1961/1962')>=0 && board.indexOf('DDR-Meister')>=0 && board.indexOf('08/09')<0);
  const cups=championRows(['dfb'],'fdgb');
  const y1957=cups.find(r=>r.year===1957);
  const histDfb=cups.filter(r=>r.left && r.left.map!=='simulation' && r.left.year<=1943);
  check('1957 steht Lok neben dem DFB-Jahr', !!(y1957 && y1957.right && y1957.right.id==='t084' && y1957.right.original==='SC Lokomotive Leipzig'));
  check('historische DFB-Jahre erfinden kein Finale', histDfb.length>0 && histDfb.every(r=>!r.left.finalist && !r.left.score));
  const hist=historicalTitleRows();
  const keys={};
  let dupKey=false;
  hist.forEach(r=>{ const k=r.comp+'|'+r.year; if (keys[k]) dupKey=true; keys[k]=1; });
  const badId=hist.filter(r=>r.id && !TEAMS[r.id]);
  const openId=hist.filter(r=>!r.id);
  check('276 Titel, jede ID gültig, fehlende Vereine leer', hist.length===276 && !dupKey && !badId.length && openId.length===5);
  check('1957 geht nicht an Chemie', !hist.some(r=>r.comp==='fdgb' && r.year===1957 && r.id==='t139'));
  const kiel=hist.find(r=>r.comp==='de' && r.year===1912);
  const dessau=hist.find(r=>r.comp==='fdgb' && r.year===1949);
  const thale=hist.find(r=>r.comp==='fdgb' && r.year===1950);
  const dresdenLiga=hist.find(r=>r.comp==='ddr' && r.year===1990);
  const dresdenPokal=hist.find(r=>r.comp==='fdgb' && r.year===1990);
  const erfurt=hist.find(r=>r.comp==='ddr' && r.year===1954);
  const vorwaerts=hist.find(r=>r.comp==='fdgb' && r.year===1954);
  check('1912 heißt FV Holstein Kiel und bleibt Holstein', !!(kiel && kiel.original==='FV Holstein Kiel' && kiel.id==='t039' && kiel.map==='supported_merger'));
  check('1949 heißt Waggonfabrik und bleibt Dessau', !!(dessau && dessau.original==='BSG Waggonfabrik Dessau' && dessau.id==='t497' && dessau.note.indexOf('Waggonbau')>=0));
  check('1950 behält den Listennamen und Stahl Thale', !!(thale && thale.original==='BSG EHW Thale' && thale.id==='t552'));
  check('1990 trennt SG und 1. FC Dynamo Dresden', !!(dresdenLiga && dresdenLiga.original==='SG Dynamo Dresden' && dresdenPokal && dresdenPokal.original==='1. FC Dynamo Dresden' && dresdenLiga.id==='t037' && dresdenPokal.id==='t037'));
  check('1954 bleibt BSG Turbine Erfurt und ZSK Vorwärts', !!(erfurt && erfurt.original==='BSG Turbine Erfurt' && erfurt.id==='t053' && vorwaerts && vorwaerts.original==='ZSK Vorwärts Berlin' && vorwaerts.id==='t492'));
  const uiWas=JSON.parse(JSON.stringify(S.ui)), viewWas=S.view;
  const len0=history.length, i0=navIndex;
  const match=cur().leagues.BL && cur().leagues.BL.md && cur().leagues.BL.md[0] && cur().leagues.BL.md[0][0];
  const scoreSnap=match?match.slice():null;
  S.ui.tab='abschluss';
  S.ui.cup='kein-pokal';
  S.ui.cupView='punkte';
  render();
  check('alte Reiter werden vor dem Verlauf normalisiert', S.ui.tab==='aufab' && history.length===len0 && navIndex===i0);
  render();
  check('ein zweiter Render nach der Normalisierung bleibt stehen', history.length===len0 && navIndex===i0);
  S.ui.tab='derbys';
  render();
  check('Derbys landen auf der Tabelle', S.ui.tab==='tabelle' && history.length===len0);
  ['RLN','L5NO'].forEach(lid=>{
    S.ui.league=lid;
    S.ui.tab='einteilung';
    render();
    const active=document.querySelector('#tabs .tab.active');
    check(lid+' mit entferntem Reiter zeigt die Tabelle', S.ui.tab==='tabelle' && active && active.dataset.tab==='tabelle' && !!document.querySelector('#tableCard') && document.querySelector('#title').textContent===L[lid].name && history.length===len0 && navIndex===i0);
  });
  S.ui.league='RLS';
  S.ui.tab='weg';
  render();
  check('jeder unbekannte Ligareiter wird Tabelle', S.ui.tab==='tabelle' && document.querySelector('#tabs .tab.active').dataset.tab==='tabelle' && !!document.querySelector('#tableCard'));
  document.querySelector('#tabs [data-tab="karte"]').click();
  check('Klick auf Karte bleibt Karte', S.ui.tab==='karte' && document.querySelector('#tabs .tab.active').dataset.tab==='karte' && !document.querySelector('#tableCard'));
  document.querySelector('[data-league="L5SW"]').click();
  check('5.-Liga-Wechsel bleibt auf der Karte', S.ui.league==='L5SW' && S.ui.tab==='karte' && document.querySelector('#title').textContent==='5. Liga Südwest' && document.querySelector('#tabs .tab.active').dataset.tab==='karte');
  document.querySelector('[data-tab="pokal"]').click();
  check('Pokal aus der Liga bleibt Pokal', S.ui.tab==='pokal' && document.querySelector('#title').textContent.indexOf('Pokal')>=0);
  document.querySelector('[data-league="RLW"]').click();
  check('Regionalliga aus dem Pokal zeigt die Tabelle', S.ui.league==='RLW' && S.ui.tab==='tabelle' && document.querySelector('#tabs .tab.active').dataset.tab==='tabelle' && !!document.querySelector('#tableCard') && history.length===len0 && navIndex===i0);
  S.ui.tab='pokal';
  render();
  check('ungültige Wertung wird Spielplan, ohne neuen Verlauf', S.ui.cup==='dfb' && S.ui.cupView==='spiele' && history.length===len0 && navIndex===i0);
  const pokalSnap=navState();
  render();
  check('der normalisierte Pokal bleibt beim nächsten Render gleich', navState()===pokalSnap && history.length===len0);
  if (match){ match[2]=match[2]==null?1:match[2]+1; render(); }
  check('ein Tor erzeugt keinen Verlaufseintrag', history.length===len0 && navIndex===i0);
  if (match && scoreSnap){ match[2]=scoreSnap[2]; match[3]=scoreSnap[3]; render(); }
  check('null bleibt null', JSON.parse(navState()).ansehenId===null || S.ui.ansehenId!=null);
  const idKeep=S.ui.ansehenId;
  S.ui.ansehenId=null;
  const nullSnap=navState();
  S.ui.ansehenId='t001';
  navApply(nullSnap);
  check('eine leere Vereinswahl wird nicht zum Text', S.ui.ansehenId===null && JSON.parse(nullSnap).ansehenId===null);
  S.ui.ansehenLiga='BL2'; S.ui.ansehenBl='Bayern'; S.ui.allPools=true; S.ui.infoOpp='t002';
  const filterSnap=navState();
  S.ui.ansehenLiga=null; S.ui.ansehenBl=null; S.ui.allPools=false; S.ui.infoOpp=null;
  navApply(filterSnap);
  check('Ligafilter, Landesfilter und Vergleich bleiben erhalten', S.ui.ansehenLiga==='BL2' && S.ui.ansehenBl==='Bayern' && S.ui.allPools===true && S.ui.infoOpp==='t002');
  S.ui.ansehenId=idKeep;
  let probe=navMute, thrown=false;
  try{ navMute++; throw new Error('nav'); }
  catch(e){ thrown=true; }
  finally{ navMute--; }
  check('eine Testausnahme gibt die Aufzeichnung zurück', thrown && navMute===probe);
  Object.keys(S.ui).forEach(k=>{ if (!(k in uiWas)) delete S.ui[k]; });
  Object.assign(S.ui, uiWas);
  S.view=viewWas;
  if (match && scoreSnap){ match[0]=scoreSnap[0]; match[1]=scoreSnap[1]; match[2]=scoreSnap[2]; match[3]=scoreSnap[3]; }
  render();
  return {ok:!fails.length, fails, bl:squads.leagues.BL.slice(0,5).map(id=>TEAMS[id].name), sizes, regionBad};
}
function navWaitPop(){
  return new Promise(resolve=>{
    const timer=setTimeout(()=>resolve('timeout'), 1200);
    const fn=()=>{ clearTimeout(timer); window.removeEventListener('popstate', fn); resolve('pop'); };
    window.addEventListener('popstate', fn);
  });
}
async function navEventSelfTest(){
  const fails=[];
  const check=(name, ok, extra)=>{ if(!ok) fails.push(name+(extra?' · '+extra:'')); };
  const savedState=history.state;
  const savedUI=JSON.parse(JSON.stringify(S.ui));
  const savedView=S.view;
  const savedIndex=navIndex, savedMax=navMax;
  const match=cur().leagues.BL && cur().leagues.BL.md && cur().leagues.BL.md[0] && cur().leagues.BL.md[0][0];
  const score=match?match.slice():null;
  const baseIndex=navIndex;
  let guard=null;
  try{
    navMute=0;
    S.ui.league='BL';
    S.ui.tab='tabelle';
    S.ui.ansehenId=null;
    render();
    S.ui.tab='historie';
    render();
    S.ui.tab='ansehen';
    S.ui.ansehenSec='liste';
    S.ui.ansehenLiga='BL';
    S.ui.ansehenBl='Bayern';
    S.ui.ansehenId=null;
    render();
    const atList=navIndex;
    check('drei Ansichten liegen im Browserverlauf', atList>=baseIndex+2 && history.state && history.state.fr && JSON.parse(history.state.fr).tab==='ansehen' && JSON.parse(history.state.fr).ansehenLiga==='BL');
    let pop=navWaitPop();
    document.getElementById('navBack').click();
    check('der App-Pfeil löst genau einen Browser-Zurück aus', await pop==='pop' && S.ui.tab==='historie' && navIndex===atList-1);
    pop=navWaitPop();
    history.back();
    check('natives Zurück geht eine Ansicht zurück', await pop==='pop' && S.ui.tab==='tabelle' && navIndex===atList-2);
    const lenAtTable=history.length;
    const iAtTable=navIndex;
    check('Vorwärts ist nach dem Zurück offen', !document.getElementById('navFwd').disabled);
    if (match) match[2]=match[2]==null?1:match[2]+1;
    render();
    check('ein Tor löscht den Vorwärtspfad nicht', navIndex===iAtTable && history.length===lenAtTable && !document.getElementById('navFwd').disabled);
    if (match && score) check('das Tor bleibt der Spielstand und kein Verlauf', match[2]===(score[2]==null?1:score[2]+1));
    pop=navWaitPop();
    document.getElementById('navFwd').click();
    check('Vorwärts nach dem Tor öffnet die Historie', await pop==='pop' && S.ui.tab==='historie' && navIndex===iAtTable+1);
    const beforeKey=navIndex;
    pop=navWaitPop();
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft', altKey:true, bubbles:true}));
    await pop;
    await new Promise(r=>setTimeout(r,80));
    check('Alt+Links geht genau einen Schritt', navIndex===beforeKey-1 && S.ui.tab==='tabelle');
    pop=navWaitPop();
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight', altKey:true, bubbles:true}));
    check('Alt+Rechts geht genau einen Schritt', await pop==='pop' && navIndex===beforeKey && S.ui.tab==='historie');
    pop=navWaitPop();
    history.forward();
    check('natives Vorwärts öffnet Ansehen mit dem Filter', await pop==='pop' && S.ui.tab==='ansehen' && S.ui.ansehenLiga==='BL' && S.ui.ansehenBl==='Bayern' && S.ui.ansehenId===null);
    S.ui.infoId='t001';
    S.ui.tab='info';
    render();
    check('eine neue Ansicht schneidet Vorwärts ab', document.getElementById('navFwd').disabled && navIndex===navMax && S.ui.tab==='info' && S.ui.infoId==='t001');
    const realBack=history.back;
    let calls=0;
    history.back=()=>{ calls++; };
    const held=navIndex;
    navIndex=0;
    navPaint();
    document.getElementById('navBack').click();
    check('der App-Pfeil am Anfang verlässt die App nicht', calls===0 && document.getElementById('navBack').disabled);
    history.back=realBack;
    navIndex=held;
    navPaint();
    guard={calls};
  }finally{
    if (match && score){ match[0]=score[0]; match[1]=score[1]; match[2]=score[2]; match[3]=score[3]; }
    const backBy=Math.max(0, navIndex-baseIndex);
    if (backBy){
      const pop=navWaitPop();
      history.go(-backBy);
      await pop;
    }
    navMute++;
    S.view=savedView;
    Object.keys(S.ui).forEach(k=>{ if (!(k in savedUI)) delete S.ui[k]; });
    Object.assign(S.ui, savedUI);
    render();
    navMute--;
    navIndex=savedIndex;
    navMax=savedMax;
    if (savedState) history.replaceState(savedState, '', location.href);
    navPaint();
  }
  return {ok:!fails.length, fails, guard};
}
try{ localStorage.removeItem('fr-bright'); }catch(e){}
function boot(){
  let ls=null;
  try { ls=parseSave(localStorage.getItem(KEY)); } catch(e){ ls=null; }
  const finish=(data, empty)=>{ if (data && !structureOk(data)) adopt(newGame(), false); else adopt(data, empty); };
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

function terminSelfTest(){
  const fails=[];
  const check=(name, ok, extra)=>{ if(!ok) fails.push(name+(extra?' · '+extra:'')); };
  const phaseAt=(total, md)=>phaseWeights(total, md-1);
  [[38,[[1,4,0.6,0.4],[5,8,0.4,0.6],[9,12,0.3,0.7],[13,38,0.25,0.75]]],[42,[[1,4,0.6,0.4],[5,9,0.4,0.6],[10,13,0.3,0.7],[14,42,0.25,0.75]]],[34,[[1,4,0.6,0.4],[5,7,0.4,0.6],[8,11,0.3,0.7],[12,34,0.25,0.75]]]].forEach(([total, bands])=>{
    bands.forEach(([a,b,h,s])=>{
      for (let md=a; md<=b; md++){
        const p=phaseAt(total, md);
        if (p.h!==h || p.s!==s) fails.push('Phase '+total+' Spieltag '+md+' ist '+p.h+'/'+p.s);
      }
    });
  });
  check('Phasen 34, 38 und 42', !fails.some(f=>f.indexOf('Phase ')===0));
  const blZones={n:20, up:0, down:3, meister:1, cl:4, el:6, uecl:7};
  const ladder=[];
  for (let pl=1; pl<=20; pl++) ladder.push({pl, pkt:90-pl*3, sp:34, id:'p'+pl});
  ladder[16].pkt=31; ladder[17].pkt=30;
  const row=r=>({id:r.id, sportPlace:r.pl, pkt:r.pkt, sp:34, ansehen:50, form:[]});
  const late={info:{}, total:38, table:ladder, zones:blZones};
  ladder.forEach(r=>{ late.info[r.id]=row(r); });
  const duel=matchValue('p17','p18', late, 35);
  const champ=matchValue('p1','p12', late, 35);
  const mid=matchValue('p9','p10', late, 35);
  check('Abstiegsduell am vorletzten regulären Spieltag schlägt 1 gegen 12', duel.total>champ.total && duel.sport>champ.sport, duel.total+'/'+champ.total);
  check('enges gesichertes Mittelfeld bleibt niedrig', mid.sport<duel.sport && mid.sport<25, String(mid.sport));
  check('Abstiegsduell benennt dieselbe Zielzone', duel.note.indexOf('Abstieg')>=0 && champ.note.indexOf('kein gemeinsamer Zielkampf')>=0, duel.note+' | '+champ.note);
  const earlyFight=matchValue('p17','p18', late, 3);
  check('derselbe Kampf spät wiegt mehr als früh', duel.sport>earlyFight.sport, earlyFight.sport+'/'+duel.sport);
  const decidedInfo={};
  const decidedTable=ladder.map(r=>({pl:r.pl, pkt:r.pl===1?90:r.pl===2?40:r.pkt, sp:34, id:r.id}));
  decidedTable.forEach(r=>{ decidedInfo[r.id]={id:r.id, sportPlace:r.pl, pkt:r.pkt, sp:34, ansehen:50, sport:sportSignal(r.pkt, 34), form:[]}; });
  const decidedSnap={info:decidedInfo, total:38, table:decidedTable, zones:blZones};
  const decided=matchValue('p1','p2', decidedSnap, 35);
  check('entschiedene Meisterschaft erzeugt keinen Druck', decided.sport===0, String(decided.sport));
  const downInfo={};
  const downTable=ladder.map(r=>({pl:r.pl, pkt:r.pl>=18?10:60, sp:34, id:r.id}));
  downTable.forEach(r=>{ downInfo[r.id]={id:r.id, sportPlace:r.pl, pkt:r.pkt, sp:34, ansehen:50, sport:sportSignal(r.pkt, 34), form:[]}; });
  const downSnap={info:downInfo, total:38, table:downTable, zones:blZones};
  const downGone=matchValue('p17','p18', downSnap, 35);
  check('entschiedener Abstieg erzeugt keinen Druck', downGone.sport===0, String(downGone.sport));
  const fightSnap=(sp, pktA, pktB)=>{
    const table=[{pl:17, pkt:pktA, sp, id:'a'},{pl:18, pkt:pktB, sp, id:'b'}];
    const info={a:{id:'a', sportPlace:17, pkt:pktA, sp, ansehen:50, sport:sportSignal(pktA, sp), form:[]}, b:{id:'b', sportPlace:18, pkt:pktB, sp, ansehen:50, sport:sportSignal(pktB, sp), form:[]}};
    return {info, total:38, table, zones:{n:20, up:0, down:3, meister:1}};
  };
  const many=matchValue('a','b', fightSnap(10, 25, 24), 20);
  const few=matchValue('a','b', fightSnap(2, 5, 4), 20);
  const weak=matchValue('a','b', fightSnap(10, 8, 7), 20);
  check('mehr gespielte Spiele wiegen im selben Abstiegskampf mehr', many.sport>few.sport, many.sport+'/'+few.sport);
  check('höhere Punktequote wiegt bei gleicher Spielzahl mehr', many.sport>weak.sport, many.sport+'/'+weak.sport);
  ['BL','BL2','L3','L4','RLN','L5NO'].forEach(lid=>{
    const spec=L[lid];
    const mini={name:'2099/00', leagues:{[lid]:{teams:[], md:[]}}};
    if (spec.level>=5) mini.leagues.L4={teams:[], md:[]};
    const z=zoneProfile(mini, lid, 0);
    if (z.meister!==1) fails.push(lid+' Meisterzone fehlt');
  });
  check('Meisterzone in jeder Ligastufe', !fails.some(f=>f.indexOf('Meisterzone')>=0));
  const open={info:{tA:{id:'tA', sp:0, ansehen:80, sport:null}, tB:{id:'tB', sp:0, ansehen:20, sport:null}}, total:38, table:[], zones:blZones};
  const start=matchValue('tA','tB', open, 0);
  check('Saisonstart ohne Tabelle hat keinen Sportbonus', start.sport===0 && start.wh===0.6 && start.ws===0.4, start.sport+'/'+start.wh);
  const rowAn=(id, ansehen, sport, sp)=>({id, ansehen, sport, sp, pkt:sp?30:0, form:[]});
  const orderSnap=info=>({info});
  const frühIds=['t001','t919'];
  const früh=orderSnap({t001:rowAn('t001', 90, null, 0), t919:rowAn('t919', 12, null, 0)});
  const spät=orderSnap({t001:rowAn('t001', 90, 0.15, 20), t919:rowAn('t919', 12, 0.95, 20)});
  check('ohne Topspiel rückt das kleinere Ansehen früher nach', rankedIds(frühIds, früh)[0]==='t919' && firstTopTarget('t919', frühIds, 38, früh)<firstTopTarget('t001', frühIds, 38, früh));
  check('die Tabelle ändert die Nachrück-Reihe nicht', rankedIds(frühIds, spät).join()===rankedIds(frühIds, früh).join() && firstTopTarget('t919', frühIds, 38, spät)===firstTopTarget('t919', frühIds, 38, früh));
  const stichtag={raw:{t001:10, t919:80}, info:spät.info};
  check('Nachrücken liest das Ansehen zum Termin-Stichtag', rankedIds(frühIds, stichtag)[0]==='t001');
  const urgeLow=rescueUrge('t001', 0, 38, frühIds, stichtag), urgeHigh=rescueUrge('t919', 0, 38, frühIds, stichtag);
  check('frühes Nachrücken folgt nur dem Stichtags-Ansehen', firstTopTarget('t001', frühIds, 38, stichtag)>0 && urgeLow>urgeHigh, urgeLow+'/'+urgeHigh);
  const spitzeInfo={};
  ladder.forEach(r=>{ spitzeInfo[r.id]={id:r.id, sportPlace:r.pl, pkt:r.pkt, sp:34, ansehen:30, sport:sportSignal(r.pkt, 34), form:[]}; });
  const withAn=(a,b)=>Object.assign({}, spitzeInfo, {p1:Object.assign({}, spitzeInfo.p1, {ansehen:a}), p2:Object.assign({}, spitzeInfo.p2, {ansehen:b}), p10:Object.assign({}, spitzeInfo.p10, {ansehen:a}), p11:Object.assign({}, spitzeInfo.p11, {ansehen:b})});
  const topHigh=matchValue('p1','p2', {info:withAn(100, 96), total:38, table:ladder, zones:blZones}, 19);
  const topLow=matchValue('p1','p2', {info:withAn(6, 4), total:38, table:ladder, zones:blZones}, 19);
  const midHigh=matchValue('p10','p11', {info:withAn(100, 96), total:38, table:ladder, zones:blZones}, 19);
  check('Spitzenduell mit hohem Ansehen liegt vor niedrigem Ansehen und vor dem Mittelfeld', topHigh.total>topLow.total && topHigh.total>midHigh.total, topHigh.total+'/'+topLow.total+'/'+midHigh.total);
  const blCup=(cur().leagues.BL.teams||[]).slice().sort((a,b)=>(ansehenValue(b)||0)-(ansehenValue(a)||0) || String(a).localeCompare(String(b)));
  const cupSt=standingOf(cur());
  if (blCup.length>=4){
    const hi=cupAppeal(cupSt, blCup[0], blCup[1]);
    const lo=cupAppeal(cupSt, blCup[blCup.length-1], blCup[blCup.length-2]);
    check('Pokal-Anstoß bevorzugt höheres Ansehen derselben Ligahöhe', hi>lo, hi+'/'+lo);
  }
  const slots={BL:slotTemplate('BL'), BL2:slotTemplate('BL2'), L3:slotTemplate('L3'), L4:slotTemplate('L4'), L5NO:slotTemplate('L5NO'), RLN:slotTemplate('RLN')};
  const countKind=(list, kind)=>list.filter(s=>s.kind===kind).length;
  check('Bundesliga-Slots', slots.BL.length===10 && countKind(slots.BL,'top')===2 && slots.BL[0].dow==='Fr' && slots.BL[0].kind==='top' && slots.BL[7].kind==='top');
  check('2. Liga ohne Freitagstop', countKind(slots.BL2,'top')===1 && countKind(slots.BL2,'regional')===2 && slots.BL2[0].kind==='regional');
  check('3. und 4. Liga zwei gleichartige Topspiele', countKind(slots.L3,'top')===2 && countKind(slots.L4,'top')===2 && slots.L3[0].kind==='top' && slots.L3[6].kind==='top');
  check('3. und 4. Liga Sonntag 13:30 ist regional', slots.L3.some(s=>s.dow==='So'&&s.time==='13:30'&&s.kind==='regional') && slots.L4.some(s=>s.dow==='So'&&s.time==='13:30'&&s.kind==='regional') && countKind(slots.L3,'regional')===3 && countKind(slots.L4,'regional')===3);
  const sizeFail=[];
  for (let n=6; n<=38; n+=2){
    let md=null, err=null;
    try{ md=makeSchedule(n); }catch(e){ err=e; }
    const v=md?validateFixtures(md):null;
    if (err || !md || !scheduleMirrorHolds(md) || !v.ok) sizeFail.push(n+(err?':'+err.message:':'+(v&&v.issues||[]).slice(0,1).join('')));
  }
  check('gerade Felder 6 bis 38 spiegeln ohne Serie 3', sizeFail.length===0, sizeFail.slice(0,4).join(' | '));
  let four=null;
  try{ makeSchedule(4); }catch(e){ four=e; }
  check('vier Vereine sind unlösbar und werden nicht als Plan ausgegeben', !!(four && four.scheduleUnsolved && four.size===4), four?four.message:'Plan statt Fehler');
  check('4. Liga übernimmt die Anstöße der 3. Liga', slots.L4.length===slots.L3.length && slots.L4.every((s,i)=>s.dow===slots.L3[i].dow && s.time===slots.L3[i].time && s.kind===slots.L3[i].kind));
  check('5. Liga hat elf Anstöße im Muster der früheren 4. Liga', slots.L5NO.length===11 && countKind(slots.L5NO,'top')===2 && countKind(slots.L5NO,'regional')===3 && countKind(slots.L5NO,'konferenz')===6 && slots.L5NO[0].time==='19:00' && slots.L5NO.some(s=>s.dow==='Sa'&&s.time==='16:30'&&s.kind==='top'));
  check('Regionalliga ein Topspiel', countKind(slots.RLN,'top')===1 && countKind(slots.RLN,'konferenz')===8);
  const squad=buildInitialSquads();
  const prevRandom=Math.random;
  const seedRandom=seed=>{ let a=seed>>>0; Math.random=function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15, 1|a); t=t+Math.imul(t^t>>>7, 61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; };
  const tiedPen={h:'t001', a:'t002', hg:1, ag:1, peh:3, pea:3};
  check('gleiches Elfmeterschießen hat keinen Sieger', cupWinner(tiedPen)===null && cupWinner({h:'t001', a:'t002', hg:1, ag:1, peh:4, pea:3})==='t001');
  const stealTeams=squad.leagues.BL.slice();
  const oneDay=[]; for (let i=0;i<10;i++) oneDay.push([i*2, i*2+1]);
  const fullMd=[]; for (let d=0;d<38;d++) fullMd.push(oneDay.map(p=>p.slice()));
  const info={};
  stealTeams.forEach((id,i)=>{ info[id]={id, ansehen:i<4?95:8, sp:0, sport:null, form:[], pkt:0}; });
  const snapSteal={info, total:38, table:[], zones:{n:20, up:0, down:3, meister:1, cl:4, el:6, uecl:7}, at:30, ansehen:{}, rank:{}, form:{}};
  const baseCount=()=>{ const c={}; stealTeams.forEach(id=>{ c[id]={top:3, fr:2, sa:2, so:1, konferenz:16, frTop:1, saTop:1, regional:1, einzel:0, total:20, topSum:0, topN:0, regSum:0, regN:0}; }); return c; };
  const stealSeason={name:'2099/00', status:'running', leagues:{BL:{teams:stealTeams, md:fullMd}}, pools:{}, kickoffs:{}};
  const stealCounts=baseCount();
  stealCounts[stealTeams[4]].top=0;
  const stolen=assignMatchday(stealSeason, 'BL', 30, snapSteal, stealCounts);
  const topIs=stolen.map((s,i)=>s&&s.kind==='top'?i:-1).filter(i=>i>=0);
  check('ein schwaches Spiel ohne Topauftritt bekommt nicht das beste Topspiel', topIs.indexOf(0)>=0 && topIs.indexOf(1)>=0 && topIs.indexOf(2)<0, topIs.join(','));
  const nudgeSeason={name:'2099/00', status:'running', leagues:{BL:{teams:stealTeams, md:fullMd}}, pools:{}, kickoffs:{BL:{}}};
  for (let d=0; d<30; d++){
    const base=slotTemplate('BL');
    nudgeSeason.kickoffs.BL[d]=base.map((s,i)=>Object.assign({}, base[(i+d)%base.length], {kind:'konferenz'}));
  }
  const nudgeSlots=slotTemplate('BL').map(s=>Object.assign({}, s));
  const regionalPos=nudgeSlots.findIndex(s=>s.kind==='regional');
  const holdSlot=nudgeSlots[2]; nudgeSlots[2]=nudgeSlots[0]; nudgeSlots[0]=nudgeSlots[regionalPos]; nudgeSlots[regionalPos]=holdSlot;
  nudgeSeason.kickoffs.BL[30]=nudgeSlots;
  nudgeNonExactBlock(nudgeSeason, 'BL', 30, 30, snapSteal);
  const nudgedTops=nudgeSeason.kickoffs.BL[30].map((s,i)=>s&&s.kind==='top'?i:-1).filter(i=>i>=0);
  check('Nudge holt das schwache Topspiel auf das starke freie Spiel', nudgeSeason.kickoffs.BL[30][0].kind==='top' && nudgeSeason.kickoffs.BL[30][2].kind!=='top', nudgedTops.join(','));
  const balCounts=baseCount();
  stealTeams.forEach(id=>{ balCounts[id].frTop=2; balCounts[id].saTop=2; info[id].ansehen=50; });
  balCounts[stealTeams[0]].frTop=6; balCounts[stealTeams[0]].saTop=0;
  balCounts[stealTeams[1]].frTop=6; balCounts[stealTeams[1]].saTop=0;
  balCounts[stealTeams[2]].frTop=0; balCounts[stealTeams[2]].saTop=6;
  balCounts[stealTeams[3]].frTop=0; balCounts[stealTeams[3]].saTop=6;
  const balBefore=JSON.parse(JSON.stringify(balCounts));
  const balanced=assignMatchday(stealSeason, 'BL', 30, snapSteal, balCounts);
  const frI=balanced.findIndex(s=>s&&s.kind==='top'&&s.dow==='Fr'), saI=balanced.findIndex(s=>s&&s.kind==='top'&&s.dow==='Sa');
  const hypo=swap=>{
    const map={};
    const add=(idx, fr, sa)=>{ [stealTeams[oneDay[idx][0]], stealTeams[oneDay[idx][1]]].forEach(id=>{ if(!map[id]) map[id]={fr:balBefore[id].frTop, sa:balBefore[id].saTop}; map[id].fr+=fr; map[id].sa+=sa; }); };
    add(frI, swap?0:1, swap?1:0); add(saI, swap?1:0, swap?0:1);
    let s=0; Object.keys(map).forEach(id=>{ s+=Math.abs(map[id].fr-map[id].sa); }); return s;
  };
  check('qualitätsgleicher Freitag-Samstag-Tausch senkt die Vereinsdifferenz', frI>=0 && saI>=0 && hypo(false)<=hypo(true), hypo(false)+'/'+hypo(true));
  const bad={name:'2099/00', leagues:{BL:{teams:stealTeams, md:fullMd}}, kickoffs:{BL:{}}};
  for (let d=0; d<=30; d++) bad.kickoffs.BL[d]=slotTemplate('BL').map(s=>Object.assign({}, s, {kind:s.kind==='konferenz'&&d<30?'x':s.kind}));
  const badBefore=JSON.stringify(bad.kickoffs.BL);
  const repaired=repairBlockConference(bad, 'BL', 30, 30, snapSteal);
  check('unlösbare Konferenz im offenen Block bleibt falsch und ändert nichts', repaired===false && JSON.stringify(bad.kickoffs.BL)===badBefore);
  const cupSea=at=>{
    const md=fullMd.map(d=>d.map(p=>[p[0], p[1], null, null]));
    md[0][0]=[0, 1, 3, 0];
    const match={h:stealTeams[0], a:stealTeams[19], hg:1, ag:0, peh:null, pea:null};
    if (at!=null) match.at=at;
    return {name:'2099/00', leagues:{BL:{teams:stealTeams, md}}, cups:{dfb:{entrants:[stealTeams[0], stealTeams[19]], rounds:[{name:'Finale', matches:[match]}]}}};
  };
  check('ein Pokal vor dem Block kann Platz 8 öffnen', eighthKnown(cupSea(0), 1)===true);
  check('ein späteres Pokalergebnis öffnet Platz 8 nicht', eighthKnown(cupSea(5), 1)===false);
  check('ein Pokal ohne Zeitpunkt zählt nicht als bekannt', eighthKnown(cupSea(null), 1)===false);
  const penSea=cupSea(0);
  penSea.cups.dfb.rounds[0].matches[0].hg=1; penSea.cups.dfb.rounds[0].matches[0].ag=1; penSea.cups.dfb.rounds[0].matches[0].peh=3; penSea.cups.dfb.rounds[0].matches[0].pea=3;
  check('3:3 im Elfmeterschießen entfernt niemanden', eighthKnown(penSea, 1)===false);
  const cupProd=(()=>{
    const prevHold=saveHold; saveHold=1;
    const keep={seasons:S.seasons, view:S.view, tab:S.ui.tab, league:S.ui.league};
    try{
      seedRandom(17);
      const teams=squad.leagues.BL.slice();
      const md=makeSchedule(teams.length);
      Math.random=prevRandom;
      const other=md[0].find(m=>m[0]!==0 && m[1]!==0);
      const b=other[0]===0?other[1]:other[0];
      const season={name:'2099/00', status:'running', leagues:{BL:{teams, md}}, pools:{}, kickoffs:{}, cups:{dfb:{kind:'dfb', id:'dfb', entrants:[teams[0], teams[b]], rounds:[{name:'Finale', drawn:true, matches:[cupMatch(teams[0], teams[b], true)]}]}}};
      S.seasons=(S.seasons||[]).concat([season]);
      S.view=S.seasons.length-1;
      S.ui.tab='pokal'; S.ui.league='BL'; S.ui.cup='dfb';
      const first=scheduleNextBlock(season, 'BL');
      if (!first) return 'kein erster Block';
      md[first[0]].forEach(m=>{
        if (m[0]===0 || m[0]===b){ m[2]=3; m[3]=0; }
        else if (m[1]===0 || m[1]===b){ m[2]=0; m[3]=3; }
        else { m[2]=0; m[3]=0; }
      });
      const frozen=JSON.parse(JSON.stringify(season.kickoffs.BL));
      mutateCup('dfb', 0, 0, m=>{ m.hg=2; m.ag=0; });
      const decided=season.cups.dfb.rounds[0].matches[0];
      if (decided.at!==lastScheduled(season, 'BL')) return 'at '+decided.at;
      if (cupWinner(decided)!==teams[0]) return 'sieger';
      const next=scheduleNextBlock(season, 'BL');
      if (!next || next[0]<=first[1]) return 'kein neuer Block';
      if (!Object.keys(frozen).every(k=>JSON.stringify(frozen[k])===JSON.stringify(season.kickoffs.BL[k]))) return 'alter Block geändert';
      if (season.termSnap.BL[next[0]].zones.uecl!==8) return 'platz8 '+season.termSnap.BL[next[0]].zones.uecl;
      const round=unpackMatch(packMatch(decided));
      if (round.at!==decided.at || cupWinner(round)!==teams[0]) return 'packMatch';
      const disk=JSON.parse(JSON.stringify(packForDisk({v:1, seasons:[season], view:0, chronicle:[], pokalRuns:[], ui:{}})));
      const loaded=unpackState(disk).seasons[0];
      const kept=loaded.cups.dfb.rounds[0].matches[0];
      if (kept.at!==decided.at) return 'speichern '+kept.at;
      if (eighthKnown(loaded, next[0])!==true) return 'nach dem Laden';
      const simSeasonCup={name:'2099/00', status:'running', leagues:{BL:{teams:teams.slice(), md:md.map(d=>d.map(m=>m.slice()))}}, pools:{}, kickoffs:{}, cups:{dfb:{kind:'dfb', entrants:[teams[0], teams[b]], rounds:[{name:'Finale', drawn:true, matches:[cupMatch(teams[0], teams[b], true)]}]}}};
      simSeasonCup.leagues.BL.md.forEach((d,i)=>{ if (i>first[1]) return; d.forEach((m,k)=>{ m[2]=md[i][k][2]; m[3]=md[i][k][3]; }); });
      Object.keys(frozen).forEach(k=>{ simSeasonCup.kickoffs.BL=simSeasonCup.kickoffs.BL||{}; simSeasonCup.kickoffs.BL[k]=JSON.parse(JSON.stringify(frozen[k])); });
      simCup(simSeasonCup, simSeasonCup.cups.dfb);
      const simM=simSeasonCup.cups.dfb.rounds[0].matches[0];
      if (simM.at!==lastScheduled(simSeasonCup, 'BL') || !cupWinner(simM)) return 'sim at '+simM.at;
      const simNext=scheduleNextBlock(simSeasonCup, 'BL');
      if (!simNext || simSeasonCup.termSnap.BL[simNext[0]].zones.uecl!==8) return 'sim platz8';
      mutateCup('dfb', 0, 0, m=>{ m.hg=1; m.ag=1; m.peh=3; m.pea=3; });
      const tied=season.cups.dfb.rounds[0].matches[0];
      if (cupWinner(tied)!==null || tied.at!=null) return '3:3';
      const ahead=JSON.parse(JSON.stringify(season.kickoffs.BL));
      return Object.keys(frozen).every(k=>JSON.stringify(frozen[k])===JSON.stringify(ahead[k])) ? '' : 'nach 3:3';
    } finally {
      saveHold=prevHold;
      S.seasons=keep.seasons; S.view=keep.view; S.ui.tab=keep.tab; S.ui.league=keep.league;
      if (S.ui) S.ui.cup=undefined;
    }
  })();
  check('manuelles und simuliertes Pokalergebnis öffnet Platz 8 nur für den nächsten Block', cupProd==='', cupProd);
  const types=[['BL','BL'],['BL2','BL2'],['L3','L3'],['L4','L4'],['RL',['RLN','RLO','RLS','RLW']]];
  const report={};
  const parentOf=lid=>{ const spec=L[lid]; if(!spec||spec.level<5) return ''; return spec.level===5?'L4':spec.upTo; };
  function playRange(md, range, rnd){
    for (let mi=range[0]; mi<=range[1] && mi<md.length; mi++) md[mi].forEach(m=>{ if(m[2]==null){ m[2]=Math.floor(rnd()*4); m[3]=Math.floor(rnd()*3); } });
  }
  function runOne(lid, seed){
    seedRandom(seed);
    const teams=squad.leagues[lid].slice();
    const md=makeSchedule(teams.length);
    const season={name:'2099/00', status:'running', leagues:{[lid]:{teams, md}}, pools:{}, kickoffs:{}, cups:{dfb:{entrants:teams.slice(0,8), rounds:[
      {name:'Achtelfinale', drawn:true, matches:[{h:teams[0], a:teams[1], hg:2, ag:1, at:0, peh:null, pea:null}]},
      {name:'Finale', drawn:true, matches:[{h:teams[2], a:teams[3], hg:1, ag:0, at:40, peh:3, pea:3}]}
    ]}}};
    const parent=parentOf(lid);
    if (parent && squad.leagues[parent]) season.leagues[parent]={teams:squad.leagues[parent].slice(), md:makeSchedule(squad.leagues[parent].length)};
    if (L[lid] && L[lid].level===6 && squad.leagues.L4) season.leagues.L4={teams:squad.leagues.L4.slice(), md:makeSchedule(squad.leagues.L4.length)};
    const rnd=Math.random;
    Math.random=prevRandom;
    const sched=scheduleNextBlock;
    const half=teams.length-1, total=md.length;
    let cross=0, guard=0;
    while (lastScheduled(season, lid)<total-1 && guard++<24){
      const from=lastScheduled(season, lid)+1;
      const before=JSON.parse(JSON.stringify(season.kickoffs[lid]||{}));
      const range=sched(season, lid);
      if (!range) break;
      if (from<half && range[1]>=half) cross++;
      Object.keys(before).forEach(k=>{
        if (JSON.stringify(before[k])!==JSON.stringify(season.kickoffs[lid][k])) cross++;
      });
      playRange(md, range, rnd);
      if (parent && season.leagues[parent]) playRange(season.leagues[parent].md, range, rnd);
      if (season.leagues.L4 && parent!=='L4') playRange(season.leagues.L4.md, range, rnd);
    }
    return {season, lid, teams, md, cross};
  }
  function auditTops(pack){
    const {season, lid, teams, md}=pack;
    const total=md.length;
    let sum=0, n=0, km=0, kmN=0, mi=0;
    while (mi<total){
      const range=nextBlockRange(teams.length, mi);
      if (!range) break;
      const snap=powerSnapshot(season, lid, range[0]);
      for (let d=range[0]; d<=range[1]; d++){
        const row=season.kickoffs[lid][d]||[];
        row.forEach((slot,i)=>{
          if (!slot) return;
          const h=teams[md[d][i][0]], a=teams[md[d][i][1]];
          if (slot.kind==='top'){ sum+=matchValue(h, a, snap, d).total; n++; }
          if (slot.kind==='regional'){ const dist=kmBetween(h,a); if (dist!=null){ km+=dist; kmN++; } }
        });
      }
      mi=range[1]+1;
    }
    return {avg:n?sum/n:0, km:kmN?km/kmN:0, n};
  }
  function qualityHoles(pack){
    const {season, lid, teams, md}=pack, total=md.length;
    let holes=0, mi=0;
    while (mi<total){
      const range=nextBlockRange(teams.length, mi);
      if (!range) break;
      const snap=powerSnapshot(season, lid, range[0]);
      for (let d=range[0]; d<=range[1]; d++){
        if (isClosingDay(total, d)) continue;
        const row=season.kickoffs[lid][d]||[];
        const vals=md[d].map(m=>matchValue(teams[m[0]], teams[m[1]], snap, d).total);
        row.forEach((slot,i)=>{
          if (!slot || slot.kind!=='top') return;
          let better=false;
          row.forEach((other,j)=>{
            if (better || j===i || !other || other.kind==='top' || vals[j]<=vals[i]+0.05) return;
            if (!swapKeepsTimes(season, lid, d, range[1], i, j)) return;
            if (other.kind==='konferenz'){
              const donors=[teams[md[d][j][0]], teams[md[d][j][1]]];
              if (topCanTakeConference(season, lid, range[1], donors)) better=true;
              return;
            }
            better=true;
          });
          if (better) holes++;
        });
      }
      mi=range[1]+1;
    }
    return holes;
  }
  function openFrSa(pack){
    const {season, lid, teams, md}=pack;
    if (!slotTemplate(lid).some(s=>s.kind==='top'&&s.dow==='Fr') || !slotTemplate(lid).some(s=>s.kind==='top'&&s.dow==='Sa')) return 0;
    const total=md.length;
    let open=0, mi=0;
    while (mi<total){
      const range=nextBlockRange(teams.length, mi);
      if (!range) break;
      const snap=powerSnapshot(season, lid, range[0]);
      const c={}; teams.forEach(id=>c[id]={fr:0, sa:0});
      for (let d=0; d<=range[1]; d++) (season.kickoffs[lid][d]||[]).forEach((slot,i)=>{
        if (!slot || slot.kind!=='top') return;
        const key=slot.dow==='Fr'?'fr':slot.dow==='Sa'?'sa':'';
        if (!key) return;
        c[teams[md[d][i][0]]][key]++; c[teams[md[d][i][1]]][key]++;
      });
      for (let d=range[0]; d<=range[1]; d++){
        if (isClosingDay(total, d)) continue;
        const row=season.kickoffs[lid][d]||[];
        let fr=-1, sa=-1;
        row.forEach((slot,i)=>{ if (slot&&slot.kind==='top'&&slot.dow==='Fr') fr=i; if (slot&&slot.kind==='top'&&slot.dow==='Sa') sa=i; });
        if (fr<0 || sa<0) continue;
        const vf=matchValue(teams[md[d][fr][0]], teams[md[d][fr][1]], snap, d).total;
        const vs=matchValue(teams[md[d][sa][0]], teams[md[d][sa][1]], snap, d).total;
        if (Math.abs(vf-vs)>2 || !swapKeepsTimes(season, lid, d, range[1], fr, sa)) continue;
        const ids=[teams[md[d][fr][0]], teams[md[d][fr][1]], teams[md[d][sa][0]], teams[md[d][sa][1]]];
        const uniq=[]; ids.forEach(id=>{ if (uniq.indexOf(id)<0) uniq.push(id); });
        const abs=map=>uniq.reduce((s,id)=>s+Math.abs((map[id]||{fr:0,sa:0}).fr-(map[id]||{fr:0,sa:0}).sa),0);
        const before=abs(c);
        const next={}; uniq.forEach(id=>{ next[id]={fr:c[id].fr, sa:c[id].sa}; });
        ids.slice(0,2).forEach(id=>{ next[id].fr--; next[id].sa++; });
        ids.slice(2).forEach(id=>{ next[id].sa--; next[id].fr++; });
        if (abs(next)<before) open++;
      }
      mi=range[1]+1;
    }
    return open;
  }
  const keepWorld={seasons:S.seasons, view:S.view, chronicle:S.chronicle, pokalRuns:S.pokalRuns};
  try{
    S.seasons=[{name:'2098/99', status:'done', leagues:{}, pools:{}}];
    S.view=0;
    S.chronicle=(keepWorld.chronicle||[]).filter(r=>r && seasonYear(r.season)<=2098);
    S.pokalRuns=(keepWorld.pokalRuns||[]).filter(r=>r && seasonYear(r.season)<=2098);
    chronSeen=null; chronIndex=null; chronBuilt=-1; touchAnsehen();
    const rawIds=[];
    ['BL','BL2','L3','L4','L5NO','L5SW','RLN','RLO','RLS','RLW'].forEach(lid=>(squad.leagues[lid]||[]).forEach(id=>{ if (rawIds.indexOf(id)<0) rawIds.push(id); }));
    const rawSame=rawIds.every(id=>ansehenInfo(id, 2098).value===ansehenValue(id));
    let hash=0; rawIds.forEach((id,i)=>{ hash=(hash+Math.round((ansehenInfo(id, 2098).value||0)*100)*(i+1))|0; });
    report.ansehen={clubs:rawIds.length, same:rawSame, hash, end:2098, view:S.seasons[0].name};
    check('neuer und alter Scheduler sehen denselben Roh-Ansehenwert', rawSame, JSON.stringify(report.ansehen));
    types.forEach(([type, lids], ti)=>{
      const list=Array.isArray(lids)?lids:[lids];
      const acc={seasons:0, below:0, oldBelow:0, oldClubs:0, clubs:0, top:0, topN:0, frSa:[], cross:0, newAvg:0, oldAvg:0, newKm:0, oldKm:0, maxFrSa:0, holes:0, openFr:0, repairFail:0, sameN:0, sameO:0, sameC:0, slotMiss:0, streak:0, regionalFar:0, so13:0, so13N:0, plain:0, plainN:0, so13Kind:0};
      for (let s=0;s<50;s++){
        const lid=list[s%list.length];
        const seed=1000+ti*1000+s;
        const neu=runOne(lid, seed);
        const need=Math.ceil(neu.md.length/2);
        const tall=slotTally(neu.season, lid);
        const dualTop=slotTemplate(lid).some(s=>s.kind==='top'&&s.dow==='Fr') && slotTemplate(lid).some(s=>s.kind==='top'&&s.dow==='Sa');
        let worstFr=0;
        neu.teams.forEach(id=>{
          acc.clubs++;
          if ((tall[id].konferenz||0)<need) acc.below++;
          if (dualTop){
            const diff=Math.abs((tall[id].frTop||0)-(tall[id].saTop||0));
            acc.frSa.push(diff);
            if (diff>worstFr) worstFr=diff;
          }
          if (tall[id].topN){ acc.top+=tall[id].topSum; acc.topN+=tall[id].topN; }
        });
        if (lid==='BL'){
          const clocks=[{dow:'Fr', time:'20:30'},{dow:'Sa', time:'18:30'}];
          const scoreClock=(pack)=>{
            let sum=0, n=0, mi=0;
            while (mi<pack.md.length){
              const range=nextBlockRange(pack.teams.length, mi);
              if (!range) break;
              const snap=powerSnapshot(pack.season, pack.lid, range[0]);
              for (let d=range[0]; d<=range[1]; d++){
                if (isClosingDay(pack.md.length, d)) continue;
                const row=pack.season.kickoffs[pack.lid][d]||[];
                clocks.forEach(clock=>{
                  const i=row.findIndex(slot=>slot && slot.dow===clock.dow && slot.time===clock.time);
                  if (i<0) return;
                  sum+=matchValue(pack.teams[pack.md[d][i][0]], pack.teams[pack.md[d][i][1]], snap, d).total;
                  n++;
                });
              }
              mi=range[1]+1;
            }
            return {sum, n};
          };
          const sn=scoreClock(neu);
          acc.sameN+=sn.sum; acc.sameC+=sn.n;
        }
        if (worstFr>acc.maxFrSa) acc.maxFrSa=worstFr;
        acc.cross+=neu.cross;
        acc.holes+=qualityHoles(neu);
        acc.openFr+=openFrSa(neu);
        if ((neu.season.termRepair[lid]||[]).some(r=>!r.ok)) acc.repairFail++;
        const times=templateTimes(lid);
        neu.teams.forEach(id=>{
          const bt=tall[id].byTime||{};
          times.forEach(spec=>{ if (!(bt[spec.key]>0)) acc.slotMiss++; });
        });
        const seq=Array.from({length:neu.teams.length},()=>'');
        neu.md.forEach(round=>round.forEach(m=>{ seq[m[0]]+='H'; seq[m[1]]+='A'; }));
        seq.forEach(s=>{ if (/HHH|AAA/.test(s)) acc.streak++; });
        if (!scheduleMirrorHolds(neu.md)) acc.streak++;
        if (lid==='L3' || lid==='L4' || lid==='L5NO' || lid==='L5SW'){
          let sun=0, sunN=0, other=0, otherN=0;
          neu.md.forEach((round,mi)=>{
            const row=neu.season.kickoffs[lid][mi]||[];
            row.forEach(slot=>{
              const km=slot&&slot.wert&&slot.wert.km;
              if (slot && slot.dow==='So' && slot.time==='13:30' && slot.kind!=='regional') acc.so13Kind++;
              if (km==null) return;
              if (slot.dow==='So'){ sun+=km; sunN++; } else { other+=km; otherN++; }
              if (slot.dow==='So' && slot.time==='13:30'){ acc.so13+=km; acc.so13N++; }
              else if (slot.kind!=='regional'){ acc.plain+=km; acc.plainN++; }
            });
          });
          if (!(sunN&&otherN&&sun/sunN<other/otherN)) acc.regionalFar++;
        }
        const aNew=auditTops(neu);
        acc.newAvg+=aNew.avg; acc.newKm+=aNew.km;
        acc.seasons++;
      }
      acc.frSa.sort((a,b)=>a-b);
      const mid=acc.frSa[Math.floor(acc.frSa.length/2)]||0;
      const round1=v=>Math.round(v*10)/10;
      const so13km=acc.so13N?Math.round(acc.so13/acc.so13N):null, plainKm=acc.plainN?Math.round(acc.plain/acc.plainN):null;
      const so13ok=!(type==='L3'||type==='L4'||type==='L5') || (acc.so13N>0 && acc.plainN>0 && acc.so13/acc.so13N<acc.plain/acc.plainN && acc.so13Kind===0);
      report[type]={seasons:acc.seasons, below:acc.below, oldBelow:acc.oldBelow, clubs:acc.clubs, quota:acc.clubs?Math.round((1-acc.below/acc.clubs)*1000)/10:0, oldQuota:acc.oldClubs?Math.round((1-acc.oldBelow/acc.oldClubs)*1000)/10:0, avgTop:acc.topN?round1(acc.top/acc.topN):0, topKindNeu:round1(acc.newAvg/acc.seasons), topKindAlt:round1(acc.oldAvg/acc.seasons), topKindHinweis:type==='BL'?'neu Fr 20:30 und Sa 18:30, alt nur Sa 18:30':'gleiche Top-Anstöße', sameClockNeu:acc.sameC?round1(acc.sameN/acc.sameC):null, sameClockAlt:acc.sameC?round1(acc.sameO/acc.sameC):null, newKm:Math.round(acc.newKm/acc.seasons), oldKm:Math.round(acc.oldKm/acc.seasons), frSaMedian:mid, frSaMax:acc.maxFrSa, cross:acc.cross, holes:acc.holes, openFr:acc.openFr, repairFail:acc.repairFail, slotMiss:acc.slotMiss, streak:acc.streak, regionalFar:acc.regionalFar, so13km, plainKm, so13Kind:acc.so13Kind};
      check(type+' jede der 50 Saisons hält Quote, Zeiten und Serie 2', acc.seasons===50 && acc.below===0 && acc.cross===0 && acc.holes===0 && acc.openFr===0 && acc.repairFail===0 && acc.slotMiss===0 && acc.streak===0 && acc.regionalFar===0 && so13ok, JSON.stringify(report[type]));
    });
  }finally{
    Math.random=prevRandom;
    S.seasons=keepWorld.seasons; S.view=keepWorld.view; S.chronicle=keepWorld.chronicle; S.pokalRuns=keepWorld.pokalRuns;
    chronSeen=null; chronIndex=null; chronBuilt=-1; touchAnsehen();
  }
  const closingKeepsSlots=(lid, seed)=>{
    seedRandom(seed);
    const teams=squad.leagues[lid].slice(), md=makeSchedule(teams.length);
    Math.random=prevRandom;
    const season={name:'2097/98', status:'running', leagues:{[lid]:{teams, md}}, pools:{}, kickoffs:{}};
    const total=md.length;
    for (let guard=0; guard<40 && lastScheduled(season, lid)<total-1; guard++){
      const from=lastScheduled(season, lid)+1;
      const preview=nextBlockRange(teams.length, from);
      if (!preview) return false;
      const before=JSON.parse(JSON.stringify(season.kickoffs[lid]||{}));
      const range=scheduleNextBlock(season, lid);
      if (!range) return false;
      if (preview[1]<total-1){
        for (let mi=range[0]; mi<=range[1]; mi++) md[mi].forEach(m=>{ m[2]=1; m[3]=0; });
        continue;
      }
      const earlier=Object.keys(before).every(k=>JSON.stringify(before[k])===JSON.stringify(season.kickoffs[lid][k]));
      const frozen=JSON.parse(JSON.stringify(season.kickoffs[lid]));
      const extra=scheduleNextBlock(season, lid);
      const still=extra==null && Object.keys(frozen).every(k=>JSON.stringify(frozen[k])===JSON.stringify(season.kickoffs[lid][k]));
      return earlier && still && range[1]===total-1;
    }
    return false;
  };
  check('der letzte Spieltag ändert keine früheren Slots', closingKeepsSlots('L3', 4242) && closingKeepsSlots('L4', 4242) && closingKeepsSlots('RLN', 3434));
  const leak=(()=>{
    const build=()=>{
      seedRandom(77);
      const teams=squad.leagues.RLN.slice(), md=makeSchedule(teams.length);
      const parentTeams=squad.leagues.L4.slice(), parentMd=makeSchedule(parentTeams.length);
      Math.random=prevRandom;
      return {name:'2099/00', status:'running', leagues:{RLN:{teams, md}, L4:{teams:parentTeams, md:parentMd}}, pools:{}, kickoffs:{}, cups:{dfb:{entrants:[teams[0], teams[1]], rounds:[{name:'Finale', matches:[{h:teams[0], a:teams[1], hg:null, ag:null}]}]}}};
    };
    const clean=build(), dirty=build();
    dirty.leagues.L4.md[10][0][2]=6; dirty.leagues.L4.md[10][0][3]=0;
    dirty.leagues.RLN.md[8][0][2]=5; dirty.leagues.RLN.md[8][0][3]=0;
    dirty.cups.dfb.rounds[0].matches[0].hg=1; dirty.cups.dfb.rounds[0].matches[0].ag=0; dirty.cups.dfb.rounds[0].matches[0].at=20; dirty.cups.dfb.rounds[0].matches[0].peh=3; dirty.cups.dfb.rounds[0].matches[0].pea=3;
    const chronKeep=S.chronicle, runKeep=S.pokalRuns;
    S.chronicle=(chronKeep||[]).concat([{season:'2099/00', id:dirty.leagues.RLN.teams[0], liga:'Regionalliga Nord', ebene:5, n:18, pl:1, pts:70}]);
    S.pokalRuns=(runKeep||[]).concat([{season:'2099/00', id:dirty.leagues.RLN.teams[0], comp:'dfb', round:'Finale', won:true}]);
    chronSeen=null; chronIndex=null; chronBuilt=-1; touchAnsehen();
    scheduleNextBlock(clean, 'RLN');
    scheduleNextBlock(dirty, 'RLN');
    const slots=JSON.stringify(clean.kickoffs.RLN)===JSON.stringify(dirty.kickoffs.RLN);
    const snapC=clean.termSnap.RLN[0], snapD=dirty.termSnap.RLN[0];
    const zones=JSON.stringify(snapC.zones)===JSON.stringify(snapD.zones);
    const raw=JSON.stringify(snapC.raw)===JSON.stringify(snapD.raw);
    const endOk=snapC.ansehenEnd===2098 && snapD.ansehenEnd===2098;
    const formOk=snapC.form && snapD.form && JSON.stringify(snapC.form)===JSON.stringify(snapD.form);
    for (let mi=0; mi<=3; mi++) clean.leagues.RLN.md[mi].forEach(m=>{ m[2]=1; m[3]=0; });
    scheduleNextBlock(clean, 'RLN');
    const played=tableBefore(clean, 'RLN', 4);
    const stored=clean.termSnap.RLN[4];
    const formMatch=played.every(r=>JSON.stringify(stored.form[r.id]||[])===JSON.stringify(r.form||[]));
    const edgeOk=played.every(r=>formEdge({form:stored.form[r.id]})===formEdge(r));
    S.chronicle=chronKeep; S.pokalRuns=runKeep; chronSeen=null; chronIndex=null; chronBuilt=-1; touchAnsehen();
    return slots && zones && raw && endOk && formOk && formMatch && edgeOk;
  })();
  check('vorgefüllte Zukunft ändert die erste Terminierung nicht', leak);
  const booted=(()=>{
    seedRandom(5);
    const teams=squad.leagues.BL.slice(), md=makeSchedule(teams.length);
    Math.random=prevRandom;
    const season={name:'2099/00', status:'running', leagues:{BL:{teams, md}}, pools:{}, kickoffs:{}};
    const first=scheduleNextBlock(season, 'BL');
    if (!first) return false;
    for (let mi=first[0]; mi<=first[1]; mi++) md[mi].forEach(m=>{ m[2]=1; m[3]=0; });
    const disk=JSON.parse(JSON.stringify(packForDisk({v:1, seasons:[season], view:0, chronicle:[], pokalRuns:[], ui:{}})));
    const loaded=unpackState(disk);
    const again=loaded.seasons[0];
    const before=JSON.parse(JSON.stringify(again.kickoffs.BL));
    const next=scheduleNextBlock(again, 'BL');
    if (!next || next[0]<=first[1]) return false;
    return Object.keys(before).every(k=>JSON.stringify(before[k])===JSON.stringify(again.kickoffs.BL[k]));
  })();
  check('nach dem Laden bleibt der Block stehen und der nächste kommt dazu', booted);
  report.targeted={};
  (()=>{
    const teams=squad.leagues.BL.slice();
    const pairs=[]; for (let i=0;i<10;i++) pairs.push([i*2, i*2+1]);
    const md=[]; for (let d=0;d<38;d++) md.push(pairs.map(p=>[p[0], p[1], null, null]));
    const bag={};
    const rowOf=(d)=>{
      return pairs.map((_,i)=>{
        if (i===6){
          if (d<16 || d===34) return {dow:'Sa', time:'15:30', kind:'konferenz'};
          if (d===16) return {dow:'So', time:'15:30', kind:'regional'};
          if (d===17) return {dow:'Sa', time:'18:30', kind:'top'};
          return {dow:'Fr', time:'20:30', kind:'top'};
        }
        if (i===7){
          if (d===0 || d===1 || d===34) return {dow:'So', time:'17:30', kind:'regional'};
          if (d===30) return {dow:'So', time:'15:30', kind:'regional'};
          if (d===31) return {dow:'Sa', time:'18:30', kind:'top'};
          if (d<30) return {dow:'Sa', time:'15:30', kind:'konferenz'};
          return {dow:'Fr', time:'20:30', kind:'top'};
        }
        if (i<6){
          if (d<16) return {dow:'Sa', time:'15:30', kind:'konferenz'};
          if (d===16) return {dow:'So', time:'17:30', kind:'regional'};
          if (d===17) return {dow:'So', time:'15:30', kind:'regional'};
          if (d===18) return {dow:'Sa', time:'18:30', kind:'top'};
          if (d===34) return {dow:'Fr', time:'20:30', kind:'top'};
          return {dow:'Fr', time:'20:30', kind:'top'};
        }
        if (d<20) return {dow:'Sa', time:'15:30', kind:'konferenz'};
        if (d===20) return {dow:'So', time:'17:30', kind:'regional'};
        if (d===21) return {dow:'So', time:'15:30', kind:'regional'};
        if (d===22) return {dow:'Sa', time:'18:30', kind:'top'};
        return {dow:'Fr', time:'20:30', kind:'top'};
      });
    };
    for (let d=0; d<=34; d++) bag[d]=rowOf(d);
    const pairHas=(i, dow, time, except)=>{ for (let d=0; d<=34; d++) if (d!==except && bag[d][i].dow===dow && bag[d][i].time===time) return true; return false; };
    [{dow:'Fr',time:'20:30',kind:'top'},{dow:'Sa',time:'18:30',kind:'top'},{dow:'So',time:'15:30',kind:'regional'},{dow:'So',time:'17:30',kind:'regional'}].forEach(spec=>{
      for (let i=0;i<10;i++){
        if (spec.time==='17:30' && i===6) continue;
        if (pairHas(i, spec.dow, spec.time, -1)) continue;
        for (let d=0; d<=33; d++){
          const cur=bag[d][i];
          if (cur.kind==='konferenz' || cur.time==='17:30') continue;
          if (!pairHas(i, cur.dow, cur.time, d)) continue;
          bag[d][i]=Object.assign({}, spec);
          break;
        }
      }
    });
    const season={name:'2099/00', status:'running', leagues:{BL:{teams, md}}, pools:{}, kickoffs:{BL:bag}};
    const mustOn=()=>{
      const conf={}; teams.forEach((_,ix)=>{ conf[ix]=0; });
      for (let d=0; d<=34; d++) bag[d].forEach((slot,i)=>{ if (slot.kind==='konferenz'){ conf[pairs[i][0]]++; conf[pairs[i][1]]++; } });
      let n=0;
      md[35].forEach(m=>{ if ((19-(conf[m[0]]||0)-2)>0 && (19-(conf[m[0]]||0)-2)>=1 || (19-(conf[m[1]]||0)-2)>0 && (19-(conf[m[1]]||0)-2)>=1) n++; });
      return {n, d:conf[12], donor:conf[14]};
    };
    const before=mustOn();
    const heldBefore=blockObligations(season, 'BL', 34);
    const covered=coverSlotGaps(season, 'BL', 34, 34);
    const after=mustOn();
    const stillConf=bag[34][6].kind==='konferenz' && bag[34][7].time==='17:30';
    check('Zeitreparatur lässt die gemeinsame Konferenzkapazität stehen', before.n===6 && before.d===17 && covered===true && after.n===6 && after.d===17 && stillConf && heldBefore.ok, JSON.stringify({before, after, covered, held:heldBefore}));
    const broken=bag[34][6]; bag[34][6]=bag[34][7]; bag[34][7]=broken;
    const heldBroken=blockObligations(season, 'BL', 34);
    check('Sieben Pflichtspiele auf sechs Konferenzplätze sind unzulässig', heldBroken.ok===false && heldBroken.reason==='kapazitaet', JSON.stringify(heldBroken));
    report.targeted.kapazitaet={before, after, covered, heldBroken};
  })();
  (()=>{
    const teams=squad.leagues.BL.slice();
    const md=[];
    const pairDay=(confList)=>{
      const conf=confList.slice(), rest=[], mark={};
      conf.forEach(i=>{ mark[i]=1; });
      for (let i=0;i<20;i++) if (!mark[i]) rest.push(i);
      const matches=[], isConf=[];
      while (conf.length){ matches.push([conf.pop(), conf.pop()]); isConf.push(true); }
      while (rest.length){ matches.push([rest.pop(), rest.pop()]); isConf.push(false); }
      return {matches, isConf};
    };
    const days=[];
    const add=(list)=>{ days.push(pairDay(list)); };
    const six=[0,1,2,3,4,5];
    const fromTo=(a,b)=>{ const s=[]; for (let i=a;i<=b;i++) s.push(i); return s; };
    add(six.concat([7,8]));
    add(six.concat([9,10]));
    add(six.concat([8,11]));
    for (let d=3;d<=11;d++) add(six.slice());
    add(fromTo(8,19));
    add([7].concat(fromTo(9,19)));
    add([7,8].concat(fromTo(10,19)));
    for (let d=15;d<=30;d++) add(fromTo(6,19));
    for (let d=0;d<38;d++){
      if (d<=30) md.push(days[d].matches.map(p=>[p[0], p[1], null, null]));
      else if (d<=35){ const pairs=[]; for (let i=0;i<10;i++) pairs.push([i, 10+i, null, null]); md.push(pairs); }
      else { const pairs=[]; for (let i=0;i<10;i++) pairs.push([i*2, i*2+1, null, null]); md.push(pairs); }
    }
    const bag={};
    const opts=[{dow:'Fr',time:'20:30',kind:'top'},{dow:'Sa',time:'18:30',kind:'top'},{dow:'So',time:'15:30',kind:'regional'},{dow:'So',time:'17:30',kind:'regional'}];
    for (let d=0;d<=30;d++){
      bag[d]=days[d].matches.map((_,i)=>days[d].isConf[i]?{dow:'Sa',time:'15:30',kind:'konferenz'}:Object.assign({}, opts[(d+i)%4]));
      md[d].forEach(m=>{ m[2]=1; m[3]=0; });
    }
    const seen={};
    teams.forEach((_,ix)=>{ seen[ix]={}; });
    for (let d=0;d<=30;d++) bag[d].forEach((slot,i)=>{
      const key=slot.dow+' '+slot.time;
      seen[md[d][i][0]][key]=1; seen[md[d][i][1]][key]=1;
    });
    opts.forEach(spec=>{
      const key=spec.dow+' '+spec.time;
      for (let ix=0; ix<20; ix++) if (!seen[ix][key]){
        for (let d=0; d<=30 && !seen[ix][key]; d++){
          const at=md[d].findIndex(m=>m[0]===ix||m[1]===ix);
          if (at<0 || bag[d][at].kind==='konferenz') continue;
          bag[d][at]=Object.assign({}, spec);
          seen[md[d][at][0]][key]=1; seen[md[d][at][1]][key]=1;
        }
      }
    });
    const season={name:'2099/00', status:'running', leagues:{BL:{teams, md}}, pools:{}, kickoffs:{BL:bag}};
    const tally=()=>{
      const conf={}; teams.forEach(id=>{ conf[id]=0; });
      for (let d=0;d<=30;d++) bag[d].forEach((slot,i)=>{
        if (slot.kind!=='konferenz') return;
        conf[teams[md[d][i][0]]]++; conf[teams[md[d][i][1]]]++;
      });
      return conf;
    };
    const conf=tally();
    const sixCount=[0,1,2,3,4,5].map(i=>conf[teams[i]]);
    const held=blockObligations(season, 'BL', 30);
    const plus=Object.assign({}, conf); plus[teams[6]]++;
    const spared=sharedConferenceOk(season, 'BL', 30, plus);
    check('nach Spieltag 31 bleibt ein einzelner Konferenzbedarf ohne Platz unerkannt nicht mehr', sixCount.every(n=>n===12) && conf[teams[6]]===16 && held.ok===false && held.reason==='kapazitaet' && spared===true, JSON.stringify({sixCount, a:conf[teams[6]], held, spared}));
    const counts={};
    teams.forEach((id,ix)=>{
      counts[id]={konferenz:conf[id], byTime:{'Fr 20:30':2,'Sa 15:30':4,'Sa 18:30':2,'So 15:30':2,'So 17:30':2}, fr:2, so:2, top:2, frTop:1, saTop:1, regional:2, total:30, einzel:0, topSum:0, topN:0, regSum:0, regN:0};
    });
    counts[teams[6]].byTime=Object.assign({}, counts[teams[6]].byTime, {'So 17:30':0});
    counts[teams[6]].konferenz=16;
    const today=[]; for (let i=0;i<10;i++) today.push([i, 10+i]);
    const row=today.map((_,i)=>i===6?{dow:'Sa',time:'15:30',kind:'konferenz'}:i===7?{dow:'So',time:'17:30',kind:'regional'}:{dow:'Fr',time:'20:30',kind:'top'});
    forceOpenTimes(row, today, teams, counts, 30, 38, 'BL', season);
    check('forceOpenTimes entzieht die Konferenz nicht, wenn danach kein Platz bleibt', row[6].kind==='konferenz' && row[7].time==='17:30', row.slice(6,8).map(s=>s.kind+' '+s.time).join(','));
    const oldKicks=JSON.stringify(bag);
    const oldScores=JSON.stringify(md.map(round=>round.map(m=>[m[2], m[3]])));
    const scheduled=scheduleNextBlock(season, 'BL');
    const kicksSame=JSON.stringify(bag)===oldKicks;
    const scoresSame=JSON.stringify(md.map(round=>round.map(m=>[m[2], m[3]])))===oldScores;
    const noNew=!bag[31] && !bag[34] && !bag[35];
    check('scheduleNextBlock schreibt einen unmöglichen Block nicht fest', scheduled===null && kicksSame && scoresSame && noNew && bag[30] && md[30][0][2]===1, JSON.stringify({scheduled, kicksSame, scoresSame, noNew, repair:(season.termRepair&&season.termRepair.BL||[]).slice(-1)}));
    report.targeted.rest={sixCount, a:conf[teams[6]], held, spared, scheduled, kicksSame, scoresSame};
  })();
  (()=>{
    const teams=squad.leagues.BL.slice();
    const md=[], bag={};
    const circle=shift=>{
      const t=Array.from({length:20},(_,i)=>i);
      for (let s=0;s<shift;s++){ const rest=t.slice(1); rest.push(rest.shift()); t.splice(1,19,...rest); }
      const p=[]; for (let i=0;i<10;i++) p.push([t[i], t[19-i]]);
      return p;
    };
    const withFixed=(fixed)=>{
      const used={}; fixed.forEach(p=>{ used[p[0]]=used[p[1]]=1; });
      const left=[]; for (let i=0;i<20;i++) if (!used[i]) left.push(i);
      const p=fixed.slice();
      while (left.length) p.push([left.shift(), left.shift()]);
      return p;
    };
    const rowFor=(pairs, fridayAt)=>{
      const row=pairs.map(()=>({dow:'Sa', time:'15:30', kind:'konferenz'}));
      const singles=[{dow:'Fr',time:'20:30',kind:'top'},{dow:'Sa',time:'18:30',kind:'top'},{dow:'So',time:'15:30',kind:'regional'},{dow:'So',time:'17:30',kind:'regional'}];
      let k=1;
      row[fridayAt]=Object.assign({}, singles[0]);
      for (let i=0;i<row.length && k<singles.length;i++) if (i!==fridayAt) row[i]=Object.assign({}, singles[k++]);
      return row;
    };
    for (let d=0;d<38;d++){
      let pairs;
      if (d===31) pairs=withFixed([[2,10],[1,14]]);
      else if (d===32) pairs=withFixed([[3,11]]);
      else if (d===33) pairs=withFixed([[4,12]]);
      else if (d===34) pairs=withFixed([[5,13]]);
      else if (d===35) pairs=withFixed([[0,2],[1,6]]);
      else pairs=circle(d);
      md.push(pairs.map(p=>[p[0], p[1], d<=30?1:null, d<=30?0:null]));
      if (d<=30){
        let friday=pairs.findIndex(p=>p[0]>5 && p[1]>5);
        if (friday<0) friday=pairs.findIndex(p=>p[0]>5 || p[1]>5);
        const heavy=pairs.map(()=>({dow:'Sa', time:'15:30', kind:'konferenz'}));
        heavy[Math.max(0, friday)]={dow:'Fr', time:'20:30', kind:'top'};
        if (d<4 && heavy.length>3){
          const singles=[{dow:'Sa',time:'18:30',kind:'top'},{dow:'So',time:'15:30',kind:'regional'},{dow:'So',time:'17:30',kind:'regional'}];
          let k=0;
          for (let i=0;i<heavy.length && k<singles.length;i++) if (i!==friday) heavy[i]=Object.assign({}, singles[k++]);
        }
        bag[d]=heavy;
      }
    }
    const fridayIdx=(d, club)=>md[d].findIndex(m=>m[0]===club||m[1]===club);
    [{dow:'Sa',time:'18:30',kind:'top'},{dow:'So',time:'15:30',kind:'regional'},{dow:'So',time:'17:30',kind:'regional'}].forEach(spec=>{
      for (let club=0; club<20; club++){
        let seen=false;
        for (let d=0; d<=30 && !seen; d++){
          const i=fridayIdx(d, club);
          if (i>=0 && bag[d][i].dow===spec.dow && bag[d][i].time===spec.time) seen=true;
        }
        if (seen) continue;
        for (let d=0; d<=30; d++){
          const i=fridayIdx(d, club);
          if (i<0 || bag[d][i].kind!=='konferenz') continue;
          bag[d][i]=Object.assign({}, spec);
          break;
        }
      }
    });
    bag[31]=rowFor(md[31], fridayIdx(31, 2));
    bag[32]=rowFor(md[32], fridayIdx(32, 3));
    bag[33]=rowFor(md[33], fridayIdx(33, 4));
    bag[34]=rowFor(md[34], fridayIdx(34, 5));
    const season={name:'2099/00', status:'running', leagues:{BL:{teams, md}}, pools:{}, kickoffs:{BL:bag}};
    const hasFriday=(club, from, to)=>{
      for (let d=from; d<=to; d++){
        const i=fridayIdx(d, club);
        if (i>=0 && bag[d] && bag[d][i] && bag[d][i].dow==='Fr' && bag[d][i].time==='20:30') return true;
      }
      return false;
    };
    const locked=JSON.stringify(Object.keys(bag).filter(k=>+k<=30).map(k=>bag[k]));
    const scores=JSON.stringify(md.map(round=>round.map(m=>[m[2], m[3]])));
    const bad=blockObligations(season, 'BL', 34);
    const zeros=[0,1,2,3,4,5].filter(c=>!hasFriday(c, 0, 34)).length;
    check('zwei fehlende Freitage auf getrennten Paarungen sind nicht machbar', bad.ok===false && String(bad.reason).indexOf('zeit')===0 && zeros===2 && zeros<=1*2, JSON.stringify(bad));
    const repaired=repairHardResiduals(season, 'BL', 31, 34);
    const after=blockObligations(season, 'BL', 34);
    const bGot=hasFriday(1, 31, 34), cKept=hasFriday(2, 31, 34), dKept=hasFriday(3, 31, 34), eKept=hasFriday(4, 31, 34), fKept=hasFriday(5, 31, 34);
    check('offener Block deckt B, D, E und F vor dem letzten Spieltag', repaired && after.ok && bGot && dKept && eKept && fKept, JSON.stringify({repaired, after, bGot, cKept, dKept, eKept, fKept}));
    const next=scheduleNextBlock(season, 'BL');
    const st36=bag[35]?bag[35].findIndex(s=>s&&s.dow==='Fr'&&s.time==='20:30'):-1;
    const pair=st36>=0?md[35][st36]:null;
    const ac=pair && ((pair[0]===0&&pair[1]===2)||(pair[0]===2&&pair[1]===0));
    const locksSame=JSON.stringify(Object.keys(bag).filter(k=>+k<=30).map(k=>bag[k]))===locked;
    const scoresSame=JSON.stringify(md.map(round=>round.map(m=>[m[2], m[3]])))===scores;
    check('scheduleNextBlock legt den letzten Freitag auf A gegen C', next && ac && locksSame && scoresSame && blockObligations(season, 'BL', 37).ok, JSON.stringify({next, st36, pair, locksSame, scoresSame, last:RESIDUAL_STATS.last, repairLast:RESIDUAL_STATS.repairLast}));
    report.targeted.freitag={bad, repaired, bGot, cKept, dKept, eKept, fKept, ac, locksSame, scoresSame};
  })();
  (()=>{
    const teams=squad.leagues.BL.slice();
    const snap={info:{}, total:38, table:[], zones:{n:20, up:0, down:3, meister:1, cl:4, el:6, uecl:7}, at:1, ansehen:{}, rank:{}, form:{}};
    const put=(i, an)=>{ const id=teams[i]; snap.info[id]={id, ansehen:an, sp:0, sport:null, form:[], pkt:0}; };
    put(0, 16.7); put(1, 16.7); put(2, 50); put(3, 50); put(4, 33.4); put(5, 33.4);
    for (let i=6;i<20;i++) put(i, 4);
    const vT=matchValue(teams[0], teams[1], snap, 1).total;
    const vB=matchValue(teams[2], teams[3], snap, 1).total;
    const vC=matchValue(teams[4], teams[5], snap, 1).total;
    const pairs=[[0,1],[2,3],[4,5]];
    for (let i=6;i<20;i+=2) pairs.push([i, i+1]);
    const md=[]; for (let d=0;d<38;d++) md.push(pairs.map(p=>[p[0], p[1], null, null]));
    const bag={};
    bag[0]=pairs.map((_,i)=>{
      if (i===0) return {dow:'Fr', time:'20:30', kind:'konferenz'};
      if (i===2) return {dow:'So', time:'17:30', kind:'konferenz'};
      return {dow:'Sa', time:'15:30', kind:'konferenz'};
    });
    bag[1]=pairs.map((_,i)=>{
      if (i===0) return {dow:'Fr', time:'20:30', kind:'top'};
      if (i===1) return {dow:'So', time:'15:30', kind:'regional'};
      if (i===2) return {dow:'So', time:'17:30', kind:'regional'};
      return {dow:'Sa', time:'15:30', kind:'konferenz'};
    });
    const season={name:'2099/00', status:'running', leagues:{BL:{teams, md}}, pools:{}, kickoffs:{BL:bag}};
    raiseTops(season, 'BL', 1, 1, snap);
    const topAt=bag[1].findIndex(s=>s.kind==='top');
    const holes=qualityHoles({season, lid:'BL', teams, md});
    check('Top sucht den nächsten zulässigen Kandidaten', vB>vC && vC>vT && topAt===2 && bag[1][1].time==='15:30' && holes===0, [vT, vB, vC, topAt, holes].join('/'));
    report.targeted.top={vT, vB, vC, topAt, holes};
  })();
  (()=>{
    const teams=squad.leagues.BL.slice();
    const snap={info:{}, total:38, table:[], zones:{n:20, up:0, down:3, meister:1, cl:4, el:6, uecl:7}, at:20, ansehen:{}, rank:{}, form:{}};
    const put=(i, an)=>{ const id=teams[i]; snap.info[id]={id, ansehen:an, sp:0, sport:null, form:[], pkt:0}; };
    put(0, 16.7); put(1, 16.7); put(2, 50); put(3, 50); put(4, 33.4); put(5, 33.4);
    for (let i=6;i<20;i++) put(i, 4);
    const pairs=[[0,1],[2,3],[4,5]];
    for (let i=6;i<20;i+=2) pairs.push([i, i+1]);
    const md=[]; for (let d=0;d<38;d++) md.push(pairs.map(p=>[p[0], p[1], null, null]));
    const bag={};
    for (let d=0; d<=18; d++) bag[d]=pairs.map(()=>({dow:'Sa', time:'15:30', kind:'konferenz'}));
    bag[19]=pairs.map((_,i)=>{
      if (i===0) return {dow:'Fr', time:'20:30', kind:'konferenz'};
      if (i===2) return {dow:'So', time:'17:30', kind:'konferenz'};
      return {dow:'Sa', time:'15:30', kind:'konferenz'};
    });
    bag[20]=pairs.map((_,i)=>{
      if (i===0) return {dow:'Fr', time:'20:30', kind:'top'};
      if (i===1) return {dow:'So', time:'15:30', kind:'regional'};
      if (i===2) return {dow:'So', time:'17:30', kind:'regional'};
      if (i===3) return {dow:'Fr', time:'20:30', kind:'regional'};
      return {dow:'Sa', time:'15:30', kind:'konferenz'};
    });
    const season={name:'2099/00', status:'running', leagues:{BL:{teams, md}}, pools:{}, kickoffs:{BL:bag}};
    nudgeNonExactBlock(season, 'BL', 20, 20, snap);
    check('placeTops übergeht den unzulässigen besten Tausch', bag[20][2].kind==='top' && bag[20][1].time==='15:30' && bag[20][0].kind!=='top', bag[20].slice(0,3).map(s=>s.kind+' '+s.time).join(','));
    report.targeted.place=bag[20].slice(0,3).map(s=>s.kind+' '+s.time);
  })();
  (()=>{
    const teams=squad.leagues.BL.slice();
    const snap={info:{}, total:38, table:[], zones:{n:20, up:0, down:3, meister:1, cl:4, el:6, uecl:7}, at:32, ansehen:{}, rank:{}, form:{}};
    teams.forEach(id=>{ snap.info[id]={id, ansehen:40, sp:0, sport:null, form:[], pkt:0}; });
    const md=[]; const bag={};
    const pushDay=(specials)=>{
      const used={}, matches=[], row=[];
      specials.forEach(s=>{ matches.push([s.a, s.b, null, null]); row.push(s.slot); used[s.a]=used[s.b]=1; });
      const rest=[]; for (let i=0;i<20;i++) if (!used[i]) rest.push(i);
      while (rest.length){ matches.push([rest.shift(), rest.shift(), null, null]); row.push({dow:'Sa', time:'15:30', kind:'konferenz'}); }
      md.push(matches); bag[md.length-1]=row;
    };
    const top=(dow)=>({dow, time:dow==='Fr'?'20:30':'18:30', kind:'top'});
    for (let k=0;k<9;k++) pushDay([{a:0, b:8, slot:top('Fr')}]);
    for (let k=0;k<9;k++) pushDay([{a:2, b:9, slot:top('Sa')}]);
    for (let k=0;k<4;k++) pushDay([{a:4, b:10, slot:top('Fr')}]);
    pushDay([{a:5, b:12, slot:top('Fr')}]);
    pushDay([{a:5, b:13, slot:top('Sa')}]);
    for (let k=0;k<2;k++) pushDay([{a:6, b:14, slot:top('Fr')}]);
    pushDay([{a:6, b:15, slot:top('Sa')}]);
    pushDay([{a:7, b:16, slot:top('Fr')}]);
    for (let k=0;k<3;k++) pushDay([{a:7, b:17, slot:top('Sa')}]);
    const illegal=md.length;
    pushDay([{a:0, b:1, slot:top('Fr')},{a:2, b:3, slot:top('Sa')}]);
    const legal=md.length;
    pushDay([{a:4, b:5, slot:top('Fr')},{a:6, b:7, slot:top('Sa')}]);
    while (md.length<38) pushDay([]);
    const season={name:'2099/00', status:'running', leagues:{BL:{teams, md}}, pools:{}, kickoffs:{BL:bag}};
    const frBefore=bag[illegal][0].dow, saBefore=bag[illegal][1].dow;
    balanceFrSaBlock(season, 'BL', illegal, legal, snap);
    const illegalKept=bag[illegal][0].dow===frBefore && bag[illegal][1].dow===saBefore;
    const legalMoved=bag[legal][0].dow==='Sa' && bag[legal][1].dow==='Fr';
    const open=openFrSa({season, lid:'BL', teams, md});
    check('Freitag-Samstag sucht den nächsten zulässigen Tausch', illegalKept && legalMoved && open===0, JSON.stringify({illegalKept, legalMoved, open, illegal, legal}));
    report.targeted.frSa={illegalKept, legalMoved, open};
  })();
  ['L3','L4'].forEach(lid=>{
    seedRandom(4100+(lid==='L3'?0:17));
    const teams=squad.leagues[lid].slice(), md=makeSchedule(teams.length);
    Math.random=prevRandom;
    const season={name:'2099/00', status:'running', leagues:{[lid]:{teams, md}}, pools:{}, kickoffs:{}};
    let g=0; while(g++<24){ const range=scheduleNextBlock(season, lid); if(!range) break; for (let mi=range[0]; mi<=range[1]; mi++) md[mi].forEach(m=>{ if(m[2]==null){ m[2]=1; m[3]=0; } }); }
    let so=0, soN=0, plain=0, plainN=0, kindBad=0;
    md.forEach((round,mi)=>{
      (season.kickoffs[lid][mi]||[]).forEach(slot=>{
        if (!slot) return;
        const km=slot.wert&&slot.wert.km;
        if (slot.dow==='So' && slot.time==='13:30'){
          if (slot.kind!=='regional') kindBad++;
          if (km!=null){ so+=km; soN++; }
        } else if (slot.kind!=='regional' && km!=null){ plain+=km; plainN++; }
      });
    });
    const html=viewTerminierung(season, lid);
    const kmSo=soN?Math.round(so/soN):null, kmPlain=plainN?Math.round(plain/plainN):null;
    check(lid+' Sonntag 13:30 ist einzeln kürzer und regional', soN>0 && plainN>0 && so/soN<plain/plainN && kindBad===0 && html.indexOf('So 13:30')>=0 && html.indexOf('auch 13:30')>=0, kmSo+'/'+kmPlain+' kind '+kindBad);
    report.targeted[lid]={so13:kmSo, andere:kmPlain, kindBad};
  });
  (()=>{
    seedRandom(4100);
    const lid='L5NO';
    const teams=squad.leagues[lid].slice(), md=makeSchedule(teams.length);
    Math.random=prevRandom;
    const season={name:'2099/00', status:'running', leagues:{[lid]:{teams, md}}, pools:{}, kickoffs:{}};
    let g=0; while(g++<24){ const range=scheduleNextBlock(season, lid); if(!range) break; for (let mi=range[0]; mi<=range[1]; mi++) md[mi].forEach(m=>{ if(m[2]==null){ m[2]=1; m[3]=0; } }); }
    const tmpl=slotTemplate(lid, 11);
    let bad=0, sun=0;
    md.forEach((round,mi)=>{
      const row=season.kickoffs[lid][mi]||[];
      if (row.length!==11) bad++;
      row.forEach(slot=>{
        if (!slot){ bad++; return; }
        if (!tmpl.some(s=>s.dow===slot.dow && s.time===slot.time && s.kind===slot.kind)) bad++;
        if (slot.dow==='So'){ sun++; if (slot.kind!=='regional') bad++; }
      });
    });
    check('5. Liga terminiert mit elf Anstößen', bad===0 && sun>0 && tmpl.length===11 && md.length===42, 'bad '+bad+' sonntag '+sun+' tage '+md.length);
  })();
  const uiRes=uiSelfTest();
  const anRes=ansehenSelfTest();
  (()=>{
    const overlap=[];
    ['BL','BL2','L3','L4','L5NO','L5SW','RLN','RLO','RLS','RLW'].forEach(lid=>{
      if (!L[lid]) return;
      const closing=slotTimeKey(finalSaturdaySlot(lid));
      templateGroups(lid).forEach(g=>{ if (g.kind==='konferenz' && g.key!==closing) overlap.push(lid+' '+g.key); });
    });
    check('Konferenzzeit neben dem Schluss-Samstag nur So 13:30 der 2. Liga', overlap.length===1 && overlap[0]==='BL2 So 13:30', overlap.join(','));
    const teams=squad.leagues.BL2.slice();
    const md=[], bag={};
    const pairDay=(opp, aSlot)=>{
      const left=[];
      for (let i=1;i<20;i++) if (i!==opp) left.push(i);
      const pairs=[[0, opp]];
      while (left.length) pairs.push([left.shift(), left.shift()]);
      const row=pairs.map(()=>({dow:'Sa', time:'13:30', kind:'konferenz'}));
      if (aSlot) row[0]=Object.assign({}, aSlot);
      return {pairs, row};
    };
    for (let d=0; d<38; d++){
      let built;
      if (d<=18) built=pairDay(1+(d%19), d%2?{dow:'Fr',time:'18:30',kind:'regional'}:{dow:'Sa',time:'20:30',kind:'top'});
      else if (d<=34) built=pairDay(1+(d%19), null);
      else if (d===35) built=pairDay(1, null);
      else built=pairDay(2, null);
      md.push(built.pairs.map(p=>[p[0], p[1], d<=34?1:null, d<=34?0:null]));
      if (d<=34) bag[d]=built.row;
    }
    const hasTime=(club, dow, time, until)=>{
      for (let d=0; d<=until; d++){
        const i=md[d].findIndex(m=>m[0]===club||m[1]===club);
        if (i>=0 && bag[d][i].dow===dow && bag[d][i].time===time) return true;
      }
      return false;
    };
    [{dow:'So',time:'13:30',kind:'konferenz'},{dow:'Fr',time:'18:30',kind:'regional'},{dow:'Sa',time:'20:30',kind:'top'}].forEach(spec=>{
      for (let club=1; club<20; club++){
        if (hasTime(club, spec.dow, spec.time, 34)) continue;
        for (let d=19; d<=34; d++){
          const i=md[d].findIndex(m=>m[0]===club||m[1]===club);
          if (i<=0 || bag[d][i].dow!=='Sa' || bag[d][i].time!=='13:30') continue;
          bag[d][i]=Object.assign({}, spec);
          break;
        }
      }
    });
    const season={name:'2099/00', status:'running', leagues:{BL2:{teams, md}}, pools:{}, kickoffs:{BL2:bag}};
    let aConf=0, aSo=0, aFr=0, aTop=0, aSat=0;
    for (let d=0; d<=34; d++){
      const i=md[d].findIndex(m=>m[0]===0||m[1]===0);
      const s=bag[d][i];
      if (s.kind==='konferenz') aConf++;
      if (s.dow==='So' && s.time==='13:30') aSo++;
      if (s.dow==='Fr') aFr++;
      if (s.time==='20:30') aTop++;
      if (s.dow==='Sa' && s.time==='13:30') aSat++;
    }
    const held=blockObligations(season, 'BL2', 34);
    check('2. Liga: So 13:30 deckt Uhrzeit und Konferenzpunkt in einem Spiel', aConf===16 && aSo===0 && aFr>0 && aTop>0 && aSat>0 && held.ok===true, JSON.stringify({aConf, aSo, aFr, aTop, aSat, held}));
    const saved=[];
    for (let d=0; d<=34; d++){
      const i=md[d].findIndex(m=>m[0]===0||m[1]===0);
      if (bag[d][i].dow==='Fr'){ saved.push({d, i, slot:bag[d][i]}); bag[d][i]={dow:'Sa', time:'20:30', kind:'top'}; }
    }
    const tight=blockObligations(season, 'BL2', 34);
    check('Freitag plus So 13:30 bleiben zwei Spieltage', tight.ok===false && tight.reason==='zeit bund', JSON.stringify(tight));
    saved.forEach(x=>{ bag[x.d][x.i]=x.slot; });
    const locks=JSON.stringify(Object.keys(bag).filter(k=>+k<=34).sort((a,b)=>+a-+b).map(k=>bag[k]));
    const scores=JSON.stringify(md.map(r=>r.map(m=>[m[2], m[3]])));
    const next=scheduleNextBlock(season, 'BL2');
    const iA=md[35].findIndex(m=>m[0]===0||m[1]===0);
    const slotA=bag[35]&&bag[35][iA];
    const locksSame=JSON.stringify(Object.keys(bag).filter(k=>+k<=34).sort((a,b)=>+a-+b).map(k=>bag[k]))===locks;
    const scoresSame=JSON.stringify(md.map(r=>r.map(m=>[m[2], m[3]])))===scores;
    const count=list=>{ const m={}; list.forEach(s=>{ const k=s.dow+' '+s.time+' '+(s.kind||''); m[k]=(m[k]||0)+1; }); return Object.keys(m).sort().map(k=>k+'='+m[k]).join(','); };
    const shape=count(slotTemplate('BL2'))===count(bag[35]||[]);
    const closing=finalSaturdaySlot('BL2');
    const closeOk=[36,37].every(d=>(bag[d]||[]).length===10 && bag[d].every(s=>s.dow===closing.dow && s.time===closing.time && s.kind===closing.kind));
    const endOk=!!(bag[35] && closeOk && blockObligations(season, 'BL2', 37).ok);
    check('scheduleNextBlock gibt A So 13:30 und lässt den alten Block stehen', !!(next && slotA && slotA.dow==='So' && slotA.time==='13:30' && slotA.kind==='konferenz' && locksSame && scoresSame && shape && endOk), JSON.stringify({next, slotA, locksSame, scoresSame, shape, endOk}));
    report.targeted.bl2so={overlap, aConf, held:!!held.ok, tight:tight.reason, slotA, locksSame, scoresSame};
  })();
  report.residual={calls:RESIDUAL_STATS.calls, nodes:RESIDUAL_STATS.nodes, ms:RESIDUAL_STATS.ms, maxMs:RESIDUAL_STATS.maxMs, capped:RESIDUAL_STATS.capped, repairs:RESIDUAL_STATS.repairs};
  report.ui={ok:!!uiRes.ok, fails:uiRes.fails||[]};
  report.ansehenSelf={ok:!!anRes.ok, fails:anRes.fails||[]};
  check('UI-Test', !!uiRes.ok, (uiRes.fails||[]).slice(0,3).join(' | '));
  check('Ansehen-Test', !!anRes.ok, (anRes.fails||[]).slice(0,3).join(' | '));
  return {ok:!fails.length, fails, report};

}
window.FR = {computeTransition, syncRelay, relayHTML, relayWinner, relayHistNote, l5Balance, L5_IDS, RL_IDS, L5_FEED, get state(){return S;}, render, L, LEAGUES, POOLS, TEAMS, BL_ORDER, computeTable, leagueTable, tableHTML, simLeague, simSeason, simBlock, simAllCups, simDecide, syncDecide, fixedPlaces, firstLegLine, scheduleMirrorHolds, repairOpenReturns, ageBand, landRoundPoints, decideSettled, twoLegWinner, homeLeague, BL_RL, BL_L5, validateFixtures, makeSchedule, relegationProfile, scheduleNextBlock, slotTally, topKind, ansehenInfo, ansehenValue, ansehenLedger, ansehenParts, ansehenSelfTest, uiSelfTest, navEventSelfTest, titleAudit, titleRegisterHTML, simulateIsolated, releaseSim, buildInitialSquads, ageWeight, titleFactor, placePoints, seasonFactor, ANSEHEN, pairScore, powerSnapshot, matchValue, phaseWeights, terminSelfTest, viewTerminierung, certaintyFromEnv, certaintyMap, suggestPicks, finalizeSeason, rollSimulatedSeason, compactSeason, migrateArchive, packForDisk, unpackState, recomputePokalPoints, blLoyalSet, buildSupercup, supercupWinner, supercupPending, stadionName, pointsEnvelope, relegationBattle, isClosingDay, lateSeason, finalSaturdaySlot, buildCups, drawCupRound, cupWinner, cupFinalists, maybeAutoFinal, standingOf, planLandRounds, winRank, richRank, DFB_ROUNDS, whenSaved, save};
})();
