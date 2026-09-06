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
  'user must belong to a cabinet to add documents.': 'LIB_ADD_CABINET',
  'this field is required.': 'FIELD_REQUIRED',
  'this field may not be blank.': 'FIELD_BLANK',
  'this field may not be null.': 'FIELD_NULL',
  'enter a valid email address.': 'INVALID_EMAIL',
  'a valid integer is required.': 'INVALID_INTEGER',
  'this list may not be empty.': 'LIST_EMPTY',
  'user not found.': 'USER_NOT_FOUND',
  'case not found.': 'CASE_NOT_FOUND',
  'you do not have access to this case.': 'CASE_NO_ACCESS',
  'task not found.': 'TASK_NOT_FOUND',
  'you do not have access to this task.': 'TASK_NO_ACCESS',
  'appointment not found.': 'APPOINTMENT_NOT_FOUND',
  'you do not have access to this appointment.': 'APPOINTMENT_NO_ACCESS',
  'sharedcaseid is required for shared_case messages.': 'SHARE_CASE_ID_REQUIRED',
  'sharedtaskid is required for shared_task messages.': 'SHARE_TASK_ID_REQUIRED',
  'sharedappointmentid is required for shared_appointment messages.': 'SHARE_APPT_ID_REQUIRED',
  'exactly one of sharedcaseid, sharedtaskid, or sharedappointmentid must be set for a shared message.':
    'SHARE_EXACTLY_ONE',
  'text messages cannot include sharedcaseid, sharedtaskid, or sharedappointmentid.': 'SHARE_TEXT_NO_IDS',
  'invalid message_type.': 'INVALID_MESSAGE_TYPE',
  'this password is too common.': 'PWD_TOO_COMMON',
  'this password is too short. it must contain at least 8 characters.': 'PWD_TOO_SHORT',
  'this password is entirely numeric.': 'PWD_NUMERIC',
  "the two password fields didn't match.": 'PWD_MISMATCH',
  'address is required for in-person consultations.': 'CONSULT_ADDRESS',
  'a phone number is required for phone consultations.': 'CONSULT_PHONE',
  'a video conference link is required for video consultations.': 'CONSULT_VIDEO',
  'enter a valid url (https://…).': 'INVALID_HTTPS_URL',
  'specify the legal domain when other is selected.': 'CONSULT_OTHER_DOMAIN',
  'duration must be a number of minutes.': 'DURATION_NUMBER',
  'duration must be between 1 and 1440 minutes.': 'DURATION_RANGE',
  'duration or durationminutes is required.': 'DURATION_REQUIRED',
  'court specialty is required.': 'COURT_SPECIALTY',
  'please select a valid chamber for the selected jurisdiction.': 'INVALID_CHAMBER',
  'filingdate must be before or equal to firsthearingdate.': 'FILING_BEFORE_HEARING',
  'firsthearingdate must be before or equal to nexthearingdate.': 'HEARING_ORDER',
  'startdate must be before or equal to duedate.': 'START_BEFORE_DUE',
  'completiondate must be on or after startdate.': 'COMPLETION_AFTER_START',
  'casetype must be one of: consultation, litigation, administrative.': 'CASE_TYPE_ENUM',
  'must be one of: consultation, litigation, administrative.': 'CASE_TYPE_ENUM',
  'case_specific_data must be an object for consultation cases.': 'CSD_OBJECT_CONSULTATION',
  'case_specific_data must be an object for litigation cases.': 'CSD_OBJECT_LITIGATION',
  'case_specific_data must be an object for administrative cases.': 'CSD_OBJECT_ADMIN',
  'cannot assign case to user from different cabinet.': 'ASSIGNEE_WRONG_CABINET',
  'you must accept the terms and conditions to create an account.': 'ACCEPT_TERMS',
  'you must accept data processing consent to create an account.': 'ACCEPT_DATA',
  'trade name is required.': 'TRADE_NAME_REQUIRED',
  'practice type is required.': 'PRACTICE_TYPE_REQUIRED',
  'jurisdiction is required.': 'JURISDICTION_REQUIRED',
  'business address is required.': 'BUSINESS_ADDRESS_REQUIRED',
  'team size must be at least 1.': 'TEAM_SIZE_MIN',
  'amount cannot be negative.': 'AMOUNT_NEGATIVE',
  'provide planned_amount, amount or amount_expected.': 'FEE_AMOUNT_REQUIRED',
  'planned_amount, amount and amount_expected cannot both be set to different values.':
    'FEE_AMOUNT_CONFLICT',
  'lawyer must belong to the same cabinet as the case.': 'LAWYER_WRONG_CABINET',
  'case must have a client to create an invoice.': 'CASE_NEEDS_CLIENT_INVOICE',
  'provide amount_ht or at least one invoice item.': 'INVOICE_AMOUNT_OR_ITEMS',
  'case must belong to a cabinet to create an invoice.': 'INVOICE_NEEDS_CABINET',
  'exact name match': 'CONFLICT_EXACT_NAME',
  'normalized name match': 'CONFLICT_NORMALIZED',
  'same name tokens (order-independent)': 'CONFLICT_TOKENS',
  'normalized organization-name match': 'CONFLICT_ORG_NORM',
  'partial name match': 'CONFLICT_PARTIAL',
  'shared name tokens': 'CONFLICT_SHARED_TOKENS',
  'invalid case id.': 'INVALID_CASE_ID',
  'case not found or not accessible.': 'CASE_NOT_FOUND_OR_INACCESSIBLE',
  'link a case before attaching case documents.': 'LINK_CASE_BEFORE_DOCS',
  'client not found.': 'CLIENT_NOT_FOUND',
};

const NAME_SIMILARITY_RE = /^name similarity:\s*(\d+)%$/i;
const ORG_SIMILARITY_RE = /^organization-name similarity:\s*(\d+)%$/i;
const CASE_REQUIRES_RE = /^(consultation|litigation|administrative) case requires:\s*(.+)$/i;
const MUST_BE_ONE_RE = /^(\S+) must be one of:\s*(.+)$/i;

function matchPattern(lang: Lang, normalized: string): string | null {
  const t = getMessages(lang);
  const codes = t.errors.codes;
  const nameSim = NAME_SIMILARITY_RE.exec(normalized);
  if (nameSim && codes.NAME_SIMILARITY) {
    return interpolate(codes.NAME_SIMILARITY, { percent: nameSim[1] });
  }
  const orgSim = ORG_SIMILARITY_RE.exec(normalized);
  if (orgSim && codes.ORG_NAME_SIMILARITY) {
    return interpolate(codes.ORG_NAME_SIMILARITY, { percent: orgSim[1] });
  }
  const requires = CASE_REQUIRES_RE.exec(normalized);
  if (requires && codes.CASE_REQUIRES) {
    return interpolate(codes.CASE_REQUIRES, { kind: requires[1].toUpperCase(), fields: requires[2] });
  }
  const mustOne = MUST_BE_ONE_RE.exec(normalized);
  if (mustOne && codes.FIELD_MUST_BE_ONE_OF) {
    return interpolate(codes.FIELD_MUST_BE_ONE_OF, { field: mustOne[1], choices: mustOne[2] });
  }
  return null;
}

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

  const patterned = matchPattern(lang, normalized);
  if (patterned) return patterned;

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
