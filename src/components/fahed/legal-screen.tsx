'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, HelpCircle, Shield, Info, ChevronDown, ChevronUp, ChevronLeft, Users, Eye, Target, Phone, Mail, Globe, Heart, Star, MessageSquare } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { LOGO_BASE64 } from '@/lib/logo';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

type LegalTab = 'faq' | 'privacy' | 'about';

interface FaqItem {
  question: string;
  answer: string;
}

const faqItems: FaqItem[] = [
  {
    question: 'كيف أنشئ حساب في محفظة الجنوب؟',
    answer: 'يمكنك إنشاء حساب جديد بسهولة من خلال فتح التطبيق والضغط على زر "تسجيل جديد". ستحتاج إلى إدخال اسمك الكامل المكون من أربعة أجزاء (الاسم الأول، الاسم الثاني، الاسم الثالث، واسم العائلة)، بالإضافة إلى رقم البطاقة الشخصية والبريد الإلكتروني وكلمة المرور. بعد ذلك ستتمكن من إضافة رقم هاتفك اختيارياً. بعد التسجيل، يمكنك توثيق حسابك للاستفادة من جميع مميزات التطبيق.',
  },
  {
    question: 'كيف أوثق حسابي؟',
    answer: 'لتوثيق حسابك، انتقل إلى قسم التحقق من الهوية من خلال الإعدادات أو من الرابط الذي يظهر في الصفحة الرئيسية. ستحتاج إلى رفع صورة واضحة لبطاقتك الشخصية من الأمام والخلف، بالإضافة إلى صورة شخصية حديثة. سيتم مراجعة طلبك خلال 24 إلى 48 ساعة عمل. بعد الموافقة، ستحصل على شارة التوثيق ويمكنك استخدام جميع مميزات التطبيق بحرية بما في ذلك التحويلات والاستثمار وشراء الخدمات.',
  },
  {
    question: 'كيف أشحن رصيدي؟',
    answer: 'يمكنك شحن رصيدك بعدة طرق: الأولى هي التحويل البنكي حيث تقوم بتحويل المبلغ إلى الحساب البنكي المخصص ورفع إيصال التحويل في قسم الإيداع. الطريقة الثانية هي من خلال نقاط البيع المعتمدة المنتشرة في المحافظات الجنوبية. الطريقة الثالثة هي التحويل من مستخدم آخر في المحفظة. يتم اعتماد الإيداع خلال دقائق معدودة بعد التحقق من صحة العملية. كما يمكنك شحن رصيدك بثلاث عملات مختلفة: الريال اليمني والريال السعودي والدولار الأمريكي.',
  },
  {
    question: 'كيف أحول أموال لشخص آخر؟',
    answer: 'يمكنك تحويل الأموال بسهولة من خلال الضغط على زر التحويل في الصفحة الرئيسية. أدخل رقم حساب المستلم (رقم الحساب المكون من 6 أرقام) أو رقم هاتفه المسجل في المحفظة. ثم حدد المبلغ والعملة المراد تحويلها (ريال يمني، ريال سعودي، أو دولار أمريكي). قم بتأكيد العملية وسيتم التحويل فوراً. يجب أن يكون حسابك موثقاً لاستخدام خاصية التحويل. يمكنك أيضاً استخدام خاصية مسح QR لتحويل الأموال بسرعة.',
  },
  {
    question: 'ما هي العملات المدعومة في المحفظة؟',
    answer: 'تدعم محفظة الجنوب ثلاث عملات رئيسية: الريال اليمني (YER) وهو العملة المحلية الأساسية، الريال السعودي (SAR) لسهولة التعامل مع السوق السعودي، والدولار الأمريكي (USD) للمعاملات الدولية والاستثمار في العملات الرقمية. يمكنك الاحتفاظ بأرصدة منفصلة لكل عملة، وكذلك التبديل بين العملات من خلال خدمة تبادل العملات المدمجة في التطبيق بأسعار صرف تنافسية ومحدّثة يومياً. كما يمكنك استخدام الدولار الأمريكي للاستثمار في خطط USDT المختلفة.',
  },
  {
    question: 'كيف أستبدل العملات؟',
    answer: 'يمكنك تبادل العملات من خلال خدمة تبادل العملات المدمجة. انتقل إلى قسم التبادل من القائمة الرئيسية أو من خدمة "تبديل العملات" في الصفحة الرئيسية. اختر العملة المصدر والعملة الهدف، ثم حدد المبلغ المراد تبادله. سيظهر لك سعر الصرف الحالي والمبلغ الذي ستحصل عليه بعد خصم العمولة. قم بتأكيد العملية وسيتم التبادل فوراً مع خصم المبلغ من رصيد العملة المصدر وإضافته إلى رصيد العملة الهدف. أسعار الصرف محدّثة يومياً وتعكس الأسعار الحقيقية في السوق اليمني.',
  },
  {
    question: 'نسيت كلمة المرور، كيف أستعيدها؟',
    answer: 'يمكنك استرداد كلمة المرور بسهولة عبر رقم البطاقة الشخصية والبريد الإلكتروني. من صفحة تسجيل الدخول، اضغط على "نسيت كلمة المرور". أدخل رقم البطاقة الشخصية والبريد الإلكتروني المسجل في حسابك. سيتم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. اضغط على الرابط واتبع التعليمات لإنشاء كلمة مرور جديدة. إذا لم تستلم البريد الإلكتروني، تحقق من مجلد الرسائل غير المرغوب فيها. في حال واجهت أي مشكلة، يمكنك التواصل مع فريق الدعم الفني لمساعدتك في استعادة الوصول إلى حسابك.',
  },
  {
    question: 'ما هي رسوم التحويل والخدمات؟',
    answer: 'تختلف رسوم التحويل حسب نوع العملية: التحويلات بين المستخدمين داخل المحفظة مجانية تماماً. أما تبديل العملات فتكون هناك عمولة بنسبة 1.5% يتم عرضها قبل تأكيد العملية. رسوم شراء الخدمات والمنتجات الرقمية تختلف حسب نوع الخدمة ويتم عرضها بوضوح قبل التأكيد. لا توجد رسوم شهرية أو سنوية لاستخدام المحفظة. نسعى دائماً لتقديم أفضل الأسعار وأقل الرسوم لعملائنا.',
  },
  {
    question: 'كيف أشتري شدات ببجي أو فري فاير؟',
    answer: 'يمكنك شراء شدات الألعاب بسهولة من خلال قسم الخدمات الترفيهية في الصفحة الرئيسية. اختر اللعبة المطلوبة مثل ببجي موبايل أو فري فاير. أدخل معرف اللاعب الخاص بك (Player ID) ثم اختر الحزمة المناسبة من القائمة المتاحة. قم بتأكيد الشراء وسيتم خصم المبلغ من رصيدك وتنفيذ الطلب. يتوفر شحن فوري لبعض الخدمات وشحن يدوي يتم خلال دقائق للخدمات الأخرى. كما يمكنك شراء شدات لألعاب أخرى مثل فالورانت وكلاش رويال وروبلوكس وغيرها.',
  },
  {
    question: 'كيف أتواصل مع الدعم الفني؟',
    answer: 'يمكنك التواصل مع فريق الدعم الفني بعدة طرق: من خلال قسم الدعم والمساعدة داخل التطبيق حيث يمكنك فتح تذكرة دعم جديدة والرد عليها مباشرة. أيضاً يمكنك التواصل عبر البريد الإلكتروني المخصص للدعم. فريق الدعم متاح للاستجابة لاستفساراتك وحل مشاكلك في أسرع وقت ممكن، عادةً خلال ساعات قليلة. نحرص على تقديم خدمة عملاء متميزة على مدار الساعة لمساعدتك في أي وقت.',
  },
  {
    question: 'ما هو قسم الاستثمار؟',
    answer: 'قسم الاستثمار في محفظة الجنوب يتيح لك الاستثمار في عملة USDT (تيثر) بخطط متنوعة تناسب جميع المستثمرين. يمكنك الاختيار بين خطة يومية بعائد 0.5% وخطة أسبوعية بعائد 0.8% وخطة شهرية بعائد 1.2% وخطة ربع سنوية بعائد 1.5%. كل خطة يختلف معدل العائد والحد الأدنى للاستثمار. للبدء، انتقل إلى قسم استثمار الكريبتو من الصفحة الرئيسية، اختر الخطة المناسبة، وحدد مبلغ الاستثمار بالدولار الأمريكي. يجب أن يكون حسابك موثقاً للاستثمار. يمكنك متابعة أرباحك في أي وقت.',
  },
  {
    question: 'هل بياناتي آمنة؟',
    answer: 'نعم، نحرص على تأمين بياناتك وأموالك بأعلى معايير الأمان. نستخدم تقنية التشفير المتقدمة (SSL/TLS) لحماية جميع البيانات أثناء النقل والتخزين. كما نطبق نظام التحقق الثنائي (KYC) لضمان هوية المستخدمين. جميع المعاملات المالية تتم من خلال بوابات دفع آمنة ومعتمدة. نوفر خاصية رمز PIN لحماية الدخول إلى التطبيق. كما نقوم بمراقبة الأنشطة المشبوهة على مدار الساعة. فريق الدعم متاح للتعامل مع أي مشكلة أمنية فوراً.',
  },
];

