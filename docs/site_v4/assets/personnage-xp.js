/* ================================================================
   personnage-xp.js — Système de personnage XP pour Oikonomia
   Référencé dans _quarto.yml → format.html.include-after-body
   ================================================================ */
(function () {
  'use strict';

  /* ── Gains XP ── */
  var XP_CHAPITRE   = 80;
  var XP_QUIZ_BASE  = 100;
  var XP_QUIZ_BONUS = 15;   // par bonne réponse au-delà de 2
  var XP_DEFI       = 20;
  var XP_BILAN      = 50;
  var XP_GLOSSAIRE  = 30;
  var XP_CARTE      = 40;

  /* ── Paliers de niveau ── */
  var NIVEAUX = [
    { min: 0,    star: 1 },
    { min: 100,  star: 2 },
    { min: 250,  star: 3 },
    { min: 450,  star: 4 },
    { min: 700,  star: 5 },
    { min: 1000, star: 6 }
  ];

  /* ── Titres par avatar ── */
  var TITRES = {
    marchand:     ['Novice du marché',      'Commerçant·e',     'Négociant·e',          'Courtier·ière',        'Banquier·ière',         'Magnat·e'],
    philosophe:   ['Curieux·se',            'Penseur·se',        'Dialecticien·ne',      'Sophiste éclairé·e',   'Sage économique',       'Oracle'],
    ouvrier:      ["Apprenti·e ouvrier·ière",'Compagnon·ne',     'Artisan·e',            'Délégué·e',            "Militant·e éclairé·e",  'Tribun·e'],
    entrepreneur: ['Stagiaire',             'Junior',            'Développeur·se',       'Directeur·rice',       "Entrepreneur·se",       'Visionnaire']
  };
  var TITRES_DEFAUT = ["Apprenti·e", "Étudiant·e", "Analyste", "Théoricien·ne", "Économiste", "Grand Maître"];

  /* ── Emoji par avatar + niveau ── */
  var EMOJIS = {
    marchand:     ['🧑‍💼','👨‍💼','🧑‍💼','💼','🏦','🏛️'],
    philosophe:   ['🤔','📚','🦉','🎓','🧠','✨'],
    ouvrier:      ['👷','🔧','⚙️','🏭','✊','🌟'],
    entrepreneur: ['🌱','💡','🚀','📈','🏆','👑']
  };

  /* ── Messages level-up par avatar ── */
  var MESSAGES = {
    marchand: [
      'Vos premiers échanges vous ouvrent les yeux sur les mécanismes du marché.',
      "Vous commencez à voir les flux d'échanges là où d'autres ne voient que des prix.",
      "Les routes commerciales de l'histoire n'ont plus de secrets pour vous.",
      'Votre sens de la valeur s\'aiguise — Smith et Ricardo vous parlent.',
      'Les marchés, les crises, les équilibres : votre regard est expert.',
      "Vous voyez l'économie mondiale comme un grand échiquier. Bravo !"
    ],
    philosophe: [
      "Chaque concept économique cache une vision du monde. Vous commencez à le voir.",
      "La pensée économique comme philosophie — c'est votre regard.",
      "Vous posez les bonnes questions là où d'autres acceptent les réponses.",
      'Votre méthode dialectique illumine les contradictions des grandes écoles.',
      "De Aristote à Keynes, vous tissez le fil des idées avec maestria.",
      "Votre regard philosophique transcende les frontières disciplinaires. Remarquable !"
    ],
    ouvrier: [
      "Le travail comme fondement de la valeur — vous en saisissez la portée.",
      "La lutte pour la juste rémunération prend sens à travers l'histoire des idées.",
      'Marx, Proudhon, les physiocrates : leurs combats éclairent le vôtre.',
      'Vous comprenez les rapports de production mieux que la plupart.',
      'Piketty, Veblen, Mazzucato : vous maîtrisez la critique économique.',
      "La valeur du travail n'a plus de mystère pour vous. Chapeau !"
    ],
    entrepreneur: [
      "Innovation, risque, croissance — les premiers outils sont dans votre boîte.",
      'Schumpeter vous sourit : vous comprenez la destruction créatrice.',
      'Votre instinct entrepreneurial trouve ses fondements théoriques.',
      'Vous cartographiez les théories de croissance avec aisance.',
      "De Marshall à Acemoglu : institutions, marchés, innovation — vous maîtrisez.",
      'Vision stratégique et rigueur théorique : vous êtes au sommet. Félicitations !'
    ]
  };
  var MESSAGES_DEFAUT = [
    "Beau départ sur le chemin de la pensée économique !",
    "Votre curiosité intellectuelle porte ses fruits.",
    "Vous avancez à grands pas dans la compréhension de l'économie.",
    "Les grandes théories économiques n'ont plus de secrets pour vous.",
    "Votre maîtrise de l'histoire de la pensée économique est impressionnante.",
    "Vous avez parcouru tout le chemin. Félicitations !"
  ];

  /* ── localStorage helpers ── */
  function getXP()        { return parseInt(localStorage.getItem('xp') || '0', 10); }
  function setXP(v)       { localStorage.setItem('xp', String(v)); }
  function getAvatar()    { return localStorage.getItem('avatar') || ''; }
  function getXpGained()  { return JSON.parse(localStorage.getItem('xpGained') || '{}'); }
  function setXpGained(o) { localStorage.setItem('xpGained', JSON.stringify(o)); }
  function getXpLog()     { return JSON.parse(localStorage.getItem('xpLog') || '[]'); }
  function setXpLog(l)    { localStorage.setItem('xpLog', JSON.stringify(l)); }

  /* ── Calcul niveau ── */
  function getNiveauIdx(xp) {
    var idx = 0;
    for (var i = 0; i < NIVEAUX.length; i++) { if (xp >= NIVEAUX[i].min) idx = i; }
    return idx;
  }
  function getNiveauInfo(xp) {
    var idx = getNiveauIdx(xp);
    var av  = getAvatar();
    var titres = (av && TITRES[av]) ? TITRES[av] : TITRES_DEFAUT;
    var emojis = (av && EMOJIS[av]) ? EMOJIS[av] : Array(6).fill('📖');
    var next   = NIVEAUX[idx + 1];
    var pct    = next ? Math.round((xp - NIVEAUX[idx].min) / (next.min - NIVEAUX[idx].min) * 100) : 100;
    return { idx: idx, titre: titres[idx], stars: NIVEAUX[idx].star,
             emoji: emojis[idx], xp: xp, nextXp: next ? next.min : null, pct: pct };
  }

  /* ── Gain XP (idempotent par source) ── */
  function gainXP(source, montant, label) {
    var gained = getXpGained();
    if (gained[source]) return false;
    gained[source] = true;
    setXpGained(gained);
    var prev = getXP();
    var next = prev + montant;
    setXP(next);
    var log = getXpLog();
    log.push({ ts: Date.now(), source: source, label: label, montant: montant, total: next });
    setXpLog(log);
    checkLevelUp(prev, next);
    refreshWidget();
    showXPToast('+' + montant + ' XP · ' + label);
    return true;
  }

  /* ── Level-up check ── */
  function checkLevelUp(prevXP, nextXP) {
    var pi = getNiveauIdx(prevXP), ni = getNiveauIdx(nextXP);
    if (ni > pi) setTimeout(function () { showLevelUpPopup(ni); }, 700);
  }

  /* ── Popup level-up ── */
  function showLevelUpPopup(niveauIdx) {
    var av     = getAvatar();
    var titres = (av && TITRES[av])   ? TITRES[av]   : TITRES_DEFAUT;
    var emojis = (av && EMOJIS[av])   ? EMOJIS[av]   : Array(6).fill('📖');
    var msgs   = (av && MESSAGES[av]) ? MESSAGES[av] : MESSAGES_DEFAUT;
    var titre  = titres[niveauIdx];
    var emoji  = emojis[niveauIdx];
    var msg    = msgs[niveauIdx] || msgs[msgs.length - 1];
    var stars  = Array(NIVEAUX[niveauIdx].star).fill('⭐').join('');

    var overlay = document.createElement('div');
    overlay.id = 'xp-levelup-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(13,33,55,.75);display:flex;align-items:center;justify-content:center;animation:xpFadeIn .3s ease';
    overlay.innerHTML =
      '<div style="background:#0D2137;border:2px solid #4A9EDB;border-radius:16px;padding:2.5rem 3rem;text-align:center;max-width:380px;width:90%;position:relative;animation:xpPopIn .4s cubic-bezier(.17,.67,.42,1.3);">'
      + '<div style="font-size:3.5rem;margin-bottom:.5rem;display:block;">' + emoji + '</div>'
      + '<div style="font-size:.72rem;font-weight:700;letter-spacing:.2em;color:#7BC4E8;text-transform:uppercase;margin-bottom:.4rem;">⭐ Niveau atteint</div>'
      + '<div style="font-size:1.9rem;font-weight:700;color:#EAF1F8;font-family:\'Playfair Display\',serif;margin-bottom:.3rem;">' + titre + '</div>'
      + '<div style="font-size:1.1rem;margin:.6rem 0;">' + stars + '</div>'
      + '<p style="color:#A8CADA;font-size:.9rem;line-height:1.6;margin-bottom:1.4rem;">' + msg + '</p>'
      + '<button onclick="document.getElementById(\'xp-levelup-overlay\').remove()" style="background:#2E6DA4;color:#fff;border:none;border-radius:8px;padding:.7rem 2rem;font-size:.95rem;font-weight:600;cursor:pointer;" onmouseover="this.style.background=\'#1A3A5C\'" onmouseout="this.style.background=\'#2E6DA4\'">Continuer ✨</button>'
      + '<button onclick="document.getElementById(\'xp-levelup-overlay\').remove()" style="position:absolute;top:12px;right:16px;background:none;border:none;color:#7BC4E8;font-size:1.1rem;cursor:pointer;">✕</button>'
      + '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
  }

  /* ── Toast flottant ── */
  function showXPToast(txt) {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:90px;right:20px;z-index:99998;background:#1A3A5C;color:#7BC4E8;padding:.4rem .9rem;border-radius:20px;font-size:.82rem;font-weight:700;border:1px solid #2E6DA4;animation:xpSlideUp .35s ease,xpFadeOut .4s 1.8s ease forwards;pointer-events:none;font-family:\'Source Sans 3\',sans-serif;';
    t.textContent = txt;
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2300);
  }

  /* ── Widget flottant ── */
  function createWidget() {
    if (document.getElementById('oikonomia-xp-widget')) return;

    var style = document.createElement('style');
    style.textContent = [
      '@keyframes xpFadeIn{from{opacity:0}to{opacity:1}}',
      '@keyframes xpPopIn{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}',
      '@keyframes xpSlideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}',
      '@keyframes xpFadeOut{from{opacity:1}to{opacity:0}}',
      '@keyframes xpPulse{0%,100%{box-shadow:0 0 0 0 rgba(46,109,164,.4)}50%{box-shadow:0 0 0 8px rgba(46,109,164,0)}}',
      '#oikonomia-xp-widget{position:fixed;bottom:20px;right:20px;z-index:9999;font-family:\'Source Sans 3\',sans-serif;}',
      '#xp-bubble{width:54px;height:54px;border-radius:50%;background:#0D2137;border:2px solid #2E6DA4;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.5rem;transition:transform .2s;box-shadow:0 4px 16px rgba(0,0,0,.4);}',
      '#xp-bubble:hover{transform:scale(1.12);animation:xpPulse 1.5s infinite;}',
      '#xp-panel{position:absolute;bottom:64px;right:0;width:268px;background:#0D2137;border:1px solid #2E6DA4;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);overflow:hidden;transition:opacity .2s,transform .2s;transform-origin:bottom right;}',
      '#xp-panel.xp-hidden{opacity:0;transform:scale(.9) translateY(8px);pointer-events:none;}',
      '.xp-bar-bg{background:#1A3A5C;border-radius:4px;height:6px;overflow:hidden;}',
      '.xp-bar-fill{height:100%;background:linear-gradient(90deg,#2E6DA4,#7BC4E8);border-radius:4px;transition:width .6s ease;}',
      '.xp-log-row{display:flex;justify-content:space-between;align-items:center;padding:.32rem .8rem;font-size:.78rem;border-bottom:1px solid #1A3A5C;color:#A8CADA;}',
      '.xp-log-gain{color:#7BC4E8;font-weight:700;white-space:nowrap;margin-left:8px;}'
    ].join('');
    document.head.appendChild(style);

    var w = document.createElement('div');
    w.id = 'oikonomia-xp-widget';
    w.innerHTML = '<div id="xp-bubble" title="Mon personnage XP">📖</div><div id="xp-panel" class="xp-hidden"><div id="xp-panel-inner"></div></div>';
    document.body.appendChild(w);

    document.getElementById('xp-bubble').addEventListener('click', togglePanel);
    document.addEventListener('click', function (e) {
      var widget = document.getElementById('oikonomia-xp-widget');
      if (widget && !widget.contains(e.target)) closePanel();
    });
  }

  var panelOpen = false;
  function togglePanel() { panelOpen ? closePanel() : openPanel(); }
  function openPanel()   { panelOpen = true;  renderPanel(); document.getElementById('xp-panel').classList.remove('xp-hidden'); }
  function closePanel()  { panelOpen = false; document.getElementById('xp-panel').classList.add('xp-hidden'); }

  function renderPanel() {
    var xp   = getXP();
    var info = getNiveauInfo(xp);
    var log  = getXpLog().slice(-5).reverse();
    var avNames = { marchand: 'Le Marchand', philosophe: 'Le Philosophe', ouvrier: "L'Ouvrier", entrepreneur: "L'Entrepreneur" };
    var av = getAvatar();

    var logHtml = log.length
      ? log.map(function (l) {
          return '<div class="xp-log-row"><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + l.label + '</span><span class="xp-log-gain">+' + l.montant + '</span></div>';
        }).join('')
      : '<div style="padding:.8rem;font-size:.78rem;color:#4A7A9B;text-align:center;">Aucune action encore</div>';

    var profPath = window.location.pathname.includes('/chapitres/') ? '../profil.html' : 'profil.html';

    document.getElementById('xp-panel-inner').innerHTML =
      /* Header */
      '<div style="padding:1rem;background:#0A1A2E;border-bottom:1px solid #1A3A5C;">'
      + '<div style="display:flex;align-items:center;gap:10px;">'
      + '<div style="font-size:2rem;line-height:1;">' + info.emoji + '</div>'
      + '<div style="flex:1;">'
      + '<div style="font-size:.68rem;color:#4A7A9B;letter-spacing:.1em;text-transform:uppercase;">' + (av ? (avNames[av] || av) : 'Sans profil') + '</div>'
      + '<div style="font-size:.98rem;font-weight:700;color:#EAF1F8;font-family:\'Playfair Display\',serif;">' + info.titre + '</div>'
      + '<div style="font-size:.85rem;">' + Array(info.stars).fill('⭐').join('') + '</div>'
      + '</div>'
      + '<div style="text-align:right;">'
      + '<div style="font-size:1.7rem;font-weight:700;color:#7BC4E8;line-height:1;">' + xp + '</div>'
      + '<div style="font-size:.65rem;color:#4A7A9B;text-transform:uppercase;letter-spacing:.08em;">XP</div>'
      + '</div></div>'
      /* Barre XP */
      + '<div style="margin-top:.7rem;">'
      + '<div style="display:flex;justify-content:space-between;font-size:.7rem;margin-bottom:3px;">'
      + (info.nextXp ? '<span style="color:#A8CADA;">vers ' + info.nextXp + ' XP</span>' : '<span style="color:#FFD700;">Niveau max !</span>')
      + '<span style="color:#4A7A9B;">' + info.pct + '%</span>'
      + '</div>'
      + '<div class="xp-bar-bg"><div class="xp-bar-fill" style="width:' + info.pct + '%;"></div></div>'
      + '</div></div>'
      /* Log */
      + '<div style="padding:.4rem 0 .1rem;">'
      + '<div style="padding:.2rem .8rem .25rem;font-size:.65rem;color:#4A7A9B;text-transform:uppercase;letter-spacing:.1em;">Dernières actions</div>'
      + logHtml + '</div>'
      /* Footer */
      + '<div style="padding:.45rem .8rem .65rem;border-top:1px solid #1A3A5C;text-align:center;">'
      + '<a href="' + profPath + '" style="font-size:.76rem;color:#7BC4E8;text-decoration:none;">Voir mon profil complet →</a>'
      + '</div>';
  }

  function refreshWidget() {
    var info   = getNiveauInfo(getXP());
    var bubble = document.getElementById('xp-bubble');
    if (bubble) bubble.textContent = info.emoji;
    if (panelOpen) renderPanel();
  }

  /* ── Détection automatique des actions ── */

  /* 1 — Chapitre lu */
  function watchChapitreXP() {
    var m = window.location.pathname.match(/chapitre(\d+)\.html/);
    if (!m) return;
    var chapKey = 'ch' + m[1];
    var attempts = 0;
    var iv = setInterval(function () {
      attempts++;
      var chaps = JSON.parse(localStorage.getItem('chapRead') || '[]');
      if (chaps.indexOf(chapKey) > -1) {
        clearInterval(iv);
        gainXP('chap_' + chapKey, XP_CHAPITRE, 'Chapitre ' + m[1] + ' lu');
      }
      if (attempts > 30) clearInterval(iv);
    }, 400);
  }

  /* 2 — Quiz principal */
  function watchQuiz() {
    if (!window.location.pathname.includes('quiz.html')) return;
    var obs = new MutationObserver(function () {
      var sc = document.getElementById('score-card');
      if (sc && sc.style.display && sc.style.display !== 'none') {
        obs.disconnect();
        var score = parseInt(localStorage.getItem('quizScore') || '0', 10);
        var bonus = Math.max(0, score - 2) * XP_QUIZ_BONUS;
        gainXP('quiz_principal', XP_QUIZ_BASE + bonus, 'Quiz complété (' + score + '/7)');
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
  }

  /* 3 — Défis QCM dans chapitres */
  function watchDefis() {
    document.addEventListener('click', function (e) {
      var btn = e.target;
      if (!btn.classList || (!btn.classList.contains('opt') && !btn.classList.contains('defi-option'))) return;
      setTimeout(function () {
        var card = btn.closest('.q-card') || btn.closest('.defi-card') || btn.closest('[id]');
        var id   = card ? (card.id || Math.random().toString(36).slice(2)) : Math.random().toString(36).slice(2);
        var key  = 'defi_' + window.location.pathname.replace(/[\\/]/g, '_') + '_' + id;
        gainXP(key, XP_DEFI, 'Défi répondu');
      }, 200);
    });
  }

  /* 4 — Pages bonus */
  function watchBonusPages() {
    var path = window.location.pathname;
    if (path.includes('bilan'))    gainXP('bilan_mi_parcours', XP_BILAN,    'Bilan mi-parcours consulté');
    if (path.includes('glossaire'))gainXP('glossaire_consulte', XP_GLOSSAIRE,'Glossaire consulté');
    if (path.includes('carte'))    gainXP('carte_debats',       XP_CARTE,    'Carte des débats explorée');
  }


  /* ── Barre de progression de lecture ── */
  function initReadingProgress() {
    var bar = document.createElement('div');
    bar.className = 'reading-progress-bar';
    document.body.insertBefore(bar, document.body.firstChild);
    function update() {
      var el = document.documentElement;
      var pct = (el.scrollTop || document.body.scrollTop) / (el.scrollHeight - el.clientHeight) * 100;
      bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ── Temps de lecture estimé ── */
  function injectReadingTime() {
    var path = window.location.pathname;
    if (!path.match(/chapitre\d+\.html/)) return;
    var body = document.querySelector('.page-body') || document.querySelector('main') || document.body;
    var text = body ? body.innerText || '' : '';
    var words = text.trim().split(/\s+/).length;
    var mins = Math.max(3, Math.round(words / 200));
    var meta = document.querySelector('.chapter-meta');
    if (meta && !meta.querySelector('.reading-time')) {
      var rt = document.createElement('span');
      rt.className = 'reading-time';
      rt.style.cssText = 'margin-left:1rem;';
      rt.textContent = mins + ' min de lecture';
      meta.appendChild(rt);
    }
  }

  /* ── Init ── */
  function init() {
    createWidget();
    refreshWidget();
    watchChapitreXP();
    watchQuiz();
    watchDefis();
    watchBonusPages();
    initReadingProgress();
    injectReadingTime();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── API publique ── */
  window.OikonomiaXP = {
    gainXP: gainXP,
    getXP: getXP,
    getNiveauInfo: getNiveauInfo,
    showLevelUpPopup: showLevelUpPopup,
    refresh: refreshWidget
  };

})();
