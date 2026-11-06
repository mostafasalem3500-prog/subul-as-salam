// =====================================================================
//  إعدادات الموقع — هذا هو الملف الوحيد الذي تحتاج تعديله عند النشر
// =====================================================================
export const CONFIG = {
  brand: {
    nameAr: 'سُبُل السلام',
    nameLatin: 'Subul as-Salam',
    // الاسم مأخوذ من سورة المائدة (5:16)؛ نص الآية يُجلب من QuranEnc ولا يُكتب يدويًا
    verseRef: { sura: 5, aya: 16 },
    partner: 'IslamPort',
  },

  // ---- Supabase (قاعدة البيانات والدخول بالإيميل) ----
  // انسخها من: Supabase → Project Settings → API
  // اتركها فارغة ليعمل الموقع في «وضع التجربة» (البيانات تُحفظ في المتصفح فقط)
  supabaseUrl: '',
  supabaseAnonKey: '',

  // ---- لغات التعلّم ----
  // enabled=false: تظهر «قريبًا» ولا تُفعّل
  languages: {
    sw: { name: 'Kiswahili', ar: 'السواحيلية', dir: 'ltr', enabled: true,
          quran: ['swahili_rwwad', 'swahili_barawani'], hadeeth: 'sw', ih: 'sw', tts: 'sw' },
    rw: { name: 'Ikinyarwanda', ar: 'الكينيارواندية', dir: 'ltr', enabled: true,
          quran: ['kinyarwanda_assoc'], hadeeth: 'rw', ih: 'rw', tts: 'rw' },
    es: { name: 'Español', ar: 'الإسبانية', dir: 'ltr', enabled: true,
          quran: ['spanish_garcia', 'spanish_montada_latin', 'spanish_montada_eu'], hadeeth: 'es', ih: 'es', tts: 'es',
          sister: 'https://web-production-d19218.up.railway.app' },
    en: { name: 'English', ar: 'الإنجليزية', dir: 'ltr', enabled: false,
          quran: ['english_saheeh', 'english_rwwad'], hadeeth: 'en', ih: 'en', tts: 'en' },
  },
  defaultLang: 'sw',

  // ---- مصادر المحتوى ----
  // وسيط المصادر على استضافة PHP (Hostinger). على GitHub Pages يُتجاهل تلقائيًّا.
  proxy: 'api.php',

  api: {
    islamhouse: 'https://api3.islamhouse.com/v3/paV29H2gm56kvLPy',
    quranenc: 'https://quranenc.com/api/v1',
    hadeethenc: 'https://hadeethenc.com/api/v1',
    // تلاوات: everyayah.com (ملفات آية-آية)
    audio: {
      Alafasy_128kbps: 'مشاري العفاسي',
      Husary_128kbps: 'محمود خليل الحصري',
      Abdul_Basit_Murattal_192kbps: 'عبد الباسط عبد الصمد (مرتل)',
      Minshawy_Murattal_128kbps: 'محمد صديق المنشاوي (مرتل)',
    },
    audioBase: 'https://everyayah.com/data/',
  },

  // نسبة النجاح في اختبار المرحلة
  passScore: 80,
};