const privacySections = [
  {
    title: 'مقدمة',
    icon: '📄',
    content: `مرحباً بك في محفظة الجنوب. نحن نلتزم بحماية خصوصيتك وبياناتك الشخصية. تسري سياسة الخصوصية هذه على جميع خدمات التطبيق وموقعه الإلكتروني. باستخدامك لتطبيق محفظة الجنوب، فإنك توافق على الممارسات الموضحة في هذه السياسة.

توضح هذه السياسة كيفية جمع واستخدام وحماية ومشاركة المعلومات الشخصية التي نحصل عليها منك عند استخدامك لتطبيقنا. نحن نأخذ خصوصيتك على محمل الجد ونتخذ جميع التدابير اللازمة لحماية بياناتك الشخصية والمالية.

يرجى قراءة هذه السياسة بعناية لفهم كيفية تعاملنا مع معلوماتك. إذا كنت لا توافق على أي جزء من هذه السياسة، يرجى عدم استخدام التطبيق.`,
  },
  {
    title: 'البيانات التي نجمعها',
    icon: '📋',
    content: `تجمع محفظة الجنوب البيانات الضرورية فقط لتقديم خدماتها بشكل فعال وآمن. تشمل البيانات التي نجمعها:

• الاسم الكامل (الأول، الثاني، الثالث، والعائلة)
• رقم البطاقة الشخصية
• رقم الهاتف
• البريد الإلكتروني
• صورة البطاقة الشخصية للتوثيق
• الصورة الشخصية
• المحافظة
• بيانات المعاملات المالية (التحويلات، الإيداعات، المشتريات، الاستثمارات)

كما نجمع بيانات استخدام التطبيق مثل سجل الدخول والعمليات لتحسين تجربة المستخدم وضمان الأمان. لا نجمع أي بيانات من جهات خارجية دون موافقتك الصريحة. جميع البيانات يتم جمعها بشفافية ولأغراض محددة فقط.`,
  },
  {
    title: 'استخدام البيانات',
    icon: '🔧',
    content: `نستخدم بياناتك لأغراض محددة وواضحة تشمل:

• تقديم خدمات المحفظة الرقمية بما في ذلك التحويلات والمدفوعات والاستثمار
• التحقق من هويتك وحماية حسابك من الاحتيال والوصول غير المصرح به
• التواصل معك بخصوص حسابك ومعاملاتك والتحديثات المهمة
• تحسين خدماتنا وتطوير ميزات جديدة بناءً على أنماط الاستخدام
• الامتثال للمتطلبات القانونية والتنظيمية في الجمهورية اليمنية
• منع غسل الأموال وتمويل الإرهاب وفقاً للتشريعات اليمنية المعمول بها
• إنشاء تقارير إحصائية مجهولة الهوية لتحليل الأداء

لا نبيع بياناتك الشخصية لأي جهة خارجية تحت أي ظرف من الظروف.`,
  },
  {
    title: 'حماية البيانات',
    icon: '🔒',
    content: `نتخذ إجراءات أمنية صارمة لحماية بياناتك الشخصية والمالية. تشمل هذه الإجراءات:

• تشفير جميع البيانات أثناء النقل والتخزين باستخدام بروتوكولات تشفير متقدمة (SSL/TLS 256-bit)
• تخزين البيانات على خوادم آمنة ومحمية بجدران حماية متقدمة (Firewalls)
• تقييد وصول الموظفين إلى البيانات الشخصية وفقاً لمبدأ الحد الأدنى من الصلاحيات
• مراقبة الأنشطة المشبوهة والوصول غير المصرح به على مدار الساعة (24/7)
• إجراء عمليات تدقيق أمني دورية لضمان سلامة الأنظمة واكتشاف الثغرات
• النسخ الاحتياطي المنتظم للبيانات في مواقع آمنة متعددة لضمان عدم فقدانها
• استخدام نظام التحقق الثنائي (2FA) لحماية حسابات المستخدمين
• تطبيق سياسة كلمات المرور القوية وتغييرها الدوري`,
  },
  {
    title: 'مشاركة البيانات مع أطراف ثالثة',
    icon: '🤝',
    content: `لا نشارك بياناتك الشخصية مع أطراف ثالثة إلا في الحالات التالية:

• عند موافقتك الصريحة والمسبقة على المشاركة
• مع مزودي خدمات الدفع المعتمدين لتنفيذ المعاملات المالية المطلوبة
• مع الجهات الحكومية المختصة عند الطلب القانوني الرسمي وفقاً للقانون
• مع شركات التدقيق المالي والقانوني عند الحاجة للامتثال التنظيمي
• مع مقدمي خدمات البنية التحتية التقنية اللازمة لتشغيل التطبيق (مثل خدمات الاستضافة السحابية)

في جميع الحالات، نضمن أن أي طرف ثالث يلتزم بمعايير حماية البيانات نفسها التي نطبقها أو بمعايير أعلى. نحن لا نبيع أو نتاجر أو نتشارك ببياناتك الشخصية تحت أي ظرف من الظروف.`,
  },
  {
    title: 'حقوق المستخدم',
    icon: '⚖️',
    content: `يحق لك كمستخدم لمحفظة الجنوب ممارسة الحقوق التالية:

• الوصول إلى بياناتك الشخصية المخزنة لدينا في أي وقت وطلب نسخة منها
• طلب تعديل أو تصحيح أي بيانات غير دقيقة أو غير محدّثة
• طلب حذف حسابك وبياناتك الشخصية وفقاً للإجراءات المحددة
• الاعتراض على معالجة بياناتك لأغراض تسويقية أو إعلانية
• سحب موافقتك على معالجة البيانات في أي وقت
• تقديم شكوى إلى الجهات المختصة في حال انتهاك خصوصيتك
• طلب توضيح حول كيفية استخدام بياناتك الشخصية
• طلب تقييد معالجة بياناتك في ظروف معينة

لتمارس أي من هذه الحقوق، يمكنك التواصل مع فريق الدعم من داخل التطبيق أو عبر البريد الإلكتروني الرسمي. سنقوم بالاستجابة لطلبك خلال 30 يوماً كحد أقصى.`,
  },
  {
    title: 'ملفات الارتباط (Cookies)',
    icon: '🍪',
    content: `تستخدم محفظة الجنوب ملفات تعريف الارتباط والتقنيات المماثلة لتحسين تجربة المستخدم. تشمل هذه الملفات:

• ملفات تعريف الارتباط الأساسية: ضرورية لعمل التطبيق مثل بيانات الجلسة وتفضيلات اللغة والمصادقة
• ملفات تعريف الارتباط الوظيفية: تساعد في تذكر إعداداتك وتفضيلاتك مثل الوضع الداكن والعملة المفضلة
• ملفات تعريف الارتباط التحليلية: تساعدنا في فهم كيفية استخدام التطبيق لتحسينه وتطويره
• ملفات تعريف الارتباط الأمنية: تساعد في منع الاحتيال والوصول غير المصرح به

يمكنك التحكم في تفضيلات ملفات تعريف الارتباط من إعدادات التطبيق. لا تستخدم ملفات تعريف الارتباط لجمع بيانات شخصية حساسة. يمكنك مسح ملفات تعريف الارتباط في أي وقت من إعدادات المتصفح.`,
  },
  {
    title: 'تعديلات سياسة الخصوصية',
    icon: '📝',
    content: `نحتفظ بالحق في تحديث وتعديل سياسة الخصوصية هذه في أي وقت لتعكس التغييرات في ممارساتنا أو لأسباب تشغيلية أو قانونية أو تنظيمية. في حال إجراء أي تغييرات جوهرية:

• سنقوم بإخطارك عبر التطبيق أو عبر البريد الإلكتروني قبل سريان التغييرات
• سنعرض السياسة المحدّثة داخل التطبيق مع تسليط الضوء على التغييرات
• استمرارك في استخدام التطبيق بعد التغييرات يعني موافقتك على السياسة الجديدة
• يمكنك طلب حذف بياناتك إذا لم توافق على السياسة المحدّثة

يُنصح بمراجعة هذه السياسة بشكل دوري. آخر تحديث على هذه السياسة كان في يناير 2026.`,
  },
  {
    title: 'التواصل معنا',
    icon: '📞',
    content: `إذا كان لديك أي أسئلة أو استفسارات حول سياسة الخصوصية هذه أو كيفية تعاملنا مع بياناتك الشخصية، يمكنك التواصل معنا عبر:

• صفحة الدعم داخل التطبيق
• البريد الإلكتروني الرسمي
• الموقع الإلكتروني

سنبذل قصارى جهدنا للرد على استفساراتك خلال 48 ساعة عمل. في حال رغبتك في تقديم شكوى تتعلق بالخصوصية، يمكنك أيضاً التواصل مع الجهات المختصة في الجمهورية اليمنية.

نحن نقدر ثقتك بنا ونسعى دائماً لتحسين ممارسات حماية البيانات لدينا.`,
  },
];

