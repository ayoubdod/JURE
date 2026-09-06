import { getMessages } from './messages';
import type { Lang } from './types';
import { interpolate } from './format';
import { activeUiLang } from './locale';

/** Django gettext (en / fr / ar) for mandatory email verification. */
const EMAIL_UNVERIFIED_NEEDLES = [
  'e-mail is not verified',
  "l'e-mail n'est pas vérifié",
  'البريد الإلكتروني غير مُتحقق منه',
];

export function isBackendEmailUnverified(message: string): boolean {
  const lower = message.toLowerCase();
  return EMAIL_UNVERIFIED_NEEDLES.some((n) => lower.includes(n) || message.includes(n));
}

/**
 * Known live API phrases (English, plus login strings Django already translates).
 * Values are keys in `errors.codes`.
 */
const PHRASE_TO_CODE: Record<string, string> = {
  'unable to log in with provided credentials.': 'INVALID_CREDENTIALS',
  'unable to log in with provided credentials': 'INVALID_CREDENTIALS',
  'impossible de se connecter avec les identifiants fournis.': 'INVALID_CREDENTIALS',
  'غير قادر على تسجيل الدخول بالبيانات المقدمة.': 'INVALID_CREDENTIALS',
  'email not verified': 'EMAIL_NOT_VERIFIED',
  'e-mail is not verified.': 'EMAIL_NOT_VERIFIED',
  "l'e-mail n'est pas vérifié.": 'EMAIL_NOT_VERIFIED',
  'البريد الإلكتروني غير مُتحقق منه.': 'EMAIL_NOT_VERIFIED',
  'phone is not verified.': 'PHONE_NOT_VERIFIED',
  "le téléphone n'est pas vérifié.": 'PHONE_NOT_VERIFIED',
  'الهاتف غير مُتحقق منه.': 'PHONE_NOT_VERIFIED',
  'account disabled': 'ACCOUNT_DISABLED',
  'user account is disabled.': 'ACCOUNT_DISABLED',
  'you must belong to a cabinet to create team members.': 'CABINET_REQUIRED_TEAM',
  'you must belong to a cabinet to create clients.': 'CABINET_REQUIRED_CLIENTS',
  'client must belong to your cabinet.': 'CLIENT_WRONG_CABINET',
  'client must not be a cabinet member.': 'CLIENT_IS_MEMBER',
  'case must belong to your cabinet.': 'CASE_WRONG_CABINET',
  'invalid user id for assignment.': 'INVALID_ASSIGNEE',
  'you do not have access to this conversation.': 'CONVERSATION_NO_ACCESS',
  'attendees must belong to your cabinet.': 'ATTENDEES_WRONG_CABINET',
  'attendees must be cabinet team members.': 'ATTENDEES_NOT_MEMBERS',
  'quantity cannot be negative.': 'QTY_NEGATIVE',
  'unit price cannot be negative.': 'PRICE_NEGATIVE',
  'expense amount cannot be negative.': 'EXPENSE_NEGATIVE',
  'expense amount must be greater than zero.': 'EXPENSE_ZERO',
  'tags must be a list.': 'TAGS_LIST',
  'file is too large (max 25 mb).': 'FILE_TOO_LARGE_25',
  'the uploaded file is empty.': 'FILE_EMPTY',
  'title is required.': 'TITLE_REQUIRED',
  'matter not found in your cabinet.': 'MATTER_NOT_FOUND',
  'user has no cabinet.': 'NO_CABINET',
  'authentication required.': 'AUTH_REQUIRED',
  'at least one participant is required': 'PARTICIPANTS_REQUIRED',
  'email is required.': 'EMAIL_REQUIRED',
  'a user with this email already exists.': 'EMAIL_EXISTS',
  'invalid email address.': 'INVALID_EMAIL',
  'phone number is required.': 'PHONE_REQUIRED',
  'a user with this phone number already exists.': 'PHONE_EXISTS',
  'first name is required.': 'FIRST_NAME_REQUIRED',
  'first name must contain at least 2 characters.': 'FIRST_NAME_SHORT',
  'last name is required.': 'LAST_NAME_REQUIRED',
  'last name must contain at least 2 characters.': 'LAST_NAME_SHORT',
  'direct conversation must have exactly you and one other participant': 'DIRECT_TWO',
  'you cannot create a direct conversation with yourself': 'DIRECT_SELF',
  'you cannot delete a conversation you are a participant of': 'CANNOT_DELETE_PARTICIPANT_CONV',
  'you are not a participant in this conversation.': 'CONVERSATION_NO_ACCESS',
  'payment amount must be greater than zero.': 'PAYMENT_ZERO',
  'invoice does not belong to this case.': 'INVOICE_WRONG_CASE',
  'case must have a client to record a payment.': 'CASE_NEEDS_CLIENT_PAYMENT',
  'could not resolve client profile for this case.': 'CLIENT_PROFILE_RESOLVE',
  'invalid status.': 'INVALID_STATUS',
  'no cabinet associated with this user.': 'NO_CABINET',
  'this project is archived.': 'PROJECT_ARCHIVED',
  'insufficient project role.': 'INSUFFICIENT_PROJECT_ROLE',
  'this project role cannot modify content.': 'PROJECT_ROLE_NO_MODIFY',
  'this project role cannot manage members.': 'PROJECT_ROLE_NO_MEMBERS',
  'only the project owner can perform this action.': 'PROJECT_OWNER_ONLY',
  'user is not in this cabinet.': 'USER_NOT_IN_CABINET',
  'case is not in this cabinet.': 'CASE_NOT_IN_CABINET',
  'one or more case documents are not accessible.': 'CASE_DOCS_INACCESSIBLE',
  'one or more library documents are not accessible.': 'LIBRARY_DOCS_INACCESSIBLE',
  'client is not in this cabinet.': 'CLIENT_NOT_IN_CABINET',
  'user must belong to a cabinet to create documents.': 'LIB_CREATE_CABINET',
  'this resource is private to another cabinet.': 'LIB_PRIVATE_CABINET',
};

