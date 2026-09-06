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
  'vous devez appartenir à un cabinet pour créer des membres.': 'CABINET_REQUIRED_TEAM',
  'vous devez appartenir à un cabinet pour créer des clients.': 'CABINET_REQUIRED_CLIENTS',
  'يجب أن تنتمي إلى مكتب لإنشاء أعضاء الفريق.': 'CABINET_REQUIRED_TEAM',
  'يجب أن تنتمي إلى مكتب لإنشاء عملاء.': 'CABINET_REQUIRED_CLIENTS',
  'client must belong to your cabinet.': 'CLIENT_WRONG_CABINET',
  'client must not be a cabinet member.': 'CLIENT_IS_MEMBER',
  'le client doit appartenir à votre cabinet.': 'CLIENT_WRONG_CABINET',
  'le client ne doit pas être un membre du cabinet.': 'CLIENT_IS_MEMBER',
  'يجب أن ينتمي العميل إلى مكتبك.': 'CLIENT_WRONG_CABINET',
  'يجب ألا يكون العميل عضواً في المكتب.': 'CLIENT_IS_MEMBER',
  'يجب ألا يكون العميل عضوًا في المكتب.': 'CLIENT_IS_MEMBER',
  'case must belong to your cabinet.': 'CASE_WRONG_CABINET',
  'le dossier doit appartenir à votre cabinet.': 'CASE_WRONG_CABINET',
  'يجب أن تنتمي القضية إلى مكتبك.': 'CASE_WRONG_CABINET',
  'invalid user id for assignment.': 'INVALID_ASSIGNEE',
  "identifiant d'utilisateur invalide pour l'assignation.": 'INVALID_ASSIGNEE',
  'معرّف المستخدم غير صالح للتعيين.': 'INVALID_ASSIGNEE',
  'you do not have access to this conversation.': 'CONVERSATION_NO_ACCESS',
  "vous n'avez pas accès à cette conversation.": 'CONVERSATION_NO_ACCESS',
  'ليس لديك صلاحية الوصول إلى هذه المحادثة.': 'CONVERSATION_NO_ACCESS',
  'attendees must belong to your cabinet.': 'ATTENDEES_WRONG_CABINET',
  'attendees must be cabinet team members.': 'ATTENDEES_NOT_MEMBERS',
  'participants must belong to your cabinet.': 'ATTENDEES_WRONG_CABINET',
  'participants must be cabinet team members.': 'ATTENDEES_NOT_MEMBERS',
  'les participants doivent appartenir à votre cabinet.': 'ATTENDEES_WRONG_CABINET',
  'les participants doivent être des membres du cabinet.': 'ATTENDEES_NOT_MEMBERS',
  'يجب أن ينتمي الحاضرون إلى مكتبك.': 'ATTENDEES_WRONG_CABINET',
  'يجب أن يكون الحاضرون أعضاء في المكتب.': 'ATTENDEES_NOT_MEMBERS',
  'يجب أن ينتمي المشاركون إلى مكتبك.': 'ATTENDEES_WRONG_CABINET',
  'يجب أن يكون المشاركون أعضاء في المكتب.': 'ATTENDEES_NOT_MEMBERS',
  'quantity cannot be negative.': 'QTY_NEGATIVE',
  'unit price cannot be negative.': 'PRICE_NEGATIVE',
  'la quantité ne peut pas être négative.': 'QTY_NEGATIVE',
  'le prix unitaire ne peut pas être négatif.': 'PRICE_NEGATIVE',
  'لا يمكن أن تكون الكمية سالبة.': 'QTY_NEGATIVE',
  'لا يمكن أن يكون سعر الوحدة سالبًا.': 'PRICE_NEGATIVE',
  'expense amount cannot be negative.': 'EXPENSE_NEGATIVE',
  'expense amount must be greater than zero.': 'EXPENSE_ZERO',
  'le montant de la dépense ne peut pas être négatif.': 'EXPENSE_NEGATIVE',
  'le montant de la dépense doit être supérieur à zéro.': 'EXPENSE_ZERO',
  'لا يمكن أن يكون مبلغ المصروف سالبًا.': 'EXPENSE_NEGATIVE',
  'يجب أن يكون مبلغ المصروف أكبر من صفر.': 'EXPENSE_ZERO',
  'tags must be a list.': 'TAGS_LIST',
  'file is too large (max 25 mb).': 'FILE_TOO_LARGE_25',
  'the uploaded file is empty.': 'FILE_EMPTY',
  'les tags doivent être une liste.': 'TAGS_LIST',
  'le fichier est trop volumineux (max. 25 mo).': 'FILE_TOO_LARGE_25',
  'le fichier est trop volumineux (max 25 mo).': 'FILE_TOO_LARGE_25',
  'le fichier téléversé est vide.': 'FILE_EMPTY',
  'يجب أن تكون الوسوم قائمة.': 'TAGS_LIST',
  'الملف كبير جدًا (الحد الأقصى 25 ميغابايت).': 'FILE_TOO_LARGE_25',
  'الملف المرفوع فارغ.': 'FILE_EMPTY',
  'title is required.': 'TITLE_REQUIRED',
  'matter not found in your cabinet.': 'MATTER_NOT_FOUND',
  'le titre est requis.': 'TITLE_REQUIRED',
  'dossier introuvable dans votre cabinet.': 'MATTER_NOT_FOUND',
  'العنوان مطلوب.': 'TITLE_REQUIRED',
  'تعذر العثور على الملف في مكتبك.': 'MATTER_NOT_FOUND',
  'user has no cabinet.': 'NO_CABINET',
  "l'utilisateur n'a pas de cabinet.": 'NO_CABINET',
  'المستخدم ليس لديه مكتب.': 'NO_CABINET',
  'authentication required.': 'AUTH_REQUIRED',
  'authentification requise.': 'AUTH_REQUIRED',
  'المصادقة مطلوبة.': 'AUTH_REQUIRED',
  'at least one participant is required': 'PARTICIPANTS_REQUIRED',
  'au moins un participant est requis': 'PARTICIPANTS_REQUIRED',
  'يجب وجود مشارك واحد على الأقل': 'PARTICIPANTS_REQUIRED',
  'email is required.': 'EMAIL_REQUIRED',
  'a user with this email already exists.': 'EMAIL_EXISTS',
  'invalid email address.': 'INVALID_EMAIL',
  "l'email est requis.": 'EMAIL_REQUIRED',
  'un utilisateur avec cet email existe déjà.': 'EMAIL_EXISTS',
  'adresse e-mail invalide.': 'INVALID_EMAIL',
  'adresse email invalide.': 'INVALID_EMAIL',
  'البريد الإلكتروني مطلوب.': 'EMAIL_REQUIRED',
  'يوجد مستخدم بهذا البريد الإلكتروني بالفعل.': 'EMAIL_EXISTS',
  'عنوان البريد الإلكتروني غير صالح.': 'INVALID_EMAIL',
  'phone number is required.': 'PHONE_REQUIRED',
  'a user with this phone number already exists.': 'PHONE_EXISTS',
  'le numéro de téléphone est requis.': 'PHONE_REQUIRED',
  'un utilisateur avec ce numéro de téléphone existe déjà.': 'PHONE_EXISTS',
  'رقم الهاتف مطلوب.': 'PHONE_REQUIRED',
  'يوجد مستخدم برقم الهاتف هذا بالفعل.': 'PHONE_EXISTS',
  'يوجد مستخدم بهذا الرقم بالفعل.': 'PHONE_EXISTS',
  'first name is required.': 'FIRST_NAME_REQUIRED',
  'first name must contain at least 2 characters.': 'FIRST_NAME_SHORT',
  'last name is required.': 'LAST_NAME_REQUIRED',
  'last name must contain at least 2 characters.': 'LAST_NAME_SHORT',
  'le prénom est requis.': 'FIRST_NAME_REQUIRED',
  'le prénom doit contenir au moins 2 caractères.': 'FIRST_NAME_SHORT',
  'le nom est requis.': 'LAST_NAME_REQUIRED',
  'le nom doit contenir au moins 2 caractères.': 'LAST_NAME_SHORT',
  'الاسم الأول مطلوب.': 'FIRST_NAME_REQUIRED',
  'يجب أن يحتوي الاسم الأول على حرفين على الأقل.': 'FIRST_NAME_SHORT',
  'اسم العائلة مطلوب.': 'LAST_NAME_REQUIRED',
  'يجب أن يحتوي اسم العائلة على حرفين على الأقل.': 'LAST_NAME_SHORT',
  'direct conversation must have exactly you and one other participant': 'DIRECT_TWO',
  'you cannot create a direct conversation with yourself': 'DIRECT_SELF',
  'you cannot delete a conversation you are a participant of': 'CANNOT_DELETE_PARTICIPANT_CONV',
  'une conversation directe doit inclure exactement vous et un autre participant': 'DIRECT_TWO',
  'vous ne pouvez pas créer une conversation directe avec vous-même': 'DIRECT_SELF',
  'vous ne pouvez pas supprimer une conversation dont vous êtes participant': 'CANNOT_DELETE_PARTICIPANT_CONV',
  'يجب أن تتضمن المحادثة المباشرة أنت ومشاركاً آخر فقط': 'DIRECT_TWO',
  'لا يمكنك إنشاء محادثة مباشرة مع نفسك': 'DIRECT_SELF',
  'لا يمكنك حذف محادثة أنت مشارك فيها': 'CANNOT_DELETE_PARTICIPANT_CONV',
  'payment amount must be greater than zero.': 'PAYMENT_ZERO',
  'invoice does not belong to this case.': 'INVOICE_WRONG_CASE',
  'case must have a client to record a payment.': 'CASE_NEEDS_CLIENT_PAYMENT',
  'could not resolve client profile for this case.': 'CLIENT_PROFILE_RESOLVE',
  'le montant du paiement doit être supérieur à zéro.': 'PAYMENT_ZERO',
  "la facture n'appartient pas à ce dossier.": 'INVOICE_WRONG_CASE',
  'le dossier doit avoir un client pour enregistrer un paiement.': 'CASE_NEEDS_CLIENT_PAYMENT',
  'impossible de résoudre le profil client pour ce dossier.': 'CLIENT_PROFILE_RESOLVE',
  'يجب أن يكون مبلغ الدفع أكبر من صفر.': 'PAYMENT_ZERO',
  'الفاتورة لا تنتمي إلى هذه القضية.': 'INVOICE_WRONG_CASE',
  'يجب أن تحتوي القضية على عميل لتسجيل دفعة.': 'CASE_NEEDS_CLIENT_PAYMENT',
  'يجب أن يكون للقضية عميل لتسجيل دفعة.': 'CASE_NEEDS_CLIENT_PAYMENT',
  'تعذر حل ملف العميل لهذه القضية.': 'CLIENT_PROFILE_RESOLVE',
  'invalid status.': 'INVALID_STATUS',
  'statut invalide.': 'INVALID_STATUS',
  'حالة غير صالحة.': 'INVALID_STATUS',
  'you must belong to a cabinet.': 'NO_CABINET',
  'vous devez appartenir à un cabinet.': 'NO_CABINET',
  'يجب أن تنتمي إلى مكتب.': 'NO_CABINET',
  'no cabinet associated with this user.': 'NO_CABINET',
  'you are not a participant in this conversation.': 'CONVERSATION_NO_ACCESS',
  'you do not have access to this case.': 'CASE_NO_ACCESS',
  "vous n'avez pas accès à ce dossier.": 'CASE_NO_ACCESS',
  'ليس لديك صلاحية الوصول إلى هذه القضية.': 'CASE_NO_ACCESS',
  'you do not have access to this task.': 'TASK_NO_ACCESS',
  "vous n'avez pas accès à cette tâche.": 'TASK_NO_ACCESS',
  'ليس لديك صلاحية الوصول إلى هذه المهمة.': 'TASK_NO_ACCESS',
  'you do not have access to this appointment.': 'APPOINTMENT_NO_ACCESS',
  "vous n'avez pas accès à ce rendez-vous.": 'APPOINTMENT_NO_ACCESS',
  'ليس لديك صلاحية الوصول إلى هذا الموعد.': 'APPOINTMENT_NO_ACCESS',
  'case not found.': 'CASE_NOT_FOUND',
  'dossier introuvable.': 'CASE_NOT_FOUND',
  'القضية غير موجودة.': 'CASE_NOT_FOUND',
  'task not found.': 'TASK_NOT_FOUND',
  'tâche introuvable.': 'TASK_NOT_FOUND',
  'المهمة غير موجودة.': 'TASK_NOT_FOUND',
  'appointment not found.': 'APPOINTMENT_NOT_FOUND',
  'rendez-vous introuvable.': 'APPOINTMENT_NOT_FOUND',
  'الموعد غير موجود.': 'APPOINTMENT_NOT_FOUND',
  'please select a permanent jure group conversation.': 'APPT_SELECT_PERM_CONV',
  'veuillez sélectionner une conversation de groupe jure permanente.': 'APPT_SELECT_PERM_CONV',
  'يرجى اختيار محادثة مجموعة jure دائمة.': 'APPT_SELECT_PERM_CONV',
  'this project is archived.': 'PROJECT_ARCHIVED',
  'ce projet est archivé.': 'PROJECT_ARCHIVED',
  'هذا المشروع مؤرشف.': 'PROJECT_ARCHIVED',
  'insufficient project role.': 'INSUFFICIENT_PROJECT_ROLE',
  'rôle projet insuffisant.': 'INSUFFICIENT_PROJECT_ROLE',
  'دور المشروع غير كافٍ.': 'INSUFFICIENT_PROJECT_ROLE',
  'this project role cannot modify content.': 'PROJECT_ROLE_NO_MODIFY',
  'ce rôle projet ne peut pas modifier le contenu.': 'PROJECT_ROLE_NO_MODIFY',
  'هذا الدور لا يسمح بتعديل المحتوى.': 'PROJECT_ROLE_NO_MODIFY',
  'this project role cannot manage members.': 'PROJECT_ROLE_NO_MEMBERS',
  'ce rôle projet ne peut pas gérer les membres.': 'PROJECT_ROLE_NO_MEMBERS',
  'هذا الدور لا يسمح بإدارة الأعضاء.': 'PROJECT_ROLE_NO_MEMBERS',
  'only the project owner can perform this action.': 'PROJECT_OWNER_ONLY',
  'seul le propriétaire du projet peut effectuer cette action.': 'PROJECT_OWNER_ONLY',
  'مالك المشروع وحده يمكنه تنفيذ هذا الإجراء.': 'PROJECT_OWNER_ONLY',
  'user is not in this cabinet.': 'USER_NOT_IN_CABINET',
  "l'utilisateur n'est pas dans ce cabinet.": 'USER_NOT_IN_CABINET',
  'المستخدم ليس في هذا المكتب.': 'USER_NOT_IN_CABINET',
  'case is not in this cabinet.': 'CASE_NOT_IN_CABINET',
  "le dossier n'est pas dans ce cabinet.": 'CASE_NOT_IN_CABINET',
  'القضية ليست في هذا المكتب.': 'CASE_NOT_IN_CABINET',
  'one or more case documents are not accessible.': 'CASE_DOCS_INACCESSIBLE',
  'un ou plusieurs documents du dossier ne sont pas accessibles.': 'CASE_DOCS_INACCESSIBLE',
  'مستند واحد أو أكثر من مستندات القضية غير قابل للوصول.': 'CASE_DOCS_INACCESSIBLE',
  'one or more library documents are not accessible.': 'LIBRARY_DOCS_INACCESSIBLE',
  'un ou plusieurs documents de la bibliothèque ne sont pas accessibles.': 'LIBRARY_DOCS_INACCESSIBLE',
  'مستند واحد أو أكثر من مستندات المكتبة غير قابل للوصول.': 'LIBRARY_DOCS_INACCESSIBLE',
  'client is not in this cabinet.': 'CLIENT_NOT_IN_CABINET',
  "le client n'est pas dans ce cabinet.": 'CLIENT_NOT_IN_CABINET',
  'العميل ليس في هذا المكتب.': 'CLIENT_NOT_IN_CABINET',
  'user must belong to a cabinet to create documents.': 'LIB_CREATE_CABINET',
  "l'utilisateur doit appartenir à un cabinet pour créer des documents.": 'LIB_CREATE_CABINET',
  'يجب أن ينتمي المستخدم إلى مكتب لإنشاء مستندات.': 'LIB_CREATE_CABINET',
  'this resource is private to another cabinet.': 'LIB_PRIVATE_CABINET',
  'cette ressource est privée à un autre cabinet.': 'LIB_PRIVATE_CABINET',
  'هذا المورد خاص بمكتب آخر.': 'LIB_PRIVATE_CABINET',
  'user must belong to a cabinet to add documents.': 'LIB_ADD_CABINET',
  "l'utilisateur doit appartenir à un cabinet pour ajouter des documents.": 'LIB_ADD_CABINET',
  'يجب أن ينتمي المستخدم إلى مكتب لإضافة مستندات.': 'LIB_ADD_CABINET',
  'shared library documents cannot be edited or deleted from a cabinet.': 'LIB_SHARED_NO_EDIT',
  'les documents de bibliothèque partagés ne peuvent pas être modifiés ou supprimés depuis un cabinet.':
    'LIB_SHARED_NO_EDIT',
  'لا يمكن تعديل أو حذف مستندات المكتبة المشتركة من مكتب.': 'LIB_SHARED_NO_EDIT',
  'shared library documents cannot be deleted from a cabinet.': 'LIB_SHARED_NO_DELETE',
  'les documents de bibliothèque partagés ne peuvent pas être supprimés depuis un cabinet.':
    'LIB_SHARED_NO_DELETE',
  'لا يمكن حذف مستندات المكتبة المشتركة من مكتب.': 'LIB_SHARED_NO_DELETE',
  'only platform administrators can archive shared library resources.': 'LIB_ARCHIVE_PLATFORM',
  'seuls les administrateurs de la plateforme peuvent archiver les ressources de bibliothèque partagées.':
    'LIB_ARCHIVE_PLATFORM',
  'مسؤولو المنصة وحدهم يمكنهم أرشفة موارد المكتبة المشتركة.': 'LIB_ARCHIVE_PLATFORM',
  'only administrators can archive library documents.': 'LIB_ARCHIVE_ADMIN',
  'seuls les administrateurs peuvent archiver les documents de bibliothèque.': 'LIB_ARCHIVE_ADMIN',
  'المسؤولون وحدهم يمكنهم أرشفة مستندات المكتبة.': 'LIB_ARCHIVE_ADMIN',
  'only platform administrators can restore shared library resources.': 'LIB_RESTORE_PLATFORM',
  'seuls les administrateurs de la plateforme peuvent restaurer les ressources de bibliothèque partagées.':
    'LIB_RESTORE_PLATFORM',
  'مسؤولو المنصة وحدهم يمكنهم استعادة موارد المكتبة المشتركة.': 'LIB_RESTORE_PLATFORM',
  'only administrators can restore library documents.': 'LIB_RESTORE_ADMIN',
  'seuls les administrateurs peuvent restaurer les documents de bibliothèque.': 'LIB_RESTORE_ADMIN',
  'المسؤولون وحدهم يمكنهم استعادة مستندات المكتبة.': 'LIB_RESTORE_ADMIN',
  'only administrators can perform bulk library actions.': 'LIB_BULK_ADMIN',
  'seuls les administrateurs peuvent effectuer des actions groupées sur la bibliothèque.':
    'LIB_BULK_ADMIN',
  'المسؤولون وحدهم يمكنهم تنفيذ إجراءات جماعية على المكتبة.': 'LIB_BULK_ADMIN',
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
  'casetype doit être l’un de : consultation, litigation, administrative.': 'CASE_TYPE_ENUM',
  'casetype doit être l\'un de : consultation, litigation, administrative.': 'CASE_TYPE_ENUM',
  'doit être l’un de : consultation, litigation, administrative.': 'CASE_TYPE_ENUM',
  'doit être l\'un de : consultation, litigation, administrative.': 'CASE_TYPE_ENUM',
  'يجب أن يكون casetype أحد: consultation أو litigation أو administrative.': 'CASE_TYPE_ENUM',
  'يجب أن يكون أحد: consultation أو litigation أو administrative.': 'CASE_TYPE_ENUM',
  'case_specific_data must be an object for consultation cases.': 'CSD_OBJECT_CONSULTATION',
  'case_specific_data must be an object for litigation cases.': 'CSD_OBJECT_LITIGATION',
  'case_specific_data must be an object for administrative cases.': 'CSD_OBJECT_ADMIN',
  'cannot assign case to user from different cabinet.': 'ASSIGNEE_WRONG_CABINET',
  "impossible d'assigner le dossier à un utilisateur d'un autre cabinet.": 'ASSIGNEE_WRONG_CABINET',
  'لا يمكن إسناد القضية إلى مستخدم من مكتب آخر.': 'ASSIGNEE_WRONG_CABINET',
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
  'please select at least one team member.': 'APPT_SELECT_MEMBER',
  'please select a client for this appointment.': 'APPT_SELECT_CLIENT',
  'please select a jure group conversation or create one.': 'APPT_SELECT_OR_CREATE_CONV',
  'please select a jure group conversation for the video conference.': 'APPT_SELECT_VIDEO_CONV',
  'please select a permanent jure group conversation.': 'APPT_SELECT_PERM_CONV',
  'please enter an address for an in-person appointment.': 'APPT_IN_PERSON_ADDRESS',
  'please select at least one participant.': 'TASK_SELECT_PARTICIPANT',
  'cannot pay a cancelled invoice.': 'PAY_CANCELLED_INVOICE',
  'send the invoice before recording a payment.': 'PAY_SEND_INVOICE_FIRST',
  'cancelled invoices cannot change status.': 'INVOICE_CANCELLED_STATUS',
  'paid invoices cannot be changed via status endpoint.': 'INVOICE_PAID_NO_STATUS',
  'paid invoices cannot be cancelled via status endpoint.': 'INVOICE_PAID_NO_CANCEL',
  'seuls les brouillons permettent de modifier le montant ht / la tva / les lignes. vous pouvez mettre à jour les notes et la date d’échéance.':
    'INVOICE_DRAFT_ONLY_AMOUNTS',
  'seuls les brouillons permettent de modifier le montant ht / la tva / les lignes. vous pouvez mettre à jour les notes et la date d\'échéance.':
    'INVOICE_DRAFT_ONLY_AMOUNTS',
  'modification interdite pour ce statut.': 'INVOICE_FIELD_LOCKED',
  'birthday cannot be in the future.': 'BIRTHDAY_FUTURE',
  'la date de naissance ne peut pas être dans le futur.': 'BIRTHDAY_FUTURE',
  'لا يمكن أن يكون تاريخ الميلاد في المستقبل.': 'BIRTHDAY_FUTURE',
  'birthday cannot be before 1950.': 'BIRTHDAY_BEFORE_1950',
  'user must be at least 18 years old.': 'AGE_MIN_18',
  "l'utilisateur doit avoir au moins 18 ans.": 'AGE_MIN_18',
  'يجب أن يكون المستخدم عمره 18 عاماً على الأقل.': 'AGE_MIN_18',
  'iban must be exactly 24 characters long.': 'IBAN_LENGTH',
  "l'iban doit faire exactement 24 caractères.": 'IBAN_LENGTH',
  'يجب أن يكون iban بالضبط 24 حرفاً.': 'IBAN_LENGTH',
  'professional card number must contain only digits and be at least 4 characters long.':
    'PROF_CARD_FORMAT',
  'bar inscription year must be between 1950 and current year.': 'BAR_YEAR_RANGE',
  'bar inscription year must be a valid year.': 'BAR_YEAR_INVALID',
  'ice must contain exactly 15 digits.': 'ICE_DIGITS',
  'upload a document or provide an external url.': 'LIB_FILE_OR_URL',
  'select a jurisdiction for the local library.': 'LIB_LOCAL_JURISDICTION',
  'no verified rule is currently available for this procedure.': 'DEADLINE_NO_RULE',
  'provide procedure_type or rule_id.': 'DEADLINE_NEED_PROCEDURE',
  'unsupported file type. use pdf or docx.': 'FILE_PDF_DOCX',
  'user is not attached to any cabinet.': 'NO_CABINET',
  'the phone number entered is not valid.': 'PHONE_INVALID',
  'call history messages are created by the system only.': 'CALL_HISTORY_SYSTEM_ONLY',
  'only one shared item reference is allowed per message.': 'SHARE_ONE_ONLY',
  'une seule référence d’élément partagé est autorisée par message.': 'SHARE_ONE_ONLY',
  "une seule référence d'élément partagé est autorisée par message.": 'SHARE_ONE_ONLY',
  'يُسمح بمرجع عنصر مشارك واحد فقط لكل رسالة.': 'SHARE_ONE_ONLY',
  'text messages cannot reference a shared item.': 'SHARE_TEXT_NO_IDS',
  'les messages texte ne peuvent pas référencer un élément partagé.': 'SHARE_TEXT_NO_IDS',
  'لا يمكن لرسائل النص الإشارة إلى عنصر مشارك.': 'SHARE_TEXT_NO_IDS',
  'shared_case is required when message_type is shared_case.': 'SHARE_CASE_ID_REQUIRED',
  'shared_task is required when message_type is shared_task.': 'SHARE_TASK_ID_REQUIRED',
  'shared_appointment is required when message_type is shared_appointment.': 'SHARE_APPT_ID_REQUIRED',
  'shared_call is required for call history messages.': 'SHARE_CALL_REQUIRED',
  'shared_call est requis pour les messages d’historique d’appel.': 'SHARE_CALL_REQUIRED',
  "shared_call est requis pour les messages d'historique d'appel.": 'SHARE_CALL_REQUIRED',
  'shared_call مطلوب لرسائل سجل المكالمات.': 'SHARE_CALL_REQUIRED',
  'this link protocol is not allowed.': 'LINK_PROTOCOL_FORBIDDEN',
  'ce protocole de lien n’est pas autorisé.': 'LINK_PROTOCOL_FORBIDDEN',
  "ce protocole de lien n'est pas autorisé.": 'LINK_PROTOCOL_FORBIDDEN',
  'بروتوكول الرابط هذا غير مسموح.': 'LINK_PROTOCOL_FORBIDDEN',
  'protocol-relative urls are not allowed.': 'LINK_PROTOCOL_RELATIVE',
  'les url relatives au protocole ne sont pas autorisées.': 'LINK_PROTOCOL_RELATIVE',
  'عناوين url النسبية للبروتوكول غير مسموحة.': 'LINK_PROTOCOL_RELATIVE',
  'enter a valid internal path.': 'LINK_INTERNAL_PATH',
  'saisissez un chemin interne valide.': 'LINK_INTERNAL_PATH',
  'أدخل مسارًا داخليًا صالحًا.': 'LINK_INTERNAL_PATH',
  'use an internal path (starting with /) or a valid https url.': 'LINK_HTTPS_OR_PATH',
  'utilisez un chemin interne (commençant par /) ou une url https valide.': 'LINK_HTTPS_OR_PATH',
  'استخدم مسارًا داخليًا (يبدأ بـ /) أو عنوان https صالحًا.': 'LINK_HTTPS_OR_PATH',
  'urls with credentials are not allowed.': 'LINK_NO_CREDENTIALS',
  'les url avec identifiants ne sont pas autorisées.': 'LINK_NO_CREDENTIALS',
  'عناوين url التي تحتوي على بيانات اعتماد غير مسموحة.': 'LINK_NO_CREDENTIALS',
  'no previous version to restore.': 'ARTIFACT_NO_PREV_VERSION',
  'aucune version précédente à restaurer.': 'ARTIFACT_NO_PREV_VERSION',
  'لا توجد نسخة سابقة للاستعادة.': 'ARTIFACT_NO_PREV_VERSION',
  'invalid version number.': 'ARTIFACT_INVALID_VERSION',
  'numéro de version invalide.': 'ARTIFACT_INVALID_VERSION',
  'رقم الإصدار غير صالح.': 'ARTIFACT_INVALID_VERSION',
  'version must be between 1 and the previous version.': 'ARTIFACT_VERSION_RANGE',
  'la version doit être entre 1 et la version précédente.': 'ARTIFACT_VERSION_RANGE',
  'يجب أن يكون الإصدار بين 1 والإصدار السابق.': 'ARTIFACT_VERSION_RANGE',
  'version not found.': 'ARTIFACT_VERSION_NOT_FOUND',
  'version introuvable.': 'ARTIFACT_VERSION_NOT_FOUND',
  'الإصدار غير موجود.': 'ARTIFACT_VERSION_NOT_FOUND',
  'invalid version numbers.': 'ARTIFACT_INVALID_VERSIONS',
  'numéros de version invalides.': 'ARTIFACT_INVALID_VERSIONS',
  'أرقام الإصدار غير صالحة.': 'ARTIFACT_INVALID_VERSIONS',
};

