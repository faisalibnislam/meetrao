#!/usr/bin/env python3
"""Emits Main.dc.html (desktop 1440) and Mobile.dc.html (390).

Every value here is lifted from the real source — src/app/globals.css tokens,
src/app/(marketing)/page.tsx, hero.tsx, site-chrome.tsx, cost-calculator.tsx,
faq.tsx, demo-calendar.tsx, walkthrough.tsx — so the artboards are the shipped
page, not an impression of it. The emitted markup is plain literal HTML with
inline styles: nothing here is a template the designer has to decode, and every
element can be selected and restyled on the canvas.
"""

import io
import json

# ── Tokens, verbatim from globals.css ────────────────────────────────────────
GROUND, SURFACE, FILL, FILL2 = "#e7e4dc", "#ffffff", "#f4f3ee", "#eae8e1"
LINE, LINE_SOFT, LINE_STRONG = "#e0ddd4", "#edebe4", "#cfcbc0"
INK, INK2, INK3 = "#1a1917", "#575550", "#66635c"
ACCENT, ACCENT2 = "#14554a", "#0e4038"
ACCENT_SOFT, ACCENT_LINE = "#e4edea", "#c2d6d0"
RED, RED_SOFT, RED_LINE, RED_INK = "#98291f", "#f8e9e5", "#e7d2cb", "#77332b"
SLATE, SLATE_SOFT, SLATE_LINE = "#2f4c63", "#eaeff3", "#d3dee6"
MINT = "#7FD8C4"          # the hero/compare highlight, a literal in the source
HERO_BG = "#0B1714"
FOOTER_INNER = "#206155"
COMPARE_BG = "#E7E3DC"    # deliberately not --ground; the source uses this literal
FAQ_BG = "#F4F3ED"
POP = "0 1px 2px rgba(26,25,23,0.05), 0 16px 34px -12px rgba(26,25,23,0.24)"

SANS = "'Instrument Sans', system-ui, -apple-system, sans-serif"
SERIF = "'Instrument Serif', Georgia, serif"

# ── The in-house icon set, paths copied out of src/components/ui/icon.tsx ────
ICONS = {
    "check": "M4.5 12.4 9.6 17.5 19.5 6.6",
    "xmark": "M5.6 5.6 18.4 18.4M18.4 5.6 5.6 18.4",
    "play": "M7.6 4.6 19.4 12 7.6 19.4z",
    "calendar": "M3.4 5.8h17.2v14.4H3.4zM3.4 10h17.2M7.8 3.4v3.6M16.2 3.4v3.6M7.2 13h1.8M11.1 13h1.8"
                "M15 13h1.8M7.2 16.6h1.8M11.1 16.6h1.8M15 16.6h1.8",
    "link": "M13.5 10.5a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.6-1.6"
            "M10.5 13.5a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4l-1.6 1.6",
    "globe": "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17M12 3.5c-3.6 3.6-3.6 13.4 0 17"
             "M12 3.5c3.6 3.6 3.6 13.4 0 17M3.9 9h16.2M3.9 15h16.2",
    "video": "M3.5 6.6h12v10.8h-12zM15.5 10.6l5-3v8.8l-5-3z",
    "sliders": "M3 7h18M3 12h18M3 17h18M7.4 5.2h2.2v3.6H7.4zM14.4 10.2h2.2v3.6h-2.2zM9.4 15.2h2.2v3.6H9.4z",
    "tag": "M3.5 3.5h9.2l7.8 7.8-7.8 7.8-9.2-9.2zM7.6 6.4a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6",
    "clock": "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17M12 6.8V12l3.9 2.4",
    "arrow-right": "M4 12h15.4M13.4 6l6 6-6 6",
    "plus": "M12 4.6v14.8M4.6 12h14.8",
    "lightbulb": "M9.2 18.4h5.6M9.8 21h4.4M12 3.4a6 6 0 0 0-3.6 10.8v2.2h7.2v-2.2A6 6 0 0 0 12 3.4",
    "users": "M9.4 4.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8M2.8 19.4v-1.2c0-2 3-3.7 6.6-3.7s6.6 1.7 6.6 3.7v1.2"
             "M16.4 5.4a3 3 0 0 1 0 6M18.4 14.6c1.7.5 2.8 1.6 2.8 2.9v1.2",
    "chart-line": "M3.6 3.6v16.8h16.8M7 16.4l3.8-4.6 3.2 2.6 4.6-6",
    "graduation-cap": "M2.4 8.8 12 4.2l9.6 4.6-9.6 4.6zM6.6 11v5.2c0 1.7 2.4 2.8 5.4 2.8s5.4-1.1 5.4-2.8V11",
    "address-card": "M2.6 5h18.8v14H2.6zM8.2 8.6a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4"
                    "M4.8 16.4c0-1.4 1.6-2.4 3.4-2.4s3.4 1 3.4 2.4M14.6 9.6h4.4M14.6 13.4h4.4",
    "chevron-left": "M15 5.6 8.4 12l6.6 6.4",
    "chevron-right": "M9 5.6 15.6 12 9 18.4",
    "copy": "M8.5 8.5H20V20H8.5zM15.5 8.5V4H4v11.5h4.5",
    "eye-slash": "M4.2 8.4C3 9.9 2.5 12 2.5 12S6.4 18.4 12 18.4c1.7 0 3.2-.6 4.4-1.4"
                 "M19 15.3c1.7-1.6 2.5-3.3 2.5-3.3S17.6 5.6 12 5.6c-1 0-1.9.2-2.7.5M4 4l16 16",
}



# ── The real wordmark ────────────────────────────────────────────────────────
# public/brand/meetrao-logo{,-white}.svg with their c2pa provenance metadata
# stripped (that block was 8KB of the 14KB file and carries no artwork). Inlined
# rather than approximated, so the mark on the canvas is the mark that ships.
LOGO_RATIO = 127 / 576


def logo(height=None, width=None, white=False, fluid=False):
    src = "logo-white.svg" if white else "logo-colour.svg"
    svg = io.open(src, encoding="utf-8").read()
    if fluid:
        svg = svg.replace('width="576"', 'width="100%"', 1).replace('height="127"', 'height="auto"', 1)
        return svg.replace("<svg ", '<svg style="display:block;width:100%;height:auto" ', 1)
    if width is None:
        width = round(height / LOGO_RATIO, 1)
    if height is None:
        height = round(width * LOGO_RATIO, 1)
    svg = svg.replace('width="576"', f'width="{width}"', 1).replace('height="127"', f'height="{height}"', 1)
    return svg.replace("<svg ", '<svg style="display:block" ', 1)


def icon(name, size, color=None, weight="light", extra=""):
    """One glyph. Stroke weight comes from a class so no SVG presentation
    attribute has to survive the template round trip."""
    cls = "ic" + (" ic-s" if weight == "solid" else "") + (" ic-f" if name == "play" else "")
    style = f"width:{size}px;height:{size}px"
    if color:
        style += f";color:{color}"
    if extra:
        style += ";" + extra
    return (f'<svg viewBox="0 0 24 24" class="{cls}" style="{style}">'
            f'<path d="{ICONS[name]}"></path></svg>')


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ── Page content, copied from page.tsx / faq.tsx ─────────────────────────────
THREAD = [("Are you free Tuesday?", False), ("I'm busy Tuesday. Wednesday?", True),
          ("Wednesday at 3?", False), ("Which timezone?", True),
          ("Can we do Thursday instead?", False)]

RESEARCH = [
    ("slate", "Peer-reviewed", "23%",
     "Average appointment no-show rate across all specialties, from a review of 105 studies.",
     "Dantas et al., Health Policy, 2018 (13.2% Oceania – 43.0% Africa)."),
    ("accent", "Peer-reviewed", "Lower",
     "No-show rate for appointments booked online versus offline, in one practice.",
     "Frontiers in Digital Health, 2025. Single-practice study — not generalisable alone."),
    ("plain", "Vendor", "Higher",
     "Deal-close rates among customers using its meeting scheduler.",
     "HubSpot, self-reported. Marketing data, not independent research."),
]
RESEARCH_TONE = {
    "slate": (SLATE, SLATE_LINE, SLATE_SOFT, SLATE),
    "accent": (ACCENT, ACCENT_LINE, ACCENT_SOFT, ACCENT),
    "plain": (INK2, LINE, FILL, INK2),
}

BEFORE = [('Email: "when are you free?"', False), ("Reply with three options", False),
          ("Check your calendar", False), ("Suggest a time", False),
          ("No answer for a day", True), ("That slot has gone — reschedule", False),
          ("Confirm the new time", False), ("Send a meeting link", False)]

AFTER = [("01", "Share your link", "One URL, in an email signature or a DM.", "link"),
         ("02", "They pick a time", "Only times you are genuinely free, in their timezone.", "calendar"),
         ("03", "Booked", "On both calendars, with a Meet link attached.", "check")]

BENEFITS = [
    ("calendar", "Never double-book", "Your calendar is checked before any time is offered."),
    ("link", "They book themselves", "Send the link. Stop negotiating over email."),
    ("globe", "Timezones handled", "Guests see your hours in their own timezone."),
    ("video", "Meet links automatically", "Every booking creates the event and its Meet link."),
    ("sliders", "Your hours protected", "Buffers, minimum notice, and a booking window."),
    ("tag", "Completely free", "No subscription. Everything here is included."),
]

WALK = [("01", "Set your availability",
         "Tick the days you work and the hours within them. Meetrao never offers anything outside them.",
         "Mon to Fri, 9:00 to 17:00. Nothing outside it is ever offered."),
        ("02", "Share one link",
         "meetrao.com/adam, always reflecting your calendar exactly as it is right now.",
         "One link. It never goes stale and never double-books."),
        ("03", "Your guest picks",
         "A name, an email, done. No account, no download, no timezone maths.",
         "Your guest sees your hours in their own timezone."),
        ("04", "Booked, both sides",
         "One calendar event with a Google Meet link, and your guest invited to the same event.",
         "On both calendars, with a Meet link, automatically.")]

