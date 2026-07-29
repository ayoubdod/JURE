// src/pages/Contact.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Send, Phone, MapPin, ArrowRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle"; // ✅ use shared minimalist toggle
import { devLog } from "@/utils/devLog";

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

// ⬇️ keep your existing Lang switcher
const LangSwitcher: React.FC<{ lang: Lang; onChange: (l: Lang) => void }> = ({ lang, onChange }) => (
  <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
    {(["fr", "en", "ar"] as Lang[]).map((code) => (
      <button
        key={code}
        onClick={() => onChange(code)}
        className={`px-3 py-2 text-sm ${lang === code ? "bg-[#64499D] text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
      >
        {code === "fr" ? "FR" : code === "en" ? "EN" : "AR"}
      </button>
    ))}
  </div>
);

const Contact: React.FC = () => {
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const [form, setForm] = useState({ name: "", email: "", company: "", subject: "", message: "", consent: false });

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as any;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      window.alert(t.form.required);
      return;
    }
    // hook up to your API here
    devLog("Contact submit:", form);
    window.alert(t.form.sent);
    setForm({ name: "", email: "", company: "", subject: "", message: "", consent: false });
  };

  const go = (to: string) => navigate(to);
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="relative z-10">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src="/images/Jure logo.png" alt="JURE" className="w-[140px] h-10 object-contain" />
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => go("/features")} className="hover:text-[#64499D]">{t.nav.features}</button>
            <button onClick={() => go("/pricing")} className="hover:text-[#64499D]">{t.nav.pricing}</button>
            <button onClick={() => go("/about")} className="hover:text-[#64499D]">{t.nav.about}</button>
            <button onClick={() => go("/contact")} className="text-[#64499D] font-semibold">{t.nav.contact}</button>
          </div>
          <div className="flex items-center gap-3">
            <LangSwitcher lang={lang} onChange={setLang} />
            {/* ✅ shared minimalist toggle */}
            <ThemeToggle label={t.themeToggle.label} title={t.themeToggle.title} />
            <Button onClick={() => go("/signin")} variant="outline" className="border-[#64499D]/30 text-[#64499D]">{t.auth.signin}</Button>
          </div>
        </nav>
      </header>

      {/* Hero + Form */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-16 md:pt-20 md:pb-20">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
                {t.hero.title}
              </span>
            </h1>
            <p className="mt-4 text-slate-600 dark:text-slate-300">{t.hero.subtitle}</p>
            <div className="mt-6 flex justify-center gap-3">
              <a href="mailto:contact@jure.ma" className="inline-flex items-center gap-2 text-sm underline">
                <Mail className="w-4 h-4" /> {t.hero.alt}
              </a>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 mt-12">
            {/* Form */}
            <Card className="md:col-span-2 bg-white/90 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle>{t.hero.title}</CardTitle>
                <CardDescription className="dark:text-slate-400">{t.hero.subtitle}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm">{t.form.name}</label>
                    <Input name="name" value={form.name} onChange={onChange} required />
                  </div>
                  <div>
                    <label className="text-sm">{t.form.email}</label>
                    <Input type="email" name="email" value={form.email} onChange={onChange} required />
                  </div>
                  <div>
                    <label className="text-sm">{t.form.company}</label>
                    <Input name="company" value={form.company} onChange={onChange} />
                  </div>
                  <div>
                    <label className="text-sm">{t.form.subject}</label>
                    <Input name="subject" value={form.subject} onChange={onChange} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm">{t.form.message}</label>
                    <Textarea name="message" rows={6} value={form.message} onChange={onChange} required />
                  </div>
                  <label className="md:col-span-2 inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" name="consent" checked={form.consent} onChange={onChange} />
                    {t.form.consent}
                  </label>
                  <div className="md:col-span-2">
                    <Button type="submit" className="bg-gradient-to-r from-[#64499D] to-[#4D3680]">
                      <Send className="w-4 h-4 mr-2" /> {t.hero.cta}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Contact info */}
            <Card className="bg-white/90 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle>{t.info.title}</CardTitle>
                <CardDescription className="dark:text-slate-400">JURE</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5" /> <a href="mailto:contact@jure.ma" className="underline"> {t.info.email} </a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5" /> <span>{t.info.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5" /> <span>{t.info.address}</span>
                </div>
                <div className="pt-4">
                  <Button variant="outline" onClick={() => navigate("/status")} className="w-full">
                    {lang === "fr" ? "Voir le statut" : lang === "ar" ? "عرض الحالة" : "View Status"} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <img src="/images/Jure logo.png" alt="JURE" className="w-[120px] h-8 object-contain" />
          <div className="flex items-center gap-6 text-sm text-slate-300">
            <button onClick={() => navigate("/privacy")} className="hover:text-white">{t.footer.privacy}</button>
            <button onClick={() => navigate("/terms")} className="hover:text-white">{t.footer.terms}</button>
            <button onClick={() => navigate("/status")} className="hover:text-white">{t.footer.status}</button>
          </div>
          <div className="text-slate-400 text-sm">© {year} JURE. {t.footer.rights}</div>
        </div>
      </footer>
    </div>
  );
};

export default Contact;
