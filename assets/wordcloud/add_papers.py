# ---------------------------------------------------------------------------
# Purpose:   Add newly published or accepted papers to the concept cloud
# Input:     cloud.csv (term, freq, df, cat) - current counts
#            PDFs of the papers to add, given on the command line
# Output:    cloud.csv rewritten with the new papers' counts added, and the
#            same file copied to _data/cloud.csv (the copy the page reads)
# Structure: 1. Terms and patterns  2. Read text  3. Count  4. Write
#
# Rules (see add_papers.md): counts come from the full text up to the last
# "References" heading, so reference lists and appendices are left out;
# matching is case-insensitive; freq is the total count; df is the number of
# papers that mention the concept at least DF_MIN times.
#
# Run:  python3 -I add_papers.py "/path/a.pdf" "/path/b.pdf"
# Add new concepts to NEW_TERMS first; their counts include the papers
# already in the cloud (CORPUS), so they enter on the same footing.
# ---------------------------------------------------------------------------

import csv, glob, os, re, shutil, subprocess, sys

HERE   = os.path.dirname(os.path.abspath(__file__))
CLOUD  = os.path.join(HERE, "cloud.csv")
DATA   = os.path.join(HERE, "..", "..", "_data", "cloud.csv")
CORPUS = "/Users/rcarranza/Library/CloudStorage/Dropbox/Gobierno PUC/Mis papers"
DF_MIN = 3

# **** 1. Terms and patterns ************************************************
# One pattern per cloud term. Most reproduce the counts already in cloud.csv
# from the published PDFs; the rest are the closest literal match.

P = {
    "inequality":                r"\binequalit(y|ies)\b",
    "Chile":                     r"\bChile(an)?s?\b",
    "poverty":                   r"\bpoverty\b",
    "childhood circumstances":   r"\bcircumstances?\b",
    "elites":                    r"\belites?\b",
    "Gini coefficient":          r"\bGini\b",
    "unemployment insurance":    r"\bunemployment insurance\b|\bUISA\b",
    "redistribution":            r"\bredistribut\w*",
    "EU-SILC":                   r"\bEU-SILC\b",
    "Europe":                    r"\bEurope(an)?\b",
    "job loss":                  r"\bjob loss(es)?\b|\bdisplaced workers?\b",
    "parental background":       r"\bparental (background|education|income|occupation|characteristics)\b|\bfamily background\b",
    "administrative records":    r"\badministrative (data|records?|registers?)\b|\bregisters?\b",
    "distributional national accounts": r"\bnational accounts?\b|\bDINA\b",
    "income inequality":         r"\bincome inequality\b",
    "decomposition":             r"\bdecompos\w*",
    "Latin America":             r"\bLatin America(n)?\b",
    "labour markets":            r"\blabou?r[\s-]+markets?\b",
    "segregation":               r"\bsegregat\w*",
    "top incomes":               r"\btop incomes?\b",
    "moral hazard":              r"\bmoral hazard\b",
    "counterfactual":            r"\bcounterfactual\w*",
    "wealth concentration":      r"\bwealth concentration\b|\bconcentrat\w* of wealth\b",
    "panel data":                r"\bpanel (data|survey)\b|\blongitudinal\b",
    "pensions":                  r"\bpensions?\b",
    "wealth inequality":         r"\bwealth inequality\b",
    "educational achievement":   r"\b(educational|academic) achievement\b",
    "SIMCE":                     r"\bSIMCE\b",
    "poverty persistence":       r"\bpoverty persistence\b|\bpersistence of poverty\b",
    "attitudes to inequality":   r"\battitudes? (to|towards?) inequality\b",
    "liquidity constraints":     r"\bliquidity constraints?\b",
    "inequality of opportunity": r"\b(in)?equality of opportunit(y|ies)\b",
    "quantile regression":       r"\bquantile regressions?\b",
    "survey correction":         r"\bsurvey corrections?\b",
    "welfare state":             r"\bwelfare\b",
    "machine learning":          r"\bmachine learning\b",
    "social cohesion":           r"\bsocial cohesion\b",
    "social class":              r"\bsocial class(es)?\b",
    "intergenerational mobility": r"\bintergenerational mobility\b|\bsocial mobility\b|\b(upward|downward|absolute|relative) mobility\b",
    "neighbourhood effects":     r"\bneighbou?rhood effects?\b",
    "WID":                       r"\bWID\b|\bWorld Inequality Database\b",
    "PSID":                      r"\bPSID\b",
    "earnings inequality":       r"\bearnings inequality\b",
    "taxes and transfers":       r"\btaxes and transfers\b",
    "informality":               r"\binformal\w*",
    "concentrated affluence":    r"\bconcentrated affluence\b",
    "census data":               r"\bcensus\b",
    "mediation analysis":        r"\bmediation\b",
    "CASEN":                     r"\bCASEN\b",
    "regression discontinuity":  r"\bregression discontinuit\w*",
    "progressivity":             r"\bprogressiv\w*",
    "multilevel models":         r"\bmultilevel\b|\bmulti-level\b",
    "ELSOC":                     r"\bELSOC\b",
}

