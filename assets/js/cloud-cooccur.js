/* Concept cloud laid out by shared papers.
 *
 * Successor to cloud.js (kept for rollback). Words that are used together in
 * the same papers sit close to each other. Hovering a word fades the rest and
 * draws lines to the concepts it shares papers with; a click or tap keeps that
 * view until the word is clicked again or the click lands on empty space.
 *
 * Link rule. A paper counts for a concept when the concept appears in it 3 or
 * more times. Two concepts are linked by the Jaccard index of their paper
 * sets, |A and B| / |A or B|, and only when they share at least one paper.
 * Concepts with no such paper have no links and sit at the ends.
 *
 * Layout. Classical multidimensional scaling on 1 - Jaccard gives target
 * positions; boxes are then pushed apart until no two words overlap.
 *
 * Data: _data/cloud.csv (term, freq, df, cat) and _data/cloud_papers.csv
 * (term, paper, n, pairs with n >= 3), both written by
 * assets/wordcloud/recount.py and passed in by _includes/cloud.liquid.
 */
(function () {
  "use strict";

  var N_PAPERS = 16; // PDFs in the corpus, for the tooltip
  var MAX_NEAR = 6; // lines drawn from a focused word

  var host = document.getElementById("cloud-live");
  var raw = document.getElementById("cloud-data");
  var rawLinks = document.getElementById("cloud-links");
  if (!host || !raw || !window.requestAnimationFrame) return;

  var words, pairs;
  try {
    words = JSON.parse(raw.textContent);
    pairs = rawLinks ? JSON.parse(rawLinks.textContent) : [];
  } catch (e) {
    return;
  }
  if (!words.length) return;

  words.sort(function (a, b) {
    return b.freq - a.freq;
  });

  // paper sets per term
  var papersOf = {};
  pairs.forEach(function (p) {
    (papersOf[p[0]] = papersOf[p[0]] || {})[p[1]] = p[2];
  });
  words.forEach(function (w) {
    w.papers = papersOf[w.term] || {};
    w.np = Object.keys(w.papers).length;
  });

  function jaccard(a, b) {
    if (!a.np || !b.np) return { j: 0, shared: 0 };
    var shared = 0;
    for (var k in a.papers) if (b.papers[k]) shared++;
    return { j: shared / (a.np + b.np - shared), shared: shared };
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");

  // How many words and what shape, by the width available (as in cloud.js).
  function planFor(width) {
    var max = Math.max(17, Math.min(26, width / 42));
    if (width >= 860) return { count: words.length, aspect: 5.2, min: 10.5, max: max };
    if (width >= 640) return { count: words.length, aspect: 3.0, min: 10, max: max };
    if (width >= 460) return { count: 46, aspect: 2.0, min: 10, max: max };
    if (width >= 360) return { count: 38, aspect: 1.4, min: 10, max: max };
    return { count: 30, aspect: 1.05, min: 10, max: max };
  }

  var FONT = '600 %spx "Source Serif 4", Georgia, serif';

  function measure(word, size) {
    ctx.font = FONT.replace("%s", size);
    return { w: ctx.measureText(word).width + size * 0.42, h: size * 1.3 };
  }

  /* ---------- multidimensional scaling ---------- */

  // Top two eigenvectors of a symmetric matrix by orthogonal iteration.
  function top2(B) {
    var n = B.length;
    var shift = 0;
    for (var i = 0; i < n; i++) {
      var s = 0;
      for (var j = 0; j < n; j++) s += Math.abs(B[i][j]);
      if (s > shift) shift = s;
    }
    var V = [];
    for (i = 0; i < n; i++) V.push([Math.sin(i + 1), Math.cos(2 * i + 1)]);
    for (var it = 0; it < 400; it++) {
      var W = [];
      for (i = 0; i < n; i++) {
        var a = shift * V[i][0];
        var b = shift * V[i][1];
        for (j = 0; j < n; j++) {
          a += B[i][j] * V[j][0];
          b += B[i][j] * V[j][1];
        }
        W.push([a, b]);
      }
      // Gram-Schmidt
      var n0 = 0;
      for (i = 0; i < n; i++) n0 += W[i][0] * W[i][0];
      n0 = Math.sqrt(n0) || 1;
      var dot = 0;
      for (i = 0; i < n; i++) {
        W[i][0] /= n0;
        dot += W[i][0] * W[i][1];
      }
      var n1 = 0;
      for (i = 0; i < n; i++) {
        W[i][1] -= dot * W[i][0];
        n1 += W[i][1] * W[i][1];
      }
      n1 = Math.sqrt(n1) || 1;
      for (i = 0; i < n; i++) W[i][1] /= n1;
      V = W;
    }
    return V;
  }

  function mds(list) {
    var n = list.length;
    var D2 = [];
    for (var i = 0; i < n; i++) {
      D2.push([]);
      for (var j = 0; j < n; j++) {
        var d = i === j ? 0 : 1 - list[i].link[list[j].idx].j;
        D2[i].push(d * d);
      }
    }
    // double centring: B = -1/2 J D2 J
    var row = D2.map(function (r) {
      return (
        r.reduce(function (s, v) {
          return s + v;
        }, 0) / n
      );
    });
    var all =
      row.reduce(function (s, v) {
        return s + v;
      }, 0) / n;
    var B = D2.map(function (r, i) {
      return r.map(function (v, j) {
        return -0.5 * (v - row[i] - row[j] + all);
      });
    });
    return top2(B);
  }

  /* ---------- layout ---------- */

  function layout(laid, aspect) {
    var n = laid.length;
    var linked = laid.filter(function (it) {
      return it.d.np > 0;
    });
    var loose = laid.filter(function (it) {
      return it.d.np === 0;
    });

    var area = laid.reduce(function (s, it) {
      return s + it.box.w * it.box.h;
    }, 0);
    var Wt = Math.sqrt(area * aspect * 1.7);
    var Ht = Wt / aspect;

    if (linked.length > 2) {
      var V = mds(linked);
      [0, 1].forEach(function (k) {
        var m = 0;
        var sd = 0;
        V.forEach(function (v) {
          m += v[k];
        });
        m /= V.length;
        V.forEach(function (v) {
          sd += (v[k] - m) * (v[k] - m);
        });
        sd = Math.sqrt(sd / V.length) || 1;
        var span = k === 0 ? Wt : Ht;
        linked.forEach(function (it, i) {
          it[k === 0 ? "tx" : "ty"] = ((V[i][k] - m) / sd) * span * 0.2;
        });
      });
    } else {
      linked.forEach(function (it, i) {
        it.tx = (i - linked.length / 2) * 40;
        it.ty = 0;
      });
    }
    loose.forEach(function (it, i) {
      it.tx = (i % 2 ? 1 : -1) * Wt * 0.55;
      it.ty = (Math.floor(i / 2) - 0.5) * it.box.h * 1.4;
    });
    laid.forEach(function (it) {
      it.x = it.tx;
      it.y = it.ty;
    });

    // push overlapping boxes apart; a fading pull keeps the MDS structure
    var hBias = Math.max(1, Math.min(3.5, aspect / 1.6));
    var ITER = 700;
    var PULL_END = 300;
    var SETTLE = 640; // last iterations resolve overlaps only
    for (var it = 0; it < ITER; it++) {
      var pull = it < PULL_END ? 0.03 * (1 - it / PULL_END) : 0;
      if (it >= PULL_END && it < SETTLE) {
        // gravity, stronger vertically, closes the gaps the scaling leaves
        for (var g = 0; g < n; g++) {
          laid[g].x -= laid[g].x * 0.012;
          laid[g].y -= laid[g].y * 0.05;
        }
      }
      var moved = false;
      for (var a = 0; a < n; a++) {
        var A = laid[a];
        for (var b = a + 1; b < n; b++) {
          var Bx = laid[b];
          var dx = Bx.x - A.x;
          var dy = Bx.y - A.y;
          var ox = (A.box.w + Bx.box.w) / 2 - Math.abs(dx);
          var oy = (A.box.h + Bx.box.h) / 2 - Math.abs(dy);
          if (ox <= 0 || oy <= 0) continue;
          moved = true;
          // move along the axis that needs less travel, weighted towards
          // sideways moves on wide screens so the block stays a band
          if (oy * hBias < ox) {
            var sy = dy === 0 ? (a % 2 ? 1 : -1) : Math.sign(dy);
            A.y -= (sy * oy) / 2;
            Bx.y += (sy * oy) / 2;
          } else {
            var sx = dx === 0 ? (a % 2 ? 1 : -1) : Math.sign(dx);
            A.x -= (sx * ox) / 2;
            Bx.x += (sx * ox) / 2;
          }
        }
        if (pull) {
          A.x += (A.tx - A.x) * pull;
          A.y += (A.ty - A.y) * pull;
        }
      }
      if (!moved && it >= SETTLE) break;
    }

    var b0 = { x1: Infinity, x2: -Infinity, y1: Infinity, y2: -Infinity };
    laid.forEach(function (k) {
      b0.x1 = Math.min(b0.x1, k.x - k.box.w / 2);
      b0.x2 = Math.max(b0.x2, k.x + k.box.w / 2);
      b0.y1 = Math.min(b0.y1, k.y - k.box.h / 2);
      b0.y2 = Math.max(b0.y2, k.y + k.box.h / 2);
    });
    return b0;
  }

  var MIN_LEGIBLE = 10;

  function attempt(plan, count, width) {
    var use = words.slice(0, count);
    var logs = use.map(function (w) {
      return Math.log(w.freq);
    });
    var lo = Math.min.apply(null, logs);
    var hi = Math.max.apply(null, logs);

    var laid = use.map(function (w, k) {
      var rel = hi === lo ? 1 : (logs[k] - lo) / (hi - lo);
      var size = plan.min + rel * (plan.max - plan.min);
      return { d: w, idx: k, size: size, rel: rel, box: measure(w.term, size) };
    });
    laid.forEach(function (a) {
      a.link = laid.map(function (b) {
        return a === b ? { j: 0, shared: 0 } : jaccard(a.d, b.d);
      });
    });

    // adjust the aspect until the block uses the width without overflowing
    var aspect = plan.aspect;
    var box = layout(laid, aspect);
    var best = null;
    for (var i = 0; i < 8; i++) {
      var got = box.x2 - box.x1;
      if (got <= width && (!best || got > best.got)) best = { got: got, aspect: aspect };
      if (got <= width && got > width * 0.9) break;
      aspect *= Math.pow((width * 0.96) / got, 0.8);
      aspect = Math.max(0.5, Math.min(10, aspect));
      box = layout(laid, aspect);
    }
    if (box.x2 - box.x1 > width && best) box = layout(laid, best.aspect);
    var fit = Math.min(1, width / (box.x2 - box.x1));
    return { laid: laid, box: box, fit: fit, smallest: plan.min * fit };
  }

  /* ---------- render ---------- */

  var current = null;
  var shown = []; // { el, item }
  var svg = null;
  var focused = null;
  var pinned = false;
  var firstBuild = true;
  var SVGNS = "http://www.w3.org/2000/svg";

  function tooltip(item, laid) {
    var near = neighbours(item, laid).map(function (o) {
      return o.it.d.term + " (" + o.l.shared + ")";
    });
    var t = item.d.term + " \u2014 " + item.d.freq + " mentions in the papers; 3 or more in " + item.d.df + " of " + N_PAPERS + " papers";
    if (near.length) t += "\nShares papers with: " + near.join(", ");
    return t;
  }

  function neighbours(item, laid) {
    return laid
      .map(function (it) {
        return { it: it, l: item.link[it.idx] };
      })
      .filter(function (o) {
        return o.l.shared > 0;
      })
      .sort(function (a, b) {
        return b.l.j - a.l.j || b.l.shared - a.l.shared || b.it.d.freq - a.it.d.freq;
      })
      .slice(0, MAX_NEAR);
  }

  function build() {
    var width = host.clientWidth || (host.parentNode && host.parentNode.clientWidth) || 0;
    if (!width) return;
    var plan = planFor(width);

    var count = plan.count;
    var result = attempt(plan, count, width);
    var guard = 0;
    while (result.smallest < MIN_LEGIBLE && count > 16 && guard++ < 6) {
      count = Math.max(16, Math.round(count * 0.82));
      result = attempt(plan, count, width);
    }

    var box = result.box;
    var fit = result.fit;
    var h = (box.y2 - box.y1) * fit;
    var offX = (width - (box.x2 - box.x1) * fit) / 2;

    host.textContent = "";
    focused = null;
    setPinned(false);
    host.classList.remove("has-focus");
    svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "cloud__links");
    host.appendChild(svg);

    var frag = document.createDocumentFragment();
    shown = result.laid.map(function (item) {
      var el = document.createElement("span");
      el.className = "cw cw--" + item.d.cat;
      el.dataset.depth = item.rel > 0.66 ? "2" : item.rel > 0.33 ? "1" : "0";
      el.dataset.i = item.idx;
      el.textContent = item.d.term;
      el.style.fontSize = item.size * fit + "px";
      el.style.left = offX + (item.x - box.x1) * fit + "px";
      el.style.top = (item.y - box.y1) * fit + "px";
      el.title = tooltip(item, result.laid);
      frag.appendChild(el);
      return { el: el, item: item };
    });
    host.appendChild(frag);
    host.style.height = Math.round(h) + "px";
    host.dataset.shown = shown.length;
    current = width;

    if (firstBuild && !reduceMotion) entrance(width / 2, h / 2);
    firstBuild = false;
  }

  // Words drift out from the centre on the first layout.
  function entrance(cx, cy) {
    shown.forEach(function (s) {
      var x = parseFloat(s.el.style.left);
      var y = parseFloat(s.el.style.top);
      s.el.style.transition = "none";
      s.el.style.opacity = "0";
      s.el.style.transform = "translate(" + (cx - x) * 0.85 + "px," + (cy - y) * 0.85 + "px)";
    });
    void host.offsetWidth;
    shown.forEach(function (s, k) {
      s.el.style.transition = "transform 1100ms cubic-bezier(0.2, 0.8, 0.2, 1) " + k * 12 + "ms, opacity 700ms ease " + k * 12 + "ms";
      s.el.style.opacity = "";
      s.el.style.transform = "";
    });
    setTimeout(function () {
      shown.forEach(function (s) {
        s.el.style.transition = "";
      });
    }, 1900);
  }

  /* ---------- focus and lines ---------- */

  // Layout position (left/top mark the centre) plus any drag or spring offset.
  function centreOf(el) {
    var x = parseFloat(el.style.left);
    var y = parseFloat(el.style.top);
    var tf = getComputedStyle(el).transform;
    if (tf && tf !== "none") {
      try {
        var m = new DOMMatrixReadOnly(tf);
        x += m.m41;
        y += m.m42;
      } catch (e) {}
    }
    return { x: x, y: y };
  }

  function drawLines() {
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!focused) return;
    var c0 = centreOf(focused.el);
    focused.near.forEach(function (o) {
      var c1 = centreOf(o.el);
      var ln = document.createElementNS(SVGNS, "line");
      ln.setAttribute("x1", c0.x);
      ln.setAttribute("y1", c0.y);
      ln.setAttribute("x2", c1.x);
      ln.setAttribute("y2", c1.y);
      ln.setAttribute("stroke-width", (0.8 + 2.6 * o.j).toFixed(2));
      ln.setAttribute("class", "cloud__link cloud__link--" + focused.item.d.cat);
      svg.appendChild(ln);
    });
  }

  // keep lines attached while words move (entrance, spring back)
  var trackUntil = 0;
  function track(ms) {
    var start = !trackUntil || trackUntil < performance.now();
    trackUntil = Math.max(trackUntil, performance.now() + ms);
    if (!start) return;
    (function loop() {
      drawLines();
      if (performance.now() < trackUntil) requestAnimationFrame(loop);
      else trackUntil = 0;
    })();
  }

  function focusOn(entry) {
    clearFocus();
    var laid = shown.map(function (s) {
      return s.item;
    });
    var near = neighbours(entry.item, laid).map(function (o) {
      return { el: shown[o.it.idx].el, j: o.l.j };
    });
    focused = { el: entry.el, item: entry.item, near: near };
    host.classList.add("has-focus");
    entry.el.classList.add("is-focus");
    near.forEach(function (o) {
      o.el.classList.add("is-near");
    });
    drawLines();
  }

  function clearFocus() {
    if (!focused) return;
    focused.el.classList.remove("is-focus");
    focused.near.forEach(function (o) {
      o.el.classList.remove("is-near");
    });
    focused = null;
    host.classList.remove("has-focus");
    drawLines();
  }

  function setPinned(v) {
    pinned = v;
    host.classList.toggle("is-pinned", v);
  }

  function entryOf(el) {
    return el ? shown[+el.dataset.i] : null;
  }

  host.addEventListener("pointerover", function (ev) {
    if (ev.pointerType !== "mouse" || pinned || dragging) return;
    var el = ev.target.closest(".cw");
    if (el && (!focused || focused.el !== el)) focusOn(entryOf(el));
  });

  host.addEventListener("pointerleave", function (ev) {
    if (ev.pointerType === "mouse" && !pinned && !dragging) clearFocus();
  });

  /* ---------- dragging, with a spring back ---------- */

  var dragging = null;

  host.addEventListener("pointerdown", function (ev) {
    var el = ev.target.closest(".cw");
    if (!el) {
      // tap on empty space clears a pinned focus
      setPinned(false);
      clearFocus();
      return;
    }
    ev.preventDefault();
    try {
      el.setPointerCapture(ev.pointerId);
    } catch (e) {}
    el.classList.add("is-held");
    el.style.transition = "none";
    dragging = { el: el, x: ev.clientX, y: ev.clientY, moved: false, type: ev.pointerType };
  });

  host.addEventListener("pointermove", function (ev) {
    if (!dragging) return;
    var dx = ev.clientX - dragging.x;
    var dy = ev.clientY - dragging.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) dragging.moved = true;
    dragging.el.style.transform = "translate(" + dx + "px," + dy + "px)";
    if (focused) drawLines();
  });

  function release() {
    if (!dragging) return;
    var d = dragging;
    dragging = null;
    d.el.classList.remove("is-held");
    d.el.style.transition = reduceMotion ? "transform 120ms linear" : "";
    d.el.style.transform = "";
    if (!d.moved) {
      // a click or tap keeps the focus; a second one on the same word,
      // or one on empty space, lets it go
      if (pinned && focused && focused.el === d.el) {
        setPinned(false);
        clearFocus();
      } else {
        if (!focused || focused.el !== d.el) focusOn(entryOf(d.el));
        setPinned(true);
      }
    }
    if (focused) track(700);
  }

  host.addEventListener("pointerup", release);
  host.addEventListener("pointercancel", release);

  /* ---------- repack when the width changes ---------- */

  var timer = null;
  function onResize() {
    if (Math.abs(host.clientWidth - current) < 24) return;
    clearTimeout(timer);
    timer = setTimeout(build, 160);
  }

  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);

  var start = function () {
    var fallback = document.getElementById("cloud-static");
    if (fallback) fallback.remove();
    build();
  };

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start).catch(start);
  } else {
    start();
  }
})();
