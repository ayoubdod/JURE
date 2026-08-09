import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, Lang } from '@/hooks/useLanguage';
import { LANG_NATIVE_LABELS } from '@/i18n/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Languages } from '@/utils/constants';

const LangSwitcher: React.FC = () => {
  const { lang, setLang } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full border border-border bg-background hover:bg-muted"
          aria-label={LANG_NATIVE_LABELS[lang]}
        >
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        {Languages.options.map((option) => {
          const code = option.value as Lang;
          const isActive = code === lang;
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => setLang(code)}
              className={isActive ? 'font-medium text-jure-600' : ''}
            >
              <span>{LANG_NATIVE_LABELS[code]}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LangSwitcher;
