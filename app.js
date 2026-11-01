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
  {id:'OLNS',name:'Oberliga Nord – Staffel Süd',  short:'OL Nord-S', level:6, size:18, up:1, down:2, upTo:'RLN', area:'NS'},
  {id:'OLNN',name:'Oberliga Nord – Staffel Nord', short:'OL Nord-N', level:6, size:18, up:1, down:2, upTo:'RLN', area:'NN'},
  {id:'OLON',name:'Oberliga Ost – Staffel Nord',  short:'OL Ost-N',  level:6, size:18, up:1, down:2, upTo:'RLO', area:'ON'},
  {id:'OLOS',name:'Oberliga Ost – Staffel Süd',   short:'OL Ost-S',  level:6, size:18, up:1, down:2, upTo:'RLO', area:'OS'},
  {id:'OLBY',name:'Oberliga Bayern',              short:'OL BY',     level:6, size:18, up:1, down:2, upTo:'RLS', area:'BY'},
  {id:'OLBW',name:'Oberliga Baden-Württemberg',   short:'OL BW',     level:6, size:18, up:1, down:2, upTo:'RLS', area:'BW'},
  {id:'OLNRW',name:'Oberliga Nordrhein-Westfalen',short:'OL NRW',    level:6, size:18, up:1, down:2, upTo:'RLW', area:'NRW'},
  {id:'OLSW',name:'Oberliga Südwest',             short:'OL SW',     level:6, size:18, up:1, down:2, upTo:'RLW', area:'SW'}
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