# use-cases.tsx: six, each appearing either as the feature or as a strip.
# `ground` is the tint behind a photo that has not been dropped in yet.
USE_CASES = [
    ("freelancers", "address-card", "Freelancers",
     "Book discovery calls without the email thread",
     "One link in your signature. Clients pick a time you are genuinely free, and it lands on both calendars.",
     ACCENT_SOFT),
    ("consultants", "lightbulb", "Consultants",
     "Fill your week while you are in another meeting",
     "Prospects book against your live calendar. Buffers and a minimum notice period keep your day intact.",
     FILL2),
    ("agencies", "users", "Agencies",
     "Every account manager keeps their own link",
     "Separate hours and meeting types per person, so nobody negotiates times out of a shared inbox.",
     SLATE_SOFT),
    ("sales-teams", "chart-line", "Sales teams",
     "Let prospects book straight from the follow-up",
     "The link goes in the email. The meeting arrives with a Google Meet link already attached.",
     FILL),
    ("coaches", "graduation-cap", "Coaches",
     "Recurring sessions without the weekly admin",
     "Clients rebook themselves from the same link, always in their own timezone.",
     ACCENT_SOFT),
    ("remote-teams", "globe", "Remote teams",
     "Nobody does timezone maths by hand",
     "Your hours convert to theirs automatically, and stay correct through daylight saving.",
     FILL2),
]

FOOTER_TRUST = [("tag", "Completely free", "No subscription, no card, no trial that expires."),
                ("eye-slash", "Your calendar stays private",
                 "Meetrao reads busy or free — never what your meetings are about."),
                ("xmark", "Disconnect whenever", "One click in Settings, and the calendar token is deleted.")]

FOOTER_COLS = [
    ("Product", ["How it works", "Use cases", "What you get", "Read the FAQ"]),
    ("Get started", ["Create a free link", "Log in", "Connect Google Calendar", "Set your availability"]),
    ("Support", ["Help centre", "Contact support", "FAQ"]),
    ("Company", ["Privacy Policy", "Terms of Service", "Operated by Airly Studio"]),
]

HERO_PROOF = ["Completely free", "No double bookings", "On both calendars",
              "Every timezone converted", "Guests never sign up"]

HERO_FACTS = [("clock", "30 minutes"), ("video", "Google Meet"),
              ("globe", "Times shown in your timezone")]


def kicker(text, tone="light"):
    """site-chrome.tsx Kicker: a 2px rule then a 10.5px 0.14em uppercase label."""
    color = MINT if tone == "light" else ACCENT
    return (f'<span style="display:inline-flex;align-items:center;gap:10px;font-size:10.5px;'
            f'font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:{color}">'
            f'<span style="height:2px;width:18px;flex:none;border-radius:1px;background:{color}"></span>'
            f'{esc(text)}</span>')


def section_head(kick, heading, size, maxw, tone="dark", color=None,
                 lh="1.04", tag="h2", balance=True):
    """page.tsx uses a different leading per section (1.03 How it works, 1.04
    the middle four, 1.05 Why it matters), the Use cases heading is an <h3>,
    and the FAQ heading carries no text-balance. Passed in rather than assumed."""
    b = "text-wrap:balance;" if balance else ""
    return (f'<div style="display:flex;flex-direction:column;gap:11px;max-width:{maxw}px">'
            f'{kicker(kick, tone)}'
            f'<{tag} style="margin:0;font-family:{SERIF};font-size:{size}px;line-height:{lh};'
            f'font-weight:400;letter-spacing:-0.02em;{b}color:{color or INK}">'
            f'{heading}</{tag}></div>')


# ═════════════════════════════════════════════════════════════════════════════
# Sections. `w` is the artboard width; `m` is the phone branch, matching the
# real page's max-[560px]/max-[700px]/max-[720px]/860px media queries.
# ═════════════════════════════════════════════════════════════════════════════

def nav(w, m):
    pad = 12 if m else 26
    top = 12 if m else 20
    links = ""
    if not m:
        links = ('<nav style="display:flex;gap:22px;margin-left:10px;min-width:0">'
                 + "".join(f'<a href="#" style="font-size:13.5px;color:{INK2};white-space:nowrap;'
                           f'text-decoration:none">{l}</a>'
                           for l in ["Product", "How it works", "Use cases", "FAQ"])
                 + "</nav>")
    mark = f'<span style="display:block;flex:none">{logo(height=19)}</span>'
    right = (f'<div style="margin-left:auto;display:flex;flex:none;align-items:center;gap:12px">'
             f'<a href="#" style="display:inline-flex;min-height:38px;align-items:center;padding:0 8px;'
             f'font-size:13.5px;color:{INK2};text-decoration:none">Log in</a>'
             f'<a href="#" style="display:inline-flex;height:38px;align-items:center;gap:8px;'
             f'border-radius:7px;background:{{{{accent}}}};padding:0 15px;font-size:13px;font-weight:600;'
             f'white-space:nowrap;color:#fff;text-decoration:none">Get started — Free</a></div>')
    return (f'<header style="position:relative;z-index:2;padding:{top}px {pad}px 0">'
            f'<div style="margin:0 auto;display:flex;max-width:1148px;align-items:center;'
            f'gap:{12 if m else 22}px;border-radius:12px;border:1px solid {LINE};background:#fff;'
            f'padding:{"10px 12px" if m else "10px 14px 10px 18px"};'
            f'box-shadow:0 1px 2px rgba(26,25,23,0.04),0 12px 28px -14px rgba(26,25,23,0.22)">'
            f'{mark}{links}{right}</div></header>')


def hero(w, m):
    pad = 18 if m else 26
    hsize = 44 if m else 66
    hwrap = "normal" if m else "nowrap"
    proof = ""
    for i, t in enumerate(HERO_PROOF):
        edge = (f"border-left:1px solid rgba(255,255,255,0.25);padding:0 16px"
                if i else "padding-right:16px")
        proof += (f'<span style="display:inline-flex;height:22px;align-items:center;gap:8px;'
                  f'font-size:13px;font-weight:500;letter-spacing:-0.002em;white-space:nowrap;'
                  f'color:rgba(255,255,255,0.9);{edge}">{icon("check", 9, MINT, "solid")}{t}</span>')

    facts = "".join(
        f'<div style="display:flex;align-items:flex-start;gap:10px">'
        f'{icon(g, 12.5, INK3, extra="margin-top:1px;width:15px")}'
        f'<span style="min-width:0;flex:1;text-align:left;font-size:12.5px;line-height:1.45;color:{INK}">'
        f'{esc(t)}</span></div>' for g, t in HERO_FACTS)

    left_card = (
        f'<div style="display:flex;min-width:0;flex-direction:column;gap:12px;'
        f'{"border-bottom" if m else "border-right"}:1px solid {LINE};background:{FILL};padding:24px;text-align:left">'
        f'<div style="display:flex;align-items:center;gap:11px">'
        f'<span style="height:38px;width:38px;flex:none;border-radius:9px;background:{ACCENT_SOFT};'
        f'display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;'
        f'color:{ACCENT}">AV</span>'
        f'<div style="display:flex;min-width:0;flex-direction:column;gap:1px">'
        f'<span style="font-size:13.5px;font-weight:600;color:{INK}">Adam Voigt</span>'
        f'<span style="font-size:12px;color:{INK3}">Product consultant</span></div></div>'
        f'<h3 style="margin:0;font-family:{SERIF};font-size:{24 if m else 31}px;line-height:1.06;'
        f'font-weight:400;letter-spacing:-0.012em;color:{INK}">30 Minute Consultation</h3>'
        f'<p style="margin:0;font-size:13px;line-height:1.55;text-wrap:pretty;color:{INK2}">'
        f'A quick conversation to discuss your project.</p>'
        f'<div style="margin-top:auto;display:flex;flex-direction:column;gap:9px;padding-top:6px">{facts}</div></div>')

    right_card = (
        f'<div style="display:flex;min-width:0;flex-direction:column;gap:15px;padding:24px">'
        f'<div style="display:flex;flex-direction:column;gap:10px">'
        f'<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">'
        f'<span style="font-size:10px;letter-spacing:0.07em;text-transform:uppercase;color:{INK3}">Select a date</span>'
        f'<span style="font-size:13px;font-weight:600;color:{INK}">September 2026</span></div>'
        f'<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px">'
        + "".join(f'<span style="text-align:center;font-size:10px;letter-spacing:0.04em;'
                  f'text-transform:uppercase;color:{INK3}">{d}</span>'
                  for d in ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])
        + '<sc-for list="{{cells}}" as="cell" hint-placeholder-count="32">'
          '<sc-if value="{{cell.empty}}" hint-placeholder-val="{{false}}"><span></span></sc-if>'
          '<sc-if value="{{cell.day}}" hint-placeholder-val="{{true}}">'
          '<button type="button" onClick="{{cell.pick}}" class="cell" '
          'style="background:{{cell.bg}};border-color:{{cell.bd}};color:{{cell.fg}};'
          'opacity:{{cell.op}};font-weight:{{cell.fw}}">{{cell.n}}</button>'
          '</sc-if></sc-for>'
        f'</div></div>'
        f'<div style="display:flex;flex-direction:column;gap:10px;border-top:1px solid {LINE};padding-top:15px">'
        f'<div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px">'
        f'<span style="font-size:10px;letter-spacing:0.07em;text-transform:uppercase;color:{INK3}">Available times</span>'
        f'<span style="font-size:12.5px;color:{INK2}">{{{{dayLabel}}}}</span></div>'
        f'<div style="display:grid;grid-template-columns:repeat({3 if m else 5},minmax(0,1fr));gap:6px">'
        '<sc-for list="{{slots}}" as="s" hint-placeholder-count="8">'
        '<button type="button" onClick="{{s.pick}}" class="slot" '
        'style="background:{{s.bg}};border-color:{{s.bd}};color:{{s.fg}};font-weight:{{s.fw}}">{{s.label}}</button>'
        '</sc-for>'
        f'</div></div></div>')

    return (
        f'<section style="position:relative;isolation:isolate;overflow:hidden;'
        f'margin-top:-78px;padding-top:78px;background:{HERO_BG}">'
        f'<div style="position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none">'
        f'<div class="drift-a" style="position:absolute;top:-24%;left:-14%;height:104%;width:74%;'
        f'border-radius:9999px;filter:blur(44px);background:radial-gradient(circle at 50% 50%,'
        f'rgba(24,105,90,1),rgba(24,105,90,0) 70%)"></div>'
        f'<div class="drift-b" style="position:absolute;top:-14%;right:-18%;height:96%;width:66%;'
        f'border-radius:9999px;filter:blur(56px);background:radial-gradient(circle at 50% 50%,'
        f'rgba(52,168,146,0.95),rgba(52,168,146,0) 68%)"></div>'
        f'<div class="drift-c" style="position:absolute;bottom:-32%;left:26%;height:82%;width:60%;'
        f'border-radius:9999px;filter:blur(58px);background:radial-gradient(circle at 50% 50%,'
        f'rgba(58,102,134,0.9),rgba(58,102,134,0) 72%)"></div>'
        f'<div class="sweep" style="position:absolute;top:0;left:-25%;height:100%;width:50%;'
        f'background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.14) 50%,'
        f'rgba(255,255,255,0) 100%)"></div>'
        f'<div style="position:absolute;inset:0;background:linear-gradient(180deg,'
        f'rgba(11,23,20,0.34) 0%,rgba(11,23,20,0) 34%,rgba(11,23,20,0.55) 100%)"></div></div>'

        f'<div style="position:relative;z-index:1;margin:0 auto;display:flex;max-width:1200px;'
        f'flex-direction:column;align-items:center;gap:19px;padding:38px {pad}px 0;text-align:center">'
        f'<h1 style="margin:0;font-family:{SERIF};font-weight:400;color:#fff;font-size:{hsize}px;'
        f'line-height:{"0.98" if m else "1.04"};'
        f'letter-spacing:{"-0.03em" if m else "-0.024em"};white-space:{hwrap}'
        f'{";max-width:18ch" if m else ""}">Stop asking &ldquo;what time works for you?&rdquo;</h1>'
        f'<p style="margin:0;max-width:56ch;font-size:{15.5 if m else 18}px;line-height:1.55;'
        f'text-wrap:pretty;color:rgba(255,255,255,0.8)">Meetrao turns your availability into one booking '
        f'link, so clients and teammates pick a time that works — without the back-and-forth.</p>'
        f'<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;padding-top:2px">'
        f'<a href="#" style="display:inline-flex;height:50px;align-items:center;justify-content:center;'
        f'gap:10px;border-radius:8px;background:#fff;padding:0 24px;font-size:15px;font-weight:600;'
        f'color:{ACCENT2};text-decoration:none">Create your free booking link{icon("arrow-right", 12)}</a>'
        f'<a href="#" style="display:inline-flex;height:50px;align-items:center;justify-content:center;'
        f'gap:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.35);background:rgba(255,255,255,0.05);'
        f'padding:0 21px;font-size:15px;font-weight:600;color:#fff;text-decoration:none">'
        f'{icon("play", 12)}See how it works</a></div>'
        f'<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;padding-top:8px">'
        f'{proof}</div>'
        f'<div style="margin:6px auto 0;display:flex;width:100%;max-width:1019px;flex-wrap:wrap;'
        f'align-items:center;justify-content:center;column-gap:16px;row-gap:12px;'
        f'border-top:1px solid rgba(255,255,255,0.2);padding-top:20px">'
        f'<span style="display:inline-flex;align-items:center;gap:9px;font-size:15.5px;font-weight:600;'
        f'letter-spacing:-0.008em;color:#fff">{icon("check", 12, MINT, "solid")}Free. No card, no subscription.</span>'
        f'<span style="height:20px;width:1px;flex:none;background:rgba(255,255,255,0.2)"></span>'
        f'<span style="display:inline-flex;align-items:baseline;gap:8px;font-size:13.5px;'
        f'color:rgba(255,255,255,0.75)">Your link is'
        f'<span style="font-size:14.5px;font-weight:500;color:#fff">meetrao.com/you</span></span></div>'

        f'<div style="margin-top:24px;width:100%;padding-bottom:52px">'
        f'<div style="overflow:hidden;border-radius:16px;border:1px solid rgba(255,255,255,0.15);'
        f'background:{SURFACE};box-shadow:0 40px 80px -30px rgba(0,0,0,0.7)">'
        f'<div style="display:flex;align-items:center;gap:8px;border-bottom:1px solid {LINE};'
        f'background:{FILL};padding:9px 14px">'
        f'<span style="display:flex;flex:none;gap:5px">'
        + '<span style="height:8px;width:8px;border-radius:9999px;background:%s"></span>' % LINE_STRONG * 3
        + f'</span><span style="min-width:0;flex:1;text-align:left;font-size:11px;white-space:nowrap;'
        f'color:{INK3}">meetrao.com/adam</span></div>'
        f'<div style="display:grid;grid-template-columns:{"minmax(0,1fr)" if m else "repeat(2,minmax(0,1fr))"};'
        f'align-items:stretch">{left_card}{right_card}</div></div></div></div></section>')


