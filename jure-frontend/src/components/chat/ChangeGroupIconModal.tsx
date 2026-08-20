import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import { isAxiosError } from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';
import {
  apiGetSuggestedIcons,
  apiSetConversationIconPreset,
  apiUploadConversationIcon,
} from '@/services/conversations/api';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation } from '@/i18n';

export interface ChangeGroupIconModalRef {
  show: (conversation: API.Conversation) => void;
  hide: () => void;
}

export interface ChangeGroupIconModalProps {
  onSuccess?: (conversation: API.Conversation) => void;
}

const DEFAULT_ICONS: API.SuggestedIcon[] = [
  { id: 'group', emoji: '👥', label: 'Group' },
  { id: 'legal', emoji: '⚖️', label: 'Legal' },
  { id: 'briefcase', emoji: '💼', label: 'Business' },
  { id: 'document', emoji: '📄', label: 'Document' },
  { id: 'bulb', emoji: '💡', label: 'Idea' },
  { id: 'star', emoji: '⭐', label: 'Star' },
];

const ChangeGroupIconModal = forwardRef<ChangeGroupIconModalRef, ChangeGroupIconModalProps>(
  ({ onSuccess }, ref) => {
    const { t } = useAppTranslation();
    const m = t.conversations.changeIcon;
    const [instance, setInstance] = useState<API.Conversation | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [suggestedIcons, setSuggestedIcons] = useState<API.SuggestedIcon[]>([]);
    const [iconsLoading, setIconsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    useImperativeHandle(ref, () => ({
      show: (conversation: API.Conversation) => {
        if (conversation.type !== 'group') return;
        setInstance(conversation);
        setIsOpen(true);
      },
      hide: () => setIsOpen(false),
    }));

    useEffect(() => {
      if (isOpen) {
        setIconsLoading(true);
        apiGetSuggestedIcons()
          .then((res) => setSuggestedIcons(res.data?.length ? res.data : DEFAULT_ICONS))
          .catch(() => setSuggestedIcons(DEFAULT_ICONS))
          .finally(() => setIconsLoading(false));
      }
    }, [isOpen]);

    const handlePresetClick = async (presetId: string) => {
      if (!instance) return;
      setIsLoading(true);
      try {
        const { data } = await apiSetConversationIconPreset(instance.id, presetId);
        const updated = { ...instance, ...data };
        onSuccess?.(updated);
        toast({ title: m.updated });
      } catch (err) {
        if (isAxiosError(err)) {
          toast({
            title: t.common.error,
            description: err.response?.data?.detail ?? m.updateFailed,
            variant: 'destructive',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !instance) return;
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({ title: m.invalidFile, description: m.invalidFileDesc, variant: 'destructive' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: m.tooLarge, description: m.tooLargeDesc, variant: 'destructive' });
        return;
      }
      setIsLoading(true);
      apiUploadConversationIcon(instance.id, file)
        .then(({ data }) => {
          const updated = { ...instance, ...data };
          onSuccess?.(updated);
          toast({ title: m.updated });
          e.target.value = '';
        })
        .catch((err) => {
          if (isAxiosError(err)) {
            toast({
              title: t.common.error,
              description: err.response?.data?.detail ?? m.uploadFailed,
              variant: 'destructive',
            });
          }
          e.target.value = '';
        })
        .finally(() => setIsLoading(false));
    };

    if (!instance) return null;

    return (
      <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.title}</DialogTitle>
            <DialogDescription>{m.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-2">{m.presets}</p>
              {iconsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                  {suggestedIcons.map((icon) => (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => handlePresetClick(icon.id)}
                      disabled={isLoading}
                      className="h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-xl transition-colors disabled:opacity-50"
                      title={
                        icon.id === 'group' ? m.presetGroup
                        : icon.id === 'legal' ? m.presetLegal
                        : icon.id === 'briefcase' ? m.presetBusiness
                        : icon.id === 'document' ? m.presetDocument
                        : icon.id === 'bulb' ? m.presetIdea
                        : icon.id === 'star' ? m.presetStar
                        : icon.label
                      }
                    >
                      {icon.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-2">{m.customImage}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {m.uploadImage}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

ChangeGroupIconModal.displayName = 'ChangeGroupIconModal';

export default ChangeGroupIconModal;
