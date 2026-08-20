import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppTranslation } from '@/i18n';

const ConversationContextSheet: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}> = ({ open, onOpenChange, children }) => {
  const isMobile = useIsMobile();
  const { t } = useAppTranslation();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
        <DrawerContent className="flex max-h-[88dvh] flex-col p-0">
          <DrawerTitle className="sr-only">{t.conversations.contextTitle}</DrawerTitle>
          <DrawerDescription className="sr-only">{t.conversations.contextTitle}</DrawerDescription>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[min(100vw,340px)] flex-col gap-0 p-0 sm:max-w-[340px]"
      >
        <SheetTitle className="sr-only">{t.conversations.contextTitle}</SheetTitle>
        <SheetDescription className="sr-only">{t.conversations.contextTitle}</SheetDescription>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </SheetContent>
    </Sheet>
  );
};

export default ConversationContextSheet;
