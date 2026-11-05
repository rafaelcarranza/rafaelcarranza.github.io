# add_papers.py: adding papers to the concept cloud

## Summary

The banner cloud on the About page is drawn from `cloud.csv` (term, freq, df,
cat). `add_papers.py` adds the counts from one or more new papers to that file
and copies it to `_data/cloud.csv`, the copy the page reads. After running it,
run `wordcloud.R` to refresh the no-script fallback (`cloud.svg`), and paste the
new SVG into `_includes/cloud.liquid` with each hex fill replaced by its
`var(--cw-<kind>-<0|1|2>)` variable.

```bash
python3 -I add_papers.py "/…/Gobierno PUC/Mis papers/2026 Bavaro et al Education.pdf" "…"
CLOUD_DIR="$PWD" Rscript wordcloud.R
```

## Rules

- **Corpus.** Published and accepted papers, one PDF each, in
  `Gobierno PUC/Mis papers`, named `YYYY Author et al Keyword.pdf`.
- **Text.** `pdftotext`, hyphenated line breaks rejoined, whitespace collapsed,
  cut at the last "References" heading, so the reference list and any appendix
  after it are not counted.
- **freq.** Case-insensitive count of the term's pattern, summed over papers.
  Patterns pool variants of one concept (e.g. Chile/Chilean, elite/elites,
  circumstance/circumstances, labour/labor market(s)).
- **df.** Number of papers that mention the concept at least 3 times.
- **cat.** topic, method, data or place. Sets the hue; frequency sets size and
  shade.
- **New concepts.** A term a new paper introduces goes in `NEW_TERMS` with its
  pattern and kind. Its count covers the whole corpus, not only the new paper.

## Decisions

- The original counts (September 2026) were made in a session whose patterns
  were not kept. They were reconstructed in November 2026 by matching the
  published PDFs against `cloud.csv`. Most terms reproduce exactly or within a
  few counts (inequality, Chile, poverty, circumstances, elites, Gini, EU-SILC,
  Europe, decomposition, Latin America, labour markets, top incomes, income
  inequality, moral hazard, SIMCE, CASEN, ELSOC, progressivity, neighbourhood
  effects, segregation, redistribution). For the rest, the pattern in the script
  is the closest literal match. Existing totals are kept as they were; only the
  new papers' counts are added.
- November 2026: added Bavaro, Carranza and Nolan, _Parents' education and
  children's household income across cohorts in Europe_ (ESR, accepted), and
  _The intergenerational transmission of disadvantage in Europe: a latent class
  analysis_ (SIR, accepted), from their working-paper PDFs. New terms: latent
  class analysis (method), birth cohorts (topic), material deprivation (topic).
  To fit 56 terms in the fallback SVG, the largest label went from 13 to 12.5 mm.

## Output

| File              | Content                                                        |
| ----------------- | -------------------------------------------------------------- |
| `cloud.csv`       | term, freq (total mentions), df (papers with ≥3 mentions), cat |
| `_data/cloud.csv` | identical copy, read by `_includes/cloud.liquid`               |
