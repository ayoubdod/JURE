import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signupBackBtnClass, signupPrimaryBtnClass } from './signupUi';
import { cn } from '@/lib/utils';

type SignupActionsProps = {
  onNext: () => void;
  nextLabel: string;
  onPrev?: () => void;
  backLabel?: string;
  nextDisabled?: boolean;
  nextFullWidth?: boolean;
};

const SignupActions = ({
  onNext,
  nextLabel,
  onPrev,
  backLabel,
  nextDisabled,
  nextFullWidth = true,
}: SignupActionsProps) => {
  return (
    <div className={cn('flex flex-col gap-2.5 pt-4', onPrev && 'sm:flex-row sm:items-center')}>
      {onPrev && backLabel && (
        <Button type="button" variant="outline" onClick={onPrev} className={cn(signupBackBtnClass, 'order-2 sm:order-1')}>
          <ArrowLeft className="me-2 h-4 w-4" />
          {backLabel}
        </Button>
      )}
      <Button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className={cn(signupPrimaryBtnClass, nextFullWidth && 'flex-1', 'order-1 sm:order-2')}
      >
        {nextLabel}
        <ArrowRight className="ms-2 h-4 w-4" />
      </Button>
    </div>
  );
};

export default SignupActions;