/**
 * Map backend error codes / known English messages to localized copy.
 * Falls back to generic error — never shows raw translation keys.
 */
export function translateApiError(
  lang: Lang,
  codeOrMessage: string | null | undefined,
  fallback?: string,
): string {
  const t = getMessages(lang);
  if (!codeOrMessage) return fallback ?? t.errors.generic;

  const normalized = codeOrMessage.trim();
  const fromCode = t.errors.codes[normalized] ?? t.errors.codes[normalized.toUpperCase()];
  if (fromCode) return fromCode;

  const mapped =
    PHRASE_TO_CODE[normalized.toLowerCase()] ?? PHRASE_TO_CODE[normalized];
  if (mapped && t.errors.codes[mapped]) return t.errors.codes[mapped];

  return fallback ?? t.errors.generic;
}

/** Map a backend string using the active document language. */
export function localizeApiMessage(message: string | null | undefined, fallback?: string): string {
  return translateApiError(activeUiLang(), message, fallback);
}

/** Pull `detail` / `error` / `non_field_errors` from a DRF body and localize. */
export function localizeAxiosPayload(data: unknown, fallback: string): string {
  if (typeof data === 'string') return localizeApiMessage(data, data);
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === 'string') return localizeApiMessage(d.detail, d.detail);
    if (Array.isArray(d.detail) && typeof d.detail[0] === 'string') {
      return localizeApiMessage(d.detail[0], d.detail[0]);
    }
    if (typeof d.error === 'string') return localizeApiMessage(d.error, d.error);
    const nfe = d.non_field_errors;
    if (Array.isArray(nfe) && typeof nfe[0] === 'string') return localizeApiMessage(nfe[0], nfe[0]);
  }
  return fallback;
}

export function translateErrorCode(
  lang: Lang,
  code: string,
  vars?: Record<string, string | number>,
): string {
  const t = getMessages(lang);
  const raw = t.errors.codes[code] ?? t.errors.generic;
  return vars ? interpolate(raw, vars) : raw;
}
