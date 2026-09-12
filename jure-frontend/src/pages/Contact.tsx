// src/pages/Contact.tsx — contact form in the same presentation language as Features / About.
import React, { useState } from "react";
import { Link } from "react-router";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, Phone, MapPin, ArrowRight } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import { RouteSeo } from "@/marketing/Seo";
import { useMarketingLang } from "@/marketing/MarketingLocale";
import { CONTACT_INBOX, submitLandingInquiry } from "@/services/marketing/api";
import { track, MarketingEvents } from "@/lib/analytics";
import "@/components/landing/features-deck.css";

type Lang = "fr" | "en" | "ar";

type ContactStrings = {
  hero: {
    titleA: string;
    titleB: string;
    note: string;
    cta: string;
    alt: string;
  };
  form: {
    titleA: string;
    titleB: string;
    note: string;
    name: string;
    email: string;
    company: string;
    subject: string;
    message: string;
    consent: string;
    required: string;
    sent: string;
    sendFailed: string;
    sending: string;
  };
  info: {
    titleA: string;
    titleB: string;
    note: string;
    email: string;
    phone: string;
    address: string;
    viewStatus: string;
  };
};

const STRINGS: Record<Lang, ContactStrings> = {
  en: {
    hero: {
      titleA: "Contact",
      titleB: "us.",
      note: "Tell us about your needs. We'll get back within 1 business day.",
      cta: "Send message",
      alt: "Email us",
    },
    form: {
      titleA: "Send a",
      titleB: "message.",
      note: "Share a bit of context — we'll route it to the right person on the team.",
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
      titleA: "Other ways to",
      titleB: "reach us.",
      note: "Prefer email or a call? Use the channels below.",
      email: "contact@jure.ma",
      phone: "+212 665236382",
      address: "Casablanca, Morocco",
      viewStatus: "View status",
    },
  },
  fr: {
    hero: {
      titleA: "Contactez",
      titleB: "nous.",
      note: "Parlez-nous de vos besoins. Réponse sous 1 jour ouvré.",
      cta: "Envoyer le message",
      alt: "Nous écrire",
    },
    form: {
      titleA: "Envoyer un",
      titleB: "message.",
      note: "Donnez un peu de contexte — nous orientons votre demande vers la bonne personne.",
      name: "Nom complet",
      email: "Email professionnel",
      company: "Société",
      subject: "Objet",
      message: "Message",
      consent: "J'accepte d'être recontacté au sujet de JURE.",
      required: "Veuillez compléter tous les champs requis.",
      sent: "Merci ! Votre message a été envoyé.",
      sendFailed: "Impossible d'envoyer le message. Écrivez-nous à contact@jure.ma.",
      sending: "Envoi…",
    },
    info: {
      titleA: "Autres",
      titleB: "moyens.",
      note: "Vous préférez un email ou un appel ? Utilisez les canaux ci-dessous.",
      email: "contact@jure.ma",
      phone: "+212 665236382",
      address: "Casablanca, Maroc",
      viewStatus: "Voir le statut",
    },
  },
  ar: {
    hero: {
      titleA: "تواصل",
      titleB: "معنا.",
      note: "أخبرنا باحتياجاتك. سنرد خلال يوم عمل واحد.",
      cta: "إرسال الرسالة",
      alt: "راسلنا",
    },
    form: {
      titleA: "أرسل",
      titleB: "رسالة.",
      note: "شارك سياقاً موجزاً — سنوجّه طلبك إلى الشخص المناسب في الفريق.",
      name: "الاسم الكامل",
      email: "البريد المهني",
      company: "الشركة",
      subject: "الموضوع",
      message: "الرسالة",
      consent: "أوافق على التواصل معي بشأن JURE.",
      required: "يرجى تعبئة جميع الحقول المطلوبة.",
      sent: "شكرا! تم إرسال رسالتك.",
      sendFailed: "تعذر إرسال الرسالة. راسلونا على contact@jure.ma.",
      sending: "جار الإرسال…",
    },
    info: {
      titleA: "طرق أخرى",
      titleB: "للتواصل.",
      note: "تفضل البريد أو الاتصال؟ استخدم القنوات أدناه.",
      email: "contact@jure.ma",
      phone: "+212 665236382",
      address: "الدار البيضاء، المغرب",
      viewStatus: "عرض الحالة",
    },
  },
};

