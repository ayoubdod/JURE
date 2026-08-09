import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, Clock } from 'lucide-react';
import { Link } from 'react-router';
import { useAppTranslation } from '@/i18n';

const VerificationPending = () => {
  const { t } = useAppTranslation();
  const v = t.auth.signup.verification;

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="landing-glass border-0 shadow-none ring-1 ring-[#64499D]/12 dark:ring-[#8B6FD1]/20">
        <CardHeader className="text-center bg-gradient-to-r from-[#F4F1FF]/80 to-transparent dark:from-[#64499D]/15 dark:to-transparent border-b border-[#64499D]/10 dark:border-[#8B6FD1]/20">
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#64499D] to-[#4D3680] rounded-2xl shadow-lg">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display text-slate-900 dark:text-slate-100">{v.title}</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            {v.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="text-center">
            <div className="bg-gradient-to-r from-[#F4F1FF]/60 to-transparent dark:from-[#64499D]/10 dark:to-transparent border border-[#64499D]/15 dark:border-[#8B6FD1]/20 rounded-xl p-6">
              <Mail className="h-8 w-8 text-[#64499D] dark:text-[#8B6FD1] mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {v.emailTitle}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                {v.emailBody}
              </p>
              <div className="landing-glass border-0 ring-1 ring-[#64499D]/10 dark:ring-[#8B6FD1]/20 rounded-lg p-4 text-left">
                <p className="text-sm text-slate-700 dark:text-slate-300">{v.emailGreeting}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{v.emailThanks}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{v.emailClick}</p>
                <p className="text-sm text-[#64499D] dark:text-[#CFC2FF] mt-2">{v.emailActivationLink}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{v.emailIgnore}</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-gradient-to-r from-amber-50/60 to-transparent dark:from-amber-500/10 dark:to-transparent border border-amber-200/80 dark:border-amber-500/30 rounded-xl p-6">
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {v.reviewTitle}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">{v.reviewBody}</p>
              <p className="text-slate-500 dark:text-slate-500 text-xs mt-2">{v.reviewHint}</p>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-gradient-to-r from-emerald-50/60 to-transparent dark:from-emerald-500/10 dark:to-transparent border border-emerald-200/80 dark:border-emerald-500/30 rounded-xl p-4">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">{v.finalEmailTitle}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{v.finalEmailBody}</p>
              <div className="landing-glass border-0 ring-1 ring-[#64499D]/10 dark:ring-[#8B6FD1]/20 rounded-lg p-3 text-left text-sm text-slate-700 dark:text-slate-300">
                <p className="text-[#64499D] dark:text-[#CFC2FF]">{v.finalLoginLink}</p>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">{v.noEmailHint}</p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline" asChild className="border-[#64499D]/30 text-[#64499D] dark:text-[#CFC2FF] hover:bg-[#64499D]/10 dark:hover:bg-[#64499D]/20">
                <Link to="/signin">{v.goSignIn}</Link>
              </Button>
              <Button variant="outline" className="border-[#64499D]/30 text-[#64499D] dark:text-[#CFC2FF] hover:bg-[#64499D]/10 dark:hover:bg-[#64499D]/20">
                {v.contactSupport}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationPending;
