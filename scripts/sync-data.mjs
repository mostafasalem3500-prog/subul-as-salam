// =====================================================================
//  مزامنة نسخة احتياطية من المصادر داخل مجلد data/
//  يشغّله GitHub Actions (أو أنت: node scripts/sync-data.mjs)
//  الهدف: يعمل الموقع حتى لو منع متصفحُ الزائر الطلبَ المباشر (CORS) أو تعطّل المصدر مؤقتًا.
//  النص يُحفظ كما يصل من المصدر دون أي تعديل.
// =====================================================================
import fs from 'node:fs/promises';
import path from 'node:path';
import { BASES, mirrorPath } from '../assets/js/mirror.js';
import { CONFIG } from '../assets/js/config.js';
import { STAGES } from '../assets/js/curriculum.js';
import { DAWAH_WORDS } from '../assets/js/dawah-words.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const langs = Object.entries(CONFIG.languages).filter(([, L]) => L.enabled);
const FULL = process.argv.includes('--full');   // --full: كل سور القرآن لكل ترجمة
let ok = 0, fail = 0;

async function save(url) {
  const p = mirrorPath(url); if (!p) throw new Error('no mirror path ' + url);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'subul-sync (GitHub Actions)' } });
      if (!r.ok) throw new Error(r.status);
      const data = await r.json();
      await fs.mkdir(path.join(ROOT, path.dirname(p)), { recursive: true });
      await fs.writeFile(path.join(ROOT, p), JSON.stringify(data));
      ok++; return data;
    } catch (e) {
      if (attempt === 3) { fail++; console.warn('✗', url, e.message); return null; }
      await new Promise((res) => setTimeout(res, 800 * attempt));
    }
  }
}
async function pool(tasks, n = 6) { const q = [...tasks]; await Promise.all(Array.from({ length: n }, async () => { while (q.length) await q.shift()(); })); }

const jobs = [];
for (const [code, L] of langs) {
  // IslamHouse: فهرس الأقسام + أول 4 صفحات من كل قسم + كل مواد المنهج
  jobs.push(async () => {
    const sc = await save(`${BASES.ih}/main/sitecontent/${L.ih}/${L.ih}/json`);
    const blocks = (sc?.data || sc || []).filter?.((b) => b.items_count > 0) || [];
    await pool(blocks.flatMap((b) => Array.from({ length: Math.min(4, Math.ceil(b.items_count / 25)) }, (_, i) =>
      () => save(`${BASES.ih}/main/${b.block_name}/${L.ih}/${L.ih}/${i + 1}/25/json`))), 4);
  });
  for (const st of STAGES) for (const id of st.ih[code] || []) jobs.push(() => save(`${BASES.ih}/main/get-item/${id}/${L.ih}/json`));

  // QuranEnc: سور المنهج (أو كل السور مع --full) + آيات الكلمات الدعوية + آية الشعار
  const suras = new Set(FULL ? Array.from({ length: 114 }, (_, i) => i + 1) : [1, 2, 16, 112, CONFIG.brand.verseRef.sura, ...STAGES.flatMap((s) => s.quran)]);
  (DAWAH_WORDS[code]?.cards || []).forEach((c) => suras.add(c.ref[0]));
  for (const key of L.quran) for (const n of suras) jobs.push(() => save(`${BASES.qe}/translation/sura/${key}/${n}`));

  // HadeethEnc: التصنيفات + أول صفحة من كل تصنيف + الأحاديث المعروضة في المحطات
  jobs.push(async () => {
    const cats = await save(`${BASES.he}/categories/roots/?language=${L.hadeeth}`);
    for (const c of cats || []) {
      await save(`${BASES.he}/hadeeths/list/?language=${L.hadeeth}&category_id=${c.id}&page=1&per_page=20`);
      const six = await save(`${BASES.he}/hadeeths/list/?language=${L.hadeeth}&category_id=${c.id}&page=1&per_page=6`);
      await pool((six?.data || []).map((h) => () => save(`${BASES.he}/hadeeths/one/?language=${L.hadeeth}&id=${h.id}`)), 3);
    }
  });
}

console.log(`مزامنة ${jobs.length} مهمة…`);
await pool(jobs, 6);
await fs.writeFile(path.join(ROOT, 'data/sync-info.json'), JSON.stringify({ at: new Date().toISOString(), ok, fail }, null, 1));
console.log(`✓ ${ok} ملفًا، ✗ ${fail}`);
