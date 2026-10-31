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
const L5_BY_RL = {RLN:'L5NO',RLO:'L5NO',RLS:'L5SW',RLW:'L5SW'};

// ungefähre Mittelpunkte der Bundesländer (für den Ausgleich der Staffelgrößen)
const GEO = {'Schleswig-Holstein':[54.2,9.8],'Hamburg':[53.55,10.0],'Mecklenburg-Vorpommern':[53.8,12.6],'Bremen':[53.1,8.8],'Niedersachsen':[52.6,9.5],
  'Berlin':[52.5,13.4],'Brandenburg':[52.2,13.5],'Sachsen-Anhalt':[51.9,11.7],'Sachsen':[51.0,13.3],'Thüringen':[50.9,11.0],'Nordrhein-Westfalen':[51.5,7.5],
  'Hessen':[50.6,9.0],'Rheinland-Pfalz':[49.9,7.4],'Saarland':[49.4,6.9],'Baden-Württemberg':[48.6,9.0],'Bayern':[48.9,11.4]};
function leagueCenter(lid){ const bls=Object.keys(AREA_BY_BL).filter(bl=>{ const a=AREA_BY_BL[bl], rl=RL_BY_AREA[a];
  return lid==='OL'+a || lid===rl || lid===L5_BY_RL[rl]; });
  return [bls.reduce((x,b)=>x+GEO[b][0],0)/bls.length, bls.reduce((x,b)=>x+GEO[b][1],0)/bls.length]; }
function distTo(id, lid){ const g=GEO[TEAMS[id].bl]||[51,10], c=leagueCenter(lid); return Math.hypot((g[0]-c[0])*111,(g[1]-c[1])*70); }

