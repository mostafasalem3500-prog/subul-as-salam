// دروس إضافية للكينيارواندية (تُدمج في المستويات عند التحميل) — 2026-11-11
// ⚠ الأمثلة العامة مسودة تحتاج مراجعة متحدث أصلي؛ المصطلحات الشرعية من kinyarwanda_assoc ويُتحقق منها آليًّا.
export default {
  L1: [
    { t: 'الطعام والضيافة', g: 'أن تقبل الضيافة وتشكر عليها.', b: [
      ['ex', [['ibiryo', 'طعام'], ['amazi', 'ماء'], ['icyayi', 'شاي'], ['umugati', 'خبز'], ['umuceri', 'أرز'], ['inyama', 'لحم'], ['imbuto', 'فواكه'], ['amata', 'حليب']]],
      ['ex', [['Karibu ku meza.', 'تفضّل إلى المائدة.'], ['Ndahaze, murakoze.', 'شبعت، شكرًا.'], ['Biraryoshye.', 'إنه لذيذ.'], ['Ndashonje.', 'أنا جائع.'], ['Mfite inyota.', 'أنا عطشان.'], ['Ese ibi ni halali?', 'هل هذا حلال؟']]],
      ['tip', 'كلمة <b>amazi</b> (ماء) وردت في الترجمة المعتمدة لآية الوضوء (المائدة 6).'],
    ], v: [['ibiryo', 'طعام'], ['amazi', 'ماء'], ['umugati', 'خبز'], ['umuceri', 'أرز'], ['imbuto', 'فواكه'], ['amata', 'حليب'], ['Ndahaze', 'شبعت'], ['Ndashonje', 'أنا جائع'], ['Biraryoshye', 'لذيذ']] },
    { t: 'الأماكن والاتجاهات', g: 'أن تسأل عن المسجد وتفهم الوصف.', b: [
      ['ex', [['umusigiti', 'مسجد'], ['inzu', 'بيت'], ['isoko', 'سوق'], ['ishuri', 'مدرسة'], ['ibitaro', 'مستشفى'], ['umuhanda', 'طريق / شارع'], ['iburyo', 'يمين'], ['ibumoso', 'يسار'], ['imbere', 'أمام'], ['hafi', 'قريب'], ['kure', 'بعيد']]],
      ['dlg', [['A', 'Mbabarira, umusigiti uri he?', 'عفوًا، أين المسجد؟'], ['B', 'Komeza imbere, hanyuma ukate iburyo.', 'امضِ إلى الأمام ثم انعطف يمينًا.'], ['A', 'Ni kure?', 'هل هو بعيد؟'], ['B', 'Oya, ni hafi y’isoko.', 'لا، قريب من السوق.'], ['A', 'Murakoze cyane.', 'شكرًا جزيلًا.']]],
    ], v: [['inzu', 'بيت'], ['isoko', 'سوق'], ['ibitaro', 'مستشفى'], ['umuhanda', 'طريق'], ['iburyo', 'يمين'], ['ibumoso', 'يسار'], ['imbere', 'أمام'], ['hafi', 'قريب'], ['kure', 'بعيد']] },
    { t: 'الجسم والصحة', g: 'أن تسأل عن صحة الطالب وتواسيه.', b: [
      ['ex', [['umutwe', 'رأس'], ['ukuboko / amaboko', 'يد / أيدٍ'], ['ikirenge / ibirenge', 'قدم / أقدام'], ['umutima', 'قلب'], ['umurwayi', 'مريض'], ['umuti', 'دواء']]],
      ['ex', [['Urarwaye?', 'هل أنت مريض؟'], ['Ndwaye umutwe.', 'عندي صداع.'], ['Ihangane.', 'اصبر / سلامتك.'], ['Allah agukize.', 'شفاك الله.']]],
      ['tip', 'أعضاء الوضوء في الترجمة المعتمدة (المائدة 6): <b>amaboko yanyu</b>، <b>mitwe yanyu</b>، <b>ibirenge byanyu</b>:'],
      ['verse', 5, 6, ['amaboko yanyu', 'mitwe yanyu', 'ibirenge byanyu']],
    ], v: [['umutwe', 'رأس'], ['ukuboko', 'يد'], ['ikirenge', 'قدم'], ['umutima', 'قلب'], ['umurwayi', 'مريض'], ['umuti', 'دواء'], ['Ihangane', 'اصبر / سلامتك']] },
  ],
  L2: [
    { t: 'عدّ الأشياء: مطابقة العدد للصنف', g: 'أن تقول: كتابان، ثلاثة أطفال، خمس صلوات.', b: [
      ['p', 'العدد من 1 إلى 7 يأخذ بادئة صنف المعدود:'],
      ['table', ['المعدود', '2', '3', '5'], [
        ['abantu (ناس)', 'abantu babiri', 'abantu batatu', 'abantu batanu'],
        ['ibitabo (كتب)', 'ibitabo bibiri', 'ibitabo bitatu', 'ibitabo bitanu'],
        ['amazina (أسماء)', 'amazina abiri', 'amazina atatu', 'amazina atanu'],
        ['iminsi (أيام)', 'iminsi ibiri', 'iminsi itatu', 'iminsi itanu'],
      ], [1, 2, 3]],
      ['ex', [['abana batatu', 'ثلاثة أطفال'], ['iswala eshanu', 'خمس صلوات'], ['umunsi umwe', 'يوم واحد']]],
    ], v: [['abantu babiri', 'شخصان'], ['ibitabo bitatu', 'ثلاثة كتب'], ['abana batatu', 'ثلاثة أطفال'], ['iswala eshanu', 'خمس صلوات'], ['umunsi umwe', 'يوم واحد']] },
    { t: 'الأمر والنهي والطلب', g: 'أن تأمر وتنهى بلطف.', b: [
      ['table', ['الصيغة', 'مثال', 'المعنى'], [
        ['الأمر (مفرد)', 'Soma!', 'اقرأ'], ['الأمر (جمع)', 'Nimusome!', 'اقرؤوا'], ['النهي', 'Ntusome', 'لا تقرأ'], ['النهي (جمع)', 'Ntimusome', 'لا تقرؤوا'], ['الاقتراح', 'Dusome', 'لنقرأ'],
      ], [1]],
      ['tip', 'الأمر للجمع يبدأ بـ <b>ni-mu-</b> كما في الترجمة المعتمدة (البقرة 21): <b>Nimugaragire</b> (اعبدوا)، وفي البقرة 152: <b>nimunyibuke</b> (فاذكروني).'],
      ['verse', 2, 152, ['nimunyibuke', 'munshimire']],
    ], v: [['Nimusome', 'اقرؤوا'], ['Ntusome', 'لا تقرأ'], ['Dusome', 'لنقرأ'], ['Nimugaragire', 'اعبدوا'], ['nimunyibuke', 'فاذكروني']] },
    { t: 'ضمير المفعول داخل الفعل', g: 'أن تقول: علّمني، سأساعدك، اهدنا.', b: [
      ['table', ['المفعول', 'العلامة', 'مثال', 'المعنى'], [
        ['ني', '-n- / -m-', 'aranyigisha', 'يعلّمني'], ['ك', '-ku- / -gu-', 'ndakwigisha', 'أعلّمك'], ['ه / ها', '-mu-', 'ndamwigisha', 'أعلّمه'], ['نا', '-tu- / -du-', 'aratwigisha', 'يعلّمنا'], ['هم', '-ba-', 'ndabigisha', 'أعلّمهم'],
      ], [1, 2]],
      ['tip', 'من الترجمة المعتمدة: <b>Tuyobore</b> = اهدنا (الفاتحة 6) — «tu» ضمير «نا» مع فعل الأمر yobora.'],
      ['verse', 1, 6, ['Tuyobore', 'inzira igororotse']],
      ['ex', [['Mfasha.', 'ساعدني.'], ['Nzagufasha.', 'سأساعدك.'], ['Allah aguhe umugisha.', 'بارك الله فيك.']]],
    ], v: [['aranyigisha', 'يعلّمني'], ['ndakwigisha', 'أعلّمك'], ['Mfasha', 'ساعدني'], ['Nzagufasha', 'سأساعدك'], ['Tuyobore', 'اهدنا']] },
  ],
  L3: [
    { t: 'حوار: في المسجد', g: 'أن تستقبل مسلمًا جديدًا في المسجد.', b: [
      ['dlg', [
        ['A', 'Murakaza neza mu musigiti, muvandimwe.', 'أهلًا بك في المسجد يا أخي.'],
        ['B', 'Murakoze. Ni ubwa mbere nje hano.', 'شكرًا. هذه أول مرة آتي هنا.'],
        ['A', 'Humura, ndakwereka. Tubanze dukarabe.', 'اطمئن، سأريك. لنتوضأ أولًا.'],
        ['B', 'Iswala itangira ryari?', 'متى تبدأ الصلاة؟'],
        ['A', 'Mu minota icumi. Hagarara iruhande rwanjye.', 'بعد عشر دقائق. قف بجانبي.'],
      ]],
      ['ex', [['Murakaza neza', 'أهلًا وسهلًا'], ['imamu', 'إمام'], ['umurongo', 'صف'], ['adhana', 'أذان'], ['Ijuma', 'الجمعة (الصلاة)']]],
    ], v: [['Murakaza neza', 'أهلًا وسهلًا'], ['ubwa mbere', 'أول مرة'], ['ndakwereka', 'سأريك'], ['umurongo', 'صف'], ['iruhande rwanjye', 'بجانبي'], ['iminota', 'دقائق']] },
    { t: 'المناسبات: رمضان والعيد والتهنئة والتعزية', g: 'أن تهنّئ وتعزّي.', b: [
      ['ex', [['Ramadhani nziza', 'رمضان مبارك'], ['Eid Mubarak', 'عيد مبارك'], ['Turakwishimiye kuba Umuyisilamu!', 'نهنّئك بإسلامك!'], ['Allah agukomeze.', 'ثبّتك الله.'], ['Ihangane cyane.', 'أحسن الله عزاءك.'], ['Allah amugirire impuhwe.', 'رحمه الله.']]],
      ['tip', 'شهر رمضان في الترجمة المعتمدة (البقرة 185): <b>Ukwezi kwa Ramadhani</b>.'],
      ['verse', 2, 185, ['Ukwezi kwa Ramadhani', 'Qur’an']],
    ], v: [['Eid Mubarak', 'عيد مبارك'], ['Allah agukomeze', 'ثبّتك الله'], ['Ihangane cyane', 'أحسن الله عزاءك'], ['Ukwezi kwa Ramadhani', 'شهر رمضان']] },
    { t: 'حوار: أسئلة شائعة', g: 'أن تجيب بهدوء وتحيل إلى المصدر.', b: [
      ['dlg', [
        ['B', 'Kubera iki mukora iswala inshuro eshanu?', 'لماذا تصلّون خمس مرات؟'],
        ['A', 'Kubera ko Allah yabidutegetse.', 'لأن الله أمرنا بذلك.'],
        ['B', 'Nasoma he byinshi?', 'أين أقرأ أكثر؟'],
        ['A', 'Nzaguha igitabo; urubuga rwa IslamHouse rufite ibitabo mu Kinyarwanda.', 'سأعطيك كتابًا؛ وموقع IslamHouse فيه كتب بالكينيارواندية.'],
      ]],
      ['tip', 'إن لم تعرف الجواب فقل: <b>Simbizi, ariko nzabaza.</b> (لا أعرف، لكن سأسأل).'],
      ['link', '📚 دليل الكتب بالكينيارواندية', 'books'],
    ], v: [['inshuro eshanu', 'خمس مرات'], ['yabidutegetse', 'أمرنا بذلك'], ['urubuga', 'موقع إلكتروني'], ['Simbizi', 'لا أعرف'], ['nzabaza', 'سأسأل']] },
  ],
  L4: [
    { t: 'الطهارة والعبادة والغاية من الخلق', g: 'ألفاظ الوضوء والعبادة والحج كما في آياتها.', terms: [
      ['isengesho', 'الصلاة', 5, 6], ['mukaraba', 'فاغسلوا', 5, 6], ['amaboko yanyu', 'أيديكم', 5, 6], ['mitwe yanyu', 'رؤوسكم', 5, 6], ['ibirenge byanyu', 'أرجلكم', 5, 6], ['Janaba', 'جُنُبًا', 5, 6],
      ['amajini n’abantu', 'الجن والإنس', 51, 56], ['bangaragire', 'ليعبدون', 51, 56], ['umutambagiro mutagatifu (Hija)', 'حج البيت', 3, 97],
      ['Ukwezi kwa Ramadhani', 'شهر رمضان', 2, 185], ['bahozaho iswala', 'ويقيموا الصلاة', 98, 5],
    ]},
  ],
};