def problem(w, m):
    pad = 18 if m else 26
    msgs = ""
    for text, mine in THREAD:
        bubble = (f'border-radius:14px 14px 4px 14px;background:{ACCENT};color:#fff'
                  if mine else
                  f'border-radius:14px 14px 14px 4px;border:1px solid {LINE};background:{FILL};color:{INK}')
        msgs += (f'<div style="display:flex;justify-content:{"flex-end" if mine else "flex-start"}">'
                 f'<span style="max-width:82%;padding:10px 14px;font-size:13.5px;line-height:1.5;'
                 f'{bubble}">{esc(text)}</span></div>')

    card = (f'<div style="display:flex;flex-direction:column;gap:11px;border-radius:14px;'
            f'border:1px solid {LINE};background:{SURFACE};padding:24px 24px 22px">'
            f'<div style="margin-bottom:2px;display:flex;align-items:center;gap:12px;'
            f'border-bottom:1px solid {LINE_SOFT};padding-bottom:13px">'
            f'<span style="display:flex;flex:none">'
            f'<span style="height:34px;width:34px;border-radius:9999px;background:{FILL2};'
            f'box-shadow:0 0 0 2px {SURFACE};display:inline-flex;align-items:center;justify-content:center;'
            f'font-size:12px;font-weight:700;color:{INK2}">PN</span>'
            f'<span style="height:34px;width:34px;margin-left:-11px;border-radius:9999px;'
            f'background:{ACCENT_SOFT};box-shadow:0 0 0 2px {SURFACE};display:inline-flex;'
            f'align-items:center;justify-content:center;font-size:12px;font-weight:700;color:{ACCENT}">AV</span>'
            f'</span>'
            f'<div style="display:flex;min-width:0;flex:1;flex-direction:column;gap:1px">'
            f'<span style="font-size:13.5px;font-weight:600;color:{INK}">Priya Nair &amp; you</span>'
            f'<span style="font-size:12px;color:{INK3}">Trying to find half an hour</span></div>'
            f'<span style="flex:none;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;'
            f'color:{INK3}">Thu–Mon</span></div>'
            f'{msgs}'
            f'<div style="margin-top:2px;display:flex;align-items:center;gap:12px;'
            f'border-top:1px solid {LINE_SOFT};padding-top:13px">'
            f'<span style="font-family:{SERIF};font-size:32px;line-height:1;color:{INK}">5</span>'
            f'<span style="font-size:13.5px;line-height:1.45;color:{INK2}">messages later, and still<br>'
            f'nothing on the calendar.</span></div></div>')

    copy = (f'<div style="display:flex;flex-direction:column;gap:13px;min-width:0">'
            f'{kicker("The problem")}'
            f'<h2 style="margin:0;font-family:{SERIF};font-size:{30 if m else 50}px;line-height:1.03;'
            f'font-weight:400;letter-spacing:-0.02em;text-wrap:balance;color:#fff">'
            f'Scheduling shouldn&rsquo;t be a conversation.</h2>'
            f'<p style="margin:0;max-width:44ch;font-size:15px;line-height:1.6;text-wrap:pretty;'
            f'color:rgba(255,255,255,0.8)">Timezone confusion, double bookings, meetings that slip a week '
            f'waiting on a reply. It repeats for every meeting, with every person.</p>'
            f'<div style="display:flex;flex-direction:column;gap:2px;padding-top:8px">'
            f'<span style="font-family:{SERIF};font-size:{26 if m else 38}px;line-height:1.05;'
            f'color:rgba(255,255,255,0.55)">You don&rsquo;t need another thread.</span>'
            f'<span style="font-family:{SERIF};font-size:{30 if m else 46}px;line-height:1.05;'
            f'letter-spacing:-0.02em;color:#fff">You need one link.</span></div></div>')

    return (f'<section style="background:{ACCENT2}">'
            f'<div style="margin:0 auto;display:grid;max-width:1200px;'
            f'grid-template-columns:{"minmax(0,1fr)" if m else "repeat(2,minmax(0,1fr))"};'
            f'align-items:center;gap:36px;padding:68px {pad}px">{copy}{card}</div></section>')


# walkthrough.tsx AVAIL_DAYS — five entries, Monday to Friday. There are no
# weekend rows: a day that is not worked is simply not in the list.
AVAIL_DAYS = [("Monday", [("9:00 AM", "12:00 PM"), ("2:00 PM", "5:00 PM")]),
              ("Tuesday", [("9:00 AM", "5:00 PM")]),
              ("Wednesday", [("9:00 AM", "5:00 PM")]),
              ("Thursday", [("9:00 AM", "5:00 PM")]),
              ("Friday", [("9:00 AM", "3:00 PM")])]


