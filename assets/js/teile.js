/* Gewählte Fassungen der Startseite, zusammengefügt von build.py aus bausteine/ */
/* ---------- 04-bruecke ---------- */
/* Baustein 04 · Brücke · Fassung 8: das MacBook schwebt geschlossen herein und klappt dabei auf, kurz vor dem Ende kommt das
   Telefon hoch (Robert 08.11.2026: «flüssig wie Butter», echte Cycles-Qualität). Animation beim Erscheinen wünscht Robert hier
   ausdrücklich; sie läuft einmal.
   Aufklappen: 133 in Cycles gerenderte Bilder mit echten 60 Bildern pro Sekunde, die Bewegungskurve steckt in den Bildern.
   Abgespielt OHNE Überblenden: zeitbasiert genau ein Bild pro Bildschirmbild (bei 120 Hz jedes Bild zweimal), alle Bilder
   vorab geladen und entpackt und einmal unsichtbar gezeichnet, erst dann Start.
   Lade- und Entpack-Technik 1:1 aus der Tasty Webdesign Showcase (assets/js/show.js, UEBERGABE-NEUER-CHAT.md §2b):
   - Safari/iPhone (WebKit): <img> direkt von der Adresse -> decode() -> createImageBitmap(img) (createImageBitmap(blob)
     blockiert in WebKit den Hauptfaden; ein nur entpacktes <img> wirft WebKit nach ~1 s wieder weg).
   - Chrome/Firefox: Datei als Blob -> createImageBitmap(blob) ohne Größen-Option (entpackt auf Nebenfäden).
   - Laden in Wellen (6 gleichzeitig, in der Reihenfolge des Films), ein Bild kommt erst nach dem Entpacken in die Kette;
     fehlt eins, wird das nächstgelegene fertige gezeichnet (bereitesBild).
   - In Ruhe das scharfe Standbild aus dem vollen Satz, in Bewegung der leichtere Satz. Am Ende wechselt das Canvas
   über die letzten 10 Bilder (Deckel steht dort fast) weich auf das scharfe Standbild (gleicher Ausschnitt).
   Hereinschweben, Telefon, Schatten und das ruhige Schweben danach laufen über CSS (nur transform/opacity).
   Sichtbarkeit über getBoundingClientRect, auch durch das Rahmenfenster der Gesamt-Wahlseite hindurch.
   Bei «weniger Bewegung», ohne Canvas oder wenn Bilder fehlen: alles steht sofort offen da (Standbilder aus dem HTML). */
