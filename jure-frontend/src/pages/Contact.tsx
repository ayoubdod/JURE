// src/pages/Contact.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, Phone, MapPin, ArrowRight } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import { RouteSeo } from "@/marketing/Seo";
import { CONTACT_INBOX, submitLandingInquiry } from "@/services/marketing/api";
import { track, MarketingEvents } from "@/lib/analytics";

type Lang = "fr" | "en" | "ar";

const STRINGS: Record<Lang, any> = {
  en: {
    htmlLang: "en",
    dir: "ltr",
    nav: { features: "Features", pricing: "Pricing", about: "About", contact: "Contact" },
    auth: { signin: "Sign in" },
    themeToggle: { label: "Toggle theme", title: "Toggle theme" },
    hero: {
      title: "Contact us",
      subtitle: "Tell us about your needs. We’ll get back within 1 business day.",
      cta: "Send message",
      alt: "Email us",
    },
    form: {
      name: "Full name",
      email: "Work email",
      company: "Company",
      subject: "Subject",
      message: "Message",
      consent: "I agree to be contacted about JURE.",
      required: "Please fill all required fields.",
      sent: "Thank you! Your message has been sent.",
      sendFailed: "We could not send your message. Please email contact@jure.ma.",
      sending: "Sending…",
    },
    info: {
      title: "Other ways to reach us",
      email: "contact@jure.ma",
      phone: "+212 665236382",
      address: "Casablanca, Morocco",
    },
    footer: { privacy: "Privacy", terms: "Terms", status: "Status", rights: "All rights reserved." },
  },
  fr: {
    htmlLang: "fr",
    dir: "ltr",
    nav: { features: "Fonctionnalités", pricing: "Tarifs", about: "À propos", contact: "Contact" },
    auth: { signin: "Se connecter" },
    themeToggle: { label: "Basculer le thème", title: "Basculer le thème" },
    hero: {
      title: "Contactez-nous",
      subtitle: "Parlez-nous de vos besoins. Réponse sous 1 jour ouvré.",
      cta: "Envoyer le message",
      alt: "Nous écrire",
    },
    form: {
      name: "Nom complet",
      email: "Email professionnel",
      company: "Société",
      subject: "Objet",
      message: "Message",
      consent: "J’accepte d’être recontacté au sujet de JURE.",
      required: "Veuillez compléter tous les champs requis.",
      sent: "Merci ! Votre message a été envoyé.",
      sendFailed: "Impossible d’envoyer le message. Écrivez-nous à contact@jure.ma.",
      sending: "Envoi…",
    },
    info: {
      title: "Autres moyens",
      email: "contact@jure.ma",
      phone: "+212 665236382",
      address: "Casablanca, Maroc",
    },
    footer: { privacy: "Confidentialité", terms: "Conditions", status: "Statut", rights: "Tous droits réservés." },
  },
  ar: {
    htmlLang: "ar",
    dir: "rtl",
    nav: { features: "الميزات", pricing: "الأسعار", about: "حول", contact: "اتصل بنا" },
    auth: { signin: "تسجيل الدخول" },
    themeToggle: { label: "تبديل السمة", title: "تبديل السمة" },
    hero: {
      title: "تواصل معنا",
      subtitle: "أخبرنا باحتياجاتك. سنرد خلال يوم عمل واحد.",
      cta: "إرسال الرسالة",
      alt: "راسلنا",
    },
    form: {
      name: "الاسم الكامل",
      email: "البريد المهني",
      company: "الشركة",
      subject: "الموضوع",
      message: "الرسالة",
      consent: "أوافق على التواصل معي بشأن JURE.",
      required: "يرجى تعبئة جميع الحقول المطلوبة.",
      sent: "شكرًا! تم إرسال رسالتك.",
      sendFailed: "تعذر إرسال الرسالة. راسلونا على contact@jure.ma.",
      sending: "جارٍ الإرسال…",
    },
    info: {
      title: "طرق أخرى للتواصل",
      email: "contact@jure.ma",
      phone: "+212 665236382",
      address: "الدار البيضاء، المغرب",
    },
    footer: { privacy: "الخصوصية", terms: "الشروط", status: "الحالة", rights: "جميع الحقوق محفوظة." },
  },
};

const useI18n = () => {
  const [lang, setLang] = useState<Lang>(() => {
    const s = localStorage.getItem("lang") as Lang | null;
    if (s === "fr" || s === "en" || s === "ar") return s;
    const nav = (navigator.language || "en").toLowerCase();
    if (nav.startsWith("fr")) return "fr";
    if (nav.startsWith("ar")) return "ar";
    return "en";
  });
  useEffect(() => {
    const pack = STRINGS[lang];
    document.documentElement.setAttribute("lang", pack.htmlLang);
    document.documentElement.setAttribute("dir", pack.dir);
    localStorage.setItem("lang", lang);
  }, [lang]);
  return { lang, setLang, t: STRINGS[lang] };
};

