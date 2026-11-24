(function(){
'use strict';

const TEAMS={};
(window.FR_TEAMS||[]).forEach(function(row){
  TEAMS[row[0]]={id:row[0], name:row[1], bl:row[2]||'', crest:'wappen/'+row[4]};
});

const COMP={
  de:'Deutsche Meisterschaft',
  bl:'Deutsche Meisterschaft',
  dfb:'DFB-Pokal',
  ddr:'DDR-Meisterschaft',
  fdgb:'FDGB-Pokal',
  land:'Landespokal'
};

function esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
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
function hidden(team){
  return !team || blocked(team.name) || secondTeam(team.name);
}
function showName(name){
  if (/greuther\s+f[uü]rth/i.test(String(name||''))) return 'SpVgg Fürth';
  return name||'';
}
function coordOf(id){
  const c=window.FR_COORDS&&window.FR_COORDS[id];
  if (!c) return null;
  return {lat:+c[0], lon:+c[1], stadion:c[2]||''};
}
function deCoord(n){
  return (Math.round(n*100)/100).toFixed(2).replace('.', ',');
}
function real(){ return window.FR_REAL||{season:'', levels:[]}; }
function levels(){
  const base=(real().levels||[]).slice();
  const unknown=(real().unknown||[]).filter(function(id){ return TEAMS[id] && !hidden(TEAMS[id]); });
  if (unknown.length) base.push({level:0, label:'ohne Zuordnung', leagues:[{name:'ohne Zuordnung', ids:unknown}]});
  return base;
}
function leagueAt(li, gi){
  const level=levels()[li];
  if (!level) return null;
  const league=(level.leagues||[])[gi];
  if (!league) return null;
  return {level:level, league:league, li:li, gi:gi};
}
function members(league){
  return (league.ids||[]).filter(function(id){ return TEAMS[id] && !hidden(TEAMS[id]); });
}
function placeOf(id){
  const all=levels();
  for (let i=0;i<all.length;i++){
    const leagues=all[i].leagues||[];
    for (let j=0;j<leagues.length;j++){
      if ((leagues[j].ids||[]).indexOf(id)>=0 && !hidden(TEAMS[id])) return leagueAt(i, j);
    }
  }
  return null;
}
function historyOf(id){
  const H=window.FR_HISTORY;
  if (!H || !H.rows || !H.rows[id]) return [];
  return H.rows[id].map(function(r){
    return {season:H.seasons[r[0]]||'', liga:H.ligas[r[1]]||'', pl:r[4], n:r[3]};
  }).filter(function(r){ return r.season && r.liga; }).sort(function(a,b){ return a.season<b.season?1:-1; });
}
function noteText(note){
  const s=String(note||'').trim();
  if (!s || /Spielbestand|Ansehen|Rechner/i.test(s)) return '';
  return s;
}
function titlesOf(id){
  const rows=[];
  ((window.FR_TITEL&&window.FR_TITEL.rows)||[]).forEach(function(r){
    if (r && r.id===id) rows.push({year:r.year, comp:COMP[r.comp]||r.comp||'', original:r.original||'', note:noteText(r.note)});
  });
  ((window.FR_SCHAU&&window.FR_SCHAU.rows)||[]).forEach(function(r){
    if (r && r.id===id) rows.push({year:r.year, comp:r.cupName||COMP[r.comp]||'Landespokal', original:r.original||'', note:noteText(r.note)});
  });
  rows.sort(function(a,b){ return (b.year||0)-(a.year||0); });
  return rows;
}

const view={li:0, gi:0, club:null};
function parseHash(){
  const h=(location.hash||'').replace(/^#/,'');
  const club=h.match(/^v\/([A-Za-z0-9]+)$/);
  if (club){
    view.club=club[1];
    const spot=placeOf(view.club);
    if (spot){ view.li=spot.li; view.gi=spot.gi; }
    return;
  }
  const g=h.match(/^g\/(\d+)\/(\d+)$/);
  view.club=null;
  if (g){ view.li=+g[1]; view.gi=+g[2]; }
}
function go(hash){
  if (location.hash===hash) render();
  else location.hash=hash;
}

function navHTML(){
  return levels().map(function(level, i){
    return '<button type="button" class="nav-link'+(i===view.li?' active':'')+'" data-level="'+i+'">'+esc(level.label)+'</button>';
  }).join('');
}
function staffelHTML(){
  const spot=leagueAt(view.li, 0);
  const leagues=spot?spot.level.leagues||[]:[];
  const options=leagues.map(function(lg, i){
    return '<option value="'+i+'"'+(i===view.gi?' selected':'')+'>'+esc(lg.name)+'</option>';
  }).join('');
  const here=leagueAt(view.li, view.gi);
  const n=here?members(here.league).length:0;
  return '<select id="staffelSelect" aria-label="Staffel">'+options+'</select><span class="staffel-count">'+n+' Vereine · '+(esc(real().season||''))+'</span>';
}
function clubRow(id){
  const t=TEAMS[id];
  const c=coordOf(id);
  const where=[t.bl, c&&c.stadion].filter(Boolean).join(' · ');
  return '<button type="button" class="club-row" data-club="'+esc(id)+'">'+
    '<img class="crest" src="'+esc(t.crest)+'" alt="">'+
    '<span><span class="club-name">'+esc(showName(t.name))+'</span><span class="club-meta">'+esc(where||'–')+'</span></span></button>';
}
function listHTML(){
  const here=leagueAt(view.li, view.gi);
  if (!here) return '<p class="empty">Diese Liga ist nicht vorhanden.</p>';
  const ids=members(here.league);
  return '<div class="league-head"><h1>'+esc(here.league.name)+'</h1><p>'+esc(here.level.label)+'</p></div>'+
    '<div class="club-grid">'+ids.map(clubRow).join('')+'</div>';
}
function infoHTML(id){
  const t=TEAMS[id];
  if (!t || hidden(t)) return '<p class="empty">Dieser Verein wird nicht angezeigt.</p>';
  const c=coordOf(id);
  const spot=placeOf(id);
  const back=spot?'#g/'+spot.li+'/'+spot.gi:'#g/0/0';
  const loc=[t.bl, c&&c.stadion].filter(Boolean).join(' · ');
  const geo=c?'<p class="muted">'+esc(deCoord(c.lat))+'° N, '+esc(deCoord(c.lon))+'° O</p>':'';
  const titles=titlesOf(id);
  const hist=historyOf(id);
  const titleTable=titles.length
    ? '<table class="tbl"><thead><tr><th>Jahr</th><th>Wettbewerb</th><th>Damals</th></tr></thead><tbody>'+titles.map(function(r){
        const damals=r.original && r.original!==t.name?esc(r.original):'';
        const note=r.note?'<div class="muted">'+esc(r.note)+'</div>':'';
        return '<tr><td>'+esc(r.year||'')+'</td><td>'+esc(r.comp)+note+'</td><td>'+damals+'</td></tr>';
      }).join('')+'</tbody></table>'
    : '<p class="muted">Keine gespeicherten Titel.</p>';
  const histTable=hist.length
    ? '<table class="tbl"><thead><tr><th>Saison</th><th>Liga</th><th>Platz</th></tr></thead><tbody>'+hist.map(function(r){
        return '<tr><td>'+esc(r.season)+'</td><td>'+esc(r.liga)+'</td><td>'+esc(r.pl)+'</td></tr>';
      }).join('')+'</tbody></table>'
    : '<p class="muted">Keine Ligahistorie gespeichert.</p>';
  return '<div class="bfv-page"><header class="bfv-stage"><div class="bfv-stage-row">'+
    '<img class="bfv-crest" src="'+esc(t.crest)+'" alt="">'+
    '<div><div class="bfv-kicker">'+esc(spot?spot.league.name:'')+'</div><h2>'+esc(showName(t.name))+'</h2><div class="bfv-meta">'+esc(loc||'–')+'</div>'+
    '<button type="button" class="bfv-back" data-go="'+esc(back)+'">Zurück zur Liga</button></div></div></header>'+
    '<div class="bfv-card"><h3>Standort</h3><p>'+esc(t.bl||'–')+(c&&c.stadion?' · '+esc(c.stadion):'')+'</p>'+geo+
    '<h3>Titel</h3>'+titleTable+'<h3>Ligahistorie</h3>'+histTable+'</div></div>';
}
function render(){
  parseHash();
  if (view.li<0 || view.li>=levels().length) view.li=0;
  const leagues=(levels()[view.li]&&levels()[view.li].leagues)||[];
  if (view.gi<0 || view.gi>=leagues.length) view.gi=0;
  document.getElementById('leagueNav').innerHTML=navHTML();
  document.getElementById('staffelBar').innerHTML=staffelHTML();
  document.getElementById('view').innerHTML=view.club?infoHTML(view.club):listHTML();
}

document.addEventListener('click', function(ev){
  const level=ev.target.closest('[data-level]');
  if (level){ go('#g/'+level.getAttribute('data-level')+'/0'); return; }
  const club=ev.target.closest('[data-club]');
  if (club){ go('#v/'+club.getAttribute('data-club')); return; }
  const back=ev.target.closest('[data-go]');
  if (back){ go(back.getAttribute('data-go')); }
});
document.addEventListener('change', function(ev){
  if (ev.target.id!=='staffelSelect') return;
  go('#g/'+view.li+'/'+ev.target.value);
});
window.addEventListener('hashchange', render);

function shownIds(){
  const ids=[];
  levels().forEach(function(level){
    (level.leagues||[]).forEach(function(lg){ members(lg).forEach(function(id){ ids.push(id); }); });
  });
  return ids;
}
function selfTest(){
  const fails=[];
  const ids=shownIds();
  if (!ids.length) fails.push('keine Vereine');
  const seen={};
  levels().forEach(function(level){
    (level.leagues||[]).forEach(function(lg){
      if (!lg.name) fails.push('Liga ohne Namen');
      (lg.ids||[]).forEach(function(id){
        if (!TEAMS[id]){ fails.push('Verein fehlt '+id+' '+lg.name); return; }
        if (hidden(TEAMS[id])) return;
        if (seen[id]) fails.push('doppelt '+id);
        seen[id]=lg.name;
        if (!TEAMS[id].crest || TEAMS[id].crest.indexOf('wappen/')!==0) fails.push('Wappen fehlt '+id);
        if (blocked(TEAMS[id].name)) fails.push('gesperrt sichtbar '+TEAMS[id].name);
        if (secondTeam(TEAMS[id].name)) fails.push('zweite Mannschaft '+TEAMS[id].name);
        if (TEAMS[id].id==='t022' && showName(TEAMS[id].name)!=='SpVgg Fürth') fails.push('Fürth');
      });
    });
  });
  if (!seen.t095) fails.push('SSV Jeddeloh II fehlt');
  const leagues=levels().reduce(function(n, level){ return n+(level.leagues||[]).length; }, 0);
  if (leagues<8) fails.push('zu wenig Ligen');
  return {ok:!fails.length, fails:fails, clubs:ids.length, leagues:leagues};
}
async function crestTest(ids){
  const missing=[];
  let cursor=0;
  async function worker(){
    while (cursor<ids.length){
      const id=ids[cursor++];
      let ok=false;
      try{ ok=(await fetch(TEAMS[id].crest)).ok; }catch(e){ ok=false; }
      if (!ok) missing.push(id);
    }
  }
  const jobs=[];
  for (let i=0;i<12;i++) jobs.push(worker());
  await Promise.all(jobs);
  return missing;
}
async function selfTestAsync(){
  const base=selfTest();
  const missing=await crestTest(shownIds());
  if (missing.length) base.fails=base.fails.concat(missing.slice(0, 8).map(function(id){ return 'Wappen nicht gefunden '+id; }));
  base.ok=!base.fails.length;
  base.crests=shownIds().length-missing.length;
  return base;
}

window.FR={teams:TEAMS, selfTest:selfTest, selfTestAsync:selfTestAsync};
if (!location.hash) location.replace('#g/0/0');
render();
})();
