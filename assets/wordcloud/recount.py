# ---------------------------------------------------------------------------
# Purpose:   Recount every cloud term from scratch over the whole corpus
# Input:     the PDFs in Gobierno PUC/Mis papers; term patterns and kinds
#            from add_papers.py (P, NEW_TERMS) and kinds from cloud.csv
# Output:    cloud.csv and _data/cloud.csv, rewritten (term, freq, df, cat)
#            recount_by_paper.csv   long file: paper, year, term, n
#            _data/cloud_papers.csv term, paper, n for every pair with n >= 3,
#                                   which the page uses to link concepts
# Structure: 1. Patterns  2. Read text  3. Count  4. Write
#
# add_papers.py adds new papers to existing totals; this script rebuilds the
# totals so that every number in the cloud traces back to the PDFs. Terms with
# no match in any paper are dropped and listed.
# ---------------------------------------------------------------------------
import csv, glob, os, re, shutil, subprocess

HERE   = os.path.dirname(os.path.abspath(__file__))
CLOUD  = os.path.join(HERE, "cloud.csv")
DATA   = os.path.join(HERE, "..", "..", "_data", "cloud.csv")
LONG   = os.path.join(HERE, "recount_by_paper.csv")
LINKS  = os.path.join(HERE, "..", "..", "_data", "cloud_papers.csv")
CORPUS = os.path.expanduser("~/Library/CloudStorage/Dropbox/Gobierno PUC/Mis papers")
DF_MIN = 3

# **** 1. Patterns **********************************************************
# Read from add_papers.py so the patterns live in one place.
src = open(os.path.join(HERE, "add_papers.py")).read()
ns = {}
exec(src[src.index("P = {"):src.index("# **** 2.")], ns)
PAT = dict(ns["P"])
CAT = {r["term"]: r["cat"] for r in csv.DictReader(open(CLOUD))}
for term, (pat, cat) in ns["NEW_TERMS"].items():
    PAT[term] = pat
    CAT.setdefault(term, cat)
missing = [t for t in CAT if t not in PAT]
if missing:
    raise SystemExit(f"no pattern for: {missing}")

# **** 2. Read text *********************************************************

def body(pdf):
    """Full text up to the last References heading, whitespace collapsed."""
    t = subprocess.run(["pdftotext", "-enc", "UTF-8", pdf, "-"],
                       capture_output=True, text=True, check=True).stdout
    t = re.sub(r"-\n(?=[a-z])", "", t)
    t = re.sub(r"\s+", " ", t)
    hits = list(re.finditer(r"\b(References|REFERENCES|Bibliography)\b", t))
    return t[:hits[-1].start()] if hits else t

pdfs = sorted(glob.glob(os.path.join(CORPUS, "*.pdf")))
texts = {os.path.basename(p)[:-4]: body(p) for p in pdfs}

# **** 3. Count *************************************************************

rows, long_rows, dropped = [], [], []
for term in CAT:
    rx = re.compile(PAT[term], re.I)
    n = {paper: len(rx.findall(t)) for paper, t in texts.items()}
    long_rows += [[paper, paper[:4], term, k] for paper, k in n.items()]
    freq = sum(n.values())
    if freq == 0:
        dropped.append(term)
        continue
    rows.append({"term": term, "freq": freq,
                 "df": sum(k >= DF_MIN for k in n.values()), "cat": CAT[term]})
rows.sort(key=lambda r: -r["freq"])

# **** 4. Write *************************************************************

with open(CLOUD, "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=["term", "freq", "df", "cat"])
    w.writeheader()
    w.writerows(rows)
shutil.copyfile(CLOUD, DATA)
with open(LONG, "w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["paper", "year", "term", "n"])
    w.writerows(long_rows)
kept = {r["term"] for r in rows}
with open(LINKS, "w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["term", "paper", "n"])
    w.writerows([t, p, k] for p, _, t, k in long_rows if t in kept and k >= DF_MIN)
print(f"papers: {len(pdfs)} | terms kept: {len(rows)} | dropped (no match): {dropped}")
