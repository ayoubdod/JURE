import * as yup from 'yup';
import type { AppMessages } from '@/i18n/messages/types';
import { interpolate } from '@/i18n/format';

/** Stable API values (French) — labels come from i18n. */
export const STRUCTURE_TYPE_VALUES = [
  "Cabinet d'avocat",
  "Société d'avocat",
  'Société privée',
  'Association',
  'Administration publique',
  'Autre',
] as const;

export type StructureTypeValue = (typeof STRUCTURE_TYPE_VALUES)[number];

export const STRUCTURE_TYPE_KEYS = [
  'lawFirm',
  'lawCompany',
  'privateCompany',
  'association',
  'publicAdmin',
  'other',
] as const;

export type SignUpData = {
  first_name: string;
  last_name: string;
  country: string;
  phone: string;
  email: string;
  password1: string;
  password2: string;
  trade_name: string;
  logo: File | null | undefined;
  structure_type: string;
  business_address: string;
  team_size: string;
  website?: string | null | undefined;
  accept_terms: boolean;
  accept_data_processing: boolean;
};

type SignupMessages = AppMessages['auth']['signup'];

const fileSchema = (
  v: SignupMessages['validation'],
  required: boolean = false,
  maxSize: number = 2 * 1024 * 1024,
  allowedTypes: string[] = ['image/jpeg', 'image/jpg', 'image/png']
) => {
  let schema = yup.mixed<File>().nullable();

  if (required) {
    schema = schema.required(v.fileRequired);
  }

  return schema.test('fileValidation', v.fileInvalid, function (file) {
    if (!file) return !required;

    if (!allowedTypes.includes(file.type)) {
      return this.createError({ message: v.unsupportedFileType });
    }

    if (file.size > maxSize) {
      return this.createError({
        message: interpolate(v.fileTooLarge, { max: Math.round(maxSize / 1024 / 1024) }),
      });
    }

    return true;
  });
};

export function createSignupValidationSchema(signup: SignupMessages) {
  const v = signup.validation;

  return yup.object({
    first_name: yup
      .string()
      .required(v.firstNameRequired)
      .min(2, v.firstNameMin)
      .max(50, v.firstNameMax),

    last_name: yup
      .string()
      .required(v.lastNameRequired)
      .min(2, v.lastNameMin)
      .max(50, v.lastNameMax),

    country: yup.string().required(v.countryRequired),

    phone: yup.string().required(v.phoneRequired).min(10, v.phoneMin),

    email: yup
      .string()
      .required(v.emailRequired)
      .email(v.emailInvalid)
      .max(100, v.emailMax),

    password1: yup
      .string()
      .required(v.passwordRequired)
      .min(8, v.passwordMin)
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        v.passwordComplexity
      ),

    password2: yup
      .string()
      .required(v.passwordConfirmRequired)
      .oneOf([yup.ref('password1')], v.passwordsDoNotMatch),

    trade_name: yup
      .string()
      .trim()
      .required(v.tradeNameRequired)
      .min(2, v.tradeNameMin)
      .max(100, v.tradeNameMax),

    logo: fileSchema(v, false),

    structure_type: yup
      .string()
      .required(v.structureRequired)
      .oneOf([...STRUCTURE_TYPE_VALUES], v.structureInvalid),

    business_address: yup
      .string()
      .required(v.addressRequired)
      .min(10, v.addressMin)
      .max(500, v.addressMax),

    team_size: yup.string().required(v.teamSizeRequired),

    website: yup.string().url(v.websiteInvalid).optional(),

    accept_terms: yup
      .boolean()
      .required(v.acceptTerms)
      .oneOf([true], v.acceptTerms),

    accept_data_processing: yup
      .boolean()
      .required(v.acceptDataProcessing)
      .oneOf([true], v.acceptDataProcessing),
  });
}

export type SignupSchema = ReturnType<typeof createSignupValidationSchema>;

export function createSignupStepSchemas(signup: SignupMessages) {
  const signupValidationSchema = createSignupValidationSchema(signup);
  return {
    signupValidationSchema,
    step1ValidationSchema: signupValidationSchema.pick([
      'first_name',
      'last_name',
      'country',
      'phone',
      'email',
      'password1',
      'password2',
    ]),
    step2ValidationSchema: signupValidationSchema.pick(['trade_name', 'logo']),
    step3ValidationSchema: signupValidationSchema.pick(['structure_type', 'business_address']),
    step4ValidationSchema: signupValidationSchema.pick(['team_size', 'website']),
    step5ValidationSchema: signupValidationSchema.pick([
      'accept_terms',
      'accept_data_processing',
    ]),
  };
}

/** @deprecated Prefer createSignupValidationSchema with useAppTranslation */
export const signupValidationSchema = createSignupValidationSchema(
  // Lazy placeholder — real messages come from createSignup* at runtime.
  // Kept only so InferType-style imports that still reference the name compile during migration.
  {
    validation: {
      fileRequired: 'Required',
      fileInvalid: 'Invalid',
      unsupportedFileType: 'Unsupported',
      fileTooLarge: 'Too large',
      firstNameRequired: 'Required',
      firstNameMin: 'Min',
      firstNameMax: 'Max',
      lastNameRequired: 'Required',
      lastNameMin: 'Min',
      lastNameMax: 'Max',
      countryRequired: 'Required',
      phoneRequired: 'Required',
      phoneMin: 'Min',
      emailRequired: 'Required',
      emailInvalid: 'Invalid',
      emailMax: 'Max',
      passwordRequired: 'Required',
      passwordMin: 'Min',
      passwordComplexity: 'Complex',
      passwordConfirmRequired: 'Required',
      passwordsDoNotMatch: 'Mismatch',
      tradeNameRequired: 'Required',
      tradeNameMin: 'Min',
      tradeNameMax: 'Max',
      structureRequired: 'Required',
      structureInvalid: 'Invalid',
      addressRequired: 'Required',
      addressMin: 'Min',
      addressMax: 'Max',
      teamSizeRequired: 'Required',
      websiteInvalid: 'Invalid',
      acceptTerms: 'Required',
      acceptDataProcessing: 'Required',
    },
  } as SignupMessages
);

export const step1ValidationSchema = signupValidationSchema.pick([
  'first_name',
  'last_name',
  'country',
  'phone',
  'email',
  'password1',
  'password2',
]);

export const step2ValidationSchema = signupValidationSchema.pick(['trade_name', 'logo']);

export const step3ValidationSchema = signupValidationSchema.pick([
  'structure_type',
  'business_address',
]);

export const step4ValidationSchema = signupValidationSchema.pick(['team_size', 'website']);

export const step5ValidationSchema = signupValidationSchema.pick([
  'accept_terms',
  'accept_data_processing',
]);

export type SignUpValidationSchema = SignUpData;
