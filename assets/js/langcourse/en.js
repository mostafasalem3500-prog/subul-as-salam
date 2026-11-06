// =====================================================================
//  دورة الإنجليزية الدعوية للمشرف والداعية العربي
//  • «المصطلحات الشرعية» حرفيًّا من english_saheeh (Saheeh International — QuranEnc)،
//    تحقّقنا منها بتاريخ 2026-11-06، ويعاد التحقق آليًّا عند العرض.
//  • تركيز على أخطاء المتعلم العربي الشائعة في النطق والقواعد.
// =====================================================================
export default {
  code: 'en', name: 'English', ar: 'الإنجليزية', key: 'english_saheeh', tts: ['en-GB', 'en-US', 'en'],
  review: 'المصطلحات الشرعية من ترجمة Saheeh International المعتمدة في QuranEnc.',
  intro: 'الإنجليزية لغة الدعوة العالمية الأولى، لكن إملاءها لا يطابق نطقها دائمًا. هذه الدورة تركّز على ما يحتاجه الداعية العربي: الأصوات التي لا توجد في العربية، الجمل الجاهزة للحوار، والمصطلحات الشرعية كما في الترجمة المعتمدة.',
  facts: [['🌍', 'لغة الدعوة العالمية'], ['👂', 'الإملاء ≠ النطق'], ['🎯', 'أصوات p v th'], ['📖', 'Saheeh International']],
  levels: [
  { id: 'L0', cefr: 'Pre-A1', icon: '🔤', color: '#12735a', t: 'الأصوات الصعبة على العربي', d: 'p/b و v/f و th، المتحركات القصيرة والطويلة، الحروف الصامتة، النبر.', lessons: [
    { t: 'p و b، v و f', g: 'أن تفرّق بين الأصوات التي يخلطها العرب.', b: [
      ['table', ['الصوت', 'كيف تنطقه', 'مثال', 'مقابل'], [
        ['p', 'باء مهموسة مع نفَس (لا تهتز الحنجرة)', 'pray', 'bray'],
        ['b', 'باء عربية', 'book', ''],
        ['v', 'فاء مجهورة (تهتز الحنجرة)', 'very', 'fairy'],
        ['f', 'فاء عربية', 'faith', ''],
      ], [0, 2, 3]],
      ['tip', 'ضع يدك على حنجرتك: في <b>b</b> و<b>v</b> تشعر باهتزاز، وفي <b>p</b> و<b>f</b> لا اهتزاز. قل: <b>pray · prayer · prophet · patience</b>.'],
    ], v: [['pray', 'يصلّي / يدعو'], ['prophet', 'نبي'], ['patience', 'صبر'], ['very', 'جدًّا'], ['faith', 'إيمان'], ['believe', 'يؤمن']] },
    { t: 'th بصوتيها', g: 'أن تنطق ث و ذ في مكانهما.', b: [
      ['table', ['الصوت', 'العربي القريب', 'أمثلة'], [['th (مهموس)', 'ث', 'think · thank · three · truth'], ['th (مجهور)', 'ذ', 'the · this · that · mother']], [2]],
      ['tip', 'لا تقل «زيس» ولا «سينك»: أخرج طرف اللسان بين الأسنان كما في الثاء والذال العربيتين.'],
    ], v: [['thank you', 'شكرًا'], ['truth', 'الحق / الحقيقة'], ['the', 'الـ (أداة التعريف)'], ['this', 'هذا'], ['three', 'ثلاثة']] },
    { t: 'المتحركات والحروف الصامتة والنبر', g: 'أن تتجنّب أشهر أخطاء القراءة.', b: [
      ['table', ['قصير', 'طويل', 'ملاحظة'], [['ship', 'sheep', 'سفينة / خراف'], ['full', 'fool', 'ممتلئ / أحمق'], ['live', 'leave', 'يعيش / يغادر']], [0, 1]],
      ['tip', '<b>حروف لا تُنطق:</b> k في <b>know</b>، w في <b>write</b>، b في <b>doubt</b>، gh في <b>light</b>، l في <b>should</b>.'],
      ['tip', '<b>النبر يغيّر الفهم:</b> PRO-phet، re-LI-gion، Is-LAM (أو IS-lam)، mu-HAM-mad. اسمع المتحدث وقلّده.'],
    ], v: [['know', 'يعرف'], ['write', 'يكتب'], ['doubt', 'شك'], ['light', 'نور / ضوء'], ['religion', 'دين']] },
  ]},
  { id: 'L1', cefr: 'A1', icon: '👋', color: '#1c8f70', t: 'التحية والتعارف', d: 'التحيات، تقديم النفس، عبارات الدرس.', lessons: [
    { t: 'التحيات وتقديم النفس', g: 'أن تبدأ لقاءً بأدب.', b: [
      ['ex', [['Hello / Hi', 'مرحبًا'], ['Good morning', 'صباح الخير'], ['How are you?', 'كيف حالك؟'], ["I'm fine, thank you.", 'بخير، شكرًا.'], ['Nice to meet you.', 'سعيد بلقائك.'], ['My name is Ahmad.', 'اسمي أحمد.'], ["What's your name?", 'ما اسمك؟'], ["I'm from Egypt.", 'أنا من مصر.'], ["I'm a Muslim.", 'أنا مسلم.']]],
      ['dlg', [['A', 'Assalamu alaykum! Welcome.', 'السلام عليكم! أهلًا بك.'], ['B', 'Thank you. Nice to meet you.', 'شكرًا. سعيد بلقائك.'], ['A', "My name is Ahmad. What's your name?", 'اسمي أحمد. ما اسمك؟'], ['B', "I'm David.", 'أنا ديفيد.']]],
    ], v: [['How are you?', 'كيف حالك؟'], ['Nice to meet you', 'سعيد بلقائك'], ["What's your name?", 'ما اسمك؟'], ['Welcome', 'أهلًا بك']] },
    { t: 'عبارات الدرس', g: 'أن تدير درسًا وتطلب الإعادة.', b: [
      ['ex', [["I don't understand.", 'لا أفهم.'], ['Could you repeat, please?', 'هل تعيد من فضلك؟'], ['Slowly, please.', 'ببطء من فضلك.'], ['What does … mean?', 'ما معنى …؟'], ['Do you have any questions?', 'هل لديك أسئلة؟'], ['Well done!', 'أحسنت!'], ['Try again.', 'حاول مرة أخرى.'], ["Today's lesson", 'درس اليوم'], ['Homework', 'واجب']]],
    ], v: [["I don't understand", 'لا أفهم'], ['Could you repeat?', 'هل تعيد؟'], ['Well done!', 'أحسنت!'], ['Try again', 'حاول مجددًا'], ['Homework', 'واجب']] },
  ]},
  { id: 'L2', cefr: 'A2', icon: '🧩', color: '#23578a', t: 'قواعد يخطئ فيها العرب', d: 'to be، المضارع البسيط، الأسئلة بـ do، أداة التعريف.', lessons: [
    { t: 'فعل الكون والمضارع البسيط', g: 'أن تبني جملة صحيحة بلا «فعل مفقود».', b: [
      ['p', 'العربية تقول «الله واحد» بلا فعل، والإنجليزية تحتاج <b>is</b>: <b>Allah is One.</b>'],
      ['table', ['الضمير', 'to be', 'مضارع'], [['I', 'am', 'pray'], ['you / we / they', 'are', 'pray'], ['he / she', 'is', 'prays (+s!)']], [0, 1, 2]],
      ['ex', [['She prays five times a day.', 'تصلّي خمس مرات في اليوم.'], ['Do you pray?', 'هل تصلّي؟'], ["He doesn't understand.", 'هو لا يفهم.']]],
      ['tip', 'خطأ شائع: <b>I am agree</b> ✗ ← <b>I agree</b> ✓. و<b>discuss about</b> ✗ ← <b>discuss</b> ✓.'],
    ], v: [['I agree', 'أوافق'], ['Do you pray?', 'هل تصلّي؟'], ["He doesn't understand", 'هو لا يفهم'], ['five times a day', 'خمس مرات يوميًّا']] },
  ]},
  { id: 'L3', cefr: 'B1', icon: '💬', color: '#8a6714', t: 'محادثات الدعوة', d: 'التعريف بالإسلام ومتابعة المسلم الجديد.', lessons: [
    { t: 'حوار: بماذا يؤمن المسلمون؟', g: 'أن تجيب بألفاظ الترجمة المعتمدة.', b: [
      ['dlg', [['B', 'What do Muslims believe?', 'بماذا يؤمن المسلمون؟'], ['A', 'We believe in Allāh, His angels, His books, His messengers, and the Last Day.', 'نؤمن بالله وملائكته وكتبه ورسله واليوم الآخر.'], ['B', 'Who is Muhammad?', 'من محمد؟'], ['A', 'He is the Messenger of Allāh and the seal of the prophets.', 'هو رسول الله وخاتم النبيين.'], ['B', "I'd like to learn more.", 'أودّ أن أتعلّم أكثر.'], ['A', 'This book is for you. When can we meet again?', 'هذا الكتاب لك. متى نلتقي ثانية؟']]],
      ['verse', 4, 136, ['His angels', 'the Last Day']], ['verse', 33, 40, ['the Messenger of Allāh', 'seal']],
    ], v: [["I'd like to learn more", 'أودّ أن أتعلّم أكثر'], ['When can we meet again?', 'متى نلتقي ثانية؟'], ['This book is for you', 'هذا الكتاب لك']] },
    { t: 'متابعة المسلم الجديد', g: 'أن تتابع وتشجّع.', b: [
      ['ex', [['Have you prayed today?', 'هل صليت اليوم؟'], ["Don't worry, step by step.", 'لا تقلق، خطوة خطوة.'], ["I'll teach you.", 'سأعلّمك.'], ["You're doing great!", 'أنت تتقدم رائعًا!'], ['See you tomorrow, in shā’ Allāh.', 'نلتقي غدًا إن شاء الله.']]],
    ], v: [['Have you prayed today?', 'هل صليت اليوم؟'], ['step by step', 'خطوة خطوة'], ["I'll teach you", 'سأعلّمك']] },
  ]},
  { id: 'L4', cefr: 'B2', icon: '🕌', color: '#0b4d3c', t: 'المصطلحات الشرعية في سياقها', d: 'من ترجمة Saheeh International داخل آياتها.', lessons: [
    { t: 'الله تعالى ويوم الدين', g: '', terms: [['the Entirely Merciful', 'الرحمن', 1, 1], ['the Especially Merciful', 'الرحيم', 1, 1], ['Lord', 'الرب', 1, 2], ['the worlds', 'العالمين', 1, 2], ['Sovereign', 'مالك', 1, 4], ['Day of Recompense', 'يوم الدين', 1, 4], ['One', 'أحد', 112, 1], ['the Eternal Refuge', 'الصمد', 112, 2], ['the Ever-Living', 'الحي', 2, 255]] },
    { t: 'الإيمان والعبادة', g: '', terms: [['Islām', 'الإسلام', 3, 19], ['the religion', 'الدين', 3, 19], ['the unseen', 'الغيب', 2, 3], ['establish prayer', 'يقيمون الصلاة', 2, 3], ['zakāh', 'الزكاة', 2, 43], ['fasting', 'الصيام', 2, 183], ['His angels', 'ملائكته', 4, 136], ['the Last Day', 'اليوم الآخر', 4, 136], ['the Hereafter', 'الآخرة', 2, 4], ['we worship', 'نعبد', 1, 5]] },
    { t: 'القرآن والرسالة والأخلاق', g: '', terms: [['the Book', 'الكتاب', 2, 2], ['guidance', 'هدى', 2, 2], ['conscious of Allāh', 'المتقين', 2, 2], ['the Messenger of Allāh', 'رسول الله', 33, 40], ['the prophets', 'النبيين', 33, 40], ['the straight path', 'الصراط المستقيم', 1, 6], ['the successful', 'المفلحون', 2, 5], ['righteous deeds', 'الصالحات', 103, 3], ['patience', 'الصبر', 103, 3], ['loss', 'خُسر', 103, 2], ['parents', 'الوالدين', 17, 23], ['the mercy of Allāh', 'رحمة الله', 39, 53], ['forgives all sins', 'يغفر الذنوب جميعًا', 39, 53], ['grateful', 'اشكروا', 2, 152]] },
    { t: 'مفردات الدعوة', g: '', terms: [['Invite', 'ادعُ', 16, 125], ['wisdom', 'الحكمة', 16, 125], ['good instruction', 'الموعظة الحسنة', 16, 125], ['Recite', 'اتلُ', 29, 45], ['peoples and tribes', 'شعوبًا وقبائل', 49, 13], ['remember Me', 'فاذكروني', 2, 152]] },
  ]},
  { id: 'L5', cefr: 'C1', icon: '🎧', color: '#5b3f8c', t: 'القراءة والاستماع', d: 'القراءة المتوازية وكتب IslamHouse والتظليل.', lessons: [
    { t: 'القراءة المتوازية والتظليل', g: 'أن تقرأ وتسمع بفهم.', b: [
      ['steps', [['اقرأ الآية ثم ترجمتها بصوت مرتفع', ''], ['اختر مقطعًا مرئيًّا قصيرًا', 'وردد خلف المتكلم (Shadowing).'], ['لخّص ما سمعت بثلاث جمل', '']]],
      ['verse', 103, 3, ['righteous deeds', 'patience']],
      ['link', '📚 دليل الكتب', 'books'], ['link', '🎬 المرئيات', 'videos'], ['link', '🗂️ مكتبة IslamHouse', 'library'],
    ]},
  ]},
  { id: 'L6', cefr: 'C2', icon: '🏆', color: '#a52a21', t: 'الإتقان', d: 'أخطاء العرب الشائعة، أدوات الربط، والكلمة الدعوية.', lessons: [
    { t: 'أخطاء العرب الشائعة', g: 'أن تتكلم بدقة.', b: [
      ['table', ['الخطأ', 'الصواب', 'السبب'], [['open the light', 'turn on the light', 'ترجمة حرفية'], ['I am agree', 'I agree', 'agree فعل'], ['discuss about', 'discuss', 'متعدٍّ بنفسه'], ['He is a good man, isn’t it?', '…, isn’t he?', 'مطابقة الضمير'], ['informations', 'information', 'لا يُجمع']], [0, 1]],
    ], v: [['turn on the light', 'أشعل النور'], ['I agree', 'أوافق'], ['information', 'معلومات']] },
    { t: 'أدوات الربط والكلمة الدعوية', g: 'أن تلقي كلمة منظمة.', b: [
      ['ex', [['First, … Second, … Finally, …', 'أولًا … ثانيًا … أخيرًا …'], ['However', 'ومع ذلك'], ['Therefore', 'لذلك'], ['In addition', 'إضافة إلى ذلك'], ['For example', 'مثلًا'], ['Thank you for listening.', 'شكرًا لاستماعكم.']]],
      ['tip', 'اقرأ الآية بالعربية ثم انقل ترجمتها المعتمدة من الموقع حرفيًّا، ولا تترجم من عندك.'],
    ], v: [['However', 'ومع ذلك'], ['Therefore', 'لذلك'], ['In addition', 'إضافة إلى ذلك'], ['For example', 'مثلًا']] },
  ]},
  ],
};