(function () {
  var wurzeln = document.querySelectorAll('[data-baustein="04"]');
  if (!wurzeln.length || !window.requestAnimationFrame || !window.Promise || !document.createElement('canvas').getContext) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var AUF0 = 0.45;                                  // Aufklappen beginnt 0,45 s nach dem Start des Hereinschwebens

  var UA_ = navigator.userAgent || '';
  var IST_SAFARI = /AppleWebKit/.test(UA_) && (/iPhone|iPad|iPod|CriOS|FxiOS|EdgiOS/.test(UA_) || !/(Chrome|Chromium|Edg|OPR|Firefox|Android)/.test(UA_));
  var HAT_BITMAP = typeof window.createImageBitmap === 'function' && typeof Blob === 'function';
  function lade(src) {
    if (HAT_BITMAP && !IST_SAFARI && window.fetch) {
      return fetch(src).then(function (r) { if (!r.ok) throw new Error(src); return r.blob(); }).then(function (b) { return window.createImageBitmap(b); });
    }
    return new Promise(function (ok, nein) {
      var im = new Image(); im.decoding = 'async';
      im.onerror = nein; im.src = src;
      (im.decode ? im.decode() : new Promise(function (f) { im.onload = f; })).then(function () {
        if (!HAT_BITMAP) { ok(im); return; }
        window.createImageBitmap(im).then(ok, function () { ok(im); });
      }, nein);
    });
  }
  // in Wellen laden: höchstens 6 gleichzeitig, in der gegebenen Reihenfolge
  function welle(liste, fertig, fehl) {
    var aus = new Array(liste.length), naechst = 0, offen = 0, da = 0, kaputt = false;
    function weiter() {
      while (!kaputt && offen < 6 && naechst < liste.length) {
        (function (k) {
          offen++;
          lade(liste[k]).then(function (b) { aus[k] = b; offen--; da++; fertig(aus, k, da); weiter(); },
                              function () { kaputt = true; fehl(); });
        })(naechst++);
      }
    }
    weiter(); return aus;
  }
  function entpackt(im) { return !im ? Promise.resolve() : (im.decode ? im.decode().catch(function () {}) : Promise.resolve()); }

  [].forEach.call(wurzeln, function (w) {
    var pc = w.querySelector('.b8__pc');
    if (!pc || !pc.getAttribute('data-folge') || !pc.getAttribute('data-boxen-d')) return;
    var pfad = pc.getAttribute('data-folge'), n = +pc.getAttribute('data-n'), fps = +pc.getAttribute('data-fps') || 60, telBild = +pc.getAttribute('data-tel');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var art = (pc.clientWidth || window.innerWidth) * dpr <= 1100 ? 'm' : 'd';
    var boxen = pc.getAttribute('data-boxen-' + art).split(';').map(function (b) { return b.split(',').map(Number); });
    var WECHSEL = 10;                               // die letzten 10 Bilder (Deckel steht fast) weich auf das scharfe Standbild
    function z3(i) { return (i < 10 ? '00' : i < 100 ? '0' : '') + i; }
    var quellen = [];
    for (var i = 0; i < n; i++) quellen.push(pfad + 'f-' + art + '-' + z3(i) + '.webp');
    quellen.push(pfad + 'auf-' + art + '-71.webp');                             // scharfes Standbild fürs Ende (voller Satz)
    var B = null, fehler = false, warm = false, gestartet = false, fertig = false, bilderDa = false, rest = false;

    var c = document.createElement('canvas'); c.className = 'b8__c'; c.setAttribute('aria-hidden', 'true');
    w.querySelector('.b8__ebene--g .b8__sch').appendChild(c);
    var g = c.getContext('2d');
    w.classList.add('b04-bereit');
    function masse() {
      var r = c.getBoundingClientRect();
      var cw = Math.max(1, Math.round(r.width * dpr)), ch = Math.max(1, Math.round(r.height * dpr));
      if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'medium';
    }
    function bild(i, a) { i = bereitesBild(i); if (i < 0) return; var b = boxen[i], W = c.width, H = c.height; g.globalAlpha = a; g.drawImage(B[i], b[0] * W, b[1] * H, b[2] * W, b[3] * H); }
    function standbild(a) { g.globalAlpha = a; g.drawImage(B[n], 0, 0, c.width, c.height); }
    function leer() { g.globalAlpha = 1; g.clearRect(0, 0, c.width, c.height); }

    // jedes Bild einmal unsichtbar zeichnen, damit beim Abspielen keins zum ersten Mal in den Grafikspeicher muss
    function aufwaermen() {
      masse(); var j = 0;
      (function stueck() {
        var bis = Math.min(n + 1, j + 10);
        for (; j < bis; j++) { g.globalAlpha = 1; g.drawImage(B[j], 0, 0, 2, 2); }
        leer();
        if (j < n + 1) requestAnimationFrame(stueck); else warm = true;
      })();
    }
    // erst laden, wenn der Auftakt komplett steht: die Bilder des ersten Bildschirms haben Vorrang
    function holen() { B = welle(quellen, function (aus, k, da) { if (da === quellen.length) { bilderDa = true; if (rest) aufwaermen(); } }, function () { fehler = true; }); }
    if (window.erstesBild || !document.documentElement.classList.contains('warte')) holen(); else document.addEventListener('erstesbild', holen, { once: true });
    Promise.all(['.b8__sg', '.b8__st', '.b8__telefon'].map(function (s) { return entpackt(w.querySelector(s)); }))
      .then(function () { rest = true; if (bilderDa) aufwaermen(); });
    // nächstgelegenes fertiges Bild (falls eines fehlt)
    function bereitesBild(i) {
      if (B[i]) return i;
      for (var d = 1; d < n; d++) { if (i - d >= 0 && B[i - d]) return i - d; if (i + d < n && B[i + d]) return i + d; }
      return -1;
    }

    function los() {
      gestartet = true; masse(); leer(); bild(0, 1);
      var tel = w.querySelector('.b8__ebene--t');
      if (tel) tel.style.setProperty('--b04-tel', ((n - 1 - telBild) / fps + 0.05).toFixed(2) + 's');
      void c.offsetWidth;
      w.classList.add('b04-los');                 // Hereinschweben (CSS)
      var t0 = null, zuletzt = 0, telAn = false;
      function schritt(jetzt) {
        if (t0 === null) t0 = jetzt;
        var tl = (jetzt - t0) / 1000 - AUF0;       // Zeit seit Beginn des Aufklappens
        var i = tl <= 0 ? 0 : Math.floor(tl * fps);
        if (!telAn && i >= telBild) { telAn = true; w.classList.add('b04-tel'); }
        var e = (tl * fps - (n - 1 - WECHSEL)) / WECHSEL; // 0..1 über die letzten WECHSEL Bilder
        if (e > 0) {
          leer(); bild(Math.min(i, n - 1), 1);
          if (e >= 1 && i >= n - 1) {
            leer(); standbild(1); fertig = true; w.classList.add('b04-offen');
            setTimeout(function () { w.classList.add('b04-punkte'); }, 220); return;
          }
          standbild(Math.min(1, e));
        } else if (i !== zuletzt) { leer(); bild(i, 1); zuletzt = i; }
        requestAnimationFrame(schritt);
      }
      requestAnimationFrame(schritt);
    }
    window.addEventListener('resize', function () { if (fertig) { masse(); leer(); standbild(1); } });

    function sichtbar() {
      var r = pc.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      var oben = r.top, hoch = window.innerHeight;
      try { var fe = window.frameElement; if (fe) { oben += fe.getBoundingClientRect().top; hoch = window.parent.innerHeight; } } catch (e) {}
      return oben < hoch * 0.72 && oben + r.height > hoch * 0.15;
    }
    function aufgeben() { w.classList.remove('b04-bereit'); c.remove(); }
    var gewartet = 0;
    var uhr = setInterval(function () {
      if (gestartet) { clearInterval(uhr); return; }
      if (fehler) { clearInterval(uhr); aufgeben(); return; }
      if (!sichtbar()) return;
      if (B && warm) { clearInterval(uhr); los(); }
      else if ((gewartet += 100) > 9000) { clearInterval(uhr); aufgeben(); }
    }, 100);
  });
})();

