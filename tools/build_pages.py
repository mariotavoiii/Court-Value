#!/usr/bin/env python3
"""Build the site's pages: one small HTML file per address, so every player, team and franchise
has a real URL with its own title, description and link-preview card.

    python3 tools/build_pages.py                 # uses tools/site.json
    python3 tools/build_pages.py --url https://courtvalue.com/

The app itself lives in docs/assets/ (app.js, app.css, shell.html). Each page only carries the
<head> (title, description, preview card), a plain-text summary for search engines and link
previews, and the two asset tags. Reads only the published files in docs/data/.

When the site moves to its own domain: run with --url https://yourdomain/ (this also writes
docs/CNAME), commit, and set the same domain under GitHub > Settings > Pages.
"""
import argparse, hashlib, html, json, os, shutil, sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(os.path.dirname(HERE), "docs")
CFG = json.load(open(os.path.join(HERE, "site.json")))
ap = argparse.ArgumentParser()
ap.add_argument("--url", default=CFG["url"])
URL = ap.parse_args().url.rstrip("/") + "/"
if URL != CFG["url"]:
    # moving the site: point the README, citation and archive metadata at the new address too
    for f in ("README.md", "CITATION.cff", ".zenodo.json"):
        p = os.path.join(os.path.dirname(HERE), f)
        if os.path.exists(p):
            t = open(p, encoding="utf-8").read()
            open(p, "w", encoding="utf-8").write(t.replace(CFG["url"], URL))
    CFG["url"] = URL
    json.dump(CFG, open(os.path.join(HERE, "site.json"), "w"), indent=2)
ROOTPATH = "/" + URL.split("://", 1)[1].split("/", 1)[1] if URL.count("/") > 3 else "/"

E = lambda s: html.escape(str(s), quote=True)
def season(y): return f"{y - 1}–{str(y)[-2:]}"
def f2(x): return "—" if x is None else f"{x:.2f}"
def sgn(x): return ("+" if x >= 0 else "−") + f"{abs(x):.1f}"
def J(name): return json.load(open(os.path.join(DOCS, "data", name), encoding="utf-8"))

h = hashlib.sha1()
for f in ("app.js", "app.css", "shell.html"):
    h.update(open(os.path.join(DOCS, "assets", f), "rb").read())
V = h.hexdigest()[:10]

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap">')

pages = []   # (path, lastmod-ish priority)


def card(path_img):
    return os.path.exists(os.path.join(DOCS, path_img))


def write(path, title, desc, body, image="img/og-home.png", alt=None, kind="website", priority="0.5", base=None):
    """path: '' for home, 'players/jordami01/' for a folder page, '404.html' for a file."""
    depth = path.count("/") if path.endswith("/") else 0
    base = base or ("../" * depth if depth else "./")
    canonical = URL + path if path != "404.html" else URL
    full_title = title if title.endswith("Court Value") else f"{title} · Court Value"
    img = URL + image
    doc = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<base href="{E(base)}">