const aboutFeatures = [
  'محفظة رقمية متعددة العملات (ريال يمني، ريال سعودي، دولار أمريكي)',
  'تحويل أموال فوري وسريع بين المستخدمين مجاناً',
  'شراء خدمات الألعاب والترفيه (ببجي، فري فاير، فالورانت وغيرها)',
  'شحن رصيد الهاتف والإنترنت لجميع شبكات اليمن',
  'تبادل العملات بأسعار صرف تنافسية ومحدّثة',
  'استثمار في العملات الرقمية (USDT) بخطط متنوعة وعوائد مضمونة',
  'دفع فواتير الكهرباء والماء والخدمات الحكومية',
  'بطاقات رقمية (جوجل بلاي، آيتونز، بلايستيشن وغيرها)',
  'نظام توثيق هوية آمن وموثوق لحماية حسابك',
  'دعم فني على مدار الساعة لخدمتك',
  'تصميم عصري وسهل الاستخدام باللغة العربية',
  'أمان عالي بتشفير متقدم ورمز PIN لحماية الدخول',
];

const teamMembers = [
  { name: 'فريق التطوير', role: 'تطوير وصيانة التطبيق', icon: '💻' },
  { name: 'فريق الدعم', role: 'خدمة العملاء والمساندة', icon: '🎧' },
  { name: 'فريق الأمان', role: 'حماية البيانات والمعاملات', icon: '🛡️' },
  { name: 'فريق المالية', role: 'إدارة العمليات المالية', icon: '💰' },
];