;
/* ---------- 05-ein-ort ---------- */
/* Baustein 05 · Dein Betrieb, an einem Ort · Register und Ebenen (08.11.2026)
   Zeigen, Fokus oder Klick auf einen Eintrag hebt seine Ebene heraus und zeigt seinen Satz. Nichts hängt am Scrollen. */
(function () {
  'use strict';
  [].slice.call(document.querySelectorAll('[data-baustein="05"]')).forEach(function (wurzel) {
    [].slice.call(wurzel.querySelectorAll('[data-g]')).forEach(function (g) {
      var ausloeser = [].slice.call(g.querySelectorAll('[data-k]')), ziele = [].slice.call(g.querySelectorAll('[data-t]'));
      function setze(k) {
        ausloeser.forEach(function (e) { e.classList.toggle('an', e.getAttribute('data-k') === k); });
        ziele.forEach(function (e) { e.classList.toggle('an', e.getAttribute('data-t') === k); });
        g.setAttribute('data-g', k);
      }
      ausloeser.forEach(function (e) {
        var k = e.getAttribute('data-k');
        e.addEventListener('click', function () { setze(k); });
        e.addEventListener('focus', function () { setze(k); });
        e.addEventListener('mouseenter', function () { setze(k); });
      });
    });
  });
})();