<title>{E(full_title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{E(canonical)}">
<meta name="theme-color" content="#fbfbf8">
<link rel="icon" href="favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="img/favicon-32.png"><link rel="apple-touch-icon" href="img/apple-touch-icon.png">
<meta property="og:type" content="{kind}"><meta property="og:site_name" content="Court Value">
<meta property="og:title" content="{E(full_title)}"><meta property="og:description" content="{E(desc)}"><meta property="og:url" content="{E(canonical)}">
<meta property="og:image" content="{E(img)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{E(alt or title)}">
<meta name="twitter:card" content="summary_large_image">
{FONTS}
<link rel="stylesheet" href="assets/app.css?v={V}">
<link rel="preload" href="assets/shell.html?v={V}" as="fetch" crossorigin>
<script>document.documentElement.className="js";setTimeout(function(){{document.documentElement.classList.add("ready")}},5000)</script>
<script src="assets/app.js?v={V}" defer></script>
</head><body>
<main id="app" class="wrap seo">
<p><a href="./">Court Value</a></p>
{body}
</main>
</body></html>
"""
    out = os.path.join(DOCS, path + "index.html" if (path == "" or path.endswith("/")) else path)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write(doc)
    if path != "404.html":
        pages.append((path, priority))


# ---------------------------------------------------------------- data
S = J("scores.json"); SF = S["meta"]["fields"]; SROWS = S["rows"]
C = J("careers.json"); CROWS = C["rows"]
T = J("teams.json"); TF = T["meta"]["fields"]; TROWS = T["rows"]
FR = J("franchises.json")["franchises"]
DEC = J("decades.json")["decades"]
NCAREERS = len(CROWS)
by_player = {}
for r in SROWS: by_player.setdefault(r[0], []).append(r)
career = {r[0]: r for r in CROWS}

# ---------------------------------------------------------------- clean out old generated pages
for d in ("players", "time-machine", "franchises", "decades", "rankings", "compare", "big3", "wnba", "about", "downloads", "contact", "play"):
    p = os.path.join(DOCS, d)
    if os.path.isdir(p): shutil.rmtree(p)

# ---------------------------------------------------------------- home + sections
HOME_DESC = "One number for every NBA and ABA player-season since 1952, measured the same way. Rankings, careers, franchise histories, and a Time Machine that plays any two teams from any two eras."
top = sorted([r for r in SROWS if r[13] is not None and r[13] <= 10], key=lambda r: r[13])
write("", "Court Value: every NBA and ABA season, on one scale", HOME_DESC,
      "<h1>Every NBA and ABA season, on one scale.</h1><p>" + E(HOME_DESC) + "</p><h2>The ten best seasons</h2><ol>" +
      "".join(f'<li><a href="players/{r[0]}/?at={r[2]}">{E(r[1])}</a>, {season(r[2])} {E(r[4])}: {f2(r[9])}</li>' for r in top) + "</ol>"
      "<p><a href=\"rankings/\">All rankings</a> · <a href=\"time-machine/\">Time Machine</a> · <a href=\"franchises/\">Franchises</a> · <a href=\"wnba/\">WNBA</a> · <a href=\"about/\">How it works</a></p>",
      alt="Court Value: every season, on one scale. A ruler from 0 to 16 marking Russell, Jokić, Wilt, Jordan and Shaq.", priority="1.0")

SECTIONS = [
    ("rankings/", "Every NBA and ABA season, ranked", "Every qualified NBA and ABA player-season since 1952 ranked by Court Value: season CV, regular season, playoffs and careers. Filter by team, position, era and league.", "img/og/players.png"),
    ("rankings/teams/", "The best NBA and ABA teams of all time", "Every NBA and ABA team-season since 1952 rated on one scale: points per game better than an average team of its own era, regular season and playoffs.", "img/og/teams.png"),
    ("compare/", "Compare players", "Put up to five NBA and ABA careers side by side, season by season, on the same Court Value scale.", "img/og/players.png"),
    ("time-machine/", "The Time Machine: any two teams, any two eras", "Pick two NBA or ABA team-seasons from any eras and play them in a best-of-seven. Series odds from Court Value team ratings.", "img/og/teams.png"),
    ("big3/", "The best Big 3s in NBA history", "Every team's three best qualified seasons by Court Value, added up, and the best trios of all time.", "img/og/teams.png"),
    ("decades/", "The best players and teams of every decade", "All-Decade teams and the best players and teams of each decade from the 1950s to the 2020s, by Court Value.", "img/og/teams.png"),
    ("franchises/", "Franchise histories", "Every NBA franchise's history on one scale: its best players, best seasons, titles and team ratings since 1952.", "img/og/teams.png"),
    ("wnba/", "WNBA: every season since 1997, on one scale", "Every WNBA player-season since 1997 rated by the same Court Value rules, with its own list and career rankings.", "img/og/wnba.png"),
    ("about/", "How Court Value works", "How Court Value turns a season into a number: the box score, the load a player carried, team results with and without him, defense and the playoffs. Measured the same way since 1952.", "img/og/about.png"),
    ("downloads/", "Download the data", "Court Value scores for every NBA, ABA and WNBA player-season and career, free to use under CC BY 4.0.", "img/og/about.png"),
    ("contact/", "Contact", "Questions, corrections and arguments about Court Value.", "img/og/about.png"),
]
for path, title, desc, img in SECTIONS:
    write(path, title, desc, f"<h1>{E(title)}</h1><p>{E(desc)}</p>", image=img if card(img) else "img/og-home.png", priority="0.8")

# ---------------------------------------------------------------- players
POS = {"PG": "point guard", "SG": "shooting guard", "SF": "small forward", "PF": "power forward", "C": "center"}
for pid, rows in by_player.items():
    rows = sorted(rows, key=lambda r: (r[2], r[3]))
    name, first, last = rows[0][1], rows[0][2], rows[-1][2]
    q = [r for r in rows if r[7]]
    best = max(q or rows, key=lambda r: r[9])
    teams = []
    for r in rows:
        for t in str(r[4]).split(","):
            t = t.strip()
            if t and t not in teams and t != "TOT": teams.append(t)
    titles = sum(1 for r in rows if r[17])
    cr = career.get(pid)
    from collections import Counter
    pos = (cr[16] if cr and cr[16] else (Counter(r[16] for r in rows if r[16]).most_common(1) or [("", 0)])[0][0]) or ""
    span = f"{season(first)} to {season(last)}" if first != last else season(first)
    bits = []
    if cr and cr[9] is not None:
        bits.append(f"Career CV {cr[9]:.2f}, #{cr[12]:,} of {NCAREERS:,} careers")
    bits.append(f"best season {season(best[2])} ({best[9]:.2f}" + (f", #{best[13]:,} all time" if best[7] and best[13] else "") + ")")
    if titles: bits.append(f"{titles} title{'s' if titles > 1 else ''}")
    desc = f"{name}, {span}{', ' + pos if pos else ''}: " + "; ".join(bits) + ". Every season on the Court Value scale."
    img = f"img/og/p/{pid}.png"
    table = "".join(f"<tr><td>{season(r[2])}</td><td>{E(r[4])}</td><td>{r[5]}</td><td>{f2(r[9])}</td><td>{f2(r[10])}</td><td>{f2(r[11])}</td></tr>" for r in rows)
    body = (f"<h1>{E(name)}</h1><p>{E(desc)}</p><p>Teams: {E(', '.join(teams))}.</p>"
            f"<table><thead><tr><th>Season</th><th>Team</th><th>G</th><th>CV</th><th>RS</th><th>PO</th></tr></thead><tbody>{table}</tbody></table>")
    write(f"players/{pid}/", name, desc, body, image=img if card(img) else "img/og/players.png",
          alt=f"{name} on the Court Value scale", kind="profile", priority="0.7" if cr else "0.4")

# ---------------------------------------------------------------- team-seasons (Time Machine, one side picked)
fi = {k: i for i, k in enumerate(TF)}
for t in TROWS:
    key = f"{t[0]}-{t[1]}-{t[2]}"
    nm = f"{season(t[0])} {t[3]}"
    rec = f"{t[4]}–{t[5]}" if t[4] is not None else ""
    lg = "ABA" if t[1] == 1 else "NBA"
    rost = sorted([p for p in t[fi["roster"]] if p[3]], key=lambda p: -p[3])[:5]
    desc = (f"The {nm}" + (f" ({rec}" + (", champions" if t[8] else "") + ")" if rec else "") +
            f": team rating {sgn(t[6])}, #{t[9]:,} of {len(TROWS):,} {lg if t[1] == 1 else 'NBA and ABA'} teams since 1952. "
            f"Top minutes: {', '.join(p[0] for p in rost)}. Play them against any team from any era in the Time Machine.")
    img = f"img/og/t/{key}.png"
    body = f"<h1>{E(nm)}</h1><p>{E(desc)}</p>"
    write(f"time-machine/{key}/", f"{nm} · Time Machine", desc, body, image=img if card(img) else "img/og/teams.png",
          alt=f"{nm} team rating", priority="0.6" if (t[8] or t[9] <= 300) else "0.4")

# ---------------------------------------------------------------- franchises and decades
for code, f in FR.items():
    desc = (f"{f['name']} franchise history on the Court Value scale, {season(f['first'])} to {season(f['last'])}: {f['titles']} title{'s' if f['titles'] != 1 else ''}. "
            f"Best players: {', '.join(p[0] for p in f['players'][:5])}.")
    write(f"franchises/{code}/", f"{f['name']}: franchise history", desc, f"<h1>{E(f['name'])}</h1><p>{E(desc)}</p>",
          image="img/og/teams.png", priority="0.6")
for d, v in DEC.items():
    label = f"{d}s"
    desc = f"The best players and teams of the {label} by Court Value: " + ", ".join(p[0] for p in v["players"][:6]) + "."
    write(f"decades/{d}/", f"The {label}: best players and teams", desc, f"<h1>The {label}</h1><p>{E(desc)}</p>", image="img/og/teams.png", priority="0.5")

# ---------------------------------------------------------------- play (registered when the game ships)
if os.path.exists(os.path.join(DOCS, "assets", "play.js")) or "play" in open(os.path.join(DOCS, "assets", "shell.html"), encoding="utf-8").read():
    if 'id="play"' in open(os.path.join(DOCS, "assets", "shell.html"), encoding="utf-8").read():
        write("play/", "Court Value 82: draft five, play 82", "Spin a team, take one player from its roster, fill all five spots, then play an 82-game season against real NBA and ABA teams. Can you beat the 73–9 Warriors?",
              "<h1>Court Value 82</h1><p>Draft five, play 82.</p>", image="img/og/play.png" if card("img/og/play.png") else "img/og-home.png", priority="0.9")

# ---------------------------------------------------------------- 404, sitemap, robots, CNAME
write("404.html", "Page not found", HOME_DESC, "<h1>Page not found</h1><p><a href=\"./\">Court Value home</a></p>", base=ROOTPATH)
today = date.today().isoformat()
with open(os.path.join(DOCS, "sitemap.xml"), "w") as fh:
    fh.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    for p, pr in pages:
        fh.write(f"<url><loc>{E(URL + p)}</loc><lastmod>{today}</lastmod><priority>{pr}</priority></url>\n")
    fh.write("</urlset>\n")
open(os.path.join(DOCS, "robots.txt"), "w").write(f"User-agent: *\nAllow: /\n\nSitemap: {URL}sitemap.xml\n")
cname = os.path.join(DOCS, "CNAME")
host = URL.split("://", 1)[1].split("/", 1)[0]
if host.endswith("github.io"):
    if os.path.exists(cname): os.remove(cname)
else:
    open(cname, "w").write(host + "\n")
print(f"{len(pages)} pages + 404 for {URL} (assets v={V})")