export default function LegalScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setActiveScreen } = useAppStore();
  const [activeTab, setActiveTab] = useState<LegalTab>('faq');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [expandedPrivacy, setExpandedPrivacy] = useState<number | null>(null);

  // Support info from Firebase
  const [supportInfo, setSupportInfo] = useState<{
    supportEmail: string;
    supportWebsite: string;
    supportPhone: string;
    contactAdmin: string;
    contactAdminMessage: string;
  }>({
    supportEmail: '',
    supportWebsite: '',
    supportPhone: '',
    contactAdmin: '',
    contactAdminMessage: '',
  });

  useEffect(() => {
    const linksRef = ref(database, 'adminSettings/socialLinks');
    const unsubscribe = onValue(linksRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setSupportInfo({
          supportEmail: data.supportEmail || '',
          supportWebsite: data.supportWebsite || '',
          supportPhone: data.supportPhone || '',
          contactAdmin: data.contactAdmin || '',
          contactAdminMessage: data.contactAdminMessage || '',
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const tabs: { id: LegalTab; label: string; icon: typeof HelpCircle }[] = [
    { id: 'faq', label: 'الأسئلة الشائعة', icon: HelpCircle },
    { id: 'privacy', label: 'سياسة الخصوصية', icon: Shield },
    { id: 'about', label: 'لمحة عن التطبيق', icon: Info },
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-4 pb-3"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const prev = useAppStore.getState().previousScreen;
              useAppStore.getState().setActiveScreen(prev || '');
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <ArrowRight size={20} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
            المعلومات والسياسات
          </h1>
        </div>
      </motion.div>

      {/* Tab Buttons */}
      <div className="px-4 mb-4">
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl transition-all relative"
                style={{
                  background: isActive ? 'rgba(92,26,27,0.1)' : (isDark ? '#1A1A1A' : '#FFFFFF'),
                  border: isActive ? '1px solid rgba(92,26,27,0.3)' : `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                }}
              >
                <TabIcon size={16} strokeWidth={1.5} color={isActive ? '#5C1A1B' : (isDark ? '#666' : '#AAA')} />
                <span
                  className="text-[10px] font-bold whitespace-nowrap"
                  style={{ color: isActive ? '#5C1A1B' : (isDark ? '#666' : '#AAA') }}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: '#5C1A1B' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* ═══ FAQ Tab ═══ */}
          {activeTab === 'faq' && (
            <motion.div
              key="faq"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* FAQ intro */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.15)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle size={18} strokeWidth={1.5} color="#F59E0B" />
                  <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>الأسئلة الشائعة</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: isDark ? '#AAA' : '#666' }}>
                  إليك أكثر الأسئلة شيوعاً حول محفظة الجنوب. إذا لم تجد إجابتك، يمكنك التواصل مع فريق الدعم الفني.
                </p>
              </motion.div>

              {faqItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * index }}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: isDark ? '#1A1A1A' : '#FFFFFF',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                  }}
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-right"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: '#F59E0B12' }}
                    >
                      <span className="text-[10px] font-bold" style={{ color: '#F59E0B' }}>{index + 1}</span>
                    </div>
                    <span
                      className="flex-1 text-sm font-bold"
                      style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                    >
                      {item.question}
                    </span>
                    {expandedFaq === index ? (
                      <ChevronUp size={16} strokeWidth={1.5} color={isDark ? '#555' : '#AAA'} />
                    ) : (
                      <ChevronDown size={16} strokeWidth={1.5} color={isDark ? '#555' : '#AAA'} />
                    )}
                  </button>
                  <AnimatePresence>
                    {expandedFaq === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="px-4 pb-4 pt-0"
                          style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}` }}
                        >
                          <p
                            className="text-xs leading-relaxed pt-3"
                            style={{ color: isDark ? '#AAA' : '#666' }}
                          >
                            {item.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}

              {/* Contact support note */}
              <div className="rounded-2xl p-4 text-center" style={{ background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}` }}>
                <p className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>لم تجد إجابتك؟</p>
                <button onClick={() => setActiveScreen('support')}
                  className="mt-2 px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: '#F59E0B' }}>
                  تواصل مع الدعم الفني
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ Privacy Policy Tab ═══ */}
          {activeTab === 'privacy' && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Introduction */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(139,92,246,0.08)',
                  border: '1px solid rgba(139,92,246,0.15)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={18} strokeWidth={1.5} color="#8B5CF6" />
                  <span className="text-sm font-bold" style={{ color: '#8B5CF6' }}>سياسة الخصوصية</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: isDark ? '#AAA' : '#666' }}>
                  نحن في محفظة الجنوب نلتزم بحماية خصوصيتك وبياناتك الشخصية. توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية معلوماتك عند استخدامك لتطبيقنا. يرجى قراءتها بعناية لفهم حقوقك والتزاماتنا.
                </p>
              </motion.div>

              {privacySections.map((section, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * index }}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: isDark ? '#1A1A1A' : '#FFFFFF',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                  }}
                >
                  <button
                    onClick={() => setExpandedPrivacy(expandedPrivacy === index ? null : index)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-right"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
                      style={{ background: '#8B5CF612' }}
                    >
                      {section.icon}
                    </div>
                    <span
                      className="flex-1 text-sm font-bold"
                      style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                    >
                      {section.title}
                    </span>
                    {expandedPrivacy === index ? (
                      <ChevronUp size={16} strokeWidth={1.5} color={isDark ? '#555' : '#AAA'} />
                    ) : (
                      <ChevronDown size={16} strokeWidth={1.5} color={isDark ? '#555' : '#AAA'} />
                    )}
                  </button>
                  <AnimatePresence>
                    {expandedPrivacy === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="px-4 pb-4 pt-0"
                          style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}` }}
                        >
                          <div className="text-xs leading-relaxed pt-3 whitespace-pre-line" style={{ color: isDark ? '#AAA' : '#666' }}>
                            {section.title === 'التواصل معنا' ? (
                              <>
                                <p>{`إذا كان لديك أي أسئلة أو استفسارات حول سياسة الخصوصية هذه أو كيفية تعاملنا مع بياناتك الشخصية، يمكنك التواصل معنا عبر:`}</p>
                                <p className="mt-2">• صفحة الدعم داخل التطبيق</p>
                                {supportInfo.supportEmail && <p>• البريد الإلكتروني: {supportInfo.supportEmail}</p>}
                                {supportInfo.supportWebsite && <p>• الموقع الإلكتروني: {supportInfo.supportWebsite}</p>}
                                {!supportInfo.supportEmail && <p>• البريد الإلكتروني الرسمي</p>}
                                {!supportInfo.supportWebsite && <p>• الموقع الإلكتروني</p>}
                                <p className="mt-2">{`سنبذل قصارى جهدنا للرد على استفساراتك خلال 48 ساعة عمل. في حال رغبتك في تقديم شكوى تتعلق بالخصوصية، يمكنك أيضاً التواصل مع الجهات المختصة في الجمهورية اليمنية.`}</p>
                                <p className="mt-1">{`نحن نقدر ثقتك بنا ونسعى دائماً لتحسين ممارسات حماية البيانات لدينا.`}</p>
                              </>
                            ) : (
                              section.content
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}

              {/* Last updated */}
              <p className="text-[10px] text-center mt-4" style={{ color: isDark ? '#444' : '#CCC' }}>
                آخر تحديث: يناير 2026
              </p>
            </motion.div>
          )}

          {/* ═══ About Tab ═══ */}
          {activeTab === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* App Logo and Info */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-6 flex flex-col items-center"
                style={{
                  background: isDark ? '#1A1A1A' : '#FFFFFF',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                }}
              >
                <div
                  className="w-20 h-20 rounded-2xl overflow-hidden mb-4"
                  style={{ boxShadow: '0 8px 24px rgba(92,26,27,0.25)' }}
                >
                  <img src={LOGO_BASE64} alt="محفظة الجنوب" className="w-full h-full object-cover" />
                </div>
                <h2 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                  محفظة الجنوب
                </h2>
                <p className="text-sm mt-1" style={{ color: isDark ? '#888' : '#AAA' }} dir="ltr">South Wallet</p>
                <div
                  className="mt-3 px-4 py-1.5 rounded-lg"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)' }}
                >
                  <span className="text-xs font-bold" style={{ color: '#10B981' }} dir="ltr">v1.0.0</span>
                </div>
              </motion.div>

              {/* نبذة عن محفظة الجنوب */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl p-5"
                style={{
                  background: isDark ? '#1A1A1A' : '#FFFFFF',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Info size={18} strokeWidth={1.5} color="#10B981" />
                  <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    نبذة عن محفظة الجنوب
                  </h3>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: isDark ? '#AAA' : '#666' }}>
                  محفظة الجنوب هي محفظة رقمية يمنية متكاملة تهدف إلى تسهيل المعاملات المالية الرقمية للمواطنين في المحافظات الجنوبية واليمن بشكل عام. توفر المحفظة مجموعة شاملة من الخدمات المالية والرقمية تشمل التحويلات بين المستخدمين، شراء المنتجات الرقمية والترفيهية، شحن رصيد الهاتف والإنترنت، تبادل العملات بأسعار تنافسية، والاستثمار في العملات الرقمية. تم تصميم التطبيق خصيصاً ليناسب احتياجات السوق اليمني مع دعم كامل للغة العربية والعملات المحلية.
                </p>
                <p className="text-xs leading-relaxed mt-2" style={{ color: isDark ? '#AAA' : '#666' }}>
                  تأسست المحفظة لتكون الحل الأمثل للمعاملات المالية الرقمية في اليمن، حيث توفر منصة آمنة وسهلة الاستخدام تجمع بين التكنولوجيا الحديثة واحتياجات المستخدم اليمني. نسعى لتقديم تجربة مالية رقمية متكاملة تنافس أفضل التطبيقات العالمية.
                </p>
              </motion.div>

              {/* رؤيتنا ورسالتنا */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl p-5"
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.15)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Eye size={18} strokeWidth={1.5} color="#10B981" />
                  <h3 className="text-sm font-bold" style={{ color: '#10B981' }}>رؤيتنا ورسالتنا</h3>
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: isDark ? '#AAA' : '#666' }}>
                  <span className="font-bold" style={{ color: '#10B981' }}>رؤيتنا:</span> نسعى لأن نكون المحفظة الرقمية الأولى في اليمن والمنطقة، توفيراً لخدمات مالية رقمية شاملة ومبتكرة تمكّن كل مواطن من إدارة أمواله بسهولة وأمان. نؤمن بأن المستقبل هو المستقبل الرقمي، ونعمل على تسهيل الوصول إلى الخدمات المالية للجميع دون استثناء، مع الحفاظ على أعلى معايير الأمان والشفافية.
                </p>
                <p className="text-xs leading-relaxed" style={{ color: isDark ? '#AAA' : '#666' }}>
                  <span className="font-bold" style={{ color: '#10B981' }}>رسالتنا:</span> تمكين المواطن اليمني من إدارة أمواله وتنفيذ معاملاته المالية بكل سهولة وأمان من خلال منصة رقمية متكاملة تجمع بين التكنولوجيا الحديثة واحتياجات السوق المحلي، مع الالتزام بأعلى معايير الأمان والشفافية وتقديم خدمة عملاء متميزة.
                </p>
              </motion.div>

              {/* العملات المدعومة */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="rounded-2xl p-5"
                style={{
                  background: isDark ? '#1A1A1A' : '#FFFFFF',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={18} strokeWidth={1.5} color="#5C1A1B" />
                  <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>العملات المدعومة</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl text-center" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                    <div className="text-2xl mb-1">🇾🇪</div>
                    <p className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>ريال يمني</p>
                    <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }} dir="ltr">YER</p>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                    <div className="text-2xl mb-1">🇸🇦</div>
                    <p className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>ريال سعودي</p>
                    <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }} dir="ltr">SAR</p>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                    <div className="text-2xl mb-1">🇺🇸</div>
                    <p className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>دولار أمريكي</p>
                    <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }} dir="ltr">USD</p>
                  </div>
                </div>
              </motion.div>

              {/* مميزات التطبيق */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: isDark ? '#1A1A1A' : '#FFFFFF',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                }}
              >
                <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                  <Star size={16} strokeWidth={1.5} color="#10B981" />
                  <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    مميزات التطبيق
                  </h3>
                </div>
                {aboutFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-5 py-3"
                    style={{
                      borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: '#10B98112' }}
                    >
                      <span className="text-[9px] font-bold" style={{ color: '#10B981' }}>{index + 1}</span>
                    </div>
                    <span className="text-xs" style={{ color: isDark ? '#CCC' : '#444' }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </motion.div>

              {/* فريق العمل */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl p-5"
                style={{
                  background: isDark ? '#1A1A1A' : '#FFFFFF',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Users size={18} strokeWidth={1.5} color="#10B981" />
                  <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    فريق العمل
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {teamMembers.map((member, index) => (
                    <div key={index} className="p-3 rounded-xl text-center" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                      <div className="text-2xl mb-2">{member.icon}</div>
                      <p className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{member.name}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: isDark ? '#888' : '#AAA' }}>{member.role}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* معلومات التواصل - Dynamic from Firebase */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-2xl p-5"
                style={{
                  background: isDark ? '#1A1A1A' : '#FFFFFF',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Phone size={18} strokeWidth={1.5} color="#10B981" />
                  <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    معلومات التواصل
                  </h3>
                </div>
                <div className="space-y-3">
                  {supportInfo.supportEmail && (
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.1)' }}>
                        <Mail size={14} color="#5C1A1B" />
                      </div>
                      <div>
                        <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>البريد الإلكتروني</p>
                        <p className="text-xs font-bold" style={{ color: isDark ? '#CCC' : '#444' }} dir="ltr">{supportInfo.supportEmail}</p>
                      </div>
                    </div>
                  )}
                  {supportInfo.supportWebsite && (
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                        <Globe size={14} color="#10B981" />
                      </div>
                      <div>
                        <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>الموقع الإلكتروني</p>
                        <p className="text-xs font-bold" style={{ color: isDark ? '#CCC' : '#444' }} dir="ltr">{supportInfo.supportWebsite}</p>
                      </div>
                    </div>
                  )}
                  {supportInfo.supportPhone && (
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                        <Phone size={14} color="#8B5CF6" />
                      </div>
                      <div>
                        <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>هاتف الدعم</p>
                        <p className="text-xs font-bold" style={{ color: isDark ? '#CCC' : '#444' }} dir="ltr">{supportInfo.supportPhone}</p>
                      </div>
                    </div>
                  )}
                  {supportInfo.contactAdminMessage && (
                    <p className="text-xs leading-relaxed" style={{ color: isDark ? '#AAA' : '#666' }}>
                      {supportInfo.contactAdminMessage}
                    </p>
                  )}
                  <button
                    onClick={() => setActiveScreen('support')}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl active:scale-95 transition-transform"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
                  >
                    <MessageSquare size={16} strokeWidth={1.5} color="#10B981" />
                    <span className="text-sm font-bold" style={{ color: '#10B981' }}>تواصل معنا</span>
                  </button>
                </div>
              </motion.div>

              {/* License Info */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl p-5"
                style={{
                  background: isDark ? '#1A1A1A' : '#FFFFFF',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={16} strokeWidth={1.5} color="#8B5CF6" />
                  <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    معلومات الترخيص
                  </h3>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: isDark ? '#AAA' : '#666' }}>
                  محفظة الجنوب (South Wallet) - الإصدار 1.0.0. جميع الحقوق محفوظة © 2026. هذا التطبيق مرخص للاستخدام الشخصي وغير التجاري فقط. يحظر نسخ أو تعديل أو توزيع أي جزء من التطبيق دون إذن كتابي مسبق من مطور التطبيق. التطبيق محمي بموجب قوانين حقوق الملكية الفكرية المعمول بها في الجمهورية اليمنية.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
