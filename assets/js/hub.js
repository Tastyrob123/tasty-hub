/* Tasty Hub — ein Takt, nativer Scroll, Bewegung nur über transform/opacity */
(function () {
  'use strict';
  var doc = document.documentElement;
  var ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]nomotion/.test(location.search);
  var hatIO = 'IntersectionObserver' in window;
  function alle(s, w) { return [].slice.call((w || document).querySelectorAll(s)); }

  /* Fotos früh holen: was in den nächsten drei Fensterhöhen liegt, wird vorgezogen und vor dem Auftritt entpackt */
  var faul = alle('img[loading="lazy"]');
  /* Bilder unterhalb des Auftakts tragen ihre Adresse in data-src: sie laden erst, wenn der Auftakt komplett steht */
  function holeBild(im) { if (im.dataset.srcset) { im.srcset = im.dataset.srcset; im.removeAttribute('data-srcset'); } if (im.dataset.src) { im.src = im.dataset.src; im.removeAttribute('data-src'); } }
  function nachErstemBild(f) { if (window.erstesBild || !doc.classList.contains('warte')) f(); else document.addEventListener('erstesbild', f, { once: true }); }
  if (faul.length && hatIO) nachErstemBild(function () {
    var nah = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        nah.unobserve(e.target);
        var ziel = e.target.tagName === 'IMG' ? [e.target] : alle('img[loading]', e.target);
        ziel.forEach(function (im) { im.loading = 'eager'; holeBild(im); if (im.decode) im.decode().catch(function () {}); });
      });
    }, { rootMargin: '250% 40% 250% 40%' });
    var gruppen = [];
    faul.forEach(function (im) {
      var z = im.closest('.bruch,.band,.werk__buehne,.bau,.bildband') || im.closest('[data-baustein]') || im;
      if (z !== im) { if (gruppen.indexOf(z) > -1) return; gruppen.push(z); }
      nah.observe(z);
    });
  });

  /* Einblenden */
  var ziele = alle('[data-r]');
  function wennBereit(el, dann) {
    var offen = alle('img', el).filter(function (im) { return im.offsetParent !== null; });
    if (el.tagName === 'IMG') offen = [el];
    var n = offen.length, los = false;
    var fertig = function () { if (los) return; los = true; dann(); };
    if (!n) return fertig();
    var eins = function () { if (--n <= 0) fertig(); };
    offen.forEach(function (im) {
      var entpackt = function () { (im.decode ? im.decode() : Promise.resolve()).then(eins, eins); };
      if (im.complete && im.naturalWidth) return entpackt();
      im.loading = 'eager'; holeBild(im);
      im.addEventListener('load', entpackt, { once: true });
      im.addEventListener('error', eins, { once: true });
    });
    setTimeout(fertig, 800);
  }
  if (ruhig || !hatIO) {
    ziele.forEach(function (el) { el.classList.add('da'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('da'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -9% 0px', threshold: 0.06 });
    /* Bilder kommen früher: sobald die Oberkante unten ins Fenster rückt, und erst, wenn sie geladen sind */
    var bio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        bio.unobserve(e.target);
        wennBereit(e.target, function () { e.target.classList.add('da'); });
      });
    }, { rootMargin: '0px 0px 4% 0px', threshold: 0.01 });
    /* Gruppen (Dreiklang, Geräte, Galerie): alle starten gemeinsam und steigen nacheinander auf */
    var gio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        gio.unobserve(e.target);
        wennBereit(e.target, function () { alle('[data-r]', e.target).forEach(function (k) { k.classList.add('da'); }); });
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    alle('[data-gruppe]').forEach(function (g) { gio.observe(g); });
    /* Fenster: der Satz steht fest in der Bildschirmmitte. Er startet erst, wenn der Ausschnitt ihn zu einem Drittel freigibt. */
    alle('.bruch').forEach(function (b) {
      var t = b.querySelector('.in'), fio = null;
      var lausche = function () {
        if (fio) fio.disconnect();
        var r = t.getBoundingClientRect(), linie = r.top + r.height * 0.68;
        fio = new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (!e.isIntersecting) return;
            fio.disconnect(); fio = null; window.removeEventListener('resize', lausche);
            alle('[data-r]', b).forEach(function (k) { k.classList.add('da'); });
          });
        }, { rootMargin: '0px 0px -' + Math.max(0, Math.round(window.innerHeight - linie)) + 'px 0px', threshold: 0 });
        fio.observe(b);
      };
      lausche();
      window.addEventListener('resize', lausche, { passive: true });
    });
    ziele.forEach(function (el) {
      if (el.closest('.hero')) { requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('da'); }); }); return; }
      if (el.closest('.bruch') || el.closest('[data-gruppe]')) return;
      var art = el.getAttribute('data-r');
      if (art === 'bild' || art === 'schweb') bio.observe(el); else io.observe(el);
    });
  }

  /* Laufband: läuft nur, solange es im Bild ist */
  var zuege = alle('.laufband,[data-laufband]');
  if (zuege.length && !ruhig && hatIO) {
    var lio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('laeuft', e.isIntersecting); });
    }, { rootMargin: '80px 0px' });
    zuege.forEach(function (z) { lio.observe(z); });
  }

  /* Große Zahlen: hochzählen, sobald sie im Bild sind */
  var zahlen = alle('[data-zahl]');
  if (zahlen.length && !ruhig && hatIO) {
    var zio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        zio.unobserve(e.target);
        var el = e.target, ziel = +el.getAttribute('data-zahl'), t0 = null, dauer = 1500;
        if (ziel <= 3) return;
        function schritt(t) {
          if (!t0) t0 = t;
          var p = Math.min(1, (t - t0) / dauer), w = 1 - Math.pow(1 - p, 4);
          el.textContent = Math.round(ziel * w);
          if (p < 1) requestAnimationFrame(schritt);
        }
        el.textContent = '0';
        setTimeout(function () { requestAnimationFrame(schritt); }, 250);
      });
    }, { threshold: 0.3 });
    zahlen.forEach(function (z) { zio.observe(z); });
  }

  /* Menü am Handy */
  var nav = document.querySelector('.nav'), burger = document.querySelector('.burger');
  /* Hinweis ganz oben: seine Höhe merken, Leiste und Eckknopf rücken darunter, solange er im Bild ist */
  var hinweis = document.querySelector('.hinweis'), eck = document.querySelector('.eckknopf'), hb = 0, hoAlt = -1;
  function hinweisLage(y) {   /* Leiste und Eckknopf bleiben unter der Unterkante des Hinweises, bis er aus dem Bild ist */
    var ho = Math.max(0, hb - y);
    if (ho === hoAlt) return; hoAlt = ho;
    doc.classList.toggle('hinweis-oben', ho > 0);
    if (nav) nav.style.setProperty('--ho', ho + 'px');
    if (eck) eck.style.setProperty('--ho', ho + 'px');
  }
  function hinweisMass() { hb = hinweis.offsetHeight; doc.style.setProperty('--hb', hb + 'px'); hoAlt = -1; hinweisLage(window.scrollY); }
  if (hinweis) { hinweisMass(); if (window.ResizeObserver) new ResizeObserver(hinweisMass).observe(hinweis); else window.addEventListener('resize', hinweisMass); }
  if (burger) {
    burger.addEventListener('click', function () {
      var an = doc.classList.toggle('offen');
      burger.setAttribute('aria-expanded', an);
      document.body.style.overflow = an ? 'hidden' : '';
    });
    alle('.menue a').forEach(function (a) {
      a.addEventListener('click', function () { doc.classList.remove('offen'); document.body.style.overflow = ''; });
    });
  }

  /* Bänder: Pfeile, Laufbalken, mit der Maus ziehen (Blättern selbst bleibt nativ) */
  alle('[data-band]').forEach(function (hof) {
    var band = hof.querySelector('.band'), balken = hof.querySelector('.laufbalken'), strich = balken && balken.querySelector('i');
    var pf = alle('.pfeile button', hof), frei = true;
    function richte() {
      var weg = band.scrollWidth - band.clientWidth;
      var teil = band.scrollWidth ? Math.min(1, band.clientWidth / band.scrollWidth) : 1;
      var p = weg > 0 ? band.scrollLeft / weg : 0;
      if (strich) { strich.style.width = (teil * 100).toFixed(1) + '%'; strich.style.transform = 'translateX(' + (p * balken.clientWidth * (1 - teil)).toFixed(1) + 'px)'; }
      if (pf.length) { pf[0].disabled = band.scrollLeft < 4; pf[1].disabled = band.scrollLeft > weg - 4; }
      var fuss = hof.querySelector('.bandfuss'); if (fuss) fuss.style.visibility = weg > 4 ? 'visible' : 'hidden';
    }
    band.addEventListener('scroll', function () {
      if (!frei) return; frei = false;
      requestAnimationFrame(function () { frei = true; richte(); });
    }, { passive: true });
    pf.forEach(function (b, i) {
      b.addEventListener('click', function () {
        var k = band.firstElementChild; if (!k) return;
        band.scrollBy({ left: (i ? 1 : -1) * (k.offsetWidth + 20) * (band.clientWidth > 900 ? 2 : 1), behavior: ruhig ? 'auto' : 'smooth' });
      });
    });
    var unten = false, x0 = 0, s0 = 0, weit = false;
    band.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      unten = true; weit = false; x0 = e.clientX; s0 = band.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!unten) return;
      var d = e.clientX - x0;
      if (Math.abs(d) > 4) { weit = true; band.classList.add('zieht'); }
      band.scrollLeft = s0 - d;
    });
    window.addEventListener('pointerup', function () { unten = false; band.classList.remove('zieht'); });
    band.addEventListener('click', function (e) { if (weit) { e.preventDefault(); e.stopPropagation(); weit = false; } }, true);
    band.addEventListener('dragstart', function (e) { e.preventDefault(); });
    window.addEventListener('resize', richte); window.addEventListener('load', richte); richte();
  });

  /* Backoffice: Bereich wählen. Läuft von selbst weiter, solange die Bühne im Bild ist und niemand gewählt hat. */
  var werk = document.querySelector('.werk');
  if (werk) {
    var kn = alle('.werk__wahl button', werk), bilder = alle('.werk__bilder .rahmen', werk), abz = alle('.werk__abzug', werk), texte = alle('.werk__texte>div', werk);
    var jetzt = -1, uhr = null, selbst = !ruhig, sichtbar = false;
    var setze = function (n, vonHand) {
      if (vonHand) { selbst = false; clearTimeout(uhr); }
      if (n === jetzt) return;
      jetzt = n;
      kn.forEach(function (b, i) { b.classList.toggle('an', i === n); b.classList.remove('laeuft'); b.setAttribute('aria-pressed', i === n); });
      bilder.forEach(function (b, i) { b.classList.toggle('an', i === n); });
      abz.forEach(function (b, i) { b.classList.toggle('an', i === n); });
      texte.forEach(function (b, i) { b.classList.toggle('an', i === n); });
      if (selbst && sichtbar) takt();
    };
    var takt = function () {
      clearTimeout(uhr);
      requestAnimationFrame(function () { requestAnimationFrame(function () { if (selbst && kn[jetzt]) kn[jetzt].classList.add('laeuft'); }); });
      uhr = setTimeout(function () { if (selbst && sichtbar) setze((jetzt + 1) % kn.length); }, 5200);
    };
    kn.forEach(function (b, i) { b.addEventListener('click', function () { setze(i, true); }); });
    setze(0);
    if (hatIO && selbst) {
      new IntersectionObserver(function (es) {
        sichtbar = es[0].isIntersecting;
        if (sichtbar && selbst) takt(); else { clearTimeout(uhr); kn.forEach(function (b) { b.classList.remove('laeuft'); }); }
      }, { threshold: 0.45 }).observe(werk);
    }
  }

  /* Fächer: vorn das aktive Blatt, je zwei dahinter. Pfeile, Tippen auf ein hinteres Blatt, Pfeiltasten, Wischen. */
  alle('[data-faecher]').forEach(function (f) {
    var bl = alle('.fblatt', f), tx = alle('.faecher__texte>div', f), zahl = f.querySelector('[data-f-zahl]'), n = bl.length, ist = 0, halb = Math.floor(n / 2);
    function zeige(k) {
      ist = (k % n + n) % n;
      bl.forEach(function (b, i) { var p = ((i - ist + n + halb) % n) - halb; b.setAttribute('data-p', p); b.setAttribute('aria-hidden', p !== 0); });
      tx.forEach(function (t, i) { t.classList.toggle('an', i === ist); });
      if (zahl) zahl.textContent = ist + 1;
    }
    alle('[data-f]', f).forEach(function (b) { b.addEventListener('click', function () { zeige(ist + (+b.getAttribute('data-f'))); }); });
    bl.forEach(function (b, i) { b.addEventListener('click', function () { if (i !== ist) zeige(i); }); });
    f.setAttribute('tabindex', '0');
    f.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') zeige(ist + 1); else if (e.key === 'ArrowLeft') zeige(ist - 1); });
    var x0 = null, buehne = f.querySelector('.faecher__b');
    buehne.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    buehne.addEventListener('touchend', function (e) { if (x0 === null) return; var d = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(d) > 40) zeige(ist + (d < 0 ? 1 : -1)); }, { passive: true });
    zeige(0);
  });

  function euro(v) { return v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €'; }
  function zaehle(el, von, bis, dauer, schreibe) {
    if (ruhig) { el.textContent = schreibe(bis); return; }
    var t0 = null;
    (function schritt(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / dauer); el.textContent = schreibe(von + (bis - von) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(schritt); })(performance.now());
  }
  function wennImBild(el, schwelle, dann) {
    if (!hatIO) { dann(); return; }
    var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); dann(); } }, { threshold: schwelle });
    o.observe(el);
  }

  /* Vernetztes Ökosystem: erscheint der Reihe nach, danach läuft der Datenfluss einmal durch; beim Überfahren zeigt ein Knoten seine Verbindungen */
  alle('[data-oeko]').forEach(function (o) {
    var wege = alle('.oeko__weg', o), knoten = alle('.oeko__k', o);
    var bilder = alle('svg', o);
    function halte(an) { o.classList.toggle('laeuft', an); bilder.forEach(function (v) { try { an ? v.unpauseAnimations() : v.pauseAnimations(); } catch (e) {} }); }
    halte(false);
    if (hatIO && !ruhig) new IntersectionObserver(function (es) { halte(es[0].isIntersecting && o.classList.contains('da')); }, { rootMargin: '60px 0px' }).observe(o);
    wennImBild(o, 0.3, function () {
      o.classList.add('da'); if (!ruhig) halte(true);
      setTimeout(function () {
        o.classList.add('fertig');
        if (ruhig) return;
        var welle = function () {
          if (!o.classList.contains('laeuft') || o.classList.contains('wahl')) return;
          ['liefer', 'inventar', 'zutaten', 'rezept', 'gerichte', 'we', 'db'].forEach(function (k, i) {
            setTimeout(function () { alle('[data-k="' + k + '"]', o).forEach(function (g) { g.classList.add('puls'); setTimeout(function () { g.classList.remove('puls'); }, 520); }); }, i * 330);
          });
        };
        welle(); setInterval(welle, 6500);
      }, 2300);
    });
    function zeige(k) {
      o.classList.toggle('wahl', !!k);
      var nachbarn = {}; if (k) nachbarn[k] = 1;
      wege.forEach(function (w) { var a = w.getAttribute('data-a'), b = w.getAttribute('data-b'), an = !!k && (a === k || b === k); w.classList.toggle('an', an); if (an) { nachbarn[a] = 1; nachbarn[b] = 1; } });
      knoten.forEach(function (g) { g.classList.toggle('an', !!nachbarn[g.getAttribute('data-k')]); });
    }
    knoten.forEach(function (g) {
      var k = g.getAttribute('data-k');
      g.addEventListener('pointerenter', function () { zeige(k); });
      g.addEventListener('pointerleave', function () { zeige(null); });
      g.addEventListener('focus', function () { zeige(k); });
      g.addEventListener('blur', function () { zeige(null); });
      g.addEventListener('click', function () { zeige(g.classList.contains('an') && o.classList.contains('wahl') && o.__k === k ? (o.__k = null) : (o.__k = k)); });
    });
  });

  /* Welle: der neue Einkaufspreis läuft von Station zu Station, jede zählt auf ihren neuen Wert */
  alle('[data-welle]').forEach(function (w) {
    var st = {}, li = alle('[data-l]', w), uhren = [], los = w.querySelector('[data-los]');
    alle('.wk', w).forEach(function (k) { st[k.getAttribute('data-n')] = k; });
    var ein = alle('.wl--ast:not(.wl--aus)', w), aus = alle('.wl--aus', w), gerade = li.filter(function (l) { return !l.classList.contains('wl--ast'); });
    function dann(ms, f) { uhren.push(setTimeout(f, ms)); }
    function triff(n) { var k = st[n], s = k.querySelector('strong'); k.classList.add('an'); zaehle(s, +s.getAttribute('data-von'), +s.getAttribute('data-bis'), 520, euro); }
    function lauf(l) { l.classList.remove('lauf'); void l.offsetWidth; l.classList.add('lauf'); }
    function spiele() {
      uhren.forEach(clearTimeout); uhren = [];
      Object.keys(st).forEach(function (n) { st[n].classList.remove('an'); var s = st[n].querySelector('strong'); s.textContent = euro(+s.getAttribute('data-von')); });
      if (ruhig) { Object.keys(st).forEach(triff); return; }
      dann(400, function () { triff(0); });
      dann(1050, function () { lauf(gerade[0]); }); dann(1650, function () { triff(1); });
      dann(2200, function () { lauf(gerade[1]); }); dann(2800, function () { triff(2); });
      dann(3350, function () { lauf(gerade[2]); });
      dann(3900, function () { ein.forEach(lauf); });
      [3, 4, 5].forEach(function (n, i) { dann(4500 + i * 140, function () { triff(n); }); });
      dann(5300, function () { aus.forEach(lauf); });
      dann(5850, function () { lauf(gerade[3]); }); dann(6450, function () { triff(6); });
    }
    if (los) los.addEventListener('click', function (e) { e.preventDefault(); spiele(); });
    wennImBild(w.querySelector('.welle__b'), 0.45, spiele);
  });

  /* Deckungsbeitrag Stufe für Stufe: die Balken wachsen nacheinander, die Beträge zählen mit */
  alle('[data-stufen]').forEach(function (b) {
    var reihen = alle('.stufe', b), uhren = [], los = b.querySelector('[data-los]');
    function spiele() {
      uhren.forEach(clearTimeout); uhren = [];
      reihen.forEach(function (r) { r.classList.remove('an'); });
      reihen.forEach(function (r, i) {
        uhren.push(setTimeout(function () {
          r.classList.add('an');
          var s = r.querySelector('strong'), vz = s.getAttribute('data-vz');
          zaehle(s, 0, +s.getAttribute('data-wert'), 800, function (v) { return (vz ? vz + ' ' : '') + euro(v); });
        }, ruhig ? 0 : 250 + i * 620));
      });
    }
    if (los) los.addEventListener('click', function (e) { e.preventDefault(); spiele(); });
    wennImBild(b, 0.4, spiele);
  });

  /* Vom Chaos zur Klarheit: die Gerichte steigen auf, dann baut sich die Rechnung Zeile für Zeile auf */
  alle('[data-klar]').forEach(function (k) {
    wennImBild(k.querySelector('.klar__band'), 0.25, function () { k.classList.add('da'); });
    var r = k.querySelector('[data-rech]');
    if (r) wennImBild(r, 0.5, function () {
      alle('dl div', r).forEach(function (z, i) {
        setTimeout(function () {
          z.classList.add('an');
          var s = z.querySelector('[data-summe]');
          if (s) zaehle(s, 0, +s.getAttribute('data-summe'), 1300, function (v) { return '+' + euro(Math.round(v)); });
        }, ruhig ? 0 : i * 420);
      });
    });
  });

  /* Aufbau in neun Schritten: läuft von allein und immer weiter, die Linie wandert sichtbar zur nächsten Station.
     Pfeile, Pfeiltasten und Wischen springen; danach läuft es von selbst weiter. */
  alle('[data-bau]').forEach(function (b) {
    var li = alle('.bau__leiste li', b), bi = alle('.bau__bilder img', b), tx = alle('.bau__texte>div', b), lauf = b.querySelector('.bau__lauf');
    var zi = alle('.bau__ziffern b', b);
    var n = li.length, ist = -1, uhr = null, uhr2 = null, sichtbar = false, DAUER = 3800;
    function linie(wert, zieht) { lauf.classList.toggle('zieht', !!zieht); lauf.style.transform = 'scaleX(' + Math.max(0, Math.min(1, wert)).toFixed(4) + ')'; }
    function plane() {
      clearTimeout(uhr); clearTimeout(uhr2);
      if (!sichtbar || ruhig) return;
      uhr2 = setTimeout(function () { if (ist < n - 1) linie((ist + 1) / (n - 1), true); }, 900);
      uhr = setTimeout(function () { zeige(ist + 1); }, DAUER);
    }
    function zeige(k) {
      ist = (k % n + n) % n;
      li.forEach(function (l, i) { l.classList.toggle('an', i === ist); l.classList.toggle('war', i < ist); });
      bi.forEach(function (x, i) { x.classList.toggle('an', i === ist); if (i === ist || i === (ist + 1) % n) x.loading = 'eager'; });
      tx.forEach(function (x, i) { x.classList.toggle('an', i === ist); });
      zi.forEach(function (x, i) { x.classList.toggle('an', i === ist); });
      linie(ist / (n - 1));
      plane();
    }
    alle('[data-b]', b).forEach(function (k) { k.addEventListener('click', function () { zeige(ist + (+k.getAttribute('data-b'))); }); });
    li.forEach(function (l, i) { l.querySelector('button').addEventListener('click', function () { zeige(i); }); });
    b.setAttribute('tabindex', '0');
    b.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') zeige(ist + 1); else if (e.key === 'ArrowLeft') zeige(ist - 1); });
    var x0 = null, bu = b.querySelector('.bau__gross');
    bu.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    bu.addEventListener('touchend', function (e) { if (x0 === null) return; var d = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(d) > 40) zeige(ist + (d < 0 ? 1 : -1)); }, { passive: true });
    zeige(0);
    if (hatIO) new IntersectionObserver(function (es) { sichtbar = es[0].isIntersecting; if (sichtbar) plane(); else { clearTimeout(uhr); clearTimeout(uhr2); } }, { threshold: 0.35 }).observe(b);
    else { sichtbar = true; plane(); }
  });

  /* Rechner je Bereich: im Bildschirm liegt die lange Aufnahme zum Scrollen; Karten darunter und Pfeile wechseln die Seite.
     Am Rechner scrollt der Bildschirm von selbst, sobald der Zeiger auf ihm liegt, ohne Klick und ohne Mausereignis.
     Zu ist er nur, solange die Seite selbst gerade mit dem Rad läuft: wer die Seite durchscrollt, bleibt nicht hängen.
     Fällt dieses Skript aus, bleibt der Bildschirm offen. Am Handy öffnet ihn ein Tippen. */
  var maus = matchMedia('(hover: hover) and (pointer: fine)').matches, schirme = [], zu = false, zuUhr = null;
  function sperre(an) { zu = an; schirme.forEach(function (s) { s.classList.toggle('gesperrt', an); }); }
  if (maus) window.addEventListener('wheel', function (e) {
    if (!zu) {   /* Rad auf einem offenen Bildschirm: der scrollt, nichts zu tun */
      for (var i = 0; i < schirme.length; i++) { var r = schirme[i].getBoundingClientRect(); if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return; }
      sperre(true);
    }
    clearTimeout(zuUhr); zuUhr = setTimeout(function () { sperre(false); }, 260);
  }, { passive: true, capture: true });
  alle('[data-pc]').forEach(function (hof) {
    var pc = hof.querySelector('.pc'), schirm = hof.querySelector('.pc__schirm'), bild = hof.querySelector('.pc__bild');
    var name = hof.querySelector('.pc__name b'), zahl = hof.querySelector('.pc__name i'), karten = alle('.blatt[data-seite]', hof);
    var seiten = []; karten.forEach(function (k) { seiten[+k.getAttribute('data-seite')] = k; });
    var ist = 0, n = seiten.length, geladen = false, marke = 0, schub = 0;
    schirme.push(schirm);
    if (!maus) schirm.classList.add('gesperrt');
    /* sobald jemand selbst scrollt, tippt oder klickt, hört der Schub auf: er darf nie gegen die Hand arbeiten */
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (n_) { schirm.addEventListener(n_, function () { schub++; }, { passive: true }); });
    function lade(src, dann) {
      var m = ++marke;
      bild.classList.remove('da');
      var neu = new Image(); neu.decoding = 'async';
      neu.onload = neu.onerror = function () { if (m !== marke) return; bild.src = src; schirm.scrollTop = 0; requestAnimationFrame(function () { bild.classList.add('da'); if (dann) setTimeout(dann, 500); }); };
      neu.src = src;
    }
    function gleite() {   /* kurzer Schub nach unten: zeigt, dass es weitergeht */
      if (ruhig || pc.classList.contains('benutzt')) return;
      var t0 = null, ziel = Math.min(200, schirm.scrollHeight - schirm.clientHeight), s0 = ++schub;
      if (ziel < 40) return;
      (function schritt(t) {
        if (s0 !== schub || pc.classList.contains('benutzt')) return;
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / 1500); schirm.scrollTop = ziel * (1 - Math.pow(1 - p, 3));
        if (p < 1) requestAnimationFrame(schritt);
      })(performance.now());
    }
    function zeige(k, vonHand) {
      ist = (k % n + n) % n;
      seiten.forEach(function (s, i) { s.classList.toggle('an', i === ist); });
      name.textContent = seiten[ist].getAttribute('data-name'); zahl.textContent = ist + 1;
      bild.alt = seiten[ist].getAttribute('data-name');
      lade(seiten[ist].getAttribute('data-bild'), gleite);
      if (vonHand) { var r = pc.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight + 40) pc.scrollIntoView({ block: 'center', behavior: ruhig ? 'auto' : 'smooth' }); }
    }
    karten.forEach(function (k) { k.addEventListener('click', function () { geladen = true; zeige(+k.getAttribute('data-seite'), true); }); });
    alle('[data-p]', hof).forEach(function (b) { b.addEventListener('click', function () { geladen = true; zeige(ist + (+b.getAttribute('data-p')), true); }); });
    seiten.forEach(function (s, i) { s.classList.toggle('an', i === 0); });
    /* erst laden, wenn der Bereich näher kommt */
    if (hatIO) { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); if (!geladen) { geladen = true; zeige(0); } } }, { rootMargin: '500px 0px' }); io.observe(pc); }
    else zeige(0);
    /* Handy: Tippen öffnet den Bildschirm, Tippen daneben schließt ihn wieder */
    if (!maus) {
      schirm.addEventListener('click', function () { schirm.classList.remove('gesperrt'); });
      document.addEventListener('pointerdown', function (e) { if (!schirm.contains(e.target)) schirm.classList.add('gesperrt'); }, { passive: true });
    }
    schirm.addEventListener('scroll', function () { if (schirm.scrollTop > 215) pc.classList.add('benutzt'); }, { passive: true });
  });
  /* PRÜFHILFE, nur auf dem eigenen Rechner (localhost), nie online: meldet, ob das Rad den Bildschirm bewegt hat. Fliegt wieder raus, sobald Robert das Scrollen bestätigt hat. */
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && schirme.length) (function () {
    var letzte = 0;
    window.addEventListener('wheel', function (e) {
      var jetzt = Date.now(); if (jetzt - letzte < 600) return;
      var i, s = null, r; for (i = 0; i < schirme.length; i++) { r = schirme[i].getBoundingClientRect(); if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { s = schirme[i]; break; } }
      if (!s) return; letzte = jetzt;
      var a = { nr: i, seite: (s.querySelector('img') || {}).alt, zu: s.classList.contains('gesperrt') ? 1 : 0, ov: getComputedStyle(s).overflowY, st: Math.round(s.scrollTop), max: s.scrollHeight - s.clientHeight, y: Math.round(scrollY), dy: Math.round(e.deltaY), ziel: s.contains(e.target) ? 1 : 0, b: innerWidth + 'x' + innerHeight, ua: navigator.userAgent.replace(/.*(Version\/[\d.]+|Chrome\/[\d]+).*/, '$1') };
      setTimeout(function () { a.st2 = Math.round(s.scrollTop); a.y2 = Math.round(scrollY); new Image().src = 'http://127.0.0.1:8791/d?' + encodeURIComponent(JSON.stringify(a)); }, 400);
    }, { passive: true });
  })();

  /* Raum aus 3D-Kacheln: Größe an die Breite anpassen, Stationen steigen auf, danach läuft ein Rundgang von Station zu Station.
     Beim Überfahren einer Station hält der Rundgang an und zeigt, womit sie verbunden ist. */
  alle('[data-raum]').forEach(function (r) {
    var blick = r.querySelector('.raum__blick'), wege = alle('.raum__weg', r), felder = {}, steher = {}, saetze = {};
    alle('.raum__feld', r).forEach(function (f) { felder[f.getAttribute('data-k')] = f; });
    alle('.raum__k', r).forEach(function (k) { steher[k.getAttribute('data-k')] = k; });
    alle('.raum__satz p', r).forEach(function (p) { saetze[p.getAttribute('data-k')] = p; });
    var tour = r.getAttribute('data-tour').split(','), ist = -1, uhr = null, sichtbar = false, haelt = false;
    function passe() { r.style.setProperty('--s', Math.min(1, r.clientWidth / 1760).toFixed(4)); }
    passe(); window.addEventListener('resize', passe);
    function zeige(k, nachbarn) {
      Object.keys(steher).forEach(function (id) {
        var an = id === k, nah = !!(nachbarn && nachbarn[id] && !an);
        steher[id].classList.toggle('an', an); steher[id].classList.toggle('nah', nah);
        felder[id].classList.toggle('an', an); felder[id].classList.toggle('nah', nah);
      });
      Object.keys(saetze).forEach(function (id) { saetze[id].classList.toggle('an', id === k); });
    }
    function schritt() {
      if (!sichtbar || haelt) return;
      ist = (ist + 1) % tour.length;
      var k = tour[ist], vor = ist > 0 ? tour[ist - 1] : null;
      if (ist === 0) wege.forEach(function (w) { w.classList.remove('an'); });
      wege.forEach(function (w) { if (vor && w.getAttribute('data-a') === vor && w.getAttribute('data-b') === k) w.classList.add('an'); });
      zeige(k);
      uhr = setTimeout(schritt, ist === tour.length - 1 ? 3200 : 2100);
    }
    function starte() { clearTimeout(uhr); if (sichtbar && !haelt && !ruhig) uhr = setTimeout(schritt, 700); }
    /* Überfahren: Rundgang hält, die Station zeigt ihre Verbindungen */
    Object.keys(steher).forEach(function (k) {
      var st = steher[k].querySelector('.raum__steh');
      function rein() {
        haelt = true; clearTimeout(uhr); r.classList.add('wahl');
        var nachbarn = {};
        wege.forEach(function (w) { var a = w.getAttribute('data-a'), b = w.getAttribute('data-b'), an = a === k || b === k; w.classList.toggle('an', an); if (an) { nachbarn[a] = 1; nachbarn[b] = 1; } });
        zeige(k, nachbarn);
      }
      function raus() { haelt = false; r.classList.remove('wahl'); wege.forEach(function (w) { w.classList.remove('an'); }); ist = -1; zeige(null); starte(); }
      st.addEventListener('pointerenter', rein); st.addEventListener('pointerleave', raus);
      st.addEventListener('focus', rein); st.addEventListener('blur', raus);
    });
    if (ruhig || !hatIO) { r.classList.add('da', 'fertig'); zeige(tour[4]); return; }
    wennImBild(blick, 0.3, function () { r.classList.add('da'); setTimeout(function () { r.classList.add('fertig'); }, 2600); });
    new IntersectionObserver(function (es) { sichtbar = es[0].isIntersecting; if (sichtbar) setTimeout(starte, r.classList.contains('fertig') ? 0 : 2400); else clearTimeout(uhr); }, { threshold: 0.4 }).observe(blick);
  });

  /* Aufnahme groß ansehen */
  var kasten = document.querySelector('dialog.kasten');
  if (kasten && kasten.showModal) {
    var kb = kasten.querySelector('img'), kt = kasten.querySelector('.kasten__kopf b'), kl = kasten.querySelector('.kasten__lauf');
    alle('[data-gross]').forEach(function (b) {
      b.addEventListener('click', function () {
        kb.removeAttribute('src'); kb.src = b.getAttribute('data-gross'); kb.alt = b.getAttribute('data-name');
        kt.textContent = b.getAttribute('data-name');
        kasten.showModal(); kl.scrollTop = 0;
      });
    });
    kasten.addEventListener('click', function (e) { if (e.target === kasten) kasten.close(); });
    kasten.querySelector('.zu').addEventListener('click', function () { kasten.close(); });
  }

  /* Scroll-Takt: Leiste weg beim Hinunterscrollen, Auftaktbild wandert sacht mit */
  var heroBild = document.querySelector('.hero__bild'), hero = document.querySelector('.hero');
  var yAlt = window.scrollY, ziel = 0, ist = 0, laeuft = false, wartet = false;
  function lies() {
    var y = window.scrollY;
    if (hinweis) hinweisLage(y);
    if (nav && !doc.classList.contains('offen')) {
      if (y > 140 && y > yAlt + 6) nav.classList.add('weg');
      else if (y < yAlt - 6 || y < 140) nav.classList.remove('weg');
    }
    yAlt = y;
    if (heroBild && !ruhig) ziel = Math.min(y, hero.offsetHeight) * 0.14;
  }
  function bild() {
    ist += (ziel - ist) * 0.12;
    if (Math.abs(ziel - ist) < 0.2) { ist = ziel; laeuft = false; }
    heroBild.style.transform = 'translate3d(0,' + ist.toFixed(1) + 'px,0)';
    if (laeuft) requestAnimationFrame(bild);
  }
  window.addEventListener('scroll', function () {
    if (wartet) return;
    wartet = true;
    requestAnimationFrame(function () {
      wartet = false;
      lies();
      if (heroBild && !ruhig && !laeuft && Math.abs(ziel - ist) > 0.2 && window.scrollY < hero.offsetHeight * 1.1) { laeuft = true; requestAnimationFrame(bild); }
    });
  }, { passive: true });
  lies();
})();