const Contact: React.FC = () => {
  const { lang, dir, path } = useMarketingLang();
  const t = STRINGS[lang];
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
    consent: false,
  });
  const [sending, setSending] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const checked = e.target instanceof HTMLInputElement ? e.target.checked : false;
    const isCheckbox = e.target instanceof HTMLInputElement && e.target.type === "checkbox";
    setForm((f) => ({ ...f, [name]: isCheckbox ? checked : value }));
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
    <MarketingShell lang={lang} onLangChange={() => {}} dir={dir} activeNav="contact">
      <RouteSeo routeKey="contact" lang={lang} />
      <div className="features-deck contact-deck">
        <div className="features-orbs" aria-hidden>
          <span className="features-orb features-orb--a" />
          <span className="features-orb features-orb--b" />
          <span className="features-orb features-orb--c" />
          <span className="features-orb features-orb--d" />
        </div>

        <section className="features-hero">
          <div className="features-deck__inner">
            <h1 className="features-hero__title contact-hero__title">
              {t.hero.titleA} <em>{t.hero.titleB}</em>
            </h1>
            <p className="features-hero__lead">{t.hero.note}</p>
            <div className="features-hero__actions">
              <a href={`mailto:${CONTACT_INBOX}`} className="features-btn features-btn--ghost">
                <Mail className="w-4 h-4 me-2" />
                {t.hero.alt}
              </a>
            </div>
          </div>
        </section>

        <section className="features-block contact-block">
          <div className="features-deck__inner">
            <div className="contact-layout">
              <Reveal className="contact-form-wrap" delay={0.04}>
                <div className="features-block__head contact-section-head">
                  <h2 className="features-block__title">
                    {t.form.titleA} <em>{t.form.titleB}</em>
                  </h2>
                  <p className="features-block__lead">{t.form.note}</p>
                </div>
                <form onSubmit={submit} className="contact-form about-panel about-panel--mist">
                  <div className="contact-form__grid">
                    <label className="contact-field">
                      <span>{t.form.name}</span>
                      <Input
                        name="name"
                        value={form.name}
                        onChange={onChange}
                        required
                        className="contact-input"
                      />
                    </label>
                    <label className="contact-field">
                      <span>{t.form.email}</span>
                      <Input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={onChange}
                        required
                        className="contact-input"
                      />
                    </label>
                    <label className="contact-field">
                      <span>{t.form.company}</span>
                      <Input
                        name="company"
                        value={form.company}
                        onChange={onChange}
                        className="contact-input"
                      />
                    </label>
                    <label className="contact-field">
                      <span>{t.form.subject}</span>
                      <Input
                        name="subject"
                        value={form.subject}
                        onChange={onChange}
                        className="contact-input"
                      />
                    </label>
                    <label className="contact-field contact-field--full">
                      <span>{t.form.message}</span>
                      <Textarea
                        name="message"
                        rows={6}
                        value={form.message}
                        onChange={onChange}
                        required
                        className="contact-input"
                      />
                    </label>
                    <label className="contact-consent contact-field--full">
                      <input
                        type="checkbox"
                        name="consent"
                        checked={form.consent}
                        onChange={onChange}
                      />
                      <span>{t.form.consent}</span>
                    </label>
                    <div className="contact-field--full">
                      <button
                        type="submit"
                        disabled={sending}
                        className="features-btn features-btn--dark contact-submit"
                      >
                        <Send className="w-4 h-4 me-2" />
                        {sending ? t.form.sending : t.hero.cta}
                      </button>
                    </div>
                  </div>
                </form>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="features-block__head contact-section-head">
                  <h2 className="features-block__title">
                    {t.info.titleA} <em>{t.info.titleB}</em>
                  </h2>
                  <p className="features-block__lead">{t.info.note}</p>
                </div>
                <aside className="about-panel about-panel--dark contact-info">
                  <a href={`mailto:${CONTACT_INBOX}`} className="contact-info__row">
                    <span className="contact-info__icon">
                      <Mail className="w-4 h-4" />
                    </span>
                    <span>{t.info.email}</span>
                  </a>
                  <div className="contact-info__row">
                    <span className="contact-info__icon">
                      <Phone className="w-4 h-4" />
                    </span>
                    <span>{t.info.phone}</span>
                  </div>
                  <div className="contact-info__row">
                    <span className="contact-info__icon">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <span>{t.info.address}</span>
                  </div>
                  <Link to={path("status")} className="features-btn features-btn--ghost contact-info__status">
                    {t.info.viewStatus}
                    <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
                  </Link>
                </aside>
              </Reveal>
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
};

export default Contact;
