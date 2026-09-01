import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  Activity,
  BookOpen,
  Check,
  Clock,
  Copy,
  Keyboard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Send,
  Settings2,
} from 'lucide-react';

import { WorkspacePageHeader } from '@/components/workspace/WorkspaceChrome';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { CONTACT_INBOX, submitLandingInquiry } from '@/services/marketing/api';
import { useShortcuts } from '@/context/ShortcutsContext';
import useUserStore from '@/stores/userStore';

const SUPPORT_PHONE = '+212 665236382';
const SUPPORT_PHONE_HREF = 'tel:+212665236382';

const TOPICS = ['account', 'billing', 'clients', 'cases', 'juria', 'technical', 'other'] as const;
type TopicKey = (typeof TOPICS)[number];

const FIELD_CLASS =
  'h-10 rounded-lg border-slate-200 bg-white text-[13.5px] shadow-none transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-950 focus-visible:ring-2 focus-visible:ring-[#64499D]/25 focus-visible:ring-offset-0 focus-visible:border-[#64499D]';

const Support = () => {
  const { t, lang } = useAppTranslation();
  const { toast } = useToast();
  const { setHelpOpen } = useShortcuts();
  const user = useUserStore((s) => s.user);
  const s = t.support;

  const displayName = useMemo(() => {
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
    return name || user?.email || '';
  }, [user]);

  const [topic, setTopic] = useState<TopicKey | ''>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_INBOX);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({ title: s.sendFailed, variant: 'destructive' });
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!topic || trimmed.length < 10 || !user?.email || !displayName) {
      toast({ title: s.required, variant: 'destructive' });
      return;
    }

    const topicLabel = s.topics[topic];
    const subjectLine = [topicLabel, subject.trim()].filter(Boolean).join(' — ');

    setSending(true);
    try {
      await submitLandingInquiry({
        name: displayName,
        email: user.email,
        phone: user.phone || undefined,
        company: user.firm_name || user.trade_name || undefined,
        subject: subjectLine,
        message: trimmed,
        source: 'in-app-support',
        locale: lang,
      });
      setSent(true);
      setSubject('');
      setMessage('');
      toast({ title: s.sentTitle, description: s.sentDesc });
    } catch {
      toast({ title: s.sendFailed, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const channels = [
    {
      key: 'email',
      label: s.emailLabel,
      value: CONTACT_INBOX,
      hint: s.emailHint,
      icon: Mail,
      href: `mailto:${CONTACT_INBOX}`,
    },
    {
      key: 'phone',
      label: s.phoneLabel,
      value: SUPPORT_PHONE,
      hint: s.phoneHint,
      icon: Phone,
      href: SUPPORT_PHONE_HREF,
    },
    {
      key: 'location',
      label: s.locationLabel,
      value: s.locationValue,
      hint: s.locationHint,
      icon: MapPin,
    },
    {
      key: 'hours',
      label: s.hoursLabel,
      value: s.hoursValue,
      hint: s.responseHint,
      icon: Clock,
    },
  ] as const;

  const faqs = [
    { q: s.faq.clientsQ, a: s.faq.clientsA },
    { q: s.faq.mattersQ, a: s.faq.mattersA },
    { q: s.faq.teamQ, a: s.faq.teamA },
    { q: s.faq.juriaQ, a: s.faq.juriaA },
    { q: s.faq.shortcutsQ, a: s.faq.shortcutsA },
    { q: s.faq.securityQ, a: s.faq.securityA },
  ];

  const resources: {
    icon: typeof Keyboard;
    title: string;
    hint: string;
    to?: string;
    onClick?: () => void;
  }[] = [
    {
      icon: Keyboard,
      title: s.resources.shortcuts,
      hint: s.resources.shortcutsHint,
      onClick: () => setHelpOpen(true),
    },
    {
      to: '/docs',
      icon: BookOpen,
      title: s.resources.docs,
      hint: s.resources.docsHint,
    },
    {
      to: '/status',
      icon: Activity,
      title: s.resources.status,
      hint: s.resources.statusHint,
    },
    {
      to: '/dashboard/settings',
      icon: Settings2,
      title: s.resources.settings,
      hint: s.resources.settingsHint,
    },
  ];

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="px-4 pb-8 pt-2 sm:px-5 lg:px-6">
          <WorkspacePageHeader title={s.pageTitle} subtitle={s.pageSubtitle} />

          <section className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4" aria-label={s.pageTitle}>
            {channels.map((channel) => {
              const Icon = channel.icon;
              const body = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {channel.label}
                    </p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                  </div>
                  <p className="mt-2 truncate text-[15px] font-semibold text-slate-900 dark:text-white">
                    {channel.value}
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">{channel.hint}</p>
                </>
              );
              const cardClass =
                'min-w-0 rounded-xl border border-slate-200/90 bg-white px-3.5 py-3 text-start shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950';
              if ('href' in channel && channel.href) {
                return (
                  <a
                    key={channel.key}
                    href={channel.href}
                    className={cn(cardClass, 'hover:border-slate-300 dark:hover:border-slate-700')}
                  >
                    {body}
                  </a>
                );
              }
              return (
                <div key={channel.key} className={cardClass}>
                  {body}
                </div>
              );
            })}
          </section>

          <div className="mt-5 grid gap-2.5 lg:grid-cols-5">
            <form
              onSubmit={onSubmit}
              className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950 sm:p-5 lg:col-span-3"
            >
              <h2 className="text-[16px] font-semibold text-slate-900 dark:text-white">{s.formTitle}</h2>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{s.formHint}</p>

              {sent ? (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{s.sentDesc}</span>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="support-topic" className="text-[13px] text-slate-700 dark:text-zinc-200">
                    {s.topicLabel}
                  </Label>
                  <Select value={topic} onValueChange={(value) => setTopic(value as TopicKey)}>
                    <SelectTrigger id="support-topic" className={FIELD_CLASS}>
                      <SelectValue placeholder={s.topicPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {TOPICS.map((key) => (
                        <SelectItem key={key} value={key}>
                          {s.topics[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="support-subject" className="text-[13px] text-slate-700 dark:text-zinc-200">
                    {s.subjectLabel}
                  </Label>
                  <Input
                    id="support-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={s.subjectPlaceholder}
                    className={FIELD_CLASS}
                    maxLength={255}
                  />
                </div>
              </div>

              <div className="mt-3.5 space-y-1.5">
                <Label htmlFor="support-message" className="text-[13px] text-slate-700 dark:text-zinc-200">
                  {s.messageLabel}
                </Label>
                <Textarea
                  id="support-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={s.messagePlaceholder}
                  className="min-h-[140px] rounded-lg border-slate-200 bg-white text-[13.5px] shadow-none dark:border-zinc-700 dark:bg-zinc-950 focus-visible:border-[#64499D] focus-visible:ring-2 focus-visible:ring-[#64499D]/25 focus-visible:ring-offset-0"
                  required
                  minLength={10}
                />
                <p className="text-[12px] text-slate-400">{s.messageHint}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  type="submit"
                  disabled={sending}
                  className="h-10 min-w-[148px] bg-[#64499D] px-4 text-white hover:bg-[#4D3680] dark:bg-[#7C6BB8] dark:hover:bg-[#8B6FD1]"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? s.sending : s.send}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={() => void copyEmail()}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? s.copied : s.copyEmail}
                </Button>
              </div>
            </form>

            <div className="flex flex-col gap-2.5 lg:col-span-2">
              <section className="rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950 sm:px-5">
                <h2 className="text-[16px] font-semibold text-slate-900 dark:text-white">{s.faqTitle}</h2>
                <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{s.faqHint}</p>
                <Accordion type="single" collapsible className="mt-1">
                  {faqs.map((item) => (
                    <AccordionItem
                      key={item.q}
                      value={item.q}
                      className="border-slate-200 dark:border-slate-800"
                    >
                      <AccordionTrigger className="py-3 text-start text-[13.5px] font-medium text-slate-800 hover:no-underline dark:text-zinc-100">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>

              <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950 sm:p-5">
                <h2 className="text-[16px] font-semibold text-slate-900 dark:text-white">{s.resourcesTitle}</h2>
                <ul className="mt-3 space-y-1.5">
                  {resources.map((item) => {
                    const Icon = item.icon;
                    const inner = (
                      <>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 text-start">
                          <span className="block text-[13.5px] font-medium text-slate-800 dark:text-zinc-100">
                            {item.title}
                          </span>
                          <span className="block text-[12px] text-slate-500 dark:text-slate-400">
                            {item.hint}
                          </span>
                        </span>
                      </>
                    );
                    const itemClass =
                      'flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-900';
                    return (
                      <li key={item.title}>
                        {item.to ? (
                          <Link to={item.to} className={itemClass}>
                            {inner}
                          </Link>
                        ) : (
                          <button type="button" onClick={item.onClick} className={itemClass}>
                            {inner}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
