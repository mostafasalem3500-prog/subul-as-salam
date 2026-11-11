// =====================================================================
//  المسارات الموضوعية — مجموعات قراءة من فهرس IslamHouse لكل لغة
//  اختيرت المواد بتاريخ 2026-11-11 من عناوينها العربية في الفهرس
//  (main/{books|articles}/ar/{lang}) ثم نُقّحت يدويًّا. هنا الأرقام فقط؛
//  العنوان والملف يُجلبان من IslamHouse عند العرض.
// =====================================================================
export const TRACKS = [
  { id: 'newm', icon: '🌱', color: '#1c8f70', n: { ar: 'خطواتي الأولى في الإسلام', en: 'My first steps in Islam', es: 'Mis primeros pasos en el Islam', sw: 'Hatua zangu za kwanza katika Uislamu' },
    ih: { sw: [2837687, 2842635, 2835781], rw: [2838049, 2837300, 717501], en: [2838874, 898875, 427536], es: [2828629, 2838723, 2838722] } },
  { id: 'why', icon: '🔭', color: '#23578a', n: { ar: 'لماذا الإسلام؟ الخالق والغاية من الحياة', en: 'Why Islam? The Creator and the purpose of life', es: '¿Por qué el Islam? El Creador y el propósito de la vida', sw: 'Kwa nini Uislamu? Muumba na lengo la maisha' },
    ih: { sw: [2839766, 2839762, 2839157, 2837298, 309041, 2845344], rw: [2839400, 2838819], en: [2844211, 2843095, 2838732, 2838721, 2838335, 2837649, 2836634, 2835692], es: [2838850, 2838849, 2838824, 2838806, 2837647, 2836358, 2835960, 2835427, 2845337] } },
  { id: 'jesus', icon: '🕊️', color: '#7A5BA6', n: { ar: 'عيسى عليه السلام والحوار مع أهل الكتاب', en: 'Jesus (peace be upon him) and dialogue with the People of the Book', es: 'Jesús (la paz sea con él) y el diálogo con la Gente del Libro', sw: 'Isa (amani iwe juu yake) na mazungumzo na Watu wa Kitabu' },
    ih: { sw: [371266, 371264, 371262, 395616], rw: [811056], en: [2838017, 2837463, 2837098, 2836264, 2835949, 2833643, 2832207, 2839409, 882803], es: [2837699, 2837672, 2836924, 2836570, 2834961, 2831419, 2830420, 2828902] } },
  { id: 'family', icon: '🏡', color: '#8a6714', n: { ar: 'الأسرة المسلمة', en: 'The Muslim family', es: 'La familia musulmana', sw: 'Familia ya Kiislamu' },
    ih: { sw: [2835774, 802701, 794843], rw: [818558, 885133], en: [2839059, 2833627, 823845, 428763, 428053], es: [385312, 329645] } },
  { id: 'women', icon: '🌷', color: '#a5456b', n: { ar: 'المرأة في الإسلام', en: 'Women in Islam', es: 'La mujer en el Islam', sw: 'Mwanamke katika Uislamu' },
    ih: { sw: [191551, 806862, 806868, 794836, 2837994], rw: [809904], en: [2843445, 2833667, 2837509, 430905, 430903, 430901, 430899, 430897], es: [440474, 344746, 2837532, 2829640, 822110, 440476, 440470, 440464] } },
  { id: 'youth', icon: '🧒', color: '#2F7F9F', n: { ar: 'الأطفال والناشئة', en: 'Children and youth', es: 'Niños y jóvenes', sw: 'Watoto na vijana' },
    ih: { sw: [2847024, 2843162], rw: [2836916], en: [428765], es: [2843170] } },
  { id: 'heart', icon: '💚', color: '#3B7A57', n: { ar: 'تزكية القلب: التوبة والصبر والتوكل', en: 'Purifying the heart: repentance, patience, reliance', es: 'Purificar el corazón: arrepentimiento, paciencia, confianza', sw: 'Kutakasa moyo: toba, subira, kutegemea' },
    ih: { sw: [2835777], rw: [885713], en: [2836652], es: [453216, 445971, 435279] } },
  { id: 'hereafter', icon: '🌅', color: '#a0522d', n: { ar: 'الدار الآخرة', en: 'The Hereafter', es: 'La otra vida', sw: 'Akhera' },
    ih: { sw: [775945, 735792], rw: [827075], en: [2833683, 427889, 427855, 427853, 2837656], es: [313522, 263687, 2780121, 585008, 438596] } },
];
export const trackName = (tr, ui) => tr.n[ui] || tr.n.en;
