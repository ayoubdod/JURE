import { useAppTranslation } from '@/i18n';

export const validatePassword = (password: string) => {
  const minLength = password.length >= 8;
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);

  return minLength && hasLowerCase && hasUpperCase && hasNumbers && hasSpecialChar;
};

export const PasswordRequirements = () => {
  const { t } = useAppTranslation();
  return (
    <p className="text-xs text-slate-500">
      {t.auth.signup.passwordRequirements}
    </p>
  );
};
