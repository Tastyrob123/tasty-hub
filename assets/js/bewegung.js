/* Tasty Hub · Bewegung wie auf den abgenommenen Häusern (Gilles Varone, Bareiss), 11.11.2026
   Auftakt: Fotos zoomen heran, Titel und Satz rollen aus dem Schlitz.
   Danach: Stücke schweben deckend von unten herauf (12 % vor dem Rand), Fotos zoomen heran, sobald sie selbst ins Bild kommen,
   Überschriften und Lauftexte rollen Zeile für Zeile aus dem Schlitz. Läuft nur einmal je Stück, nichts hängt am Scrollen. */
(function () {
  var html = document.documentElement;
  var ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]nomotion/.test(location.search);
  /* ---------- Gemalte Ecken: Farbe des Abschnitts darunter ---------- */
  [].slice.call(document.querySelectorAll('main>section.v14,main>section.b8,main>section.y1,main>section.v12,main+.fuss')).forEach(function (s) {
    var v = s.matches('.fuss') ? document.querySelector('main').lastElementChild : s.previousElementSibling;
    if (!v) return;
    var f = getComputedStyle(v).backgroundColor;
    if (f && f !== 'rgba(0, 0, 0, 0)' && f !== 'transparent') s.style.setProperty('--ecke-farbe', f);
  });

  if (ruhig || !('IntersectionObserver' in window) || !document.querySelector('[data-baustein="01"]')) return;
  var EIN = 'cubic-bezier(.16,1,.3,1)';
  function alle(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function sichtbar(el) { return !!el.getClientRects().length; }

  /* ---------- Texte: jedes Wort in einen Schlitz, Markup (em, br) bleibt ---------- */
  var TEXTE = [
    '[data-baustein="01"] .hx__t', '[data-baustein="01"] .hx__s',
    'main h2.d2', 'main p.d2', 'main .fenster-satz', 'main .lauf', 'main .lauf>p', 'main p.unter',
    'main .y1__gross', 'main .y1__s', 'main .rg__satz', 'main .v12__zahl>span'
  ];
  var texte = [];
  alle(TEXTE.join(',')).forEach(function (el) {
    if (texte.indexOf(el) > -1 || !sichtbar(el)) return;
    if (el.closest('#gebaut-wie,.v2__saetze,.b6-g,[data-r]') || el.querySelector('.z,img,a,button,input,[data-zahl]')) return;
    if (el.matches('.lauf') && el.querySelector('p')) return;          // die Absätze darin rollen einzeln
    if (el.textContent.trim().length < 2 || /flex|grid/.test(getComputedStyle(el).display)) return;
    texte.push(el);
  });
  function einwickeln(el) {
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), knoten = [], n;
    while ((n = w.nextNode())) if (n.nodeValue.trim()) knoten.push(n);
    knoten.forEach(function (t) {
      var f = document.createDocumentFragment();
      t.nodeValue.split(/(\s+)/).forEach(function (s) {
        if (!s) return;
        if (/^\s+$/.test(s)) { f.appendChild(document.createTextNode(s)); return; }
        var a = document.createElement('span'), b = document.createElement('span');
        a.className = 'bw-w'; b.textContent = s; a.appendChild(b); f.appendChild(a);
      });
      t.parentNode.replaceChild(f, t);
    });
    /* Zeilen zählen: Wörter auf derselben Höhe starten gemeinsam */
    var top = null, z = -1;
    alle('.bw-w', el).forEach(function (s) {
      var t = s.getBoundingClientRect().top;
      if (top === null || Math.abs(t - top) > 4) { z++; top = t; }
      s.style.setProperty('--z', z);
    });
    el.dataset.bwZeilen = z + 1;
    /* reiner Text: Zeilen statt Wörter (wenige Teile, leichter fürs schwache Gerät) */
    if (!el.querySelector(':not(.bw-w):not(.bw-w>span)')) {
      var zeilen = [];
      alle('.bw-w', el).forEach(function (s) { var k = +s.style.getPropertyValue('--z'); (zeilen[k] = zeilen[k] || []).push(s.textContent); });
      el._bwText = el.textContent;
      el.innerHTML = '';
      zeilen.forEach(function (ws, k) {
        var a = document.createElement('span'), b = document.createElement('span');
        a.className = 'bw-z'; a.style.setProperty('--z', k); b.textContent = ws.join(' '); a.appendChild(b); el.appendChild(a);
      });
    }
    el.classList.add('bw-t');
  }
  /* nach dem Rollen wieder reiner Text: gleiche Zeilen, Silbentrennung und Grössenwechsel wie vorher */
  function auspacken(el) {
    if (el._bwText != null) { el.textContent = el._bwText; el._bwText = null; }
    alle('.bw-w', el).forEach(function (s) { s.parentNode.replaceChild(document.createTextNode(s.textContent), s); });
    el.normalize();
    el.classList.remove('bw-t', 'bw-da', 'bw-sofort');
  }
  function rollen(el, verz) {
    if (!el.classList.contains('bw-t') || el.classList.contains('bw-da')) return;
    if (verz) el.style.setProperty('--d', verz + 's');
    el.classList.add('bw-da');
    setTimeout(function () { auspacken(el); }, 1300 + (verz || 0) * 1000 + (+el.dataset.bwZeilen || 1) * 95 + 200);
  }
  texte.forEach(einwickeln);

  /* ---------- Stücke: schweben deckend von unten herauf ---------- */
  var STUECKE = [
    '.v14__tafel', '.raster__k', '.v2__liste', '.v2__st', '.b6-pn', '.b6-ziel',
    '.y1__l', '.y1__m', '.y1__r', '.v8__s', '.v9__eins', '.v9__z', '.rg',
    '.v12__zahl>b', '.v12__vorn .mitte', '.galerie .kerb', '.w1__zahlen>div',
    '.s11__mitte .kn-reihe', '.s11__sechs>a'
  ];
  var stuecke = alle(STUECKE.join(',')).filter(sichtbar);
  /* Versatz innerhalb einer Reihe: nebeneinander steigt eins nach dem andern */
  var reihen = new Map();
  stuecke.forEach(function (s) {
    var k = s.parentNode, t = Math.round(s.getBoundingClientRect().top / 8);
    var key = reihen.get(k) || {}; key[t] = (key[t] || 0); s._bwI = key[t]++; reihen.set(k, key);
  });
  var weg = function () { return Math.round(Math.min(96, Math.max(64, innerWidth * .062))); };
  stuecke.forEach(function (s) {
    /* wie bei den Häusern: Stücke nur mit Weg, Bildrahmen dazu mit leichtem Massstab */
    var bild = s.matches('.kerb');
    var a = s.animate(bild ? [{ translate: '0 ' + weg() + 'px', scale: .975 }, { translate: '0 0', scale: 1 }] : [{ translate: '0 ' + weg() + 'px' }, { translate: '0 0' }],
      { duration: 1600, easing: EIN, delay: Math.min(s._bwI, 5) * 90, fill: 'backwards' });
    a.pause(); a.currentTime = 0; s._bwA = a;
  });

  /* ---------- Fotos: Rahmen mit einem Foto, das ihn ganz füllt ---------- */
  /* nicht im Kühlhaus hinter dem Laptop (04): dort bewegt sich schon der Laptop, ein Element pro Blick */
  var RAHMEN = ['.galerie .kerb', '.s11__band', '.s11__sechs>a>span', '.y1__rund'];
  var rahmen = [];
  alle(RAHMEN.join(',')).forEach(function (f) {
    var im = f.querySelector(':scope>img');
    if (!im || !sichtbar(f) || getComputedStyle(im).animationName !== 'none') return;
    rahmen.push(f);
    var a = im.animate([{ scale: 1.15 }, { scale: 1.04 }], { duration: 2600, easing: EIN, fill: 'both' });
    a.pause(); a.currentTime = 0; f._bwA = a;
    /* Gleiten nur, wo der Browser es auf der Scroll-Zeitachse kann (läuft im Takt des Scrollens, auch mit 120 Hz) */
    if (window.CSS && CSS.supports('animation-timeline: view()')) {
      f.classList.add('bw-gl');
      for (var p = f.parentElement; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).overflowY === 'hidden') p.style.overflow = 'clip';
    }
  });
  /* Auftakt: beide Hälften zoomen sacht heran, wenn die Seite erscheint */
  var auftakt = alle('[data-baustein="01"] .h2__halb img').map(function (im) {
    var a = im.animate([{ scale: 1.08 }, { scale: 1 }], { duration: 2400, easing: EIN, fill: 'backwards' });
    a.pause(); a.currentTime = 0; return a;
  });
  var knoepfe = alle('[data-baustein="01"] .kn-reihe').map(function (k) {
    var a = k.animate([{ translate: '0 40px' }, { translate: '0 0' }], { duration: 1600, easing: EIN, delay: 380, fill: 'backwards' });
    a.pause(); a.currentTime = 0; return a;
  });

  /* ---------- Start, sobald die Seite sichtbar ist (erstes Bild komplett) ---------- */
  function los() {
    auftakt.forEach(function (a) { a.play(); });
    knoepfe.forEach(function (a) { a.play(); });
    alle('[data-baustein="01"] .bw-t').forEach(function (t, i) { rollen(t, .12 + i * .18); });

    function vorbei(e) { return e.boundingClientRect.bottom < 0; }
    /* Stücke starten 12 % vor dem unteren Rand */
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting && !vorbei(e)) return;
        io.unobserve(e.target);
        if (vorbei(e)) { e.target._bwA.finish(); return; }
        e.target._bwA.play();
      });
    }, { rootMargin: '0px 0px 12% 0px', threshold: 0 });
    stuecke.forEach(function (s) { io.observe(s); });
    /* Zeilen und Fotos starten erst, wenn sie selbst ins Bild kommen: man sieht das Hereinrollen und das Heranzoomen */
    var spaet = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting && !vorbei(e)) return;
        var t = e.target; spaet.unobserve(t);
        if (t._bwA) { if (vorbei(e)) t._bwA.finish(); else t._bwA.play(); return; }
        if (vorbei(e)) { t.classList.add('bw-da', 'bw-sofort'); auspacken(t); return; }
        rollen(t);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
    texte.forEach(function (t) { if (!t.closest('[data-baustein="01"]')) spaet.observe(t); });
    rahmen.forEach(function (f) { spaet.observe(f); });
  }
  if (!html.classList.contains('warte')) requestAnimationFrame(los);
  else new MutationObserver(function (m, o) { if (!html.classList.contains('warte')) { o.disconnect(); requestAnimationFrame(los); } })
    .observe(html, { attributes: true, attributeFilter: ['class'] });
})();
