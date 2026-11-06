// =====================================================================
//  بطاقات الكلمات الدعوية — «تعلّم اللغة من الترجمة المعتمدة»
//  ---------------------------------------------------------------------
//  كل بطاقة مربوطة بآية؛ وفي الموقع تُعرض ترجمة الآية كاملة من QuranEnc
//  ليرى المتعلّم الكلمة في سياقها الأصلي.
//  • word: الكلمة كما وردت حرفيًّا في نص الترجمة المعتمدة (تحقّقنا من ورودها)
//  • key:  مفتاح الترجمة في QuranEnc
//  ما لا يوجد له شاهد موثّق من الترجمة لا يُضاف هنا.
//  تحقّق بتاريخ 2026-11-06 من:
//    swahili_rwwad (v1.0.5) — مركز رواد الترجمة
//    kinyarwanda_assoc (v1.0.5) — جمعية مسلمي رواندا
// =====================================================================

export const DAWAH_WORDS = {
  sw: { key: 'swahili_rwwad', cards: [
    { ar: 'الله',              word: 'Mwenyezi Mungu',   ref: [1, 1] },
    { ar: 'الرحمن',            word: 'Mwingi wa rehema', ref: [1, 1] },
    { ar: 'الرحيم',            word: 'Mwenye kurehemu',  ref: [1, 1] },
    { ar: 'الحمد',             word: 'Sifa njema',       ref: [1, 2] },
    { ar: 'الرب',              word: 'Mola Mlezi',       ref: [1, 2] },
    { ar: 'العالمين',          word: 'walimwengu',       ref: [1, 2] },
    { ar: 'يوم الدين',         word: 'Siku ya Malipo',   ref: [1, 4] },
    { ar: 'نعبد',              word: 'tunayeabudu',      ref: [1, 5] },
    { ar: 'اهدنا',             word: 'Tuongoe',          ref: [1, 6] },
    { ar: 'الصراط المستقيم',    word: 'njia iliyonyooka', ref: [1, 6] },
    { ar: 'قل',                word: 'Sema',             ref: [112, 1] },
    { ar: 'أحد',               word: 'wa Pekee',         ref: [112, 1] },
    { ar: 'الصمد',             word: 'Mkusudiwa',        ref: [112, 2] },
    { ar: 'الصلاة',            word: 'Sala',             ref: [2, 43] },
    { ar: 'الزكاة',            word: 'Zaka',             ref: [2, 43] },
    { ar: 'الرسول',            word: 'Mtume',            ref: [2, 285] },
    { ar: 'ادعُ (الدعوة)',      word: 'Lingania',         ref: [16, 125] },
    { ar: 'الحكمة',            word: 'hekima',           ref: [16, 125] },
    { ar: 'الموعظة الحسنة',     word: 'mawaidha mazuri',  ref: [16, 125] },
  ]},
  rw: { key: 'kinyarwanda_assoc', cards: [
    { ar: 'الله',              word: 'Allah',               ref: [1, 1] },
    { ar: 'الرحمن',            word: 'Nyirimpuhwe',         ref: [1, 1] },
    { ar: 'الرحيم',            word: 'Nyirimbabazi',        ref: [1, 1] },
    { ar: 'الحمد',             word: "Ishimwe n'ikuzo",     ref: [1, 2] },
    { ar: 'الرب',              word: 'Nyagasani',           ref: [1, 2] },
    { ar: 'العالمين',          word: 'ibiremwa byose',      ref: [1, 2] },
    { ar: 'يوم الدين',         word: "umunsi w'imperuka",   ref: [1, 4] },
    { ar: 'نعبد',              word: 'dusenga',             ref: [1, 5] },
    { ar: 'نستعين',            word: 'twiyambaza',          ref: [1, 5] },
    { ar: 'اهدنا',             word: 'Tuyobore',            ref: [1, 6] },
    { ar: 'الصراط المستقيم',    word: 'inzira igororotse',   ref: [1, 6] },
    { ar: 'الصلاة',            word: 'iswala',              ref: [2, 43] },
    { ar: 'الزكاة',            word: 'amaturo',             ref: [2, 43] },
    { ar: 'ادعُ (الدعوة)',      word: 'Hamagarira',          ref: [16, 125] },
    { ar: 'الحكمة',            word: 'ubushishozi',         ref: [16, 125] },
    { ar: 'الموعظة الحسنة',     word: 'inyigisho nziza',     ref: [16, 125] },
  ]},
  es: { key: 'spanish_garcia', cards: [] },
};