def walkthrough(w, m):
    """Step 01 expanded, the other three as rails, as the demo rests before it
    auto-advances. One artboard cannot hold four stages at once."""
    n, title, text, outcome = WALK[0]

    rows = ""
    for i, (day, ranges) in enumerate(AVAIL_DAYS):
        chips = ""
        for j, (a, b) in enumerate(ranges):
            chips += (f'<span style="display:inline-flex;align-items:center;gap:7px">'
                      f'<span style="display:inline-flex;height:27px;align-items:center;border-radius:6px;'
                      f'border:1px solid {LINE_STRONG};background:{SURFACE};padding:0 9px;font-size:12px;'
                      f'color:{INK}">{a}</span>'
                      f'<span style="font-size:11.5px;color:{INK3}">to</span>'
                      f'<span style="display:inline-flex;height:27px;align-items:center;border-radius:6px;'
                      f'border:1px solid {LINE_STRONG};background:{SURFACE};padding:0 9px;font-size:12px;'
                      f'color:{INK}">{b}</span></span>')
        rows += (f'<div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:10px 13px;'
                 f'{"border-top:1px solid " + LINE_SOFT + ";" if i else ""}background:{SURFACE}">'
                 f'<span style="display:flex;width:118px;flex:none;align-items:center;gap:9px">'
                 f'<span style="display:inline-flex;height:16px;width:16px;flex:none;align-items:center;'
                 f'justify-content:center;border-radius:4px;border:1px solid {ACCENT};background:{ACCENT};'
                 f'color:#fff">{icon("check", 8, None, "solid")}</span>'
                 f'<span style="font-size:13px;font-weight:500;color:{INK}">{day}</span></span>'
                 f'<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px">{chips}</div></div>')

    screen = (f'<div style="display:flex;width:100%;flex-direction:column;overflow:hidden;'
              f'border-radius:16px;border:1px solid {LINE_STRONG};background:{SURFACE};'
              f'box-shadow:0 2px 4px rgba(26,25,23,0.04),0 34px 64px -24px rgba(26,25,23,0.34)">'
              f'<div style="display:flex;flex:none;align-items:center;gap:9px;'
              f'border-bottom:1px solid {LINE};background:{FILL};padding:10px 14px">'
              f'<span style="display:flex;flex:none;gap:5px">'
              + '<span style="height:8px;width:8px;border-radius:9999px;background:%s"></span>' % LINE_STRONG * 3
              + f'</span><span style="min-width:0;flex:1;font-size:11px;white-space:nowrap;color:{INK3}">'
              f'meetrao.com/settings/availability</span></div>'
              f'<div style="display:flex;min-height:460px;flex-direction:column;justify-content:center;'
              f'padding:22px">'
              f'<div style="display:flex;flex-direction:column;gap:12px">'
              f'<div style="display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:10px">'
              f'<span style="font-size:15px;font-weight:600;color:{INK}">Availability</span>'
              f'<span style="display:inline-flex;height:30px;align-items:center;gap:8px;border-radius:6px;'
              f'border:1px solid {LINE_STRONG};background:{SURFACE};padding:0 11px;font-size:12.5px;'
              f'color:{INK}">{icon("globe", 11, INK3)}GMT+06:00 Dhaka</span></div>'
              f'<div style="overflow:hidden;border-radius:9px;border:1px solid {LINE}">{rows}</div>'
              f'<span style="font-size:12.5px;line-height:1.5;color:{INK3}">'
              f'5 days a week. Tick a day off and watch it grey out — it is live.</span>'
              f'</div></div></div>')

    left = (f'<div style="display:flex;min-width:0;flex-direction:column;gap:14px">'
            f'<div style="display:flex;align-items:center;gap:12px">'
            f'<span style="flex:none;font-family:{SERIF};font-size:{38 if m else 52}px;line-height:0.9;'
            f'letter-spacing:-0.03em;color:{MINT}">{n}</span>'
            f'<span style="height:1px;min-width:0;flex:1;background:rgba(255,255,255,0.25)"></span>'
            f'<span style="flex:none;font-size:10px;letter-spacing:0.07em;text-transform:uppercase;'
            f'color:{MINT}">Step 1 of 4</span></div>'
            f'<h3 style="margin:0;font-family:{SERIF};font-size:{27.3 if m else 40}px;line-height:1.02;'
            f'font-weight:400;letter-spacing:-0.022em;color:#fff">{title}</h3>'
            f'<p style="margin:0;max-width:34ch;font-size:14px;line-height:1.6;text-wrap:pretty;'
            f'color:rgba(255,255,255,0.8)">{esc(text)}</p>'
            f'<div style="display:flex;align-items:flex-start;gap:11px;border-radius:11px;'
            f'border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.1);padding:12px 14px">'
            f'{icon("check", 10, MINT, "solid", "margin-top:3px")}'
            f'<span style="min-width:0;flex:1;font-size:13px;font-weight:500;line-height:1.5;color:#fff">'
            f'{esc(outcome)}</span></div>'
            # The countdown only exists while the rotation does.
            f'<span style="display:block;height:3px;width:100%;overflow:hidden;border-radius:2px;'
            f'background:{LINE}"><span style="display:block;height:100%;width:34%;border-radius:2px;'
            f'background:{ACCENT}"></span></span></div>')

    # The three inactive steps are 54px vertical rails in the SAME row as the
    # expanded card, not a strip beneath it.
    rails = ""
    for rn, rtitle, _t, _o in WALK[1:]:
        label = (f'<span style="writing-mode:vertical-rl;font-size:13px;color:{INK2}">{rtitle}</span>'
                 if not m else
                 f'<span style="min-width:0;flex:1;font-size:13px;color:{INK2}">{rtitle}</span>')
        inner = (f'<span style="box-sizing:border-box;display:flex;height:100%;width:100%;'
                 f'align-items:center;gap:12px;padding:0 16px">' if m else
                 f'<span style="box-sizing:border-box;display:flex;height:100%;flex-direction:column;'
                 f'align-items:center;gap:14px;padding:16px 0">')
        rails += (f'<button type="button" style="position:relative;box-sizing:border-box;display:block;'
                  f'cursor:pointer;overflow:hidden;border-radius:14px;border:1px solid {LINE};'
                  f'background:{FILL};padding:0;font-family:{SANS};'
                  f'{"height:58px;flex:none;" if m else "flex:0 0 54px;"}">'
                  f'{inner}'
                  f'<span style="flex:none;font-family:{SERIF};font-size:20px;line-height:1;color:{INK3}">'
                  f'{rn}</span>{label}'
                  f'<span style="height:6px;width:6px;flex:none;border-radius:9999px;'
                  f'background:{LINE_STRONG}"></span></span></button>')

    return (f'<div style="position:relative;margin-top:30px">'
            f'<div style="position:relative;display:flex;align-items:stretch;gap:8px;'
            f'{"flex-direction:column;" if m else "min-height:504px;"}">'
            f'<div style="position:relative;box-sizing:border-box;min-width:0;flex:1 1 auto;'
            f'overflow:hidden;border-radius:14px;border:1px solid rgba(255,255,255,0.15);'
            f'background:{ACCENT2};'
            f'background-image:radial-gradient(115% 85% at 4% 0%,rgba(52,168,146,0.30) 0%,rgba(52,168,146,0) 58%),'
            f'radial-gradient(85% 75% at 100% 14%,rgba(127,216,196,0.16) 0%,rgba(127,216,196,0) 60%),'
            f'radial-gradient(95% 105% at 34% 108%,rgba(11,23,20,0.55) 0%,rgba(11,23,20,0) 56%);'
            f'box-shadow:0 1px 2px rgba(26,25,23,0.04),0 18px 34px -20px rgba(26,25,23,0.26)">'
            f'<div style="display:grid;align-items:center;'
            f'grid-template-columns:{"minmax(0,1fr)" if m else "minmax(250px,0.78fr) minmax(0,1fr)"};'
            f'gap:{20 if m else 26}px;padding:{22 if m else 28}px">{left}{screen}</div></div>'
            f'{rails}</div></div>')


def why(w, m):
    pad = 18 if m else 26
    rows = ""
    for tone, tag, figure, text, source in RESEARCH:
        fig, tagbd, tagbg, tagfg = RESEARCH_TONE[tone]
        rows += (f'<div style="display:flex;flex-wrap:wrap;align-items:center;gap:14px;'
                 f'background:{SURFACE};padding:15px 16px">'
                 f'<span style="min-width:76px;flex:none;font-family:{SERIF};font-size:30px;line-height:1;'
                 f'letter-spacing:-0.018em;color:{fig}">{figure}</span>'
                 f'<div style="display:flex;min-width:170px;flex:1;flex-direction:column;gap:3px">'
                 f'<span style="font-size:13.5px;line-height:1.5;color:{INK}">{esc(text)}</span>'
                 f'<span style="font-size:11.5px;line-height:1.45;color:{INK3}">{esc(source)}</span></div>'
                 f'<span style="display:inline-flex;height:20px;flex:none;align-items:center;'
                 f'border-radius:5px;border:1px solid {tagbd};background:{tagbg};padding:0 8px;'
                 f'font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:{tagfg}">{tag}</span>'
                 f'</div>')

    left = (f'<div style="display:flex;min-width:0;flex-direction:column;gap:14px">'
            f'{kicker("Why it matters", "dark")}'
            f'<h2 style="margin:0;font-family:{SERIF};font-size:{28 if m else 42}px;line-height:1.05;'
            f'font-weight:400;letter-spacing:-0.02em;text-wrap:balance;color:{INK}">'
            f'Scheduling isn&rsquo;t admin. It shows up in your numbers.</h2>'
            f'<div style="margin-top:2px;display:flex;flex-direction:column;gap:1px;overflow:hidden;'
            f'border-radius:12px;border:1px solid {LINE};background:{LINE}">{rows}</div>'
            f'<span style="font-size:12px;line-height:1.55;color:{INK3}">About appointment scheduling in '
            f'general — not evidence about Meetrao.</span></div>')

    # The calculator: three live sliders, exactly cost-calculator.tsx's bounds.
    sl = ""
    for key, label, mn, mx, step in [("meetings", "Meetings a week", 1, 40, 1),
                                     ("minutes", "Minutes scheduling each", 1, 30, 1),
                                     ("rate", "Your hourly rate", 15, 400, 5)]:
        sl += (f'<div style="display:flex;flex-direction:column;gap:10px;'
               f'border-bottom:1px solid {LINE_SOFT};padding:13px 0">'
               f'<div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px">'
               f'<label style="cursor:pointer;font-size:13.5px;font-weight:500;color:{INK2}">{label}</label>'
               f'<span style="font-size:16px;font-weight:500;color:{{{{accent}}}}">{{{{{key}Display}}}}</span>'
               f'</div>'
               f'<input type="range" class="mr-range" min="{mn}" max="{mx}" step="{step}" '
               f'value="{{{{{key}}}}}" onChange="{{{{on{key.capitalize()}}}}}">'
               f'<div style="display:flex;justify-content:space-between;gap:10px">'
               f'<span style="font-size:10.5px;color:{INK3}">{{{{{key}Min}}}}</span>'
               f'<span style="font-size:10.5px;color:{INK3}">{{{{{key}Max}}}}</span></div></div>')

    calc = (f'<div style="box-sizing:border-box;display:flex;flex-direction:column;gap:16px;'
            f'align-self:flex-start;border-radius:14px;border:1px solid {LINE};background:{SURFACE};'
            f'padding:24px;box-shadow:{POP}">'
            f'<div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:10px">'
            f'<span style="font-size:15px;font-weight:600;color:{INK}">What the back-and-forth costs you</span>'
            f'<span style="font-size:10px;letter-spacing:0.07em;text-transform:uppercase;color:{INK3}">'
            f'Example only</span></div>{sl}'
            f'<div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;'
            f'gap:10px;padding-top:14px">'
            f'<div style="display:flex;flex-direction:column;gap:2px">'
            f'<span style="font-family:{SERIF};font-size:38px;line-height:1;color:{{{{accent}}}}">'
            f'≈ {{{{costText}}}}/mo</span>'
            f'<span style="font-size:12.5px;color:{INK3}">{{{{hoursText}}}} hrs of your month</span></div>'
            f'<span style="display:inline-flex;height:26px;align-items:center;border-radius:6px;'
            f'border:1px solid {ACCENT_LINE};background:{ACCENT_SOFT};padding:0 11px;font-size:12.5px;'
            f'font-weight:600;color:{{{{accent}}}}">Meetrao: $0</span></div></div>')

    return (f'<section style="margin-top:72px;border-top:1px solid {LINE};border-bottom:1px solid {LINE};'
            f'background:{FILL}">'
            f'<div style="margin:0 auto;max-width:1200px;padding:56px {pad}px">'
            f'<div style="display:grid;grid-template-columns:'
            f'{"minmax(0,1fr)" if m else "repeat(2,minmax(0,1fr))"};align-items:stretch;gap:34px">'
            f'{left}{calc}</div></div></section>')


