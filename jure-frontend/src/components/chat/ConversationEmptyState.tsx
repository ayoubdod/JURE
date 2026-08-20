import React from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppTranslation } from '@/i18n';

const ConversationEmptyState: React.FC<{
  onNewChat?: () => void;
}> = ({ onNewChat }) => {
  const { t } = useAppTranslation();

  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-slate-50/80 px-6 dark:bg-slate-950/40">
      <div className="max-w-sm text-center">
        <h2 className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {t.conversations.emptyTitle}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t.conversations.emptySubtitle}
        </p>
        {onNewChat ? (
          <Button type="button" onClick={onNewChat} className="mt-5 h-9 px-4 text-[13px]">
            <MessageSquarePlus className="h-4 w-4" />
            {t.conversations.newChat}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default ConversationEmptyState;
