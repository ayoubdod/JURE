import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import DeadlinesCard from '@/components/dashboard/DeadlinesCard';
import { useAppTranslation } from '@/i18n';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Modal host for the legal deadline calculator (demoted from the home primary fold). */
export default function DeadlineCalculatorDialog({ open, onOpenChange }: Props) {
  const { t } = useAppTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[min(720px,calc(100vw-1.5rem))] flex-col overflow-hidden p-0 sm:max-w-3xl">
        <DialogTitle className="sr-only">{t.dashboard.deadlines.title}</DialogTitle>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {open ? <DeadlinesCard /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
