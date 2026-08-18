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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Languages } from '@/utils/constants';

type MenuSide = 'top' | 'right' | 'bottom' | 'left';

type LangSwitcherProps = {
  menuSide?: MenuSide;
  menuAlign?: 'start' | 'center' | 'end';
  tooltip?: string;
};

const LangSwitcher: React.FC<LangSwitcherProps> = ({
  menuSide,
  menuAlign = 'end',
  tooltip,
}) => {
  const { lang, setLang } = useLanguage();

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 rounded-full border border-border bg-background hover:bg-muted"
      aria-label={tooltip || LANG_NATIVE_LABELS[lang]}
    >
      <Globe className="h-4 w-4" />
    </Button>
  );

  return (
    <DropdownMenu>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side={menuSide ?? 'right'} sideOffset={10}>
            {tooltip}
          </TooltipContent>
        </Tooltip>
      ) : (
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        side={menuSide}
        align={menuAlign}
        sideOffset={10}
        className="min-w-[9rem]"
      >
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