/* Dein Betrieb, an einem Ort (07.11.2026): der Stapel klappt auf, jede Ebene hebt sich, Fäden verbinden alle, oben antwortet Notion AI */
(function () {
  'use strict';
  var w = document.querySelector('[data-schichten]'); if (!w) return;
  var ls = [].slice.call(w.querySelectorAll('.schicht')), titel = w.querySelector('[data-schichten-titel]');
  var namen = ['Operations Area · Abläufe und Team', 'FoodQuartier · Küche und Wareneinsatz', 'Drinksquartier · Bar-Kalkulation', 'Finance Studio · Personal- und Gemeinkosten', 'Key Metrics · Kennzahlen'];
  var ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var k = 0, uhr = null;
  function je(i) { ls.forEach(function (x, j) { x.classList.toggle('an', j === i); }); }
  function sag(t) { titel.style.opacity = 0; setTimeout(function () { titel.textContent = t; titel.style.opacity = 1; }, 300); }
  function schritt() {
    var warte = 1500;
    if (k === 0) { w.classList.add('auf'); w.classList.remove('strahlt', 'antwort', 'lauf'); je(-1); sag('Sechs Ebenen, ein System'); warte = 1800; }
    else if (k <= 5) { w.classList.add('lauf'); je(k - 1); sag(namen[k - 1]); }
    else if (k === 6) { je(-1); w.classList.remove('lauf'); w.classList.add('strahlt'); sag('Alles ist miteinander verknüpft'); warte = 1900; }
    else { w.classList.add('lauf', 'antwort'); je(5); sag('Notion AI antwortet aus allen Ebenen'); warte = 5200; }
    k = k < 7 ? k + 1 : 1;
    uhr = setTimeout(schritt, warte);
  }
  if (ruhig || !('IntersectionObserver' in window)) { w.classList.add('auf', 'strahlt', 'antwort'); return; }
  new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { if (!uhr) uhr = setTimeout(schritt, 500); }
      else { clearTimeout(uhr); uhr = null; }
    });
  }, { threshold: .35 }).observe(w);
})();

