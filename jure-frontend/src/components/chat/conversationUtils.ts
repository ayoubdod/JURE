export const getMemberPerson = (m: API.ConversationMembership) =>
  (m as { user?: API.User; cabinet_member?: API.User; member?: API.User }).user ??
  (m as { cabinet_member?: API.User }).cabinet_member ??
  (m as { member?: API.User }).member;

export function getLinkedCase(c?: API.Conversation | null): API.LinkedCaseSummary | null {
  if (!c) return null;
  return c.linkedCase ?? c.linked_case ?? null;
}

export function formatCaseRef(lc: API.LinkedCaseSummary): string {
  const ref = lc.reference?.trim();
  if (ref) return ref.startsWith('#') ? ref : `#${ref}`;
  return `#${lc.id}`;
}

export function humanizeToken(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function parseLinkedCaseId(lc: API.LinkedCaseSummary): number | null {
  const n = typeof lc.id === 'number' ? lc.id : parseInt(String(lc.id), 10);
  return Number.isFinite(n) ? n : null;
}

export function linkedCaseDotClass(lc: API.LinkedCaseSummary): string {
  const t = lc.caseType ?? lc.case_type ?? '';
  if (t === 'LITIGATION') return 'bg-rose-500';
  if (t === 'CONSULTATION') return 'bg-indigo-500';
  if (t === 'ADMINISTRATIVE' || t === 'ADMINISTRATIVE_DUTY') return 'bg-amber-400';
  return 'bg-slate-400';
}

export function getDirectPeer(
  c: API.Conversation,
  currentEmail?: string | null
): API.ConversationMembership | undefined {
  if (c.type !== 'direct') return undefined;
  const email = (currentEmail ?? '').toLowerCase();
  return c.memberships?.find((m) => (getMemberPerson(m)?.email ?? '').toLowerCase() !== email);
}

export function getDirectPeerInfo(
  c: API.Conversation,
  peer: API.ConversationMembership | undefined,
  unknownLabel: string
) {
  const op = c.other_participant;
  const person = peer ? getMemberPerson(peer) : null;
  const firstName = op?.first_name ?? person?.first_name;
  const lastName = op?.last_name ?? person?.last_name;
  const fullName =
    op?.full_name ??
    (`${firstName ?? ''} ${lastName ?? ''}`.trim() || person?.email || unknownLabel);
  const initials = [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const id = person?.id ?? (person as { pk?: number } | null)?.pk ?? null;
  return { fullName, firstName, lastName, initials, id, email: person?.email, person };
}

export function getConversationDisplayName(
  c: API.Conversation,
  currentEmail: string | undefined,
  unknownLabel: string
): string {
  if (c.display_name) return c.display_name;
  if (c.type === 'direct') {
    const peer = getDirectPeer(c, currentEmail);
    return getDirectPeerInfo(c, peer, unknownLabel).fullName;
  }
  return c.title || unknownLabel;
}

export function formatListTimestamp(dateStr?: string, locale?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86_400_000) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (diff < 604_800_000) return d.toLocaleDateString(locale, { weekday: 'short' });
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export function formatMessageTime(dateStr?: string, locale?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function messageSentAt(msg: API.Message): string | undefined {
  return msg.sent_at ?? msg.created;
}

export function senderKey(msg: API.Message): string {
  const sender = msg.sender as number | { id?: number; pk?: number } | undefined;
  if (sender && typeof sender === 'object') {
    return String(sender.id ?? sender.pk ?? '');
  }
  return String(sender ?? '');
}

export function isSameCalendarDay(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function formatDateSeparator(iso: string, labels: { today: string; yesterday: string }): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86_400_000);
  if (diffDays === 0) return labels.today;
  if (diffDays === 1) return labels.yesterday;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const GROUP_WINDOW_MS = 5 * 60 * 1000;

export type MessageLayoutMeta = {
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showDateSeparator: boolean;
};

export function getMessageLayoutMeta(messages: API.Message[], index: number): MessageLayoutMeta {
  const msg = messages[index];
  const prev = messages[index - 1];
  const next = messages[index + 1];
  const sent = messageSentAt(msg);
  const prevSent = prev ? messageSentAt(prev) : undefined;
  const nextSent = next ? messageSentAt(next) : undefined;
  const sentMs = sent ? new Date(sent).getTime() : 0;
  const prevMs = prevSent ? new Date(prevSent).getTime() : 0;
  const nextMs = nextSent ? new Date(nextSent).getTime() : 0;

  const sameSenderPrev = !!prev && senderKey(prev) === senderKey(msg);
  const sameSenderNext = !!next && senderKey(next) === senderKey(msg);
  const closePrev = sameSenderPrev && sentMs - prevMs <= GROUP_WINDOW_MS && isSameCalendarDay(sent, prevSent);
  const closeNext = sameSenderNext && nextMs - sentMs <= GROUP_WINDOW_MS && isSameCalendarDay(sent, nextSent);

  return {
    isFirstInGroup: !closePrev,
    isLastInGroup: !closeNext,
    showDateSeparator: !prev || !isSameCalendarDay(sent, prevSent),
  };
}

export function attachmentFileName(file: string): string {
  try {
    const clean = file.split('?')[0];
    const part = clean.split('/').filter(Boolean).pop() ?? file;
    return decodeURIComponent(part);
  } catch {
    return file;
  }
}

export function collectConversationFiles(messages: API.Message[]): API.MessageAttachment[] {
  const out: API.MessageAttachment[] = [];
  const seen = new Set<number>();
  for (const msg of messages) {
    for (const att of msg.attachments ?? []) {
      if (seen.has(att.id)) continue;
      seen.add(att.id);
      out.push(att);
    }
  }
  return out;
}

export function isImageAttachment(att: API.MessageAttachment): boolean {
  const kind = String(att.kind ?? '').toLowerCase();
  if (kind === 'image') return true;
  return String(att.mime ?? '').toLowerCase().startsWith('image/');
}

export function isVideoAttachment(att: API.MessageAttachment): boolean {
  const kind = String(att.kind ?? '').toLowerCase();
  if (kind === 'video') return true;
  return String(att.mime ?? '').toLowerCase().startsWith('video/');
}

export function isImageOrVideoAttachment(att: API.MessageAttachment): boolean {
  return isImageAttachment(att) || isVideoAttachment(att);
}

export function isDocumentAttachment(att: API.MessageAttachment): boolean {
  if (isAudioAttachment(att) || isImageOrVideoAttachment(att)) return false;
  return String(att.kind ?? '').toLowerCase() === 'file' || !!att.file;
}

export function isAudioAttachment(att: API.MessageAttachment): boolean {
  const kind = String(att.kind ?? '').toLowerCase();
  if (kind === 'audio') return true;
  const mime = String(att.mime ?? '').toLowerCase();
  if (mime.startsWith('audio/')) return true;
  const name = String(att.file ?? '').toLowerCase();
  return /\.(webm|ogg|mp3|m4a|wav|aac)(\?|$)/.test(name) || name.includes('voice.');
}

export function attachmentHref(file: string, baseUrl: string): string {
  return file.startsWith('http') ? file : `${baseUrl}${file}`;
}
