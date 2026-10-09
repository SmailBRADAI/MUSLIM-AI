import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type Language = "ar" | "en" | "ur";
type Screen = "home" | "guide" | "prayers" | "map" | "settings";
type IconName =
  | "arrow"
  | "book"
  | "check"
  | "chevron"
  | "compass"
  | "download"
  | "headphones"
  | "home"
  | "kaaba"
  | "map"
  | "menu"
  | "moon"
  | "prayer"
  | "settings"
  | "shield"
  | "sparkle"
  | "volume";

// Placeholder copy imported from the Figma Make prototype. Ritual wording, ruling labels and
// supplications are NOT reviewed yet and must be replaced by sourced, scholar-approved content.
const copy = {
  ar: {
    appName: "رَفِيق",
    greeting: "السلام عليكم",
    title: "رفيقك في رحلةٍ مباركة",
    subtitle: "خطوات واضحة، وإرشادات موثوقة في كل مرحلة من مناسكك.",
    offline: "دليلك جاهز دون إنترنت",
    offlineMeta: "العربية · آخر تحديث ١٤ ذو القعدة",
    journey: "رحلتك تبدأ هنا",
    journeyHint: "اختر النسك الذي تريد أداءه",
    umrah: "مناسك العمرة",
    umrahHint: "دليل من الإحرام إلى التحلّل",
    hajj: "مناسك الحج",
    hajjHint: "مراحل الحج مرتبة حسب الأيام",
    continue: "متابعة رحلتي",
    current: "الخطوة الحالية: الطواف",
    explore: "أدوات تساعدك",
    duas: "الأدعية",
    duasHint: "أدعية مختارة وموثوقة",
    map: "الخريطة",
    mapHint: "معالم أساسية دون إنترنت",
    home: "الرئيسية",
    guide: "دليلي",
    settings: "الإعدادات",
    umrahGuide: "دليل العمرة",
    tawaf: "الطواف حول الكعبة",
    step: "الخطوة ٢ من ٥",
    progress: "تقدّمك في الدليل",
    instructionTitle: "ما الذي ينبغي فعله؟",
    instruction:
      "ابدأ من محاذاة الحجر الأسود، واجعل الكعبة عن يسارك. طُف سبعة أشواط بهدوء، واذكر الله بما تيسّر.",
    reviewStatus: "بانتظار المراجعة العلمية",
    ruling: "ركن",
    audio: "استمع إلى الشرح",
    audioTime: "دقيقتان",
    relatedDuas: "الأدعية ذات الصلة",
    details: "التفاصيل والأخطاء الشائعة",
    complete: "تمّت الخطوة — متابعة",
    previous: "الخطوة السابقة",
    next: "التالي: ركعتا الطواف",
    reassurance: "يُحفظ تقدّمك تلقائياً على هذا الجهاز",
    notAvailable: "هذا القسم جاهز للعمل دون إنترنت",
    back: "العودة إلى الرئيسية",
  },
  en: {
    appName: "RAFIQ",
    greeting: "Assalamu alaikum",
    title: "Your companion for a blessed journey",
    subtitle: "Clear steps and trusted guidance throughout every stage of your rituals.",
    offline: "Your guide is ready offline",
    offlineMeta: "English · Updated 14 Dhu al-Qi’dah",
    journey: "Your journey starts here",
    journeyHint: "Choose the pilgrimage you wish to perform",
    umrah: "Umrah rituals",
    umrahHint: "From Ihram through completion",
    hajj: "Hajj rituals",
    hajjHint: "Hajj stages organized by day",
    continue: "Continue my journey",
    current: "Current step: Tawaf",
    explore: "Helpful tools",
    duas: "Supplications",
    duasHint: "Selected and verified prayers",
    map: "Essential map",
    mapHint: "Key landmarks available offline",
    home: "Home",
    guide: "My guide",
    settings: "Settings",
    umrahGuide: "Umrah guide",
    tawaf: "Tawaf around the Kaaba",
    step: "Step 2 of 5",
    progress: "Guide progress",
    instructionTitle: "What should I do?",
    instruction:
      "Begin in line with the Black Stone, keeping the Kaaba to your left. Complete seven calm circuits and remember Allah as you are able.",
    reviewStatus: "Pending scholarly review",
    ruling: "Pillar",
    audio: "Listen to the explanation",
    audioTime: "2 minutes",
    relatedDuas: "Related supplications",
    details: "Details and common mistakes",
    complete: "Mark complete — Continue",
    previous: "Previous step",
    next: "Next: Two rak’ahs after Tawaf",
    reassurance: "Your progress is saved automatically on this device",
    notAvailable: "This section is ready to use offline",
    back: "Back to home",
  },
  ur: {
    appName: "رَفِیق",
    greeting: "السلام علیکم",
    title: "آپ کے بابرکت سفر کا ساتھی",
    subtitle: "مناسک کے ہر مرحلے میں واضح اقدامات اور قابلِ اعتماد رہنمائی۔",
    offline: "آپ کی رہنمائی آف لائن تیار ہے",
    offlineMeta: "اردو · آخری اپ ڈیٹ ۱۴ ذوالقعدہ",
    journey: "آپ کا سفر یہاں سے شروع ہوتا ہے",
    journeyHint: "اپنی عبادت کا انتخاب کریں",
    umrah: "مناسکِ عمرہ",
    umrahHint: "احرام سے تکمیل تک مکمل رہنمائی",
    hajj: "مناسکِ حج",
    hajjHint: "دنوں کے لحاظ سے حج کے مراحل",
    continue: "اپنا سفر جاری رکھیں",
    current: "موجودہ مرحلہ: طواف",
    explore: "مددگار سہولیات",
    duas: "دعائیں",
    duasHint: "منتخب اور مستند دعائیں",
    map: "ضروری نقشہ",
    mapHint: "اہم مقامات آف لائن دستیاب",
    home: "ہوم",
    guide: "میری رہنمائی",
    settings: "ترتیبات",
    umrahGuide: "رہنمائے عمرہ",
    tawaf: "بیت اللہ کا طواف",
    step: "مرحلہ ۲ از ۵",
    progress: "رہنمائی میں پیش رفت",
    instructionTitle: "مجھے کیا کرنا چاہیے؟",
    instruction:
      "حجرِ اسود کے سامنے سے آغاز کریں، کعبہ کو بائیں جانب رکھیں۔ سکون سے سات چکر مکمل کریں اور حسبِ استطاعت اللہ کا ذکر کریں۔",
    reviewStatus: "علمی نظرثانی زیرِ التوا",
    ruling: "رکن",
    audio: "وضاحت سنیں",
    audioTime: "۲ منٹ",
    relatedDuas: "متعلقہ دعائیں",
    details: "تفصیلات اور عام غلطیاں",
    complete: "مرحلہ مکمل — آگے بڑھیں",
    previous: "پچھلا مرحلہ",
    next: "اگلا: طواف کے بعد دو رکعت",
    reassurance: "آپ کی پیش رفت اس ڈیوائس پر خودکار طور پر محفوظ ہوتی ہے",
    notAvailable: "یہ حصہ آف لائن استعمال کے لیے تیار ہے",
    back: "ہوم پر واپس جائیں",
  },
};

