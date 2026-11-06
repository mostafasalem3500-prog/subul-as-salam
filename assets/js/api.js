// =====================================================================
//  طبقة جلب المحتوى من المصادر الأصلية — بلا أي تعديل على النص
//  الترتيب: ذاكرة مؤقتة ← المصدر مباشرة ← نسخة data/ الاحتياطية (من GitHub Actions)
// =====================================================================
import { CONFIG } from './config.js';
import { BASES, mirrorPath } from './mirror.js';

const mem = new Map();
const LS_PREFIX = 'subul-cache:';
const TTL = 1000 * 60 * 60 * 24 * 3; // 3 أيام
let proxyDown = false;
const liveBlocked = new Set(JSON.parse(sessionStorage.getItem('subul-blocked') || '[]'));

function lsGet(url) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + url); if (!raw) return null;
    const { t, v } = JSON.parse(raw); if (Date.now() - t > TTL) return null; return v;
  } catch { return null; }
}
function lsSet(url, v) {
  try {
    const s = JSON.stringify({ t: Date.now(), v });
    if (s.length < 400_000) localStorage.setItem(LS_PREFIX + url, s);
  } catch { /* الذاكرة ممتلئة: نتجاهل */ }
}

async function timed(url, ms = 9000) {
  const ctl = new AbortController(); const id = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error(r.status); return await r.json(); }
  finally { clearTimeout(id); }
}

export async function getJSON(url) {
  if (mem.has(url)) return mem.get(url);
  const cached = lsGet(url); if (cached) { mem.set(url, cached); return cached; }
  const host = new URL(url).host;
  let data = null, err = null;
  if (!liveBlocked.has(host)) {
    try { data = await timed(url); }
    catch (e) {
      err = e;
      // TypeError = غالبًا CORS أو انقطاع؛ نتخطّى البث المباشر لهذا المضيف في هذه الجلسة
      if (e instanceof TypeError) { liveBlocked.add(host); sessionStorage.setItem('subul-blocked', JSON.stringify([...liveBlocked])); }
    }
  }
  // وسيط PHP على الاستضافة (Hostinger): يتجاوز منع CORS ويخزّن نسخة مؤقتة
  if (!data && CONFIG.proxy && !proxyDown) {
    try { data = await timed(new URL(`${CONFIG.proxy}?u=${encodeURIComponent(url)}`, document.baseURI).href, 25000); }
    catch (e) { err = e; if (e instanceof SyntaxError) proxyDown = true; }   // لا PHP هنا (مثل GitHub Pages)
  }
  if (!data) {
    const p = mirrorPath(url);
    if (p) { try { data = await timed(new URL(p, document.baseURI).href, 6000); } catch (e) { err = e; } }
  }
  if (!data) throw err || new Error('fetch failed');
  mem.set(url, data); lsSet(url, data);
  return data;
}

// ---------------- IslamHouse ----------------
export const IH = {
  list: (type, lang, page = 1, limit = 25) => getJSON(`${BASES.ih}/main/${type}/${lang}/${lang}/${page}/${limit}/json`),
  item: (id, lang) => getJSON(`${BASES.ih}/main/get-item/${id}/${lang}/json`),
  siteContent: (lang) => getJSON(`${BASES.ih}/main/sitecontent/${lang}/${lang}/json`),
  pageUrl: (id, lang) => `https://islamhouse.com/${lang}/main/${id}/`,
};

// ---------------- QuranEnc (ترجمات معاني القرآن) ----------------
export const QE = {
  sura: async (key, n) => (await getJSON(`${BASES.qe}/translation/sura/${key}/${n}`)).result || [],
  aya: async (key, s, a) => (await QE.sura(key, s)).find((x) => +x.aya === +a),
  list: (lang) => getJSON(`${BASES.qe}/translations/list/${lang}`),
  pageUrl: (key, s) => `https://quranenc.com/ar/browse/${key}/${s}`,
};

// ---------------- HadeethEnc (موسوعة الأحاديث) ----------------
export const HE = {
  categories: (lang) => getJSON(`${BASES.he}/categories/roots/?language=${lang}`),
  list: (lang, cat, page = 1, per = 20) => getJSON(`${BASES.he}/hadeeths/list/?language=${lang}&category_id=${cat}&page=${page}&per_page=${per}`),
  one: (lang, id) => getJSON(`${BASES.he}/hadeeths/one/?language=${lang}&id=${id}`),
  pageUrl: (lang, id) => `https://hadeethenc.com/${lang}/browse/hadith/${id}`,
};

// ---------------- التلاوة (everyayah.com) ----------------
const pad = (n) => String(n).padStart(3, '0');
export const audioUrl = (reciter, s, a) => `${CONFIG.api.audioBase}${reciter}/${pad(s)}${pad(a)}.mp3`;

// مساعدات
export const ihTypeIcon = (type) => ({ books: '📘', articles: '📄', audios: '🎧', videos: '🎬', poster: '🖼', fatwa: '⚖', khotab: '🎙', favorites: '⭐' }[type] || '📎');
// رابط يوتيوب → رابط تضمين بخصوصية مُحسَّنة (youtube-nocookie)
export function ytId(url) {
  const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
export const ytEmbed = (url) => `https://www.youtube-nocookie.com/embed/${ytId(url)}?rel=0`;
export function attachmentKind(a) {
  if (ytId(a?.url)) return 'youtube';
  const e = (a?.extension_type || '').toUpperCase();
  if (['MP3', 'M4A', 'OGG', 'WAV'].includes(e)) return 'audio';
  if (['MP4', 'WEBM'].includes(e)) return 'video';
  if (e === 'PDF') return 'pdf';
  return 'file';
}