/* Roter Faden (07.11.2026): im Abschnitt «Auch der Rest» hakt die Leiste Stelle 3 bis 6 ab, sobald ihre Lösung im Bild ist */
(function () {
  'use strict';
  var l = document.querySelector('[data-leiste-folge]'); if (!l || !('IntersectionObserver' in window)) return;
  var satz = l.querySelector('[data-leiste-satz]'), titel = {};
  [].slice.call(document.querySelectorAll('[data-loest]')).forEach(function (a) { titel[a.getAttribute('data-loest')] = a.querySelector('.mono').textContent; });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var n = e.target.getAttribute('data-loest'), li = l.querySelector('li[data-n="' + n + '"]');
      if (li && !li.classList.contains('ok')) { li.classList.add('ok'); satz.textContent = titel[n].replace('Stelle ' + n + ' ·', 'Stelle ' + n + ' von 7 ·'); }
      io.unobserve(e.target);
    });
  }, { threshold: .45 });
  [].slice.call(document.querySelectorAll('[data-loest]')).forEach(function (a) { io.observe(a); });
})();


/* Fuss: Zeichen zeichnen sich, sobald der Fuss zu sehen ist (wie im Agentur-Fuss), 11.11.2026 */
(function () {
  var t = [].slice.call(document.querySelectorAll('.hf [data-fv]'));
  if (!t.length) return;
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { t.forEach(function (m) { m.classList.add('an'); }); return; }
  var o = new IntersectionObserver(function (x) { x.forEach(function (y) { if (y.isIntersecting) { y.target.classList.add('an'); o.unobserve(y.target); } }); }, { threshold: .25 });
  t.forEach(function (m) { o.observe(m); });
})();
