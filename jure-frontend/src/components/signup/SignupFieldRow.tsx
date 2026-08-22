import React from 'react';
import { Label } from '@/components/ui/label';
import { signupInlineLabelClass } from './signupUi';

type SignupFieldRowProps = {
  id: string;
  label: string;
  error?: string;
  align?: 'center' | 'start';
  children: React.ReactNode;
};

const SignupFieldRow = ({ id, label, error, align = 'center', children }: SignupFieldRowProps) => {
  return (
    <div className="min-w-0">
      <div className={`flex gap-2.5 ${align === 'start' ? 'items-start' : 'items-center'}`}>
        <Label
          htmlFor={id}
          className={`${signupInlineLabelClass} w-[6.75rem] shrink-0 ${align === 'start' ? 'pt-2.5' : ''}`}
        >
          {label}
        </Label>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {error && <p className="ms-[7.375rem] mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default SignupFieldRow;