;
/* ---------- 06-zusammen ---------- */
// Baustein 06 · Alles hängt zusammen · Fassung «Einmal eintragen», edle Fassung (08.11.2026).
// Rein automatisch, ohne Maus, in einer ruhigen Schleife (19 s):
//  1. Das Feld «Preis pro Unit» wird gewählt, der alte Preis markiert, der neue tippt sich im gleichmäßigen Takt ein (feiner Cursor).
//  2. «Übernehmen»: kurzer Druck, ein feiner Lichtstreif gleitet über den Knopf, «Übernommen», das Häkchen zeichnet sich.
//  3. Zeile für Zeile, von oben nach unten: vom Panel zeichnet sich eine feine Linie zur Zeile, die Zeile hebt sich kaum merklich,
//     ein schmaler Schimmer gleitet darüber, die Zahl rollt wie ein Zählwerk um (Ziffernwalzen, hintere Stellen leicht versetzt;
//     nach oben, wenn der Wert steigt, nach unten, wenn er fällt) und nimmt den Kupferton an. Allergene: «bleibt», ruhig bestätigt.
//  4. Ruhe, dann rollt alles sanft zurück, von vorn.
// Start, sobald der Abschnitt im Bild ist (auch im iframe der Wahlseite), außer Sicht angehalten. Bei reduzierter Bewegung steht
// der Endstand aus dem CSS. Bewegt wird nur transform und opacity.
(function () {
  'use strict';
  var ENDE = 19, FOKUS = 0.8, MARK = 1.5, TIPP = 2.2, TAKT = 0.2, KNOPF = 4.1, ZEILE0 = 5.2, ABSTAND = 1.15, ZURUECK = 15.6;

  function k01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function weich(x) { x = k01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function sanft(x) { x = k01(x); return 1 - Math.pow(1 - x, 3); }
  function bump(t, a, d) { var x = (t - a) / d; return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x); }
  function setz(el, p, v) { if (!el) return; v = String(v); var k = '_b6' + p; if (el[k] !== v) { el.style[p] = v; el[k] = v; } }
  function op(el, x) { setz(el, 'opacity', (+x).toFixed(3)); }
  function alle(w, s) { return [].slice.call(w.querySelectorAll(s)); }

  function init(root) {
    if (!window.requestAnimationFrame) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var pn = root.querySelector('.b6-pn'), ziel = root.querySelector('.b6-ziel');
    if (!pn || !ziel) return;
    var fok = pn.querySelector('.b6-fok'), sel = pn.querySelector('.b6-sel'), tpA = pn.querySelector('.b6-tp-a'), cuA = pn.querySelector('.b6-cu-a');
    var chars = alle(pn, '.b6-tp-n .b6-ch'), cu0 = pn.querySelector('.b6-cu0');
    var knopf = pn.querySelector('.b6-knopf'), k1 = pn.querySelector('.b6-k1'), k2 = pn.querySelector('.b6-k2'), deck = pn.querySelector('.b6-deck'), streif = pn.querySelector('.b6-streif');
    var zeilen = alle(ziel, '.b6-z').map(function (z) {
      return { zin: z.querySelector('.b6-zin'), lt: z.querySelector('.b6-lt i'), schim: z.querySelector('.b6-schim'), ok: z.querySelector('.b6-ok'),
        kupfer: z.querySelector('.b6-rl--k'), pf: z.querySelector('.b6-pf'), strich: z.querySelector('.b6-strich'), bleibt: z.querySelector('.b6-bleibt'),
        walzen: alle(z, '.b6-st').map(function (s) { return { el: s, n: +s.getAttribute('data-n'), hoch: s.getAttribute('data-dir') === 'u', i: +s.getAttribute('data-i') }; }) };
    });
    var ENDE_TIPP = TIPP + chars.length * TAKT;

    function male(t) {
      // Rückweg: alles rollt sanft zurück
      var zr = weich((t - ZURUECK) / 1.6), z = 1 - zr;
      // 1. Feld, Markierung, Eintippen
      op(fok, Math.min(k01((t - FOKUS) / 0.4), 1 - k01((t - KNOPF - 0.2) / 0.5)));
      op(sel, k01((t - MARK) / 0.3) * (1 - k01((t - TIPP) / 0.12)));
      var altDa = t < TIPP || t >= ZURUECK + 1.6;
      op(tpA, altDa ? 1 : zr);
      var n = 0;
      chars.forEach(function (c, i) { var da = t >= TIPP + i * TAKT; if (da) n = i + 1; op(c, da ? z : 0); });
      var schreibt = t >= FOKUS && t < KNOPF;
      var an = schreibt && ((t >= TIPP && t < ENDE_TIPP) ? true : (Math.floor((t - FOKUS) / 0.53) % 2 === 0));
      var traeger = t < TIPP ? cuA : (n ? chars[n - 1].querySelector('.b6-cu') : cu0);
      op(cuA, an && traeger === cuA ? 1 : 0); op(cu0, an && traeger === cu0 ? 1 : 0);
      chars.forEach(function (c) { var cu = c.querySelector('.b6-cu'); op(cu, an && traeger === cu ? 1 : 0); });
      // 2. Übernehmen
      setz(knopf, 'transform', 'scale(' + (1 - 0.035 * bump(t, KNOPF - 0.2, 0.32)).toFixed(4) + ')');
      var s = k01((t - KNOPF) / 0.75);
      op(streif, s > 0 && s < 1 ? Math.sin(Math.PI * s) : 0);
      setz(streif, 'transform', 'translateX(' + (-120 + 380 * sanft(s)).toFixed(1) + '%) skewX(-18deg)');
      var g = k01((t - KNOPF - 0.15) / 0.35) * z;
      op(k1, 1 - g); op(k2, g);
      setz(deck, 'transform', 'scaleX(' + (1 - sanft((t - KNOPF - 0.35) / 0.45) * z).toFixed(3) + ')');
      // 3. Zeile für Zeile
      zeilen.forEach(function (r, i) {
        var ts = ZEILE0 + i * ABSTAND, zz = 1 - weich((t - ZURUECK - i * 0.08) / 1.4);
        setz(r.lt, 'transform', 'scaleX(' + (sanft((t - ts) / 0.55) * zz).toFixed(3) + ')');
        setz(r.zin, 'transform', 'translateY(' + (-3 * bump(t, ts + 0.45, 1.3)).toFixed(2) + 'px)');
        var sc = k01((t - ts - 0.5) / 0.9);
        op(r.schim, sc > 0 && sc < 1 ? Math.sin(Math.PI * sc) : 0);
        setz(r.schim, 'transform', 'translateX(' + (-110 + 420 * weich(sc)).toFixed(1) + '%)');
        var rs = ts + 0.6;
        r.walzen.forEach(function (w) {
          var x = weich((t - rs - w.i * 0.12) / 1.0) * zz, y = w.hoch ? -w.n * 1.2 * x : -w.n * 1.2 * (1 - x);
          setz(w.el, 'transform', 'translateY(' + y.toFixed(3) + 'em)');
        });
        var fertig = k01((t - rs - 0.9) / 0.6) * zz;
        op(r.kupfer, fertig); op(r.pf, fertig);
        setz(r.strich, 'transform', 'scaleX(' + (sanft((t - rs - 0.9) / 0.7) * zz).toFixed(3) + ')');
        op(r.ok, k01((t - rs - 0.6) / 0.5) * zz);
        if (r.bleibt) op(r.bleibt, 0.62 + 0.38 * k01((t - rs) / 0.5) * zz);
      });
    }

    var t = 0, laeuft = false, vorher = 0, raf = 0;
    function schritt(jetzt) {
      if (!laeuft) return;
      var dt = vorher ? Math.min(0.25, (jetzt - vorher) / 1000) : 0;
      vorher = jetzt; t = (t + dt) % ENDE; male(t);
      raf = requestAnimationFrame(schritt);
    }
    function los() { if (laeuft) return; laeuft = true; vorher = 0; raf = requestAnimationFrame(schritt); }
    function halt() { laeuft = false; cancelAnimationFrame(raf); }
    function imBild() {   // auch im iframe der Wahlseite: bis zum obersten Fenster hochrechnen
      var b = root.querySelector('.b6-g').getBoundingClientRect(); if (!b.height) return false;
      var oben = b.top, unten = b.bottom, w = window;
      try { while (w !== w.parent && w.frameElement) { var f = w.frameElement.getBoundingClientRect(); oben += f.top; unten += f.top; w = w.parent; } } catch (e) {}
      var H = w.innerHeight || document.documentElement.clientHeight;
      return unten > H * 0.2 && oben < H * 0.8;
    }
    function pruefe() { if (imBild()) los(); else halt(); }
    male(0);
    if ('IntersectionObserver' in window) new IntersectionObserver(pruefe, { threshold: [0, 0.2, 0.5] }).observe(root.querySelector('.b6-g'));
    window.addEventListener('scroll', pruefe, { passive: true });
    window.addEventListener('resize', pruefe);
    try { if (window.parent !== window) window.parent.addEventListener('scroll', pruefe, { passive: true }); } catch (e) {}
    window.addEventListener('load', pruefe);
    pruefe();
  }

  function los() { [].forEach.call(document.querySelectorAll('[data-baustein="06"]'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los); else los();
})();

;
/* ---------- 08-einkaufspreis ---------- */
// Baustein 08 · Preiswelle (08.11.2026): Der neue Einkaufspreis läuft als Preisfaktor von links nach rechts durch die echten Seiten.
// Inventar → Zutat → Rezeptur → drei Gerichte (Verzweigung) → Menü (Zusammenlauf). An jeder Station rollt der Wert vom alten zum neuen.
// Danach Ruhe mit allen neuen Werten, sanft zurück, von vorn. Läuft nur, solange der Abschnitt im Bild ist. Nur transform und opacity.
(function () {
  'use strict';
  if (!window.requestAnimationFrame) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var WEG = 1.25;                                   // Dauer eines Wegs in Sekunden
  var WEGE = [[0, 1, 1.9], [1, 2, 4.15],            // [von, nach, Abfahrt]
    [2, 3, 6.4], [2, 4, 6.54], [2, 5, 6.68],        // Verzweigung in die drei Gerichte
    [3, 6, 9.0], [4, 6, 9.3], [5, 6, 9.6]];         // Zusammenlauf im Menü
  var ERST = 0.9, AUS = 15.4, LEER = 16.1, ENDE = 16.7;

  function k01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function eio(x) { x = k01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function eaus(x) { x = k01(x); return 1 - Math.pow(1 - x, 4); }
  function ezurueck(x) { x = k01(x); var c = 1.5; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function setz(el, p, v) { if (el['_v8' + p] !== v) { el.style[p] = v; el['_v8' + p] = v; } }

  function init(root) {
    var reihe = root.querySelector('.v8__r');
    if (!reihe) return;
    var st = [], seiten = [], pfeile = [], wege = [];

    [].forEach.call(root.querySelectorAll('.v8__w'), function (w) {
      var fig = w.closest('[data-seite]');
      st[+w.dataset.k] = {
        wert: w.querySelector('.v8__wert'), zahl: w.querySelector('.v8__wert strong'), plus: w.querySelector('.v8__plus'),
        alt: w.querySelector('.v8__n s'), hell: w.querySelector('.v8__hell'), puls: w.querySelector('.v8__puls'),
        seite: fig ? +fig.dataset.seite : 0, an: [],
        spalten: [].map.call(w.querySelectorAll('.v8__zr'), function (z) { return { el: z, p: z.dataset.p.split(',').map(Number), i: +z.dataset.z }; })
      };
    });
    if (st.length < 7) return;
    st[0].an.push(ERST);
    WEGE.forEach(function (w) { st[w[1]].an.push(w[2] + WEG); });
    st.forEach(function (s) { s.an.sort(function (a, b) { return a - b; }); });

    [].forEach.call(root.querySelectorAll('.v8__s'), function (f) {
      var nr = +f.dataset.seite, a = Infinity;
      st.forEach(function (s) { if (s.seite === nr) a = Math.min(a, s.an[0]); });
      seiten.push({ glanz: f.querySelector('.v8__glanz'), strich: f.querySelector('.v8__strich'), a: a });
    });
    [].forEach.call(root.querySelectorAll('.v8__pf'), function (p) {
      var nr = +p.dataset.nach, ab = [];
      WEGE.forEach(function (w) { if (st[w[0]].seite === nr) ab.push(w[2]); });
      if (ab.length) pfeile.push({ el: p.querySelector('i'), ab: Math.min.apply(null, ab) });
    });

    // Bahnen und Preisfaktoren anlegen
    var netz = document.createElement('div');
    netz.className = 'v8__netz';
    netz.setAttribute('aria-hidden', 'true');
    WEGE.forEach(function (w) {
      var bahn = document.createElement('span'), licht = document.createElement('i'), chip = document.createElement('span');
      bahn.className = 'v8__bahn'; bahn.appendChild(licht);
      chip.className = 'v8__chip'; chip.textContent = st[w[0]].plus.textContent;
      netz.appendChild(bahn); netz.appendChild(chip);
      wege.push({ von: w[0], nach: w[1], ab: w[2], bahn: bahn, licht: licht, chip: chip, x0: 0, y0: 0, x1: 0, y1: 0 });
    });
    reihe.appendChild(netz);

    var breit = true;
    function lage(el) {   // Lage relativ zur Reihe, ohne transform (offset-Kette)
      var x = 0, y = 0, e = el;
      while (e && e !== reihe) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
      return { x: x, y: y, w: el.offsetWidth, h: el.offsetHeight };
    }
    function vermessen() {
      breit = getComputedStyle(netz).display !== 'none';
      if (!breit) return;
      wege.forEach(function (w) {
        var p = lage(st[w.von].plus), a = lage(st[w.von].wert), b = lage(st[w.nach].wert);
        w.x0 = p.x + p.w + 10; w.y0 = a.y + a.h / 2;
        w.x1 = b.x - 10; w.y1 = b.y + b.h / 2;
        var dx = w.x1 - w.x0, dy = w.y1 - w.y0;
        w.bahn.style.width = Math.max(0, Math.sqrt(dx * dx + dy * dy)).toFixed(1) + 'px';
        w.bahn.style.transform = 'translate3d(' + w.x0.toFixed(1) + 'px,' + w.y0.toFixed(1) + 'px,0) rotate(' + Math.atan2(dy, dx).toFixed(4) + 'rad)';
      });
      male(t);
    }

    function male(zeit) {
      var tau, g;
      if (zeit < AUS) { tau = zeit; g = 1; }
      else if (zeit < LEER) { tau = AUS; g = 1 - eio((zeit - AUS) / (LEER - AUS)); }
      else { tau = 0; g = eio((zeit - LEER) / (ENDE - LEER)); }

      st.forEach(function (s) {
        s.spalten.forEach(function (c) {
          var pos = c.p[0];
          for (var j = 1; j < c.p.length; j++) pos += (c.p[j] - c.p[j - 1]) * eaus((tau - s.an[j - 1] - c.i * 0.08) / 0.9);
          setz(c.el, 'transform', 'translate3d(0,' + (-pos * 1.1).toFixed(4) + 'em,0)');
        });
        setz(s.zahl, 'opacity', g.toFixed(3));
        var o = eaus((tau - s.an[0] - 0.3) / 0.6);
        setz(s.alt, 'opacity', (o * g).toFixed(3));
        setz(s.alt, 'transform', 'translate3d(' + ((1 - o) * -8).toFixed(2) + 'px,0,0)');
        var q = k01((tau - s.an[s.an.length - 1] - 0.35) / 0.55);
        setz(s.plus, 'opacity', (Math.min(1, q * 1.6) * g).toFixed(3));
        setz(s.plus, 'transform', 'scale(' + (0.6 + 0.4 * ezurueck(q)).toFixed(3) + ')');
        var hell = 0, ring = 0, wachs = 0;
        s.an.forEach(function (a) {
          var d = tau - a;
          if (d >= 0 && d < 1.5) hell = Math.max(hell, d < 0.16 ? d / 0.16 : 1 - (d - 0.16) / 1.34);
          if (d >= 0 && d < 0.95) { ring = Math.max(ring, 0.9 * (1 - d / 0.95)); wachs = eaus(d / 0.95); }
        });
        setz(s.hell, 'opacity', (hell * g).toFixed(3));
        setz(s.puls, 'opacity', ring.toFixed(3));
        setz(s.puls, 'transform', 'scale(' + (1 + wachs * 0.14).toFixed(3) + ',' + (1 + wachs * 0.5).toFixed(3) + ')');
      });

      seiten.forEach(function (sp) {
        var d = tau - sp.a, gl = 0;
        if (d >= 0) gl = d < 0.4 ? eaus(d / 0.4) : Math.max(0.34, 1 - (d - 0.4) / 1.6 * 0.66);
        if (sp.glanz) setz(sp.glanz, 'opacity', (gl * g).toFixed(3));
        if (sp.strich) {
          var q = d / 1.4;
          if (q > 0 && q < 1) {
            setz(sp.strich, 'opacity', (Math.sin(Math.PI * q) * 0.95).toFixed(3));
            setz(sp.strich, 'transform', 'translate3d(' + (-120 + eio(q) * 420).toFixed(1) + '%,0,0) skewX(-14deg)');
          } else setz(sp.strich, 'opacity', '0');
        }
      });

      pfeile.forEach(function (pf) {
        var q = (tau - pf.ab) / WEG, l = q < 0 ? 0 : q <= 1 ? eaus(q * 1.6) : Math.max(0.3, 1 - (q - 1) * 0.7);
        setz(pf.el, 'opacity', (l * g).toFixed(3));
      });

      if (!breit) return;
      wege.forEach(function (w) {
        var q = (tau - w.ab) / WEG, e = eio(q);
        setz(w.licht, 'transform', 'scaleX(' + e.toFixed(4) + ')');
        var lo = q < 0 ? 0 : q <= 1 ? 1 : Math.max(0.42, 1 - (q - 1) * 0.6);
        setz(w.licht, 'opacity', (lo * g).toFixed(3));
        if (q <= 0 || q >= 1) { setz(w.chip, 'opacity', '0'); return; }
        var op = Math.min(1, q / 0.12) * (q > 0.86 ? (1 - q) / 0.14 : 1);
        var sk = q < 0.12 ? 0.6 + 0.4 * eaus(q / 0.12) : q > 0.86 ? 1 - 0.45 * (q - 0.86) / 0.14 : 1;
        var x = w.x0 + (w.x1 - w.x0) * e, y = w.y0 + (w.y1 - w.y0) * e;
        setz(w.chip, 'opacity', op.toFixed(3));
        setz(w.chip, 'transform', 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) translate(' + (-e * 100).toFixed(1) + '%,-50%) scale(' + sk.toFixed(3) + ')');
      });
    }

    // Uhr: läuft nur, solange der Abschnitt im Bild ist
    var t = 0, laeuft = false, vorher = 0, raf = 0;
    function schritt(jetzt) {
      if (!laeuft) return;
      var dt = vorher ? Math.min(0.1, (jetzt - vorher) / 1000) : 0;
      vorher = jetzt; t = (t + dt) % ENDE;
      male(t);
      raf = requestAnimationFrame(schritt);
    }
    function an() { if (laeuft) return; laeuft = true; vorher = 0; raf = requestAnimationFrame(schritt); }
    function aus() { laeuft = false; cancelAnimationFrame(raf); }
    function imBild() {   // auch in einem Rahmen (iframe) der Wahlseite: bis zum obersten Fenster hochrechnen
      var r = root.getBoundingClientRect();
      if (!r.height) return false;
      var oben = r.top, unten = r.bottom, w = window;
      try { while (w !== w.parent && w.frameElement) { var f = w.frameElement.getBoundingClientRect(); oben += f.top; unten += f.top; w = w.parent; } } catch (e) {}
      var H = w.innerHeight || document.documentElement.clientHeight;
      return unten > H * 0.15 && oben < H * 0.85;
    }
    function pruefe() { if (imBild()) an(); else aus(); }

    vermessen();
    male(0);
    if ('ResizeObserver' in window) new ResizeObserver(vermessen).observe(reihe);
    else window.addEventListener('resize', vermessen);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(vermessen);
    if ('IntersectionObserver' in window) new IntersectionObserver(pruefe, { threshold: [0, 0.1, 0.25, 0.5] }).observe(root);
    window.addEventListener('scroll', pruefe, { passive: true });
    try { if (window.parent !== window) window.parent.addEventListener('scroll', pruefe, { passive: true }); } catch (e) {}
    window.addEventListener('load', function () { vermessen(); pruefe(); });
    pruefe();
  }

  function los() { [].forEach.call(document.querySelectorAll('[data-baustein="08"]'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los); else los();
})();