// level, size, up, down, upTo
const LEAGUES = [
  {id:'BL',  name:'Bundesliga',            short:'BL',      level:1, size:20, up:0, down:3},
  {id:'BL2', name:'2. Bundesliga',         short:'2. BL',   level:2, size:20, up:3, down:3, upTo:'BL'},
  {id:'L3',  name:'3. Liga',               short:'3. Liga', level:3, size:20, up:3, down:3, upTo:'BL2'},
  {id:'L4',  name:'4. Liga',               short:'4. Liga', level:4, size:22, up:3, down:4, upTo:'L3'},
  {id:'L5NO',name:'5. Liga Nordost',       short:'5. NO',   level:5, size:18, up:2, down:2, upTo:'L4'},
  {id:'L5SW',name:'5. Liga Südwest',       short:'5. SW',   level:5, size:18, up:2, down:2, upTo:'L4'},
  {id:'RLN', name:'Regionalliga Nord',     short:'RL Nord', level:6, size:16, up:1, down:2, upTo:'L5NO'},
  {id:'RLO', name:'Regionalliga Ost',      short:'RL Ost',  level:6, size:16, up:1, down:2, upTo:'L5NO'},
  {id:'RLS', name:'Regionalliga Süd',      short:'RL Süd',  level:6, size:16, up:1, down:2, upTo:'L5SW'},
  {id:'RLW', name:'Regionalliga West',     short:'RL West', level:6, size:16, up:1, down:2, upTo:'L5SW'},
  {id:'OLNS',name:'Oberliga Nord – Staffel Süd',  short:'OL Nord-S', level:7, size:16, up:1, down:2, upTo:'RLN', area:'NS'},
  {id:'OLNN',name:'Oberliga Nord – Staffel Nord', short:'OL Nord-N', level:7, size:16, up:1, down:2, upTo:'RLN', area:'NN'},
  {id:'OLON',name:'Oberliga Ost – Staffel Nord',  short:'OL Ost-N',  level:7, size:16, up:1, down:2, upTo:'RLO', area:'ON'},
  {id:'OLOS',name:'Oberliga Ost – Staffel Süd',   short:'OL Ost-S',  level:7, size:16, up:1, down:2, upTo:'RLO', area:'OS'},
  {id:'OLBY',name:'Oberliga Bayern',              short:'OL BY',     level:7, size:16, up:1, down:2, upTo:'RLS', area:'BY'},
  {id:'OLBW',name:'Oberliga Baden-Württemberg',   short:'OL BW',     level:7, size:16, up:1, down:2, upTo:'RLS', area:'BW'},
  {id:'OLNRW',name:'Oberliga Nordrhein-Westfalen',short:'OL NRW',    level:7, size:16, up:1, down:2, upTo:'RLW', area:'NRW'},
  {id:'OLSW',name:'Oberliga Südwest',             short:'OL SW',     level:7, size:16, up:1, down:2, upTo:'RLW', area:'SW'}
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
const LEVEL_NAMES = {1:'Ebene 1',2:'Ebene 2',3:'Ebene 3',4:'Ebene 4',5:'Ebene 5 – 5. Liga',6:'Ebene 6 – Regionalliga',7:'Ebene 7 – Oberliga'};

function homeLeague(id, level){
  const area = AREA_BY_BL[TEAMS[id].bl] || 'NRW';
  if (level === 8) return 'AM'+area;
  if (level === 7) return 'OL'+area;
  if (level === 6) return RL_BY_AREA[area];
  if (level === 5) return L5_BY_RL[RL_BY_AREA[area]];
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

// Spielplan: doppelte Runde (Kreismethode), Rückrunde gespiegelt
function makeSchedule(n){
  const arr = shuffle([...Array(n).keys()]);
  const rounds = [];
  for (let r=0; r<n-1; r++){
    const md = [];
    for (let i=0;i<n/2;i++){
      const t1=arr[i], t2=arr[n-1-i];
      let home = i===0 ? (r%2===0) : (i%2===1) === (r%2===0);
      md.push(home ? [t1,t2,null,null] : [t2,t1,null,null]);
    }
    rounds.push(md);
    arr.splice(1,0,arr.pop());
  }
  const second = rounds.map(md => md.map(m => [m[1],m[0],null,null]));
  return rounds.concat(second);
}

// ---------- Zustand ----------
const KEY = 'fussballrechner_v1';
let S;
function newGame(){
  const season = {name:'2026/27', status:'running', leagues:{}, pools:{}, markers:{}};
  LEAGUES.forEach(l => { const teams=[...window.FR_INITIAL[l.id]].sort(byRang); season.leagues[l.id]={teams, md:makeSchedule(teams.length)}; });
  POOLS.forEach(p => season.pools[p.id] = [...window.FR_INITIAL[p.id]].sort(byRang));
  return {v:1, created:new Date().toISOString(), seasons:[season], view:0, ui:{league:'BL', tab:'tabelle', md:{}, autoNext:true}};
}
function save(){
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch(e){ alert('Speichern im Browser fehlgeschlagen ('+e.name+'). Bitte den Spielstand exportieren, damit nichts verloren geht.'); }
}
function load(){
  try { const raw = localStorage.getItem(KEY); if (raw){ const d=JSON.parse(raw); if (d && d.seasons && d.seasons.length) return d; } } catch(e){}
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
function zoneOf(lg, pl, n){
  if (pl===1) return 'meister';
  if (pl<=lg.up) return 'auf';
  if (pl>n-lg.down) return 'ab';
  return '';
}

// ---------- Simulation (optional) ----------
function poisson(l){ const L0=Math.exp(-l); let k=0,p=1; do{k++;p*=Math.random();}while(p>L0); return k-1; }
function simMatch(h,a){
  const sh=TEAMS[h].schnitt??5, sa=TEAMS[a].schnitt??5, d=(sh-sa)/10;
  return [Math.min(9,poisson(Math.max(.25,1.5*Math.exp(.25*d)))), Math.min(9,poisson(Math.max(.2,1.15*Math.exp(-.25*d))))];
}
function simLeague(season, lid, mdIdx){
  const lg=season.leagues[lid]; let c=0;
  lg.md.forEach((md,mi)=>{ if(mdIdx!=null && mi!==mdIdx) return; md.forEach(m=>{ if(m[2]==null||m[3]==null){const r=simMatch(lg.teams[m[0]],lg.teams[m[1]]); m[2]=r[0]; m[3]=r[1]; c++;} }); });
  return c;
}

// ---------- Saisonabschluss ----------
function computeTransition(season){
  const tables={}, moves=[], notes=[], newT={};
  LEAGUES.forEach(l => { newT[l.id]=[]; });
  const pools={}; POOLS.forEach(p=>pools[p.id]=[...season.pools[p.id]]);
  LEAGUES.forEach(l => {
    const t = leagueTable(season, l.id, 'all');
    tables[l.id] = t.map(r=>({id:r.id,pl:r.pl,sp:r.sp,s:r.s,u:r.u,n:r.n,tg:r.tg,gt:r.gt,pkt:r.pkt}));
    const ids=t.map(r=>r.id), n=ids.length;
    ids.forEach((id,k)=>{
      const pl=k+1;
      if (l.up && pl<=l.up){ newT[l.upTo].push(id); moves.push({id,from:l.id,to:l.upTo,type:'auf',pl}); }
      else if (pl>n-l.down){ const to=homeLeague(id,l.level+1); (L[to]?newT[to]:pools[to]).push(id); moves.push({id,from:l.id,to,type:'ab',pl}); }
      else newT[l.id].push(id);
    });
  });
  // Ausgleich bei Staffelgrößen (Ebene 5–7)
  [5,6,7].forEach(level => {
    const lv = LEAGUES.filter(l=>l.level===level);
    lv.forEach(l => {
      while (newT[l.id].length > l.size){
        const under = lv.filter(x=>newT[x.id].length < x.size);
        if (!under.length) break;
        const inc = moves.filter(m=>m.type==='ab'&&m.to===l.id);
        const cands = inc.length ? inc.map(m=>m.id) : [newT[l.id][newT[l.id].length-1]];
        let best=null;
        cands.forEach(id=>under.forEach(x=>{ const d=distTo(id,x.id)+(x.upTo===l.upTo?0:150);
          if(!best||d<best.d) best={id,tgt:x,d}; }));
        const id=best.id, tgt=best.tgt, mv=inc.find(m=>m.id===id);
        newT[l.id].splice(newT[l.id].indexOf(id),1); newT[tgt.id].push(id);
        if (mv) mv.to = tgt.id;
        notes.push(TEAMS[id].name+' ('+TEAMS[id].bl+') wird wegen der Staffelgröße in die '+tgt.name+' statt in die '+l.name+' eingeteilt.');
      }
    });
  });
  const need={};
  LEAGUES.filter(l=>l.level===7).forEach(l=>{ need[l.id]=Math.max(0,l.size-newT[l.id].length); });
  return {tables, moves, notes, newT, pools, need, picks:{}, step:1};
}
function startSeasonEnd(){
  const s=latest();
  s.endData = computeTransition(s); s.status='ending'; S.view=S.seasons.length-1; S.ui.tab='abschluss'; save(); render();
}
function cancelSeasonEnd(){ const s=latest(); delete s.endData; s.status='running'; S.ui.tab='tabelle'; save(); render(); }
function suggestPicks(e){
  POOLS.forEach(p=>{ const need=e.need[p.ol]; e.picks[p.ol]=[...e.pools[p.id]].filter(id=>!e.moves.some(m=>m.id===id&&m.type==='ab'&&L[m.from]&&L[m.from].level===7)).sort(byRang).slice(0,need); });
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
  LEAGUES.forEach(l=>{ const ch=e.tables[l.id][0]; if (ch) mk(ch.id,'M'); });
  e.step=3; s.status='done';
  S.seasons.push(ns); S.view=S.seasons.length-1; S.ui.tab='tabelle'; S.ui.md={};
  save(); render(); toast('Saison '+ns.name+' wurde erstellt.');
}

// ---------- Darstellung ----------
function clubHTML(id, opts={}){
  const t=TEAMS[id]; const mk = opts.marker ? [].concat(opts.marker).map(x=>'<span class="mk">('+x+')</span>').join('') : '';
  return '<div class="club" data-club="'+id+'"><img src="'+esc(t.crest)+'" alt="" loading="lazy"><div style="min-width:0"><div class="nm">'+esc(t.name)+mk+'</div>'+(opts.nobl?'':'<div class="bl">'+esc(t.bl)+'</div>')+'</div></div>';
}
function tableHTML(rows, lg, opts={}){
  const n=rows.length, season=opts.season||cur();
  let h='<table class="tbl"><thead><tr><th>Pl.</th><th class="l">Verein</th><th>Sp.</th><th>S</th><th>U</th><th>N</th><th>T/GT</th><th>Diff.</th><th>Pkt.</th>'+(opts.form===false?'':'<th>Form</th>')+'</tr></thead><tbody>';
  rows.forEach(r=>{
    const z = opts.zones===false ? '' : zoneOf(lg, r.pl, n);
    h+='<tr class="'+(z?'z-'+z:'')+'"><td>'+r.pl+'</td><td class="l">'+clubHTML(r.id,{marker:opts.markers===false?null:season.markers[r.id]})+'</td><td>'+r.sp+'</td><td>'+r.s+'</td><td>'+r.u+'</td><td>'+r.n+'</td><td>'+r.tg+':'+r.gt+'</td><td>'+(r.diff>0?'+':'')+r.diff+'</td><td class="pts">'+r.pkt+'</td>'+
      (opts.form===false?'':'<td><span class="form">'+r.form.map(f=>'<span class="f-'+f+'" title="'+({S:'Sieg',U:'Unentschieden',N:'Niederlage'}[f])+'">'+f+'</span>').join('')+'</span></td>')+'</tr>';
  });
  h+='</tbody></table>';
  if (opts.zones!==false) h+=legendHTML(lg);
  return h;
}
function legendHTML(lg){
  const it=[];
  it.push('<span><i style="background:var(--z-bar-m)"></i>'+(lg.level===1?'Meister':'Meister &amp; Aufstieg → '+leagueName(lg.upTo))+'</span>');
  if (lg.up>1) it.push('<span><i style="background:var(--z-bar-auf)"></i>Aufstieg → '+leagueName(lg.upTo)+'</span>');
  const down = lg.level<4 ? leagueName(homeLeague(Object.keys(TEAMS)[0],lg.level+1)) : lg.level===4?'5. Liga (nach Region)': lg.level===5?'Regionalliga (nach Bundesland)': lg.level===6?'Oberliga (nach Bundesland)':'Amateurliga';
  it.push('<span><i style="background:var(--z-bar-ab)"></i>Abstieg ('+lg.down+') → '+down+'</span>');
  it.push('<span class="muted">(M) Vorjahresmeister · (Auf) Aufsteiger · (Ab) Absteiger</span>');
  return '<div class="legend">'+it.join('')+'</div>';
}

function renderNav(){
  let h='';
  for (let lv=1; lv<=7; lv++){
    h+='<div class="nav-group"><div class="nav-group-title">'+LEVEL_NAMES[lv]+'</div>';
    LEAGUES.filter(l=>l.level===lv).forEach(l=>{ h+='<a class="nav-item'+(S.ui.league===l.id?' active':'')+'" data-league="'+l.id+'">'+esc(l.name)+'</a>'; });
    h+='</div>';
  }
  h+='<div class="nav-group"><div class="nav-group-title">Amateurliga (ohne Spielbetrieb)</div>';
  POOLS.forEach(p=>{ h+='<a class="nav-item'+(S.ui.league===p.id?' active':'')+'" data-league="'+p.id+'">'+esc(p.name.replace('Amateurliga ',''))+'<span class="cnt">'+(cur().pools[p.id]||[]).length+'</span></a>'; });
  h+='</div>';
  $('#leagueNav').innerHTML=h;
  let o='';
  for (let lv=1; lv<=7; lv++){ o+='<optgroup label="'+LEVEL_NAMES[lv]+'">'+LEAGUES.filter(l=>l.level===lv).map(l=>'<option value="'+l.id+'"'+(S.ui.league===l.id?' selected':'')+'>'+esc(l.name)+'</option>').join('')+'</optgroup>'; }
  o+='<optgroup label="Amateurliga">'+POOLS.map(p=>'<option value="'+p.id+'"'+(S.ui.league===p.id?' selected':'')+'>'+esc(p.name)+'</option>').join('')+'</optgroup>';
  $('#mobileLeague').innerHTML=o;
  $('#seasonSelect').innerHTML=S.seasons.map((s,i)=>'<option value="'+i+'"'+(i===S.view?' selected':'')+'>'+s.name+(s.status==='done'?' (abgeschlossen)':s.status==='ending'?' (Abschluss)':'')+'</option>').join('');
}

const TABS=[['tabelle','Tabelle'],['heimaus','Heim/Auswärts'],['hinrueck','Hinrunde/Rückrunde'],['ewig','Ewige Tabelle'],['historie','Historie'],['pokal','Pokal']];
function render(){
  renderNav();
  const s=cur(), lid=S.ui.league;
  if (s.status==='ending' && S.ui.tab==='abschluss'){ $('#title').textContent='Saisonabschluss '+s.name; $('#subline').innerHTML=''; $('#tabs').innerHTML=''; renderAbschluss(); return; }
  if (S.ui.tab==='abschluss') S.ui.tab='tabelle';
  if (P[lid]){ renderPool(lid); return; }
  const lg=L[lid];
  $('#title').textContent=lg.name;
  const pr=seasonProgress(s), lp=leagueProgress(s,lid);
  let sub = esc(LEVEL_NAMES[lg.level])+' · Saison '+s.name+' · <a data-act="rules">Regeln &amp; Auf-/Abstieg</a> · <span class="muted">Liga: '+lp.done+'/'+lp.total+' Spiele · alle Ligen: '+pr.done+'/'+pr.total+'</span>';
  if (s.status==='running' && S.view===S.seasons.length-1) sub+=' · <button class="btn small primary" data-act="end">Saison abschließen</button>';
  if (s.status==='ending') sub+=' · <button class="btn small primary" data-act="toEnd">Zum Saisonabschluss</button>';
  if (s.status==='done') sub+=' · <span class="muted">abgeschlossene Saison (nur Ansicht)</span>';
  $('#subline').innerHTML=sub;
  $('#tabs').innerHTML=TABS.map(([k,n])=>'<a class="tab'+(S.ui.tab===k?' active':'')+'" data-tab="'+k+'">'+n+'</a>').join('');
  const v=$('#view');
  if (S.ui.tab==='tabelle') v.innerHTML=viewTabelle(s,lid);
  else if (S.ui.tab==='heimaus') v.innerHTML=viewToggle(s,lid,'ha');
  else if (S.ui.tab==='hinrueck') v.innerHTML=viewToggle(s,lid,'hr');
  else if (S.ui.tab==='ewig') v.innerHTML=viewEwig(lid);
  else if (S.ui.tab==='historie') v.innerHTML=viewHistorie(lid);
  else if (S.ui.tab==='pokal') v.innerHTML='<div class="box"><h3>Pokal</h3><p class="muted">Der Pokal (Landespokale + DFB-Pokal) kommt in einer der nächsten Versionen.</p></div>';
}
function currentMd(s,lid){
  const key=S.view+':'+lid;
  if (S.ui.md[key]!=null) return S.ui.md[key];
  const md=s.leagues[lid].md; const i=md.findIndex(d=>d.some(m=>m[2]==null||m[3]==null));
  return i<0 ? md.length-1 : i;
}
function viewTabelle(s,lid){
  return '<div class="split"><div class="card" id="tableCard">'+tableHTML(leagueTable(s,lid),L[lid])+'</div><div class="card" id="spCard">'+spielplanHTML(s,lid)+'</div></div>';
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
  md.forEach((m,k)=>{
    const has=m[2]!=null&&m[3]!=null;
    h+='<div class="match'+(has?' done':'')+'" data-k="'+k+'"><div class="home" style="display:flex">'+clubHTML(lg.teams[m[0]],{nobl:true})+'</div>'+
      '<div class="score"><input data-k="'+k+'" data-side="0" inputmode="numeric" maxlength="2" autocomplete="off" value="'+(m[2]??'')+'"'+(ed?'':' disabled')+'><b>:</b><input data-k="'+k+'" data-side="1" inputmode="numeric" maxlength="2" autocomplete="off" value="'+(m[3]??'')+'"'+(ed?'':' disabled')+'></div>'+
      '<div class="away" style="display:flex">'+clubHTML(lg.teams[m[1]],{nobl:true})+'</div>'+(ed?'<button class="del" data-act="del" data-k="'+k+'" title="Ergebnis löschen">×</button>':'<span></span>')+'</div>';
  });
  if (ed){
    h+='<div class="sp-tools"><label><input type="checkbox" id="autoNext"'+(S.ui.autoNext?' checked':'')+'> Auto-Weiter nach 1 Ziffer</label><span style="flex:1"></span>'+
      '<button class="btn small" data-act="simMd" title="Nur leere Spiele dieses Spieltags">Spieltag zufällig füllen</button><button class="btn small" data-act="simLeague">Liga zu Ende simulieren</button></div>'+
      '<div class="sp-hint">Tippen: Heimtore, Gasttore – Enter/↓ springt zum nächsten Spiel, ↑ zurück. Beide Felder leeren oder × löscht ein Ergebnis. Gespeichert wird automatisch.</div>';
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
function renderPool(pid){
  const p=P[pid], s=cur();
  $('#title').textContent=p.name;
  $('#subline').innerHTML='Bundesländer: '+esc(p.desc)+' · Saison '+s.name+' · kein Spielbetrieb – zum Saisonende wählst du hier die Aufsteiger in die '+esc(L[p.ol].name)+'.';
  $('#tabs').innerHTML='';
  const ids=[...(s.pools[pid]||[])].sort(byRang);
  $('#view').innerHTML='<div class="box"><input class="searchbox" id="poolSearch" placeholder="Verein suchen …"><p class="muted">'+ids.length+' Vereine, sortiert nach historischer Stärke (Rang aus der Rangliste 2000/01–2025/26).</p><div class="amateur-list" id="poolList">'+
    ids.map(id=>'<div data-name="'+esc(TEAMS[id].name.toLowerCase())+'">'+clubHTML(id)+'<span class="muted" style="font-size:11px;margin-left:32px">'+(TEAMS[id].rang?'Rang '+TEAMS[id].rang+' · Schnitt '+TEAMS[id].schnitt.toFixed(2).replace('.',','):'ohne Wertung')+'</span></div>').join('')+'</div></div>';
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
      '<div><b>Absteiger:</b> '+dn.map(m=>esc(TEAMS[m.id].name)+' <span class="muted">('+m.pl+'.) → '+esc(leagueName(m.to))+'</span>').join(', ')+'</div></div>'; });
    h+='</div>';
    if (e.notes.length) h+='<div class="notice"><b>Ausgleich der Staffelgrößen:</b><br>'+e.notes.map(esc).join('<br>')+'</div>';
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
    cand = cand.filter(id=>!e.moves.some(m=>m.id===id&&m.type==='ab'&&L[m.from]&&L[m.from].level===7)).sort(byRang);
    const takenElse = new Set(Object.entries(e.picks).filter(([k])=>k!==p.ol).flatMap(([,v])=>v));
    h+='<div class="box"><div class="pick-head"><h3 style="margin:0">'+esc(L[p.ol].name)+'</h3><span class="'+(picks.length===need?'ok':'bad')+'">'+picks.length+' / '+need+'</span></div><div class="muted" style="margin-bottom:6px">aus: '+esc(p.name)+' ('+esc(p.desc)+')</div><div class="pick-list">'+
      cand.filter(id=>!takenElse.has(id)).map(id=>'<label class="pick-row'+(picks.includes(id)?' sel':'')+'"><input type="checkbox" data-pick="'+p.ol+'" value="'+id+'"'+(picks.includes(id)?' checked':'')+'>'+clubHTML(id)+'<span class="r">'+(TEAMS[id].rang?'Rang '+TEAMS[id].rang:'ohne Wertung')+'</span></label>').join('')+'</div></div>';
  });
  h+='</div><div style="display:flex;gap:8px;margin-top:6px"><button class="btn" data-act="endStep1">Zurück</button><button class="btn primary" data-act="finalize"'+(ok?'':' disabled')+'>Saison '+nextSeasonName(s.name)+' starten</button></div>';
  v.innerHTML=h;
}
function rulesHTML(){
  let h='<h3>Ligensystem &amp; Regeln</h3><p>Sieg 3 Punkte, Unentschieden 1 Punkt. Reihenfolge bei Gleichstand: Punkte → Tordifferenz → mehr Tore → direkter Vergleich (Punkte, Tordifferenz, Tore) → historische Stärke.</p><table class="tbl"><thead><tr><th class="l">Liga</th><th>Teams</th><th>Auf</th><th>Ab</th><th class="l">Aufstieg in</th></tr></thead><tbody>';
  LEAGUES.forEach(l=>h+='<tr><td class="l">'+esc(l.name)+'</td><td>'+l.size+'</td><td>'+(l.up||'–')+'</td><td>'+l.down+'</td><td class="l">'+(l.upTo?esc(leagueName(l.upTo)):'–')+'</td></tr>');
  h+='</tbody></table><p>Absteiger aus mehrstaffeligen Ebenen gehen in die Staffel ihres Bundeslandes (5. Liga Nordost: Nord+Ost, 5. Liga Südwest: Süd+West). Wäre eine Staffel dadurch zu groß, wird ein Absteiger in die geografisch nächstgelegene Staffel mit freiem Platz verschoben (bevorzugt in derselben Region) (wird im Saisonrückblick angezeigt).</p><p>Die Amateurliga hat keinen Spielbetrieb. Zum Saisonende wählst du pro Oberliga die Aufsteiger (normal 2) aus der Amateurliga desselben Gebiets; Oberliga-Absteiger gehen in die Amateurliga ihres Bundeslandes.</p>';
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
  const tc=$('#tableCard'); if (tc) tc.innerHTML=tableHTML(leagueTable(s,lid),L[lid]);
  const lp=leagueProgress(s,lid), pr=seasonProgress(s);
  const sp=$('#subline .muted'); if (sp) sp.textContent='Liga: '+lp.done+'/'+lp.total+' Spiele · alle Ligen: '+pr.done+'/'+pr.total;
  const md=s.leagues[lid].md[shownMd], done=md.filter(m=>m[2]!=null&&m[3]!=null).length;
  const pg=$('#spCard .progress'); if (pg) pg.textContent='('+done+'/'+md.length+' eingetragen)';
  const opt=$('#mdSelect option:checked'); if (opt) opt.textContent=(shownMd+1)+'. Spieltag'+(done===md.length?' ✓':'');
}
function commitRow(k){
  const s=cur(), lid=S.ui.league, m=s.leagues[lid].md[shownMd][k];
  const ins=document.querySelectorAll('.score input[data-k="'+k+'"]');
  const hv=ins[0].value.trim(), av=ins[1].value.trim();
  const row=ins[0].closest('.match');
  if (hv!==''&&av!==''){ m[2]=+hv; m[3]=+av; row.classList.add('done'); row.classList.remove('partial'); }
  else { m[2]=null; m[3]=null; row.classList.remove('done'); row.classList.toggle('partial', hv!==''||av!==''); }
  save(); refreshTableOnly();
}
function focusInput(k, side){ const el=document.querySelector('.score input[data-k="'+k+'"][data-side="'+side+'"]'); if (el){ el.focus(); el.select(); } return !!el; }

// ---------- Events ----------
document.addEventListener('click', ev=>{
  const t=ev.target;
  const nav=t.closest('[data-league]'); if (nav){ S.ui.league=nav.dataset.league; if(S.ui.tab==='abschluss') S.ui.tab='tabelle'; save(); render(); return; }
  const tab=t.closest('[data-tab]'); if (tab){ S.ui.tab=tab.dataset.tab; save(); render(); return; }
  const tg=t.closest('[data-toggle] button'); if (tg){ S.ui[tg.parentNode.dataset.toggle]=tg.dataset.v; save(); render(); return; }
  if (t.closest('.pick-row')) return;
  const club=t.closest('[data-club]'); if (club && !t.closest('.score')){ clubModal(club.dataset.club); return; }
  const a=t.closest('[data-act]'); if (!a) return;
  const act=a.dataset.act, s=cur(), lid=S.ui.league;
  if (act==='mdPrev'||act==='mdNext'){ const n=s.leagues[lid].md.length; let i=currentMd(s,lid)+(act==='mdNext'?1:-1); i=Math.max(0,Math.min(n-1,i)); S.ui.md[S.view+':'+lid]=i; save(); render(); setTimeout(()=>focusInput(0,0),0); }
  else if (act==='del'){ const k=+a.dataset.k; document.querySelectorAll('.score input[data-k="'+k+'"]').forEach(i=>i.value=''); commitRow(k); }
  else if (act==='simMd'){ const c=simLeague(s,lid,currentMd(s,lid)); save(); render(); toast(c+' Spiele zufällig eingetragen.'); }
  else if (act==='simLeague'){ if(confirm('Alle noch offenen Spiele der '+L[lid].name+' zufällig simulieren?')){ const c=simLeague(s,lid); save(); render(); toast(c+' Spiele simuliert.'); } }
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
  else if (t.id==='mobileLeague'){ S.ui.league=t.value; if(S.ui.tab==='abschluss') S.ui.tab='tabelle'; save(); render(); }
  else if (t.id==='mdSelect'){ S.ui.md[S.view+':'+S.ui.league]=+t.value; save(); render(); }
  else if (t.id==='autoNext'){ S.ui.autoNext=t.checked; save(); }
  else if (t.id==='allPools'){ S.ui.allPools=t.checked; save(); render(); }
  else if (t.dataset.pick){ const e=latest().endData, ol=t.dataset.pick; const arr=e.picks[ol]||(e.picks[ol]=[]);
    if (t.checked){ if (arr.length>=e.need[ol]){ t.checked=false; toast('Für '+L[ol].name+' sind nur '+e.need[ol]+' Aufsteiger möglich.'); return; } arr.push(t.value); }
    else arr.splice(arr.indexOf(t.value),1);
    save(); const y=window.scrollY; render(); window.scrollTo(0,y); }
  else if (t.id==='fileImport'){ importFile(t.files[0]); t.value=''; }
});
document.addEventListener('input', ev=>{
  const t=ev.target;
  if (t.id==='poolSearch'){ const q=t.value.toLowerCase(); document.querySelectorAll('#poolList > div').forEach(d=>d.style.display=d.dataset.name.includes(q)?'':'none'); return; }
  if (!t.matches('.score input')) return;
  const k=+t.dataset.k, side=+t.dataset.side;
  let v=t.value; const jump=/[:\-\s]/.test(v); v=v.replace(/\D/g,'').slice(0,2); t.value=v;
  commitRow(k);
  if (v!=='' && (jump || (S.ui.autoNext && v.length===1) || v.length===2)){
    if (side===0) focusInput(k,1); else if (!focusInput(k+1,0)) t.blur();
  }
});
document.addEventListener('keydown', ev=>{
  const t=ev.target;
  if (ev.key==='Escape') $('#modal').classList.add('hidden');
  if (!t.matches || !t.matches('.score input')) return;
  const k=+t.dataset.k, side=+t.dataset.side;
  if (ev.key==='Enter'||ev.key==='ArrowDown'){ ev.preventDefault(); focusInput(k+1,0); }
  else if (ev.key==='ArrowUp'){ ev.preventDefault(); focusInput(k-1,0); }
  else if (ev.key==='Backspace' && t.value==='' && side===1){ ev.preventDefault(); focusInput(k,0); }
  else if (ev.key==='Backspace' && t.value==='' && side===0 && k>0){ ev.preventDefault(); focusInput(k-1,1); }
  else if (ev.key==='ArrowRight' && side===0 && t.selectionStart===t.value.length){ ev.preventDefault(); focusInput(k,1); }
  else if (ev.key==='ArrowLeft' && side===1 && t.selectionStart===0){ ev.preventDefault(); focusInput(k,0); }
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
    if(!confirm('Spielstand aus „'+f.name+'“ laden? Der aktuelle Stand im Browser wird ersetzt.')) return;
    d.ui=d.ui||{league:'BL',tab:'tabelle',md:{},autoNext:true}; d.view=Math.min(d.view||0,d.seasons.length-1); S=d; save(); render(); toast('Spielstand geladen.'); }
    catch(e){ alert('Die Datei ist kein gültiger Fußballrechner-Spielstand.'); } };
  r.readAsText(f);
}
$('#btnReset').onclick=()=>{ if(confirm('Wirklich alles zurücksetzen? Alle Saisons und Ergebnisse gehen verloren (vorher exportieren!).')){ S=newGame(); save(); render(); } };

// ---------- Start ----------
S = load() || newGame();
S.ui = Object.assign({league:'BL', tab:'tabelle', md:{}, autoNext:true}, S.ui||{});
if (S.view==null || S.view>=S.seasons.length) S.view=S.seasons.length-1;
if (latest().status==='ending' && S.view===S.seasons.length-1) S.ui.tab='abschluss';
save(); render();

// Für Tests/Debugging
window.FR = {computeTransition, get state(){return S;}, L, LEAGUES, POOLS, TEAMS, computeTable, leagueTable, simLeague, homeLeague, AREA_BY_BL};
})();