# Concepts the new papers bring in: term -> (pattern, kind)
NEW_TERMS = {
    "latent class analysis": (r"\blatent class\w*", "method"),
    "birth cohorts":         (r"\bcohorts?\b", "topic"),
    "material deprivation":  (r"\bmaterial deprivation\b", "topic"),
}

# **** 2. Read text *********************************************************

def body(pdf):
    """Full text up to the last References heading, whitespace collapsed."""
    t = subprocess.run(["pdftotext", "-enc", "UTF-8", pdf, "-"],
                       capture_output=True, text=True, check=True).stdout
    t = re.sub(r"-\n(?=[a-z])", "", t)          # rejoin hyphenated breaks
    t = re.sub(r"\s+", " ", t)
    hits = list(re.finditer(r"\b(References|REFERENCES|Bibliography)\b", t))
    return t[:hits[-1].start()] if hits else t

def count(pattern, texts):
    rx = re.compile(pattern, re.I)
    n = [len(rx.findall(t)) for t in texts]
    return sum(n), sum(k >= DF_MIN for k in n)

new_pdfs = sys.argv[1:]
if not new_pdfs:
    sys.exit("give the PDFs to add")
new_txt = [body(p) for p in new_pdfs]

# **** 3. Count *************************************************************

with open(CLOUD, newline="") as fh:
    rows = list(csv.DictReader(fh))

missing = [r["term"] for r in rows if r["term"] not in P]
if missing:
    sys.exit(f"no pattern for: {missing}")

print(f"{'term':34s} {'freq':>9} {'df':>7}")
for r in rows:
    f, d = count(P[r["term"]], new_txt)
    if f:
        print(f"{r['term']:34s} {r['freq']:>4}+{f:<4} {r['df']:>3}+{d}")
    r["freq"] = int(r["freq"]) + f
    r["df"]   = int(r["df"]) + d

if NEW_TERMS:
    # new concepts also count the papers already in the cloud
    old = [p for p in sorted(glob.glob(os.path.join(CORPUS, "*.pdf")))
           if os.path.basename(p) not in {os.path.basename(q) for q in new_pdfs}]
    old_txt = [body(p) for p in old]
    have = {r["term"] for r in rows}
    for term, (pat, cat) in NEW_TERMS.items():
        if term in have:
            continue
        f0, d0 = count(pat, old_txt)
        f1, d1 = count(pat, new_txt)
        print(f"{term:34s} new: {f0}+{f1}, df {d0}+{d1}  ({len(old)} old papers)")
        rows.append({"term": term, "freq": f0 + f1, "df": d0 + d1, "cat": cat})

rows.sort(key=lambda r: -int(r["freq"]))

# **** 4. Write *************************************************************

with open(CLOUD, "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=["term", "freq", "df", "cat"])
    w.writeheader()
    w.writerows(rows)
shutil.copyfile(CLOUD, DATA)
print(f"terms: {len(rows)} | written: {CLOUD} and _data/cloud.csv")