const Contact: React.FC = () => {
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
    consent: false,
  });
  const [sending, setSending] = useState(false);
  const isRtl = t.dir === "rtl";

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as any;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message || form.message.trim().length < 10) {
      window.alert(t.form.required);
      return;
    }
    setSending(true);
    try {
      await submitLandingInquiry({
        name: form.name,
        email: form.email,
        company: form.company,
        subject: form.subject,
        message: form.message,
        source: "contact",
        locale: lang,
      });
      track(MarketingEvents.ContactCta, { source: "contact-form", lang });
      window.alert(t.form.sent);
      setForm({ name: "", email: "", company: "", subject: "", message: "", consent: false });
    } catch {
      window.alert(t.form.sendFailed);
    } finally {
      setSending(false);
    }
  };

  return (
    <MarketingShell
      lang={lang}
      onLangChange={setLang}
      labels={{
        nav: { features: t.nav.features, about: t.nav.about, contact: t.nav.contact },
        auth: t.auth,
        themeToggle: t.themeToggle,
        footer: t.footer,
      }}
      dir={t.dir}
      activeNav="contact"
    >
      <RouteSeo routeKey="contact" lang={lang} />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-14 sm:pb-16 md:pt-20 md:pb-20">
        <Reveal className="text-center max-w-3xl mx-auto min-w-0">
          <h1 className="font-display text-[2rem] leading-[1.15] sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight break-words">
            <span className="landing-hero-shimmer bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
              {t.hero.title}
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 break-words">{t.hero.subtitle}</p>
          <div className="mt-6 flex justify-center gap-3">
            <a
              href={`mailto:${CONTACT_INBOX}`}
              className="inline-flex items-center gap-2 text-sm underline underline-offset-4 hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors"
            >
              <Mail className="w-4 h-4" /> {t.hero.alt}
            </a>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 mt-10 sm:mt-12">
          {/* Form */}
          <Reveal className="md:col-span-2 min-w-0" delay={0.05}>
            <div className="landing-glass landing-glass-glow rounded-2xl p-5 sm:p-6 md:p-8 h-full min-w-0">
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-1 break-words">{t.hero.title}</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6 break-words">{t.hero.subtitle}</p>
              <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-700 dark:text-slate-300">{t.form.name}</label>
                  <Input
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    required
                    className="mt-1 bg-white/60 dark:bg-slate-900/40 border-[#64499D]/20 dark:border-[#8B6FD1]/25"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-700 dark:text-slate-300">{t.form.email}</label>
                  <Input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    required
                    className="mt-1 bg-white/60 dark:bg-slate-900/40 border-[#64499D]/20 dark:border-[#8B6FD1]/25"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-700 dark:text-slate-300">{t.form.company}</label>
                  <Input
                    name="company"
                    value={form.company}
                    onChange={onChange}
                    className="mt-1 bg-white/60 dark:bg-slate-900/40 border-[#64499D]/20 dark:border-[#8B6FD1]/25"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-700 dark:text-slate-300">{t.form.subject}</label>
                  <Input
                    name="subject"
                    value={form.subject}
                    onChange={onChange}
                    className="mt-1 bg-white/60 dark:bg-slate-900/40 border-[#64499D]/20 dark:border-[#8B6FD1]/25"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-slate-700 dark:text-slate-300">{t.form.message}</label>
                  <Textarea
                    name="message"
                    rows={6}
                    value={form.message}
                    onChange={onChange}
                    required
                    className="mt-1 bg-white/60 dark:bg-slate-900/40 border-[#64499D]/20 dark:border-[#8B6FD1]/25"
                  />
                </div>
                <label
                  className={`md:col-span-2 inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 ${
                    isRtl ? "flex-row-reverse" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    name="consent"
                    checked={form.consent}
                    onChange={onChange}
                    className="accent-[#64499D]"
                  />
                  {t.form.consent}
                </label>
                <div className="md:col-span-2">
                  <Button
                    type="submit"
                    disabled={sending}
                    className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white shadow-lg hover:shadow-[0_0_28px_-6px_rgba(100,73,157,0.55)]"
                  >
                    <Send className={`w-4 h-4 ${isRtl ? "ms-2" : "me-2"}`} /> {sending ? t.form.sending : t.hero.cta}
                  </Button>
                </div>
              </form>
            </div>
          </Reveal>

          {/* Contact info */}
          <Reveal delay={0.1} className="min-w-0">
            <div className="landing-glass landing-glass-glow rounded-2xl p-5 sm:p-6 md:p-8 h-full min-w-0">
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-1 break-words">{t.info.title}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">JURE</p>
              <div className="space-y-4">
                <div className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <div className="w-10 h-10 rounded-xl bg-[#64499D]/15 dark:bg-[#64499D]/25 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1]" />
                  </div>
                  <a
                    href={`mailto:${CONTACT_INBOX}`}
                    className="underline underline-offset-4 hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors"
                  >
                    {t.info.email}
                  </a>
                </div>
                <div className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <div className="w-10 h-10 rounded-xl bg-[#64499D]/15 dark:bg-[#64499D]/25 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1]" />
                  </div>
                  <span>{t.info.phone}</span>
                </div>
                <div className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <div className="w-10 h-10 rounded-xl bg-[#64499D]/15 dark:bg-[#64499D]/25 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1]" />
                  </div>
                  <span>{t.info.address}</span>
                </div>
                <div className="pt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/status")}
                    className="w-full border-[#64499D]/25 dark:border-[#8B6FD1]/30 hover:bg-[#F4F1FF]/80 dark:hover:bg-[#64499D]/15"
                  >
                    {lang === "fr" ? "Voir le statut" : lang === "ar" ? "عرض الحالة" : "View Status"}
                    <ArrowRight className={`w-4 h-4 ${isRtl ? "me-2 rotate-180" : "ms-2"}`} />
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  );
};

export default Contact;
