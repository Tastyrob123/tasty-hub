/* Sprache Deutsch / Englisch (Robert 22.11.2026: «englische Versionen zum Auswählen auf der Seite direkt»).
   Die Seite bleibt deutsch geschrieben. Ist Englisch gewählt (Umschalter, gemerkt im Browser, oder ?lang=en in der Adresse),
   lädt dieses Skript das Wörterbuch (data-buch) und tauscht jeden Text schon beim Aufbau der Seite aus, bevor etwas sichtbar wird.
   Was Skripte später einsetzen (Chat, Vorführungen), wird beim Einsetzen übersetzt. Wechsel der Sprache lädt die Seite neu.
   Gehört so früh wie möglich in den <head>: <script src="…/sprache.js" data-buch="sprache-en.js" data-knopf="ecke|leiste"></script> */
(function () {
  var KEY = 'tasty-sprache', d = document.documentElement, me = document.currentScript;
  var m = /[?&]lang=(de|en|fr)\b/.exec(location.search);
  if (m) try { localStorage.setItem(KEY, m[1]); } catch (e) {}
  var l = m ? m[1] : null;
  if (!l) try { l = localStorage.getItem(KEY); } catch (e) {}
  var en = l === 'en';
  var S = window.TastySprache = { en: en, lang: en ? 'en' : 'de' };
  var basis = me && me.src ? me.src.replace(/[^\/]*$/, '') : '';

  S.setze = function (z) {
    try { localStorage.setItem(KEY, z); } catch (e) {}
    if ((z === 'en') === en) return;
    var u = location.pathname + location.search.replace(/([?&])lang=[a-z]+&?/, '$1').replace(/[?&]$/, '') + location.hash;
    if (u === location.pathname + location.search + location.hash) location.reload(); else location.replace(u);
  };
  /* Umschalter in der Leiste der Agentur-Seite (kopf.js) meldet die Wahl */
  addEventListener('tasty-sprache', function (e) { S.setze(e.detail); });

  /* Eigener Umschalter, wo die Seite keinen hat */
  function knopf() {
    var art = me && me.getAttribute('data-knopf');
    if (!art || document.querySelector('.sprache')) return;
    var w = document.createElement('div');
    w.className = 'sprache sprache--' + art; w.setAttribute('role', 'group'); w.setAttribute('aria-label', en ? 'Language' : 'Sprache');
    w.innerHTML = '<button type="button" lang="de" title="Deutsch">DE</button><i>/</i><button type="button" lang="en" title="English">EN</button>';
    [].forEach.call(w.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('lang') === 'en') === en)); });
    w.addEventListener('click', function (e) { var b = e.target.closest('button[lang]'); if (b) S.setze(b.getAttribute('lang')); });
    var ziel = art === 'leiste' && document.querySelector(me.getAttribute('data-ort') || '.nav__insel');
    if (ziel) { var vor = ziel.querySelector('.burger'); ziel.insertBefore(w, vor || null); }
    else { w.className = 'sprache sprache--ecke'; document.body.appendChild(w); }
    if (!document.getElementById('sprache-css')) {
      var st = document.createElement('style'); st.id = 'sprache-css';
      st.textContent =
        '.sprache--ecke{position:fixed;z-index:61;left:16px;bottom:16px;display:flex;align-items:center;gap:2px;height:36px;padding:0 6px;border-radius:999px;' +
        'font:500 10.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;color:#f8f1e8;background:linear-gradient(180deg,#2e3354 0%,#1d2138 50%,#121628 100%);' +
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.26),inset 0 -2px 3px rgba(0,0,0,.45),0 0 0 1px rgba(235,219,206,.3),0 3px 0 0 #090b14,0 18px 28px -14px rgba(0,0,0,.9)}' +
        '.sprache--ecke button,.sprache--leiste button{position:relative;padding:7px 7px 6px;font:inherit;letter-spacing:inherit;color:inherit;opacity:.5;background:none;border:0;cursor:pointer;transition:opacity .3s}' +
        '.sprache--ecke button:hover,.sprache--leiste button:hover,.sprache--ecke button[aria-pressed="true"],.sprache--leiste button[aria-pressed="true"]{opacity:1}' +
        '.sprache--ecke button[aria-pressed="true"]::after,.sprache--leiste button[aria-pressed="true"]::after{content:"";position:absolute;left:7px;right:calc(7px + .14em);bottom:4px;height:1px;background:currentColor}' +
        '.sprache--ecke i,.sprache--leiste i{font-style:normal;opacity:.3}' +
        '.sprache--leiste{display:flex;align-items:center;gap:1px;margin-left:auto;font:500 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em}';
      document.head.appendChild(st);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', knopf); else knopf();

  if (!en) return;
  d.setAttribute('lang', 'en');

  S.los = function () {
    var B = S.buch || {}, R = S.regeln || [];
    var NICHT = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1 };
    var ATT = ['alt', 'title', 'aria-label', 'placeholder', 'data-name'];
    function nz(s) { return s.replace(/\s+/g, ' ').trim(); }
    function tr(s) {
      var k = nz(s); if (!k) return null;
      if (Object.prototype.hasOwnProperty.call(B, k)) return B[k];
      for (var i = 0; i < R.length; i++) if (R[i][0].test(k)) return k.replace(R[i][0], R[i][1]);
      return null;
    }
    function txt(n) {
      var p = n.parentNode; if (!p || NICHT[p.nodeName]) return;
      var v = n.data, t = tr(v); if (t === null || t === nz(v)) return;
      n.data = v.match(/^\s*/)[0] + t + v.match(/\s*$/)[0];
    }
    function setz(el, a) { var v = el.getAttribute(a); if (!v) return; var t = tr(v); if (t !== null && t !== v) el.setAttribute(a, t); }
    function att(el) {
      for (var i = 0; i < ATT.length; i++) if (el.hasAttribute(ATT[i])) setz(el, ATT[i]);
      var n = el.nodeName;
      if (n === 'META') { var k = el.getAttribute('name') || el.getAttribute('property') || ''; if (/^(description|og:|twitter:)/.test(k)) setz(el, 'content'); }
      else if (n === 'INPUT' && /^(submit|button)$/.test(el.type)) setz(el, 'value');
    }
    var FILTER = { acceptNode: function (x) { if (x.nodeType === 1 && NICHT[x.nodeName]) { att(x); return 2; } return 1; } };
    function geh(n) {
      if (n.nodeType === 3) return txt(n);
      if (n.nodeType !== 1) return;
      att(n); if (NICHT[n.nodeName]) return;
      var w = document.createTreeWalker(n, 5, FILTER, false), x;
      while ((x = w.nextNode())) { if (x.nodeType === 3) txt(x); else att(x); }
    }
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var r = ms[i];
        if (r.type === 'childList') for (var j = 0; j < r.addedNodes.length; j++) geh(r.addedNodes[j]);
        else if (r.type === 'characterData') txt(r.target);
        else if (r.target.nodeType === 1) { if (r.attributeName === 'content' || r.attributeName === 'value') att(r.target); else setz(r.target, r.attributeName); }
      }
    }).observe(d, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATT.concat(['content', 'value']) });
    geh(d);
    document.addEventListener('DOMContentLoaded', function () { geh(document.body); });
    S.t = function (s) { var t = tr(s); return t === null ? s : t; };
  };
  document.write('<script src="' + basis + (me.getAttribute('data-buch') || 'sprache-en.js') + '"><\/script>');
})();
