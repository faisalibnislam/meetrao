"""Crudely expands the template (loops repeated, open branches kept, holes
filled) so a browser can report the real page height. Only used to size the
canvas frames — never shipped."""
import io, re, sys, json

VALS = {
    "ground": "#e7e4dc", "accent": "#14554a",
    "cell.bg": "#ffffff", "cell.bd": "#e0ddd4", "cell.fg": "#1a1917",
    "cell.op": "1", "cell.fw": "500", "cell.n": "26",
    "s.bg": "#ffffff", "s.bd": "#cfcbc0", "s.fg": "#1a1917", "s.fw": "500",
    "s.label": "10:30 AM", "dayLabel": "Wednesday, September 9",
    "costText": "$400", "hoursText": "5.3",
    "meetingsDisplay": "10", "minutesDisplay": "8 min", "rateDisplay": "$75",
    "meetingsMin": "1", "meetingsMax": "40", "minutesMin": "1 min",
    "minutesMax": "30 min", "rateMin": "$15", "rateMax": "$400",
    "meetings": "10", "minutes": "8", "rate": "75",
}
FAQS = json.load(io.open("faqs.json", encoding="utf-8"))
for i, row in enumerate(FAQS):
    VALS[f"f{i}.q"] = row[1]
    VALS[f"f{i}.a"] = row[2]
    VALS[f"f{i}.rowBg"] = "transparent"
    VALS[f"f{i}.plusColor"] = "#66635c"
    VALS[f"f{i}.plusRot"] = "rotate(0deg)"


def expand(src):
    head = re.search(r"<helmet>(.*?)</helmet>", src, re.S).group(1)
    body = src.split("</helmet>", 1)[1].split("</x-dc>", 1)[0]

    # sc-for -> the inner block repeated hint-placeholder-count times.
    def rep(mo):
        n = int(re.search(r'hint-placeholder-count="(\d+)"', mo.group(0)).group(1))
        return mo.group(2) * n
    body = re.sub(r'<sc-for([^>]*)>(.*?)</sc-for>', rep, body, flags=re.S)

    # sc-if -> keep the block when its placeholder says true.
    def branch(mo):
        return mo.group(2) if "{{true}}" in mo.group(1) else ""
    body = re.sub(r'<sc-if([^>]*)>(.*?)</sc-if>', branch, body, flags=re.S)

    body = re.sub(r"\{\{\s*([A-Za-z0-9_.$]+)\s*\}\}", lambda mo: VALS.get(mo.group(1), "X"), body)
    return f"<!doctype html><html><head><meta charset='utf-8'>{head}</head><body>{body}</body></html>"


for f in sys.argv[1:]:
    io.open(f.replace(".dc.html", ".measure.html"), "w", encoding="utf-8").write(
        expand(io.open(f, encoding="utf-8").read()))
    print("expanded", f)