// Ansehen: gewichteter Schnitt der Saisonpunkte im 25-Jahres-Fenster.
// Die jüngsten 10 Saisons des Fensters zählen 1,5-fach, ältere 1-fach.
// Saisons ohne Nachweis fallen aus Zähler und Nenner.
function windowEndYear(){
  let y=2025;
  (S.chronicle||[]).forEach(r=>{ const k=seasonYear(r.season); if(k>y) y=k; });
  return y;
}
function seasonWeight(seasonName, endYear){
  const y=seasonYear(seasonName);
  if (y>endYear || y<endYear-24) return 0;
  return y>=endYear-9 ? 1.5 : 1;
}
function historyEntries(id){
  const H=window.FR_HISTORY, out=[];
  if (H && H.rows && H.rows[id]){
    H.rows[id].forEach(r=>{
      out.push({season:H.seasons[r[0]], liga:H.ligas[r[1]], ebene:r[2], n:r[3], pl:r[4], pts:r[5]/100, src:'historie'});
    });
  }
  (S.chronicle||[]).forEach(r=>{
    if (r.id===id) out.push({season:r.season, liga:r.liga, ebene:r.ebene, n:r.n, pl:r.pl, pts:r.pts, src:'rechner'});
  });
  out.sort((a,b)=>a.season<b.season?-1:a.season>b.season?1:0);
  return out;
}
function ansehenInfo(id){
  const end=windowEndYear();
  let sw=0, sp=0, n=0;
  const rows=historyEntries(id).map(r=>{
    const w=seasonWeight(r.season, end);
    if (w>0){ sw+=w; sp+=w*r.pts; n++; }
    return Object.assign({w}, r);
  });
  return {end, rows, n, sw, value:n?sp/sw:null};
}
function ansehenValue(id){
  const info=ansehenInfo(id);
  if (info.value!=null) return info.value;
  return TEAMS[id].schnitt || 12;
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
  const lg=L[lid]; if(!lg) return {};
  return certaintyFromEnv(pointsEnvelope(season, lid), lg.up||0, relegationProfile(season, lid).down||0);
}
// Abstiegszahl dieser Saison. National fest. In Regionalliga und Oberliga so, dass die Staffel
// nach den tatsächlich ankommenden Absteigern von oben wieder auf Sollgröße kommt.
// relOut = Ankömmlinge + 1, weil ein Meister geht und zwei Aufsteiger von unten kommen.
function relegationProfile(season, lid){
  const lg=L[lid];
  if (!lg) return {down:0, nominal:0, incoming:[], reason:''};
  const nominal=lg.down||0;
  if (lg.level<=4) return {down:nominal, nominal, incoming:[], reason:''};
  const parent = lg.level===5 ? 'L4' : lg.upTo;
  const parentDown = lg.level===5 ? (L.L4.down||0) : relegationProfile(season, parent).down;
  const incoming = leagueTable(season, parent).slice(-parentDown).map(r=>r.id).filter(id=>homeLeague(id, lg.level)===lid);
  const down = incoming.length+1;
  const names = incoming.map(id=>TEAMS[id].name).join(', ');
  const from = lg.level===5 ? 'der 4. Liga' : ('der '+L[parent].name);
  const arrive = incoming.length===0 ? 'kommt niemand' : (incoming.length===1 ? 'kommt '+names : 'kommen '+incoming.length+' Vereine ('+names+')');
  const refill = lg.level===5
    ? 'Der Meister steigt in die 4. Liga auf, die beiden Oberligameister rücken nach.'
    : 'Der Meister steigt auf, zwei Vereine kommen aus der Amateurliga nach.';
  const abText = down===1 ? 'steigt eine Mannschaft ab' : 'steigen '+down+' Mannschaften ab';
  const reason = 'Aus '+from+' '+arrive+' in diese Staffel. '+refill+' Damit es bei '+lg.size+' Vereinen bleibt, '+abText+'.';
  return {down, nominal, incoming, reason};
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
function save(){
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch(e){ alert('Speichern im Browser fehlgeschlagen ('+e.name+'). Bitte den Spielstand exportieren, damit nichts verloren geht.'); }
}
function structureOk(d){
  const s=d&&d.seasons&&d.seasons[d.seasons.length-1];
  if(!s||!s.leagues||s.leagues.L5NO||s.leagues.L5SW) return false;
  return LEAGUES.every(l=>s.leagues[l.id]&&s.leagues[l.id].teams&&s.leagues[l.id].teams.length===l.size);
}
function load(){
  try { const raw = localStorage.getItem(KEY); if (raw){ const d=JSON.parse(raw); if (d && d.seasons && d.seasons.length && structureOk(d)) return d; } } catch(e){}
  return null;
}
const cur = () => S.seasons[S.view];
const latest = () => S.seasons[S.seasons.length-1];
const isEditable = () => S.view === S.seasons.length-1 && cur().status === 'running';

// ---------- Tabellen-Berechnung ----------
function matchesOf(season, lid, filt){
  const lg = season.leagues[lid]; if (!lg) return [];
  const half = lg.teams.length-1, out=[];
  lg.md.forEach((md,mi) => {
    if (filt==='hin' && mi>=half) return;
    if (filt==='rueck' && mi<half) return;
    md.forEach(m => { if (m[2]!=null && m[3]!=null) out.push({md:mi, h:lg.teams[m[0]], a:lg.teams[m[1]], hg:m[2], ag:m[3]}); });
  });
  return out;
}
function emptyRow(id){ return {id, sp:0,s:0,u:0,n:0,tg:0,gt:0,pkt:0,form:[]}; }
function addRes(r, gf, ga, md){
  r.sp++; r.tg+=gf; r.gt+=ga;
  const res = gf>ga?'S':gf<ga?'N':'U';
  if (res==='S'){r.s++; r.pkt+=3;} else if (res==='U'){r.u++; r.pkt+=1;} else r.n++;
  r.form.push([md,res]);
}
function computeTable(teamIds, matches, mode){
  const rows = {}; teamIds.forEach(id => rows[id]=emptyRow(id));
  matches.forEach(m => {
    if (mode!=='away' && rows[m.h]) addRes(rows[m.h], m.hg, m.ag, m.md);
    if (mode!=='home' && rows[m.a]) addRes(rows[m.a], m.ag, m.hg, m.md);
  });
  let list = Object.values(rows);
  list.forEach(r => { r.diff=r.tg-r.gt; r.form.sort((a,b)=>a[0]-b[0]); r.form=r.form.slice(-5).map(f=>f[1]); });
  const base = (a,b) => b.pkt-a.pkt || b.diff-a.diff || b.tg-a.tg;
  list.sort(base);
  // Direkter Vergleich für Gleichstände
  const out=[]; let i=0;
  while (i<list.length){
    let j=i+1; while (j<list.length && base(list[i],list[j])===0) j++;
    let grp = list.slice(i,j);
    if (grp.length>1){
      const ids = new Set(grp.map(r=>r.id));
      const mini = {}; grp.forEach(r=>mini[r.id]=emptyRow(r.id));
      matches.forEach(m => { if (ids.has(m.h)&&ids.has(m.a)){
        if (mode!=='away') addRes(mini[m.h],m.hg,m.ag,m.md);
        if (mode!=='home') addRes(mini[m.a],m.ag,m.hg,m.md); }});
      grp.sort((a,b)=>{ const x=mini[a.id], y=mini[b.id];
        return y.pkt-x.pkt || (y.tg-y.gt)-(x.tg-x.gt) || y.tg-x.tg || byRang(a.id,b.id); });
    }
    out.push(...grp); i=j;
  }
  out.forEach((r,k)=>r.pl=k+1);
  return out;
}
function leagueTable(season, lid, mode, filt){ return computeTable(season.leagues[lid].teams, matchesOf(season,lid,filt), mode||'all'); }
function leagueProgress(season, lid){
  let done=0,total=0; season.leagues[lid].md.forEach(md=>md.forEach(m=>{total++; if(m[2]!=null&&m[3]!=null) done++;})); return {done,total};
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
function simSeason(season){
  let c=0;
  LEAGUES.forEach(l=>{ c+=simLeague(season, l.id); });
  c += simAllCups(season);
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
  s.endData = computeTransition(s); s.status='ending'; S.view=S.seasons.length-1; S.ui.tab='abschluss'; save(); render();
}
function cancelSeasonEnd(){ const s=latest(); delete s.endData; s.status='running'; S.ui.tab='tabelle'; save(); render(); }
function suggestPicks(e){
  POOLS.forEach(p=>{ const need=e.need[p.ol]; e.picks[p.ol]=[...e.pools[p.id]].filter(id=>!e.moves.some(m=>m.id===id&&m.type==='ab'&&L[m.from]&&L[m.from].level===6)).sort(byRang).slice(0,need); });
}
function finalizeSeason(){
  const s=latest(), e=s.endData;
  for (const ol in e.need){ if ((e.picks[ol]||[]).length!==e.need[ol]) { alert('Bitte für '+L[ol].name+' genau '+e.need[ol]+' Aufsteiger wählen.'); return; } }
  const ns={name:nextSeasonName(s.name), status:'running', leagues:{}, pools:{}, markers:{}};
  const pools={}; POOLS.forEach(p=>pools[p.id]=[...e.pools[p.id]]);
  const newT={}; for (const k in e.newT) newT[k]=[...e.newT[k]];
  for (const ol in e.picks){ e.picks[ol].forEach(id=>{ for(const pid in pools){ const i=pools[pid].indexOf(id); if(i>=0) pools[pid].splice(i,1);} newT[ol].push(id); }); }
  // Prüfung Mannschaftszahlen
  const bad = LEAGUES.filter(l=>newT[l.id].length!==l.size);
  if (bad.length){ alert('Fehler: falsche Teamzahl in '+bad.map(l=>l.name+' ('+newT[l.id].length+')').join(', ')); return; }
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
      if (S.chronicle.some(c=>c.season===s.name && c.id===r.id)) return;
      const pts=seasonStrengthPoints(l.level, t.length, r.pl);
      S.chronicle.push({season:s.name, id:r.id, liga:l.name, ebene:l.level, n:t.length, pl:r.pl, pts:Math.round(pts*100)/100});
    });
  });
  ns.cups = buildCups(ns, s);
  recordCupHistory(s);
  S.seasons.push(ns); S.view=S.seasons.length-1; S.ui.tab='tabelle'; S.ui.md={};
  save(); render(); toast('Saison '+ns.name+' wurde erstellt.');
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
function standingOf(season){
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
  return {map, lists};
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
  return {winner:w, finalist:w===m.h?m.a:m.h};
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
    if (id){ taken.add(id); spots.push({bl, id, via}); }
  });
  const landIds=spots.map(s=>s.id);
  const amateur=amateurLeague.concat(landIds);
  const entrants=pro.concat(amateurLeague).concat(landIds);
  const dfb={
    id:'dfb', name:'DFB-Pokal', kind:'dfb',
    entrants, pro, amateur, spots,
    rounds:DFB_ROUNDS.map(r=>({name:r.name, neutral:!!r.neutral, drawn:false, byes:[], matches:[]}))
  };
  const here=standingOf(season);
  const land={};
  BL_ORDER.forEach(bl=>{
    const ids=landParticipants(season, bl);
    land[bl]={id:'land:'+bl, name:'Landespokal '+bl, kind:'land', bl, entrants:ids, rounds:planLandRounds(ids, here)};
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
function pairLowerHome(ids, st){
  const bag=shuffle(ids.slice()), matches=[];
  for (let i=0;i+1<bag.length;i+=2){
    let h=bag[i], a=bag[i+1];
    const hs=rankOf(st,h), as=rankOf(st,a);
    const homeIsH=hs.level!==as.level ? hs.level>as.level : hs.place>=as.place;
    if (!homeIsH) [h,a]=[a,h];
    matches.push(cupMatch(h,a,false));
  }
  return matches;
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
  let c=simCup(season, season.cups.dfb);
  BL_ORDER.forEach(bl=>{ if (season.cups.land[bl]) c+=simCup(season, season.cups.land[bl]); });
  return c;
}
function recordCupHistory(season){
  if (!season.cups) return;
  if (!S.pokalHistory) S.pokalHistory=[];
  if (S.pokalHistory.some(r=>r.season===season.name)) return;
  const land={};
  BL_ORDER.forEach(bl=>{
    const fin=cupFinalists(season.cups.land[bl]);
    land[bl]=fin?fin.winner:null;
  });
  const dfb=cupFinalists(season.cups.dfb);
  S.pokalHistory.push({season:season.name, dfb:dfb?dfb.winner:null, land});
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
function cupScoreLabel(m){
  if (m.hg==null || m.ag==null) return '';
  let s=m.hg+':'+m.ag;
  if (m.hg!==m.ag && m.et) s+=' i.V.';
  if (m.hg===m.ag && m.peh!=null && m.pea!=null) s+=', '+m.peh+':'+m.pea+' i.E.';
  return s;
}

// ---------- Darstellung ----------
function clubHTML(id, opts={}){
  const t=TEAMS[id]; const mk = opts.marker ? [].concat(opts.marker).map(x=>'<span class="mk">('+x+')</span>').join('') : '';
  const img='<img src="'+esc(t.crest)+'" alt="" loading="lazy">';
  const txt='<div class="txt"><div class="nm">'+esc(t.name)+mk+'</div>'+(opts.nobl?'':'<div class="bl">'+esc(t.bl)+'</div>')+'</div>';
  return '<div class="club'+(opts.crestRight?' crest-right':'')+'" data-club="'+id+'">'+(opts.crestRight?txt+img:img+txt)+'</div>';
}
function tableHTML(rows, lg, opts={}){
  const n=rows.length, season=opts.season||cur();
  const sure = opts.zones===false || !lg ? {} : certaintyMap(season, lg.id);
  const down = !lg || opts.zones===false ? 0 : relegationProfile(season, lg.id).down;
  let h='<table class="tbl"><thead><tr><th>Pl.</th><th class="l">Verein</th><th>Sp.</th><th>S</th><th>U</th><th>N</th><th>T/GT</th><th>Diff.</th><th>Pkt.</th>'+(opts.form===false?'':'<th>Form</th>')+'</tr></thead><tbody>';
  rows.forEach(r=>{
    const flag=sure[r.id]||'';
    let z = opts.zones===false ? '' : zoneOf(lg, r.pl, n, down);
    if (flag==='up') z='sure-up';
    else if (flag==='down') z='sure-down';
    h+='<tr class="'+(z?'z-'+z:'')+'"><td>'+r.pl+'</td><td class="l">'+clubHTML(r.id,{nobl:!!opts.nobl,marker:opts.markers===false?null:season.markers[r.id]})+'</td><td>'+r.sp+'</td><td>'+r.s+'</td><td>'+r.u+'</td><td>'+r.n+'</td><td>'+r.tg+':'+r.gt+'</td><td>'+(r.diff>0?'+':'')+r.diff+'</td><td class="pts">'+r.pkt+'</td>'+
      (opts.form===false?'':'<td><span class="form">'+r.form.map(f=>'<span class="f-'+f+'" title="'+({S:'Sieg',U:'Unentschieden',N:'Niederlage'}[f])+'">'+f+'</span>').join('')+'</span></td>')+'</tr>';
  });
  h+='</tbody></table>';
  if (opts.zones!==false) h+=legendHTML(lg, season);
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
    it.push(legendSwatch('sure-down','rechnerisch abgestiegen'));
  } else {
    if (lg.up===1) it.push(legendSwatch('auf','Meister &amp; Aufstieg → '+leagueName(lg.upTo)));
    else if (lg.up>1) it.push(legendSwatch('auf','Aufstieg → '+leagueName(lg.upTo)));
    if (lg.up) it.push(legendSwatch('sure-up','Aufstieg rechnerisch sicher'));
    if (lg.down){
      const ab = prof && prof.down!==lg.down ? 'Abstieg (diesmal '+prof.down+' statt '+lg.down+')' : 'Abstieg';
      it.push(legendSwatch('ab', ab));
      it.push(legendSwatch('sure-down','rechnerisch abgestiegen'));
    }
  }
  it.push('<span class="muted">'+(lg.id==='BL'?'(M) Meister · (CL) (EL) (UECL) · ':'')+'(Auf) Aufsteiger · (Ab) Absteiger · sicher nur ohne jede Punktchance</span>');
  return '<div class="legend">'+it.join('')+'</div>';
}

function renderNav(){
  const pokal=S.ui.tab==='pokal', ansehen=S.ui.tab==='ansehen', amateur=S.ui.league==='AM'||!!P[S.ui.league];
  let amN=0; POOLS.forEach(p=>amN+=(cur().pools[p.id]||[]).length);
  let h='';
  LEAGUES.forEach(l=>{ h+='<a class="nav-item'+(!pokal && !ansehen && !amateur && S.ui.league===l.id?' active':'')+'" data-league="'+l.id+'">'+esc(l.name)+'</a>'; });
  h+='<a class="nav-item'+(!pokal && !ansehen && amateur?' active':'')+'" data-league="AM">Amateurliga<span class="cnt">'+amN+'</span></a>';
  h+='<a class="nav-item nav-extra'+(ansehen?' active':'')+'" data-tab="ansehen">Ansehen</a>';
  h+='<a class="nav-item'+(pokal?' active':'')+'" data-tab="pokal">Pokal</a>';
  $('#leagueNav').innerHTML=h;
  const sel=id=>!pokal && S.ui.league===id?' selected':'';
  let o=LEAGUES.map(l=>'<option value="'+l.id+'"'+sel(l.id)+'>'+esc(l.name)+'</option>').join('');
  o+='<option value="AM"'+(amateur&&!pokal?' selected':'')+'>Amateurliga</option>';
  o+='<option value="pokal"'+(pokal?' selected':'')+'>Pokal</option>';
  $('#mobileLeague').innerHTML=o;
  $('#seasonSelect').innerHTML=S.seasons.map((s,i)=>'<option value="'+i+'"'+(i===S.view?' selected':'')+'>'+s.name+(s.status==='done'?' (abgeschlossen)':s.status==='ending'?' (Abschluss)':'')+'</option>').join('');
}

const TABS=[['tabelle','Tabelle'],['karte','Karte'],['terminierung','Terminierung'],['heimaus','Heim/Auswärts'],['hinrueck','Hinrunde/Rückrunde'],['ewig','Ewige Tabelle'],['historie','Historie']];
function renderMigrate(){
  let el=$('#migrate');
  if(!el){ el=document.createElement('div'); el.id='migrate'; el.className='notice hidden'; $('#main').prepend(el); }
  if(!S.ui.showMigrate){ el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.innerHTML='Die Terminierung läuft jetzt in Blöcken von vier Spieltagen. Ein älterer Spielstand wird nicht übernommen. <button type="button" class="btn small" id="btnMigrate">Neu starten</button>';
  $('#btnMigrate').onclick=()=>{ try{ localStorage.removeItem(OLD_KEY); localStorage.removeItem('fussballrechner_v1'); }catch(e){} S=newGame(); save(); render(); toast('Neuer Spielstand gestartet.'); };
}
function renderPokal(s){
  ensureCups(s);
  const key=S.ui.cup && (S.ui.cup==='dfb' || (s.cups.land&&s.cups.land[S.ui.cup])) ? S.ui.cup : 'dfb';
  S.ui.cup=key;
  const cup=getCup(s, key);
  const view=S.ui.cupView||'spiele';
  $('#title').textContent=cup?cup.name:'Pokal';
  let sub='Saison '+s.name+' · DFB-Pokal und 16 Landespokale';
  if (s.status==='running' && S.view===S.seasons.length-1) sub+=' · <button class="btn small" data-act="simSeason">Saison simulieren</button>';
  if (s.status==='done') sub+=' · <span class="muted">abgeschlossene Saison</span>';
  $('#subline').innerHTML=sub;
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
  h+='<span class="toggle" data-toggle="cupView">'+[['spiele','Spielplan'],['baum','Turnierbaum'],['sieger','Sieger']].map(([k,n])=>'<button data-v="'+k+'" class="'+(view===k?'active':'')+'">'+n+'</button>').join('')+'</span>';
  h+='</div>';
  if (!cup) return h+'<div class="box">Dieser Pokal fehlt.</div>';
  if (view==='sieger') return h+viewCupWinners(s);
  if (view==='baum') return h+viewCupTree(s, cup);
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
  const done=round.matches.filter(cupWinner).length;
  let h='<div class="card"><div class="card-title"><span>'+esc(round.name)+' <span class="progress">('+(round.drawn?done+'/'+round.matches.length+' entschieden':'nicht ausgelost')+')</span></span>';
  h+='<span class="md-nav"><button class="btn" data-act="cupPrev">‹</button><select id="cupRound">';
  cup.rounds.forEach((r,i)=>{ h+='<option value="'+i+'"'+(i===ri?' selected':'')+'>'+esc(r.name)+(roundComplete(r)?' ✓':'')+'</option>'; });
  h+='</select><button class="btn" data-act="cupNext">›</button></span></div>';
  if (cup.kind==='dfb' && ri===0){
    h+='<p class="cup-note">64 Mannschaften. Profitopf: die 20 der Bundesliga und die Plätze 1–12 der 2. Bundesliga. Amateurtopf: Plätze 13–20 der 2. Bundesliga, Plätze 1–8 der 3. Liga und 16 über die Landespokale. In der 1. Runde spielt jeder Amateurverein zu Hause gegen einen Profi.</p>';
  }
  if (cup.kind==='land' && ri===0){
    h+='<p class="cup-note">'+cup.entrants.length+' Vereine aus '+esc(cup.bl)+', von der 3. Liga bis zur Amateurliga. Stärkere Vereine haben bei ungerader Feldgröße ein Freilos. Der Sieger zieht in den DFB-Pokal der nächsten Saison ein.</p>';
  }
  if (!round.drawn){
    const ready=ri===0 || roundComplete(cup.rounds[ri-1]);
    h+='<div class="sp-tools">';
    if (ed && ready) h+='<button class="btn primary" data-act="cupDraw" data-cup="'+esc(key)+'" data-ri="'+ri+'">Auslosen</button>';
    else h+='<span class="muted">'+(ed?'Zuerst die vorherige Runde zu Ende spielen.':'Diese Runde ist nicht ausgelost.')+'</span>';
    h+='</div></div>';
    if (round.byes && round.byes.length) h+='<div class="box"><b>Freilos in dieser Runde:</b> '+round.byes.map(id=>esc(TEAMS[id].name)).join(', ')+'</div>';
    if (cup.kind==='dfb' && cup.spots) h+=viewCupSpots(cup);
    return h;
  }
  const rows=round.matches.map((m,i)=>({m,i})).sort((a,b)=>cupSlotOrder(a.m.slot,b.m.slot)||a.i-b.i);
  let prev='';
  rows.forEach(({m,i})=>{
    const lab=cupSlotLabel(m.slot, m.neutral||round.neutral);
    if (lab!==prev){ h+='<div class="slot-head">'+esc(lab)+'</div>'; prev=lab; }
    h+=cupMatchHTML(s, m, key, ri, i, ed);
  });
  if (round.byes && round.byes.length) h+='<div class="sp-hint"><b>Freilos:</b> '+round.byes.map(id=>esc(TEAMS[id].name)).join(', ')+'</div>';
  h+='<div class="sp-hint">Ein Sieg trägt den Sieger ein. „i.V.“ markiert eine Entscheidung nach Verlängerung. Beim Unentschieden entscheidet das Elfmeterschießen, angezeigt als 1:1, 4:3 i.E.</div>';
  h+='</div>';
  if (cup.kind==='dfb' && cup.spots) h+=viewCupSpots(cup);
  return h;
}
function viewCupSpots(cup){
  let h='<div class="box"><h3>Die 16 Landespokal-Plätze</h3><table class="tbl"><thead><tr><th class="l">Land</th><th class="l">Verein</th><th class="l">Weg</th></tr></thead><tbody>';
  (cup.spots||[]).forEach(sp=>{
    h+='<tr><td class="l">'+esc(sp.bl)+'</td><td class="l">'+clubHTML(sp.id,{nobl:true})+'</td><td class="l">'+esc(VIA_TEXT[sp.via]||sp.via)+'</td></tr>';
  });
  h+='</tbody></table></div>';
  return h;
}
function cupMatchHTML(s, m, key, ri, i, ed){
  const played=m.hg!=null && m.ag!=null;
  const win=cupWinner(m);
  const draw=played && m.hg===m.ag;
  const km=m.neutral ? null : kmBetween(m.h, m.a);
  const step=side=>ed?'<span class="stepper"><button type="button" data-act="cupGoal" data-cup="'+esc(key)+'" data-ri="'+ri+'" data-mi="'+i+'" data-side="'+side+'" data-dir="1" title="Tor">+</button><button type="button" data-act="cupGoal" data-cup="'+esc(key)+'" data-ri="'+ri+'" data-mi="'+i+'" data-side="'+side+'" data-dir="-1" title="Tor zurück">−</button></span>':'';
  let meta='';
  if (m.neutral) meta='Berlin · neutral';
  else if (km!=null) meta=km+' km';
  if (played && !draw && ed) meta+=(meta?'<br>':'')+'<label class="ie-box"><input type="checkbox" data-cup-et="1" data-cup="'+esc(key)+'" data-ri="'+ri+'" data-mi="'+i+'"'+(m.et?' checked':'')+'> i.V.</label>';
  else if (played && !draw && m.et) meta+=(meta?' · ':'')+'i.V.';
  if (draw){
    const ph=m.peh==null?'–':m.peh, pa=m.pea==null?'–':m.pea;
    meta+=(meta?'<br>':'');
    if (ed){
      meta+='<span class="ie-box">i.E. '+stepPen(key,ri,i,0)+'<b>'+ph+':'+pa+'</b>'+stepPen(key,ri,i,1)+'</span>';
    } else if (m.peh!=null && m.pea!=null) meta+=m.peh+':'+m.pea+' i.E.';
  }
  const score=played?m.hg+':'+m.ag:'-:-';
  return '<div class="match cup'+(win?' done':'')+'" data-mi="'+i+'"><div class="home"><span class="liga-edge" title="'+esc(ligaEdge(s,m.h))+'">'+esc(ligaEdge(s,m.h))+'</span>'+clubHTML(m.h,{crestRight:true})+'</div>'+
    '<div class="scorecol"><div class="score">'+step(0)+'<span class="scoreline"><span class="goals">'+ (played?m.hg:'-') +'</span><b>:</b><span class="goals">'+(played?m.ag:'-')+'</span></span>'+step(1)+'</div>'+
    '<div class="meta">'+meta+'</div></div>'+
    '<div class="away">'+clubHTML(m.a)+'<span class="liga-edge" title="'+esc(ligaEdge(s,m.a))+'">'+esc(ligaEdge(s,m.a))+'</span></div>'+
    (ed?'<button type="button" class="del" data-act="cupDel" data-cup="'+esc(key)+'" data-ri="'+ri+'" data-mi="'+i+'" title="Zurücksetzen">×</button>':'<span></span>')+'</div>';
}
function stepPen(key, ri, i, side){
  return '<span class="stepper"><button type="button" data-act="cupPen" data-cup="'+esc(key)+'" data-ri="'+ri+'" data-mi="'+i+'" data-side="'+side+'" data-dir="1">+</button><button type="button" data-act="cupPen" data-cup="'+esc(key)+'" data-ri="'+ri+'" data-mi="'+i+'" data-side="'+side+'" data-dir="-1">−</button></span>';
}
function ligaEdge(season, id){
  const lid=clubLeagueId(season, id);
  if (L[lid]) return L[lid].short;
  if (P[lid]) return 'Amateur';
  return '';
}
function viewCupTree(s, cup){
  let h='<div class="card" style="padding:10px"><div class="bracket">';
  cup.rounds.forEach(round=>{
    h+='<div class="br-col"><h4>'+esc(round.name)+'</h4>';
    if (!round.drawn) h+='<div class="br-m bye">noch nicht ausgelost</div>';
    else round.matches.forEach(m=>{
      const w=cupWinner(m);
      const sc=cupScoreLabel(m);
      h+='<div class="br-m"><div class="ln'+(w===m.h?' win':'')+'"><span>'+esc(TEAMS[m.h].name)+'</span></div><div class="ln'+(w===m.a?' win':'')+'"><span>'+esc(TEAMS[m.a].name)+'</span><span>'+esc(sc)+'</span></div></div>';
    });
    (round.byes||[]).forEach(id=>{ h+='<div class="br-m bye">Freilos: '+esc(TEAMS[id].name)+'</div>'; });
    h+='</div>';
  });
  h+='</div></div>';
  return h;
}
function viewCupWinners(s){
  const rows=[];
  S.seasons.forEach(sea=>{
    if (!sea.cups) return;
    const dfb=cupFinalists(sea.cups.dfb);
    const land={};
    let any=!!dfb;
    BL_ORDER.forEach(bl=>{
      const fin=sea.cups.land && cupFinalists(sea.cups.land[bl]);
      if (fin){ land[bl]=fin.winner; any=true; }
    });
    if (any || sea.status==='done') rows.push({season:sea.name, dfb:dfb?dfb.winner:null, land});
  });
  if (!rows.length) return '<div class="box"><h3>Sieger</h3><p class="muted">Noch kein beendeter Pokal. Nach dem Finale stehen hier der DFB-Pokalsieger und die 16 Landespokalsieger.</p></div>';
  let h='<div class="box"><h3>DFB-Pokalsieger</h3><table class="tbl"><thead><tr><th class="l">Saison</th><th class="l">Sieger</th></tr></thead><tbody>';
  rows.slice().reverse().forEach(r=>{
    h+='<tr><td class="l">'+esc(r.season)+'</td><td class="l">'+(r.dfb?clubHTML(r.dfb,{nobl:true}):'<span class="muted">–</span>')+'</td></tr>';
  });
  h+='</tbody></table></div><div class="box"><h3>Landespokalsieger</h3><table class="tbl"><thead><tr><th class="l">Land</th>'+rows.map(r=>'<th>'+esc(r.season)+'</th>').join('')+'</tr></thead><tbody>';
  BL_ORDER.forEach(bl=>{
    h+='<tr><td class="l">'+esc(bl)+'</td>'+rows.map(r=>'<td class="l">'+(r.land[bl]?esc(TEAMS[r.land[bl]].name):'–')+'</td>').join('')+'</tr>';
  });
  h+='</tbody></table></div>';
  return h;
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
function applyCupPen(key, ri, mi, side, dir){
  mutateCup(key, ri, mi, m=>{
    if (m.hg==null || m.hg!==m.ag) return;
    if (m.peh==null) m.peh=0;
    if (m.pea==null) m.pea=0;
    if (side===0) m.peh=Math.max(0, m.peh+dir); else m.pea=Math.max(0, m.pea+dir);
  });
}
function mutateCup(cupKey, ri, mi, fn){
  const s=cur(); if (!isEditable()) return;
  ensureCups(s);
  const cup=getCup(s, cupKey); if (!cup) return;
  const m=cup.rounds[ri] && cup.rounds[ri].matches[mi]; if (!m) return;
  fn(m);
  if (m.hg!=null && m.ag!=null && m.hg!==m.ag){ m.peh=null; m.pea=null; }
  if (m.hg!=null && m.ag!=null && m.hg===m.ag) m.et=false;
  clearLaterRounds(cup, ri);
  save(); render();
}
function render(){
  renderMigrate();
  renderNav();
  const s=cur(), lid=S.ui.league;
  if (s.status==='ending' && S.ui.tab==='abschluss'){ $('#title').textContent='Saisonabschluss '+s.name; $('#subline').innerHTML=''; $('#tabs').innerHTML=''; renderAbschluss(); return; }
  if (S.ui.tab==='abschluss') S.ui.tab='tabelle';
  if (S.ui.tab==='ansehen'){
    $('#title').textContent='Ansehen';
    $('#subline').innerHTML='';
    $('#tabs').innerHTML='';
    $('#view').innerHTML=S.ui.ansehenId?viewAnsehenDetail(S.ui.ansehenId):viewAnsehen();
    return;
  }
  if (S.ui.tab==='pokal'){
    renderPokal(s);
    return;
  }
  if (lid==='AM' || P[lid]){ renderAmateur(); return; }
  const lg=L[lid];
  $('#title').textContent=lg.name;
  const pr=seasonProgress(s), lp=leagueProgress(s,lid);
  let sub = 'Saison '+s.name+' · <a data-act="rules">Regeln &amp; Auf-/Abstieg</a> · <span class="muted">Liga: '+lp.done+'/'+lp.total+' Spiele · alle Ligen: '+pr.done+'/'+pr.total+'</span>';
  if (s.status==='running' && S.view===S.seasons.length-1) sub+=' · <button class="btn small" data-act="simSeason">Saison simulieren</button> · <button class="btn small primary" data-act="end">Saison abschließen</button>';
  if (s.status==='ending') sub+=' · <button class="btn small primary" data-act="toEnd">Zum Saisonabschluss</button>';
  if (s.status==='done') sub+=' · <span class="muted">abgeschlossene Saison (nur Ansicht)</span>';
  $('#subline').innerHTML=sub;
  $('#tabs').innerHTML=TABS.map(([k,n])=>'<a class="tab'+(S.ui.tab===k?' active':'')+'" data-tab="'+k+'">'+n+'</a>').join('');
  const v=$('#view');
  if (S.ui.tab==='tabelle') v.innerHTML=viewTabelle(s,lid);
  else if (S.ui.tab==='karte') v.innerHTML=viewKarte(s,lid);
  else if (S.ui.tab==='terminierung') v.innerHTML=viewTerminierung(s,lid);
  else if (S.ui.tab==='heimaus') v.innerHTML=viewToggle(s,lid,'ha');
  else if (S.ui.tab==='hinrueck') v.innerHTML=viewToggle(s,lid,'hr');
  else if (S.ui.tab==='ewig') v.innerHTML=viewEwig(lid);
  else if (S.ui.tab==='historie') v.innerHTML=viewHistorie(lid);
  if (S.ui.tab==='karte') bindMap();
}
function currentMd(s,lid){
  const key=S.view+':'+lid;
  if (S.ui.md[key]!=null) return S.ui.md[key];
  const md=s.leagues[lid].md; const i=md.findIndex(d=>d.some(m=>m[2]==null||m[3]==null));
  return i<0 ? md.length-1 : i;
}
function viewTabelle(s,lid){
  return '<div class="split"><div class="card" id="tableCard">'+tableHTML(leagueTable(s,lid),L[lid],{nobl:true})+'</div><div class="card" id="spCard">'+spielplanHTML(s,lid)+'</div></div>';
}
let shownMd=0;
function spielplanHTML(s,lid){
  const lg=s.leagues[lid], mi=currentMd(s,lid);
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
      h+='<div class="match unscheduled" data-k="'+k+'"><div class="home">'+clubHTML(hid,{crestRight:true})+'</div>'+
        '<div class="scorecol"><div class="score"><span class="scoreline"><span class="goals">-</span><b>:</b><span class="goals">-</span></span></div>'+
        '<div class="meta">'+(km==null?'':km+' km')+'</div></div>'+
        '<div class="away">'+clubHTML(aid)+'</div><span></span></div>';
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
    const step=side=>ed?'<span class="stepper"><button type="button" data-act="goal" data-k="'+k+'" data-side="'+side+'" data-dir="1" title="Tor">+</button><button type="button" data-act="goal" data-k="'+k+'" data-side="'+side+'" data-dir="-1" title="Tor zurück">−</button></span>':'';
    h+='<div class="match'+(has?' done':'')+'" data-k="'+k+'"><div class="home">'+clubHTML(hid,{crestRight:true})+'</div>'+
      '<div class="scorecol"><div class="score">'+step(0)+'<span class="scoreline"><span class="goals" data-side="0">'+(has?m[2]:'-')+'</span><b>:</b><span class="goals" data-side="1">'+(has?m[3]:'-')+'</span></span>'+step(1)+'</div>'+
      '<div class="meta">'+(km==null?'':km+' km')+'</div></div>'+
      '<div class="away">'+clubHTML(aid)+'</div>'+(ed?'<button type="button" class="del" data-act="del" data-k="'+k+'" title="Auf -:- zurücksetzen">×</button>':'<span></span>')+'</div>';
  });
  if (ed){
    h+='<div class="sp-tools"><button class="btn small" data-act="simMd" title="Nur leere Spiele dieses Spieltags">Spieltag simulieren</button><button class="btn small" data-act="simBlock" title="Die vier Spieltage des aktuellen Blocks">Block simulieren</button><button class="btn small" data-act="simLeague">Liga zu Ende simulieren</button></div>'+
      '<div class="sp-hint">＋ und − ändern die Tore. Offenes Spiel: Heim-＋ wird 1:0, Gast-＋ wird 0:1, − wird 0:0. Bei 0:0 setzen − oder × das Spiel auf -:- zurück. Ist der letzte angesetzte Spieltag voll, wird der nächste Block terminiert.</div>';
  }
  return h;
}
function viewToggle(s,lid,kind){
  const key='tg_'+kind; const opt=S.ui[key]||(kind==='ha'?'home':'hin');
  const btns = kind==='ha' ? [['home','Heimtabelle'],['away','Auswärtstabelle']] : [['hin','Hinrunde'],['rueck','Rückrunde']];
  const rows = kind==='ha' ? leagueTable(s,lid,opt) : leagueTable(s,lid,'all',opt);
  return '<div class="toggle" data-toggle="'+key+'">'+btns.map(([k,n])=>'<button data-v="'+k+'" class="'+(opt===k?'active':'')+'">'+n+'</button>').join('')+'</div><div class="card">'+tableHTML(rows,L[lid],{zones:false})+'</div>';
}
function viewEwig(lid){
  const agg={}, seasons={};
  S.seasons.forEach(s=>{ if(!s.leagues[lid]) return;
    s.leagues[lid].teams.forEach(id=>{ seasons[id]=(seasons[id]||0)+1; });
    computeTable(s.leagues[lid].teams, matchesOf(s,lid), 'all').forEach(r=>{
      const a=agg[r.id]||(agg[r.id]=emptyRow(r.id)); ['sp','s','u','n','tg','gt','pkt'].forEach(k=>a[k]+=r[k]); });
  });
  const rows=Object.values(agg); rows.forEach(r=>r.diff=r.tg-r.gt);
  rows.sort((a,b)=>b.pkt-a.pkt||b.diff-a.diff||b.tg-a.tg||byRang(a.id,b.id));
  let h='<div class="card"><table class="tbl"><thead><tr><th>Pl.</th><th class="l">Verein</th><th>Saisons</th><th>Sp.</th><th>S</th><th>U</th><th>N</th><th>T/GT</th><th>Diff.</th><th>Pkt.</th></tr></thead><tbody>';
  rows.forEach((r,i)=>{ h+='<tr><td>'+(i+1)+'</td><td class="l">'+clubHTML(r.id)+'</td><td>'+seasons[r.id]+'</td><td>'+r.sp+'</td><td>'+r.s+'</td><td>'+r.u+'</td><td>'+r.n+'</td><td>'+r.tg+':'+r.gt+'</td><td>'+(r.diff>0?'+':'')+r.diff+'</td><td class="pts">'+r.pkt+'</td></tr>'; });
  h+='</tbody></table><div class="legend">Alle Spiele aller Saisons in der '+esc(L[lid].name)+' (inkl. laufender Saison), Wertung 3-Punkte-Regel.</div></div>';
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
function viewHistorie(lid){
  const done=S.seasons.filter(s=>s.endData&&s.endData.tables);
  let h='<div class="box"><h3>Saisons der '+esc(L[lid].name)+'</h3>';
  if (!done.length) h+='<p class="muted">Noch keine abgeschlossene Saison. Nach dem ersten Saisonabschluss stehen hier Meister, Aufsteiger und Absteiger.</p>';
  else {
    h+='<table class="tbl"><thead><tr><th class="l">Saison</th><th class="l">Meister</th><th class="l">Aufsteiger</th><th class="l">Absteiger</th><th class="l">Neu dabei</th></tr></thead><tbody>';
    done.slice().reverse().forEach(s=>{ const e=s.endData, t=e.tables[lid];
      const up=e.moves.filter(m=>m.from===lid&&m.type==='auf'), dn=e.moves.filter(m=>m.from===lid&&m.type==='ab');
      const inc=e.moves.filter(m=>m.to===lid).map(m=>m.id).concat(e.picks[lid]||[]);
      const nm=id=>'<a data-club="'+id+'" style="cursor:pointer">'+esc(TEAMS[id].name)+'</a>';
      h+='<tr><td class="l">'+s.name+'</td><td class="l">'+clubHTML(t[0].id,{nobl:true})+'</td><td class="l" style="white-space:normal">'+(up.map(m=>nm(m.id)+' <span class="muted">→ '+leagueShort(m.to)+'</span>').join(', ')||'–')+'</td><td class="l" style="white-space:normal">'+(dn.map(m=>nm(m.id)+' <span class="muted">→ '+leagueShort(m.to)+'</span>').join(', ')||'–')+'</td><td class="l" style="white-space:normal">'+(inc.map(nm).join(', ')||'–')+'</td></tr>'; });
    h+='</tbody></table>';
  }
  h+='</div><div class="box"><h3>Platzierungsverlauf der aktuellen Vereine</h3><div style="overflow:auto"><table class="tbl"><thead><tr><th class="l">Verein</th>'+S.seasons.map(s=>'<th>'+s.name+'</th>').join('')+'</tr></thead><tbody>';
  cur().leagues[lid].teams.slice().sort(byRang).forEach(id=>{
    const pl=clubPlacements(id);
    h+='<tr><td class="l">'+clubHTML(id)+'</td>'+S.seasons.map(s=>{ const p=pl.find(x=>x.season===s.name); if(!p) return '<td>–</td>'; return '<td>'+(p.pl?leagueShort(p.lid)+' '+p.pl+'.'+(p.final?'':'*'):'Amateur')+'</td>'; }).join('')+'</tr>';
  });
  h+='</tbody></table></div><p class="muted" style="margin:6px 0 0">* = laufende Saison (aktueller Tabellenplatz). Klick auf einen Verein zeigt alle Details.</p></div>';
  return h;
}
const BL_ORDER=['Schleswig-Holstein','Hamburg','Mecklenburg-Vorpommern','Bremen','Niedersachsen','Berlin','Brandenburg','Sachsen-Anhalt','Sachsen','Thüringen','Nordrhein-Westfalen','Hessen','Rheinland-Pfalz','Saarland','Baden-Württemberg','Bayern'];
function renderAmateur(){
  const s=cur();
  $('#title').textContent='Amateurliga';
  $('#subline').innerHTML='Saison '+s.name+' · kein Spielbetrieb, keine Staffeln – Vereine nach Bundesland. Zum Saisonende wählst du je Oberliga zwei Aufsteiger.';
  $('#tabs').innerHTML='';
  const ids=[]; POOLS.forEach(p=>(s.pools[p.id]||[]).forEach(id=>ids.push(id)));
  const by={}; ids.forEach(id=>{ const bl=TEAMS[id].bl; (by[bl]||(by[bl]=[])).push(id); });
  let h='<div class="box"><input class="searchbox" id="poolSearch" placeholder="Verein suchen …"><p class="muted">'+ids.length+' Vereine, gruppiert nach Bundesland.</p></div>';
  BL_ORDER.forEach(bl=>{
    const list=(by[bl]||[]).slice().sort(byRang); if(!list.length) return;
    h+='<div class="box"><h3>'+esc(bl)+' <span class="muted">'+list.length+'</span></h3><div class="amateur-list">'+
      list.map(id=>'<div data-name="'+esc(TEAMS[id].name.toLowerCase()+' '+bl.toLowerCase())+'">'+clubHTML(id,{nobl:true})+'<span class="muted" style="font-size:11px;margin-left:32px">'+(TEAMS[id].rang?'Rang '+TEAMS[id].rang:'ohne Wertung')+'</span></div>').join('')+'</div></div>';
  });
  $('#view').innerHTML=h;
}
function coordOf(id){
  const c=window.FR_COORDS&&window.FR_COORDS[id];
  if(!c) return null;
  return {lat:+c[0], lon:+c[1], stadion:c[2]||''};
}
function kmBetween(a,b){
  const A=coordOf(a), B=coordOf(b); if(!A||!B) return null;
  const R=6371, rad=Math.PI/180, dLat=(B.lat-A.lat)*rad, dLon=(B.lon-A.lon)*rad;
  const s=Math.sin(dLat/2)**2+Math.cos(A.lat*rad)*Math.cos(B.lat*rad)*Math.sin(dLon/2)**2;
  return Math.round(2*R*Math.asin(Math.min(1,Math.sqrt(s))));
}
const DOW={Fr:0,Sa:1,So:2};
function expandSlots(list){ const out=[]; list.forEach(s=>{ for(let i=0;i<(s.n||1);i++) out.push({dow:s.dow,time:s.time,kind:s.kind||''}); }); return out; }
function slotTemplate(lid){
  if(lid==='BL') return expandSlots([{dow:'Fr',time:'20:30'},{dow:'Sa',time:'15:30',kind:'konferenz',n:6},{dow:'Sa',time:'18:30',kind:'top'},{dow:'So',time:'15:30',kind:'regional'},{dow:'So',time:'17:30',kind:'regional'}]);
  if(lid==='BL2') return expandSlots([{dow:'Fr',time:'18:30',n:2},{dow:'Sa',time:'13:30',kind:'konferenz',n:4},{dow:'Sa',time:'20:30',kind:'top'},{dow:'So',time:'13:30',kind:'konferenz',n:3}]);
  if(lid==='L3') return expandSlots([{dow:'Fr',time:'19:00',kind:'top'},{dow:'Sa',time:'14:00',kind:'konferenz',n:5},{dow:'Sa',time:'16:30',kind:'top'},{dow:'So',time:'13:30'},{dow:'So',time:'16:30',kind:'regional'},{dow:'So',time:'19:30',kind:'regional'}]);
  if(lid==='L4') return expandSlots([{dow:'Fr',time:'19:00',kind:'top'},{dow:'Sa',time:'14:00',kind:'konferenz',n:6},{dow:'Sa',time:'16:30',kind:'top'},{dow:'So',time:'13:30'},{dow:'So',time:'16:30',kind:'regional'},{dow:'So',time:'19:30',kind:'regional'}]);
  return expandSlots([{dow:'Fr',time:'18:30',kind:'top'},{dow:'Sa',time:'14:30',kind:'konferenz',n:8}]);
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
  return Math.min(H.power,A.power)*2 + (H.power+A.power)*0.1 - gapPen;
}
function firstTopTarget(id, ids, total){
  const order=ids.slice().sort((a,b)=>ansehenValue(a)-ansehenValue(b) || byRang(a,b));
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
        const mustSave=!uncovered && needsLeft<=usefulZero && bothCount>=topSlots;
        const urgeOf=id=>rescueUrge(id, mi, total, lg.teams);
        if (kind==='both'){
          c += -q*280;
          if (needH) c -= urgeOf(h)*0.35;
          if (needA) c -= urgeOf(a)*0.35;
        } else if (kind==='rescue' && !mustSave){
          const urge=Math.max(needH?urgeOf(h):0, needA?urgeOf(a):0);
          c += 14000 - urge - q*20;
        } else if (kind==='rescue') c += 95000;
        else if (Math.min(rankOf(h), rankOf(a))<=upper && (needH||needA)){
          const urge=Math.max(needH?urgeOf(h):0, needA?urgeOf(a):0);
          c += 12000 - urge - q*25;
        }         else if (Math.min(rankOf(h), rankOf(a))<=upper) c += 420000;
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
            const all=lg.teams.map(t=>counts[t].konferenz);
            const curMax=Math.max(...all), curMin=Math.min(...all);
            if (cnt.konferenz>=curMax && curMin<curMax) pull -= 8000000;
            else pull += (curMax-cnt.konferenz+1)*1000000;
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
    let best=null;
    row.forEach((other,j)=>{
      if (j===i || !other || other.kind==='top' || other.kind==='konferenz' || topClass(j)>2) return;
      const ids=[lg.teams[md[j][0]], lg.teams[md[j][1]]];
      const urge=Math.max(...ids.map(id=>counts[id].top===0 ? rescueUrge(id, mi, total, lg.teams) : 0));
      if (urge<=0) return;
      if (!best || urge>best.urge) best={j, urge};
    });
    if (best && (best.urge>18000 || rem<=6)){ const tmp=row[i]; row[i]=row[best.j]; row[best.j]=tmp; }
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
      let alt=null;
      row.forEach((other,j)=>{
        if (!other || other.kind!=='top') return;
        const t2=[lg.teams[md[j][0]], lg.teams[md[j][1]]];
        if (t2.some(id=>counts[id].top===0)) return;
        if (slot.kind==='konferenz' && t2.some(id=>counts[id].konferenz+(rem-1)<total/2)) return;
        alt=j;
      });
      if (alt!=null){ const tmp=row[i]; row[i]=row[alt]; row[alt]=tmp; }
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
  const lg=s.leagues[lid], n=lg.teams.length, half=n-1, total=lg.md.length;
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
  const blocks=[];
  for (let from=0; from<total; ){
    const range=nextBlockRange(n, from); if(!range) break;
    blocks.push(range); from=range[1]+1;
  }
  const key=S.view+':'+lid;
  S.ui.termBlock=S.ui.termBlock||{};
  let bi=S.ui.termBlock[key];
  if (bi==null){
    bi=0;
    blocks.forEach((b,i)=>{ if (isScheduled(s,lid,b[0])) bi=i; });
  }
  bi=Math.max(0, Math.min(blocks.length-1, bi||0));
  const [a,b]=blocks[bi]||[0,0];
  const label='Spieltag '+(a+1)+(a===b?'':'–'+(b+1));
  h+='<div class="box"><h3 style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span class="md-nav"><button class="btn" data-act="termPrev"'+(bi<=0?' disabled':'')+' title="Vorheriger Block">‹</button><span>'+label+'</span><button class="btn" data-act="termNext"'+(bi>=blocks.length-1?' disabled':'')+' title="Nächster Block">›</button></span><span class="muted" style="font-weight:400">'+(a<half?'Hinrunde':'Rückrunde')+'</span></h3>';
  if (!isScheduled(s,lid,a)){
    h+='<p class="muted">Dieser Block ist noch nicht terminiert.</p>';
    for (let mi=a; mi<=b; mi++){
      h+='<div class="term-md"><div class="term-md-title">'+(mi+1)+'. Spieltag · nicht terminiert</div>';
      lg.md[mi].forEach(m=>{
        h+='<div class="term-row"><span class="muted">–</span><span>'+esc(TEAMS[lg.teams[m[0]]].name)+' – '+esc(TEAMS[lg.teams[m[1]]].name)+'</span></div>';
      });
      h+='</div>';
    }
  } else {
    for (let mi=a; mi<=b; mi++){
      const slots=s.kickoffs[lid][mi];
      const simultaneous=isClosingDay(total, mi);
      const fin=finalSaturdaySlot(lid);
      h+='<div class="term-md"><div class="term-md-title">'+(mi+1)+'. Spieltag'+(simultaneous?' · alle Spiele '+fin.dow+' '+fin.time:'')+'</div>';
      lg.md[mi].map((m,k)=>({m,k,slot:slots[k]})).sort((x,y)=>slotOrder(x.slot,y.slot)||x.k-y.k).forEach(({m,slot})=>{
        h+='<div class="term-row"><span>'+esc(simultaneous?slot.dow+' '+slot.time:slotLabel(slot))+'</span><span>'+esc(TEAMS[lg.teams[m[0]]].name)+' – '+esc(TEAMS[lg.teams[m[1]]].name)+'</span></div>';
      });
      h+='</div>';
    }
  }
  h+='</div>';
  const cols=[];
  if (has.fr) cols.push(['fr','Fr']);
  if (has.konferenz) cols.push(['konferenz','Konferenz']);
  if (has.top) cols.push(['top','Topspiel']);
  if (has.so) cols.push(['so','Sonntag']);
  if (has.regional) cols.push(['regional','regional']);
  h+='<div class="box"><h3>Je Verein</h3><p class="muted">Sortiert nach dem aktuellen Tabellenplatz. Breaks zählen zweimal dieselbe Platzseite in Folge, den Übergang von Hin- zu Rückrunde eingeschlossen.</p><div style="overflow:auto"><table class="tbl"><thead><tr><th>Pl.</th><th class="l">Verein</th>'+cols.map(c=>'<th>'+c[1]+'</th>').join('')+'<th>Breaks</th><th class="l">Regeln</th></tr></thead><tbody>';
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
    h+='<tr><td>'+placeOf[id]+'</td><td class="l">'+esc(TEAMS[id].name)+'</td>'+cols.map(([key])=>{
      const v=c[key];
      const warn=!open && (key==='konferenz'?v<total/2:v===0);
      return '<td class="'+(warn?'bad':'')+'">'+v+'</td>';
    }).join('')+'<td class="'+(run>2||br>2||kinds.hh>1||kinds.aa>1?'bad':'ok')+'">'+br+'</td><td class="l '+(bad?'bad':(open?'':'ok'))+'">'+(bad?esc(problems.join(', ')):(open?'offen':'erfüllt'))+'</td></tr>';
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
    if (lg.level===6) return area===lg.area;
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
    const tip=esc(m.name+(m.stadion?' – '+m.stadion:''));
    return '<g class="crest"><title>'+tip+'</title><image href="'+esc(m.crest)+'" data-cx="'+m.x.toFixed(2)+'" data-cy="'+m.y.toFixed(2)+'" x="'+(m.x-17).toFixed(1)+'" y="'+(m.y-17).toFixed(1)+'" width="34" height="34"/></g>';
  }).join('');
  const scope=allow?allow.join(', '):'Deutschland';
  return '<div class="card map-card"><div class="card-title"><span>'+esc(L[lid].name)+' – Vereine</span><span class="map-tools"><button class="btn small" data-act="mapReset">Ansicht zurücksetzen</button></span></div><div class="map-wrap"><svg class="de-map" data-lid="'+esc(lid)+'" data-w="'+W+'" data-h="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Karte '+esc(L[lid].name)+'">'+paths+crests+'</svg></div><p class="map-credit">'+esc(scope)+' · Mausrad zoomt, Ziehen verschiebt. In der Übersicht sind die Wappen etwas größer; beim Heranzoomen bleiben sie auf dem Bildschirm gleich groß und liegen am Spielort. Kartendaten © OpenStreetMap-Mitwirkende, europlan-online.de · Grenzen: Natural Earth</p></div>';
}
function applyMap(){
  const svg=document.querySelector('.de-map'); if(!svg) return;
  const W=+svg.dataset.w, H=+svg.dataset.h, z=mapView.z;
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
function renderAbschluss(){
  const s=latest(), e=s.endData, v=$('#view');
  const pr=seasonProgress(s);
  if (e.step===1){
    let h='';
    if (pr.done<pr.total) h+='<div class="notice">Achtung: '+(pr.total-pr.done)+' Spiele sind noch nicht eingetragen. Die Tabellen werden so gewertet, wie sie gerade stehen. <button class="btn small" data-act="endSimAll">Fehlende Spiele zufällig simulieren</button> <button class="btn small" data-act="endCancel">Zurück zur Saison</button></div>';
    h+='<div class="box"><h3>Saisonrückblick '+s.name+'</h3><p class="muted">Meister, Aufsteiger und Absteiger aller Ligen. Danach wählst du die Aufsteiger aus der Amateurliga.</p></div>';
    h+='<div class="grid2">';
    LEAGUES.forEach(l=>{ const t=e.tables[l.id];
      const up=e.moves.filter(m=>m.from===l.id&&m.type==='auf'), dn=e.moves.filter(m=>m.from===l.id&&m.type==='ab');
      h+='<div class="box"><h3>'+esc(l.name)+'</h3><div style="margin-bottom:6px"><b>Meister:</b> '+esc(TEAMS[t[0].id].name)+' <span class="muted">('+t[0].pkt+' Pkt.)</span></div>'+
      (up.length?'<div><b>Aufsteiger:</b> '+up.map(m=>esc(TEAMS[m.id].name)+' <span class="muted">('+m.pl+'.) → '+esc(leagueName(m.to))+'</span>').join(', ')+'</div>':'')+
      '<div><b>Absteiger'+(e.downOf&&e.downOf[l.id]!==l.down?' <span class="muted">(diesmal '+e.downOf[l.id]+' statt '+l.down+')</span>':'')+':</b> '+dn.map(m=>esc(TEAMS[m.id].name)+' <span class="muted">('+m.pl+'.) → '+esc(leagueName(m.to))+'</span>').join(', ')+'</div></div>'; });
    h+='</div>';
    if (e.notes.length) h+='<div class="notice"><b>Abstiegszahlen in dieser Saison:</b><br>'+e.notes.map(esc).join('<br>')+'</div>';
    h+='<div style="display:flex;gap:8px"><button class="btn" data-act="endCancel">Abbrechen</button><button class="btn primary" data-act="endStep2">Weiter: Aufsteiger aus der Amateurliga wählen</button></div>';
    v.innerHTML=h; return;
  }
  let h='<div class="box"><h3>Aufsteiger aus der Amateurliga</h3><p class="muted">Wähle pro Oberliga die Aufsteiger aus der Amateurliga desselben Gebiets. Die Anzahl ergibt sich aus den freien Plätzen (normal 2). Absteiger aus der Oberliga dieser Saison können nicht sofort wieder aufsteigen.</p>'+
    '<button class="btn small" data-act="suggest">Vorschlag: jeweils die historisch stärksten übernehmen</button> <button class="btn small" data-act="clearPicks">Auswahl leeren</button> <label style="margin-left:10px"><input type="checkbox" id="allPools"'+(S.ui.allPools?' checked':'')+'> alle Amateurvereine anzeigen (auch andere Regionen)</label></div><div class="grid2">';
  let ok=true;
  POOLS.forEach(p=>{
    const need=e.need[p.ol], picks=e.picks[p.ol]||[];
    if (picks.length!==need) ok=false;
    let cand = S.ui.allPools ? POOLS.flatMap(x=>e.pools[x.id]) : [...e.pools[p.id]];
    cand = cand.filter(id=>!e.moves.some(m=>m.id===id&&m.type==='ab'&&L[m.from]&&L[m.from].level===6)).sort(byRang);
    const takenElse = new Set(Object.entries(e.picks).filter(([k])=>k!==p.ol).flatMap(([,v])=>v));
    h+='<div class="box"><div class="pick-head"><h3 style="margin:0">'+esc(L[p.ol].name)+'</h3><span class="'+(picks.length===need?'ok':'bad')+'">'+picks.length+' / '+need+'</span></div><div class="muted" style="margin-bottom:6px">aus: '+esc(p.name)+' ('+esc(p.desc)+')</div><div class="pick-list">'+
      cand.filter(id=>!takenElse.has(id)).map(id=>'<label class="pick-row'+(picks.includes(id)?' sel':'')+'"><input type="checkbox" data-pick="'+p.ol+'" value="'+id+'"'+(picks.includes(id)?' checked':'')+'>'+clubHTML(id)+'<span class="r">'+(TEAMS[id].rang?'Rang '+TEAMS[id].rang:'ohne Wertung')+'</span></label>').join('')+'</div></div>';
  });
  h+='</div><div style="display:flex;gap:8px;margin-top:6px"><button class="btn" data-act="endStep1">Zurück</button><button class="btn primary" data-act="finalize"'+(ok?'':' disabled')+'>Saison '+nextSeasonName(s.name)+' starten</button></div>';
  v.innerHTML=h;
}
function rulesHTML(){
  const s=cur();
  let h='<h3>Ligensystem &amp; Regeln</h3><p>Sieg 3 Punkte, Unentschieden 1 Punkt. Reihenfolge bei Gleichstand: Punkte → Tordifferenz → mehr Tore → direkter Vergleich (Punkte, Tordifferenz, Tore) → historische Stärke.</p><table class="tbl"><thead><tr><th class="l">Liga</th><th>Teams</th><th>Auf</th><th>Ab geplant</th><th>Ab jetzt</th><th class="l">Aufstieg in</th></tr></thead><tbody>';
  LEAGUES.forEach(l=>{
    const p=relegationProfile(s, l.id);
    const mark=p.down!==l.down;
    h+='<tr><td class="l">'+esc(l.name)+'</td><td>'+l.size+'</td><td>'+(l.up||'–')+'</td><td>'+l.down+'</td><td'+(mark?' class="pts"':'')+'>'+p.down+'</td><td class="l">'+(l.upTo?esc(leagueName(l.upTo)):'–')+'</td></tr>';
  });
  h+='</tbody></table><p>Bundesliga bis 4. Liga haben feste Zahlen. Die vier Absteiger der 4. Liga gehen nur in die Regionalliga ihres Bundeslandes (Nord: Bremen, Niedersachsen, Hamburg, Schleswig-Holstein, Mecklenburg-Vorpommern; Ost: Berlin, Brandenburg, Sachsen-Anhalt, Sachsen, Thüringen; Süd: Bayern, Baden-Württemberg; West: Nordrhein-Westfalen, Hessen, Rheinland-Pfalz, Saarland). Jede Regionalliga gibt einen Meister an die 4. Liga ab und nimmt die Meister ihrer beiden Oberligen auf. Kommen k Absteiger aus der 4. Liga dazu, steigen k+1 Vereine ab, damit die Staffel bei 18 bleibt. Dieselbe Rechnung gilt in der Oberliga: k Absteiger aus der eigenen Regionalliga bedeuten k+1 Absteiger, und zwei Amateurvereine rücken nach. Niemand wird in eine fremde Region verschoben. „Ab jetzt“ folgt dem aktuellen Tabellenstand.</p>';
  const changed=LEAGUES.filter(l=>l.level>=5 && relegationProfile(s, l.id).down!==l.down);
  if (changed.length){
    h+='<p><b>In der Saison '+esc(s.name)+' weicht die Abstiegszahl ab:</b></p><ul>';
    changed.forEach(l=>{ const p=relegationProfile(s, l.id); h+='<li><b>'+esc(l.name)+': '+p.down+' statt '+l.down+'.</b> '+esc(p.reason)+'</li>'; });
    h+='</ul>';
  } else h+='<p>In der Saison '+esc(s.name)+' hat nach dem aktuellen Stand jede Staffel die geplante Abstiegszahl.</p>';
  h+='<p>Die Amateurliga hat keinen Spielbetrieb und keine Staffeln in der Navigation. Zum Saisonende wählst du pro Oberliga zwei Aufsteiger aus der Amateurliga desselben Gebiets; Oberliga-Absteiger gehen in die Amateurliga ihres Bundeslandes.</p>';
  return h;
}
function viewAnsehen(){
  const season=cur();
  const liga=S.ui.ansehenLiga||'';
  const list=Object.keys(TEAMS).map(id=>{
    const info=ansehenInfo(id);
    return {id, info, lid:clubLeagueId(season, id)};
  }).filter(r=>!liga || r.lid===liga);
  list.sort((a,b)=>(b.info.value==null?-1:b.info.value)-(a.info.value==null?-1:a.info.value) || TEAMS[a.id].name.localeCompare(TEAMS[b.id].name,'de'));
  const opts='<option value="">Alle Ligen</option>'+LEAGUES.map(l=>'<option value="'+l.id+'"'+(liga===l.id?' selected':'')+'>'+esc(l.name)+'</option>').join('')+POOLS.map(p=>'<option value="'+p.id+'"'+(liga===p.id?' selected':'')+'>'+esc(p.name)+'</option>').join('');
  let h='<div class="box"><h3>Ansehen aller Vereine</h3><p>Der Ansehenswert ist der gewichtete Schnitt der Saisonpunkte der letzten 25 Jahre. Die jüngsten 10 Saisons zählen 1,5-fach, ältere einfach. Jahre ohne Nachweis werden ausgelassen. Am Saisonanfang entscheidet dieser Wert die Topspiele fast allein, später zählen die aktuellen Punkte stärker mit.</p><div class="ansehen-tools"><input id="ansehenSearch" class="searchbox" placeholder="Verein suchen" autocomplete="off"><select id="ansehenLiga">'+opts+'</select><span class="muted">'+list.length+' Vereine</span></div>';
  h+='<div style="overflow:auto"><table class="tbl" id="ansehenList"><thead><tr><th>Rang</th><th class="l">Verein</th><th>Ansehen</th><th>Saisons</th><th class="l">Aktuelle Liga</th></tr></thead><tbody>';
  list.forEach((r,i)=>{
    const name=TEAMS[r.id].name;
    h+='<tr data-ansehen="'+r.id+'" data-name="'+esc(name.toLowerCase())+'" style="cursor:pointer"><td>'+(i+1)+'</td><td class="l">'+clubHTML(r.id,{nobl:true})+'</td><td class="pts">'+(r.info.value==null?'–':deNum(r.info.value,2))+'</td><td>'+r.info.n+'</td><td class="l">'+esc(leagueName(r.lid)||'–')+'</td></tr>';
  });
  h+='</tbody></table></div></div>';
  return h;
}
function viewAnsehenDetail(id){
  const info=ansehenInfo(id), t=TEAMS[id];
  const end=info.end, from=(end-24);
  let h='<div class="box"><button class="btn small" data-act="ansehenBack">← Zurück zur Rangliste</button><div style="display:flex;gap:12px;align-items:center;margin-top:12px"><img src="'+esc(t.crest)+'" alt="" style="width:52px;height:52px;object-fit:contain"><div><h3 style="margin:0">'+esc(t.name)+'</h3><div class="muted">'+esc(t.bl)+' · Ansehen <b>'+(info.value==null?'ohne Wertung':deNum(info.value,2))+'</b> aus '+info.n+' Saisons</div></div></div>';
  h+='<p>Gewertet wird das Fenster '+(from)+'/'+String((from+1)%100).padStart(2,'0')+' bis '+end+'/'+String((end+1)%100).padStart(2,'0')+'. Darin zählen '+ (end-9)+'/'+String((end-8)%100).padStart(2,'0')+' bis zum Ende mit Gewicht 1,5, die älteren mit Gewicht 1. Saisons ohne Nachweis fehlen. Der Wert ist die Summe aus Gewicht × Punkte, geteilt durch die Summe der Gewichte.</p>';
  h+='<table class="tbl"><thead><tr><th class="l">Saison</th><th class="l">Liga</th><th>Platz</th><th>Punkte</th><th>Gewicht</th><th>Beitrag</th></tr></thead><tbody>';
  let seenSplit=false;
  info.rows.forEach(r=>{
    const rechner=r.src==='rechner' || seasonYear(r.season)>2025;
    if (rechner && !seenSplit){
      seenSplit=true;
      h+='<tr><td class="hist-split" colspan="6">Start Fußballrechner</td></tr>';
    }
    const beitrag=r.w>0?r.w*r.pts:null;
    h+='<tr><td class="l">'+r.season+'</td><td class="l">'+esc(r.liga)+'</td><td>'+r.pl+'. / '+r.n+'</td><td>'+deNum(r.pts,2)+'</td><td>'+(r.w?deNum(r.w,1):'–')+'</td><td>'+(beitrag==null?'–':deNum(beitrag,2))+'</td></tr>';
  });
  if (!seenSplit) h+='<tr><td class="hist-split" colspan="6">Start Fußballrechner</td></tr>';
  h+='<tr><td class="l" colspan="4"><b>Summe</b></td><td><b>'+deNum(info.sw,1)+'</b></td><td><b>'+(info.sw?deNum(info.value*info.sw,2):'–')+'</b></td></tr>';
  h+='</tbody></table>';
  if (info.value!=null) h+='<p>Ansehen = '+deNum(info.value*info.sw,2)+' / '+deNum(info.sw,1)+' = <b>'+deNum(info.value,2)+'</b>.</p>';
  else h+='<p>Für diesen Verein liegt im Fenster keine Saison mit Nachweis vor.</p>';
  h+='</div>';
  return h;
}
function clubModal(id){
  const t=TEAMS[id], pl=clubPlacements(id);
  let h='<div style="display:flex;gap:12px;align-items:center"><img src="'+esc(t.crest)+'" style="width:56px;height:56px;object-fit:contain"><div><h2 style="margin:0">'+esc(t.name)+'</h2><div class="muted">'+esc(t.bl)+' · historische Rangliste: '+(t.rang?'Rang '+t.rang+', Schnitt '+t.schnitt.toFixed(2).replace('.',','):'ohne Wertung')+'</div></div></div>';
  h+='<h3 style="margin-top:16px">Platzierungen im Fußballrechner</h3><table class="tbl"><thead><tr><th class="l">Saison</th><th class="l">Liga</th><th>Platz</th><th>Pkt.</th><th>Tore</th></tr></thead><tbody>';
  pl.forEach(p=>{ h+='<tr><td class="l">'+p.season+'</td><td class="l">'+esc(leagueName(p.lid))+'</td><td>'+(p.pl?p.pl+'. / '+p.n+(p.final?'':' (laufend)'):'–')+'</td><td>'+(p.pkt??'–')+'</td><td>'+(p.tore||'–')+'</td></tr>'; });
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
  const adv=maybeAdvance(cur(), lid);
  save();
  if (adv){ render(); toast('Spieltage '+(adv[0]+1)+'–'+(adv[1]+1)+' terminiert.'); }
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
  const nav=t.closest('[data-league]'); if (nav){ S.ui.league=nav.dataset.league; if(S.ui.tab==='abschluss'||S.ui.tab==='pokal'||S.ui.tab==='ansehen') S.ui.tab='tabelle'; save(); render(); return; }
  const tab=t.closest('[data-tab]'); if (tab){
    if (tab.dataset.tab==='terminierung' && S.ui.termBlock) delete S.ui.termBlock[S.view+':'+S.ui.league];
    if (tab.dataset.tab==='ansehen') S.ui.ansehenId=null;
    S.ui.tab=tab.dataset.tab; save(); render(); return;
  }
  const tg=t.closest('[data-toggle] button'); if (tg){ S.ui[tg.parentNode.dataset.toggle]=tg.dataset.v; save(); render(); return; }
  if (t.closest('.pick-row')) return;
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
  else if (act==='cupPen'){ applyCupPen(a.dataset.cup, +a.dataset.ri, +a.dataset.mi, +a.dataset.side, +a.dataset.dir); }
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
  else if (act==='mapReset'){
    const svg=document.querySelector('.de-map'); if(!svg) return;
    mapView={lid:svg.dataset.lid, z:1, cx:(+svg.dataset.w)/2, cy:(+svg.dataset.h)/2};
    applyMap();
  }
  else if (act==='simMd'){ if(!isScheduled(s,lid,currentMd(s,lid))){ toast('Spieltag ist noch nicht terminiert.'); return; } const c=simLeague(s,lid,currentMd(s,lid)); save(); render(); toast(c+' Spiele zufällig eingetragen.'); }
  else if (act==='simBlock'){ if(confirm('Den aktuellen Block der '+L[lid].name+' simulieren? Offene Spiele dieser vier Spieltage werden zufällig aufgefüllt.')){ const c=simBlock(s,lid); save(); render(); toast(c?c+' Spiele simuliert.':'Nichts zu simulieren.'); } }
  else if (act==='simSeason'){ if(confirm('Saison simulieren: alle noch offenen Spiele aller Ligen und der Pokale mit zufälligen Ergebnissen auffüllen? Die Ergebnisse orientieren sich leicht an Ansehen und Stärke. Fehlende Blöcke werden dabei terminiert.')){ const c=simSeason(s); save(); render(); toast(c+' Spiele simuliert.'); } }
  else if (act==='simLeague'){ if(confirm('Alle noch offenen Spiele der '+L[lid].name+' zufällig simulieren? Nicht terminierte Blöcke werden dabei der Reihe nach angesetzt.')){ const c=simLeague(s,lid); save(); render(); toast(c+' Spiele simuliert.'); } }
  else if (act==='rules'){ openModal(rulesHTML()); }
  else if (act==='end'){ const pr=seasonProgress(s); if (pr.done<pr.total && !confirm('Es fehlen noch '+(pr.total-pr.done)+' Spiele. Trotzdem zum Saisonabschluss? (Du kannst dort noch abbrechen oder die fehlenden Spiele simulieren.)')) return; startSeasonEnd(); }
  else if (act==='toEnd'){ S.view=S.seasons.length-1; S.ui.tab='abschluss'; render(); }
  else if (act==='endCancel'){ cancelSeasonEnd(); }
  else if (act==='endSimAll'){ const l=latest(); LEAGUES.forEach(x=>simLeague(l,x.id)); l.endData=computeTransition(l); save(); render(); }
  else if (act==='endStep2'){ latest().endData.step=2; save(); render(); window.scrollTo(0,0); }
  else if (act==='endStep1'){ latest().endData.step=1; save(); render(); }
  else if (act==='suggest'){ suggestPicks(latest().endData); save(); render(); }
  else if (act==='clearPicks'){ latest().endData.picks={}; save(); render(); }
  else if (act==='finalize'){ finalizeSeason(); }
});
document.addEventListener('change', ev=>{
  const t=ev.target;
  if (t.id==='seasonSelect'){ S.view=+t.value; S.ui.tab = cur().status==='ending' ? 'abschluss' : 'tabelle'; save(); render(); }
  else if (t.id==='mobileLeague'){ if(t.value==='pokal'){ S.ui.tab='pokal'; } else { S.ui.league=t.value; if(S.ui.tab==='abschluss'||S.ui.tab==='pokal') S.ui.tab='tabelle'; } save(); render(); }
  else if (t.id==='mdSelect'){ S.ui.md[S.view+':'+S.ui.league]=+t.value; save(); render(); }
  else if (t.id==='autoNext'){ S.ui.autoNext=t.checked; save(); }
  else if (t.id==='allPools'){ S.ui.allPools=t.checked; save(); render(); }
  else if (t.id==='ansehenLiga'){ S.ui.ansehenLiga=t.value; save(); render(); }
  else if (t.id==='cupSelect'){ S.ui.cup=t.value; S.ui.cupRound=null; S.ui.cupView=S.ui.cupView||'spiele'; save(); render(); }
  else if (t.id==='cupRound'){ S.ui.cupRound=+t.value; save(); render(); }
  else if (t.dataset.cupEt){ mutateCup(t.dataset.cup, +t.dataset.ri, +t.dataset.mi, m=>{ m.et=t.checked; }); }
  else if (t.dataset.pick){ const e=latest().endData, ol=t.dataset.pick; const arr=e.picks[ol]||(e.picks[ol]=[]);
    if (t.checked){ if (arr.length>=e.need[ol]){ t.checked=false; toast('Für '+L[ol].name+' sind nur '+e.need[ol]+' Aufsteiger möglich.'); return; } arr.push(t.value); }
    else arr.splice(arr.indexOf(t.value),1);
    save(); const y=window.scrollY; render(); window.scrollTo(0,y); }
  else if (t.id==='fileImport'){ importFile(t.files[0]); t.value=''; }
});
document.addEventListener('input', ev=>{
  const t=ev.target;
  if (t.id==='poolSearch'){ const q=t.value.toLowerCase(); document.querySelectorAll('#view .amateur-list > div').forEach(d=>d.style.display=d.dataset.name.includes(q)?'':'none'); }
  else if (t.id==='ansehenSearch'){ const q=t.value.toLowerCase(); document.querySelectorAll('#ansehenList tr[data-ansehen]').forEach(tr=>{ tr.style.display=(tr.dataset.name||'').includes(q)?'':'none'; }); }
});
document.addEventListener('keydown', ev=>{
  if (ev.key==='Escape') $('#modal').classList.add('hidden');
});
$('#modalClose').onclick=()=>$('#modal').classList.add('hidden');
$('#modal').addEventListener('click', ev=>{ if (ev.target.id==='modal') $('#modal').classList.add('hidden'); });
$('#btnExport').onclick=()=>{
  const blob=new Blob([JSON.stringify(S)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='fussballrechner-spielstand-'+new Date().toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},500);
  toast('Spielstand exportiert.');
};
function importFile(f){
  if (!f) return;
  const r=new FileReader();
  r.onload=()=>{ try{ const d=JSON.parse(r.result); if(!d.seasons||!d.seasons.length||!d.seasons[0].leagues) throw new Error('kein Spielstand');
    if(!structureOk(d)){ alert('Dieser Spielstand passt nicht zur aktuellen Ligastruktur (ohne 5. Liga, Regionalliga und Oberliga mit 18 Mannschaften).'); return; }
    if(!confirm('Spielstand aus „'+f.name+'“ laden? Der aktuelle Stand im Browser wird ersetzt.')) return;
    d.ui=d.ui||{league:'BL',tab:'tabelle',md:{},autoNext:true}; d.view=Math.min(d.view||0,d.seasons.length-1); S=d; save(); render(); toast('Spielstand geladen.'); }
    catch(e){ alert('Die Datei ist kein gültiger Fußballrechner-Spielstand.'); } };
  r.readAsText(f);
}
$('#btnReset').onclick=()=>{ if(confirm('Wirklich alles zurücksetzen? Alle Saisons und Ergebnisse gehen verloren (vorher exportieren!).')){ S=newGame(); save(); render(); } };

// ---------- Start ----------
const freshSave = !localStorage.getItem(KEY);
S = load() || newGame();
S.ui = Object.assign({league:'BL', tab:'tabelle', md:{}, autoNext:true}, S.ui||{});
if (freshSave && (localStorage.getItem(OLD_KEY)||localStorage.getItem('fussballrechner_v1'))) S.ui.showMigrate = true;
if (S.view==null || S.view>=S.seasons.length) S.view=S.seasons.length-1;
if (latest().status==='ending' && S.view===S.seasons.length-1) S.ui.tab='abschluss';
ensureAllCups();
save(); render();

// Für Tests/Debugging
window.FR = {computeTransition, get state(){return S;}, L, LEAGUES, POOLS, TEAMS, BL_ORDER, computeTable, leagueTable, simLeague, simSeason, simBlock, simAllCups, homeLeague, AREA_BY_BL, validateFixtures, makeSchedule, relegationProfile, scheduleNextBlock, slotTally, topKind, ansehenInfo, pairScore, powerSnapshot, certaintyFromEnv, certaintyMap, seasonStrengthPoints, suggestPicks, finalizeSeason, pointsEnvelope, relegationBattle, isClosingDay, lateSeason, finalSaturdaySlot, buildCups, drawCupRound, cupWinner, cupFinalists, standingOf, DFB_ROUNDS};
})();
