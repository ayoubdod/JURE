import ShortcutLibrary from './ShortcutLibrary';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppTranslation } from '@/i18n';
import { useShortcuts } from '@/context/ShortcutsContext';

export default function ShortcutsHelpDialog() {
  const { t } = useAppTranslation();
  const s = t.shortcuts;
  const { helpOpen, setHelpOpen } = useShortcuts();

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent
        data-shortcuts-ui="help"
        className="max-w-2xl top-[10vh] bottom-auto translate-y-0 max-h-[min(80vh,640px)] overflow-hidden flex flex-col p-0 gap-0 md:top-[10vh] md:translate-y-0"
      >
        <DialogHeader className="px-5 pt-5 pb-3 text-start">
          <DialogTitle>{s.helpTitle}</DialogTitle>
          <DialogDescription>{s.helpSubtitle}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <ShortcutLibrary />
        </div>
      </DialogContent>
    </Dialog>
  );
}
