import * as yup from 'yup';

// File validation helper
const fileSchema = (
  required: boolean = false,
  maxSize: number = 2 * 1024 * 1024, // 2MB
  allowedTypes: string[] = ['image/jpeg', 'image/jpg', 'image/png']
) => {
  let schema = yup.mixed<File>().nullable();

  if (required) {
    schema = schema.required('Ce fichier est requis');
  }

  return schema.test('fileValidation', 'Fichier invalide', function (file) {
    if (!file) return !required;

    if (!allowedTypes.includes(file.type)) {
      return this.createError({ message: 'Type de fichier non supporté' });
    }

    if (file.size > maxSize) {
      return this.createError({ message: `Fichier trop volumineux (max ${Math.round(maxSize / 1024 / 1024)}MB)` });
    }

    return true;
  });
};

const STRUCTURE_TYPES = [
  'Cabinet d\'avocat',
  'Société d\'avocat',
  'Société privée',
  'Association',
  'Administration publique',
  'Autre',
] as const;

export const signupValidationSchema = yup.object({
  // Personal Info - Step 1
  first_name: yup
    .string()
    .required('Le nom est requis')
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),

  last_name: yup
    .string()
    .required('Le prénom est requis')
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères'),

  country: yup
    .string()
    .required('Le pays est requis'),

  phone: yup
    .string()
    .required('Le numéro de téléphone est requis')
    .min(10, 'Le numéro de téléphone doit contenir au moins 10 chiffres'),

  email: yup
    .string()
    .required('L\'email est requis')
    .email('Adresse email invalide')
    .max(100, 'L\'email ne peut pas dépasser 100 caractères'),

  password1: yup
    .string()
    .required('Le mot de passe est requis')
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial'
    ),

  password2: yup
    .string()
    .required('La confirmation du mot de passe est requise')
    .oneOf([yup.ref('password1')], 'Les mots de passe ne correspondent pas'),

  // Profile - Step 2
  trade_name: yup
    .string()
    .trim()
    .required('Le nom commercial est requis')
    .min(2, 'Le nom commercial doit contenir au moins 2 caractères')
    .max(100, 'Le nom commercial ne peut pas dépasser 100 caractères'),

  logo: fileSchema(false),

  // Qualifications - Step 3
  structure_type: yup
    .string()
    .required('Le type de structure est requis')
    .oneOf(STRUCTURE_TYPES as unknown as string[], 'Sélectionnez un type de structure valide'),

  business_address: yup
    .string()
    .required('L\'adresse est requise')
    .min(10, 'L\'adresse doit contenir au moins 10 caractères')
    .max(500, 'L\'adresse ne peut pas dépasser 500 caractères'),

  // Organisation Details - Step 4
  team_size: yup
    .string()
    .required('Le nombre de collaborateurs est requis'),

  website: yup
    .string()
    .url('L\'URL doit être valide')
    .optional(),

  // Consent - Step 5
  accept_terms: yup
    .boolean()
    .required('Vous devez accepter les conditions d\'utilisation')
    .oneOf([true], 'Vous devez accepter les conditions d\'utilisation'),

  accept_data_processing: yup
    .boolean()
    .required('Vous devez consentir au traitement des données')
    .oneOf([true], 'Vous devez consentir au traitement des données'),
});

// Step-specific validation schemas for better UX
export const step1ValidationSchema = signupValidationSchema.pick([
  'first_name',
  'last_name',
  'country',
  'phone',
  'email',
  'password1',
  'password2',
]);

export const step2ValidationSchema = signupValidationSchema.pick([
  'trade_name',
  'logo',
]);

export const step3ValidationSchema = signupValidationSchema.pick([
  'structure_type',
  'business_address',
]);

export const step4ValidationSchema = signupValidationSchema.pick([
  'team_size',
  'website',
]);

export const step5ValidationSchema = signupValidationSchema.pick([
  'accept_terms',
  'accept_data_processing',
]);

export type SignUpValidationSchema = yup.InferType<typeof signupValidationSchema>;