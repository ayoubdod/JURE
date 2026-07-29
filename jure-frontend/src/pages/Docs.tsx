// src/pages/Docs.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Shield, Code2, PlugZap, FileText, GitBranch, ArrowRight } from "lucide-react";

type Lang = "fr" | "en" | "ar";

const STRINGS: Record<Lang, any> = {
  en: {
    htmlLang: "en", dir: "ltr",
    nav: { features: "Features", pricing: "Pricing", about: "About", contact: "Contact" },
    auth: { signin: "Sign in" },
    hero: { title: "Documentation", subtitle: "Guides, API, security, and changelog." },
    sections: {
      start: { title: "Getting started", desc: "Accounts, onboarding, and first matters." },
      api: { title: "API & Webhooks", desc: "Authentication, endpoints, and examples." },
      security: { title: "Security & Compliance", desc: "Encryption, RBAC, audit, retention." },
      integrations: { title: "Integrations", desc: "Drive, e-signature, SSO, office suites." },
      guides: { title: "How-to guides", desc: "Contracts, research, collaboration, and more." },
      changelog: { title: "Changelog", desc: "What’s new and improvements." },
    },
    cta: { status: "Service Status", contact: "Contact", open: "Open" },
    footer: { privacy: "Privacy", terms: "Terms", status: "Status", rights: "All rights reserved." },
  },
  fr: {
    htmlLang: "fr", dir: "ltr",
    nav: { features: "Fonctionnalités", pricing: "Tarifs", about: "À propos", contact: "Contact" },
    auth: { signin: "Se connecter" },
    hero: { title: "Documentation", subtitle: "Guides, API, sécurité et journal des versions." },
    sections: {
      start: { title: "Bien démarrer", desc: "Comptes, onboarding et premiers dossiers." },
      api: { title: "API & Webhooks", desc: "Auth, endpoints et exemples." },
      security: { title: "Sécurité & conformité", desc: "Chiffrement, RBAC, audit, rétention." },
      integrations: { title: "Intégrations", desc: "Drive, e-signature, SSO, suites bureautiques." },
      guides: { title: "Guides pratiques", desc: "Contrats, recherche, collaboration, etc." },
      changelog: { title: "Journal des versions", desc: "Nouveautés et améliorations." },
    },
    cta: { status: "Statut du service", contact: "Contact", open: "Ouvrir" },
    footer: { privacy: "Confidentialité", terms: "Conditions", status: "Statut", rights: "Tous droits réservés." },
  },
  ar: {
    htmlLang: "ar", dir: "rtl",
    nav: { features: "الميزات", pricing: "الأسعار", about: "حول", contact: "اتصل بنا" },
    auth: { signin: "تسجيل الدخول" },
    hero: { title: "الوثائق", subtitle: "أدلة وواجهة API والأمان وسجلّ التحديثات." },
    sections: {
      start: { title: "البدء", desc: "الحسابات والإعداد وأول القضايا." },
      api: { title: "واجهة API والويب هوكس", desc: "المصادقة ونقاط النهاية والأمثلة." },
      security: { title: "الأمان والامتثال", desc: "التشفير وصلاحيات الأدوار والتدقيق والاحتفاظ." },
      integrations: { title: "التكاملات", desc: "درايف والتوقيع الإلكتروني وSSO والسuites." },
      guides: { title: "أدلة إجرائية", desc: "العقود والبحث والتعاون والمزيد." },
      changelog: { title: "سجلّ التغييرات", desc: "ما الجديد والتحسينات." },
    },
    cta: { status: "حالة الخدمة", contact: "اتصل بنا", open: "فتح" },
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

const Docs: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  const tiles = [
    { icon: <BookOpen className="w-6 h-6" />, ...t.sections.start },
    { icon: <Code2 className="w-6 h-6" />, ...t.sections.api },
    { icon: <Shield className="w-6 h-6" />, ...t.sections.security },
    { icon: <PlugZap className="w-6 h-6" />, ...t.sections.integrations },
    { icon: <FileText className="w-6 h-6" />, ...t.sections.guides },
    { icon: <GitBranch className="w-6 h-6" />, ...t.sections.changelog },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <img src="/images/Jure logo.png" alt="JURE" className="w-[140px] h-10 object-contain" />
        <Button variant="outline" onClick={() => navigate("/status")}>← {t.footer.status}</Button>
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
            {t.hero.title}
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">{t.hero.subtitle}</p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button onClick={() => navigate("/status")} variant="outline">{t.cta.status}</Button>
            <Button onClick={() => navigate("/contact")} className="bg-gradient-to-r from-[#64499D] to-[#4D3680]">
              {t.cta.contact} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Tiles */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mt-12">
          {tiles.map((tile, i) => (
            <Card key={i} className="bg-white/90 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700 hover:shadow-lg transition">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl grid place-items-center text-white" style={{ background: "#64499D" }}>
                  {tile.icon}
                </div>
                <CardTitle className="mt-4">{tile.title}</CardTitle>
                <CardDescription className="dark:text-slate-400">{tile.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => navigate("/docs")} className="w-full">
                  {t.cta.open}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <img src="/images/Jure logo.png" alt="JURE" className="w-[120px] h-8 object-contain" />
          <div className="text-slate-400 text-sm">© {year} JURE</div>
        </div>
      </footer>
    </div>
  );
};

export default Docs;
