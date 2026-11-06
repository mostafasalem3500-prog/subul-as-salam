// القرآن الكريم: فهرس السور، والقارئ مع الترجمة المعتمدة، ووضع الحفظ، ومستكشف الترجمة
import { CONFIG } from '../config.js';
import { QE, audioUrl } from '../api.js';
import { S, esc, toast, loading } from '../core.js';
import { SURAHS, STAGES, surahName } from '../curriculum.js';
import { t } from '../i18n.js';
import { pageHead, ayahMark, qLangDir } from './components.js';

export function list(app) {
  const inPath = new Set(STAGES.flatMap((s) => s.quran));
  const card = (n) => `<a href="#/quran/${n}"><span class="n">${n}</span><span><b lang="ar" style="font-family:var(--quran);font-size:1.15rem">${esc(SURAHS[n - 1][0])}</b><br><span class="tiny muted">${SURAHS[n - 1][1]} ${inPath.has(n) ? '· 🧠' : ''}</span></span></a>`;
  const juzAmma = Array.from({ length: 37 }, (_, i) => 114 - i);
  app.innerHTML = `${pageHead('📖 ' + t('quran'), `<span lang="ar">النص العثماني (رواية حفص) مع ترجمات معاني القرآن المعتمدة من QuranEnc.com بلغة الطالب، وتلاوات آية آية.</span>`,
    `<a class="btn" href="https://qurancomplex.gov.sa" target="_blank" rel="noopener">مجمع الملك فهد ↗</a>`)}
  <div class="wrap stack" style="padding-top:20px">
    <h2 lang="ar">جزء عمّ — مسار الحفظ</h2><div class="surah-list">${juzAmma.map(card).join('')}</div>
    <h2 lang="ar" style="margin-top:20px">كل السور</h2><div class="surah-list">${SURAHS.map((_, i) => card(i + 1)).join('')}</div>
  </div>`;
}

const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}'’]/gu, '');

