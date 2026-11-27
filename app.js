/* 소리블록 마스터 — 화면과 흐름 */
(function () {
  'use strict';
  var CFG = window.APP_CONFIG || {};
  var APP = '소리블록 마스터';
  var app = document.getElementById('app');
  var S = { coach: '', pin: '', boot: null, home: null, part: null, sess: null, screen: 'entry', tab: 'sen' };

  // ---------- 작은 도구 ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem('sbm_' + k); localStorage.setItem('sbm_' + k, v); } catch (e) { return null; } }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem('sbm_' + k); if (v === null) sessionStorage.removeItem('sbm_' + k); else sessionStorage.setItem('sbm_' + k, v); } catch (e) { return null; } }
  function toast(msg, ms) {
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 2600);
  }
  function b64ToBytes(b64) { if (typeof b64 !== 'string') throw new Error('음성 데이터를 받지 못했어요. 잠시 뒤 다시 해 주세요.'); var bin; try { bin = atob(b64); } catch (e) { var c = b64.replace(/[^A-Za-z0-9+\/]/g, ''); while (c.length % 4) c += '='; bin = atob(c); } var u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function each(sel, fn) { Array.prototype.forEach.call(app.querySelectorAll(sel), fn); }
  function partName(p) { return p.stage + '단계 PART ' + p.part; }
  function todayStr() { var d = new Date(Date.now() - 4 * 3600e3); return (d.getMonth() + 1) + '/' + d.getDate(); }

  var IC = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    slow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="7"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/></svg>'
  };
  // 블록 세 개가 쌓이는 로고
  function logo(sz, anim) {
    return '<img class="logo' + (anim ? ' anim' : '') + '" src="icon-192.png" width="' + sz + '" height="' + sz + '" alt="" aria-hidden="true">';
  }
  // 오늘 목표를 채우면 찍히는 도장
  function stamp() {
    return '<svg class="stamp" viewBox="0 0 64 64" aria-label="오늘 목표 달성"><circle cx="32" cy="32" r="29" fill="none" stroke="var(--bad)" stroke-width="3"/><circle cx="32" cy="32" r="24" fill="none" stroke="var(--bad)" stroke-width="1.5" stroke-dasharray="3 3"/>' +
      '<text x="32" y="29" text-anchor="middle" font-size="11" font-weight="800" fill="var(--bad)">오늘</text><text x="32" y="43" text-anchor="middle" font-size="11" font-weight="800" fill="var(--bad)">완료</text></svg>';
  }

  // ---------- 서버 ----------
  function call(action, data) {
    if (window.__MOCK_API) return window.__MOCK_API(action, data || {});
    if (!CFG.api) return Promise.reject(new Error('서버 주소가 설정되지 않았어요.'));
    return fetch(CFG.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, data: data || {} }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || '서버 오류'); return j.data; });
  }
  var saveQ = [], saving = false;
  function queueSave(rec) { saveQ.push(rec); pump(); }
  function pump() {
    if (saving || !saveQ.length) return;
    saving = true;
    call('attempt', saveQ[0]).then(function () { saveQ.shift(); saving = false; pump(); })
      .catch(function () { saving = false; setTimeout(pump, 4000); });
  }

  // ---------- 화면 이동 ----------
  function go(screen, push) {
    S.screen = screen;
    if (push !== false) { try { history.pushState({ s: screen }, ''); } catch (e) { } }
    stopAll();
    render();
    window.scrollTo(0, 0);
  }
  window.addEventListener('popstate', function (e) {
    var st = (e.state && e.state.s) || (S.coach ? 'home' : 'entry');
    if (st === 'practice' && !S.sess) st = S.part ? 'part' : 'home';
    if ((st === 'part' && !S.part) || (st === 'home' && !S.coach)) st = S.coach ? 'home' : 'entry';
    S.screen = st; stopAll(); render();
  });
  function render() {
    var f = { entry: vEntry, home: vHome, part: vPart, practice: vPractice, done: vDone, admin: vAdmin }[S.screen] || vEntry;
    f();
  }

  // ---------- 입장 ----------
  function recentNames() { var a = []; try { a = JSON.parse(ls('names') || '[]'); } catch (e) { } return a.filter(function (x) { return typeof x === 'string' && x; }); }
  function saveRecent(a) { ls('names', JSON.stringify(a.slice(0, 6))); }
  function bootThen(fn, er) {
    if (S.boot) return fn();
    call('boot').then(function (b) { S.boot = b; fn(); }).catch(function (e) { if (er) er.textContent = e.message; });
  }
  function vEntry() {
    var recent = recentNames();
    app.innerHTML = '<div class="entry">' + kakaoBar() + logo(68, true) +
      '<h2>' + APP + '</h2><p class="muted">한글 문장을 보고 영어로 바로 말해요. 소리블록으로 말하는 힘을 키워요.</p>' +
      (recent.length ? '<div class="small muted" style="margin-bottom:-6px">최근 들어간 이름 · 누르면 바로 들어가요</div><div class="recent">' + recent.map(function (n, i) { return '<span class="rn"><button class="rnb" data-rn="' + i + '">' + esc(n) + '</button><button class="rnx" data-rx="' + i + '" aria-label="' + esc(n) + ' 지우기">×</button></span>'; }).join('') + '</div>' : '') +
      '<input id="nm" placeholder="' + (recent.length ? '다른 이름으로 들어가기' : '코치 이름') + '" autocomplete="off">' +
      '<button class="btn" id="enter">들어가기</button><div class="err" id="er"></div>' +
      '<p class="small muted center">관리자는 이름 칸에 <b>admin</b>을 입력해요.</p></div>';
    var nm = document.getElementById('nm'), er = document.getElementById('er');
    bootThen(function () { }, er);
    function enter(given) {
      var v = (typeof given === 'string' ? given : nm.value).trim(); if (!v) { er.textContent = '이름을 입력해 주세요.'; return; }
      er.textContent = '';
      if (v.toLowerCase() === 'admin') { bootThen(function () { adminGate(); }, er); return; }
      call('enter', { name: v }).then(function (r) {
        S.coach = r.name; S.home = r; ls('name', r.name);
        saveRecent([r.name].concat(recentNames().filter(function (x) { return x !== r.name; })));
        go('home');
      }).catch(function (e) {
        er.textContent = e.message;
        if (/등록된 코치 이름이 아니에요/.test(e.message) && recentNames().indexOf(v) >= 0) saveRecent(recentNames().filter(function (x) { return x !== v; }));
      });
    }
    document.getElementById('enter').onclick = function () { enter(); };
    nm.onkeydown = function (e) { if (e.key === 'Enter') enter(); };
    each('[data-rn]', function (b) { b.onclick = function () { enter(recent[+b.getAttribute('data-rn')]); }; });
    each('[data-rx]', function (b) { b.onclick = function () { var n = recent[+b.getAttribute('data-rx')]; saveRecent(recent.filter(function (x) { return x !== n; })); render(); }; });
  }

  // ---------- 홈 ----------
  function refreshHome() { call('home', { coach: S.coach }).then(function (r) { S.home = r; if (S.screen === 'home') render(); }).catch(function () { }); }
  function vHome() {
    var H = S.home || { parts: [], today: 0, goal: 20 }, done = H.today >= H.goal;
    var h = '<div class="top">' + logo(36) + '<h1>' + esc(S.coach) + ' 코치님</h1><button class="ib" id="out" aria-label="나가기">' + IC.out + '</button></div>';
    h += '<div class="card today"><div style="flex:1"><div class="small muted">오늘 연습한 문장</div><div class="num">' + H.today + ' <small>/ ' + H.goal + '</small></div>' +
      '<div class="bar"><i style="width:' + Math.min(100, Math.round(H.today / Math.max(1, H.goal) * 100)) + '%;background:var(--amber)"></i></div></div>' + (done ? stamp() : '') + '</div>';
    if (done) h += '<button class="btn sec" id="cert" style="margin:-4px 0 14px">인증 문구 복사</button>';
    if (!H.parts.length) h += '<div class="card empty">아직 올라온 문장이 없어요.</div>';
    // 단계 탭: 고른 단계의 PART만 보여 주고, 고른 단계는 기기에 기억해 둬요
    var stages = [];
    H.parts.forEach(function (p) { var s = String(p.stage); if (stages.indexOf(s) < 0) stages.push(s); });
    stages.sort(function (a, b) { return (parseFloat(a) || 0) - (parseFloat(b) || 0); });
    var st = S.stage || ls('stage');
    if (stages.indexOf(st) < 0) st = stages[0];
    S.stage = st;
    if (stages.length > 1) {
      h += '<div class="tabs stagetabs" role="tablist">' + stages.map(function (s) {
        var ok = 0, cnt = 0;
        H.parts.forEach(function (p) { if (String(p.stage) === s) { ok += p.ok; cnt += p.count; } });
        return '<button role="tab" data-st="' + esc(s) + '" class="' + (s === st ? 'on' : '') + '" aria-selected="' + (s === st) + '">' + esc(s) + '단계 <small style="opacity:.8;font-weight:600">' + Math.round(ok / Math.max(1, cnt) * 100) + '%</small></button>';
      }).join('') + '</div>';
    }
    H.parts.filter(function (p) { return String(p.stage) === st; }).forEach(function (p) {
      h += '<button class="card part" data-p="' + esc(p.key) + '"><h3>' + esc(partName(p)) + '</h3>' +
        '<div class="small muted">' + p.count + '문장 · 맞힌 문장 ' + p.ok + (p.wrong ? ' · 다시 볼 문장 ' + p.wrong : '') + '</div>' +
        '<div class="tags">' + p.exprs.slice(0, 6).map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('') + '</div>' +
        '<div class="bar"><i style="width:' + Math.round(p.ok / Math.max(1, p.count) * 100) + '%"></i></div></button>';
    });
    app.innerHTML = h;
    document.getElementById('out').onclick = function () { S.coach = ''; S.home = null; S.part = null; S.sess = null; go('entry'); };
    if (done) document.getElementById('cert').onclick = copyCert;
    each('[data-p]', function (b) { b.onclick = function () { openPart(b.getAttribute('data-p')); }; });
    each('[data-st]', function (b) { b.onclick = function () { S.stage = b.getAttribute('data-st'); ls('stage', S.stage); render(); }; });
  }
  function certText() { var H = S.home || {}; return '[소리블록 마스터] ' + S.coach + ' · ' + todayStr() + ' 오늘 ' + H.today + '문장 연습 완료 ✅ (목표 ' + H.goal + '문장)'; }
  function copyCert() {
    var t = certText();
    function fallback() { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('복사했어요. 단톡방에 붙여 넣어 주세요.'); } catch (e) { toast(t, 6000); } ta.remove(); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast('복사했어요. 단톡방에 붙여 넣어 주세요.'); }, fallback); else fallback();
  }
  function openPart(key) {
    call('part', { coach: S.coach, key: key }).then(function (d) {
      var p = ((S.home && S.home.parts) || []).filter(function (x) { return x.key === key; })[0] || { stage: key.split('-')[0], part: key.split('-')[1] };
      d.name = partName(p); S.part = d; go('part');
    }).catch(function (e) { toast(e.message, 4000); });
  }

  // ---------- PART 화면 ----------
  function isWrong(s) { return s.last === 'X' || s.last === '△'; }
  function pick(list, n) {
    var wrong = list.filter(isWrong).sort(function (a, b) { return a.at < b.at ? -1 : 1; });
    var fresh = list.filter(function (s) { return !s.n; });
    var seen = list.filter(function (s) { return s.n && !isWrong(s); }).sort(function (a, b) { return a.at < b.at ? -1 : 1; });
    var w = wrong.slice(0, Math.ceil(n / 2)), rest = fresh.concat(wrong.slice(w.length), seen);
    return w.concat(rest).slice(0, n);
  }
  function vPart() {
    var P = S.part, list = P.sentences, wrong = list.filter(isWrong), goal = P.goal || 20;
    var ex = [], by = {};
    list.forEach(function (s) { var k = s.expr || '기타'; if (!by[k]) { by[k] = []; ex.push(k); } by[k].push(s); });
    var h = '<div class="top"><button class="ib" id="bk" aria-label="뒤로">' + IC.back + '</button><h1>' + esc(P.name) + '</h1></div>';
    h += '<div class="card"><button class="btn" id="go">오늘의 연습 시작 · ' + Math.min(goal, list.length) + '문장</button>' +
      '<div class="small muted" style="margin:8px 2px 12px">다시 볼 문장 먼저, 그다음 처음 보는 문장 순서로 골라요.</div>' +
      '<button class="btn sec" id="rv"' + (wrong.length ? '' : ' disabled') + '>다시 볼 문장 복습 · ' + wrong.length + '문장</button></div>';
    h += '<div class="card" style="padding:6px 16px"><div class="small muted" style="padding:10px 4px 0">핵심표현별로 연습하기</div>' + ex.map(function (k, i) {
      var a = by[k], ok = a.filter(function (s) { return s.ok; }).length, bad = a.filter(isWrong).length;
      return '<button class="expr" data-x="' + i + '"><b>' + esc(k) + '</b><span class="small muted">' + a.length + '문장</span>' +
        (bad ? '<span class="pill bad">다시 ' + bad + '</span>' : '') + '<span class="pill' + (ok ? ' ok' : '') + '">' + ok + '/' + a.length + '</span></button>';
    }).join('') + '</div>';
    app.innerHTML = h;
    document.getElementById('bk').onclick = function () { history.back(); };
    document.getElementById('go').onclick = function () { start(pick(list, goal), '오늘의 연습'); };
    document.getElementById('rv').onclick = function () { start(wrong.slice(0, 50), '다시 볼 문장'); };
    each('[data-x]', function (b) { b.onclick = function () { var k = ex[+b.getAttribute('data-x')]; start(pick(by[k], goal), k); }; });
  }
  function start(items, title) {
    if (!items.length) return toast('연습할 문장이 없어요.');
    S.sess = { items: items, i: 0, res: [], title: title, st: null };
    newItem(); go('practice');
  }
  function newItem() { S.sess.st = { mode: 'ask', hint: 0, tries: 0, j: null }; }

  // ---------- 음성 듣기 ----------
  var audioCache = {}, urlOf = {}, AUD = null, playing = null;
  function audioEl() { if (!AUD) { AUD = document.createElement('audio'); AUD.setAttribute('playsinline', ''); AUD.preload = 'auto'; document.body.appendChild(AUD); } return AUD; }
  function getAudio(file) {
    if (!file) return Promise.resolve(null);
    if (audioCache[file]) return audioCache[file];
    var p = call('audio', { file: file }).then(function (d) { return (urlOf[file] = URL.createObjectURL(new Blob([b64ToBytes(d.b64)], { type: d.mime || 'audio/mpeg' }))); });
    p.catch(function () { delete audioCache[file]; });
    audioCache[file] = p; return p;
  }
  function stopPlay() {
    if (AUD) try { AUD.pause(); } catch (e) { }
    if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) { }
    if (playing) { playing.classList.remove('playing'); playing = null; }
  }
  function stopAll() { stopPlay(); stopListen(true); }
  function playSentence(s, rate, btn) {
    stopListen(true);
    if (btn && btn.classList.contains('playing')) { stopPlay(); return; }
    stopPlay();
    var a = audioEl();
    if (btn) { btn.classList.add('playing'); playing = btn; }
    function go2(url) {
      if (playing !== btn) return;
      if (!url) return speak(s.en, rate, btn);
      if (a.getAttribute('data-src') !== url) { a.src = url; a.setAttribute('data-src', url); }
      a.preservesPitch = true; a.webkitPreservesPitch = true; a.playbackRate = rate || 1; a.defaultPlaybackRate = rate || 1;
      try { a.currentTime = 0; } catch (e) { }
      a.onended = function () { if (btn) btn.classList.remove('playing'); if (playing === btn) playing = null; };
      var p = a.play(); if (p && p.catch) p.catch(function () { if (btn) btn.classList.remove('playing'); playing = null; toast('소리를 재생하지 못했어요. 한 번 더 눌러 주세요.'); });
    }
    // 아이폰은 누른 그 순간에 재생해야 해서, 미리 받아 둔 음성은 바로 틀어요
    if (!s.file) return go2(null);
    if (urlOf[s.file]) return go2(urlOf[s.file]);
    getAudio(s.file).then(go2).catch(function () { speak(s.en, rate, btn); });
  }
  function speak(text, rate, btn) {
    if (!window.speechSynthesis) { if (btn) btn.classList.remove('playing'); return toast('이 기기에서는 음성을 재생할 수 없어요.'); }
    var u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = (rate || 1) * 0.95;
    u.onend = function () { if (btn) btn.classList.remove('playing'); };
    speechSynthesis.speak(u);
  }

  // ---------- 녹음 (앱이 직접 녹음 → 서버에서 구글 음성 인식) ----------
  var KAKAO = /KAKAOTALK/i.test(navigator.userAgent);
  var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var HAS_MIC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && !!(window.AudioContext || window.webkitAudioContext);
  function kakaoBar() {
    if (!KAKAO) return '';
    return '<div class="kbar">카카오톡 안에서는 녹음이 안 될 수 있어요.<a href="kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href) + '">다른 브라우저로 열기</a></div>';
  }
  function sttOn() { return HAS_MIC && S.part && S.part.stt && S.part.stt.on; }
  function sttOffNote() {
    var r = S.part && S.part.stt && S.part.stt.reason;
    var why = r === 'limit' ? '이번 달 음성 인식 무료 사용 시간을 다 써서 다음 달 1일에 다시 켜져요.' : r === 'admin' ? '지금은 관리자가 음성 인식을 꺼 두었어요.' : r === 'nokey' ? '음성 인식 설정이 아직 안 됐어요.' : !HAS_MIC ? '이 브라우저에서는 녹음이 안 돼요.' + (IOS ? ' (아이폰은 사파리에서 열어 주세요)' : '') : '';
    return '<div class="note">' + why + ' 소리 내어 영어로 말한 뒤 <b>정답 보기</b>로 확인하고 스스로 채점해 주세요.</div>';
  }
  var WORKLET = 'class R extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(2048);this.n=0}process(i){var c=i[0]&&i[0][0];if(c){for(var k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===2048){this.port.postMessage(this.b.slice(0));this.n=0}}}return true}}registerProcessor("rec-proc",R);';
  var actx = null, workletReady = null, rec = null, lastDiag = '';
  var IOSV = (navigator.userAgent.match(/OS (\d+)_(\d+)/) || []).slice(1, 3).join('.');
  function ensureCtx() {
    if (!actx) { var AC = window.AudioContext || window.webkitAudioContext; actx = new AC(); workletReady = null; }
    if (actx.state !== 'running') actx.resume().catch(function () { });
    return actx;
  }
  // 녹음기(MediaRecorder) 형식: 아이폰은 mp4, 나머지는 webm
  function mrType() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    var list = IOS ? ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'] : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    for (var i = 0; i < list.length; i++) { try { if (MediaRecorder.isTypeSupported(list[i])) return list[i]; } catch (e) { } }
    return '';
  }
  // 소리 크기 재기(자동 멈춤용) + 예비 녹음. 아이폰에서 이쪽이 무음이 돼도 녹음기는 따로 녹음해요
  function attachMeter(c, stream, onChunk) {
    var src = c.createMediaStreamSource(stream), node = null;
    function viaWorklet() {
      if (!workletReady) workletReady = c.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' })));
      return workletReady.then(function () { node = new AudioWorkletNode(c, 'rec-proc'); node.port.onmessage = function (e) { onChunk(e.data); }; src.connect(node); node.connect(c.destination); });
    }
    function viaScript() {
      node = c.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = function (e) { onChunk(new Float32Array(e.inputBuffer.getChannelData(0))); };
      src.connect(node); node.connect(c.destination);
      return Promise.resolve();
    }
    var p = (c.audioWorklet && window.AudioWorkletNode) ? viaWorklet().catch(viaScript) : viaScript();
    return p.then(function () {
      return function () {
        try { src.disconnect(); } catch (e) { }
        try { node.disconnect(); } catch (e) { }
        if (node) { if (node.port) node.port.onmessage = null; else node.onaudioprocess = null; }
      };
    });
  }
  // 한 문장 녹음. 말이 끝나면(1.1초 조용) 저절로 멈추고, 버튼을 다시 눌러도 멈춰요.
  // 소리 크기를 못 재면(아이폰 무음 문제) 버튼으로 멈추는 방식으로 바뀌고, 최대 10초 뒤 저절로 멈춰요
  function recordOnce(onLevel, onManual) {
    return new Promise(function (resolve, reject) {
      var R = { chunks: [], sr: 48000, done: false, blob: null, type: mrType(), rec: '', meter: 'wait', t0: Date.now(), dur: 0, why: '' };
      var stream = null, mr = null, parts = [], detach = null, timer = null, c = null, fin = false;
      var speechAt = -1, lastLoud = -1, noise = null, manual = false;
      rec = R;
      function cleanup() {
        clearInterval(timer);
        if (detach) { try { detach(); } catch (e) { } detach = null; }
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        if (IOS && c) { try { var cp = c.close(); if (cp && cp.catch) cp.catch(function () { }); } catch (e) { } if (actx === c) { actx = null; workletReady = null; } c = null; }
      }
      function done(err) {
        if (fin) return; fin = true;
        cleanup(); if (rec === R) rec = null;
        R.dur = (Date.now() - R.t0) / 1000;
        if (err) reject(err); else resolve(R);
      }
      function finish(why) {
        if (R.done) return; R.done = true; R.why = why;
        if (why === 'abort') { if (mr && mr.state !== 'inactive') { mr.onstop = null; try { mr.stop(); } catch (e) { } } return done('aborted'); }
        if (mr && mr.state !== 'inactive') {
          var guard = setTimeout(function () { R.blob = parts.length ? new Blob(parts, { type: R.type }) : null; done(); }, 3000);
          mr.onstop = function () { clearTimeout(guard); R.blob = parts.length ? new Blob(parts, { type: R.type }) : null; done(); };
          try { mr.stop(); } catch (e) { clearTimeout(guard); done(); }
        } else done();
      }
      R.stop = function () { finish('user'); };
      R.abort = function () { finish('abort'); };
      function onChunk(x) {
        if (R.done) return;
        R.chunks.push(x);
        var e = 0; for (var i = 0; i < x.length; i++) e += x[i] * x[i];
        var db = 10 * Math.log10(e / x.length + 1e-12), k = R.chunks.length - 1, t = (Date.now() - R.t0) / 1000;
        if (db > -95) R.meter = 'ok';
        if (k < 6) { noise = noise === null ? db : Math.min(noise, db); }
        var thr = Math.max((noise === null ? -60 : noise) + 12, -50);
        if (db > thr) { if (speechAt < 0 && k >= 2) speechAt = k; lastLoud = t; }
        if (onLevel) onLevel(Math.max(0, Math.min(1, (db + 60) / 45)));
      }
      function tick() {
        if (R.done) return;
        var t = (Date.now() - R.t0) / 1000;
        if (!manual && R.meter !== 'ok' && t > 1.5) { R.meter = 'dead'; manual = true; if (onManual) onManual(); }
        if (manual) { if (t > 10) finish('max'); return; }
        if (speechAt >= 0 && t - lastLoud > 1.1) finish('silence');
        else if (speechAt < 0 && t > 7) finish('quiet');
        else if (t > 15) finish('max');
      }
      try { c = ensureCtx(); } catch (e) { c = null; }
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }).then(function (s) {
        stream = s;
        if (fin) { cleanup(); return; }
        if (R.type) {
          try { mr = new MediaRecorder(s, { mimeType: R.type }); } catch (e) { try { mr = new MediaRecorder(s); } catch (e2) { mr = null; } }
          if (mr) {
            if (mr.mimeType) R.type = mr.mimeType;
            mr.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); };
            try { mr.start(); } catch (e) { mr = null; }
          }
        }
        R.rec = mr ? 'mr' : 'pcm';
        if (c) {
          R.sr = c.sampleRate;
          if (c.state !== 'running') c.resume().catch(function () { });
          try {
            attachMeter(c, s, onChunk).then(function (d) { if (fin) d(); else detach = d; }, function () { R.meterErr = 1; });
          } catch (e) { R.meterErr = 1; }
        }
        if (!mr && !c) return done('start');
        R.t0 = Date.now(); timer = setInterval(tick, 100);
      }, function (e) {
        if (fin) return;
        R.done = true;
        done(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'not-allowed' : (e && e.name === 'NotFoundError' ? 'audio-capture' : 'start'));
      });
    });
  }
  function stopListen(abort) { if (rec) { if (abort) rec.abort(); else rec.stop(); } }
  // 녹음 파일 → 소리 데이터(16kHz로 바로 풀고, 안 되면 원래 속도로 풀기)
  function decodeBlob(blob) {
    var read = blob.arrayBuffer ? blob.arrayBuffer() : new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsArrayBuffer(blob); });
    function dec(ctx, buf) {
      return new Promise(function (res, rej) {
        var p; try { p = ctx.decodeAudioData(buf, res, rej); } catch (e) { rej(e); return; }
        if (p && p.then) p.then(res, rej);
      });
    }
    function mono(ab) {
      var n = ab.length, out = new Float32Array(n), ch = ab.numberOfChannels, k, i;
      for (k = 0; k < ch; k++) { var d = ab.getChannelData(k); for (i = 0; i < n; i++) out[i] += d[i] / ch; }
      return { data: out, sr: ab.sampleRate };
    }
    return read.then(function (buf) {
      var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext, off = null;
      try { off = new OAC(1, 16000, 16000); } catch (e) { off = null; }
      var first = off ? dec(off, buf.slice(0)) : Promise.reject(new Error('no offline'));
      return first.then(mono, function () {
        var AC = window.AudioContext || window.webkitAudioContext, ctx = new AC();
        return dec(ctx, buf.slice(0)).then(function (ab) { var m = mono(ab); try { ctx.close(); } catch (e) { } return m; }, function (e) { try { ctx.close(); } catch (x) { } throw e; });
      });
    });
  }
  // 소리 데이터 → 말한 부분만 잘라서 16kHz LINEAR16 base64 (사용 시간 절약)
  function encode16(all, sr) {
    var n = all.length, fl = Math.max(1, Math.round(sr * 0.02)), nf = Math.floor(n / fl), db = [], i, j, peak = -120;
    if (!nf) return { ok: false, peak: -120 };
    for (i = 0; i < nf; i++) { var e = 0; for (j = i * fl; j < (i + 1) * fl; j++) e += all[j] * all[j]; var d = 10 * Math.log10(e / fl + 1e-12); db.push(d); if (d > peak) peak = d; }
    var sorted = db.slice().sort(function (x, y) { return x - y; }), noise = sorted[Math.floor(nf * 0.1)], thr = Math.max(noise + 12, -55), first = -1, last = -1;
    for (i = 0; i < nf; i++) if (db[i] > thr) { if (first < 0) first = i; last = i; }
    var res = { peak: Math.round(peak), ok: first >= 0 && peak > -60 };
    if (!res.ok) return res;
    var a = Math.max(0, (first - 15) * fl), b = Math.min(n, (last + 25) * fl);
    if ((b - a) / sr > 14) b = a + Math.floor(14 * sr);
    var ratio = sr / 16000, m = Math.floor((b - a) / ratio), out = new Int16Array(m), half = Math.max(0, Math.floor(ratio / 2));
    for (i = 0; i < m; i++) {
      var c0 = a + Math.floor(i * ratio), sum = 0, cnt = 0;
      for (j = c0 - half; j <= c0 + half; j++) if (j >= a && j < b) { sum += all[j]; cnt++; }
      var v = Math.max(-1, Math.min(1, sum / Math.max(1, cnt)));
      out[i] = v < 0 ? v * 0x8000 : v * 0x7FFF;
    }
    var u8 = new Uint8Array(out.buffer), bin = '';
    for (i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    res.b64 = btoa(bin); res.sec = m / 16000;
    return res;
  }
  // 녹음기 파일을 먼저 쓰고, 안 되면 예비 녹음을 써요. 둘 다 비면 점검 정보와 함께 알려 줘요
  function processRec(R) {
    var D = { rec: R.rec + (R.type ? '/' + R.type.split(';')[0].replace('audio/', '') : ''), meter: R.meter, dur: R.dur.toFixed(1), live: '', file: '' };
    function diag() { lastDiag = '점검: ' + [D.rec, D.dur + '초', '측정 ' + D.meter, '실시간 ' + D.live, '파일 ' + D.file, IOS ? 'iOS ' + IOSV : 'PC'].join(' · '); }
    var live = null;
    if (R.chunks.length) {
      var n = 0; R.chunks.forEach(function (x) { n += x.length; });
      var all = new Float32Array(n), o = 0; R.chunks.forEach(function (x) { all.set(x, o); o += x.length; });
      live = encode16(all, R.sr); D.live = live.peak + 'dB';
    } else D.live = '없음';
    function fallback(code) {
      diag();
      if (live && live.ok) return live;
      throw (live && live.peak > -70) || code === 'no-speech' ? 'no-speech' : 'silent';
    }
    if (!R.blob) { D.file = R.rec === 'mr' ? '빔' : '-'; return Promise.resolve().then(function () { return fallback(); }); }
    return decodeBlob(R.blob).then(function (d) {
      var e = encode16(d.data, d.sr); D.file = e.peak + 'dB';
      if (e.ok) { diag(); return e; }
      return fallback(e.peak > -70 ? 'no-speech' : '');
    }, function () { D.file = '풀기 실패'; return fallback(); });
  }
  // 고유명사(도시·사람 이름)만 인식 힌트로 줘요. 정답 문장 전체를 주면 틀리게 말해도 맞게 들려서요
  function hintsOf(s) {
    var out = [];
    answersOf(s).forEach(function (a) { a.split(/\s+/).forEach(function (w, i) { var x = w.replace(/[^A-Za-z'-]/g, ''); if (i > 0 && /^[A-Z][a-z]/.test(x) && out.indexOf(x) < 0) out.push(x); }); });
    return out.slice(0, 10);
  }
  function srMessage(code) {
    if (code === 'not-allowed') return '마이크 사용이 허용되지 않았어요. 주소창의 ‘가가’ 버튼(아이폰) 또는 자물쇠 버튼에서 마이크를 허용해 주세요.';
    if (code === 'no-speech') return '말소리가 들리지 않았어요. 버튼을 누르고 바로 또박또박 말해 주세요.';
    if (code === 'silent') return '녹음된 소리가 없어요. 통화·음성메모·보이스톡 같은 다른 앱이 마이크를 쓰고 있지 않은지 확인하고, 블루투스 이어폰을 쓰고 있다면 빼고 다시 해 보세요. 그래도 안 되면 앱을 완전히 껐다가 다시 열어 주세요.';
    if (code === 'audio-capture') return '마이크를 찾지 못했어요.';
    if (code === 'aborted') return '';
    if (code === 'start') return '녹음을 시작하지 못했어요. 다시 눌러 주세요.';
    return String(code || '음성 인식이 잘 안 됐어요.') + ' ‘정답 보기’로 스스로 채점할 수 있어요.';
  }

  // ---------- 채점 ----------
  var NUMW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  var CONTR = { "can't": 'can not', cannot: 'can not', "won't": 'will not', "shan't": 'shall not', "let's": 'let us', gonna: 'going to', wanna: 'want to', gotta: 'got to', "ain't": 'is not', "y'all": 'you all' };
  var ALIAS = { okay: 'ok', mum: 'mom', mommy: 'mom', till: 'until', gray: 'grey', color: 'colour', favorite: 'favourite', theater: 'theatre', center: 'centre', mr: 'mister', mrs: 'missus' };
  var SUF = { re: 'are', ve: 'have', ll: 'will', d: 'would', m: 'am', s: 'is' };
  function normWord(w) {
    w = w.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9']/g, '').replace(/^'+|'+$/g, '');
    if (!w) return [];
    if (/^\d+$/.test(w)) return [NUMW[+w] || w];
    if (CONTR[w]) return CONTR[w].split(' ');
    var m;
    if ((m = /^(.+)n't$/.exec(w))) return [m[1] === 'wo' ? 'will' : m[1] === 'ca' ? 'can' : m[1], 'not'];
    if ((m = /^(.+)'(re|ve|ll|d|m|s)$/.exec(w))) return [ALIAS[m[1]] || m[1], SUF[m[2]]];
    return [ALIAS[w] || w];
  }
  // 문장 → 원래 단어 목록 + 정리한 단어 목록(단어마다 어느 원래 단어에서 왔는지)
  function tok(s) {
    var words = String(s || '').replace(/[–—-]/g, ' ').split(/\s+/).filter(Boolean), t = [], from = [];
    words.forEach(function (w, i) { normWord(w).forEach(function (x) { t.push(x); from.push(i); }); });
    return { words: words, t: t, from: from };
  }
  function lcs(a, b) {
    var n = a.length, m = b.length, D = [], i, j;
    for (i = 0; i <= n; i++) { D.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) D[i][j] = a[i] === b[j] ? D[i + 1][j + 1] + 1 : Math.max(D[i + 1][j], D[i][j + 1]);
    var ha = {}, hb = {}; i = 0; j = 0;
    while (i < n && j < m) { if (a[i] === b[j]) { ha[i] = hb[j] = 1; i++; j++; } else if (D[i + 1][j] >= D[i][j + 1]) i++; else j++; }
    return { n: D[0][0], a: ha, b: hb };
  }
  function answersOf(s) { return [s.en].concat(String(s.alt || '').split(/\s*[\/|;]\s*|\n/).map(function (x) { return x.trim(); }).filter(Boolean)); }
  function judge(s, cands) {
    var best = null;
    answersOf(s).forEach(function (ans) {
      var A = tok(ans);
      cands.forEach(function (c) {
        var B = tok(c); if (!B.t.length) return;
        var L = lcs(A.t, B.t), sim = 2 * L.n / (A.t.length + B.t.length);
        if (!best || sim > best.sim + 1e-9) best = { sim: sim, A: A, B: B, L: L, ans: ans, said: c };
      });
    });
    if (!best) return null;
    best.v = best.sim >= 0.999 ? 'O' : (best.sim >= 0.75 ? 'T' : 'X');
    best.score = Math.round(best.sim * 100);
    return best;
  }
  function markWords(T, hit, cls) {
    var ok = T.words.map(function () { return true; }), any = T.words.map(function () { return false; });
    T.t.forEach(function (x, k) { any[T.from[k]] = true; if (!hit[k]) ok[T.from[k]] = false; });
    return T.words.map(function (w, i) { return any[i] && !ok[i] ? '<span class="' + cls + '">' + esc(w) + '</span>' : (cls === 'miss' ? '<span class="hit">' + esc(w) + '</span>' : esc(w)); }).join(' ');
  }

  // ---------- 연습 화면 ----------
  function curS() { return S.sess.items[S.sess.i]; }
  function hintHtml(s, lv) {
    if (!lv) return '';
    var w = s.en.split(/\s+/);
    return w.map(function (x, i) { return i < lv - 1 ? esc(x) : '<span class="bl" style="min-width:' + Math.max(18, x.replace(/[^A-Za-z']/g, '').length * 9) + 'px"></span>'; }).join(' ');
  }
  function vPractice() {
    var Q = S.sess, s = curS(), st = Q.st, n = Q.items.length;
    var h = '<div class="top"><button class="ib" id="bk" aria-label="그만하기">' + IC.close + '</button><div class="pbar"><i style="width:' + Math.round(Q.i / n * 100) + '%"></i></div><span class="small muted" style="flex:none;font-weight:700">' + (Q.i + 1) + ' / ' + n + '</span></div>';
    h += kakaoBar();
    h += '<div class="card"><div class="tags" style="margin-top:0"><span class="tag">' + esc(s.expr || Q.title) + '</span>' + (isWrong(s) ? '<span class="pill bad" style="height:22px">다시 볼 문장</span>' : '') + '</div>' +
      '<div class="ko">' + esc(s.ko) + '</div><div class="hintline" id="hl">' + hintHtml(s, st.hint) + '</div>';
    if (st.mode === 'ask' || st.mode === 'listen' || st.mode === 'busy') {
      if (sttOn()) {
        h += '<div class="micwrap"><button class="mic' + (st.mode === 'listen' ? ' rec' : '') + '" id="mic" aria-label="말하기"' + (st.mode === 'busy' ? ' disabled' : '') + '><span class="lvl" id="lvl"></span>' + (st.mode === 'listen' ? IC.stop : (st.mode === 'busy' ? '<span class="spin"></span>' : IC.mic)) + '</button>' +
          '<div class="live" id="live">' + (st.mode === 'listen' ? '듣고 있어요… 다 말하면 저절로 멈춰요' : st.mode === 'busy' ? '내가 말한 문장을 글자로 바꾸는 중…' : (st.msg ? esc(st.msg) : '버튼을 누르고 영어로 말해 보세요')) + '</div></div>';
      } else {
        h += sttOffNote();
      }
      h += '<div class="subbtns"><button id="hint">' + IC.bulb + '힌트</button><button id="peek">' + IC.eye + '정답 보기</button></div></div>';
    } else if (st.mode === 'result') {
      var j = st.j, V = { O: ['○', '정답이에요!'], T: ['△', '거의 맞았어요'], X: ['✕', '다시 해 봐요'] }[j.v];
      h += '</div><div class="card"><div class="verdict ' + j.v + '"><span class="ic">' + V[0] + '</span>' + V[1] + '</div>' +
        '<div class="en">' + markWords(j.A, j.L.a, 'miss') + '</div>' +
        '<div class="said">내가 말한 문장: ' + markWords(j.B, j.L.b, 'ex') + '</div>' + altLine(s, j.ans) +
        '<div class="subbtns"><button id="pl">' + IC.play + '원어민 듣기</button><button id="sl">' + IC.slow + '천천히</button></div>' +
        (st.practiceOnly ? '<button class="btn sec" id="again" style="margin-top:14px">' + IC.mic + '다시 말하기</button><div class="small muted" style="margin:14px 2px 8px">정답을 먼저 봤어요. 처음 말했을 때 맞혔나요?</div><div class="nav"><button class="btn bad" id="selfX">틀렸어요</button><button class="btn" id="selfO">맞혔어요</button></div>'
          : '<div class="nav"><button class="btn sec" id="again">' + IC.mic + '다시 말하기</button><button class="btn" id="nx">' + (Q.i + 1 < n ? '다음' : '결과 보기') + '</button></div>') + '</div>';
    } else { // peek: 정답 보고 스스로 채점
      h += '</div><div class="card"><div class="small muted" style="margin-bottom:4px">정답</div><div class="en">' + esc(s.en) + '</div>' + altLine(s, s.en) +
        '<div class="subbtns"><button id="pl">' + IC.play + '원어민 듣기</button><button id="sl">' + IC.slow + '천천히</button></div>' +
        '<div class="small muted" style="margin:14px 2px 8px">말한 문장이 정답과 같았나요?</div>' +
        '<div class="nav"><button class="btn bad" id="selfX">틀렸어요</button><button class="btn" id="selfO">맞혔어요</button></div>' +
        (sttOn() ? '<button class="btn sec" id="again" style="margin-top:8px">' + IC.mic + '정답 보고 따라 말해 보기</button>' : '') + '</div>';
    }
    app.innerHTML = h;
    document.getElementById('bk').onclick = function () { if (Q.res.length) finish(); else history.back(); };
    var mic = document.getElementById('mic');
    if (mic) mic.onclick = function () { if (st.mode === 'listen') stopListen(false); else if (st.mode !== 'busy') doListen(); };
    var hb = document.getElementById('hint');
    if (hb) hb.onclick = function () { st.hint = Math.min(st.hint + 1, s.en.split(/\s+/).length); document.getElementById('hl').innerHTML = hintHtml(s, st.hint); };
    var pk = document.getElementById('peek');
    if (pk) pk.onclick = function () { stopListen(true); st.mode = 'peek'; render(); };
    var pl = document.getElementById('pl'), sl = document.getElementById('sl');
    if (pl) pl.onclick = function () { playSentence(s, 1, pl); };
    if (sl) sl.onclick = function () { playSentence(s, 0.75, sl); };
    var ag = document.getElementById('again');
    if (ag) ag.onclick = function () { if (st.mode === 'peek') st.practiceOnly = true; st.mode = 'ask'; st.msg = ''; doListen(); };
    var nx = document.getElementById('nx');
    if (nx) nx.onclick = next;
    var so = document.getElementById('selfO'), sx = document.getElementById('selfX');
    if (so) so.onclick = function () { record(s, 'O', '', null, 'self'); next(); };
    if (sx) sx.onclick = function () { record(s, 'X', '', null, 'self'); next(); };
    getAudio(s.file).catch(function () { }); // 미리 받아 두기
    var nxt = Q.items[Q.i + 1]; if (nxt) setTimeout(function () { getAudio(nxt.file).catch(function () { }); }, 800);
  }
  function altLine(s, used) {
    var others = answersOf(s).filter(function (a) { return a !== used; });
    return others.length ? '<div class="alt">다른 정답: ' + others.map(esc).join(' / ') + '</div>' : '';
  }
  function doListen() {
    var Q = S.sess, st = Q.st, s = curS();
    stopPlay();
    st.mode = 'listen'; st.msg = ''; render();
    var lvl = document.getElementById('lvl');
    lastDiag = '';
    recordOnce(function (v) { if (lvl) lvl.style.transform = 'scale(' + (1 + v * 0.45).toFixed(3) + ')'; }, function () {
      var lv = document.getElementById('live'); if (lv && st.mode === 'listen') lv.textContent = '다 말한 뒤 버튼을 한 번 더 눌러 주세요 (10초 뒤 저절로 멈춰요)';
    }).then(function (R) {
      if (S.screen !== 'practice' || curS() !== s) return;
      st.mode = 'busy'; render();
      return processRec(R);
    }).then(function (pcm) {
      if (!pcm || S.screen !== 'practice' || curS() !== s) return;
      return call('recognize', { coach: S.coach, id: s.id, audio: pcm.b64, hint: hintsOf(s) }).then(function (r) {
        if (S.screen !== 'practice' || curS() !== s) return;
        if (r.stt) S.part.stt = r.stt;
        if (r.off) { st.mode = 'ask'; st.msg = ''; render(); toast(r.off === 'limit' ? '이번 달 음성 인식 무료 사용 시간을 다 써서 스스로 채점으로 바뀌었어요.' : '음성 인식이 꺼져 있어서 스스로 채점으로 바뀌었어요.', 4000); return; }
        var cands = [r.text].concat(r.alts || []).filter(function (x) { return x && x.trim(); });
        var j = cands.length ? judge(s, cands) : null;
        if (!j) { st.mode = 'ask'; st.msg = srMessage('no-speech') + (lastDiag ? ' (' + lastDiag + ' · 인식 결과 없음)' : ''); render(); return; }
        st.tries++; st.j = j; st.mode = 'result';
        if (!st.practiceOnly) record(s, j.v, j.said, j.score, 'sr');
        render();
        if (j.v === 'O') { var pl = document.getElementById('pl'); if (pl) playSentence(s, 1, pl); }
      });
    }).catch(function (code) {
      if (S.screen !== 'practice' || curS() !== s) return;
      var msg = typeof code === 'string' ? srMessage(code) : srMessage((code && code.message) || '');
      if (lastDiag && (code === 'silent' || code === 'no-speech')) msg += ' (' + lastDiag + ')';
      st.mode = 'ask'; st.msg = msg; st.fails = (st.fails || 0) + 1;
      if (st.fails >= 2 && code !== 'aborted' && msg.indexOf('정답 보기') < 0) st.msg += ' ‘정답 보기’로 스스로 채점할 수도 있어요.';
      render();
    });
  }
  // 기록: 문장마다 마지막 결과를 화면에도 바로 반영
  function record(s, v, said, score, how) {
    var r = v === 'O' ? 'O' : (v === 'T' ? '△' : 'X');
    var Q = S.sess, prev = Q.res.filter(function (x) { return x.s === s; })[0];
    if (prev) { prev.v = v; prev.said = said; } else Q.res.push({ s: s, v: v, said: said });
    s.last = r; s.n = (s.n || 0) + 1; s.at = new Date().toISOString(); if (v === 'O') s.ok = (s.ok || 0) + 1;
    if (S.part && S.part.todayIds && S.part.todayIds.indexOf(s.id) < 0) { S.part.todayIds.push(s.id); S.part.today++; if (S.home) S.home.today = Math.max(S.home.today, S.part.today); }
    queueSave({ coach: S.coach, id: s.id, result: v, said: said, score: score, how: how });
  }
  function next() {
    var Q = S.sess;
    if (Q.i + 1 >= Q.items.length) return finish();
    Q.i++; newItem(); stopAll(); render(); window.scrollTo(0, 0);
  }
  function finish() { stopAll(); go('done'); }

  // ---------- 결과 ----------
  function vDone() {
    var Q = S.sess, H = S.home || { today: 0, goal: 20 };
    var c = { O: 0, T: 0, X: 0 }; Q.res.forEach(function (r) { c[r.v]++; });
    var miss = Q.res.filter(function (r) { return r.v !== 'O'; }), done = H.today >= H.goal;
    var h = '<div class="top"><button class="ib" id="bk" aria-label="뒤로">' + IC.back + '</button><h1>' + esc(Q.title) + ' 결과</h1></div>';
    h += '<div class="card"><div class="today"><div style="flex:1"><div class="small muted">오늘 연습한 문장</div><div class="num">' + H.today + ' <small>/ ' + H.goal + '</small></div></div>' + (done ? stamp() : '') + '</div>' +
      '<div class="sum"><div><b style="color:var(--good)">' + c.O + '</b><span class="small muted">정답</span></div><div><b style="color:var(--warn)">' + c.T + '</b><span class="small muted">거의</span></div><div><b style="color:var(--bad)">' + c.X + '</b><span class="small muted">다시</span></div></div>' +
      (done ? '<button class="btn sec" id="cert">인증 문구 복사</button>' : '<div class="small muted center">오늘 목표까지 ' + Math.max(0, H.goal - H.today) + '문장 남았어요.</div>') + '</div>';
    if (miss.length) {
      h += '<div class="card" style="padding:6px 16px"><div class="small muted" style="padding:10px 0 0">다시 볼 문장</div>' + miss.map(function (r, i) {
        return '<div class="wl"><div class="row" style="align-items:flex-start"><div style="flex:1;min-width:0"><div class="k">' + esc(r.s.ko) + '</div><div class="e">' + esc(r.s.en) + '</div></div><button class="chip" style="flex:none" data-pl="' + i + '">' + IC.play + '듣기</button></div></div>';
      }).join('') + '</div>';
      h += '<button class="btn" id="redo" style="margin-bottom:10px">틀린 문장 다시 연습 · ' + miss.length + '문장</button>';
    }
    h += '<button class="btn ' + (miss.length ? 'sec' : '') + '" id="more">계속 연습하기</button>';
    app.innerHTML = h;
    document.getElementById('bk').onclick = toPart;
    if (done) document.getElementById('cert').onclick = copyCert;
    each('[data-pl]', function (b) { b.onclick = function () { playSentence(miss[+b.getAttribute('data-pl')].s, 1, b); }; });
    var rd = document.getElementById('redo');
    if (rd) rd.onclick = function () { start(miss.map(function (r) { return r.s; }), '다시 볼 문장'); };
    document.getElementById('more').onclick = toPart;
  }
  function toPart() { S.sess = null; if (S.part) go('part'); else go('home'); refreshHome(); }

  // ---------- 관리자 ----------
  function adminGate() {
    var has = S.boot && S.boot.hasPin, saved = ss('pin');
    if (has && saved) { S.pin = saved; return adminLoad(function () { go('admin'); }, function () { ss('pin', null); S.pin = ''; adminGate(); }); }
    var m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = '<div class="sheet"><h3 style="margin:0 0 6px">' + (has ? '관리자 비밀번호' : '관리자 비밀번호 만들기') + '</h3>' +
      '<p class="small muted" style="margin:0 0 10px">' + (has ? '비밀번호를 입력해 주세요.' : 'AI 음성 키를 지키기 위해 처음 한 번 비밀번호를 정해요. (4자 이상)') + '</p>' +
      '<input id="p1" type="password" placeholder="비밀번호" autocomplete="off">' + (has ? '' : '<input id="p2" type="password" placeholder="한 번 더" autocomplete="off" style="margin-top:8px">') +
      '<div class="err" id="pe"></div><div class="row" style="margin-top:6px"><button class="btn sec" id="pc">취소</button><button class="btn" id="po">확인</button></div></div>';
    document.body.appendChild(m);
    var p1 = m.querySelector('#p1'), pe = m.querySelector('#pe'); p1.focus();
    m.querySelector('#pc').onclick = function () { m.remove(); };
    m.querySelector('#po').onclick = function () {
      var v = p1.value;
      if (v.length < 4) { pe.textContent = '4자 이상으로 해 주세요.'; return; }
      function tryLogin(onFail) { S.pin = v; adminLoad(function () { ss('pin', v); m.remove(); go('admin'); }, onFail); }
      if (!has) {
        if (m.querySelector('#p2').value !== v) { pe.textContent = '두 번 입력한 비밀번호가 달라요.'; return; }
        call('adminSetPin', { pin: v }).then(function () { S.boot.hasPin = true; tryLogin(function (e) { pe.textContent = e.message; }); }).catch(function (e) {
          if (!/이미 비밀번호/.test(e.message)) { pe.textContent = e.message; return; }
          S.boot.hasPin = true;
          tryLogin(function () { m.remove(); S.pin = ''; adminGate(); var pe2 = document.getElementById('pe'); if (pe2) pe2.textContent = '이미 정해 둔 비밀번호가 있어요. 그 비밀번호를 넣어 주세요.'; });
        });
      } else tryLogin(function (e) { pe.textContent = e.message; });
    };
  }
  var AD = null;
  function adminLoad(ok, fail) {
    call('adminState', { pin: S.pin }).then(function (d) { AD = d; if (ok) ok(); }).catch(function (e) { if (fail) fail(e); else toast(e.message); });
  }
  // [이름, 성별, 짧은 이름, 느낌] — 구글 Chirp 3 HD (자연스러운 목소리)
  var VOICES = [
    ['en-US-Chirp3-HD-Charon', '남성', 'Charon', '차분한 중저음 · 추천'],
    ['en-US-Chirp3-HD-Orus', '남성', 'Orus', '단단하고 묵직함'],
    ['en-US-Chirp3-HD-Algenib', '남성', 'Algenib', '허스키한 저음'],
    ['en-US-Chirp3-HD-Umbriel', '남성', 'Umbriel', '편안함'],
    ['en-US-Chirp3-HD-Puck', '남성', 'Puck', '경쾌함'],
    ['en-US-Chirp3-HD-Kore', '여성', 'Kore', '또렷하고 단단함'],
    ['en-US-Chirp3-HD-Aoede', '여성', 'Aoede', '산뜻함'],
    ['en-US-Chirp3-HD-Leda', '여성', 'Leda', '젊은 톤']
  ];
  function vAdmin() {
    if (!AD) return adminLoad(render);
    var h = '<div class="top">' + logo(36) + '<h1>관리자</h1><button class="ib" id="out" aria-label="나가기">' + IC.out + '</button></div>';
    h += '<div class="tabs">' + [['sen', '문장'], ['tts', 'AI 음성·설정'], ['coach', '코치']].map(function (t) { return '<button data-t="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
    var st = AD.settings || {};
    if (S.tab === 'sen') {
      h += '<div class="card"><b>문장 파일 올리기</b><div class="small muted" style="margin:4px 0 10px">엑셀(.xlsx)이나 CSV 파일을 올려요. 파일에 들어 있는 PART는 통째로 새 내용으로 바뀌고, 다른 PART는 그대로예요.</div>' +
        '<label for="ff" class="btn">파일 고르기 (여러 개 가능)</label><input id="ff" type="file" multiple accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none">' +
        '<div class="small muted" style="margin-top:10px">열 이름: ID · 단계 · PART · 핵심표현 · 그룹 · 한글 · 영어 · 다른정답 · 공개<br>다른정답이 여러 개면 / 로 나눠 주세요. 공개에 N을 쓰면 코치에게 안 보여요.</div></div>';
      if (!AD.parts.length) h += '<div class="card empty">아직 올린 문장이 없어요.</div>';
      // AI 음성 한꺼번에 만들기: 음성이 모자란 PART만 고를 수 있어요
      var genOk = function (p) { return AD.hasKey && p.voiced < p.count; }, need = AD.parts.filter(genOk);
      S.gsel = S.gsel || {};
      Object.keys(S.gsel).forEach(function (k) { if (!need.some(function (p) { return p.key === k; })) delete S.gsel[k]; });
      if (need.length) {
        var gst = []; need.forEach(function (p) { var x = String(p.stage); if (gst.indexOf(x) < 0) gst.push(x); });
        h += '<div class="card"><b>AI 음성 한꺼번에 만들기</b><div class="small muted" style="margin:4px 0 10px">음성이 없는 PART ' + need.length + '개를 고를 수 있어요. 아래 목록에서 체크하거나 빠른 선택을 눌러 주세요.</div>' +
          '<div class="row" style="flex-wrap:wrap;justify-content:flex-start;gap:6px"><button class="chip" data-gq="all">전체</button>' +
          (gst.length > 1 ? gst.map(function (x) { return '<button class="chip" data-gq="' + esc(x) + '">' + esc(x) + '단계 전체</button>'; }).join('') : '') +
          '<button class="chip" data-gq="none">선택 해제</button></div>' +
          '<button class="btn" id="genSel" style="margin-top:12px">선택한 PART 음성 만들기</button><div class="small muted center" id="gsum" style="margin-top:6px"></div></div>';
      }
      AD.parts.forEach(function (p) {
        h += '<div class="card">' + (genOk(p) ? '<label class="swrow" style="padding:0"><input type="checkbox" data-gs="' + esc(p.key) + '"' + (S.gsel[p.key] ? ' checked' : '') + '><b>' + esc(partName(p)) + '</b></label>' : '<b>' + esc(partName(p)) + '</b>') + '<div class="small muted">' + p.count + '문장' + (p.hidden ? ' (숨김 ' + p.hidden + ')' : '') + ' · AI 음성 ' + p.voiced + '/' + p.count + '</div>' +
          '<div class="tags">' + p.exprs.map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('') + '</div>' +
          '<div class="row" style="margin-top:12px;flex-wrap:wrap;justify-content:flex-start"><button class="btn sm" style="flex:none" data-gen="' + esc(p.key) + '"' + (AD.hasKey && p.voiced < p.count ? '' : ' disabled') + '>' + (p.voiced < p.count ? 'AI 음성 만들기' : 'AI 음성 다 있어요') + '</button>' +
          '<button class="btn sm sec" style="flex:none" data-del="' + esc(p.key) + '">삭제</button></div></div>';
      });
      if (!AD.hasKey) h += '<p class="small muted">AI 음성을 만들려면 먼저 ‘AI 음성·설정’ 탭에서 키를 등록해 주세요. 음성이 없는 문장은 기기 음성으로 읽어요.</p>';
    } else if (S.tab === 'tts') {
      h += '<div class="card"><b>구글 클라우드 API 키</b><div class="small muted" style="margin:4px 0 10px">' + (AD.hasKey ? '등록됨 (끝자리 ' + esc(AD.keyHint) + ')' : '아직 없어요') + '</div>' +
        '<input id="key" type="password" placeholder="API 키 붙여넣기" autocomplete="off"><button class="btn sm" id="saveKey" style="margin-top:8px">키 저장</button>' +
        '<p class="small muted" style="margin:10px 0 0">키는 서버에만 저장되고 화면에 다시 보이지 않아요.</p></div>';
      h += '<div class="card"><b>AI 원어민 목소리</b><div class="small muted" style="margin:4px 0 6px">한 가지 목소리로 만들어요. <b>듣기</b>로 먼저 들어 보세요.</div>' +
        VOICES.map(function (v) {
          return '<div class="vrow"><button class="radio' + (st.voice === v[0] ? ' on' : '') + '" data-vs="' + v[0] + '" aria-label="' + esc(v[2]) + ' 고르기"></button><div class="vtx"><b>' + v[1] + ' · ' + esc(v[2]) + '</b><span class="small muted">' + esc(v[3]) + '</span></div>' +
            '<button class="chip" data-pv="' + v[0] + '"' + (AD.hasKey ? '' : ' disabled') + '>' + IC.play + '듣기</button></div>';
        }).join('') +
        '<label class="f">읽는 속도</label><select id="rt">' + [0.85, 0.9, 0.95, 1, 1.05].map(function (r) { return '<option value="' + r + '"' + (+st.rate === r ? ' selected' : '') + '>' + (r === 1 ? '보통 (1.0)' : r) + '</option>'; }).join('') + '</select>' +
        '<label class="f">하루 목표 문장 수</label><input id="goal" type="number" inputmode="numeric" min="5" max="100" value="' + (st.goal || 20) + '">' +
        '<button class="btn" id="saveSet" style="margin-top:14px">설정 저장</button>' +
        '<p class="small muted" style="margin:10px 0 0">목소리나 속도를 바꾸면 ‘문장’ 탭에서 AI 음성을 다시 만들어야 해요.</p></div>';
      var su = AD.stt || { usedSec: 0, limitSec: 3600, count: 0, reason: '' }, mm = function (x) { x = Math.round(x); return Math.floor(x / 60) + '분 ' + (x % 60) + '초'; };
      h += '<div class="card"><b>말한 영어 글자로 보기 (음성 인식)</b><div class="small muted" style="margin:4px 0 10px">코치가 말하면 구글 음성 인식으로 글자로 바꿔 채점해요. 한 달 한도를 넘으면 그달에는 자동으로 꺼지고, 스스로 채점으로 바뀌어요. 다음 달 1일에 다시 켜져요.</div>' +
        '<label class="swrow"><input type="checkbox" id="sttOn"' + (st.sttOn === false ? '' : ' checked') + '><span>음성 인식 켜기</span></label>' +
        '<label class="f">한 달 사용 한도 (분)</label><input id="sttLim" type="number" inputmode="numeric" min="1" value="' + (st.sttLimit || 60) + '">' +
        '<div class="small" style="margin-top:12px"><b>이번 달 사용</b> ' + mm(su.usedSec) + ' / ' + Math.round(su.limitSec / 60) + '분 · ' + su.count + '번</div>' +
        '<div class="prog"><i style="width:' + Math.min(100, Math.round(su.usedSec / Math.max(1, su.limitSec) * 100)) + '%' + (su.usedSec >= su.limitSec ? ';background:var(--bad)' : '') + '"></i></div>' +
        '<div class="small ' + (su.reason ? '' : 'muted') + '" style="color:' + (su.reason ? 'var(--bad)' : '') + '">' + (su.reason === 'limit' ? '한도에 닿아서 지금은 꺼져 있어요. 다음 달 1일에 다시 켜져요.' : su.reason === 'admin' ? '지금 꺼져 있어요.' : su.reason === 'nokey' ? 'API 키를 먼저 등록해 주세요.' : '지금 켜져 있어요.') + '</div>' +
        '<button class="btn" id="saveStt" style="margin-top:12px">음성 인식 설정 저장</button>' +
        '<p class="small muted" style="margin:10px 0 0">구글의 무료 60분은 결제 계정 전체 기준이에요. 구글 클라우드에서 ‘Cloud Speech-to-Text API’를 켜 두어야 해요.</p></div>';
    } else {
      h += '<div class="card"><b>코치 추가</b><div class="row" style="margin-top:10px"><input id="cn" placeholder="이름"><button class="btn sm" id="addC" style="flex:none">추가</button></div></div>';
      h += '<div class="card" style="padding:6px 16px">' + (AD.coaches.length ? AD.coaches.map(function (c) { return '<div class="sl"><span class="tx">' + esc(c) + '</span><button class="btn sm sec" style="flex:none" data-rc="' + esc(c) + '">삭제</button></div>'; }).join('') : '<div class="empty">등록된 코치가 없어요.</div>') + '</div>';
    }
    app.innerHTML = h;
    document.getElementById('out').onclick = function () { S.pin = ''; ss('pin', null); AD = null; go('entry'); };
    each('[data-t]', function (b) { b.onclick = function () { S.tab = b.getAttribute('data-t'); render(); }; });
    function done(p, msg) { return p.then(function (d) { if (d && d.parts) AD = d; if (msg) toast(msg); render(); }).catch(function (e) { toast(e.message, 4000); }); }
    if (S.tab === 'sen') {
      document.getElementById('ff').onchange = function (e) { var fs = Array.prototype.slice.call(e.target.files || []); e.target.value = ''; if (fs.length) importFiles(fs); };
      var gbtn = document.getElementById('genSel');
      function gsync() {
        if (!gbtn) return;
        var ks = Object.keys(S.gsel), n = 0;
        AD.parts.forEach(function (p) { if (S.gsel[p.key]) n += p.count - p.voiced; });
        gbtn.disabled = !ks.length;
        gbtn.textContent = ks.length ? '선택한 ' + ks.length + '개 PART 음성 만들기' : 'PART를 골라 주세요';
        document.getElementById('gsum').textContent = ks.length ? '만들 문장 ' + n.toLocaleString('ko-KR') + '개' : '';
        each('[data-gs]', function (c) { c.checked = !!S.gsel[c.getAttribute('data-gs')]; });
      }
      each('[data-gs]', function (c) { c.onchange = function () { var k = c.getAttribute('data-gs'); if (c.checked) S.gsel[k] = 1; else delete S.gsel[k]; gsync(); }; });
      each('[data-gq]', function (b) {
        b.onclick = function () {
          var q = b.getAttribute('data-gq'); S.gsel = {};
          if (q !== 'none') AD.parts.forEach(function (p) { if (AD.hasKey && p.voiced < p.count && (q === 'all' || String(p.stage) === q)) S.gsel[p.key] = 1; });
          gsync();
        };
      });
      if (gbtn) {
        gsync();
        gbtn.onclick = function () {
          var ks = AD.parts.filter(function (p) { return S.gsel[p.key]; }).map(function (p) { return p.key; });
          if (ks.length) genQueue(ks);
        };
      }
      each('[data-del]', function (b) { b.onclick = function () { var k = b.getAttribute('data-del'); confirmBox(k.replace('-', '단계 PART ') + ' 문장을 모두 삭제할까요? AI 음성도 같이 지워져요. (연습 기록은 남아요)', '삭제', function () { done(call('adminDeletePart', { pin: S.pin, key: k }), '삭제했어요'); }); }; });
      each('[data-gen]', function (b) { b.onclick = function () { genQueue([b.getAttribute('data-gen')]); }; });
    } else if (S.tab === 'tts') {
      document.getElementById('saveKey').onclick = function () { var k = document.getElementById('key').value.trim(); if (k) done(call('adminSetKey', { pin: S.pin, key: k }), '키를 저장했어요'); };
      each('[data-vs]', function (b) { b.onclick = function () { each('[data-vs]', function (x) { x.classList.remove('on'); }); b.classList.add('on'); }; });
      document.getElementById('saveSet').onclick = function () {
        var on = app.querySelector('[data-vs].on'), voice = on ? on.getAttribute('data-vs') : st.voice, rate = +document.getElementById('rt').value;
        var changed = voice !== st.voice || rate !== +st.rate;
        done(call('adminSettings', { pin: S.pin, voice: voice, rate: rate, goal: +document.getElementById('goal').value }), changed ? '저장했어요. ‘문장’ 탭에서 AI 음성을 다시 만들어 주세요.' : '설정을 저장했어요');
      };
      document.getElementById('saveStt').onclick = function () {
        done(call('adminSettings', { pin: S.pin, voice: st.voice, rate: st.rate, goal: st.goal, sttOn: document.getElementById('sttOn').checked, sttLimit: +document.getElementById('sttLim').value }), '음성 인식 설정을 저장했어요');
      };
      var pv = {};
      each('[data-pv]', function (b) {
        var label = b.innerHTML;
        b.onclick = function () {
          var name = b.getAttribute('data-pv'), rate = +document.getElementById('rt').value, k = name + '|' + rate, a = audioEl(); a.src = '';
          function play(u) { a.src = u; a.play().catch(function () { toast('소리를 재생하지 못했어요.'); }); }
          if (pv[k]) return play(pv[k]);
          b.disabled = true; b.textContent = '만드는 중…';
          call('adminTestVoice', { pin: S.pin, voice: name, rate: rate }).then(function (d) {
            b.disabled = false; b.innerHTML = label; pv[k] = URL.createObjectURL(new Blob([b64ToBytes(d.b64)], { type: 'audio/mpeg' })); play(pv[k]);
          }).catch(function (e) { b.disabled = false; b.innerHTML = label; toast(e.message, 5000); });
        };
      });
    } else {
      document.getElementById('addC').onclick = function () { var v = document.getElementById('cn').value.trim(); if (v) done(call('adminCoach', { pin: S.pin, add: v }), '추가했어요'); };
      each('[data-rc]', function (b) { b.onclick = function () { confirmBox(b.getAttribute('data-rc') + ' 코치를 삭제할까요? (연습 기록은 남아요)', '삭제', function () { done(call('adminCoach', { pin: S.pin, remove: b.getAttribute('data-rc') })); }); }; });
    }
  }
  function confirmBox(msg, okLabel, fn) {
    var m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = '<div class="sheet"><p style="margin:0 0 14px;font-weight:600">' + esc(msg) + '</p><div class="row"><button class="btn sec" id="c0">취소</button><button class="btn bad" id="c1">' + esc(okLabel) + '</button></div></div>';
    document.body.appendChild(m);
    m.querySelector('#c0').onclick = function () { m.remove(); };
    m.querySelector('#c1').onclick = function () { m.remove(); fn(); };
  }
  // 여러 PART의 AI 음성을 차례로 만들어요. 멈추거나 끊겨도 다시 누르면 남은 문장만 이어서 만들어요.
  function keepAwake(on) {
    try {
      if (on) { if (navigator.wakeLock && !keepAwake.l) navigator.wakeLock.request('screen').then(function (l) { keepAwake.l = l; l.addEventListener('release', function () { keepAwake.l = null; }); }).catch(function () { }); }
      else if (keepAwake.l) { keepAwake.l.release(); keepAwake.l = null; }
    } catch (e) { }
  }
  function genQueue(keys) {
    var info = {}; (AD && AD.parts || []).forEach(function (p) { info[p.key] = p; });
    var many = keys.length > 1, m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = '<div class="sheet"><b id="gtt">AI 음성 만드는 중</b>' +
      '<div class="small" id="gpn" style="margin-top:8px;font-weight:700"></div><div class="prog"><i id="pg" style="width:0"></i></div><div class="small muted" id="pt">준비 중…</div>' +
      (many ? '<div class="small muted" style="margin-top:12px">전체 진행</div><div class="prog"><i id="pga" style="width:0"></i></div><div class="small muted" id="pta"></div>' : '') +
      '<div class="small muted" id="gnote" style="margin-top:10px">문장이 많으면 오래 걸려요. 끝날 때까지 이 화면을 켜 두세요.</div><div class="err" id="pe"></div>' +
      '<div class="row" style="margin-top:10px"><button class="btn sec" id="pstop">멈추기</button><button class="btn sec" id="pclose" style="display:none">닫기</button></div></div>';
    document.body.appendChild(m);
    var $ = function (id) { return m.querySelector('#' + id); }, errs = [], i = 0, stopReq = false, retry = 0, run = true;
    var doneBy = {}; keys.forEach(function (k) { doneBy[k] = (info[k] && info[k].voiced) || 0; });
    var all = keys.reduce(function (a, k) { return a + ((info[k] && info[k].count) || 0); }, 0);
    function name(k) { return k.replace('-', '단계 PART '); }
    function paint(k, total) {
      $('gpn').textContent = (many ? 'PART ' + (i + 1) + '/' + keys.length + ' · ' : '') + name(k);
      $('pg').style.width = Math.round(doneBy[k] / Math.max(1, total) * 100) + '%';
      $('pt').textContent = doneBy[k] + ' / ' + total + ' 문장';
      if (many) { var d = 0; keys.forEach(function (x) { d += doneBy[x]; }); $('pga').style.width = Math.round(d / Math.max(1, all) * 100) + '%'; $('pta').textContent = d + ' / ' + all + ' 문장'; }
    }
    function finish(msg) {
      run = false; keepAwake(false); window.onbeforeunload = null; $('gtt').textContent = 'AI 음성 만들기'; $('gnote').style.display = 'none';
      var left = keys.filter(function (k) { return !info[k] || doneBy[k] < info[k].count; });
      $('pt').textContent = msg || (left.length ? '일부 음성을 만들지 못했어요. 다시 누르면 남은 문장만 이어서 만들어요.' : '다 만들었어요! (' + (many ? keys.length + '개 PART' : (info[keys[0]] ? info[keys[0]].count + '문장' : '')) + ')');
      if (left.length && left.length < keys.length) $('pt').textContent += ' 남은 PART: ' + left.map(name).join(', ');
      if (errs.length) $('pe').textContent = errs.slice(0, 3).join(' / ');
      $('pstop').style.display = 'none'; $('pclose').style.display = ''; adminLoad();
    }
    function step() {
      if (stopReq) return finish('멈췄어요. 다시 누르면 남은 문장만 이어서 만들어요.');
      if (i >= keys.length) return finish();
      var k = keys[i];
      if (info[k]) paint(k, info[k].count);
      call('adminGenerate', { pin: S.pin, key: k }).then(function (d) {
        retry = 0;
        info[k] = info[k] || { count: d.total }; info[k].count = d.total; doneBy[k] = d.total - d.remaining;
        paint(k, d.total);
        (d.errors || []).forEach(function (e) { errs.push(e); });
        if (d.stop) return finish('음성을 만들지 못해서 멈췄어요. 아래 오류를 확인해 주세요. (키·결제 상태 등)');
        if (d.remaining <= 0) i++;
        step();
      }).catch(function (e) {
        if (run && retry < 1 && !stopReq) { retry++; setTimeout(step, 3000); return; }
        errs.push(e.message); finish('연결이 끊겨서 멈췄어요. 다시 누르면 남은 문장만 이어서 만들어요.');
      });
    }
    $('pstop').onclick = function () { stopReq = true; $('pstop').disabled = true; $('pstop').textContent = '지금 묶음이 끝나면 멈춰요…'; };
    $('pclose').onclick = function () { m.remove(); render(); };
    keepAwake(true); window.onbeforeunload = function () { return '음성을 만드는 중이에요.'; };
    document.addEventListener('visibilitychange', function () { if (run && document.visibilityState === 'visible') keepAwake(true); });
    step();
  }

  // ---------- 문장 파일 읽기 (엑셀·CSV) ----------
  var HEAD = ['ID', '단계', 'PART', '핵심표현', '그룹', '한글', '영어', '다른정답', '공개'];
  function parseCsv(text) {
    text = text.replace(/^﻿/, '');
    var rows = [], row = [], f = '', q = false, i, c;
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim(); }); });
  }
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function unzip(buf) {
    var b = new Uint8Array(buf), e = -1, i;
    for (i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) if (u32(b, i) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('엑셀 파일을 읽지 못했어요.');
    var n = u16(b, e + 10), p = u32(b, e + 16), out = {};
    for (i = 0; i < n; i++) {
      if (u32(b, p) !== 0x02014b50) break;
      var method = u16(b, p + 10), size = u32(b, p + 20), nl = u16(b, p + 28), xl = u16(b, p + 30), cl = u16(b, p + 32), lo = u32(b, p + 42);
      var name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nl));
      var d0 = lo + 30 + u16(b, lo + 26) + u16(b, lo + 28);
      out[name] = { method: method, data: b.subarray(d0, d0 + size) };
      p += 46 + nl + xl + cl;
    }
    return out;
  }
  function inflate(ent) {
    if (!ent) return Promise.resolve('');
    if (ent.method === 0) return Promise.resolve(new TextDecoder().decode(ent.data));
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('이 브라우저에서는 엑셀 파일을 읽을 수 없어요. CSV로 저장해서 올려 주세요.'));
    return new Response(new Blob([ent.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  }
  function readXlsx(buf) {
    var z = unzip(buf), sheet = z['xl/worksheets/sheet1.xml'] ? 'xl/worksheets/sheet1.xml' : Object.keys(z).filter(function (k) { return /^xl\/worksheets\/[^\/]+\.xml$/.test(k); }).sort()[0];
    if (!sheet) throw new Error('엑셀 시트를 찾지 못했어요.');
    return Promise.all([inflate(z['xl/sharedStrings.xml']), inflate(z[sheet])]).then(function (t) {
      var P = new DOMParser(), sst = [];
      if (t[0]) Array.prototype.forEach.call(P.parseFromString(t[0], 'application/xml').getElementsByTagName('si'), function (si) {
        sst.push(Array.prototype.filter.call(si.getElementsByTagName('t'), function (x) { return x.parentNode.nodeName !== 'rPh'; }).map(function (x) { return x.textContent; }).join(''));
      });
      var rows = [];
      Array.prototype.forEach.call(P.parseFromString(t[1], 'application/xml').getElementsByTagName('row'), function (r) {
        var row = [];
        Array.prototype.forEach.call(r.getElementsByTagName('c'), function (c) {
          var ref = c.getAttribute('r') || '', col = 0, m = /^([A-Z]+)/.exec(ref);
          if (m) for (var k = 0; k < m[1].length; k++) col = col * 26 + m[1].charCodeAt(k) - 64; else col = row.length + 1;
          var tp = c.getAttribute('t'), v = c.getElementsByTagName('v')[0], val = '';
          if (tp === 's') val = sst[+(v && v.textContent)] || '';
          else if (tp === 'inlineStr') val = Array.prototype.map.call(c.getElementsByTagName('t'), function (x) { return x.textContent; }).join('');
          else val = v ? v.textContent : '';
          while (row.length < col - 1) row.push('');
          row[col - 1] = val;
        });
        if (row.some(function (x) { return String(x).trim(); })) rows.push(row);
      });
      return rows;
    });
  }
  function toRecords(rows) {
    var hi = -1, idx = null;
    for (var i = 0; i < Math.min(rows.length, 10); i++) {
      var hd = rows[i].map(function (x) { return String(x).replace(/\s+/g, ''); });
      if (hd.indexOf('영어') >= 0 && hd.indexOf('한글') >= 0) { hi = i; idx = HEAD.map(function (c) { return hd.indexOf(c); }); break; }
    }
    if (hi < 0) throw new Error('첫 줄에 열 이름(한글, 영어, 단계, PART …)이 있어야 해요.');
    if (idx[1] < 0 || idx[2] < 0) throw new Error('‘단계’와 ‘PART’ 열이 있어야 해요.');
    return rows.slice(hi + 1).map(function (r) { return idx.map(function (j) { return j < 0 ? '' : String(r[j] == null ? '' : r[j]).trim(); }); })
      .filter(function (r) { return r[5] || r[6]; });
  }
  function readRecs(f) {
    var isX = /\.xlsx$/i.test(f.name);
    return (isX ? f.arrayBuffer().then(readXlsx) : f.text().then(parseCsv)).then(toRecords);
  }
  // 파일 여러 개를 읽어서 PART별로 나눈 뒤, 고른 PART만 차례로 올려요
  function importFiles(files) {
    Promise.all(files.map(function (f) { return readRecs(f).then(function (r) { return { f: f, recs: r }; }, function (e) { return { f: f, err: e.message }; }); })).then(function (list) {
      var G = {}, order = [], bad = [], have = {};
      ((AD && AD.parts) || []).forEach(function (p) { have[p.key] = 1; });
      list.forEach(function (x) {
        if (x.err) return bad.push(x.f.name + ': ' + x.err);
        if (!x.recs.length) return bad.push(x.f.name + ': 문장이 없어요.');
        x.recs.forEach(function (r) {
          var p2 = String(r[2]).trim(), k = String(r[1]).trim() + '-' + (/^\d$/.test(p2) ? '0' + p2 : p2);
          if (!G[k]) { G[k] = { key: k, stage: String(r[1]).trim(), rows: [], files: [] }; order.push(k); }
          G[k].rows.push(r); if (G[k].files.indexOf(x.f.name) < 0) G[k].files.push(x.f.name);
        });
      });
      order.sort(function (a, b) { var A = a.split('-'), B = b.split('-'); return ((parseFloat(A[0]) || 0) - (parseFloat(B[0]) || 0)) || String(A[1]).localeCompare(String(B[1]), 'ko', { numeric: true }); });
      if (!order.length) { toast(bad.length ? bad.slice(0, 3).join(' / ') : '올릴 문장이 없어요.', 6000); return; }
      var sel = {}; order.forEach(function (k) { sel[k] = 1; });
      var stages = []; order.forEach(function (k) { if (stages.indexOf(G[k].stage) < 0) stages.push(G[k].stage); });
      var nm = function (k) { return k.split('-')[0] + '단계 PART ' + k.split('-')[1]; }, total = order.reduce(function (a, k) { return a + G[k].rows.length; }, 0);
      var first = G[order[0]].rows[0], m = document.createElement('div'); m.className = 'modal';
      m.innerHTML = '<div class="sheet"><b>파일 ' + list.length + '개 · PART ' + order.length + '개 · ' + total + '문장</b>' +
        (bad.length ? '<div class="err">읽지 못한 파일: ' + bad.map(esc).join('<br>') + '</div>' : '') +
        '<div class="small" style="background:var(--bg);border-radius:12px;padding:10px;margin-top:10px">예: ' + esc(first[5]) + '<br><b>' + esc(first[6]) + '</b></div>' +
        (order.length > 1 ? '<div class="row" style="flex-wrap:wrap;justify-content:flex-start;gap:6px;margin-top:12px"><button class="chip" data-iq="all">전체</button>' +
          (stages.length > 1 ? stages.map(function (x) { return '<button class="chip" data-iq="' + esc(x) + '">' + esc(x) + '단계만</button>'; }).join('') : '') + '<button class="chip" data-iq="none">선택 해제</button></div>' : '') +
        '<div id="ilist" style="margin-top:8px">' + order.map(function (k) {
          return '<label class="swrow" style="align-items:flex-start;border-bottom:1px solid var(--line);padding:9px 0"><input type="checkbox" data-ik="' + esc(k) + '" checked style="flex:none;margin-top:2px"><span style="flex:1"><b>' + esc(nm(k)) + '</b> <span class="small muted" style="font-weight:400">' + G[k].rows.length + '문장</span>' +
            (have[k] ? ' <span class="tag" style="background:var(--chip);color:var(--warn)">이미 있음 · 새 내용으로 바뀜</span>' : '') +
            '<br><span class="small muted" style="font-weight:400">' + esc(G[k].files.join(', ')) + '</span></span></label>';
        }).join('') + '</div>' +
        '<p class="small muted">같은 PART에 이미 있던 문장은 이 파일 내용으로 바뀌어요. 영어가 그대로인 문장은 AI 음성을 다시 만들지 않아요.</p>' +
        '<div class="small center" id="isum" style="font-weight:700"></div><div class="prog" id="iprog" style="display:none"><i id="ipg" style="width:0"></i></div><div class="small muted" id="ipt"></div><div class="err" id="ie"></div>' +
        '<div class="row"><button class="btn sec" id="i0">취소</button><button class="btn" id="i1"></button></div></div>';
      document.body.appendChild(m);
      var $ = function (id) { return m.querySelector('#' + id); }, b1 = $('i1'), busy = false, todo = null, force = false, okN = 0, okRows = 0, upK = {};
      function sync() {
        Array.prototype.forEach.call(m.querySelectorAll('[data-ik]'), function (c) { c.checked = !!sel[c.getAttribute('data-ik')]; });
        var ks = order.filter(function (k) { return sel[k]; }), n = ks.reduce(function (a, k) { return a + G[k].rows.length; }, 0);
        b1.disabled = !ks.length; b1.textContent = ks.length ? (order.length > 1 ? ks.length + '개 올리기' : '올리기') : '골라 주세요';
        $('isum').textContent = order.length > 1 ? (ks.length ? '선택: PART ' + ks.length + '개 · ' + n.toLocaleString('ko-KR') + '문장' : '올릴 PART를 골라 주세요') : '';
      }
      Array.prototype.forEach.call(m.querySelectorAll('[data-ik]'), function (c) { c.onchange = function () { var k = c.getAttribute('data-ik'); if (c.checked) sel[k] = 1; else delete sel[k]; sync(); }; });
      Array.prototype.forEach.call(m.querySelectorAll('[data-iq]'), function (b) { b.onclick = function () { if (busy) return; var q = b.getAttribute('data-iq'); sel = {}; if (q !== 'none') order.forEach(function (k) { if (q === 'all' || G[k].stage === q) sel[k] = 1; }); sync(); }; });
      $('i0').onclick = function () { m.remove(); if (okN) render(); };
      function lock(on) { busy = on; Array.prototype.forEach.call(m.querySelectorAll('input,.chip'), function (x) { x.disabled = on; }); b1.disabled = on; $('i0').disabled = on; }
      function run(keys) {
        var probs = [], fails = [], j = 0, retry = 0;
        lock(true); $('iprog').style.display = ''; $('ie').innerHTML = '';
        function next() {
          $('ipg').style.width = Math.round(j / keys.length * 100) + '%';
          if (j >= keys.length) return end();
          var k = keys[j];
          $('ipt').textContent = (keys.length > 1 ? 'PART ' + (j + 1) + '/' + keys.length + ' · ' : '') + nm(k) + ' 올리는 중…';
          call('adminImport', { pin: S.pin, rows: G[k].rows, ignoreProblems: force }).then(function (d) {
            retry = 0;
            if (d.problems) probs.push({ k: k, d: d });
            else { AD = d.state; okN++; okRows += d.imported; delete sel[k]; upK[k] = 1; }
            j++; next();
          }).catch(function (e) {
            if (retry < 1) { retry++; setTimeout(next, 2000); return; }
            retry = 0; fails.push(nm(k) + ': ' + e.message); j++; next();
          });
        }
        function end() {
          lock(false); $('i0').textContent = '닫기';
          Array.prototype.forEach.call(m.querySelectorAll('[data-ik]'), function (c) { var k = c.getAttribute('data-ik'); if (upK[k]) { c.checked = false; c.disabled = true; var b = c.parentNode.querySelector('b'); if (b && !/올렸어요/.test(b.textContent)) b.textContent += ' · 올렸어요'; } });
          $('ipt').textContent = okN ? '지금까지 PART ' + okN + '개 · ' + okRows + '문장을 올렸어요.' : '';
          var html = '';
          if (probs.length) html += probs.map(function (x) { return esc(nm(x.k) + ' — ' + x.d.problemCount + '줄에 문제가 있어요: ') + x.d.problems.slice(0, 3).map(esc).join(' / '); }).join('<br>');
          if (fails.length) html += (html ? '<br>' : '') + '올리지 못한 PART: ' + fails.map(esc).join('<br>');
          $('ie').innerHTML = html;
          todo = probs.map(function (x) { return x.k; }).concat(fails.length ? keys.filter(function (k) { return sel[k] && probs.every(function (x) { return x.k !== k; }); }) : []);
          force = probs.length > 0;
          if (todo.length) { b1.disabled = false; b1.textContent = probs.length ? '문제 줄 빼고 올리기' : '못 올린 것 다시 올리기'; $('isum').textContent = '다시 올릴 PART ' + todo.length + '개'; }
          else { m.remove(); toast(okN > 1 ? 'PART ' + okN + '개 · ' + okRows + '문장을 올렸어요' : okRows + '문장을 올렸어요'); render(); }
        }
        next();
      }
      b1.onclick = function () { if (busy) return; if (todo && todo.length) return run(todo); run(order.filter(function (k) { return sel[k]; })); };
      sync();
    });
  }

  // ---------- 시작 ----------
  try { history.replaceState({ s: 'entry' }, ''); } catch (e) { }
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { });
  window.__app = { S: S, go: go, render: render, judge: judge, tok: tok };
})();
