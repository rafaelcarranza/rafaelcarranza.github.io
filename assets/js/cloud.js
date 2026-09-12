/* Interactive concept cloud.
 *
 * Packs the words in the browser rather than shipping one fixed picture, so the
 * shape follows the screen: a wide band on a desktop, a tall block on a phone.
 * Words can be dragged and spring back when released.
 *
 * Data comes from _data/cloud.csv via the enclosing include. If this script
 * does not run, the R-generated SVG that ships in the markup stays put.
 */
(function () {
  "use strict";

  var host = document.getElementById("cloud-live");
  var raw = document.getElementById("cloud-data");
  if (!host || !raw || !window.requestAnimationFrame) return;

  var words;
  try {
    words = JSON.parse(raw.textContent);
  } catch (e) {
    return;
  }
  if (!words.length) return;

  words.sort(function (a, b) {
    return b.freq - a.freq;
  });

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");

  // How many words and what shape, by the width available.
  function planFor(width) {
    // Font sizes are held; the shape is adjusted until the block fits.
    var max = Math.max(17, Math.min(26, width / 42));
    if (width >= 860) return { count: words.length, aspect: 6.2, min: 10.5, max: max };
    if (width >= 640) return { count: words.length, aspect: 3.4, min: 10, max: max };
    if (width >= 460) return { count: 46, aspect: 2.2, min: 10, max: max };
    if (width >= 360) return { count: 38, aspect: 1.5, min: 10, max: max };
    return { count: 30, aspect: 1.1, min: 10, max: max };
  }

  var FONT = '600 %spx "Source Serif 4", Georgia, serif';

  function measure(word, size) {
    ctx.font = FONT.replace("%s", size);
    return {
      w: ctx.measureText(word).width + size * 0.42,
      h: size * 1.34,
    };
  }

  function overlaps(a, b) {
    return !(a.x1 >= b.x2 || a.x2 <= b.x1 || a.y1 >= b.y2 || a.y2 <= b.y1);
  }

  // Archimedean spiral, the same approach the R script uses.
  function pack(list, aspect) {
    var placed = [];
    for (var i = 0; i < list.length; i++) {
      var m = list[i].box;
      var t = 0;
      var step = Math.max(1.2, m.h * 0.16);
      for (;;) {
        var cx = aspect * step * t * Math.cos(t) * 0.1;
        var cy = step * t * Math.sin(t) * 0.1;
        var box = {
          x1: cx - m.w / 2,
          x2: cx + m.w / 2,
          y1: cy - m.h / 2,
          y2: cy + m.h / 2,
        };
        var clash = false;
        for (var j = 0; j < placed.length; j++) {
          if (overlaps(box, placed[j])) {
            clash = true;
            break;
          }
        }
        if (!clash) {
          list[i].x = cx;
          list[i].y = cy;
          placed.push(box);
          break;
        }
        t += 0.22;
        if (t > 4000) {
          list[i].x = cx;
          list[i].y = cy;
          placed.push(box);
          break;
        }
      }
    }
    return placed;
  }

  function bounds(boxes) {
    var b = { x1: Infinity, x2: -Infinity, y1: Infinity, y2: -Infinity };
    boxes.forEach(function (k) {
      if (k.x1 < b.x1) b.x1 = k.x1;
      if (k.x2 > b.x2) b.x2 = k.x2;
      if (k.y1 < b.y1) b.y1 = k.y1;
      if (k.y2 > b.y2) b.y2 = k.y2;
    });
    return b;
  }

  var current = null;

  var MIN_LEGIBLE = 10; // px; below this the small words are not worth showing

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
      return { d: w, size: size, rel: rel, box: measure(w.term, size) };
    });

    // Keep the type size and reshape instead: a wide band where there is room,
    // a taller block where there is not.
    var aspect = plan.aspect;
    var box = bounds(pack(laid, aspect));
    var best = box;
    var bestAspect = aspect;
    for (var i = 0; i < 14; i++) {
      var got = box.x2 - box.x1;
      if (got > width * 0.95 && got <= width) {
        best = box;
        bestAspect = aspect;
        break;
      }
      // keep the widest layout that still fits, in case the search overshoots
      if (got <= width && got > best.x2 - best.x1) {
        best = box;
        bestAspect = aspect;
      }
      aspect *= Math.pow(width / got, 0.6);
      aspect = Math.max(0.3, Math.min(12, aspect));
      box = bounds(pack(laid, aspect));
    }
    if (best.x2 - best.x1 > width || best.x2 - best.x1 < width * 0.5) {
      best = bounds(pack(laid, bestAspect));
    } else {
      pack(laid, bestAspect);
      box = best;
    }
    box = best;

    var fit = Math.min(1, width / (box.x2 - box.x1));
    return { laid: laid, box: box, fit: fit, smallest: plan.min * fit };
  }

  function build() {
    var width = host.clientWidth;
    if (!width) return;
    var plan = planFor(width);

    // Shrinking to fit can push the rarest words below reading size. Drop them
    // rather than render something nobody can read.
    var count = plan.count;
    var result = attempt(plan, count, width);
    var guard = 0;
    while (result.smallest < MIN_LEGIBLE && count > 16 && guard++ < 6) {
      count = Math.max(16, Math.round(count * 0.82));
      result = attempt(plan, count, width);
    }

    var box = result.box;
    var fit = result.fit;
    var h = box.y2 - box.y1;

    host.textContent = "";
    var frag = document.createDocumentFragment();

    result.laid.forEach(function (item) {
      // spans, not buttons: the container is aria-hidden, and hiding focusable
      // controls from assistive tech is worse than leaving the toy pointer-only
      var el = document.createElement("span");
      el.className = "cw cw--" + item.d.cat;
      el.dataset.depth = item.rel > 0.66 ? "2" : item.rel > 0.33 ? "1" : "0";
      el.textContent = item.d.term;
      el.style.fontSize = item.size * fit + "px";
      el.style.left = (item.x - box.x1) * fit + "px";
      el.style.top = (item.y - box.y1) * fit + "px";
      el.title = item.d.term + " \u2014 " + item.d.freq + " mentions in " + item.d.df + " of 14 papers";
      frag.appendChild(el);
    });

    host.appendChild(frag);
    host.style.height = Math.round(h * fit) + "px";
    host.dataset.shown = result.laid.length;
    current = width;
  }

  /* ---------- dragging, with a spring back ---------- */

  var dragging = null;

  host.addEventListener("pointerdown", function (ev) {
    var el = ev.target.closest(".cw");
    if (!el) return;
    ev.preventDefault();
    el.setPointerCapture(ev.pointerId);
    el.classList.add("is-held");
    el.style.transition = "none";
    dragging = { el: el, x: ev.clientX, y: ev.clientY };
  });

  host.addEventListener("pointermove", function (ev) {
    if (!dragging) return;
    var dx = ev.clientX - dragging.x;
    var dy = ev.clientY - dragging.y;
    dragging.el.style.transform = "translate(" + dx + "px," + dy + "px)";
  });

  function release() {
    if (!dragging) return;
    var el = dragging.el;
    el.classList.remove("is-held");
    el.style.transition = reduceMotion ? "transform 120ms linear" : "";
    el.style.transform = "";
    dragging = null;
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

  // Fonts change the metrics, so lay out once they are ready.
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