export async function reader(app, nStr) {
  const n = +nStr; if (!SURAHS[n - 1]) return '404';
  const lang = S.lang, keys = CONFIG.languages[lang].quran;
  app.innerHTML = loading();
  const rows = await QE.sura(S.qKey, n);
  let bism = '';
  if (n !== 1 && n !== 9) { try { bism = (await QE.aya(S.qKey, 1, 1)).arabic_text; } catch { /* اختياري */ } }
  const memo = S.me?.role === 'student' ? await S.db.memo() : [];
  const ms = memo.find((m) => m.kind === 'surah' && m.ref === String(n))?.status;
  const stage = STAGES.find((s) => s.quran.includes(n));

  app.innerHTML = `${pageHead(`<span lang="ar" style="font-family:var(--quran)">سورة ${esc(surahName(n))}</span> <span class="chip">${n}</span>`,
    `${SURAHS[n - 1][1]} · ${stage ? `${stage.icon} <a href="#/stage/${stage.id}">${t('stage')} ${STAGES.indexOf(stage) + 1}</a>` : ''}`)}
  <div class="wrap stack" style="padding-top:16px">
    <div class="card row" style="position:sticky;top:66px;z-index:5">
      <select id="tk" style="max-width:260px" aria-label="${t('translation')}">${keys.map((k) => `<option${k === S.qKey ? ' selected' : ''}>${k}</option>`).join('')}</select>
      <select id="rc" style="max-width:240px" aria-label="${t('reciter')}">${Object.entries(CONFIG.api.audio).map(([k, v]) => `<option value="${k}"${k === S.reciter ? ' selected' : ''}>${v}</option>`).join('')}</select>
      <select id="rp" style="max-width:110px" aria-label="${t('repeat')}">${[1, 3, 5, 10].map((x) => `<option value="${x}">${t('repeat')} ×${x}</option>`).join('')}</select>
      <button class="btn sm primary" id="play">▶ ${t('listen')}</button>
      <button class="btn sm" id="mask">🙈 ${t('hideWords')}</button>
      <button class="btn sm" id="hideTr">${t('translation')} ⇆</button>
    </div>
    <p class="notice sky small">🔎 <b>${t('explorer')}:</b> ${t('explorerHint')} <span id="hits"></span></p>
    ${bism ? `<div class="bismillah" lang="ar" translate="no">${esc(bism)}</div>` : ''}
    <div class="card" id="ayat">${rows.map((r) => `<div class="ayah" id="a${r.aya}" data-a="${r.aya}">
      <div class="quran-ar" lang="ar" translate="no">${esc(r.arabic_text).split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ')} ${ayahMark(r.aya)}</div>
      <div class="tr" dir="${qLangDir(lang)}" lang="${lang}" translate="no">${esc(r.translation).split(/(\s+)/).map((w) => /\s/.test(w) || !w ? w : `<span class="tok" data-w="${esc(norm(w))}">${w}</span>`).join('')}</div>
      ${r.footnotes ? `<div class="fn" dir="${qLangDir(lang)}" translate="no">${esc(r.footnotes)}</div>` : ''}
      <div class="tools"><button class="btn sm" data-play="${r.aya}">▶ ${r.aya}</button></div>
    </div>`).join('')}</div>
    <p class="src">النص العثماني والترجمة من <a href="${QE.pageUrl(S.qKey, n)}" target="_blank" rel="noopener">QuranEnc.com</a> — ${esc(S.qKey)} · التلاوة: everyayah.com (${esc(CONFIG.api.audio[S.reciter])})</p>
    ${S.me?.role === 'student' ? `<div class="card row between"><span>${ms === 'verified' ? '✔ ' + t('verified') : ms === 'memorized' ? '⭐ ' + t('memorized') : t('memorize')}</span>
      <span class="row"><button class="btn sm" id="m-learn">${t('learning')}</button><button class="btn sm primary" id="m-done">⭐ ${t('memorized')}</button></span></div>` : ''}
    <div class="row between">${n > 1 ? `<a class="btn" href="#/quran/${n - 1}">→ ${esc(surahName(n - 1))}</a>` : '<span></span>'}${n < 114 ? `<a class="btn" href="#/quran/${n + 1}">${esc(surahName(n + 1))} ←</a>` : ''}</div>
  </div>`;

  const $ = (s) => app.querySelector(s);
  $('#tk').onchange = (e) => { S.qKey = e.target.value; reader(app, nStr); };
  $('#rc').onchange = (e) => { S.reciter = e.target.value; };

  // التلاوة آية آية مع التكرار والتظليل
  const audio = new Audio(); let queue = [], playing = false;
  const playAyah = (a) => new Promise((res) => {
    app.querySelectorAll('.ayah.playing').forEach((x) => x.classList.remove('playing'));
    const el = $('#a' + a); el?.classList.add('playing'); el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    audio.src = audioUrl(S.reciter, n, a); audio.onended = res; audio.onerror = () => { toast(t('error')); res(); };
    audio.play().catch(res);
  });
  const run = async () => {
    playing = true; $('#play').textContent = '⏸';
    while (playing && queue.length) { const a = queue.shift(); const rep = +$('#rp').value; for (let k = 0; k < rep && playing; k++) await playAyah(a); }
    playing = false; $('#play').textContent = '▶ ' + t('listen');
    app.querySelectorAll('.ayah.playing').forEach((x) => x.classList.remove('playing'));
  };
  $('#play').onclick = () => { if (playing) { playing = false; audio.pause(); return; } queue = rows.map((r) => +r.aya); run(); };
  app.querySelectorAll('[data-play]').forEach((b) => b.onclick = () => { playing = false; audio.pause(); queue = [+b.dataset.play]; setTimeout(run, 50); });
  addEventListener('hashchange', () => { playing = false; audio.pause(); }, { once: true });

  // وضع الحفظ: إخفاء الكلمات، والضغط يُظهر الكلمة
  $('#mask').onclick = () => { $('#ayat').classList.toggle('masked'); app.querySelectorAll('.w.show').forEach((w) => w.classList.remove('show')); };
  app.querySelectorAll('.w').forEach((w) => w.onclick = () => w.classList.add('show'));
  $('#hideTr').onclick = () => app.querySelectorAll('.ayah .tr, .ayah .fn').forEach((x) => x.classList.toggle('hidden'));

  // مستكشف الترجمة: مواضع ورود الكلمة في السورة
  app.querySelectorAll('.tok').forEach((tk) => tk.onclick = () => {
    const w = tk.dataset.w; app.querySelectorAll('.tok.hit').forEach((x) => x.classList.remove('hit'));
    const hits = app.querySelectorAll(`.tok[data-w="${CSS.escape(w)}"]`); hits.forEach((x) => x.classList.add('hit'));
    const ayat = [...new Set([...hits].map((x) => x.closest('.ayah').dataset.a))];
    $('#hits').innerHTML = `— «<b>${esc(tk.textContent)}</b>»: ${hits.length}× (${ayat.map((a) => `<a href="#/quran/${n}" onclick="event.preventDefault();document.getElementById('a${a}').scrollIntoView({block:'center',behavior:'smooth'})">${a}</a>`).join('، ')})`;
  });

  $('#m-learn')?.addEventListener('click', async () => { try { await S.db.setMemo('surah', n, 'learning'); toast(t('learning')); } catch { toast('✔ ' + t('verified')); } });
  $('#m-done')?.addEventListener('click', async () => {
    try { await S.db.setMemo('surah', n, 'memorized'); } catch { /* موثّقة من المشرف مسبقًا */ }
    if (stage) await S.db.markDone('quran:' + n, stage.id, 'memorize');
    toast('⭐ ' + t('memorized'));
  });
}