type Copy = typeof copy.ar;

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the app still works for this session.
  }
}

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="m9 18 6-6-6-6" />,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    compass: <><circle cx="12" cy="12" r="9" /><path d="m16 8-2.7 5.3L8 16l2.7-5.3Z" /></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 19h14" /></>,
    headphones: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M18 19h-1a2 2 0 0 1-2-2v-3h5v3a2 2 0 0 1-2 2ZM6 19H5a2 2 0 0 1-2-2v-3h5v3a2 2 0 0 1-2 2Z" /></>,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    kaaba: <><path d="m5 6 7-3 7 3v13l-7 2-7-2Z" /><path d="M5 9h14M12 3v18M15 9v4h4" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><path d="M9 3v15m6-12v15" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h10" /></>,
    moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
    prayer: <><path d="M12 3v4M8.5 5.5l2 2M15.5 5.5l-2 2" /><path d="M6 20h12l-1-7a5 5 0 0 0-10 0Z" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    shield: <><path d="M12 3 5 6v5c0 4.6 3 8.5 7 10 4-1.5 7-5.4 7-10V6Z" /><path d="m9 12 2 2 4-5" /></>,
    sparkle: <path d="m12 3 1.4 4.1L17 9l-3.6 1.9L12 15l-1.4-4.1L7 9l3.6-1.9Z" />,
    volume: <><path d="M11 5 6 9H3v6h3l5 4Z" /><path d="M15 9.5a4 4 0 0 1 0 5M17.5 7a7.5 7.5 0 0 1 0 10" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const languageLabels: Record<Language, { short: string; name: string }> = {
  ar: { short: "ع", name: "العربية" },
  en: { short: "EN", name: "English" },
  ur: { short: "اُ", name: "اردو" },
};

