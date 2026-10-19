#!/usr/bin/env python3
"""Render the link-preview cards (1200x630 PNG) that Reddit, X, iMessage etc. show for a link.

    pip install playwright pillow && python3 -m playwright install chromium
    python3 tools/build_cards.py            # section cards + players + teams
    python3 tools/build_cards.py --sections # just the handful of section cards

Cards are made for the players and teams people are most likely to share (top careers, current
players, champions and the best teams); everyone else uses the section card. Run
tools/build_pages.py afterwards so pages point at the new cards.
"""
import asyncio, json, os, sys
from io import BytesIO

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(os.path.dirname(HERE), "docs")
OUT = os.path.join(DOCS, "img", "og")
FONTS_DIR = os.environ.get("CV_FONTS_DIR")   # optional: serve fonts from a local @fontsource folder when offline
TOP_CAREERS, TOP_TEAMS, RECENT = 1000, 300, 2024


def J(name): return json.load(open(os.path.join(DOCS, "data", name), encoding="utf-8"))
def season(y): return f"{y - 1}–{str(y)[-2:]}"
def sgn(x): return ("+" if x >= 0 else "−") + f"{abs(x):.1f}"


def jobs(sections_only=False):
    S = J("scores.json")["rows"]; C = J("careers.json")["rows"]; T = J("teams.json"); D = J("career_detail.json")["rows"]
    W = J("wnba.json")
    by = {}
    for r in S: by.setdefault(r[0], []).append(r)
    out = []
    top = sorted([r for r in S if r[13] and r[13] <= 10], key=lambda r: r[13])
    out.append(("img/og-home.png", {"eyebrow": "NBA · ABA · WNBA · since 1952", "title": "Every season, on one scale.",
        "sub": "One number for every player-season, measured <mark>the same way in 1952 and 2026.</mark>", "ruler": True,
        "dots": [{"v": 10.06, "lab": "Russell", "sl": "’65", "lt": -36}, {"v": 13.52, "p": 1, "lab": "Wilt", "sl": "’67", "lt": -36},
                 {"v": 14.98, "p": 1, "lab": "Shaq", "sl": "’00", "lt": -36}, {"v": 12.02, "p": 1, "lab": "Jokić", "sl": "’23", "lt": -36},
                 {"v": 14.29, "p": 1, "lab": "Jordan", "sl": "’96", "lt": -90}]}))
    out.append(("img/og/players.png", {"eyebrow": "Players · rankings", "title": "Every season, ranked.",
        "sub": "15,301 qualified NBA and ABA seasons since 1952, <mark>one scale for every era.</mark>", "ruler": True,
        "dots": [{"v": r[9], "p": 1} for r in top] + [{"v": r[9]} for r in sorted(S, key=lambda r: -(r[9] or -9))[10:40] if r[7]]}))
    TR = {(t[0], t[1], t[2]): t for t in T["rows"]}
    a, b = TR[(1996, 0, "CHI")], TR[(1986, 0, "BOS")]
    out.append(("img/og/teams.png", {"eyebrow": "Teams · Time Machine", "title": "Any two teams, any two eras.",
        "vs": [{"k": "1995–96 Bulls", "v": sgn(a[6]), "n": f"{a[4]}–{a[5]} · champions", "cls": "blue"}, {"k": "1985–86 Celtics", "v": sgn(b[6]), "n": f"{b[4]}–{b[5]} · champions", "cls": "red"}]}))
    wtop = sorted([r for r in W["rows"] if r[6]], key=lambda r: -r[7])[:12]
    out.append(("img/og/wnba.png", {"eyebrow": "WNBA · 1997 to 2025", "title": "The WNBA, on one scale.",
        "sub": "Every WNBA season rated by <mark>the same Court Value rules.</mark>", "ruler": True,
        "dots": [{"v": r[7], "p": 1 if i == 0 else 0, **({"lab": r[1].split()[-1], "sl": "’" + str(r[2])[-2:], "lt": -40} if i == 0 else {})} for i, r in enumerate(wtop)]}))
    out.append(("img/og/about.png", {"eyebrow": "How it works", "title": "How a season becomes a number.",
        "sub": "No era bonuses. <mark>No awards or reputation go into the score.</mark>", "ruler": True,
        "dots": [{"v": 0, "lab": "Average", "lt": -36}, {"v": 4, "lab": "All-Star", "lt": -36}, {"v": 6, "lab": "All-NBA", "lt": -90}, {"v": 10, "lab": "MVP", "lt": -36, "p": 1}, {"v": 14, "lab": "All-time", "lt": -36, "p": 1}]}))
    out.append(("img/og/play.png", {"eyebrow": "Play · a new game every day", "title": "Court Value 82",
        "sub": "Spin a team. Take one player. Fill all five spots. <mark>Then play 82 games.</mark>",
        "stats": [{"k": "Your five", "v": "?", "n": "from any era"}, {"k": "Can you beat", "v": "73–9", "n": "the ’16 Warriors", "cls": "red"}]}))
    if sections_only:
        return out
    # players: top careers, plus anyone who played recently
    for c in C:
        pid = c[0]
        if not (c[12] <= TOP_CAREERS or c[2] >= RECENT): continue
        rows = sorted(by.get(pid, []), key=lambda r: r[2])
        if not rows: continue
        q = [r for r in rows if r[7]]
        best = max(q or rows, key=lambda r: r[9])
        prime = {s for s, lg in (D.get(pid) or [0, 0, []])[2]}
        titles = sum(1 for r in rows if r[17])
        third = {"k": "Titles", "v": str(titles)} if titles else {"k": "Seasons", "v": str(len(q)), "n": "qualified"}
        out.append((f"img/og/p/{pid}.png", {"eyebrow": f"Player · {c[16] or ''} · {season(rows[0][2])} to {season(rows[-1][2])}".replace(" ·  ·", " ·"), "title": c[1],
            "stats": [{"k": "Career CV", "v": f"{c[9]:.2f}", "n": f"#{c[12]:,} of {len(C):,} careers", "cls": "red"},
                      {"k": "Best season", "v": f"{best[9]:.2f}", "n": season(best[2]) + (f" · #{best[13]:,} all time" if best[13] else "")}, third],
            "ruler": True, "dots": [{"v": r[9], "p": 1 if r[2] in prime else 0} for r in q]}))
    fi = {k: i for i, k in enumerate(T["meta"]["fields"])}
    for t in T["rows"]:
        if not (t[8] or t[9] <= TOP_TEAMS): continue
        key = f"{t[0]}-{t[1]}-{t[2]}"
        rost = sorted([p for p in t[fi["roster"]] if p[3]], key=lambda p: -p[3])[:5]
        rec = f"{t[4]}–{t[5]}" if t[4] is not None else "—"
        out.append((f"img/og/t/{key}.png", {"eyebrow": f"Team · {season(t[0])} · {'ABA' if t[1] else 'NBA'}" + (" · champions" if t[8] else ""), "title": t[3],
            "stats": [{"k": "Team rating", "v": sgn(t[6]), "n": f"#{t[9]:,} of {len(T['rows']):,} teams", "cls": "blue"},
                      {"k": "Record", "v": rec, "n": (f"playoffs {t[17]}–{t[18]}" if t[17] is not None else "")}],
            "sub": "<span style='font:500 24px/1.4 IBM Plex Mono;color:#57534a'>" + " · ".join(f"{p[0].split()[-1]} {p[5]:.1f}" if p[5] is not None else p[0].split()[-1] for p in rost) + "</span>"}))
    return out


