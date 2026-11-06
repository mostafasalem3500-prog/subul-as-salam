// تحويل رابط API إلى مسار ملف داخل مجلد data/ (النسخة الاحتياطية التي يولّدها GitHub Actions)
// يُستخدم في المتصفح وفي سكربت المزامنة scripts/sync-data.mjs معًا.
export const BASES = {
  ih: 'https://api3.islamhouse.com/v3/paV29H2gm56kvLPy',
  qe: 'https://quranenc.com/api/v1',
  he: 'https://hadeethenc.com/api/v1',
};

export function mirrorPath(url) {
  for (const [k, base] of Object.entries(BASES)) {
    if (url.startsWith(base)) {
      let rest = url.slice(base.length).replace(/^\/+/, '').replace(/\/json$/, '');
      rest = rest.replace(/\/?\?/, '/').replace(/[&=]/g, '_').replace(/\/+$/, '');
      return `data/${k}/${rest}.json`;
    }
  }
  return null;
}