def compare(w, m):
    pad = 18 if m else 26
    before_rows = ""
    for i, (label, waiting) in enumerate(BEFORE):
        before_rows += (f'<div style="margin-left:{i * 7}px;display:flex;align-items:center;gap:11px;'
                        f'border-radius:8px;border:1px solid {RED_LINE if waiting else LINE};'
                        f'background:{RED_SOFT if waiting else FILL};padding:7px 10px">'
                        f'<span style="flex:none;font-size:10.5px;letter-spacing:0.05em;'
                        f'color:{RED if waiting else INK3}">{str(i + 1).zfill(2)}</span>'
                        f'<span style="min-width:0;flex:1;font-size:13.5px;color:{INK}">{esc(label)}</span>'
                        + (f'<span style="flex:none;font-size:10px;letter-spacing:0.05em;'
                           f'text-transform:uppercase;color:{RED}">waiting</span>' if waiting else "")
                        + '</div>')

    def stats(items, value_color, label_color, bg, bd, px=18):
        cells = "".join(f'<div style="display:flex;flex-direction:column;gap:1px">'
                        f'<span style="font-family:{SERIF};font-size:22px;line-height:1;'
                        f'color:{value_color}">{v}</span>'
                        f'<span style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;'
                        f'color:{label_color}">{l}</span></div>' for v, l in items)
        return (f'<div style="display:flex;flex-wrap:wrap;gap:16px;border-top:1px solid {bd};'
                f'background:{bg};padding:13px {px}px">{cells}</div>')

    before_card = (f'<div style="display:flex;height:100%;flex-direction:column;overflow:hidden;'
                   f'border-radius:14px;border:1px solid {RED_LINE};background:{SURFACE}">'
                   f'<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;'
                   f'border-bottom:1px solid {RED_LINE};background:{RED_SOFT};padding:14px 18px">'
                   f'<span style="display:inline-flex;height:26px;width:26px;flex:none;align-items:center;'
                   f'justify-content:center;border-radius:9999px;background:{RED};color:#fff">'
                   f'{icon("xmark", 11, None, "solid")}</span>'
                   f'<span style="min-width:0;flex:1;font-size:14.5px;font-weight:600;color:{RED}">'
                   f'The email thread</span>'
                   f'<span style="flex:none;font-size:10.5px;letter-spacing:0.06em;text-transform:uppercase;'
                   f'color:{RED_INK}">Days, not minutes</span></div>'
                   f'<div style="display:flex;flex:1;flex-direction:column;gap:5px;padding:16px 18px 18px">'
                   f'{before_rows}</div>'
                   + stats([("8", "Steps"), ("2", "People"), ("~2 days", "Elapsed")],
                           RED, RED_INK, RED_SOFT, RED_LINE, 18) + '</div>')

    after_rows = ""
    for i, (nn, label, text, glyph) in enumerate(AFTER):
        after_rows += (f'<div style="display:flex;align-items:center;gap:14px;padding:17px 0;'
                       f'{"border-top:1px solid rgba(255,255,255,0.15);" if i else ""}">'
                       f'<span style="width:40px;flex:none;font-family:{SERIF};font-size:30px;line-height:1;'
                       f'letter-spacing:-0.016em;color:{MINT}">{nn}</span>'
                       f'<div style="display:flex;min-width:0;flex:1;flex-direction:column;gap:3px">'
                       f'<span style="font-size:15px;font-weight:600;letter-spacing:-0.005em;color:#fff">'
                       f'{label}</span>'
                       f'<span style="font-size:13px;line-height:1.5;text-wrap:pretty;'
                       f'color:rgba(255,255,255,0.7)">{esc(text)}</span></div>'
                       f'{icon(glyph, 14, "rgba(255,255,255,0.5)")}</div>')

    after_card = (f'<div style="display:flex;height:100%;flex-direction:column;overflow:hidden;'
                  f'border-radius:16px;background:{ACCENT2}">'
                  f'<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;'
                  f'gap:12px;border-bottom:1px solid rgba(255,255,255,0.15);padding:15px 20px">'
                  f'<span style="display:inline-flex;align-items:center;gap:10px;font-size:13.5px;'
                  f'font-weight:600;color:#fff">{icon("check", 13, MINT)}With Meetrao</span>'
                  f'<span style="font-size:10px;font-weight:500;letter-spacing:0.1em;'
                  f'text-transform:uppercase;color:{MINT}">Minutes, not days</span></div>'
                  f'<div style="display:flex;flex:1;flex-direction:column;justify-content:center;'
                  f'padding:6px 20px 12px">{after_rows}</div>'
                  + stats([("3", "Steps"), ("1", "Link"), ("~30 sec", "Elapsed")],
                          "#fff", MINT, "rgba(255,255,255,0.05)", "rgba(255,255,255,0.15)", 20) + '</div>')

    return (f'<section style="border-top:1px solid {LINE};background:{COMPARE_BG}">'
            f'<div style="margin:0 auto;max-width:1200px;padding:56px {pad}px">'
            + section_head("Before & after", "Eight steps become three.", 28 if m else 44, 600)
            + f'<div style="margin-top:26px;display:grid;grid-template-columns:'
              f'{"minmax(0,1fr)" if m else "repeat(2,minmax(0,1fr))"};align-items:stretch;gap:16px">'
              f'{before_card}{after_card}</div></div></section>')


# live-tables.tsx: replicas of the Meetings and Bookings screens. Column
# templates, rows and copy are that file's, verbatim.
MEET_COLS = "minmax(0,2.1fr) 68px minmax(0,1.45fr) 46px 152px"
BOOK_COLS = "minmax(0,1.5fr) minmax(0,1.05fr) 86px 162px 116px 124px"

TYPES = [("30 Minute Consultation", "A quick conversation to discuss your project.", 30,
          "30-minute-consultation", True),
         ("Project Deep Dive", "Review scope, timeline and budget in detail.", 60,
          "project-deep-dive", True),
         ("Intro Call", "Fifteen minutes to see if we're a fit.", 15, "intro-call", False)]

UPCOMING = [("John Smith", "john@example.com", "30 Minute Consultation", "Today", "3:00 – 3:30 PM", 30),
            ("Amina Chowdhury", "amina@northbridge.io", "Project Deep Dive", "Tomorrow", "11:00 – 12:00 PM", 60),
            ("Dan Whitfield", "dan@whitfield.dev", "Intro Call", "Mon 7 Sep", "9:30 – 9:45 AM", 15)]

TH_STYLE = ("font-size:10px;letter-spacing:0.07em;text-transform:uppercase;"
            "white-space:nowrap;color:" + INK2)


def initials(name):
    return "".join(part[0] for part in name.split()[:2]).upper()


def table_shell(caption, head, cols, rows, m, tabs=None, note=None):
    th = "".join(f'<span style="{TH_STYLE}">{h}</span>' for h in head)
    body = ""
    for i, cells in enumerate(rows):
        body += (f'<div style="display:grid;grid-template-columns:{cols};gap:14px;align-items:center;'
                 f'padding:11px 14px;{"border-top:1px solid " + LINE_SOFT + ";" if i else ""}">'
                 + "".join(cells) + '</div>')

    tabbar = ""
    if tabs:
        chips = ""
        for j, (label, count) in enumerate(tabs):
            on = j == 0
            chips += (f'<span style="margin-bottom:-1px;display:inline-flex;height:36px;align-items:center;'
                      f'gap:7px;border-bottom:2px solid {INK if on else "transparent"};padding:0 4px;'
                      f'font-size:13px;font-weight:600;color:{INK if on else INK2}">{label}'
                      f'<span style="display:inline-flex;height:17px;min-width:18px;align-items:center;'
                      f'justify-content:center;border-radius:4px;padding:0 5px;font-size:10.5px;'
                      f'font-weight:600;background:{INK if on else FILL2};'
                      f'color:{"#ffffff" if on else INK2}">{count}</span></span>')
        tabbar = (f'<div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;'
                  f'border-bottom:1px solid {LINE};background:{FILL};padding:0 14px">{chips}</div>')

    # The table scrolls sideways below its natural width rather than squashing —
    # live-tables.tsx wraps it in .scroll-x for the same reason.
    inner = (f'<div style="min-width:{640 if "Meeting" in head[0] else 660}px">'
             f'<div style="display:grid;grid-template-columns:{cols};gap:14px;'
             f'border-bottom:1px solid {LINE};background:{FILL};padding:9px 14px">{th}</div>'
             f'{body}</div>')

    return (f'<div style="display:flex;flex-direction:column;gap:8px;padding-top:24px">'
            f'<span style="font-size:16px;font-weight:600;letter-spacing:-0.008em;color:{INK}">'
            f'{caption}</span>'
            f'<div style="overflow:hidden;border-radius:12px;border:1px solid {LINE};'
            f'background:{SURFACE}">{tabbar}'
            f'<div style="overflow-x:auto">{inner}</div></div>'
            + (f'<span style="font-size:12.5px;line-height:1.5;color:{INK3}">{note}</span>' if note else "")
            + '</div>')