async def render(todo):
    from playwright.async_api import async_playwright
    from PIL import Image
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1200, "height": 630})
        if FONTS_DIR:
            css = open(os.path.join(FONTS_DIR, "fonts.css")).read()
            await ctx.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=css))
            await ctx.route("https://fonts.gstatic.com/**", lambda r: r.fulfill(status=200, content_type="font/woff2", headers={"access-control-allow-origin": "*"},
                                                                                  body=open(r.request.url.replace("https://fonts.gstatic.com/local/", FONTS_DIR + "/"), "rb").read()))
        pg = await ctx.new_page()
        await pg.goto("file://" + os.path.join(HERE, "og_card.html"))
        await pg.evaluate("document.fonts.ready")
        for i, (path, data) in enumerate(todo):
            await pg.evaluate("d => draw(d)", data)
            await pg.evaluate("document.fonts.ready")
            png = await pg.screenshot(type="png")
            im = Image.open(BytesIO(png)).convert("RGB").quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
            out = os.path.join(DOCS, path)
            os.makedirs(os.path.dirname(out), exist_ok=True)
            im.save(out, optimize=True)
            if i % 250 == 0: print(f"{i}/{len(todo)} {path}", flush=True)
        await b.close()


if __name__ == "__main__":
    todo = jobs("--sections" in sys.argv)
    asyncio.run(render(todo))
    print(f"{len(todo)} cards")
