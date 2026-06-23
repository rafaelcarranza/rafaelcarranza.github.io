---
layout: page
title: research
permalink: /research/
description:
nav: true
nav_order: 1
---

### Work in progress

- The concentration of children over time and its consequences for income inequality and poverty
  (with [Berkay Özcan](https://berkayozcan.net/)) <span class="status-pill status-pill--inprogress">In progress</span>

- Social class and earnings inequality in Chile: A decomposition over the long run
  (with [Gabriel Otero](https://icso.udp.cl/investigador/gabriel-otero/)) <span class="status-pill status-pill--inprogress">In progress</span>

- Elites in times of social crisis: Attitudes toward inequality during Chile's 2019 uprising
  (with [Gabriel Otero](https://icso.udp.cl/investigador/gabriel-otero/) and [Dante Contreras](https://fen.uchile.cl/academicos/dante-contreras/)) <span class="status-pill status-pill--submitted">Submitted</span>

- Intergenerational Poverty in Europe: A Latent Class Analysis
  (with [Michele Bavaro](https://scholar.google.com/citations?user=TPLZEzQAAAAJ&hl=it) and [Brian Nolan](https://www.spi.ox.ac.uk/people/professor-brian-nolan)) <span class="status-pill status-pill--rr">R&amp;R</span>

- The size and progressivity of taxes and transfers when the income concept changes
  (with [Brian Nolan](https://www.spi.ox.ac.uk/people/professor-brian-nolan)) <span class="status-pill status-pill--rr">R&amp;R</span>

- Parents' Education and Children's Household Income Across Cohorts in Europe
  (with [Michele Bavaro](https://scholar.google.com/citations?user=TPLZEzQAAAAJ&hl=it) and [Brian Nolan](https://www.spi.ox.ac.uk/people/professor-brian-nolan)) <span class="status-pill status-pill--accepted">Accepted</span>

---

### Published papers

<nav class="year-nav" aria-label="Jump to year">
  <a href="#y2026">2026</a>
  <span class="year-nav__sep">·</span>
  <a href="#y2025">2025</a>
  <span class="year-nav__sep">·</span>
  <a href="#y2024">2024</a>
  <span class="year-nav__sep">·</span>
  <a href="#y2023">2023</a>
  <span class="year-nav__sep">·</span>
  <a href="#y2022">2022</a>
  <span class="year-nav__sep">·</span>
  <a href="#y2019">2019</a>
  <span class="year-nav__sep">·</span>
  <a href="#y2017">2017</a>
</nav>

<div class="publications research-publications">

{% bibliography %}

</div>

---

### PhD thesis

Carranza, R. (2021). _Essays on inequality of opportunity: measurement, drivers and consequences_. London School of Economics and Political Science.
[etheses.lse.ac.uk/4270](http://etheses.lse.ac.uk/4270)

---

### Working papers

- Bavaro, M., Carranza, R., & Nolan, B. (2025). Parents' education and children's household income across cohorts in Europe. _INET Oxford Working Paper Series_ No. 2025-13.
  [inet.ox.ac.uk/publications/no-2025-13](https://www.inet.ox.ac.uk/publications/no-2025-13-parents-education-and-childrens-household-income-across-cohorts-in-europe)

- Bavaro, M., Carranza, R., & Nolan, B. (2025). Intergenerational poverty in Europe: A latent class analysis. _INET Oxford Working Paper Series_ No. 2025-07.
  [inet.ox.ac.uk/publications/no-2025-07](https://www.inet.ox.ac.uk/publications/no-2025-07-intergenerational-poverty-in-europe-a-latent-class-analysis)

- Carranza, R., Flores, J., & Flores, C. (2024). Intergenerational Persistence in Income and Earnings: The case of Chile. _Centro de Estudios de Conflicto y Cohesión Social (COES)_.
  [coes.cl/wp-content/uploads/Intergenerational-persistence...](https://coes.cl/wp-content/uploads/Intergenerational-persistence-in-income-and-earnings_The-case-of-Chile.pdf)

- Carranza, R., De Rosa, M., & Flores, I. (2023). Wealth Inequality in Latin America. _Latin America and Caribbean Inequality Review (LACIR)_.
  [lacir.lse.ac.uk/publications/wealth-inequality-in-latin-america](http://lacir.lse.ac.uk/en-gb/publications/wealth-inequality-in-latin-america)

- Bavaro, M., Carranza, R., & Nolan, B. (2023). Intergenerational Poverty Persistence in Europe — Is There a 'Great Gatsby Curve' for Poverty? _INET Oxford Working Paper_ No. 2023-22.
  [inet.ox.ac.uk/publications/no-2023-22](https://www.inet.ox.ac.uk/publications/no-2023-22-intergenerational-poverty-persistence-in-europe/)

- Carranza, R., Morgan, M., & Nolan, B. (2021). Top Income Adjustments and Inequality: An Investigation of the EU-SILC. _INET Oxford Working Paper_ No. 2021-16.
  [inet.ox.ac.uk/publications/no-2021-16](http://www.inet.ox.ac.uk/publications/no-2021-16-top-income-adjustments-and-inequality-an-investigation-of-the-eu-silc/)

- Carranza, R. (2020). Inequality of Outcomes, Inequality of Opportunity, and Economic Growth.
  [bit.ly/2A0CwH8](http://bit.ly/2A0CwH8)

- Carranza, R. (2020). Upper and lower bound estimates of inequality of opportunity: A cross-national comparison for Europe.
  [bit.ly/2Nyza0r](http://bit.ly/2Nyza0r)

- Otero, G., Carranza, R., & Contreras, D. (2020). Living in wealthy areas: How much does it matter for educational achievement?
  [bit.ly/2MOnKWP](https://bit.ly/2MOnKWP)

- Carranza, R., & Hojman, D. (2016). Inequality of Opportunity in Health and Cognitive Abilities: The Case of Chile.
  [bit.ly/2TYtfp5](http://bit.ly/2TYtfp5)

- Sehnbruch, K., & Carranza, R. (2015). Unemployment Insurance based on Individual Savings Accounts: Lessons for other Latin American and Developing Countries from Chile.
  [bit.ly/38Hh0m8](http://bit.ly/38Hh0m8)

<script>
  // Tag each year heading inside the published-papers bibliography so the
  // "Jump to year" nav at the top can scroll to it. jekyll-scholar renders
  // each group as a heading (h2 or h3) with class "bibliography" and the
  // year as its text content.
  document.addEventListener("DOMContentLoaded", function () {
    var container = document.querySelector(".research-publications");
    if (!container) return;
    var headings = container.querySelectorAll("h1.bibliography, h2.bibliography, h3.bibliography");
    headings.forEach(function (h) {
      var year = (h.textContent || "").trim().match(/\d{4}/);
      if (year && !h.id) {
        h.id = "y" + year[0];
      }
    });
  });
</script>
