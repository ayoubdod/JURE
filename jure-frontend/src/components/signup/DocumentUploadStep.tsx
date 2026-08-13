import React, { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Users, Globe, ArrowLeft, ArrowRight } from 'lucide-react';
import { createSignupStepSchemas, type SignUpData } from '@/schemas/signupValidation';
import { useAppTranslation } from '@/i18n';

interface OrganizationDetailsStepProps {
  onNext: () => void;
  onPrev: () => void;
  form: UseFormReturn<SignUpData>;
}

const OrganizationDetailsStep = ({ onNext, onPrev, form }: OrganizationDetailsStepProps) => {
  const { toast } = useToast();
  const { t } = useAppTranslation();
  const s = t.auth.signup.organization;
  const schemas = useMemo(() => createSignupStepSchemas(t.auth.signup), [t]);
  const { watch, setValue, register, formState: { errors }, trigger } = form;

  const employeeCountOptions = [
    { label: t.auth.signup.teamSizes.justMe, value: '1' },
    { label: t.auth.signup.teamSizes.twoToFive, value: '5' },
    { label: t.auth.signup.teamSizes.sixToTen, value: '10' },
    { label: t.auth.signup.teamSizes.elevenToTwenty, value: '20' },
    { label: t.auth.signup.teamSizes.twentyOneToFifty, value: '50' },
    { label: t.auth.signup.teamSizes.moreThanFifty, value: '100' },
  ];

  const onSubmit = async () => {
    try {
      schemas.step4ValidationSchema.validateSync(form.getValues());
      onNext();
    } catch {
      trigger(Object.keys(schemas.step4ValidationSchema.fields) as (keyof SignUpData)[]);
      toast({
        title: t.auth.signup.toasts.errorTitle,
        description: t.auth.signup.toasts.checkFields,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#64499D] to-[#4D3680] rounded-2xl mb-4 shadow-lg">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-slate-100 mb-2">
          {s.headerTitle}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">{s.headerSubtitle}</p>
      </div>

      <Card className="landing-glass border-0 shadow-none ring-1 ring-[#64499D]/12 dark:ring-[#8B6FD1]/20">
        <CardHeader className="bg-gradient-to-r from-[#F4F1FF]/80 to-transparent dark:from-[#64499D]/15 dark:to-transparent rounded-t-lg border-b border-[#64499D]/10 dark:border-[#8B6FD1]/20">
          <CardTitle className="text-xl font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1]" />
            {s.cardTitle}
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">{s.cardDescription}</CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#F4F1FF]/60 to-transparent dark:from-[#64499D]/10 dark:to-transparent rounded-xl p-6 border border-[#64499D]/15 dark:border-[#8B6FD1]/20">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1]" />
                {s.teamSection}
              </h3>
              <div className="space-y-2">
                <Label htmlFor="team_size" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {s.teamSize}
                </Label>
                <Select
                  value={watch('team_size')}
                  onValueChange={(value) => setValue('team_size', value)}
                >
                  <SelectTrigger
                    className={`h-12 transition-all duration-200 focus:ring-2 focus:ring-[#64499D]/40 focus:border-[#64499D] ${
                      errors.team_size ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-600 dark:border-slate-600'
                    }`}
                  >
                    <SelectValue placeholder={s.teamPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeCountOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.team_size && (
                  <p className="text-sm text-red-600 mt-1">{errors.team_size.message}</p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#F4F1FF]/60 to-transparent dark:from-[#64499D]/10 dark:to-transparent rounded-xl p-6 border border-[#64499D]/15 dark:border-[#8B6FD1]/20">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1]" />
                {s.onlineSection}
              </h3>
              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {s.website}
                </Label>
                <Input
                  id="website"
                  {...register('website')}
                  placeholder={s.websitePlaceholder}
                  className={`transition-all duration-200 focus:ring-2 focus:ring-[#64499D]/40 focus:border-[#64499D] border-slate-300 dark:border-slate-600 dark:border-slate-600 h-12 ${
                    errors.website ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {errors.website && (
                  <p className="text-sm text-red-600 mt-1">{errors.website.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-[#64499D]/10 dark:border-[#8B6FD1]/20">
              <Button
                type="button"
                variant="outline"
                onClick={onPrev}
                className="order-2 sm:order-1 border-[#64499D]/30 text-[#64499D] dark:text-[#CFC2FF] hover:bg-[#64499D]/10 hover:border-[#64499D]/50 dark:hover:bg-[#64499D]/20 h-12 px-8"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {s.back}
              </Button>

              <Button
                onClick={onSubmit}
                className="order-1 sm:order-2 bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-8"
              >
                {s.continue}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center mt-6">
        <div className="inline-flex items-center px-4 py-2 bg-[#F4F1FF]/80 dark:bg-[#64499D]/20 rounded-full ring-1 ring-[#64499D]/15 dark:ring-[#8B6FD1]/25">
          <div className="w-2 h-2 bg-[#64499D] rounded-full mr-2"></div>
          <span className="text-sm text-[#64499D] dark:text-[#CFC2FF] font-medium">{s.stepIndicator}</span>
        </div>
      </div>
    </div>
  );
};

export default OrganizationDetailsStep;
