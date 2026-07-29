
import React from 'react';
import { Separator } from '@/components/ui/separator';

const FormDivider = () => (
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <Separator className="w-full" />
    </div>
    <div className="relative flex justify-center text-xs uppercase">
      <span className="bg-background px-2 text-muted-foreground">Ou</span>
    </div>
  </div>
);

export default FormDivider;