def product(w, m):
    pad = 18 if m else 26
    cards = ""
    for glyph, title, text in BENEFITS:
        cards += (f'<div style="display:flex;flex-direction:column;gap:10px;border-radius:14px;'
                  f'border:1px solid {LINE};background:{SURFACE};padding:22px 22px 24px">'
                  f'<span style="display:inline-flex;height:32px;width:32px;flex:none;align-items:center;'
                  f'justify-content:center;border-radius:9px;background:{ACCENT_SOFT};color:{{{{accent}}}}">'
                  f'{icon(glyph, 14)}</span>'
                  f'<span style="font-size:14.5px;font-weight:600;letter-spacing:-0.005em;color:{INK}">'
                  f'{esc(title)}</span>'
                  f'<span style="font-size:13px;line-height:1.55;text-wrap:pretty;color:{INK2}">'
                  f'{esc(text)}</span></div>')

    def two_line(a, b):
        return (f'<span style="display:flex;min-width:0;flex-direction:column;gap:2px">'
                f'<span style="font-size:13px;font-weight:600;color:{INK}">{esc(a)}</span>'
                f'<span style="font-size:12px;line-height:1.4;color:{INK3}">{esc(b)}</span></span>')

    def flat(t, size=13, color=None, weight=400, nowrap=True):
        return (f'<span style="font-size:{size}px;font-weight:{weight};color:{color or INK};'
                f'{"white-space:nowrap;" if nowrap else ""}">{esc(t)}</span>')

    def switch(on):
        return (f'<span style="display:inline-flex;height:18px;width:32px;flex:none;'
                f'border-radius:9999px;background:{ACCENT if on else LINE_STRONG};position:relative">'
                f'<span style="position:absolute;top:2px;{"right:2px" if on else "left:2px"};'
                f'height:14px;width:14px;border-radius:9999px;background:#fff"></span></span>')

    def copy_btn():
        return (f'<span style="display:inline-flex;height:28px;align-items:center;gap:7px;'
                f'border-radius:6px;border:1px solid {LINE_STRONG};background:{SURFACE};padding:0 10px;'
                f'font-size:12px;font-weight:600;color:{INK}">{icon("copy", 10, INK3)}Copy link</span>')

    def avatar(name):
        return (f'<span style="display:inline-flex;height:28px;width:28px;flex:none;align-items:center;'
                f'justify-content:center;border-radius:7px;background:{ACCENT_SOFT};font-size:11px;'
                f'font-weight:700;color:{ACCENT}">{initials(name)}</span>')

    meetings = table_shell(
        "Your meetings, and their links",
        ["Meeting", "Duration", "Booking link", "Active", ""],
        MEET_COLS,
        [[two_line(name, desc), flat(f"{mins} min", 13, INK2),
          flat(f"meetrao.com/adam/{slug}", 12, INK3), switch(on), copy_btn()]
         for name, desc, mins, slug, on in TYPES],
        m,
        note="Toggle a meeting or copy a link — the table is live. Nothing is saved.")

    bookings = table_shell(
        "Every booking, upcoming and past",
        ["Guest", "Meeting", "Date", "Time", "Status", ""],
        BOOK_COLS,
        [[f'<span style="display:flex;min-width:0;align-items:center;gap:10px">{avatar(g)}'
          + two_line(g, e) + '</span>',
          flat(meeting, 12.5, INK2, nowrap=False), flat(date, 12.5, INK2), flat(time, 12.5, INK),
          f'<span style="display:inline-flex;height:20px;width:fit-content;align-items:center;gap:6px;'
          f'border-radius:5px;border:1px solid {ACCENT_LINE};background:{ACCENT_SOFT};padding:0 8px;'
          f'font-size:11.5px;font-weight:600;color:{ACCENT}">Confirmed</span>',
          f'<span style="display:inline-flex;height:28px;align-items:center;gap:7px;border-radius:6px;'
          f'border:1px solid {LINE_STRONG};background:{SURFACE};padding:0 10px;font-size:12px;'
          f'font-weight:600;color:{INK}">{icon("video", 10, INK3)}Join</span>']
         for g, e, meeting, date, time, mins in UPCOMING],
        m, tabs=[("Upcoming", 3), ("Past", 2)])

    return (f'<section style="margin:0 auto;max-width:1200px;padding:72px {pad}px">'
            + section_head("What you get",
                           "Scheduling that respects the calendar you already keep.",
                           28 if m else 44, 620)
            + f'<div style="margin-top:26px;display:grid;grid-template-columns:'
              f'{"minmax(0,1fr)" if m else "repeat(3,minmax(0,1fr))"};gap:18px">{cards}</div>'
              f'<div style="margin-top:16px;display:flex;flex-direction:column;gap:16px">'
              f'{meetings}{bookings}</div></section>')


def usecases(w, m):
    """use-cases.tsx: one featured panel plus the next three as strips, a dot
    pager and prev/next. The feature is index 0 at rest. Photographs are read
    off disk by the real page (public/use-cases/<id>.jpg); where one is missing
    the card is a tinted frame, which is what these are — marked as frames
    rather than filled with a stock image that is not theirs."""
    pad = 18 if m else 26
    fid, fglyph, ftag, ftitle, ftext, fground = USE_CASES[0]

    def photo_frame(label, ground, radius):
        return (f'<span style="position:absolute;inset:0;z-index:1;background:{ground};'
                f'border-radius:{radius};display:flex;align-items:center;justify-content:center">'
                f'<span style="font-size:10px;letter-spacing:0.07em;text-transform:uppercase;'
                f'color:{INK3}">{label}</span></span>')

    scrim = ("linear-gradient(to top,rgba(11,23,20,0.92) 0%,rgba(11,23,20,0.66) 34%,"
             "rgba(11,23,20,0.12) 68%,rgba(11,23,20,0.04) 100%)")
    strip_scrim = ("linear-gradient(to top,rgba(11,23,20,0.9) 0%,rgba(11,23,20,0.5) 42%,"
                   "rgba(11,23,20,0.1) 80%)")

    feature = (f'<div style="position:relative;display:flex;min-width:0;flex:1 1 430px;'
               f'flex-direction:column;overflow:hidden;border-radius:16px;'
               f'min-height:{330 if m else 410}px;background:{fground}">'
               f'{photo_frame(ftag + " photography", fground, "0")}'
               f'<span style="position:absolute;inset:0;z-index:2;background:{scrim}"></span>'
               f'<div style="position:relative;z-index:3;margin-top:auto;display:flex;flex-wrap:wrap;'
               f'align-items:flex-end;justify-content:space-between;gap:16px;padding:24px">'
               f'<div style="display:flex;min-width:0;flex:1;flex-direction:column;gap:9px">'
               f'<span style="display:inline-flex;height:24px;align-self:flex-start;align-items:center;'
               f'gap:8px;border-radius:6px;border:1px solid rgba(255,255,255,0.3);'
               f'background:rgba(255,255,255,0.15);padding:0 10px;font-size:10px;font-weight:500;'
               f'letter-spacing:0.1em;text-transform:uppercase;color:#fff;backdrop-filter:blur(6px)">'
               f'{icon(fglyph, 10, MINT)}{ftag}</span>'
               f'<span style="font-family:{SERIF};font-size:{21 if m else 27}px;line-height:1.1;'
               f'font-weight:400;letter-spacing:-0.014em;text-wrap:balance;color:#fff">{esc(ftitle)}</span>'
               f'<span style="max-width:44ch;font-size:13.5px;line-height:1.55;text-wrap:pretty;'
               f'color:rgba(255,255,255,0.85)">{esc(ftext)}</span></div>'
               f'<a href="#" style="display:inline-flex;height:40px;flex:none;align-items:center;gap:9px;'
               f'border-radius:8px;background:#fff;padding:0 16px;font-size:13.5px;font-weight:600;'
               f'color:{INK};text-decoration:none">Create your free link{icon("arrow-right", 10)}</a>'
               f'</div></div>')

    strips = ""
    for sid, sglyph, stag, _t, _x, sground in USE_CASES[1:4]:
        strips += (f'<button type="button" style="position:relative;display:flex;min-width:0;flex:1 1 0;'
                   f'cursor:pointer;flex-direction:column;overflow:hidden;border-radius:14px;border:0;'
                   f'padding:0;background:{sground}">'
                   f'{photo_frame(stag, sground, "0")}'
                   f'<span style="position:absolute;inset:0;z-index:2;background:{strip_scrim}"></span>'
                   f'<span style="position:relative;z-index:3;margin-top:auto;display:flex;'
                   f'flex-direction:column;gap:7px;padding:14px 12px;text-align:left">'
                   f'<span style="display:inline-flex;height:26px;width:26px;flex:none;align-items:center;'
                   f'justify-content:center;border-radius:8px;background:rgba(255,255,255,0.2);'
                   f'color:{MINT};backdrop-filter:blur(6px)">{icon(sglyph, 11)}</span>'
                   f'<span style="font-size:13px;line-height:1.3;font-weight:600;text-wrap:balance;'
                   f'color:#fff">{stag}</span></span></button>')

    dots = "".join(f'<span style="height:8px;width:{22 if i == 0 else 8}px;border-radius:4px;'
                   f'background:{ACCENT if i == 0 else LINE_STRONG}"></span>'
                   for i in range(len(USE_CASES)))

    arrows = "".join(f'<span style="display:inline-flex;height:40px;width:40px;cursor:pointer;'
                     f'align-items:center;justify-content:center;border-radius:10px;'
                     f'border:1px solid {LINE};background:{SURFACE};color:{INK2}">'
                     f'{icon(d, 12)}</span>' for d in ["chevron-left", "chevron-right"])

    aside = ('' if m else
             f'<div style="margin-left:auto;display:flex;max-width:300px;flex:none;flex-direction:column;'
             f'gap:2px;text-align:right">'
             f'<span style="font-size:14px;line-height:1.45;font-weight:600;color:{INK}">'
             f'One link, your real availability,</span>'
             f'<span style="font-size:14px;line-height:1.45;color:{INK3}">'
             f'and a Google Meet link on every booking</span></div>')

    return (f'<section style="border-top:1px solid {LINE};border-bottom:1px solid {LINE};'
            f'background:{COMPARE_BG}">'
            f'<div style="margin:0 auto;max-width:1200px;padding:64px {pad}px">'
            f'<div style="display:flex;flex-direction:column;gap:22px">'
            f'<div style="display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:20px">'
            + section_head("Use cases",
                           "Every kind of work that starts with getting a time in the diary.",
                           28 if m else 44, 660, tag="h3")
            + aside + '</div>'
            + f'<div style="display:flex;flex-direction:column;gap:22px">'
              f'<div style="display:flex;flex-wrap:wrap;align-items:stretch;gap:10px">'
              f'{feature}'
              f'<div style="display:flex;min-height:170px;min-width:0;flex:1 1 250px;gap:10px">{strips}</div>'
              f'</div>'
              f'<div style="display:flex;flex-wrap:wrap;align-items:center;gap:14px">'
              f'<div style="display:flex;flex:none;gap:6px">{dots}</div>'
              f'<div style="margin-left:auto;display:flex;flex:none;align-items:center;gap:8px">{arrows}</div>'
              f'</div></div></div></div></section>')


