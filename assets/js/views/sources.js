import { CONFIG } from '../config.js';
import { esc } from '../core.js';
import { t } from '../i18n.js';
import { pageHead } from './components.js';

const SRC = [
  ['🗃️', 'IslamHouse.com — دار الإسلام', 'https://islamhouse.com', 'الكتب والمقالات والصوتيات والمرئيات والمطويات بلغة الطالب، عبر IslamHouse API v3.'],
  ['📖', 'QuranEnc.com — موسوعة القرآن الكريم', 'https://quranenc.com', 'النص العثماني وترجمات معاني القرآن المعتمدة: السواحيلية (مركز رواد الترجمة، وعلي محسن البرواني)، والكينيارواندية (جمعية مسلمي رواندا)، والإسبانية (عيسى غارسيا ومركز نور الدولي).'],
  ['🌿', 'HadeethEnc.com — موسوعة الأحاديث النبوية', 'https://hadeethenc.com', 'الأحاديث مترجمة مع الشرح والدرجة والتخريج.'],
  ['🕌', 'مجمع الملك فهد لطباعة المصحف الشريف', 'https://qurancomplex.gov.sa', 'مصحف المدينة النبوية، وترجمات معاني القرآن، وخطوط المصحف للحاسب.'],
  ['🕋', 'رسالة الحرمين — رئاسة الشؤون الدينية بالمسجد الحرام والمسجد النبوي', 'https://risala.prh.gov.sa', 'كتب ومطويات إرشادية بلغات العالم، منها السواحيلية.'],
  ['📚', 'الرئاسة العامة للبحوث العلمية والإفتاء', 'https://www.alifta.gov.sa', 'الفتاوى المعتمدة: يُحال إليها الطالب والمشرف ولا يُفتي الموقع.'],
  ['🏛️', 'وزارة الشؤون الإسلامية والدعوة والإرشاد', 'https://www.moia.gov.sa', 'الجهة المشرفة على مجمع الملك فهد وبرامج الدعوة.'],
  ['🎧', 'EveryAyah.com', 'https://everyayah.com', 'تلاوات آية آية لقرّاء معروفين.'],
  ['🤝', 'جمعية خدمة المحتوى الإسلامي باللغات', 'https://islamiccontent.org', 'الجهة القائمة على IslamHouse وQuranEnc وHadeethEnc.'],
  ['💻', 'بوابة المحتوى الإسلامي للمطورين (GitHub)', 'https://github.com/IslamHouse-API/multilingual-quran-hadith-islamic-content-database-api-hub', 'توثيق الواجهات وسياسة إعادة النشر التي يلتزمها الموقع.'],
  ['🇪🇸', 'رفيق الداعية (الموقع الشقيق)', CONFIG.languages.es.sister, 'منه دروس الداعية ودليله ومنهج «اكتشف الإسلام» ومنهج المسلم الجديد والرسائل الإسبانية.'],
];

export default function sources() {
  return `${pageHead('📜 ' + t('sources'))}
  <div class="wrap stack" style="padding-top:20px" lang="ar">
    <div class="card stack">
      <h2>منهج الموقع</h2>
      <ul class="steps">
        <li>على منهج أهل السنة والجماعة، والمرجع القرآن والسنة الصحيحة بفهم السلف الصالح.</li>
        <li><b>لا ترجمة من عندنا للمحتوى الشرعي:</b> كل آية وحديث وكتاب يُعرض كما هو من مصدره بلغة الطالب، مع اسم المصدر والمترجم ورقم النسخة.</li>
        <li>نصوص واجهة الموقع (الأزرار والعناوين) مسوّدة تحتاج مراجعة متحدث أصلي، وتُعدَّل في ملف واحد: <code>assets/js/i18n.js</code>.</li>
        <li>المحتوى المؤلَّف من «رفيق الداعية» نصّ مستقل للداعية والمشرف، ويُوسم بـ«يحتاج مراجعة طالب علم» حيث نبّه المراجعون.</li>
        <li>الاختبارات تُبنى آليًّا من الترجمات المعتمدة نفسها؛ وأسئلة البنك يكتبها فريق التعليم ويذكر مرجعها.</li>
        <li>الموقع لا يُفتي؛ ويُحال السائل إلى أهل العلم والجهات الرسمية.</li>
      </ul>
      <p class="notice small">التزامًا بسياسة IslamHouse وQuranEnc وHadeethEnc: لا تعديل على النص الأصلي، والمصدر مذكور، ولا إعلانات بجوار القرآن والحديث. لإرسال ملاحظة علمية أو لغوية على الترجمة: <a href="mailto:admin@islamhouse.com">admin@islamhouse.com</a>.</p>
    </div>
    <div class="grid">${SRC.map(([ic, n, u, d]) => `<a class="card lift item" href="${esc(u)}" target="_blank" rel="noopener"><span class="ic">${ic}</span><span><h3>${esc(n)}</h3><span class="desc" style="-webkit-line-clamp:4">${esc(d)}</span><span class="tiny muted" dir="ltr">${esc(u.replace(/^https?:\/\//, ''))}</span></span></a>`).join('')}</div>
    <div class="card stack"><h2>قابلية التوسّع</h2>
      <p>إضافة لغة جديدة (مثل الإنجليزية أو الكيروندية): سطر واحد في <code>assets/js/config.js</code> يحدد رموز اللغة في المصادر الثلاثة، ثم أرقام مواد إسلام هاوس لكل محطة في <code>curriculum.js</code>. المصادر تدعم 147 لغة.</p>
    </div>
  </div>`;
}