function AppHeader({ language, setLanguage }: { language: Language; setLanguage: (lang: Language) => void }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark"><Icon name="moon" size={19} /></span>
        <span>{copy[language].appName}</span>
      </div>
      <div className="language-switcher" role="group" aria-label="Language">
        {(["ar", "en", "ur"] as Language[]).map((lang) => (
          <button
            className={language === lang ? "language active" : "language"}
            onClick={() => setLanguage(lang)}
            aria-pressed={language === lang}
            aria-label={languageLabels[lang].name}
            lang={lang}
            key={lang}
          >
            {languageLabels[lang].short}
          </button>
        ))}
      </div>
    </header>
  );
}

function BottomNav({ screen, setScreen, t }: { screen: Screen; setScreen: (s: Screen) => void; t: Copy }) {
  const items: { screen: Screen; icon: IconName; label: string }[] = [
    { screen: "home", icon: "home", label: t.home },
    { screen: "guide", icon: "book", label: t.guide },
    { screen: "prayers", icon: "prayer", label: t.duas },
    { screen: "settings", icon: "settings", label: t.settings },
  ];
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map((item) => (
        <button
          key={item.screen}
          onClick={() => setScreen(item.screen)}
          className={screen === item.screen ? "nav-item active" : "nav-item"}
          aria-current={screen === item.screen ? "page" : undefined}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function Home({ t, setScreen }: { t: Copy; setScreen: (s: Screen) => void }) {
  return (
    <main className="page home-page">
      <section className="hero">
        <span className="eyebrow">{t.greeting}</span>
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <span className="hero-kaaba"><Icon name="kaaba" size={42} /></span>
      </section>

      <button className="offline-card" onClick={() => setScreen("settings")}>
        <span className="status-icon"><Icon name="shield" /></span>
        <span className="grow">
          <strong>{t.offline}</strong>
          <small>{t.offlineMeta}</small>
        </span>
        <span className="offline-check"><Icon name="check" size={17} /></span>
      </button>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">{t.journey}</span><h2>{t.journeyHint}</h2></div>
          <span className="section-symbol"><Icon name="compass" /></span>
        </div>

        <button className="journey-card primary" onClick={() => setScreen("guide")}>
          <span className="journey-icon"><Icon name="kaaba" size={30} /></span>
          <span className="grow"><strong>{t.umrah}</strong><small>{t.umrahHint}</small></span>
          <span className="round-arrow"><Icon name="arrow" size={19} /></span>
        </button>
        {/* TODO: the Hajj flow is not designed yet; this opens the Umrah prototype for now. */}
        <button className="journey-card" onClick={() => setScreen("guide")}>
          <span className="journey-icon light"><Icon name="moon" size={28} /></span>
          <span className="grow"><strong>{t.hajj}</strong><small>{t.hajjHint}</small></span>
          <span className="subtle-arrow"><Icon name="arrow" size={19} /></span>
        </button>
      </section>

      <section className="continue-card">
        <div className="continue-top">
          <span className="mini-kaaba"><Icon name="kaaba" /></span>
          <span className="grow"><strong>{t.continue}</strong><small>{t.current}</small></span>
          <span className="progress-number">40%</span>
        </div>
        <div className="progress-track"><span style={{ width: "40%" }} /></div>
        <button className="text-action" onClick={() => setScreen("guide")}>{t.continue}<Icon name="arrow" size={18} /></button>
      </section>

      <section className="section-block tools-section">
        <h2>{t.explore}</h2>
        <div className="tool-grid">
          <button className="tool-card" onClick={() => setScreen("prayers")}>
            <span className="tool-icon gold"><Icon name="prayer" /></span>
            <strong>{t.duas}</strong><small>{t.duasHint}</small>
          </button>
          <button className="tool-card" onClick={() => setScreen("map")}>
            <span className="tool-icon green"><Icon name="map" /></span>
            <strong>{t.map}</strong><small>{t.mapHint}</small>
          </button>
        </div>
      </section>
    </main>
  );
}

function Guide({ t, complete, setComplete }: { t: Copy; complete: boolean; setComplete: (value: boolean) => void }) {
  const [audio, setAudio] = useState(false);
  const [details, setDetails] = useState(false);
  const currentStep = complete ? 3 : 2;
  return (
    <main className="page guide-page">
      <div className="guide-heading">
        <div><span className="eyebrow">{t.umrahGuide}</span><h1>{t.tawaf}</h1></div>
        <span className="step-pill">{currentStep} / 5</span>
      </div>
      <section className="progress-panel">
        <div className="progress-label"><span>{t.progress}</span><strong>{complete ? "60%" : "40%"}</strong></div>
        <div className="progress-track"><span style={{ width: complete ? "60%" : "40%" }} /></div>
        <ol className="steps">
          {[1, 2, 3, 4, 5].map((step) => (
            <li
              key={step}
              className={step < currentStep ? "done" : step === currentStep ? "current" : ""}
              aria-current={step === currentStep ? "step" : undefined}
            >
              {step < currentStep ? <Icon name="check" size={13} /> : step}
            </li>
          ))}
        </ol>
      </section>

      <section className="instruction-card">
        <div className="instruction-meta">
          <span className="ritual-icon"><Icon name="compass" /></span>
          <span className="tag required"><Icon name="sparkle" size={14} />{t.ruling}</span>
          <span className="tag pending">{t.reviewStatus}</span>
        </div>
        <h2>{t.instructionTitle}</h2>
        <p>{t.instruction}</p>
        <div className="kaaba-diagram" aria-hidden="true">
          <span className="orbit orbit-a" />
          <span className="orbit orbit-b" />
          <span className="diagram-kaaba"><Icon name="kaaba" size={40} /></span>
          {/* Tawaf is always counter-clockwise; this must never mirror with text direction. */}
          <span className="direction-arrow">↺</span>
        </div>
      </section>

      <div className="action-list">
        <button className={audio ? "action-row playing" : "action-row"} onClick={() => setAudio(!audio)} aria-pressed={audio}>
          <span className="action-icon"><Icon name={audio ? "volume" : "headphones"} /></span>
          <span className="grow"><strong>{t.audio}</strong><small>{audio ? "••••••••••" : t.audioTime}</small></span>
          <Icon name="chevron" size={18} />
        </button>
        <button className="action-row">
          <span className="action-icon amber"><Icon name="prayer" /></span>
          <span className="grow"><strong>{t.relatedDuas}</strong></span>
          <Icon name="chevron" size={18} />
        </button>
        <button className="action-row" onClick={() => setDetails(!details)} aria-expanded={details} aria-controls="step-details">
          <span className="action-icon sage"><Icon name="book" /></span>
          <span className="grow"><strong>{t.details}</strong></span>
          <span className={details ? "rotate" : ""}><Icon name="chevron" size={18} /></span>
        </button>
        {details && <div className="detail-note" id="step-details">{t.instruction}</div>}
      </div>

      <div className="next-note"><Icon name="sparkle" size={18} /><span>{t.next}</span></div>
      <button className={complete ? "complete-button completed" : "complete-button"} onClick={() => setComplete(!complete)}>
        <Icon name="check" />{complete ? t.next : t.complete}<Icon name="arrow" />
      </button>
      <button className="previous-button" onClick={() => setComplete(false)} disabled={!complete}>{t.previous}</button>
      <p className="save-note"><Icon name="shield" size={16} />{t.reassurance}</p>
    </main>
  );
}

function Placeholder({ t, screen, setScreen }: { t: Copy; screen: Screen; setScreen: (s: Screen) => void }) {
  const icon: IconName = screen === "map" ? "map" : screen === "settings" ? "download" : "prayer";
  const title = screen === "map" ? t.map : screen === "settings" ? t.offline : t.duas;
  return (
    <main className="page placeholder-page">
      <span className="placeholder-icon"><Icon name={icon} size={34} /></span>
      <h1>{title}</h1>
      <p>{t.notAvailable}</p>
      <div className="download-summary"><Icon name="shield" /><span>{t.offlineMeta}</span><Icon name="check" /></div>
      <button className="complete-button" onClick={() => setScreen("home")}><Icon name="home" />{t.back}</button>
    </main>
  );
}

function isLanguage(value: string | null): value is Language {
  return value === "ar" || value === "en" || value === "ur";
}

export default function App() {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = readStored("rafiq-language");
    return isLanguage(stored) ? stored : "ar";
  });
  const [screen, setScreen] = useState<Screen>("home");
  const [complete, setCompleteState] = useState(() => readStored("rafiq-tawaf-complete") === "true");
  const t = useMemo(() => copy[language], [language]);
  const rtl = language !== "en";

  useEffect(() => {
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, rtl]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    writeStored("rafiq-language", lang);
  };
  const setComplete = (value: boolean) => {
    setCompleteState(value);
    writeStored("rafiq-tawaf-complete", String(value));
  };

  return (
    <div className={`app-shell language-${language}`}>
      <AppHeader language={language} setLanguage={setLanguage} />
      {screen === "home" && <Home t={t} setScreen={setScreen} />}
      {screen === "guide" && <Guide t={t} complete={complete} setComplete={setComplete} />}
      {!["home", "guide"].includes(screen) && <Placeholder t={t} screen={screen} setScreen={setScreen} />}
      <BottomNav screen={screen} setScreen={setScreen} t={t} />
    </div>
  );
}