FAQS = json.load(io.open("faqs.json", encoding="utf-8"))


def faq(w, m):
    pad = 18 if m else 26
    cols = [FAQS[:7], FAQS[7:]] if not m else [FAQS]
    out = ""
    for ci, items in enumerate(cols):
        base = 0 if ci == 0 else 7
        rows = ""
        for i in range(len(items)):
            idx = base + i
            rows += ('<div style="display:flex;flex-direction:column;background:{{f%d.rowBg}};'
                     '%s">'
                     '<button type="button" onClick="{{f%d.pick}}" class="faq-q">'
                     '<span style="min-width:0;flex:1;text-align:left">{{f%d.q}}</span>'
                     '<svg viewBox="0 0 24 24" class="ic" style="width:12px;height:12px;flex:none;'
                     'color:{{f%d.plusColor}};transform:{{f%d.plusRot}};'
                     'transition:transform 180ms cubic-bezier(.22,1,.36,1)">'
                     '<path d="%s"></path></svg></button>'
                     '<sc-if value="{{f%d.open}}" hint-placeholder-val="{{%s}}">'
                     '<div style="padding:0 18px 16px">'
                     '<span style="display:block;font-size:13.5px;line-height:1.65;text-wrap:pretty;'
                     'color:%s">{{f%d.a}}</span></div></sc-if></div>'
                     ) % (idx, ("border-top:1px solid " + LINE_SOFT + ";") if i else "",
                          idx, idx, idx, idx, ICONS["plus"], idx,
                          "true" if idx == 0 else "false", INK2, idx)
        out += (f'<div style="min-width:0;align-self:flex-start;overflow:hidden;border-radius:14px;'
                f'border:1px solid {LINE};background:{SURFACE}">{rows}</div>')

    cta = (f'<div style="margin-top:16px;display:flex;flex-wrap:wrap;align-items:center;gap:14px;'
           f'border-radius:12px;border:1px solid {LINE};background:{SURFACE};padding:15px 18px">'
           f'<span style="min-width:210px;flex:1;font-size:13.5px;line-height:1.55;color:{INK2}">'
           f'Something not answered here?</span>'
           f'<div style="display:flex;min-width:0;flex:0 1 auto;flex-wrap:wrap;gap:9px">'
           + "".join(f'<a href="#" style="display:inline-flex;height:36px;align-items:center;'
                     f'border-radius:7px;border:1px solid {LINE_STRONG};background:{SURFACE};'
                     f'padding:0 13px;font-size:13px;font-weight:600;color:{INK};text-decoration:none">'
                     f'{t}</a>' for t in ["Help centre", "Contact support"])
           + '</div></div>')

    return (f'<section style="border-top:1px solid {LINE};background:{FAQ_BG}">'
            f'<div style="margin:0 auto;max-width:1200px;padding:64px {pad}px">'
            + section_head("FAQ", "Questions people actually ask.", 28 if m else 44, 620, balance=False)
            + f'<div style="margin-top:26px;display:grid;grid-template-columns:'
              f'{"minmax(0,1fr)" if m else "repeat(2,minmax(0,1fr))"};align-items:flex-start;gap:14px">'
              f'{out}</div>{cta}</div></section>')


def footer(w, m):
    pad = 18 if m else 26

    # site-chrome.tsx: a SEPARATE rounded-20 card below the link columns, and a
    # bare 14px icon rather than a tinted tile.
    trust = "".join(
        f'<div style="display:flex;min-width:230px;flex:1;align-items:flex-start;gap:12px">'
        f'{icon(g, 14, "rgba(255,255,255,0.85)", extra="margin-top:2px;width:18px")}'
        f'<div style="display:flex;min-width:0;flex:1;flex-direction:column;gap:3px">'
        f'<span style="font-size:13.5px;font-weight:600;color:#fff">{esc(t)}</span>'
        f'<span style="font-size:13px;line-height:1.55;text-wrap:pretty;'
        f'color:rgba(255,255,255,0.85)">{esc(x)}</span></div></div>' for g, t, x in FOOTER_TRUST)

    cols = "".join(
        f'<div style="display:flex;min-width:0;flex-direction:column;gap:14px">'
        f'<span style="font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;'
        f'color:rgba(255,255,255,0.85)">{title}</span>'
        f'<div style="display:flex;flex-direction:column;gap:11px">'
        + "".join(f'<a href="#" style="font-size:14px;font-weight:400;'
                  f'color:rgba(255,255,255,0.85);text-decoration:none">{esc(l)}</a>' for l in links)
        + '</div></div>' for title, links in FOOTER_COLS)

    # The wordmark that closes the page: w-full, h-auto, 95% opacity. It fills
    # its container rather than the artboard — the column is 1200px capped and
    # padded, so sizing it to the frame overflows the page sideways.
    wordmark = (f'<div style="padding-bottom:30px;opacity:0.95">'
                f'{logo(fluid=True, white=True)}</div>')

    return (f'<footer style="background:{ACCENT2};color:#fff">'
            f'<div style="margin:0 auto;max-width:1200px;padding:0 {pad}px">'
            f'<div style="display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;'
            f'gap:30px;padding:76px 0 60px">'
            f'<div style="display:flex;min-width:290px;flex:1;flex-direction:column;gap:14px">'
            f'{kicker("Get started")}'
            f'<h2 style="margin:0;max-width:21ch;font-family:{SERIF};font-size:{34 if m else 66}px;'
            f'line-height:1;font-weight:400;letter-spacing:-0.024em;text-wrap:balance;color:#fff">'
            f'Your calendar already knows when you&rsquo;re free.</h2>'
            f'<p style="margin:0;max-width:46ch;font-size:15.5px;line-height:1.6;text-wrap:pretty;'
            f'color:rgba(255,255,255,0.75)">Let Meetrao handle the scheduling. It&rsquo;s completely free '
            f'to use — no card, no subscription.</p></div>'
            f'<div style="display:flex;min-width:0;flex:0 1 auto;flex-wrap:wrap;gap:10px">'
            f'<a href="#" style="display:inline-flex;height:52px;align-items:center;justify-content:center;'
            f'gap:10px;border-radius:8px;background:#fff;padding:0 24px;font-size:15px;font-weight:600;'
            f'color:{ACCENT2};text-decoration:none">Create your free booking link{icon("arrow-right", 12)}</a>'
            f'<a href="#" style="display:inline-flex;height:52px;align-items:center;justify-content:center;'
            f'gap:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.35);padding:0 21px;'
            f'font-size:15px;font-weight:600;color:#fff;text-decoration:none">'
            f'{icon("play", 12)}See how it works</a></div></div>'

            f'<div style="display:grid;grid-template-columns:'
            f'{"minmax(0,1fr)" if m else "minmax(240px,1.35fr) repeat(3,minmax(140px,1fr))"};'
            f'align-items:flex-start;column-gap:34px;row-gap:{30 if m else 44}px;margin:44px 0 30px">'
            f'{cols}</div>'

            f'<div style="display:flex;flex-wrap:wrap;gap:16px;border-radius:20px;'
            f'background:{FOOTER_INNER};padding:26px 30px;margin-bottom:30px">{trust}</div>'

            f'<div style="display:flex;flex-wrap:wrap;align-items:center;gap:16px;padding:22px 0 34px">'
            f'<span style="font-size:13px;color:rgba(255,255,255,0.6)">© 2026 Meetrao · Operated by '
            f'<a href="#" style="color:rgba(255,255,255,0.85);text-decoration:underline;'
            f'text-decoration-color:rgba(255,255,255,0.35);text-underline-offset:2px">Airly Studio</a>'
            f'</span>'
            f'<div style="margin-left:auto;display:flex;flex-wrap:wrap;gap:20px">'
            + "".join(f'<a href="#" style="font-size:13px;color:rgba(255,255,255,0.75);'
                      f'text-decoration:none">{t}</a>' for t in ["Privacy", "Terms", "Contact"])
            + f'</div></div>{wordmark}</div></footer>')


def how(w, m):
    pad = 18 if m else 26
    return (f'<section style="margin:0 auto;max-width:1200px;padding:72px {pad}px 0">'
            + section_head("How it works", "One link. One booking. Zero back-and-forth.",
                           30 if m else 50, 640, lh="1.03")
            + walkthrough(w, m) + '</section>')


