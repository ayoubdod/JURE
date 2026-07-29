
export const validatePassword = (password: string) => {
  const minLength = password.length >= 8;
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  
  return minLength && hasLowerCase && hasUpperCase && hasNumbers && hasSpecialChar;
};

export const PasswordRequirements = () => (
  <p className="text-xs text-slate-500">
    Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&).
  </p>
);
