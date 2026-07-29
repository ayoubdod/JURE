import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, Lang } from '@/hooks/useLanguage';
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

  const handleChange = (code: Lang) => {
    setLang(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full border border-border bg-background hover:bg-muted"
        >
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem]">
        {Languages.options.map((option) => {
          const code = option.value as Lang;
          const isActive = code === lang;
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => handleChange(code)}
              className={isActive ? 'font-medium text-jure-600' : ''}
            >
              <span className="mr-2 w-6 text-xs uppercase text-muted-foreground">
                {option.country}
              </span>
              <span>{option.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LangSwitcher;