HELMET = """
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&amp;family=Instrument+Serif&amp;display=swap">
  <style>
    body { margin: 0; font-family: %(sans)s; -webkit-font-smoothing: antialiased; }
    * { box-sizing: border-box; }
    a { color: %(accent)s; text-decoration: none; }
    a:hover { color: %(accent2)s; }
    button { font-family: inherit; }

    /* The in-house icon set's weight convention: Light 300 for objects and
       navigation, Solid for status, check and close. */
    .ic { display: block; flex: none; }
    .ic path { fill: none; stroke: currentColor; stroke-width: 1.4;
               stroke-linecap: square; stroke-linejoin: miter; }
    .ic-s path { stroke-width: 2.3; }
    .ic-f path { fill: currentColor; stroke: none; }

    /* Calendar cells and time slots. Only the state-driven colours are holes;
       everything shared lives here so the buttons stay one shape. */
    .cell { display: flex; align-items: center; justify-content: center; height: 30px;
            border-radius: 6px; border: 1px solid; font-family: inherit; font-size: 12.5px;
            cursor: pointer; transition: background-color 120ms, border-color 120ms; }
    .slot { display: flex; align-items: center; justify-content: center; height: 32px;
            border-radius: 6px; border: 1px solid; font-family: inherit; font-size: 12.5px;
            cursor: pointer; transition: background-color 120ms, border-color 120ms; }

    .faq-q { box-sizing: border-box; display: flex; width: 100%%; cursor: pointer;
             align-items: center; gap: 14px; border: 0; background: transparent;
             padding: 15px 18px; font-size: 14px; font-weight: 600; color: %(ink)s;
             transition: background-color 120ms; }
    .faq-q:hover { background: %(fill)s; }

    /* cost-calculator.tsx's slider, to the pixel. */
    .mr-range { -webkit-appearance: none; appearance: none; width: 100%%; height: 12px;
                border-radius: 6px; background: %(lineStrong)s; outline: none; cursor: pointer; }
    .mr-range::-webkit-slider-thumb { -webkit-appearance: none; width: 28px; height: 28px;
                border-radius: 50%%; background: %(accent)s; border: 3px solid #fff;
                box-shadow: 0 2px 6px rgba(26,25,23,0.3); cursor: pointer; }
    .mr-range::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%%;
                background: %(accent)s; border: 3px solid #fff;
                box-shadow: 0 2px 6px rgba(26,25,23,0.3); cursor: pointer; }

    /* The hero's living ground — globals.css mr-drift-a/b/c and mr-sweep. */
    .drift-a { animation: mr-drift-a 15s ease-in-out infinite; }
    .drift-b { animation: mr-drift-b 19s ease-in-out infinite; }
    .drift-c { animation: mr-drift-c 17s ease-in-out infinite; }
    .sweep   { animation: mr-sweep 6.5s ease-in-out infinite; }
    @keyframes mr-drift-a {
      0%%   { transform: translate3d(-16%%, -10%%, 0) scale(1); }
      33%%  { transform: translate3d(14%%, 8%%, 0) scale(1.34); }
      66%%  { transform: translate3d(4%%, -14%%, 0) scale(1.12); }
      100%% { transform: translate3d(-16%%, -10%%, 0) scale(1); }
    }
    @keyframes mr-drift-b {
      0%%   { transform: translate3d(16%%, 12%%, 0) scale(1.18); }
      33%%  { transform: translate3d(-18%%, -12%%, 0) scale(0.86); }
      66%%  { transform: translate3d(-4%%, 16%%, 0) scale(1.26); }
      100%% { transform: translate3d(16%%, 12%%, 0) scale(1.18); }
    }
    @keyframes mr-drift-c {
      0%%   { transform: translate3d(0, 0, 0) scale(1); }
      33%%  { transform: translate3d(-22%%, 16%%, 0) scale(1.42); }
      66%%  { transform: translate3d(18%%, -10%%, 0) scale(1.1); }
      100%% { transform: translate3d(0, 0, 0) scale(1); }
    }
    @keyframes mr-sweep {
      0%%   { opacity: 0; transform: translateX(-70%%) skewX(-8deg); }
      40%%  { opacity: 0.9; }
      100%% { opacity: 0; transform: translateX(70%%) skewX(-8deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .drift-a, .drift-b, .drift-c, .sweep { animation: none; }
    }
  </style>
""" % {"sans": SANS, "accent": ACCENT, "accent2": ACCENT2, "ink": INK,
       "fill": FILL, "lineStrong": LINE_STRONG}


SCRIPT = """
class Component extends DCLogic {
  constructor(props) {
    super(props);
    /* The three live things on this page, matching the real components'
       initial state: hero.tsx opens on the 9th with no slot picked,
       faq.tsx opens on "what", cost-calculator.tsx on 10 x 8 min at $75. */
    this.state = { day: 9, slot: '', open: 'what', meetings: 10, minutes: 8, rate: 75 };
  }

  renderVals() {
    var self = this;
    var s = this.state;
    var accent = this.props.accent || '%(accent)s';
    var ground = this.props.ground || '%(ground)s';

    /* demo-calendar.tsx: September 2026 starts on a Tuesday, so the 1st sits
       in column 2. Weekends and anything before the 7th are closed. */
    var FIRST_DOW = 2, DAYS = 30, TODAY = 7;
    var cells = [];
    for (var i = 0; i < FIRST_DOW; i++) cells.push({ empty: true, day: false, n: '' });
    for (var d = 1; d <= DAYS; d++) {
      var dow = (FIRST_DOW + d - 1) %% 7;
      var closed = dow === 0 || dow === 6 || d < TODAY;
      var on = !closed && d === s.day;
      var today = d === TODAY;
      cells.push({
        empty: false, day: true, n: String(d),
        bg: closed ? 'transparent' : (on ? accent : '%(surface)s'),
        bd: closed ? 'transparent' : ((on || today) ? accent : '%(line)s'),
        fg: closed ? '%(ink3)s' : (on ? '#ffffff' : (today ? accent : '%(ink)s')),
        op: closed ? '0.42' : '1',
        fw: (on || today) ? '600' : '500',
        pick: closed ? function () {} : (function (n) {
          return function () { self.setState({ day: n, slot: '' }); };
        })(d),
      });
    }

    var names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var dayLabel = names[(FIRST_DOW + s.day - 1) %% 7] + ', September ' + s.day;

    var slots = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '2:00 PM', '2:30 PM', '3:00 PM']
      .map(function (label) {
        var on = s.slot === label;
        return {
          label: label,
          bg: on ? accent : '%(surface)s',
          bd: on ? accent : '%(lineStrong)s',
          fg: on ? '#ffffff' : '%(ink)s',
          fw: on ? '600' : '500',
          pick: function () { self.setState({ slot: label }); },
        };
      });

    /* Four weeks a month, as cost-calculator.tsx computes it. */
    var hours = (s.meetings * 4 * s.minutes) / 60;
    var money = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };

    var vals = {
      accent: accent, ground: ground,
      cells: cells, slots: slots, dayLabel: dayLabel,
      meetings: s.meetings, minutes: s.minutes, rate: s.rate,
      meetingsDisplay: String(s.meetings),
      minutesDisplay: s.minutes + ' min',
      rateDisplay: money(s.rate),
      meetingsMin: '1', meetingsMax: '40',
      minutesMin: '1 min', minutesMax: '30 min',
      rateMin: '$15', rateMax: '$400',
      costText: money(hours * s.rate),
      hoursText: hours.toFixed(1),
      onMeetings: function (e) { self.setState({ meetings: Number(e.target.value) }); },
      onMinutes: function (e) { self.setState({ minutes: Number(e.target.value) }); },
      onRate: function (e) { self.setState({ rate: Number(e.target.value) }); },
    };

    /* One entry per FAQ row. Flat rather than a list because the two columns
       split the same array at 7 and each row is its own element. */
    FAQ_DATA.forEach(function (row, i) {
      var open = s.open === row[0];
      vals['f' + i] = {
        q: row[1], a: row[2], open: open,
        rowBg: open ? '%(fill)s' : 'transparent',
        plusColor: open ? accent : '%(ink3)s',
        plusRot: open ? 'rotate(45deg)' : 'rotate(0deg)',
        pick: (function (key) {
          return function () { self.setState({ open: s.open === key ? '' : key }); };
        })(row[0]),
      };
    });

    return vals;
  }
}
""" % {"accent": ACCENT, "surface": SURFACE, "line": LINE, "lineStrong": LINE_STRONG,
       "ink": INK, "ink3": INK3, "fill": FILL, "ground": GROUND}


def page(w):
    m = w < 700
    body = (nav(w, m) + hero(w, m) + problem(w, m) + how(w, m) + why(w, m)
            + compare(w, m) + product(w, m) + usecases(w, m) + faq(w, m) + footer(w, m))
    return (f'<div style="width:100%;background:{{{{ground}}}};font-family:{SANS};color:{INK}">'
            f'{body}</div>')


def document(w, height, note):
    props = json.dumps({
        "accent": {"editor": "color", "default": ACCENT, "section": "Brand",
                   "options": [ACCENT, "#2f4c63", "#98291f", "#7d5406"]},
        "ground": {"editor": "color", "default": GROUND, "section": "Brand",
                   "options": [GROUND, "#f4f3ee", "#eae8e1", "#ffffff"]},
        "$preview": {"width": w, "height": height},
    }, separators=(",", ":"))

    script = ("const FAQ_DATA = " + json.dumps(FAQS, ensure_ascii=False) + ";\n" + SCRIPT)

    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>{HELMET}</helmet>
<!-- {note} -->
{page(w)}
</x-dc>
<script data-dc-script data-props='{props}'>
{script}
</script>
</body>
</html>
"""


DESK_NOTE = ("Meetrao landing page at 1440 — the shipped page rebuilt from source. "
             "Values are lifted from globals.css, page.tsx, hero.tsx, site-chrome.tsx, "
             "cost-calculator.tsx, faq.tsx and demo-calendar.tsx, not eyeballed.")
PHONE_NOTE = ("The same page at 390 — the widths the real media queries produce: "
              "18px gutters, single-column grids, the 44px headline.")

io.open("Main.dc.html", "w", encoding="utf-8").write(document(1440, 7450, DESK_NOTE))
io.open("Mobile.dc.html", "w", encoding="utf-8").write(document(390, 11750, PHONE_NOTE))
print("wrote Main.dc.html and Mobile.dc.html")
