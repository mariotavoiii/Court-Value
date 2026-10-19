// Court Value site. Each page is a small HTML file (built by tools/build_pages.py) that loads this script,
// which pulls in the shared markup (assets/shell.html) and then runs the app.
(function(){
  window.CVR_ROOT = document.baseURI.replace(/[?#].*$/, "").replace(/[^\/]*$/, "");
  var V = (document.currentScript && document.currentScript.src.split("?v=")[1]) || "";
  function boot(){
(function(){
  var CONFIG = { repo: "https://github.com/mariotavoiii/Court-Value", version: "2.1.1",
    // fill in any of these and a link appears in the footer
    social: { Reddit: "", X: "", Bluesky: "", Instagram: "", Substack: "" } };
  (function(){
    var host = document.getElementById("social"), links = Object.keys(CONFIG.social).filter(function(k){ return CONFIG.social[k]; });
    if (links.length){ host.innerHTML = links.map(function(k){ return "<a href='" + CONFIG.social[k] + "' rel='me noopener'>" + k + "</a>"; }).join(""); host.hidden = false; }
    var btn = document.getElementById("share-btn");
    btn.addEventListener("click", function(){
      var url = location.href, title = document.title;
      function done(t){ btn.textContent = t; btn.classList.add("done"); setTimeout(function(){ btn.textContent = "Share"; btn.classList.remove("done"); }, 1800); }
      if (navigator.share && matchMedia("(pointer:coarse)").matches){ navigator.share({title: title, url: url}).catch(function(){}); return; }
      try { navigator.clipboard.writeText(url).then(function(){ done("Link copied"); }, function(){ prompt("Copy this link:", url); }); } catch(e){ prompt("Copy this link:", url); }
    });
  })();
  var NS = "http://www.w3.org/2000/svg";

  var pages = [].slice.call(document.querySelectorAll("[data-page]"));
  var navs = [].slice.call(document.querySelectorAll("[data-nav]"));
  // ---- Router. Addresses look like #page/arg/arg?key=value&key=value, so every view can be shared.
  // Navigation sets location.hash (adds history); state changes inside a page use replaceState.
  // Addresses are real paths: /players/jordami01/, /time-machine/1996-0-CHI/, /rankings/?score=po.
  // Old #page/arg links still work and are rewritten to the path form on arrival.
  var ROOT = document.baseURI.replace(/[?#].*$/, "").replace(/[^\/]*$/, ""), ROOTPATH = new URL(ROOT).pathname;
  var SEG = {player: "players", teams: "time-machine", methodology: "about"}, PAGE = {};
  Object.keys(SEG).forEach(function(k){ PAGE[SEG[k]] = k; });
  // the first argument goes in the path only where a page is published for it; anything else rides in ?at=
  function inPath(page, a){
    if (!a) return false;
    if (page === "player" || page === "franchises" || page === "decades") return true;
    if (page === "teams") return a.indexOf(",") < 0;
    if (page === "rankings") return a === "teams";
    return false;
  }
  function isRoute(h){ if (!h || h.charAt(0) !== "#") return false; var el = document.getElementById(h.slice(1).split(/[\/?]/)[0]); return !!(el && el.hasAttribute("data-page")); }
  function routeFromURL(){
    if (isRoute(location.hash)) return location.hash.slice(1);   // legacy #page/arg?k=v
    var p = location.pathname, rel = p.indexOf(ROOTPATH) === 0 ? p.slice(ROOTPATH.length) : p.replace(/^\//, "");
    var parts = rel.split("/").filter(function(x){ return x && x !== "index.html"; });
    var page = parts.length ? (PAGE[parts[0]] || parts[0]) : "home", args = parts.slice(1);
    var q = location.search.slice(1), at = null, rest = [];
    var vs = null;
    q.split("&").forEach(function(kv){ if (!kv) return; if (kv.indexOf("at=") === 0) at = decodeURIComponent(kv.slice(3)); else if (kv.indexOf("vs=") === 0) vs = decodeURIComponent(kv.slice(3)); else if (kv.indexOf("v=") !== 0) rest.push(kv); });
    if (at) args = args.concat(at.split("/"));
    if (vs && args.length) args[0] += "," + vs;
    return page + (args.length ? "/" + args.join("/") : "") + (rest.length ? "?" + rest.join("&") : "");
  }
  function urlFromRoute(h){
    var r = parseRoute(String(h).replace(/^#/, "")), segs = [], params = {};
    if (r.page !== "home") segs.push(SEG[r.page] || r.page);
    var args = r.args.slice();
    if (r.page === "teams" && args.length === 1 && args[0].indexOf(",") > 0){ var two = args[0].split(","); args = [two[0]]; params.vs = two.slice(1).join(","); }
    if (args.length && inPath(r.page, args[0])) segs.push(args.shift());
    if (args.length) params.at = args.join("/");
    Object.keys(r.params).forEach(function(k){ params[k] = r.params[k]; });
    var q = Object.keys(params).filter(function(k){ return params[k] !== undefined && params[k] !== null && params[k] !== ""; })
      .map(function(k){ return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); }).join("&").replace(/%2C/g, ",").replace(/%2F/g, "/");
    return ROOTPATH + segs.map(encodeURIComponent).join("/") + (segs.length ? "/" : "") + (q ? "?" + q : "");
  }
  function parseHash(){ return parseRoute(routeFromURL()); }
  function parseRoute(h){
    h = h || "home"; var qi = h.indexOf("?");
    var path = qi < 0 ? h : h.slice(0, qi), qs = qi < 0 ? "" : h.slice(qi + 1), params = {};
    qs.split("&").forEach(function(kv){ if (!kv) return; var i = kv.indexOf("="); params[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] = i < 0 ? "" : decodeURIComponent(kv.slice(i + 1)); });
    var parts = path.split("/").map(function(x){ try { return decodeURIComponent(x); } catch(e){ return x; } });
    return {page: parts[0] || "home", args: parts.slice(1).filter(function(x){ return x !== ""; }), params: params};
  }
  function buildHash(page, args, params){ return urlFromRoute(buildRoute(page, args, params)); }
  function buildRoute(page, args, params){
    var h = "#" + page + (args && args.length ? "/" + args.map(encodeURIComponent).join("/") : "");
    var q = Object.keys(params || {}).filter(function(k){ return params[k] !== undefined && params[k] !== null && params[k] !== ""; })
      .map(function(k){ return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); });
    return (h + (q.length ? "?" + q.join("&") : "")).replace(/%2C/g, ",");
  }
  var HANDLERS = {}, lastView = null;
  var CVR = window.CVR = {
    parse: parseHash, build: buildHash,
    on: function(page, fn){ HANDLERS[page] = fn; },
    // keep the address in step with what's on screen, without adding history or re-routing
    booted: false,   // until the first route has been applied, don't overwrite the address we arrived with
    replace: function(page, args, params){
      if (!CVR.booted || parseHash().page !== page) return;
      var u = buildHash(page, args, params);
      if (u !== location.pathname + location.search && history.replaceState) history.replaceState(null, "", u);
    },
    // go to an address: a path from build(), or an old-style "#page/arg"
    go: function(u){
      u = String(u);
      if (u.charAt(0) === "#") u = urlFromRoute(u);
      if (u !== location.pathname + location.search || location.hash) history.pushState(null, "", u);
      route();
    },
    url: urlFromRoute, root: ROOT,
    apply: function(){ var r = parseHash(); if (HANDLERS[r.page]) HANDLERS[r.page](r.args, r.params); }
  };
  var PAGE_TITLE = {rankings: "Rankings", compare: "Compare players", teams: "Time Machine", big3: "Big 3s", decades: "Decades", wnba: "WNBA", franchises: "Franchises", methodology: "How it works", downloads: "Data", contact: "Contact", play: "Play"};
  function route(){
    if (isRoute(location.hash) && history.replaceState) history.replaceState(null, "", urlFromRoute(location.hash));
    var r = parseHash(), id = r.page, el = document.getElementById(id);
    if (!el || !el.hasAttribute("data-page")) id = "home";
    pages.forEach(function(p){ p.hidden = p.id !== id; });
    var navKey = id === "rankings" && r.args[0] === "teams" ? "teamrank" : id;   // team rankings live at #rankings/teams but belong to Teams
    navs.forEach(function(a){ if (a.dataset.nav.split(" ").indexOf(navKey) > -1) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); });
    document.querySelectorAll(".subnav a").forEach(function(a){ if (a.dataset.sub === navKey) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); });
    document.querySelectorAll("#rankings > .subnav").forEach(function(n){ n.hidden = (n.dataset.group === "teams") !== (navKey === "teamrank"); });
    var view = id + "/" + r.args.join("/");
    if (id === "player" && lastView && lastView.split("/")[1] === r.args[0] && lastView.indexOf("player/") === 0){ /* same player, new season: keep scroll */ }
    else if (view !== lastView) window.scrollTo(0,0);
    lastView = view;
    if (id !== "player") document.title = (PAGE_TITLE[id] ? PAGE_TITLE[id] + " · " : "") + "Court Value";
    if (HANDLERS[id]) HANDLERS[id](r.args, r.params);
    if (id === "methodology" && r.args[0]){ var tgt = document.getElementById(r.args[0]); if (tgt) setTimeout(function(){ tgt.scrollIntoView(); }, 0); }
  }
  window.addEventListener("popstate", route);
  window.addEventListener("hashchange", function(){ if (isRoute(location.hash)){ history.replaceState(null, "", urlFromRoute(location.hash)); route(); } });
  // links: old "#page" hrefs become real addresses; clicks inside the site route without a reload
  function fixOne(a){ var h = a.getAttribute("href"); if (isRoute(h)) a.setAttribute("href", urlFromRoute(h)); }
  function fixLinks(el){ if (el && el.querySelectorAll) el.querySelectorAll("a[href^='#']").forEach(fixOne); }
  fixLinks(document);
  new MutationObserver(function(ms){ ms.forEach(function(m){ m.addedNodes.forEach(function(n){ if (n.nodeType === 1){ if (n.matches && n.matches("a[href^='#']")) fixOne(n); else fixLinks(n); } }); }); }).observe(document.body, {childList: true, subtree: true});
  document.addEventListener("click", function(e){
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]"); if (!a || a.target || a.hasAttribute("download")) return;
    var h = a.getAttribute("href");
    if (isRoute(h)){ e.preventDefault(); CVR.go(h); return; }
    var u; try { u = new URL(a.href); } catch(err){ return; }
    if (u.origin !== location.origin || u.pathname.indexOf(ROOTPATH) !== 0) return;
    if (/\.[a-z0-9]{2,5}$/i.test(u.pathname)) return;   // files (CSV, JSON, images) load normally
    e.preventDefault(); CVR.go(u.pathname + u.search);
  });
  // sub-tabs for grouped sections
  // [key, label, address, section it sits in]
  [{name: "players", label: "Players", items: [["rankings", "Rankings", "#rankings", "rankings"], ["compare", "Compare", "#compare", "compare"]]},
   {name: "teams", label: "Teams", items: [["franchises", "Franchises", "#franchises", "franchises"], ["teamrank", "Rankings", "#rankings/teams", "rankings"], ["teams", "Time Machine", "#teams", "teams"], ["big3", "Big 3", "#big3", "big3"]]},
   {name: "about", label: "About", items: [["methodology", "How it works", "#methodology", "methodology"], ["downloads", "Data", "#downloads", "downloads"], ["contact", "Contact", "#contact", "contact"]]}].forEach(function(g){
    var html = "<nav class='subnav' data-group='" + g.name + "' aria-label='" + g.label + "'>" + g.items.map(function(x){ return "<a href='" + x[2] + "' data-sub='" + x[0] + "'>" + x[1] + "</a>"; }).join("") + "</nav>";
    var done = {};
    g.items.forEach(function(x){ if (done[x[3]]) return; done[x[3]] = 1; document.getElementById(x[3]).insertAdjacentHTML("afterbegin", html); });
  });

  document.querySelectorAll(".ver").forEach(function(el){ el.textContent = CONFIG.version; });
  if (CONFIG.repo){
    document.getElementById("contact-issues").innerHTML = 'Open an issue at <a href="' + CONFIG.repo + '/issues">' + CONFIG.repo.replace("https://","") + '/issues</a> with the player, the season and what you expected.';
  }
  document.getElementById("copy-cite").addEventListener("click", function(){
    var btn = this, el = document.getElementById("citation");
    function done(){ btn.textContent = "Copied"; setTimeout(function(){ btn.textContent = "Copy citation"; }, 1600); }
    function sel(){ var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "Selected. Press Copy."; }
    try { navigator.clipboard.writeText(el.textContent).then(done, sel); } catch(e){ sel(); }
  });

  // Middle half (25th-75th percentile) of qualified MVP-winning seasons, NBA and ABA, CV 2.1.
  var MVP_BAND = {lo: 8.24, hi: 11.46, label: "MVP RANGE · MIDDLE HALF OF MVP SEASONS"};
  function seasonLabel(y){ return (y - 1) + "–" + String(y).slice(-2); }
  function fmt(x){ return x === null ? "—" : x.toFixed(2); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function svg(tag, attrs, parent){ var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }


  // ---- The ruler: the CV scale (-2 to 16) drawn the same way everywhere
  function RP(v){ v = Math.max(-2, Math.min(16, v)); return ((v + 2) / 18 * 100).toFixed(2) + "%"; }
  function RX(v){ return (Math.max(-2, Math.min(16, v)) + 2) / 18; }   // 0..1 across the ruler
  var RNAMES = {0: "AVERAGE", 4: "ALL-STAR", 6: "ALL-NBA", 8: "MVP", 12: "ALL-TIME", 16: ""};
  function rulerHTML(o){
    // o: h (height), zt (zone top), track (track top), names (bool), descs ({value: text}), zoneLabels (bool), marks (html)
    var h = "<div class='ruler' style='height:" + o.h + "px'>";
    h += "<div class='rz mvp' style='left:" + RP(8) + ";width:22.22%;top:" + o.zt + "px;height:" + (o.track - o.zt) + "px'></div>";
    h += "<div class='rz top' style='left:" + RP(12) + ";right:0;top:" + o.zt + "px;height:" + (o.track - o.zt) + "px'></div>";
    if (o.zoneLabels){ h += "<span class='rzl' style='left:" + RP(8) + ";top:" + (o.zt + 5) + "px'>MVP RANGE</span><span class='rzl top' style='left:" + RP(12) + ";top:" + (o.zt + 5) + "px'>ALL-TIME</span>"; }
    h += "<div class='rtrack' style='top:" + o.track + "px'></div>";
    for (var v = -2; v <= 16; v++){
      var major = RNAMES.hasOwnProperty(v);
      h += "<div class='rtick' style='left:" + RP(v) + ";top:" + (o.track - (major ? 8 : 4)) + "px;height:" + (major ? 19 : 11) + "px'></div>";
    }
    var labs = o.descs ? o.descs : null;
    (labs ? labs : [0, 4, 6, 8, 12, 16].map(function(v){ return {at: v, v: String(v), name: o.names ? RNAMES[v] : ""}; })).forEach(function(l){
      h += "<div class='rlab' style='left:" + RP(l.at) + ";top:" + (o.labTop || o.track + 16) + "px'><b" + (l.color ? " style='color:" + l.color + "'" : "") + ">" + l.v + "</b>" + (l.name ? "<span>" + l.name + "</span>" : "") + (l.desc ? "<span class='desc'>" + l.desc + "</span>" : "") + "</div>";
    });
    return h + (o.marks || "") + "</div>";
  }
  // Season markers stacked so nearby values don't overlap
  function stackDots(items, gap){
    var placed = [];
    return items.slice().sort(function(a, b){ return a.v - b.v; }).map(function(it){
      var lvl = 0;
      while (placed.some(function(p){ return p.lvl === lvl && Math.abs(p.v - it.v) < gap; })) lvl++;
      placed.push({v: it.v, lvl: lvl}); it.lvl = lvl; return it;
    });
  }
  function renderGuide(){
    var host = document.getElementById("guide-ruler"); if (!host) return;
    var picks = [["russebi01", 1965], ["chambwi01", 1967], ["onealsh01", 2000], ["jokicni01", 2023]], marks = "";
    picks.forEach(function(pk, i){
      var r = (BYID[pk[0]] || []).filter(function(x){ return x[2] === pk[1]; })[0]; if (!r) return;
      var top = [64, 32, 64, 0][i];   // staggered so neighbouring labels clear each other
      marks += "<a class='rmark' href='" + phref(r[0], r[2]) + "' style='left:" + RP(r[9]) + ";top:" + top + "px'><span>" + esc(r[1].split(" ").slice(-1)[0]) + "<br><small>" + seasonLabel(r[2]) + " · </small>" + r[9].toFixed(2) + "</span><i style='height:" + (132 - top) + "px'></i><em></em></a>";
    });
    var n12 = ROWS.length ? ROWS.filter(function(r){ return r[7] && r[9] >= 12; }).length : 27;
    document.querySelectorAll(".n12").forEach(function(e){ e.textContent = n12; });
    host.innerHTML = rulerHTML({h: 262, zt: 20, track: 168, marks: marks, descs: [
      {at: 0, v: "0", desc: "That season's average player-game"}, {at: 4, v: "4", desc: "A typical All-Star season"},
      {at: 6, v: "6", desc: "A typical All-NBA season", color: "var(--green)"}, {at: 10, v: "8–12", desc: "Where most MVP seasons land", color: "var(--blue)"},
      {at: 14, v: "12+", desc: "All-time territory: " + n12 + " seasons", color: "var(--red)"}]});
  }

  // Row fields: 0 id, 1 player, 2 season, 3 lg(0 NBA/1 ABA), 4 teams, 5 g, 6 mp, 7 q, 8 cov, 9 cv, 10 base, 11 def, 12 rs, 13 ra, 14 brs, 15 bra, 16 pos
  var CROWS = [], ROWS = [], BYID = {}, PROWS = [], PBYID = {}, FROWS = [], FBYID = {}, NAMEIDX = {}, state = { basis: "full", from: 0, to: 9999, league: "all", pos: "all", team: "all", q: true, text: "", shown: 50, sort: null, dir: -1, champ: false, best: false };

  // Playoff rows: 0 id, 1 player, 2 season, 3 lg, 4 team, 5 g, 6 team_games, 7 rate_q, 8 box evidence, 9 run, 10 rate, 11 credit,
  // 12 run_rs, 13 run_ra, 14 rate_rs, 15 rate_ra, 16 pos, 17 champion, 18 rounds
  function isPO(){ return false; }  // 1.x playoff views retired in 2.0
  // Full-season rows: 0 id, 1 player, 2 season, 3 lg, 4 teams, 5 rs_g, 6 po_g, 7 q, 8 playoff status (I/N/U), 9 full season,
  // 10 regular-season CV, 11 title bonus, 12 rank season, 13 rank all-time, 14 playoff rate, 16 pos, 17 champion
  function isFS(){ return false; }
  function SK(){ return state.basis === "base" ? 10 : state.basis === "po" ? 11 : 9; }
  function isCR(){ return state.basis === "career"; }
  function SRC(){ return isCR() ? CROWS : isPO() ? PROWS : isFS() ? FROWS : ROWS; }
  function SRCBY(){ return isPO() ? PBYID : isFS() ? FBYID : BYID; }
  var BASIS_LABEL = {full: "Season CV", base: "Regular season", po: "Playoffs", career: "Career CV"};
  var CBYID = {}, scoresP, careersP, DEF = {from: 0, to: 9999};
  careersP = fetch(window.CVR_ROOT + "data/careers.json").then(function(r){ return r.json(); }).then(function(d){
    CROWS = d.rows; CROWS.forEach(function(r){ CBYID[r[0]] = r; });
    if (ROWS.length){ renderTopCareers(); if (isCR()) render(); }
  }).catch(function(){ var e = document.getElementById("topcareers"); if (e) e.innerHTML = "<tr><td colspan='6' class='status'>The career file could not be loaded.</td></tr>"; });
  scoresP = fetch(window.CVR_ROOT + "data/scores.json").then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); }).then(function(d){
    ROWS = d.rows;
    ROWS.forEach(function(r){ r[22] = r[11] !== null && r[11] !== undefined ? +(r[11] - r[10]).toFixed(3) : null; });   // playoff lift: PO minus RS
    ROWS.forEach(function(r){ (BYID[r[0]] = BYID[r[0]] || []).push(r); });
    document.getElementById("rev").textContent = d.meta.data_revision;
    var seasons = {}; ROWS.forEach(function(r){ seasons[r[2]] = 1; });
    var ys = Object.keys(seasons).map(Number).sort(function(a,b){ return a-b; });
    var fFrom = document.getElementById("f-from"), fTo = document.getElementById("f-to");
    ys.forEach(function(y){
      var o = document.createElement("option"); o.value = y; o.textContent = seasonLabel(y); fFrom.appendChild(o);
      var o2 = o.cloneNode(true); fTo.appendChild(o2);
    });
    state.from = DEF.from = ys[0]; state.to = DEF.to = ys[ys.length-1]; fFrom.value = state.from; fTo.value = state.to;
    var teams = {}; ROWS.forEach(function(r){ String(r[4]).split(/[^A-Z0-9]+/).forEach(function(t){ if (t) teams[t] = 1; }); });
    var fTeam = document.getElementById("f-team");
    Object.keys(teams).sort().forEach(function(t){ var o = document.createElement("option"); o.value = t; o.textContent = t; fTeam.appendChild(o); });
    var counts = {}; Object.keys(BYID).forEach(function(pid){ var n = BYID[pid][0][1]; counts[n] = (counts[n] || 0) + 1; });
    var dl = document.createElement("datalist"); dl.id = "cmp-names";
    Object.keys(BYID).map(function(pid){
      var rs = BYID[pid], n = rs[0][1], lab = counts[n] > 1 ? n + " (" + seasonLabel(Math.min.apply(null, rs.map(function(r){ return r[2]; }))) + ")" : n;
      NAMEIDX[lab] = pid; return lab;
    }).sort().forEach(function(lab){ var o = document.createElement("option"); o.value = lab; dl.appendChild(o); });
    document.body.appendChild(dl);
    Object.keys(BYID).forEach(function(pid){ var n = BYID[pid][0][1]; (NAMES[n] = NAMES[n] || []).push(pid); });
    window.CVNAMES = NAMES; window.CVBYID = BYID;
    renderTop10(); renderBest(); render(); renderTopRuns(); renderCompare();
    if (CROWS.length) renderTopCareers();
    renderGuide();
    CVR.booted = true;
    CVR.apply();
  });
  scoresP.catch(function(){
    var msg = '<tr><td colspan="7" class="status">The score file could not be loaded. Download the CSV from the Data page instead.</td></tr>';
    document.getElementById("top10").innerHTML = msg; document.getElementById("rank-body").innerHTML = msg;
    document.getElementById("best-chart").innerHTML = '<div class="status">The chart could not be loaded.</div>';
  });

  // Player links. A season row links to the player's page opened at that season.
  var NAMES = {};
  function phref(pid, season){ return buildHash("player", season ? [pid, String(season)] : [pid]); }
  function plink(r){ return "<a class='plink' href='" + phref(r[0]) + "'>" + esc(r[1]) + "</a>"; }
  function slink(r){ return "<a class='plink' href='" + phref(r[0], r[2]) + "'>" + esc(r[1]) + "</a>"; }
  // Resolve a name from the team, decade and franchise files to a player id, using the season (or range) and team to
  // separate players who share a name.
  function pidFor(name, s0, s1, team){
    var c = NAMES[name]; if (!c) return null; if (c.length === 1) return c[0];
    if (s0 === undefined) return c[0];
    if (s1 === undefined) s1 = s0;
    var hit = c.filter(function(pid){ return BYID[pid].some(function(r){ return r[2] >= s0 && r[2] <= s1 && (!team || String(r[4]).split(",").indexOf(team) > -1); }); });
    if (!hit.length && team) hit = c.filter(function(pid){ return BYID[pid].some(function(r){ return r[2] >= s0 && r[2] <= s1; }); });
    return (hit[0] || c[0]);
  }
  function fullSpan(pid){
    var rs = BYID[pid]; if (!rs) return null;
    var ys = rs.map(function(r){ return r[2]; });
    return [Math.min.apply(null, ys), Math.max.apply(null, ys)];
  }
  function spanLabel(sp){ return (sp[0] - 1) + "–" + String(sp[1]).slice(-2); }
  function spanLong(sp){ return sp[0] === sp[1] ? seasonLabel(sp[0]) : seasonLabel(sp[0]) + " to " + seasonLabel(sp[1]); }
  window.CV = {
    ready: scoresP.then(function(){ return true; }),
    seasonLabel: seasonLabel,
    drawChart: function(){ return drawChart.apply(null, arguments); },
    // name link for another script: season given → that season on his page; range → his page
    nameLink: function(name, s0, s1, team, seasonLink){
      var pid = pidFor(name, s0, s1, team);
      if (!pid) return esc(name);
      return "<a class='plink' href='" + phref(pid, seasonLink ? s0 : null) + "'>" + esc(name) + "</a>";
    }
  };

  function renderTopRuns(){
    var top = ROWS.filter(function(r){ return r[20] !== null && r[20] <= 10; }).sort(function(a,b){ return a[20]-b[20]; });
    document.getElementById("topruns").innerHTML = top.map(function(r){
      return "<tr><td class='rk'>" + r[20] + "</td><td class='player'>" + slink(r) + "</td><td>" + seasonLabel(r[2]) + "</td><td class='num'>" + esc(r[4]) + "</td><td class='cv'>" + fmt(r[11]) + "</td><td class='num'>" + fmt(r[9]) + "</td><td class='num'>" + fmt(r[10]) + "</td></tr>";
    }).join("");
  }
  function renderTopCareers(){
    var top = CROWS.filter(function(r){ return r[13] <= 10; }).sort(function(a,b){ return a[13]-b[13]; });
    document.getElementById("topcareers").innerHTML = top.map(function(r){
      var sp = fullSpan(r[0]);
      return "<tr><td class='rk'>" + r[13] + "</td><td class='player'>" + plink(r) + "</td><td>" + (sp ? spanLabel(sp) : esc(r[4])) + "</td><td class='cv'>" + fmt(r[9]) + "</td><td><a class='tlink' href='" + phref(r[0], r[6]) + "'>" + seasonLabel(r[6]) + "</a></td><td class='num'>" + fmt(r[10]) + "</td></tr>";
    }).join("");
  }
  function renderTop10(){
    var top = ROWS.filter(function(r){ return r[13] !== null && r[13] <= 10; }).sort(function(a,b){ return a[13]-b[13]; });
    document.getElementById("top10").innerHTML = top.map(function(r){
      return "<tr><td class='rk'>" + r[13] + "</td><td class='player'>" + slink(r) + "</td><td>" + seasonLabel(r[2]) + "</td><td class='num'>" + esc(r[4]) + "</td><td class='cv'>" + fmt(r[9]) + "</td><td class='num'>" + fmt(r[10]) + "</td><td class='num'>" + fmt(r[11]) + "</td></tr>";
    }).join("");
  }

  // Generic single-series dot/line chart with a crosshair tooltip.
  function drawChart(host, pts, opts){
    host.innerHTML = "";
    var W = opts.width || 1040, H = opts.height || 320, m = {t:16, r:16, b:30, l:38};
    var xs = pts.map(function(p){ return p.x; }), x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    if (x0 === x1){ x0 -= 1; x1 += 1; }
    var ys = pts.map(function(p){ return p.y; });
    var yMin = Math.min(opts.yMin, Math.floor(Math.min.apply(null, ys) / 2) * 2), yMax = Math.max(opts.yMax, Math.ceil(Math.max.apply(null, ys) / 2) * 2);
    var X = function(v){ return m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r); };
    var Y = function(v){ return m.t + (yMax - v) / (yMax - yMin) * (H - m.t - m.b); };
    var s = svg("svg", {viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": opts.label}, host);
    var ax = svg("g", {"class": "axis"}, s);
    var step = (yMax - yMin) > 12 ? 4 : 2;
    for (var v = Math.ceil(yMin / step) * step; v <= yMax; v += step){
      svg("line", {x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), "class": v === 0 ? "baseline" : "gridline"}, ax);
      var t = svg("text", {x: m.l - 8, y: Y(v) + 4, "text-anchor": "end"}, ax); t.textContent = v;
    }
    var span = x1 - x0, xstep = span > 40 ? 10 : span > 16 ? 4 : span > 6 ? 2 : 1;
    for (var yx = Math.ceil(x0 / xstep) * xstep; yx <= x1; yx += xstep){
      var tx = svg("text", {x: X(yx), y: H - 8, "text-anchor": "middle"}, ax); tx.textContent = opts.xfmt ? opts.xfmt(yx) : yx;
    }
    if (opts.band){
      var bl = Math.max(opts.band.lo, yMin), bh = Math.min(opts.band.hi, yMax);
      if (bh > bl){
        svg("rect", {x: m.l, width: W - m.l - m.r, y: Y(bh), height: Y(bl) - Y(bh), "class": "band"}, s);
        var btx = svg("text", {x: m.l + 8, y: Y(bh) + 13, "class": "bandlabel"}, s); btx.textContent = opts.band.label;
      }
    }
    if (opts.ref !== undefined && opts.ref <= yMax){
      svg("line", {x1: m.l, x2: W - m.r, y1: Y(opts.ref), y2: Y(opts.ref), "class": "ref"}, s);
      var rl = svg("text", {x: W - m.r, y: Y(opts.ref) - 6, "text-anchor": "end", "class": "reflabel"}, s); rl.textContent = opts.refLabel;
    }
    if (opts.line){
      // break the line where seasons are missing
      var d = "", prev = null;
      pts.forEach(function(p){ d += (prev !== null && p.x - prev === 1 ? "L" : "M") + X(p.x).toFixed(1) + "," + Y(p.y).toFixed(1); prev = p.x; });
      svg("path", {d: d, "class": "line"}, s);
    }
    var dots = pts.map(function(p){ return svg("circle", {cx: X(p.x), cy: Y(p.y), r: opts.r || 4.5, "class": "dot" + (opts.hot && opts.hot(p) ? " hot" : "") + (opts.cls ? " " + opts.cls(p) : "")}, s); });
    // labels go where no dot or line is in the way, and sit on top
    function clearSpot(el, y, fromRight){
      var w = el.textContent.length * 6.6 + 8, lo = m.l + 6, hi = W - m.r - 6 - w, step = 12, xs = [];
      for (var xx = lo; xx <= hi; xx += step) xs.push(xx);
      if (fromRight) xs.reverse();
      var busy = function(xx){ return pts.some(function(p, i){ var px = X(p.x), py = Y(p.y), q = pts[i + 1];
        if (px > xx - 8 && px < xx + w + 8 && Math.abs(py - (y - 4)) < 13) return true;
        if (opts.line && q && q.x - p.x === 1){ var qx = X(q.x), qy = Y(q.y);
          for (var t = 0; t <= 1; t += 0.1){ var lx = px + (qx - px) * t, ly = py + (qy - py) * t; if (lx > xx - 2 && lx < xx + w + 2 && Math.abs(ly - (y - 4)) < 9) return true; } }
        return false; }); };
      var pick = xs.filter(function(xx){ return !busy(xx); })[0];
      el.setAttribute("x", pick === undefined ? xs[0] : pick); el.setAttribute("text-anchor", "start"); el.setAttribute("y", y); s.appendChild(el);
    }
    if (typeof btx !== "undefined" && btx) clearSpot(btx, Y(bl) - 7, false);
    if (typeof rl !== "undefined" && rl) clearSpot(rl, Y(opts.ref) - 6, true);
    var tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; host.appendChild(tip);
    var hit = svg("rect", {x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, "class": "hit"}, s);
    function nearest(clientX){
      var box = s.getBoundingClientRect(), vx = (clientX - box.left) / box.width * W, best = 0, bd = Infinity;
      pts.forEach(function(p, i){ var dd = Math.abs(X(p.x) - vx); if (dd < bd){ bd = dd; best = i; } });
      return best;
    }
    var last = -1;
    function show(i){
      if (last >= 0) dots[last].setAttribute("r", opts.r || 4.5);
      dots[i].setAttribute("r", (opts.r || 4.5) + 2.5); last = i;
      var box = s.getBoundingClientRect(), hb = host.getBoundingClientRect(), p = pts[i];
      tip.innerHTML = opts.tip(p); tip.hidden = false;
      var left = box.left - hb.left + X(p.x) / W * box.width, top = box.top - hb.top + Y(p.y) / H * box.height;
      left = Math.max(90, Math.min(hb.width - 90, left));
      tip.style.left = left + "px"; tip.style.top = top + "px";
    }
    function hide(){ tip.hidden = true; if (last >= 0) dots[last].setAttribute("r", opts.r || 4.5); last = -1; }
    hit.addEventListener("pointermove", function(e){ show(nearest(e.clientX)); });
    hit.addEventListener("pointerdown", function(e){ show(nearest(e.clientX)); });
    hit.addEventListener("pointerleave", hide);
    if (opts.onClick) hit.addEventListener("click", function(e){ opts.onClick(pts[nearest(e.clientX)]); });
  }

  function renderBest(){
    var best = {};
    ROWS.forEach(function(r){ if (r[3] === 0 && r[13] !== null && r[12] === 1) best[r[2]] = r; });
    var pts = Object.keys(best).map(Number).sort(function(a,b){ return a-b; }).map(function(y){ var r = best[y]; return {x: y, y: r[9], r: r}; });
    drawChart(document.getElementById("best-chart"), pts, {
      label: "Highest CV in each NBA season", yMin: 0, yMax: 16, line: true, r: 5, band: MVP_BAND,
      xfmt: function(y){ return seasonLabel(y); }, ref: 12, refLabel: "12: ALL-TIME TERRITORY",
      hot: function(p){ return p.y >= 12; },
      tip: function(p){ return "<b>" + esc(p.r[1]) + "</b> · " + seasonLabel(p.x) + "<br>CV " + p.y.toFixed(2) + " · " + esc(p.r[4]); },
      onClick: function(p){ CVR.go(phref(p.r[0], p.r[2])); }
    });
  }

  // ---- Career comparison: up to five players against the MVP range ----
  var CMP = [], cmpX = "season", cmpXUser = false, MAXCMP = 5, cmpBasis = "full";
  // Line up by age when the careers barely overlap, by season when they share an era
  function autoX(list){
    var sp = list.map(function(pid){ return fullSpan(pid); }).filter(Boolean);
    for (var i = 0; i < sp.length; i++) for (var j = i + 1; j < sp.length; j++)
      if (Math.min(sp[i][1], sp[j][1]) - Math.max(sp[i][0], sp[j][0]) + 1 < 4) return "age";
    return "season";
  }
  function CK(){ return cmpBasis === "base" ? 10 : cmpBasis === "po" ? 11 : 9; }
  function XV(r, j){ return cmpX === "season" ? r[2] : cmpX === "age" ? r[21] : j + 1; }
  function XL(v, long){ return cmpX === "season" ? seasonLabel(v) : cmpX === "age" ? "Age " + v : (long ? "Career year " : "Year ") + v; }
  function showPlayer(pid){
    if (!BYID[pid]) return;
    var i = CMP.indexOf(pid);
    if (i === -1){ CMP.push(pid); if (CMP.length > MAXCMP) CMP.shift(); }
    if (!cmpXUser) cmpX = autoX(CMP);
    renderCompare();
  }
  function slotOf(pid){ return "s" + (CMP.indexOf(pid) + 1); }
  function careerRows(pid, k){
    var rows = (BYID[pid] || []).slice().sort(function(a,b){ return a[2]-b[2] || a[3]-b[3]; });
    var seen = {}, out = [];
    rows.forEach(function(r){ if (r[k] === null || seen[r[2]]) return; seen[r[2]] = 1; out.push(r); });
    return out;
  }
  function renderCompare(){
    var panel = document.getElementById("player-panel");
    if (!ROWS.length) return;
    var full = cmpBasis === "full", po = false, k = CK();
    if (!CMP.length){
      panel.innerHTML = "<div class='cmp-tools'><div class='field'><label for='cmp-add'>Add a player</label><input type='search' id='cmp-add' list='cmp-names' placeholder='Type a name' autocomplete='off'></div><span class='status'>Type a name, use a quick pick, or click any player's name on the site. Up to five.</span></div>";
      var add0 = document.getElementById("cmp-add");
      add0.addEventListener("change", function(){ var pid = NAMEIDX[add0.value]; if (pid){ add0.value = ""; showPlayer(pid); } });
      syncCompare();
      return;
    }
    var series = CMP.map(function(pid){
      var rows = careerRows(pid, k);
      return {pid: pid, name: (BYID[pid] || PBYID[pid] || FBYID[pid])[0][1], cls: slotOf(pid), pts: rows.map(function(r, j){ return {x: XV(r, j), y: r[k], r: r}; }).filter(function(p){ return p.x !== null && p.x !== undefined; })};
    });
    var names = {}; ROWS.forEach(function(r){ names[r[1]] = (names[r[1]] || 0); });
    panel.innerHTML = "<div class='pp-head'><div><span class='eyebrow'>Compare careers · " + BASIS_LABEL[cmpBasis] + "</span><h3>" +
        (CMP.length === 1 ? esc(series[0].name) : CMP.length + " players") + "</h3></div><button type='button' class='pp-close' id='pp-close'>Close</button></div>" +
      "<div class='chips'>" + series.map(function(sr){ return "<span class='chip " + sr.cls + "'><i></i><a class='plink' href='" + phref(sr.pid) + "'>" + esc(sr.name) + "</a><button type='button' aria-label='Remove " + esc(sr.name) + "' data-rm='" + esc(sr.pid) + "'>×</button></span>"; }).join("") + "</div>" +
      "<div class='cmp-tools'><div class='field'><label for='cmp-add'>Add a player</label><input type='search' id='cmp-add' list='cmp-names' placeholder='Type a name' autocomplete='off'" + (CMP.length >= MAXCMP ? " disabled" : "") + "></div>" +
      "<div class='field'><span class='lbl' id='cmp-x-lbl'>Line up by</span><div class='seg' role='group' aria-labelledby='cmp-x-lbl'><button type='button' data-x='season' aria-pressed='" + (cmpX === "season") + "'>Season</button><button type='button' data-x='year' aria-pressed='" + (cmpX === "year") + "'>Career year</button><button type='button' data-x='age' aria-pressed='" + (cmpX === "age") + "'>Age</button></div></div>" +
      "<span class='status'>" + (CMP.length >= MAXCMP ? "Five players is the limit; remove one to add another." : "Click any player's name on the site, or type one here. Up to five.") + "</span></div>" +
      "<div class='chart' id='pp-chart'></div>" +
      "<p class='caption'>" + (po ? (state.basis === "run" ? "Playoff CV Run: the postseason résumé, including championship credit. Hollow dots rest partly on estimated early box scores." : "Playoff CV Rate: quality while active. Hollow dots played under 70% of the team's playoff games.") + " Playoff and regular-season scores are separate scales."
          : "Shaded band: the middle half of MVP seasons (8.2 to 11.5). Filled dots are qualified seasons; hollow dots played under 70% of team games. " + (full ? "Season CV combines the regular season and the postseason." : cmpBasis === "po" ? "PO is the postseason alone." : "RS is the regular season alone.")) + "</p>" +
      (po ? "<div class='tablewrap'><table class='cmp-table'><thead><tr><th>Player</th><th class='num'>Postseasons</th><th class='num'>Finals</th><th class='num'>Titles</th><th class='num'>Led the postseason</th><th class='num'>Average " + (state.basis === "run" ? "Run" : "Rate") + "</th><th>Best " + (state.basis === "run" ? "Run" : "Rate") + "</th></tr></thead><tbody>" +
        series.map(function(sr){
          var best = sr.pts.slice().sort(function(a,b){ return b.y-a.y; })[0], titles = sr.pts.filter(function(p){ return p.r[17]; }).length;
          var finals = sr.pts.filter(function(p){ return p.r[19]; }).length, led = sr.pts.filter(function(p){ return p.r[state.basis === "run" ? 12 : 14] === 1; }).length;
          var avg = sr.pts.length ? sr.pts.reduce(function(a,p){ return a + p.y; }, 0) / sr.pts.length : null;
          return "<tr><td class='player'><span class='key " + sr.cls + "'><i></i>" + esc(sr.name) + "</span></td><td class='num'>" + sr.pts.length + "</td><td class='num'>" + finals + "</td><td class='num'><b>" + titles + "</b></td><td class='num'><b>" + led + "</b></td><td class='num'>" + (avg === null ? "—" : avg.toFixed(2)) + "</td><td>" + (best ? best.y.toFixed(2) + " in " + seasonLabel(best.r[2]) : "—") + "</td></tr>";
        }).join("") + "</tbody></table></div><p class='caption'>Led the postseason: ranked #1 in that postseason on this score" + (state.basis === "rate" ? " among players in at least 70% of their team's games" : "") + ". Averages count every scored postseason; Run counts rounds a team never reached as zero.</p>" :
      "<div class='tablewrap'><table class='cmp-table'><thead><tr><th>Player</th><th class='num'>Career CV</th><th class='num'>Prime</th><th class='num'>Qualified seasons</th><th class='num'>In MVP range</th><th class='num'>Above it (11.5+)</th><th>Best qualified season</th></tr></thead><tbody>" +
      series.map(function(sr){
        var q = sr.pts.filter(function(p){ return p.r[7]; });
        var inR = q.filter(function(p){ return p.y >= MVP_BAND.lo && p.y <= MVP_BAND.hi; }).length, above = q.filter(function(p){ return p.y > MVP_BAND.hi; }).length;
        var best = q.slice().sort(function(a,b){ return b.y-a.y; })[0];
        var c = CBYID[sr.pid], dt = DETAIL && DETAIL[sr.pid];
        return "<tr><td class='player'><span class='key " + sr.cls + "'><i></i>" + esc(sr.name) + "</span></td><td class='num'><b>" + (c ? c[9].toFixed(1) : "—") + "</b>" + (c ? " <span class='soft'>#" + c[13] + "</span>" : "") + "</td><td class='num'>" + (dt ? dt[0].toFixed(1) : "—") + "</td><td class='num'>" + q.length + "</td><td class='num'><b>" + inR + "</b></td><td class='num'>" + above + "</td><td>" + (best ? best.y.toFixed(2) + " in " + seasonLabel(best.r[2]) : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>");
    if (!DETAIL) loadDetail().then(function(){ if (CMP.length) renderCompare(); });
    document.getElementById("pp-close").onclick = function(){ CMP = []; cmpXUser = false; renderCompare(); };
    panel.querySelectorAll("[data-rm]").forEach(function(b){ b.onclick = function(){ CMP.splice(CMP.indexOf(b.getAttribute("data-rm")), 1); renderCompare(); }; });
    panel.querySelectorAll("[data-x]").forEach(function(b){ b.onclick = function(){ cmpX = b.getAttribute("data-x"); cmpXUser = true; renderCompare(); }; });
    var add = document.getElementById("cmp-add");
    add.addEventListener("change", function(){ var pid = NAMEIDX[add.value]; if (pid){ add.value = ""; showPlayer(pid); } });
    drawMulti(document.getElementById("pp-chart"), series, full, po);
    syncCompare();
  }
  function syncCompare(){
    CVR.replace("compare", CMP.length ? [CMP.join(",")] : [], {score: cmpBasis === "full" ? "" : cmpBasis, by: cmpX === autoX(CMP) ? "" : cmpX});
  }
  function pressCmp(){ document.querySelectorAll("[data-cb]").forEach(function(x){ x.setAttribute("aria-pressed", String(x.getAttribute("data-cb") === cmpBasis)); }); }
  CVR.on("compare", function(args, params){
    if (!ROWS.length) return;
    if (args[0]) CMP = args[0].split(",").filter(function(pid){ return BYID[pid]; }).slice(0, MAXCMP);
    if (params.score && /^(full|base|po)$/.test(params.score)) cmpBasis = params.score; else if (args[0]) cmpBasis = "full";
    if (params.by && /^(season|year|age)$/.test(params.by)){ cmpX = params.by; cmpXUser = true; }
    else if (args[0]){ cmpX = autoX(CMP); cmpXUser = false; }
    pressCmp(); renderCompare();
  });
  function drawMulti(host, series, full, po){
    host.innerHTML = "";
    var all = []; series.forEach(function(sr){ all = all.concat(sr.pts); });
    if (!all.length){ host.innerHTML = "<p class='note'>No seasons with this score.</p>"; return; }
    var narrow = host.getBoundingClientRect().width < 600;
    var W = narrow ? 560 : 1000, H = narrow ? 420 : 300, m = {t:16, r: narrow ? 118 : 132, b:30, l:38};
    var xs = all.map(function(p){ return p.x; }), x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    if (x0 === x1){ x0 -= 1; x1 += 1; }
    var ys = all.map(function(p){ return p.y; });
    var yMin = Math.min(-2, Math.floor(Math.min.apply(null, ys) / 2) * 2), yMax = Math.max(po ? 4 : 13, Math.ceil(Math.max.apply(null, ys) / 2) * 2);
    var X = function(v){ return m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r); };
    var Y = function(v){ return m.t + (yMax - v) / (yMax - yMin) * (H - m.t - m.b); };
    var s = svg("svg", {viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Career CV for " + series.map(function(x){ return x.name; }).join(", ")}, host);
    var ax = svg("g", {"class": "axis"}, s), step = (yMax - yMin) > 12 ? 4 : 2;
    for (var v = Math.ceil(yMin / step) * step; v <= yMax; v += step){
      svg("line", {x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), "class": v === 0 ? "baseline" : "gridline"}, ax);
      var t = svg("text", {x: m.l - 8, y: Y(v) + 4, "text-anchor": "end"}, ax); t.textContent = v;
    }
    var span = x1 - x0, xstep = span > 40 ? (narrow ? 20 : 10) : span > 16 ? (narrow ? 8 : 4) : span > 6 ? (narrow ? 4 : 2) : 1;
    for (var yx = Math.ceil(x0 / xstep) * xstep; yx <= x1; yx += xstep){
      var tx = svg("text", {x: X(yx), y: H - 8, "text-anchor": "middle"}, ax); tx.textContent = XL(yx);
    }
    if (!po){
      var bl = Math.max(MVP_BAND.lo, yMin), bh = Math.min(MVP_BAND.hi, yMax);
      svg("rect", {x: m.l, width: W - m.l - m.r, y: Y(bh), height: Y(bl) - Y(bh), "class": "band"}, s);
      var btx = svg("text", {x: m.l + 8, y: Y(bh) + 13, "class": "bandlabel"}, s); btx.textContent = MVP_BAND.label;
    }
    var xh = svg("line", {y1: m.t, y2: H - m.b, "class": "xhair", visibility: "hidden"}, s);
    var labels = [];
    series.forEach(function(sr){
      var g = svg("g", {"class": sr.cls}, s), d = "", prev = null;
      sr.pts.forEach(function(p){ d += (prev !== null && p.x - prev === 1 ? "L" : "M") + X(p.x).toFixed(1) + "," + Y(p.y).toFixed(1); prev = p.x; });
      svg("path", {d: d, "class": "sline"}, g);
      sr.pts.forEach(function(p){ var hollow = state.basis === "run" ? p.r[8] !== "C" : !p.r[7]; svg("circle", {cx: X(p.x), cy: Y(p.y), r: 4, "class": "sdot" + (hollow ? " unq" : "")}, g); });
      var last = sr.pts[sr.pts.length - 1];
      if (last) labels.push({cls: sr.cls, name: sr.name, x: X(last.x), y: Y(last.y)});
    });
    // direct end labels in the right margin, nudged apart
    labels.sort(function(a,b){ return a.y - b.y; });
    for (var i = 1; i < labels.length; i++) if (labels[i].y - labels[i-1].y < 14) labels[i].y = labels[i-1].y + 14;
    labels.forEach(function(L){
      var g = svg("g", {"class": L.cls}, s);
      svg("line", {x1: L.x + 6, x2: W - m.r + 8, y1: L.y, y2: L.y, style: "stroke:var(--c);stroke-width:1;stroke-dasharray:1 3"}, g);
      var lt = svg("text", {x: W - m.r + 12, y: L.y + 4, "class": "slabel"}, g); lt.textContent = L.name.length > 17 ? L.name.slice(0, 16) + "…" : L.name;
    });
    var tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; host.appendChild(tip);
    var hit = svg("rect", {x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, "class": "hit"}, s);
    var xsU = Array.from(new Set(xs)).sort(function(a,b){ return a-b; });
    function show(clientX){
      var box = s.getBoundingClientRect(), vx = (clientX - box.left) / box.width * W, xv = xsU[0], bd = Infinity;
      xsU.forEach(function(x){ var dd = Math.abs(X(x) - vx); if (dd < bd){ bd = dd; xv = x; } });
      xh.setAttribute("x1", X(xv)); xh.setAttribute("x2", X(xv)); xh.setAttribute("visibility", "visible");
      var lines = series.map(function(sr){
        var p = sr.pts.filter(function(q){ return q.x === xv; })[0]; if (!p) return "";
        return "<span class='key " + sr.cls + "'><i></i>" + esc(sr.name) + " <b>" + p.y.toFixed(2) + "</b>" + (cmpX !== "season" ? " · " + seasonLabel(p.r[2]) : "") + (po ? (p.r[17] ? " · champion" : "") + (state.basis === "rate" && !p.r[7] ? " · under 70% of games" : "") : (p.r[7] ? "" : " · not qualified")) + "</span>";
      }).filter(Boolean);
      tip.innerHTML = "<b>" + XL(xv, true) + "</b>" + lines.join("");
      var hb = host.getBoundingClientRect(), left = box.left - hb.left + X(xv) / W * box.width;
      if (narrow){ tip.style.whiteSpace = "normal"; tip.style.maxWidth = (hb.width - 8) + "px"; }
      tip.hidden = false;
      var tw = tip.offsetWidth / 2 + 4;
      tip.style.left = Math.max(tw, Math.min(hb.width - tw, left)) + "px"; tip.style.top = (box.top - hb.top + m.t / H * box.height + 4) + "px";
      tip.style.transform = "translate(-50%, 0)";
    }
    hit.addEventListener("pointermove", function(e){ show(e.clientX); });
    hit.addEventListener("pointerdown", function(e){ show(e.clientX); });
    hit.addEventListener("pointerleave", function(){ tip.hidden = true; xh.setAttribute("visibility", "hidden"); });
  }

  // ---- Player pages: #player/<id> and #player/<id>/<season>
  var DETAIL = null, detailP = null, PL = {pid: null, season: null};
  function loadDetail(){
    if (!detailP) detailP = fetch(window.CVR_ROOT + "data/career_detail.json").then(function(r){ return r.json(); }).then(function(d){ DETAIL = d.rows; }).catch(function(){ DETAIL = {}; });
    return detailP;
  }
  var COMPS = null, compsP = null;
  function loadComps(){
    if (!compsP) compsP = fetch(window.CVR_ROOT + "data/comps.json").then(function(r){ return r.json(); }).then(function(d){ COMPS = d.rows; }).catch(function(){ COMPS = {}; });
    return compsP;
  }
  function compsHTML(pid){
    var list = COMPS && COMPS[pid]; if (!list || !list.length) return "";
    var top = list[0][1], word = top >= 85 ? "Close comps" : top >= 72 ? "Nearest comps" : "No close comps; the nearest";
    return "<div class='comps'><div class='head-row'><div><span class='eyebrow'>Similar careers</span><h3 style='font:400 24px/1.1 var(--display);margin-top:4px'>" + word + "</h3></div>" +
      "<a href='" + buildHash("compare", [[pid].concat(list.slice(0, 4).map(function(x){ return x[0]; })).join(",")]) + "'>Compare them →</a></div>" +
      "<div class='complist'>" + list.map(function(x){
        var c = CBYID[x[0]], sp = fullSpan(x[0]);
        return "<a class='comp' href='" + phref(x[0]) + "'><span class='sim'>" + x[1] + "</span><b>" + esc(BYID[x[0]][0][1]) + "</b><small>" + (sp ? spanLabel(sp) : "") + (c ? " · Career CV " + c[9].toFixed(1) : "") + "</small></a>";
      }).join("") + "</div><p class='caption'>Similarity out of 100, from Court Value alone: Career CV, regular-season and playoff peaks, the age he peaked and how his season-by-season curve rose and fell. Comps come from his listed position or the one next to it (PG–SG–SF–PF–C). It measures the shape of a career, not playing style. For active players it compares careers so far.</p></div>";
  }
  function ordinalRank(n){ return n === null || n === undefined ? null : "#" + n.toLocaleString(); }
  CVR.on("player", function(args){
    if (!ROWS.length) return;   // runs again once the scores arrive
    var host = document.getElementById("pl-body"), pid = args[0];
    if (!pid || !BYID[pid]){
      document.title = "Player not found · Court Value";
      host.innerHTML = "<span class='eyebrow'>Player</span><h2 style='margin-top:6px'>No player at that address</h2><p class='note'>Try the <a href='#rankings'>rankings</a> and search by name.</p>";
      return;
    }
    var season = args[1] ? parseInt(args[1], 10) : null;
    Promise.all([careersP, loadDetail(), loadComps()]).then(function(){ renderPlayer(pid, isNaN(season) ? null : season); });
  });
  function renderPlayer(pid, season){
    var host = document.getElementById("pl-body"), samePlayer = PL.pid === pid;
    PL.pid = pid; PL.season = season;
    var rows = BYID[pid].slice().sort(function(a,b){ return a[2]-b[2] || a[3]-b[3]; });
    var name = rows[0][1], c = CBYID[pid], det = DETAIL && DETAIL[pid], role = {};
    document.title = name + " · Court Value";
    if (det){ det[2].forEach(function(x){ role[x[0] + "|" + x[1]] = "p"; }); det[3].forEach(function(x){ role[x[0] + "|" + x[1]] = "a"; }); }
    function roleOf(r){ return !r[7] ? "u" : (role[r[2] + "|" + r[3]] || "o"); }
    var ROLE = {p: "Prime", a: "Adds", o: "—", u: "Not qualified"};
    var pos = {}, teams = [], lgs = {}, titles = 0, qn = 0;
    rows.forEach(function(r){
      if (r[16]) pos[r[16]] = (pos[r[16]] || 0) + 1; lgs[r[3]] = 1; if (r[17]) titles++; if (r[7]) qn++;
      String(r[4]).split(",").forEach(function(t){ if (t && teams.indexOf(t) === -1) teams.push(t); });
    });
    var mainPos = Object.keys(pos).sort(function(a,b){ return pos[b]-pos[a]; })[0] || "";
    var lgTxt = lgs[0] && lgs[1] ? "NBA and ABA" : lgs[1] ? "ABA" : "NBA";
    var sp = fullSpan(pid), q = rows.filter(function(r){ return r[7]; });
    var best = q.slice().sort(function(a,b){ return b[9]-a[9]; })[0];
    var cmpList = CMP.indexOf(pid) > -1 ? CMP.slice() : CMP.concat([pid]).slice(-MAXCMP);
    var h = "<div class='pl-top'><div><span class='eyebrow'>Player · " + esc(mainPos) + (mainPos ? " · " : "") + lgTxt + "</span><h2>" + esc(name) + "</h2>" +
      "<div class='pl-sub'><span>Seasons <b>" + spanLong(sp) + "</b></span><span>" + (teams.length > 1 ? "Teams" : "Team") + " <b>" + teams.map(esc).join(", ") + "</b></span>" + (titles ? "<span>Titles <b>" + titles + "</b></span>" : "") + "</div></div>" +
      "<div class='pl-find'><div class='field'><label for='pl-find'>Another player</label><input type='search' id='pl-find' list='cmp-names' placeholder='Type a name' autocomplete='off'></div>" +
      "<a class='btn secondary' href='" + buildHash("compare", [cmpList.join(",")]) + "'>Compare</a></div></div>";
    // headline numbers
    h += "<div class='pl-stats'>";
    if (c){
      h += "<div class='stat lead'><span class='lbl'>Career CV</span><span class='big'>" + c[9].toFixed(1) + "</span><small>" + ordinalRank(c[13]) + " of " + CROWS.length.toLocaleString() + " careers</small></div>";
      if (det){
        h += "<div class='stat'><span class='lbl'>Prime</span><span class='big'>" + det[0].toFixed(1) + "</span><small>His five best seasons</small></div>" +
          "<div class='stat'><span class='lbl'>Other seasons</span><span class='big'>+" + det[1].toFixed(1) + "</span><small>" + det[3].length + " more above All-Star level</small></div>";
      }
    } else {
      h += "<div class='stat lead'><span class='lbl'>Career CV</span><span class='big'>—</span><small>No qualified season, so no Career CV</small></div>";
    }
    h += "<div class='stat'><span class='lbl'>Best season</span><span class='big'>" + (best ? best[9].toFixed(1) : "—") + "</span><small>" + (best ? "<a class='tlink' href='" + phref(pid, best[2]) + "'>" + seasonLabel(best[2]) + "</a> · " + ordinalRank(best[13]) + " all time" : "No qualified season") + "</small></div></div>";
    if (c && det){
      h += "<p class='note pl-why'>Career CV is his <mark>five-season prime (" + det[0].toFixed(1) + ")</mark> plus a little from other seasons above All-Star level (+" + det[1].toFixed(1) + "). The prime is picked with the playoffs weighing more than in a single season, so it isn't always his five highest season CVs. " +
        qn + " of his " + rows.length + " seasons qualified (at least 70% of team games); the others aren't counted.</p>";
    } else if (!c){
      h += "<p class='note pl-why'>Career CV counts only qualified seasons, at least 70% of team games. None of his " + rows.length + " seasons reached that.</p>";
    }
    // the career on the ruler
    var qs = rows.filter(function(r){ return r[7] && r[9] !== null; }), rulerCard = "";
    if (qs.length){
      var bestR = qs.slice().sort(function(a, b){ return b[9] - a[9]; })[0];
      var dots = stackDots(qs.map(function(r){ return {v: r[9], r: r}; }), 0.55).map(function(d){
        return "<a class='rdot" + (roleOf(d.r) === "p" ? " prime" : "") + "' href='" + phref(pid, d.r[2]) + "' title='" + seasonLabel(d.r[2]) + ": " + d.r[9].toFixed(2) + "' aria-label='" + seasonLabel(d.r[2]) + ", CV " + d.r[9].toFixed(2) + "' style='left:" + RP(d.v) + ";top:" + (84 - d.lvl * 16) + "px'></a>";
      }).join("");
      var bx = RX(bestR[9]), note = "<span class='rnote' style='left:" + RP(bestR[9]) + ";top:22px;" + (bx > 0.6 ? "transform:translateX(-100%);padding-right:12px;text-align:right" : "padding-left:12px") + "'>" + seasonLabel(bestR[2]) + "<br><span style='color:var(--red)'>" + bestR[9].toFixed(2) + " · best</span></span>";
      rulerCard = "<div class='card ruler-card'><div class='rhead'><h3>His career on the ruler</h3><span>Every qualified season, on the scale used for every season since 1952</span></div>" +
        rulerHTML({h: 150, zt: 8, track: 106, zoneLabels: true, names: true, marks: dots + note}) +
        "<div class='rlegend'><span><i class='p'></i>Prime season</span><span><i></i>Other qualified season</span><span>Click a dot for that season.</span></div></div>";
    }
    // career chart
    h += "<div class='block' style='padding-top:30px'><div class='head-row'><div><span class='eyebrow'>Season by season</span><h2 style='font-size:clamp(24px,3vw,32px)'>Every season's CV</h2></div></div>" +
      "<div class='chart card' id='pl-chart' style='padding:18px 18px 10px'></div>" +
      "<div class='legend'><span><i class='p'></i>Prime season</span><span><i class='a'></i>Adds to Career CV</span><span><i class='o'></i>Qualified, adds nothing</span><span><i class='u'></i>Not qualified</span><span>Click a dot or a season for the details.</span></div>" + rulerCard + "</div>";
    // season detail
    var sr = season ? rows.filter(function(r){ return r[2] === season; }) : [];
    if (sr.length) h += seasonDetail(sr[0], roleOf(sr[0]), name);
    // table
    h += "<div class='block' style='padding-top:30px'><div class='tablewrap'><table aria-label='Seasons for " + esc(name) + "'><thead><tr><th>Season</th><th class='num hide-sm'>Age</th><th>Team</th><th class='num'>G</th><th class='num hide-sm'>PO G</th><th class='num'>CV</th><th class='num'>RS</th><th class='num'>PO</th><th class='num'>Rank</th><th class='num hide-sm'>All time</th><th>Career</th><th class='hide-sm'>Status</th></tr></thead><tbody>" +
      rows.map(function(r){
        var ro = roleOf(r), st = [];
        if (r[17]) st.push("<span class='pill champ'>Champion</span>");
        if (r[3]) st.push("<span class='pill aba'>ABA</span>");
        if (r[8] === "N") st.push("<span class='pill'>Missed playoffs</span>");
        if (r[8] === "B") st.push("<span class='pill base'>RS only</span>");
        if (r[18] === "P") st.push("<span class='pill'>Partial playoff box</span>");
        return "<tr" + (season === r[2] ? " class='sel-row'" : "") + "><td><a class='tlink' href='" + phref(pid, r[2]) + "'>" + seasonLabel(r[2]) + "</a></td><td class='num hide-sm'>" + (r[21] || "—") + "</td><td class='mono' style='font-size:13px'>" + esc(r[4]) + "</td><td class='num'>" + r[5] + "</td><td class='num hide-sm'>" + (r[6] || "—") + "</td><td class='cv'>" + fmt(r[9]) + "</td><td class='num'>" + fmt(r[10]) + "</td><td class='num'>" + fmt(r[11]) + "</td><td class='num'>" + (r[7] && r[12] !== null ? r[12] : "—") + "</td><td class='num hide-sm'>" + (r[7] && r[13] !== null ? r[13].toLocaleString() : "—") + "</td><td class='role " + ro + "'>" + ROLE[ro] + "</td><td class='hide-sm'>" + st.join(" ") + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      "<p class='note'>Rank is his place in that season, All time his place among every qualified season since 1952, both by season CV. Prime and Adds show the seasons that make up his Career CV.</p></div>";
    h += compsHTML(pid);
    host.innerHTML = h;
    var find = document.getElementById("pl-find");
    find.addEventListener("change", function(){ var p = NAMEIDX[find.value]; if (p) CVR.go(phref(p)); });
    var pts = careerRows(pid, 9).map(function(r){ return {x: r[2], y: r[9], r: r}; });
    var chHost = document.getElementById("pl-chart"), narrow = chHost.getBoundingClientRect().width < 600;
    drawChart(chHost, pts, {width: narrow ? 520 : 1040, height: narrow ? 360 : 320,
      label: "Season CV for " + name, yMin: 0, yMax: 14, line: true, r: 5.5, band: MVP_BAND,
      xfmt: function(y){ return seasonLabel(y); },
      cls: function(p){ var ro = roleOf(p.r); return (ro === "p" ? "prime" : ro === "o" ? "other" : ro === "u" ? "unq" : "") + (p.x === season ? " sel" : ""); },
      tip: function(p){ var ro = roleOf(p.r); return "<b>" + seasonLabel(p.x) + "</b> · " + esc(p.r[4]) + "<br>CV " + p.y.toFixed(2) + " · RS " + fmt(p.r[10]) + " · PO " + fmt(p.r[11]) + (ro === "p" ? "<br>Prime season" : ro === "a" ? "<br>Adds to Career CV" : ro === "u" ? "<br>Not qualified" : ""); },
      onClick: function(p){ CVR.go(phref(pid, p.x)); }
    });
    if (sr.length){
      fillTeams(sr[0], name);
      var card = document.getElementById("pl-season");
      if (samePlayer && card && card.scrollIntoView) card.scrollIntoView({behavior: "smooth", block: "nearest"});   // new arrivals start at the top
    }
  }
  function seasonDetail(r, ro, name){
    var champ = r[17] ? " <span class='pill champ'>Champion</span>" : "", aba = r[3] ? " <span class='pill aba'>ABA</span>" : "";
    var rankLine = function(rs, ra, what){
      if (!r[7]) return "Not ranked: under 70% of team games";
      return (rs !== null ? "<b>" + ordinalRank(rs) + "</b> " + what : "") + (ra !== null ? " · <b>" + ordinalRank(ra) + "</b> all time" : "");
    };
    var poLine = r[11] === null ? (r[8] === "N" ? "Missed the playoffs" : r[8] === "B" ? "No playoff box score" : "No postseason score")
      : (r[19] !== null ? "<b>" + ordinalRank(r[19]) + "</b> that postseason" : "") + (r[20] !== null ? " · <b>" + ordinalRank(r[20]) + "</b> all time" : "");
    var po;
    if (r[8] === "N") po = "His team missed the playoffs. The playoff part of the season score counts as league average, so a great season on a losing team still ranks.";
    else if (r[8] === "B") po = "No playoff box score survives for this postseason, so the season is scored on the regular season alone.";
    else if (r[11] === null) po = "He didn't play in the postseason.";
    else po = "He played <b>" + r[6] + "</b> playoff game" + (r[6] === 1 ? "" : "s") + "<span id='pl-tpo'></span>" + (r[17] ? " and won the title." : ".");
    if (r[18] === "P") po += " <b>Partial playoff box:</b> some of these playoff box scores are missing assists, so those games are estimated.";
    var career = {p: "One of his <b>five prime seasons</b>, which make up most of his Career CV.",
      a: "Outside his prime, but above All-Star level, so it <b>adds a little</b> to his Career CV.",
      o: "Outside his prime and not above All-Star level, so it <b>doesn't change</b> his Career CV.",
      u: "<b>Not qualified:</b> he played under 70% of his team's games, so this season isn't ranked on leaderboards or counted in Career CV."}[ro];
    return "<div class='card sdetail' id='pl-season'><div class='pp-head'><div><span class='eyebrow'>" + esc(name) + " · " + esc(r[4]) + (r[21] ? " · age " + r[21] : "") + "</span><h3>" + seasonLabel(r[2]) + champ + aba + "</h3></div>" +
      "<a class='pp-close' href='" + phref(r[0]) + "' style='text-decoration:none'>Close</a></div>" +
      seasonRuler(r) +
      "<div class='sgrid'><div class='sbox'><span class='lbl'>Season CV</span><div class='v'>" + fmt(r[9]) + "</div><div class='r'>" + rankLine(r[12], r[13], "that season") + "</div></div>" +
      "<div class='sbox'><span class='lbl'>Regular season (RS)</span><div class='v'>" + fmt(r[10]) + "</div><div class='r'>" + rankLine(r[14], r[15], "that season") + "</div></div>" +
      "<div class='sbox'><span class='lbl'>Postseason (PO)</span><div class='v'>" + fmt(r[11]) + "</div><div class='r'>" + poLine + "</div></div></div>" +
      "<ul class='facts'><li><b>Games:</b> " + r[5] + " in the regular season<span id='pl-tg'></span>. " + (r[7] ? "Qualified." : "") + "</li>" +
      "<li><b>Playoffs:</b> " + po + "</li><li><b>Career:</b> " + career + "</li>" +
      "<li id='pl-teams'><b>Team:</b> " + esc(r[4]) + "</li>" +
      "<li><a href='" + buildHash("rankings", [], {from: r[2], to: r[2], lg: r[3] ? "1" : ""}) + "'>The full " + seasonLabel(r[2]) + " " + (r[3] ? "ABA" : "NBA") + " leaderboard →</a></li></ul></div>";
  }
  function seasonRuler(r){
    if (r[9] === null) return "";
    var x = RX(r[9]), align = x > 0.85 ? "translateX(-85%)" : x < 0.15 ? "translateX(-15%)" : "translateX(-50%)";
    var m = "<div class='rptr' style='left:" + RP(r[9]) + ";top:0;transform:" + align + "'><b>CV " + r[9].toFixed(2) + "</b></div>" +
      "<div class='rtick' style='left:" + RP(r[9]) + ";top:30px;height:72px;width:3px;margin-left:-1.5px'></div>";
    function sub(v, lab, col, top){
      var sx = RX(v), t = sx > 0.9 ? "translateX(-80%)" : sx < 0.1 ? "translateX(-20%)" : "translateX(-50%)";
      return "<div class='rsub' style='left:" + RP(v) + ";top:" + top + "px;color:" + col + ";transform:" + t + "'><i></i>" + lab + " " + v.toFixed(2) + "</div>";
    }
    var close = r[10] !== null && r[11] !== null && Math.abs(RX(r[10]) - RX(r[11])) < 0.09;   // too close: drop the second label lower
    if (r[10] !== null) m += sub(r[10], "RS", "var(--blue)", 104);
    if (r[11] !== null) m += sub(r[11], "PO", "var(--red)", close ? 128 : 104);
    return "<div style='margin:16px 0 4px'>" + rulerHTML({h: close ? 194 : 172, zt: 44, track: 98, labTop: close ? 166 : 142, marks: m}) + "</div>";
  }
  function fillTeams(r, name){
    if (!window.CV.loadTeams) return;
    window.CV.loadTeams().then(function(TB){
      var el = document.getElementById("pl-teams"); if (!el || PL.pid !== r[0] || PL.season !== r[2]) return;
      var abbrs = String(r[4]).split(","), ts = abbrs.map(function(a){ return TB.byKey(r[2], r[3], a); }).filter(Boolean);
      if (!ts.length) return;
      el.innerHTML = "<b>" + (ts.length > 1 ? "Teams" : "Team") + ":</b> " + ts.map(function(t){
        var inB3 = (t[12] || []).some(function(p){ return p[0] === name; });
        return "<a class='tlink' href='" + buildHash("teams", [TB.urlKey(t)]) + "'>" + seasonLabel(t[0]) + " " + esc(t[3]) + "</a>" +
          (t[4] !== null ? ", " + t[4] + "–" + t[5] : "") + ", team rating " + (t[6] >= 0 ? "+" : "−") + Math.abs(t[6]).toFixed(1) + " (#" + t[9] + " all time)" +
          (inB3 ? "; part of its <a class='tlink' href='" + buildHash("big3", [TB.urlKey(t)]) + "'>Big 3</a> (#" + t[11] + " all time)" : "");
      }).join(". ") + ".";
      if (ts.length === 1 && ts[0][4] !== null){
        var tg = document.getElementById("pl-tg"); if (tg) tg.textContent = " of the team's " + (ts[0][4] + ts[0][5]) + " (" + Math.round(r[5] / (ts[0][4] + ts[0][5]) * 100) + "%)";
      }
      var tpo = document.getElementById("pl-tpo");
      if (tpo && ts.length){ var last = ts[ts.length - 1]; if (last[17] !== null) tpo.textContent = "; the " + last[3] + " went " + last[17] + "–" + last[18] + " in the playoffs"; }
    });
  }


  // ---- Home search: players, franchises and team-seasons ("1996 Bulls"); a player plus a year opens that season
  var PIDX = null, TIDX = null, FIDX = null;
  function norm(x){ return String(x).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function wordsMatch(qw, target){ var tw = target.split(" "); return qw.every(function(w){ return tw.some(function(t){ return t.indexOf(w) === 0 || (w.length >= 4 && t.indexOf(w) > 0); }); }); }
  function buildPIDX(){
    PIDX = Object.keys(BYID).map(function(pid){
      var c = CBYID[pid], sp = fullSpan(pid);
      return {pid: pid, name: BYID[pid][0][1], n: norm(BYID[pid][0][1]), rank: c ? c[13] : 1e6 - BYID[pid].length, cv: c ? c[9] : null, sp: sp};
    }).sort(function(a, b){ return a.rank - b.rank; });
  }
  function searchAll(raw){
    if (!PIDX) buildPIDX();
    var q = norm(raw); if (!q) return [];
    var words = q.split(" "), nums = words.filter(function(w){ return /^\d+$/.test(w); }), text = words.filter(function(w){ return !/^\d+$/.test(w); });
    var year = null;
    if (nums.length && text.length){
      var y = +nums[nums.length - 1];
      if (y < 100) y += (y >= 47 ? 1900 : 2000);
      if (y >= 1952 && y <= DEF.to) year = y;
    }
    if (!text.length) return [];
    var out = [];
    if (TIDX && year !== null){
      TIDX.filter(function(t){ return t.r[0] === year && wordsMatch(text, t.n); }).slice(0, 3).forEach(function(t){
        out.push({kind: "Team", label: seasonLabel(t.r[0]) + " " + t.r[3], meta: (t.r[4] !== null ? t.r[4] + "–" + t.r[5] + " · " : "") + "rating " + (t.r[6] >= 0 ? "+" : "−") + Math.abs(t.r[6]).toFixed(1), href: buildHash("teams", [t.url])});
      });
    }
    if (FIDX && year === null){
      FIDX.filter(function(f){ return f.keys.some(function(k){ return wordsMatch(text, k); }) || (text.length === 1 && f.code === text[0]); }).slice(0, 2).forEach(function(f){
        out.push({kind: "Franchise", label: f.name, meta: seasonLabel(f.first).slice(0, 4) + "–" + String(f.last).slice(-2) + " · " + f.titles + " title" + (f.titles === 1 ? "" : "s"), href: buildHash("franchises", [f.key])});
      });
    }
    PIDX.filter(function(p){ return wordsMatch(text, p.n); }).slice(0, 8 - out.length).forEach(function(p){
      var played = year !== null && BYID[p.pid].some(function(r){ return r[2] === year; });
      out.push({kind: played ? "Season" : "", label: p.name, meta: played ? seasonLabel(year) : spanLabel(p.sp) + (p.cv !== null ? " · Career CV " + p.cv.toFixed(1) : ""), href: phref(p.pid, played ? year : null)});
    });
    return out.slice(0, 8);
  }
  (function(){
    var inp = document.getElementById("q"), list = document.getElementById("q-list"), items = [], active = -1;
    function teamsIn(){
      if (TIDX || !window.CV.loadTeams) return;
      window.CV.loadTeams().then(function(TB){
        TIDX = TB.rows.map(function(t){ return {r: t, n: norm(t[3] + " " + t[2]), url: TB.urlKey(t)}; });
        FIDX = Object.keys(TB.franchises).map(function(k){ var F = TB.franchises[k];
          return {key: k, code: k.toLowerCase(), name: F.name, first: F.first, last: F.last, titles: F.titles, keys: [norm(F.name)].concat((F.names || []).map(function(n){ return norm(n[0]); }))}; });
        if (inp.value) show();
      }).catch(function(){});
    }
    function close(){ list.hidden = true; inp.setAttribute("aria-expanded", "false"); inp.removeAttribute("aria-activedescendant"); active = -1; }
    function mark(i){
      active = i;
      [].forEach.call(list.children, function(li, j){ li.setAttribute("aria-selected", String(j === i)); });
      if (i >= 0){ inp.setAttribute("aria-activedescendant", "q-o-" + i); var el = list.children[i]; if (el && el.scrollIntoView) el.scrollIntoView({block: "nearest"}); }
    }
    function show(){
      if (!ROWS.length){ list.innerHTML = "<li class='empty'>Loading scores…</li>"; list.hidden = false; return; }
      items = searchAll(inp.value);
      if (!inp.value.trim()){ close(); return; }
      list.innerHTML = items.length ? items.map(function(it, i){
        return "<li role='option' id='q-o-" + i + "' aria-selected='false'><a href='" + it.href + "' tabindex='-1'><b>" + (it.kind ? "<span class='kind'>" + it.kind + "</span>" : "") + esc(it.label) + "</b><span>" + esc(it.meta) + "</span></a></li>";
      }).join("") : "<li class='empty'>No player or team matches “" + esc(inp.value.trim()) + "”.</li>";
      list.hidden = false; inp.setAttribute("aria-expanded", "true"); mark(items.length ? 0 : -1);
    }
    inp.addEventListener("focus", teamsIn);
    inp.addEventListener("input", show);
    inp.addEventListener("keydown", function(e){
      if (e.key === "ArrowDown" && items.length){ e.preventDefault(); if (list.hidden) show(); mark((active + 1) % items.length); }
      else if (e.key === "ArrowUp" && items.length){ e.preventDefault(); mark((active - 1 + items.length) % items.length); }
      else if (e.key === "Enter"){ e.preventDefault(); var it = items[active >= 0 ? active : 0]; if (it){ close(); inp.value = ""; CVR.go(it.href); } }
      else if (e.key === "Escape"){ close(); }
    });
    list.addEventListener("mousedown", function(e){ e.preventDefault(); });   // keep focus so the click lands
    list.addEventListener("click", function(e){ if (e.target.closest("a")){ close(); inp.value = ""; } });
    inp.addEventListener("blur", function(){ setTimeout(close, 120); });
  })();

  var head = document.getElementById("rank-head"), body = document.getElementById("rank-body");
  function filtered(){
    var t = state.text.toLowerCase(), k0 = SK(), noQ = state.basis === "run", cr = isCR();
    var out = SRC().filter(function(r){
      if (r[k0] === null) return false;
      if (!cr && state.champ && !r[17]) return false;
      if (state.q && !noQ && !r[7]) return false;
      if (isCR() ? (r[19] > state.to || r[2] < state.from) : (r[2] < state.from || r[2] > state.to)) return false;
      if (state.pos !== "all" && r[16] !== state.pos) return false;
      if (!isCR() && state.team !== "all" && String(r[4]).split(/[^A-Z0-9]+/).indexOf(state.team) === -1) return false;
      if (state.league !== "all" && r[3] !== +state.league && !(isCR() && r[3] === 2)) return false;
      if (t && r[1].toLowerCase().indexOf(t) === -1) return false;
      return true;
    });
    if (!cr && state.best){   // one row per player: his best season on the chosen score, within the filters
      var bestBy = {};
      out.forEach(function(r){ var b = bestBy[r[0]]; if (!b || r[k0] > b[k0]) bestBy[r[0]] = r; });
      out = Object.keys(bestBy).map(function(pid){ return bestBy[pid]; });
    }
    var k = k0, sk = state.sort === null ? k : state.sort, dir = state.sort === null ? -1 : state.dir;
    out.sort(function(a,b){
      var x = a[sk], y = b[sk], c;
      if (x === null && y === null) c = 0; else if (x === null) return 1; else if (y === null) return -1;
      else c = typeof x === "string" ? x.localeCompare(y) : x - y;
      return dir * c || b[k]-a[k] || a[2]-b[2] || a[0].localeCompare(b[0]);
    });
    return out;
  }
  function render(){
    var full = state.basis === "full", po = isPO(), run = state.basis === "run";
    var notes = {full: "<mark>Season CV</mark> is the résumé: the regular season (RS) and the postseason (PO) on one scale. A team that missed the playoffs counts as league average for the playoff part. For how he played before the playoffs, switch to Regular season.",
      base: "<mark>Regular season (RS):</mark> how he played before the playoffs. It's the part most metrics and awards judge, and the closest match to them (<a href='#methodology/lines-up'>how CV lines up</a>).",
      po: "<mark>Playoffs (PO):</mark> the postseason by itself, every NBA postseason since 1951–52 and ABA since 1967–68. “Qualified only” keeps players who were qualified in the regular season.",
      career: "<mark>Career CV:</mark> a player's five best seasons, playoffs weighted more heavily, plus a little for every other All-Star-level season. The years filter keeps careers that overlap the chosen range.",
      season: "<mark>Full-season CV</mark> is the regular season plus the playoffs: every playoff game counts as one more game on the same ruler, and a champion adds his title credit scaled by the playoffs' share of his games. Same scale as regular-season CV.",
      run: "<mark>Playoff CV Run</mark> is the postseason résumé: each round counts once, plus capped, responsibility-weighted championship credit. Measured on the regular season's ruler; NBA postseasons from 1951–52.",
      rate: "<mark>Playoff CV Rate</mark> is quality while active. “Qualified only” keeps players who appeared in at least 70% of their team's playoff games."};
    document.getElementById("basis-note").innerHTML = notes[state.basis] + (isCR() ? "" : " <b>Lift</b> is PO minus RS: how much better he was in the postseason than in the regular season. Sort by it for the biggest playoff risers, or flip it for the biggest drops.");
    document.getElementById("f-champ").disabled = isCR(); document.getElementById("f-best").disabled = isCR();
    var fs = isFS();
    var cr = isCR();
    var cols = cr
      ? [["Rank", null, "num"], ["Player", 1, ""], ["Career", 19, ""], ["Lg", 3, ""], ["Pos", 16, ""], ["Qualified seasons", 5, "num"], ["Career CV", 9, "num"],
         ["Best season", 6, ""], ["Best CV", 10, "num"], ["Titles", 17, "num"]]
      : fs
      ? [["Rank", null, "num"], ["Player", 1, ""], ["Season", 2, ""], ["Lg", 3, ""], ["Pos", 16, ""], ["Team", 4, ""], ["RS G", 5, "num"], ["PO G", 6, "num"],
         ["Full season", 9, "num"], ["Reg. season", 10, "num"], ["PO Rate", 14, "num"], ["Title", 11, "num"], ["Status", null, ""]]
      : po
      ? [["Rank", null, "num"], ["Player", 1, ""], ["Season", 2, ""], ["Pos", 16, ""], ["Team", 4, ""], ["G", 5, "num"], ["Team G", 6, "num"], ["Rounds", 18, "num"],
         [run ? "Run" : "Rate", run ? 9 : 10, "num"], [run ? "Title credit" : "Run", run ? 11 : 9, "num"], ["Status", null, ""]]
      : [["Rank", null, "num"], ["Player", 1, ""], ["Season", 2, ""], ["Lg", 3, ""], ["Pos", 16, ""], ["Team", 4, ""], ["G", 5, "num"], ["PO G", 6, "num"],
         [full ? "CV" : state.basis === "po" ? "PO" : "RS", SK(), "num"]].concat(full ? [["RS", 10, "num"], ["PO", 11, "num"]] : state.basis === "po" ? [["Season CV", 9, "num"]] : [["Season CV", 9, "num"]]).concat([["Lift", 22, "num"]]).concat([["Status", null, ""]]);
    var scoreKey = SK();
    head.innerHTML = cols.map(function(c){
      if (c[1] === null) return "<th class='" + c[2] + "'>" + c[0] + "</th>";
      var active = state.sort === null ? c[1] === scoreKey : state.sort === c[1];
      var dir = state.sort === null ? -1 : state.dir;
      return "<th class='sort " + c[2] + "'" + (active ? " aria-sort='" + (dir > 0 ? "ascending" : "descending") + "'" : "") + "><button type='button' data-sort='" + c[1] + "'>" + c[0] + "</button></th>";
    }).join("");
    var rows = filtered(), shown = rows.slice(0, state.shown);
    var single = state.from === state.to;
    var ri = cr ? 13 : state.basis === "po" ? (single ? 19 : 20) : state.basis === "base" ? (single ? 14 : 15) : (single ? 12 : 13);
    document.getElementById("count").textContent = rows.length.toLocaleString() + (cr ? " careers" : state.best ? " players" : po ? " postseasons" : " seasons") + (rows.length > shown.length ? " · showing " + shown.length : "");
    body.innerHTML = shown.length ? shown.map(function(r, idx){
      if (cr){
        var lgp = r[3] === 2 ? "<span class='pill aba'>NBA/ABA</span>" : "<span class='pill" + (r[3] ? " aba" : "") + "'>" + (r[3] ? "ABA" : "NBA") + "</span>";
        var sp = fullSpan(r[0]);
        return "<tr><td class='rk'>" + r[13] + "</td><td class='player'>" + plink(r) + "</td><td>" + (sp ? spanLabel(sp) : esc(r[4])) + "</td><td>" + lgp + "</td><td class='mono' style='font-size:13px'>" + (r[16] || "—") + "</td><td class='num'>" + r[5] + "</td><td class='cv'>" + fmt(r[9]) + "</td><td>" + (r[6] ? "<a class='tlink' href='" + phref(r[0], r[6]) + "'>" + seasonLabel(r[6]) + "</a>" : "—") + "</td><td class='num'>" + fmt(r[10]) + "</td><td class='num'>" + (r[17] || "—") + "</td></tr>";
      }
      var rank = r[ri] !== null && (state.basis === "po" || r[7]) ? r[ri] : "—";
      if (fs){
        var fst = (r[7] ? "" : "<span class='pill'>Not qualified</span> ") + (r[17] ? "<span class='pill champ'>Champion</span> " : "") + (r[8] === "U" ? "<span class='pill'>Playoffs unscored</span>" : "");
        return "<tr><td class='rk'>" + rank + "</td><td class='player'>" + plink(r) + "</td><td>" + seasonLabel(r[2]) + "</td><td><span class='pill" + (r[3] ? " aba" : "") + "'>" + (r[3] ? "ABA" : "NBA") + "</span></td><td class='mono' style='font-size:13px'>" + (r[16] || "—") + "</td><td class='mono' style='font-size:13px'>" + esc(r[4]) + "</td><td class='num'>" + r[5] + "</td><td class='num'>" + (r[6] || "—") + "</td><td class='cv'>" + fmt(r[9]) + "</td><td class='num'>" + fmt(r[10]) + "</td><td class='num'>" + fmt(r[14]) + "</td><td class='num'>" + (r[11] ? fmt(r[11]) : "—") + "</td><td>" + fst + "</td></tr>";
      }
      if (po){
        var st = (r[17] ? "<span class='pill champ'>Champion</span> " : "") + (r[8] === "P" ? "<span class='pill'>Partial box</span> " : "") + (!run && !r[7] ? "<span class='pill'>Under 70%</span>" : "");
        return "<tr><td class='rk'>" + rank + "</td><td class='player'>" + plink(r) + "</td><td>" + seasonLabel(r[2]) + "</td><td class='mono' style='font-size:13px'>" + (r[16] || "—") + "</td><td class='mono' style='font-size:13px'>" + esc(r[4]) + "</td><td class='num'>" + r[5] + "</td><td class='num'>" + r[6] + "</td><td class='num'>" + r[18] + "</td><td class='cv'>" + fmt(run ? r[9] : r[10]) + "</td><td class='num'>" + fmt(run ? r[11] : r[9]) + "</td><td>" + st + "</td></tr>";
      }
      var status = r[7] ? "" : "<span class='pill'>Not qualified</span>";
      var add = function(s){ status += (status ? " " : "") + s; };
      if (r[17]) add("<span class='pill champ'>Champion</span>");
      if (r[8] === "N") add("<span class='pill'>Missed playoffs</span>");
      if (r[8] === "B") add("<span class='pill base'>RS only · no playoff box score</span>");
      if (r[18] === "P") add("<span class='pill'>Partial box</span>");
      return "<tr><td class='rk'>" + rank + "</td><td class='player'>" + slink(r) + "</td><td>" + seasonLabel(r[2]) + "</td><td><span class='pill" + (r[3] ? " aba" : "") + "'>" + (r[3] ? "ABA" : "NBA") + "</span></td><td class='mono' style='font-size:13px'>" + (r[16] || "—") + "</td><td class='mono' style='font-size:13px'>" + esc(r[4]) + "</td><td class='num'>" + r[5] + "</td><td class='num'>" + (r[6] || "—") + "</td><td class='cv'>" + fmt(r[SK()]) + "</td>" + (full ? "<td class='num'>" + fmt(r[10]) + "</td><td class='num'>" + fmt(r[11]) + "</td>" : state.basis === "po" ? "<td class='num'>" + fmt(r[9]) + "</td>" : "<td class='num'>" + fmt(r[9]) + "</td>") + (r[22] === null || r[22] === undefined ? "<td class='num'>—</td>" : "<td class='lift " + (r[22] >= 0 ? "up" : "down") + "'>" + (r[22] >= 0 ? "+" : "−") + Math.abs(r[22]).toFixed(2) + "</td>") + "<td>" + status + "</td></tr>";
    }).join("") : "<tr><td colspan='12' class='status'>No seasons match these filters.</td></tr>";
    document.getElementById("more").hidden = rows.length <= shown.length;
    document.getElementById("f-league").disabled = po; document.getElementById("f-team").disabled = cr;
    if (fs && !FROWS.length) body.innerHTML = "<tr><td colspan='13' class='status'>Loading full-season scores…</td></tr>";
    phoneCols(cols, cr ? [0, 1, 6] : [0, 1, 2, 8]);
    syncRank();
  }
  // ---- phones: keep rank, player, season and score; the rest opens under the row
  var RANKCOLS = [];
  function phoneCols(cols, core){
    RANKCOLS = cols;
    [].forEach.call(head.children, function(th, i){ if (core.indexOf(i) === -1) th.classList.add("x"); if (cols[i] && cols[i][1] === 1) th.classList.add("pcol"); });
    head.insertAdjacentHTML("beforeend", "<th class='exp'><span style='position:absolute;left:-9999px'>Details</span></th>");
    [].forEach.call(body.rows, function(tr){
      if (tr.cells.length < cols.length) return;
      [].forEach.call(tr.cells, function(td, i){ if (core.indexOf(i) === -1) td.classList.add("x"); });
      tr.insertAdjacentHTML("beforeend", "<td class='exp'><button type='button' class='expb' aria-expanded='false' aria-label='Show details'>+</button></td>");
    });
  }
  function toggleRow(tr){
    var b = tr.querySelector(".expb"), nx = tr.nextElementSibling;
    if (nx && nx.classList.contains("xrow")){ nx.remove(); b.setAttribute("aria-expanded", "false"); b.textContent = "+"; return; }
    var dl = "";
    [].forEach.call(tr.cells, function(td, i){
      if (!td.classList.contains("x") || !RANKCOLS[i]) return;
      var v = td.innerHTML.trim(); if (!v) return;
      dl += "<dt>" + RANKCOLS[i][0] + "</dt><dd>" + v + "</dd>";
    });
    var a = tr.querySelector("a.plink"), link = a ? "<dt></dt><dd><a href='" + a.getAttribute("href") + "'>" + (isCR() ? "Open his page →" : "Open this season →") + "</a></dd>" : "";
    tr.insertAdjacentHTML("afterend", "<tr class='xrow'><td colspan='" + tr.cells.length + "'><dl class='xdl'>" + dl + link + "</dl></td></tr>");
    b.setAttribute("aria-expanded", "true"); b.textContent = "−";
  }
  body.addEventListener("click", function(e){
    if (e.target.closest("a")) return;
    var tr = e.target.closest("tr"); if (!tr || !tr.querySelector(".expb")) return;
    if (e.target.closest(".expb") || (window.matchMedia && matchMedia("(max-width:640px)").matches)) toggleRow(tr);
  });
  // ---- rankings <-> address
  document.getElementById("f-champ").onchange = function(){ set("champ", this.checked); };
  document.getElementById("f-best").onchange = function(){ set("best", this.checked); };
  document.getElementById("ftoggle").onclick = function(){
    var c = document.getElementById("rank-controls"), open = !c.classList.contains("open");
    c.classList.toggle("open", open); this.setAttribute("aria-expanded", String(open));
  };
  var RKIND = "players";
  function syncRank(){
    if (RKIND !== "players") return;
    var nf = (state.from !== DEF.from || state.to !== DEF.to ? 1 : 0) + (state.league !== "all") + (state.pos !== "all") + (state.team !== "all") + (!state.q) + (state.text ? 1 : 0) + (!isCR() && state.champ) + (!isCR() && state.best);
    document.getElementById("ftoggle").textContent = "Filters" + (nf ? " · " + nf : "");
    CVR.replace("rankings", [], {
      score: state.basis === "full" ? "" : state.basis, champ: !isCR() && state.champ ? "1" : "", best: !isCR() && state.best ? "1" : "",
      from: state.from !== DEF.from ? state.from : "", to: state.to !== DEF.to ? state.to : "",
      lg: state.league !== "all" ? state.league : "", pos: state.pos !== "all" ? state.pos : "",
      team: state.team !== "all" ? state.team : "", all: state.q ? "" : "1", name: state.text,
      sort: state.sort === null ? "" : state.sort, dir: state.sort === null ? "" : (state.dir > 0 ? "asc" : "desc")
    });
  }
  CVR.on("rankings", function(args, P){
    RKIND = args[0] === "teams" ? "teams" : "players";
    document.getElementById("rank-players").hidden = RKIND !== "players";
    document.getElementById("rank-teams").hidden = RKIND !== "teams";
    if (RKIND === "teams"){ if (window.CV.teamRank) window.CV.teamRank(P); return; }
    if (ROWS.length && !Object.keys(P).length) syncRank();
    if (!ROWS.length || !Object.keys(P).length) return;
    var yr = function(v, d){ v = parseInt(v, 10); return isNaN(v) ? d : Math.max(DEF.from, Math.min(DEF.to, v)); };
    state.basis = /^(full|base|po|career)$/.test(P.score || "") ? P.score : "full";
    state.champ = P.champ === "1" || P.view === "champ"; state.best = P.best === "1" || P.view === "best";   // view= is the old address form
    state.from = yr(P.from, DEF.from); state.to = yr(P.to, DEF.to); if (state.from > state.to) state.to = state.from;
    state.league = P.lg === "0" || P.lg === "1" ? P.lg : "all";
    state.pos = /^(PG|SG|SF|PF|C)$/.test(P.pos || "") ? P.pos : "all";
    var fTeam = document.getElementById("f-team");
    state.team = P.team && fTeam.querySelector("option[value='" + P.team.replace(/[^A-Z0-9]/g, "") + "']") ? P.team : "all";
    state.q = P.all !== "1"; state.text = P.name || "";
    state.sort = P.sort !== undefined && P.sort !== "" && !isNaN(+P.sort) ? +P.sort : null; state.dir = P.dir === "asc" ? 1 : -1;
    if (P.view === "lift" && state.sort === null){ state.sort = 22; state.dir = -1; }
    state.shown = 50;
    document.querySelectorAll("[data-basis]").forEach(function(x){ x.setAttribute("aria-pressed", String(x.getAttribute("data-basis") === state.basis)); });
    document.getElementById("f-from").value = state.from; document.getElementById("f-to").value = state.to;
    document.getElementById("f-league").value = state.league; document.getElementById("f-pos").value = state.pos;
    fTeam.value = state.team; document.getElementById("f-qual").checked = state.q; document.getElementById("f-champ").checked = state.champ; document.getElementById("f-best").checked = state.best; document.getElementById("f-search").value = state.text;
    render();
  });
  function set(k, v){ state[k] = v; state.shown = 50; if (k === "basis") state.sort = null; render(); }
  document.querySelectorAll("[data-basis]").forEach(function(b){ b.onclick = function(){
    document.querySelectorAll("[data-basis]").forEach(function(x){ x.setAttribute("aria-pressed", String(x === b)); });
    set("basis", b.getAttribute("data-basis")); refreshPanel(); }; });
  function refreshPanel(){}
  document.querySelectorAll("[data-cb]").forEach(function(b){ b.addEventListener("click", function(){
    cmpBasis = b.getAttribute("data-cb");
    document.querySelectorAll("[data-cb]").forEach(function(x){ x.setAttribute("aria-pressed", String(x === b)); });
    renderCompare(); }); });
  document.getElementById("cmp-quick").addEventListener("click", function(e){
    var b = e.target.closest("[data-q]"); if (!b || !ROWS.length) return;
    CMP = b.getAttribute("data-q").split(",").filter(function(pid){ return BYID[pid]; }); cmpXUser = false; cmpX = autoX(CMP); renderCompare(); });
  document.getElementById("f-from").onchange = function(){ var v = +this.value; if (v > state.to){ state.to = v; document.getElementById("f-to").value = v; } set("from", v); };
  document.getElementById("f-to").onchange = function(){ var v = +this.value; if (v < state.from){ state.from = v; document.getElementById("f-from").value = v; } set("to", v); };
  document.getElementById("f-pos").onchange = function(){ set("pos", this.value); };
  document.getElementById("f-team").onchange = function(){ set("team", this.value); };
  head.addEventListener("click", function(e){
    var b = e.target.closest("button[data-sort]"); if (!b) return;
    var key = +b.getAttribute("data-sort"), cur = state.sort === null ? SK() : state.sort;
    var textCol = key === 1 || key === 4 || key === 16;
    if (key === cur) state.dir = (state.sort === null ? -1 : state.dir) * -1; else state.dir = textCol || key === 2 ? 1 : -1;
    state.sort = key; state.shown = 50; render();
  });
  document.getElementById("f-league").onchange = function(){ set("league", this.value); };
  document.getElementById("f-qual").onchange = function(){ set("q", this.checked); };
  var tmr; document.getElementById("f-search").oninput = function(){ var v = this.value; clearTimeout(tmr); tmr = setTimeout(function(){ set("text", v.trim()); }, 150); };
  document.getElementById("more").onclick = function(){ state.shown += 50; render(); };
  route();
})();

(function(){
  // Team rows: 0 season, 1 lg, 2 team, 3 name, 4 W, 5 L, 6 rating, 7 mov, 8 champion, 9 rank, 10 big3, 11 big3_rank, 12 big3 players [[name,pos,cv]], 13 roster [[name,pos,g,min%,rs,cv]]
  var T = null, BYK = {}, BYSEASON = {}, EXH = [], META = null, DEC = null, FR = null, loading = false;
  var SEL = { tm: ["1996|0|CHI", "1986|0|BOS"], b3: ["2017|0|GSW", "1992|0|CHI"] };
  var LIST = { tm: 25, b3: 25 }, LG = { tm: "all", b3: "all" };
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  /* exh:patched */
  function sl(y){ return y === 0 ? "Exhibition" : (y - 1) + "–" + String(y).slice(-2); }
  function key(r){ return r[0] + "|" + r[1] + "|" + r[2]; }
  function sgn(x){ return (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(1); }
  function f2(x){ return x === null || x === undefined ? "—" : x.toFixed(2); }
  function wl(r){ return r[4] === null ? "—" : r[4] + "–" + r[5]; }
  function tag(r){ return r[1] === 9 ? r[3] : r[2] + " ’" + String(r[0]).slice(-2); }
  function full(r){ return r[1] === 9 ? r[3] : sl(r[0]) + " " + r[3]; }
  function lgPill(r){ return r[1] === 1 ? " <span class='pill aba'>ABA</span>" : r[1] === 9 ? " <span class='pill base'>Exhibition</span>" : ""; }
  function result(r){ return r[8] ? "<span class='pill champ'>Champion</span>" : ""; }
  // normal CDF (Abramowitz-Stegun 7.1.26)
  function phi(x){ var t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2); return x >= 0 ? (1 + y) / 2 : (1 - y) / 2; }
  function gauss(){ var u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  var loadP = null;
  function load(){
    if (loadP) return loadP;
    loadP = Promise.all([fetch(window.CVR_ROOT + "data/teams.json").then(function(r){ return r.json(); }), fetch(window.CVR_ROOT + "data/decades.json").then(function(r){ return r.json(); }), fetch(window.CVR_ROOT + "data/franchises.json").then(function(r){ return r.json(); }), window.CV.ready, fetch(window.CVR_ROOT + "data/exhibition.json").then(function(r){ return r.ok ? r.json() : {rows: []}; }).catch(function(){ return {rows: []}; })]).then(function(d){
      FR = d[2].franchises;
      META = d[0].meta; T = d[0].rows; DEC = d[1].decades;
      T.forEach(function(r){ BYK[key(r)] = r; (BYSEASON[r[0]] = BYSEASON[r[0]] || []).push(r); });
      Object.keys(BYSEASON).forEach(function(s){ BYSEASON[s].sort(function(a, b){ return a[1] - b[1] || a[3].localeCompare(b[3]); }); });
      EXH = d[4].rows || []; if (EXH.length){ BYSEASON[0] = EXH.slice(); EXH.forEach(function(r){ BYK[key(r)] = r; }); }   // exhibition: pickers only, never in T
      ["tm", "b3"].forEach(function(m){ picker(m, 0); picker(m, 1); });
      renderTM(); renderB3(); listTM(); listB3(); listEXH(); renderDecades(); renderFranchises();
    }).catch(function(){ ["tm-list", "b3-list"].forEach(function(id){ $(id).innerHTML = "<tr><td class='status'>The team file could not be loaded.</td></tr>"; }); $("dec-grid").innerHTML = "<div class='status'>The decade file could not be loaded.</div>"; });
    return loadP;
  }
  // ---- Team rankings: #rankings/teams
  var TR = {score: "rating", from: null, to: null, lg: "all", fr: "all", champ: false, best: false, sort: null, dir: -1, shown: 50}, TRDEF = null;
  var TRK = {rating: 6, rs: 15, po: 16, roster: 14, big3: 10};
  var TRNOTE = {
    rating: "<mark>Team rating</mark> blends the regular season (65%) and the playoffs (35%), as in the season score.",
    rs: "<mark>Regular season:</mark> the team's schedule-adjusted margin blended with what its players' Court Value projects.",
    po: "<mark>Playoffs:</mark> how the team played against the teams it actually faced, read cautiously for short runs. Teams that missed the playoffs are left out.",
    roster: "<mark>Roster:</mark> what the players' Court Value alone projects, weighted by minutes.",
    big3: "<mark>Big 3:</mark> the team's three best qualified seasons by Court Value, added up. Players count where they played at least 30% of the team's games."};
  function trInit(){
    if (TRDEF) return;
    var ys = Object.keys(BYSEASON).map(Number).filter(function(y){ return y > 0; }).sort(function(a, b){ return a - b; });
    TRDEF = {from: ys[0], to: ys[ys.length - 1]}; TR.from = TRDEF.from; TR.to = TRDEF.to;
    var opt = ys.map(function(y){ return "<option value='" + y + "'>" + sl(y) + "</option>"; }).join("");
    $("tr-from").innerHTML = opt; $("tr-to").innerHTML = opt;
    var O = forder();
    $("tr-fr").innerHTML = "<option value='all'>All franchises</option><optgroup label='Current'>" + O.cur.map(function(k){ return "<option value='" + k + "'>" + esc(FR[k].name) + "</option>"; }).join("") + "</optgroup><optgroup label='Former'>" + O.def.map(function(k){ return "<option value='" + k + "'>" + esc(FR[k].name) + "</option>"; }).join("") + "</optgroup>";
    function set(k, v){ TR[k] = v; TR.shown = 50; if (k === "score") TR.sort = null; renderTR(); }
    document.querySelectorAll("[data-ts]").forEach(function(b){ b.onclick = function(){ set("score", b.dataset.ts); }; });
    $("tr-from").onchange = function(){ var v = +this.value; if (v > TR.to){ TR.to = v; } set("from", v); };
    $("tr-to").onchange = function(){ var v = +this.value; if (v < TR.from){ TR.from = v; } set("to", v); };
    $("tr-lg").onchange = function(){ set("lg", this.value); };
    $("tr-fr").onchange = function(){ set("fr", this.value); };
    $("tr-champ").onchange = function(){ set("champ", this.checked); };
    $("tr-best").onchange = function(){ set("best", this.checked); };
    $("tr-more").onclick = function(){ TR.shown += 50; renderTR(); };
    $("tr-ftoggle").onclick = function(){ var c = $("tr-controls"), open = !c.classList.contains("open"); c.classList.toggle("open", open); this.setAttribute("aria-expanded", String(open)); };
    $("tr-head").addEventListener("click", function(e){
      var b = e.target.closest("button[data-tsort]"); if (!b) return;
      var k = +b.dataset.tsort, cur = TR.sort === null ? TRK[TR.score] : TR.sort;
      if (k === cur) TR.dir = (TR.sort === null ? -1 : TR.dir) * -1; else TR.dir = (k === 0 || k === 3) ? 1 : -1;
      TR.sort = k; TR.shown = 50; renderTR();
    });
  }
  function trApply(P){
    if (!Object.keys(P).length) return;
    var yr = function(v, d){ v = parseInt(v, 10); return isNaN(v) ? d : Math.max(TRDEF.from, Math.min(TRDEF.to, v)); };
    TR.score = TRK.hasOwnProperty(P.score) ? P.score : "rating";
    TR.from = yr(P.from, TRDEF.from); TR.to = yr(P.to, TRDEF.to); if (TR.from > TR.to) TR.to = TR.from;
    TR.lg = P.lg === "0" || P.lg === "1" ? P.lg : "all"; TR.fr = FR[P.fr] ? P.fr : "all";
    TR.champ = P.champ === "1"; TR.best = P.best === "1";
    TR.sort = P.sort !== undefined && P.sort !== "" && !isNaN(+P.sort) ? +P.sort : null; TR.dir = P.dir === "asc" ? 1 : -1; TR.shown = 50;
  }
  function renderTR(){
    var k = TRK[TR.score];
    var rows = T.filter(function(t){
      if (t[0] < TR.from || t[0] > TR.to) return false;
      if (TR.lg !== "all" && t[1] !== +TR.lg) return false;
      if (TR.fr !== "all" && t[19] !== TR.fr) return false;
      if (TR.champ && !t[8]) return false;
      if (t[k] === null || t[k] === undefined) return false;
      if (TR.score === "po" && t[17] === null) return false;
      return true;
    });
    if (TR.best){ var bb = {}; rows.forEach(function(t){ if (!bb[t[19]] || t[k] > bb[t[19]][k]) bb[t[19]] = t; }); rows = Object.keys(bb).map(function(f){ return bb[f]; }); }
    rows.sort(function(a, b){ return b[k] - a[k] || a[0] - b[0]; });
    var rank = new Map(); rows.forEach(function(t, i){ rank.set(t, i + 1); });
    if (TR.sort !== null){
      var sk = TR.sort, dir = TR.dir;
      rows.sort(function(a, b){
        var x = sk === 3 ? a[3] : sk === 4 ? (a[4] === null ? null : a[4] / (a[4] + a[5])) : a[sk], y = sk === 3 ? b[3] : sk === 4 ? (b[4] === null ? null : b[4] / (b[4] + b[5])) : b[sk];
        if (x === null && y === null) return 0; if (x === null) return 1; if (y === null) return -1;
        return dir * (typeof x === "string" ? x.localeCompare(y) : x - y) || b[k] - a[k];
      });
    }
    var cols = [["#", null, "num"], ["Team", 3, ""], ["Season", 0, ""], ["W–L", 4, "num hide-sm"], ["Rating", 6, "num"], ["Regular season", 15, "num"], ["Playoffs", 16, "num"], ["Roster", 14, "num"], ["Big 3", 10, "num"], ["Result", null, "hide-sm"]];
    var active = TR.sort === null ? k : TR.sort;
    $("tr-head").innerHTML = cols.map(function(c){
      var cls = c[2] + (c[1] !== null && c[1] !== k && [6, 15, 16, 14, 10].indexOf(c[1]) > -1 ? " hide-sm" : "") + (c[1] === k ? " on" : "");
      if (c[1] === null) return "<th class='" + cls + "'>" + c[0] + "</th>";
      return "<th class='sort " + cls + "'" + (c[1] === active ? " aria-sort='" + ((TR.sort === null ? -1 : TR.dir) > 0 ? "ascending" : "descending") + "'" : "") + "><button type='button' data-tsort='" + c[1] + "'>" + c[0] + "</button></th>";
    }).join("");
    var shown = rows.slice(0, TR.shown);
    function cell(col, v, txt){ return "<td class='" + (col === k ? "cv" : "num hide-sm") + "'>" + txt + "</td>"; }
    $("tr-body").innerHTML = shown.length ? shown.map(function(t){
      var po = t[17] !== null ? sgn(t[16]) + " <span class='soft' style='font-size:12px'>(" + t[17] + "–" + t[18] + ")</span>" : "<span class='soft'>missed</span>";
      var three = (t[12] || []).map(function(p){ return nl(p[0], t[0], t[0], t[2], true); }).join(" · ");
      return "<tr><td class='rk'>" + rank.get(t) + "</td><td class='tm'><a class='plink' href='" + CVR.build("teams", [k2u(key(t))]) + "'>" + esc(t[3]) + "</a>" + lgPill(t) +
        (TR.score === "big3" && three ? "<div class='b3names'>" + three + "</div>" : "") + "</td><td>" + sl(t[0]) + "</td><td class='num hide-sm'>" + wl(t) + "</td>" +
        cell(6, t[6], sgn(t[6])) + cell(15, t[15], sgn(t[15])) + cell(16, t[16], po) + cell(14, t[14], sgn(t[14])) + cell(10, t[10], t[10] === null ? "—" : "<span title='" + esc((t[12] || []).map(function(p){ return p[0] + " " + p[2].toFixed(1); }).join(", ")) + "'>" + t[10].toFixed(1) + "</span>") +
        "<td class='hide-sm'>" + result(t) + "</td></tr>";
    }).join("") : "<tr><td colspan='10' class='status'>No teams match these filters.</td></tr>";
    $("tr-count").textContent = rows.length.toLocaleString() + (TR.best ? " franchises" : " team-seasons") + (rows.length > shown.length ? " · showing " + shown.length : "");
    $("tr-more").hidden = rows.length <= shown.length;
    $("tr-note").innerHTML = TRNOTE[TR.score];
    var nf = (TR.from !== TRDEF.from || TR.to !== TRDEF.to ? 1 : 0) + (TR.lg !== "all") + (TR.fr !== "all") + TR.champ + TR.best;
    $("tr-ftoggle").textContent = "Filters" + (nf ? " · " + nf : "");
    document.querySelectorAll("[data-ts]").forEach(function(b){ b.setAttribute("aria-pressed", String(b.dataset.ts === TR.score)); });
    $("tr-from").value = TR.from; $("tr-to").value = TR.to; $("tr-lg").value = TR.lg; $("tr-fr").value = TR.fr; $("tr-champ").checked = TR.champ; $("tr-best").checked = TR.best;
    CVR.replace("rankings", ["teams"], {score: TR.score === "rating" ? "" : TR.score, from: TR.from !== TRDEF.from ? TR.from : "", to: TR.to !== TRDEF.to ? TR.to : "",
      lg: TR.lg !== "all" ? TR.lg : "", fr: TR.fr !== "all" ? TR.fr : "", champ: TR.champ ? "1" : "", best: TR.best ? "1" : "",
      sort: TR.sort === null ? "" : TR.sort, dir: TR.sort === null ? "" : (TR.dir > 0 ? "asc" : "desc")});
  }
  window.CV.teamRank = function(P){ load().then(function(){ if (!T) return; trInit(); trApply(P); renderTR(); }); };

  // ---- links and addresses
  function k2u(k){ return k.split("|").join("-"); }
  function u2k(u){ return String(u).split("-").join("|"); }
  function nl(name, s0, s1, team, seasonLink){ return window.CV.nameLink(name, s0, s1, team, seasonLink); }
  function teamKeyByName(season, lgStr, name){
    var lg = lgStr === "ABA" || lgStr === 1 ? 1 : 0;
    var t = (BYSEASON[season] || []).filter(function(x){ return x[1] === lg && x[3] === name; })[0];
    return t ? key(t) : null;
  }
  function teamLink(season, lgStr, name, page){
    var k = teamKeyByName(season, lgStr, name), label = esc(name);
    return k ? "<a class='tlink' href='" + CVR.build(page || "teams", [k2u(k)]) + "'>" + label + "</a>" : label;
  }
  window.CV.loadTeams = function(){
    return load().then(function(){
      if (!T) throw new Error("teams");
      return {byKey: function(s, lg, a){ return BYK[s + "|" + lg + "|" + a]; }, urlKey: function(t){ return k2u(key(t)); }, rows: T, franchises: FR};
    });
  };
  function applySides(m, args){
    if (!args[0]) return;
    var ks = args[0].split(",").map(u2k).filter(function(k){ return BYK[k] && (m === "tm" || BYK[k][12]); });
    if (ks[0]) SEL[m][0] = ks[0]; if (ks[1]) SEL[m][1] = ks[1];
    picker(m, 0); picker(m, 1);
  }
  CVR.on("teams", function(args){ load().then(function(){ if (!T) return; applySides("tm", args); renderTM(); }); });
  CVR.on("big3", function(args){ load().then(function(){ if (!T) return; applySides("b3", args); renderB3(); }); });
  CVR.on("decades", function(args){ load().then(function(){ if (!T) return; if (args[0] && DEC[args[0]]) DSEL = args[0]; renderDecades(); }); });
  CVR.on("franchises", function(args, params){ load().then(function(){
    if (!T) return; FSEL = args[0] && FR[args[0]] ? args[0] : null;
    FVS = (params.vs || "").split(",").filter(function(k){ return FR[k] && k !== FSEL; }).slice(0, 2);
    FSMOOTH = params.smooth === "1" ? true : params.smooth === "0" ? false : null;
    renderFranchises();
  }); });

  // ---- pickers
  var SEASONS = [];
  function picker(m, i){
    var host = $(m + "-" + (i ? "b" : "a"));
    if (!SEASONS.length) SEASONS = Object.keys(BYSEASON).map(Number).sort(function(a, b){ return (b === 0) - (a === 0) || b - a; });
    var r = BYK[SEL[m][i]];
    var sOpts = SEASONS.filter(function(s){ return m === "tm" || s > 0; }).map(function(s){ return "<option value='" + s + "'" + (s === r[0] ? " selected" : "") + ">" + sl(s) + "</option>"; }).join("");
    var tOpts = BYSEASON[r[0]].filter(function(t){ return m === "tm" || t[12]; }).map(function(t){ return "<option value='" + key(t) + "'" + (key(t) === key(r) ? " selected" : "") + ">" + esc(t[3]) + (t[1] === 1 ? " (ABA)" : "") + "</option>"; }).join("");
    host.innerHTML = "<div class='sel'><select aria-label='Season' data-s>" + sOpts + "</select><select aria-label='Team' data-t>" + tOpts + "</select></div><div data-body></div>";
    host.querySelector("[data-s]").addEventListener("change", function(){
      var s = +this.value, list = BYSEASON[s].filter(function(t){ return m === "tm" || t[12]; });
      var same = list.filter(function(t){ return t[2] === r[2]; })[0];
      var pick = same || list.slice().sort(function(a, b){ return m === "tm" ? b[6] - a[6] : (b[10] || 0) - (a[10] || 0); })[0];
      SEL[m][i] = key(pick); picker(m, i); (m === "tm" ? renderTM : renderB3)();
    });
    host.querySelector("[data-t]").addEventListener("change", function(){ SEL[m][i] = this.value; picker(m, i); (m === "tm" ? renderTM : renderB3)(); });
  }
  function setSide(m, i, k){ SEL[m][i] = k; picker(m, i); (m === "tm" ? renderTM : renderB3)(); var el = $(m === "tm" ? "tm-a" : "b3-a"); if (el.scrollIntoView) el.scrollIntoView({behavior: "smooth", block: "start"}); }

  // ---- Time Machine
  function teamBody(r){
    if (r[1] === 9) return exhBody(r);
    var ro = r[13].map(function(p, i){ return "<tr" + (i >= 5 ? " class='extra'" : "") + "><td class='nm'>" + nl(p[0], r[0], r[0], r[2], true) + "</td><td class='n'>" + esc(p[1] || "") + "</td><td class='n'>" + p[3].toFixed(0) + "%</td><td class='n'>" + f2(p[4]) + "</td><td class='n'>" + f2(p[5]) + "</td></tr>"; }).join("");
    return "<div class='tname'>" + sl(r[0]) + " " + esc(r[3]) + "</div>" +
      "<div class='tsub'><span>W–L <b>" + wl(r) + "</b></span>" + (r[17] !== null ? "<span>Playoffs <b>" + r[17] + "–" + r[18] + "</b></span>" : "") + "<span>#" + r[9] + " all time</span>" + lgPill(r) + result(r) + "</div>" +
      "<div class='rating'><span class='big'>" + sgn(r[6]) + "</span><span>Team rating: points per game above an average team of its era</span></div>" +
      "<div class='tsub'><span>Roster (CV) <b>" + sgn(r[14]) + "</b></span><span>Regular season <b>" + sgn(r[15]) + "</b></span><span>Playoffs <b>" + (r[17] !== null ? sgn(r[16]) : "—") + "</b></span></div>" +
      "<div class='rosterwrap'><div class='tablewrap' style='border-top:0'><table class='mini'><thead><tr><th>Top minutes</th><th class='n'>Pos</th><th class='n'>Min</th><th class='n'>RS</th><th class='n'>CV</th></tr></thead><tbody>" + ro + "</tbody></table></div>" +
      (r[13].length > 5 ? "<button type='button' class='pp-close rbtn' data-roster aria-expanded='false'>Full roster (" + r[13].length + ")</button>" : "") + "</div>";
  }
  function exhBody(r){
    var ro = r[13].map(function(p){ return "<tr><td class='nm'>" + (p[7] ? nl(p[0], p[6], p[6], p[7], true) : esc(p[0])) + "</td><td class='n'>" + esc(p[1]) + "</td><td class='n'>" + p[3].toFixed(0) + "%</td><td class='n'>" + f2(p[4]) + "</td></tr>"; }).join("");
    return "<div class='tname'>" + esc(r[3]) + "</div>" +
      "<div class='tsub'><span>" + esc(r[20]) + "</span>" + lgPill(r) + "</div>" +
      "<div class='rating'><span class='big'>" + sgn(r[6]) + "</span><span>Team rating: what the roster's Court Value projects, points per game above an average team</span></div>" +
      "<div class='rosterwrap'><div class='tablewrap' style='border-top:0'><table class='mini'><thead><tr><th>" + (r[13].length > 6 ? "Roster" : "Starting five") + "</th><th class='n'>Season</th><th class='n'>Min</th><th class='n'>RS</th></tr></thead><tbody>" + ro + "</tbody></table></div></div>" +
      (r[21] === "Olympics" ? "<p class='caption' style='margin-top:8px'>All twelve players split the minutes evenly.</p>" : "<p class='caption' style='margin-top:8px'>The bench plays the other " + (100 - r[13].reduce(function(a, p){ return a + p[3]; }, 0)).toFixed(0) + "% of minutes at 0, an average player-game.</p>");
  }
  function listEXH(){
    var host = $("exh-list"); if (!host) return;
    host.innerHTML = EXH.slice().sort(function(a, b){ return (a[21] === "Movies") - (b[21] === "Movies") || b[6] - a[6]; }).map(function(r, i, all){
      var hd = i === 0 || all[i - 1][21] !== r[21] ? "<tr><th colspan='5' style='padding-top:18px'>" + (r[21] === "Olympics" ? "U.S. Olympic teams" : "Movie teams") + "</th></tr>" : "";
      return hd + "<tr><td class='tm'>" + esc(r[3]) + "</td><td>" + esc(r[20]) + "</td><td class='cv'>" + sgn(r[6]) + "</td><td class='b3'>" + r[13].map(function(p){ return esc(p[0]); }).join(" · ") + "</td><td><div class='row' style='gap:6px;flex-wrap:nowrap'><button type='button' class='pp-close' data-side='0' data-k='" + key(r) + "'>Left</button><button type='button' class='pp-close' data-side='1' data-k='" + key(r) + "'>Right</button></div></td></tr>";
    }).join("") || "<tr><td class='status'>No exhibition teams.</td></tr>";
  }
  function winP(ra, rb, homeA){ var h = META.home * (homeA ? 1 : -1); return phi((ra - rb + h) / META.game_sd); }
  var HOME = [1, 1, 0, 0, 1, 0, 1]; // 2-2-1-1-1 for the higher seed
  function series(a, b){
    var aHigh = a[6] >= b[6], p = HOME.map(function(h){ return winP(a[6], b[6], aHigh ? !!h : !h); });
    var st = {"0,0": 1}, out = {};
    for (var g = 0; g < 7; g++){
      var nx = {};
      Object.keys(st).forEach(function(k){
        var w = k.split(",").map(Number), pr = st[k];
        [[w[0] + 1, w[1], p[g]], [w[0], w[1] + 1, 1 - p[g]]].forEach(function(o){
          var kk = o[0] + "," + o[1], v = pr * o[2];
          if (o[0] === 4 || o[1] === 4) out[kk] = (out[kk] || 0) + v; else nx[kk] = (nx[kk] || 0) + v;
        });
      });
      st = nx;
    }
    return {out: out, p: p, aHigh: aHigh};
  }
  function renderTM(){
    var a = BYK[SEL.tm[0]], b = BYK[SEL.tm[1]];
    $("tm-a").querySelector("[data-body]").innerHTML = teamBody(a);
    $("tm-b").querySelector("[data-body]").innerHTML = teamBody(b);
    var s = series(a, b), pa = 0, cells = [];
    [4, 5, 6, 7].forEach(function(n){ var v = s.out["4," + (n - 4)] || 0; pa += v; cells.push("<div class='a'><b>" + (v * 100).toFixed(1) + "%</b>" + esc(tag(a)) + " in " + n + "</div>"); });
    [4, 5, 6, 7].forEach(function(n){ var v = s.out[(n - 4) + ",4"] || 0; cells.push("<div class='b'><b>" + (v * 100).toFixed(1) + "%</b>" + esc(tag(b)) + " in " + n + "</div>"); });
    var pb = 1 - pa, pct = function(x){ return (x * 100).toFixed(1) + "%"; };
    $("tm-bar").innerHTML = "<div class='a' style='flex-basis:" + (pa * 100) + "%'>" + esc(tag(a)) + " " + pct(pa) + "</div><div class='b' style='flex-basis:" + (pb * 100) + "%'>" + pct(pb) + " " + esc(tag(b)) + "</div>";
    $("tm-out").innerHTML = cells.join("");
    var hi = s.aHigh ? a : b;
    $("tm-cap").textContent = "Home court goes to the higher-rated team (" + full(hi) + "), in a 2-2-1-1-1 format, worth about " + META.home.toFixed(0) + " points a game as measured in real playoff games. Single-game chances: " + s.p.map(function(x){ return Math.round(x * 100) + "%"; }).join(", ") + " for " + full(a) + " in games 1–7.";
    $("tm-games").innerHTML = ""; $("tm-verdict").textContent = "";
    CVR.replace("teams", [SEL.tm.map(k2u).join(",")]);
    if (CVR.parse().page === "teams") document.title = full(a) + " vs " + full(b) + " · Court Value";
  }
  var playing = null;
  function play(){
    if (playing) clearTimeout(playing);
    var a = BYK[SEL.tm[0]], b = BYK[SEL.tm[1]], s = series(a, b), wa = 0, wb = 0, g = 0, ul = $("tm-games");
    ul.innerHTML = ""; $("tm-verdict").textContent = "";
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    (function next(){
      if (wa === 4 || wb === 4){ var w = wa === 4 ? a : b; $("tm-verdict").innerHTML = "<span class='" + (wa === 4 ? "edge-a" : "edge-b") + "'>" + esc(full(w)) + "</span> win the series " + Math.max(wa, wb) + "–" + Math.min(wa, wb) + "."; playing = null; return; }
      var h = META.home * ((s.aHigh ? HOME[g] : !HOME[g]) ? 1 : -1), m = a[6] - b[6] + h + META.game_sd * gauss(), ot = Math.abs(m) < 0.5;
      if (ot) m = (Math.random() < s.p[g] ? 1 : -1) * (1 + Math.floor(Math.random() * 5));
      var aw = m > 0, margin = Math.max(1, Math.round(Math.abs(m)));
      if (aw) wa++; else wb++;
      var w = aw ? a : b, homeT = (s.aHigh ? HOME[g] : !HOME[g]) ? a : b;
      var li = document.createElement("li");
      li.innerHTML = "<span class='gn'>Game " + (g + 1) + "</span><span class='sc'><b class='" + (aw ? "edge-a" : "edge-b") + "'>" + esc(tag(w)) + "</b> by " + margin + (ot ? " in OT" : "") + " <span class='soft'>· at " + esc(homeT[2]) + "</span></span><span class='ser'>" + wa + "–" + wb + "</span>";
      ul.appendChild(li); g++;
      playing = setTimeout(next, reduce ? 0 : 450);
    })();
  }
  function listTM(){
    var rows = T.filter(function(r){ return LG.tm === "all" || r[1] === +LG.tm; }).sort(function(x, y){ return y[6] - x[6]; });
    $("tm-list").innerHTML = rows.slice(0, LIST.tm).map(function(r, i){
      return "<tr><td class='rk'>" + (i + 1) + "</td><td class='tm'>" + esc(r[3]) + lgPill(r) + "</td><td>" + sl(r[0]) + "</td><td class='num'>" + wl(r) + "</td><td class='cv'>" + sgn(r[6]) + "</td><td class='num'>" + sgn(r[14]) + "</td><td class='num'>" + sgn(r[15]) + "</td><td class='num'>" + (r[17] !== null ? sgn(r[16]) + " <span class='soft'>(" + r[17] + "–" + r[18] + ")</span>" : "—") + "</td><td>" + result(r) + "</td><td><div class='row' style='gap:6px;flex-wrap:nowrap'><button type='button' class='pp-close' data-side='0' data-k='" + key(r) + "'>Left</button><button type='button' class='pp-close' data-side='1' data-k='" + key(r) + "'>Right</button></div></td></tr>";
    }).join("");
    $("tm-more").hidden = LIST.tm >= rows.length;
  }

  // ---- Big 3
  function b3Body(r){
    var mx = 16;
    var ps = r[12].map(function(p){ return "<div class='b3p'><span class='nm'>" + nl(p[0], r[0], r[0], r[2], true) + "<small>" + esc(p[1] || "") + "</small></span><span class='v'>" + p[2].toFixed(2) + "</span><span class='track'><i style='width:" + Math.max(0, Math.min(100, p[2] / mx * 100)) + "%'></i></span></div>"; }).join("");
    return "<div class='tname'>" + sl(r[0]) + " " + esc(r[3]) + "</div>" +
      "<div class='tsub'><span>W–L <b>" + wl(r) + "</b></span><span>#" + r[11] + " Big 3 all time</span>" + lgPill(r) + result(r) + "</div>" +
      "<div class='rating'><span class='big'>" + r[10].toFixed(1) + "</span><span>Big 3 CV: the three season scores added up</span></div><div class='b3list'>" + ps + "</div>";
  }
  function renderB3(){
    var a = BYK[SEL.b3[0]], b = BYK[SEL.b3[1]];
    $("b3-a").querySelector("[data-body]").innerHTML = b3Body(a);
    $("b3-b").querySelector("[data-body]").innerHTML = b3Body(b);
    var d = a[10] - b[10], lead = d >= 0 ? a : b;
    var slots = ["Best player", "Second", "Third"].map(function(lab, i){
      var x = a[12][i], y = b[12][i], e = x[2] - y[2];
      return "<div class='slot3'><span class='lbl'>" + lab + "</span><div class='who'><b class='edge-a'>" + nl(x[0], a[0], a[0], a[2], true) + "</b> " + x[2].toFixed(2) + "<br><b class='edge-b'>" + nl(y[0], b[0], b[0], b[2], true) + "</b> " + y[2].toFixed(2) + "</div><div class='lbl' style='margin-top:6px'>Edge: <span class='" + (e >= 0 ? "edge-a" : "edge-b") + "'>" + esc(tag(e >= 0 ? a : b)) + " by " + Math.abs(e).toFixed(2) + "</span></div></div>";
    }).join("");
    var tot = a[10] + b[10];
    $("b3-cmp").innerHTML = "<span class='lbl'>Head to head · spot by spot</span><div class='oddbar'><div class='a' style='flex-basis:" + (a[10] / tot * 100) + "%'>" + esc(tag(a)) + " " + a[10].toFixed(1) + "</div><div class='b' style='flex-basis:" + (b[10] / tot * 100) + "%'>" + b[10].toFixed(1) + " " + esc(tag(b)) + "</div></div>" +
      "<div class='verdict' style='margin:0 0 4px'>" + (Math.abs(d) < 0.05 ? "Dead even." : "<span class='" + (d >= 0 ? "edge-a" : "edge-b") + "'>" + esc(sl(lead[0]) + " " + lead[3]) + "</span> by " + Math.abs(d).toFixed(1) + " CV.") + "</div><div class='slots3'>" + slots + "</div>";
    CVR.replace("big3", [SEL.b3.map(k2u).join(",")]);
  }
  function listB3(){
    var rows = T.filter(function(r){ return r[10] !== null && (LG.b3 === "all" || r[1] === +LG.b3); }).sort(function(x, y){ return y[10] - x[10]; });
    $("b3-list").innerHTML = rows.slice(0, LIST.b3).map(function(r, i){
      return "<tr><td class='rk'>" + (i + 1) + "</td><td class='tm'>" + esc(r[3]) + lgPill(r) + "</td><td>" + sl(r[0]) + "</td><td class='b3'>" + r[12].map(function(p){ return nl(p[0], r[0], r[0], r[2], true) + " <span class='soft mono' style='font-size:12px'>" + p[2].toFixed(1) + "</span>"; }).join(" · ") + "</td><td class='cv'>" + r[10].toFixed(1) + "</td><td>" + result(r) + "</td><td><div class='row' style='gap:6px;flex-wrap:nowrap'><button type='button' class='pp-close' data-side='0' data-k='" + key(r) + "'>Left</button><button type='button' class='pp-close' data-side='1' data-k='" + key(r) + "'>Right</button></div></td></tr>";
    }).join("");
    $("b3-more").hidden = LIST.b3 >= rows.length;
  }

  // ---- shared lists
  function allHTML(all, s0, s1){
    return "<div class='allteams'>" + all.map(function(tm, i){ return "<div class='slot3'><span class='lbl'>" + ["1st", "2nd", "3rd"][i] + " team</span><ul class='at'>" +
      tm.map(function(p){ return "<li><span class='ps'>" + p[0] + "</span><b>" + nl(p[1], s0, s1) + "</b><span class='n'>" + p[2].toFixed(1) + "</span></li>"; }).join("") + "</ul></div>"; }).join("") + "</div>";
  }
  function teamTable(list){ return "<div class='tablewrap'><table><thead><tr><th class='num'>#</th><th>Team</th><th>Season</th><th class='num'>W–L</th><th class='num'>Rating</th><th>Result</th></tr></thead><tbody>" +
    list.map(function(t, i){ return "<tr><td class='rk'>" + (i + 1) + "</td><td class='tm'>" + teamLink(t[0], t[1], t[2]) + (t[1] === "ABA" ? " <span class='pill aba'>ABA</span>" : "") + "</td><td>" + sl(t[0]) + "</td><td class='num'>" + (t[4] || "—") + "</td><td class='cv'>" + sgn(t[3]) + "</td><td>" + (t[5] ? "<span class='pill champ'>Champion</span>" : "") + "</td></tr>"; }).join("") + "</tbody></table></div>"; }
  function b3Table(list){ return "<div class='tablewrap'><table><thead><tr><th class='num'>#</th><th>Team</th><th>The three</th><th class='num'>Big 3 CV</th></tr></thead><tbody>" +
    list.map(function(t, i){ return "<tr><td class='rk'>" + (i + 1) + "</td><td class='tm'>" + sl(t[0]) + " " + teamLink(t[0], t[1], t[2], "big3") + (t[1] === "ABA" ? " <span class='pill aba'>ABA</span>" : "") + "</td><td class='b3'>" + t[4].map(function(n){ return nl(n, t[0], t[0], null, true); }).join(" · ") + "</td><td class='cv'>" + t[3].toFixed(1) + "</td></tr>"; }).join("") + "</tbody></table></div>"; }

  // ---- Decades
  var DSEL = null;
  function dlabel(d){ return d + "s"; }
  function renderDecades(){
    var ks = Object.keys(DEC).sort();
    if (!DSEL) DSEL = ks[ks.length - 1];
    $("dec-grid").innerHTML = ks.map(function(k){
      var D = DEC[k], p = D.players[0], s = D.seasons[0], t = D.teams[0], b = D.big3[0];
      return "<button type='button' class='dcard' data-dec='" + k + "' aria-pressed='" + (k === DSEL) + "'><span class='dh'>" + dlabel(k) + "</span>" +
        "<span class='dl'><span>Player</span><span><b>" + esc(p[0]) + "</b></span></span>" +
        "<span class='dl'><span>Season</span><span><b>" + esc(s[0]) + "</b> " + sl(s[1]) + " · " + s[3].toFixed(2) + "</span></span>" +
        "<span class='dl'><span>Team</span><span><b>" + sl(t[0]) + " " + esc(t[2]) + "</b></span></span>" +
        "<span class='dl'><span>Big 3</span><span><b>" + sl(b[0]) + " " + esc(b[2]) + "</b></span></span></button>";
    }).join("");
    var D = DEC[DSEL], first = +DSEL, last = first + 9;
    var span = sl(Math.max(first, 1952)) + " to " + sl(Math.min(last, 2026));
    var pl = D.players.map(function(p, i){ return "<tr><td class='rk'>" + (i + 1) + "</td><td class='player'>" + nl(p[0], first, last) + (p[3].indexOf("ABA") > -1 ? " <span class='pill aba'>" + esc(p[3]) + "</span>" : "") + "</td><td class='num'>" + p[2] + "</td><td class='cv'>" + p[1].toFixed(1) + "</td></tr>"; }).join("");
    var se = D.seasons.map(function(s, i){ return "<tr><td class='rk'>" + (i + 1) + "</td><td class='player'>" + nl(s[0], s[1], s[1], null, true) + (s[2] === "ABA" ? " <span class='pill aba'>ABA</span>" : "") + "</td><td>" + sl(s[1]) + "</td><td class='cv'>" + s[3].toFixed(2) + "</td><td class='num'>" + s[4].toFixed(2) + "</td><td class='num'>" + f2(s[5]) + "</td></tr>"; }).join("");
    var te = D.teams.map(function(t, i){ return "<tr><td class='rk'>" + (i + 1) + "</td><td class='tm'>" + teamLink(t[0], t[1], t[2]) + (t[1] === "ABA" ? " <span class='pill aba'>ABA</span>" : "") + "</td><td>" + sl(t[0]) + "</td><td class='num'>" + (t[4] || "—") + "</td><td class='cv'>" + sgn(t[3]) + "</td><td>" + (t[5] ? "<span class='pill champ'>Champion</span>" : "") + "</td></tr>"; }).join("");
    var bb = D.big3.map(function(t, i){ return "<tr><td class='rk'>" + (i + 1) + "</td><td class='tm'>" + sl(t[0]) + " " + teamLink(t[0], t[1], t[2], "big3") + (t[1] === "ABA" ? " <span class='pill aba'>ABA</span>" : "") + "</td><td class='b3'>" + t[4].map(function(n){ return nl(n, t[0], t[0], null, true); }).join(" · ") + "</td><td class='cv'>" + t[3].toFixed(1) + "</td></tr>"; }).join("");
    $("dec-detail").innerHTML = "<span class='eyebrow'>" + span + "</span><h3 class='dt'>The " + dlabel(DSEL) + "</h3>" +
      "<div class='grid2'><div><h4>Best players</h4><div class='tablewrap'><table><thead><tr><th class='num'>#</th><th>Player</th><th class='num'>Seasons</th><th class='num'>Decade CV</th></tr></thead><tbody>" + pl + "</tbody></table></div><p class='note' style='font-size:14.5px'>Decade CV applies the Career CV rule to the seasons inside the decade only.</p></div>" +
      "<div><h4>Best seasons</h4><div class='tablewrap'><table><thead><tr><th class='num'>#</th><th>Player</th><th>Season</th><th class='num'>CV</th><th class='num'>RS</th><th class='num'>PO</th></tr></thead><tbody>" + se + "</tbody></table></div></div>" +
      "<div><h4>Best teams</h4>" + teamTable(D.teams) + "</div><div><h4>Best Big 3s</h4>" + b3Table(D.big3) + "</div></div>" +
      "<h4 style='margin-top:36px'>All-Decade teams</h4>" + allHTML(D.all, first, last) + "<p class='note' style='font-size:14.5px'>Two guards, two forwards and a center per team, chosen by Decade CV. Position is the one a player was listed at most in the decade.</p>";
    CVR.replace("decades", [DSEL]);
  }

  // ---- Franchises: #franchises is the hub, #franchises/<key> a franchise's page
  var FSEL = null, FORDER = null, FVS = [], FSMOOTH = null;
  // Primary team colours for the badges (plain colour blocks, no logos)
  var TCOL = {ATL:"#C8102E",BOS:"#007A33",BRK:"#111111",CHO:"#1D1160",CHI:"#CE1141",CLE:"#860038",DAL:"#00538C",DEN:"#0E2240",DET:"#C8102E",GSW:"#1D428A",
    HOU:"#CE1141",IND:"#002D62",LAC:"#C8102E",LAL:"#552583",MEM:"#5D76A9",MIA:"#98002E",MIL:"#00471B",MIN:"#0C2340",NOP:"#0C2340",NYK:"#F58426",OKC:"#007AC1",
    ORL:"#0077C0",PHI:"#006BB6",PHO:"#1D1160",POR:"#E03A3E",SAC:"#5A2D81",SAS:"#111111",TOR:"#CE1141",UTA:"#002B5C",WAS:"#002B5C"};
  function badge(k){ return "<span class='tbadge' style='background:" + (TCOL[k] || "var(--soft)") + "'>" + esc(k) + "</span>"; }
  function forder(){
    if (FORDER) return FORDER;
    var cur = [], def = [], byName = function(a, b){ return FR[a].name.localeCompare(FR[b].name); };
    Object.keys(FR).forEach(function(k){ (FR[k].group === "current" ? cur : def).push(k); });
    FORDER = {cur: cur.sort(byName), def: def.sort(byName)};
    FORDER.all = FORDER.cur.concat(FORDER.def);
    $("fr-sel").innerHTML = "<option value=''>All franchises</option><optgroup label='Current franchises'>" + FORDER.cur.map(function(k){ return "<option value='" + k + "'>" + esc(FR[k].name) + "</option>"; }).join("") + "</optgroup>" +
      "<optgroup label='Former franchises'>" + FORDER.def.map(function(k){ return "<option value='" + k + "'>" + esc(FR[k].name) + "</option>"; }).join("") + "</optgroup>";
    return FORDER;
  }
  function tile(k){
    var F = FR[k], p = F.players[0];
    return "<a class='ftile' href='" + CVR.build("franchises", [k]) + "'>" + badge(k) + "<span class='ft'><b>" + esc(F.name) + "</b><small>" +
      sl(F.first).slice(0, 4) + "–" + String(F.last).slice(-2) + " · " + F.titles + " title" + (F.titles === 1 ? "" : "s") + (p ? " · " + esc(p[0]) : "") + "</small></span></a>";
  }
  function renderFranchises(){
    var O = forder(), hub = !FSEL;
    $("fr-hub").hidden = !hub; $("fr-page").hidden = hub; $("fr-intro").hidden = !hub;
    $("fr-sel").value = FSEL || "";
    if (hub){
      $("fr-grid").innerHTML = O.cur.map(tile).join("");
      $("fr-former").innerHTML = O.def.map(tile).join("");
      CVR.replace("franchises", []);
      return;
    }
    var F = FR[FSEL], i = O.all.indexOf(FSEL), prev = O.all[(i - 1 + O.all.length) % O.all.length], next = O.all[(i + 1) % O.all.length];
    $("fr-nav").innerHTML = "<a class='tlink' href='#franchises'>← All franchises</a><span class='row' style='gap:8px 18px'><a class='tlink' href='" + CVR.build("franchises", [prev]) + "'>‹ " + esc(FR[prev].name) + "</a><a class='tlink' href='" + CVR.build("franchises", [next]) + "'>" + esc(FR[next].name) + " ›</a></span>";
    var others = F.names.filter(function(n){ return n[0] !== F.name.replace(/ \(.*\)$/, ""); });
    var pl = F.players.map(function(p, i){ return "<tr><td class='rk'>" + (i + 1) + "</td><td class='player'>" + nl(p[0], p[3], p[4]) + "</td><td>" + sl(p[3]) + " to " + sl(p[4]) + "</td><td class='num'>" + p[2] + "</td><td class='cv'>" + p[1].toFixed(1) + "</td></tr>"; }).join("");
    var se = F.seasons_top.map(function(s, i){ return "<tr><td class='rk'>" + (i + 1) + "</td><td class='player'>" + nl(s[0], s[1], s[1], s[2], true) + "</td><td>" + sl(s[1]) + " <span class='soft mono' style='font-size:12px'>" + esc(s[2]) + "</span></td><td class='cv'>" + s[3].toFixed(2) + "</td><td class='num'>" + s[4].toFixed(2) + "</td><td class='num'>" + f2(s[5]) + "</td><td>" + (s[6] ? "<span class='pill champ'>Title</span>" : "") + "</td></tr>"; }).join("");
    var seasons = T.filter(function(t){ return t[19] === FSEL; }).sort(function(a, b){ return a[0] - b[0]; });
    $("fr-detail").innerHTML = "<div class='fr-head'>" + badge(FSEL) + "<div><span class='eyebrow'>" + sl(F.first) + " to " + sl(F.last) + " · " + F.seasons + " seasons · " + F.titles + " title" + (F.titles === 1 ? "" : "s") + "</span><h3 class='dt'>" + esc(F.name) + "</h3></div></div>" +
      (others.length ? "<p class='note' style='margin-top:0'>Also played as " + others.map(function(n){ return esc(n[0]) + " (" + sl(n[1]) + (n[2] !== n[1] ? " to " + sl(n[2]) : "") + ")"; }).join(", ") + ".</p>" : "") +
      "<h4 style='margin-top:22px'>Season by season</h4><div class='controls' id='fr-cmp' style='padding-top:4px'></div><div class='chart card' id='fr-chart' style='padding:18px 18px 10px'></div>" +
      "<p class='caption' id='fr-cap'></p>" +
      "<div class='grid2'><div><h4>Best players</h4><div class='tablewrap'><table><thead><tr><th class='num'>#</th><th>Player</th><th>With the team</th><th class='num'>Seasons</th><th class='num'>Franchise CV</th></tr></thead><tbody>" + pl + "</tbody></table></div></div>" +
      "<div><h4>Best seasons</h4><div class='tablewrap'><table><thead><tr><th class='num'>#</th><th>Player</th><th>Season</th><th class='num'>CV</th><th class='num'>RS</th><th class='num'>PO</th><th></th></tr></thead><tbody>" + se + "</tbody></table></div></div>" +
      "<div><h4>Best teams</h4>" + teamTable(F.teams) + "</div><div><h4>Best Big 3s</h4>" + b3Table(F.big3) + "</div></div>" +
      "<h4 style='margin-top:36px'>All-Franchise teams</h4>" + allHTML(F.all, F.first, F.last) + "<p class='note' style='font-size:14.5px'>Two guards, two forwards and a center per team, chosen by Franchise CV: the Career CV rule applied to a player's seasons with this franchise only.</p>" +
      "<p style='margin-top:28px'>" + "<a class='btn secondary' href='" + CVR.build("franchises", [next]) + "'>Next: " + esc(FR[next].name) + " →</a></p>";
    frChart();
    syncFr();
  }
  function syncFr(){ CVR.replace("franchises", FSEL ? [FSEL] : [], {vs: FVS.join(","), smooth: FSMOOTH === null ? "" : (FSMOOTH ? "1" : "0")}); }
  // ---- franchise chart: one franchise, or up to three on one chart
  // team colour for each line; a colour too close to an earlier line's falls back to a contrasting one
  function hexRGB(h){ return [1, 3, 5].map(function(i){ return parseInt(h.slice(i, i + 2), 16); }); }
  function near(a, b){   // "redmean" colour distance, closer to how different two colours look
    var x = hexRGB(a), y = hexRGB(b), rm = (x[0] + y[0]) / 2, dr = x[0]-y[0], dg = x[1]-y[1], db = x[2]-y[2];
    return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db) < 100;
  }
  function lineColors(keys){
    var out = [], spare = ["#b86e00", "#2f8f5b", "#7b4bc4", "#2458c7", "#d63a2f"];
    keys.forEach(function(k){
      var c = TCOL[k];
      if (!c || out.some(function(o){ return near(o, c); })) c = spare.filter(function(sc){ return !out.some(function(o){ return near(o, sc); }); })[0] || "#57534a";
      out.push(c);
    });
    return out;
  }
  function frRows(k){ return T.filter(function(t){ return t[19] === k; }).sort(function(a, b){ return a[0] - b[0]; }); }
  function frChart(){
    var host = $("fr-chart"), tools = $("fr-cmp"); if (!host) return;
    var keys = [FSEL].concat(FVS), smooth = FSMOOTH === null ? keys.length > 1 : FSMOOTH, F = FR[FSEL], cols = lineColors(keys);
    // compare controls
    var O = forder(), opts = O.all.filter(function(k){ return keys.indexOf(k) === -1; });
    tools.innerHTML = "<div class='field'><label for='fr-add'>Compare with</label><select id='fr-add'" + (keys.length >= 3 ? " disabled" : "") + "><option value=''>" + (keys.length >= 3 ? "Three is the limit" : "Add a franchise…") + "</option>" +
      opts.map(function(k){ return "<option value='" + k + "'>" + esc(FR[k].name) + "</option>"; }).join("") + "</select></div>" +
      "<div class='chips' style='margin:0'>" + keys.map(function(k, i){ return "<span class='chip teamline' style='--tc:" + cols[i] + "'><i></i>" + esc(FR[k].name) + (i ? "<button type='button' aria-label='Remove " + esc(FR[k].name) + "' data-frrm='" + k + "'>×</button>" : "") + "</span>"; }).join("") + "</div>" +
      "<label class='check' for='fr-smooth' style='padding-bottom:0'><input type='checkbox' id='fr-smooth'" + (smooth ? " checked" : "") + "> 5-season average</label>";
    $("fr-add").onchange = function(){ if (this.value){ FVS.push(this.value); frChart(); syncFr(); } };
    $("fr-smooth").onchange = function(){ FSMOOTH = this.checked; frChart(); syncFr(); };
    tools.querySelectorAll("[data-frrm]").forEach(function(b){ b.onclick = function(){ FVS.splice(FVS.indexOf(b.dataset.frrm), 1); frChart(); syncFr(); }; });
    var cap = $("fr-cap");
    host.classList.toggle("teamline", !!TCOL[FSEL]); host.style.setProperty("--tc", cols[0]);
    if (keys.length === 1 && !smooth){
      var seasons = frRows(FSEL), narrow = host.getBoundingClientRect().width < 600;
      cap.textContent = "Team rating each season: points per game better than an average team of its era. Gold dots won the title. Click a season to open that team in the Time Machine.";
      if (seasons.length && window.CV.drawChart) window.CV.drawChart(host, seasons.map(function(t){ return {x: t[0], y: t[6], r: t}; }), {
        width: narrow ? 520 : 1040, height: narrow ? 340 : 280, label: "Team rating by season for " + F.name, yMin: -4, yMax: 4, line: true, r: seasons.length > 40 ? 4 : 5,
        xfmt: function(y){ return sl(y); }, hot: function(p){ return !!p.r[8]; },
        tip: function(p){ var t = p.r; return "<b>" + sl(t[0]) + " " + esc(t[3]) + "</b><br>" + (t[4] !== null ? t[4] + "–" + t[5] + " · " : "") + "rating " + sgn(t[6]) + (t[8] ? " · champion" : ""); },
        onClick: function(p){ CVR.go(CVR.build("teams", [k2u(key(p.r))])); }
      });
      return;
    }
    cap.textContent = (smooth ? "Each line is a centered 5-season average of team rating, so long eras stand out over single seasons. " : "Team rating each season. ") +
      "Gold dots won the title. Hover for every franchise's rating that season" + (keys.length > 1 ? "; click a season two of them played to open that matchup in the Time Machine." : ".");
    var series = keys.map(function(k, i){
      var rows = frRows(k);
      return {k: k, color: cols[i], pts: rows.map(function(t){
        var y = t[6];
        if (smooth){ var w = rows.filter(function(u){ return Math.abs(u[0] - t[0]) <= 2; }); y = w.reduce(function(a, u){ return a + u[6]; }, 0) / w.length; }
        return {x: t[0], y: y, r: t};
      })};
    });
    drawFr(host, series, smooth);
  }
  function drawFr(host, series, smooth){
    var NS = "http://www.w3.org/2000/svg";
    function sv(tag, a, par){ var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (par) par.appendChild(e); return e; }
    host.innerHTML = "";
    var narrow = host.getBoundingClientRect().width < 600, W = narrow ? 560 : 1040, H = narrow ? 380 : 300, m = {t: 16, r: narrow ? 50 : 56, b: 30, l: 38};
    var all = []; series.forEach(function(sr){ all = all.concat(sr.pts); });
    var xs = all.map(function(p){ return p.x; }), x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs); if (x0 === x1){ x0--; x1++; }
    var ys = all.map(function(p){ return p.y; }), yMin = Math.min(-4, Math.floor(Math.min.apply(null, ys) / 2) * 2), yMax = Math.max(4, Math.ceil(Math.max.apply(null, ys) / 2) * 2);
    var X = function(v){ return m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r); }, Y = function(v){ return m.t + (yMax - v) / (yMax - yMin) * (H - m.t - m.b); };
    var svgEl = sv("svg", {viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Team rating by season: " + series.map(function(sr){ return FR[sr.k].name; }).join(", ")}, host);
    var ax = sv("g", {"class": "axis"}, svgEl), step = (yMax - yMin) > 12 ? 4 : 2;
    for (var v = Math.ceil(yMin / step) * step; v <= yMax; v += step){
      sv("line", {x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), "class": v === 0 ? "baseline" : "gridline"}, ax);
      var tt = sv("text", {x: m.l - 8, y: Y(v) + 4, "text-anchor": "end"}, ax); tt.textContent = v;
    }
    var xstep = (x1 - x0) > 40 ? (narrow ? 20 : 10) : (narrow ? 8 : 4);
    for (var yx = Math.ceil(x0 / xstep) * xstep; yx <= x1; yx += xstep){ var tx = sv("text", {x: X(yx), y: H - 8, "text-anchor": "middle"}, ax); tx.textContent = sl(yx); }
    var xh = sv("line", {y1: m.t, y2: H - m.b, "class": "xhair", visibility: "hidden"}, svgEl), labels = [];
    series.forEach(function(sr){
      var g = sv("g", {"class": "teamline", style: "--tc:" + sr.color}, svgEl), d = "", prev = null;
      sr.pts.forEach(function(p){ d += (prev !== null && p.x - prev === 1 ? "L" : "M") + X(p.x).toFixed(1) + "," + Y(p.y).toFixed(1); prev = p.x; });
      sv("path", {d: d, "class": "sline", style: "stroke-width:2.5"}, g);
      sr.pts.forEach(function(p){ if (p.r[8]) sv("circle", {cx: X(p.x), cy: Y(p.y), r: 5, "class": "sdot title"}, g); });
      var last = sr.pts[sr.pts.length - 1]; if (last) labels.push({color: sr.color, k: sr.k, x: X(last.x), y: Y(last.y)});
    });
    labels.sort(function(a, b){ return a.y - b.y; });
    for (var i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 14) labels[i].y = labels[i - 1].y + 14;
    labels.forEach(function(L){ var g = sv("g", {"class": "teamline", style: "--tc:" + L.color}, svgEl); var t = sv("text", {x: L.x + 8, y: L.y + 4, "class": "slabel"}, g); t.textContent = L.k; });
    var tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; host.appendChild(tip);
    var hit = sv("rect", {x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, "class": "hit"}, svgEl);
    function at(clientX){ var box = svgEl.getBoundingClientRect(); return Math.round(x0 + ((clientX - box.left) / box.width * W - m.l) / (W - m.l - m.r) * (x1 - x0)); }
    function show(clientX){
      var xv = Math.max(x0, Math.min(x1, at(clientX))), box = svgEl.getBoundingClientRect(), hb = host.getBoundingClientRect();
      xh.setAttribute("x1", X(xv)); xh.setAttribute("x2", X(xv)); xh.setAttribute("visibility", "visible");
      var lines = series.map(function(sr){
        var p = sr.pts.filter(function(q){ return q.x === xv; })[0]; if (!p) return "";
        return "<span class='key teamline' style='--tc:" + sr.color + "'><i></i>" + esc(p.r[3]) + " <b>" + sgn(p.y) + "</b>" + (smooth ? " <span style='opacity:.7'>(that season " + sgn(p.r[6]) + ")</span>" : "") + (p.r[8] ? " · title" : "") + "</span>";
      }).filter(Boolean);
      tip.innerHTML = "<b>" + sl(xv) + "</b>" + (lines.length ? lines.join("") : "<span>No season</span>");
      if (narrow){ tip.style.whiteSpace = "normal"; tip.style.maxWidth = (hb.width - 8) + "px"; }
      tip.hidden = false;
      var left = box.left - hb.left + X(xv) / W * box.width, tw = tip.offsetWidth / 2 + 4;
      tip.style.left = Math.max(tw, Math.min(hb.width - tw, left)) + "px"; tip.style.top = (box.top - hb.top + 6) + "px"; tip.style.transform = "translate(-50%, 0)";
    }
    hit.addEventListener("pointermove", function(e){ show(e.clientX); });
    hit.addEventListener("pointerdown", function(e){ show(e.clientX); });
    hit.addEventListener("pointerleave", function(){ tip.hidden = true; xh.setAttribute("visibility", "hidden"); });
    hit.addEventListener("click", function(e){
      var xv = at(e.clientX), have = series.map(function(sr){ return sr.pts.filter(function(q){ return q.x === xv; })[0]; }).filter(Boolean);
      if (have.length >= 2) CVR.go(CVR.build("teams", [k2u(key(have[0].r)) + "," + k2u(key(have[1].r))]));
      else if (have.length === 1) CVR.go(CVR.build("teams", [k2u(key(have[0].r))]));
    });
  }

  // ---- events
  $("fr-sel").addEventListener("change", function(){ CVR.go(this.value ? CVR.build("franchises", [this.value]) : "#franchises"); });
  $("tm-play").addEventListener("click", function(){ if (T) play(); });
  document.addEventListener("click", function(e){
    var b = e.target.closest && e.target.closest("[data-roster]"); if (!b) return;
    var w = b.closest(".rosterwrap"), open = !w.classList.contains("open");
    w.classList.toggle("open", open); b.setAttribute("aria-expanded", String(open)); b.textContent = open ? "Top five only" : "Full roster (" + w.querySelectorAll("tbody tr").length + ")";
  });
  $("tm-rand").addEventListener("click", function(){
    if (!T) return; var pool = T.slice().sort(function(x, y){ return y[6] - x[6]; }).slice(0, 150);
    var i = Math.floor(Math.random() * pool.length), j; do { j = Math.floor(Math.random() * pool.length); } while (j === i);
    SEL.tm = [key(pool[i]), key(pool[j])]; picker("tm", 0); picker("tm", 1); renderTM();
  });
  $("tm-more").addEventListener("click", function(){ LIST.tm += 25; listTM(); });
  $("b3-more").addEventListener("click", function(){ LIST.b3 += 25; listB3(); });
  $("tm-lg").addEventListener("change", function(){ LG.tm = this.value; LIST.tm = 25; listTM(); });
  $("b3-lg").addEventListener("change", function(){ LG.b3 = this.value; LIST.b3 = 25; listB3(); });
  if ($("exh-list")) $("exh-list").addEventListener("click", function(e){ var b = e.target.closest("button[data-k]"); if (b) setSide("tm", +b.dataset.side, b.dataset.k); });
  $("tm-list").addEventListener("click", function(e){ var b = e.target.closest("button[data-k]"); if (b) setSide("tm", +b.dataset.side, b.dataset.k); });
  $("b3-list").addEventListener("click", function(e){ var b = e.target.closest("button[data-k]"); if (b) setSide("b3", +b.dataset.side, b.dataset.k); });
  $("dec-grid").addEventListener("click", function(e){ var b = e.target.closest("[data-dec]"); if (!b) return; DSEL = b.dataset.dec; renderDecades(); var el = $("dec-detail"); if (el.scrollIntoView) el.scrollIntoView({behavior: "smooth", block: "start"}); });
  var here = CVR.parse().page;
  if (here === "teams" || here === "big3" || here === "decades" || here === "franchises") CVR.apply();
})();

(function(){
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function f2(x){ return x === null || x === undefined ? "—" : x.toFixed(2); }
  // season rows: 0 id, 1 player, 2 season, 3 teams, 4 rs_g, 5 po_g, 6 q, 7 cv, 8 rs, 9 po, 10 champ, 11 rank
  // career rows: 0 id, 1 player, 2 first, 3 last, 4 seasons, 5 career cv, 6 rank, 7 best season, 8 best cv, 9 best team
  var R = [], CR = [], TBP = {}, P, DEF = {from: 1997, to: 2025};
  var S = {basis: "full", from: 1997, to: 2025, team: "all", text: "", q: true, champ: false, best: false, sort: null, dir: -1, shown: 50};
  var KEY = {full: 7, rs: 8, po: 9};
  var COLS = {
    season: [["#", null, "num"], ["Player", 1], ["Season", 2], ["Team", 3], ["CV", 7, "num"], ["RS", 8, "num"], ["PO", 9, "num"], ["G", 4, "num"], ["PO G", 5, "num"], ["", null]],
    career: [["#", null, "num"], ["Player", 1], ["Career", 2], ["Seasons", 4, "num"], ["Career CV", 5, "num"], ["Best season", 7], ["Best CV", 8, "num"]]
  };
  function load(){
    if (!P) P = fetch(window.CVR_ROOT + "data/wnba.json").then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); }).then(function(d){
      R = d.rows; CR = d.careers;
      R.forEach(function(r){ var s = TBP[r[0]] = TBP[r[0]] || {}; String(r[3]).split(/[^A-Z0-9]+/).forEach(function(t){ if (t) s[t] = 1; }); });
      var ys = {}, tms = {}; R.forEach(function(r){ ys[r[2]] = 1; String(r[3]).split(/[^A-Z0-9]+/).forEach(function(t){ if (t) tms[t] = 1; }); });
      ys = Object.keys(ys).map(Number).sort(function(a, b){ return a - b; }); DEF.from = ys[0]; DEF.to = ys[ys.length - 1];
      ys.forEach(function(y){ ["w-from", "w-to"].forEach(function(id){ var o = document.createElement("option"); o.value = y; o.textContent = y; $(id).appendChild(o); }); });
      Object.keys(tms).sort().forEach(function(t){ var o = document.createElement("option"); o.value = t; o.textContent = t; $("w-team").appendChild(o); });
      tops();
    }).catch(function(){ ["w-top", "w-po", "w-car", "w-body"].forEach(function(id){ $(id).innerHTML = "<tr><td colspan='9' class='status'>The WNBA file could not be loaded.</td></tr>"; }); });
    return P;
  }
  function tops(){
    var q = R.filter(function(r){ return r[6] && r[7] !== null; }).sort(function(a, b){ return b[7] - a[7]; }).slice(0, 10);
    $("w-top").innerHTML = q.map(function(r, i){ return "<tr><td class='rk'>" + (i + 1) + "</td><td class='player'>" + esc(r[1]) + "</td><td>" + r[2] + "</td><td class='num'>" + esc(r[3]) + "</td><td class='cv'>" + f2(r[7]) + "</td><td class='num'>" + f2(r[8]) + "</td><td class='num'>" + f2(r[9]) + "</td></tr>"; }).join("");
    var p = R.filter(function(r){ return r[9] !== null; }).sort(function(a, b){ return b[9] - a[9]; }).slice(0, 10);
    $("w-po").innerHTML = p.map(function(r, i){ return "<tr><td class='rk'>" + (i + 1) + "</td><td class='player'>" + esc(r[1]) + (r[10] ? " <span class='pill champ'>Champion</span>" : "") + "</td><td>" + r[2] + "</td><td class='num'>" + esc(r[3]) + "</td><td class='cv'>" + f2(r[9]) + "</td><td class='num'>" + f2(r[7]) + "</td><td class='num'>" + f2(r[8]) + "</td></tr>"; }).join("");
    $("w-car").innerHTML = CR.slice(0, 10).map(function(c){ return "<tr><td class='rk'>" + c[6] + "</td><td class='player'>" + esc(c[1]) + "</td><td>" + c[2] + "–" + c[3] + "</td><td class='cv'>" + f2(c[5]) + "</td><td>" + c[7] + " " + esc(c[9]) + "</td><td class='num'>" + f2(c[8]) + "</td></tr>"; }).join("");
  }
  function cr(){ return S.basis === "career"; }
  function rows(){
    var t = S.text.toLowerCase();
    if (cr()) return CR.filter(function(c){ return c[3] >= S.from && c[2] <= S.to && (!t || c[1].toLowerCase().indexOf(t) > -1) && (S.team === "all" || (TBP[c[0]] || {})[S.team]); });
    var k = KEY[S.basis];
    var out = R.filter(function(r){
      if (r[k] === null) return false;
      if (r[2] < S.from || r[2] > S.to) return false;
      if (S.basis !== "po" && S.q && !r[6]) return false;
      if (S.champ && !r[10]) return false;
      if (S.team !== "all" && String(r[3]).split(/[^A-Z0-9]+/).indexOf(S.team) < 0) return false;
      if (t && r[1].toLowerCase().indexOf(t) < 0) return false;
      return true;
    });
    if (S.best){ var seen = {}; out = out.slice().sort(function(a, b){ return b[k] - a[k]; }).filter(function(r){ if (seen[r[0]]) return false; seen[r[0]] = 1; return true; }); }
    return out;
  }
  function render(){
    var cols = cr() ? COLS.career : COLS.season, sk = S.sort !== null ? S.sort : (cr() ? 5 : KEY[S.basis]), d = S.dir;
    var list = rows().slice().sort(function(a, b){
      var x = a[sk], y = b[sk];
      if (x === null || x === undefined) return 1; if (y === null || y === undefined) return -1;
      if (typeof x === "string") return d * (x < y ? -1 : x > y ? 1 : 0);
      return d * (x - y);
    });
    $("w-head").innerHTML = cols.map(function(c){
      if (c[1] === null) return "<th class='" + (c[2] || "") + "'>" + c[0] + "</th>";
      var on = c[1] === sk;
      return "<th class='sort " + (c[2] || "") + "'" + (on ? " aria-sort='" + (d < 0 ? "descending" : "ascending") + "'" : "") + "><button type='button' data-wk='" + c[1] + "'>" + c[0] + "</button></th>";
    }).join("");
    var shown = list.slice(0, S.shown);
    $("w-body").innerHTML = shown.length ? shown.map(function(r, i){
      if (cr()) return "<tr><td class='rk'>" + (i + 1) + "</td><td class='player'>" + esc(r[1]) + "</td><td>" + r[2] + "–" + r[3] + "</td><td class='num'>" + r[4] + "</td><td class='cv'>" + f2(r[5]) + "</td><td>" + r[7] + " " + esc(r[9]) + "</td><td class='num'>" + f2(r[8]) + "</td></tr>";
      var hi = KEY[S.basis];
      return "<tr><td class='rk'>" + (i + 1) + "</td><td class='player'>" + esc(r[1]) + "</td><td>" + r[2] + "</td><td class='num'>" + esc(r[3]) + "</td>" +
        [7, 8, 9].map(function(j){ return "<td class='" + (j === hi ? "cv" : "num") + "'>" + f2(r[j]) + "</td>"; }).join("") +
        "<td class='num'>" + r[4] + "</td><td class='num'>" + (r[5] === null ? "—" : r[5]) + "</td><td>" + (r[10] ? "<span class='pill champ'>Champion</span>" : (r[5] === null ? "<span class='wsub'>Missed playoffs</span>" : "")) + "</td></tr>";
    }).join("") : "<tr><td colspan='10' class='status'>No seasons match these filters.</td></tr>";
    $("w-count").textContent = list.length.toLocaleString() + (cr() ? " careers" : S.basis === "po" ? " postseasons" : " seasons");
    $("w-more").hidden = list.length <= S.shown;
    document.querySelectorAll("[data-wb]").forEach(function(b){ b.setAttribute("aria-pressed", b.dataset.wb === S.basis ? "true" : "false"); });
    ["w-qual", "w-champ", "w-best"].forEach(function(id){ $(id).parentNode.style.display = cr() ? "none" : ""; });
    $("w-qual").parentNode.style.display = cr() || S.basis === "po" ? "none" : "";
    $("w-from").value = S.from; $("w-to").value = S.to; $("w-team").value = S.team; $("w-qual").checked = S.q; $("w-champ").checked = S.champ; $("w-best").checked = S.best;
    if ($("w-search").value !== S.text) $("w-search").value = S.text;
    window.CVR.replace("wnba", [], {score: S.basis === "full" ? "" : S.basis, from: S.from !== DEF.from ? S.from : "", to: S.to !== DEF.to ? S.to : "", team: S.team !== "all" ? S.team : "",
      all: S.q ? "" : "1", champ: S.champ ? "1" : "", best: S.best ? "1" : "", p: S.text, sort: S.sort !== null ? S.sort : "", dir: S.sort !== null && S.dir > 0 ? "asc" : ""});
  }
  function fromParams(p){
    S.basis = ({rs: "rs", po: "po", career: "career"})[p.score] || "full";
    S.from = +p.from || DEF.from; S.to = +p.to || DEF.to; S.team = p.team || "all"; S.text = p.p || "";
    S.q = p.all !== "1"; S.champ = p.champ === "1"; S.best = p.best === "1";
    S.sort = p.sort !== undefined && p.sort !== "" ? +p.sort : null; S.dir = p.dir === "asc" ? 1 : -1; S.shown = 50;
  }
  window.CVR.on("wnba", function(args, params){ load().then(function(){ if (!R.length) return; fromParams(params); render(); }); });
  document.querySelectorAll("[data-wb]").forEach(function(b){ b.addEventListener("click", function(){ S.basis = b.dataset.wb; S.sort = null; S.dir = -1; S.shown = 50; render(); }); });
  document.querySelectorAll("[data-wgo]").forEach(function(a){ a.addEventListener("click", function(e){ e.preventDefault(); S.basis = a.dataset.wgo; S.sort = null; S.dir = -1; S.shown = 50; render(); var el = $("w-all"); if (el.scrollIntoView) el.scrollIntoView({behavior: "smooth", block: "start"}); }); });
  $("w-head").addEventListener("click", function(e){ var b = e.target.closest("button[data-wk]"); if (!b) return; var k = +b.dataset.wk, cur = S.sort !== null ? S.sort : (cr() ? 5 : KEY[S.basis]); if (k === cur) S.dir = -S.dir; else { S.sort = k; S.dir = typeof (R[0] || [])[k] === "string" ? 1 : -1; } S.shown = 50; render(); });
  $("w-from").addEventListener("change", function(){ S.from = +this.value; if (S.to < S.from) S.to = S.from; S.shown = 50; render(); });
  $("w-to").addEventListener("change", function(){ S.to = +this.value; if (S.from > S.to) S.from = S.to; S.shown = 50; render(); });
  $("w-team").addEventListener("change", function(){ S.team = this.value; S.shown = 50; render(); });
  $("w-search").addEventListener("input", function(){ S.text = this.value.trim(); S.shown = 50; render(); });
  $("w-qual").addEventListener("change", function(){ S.q = this.checked; S.shown = 50; render(); });
  $("w-champ").addEventListener("change", function(){ S.champ = this.checked; S.shown = 50; render(); });
  $("w-best").addEventListener("change", function(){ S.best = this.checked; S.shown = 50; render(); });
  $("w-more").addEventListener("click", function(){ S.shown += 50; render(); });
  if (window.CVR.parse().page === "wnba") window.CVR.apply();
})();

// ---- Court Value 82: spin a team, take one player, fill five spots, play 82 games ----
(function(){
  var CVR = window.CVR;
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function sl(y){ return (y - 1) + "–" + String(y).slice(-2); }
  function sgn(x){ return (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(1); }
  function phi(z){ var t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
  var POS = ["PG", "SG", "SF", "PF", "C"], SLOPE = 3.465, SHARE = 34 / 240, LAUNCH = Date.UTC(2026, 9, 19), GAMES = 82;
  var TEAMS = null, POOL = [], CENTER = {}, META = null, RATINGS = [], loadP = null, RI = 13;

  // seeded random numbers, so today's game is the same for everyone
  function seedFrom(str){ var h = 1779033703 ^ str.length; for (var i = 0; i < str.length; i++){ h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^ h >>> 16) >>> 0; }
  function rng(str){ var a = seedFrom(str); return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(r){ var u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function today(){ var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function dayNo(s){ var p = s.split("-").map(Number); return Math.floor((Date.UTC(p[0], p[1] - 1, p[2]) - LAUNCH) / 864e5) + 1; }
  function store(k, v){ try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch(e){ return null; } }

  function load(){
    if (!loadP) loadP = fetch(window.CVR_ROOT + "data/teams.json").then(function(r){ return r.json(); }).then(function(d){
      META = d.meta; TEAMS = d.rows; RI = META.fields.indexOf("roster");
      var acc = {};
      TEAMS.forEach(function(t){
        var ro = t[RI].filter(function(p){ return p[4] !== null && p[4] !== undefined; }), sh = 0, x = 0;
        ro.forEach(function(p){ sh += p[3] / 100; x += p[3] / 100 * p[4]; });
        if (sh){ var k = t[0] + "|" + t[1]; (acc[k] = acc[k] || []).push(x / sh); }
        var tg = Math.max.apply(null, t[RI].map(function(p){ return p[2] || 0; }).concat([1]));
        var el = ro.filter(function(p){ return p[1] && p[3] >= 5 && p[2] >= 0.5 * tg; }).sort(function(a, b){ return b[3] - a[3]; });
        if (el.length >= 5) POOL.push({t: t, el: el});
      });
      Object.keys(acc).forEach(function(k){ CENTER[k] = acc[k].reduce(function(a, b){ return a + b; }, 0) / acc[k].length; });
      RATINGS = TEAMS.map(function(t){ return t[6]; }).filter(function(x){ return x !== null; }).sort(function(a, b){ return b - a; });
    });
    return loadP;
  }

  // ---- state ----
  var G = null, rolling = null;
  function fresh(mode){
    var day = today(), seed = mode === "daily" ? "daily|" + day : "free|" + Date.now() + "|" + Math.random();
    return {mode: mode, day: day, no: dayNo(day), seed: seed, spin: 0, rr: {year: 1, team: 1}, picks: [null, null, null, null, null], cur: null, pending: null, used: [], result: null};
  }
  function save(){ if (G && G.mode === "daily") store("cv82:" + G.day, {spin: G.spin, rr: G.rr, picks: G.picks, cur: G.cur, used: G.used, result: G.result}); }
  function start(mode){
    G = fresh(mode);
    if (mode === "daily"){ var s = store("cv82:" + G.day); if (s){ G.spin = s.spin; G.rr = s.rr || {year: 1, team: 1}; G.picks = s.picks; G.cur = s.cur; G.used = s.used || []; G.result = s.result; } }
    document.querySelectorAll(".g-mode").forEach(function(b){ b.setAttribute("aria-pressed", b.dataset.mode === mode ? "true" : "false"); });
    $("g-label").textContent = mode === "daily" ? "Today's game · #" + G.no : "Free play";
    $("g-result").innerHTML = "";
    draw();
    if (G.result) showResult(false);
  }
  function openSlots(){ return G.picks.map(function(p, i){ return p ? -1 : i; }).filter(function(i){ return i >= 0; }); }
  function fits(pos){ var k = POS.indexOf(pos); return openSlots().filter(function(i){ return Math.abs(i - k) <= 1; }); }
  function taken(name){ return G.picks.some(function(p){ return p && p.name === name; }); }
  function pickable(entry){ return entry.el.some(function(p){ return !taken(p[0]) && fits(p[1]).length; }); }
  // the n-th spin of a game depends only on the seed and n, so everyone sees the same teams today
  function spinAt(n){ var r = rng(G.seed + "|spin|" + n); return POOL[Math.floor(r() * POOL.length)]; }
  function spin(){
    if (G.cur !== null) return;
    var n = G.spin, e = spinAt(n), guard = 0;
    while ((!pickable(e) || G.used.indexOf(e.t[0] + "|" + e.t[1] + "|" + e.t[2]) > -1) && guard++ < 400){ n++; e = spinAt(n); }
    G.spin = n + 1; land(e, POOL);
  }
  function keyOf(t){ return t[0] + "|" + t[1] + "|" + t[2]; }
  // show the new team, after a quick slot-machine roll through the teams it could have been
  function land(e, from){
    G.cur = POOL.indexOf(e); G.used.push(keyOf(e.t)); G.pending = null; save();
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || from.length < 2){ draw(); return; }
    var t0 = Date.now(), box;
    rolling = true; draw(); box = $("g-team");
    (function tick(){
      var el = Date.now() - t0;
      if (el > 750){ rolling = null; draw(); return; }
      var x = from[Math.floor(Math.random() * from.length)].t;
      box.innerHTML = "<b>" + esc(sl(x[0]) + " " + x[3]) + "</b><small>&nbsp;</small>";
      setTimeout(tick, 45 + el / 12);
    })();
  }
  // once a game each: another season of the same franchise, or another team from the same season
  function rerollOptions(kind){
    if (G.cur === null) return [];
    var t = POOL[G.cur].t, fi = META.fields.indexOf("franchise");
    return POOL.filter(function(x){
      var u = x.t;
      if (G.used.indexOf(keyOf(u)) > -1 || !pickable(x)) return false;
      return kind === "year" ? u[fi] === t[fi] && u[0] !== t[0] : u[0] === t[0] && keyOf(u) !== keyOf(t);
    });
  }
  function reroll(kind){
    var opts = rerollOptions(kind); if (!opts.length || !(G.rr[kind] > 0)) return;
    var r = rng(G.seed + "|" + kind + "|" + G.spin + "|" + keyOf(POOL[G.cur].t));
    G.rr[kind]--;
    land(opts[Math.floor(r() * opts.length)], opts);
  }
  function choose(i){
    var e = POOL[G.cur], p = e.el[i]; if (!p || taken(p[0])) return;
    var f = fits(p[1]); if (!f.length) return;
    G.pending = i;
    if (f.length === 1) place(f[0]);
    else { draw(); if (window.innerWidth < 780) $("g-five").scrollIntoView({behavior: "smooth", block: "start"}); }
  }
  function place(slot){
    if (G.pending === null) return;
    var e = POOL[G.cur], p = e.el[G.pending], t = e.t;
    if (fits(p[1]).indexOf(slot) < 0) return;
    G.picks[slot] = {name: p[0], pos: p[1], g: p[2], rs: p[4], cv: p[5], season: t[0], lg: t[1], team: t[2], tname: t[3]};
    G.cur = null; G.pending = null; save(); draw();
    if (window.innerWidth < 780){ var d = $("g-desk"); var y = d.getBoundingClientRect().top; if (y < 0 || y > window.innerHeight * 0.6) d.scrollIntoView({behavior: "smooth", block: "center"}); }
  }

  // ---- the season ----
  function rating(picks){
    var num = 0, cen = 0;
    picks.forEach(function(p){ num += SHARE * p.rs; cen += CENTER[p.season + "|" + p.lg] || 0; });
    return SLOPE * (num - cen / picks.length);
  }
  function simulate(){
    var R = rating(G.picks), sr = rng(G.seed + "|schedule"), opp = [], real = TEAMS.filter(function(t){ return t[6] !== null; });
    for (var i = 0; i < GAMES; i++) opp.push(real[Math.floor(sr() * real.length)]);
    var gr = rng(G.seed + "|games|" + G.picks.map(function(p){ return p.name + p.season; }).join(",")), games = [], exp = 0;
    opp.forEach(function(o, i){
      var home = i % 2 === 0, h = META.home * (home ? 1 : -1), pw = phi((R - o[6] + h) / META.game_sd);
      var m = R - o[6] + h + META.game_sd * gauss(gr);
      if (Math.abs(m) < 0.5) m = (gr() < pw ? 1 : -1) * (1 + Math.floor(gr() * 5));   // overtime
      exp += pw;
      games.push([o[0], o[1], o[2], Math.round(m) || (m > 0 ? 1 : -1), home ? 1 : 0]);
    });
    var w = games.filter(function(g){ return g[3] > 0; }).length;
    G.result = {rating: R, w: w, l: GAMES - w, exp: exp, games: games};
    save();
    draw();
    showResult(true);
  }
  // find the player's id from the season scores (loaded by the main app) so picks link to player pages
  function pidOf(p){ var ids = (window.CVNAMES && window.CVNAMES[p.name]) || []; if (ids.length === 1) return ids[0];
    for (var i = 0; i < ids.length; i++){ var rows = (window.CVBYID || {})[ids[i]] || []; if (rows.some(function(r){ return r[2] === p.season; })) return ids[i]; } return ids[0] || ""; }
  function tier(rs){ return rs >= 12 ? 5 : rs >= 8 ? 4 : rs >= 6 ? 3 : rs >= 4 ? 2 : 1; }
  var SQ = {5: "🟥", 4: "🟧", 3: "🟨", 2: "🟩", 1: "⬜"};
  function teamBy(s, lg, a){ for (var i = 0; i < TEAMS.length; i++){ var t = TEAMS[i]; if (t[0] === s && t[1] === lg && t[2] === a) return t; } return null; }
  function showResult(animate){
    var r = G.result, host = $("g-result"), rank = RATINGS.filter(function(x){ return x > r.rating; }).length + 1;
    var wins = r.games.filter(function(g){ return g[3] > 0; }), losses = r.games.filter(function(g){ return g[3] < 0; });
    var bestWin = wins.slice().sort(function(a, b){ return teamBy(b[0], b[1], b[2])[6] - teamBy(a[0], a[1], a[2])[6]; })[0];
    var worstLoss = losses.slice().sort(function(a, b){ return teamBy(a[0], a[1], a[2])[6] - teamBy(b[0], b[1], b[2])[6]; })[0];
    var streak = 0, run = 0; r.games.forEach(function(g){ run = g[3] > 0 ? run + 1 : 0; streak = Math.max(streak, run); });
    function tl(g){ var t = teamBy(g[0], g[1], g[2]); return "<a class='tlink' href='" + CVR.build("teams", [g[0] + "-" + g[1] + "-" + g[2]]) + "'>" + esc(sl(t[0]) + " " + t[3]) + "</a> (" + sgn(t[6]) + ")"; }
    var verdict = r.w === 82 ? "Perfect. 82–0." : r.w >= 74 ? "Better than the 73–9 Warriors." : r.w >= 72 ? "A ’96 Bulls kind of season." : r.w >= 60 ? "A title favorite." : r.w >= 50 ? "A playoff team." : r.w >= 41 ? "Somewhere in the middle." : "Back to the lottery.";
    var h = "<div class='card g-res'><span class='eyebrow'>" + (G.mode === "daily" ? "Today's game · #" + G.no : "Free play") + "</span>" +
      "<div class='g-score'><b id='g-rec'>" + (animate ? "0–0" : r.w + "–" + r.l) + "</b><span>" + esc(verdict) + "<br>Team rating " + sgn(r.rating) + " · would rank #" + rank.toLocaleString() + " of " + RATINGS.length.toLocaleString() + " real teams · expected " + Math.round(r.exp) + " wins</span></div>" +
      "<div class='g-grid' id='g-grid' aria-hidden='true'>" + r.games.map(function(g){ return "<i" + (animate ? "" : " class='" + (g[3] > 0 ? "w" : "l") + "'") + "></i>"; }).join("") + "</div>" +
      "<ul class='g-facts'>" +
        "<li><b>Longest win streak</b>" + streak + " games</li>" +
        (bestWin ? "<li><b>Best win</b>Beat the " + tl(bestWin) + " by " + bestWin[3] + "</li>" : "") +
        (worstLoss ? "<li><b>Worst loss</b>Lost to the " + tl(worstLoss) + " by " + (-worstLoss[3]) + "</li>" : "<li><b>Worst loss</b>None.</li>") +
      "</ul>" +
      "<div style='margin-top:22px;border-top:3px solid var(--ink)'><table class='g-picks' style='width:100%'><thead><tr><th>Pos</th><th>Player</th><th class='num'>RS</th><th></th></tr></thead><tbody>" +
      G.picks.map(function(p, i){ return "<tr><td class='mono'>" + POS[i] + "</td><td class='player'>" + (pidOf(p) ? "<a class='plink' href='" + CVR.build("player", [pidOf(p), String(p.season)]) + "'>" + esc(p.name) + "</a>" : esc(p.name)) + "<small>" + sl(p.season) + " " + esc(p.team) + " · " + p.g + " G</small></td><td class='num rs'>" + p.rs.toFixed(2) + "</td><td><span class='g-chip t" + tier(p.rs) + "'>" + ["", "under 4", "All-Star", "All-NBA", "MVP range", "All-time"][tier(p.rs)] + "</span></td></tr>"; }).join("") +
      "</tbody></table></div>" +
      "<div class='g-actions'><button type='button' class='g-big' id='g-share'>Share result</button>" +
      "<button type='button' class='btn secondary' id='g-again'>" + (G.mode === "daily" ? "Free play" : "Play again") + "</button></div>" +
      (G.mode === "daily" ? "<p class='g-done'>A new game every day. Come back tomorrow for #" + (G.no + 1) + ".</p>" : "") + "</div>";
    host.innerHTML = h;
    $("g-share").addEventListener("click", share);
    $("g-again").addEventListener("click", function(){ CVR.replace("play", [], {mode: "free"}); start("free"); window.scrollTo({top: $("play").offsetTop, behavior: "smooth"}); });
    if (animate){
      var cells = $("g-grid").children, i = 0, w = 0, reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      host.scrollIntoView && host.scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "start"});
      (function step(){
        var n = reduce ? GAMES : Math.min(GAMES, i + 2);
        for (; i < n; i++){ var win = r.games[i][3] > 0; if (win) w++; cells[i].className = win ? "w" : "l"; }
        $("g-rec").textContent = w + "–" + (i - w);
        if (i < GAMES) setTimeout(step, 40);
      })();
    }
  }
  function share(){
    var r = G.result, url = CVR.root + "play/";
    var txt = "Court Value 82" + (G.mode === "daily" ? " #" + G.no : " (free play)") + "\n" + r.w + "–" + r.l + " · rating " + sgn(r.rating) + "\n" +
      G.picks.map(function(p, i){ return POS[i] + " " + SQ[tier(p.rs)]; }).join(" ") + "\n" + url;
    var btn = $("g-share");
    function done(){ btn.textContent = "Copied"; setTimeout(function(){ btn.textContent = "Share result"; }, 1800); }
    if (navigator.share && matchMedia("(pointer:coarse)").matches){ navigator.share({text: txt}).catch(function(){}); return; }
    try { navigator.clipboard.writeText(txt).then(done, function(){ prompt("Copy your result:", txt); }); } catch(e){ prompt("Copy your result:", txt); }
  }

  // ---- drawing ----
  function draw(){
    var e = G.cur !== null ? POOL[G.cur] : null, pend = e && G.pending !== null ? e.el[G.pending] : null, ok = pend ? fits(pend[1]) : [];
    $("g-five").innerHTML = POS.map(function(pos, i){
      var p = G.picks[i];
      if (p) return "<div class='g-slot'><span class='pos'>" + pos + "</span><span class='nm'>" + (function(n){ var k = n.lastIndexOf(" "); return k > 0 ? "<span class='fn'>" + esc(n.slice(0, k)) + " </span>" + esc(n.slice(k + 1)) : esc(n); })(p.name) + "</span><span class='tm'>" + sl(p.season) + " " + esc(p.team) + "</span>" +
        (G.result ? "<span class='sq t" + tier(p.rs) + "' title='RS " + p.rs.toFixed(2) + "'></span>" : "") + "</div>";
      var f = ok.indexOf(i) > -1;
      return "<button type='button' class='g-slot empty" + (f ? " fits" : "") + "' data-slot='" + i + "'" + (f ? "" : " disabled") + " aria-label='" + pos + (f ? ": put " + esc(pend[0]) + " here" : ": open") + "'><span class='pos'>" + pos + "</span><span class='q'>?</span></button>";
    }).join("");
    var desk = $("g-desk"), done = G.picks.every(Boolean);
    if (G.result){ desk.hidden = true; return; }
    desk.hidden = false;
    if (done){
      desk.innerHTML = "<div class='spinrow'><div class='g-team'><b>Your five are set.</b><small>Ratings are revealed once the season starts.</small></div><button type='button' class='g-big' id='g-sim'>Play 82 games</button></div>";
      $("g-sim").addEventListener("click", simulate);
      return;
    }
    var left = openSlots().length;
    if (!e){
      desk.innerHTML = "<div class='spinrow'><div class='g-team'><b>" + (left === 5 ? "Spin for your first team." : "Spin for pick " + (6 - left) + " of 5.") + "</b><small>Open: " + openSlots().map(function(i){ return POS[i]; }).join(", ") + "</small></div><button type='button' class='g-big' id='g-spin'>Spin</button></div>";
      $("g-spin").addEventListener("click", spin);
      return;
    }
    var t = e.t, rec = t[4] !== null ? t[4] + "–" + t[5] + (t[8] ? " · champions" : "") : (t[8] ? "champions" : "");
    desk.innerHTML = "<div class='spinrow'><div class='g-team" + (rolling ? " rolling" : "") + "' id='g-team'><b>" + esc(sl(t[0]) + " " + t[3]) + "</b><small>" + (t[1] === 1 ? "ABA · " : "") + esc(rec) + "</small></div>" +
      (rolling ? "" : "<div class='g-rr'>" + [["year", "Change year", "Same franchise, another season"], ["team", "Change team", "Same season, another team"]].map(function(k){
        var n = G.rr[k[0]] || 0, ok = n > 0 && rerollOptions(k[0]).length;
        return "<button type='button' class='g-reroll' data-rr='" + k[0] + "'" + (ok ? "" : " disabled") + " title='" + k[2] + "'><b>↻ " + k[1] + "</b><small>" + (n > 0 ? (ok ? k[2] : "none left to pick from") : "used") + "</small></button>";
      }).join("") + "</div>") + "</div>" +
      (rolling ? "" : "<ul class='g-roster'>" + e.el.map(function(p, i){
        var can = !taken(p[0]) && fits(p[1]).length;
        return "<li><button type='button' data-i='" + i + "'" + (can ? "" : " disabled") + (G.pending === i ? " aria-pressed='true'" : "") + ">" + esc(p[0]) + "<small>" + p[1] + " · " + p[2] + " G</small></button></li>";
      }).join("") + "</ul><p class='g-hint'>" + (pend ? "Now pick a highlighted spot for " + esc(pend[0]) + "." : "Take one player. He can play his position or the one next to it.") + "</p>");
    if (!rolling){
      desk.querySelector(".g-rr").addEventListener("click", function(ev){ var b = ev.target.closest("button[data-rr]"); if (b && !b.disabled) reroll(b.dataset.rr); });
      desk.querySelector(".g-roster").addEventListener("click", function(ev){ var b = ev.target.closest("button[data-i]"); if (b && !b.disabled) choose(+b.dataset.i); });
    }
  }
  $("g-five").addEventListener("click", function(ev){ var b = ev.target.closest("button[data-slot]"); if (b && !b.disabled) place(+b.dataset.slot); });
  document.querySelectorAll(".g-mode").forEach(function(b){ b.addEventListener("click", function(){ CVR.replace("play", [], {mode: b.dataset.mode === "free" ? "free" : ""}); start(b.dataset.mode); }); });
  var promo = $("g-promo-no"); if (promo) promo.textContent = "#" + dayNo(today());

  CVR.on("play", function(args, params){
    load().then(function(){
      var mode = params.mode === "free" ? "free" : "daily";
      if (!G || G.mode !== mode || (mode === "daily" && G.day !== today())) start(mode);
    });
  });
  if (CVR.parse().page === "play") CVR.apply();
})();

  }
  fetch(window.CVR_ROOT + "assets/shell.html" + (V ? "?v=" + V : "")).then(function(r){ return r.text(); }).then(function(html){
    var app = document.getElementById("app");
    app.outerHTML = html;
    document.documentElement.classList.add("ready");
    boot();
  });
})();