const NAME_SIMILARITY_RE = /^name similarity:\s*(\d+)%$/i;
const ORG_SIMILARITY_RE = /^organization-name similarity:\s*(\d+)%$/i;
const CASE_REQUIRES_RE = /^(consultation|litigation|administrative) case requires:\s*(.+)$/i;
const MUST_BE_ONE_RE = /^(\S+) must be one of:\s*(.+)$/i;
const PAYMENT_EXCEEDS_RE = /^payment exceeds outstanding balance \((.+) mad\)\.$/i;
const TRANSITION_SENT_RE = /^cannot transition from (.+) to sent\.$/i;
const UNSUPPORTED_FILE_RE = /^unsupported file type \((.+)\)\. allowed:\s*(.+)$/i;
const INVALID_MUST_ONE_RE = /^invalid (category|status|resource type)\. must be one of:\s*(.+)$/i;
const INVALID_TAG_RE = /^invalid tag:\s*(.+)$/i;
const FEE_NOT_ON_CASE_RE = /^fee (\d+) not on this case\.$/i;
const EXPENSE_NOT_ON_CASE_RE = /^expense (\d+) not on this case\.$/i;
const ERROR_CREATING_RE = /^error creating (client|team member|cabinet):\s*(.+)$/i;
const ERROR_SAVING_USER_RE = /^error saving user:\s*(.+)$/i;
const ATTACHMENT_VALIDATION_RE = /^attachment validation error:\s*(.+)$/i;

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
  const payExceeds = PAYMENT_EXCEEDS_RE.exec(normalized);
  if (payExceeds && codes.PAYMENT_EXCEEDS) {
    return interpolate(codes.PAYMENT_EXCEEDS, { amount: payExceeds[1] });
  }
  const transition = TRANSITION_SENT_RE.exec(normalized);
  if (transition && codes.INVOICE_TRANSITION_SENT) {
    return interpolate(codes.INVOICE_TRANSITION_SENT, { current: transition[1] });
  }
  const unsupported = UNSUPPORTED_FILE_RE.exec(normalized);
  if (unsupported && codes.UNSUPPORTED_FILE_TYPE) {
    return interpolate(codes.UNSUPPORTED_FILE_TYPE, { ext: unsupported[1], allowed: unsupported[2] });
  }
  const invalidOne = INVALID_MUST_ONE_RE.exec(normalized);
  if (invalidOne && codes.INVALID_CHOICE_LIST) {
    return interpolate(codes.INVALID_CHOICE_LIST, { kind: invalidOne[1], choices: invalidOne[2] });
  }
  const invalidTag = INVALID_TAG_RE.exec(normalized);
  if (invalidTag && codes.INVALID_TAG) {
    return interpolate(codes.INVALID_TAG, { tag: invalidTag[1] });
  }
  const feeNot = FEE_NOT_ON_CASE_RE.exec(normalized);
  if (feeNot && codes.FEE_NOT_ON_CASE) {
    return interpolate(codes.FEE_NOT_ON_CASE, { id: feeNot[1] });
  }
  const expenseNot = EXPENSE_NOT_ON_CASE_RE.exec(normalized);
  if (expenseNot && codes.EXPENSE_NOT_ON_CASE) {
    return interpolate(codes.EXPENSE_NOT_ON_CASE, { id: expenseNot[1] });
  }
  const creating = ERROR_CREATING_RE.exec(normalized);
  if (creating) {
    const kind = creating[1].toLowerCase();
    const detail = creating[2];
    const nestedCode = PHRASE_TO_CODE[detail.toLowerCase()] ?? PHRASE_TO_CODE[detail];
    const nested = (nestedCode && codes[nestedCode]) || detail;
    if (kind === 'client' && codes.ERROR_CREATING_CLIENT) {
      return interpolate(codes.ERROR_CREATING_CLIENT, { detail: nested });
    }
    if (kind === 'team member' && codes.ERROR_CREATING_TEAM) {
      return interpolate(codes.ERROR_CREATING_TEAM, { detail: nested });
    }
    if (kind === 'cabinet' && codes.ERROR_CREATING_CABINET) {
      return interpolate(codes.ERROR_CREATING_CABINET, { detail: nested });
    }
  }
  const savingUser = ERROR_SAVING_USER_RE.exec(normalized);
  if (savingUser && codes.ERROR_SAVING_USER) {
    const detail = savingUser[1];
    const nestedCode = PHRASE_TO_CODE[detail.toLowerCase()] ?? PHRASE_TO_CODE[detail];
    return interpolate(codes.ERROR_SAVING_USER, {
      detail: (nestedCode && codes[nestedCode]) || detail,
    });
  }
  const attachment = ATTACHMENT_VALIDATION_RE.exec(normalized);
  if (attachment && codes.ATTACHMENT_VALIDATION) {
    const detail = attachment[1];
    const nestedCode = PHRASE_TO_CODE[detail.toLowerCase()] ?? PHRASE_TO_CODE[detail];
    return interpolate(codes.ATTACHMENT_VALIDATION, {
      detail: (nestedCode && codes[nestedCode]) || detail,
    });
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
