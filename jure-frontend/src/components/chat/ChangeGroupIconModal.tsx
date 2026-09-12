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
import { ImageIcon, Loader2, Upload } from 'lucide-react';
import {
  apiGetSuggestedIcons,
  apiSetConversationIconPreset,
  apiUploadConversationIcon,
} from '@/services/conversations/api';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation, localizeApiMessage } from '@/i18n';
import { cn } from '@/lib/utils';
import GroupChatIcon from './GroupChatIcon';

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

function presetTitle(id: string, m: ReturnType<typeof useAppTranslation>['t']['conversations']['changeIcon'], fallback?: string) {
  if (id === 'group') return m.presetGroup;
  if (id === 'legal') return m.presetLegal;
  if (id === 'briefcase') return m.presetBusiness;
  if (id === 'document') return m.presetDocument;
  if (id === 'bulb') return m.presetIdea;
  if (id === 'star') return m.presetStar;
  return fallback || id;
}

const ChangeGroupIconModal = forwardRef<ChangeGroupIconModalRef, ChangeGroupIconModalProps>(
  ({ onSuccess }, ref) => {
    const { t } = useAppTranslation();
    const m = t.conversations.changeIcon;
    const [instance, setInstance] = useState<API.Conversation | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingPreset, setPendingPreset] = useState<string | null>(null);
    const [suggestedIcons, setSuggestedIcons] = useState<API.SuggestedIcon[]>([]);
    const [iconsLoading, setIconsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    useImperativeHandle(ref, () => ({
      show: (conversation: API.Conversation) => {
        if (conversation.type !== 'group') return;
        setInstance(conversation);
        setPendingPreset(null);
        setIsOpen(true);
      },
      hide: () => setIsOpen(false),
    }));

    useEffect(() => {
      if (!isOpen) return;
      setIconsLoading(true);
      apiGetSuggestedIcons()
        .then((res) => setSuggestedIcons(res.data?.length ? res.data : DEFAULT_ICONS))
        .catch(() => setSuggestedIcons(DEFAULT_ICONS))
        .finally(() => setIconsLoading(false));
    }, [isOpen]);

    const currentPreset = pendingPreset ?? instance?.icon_preset ?? null;

    const handlePresetClick = async (presetId: string) => {
      if (!instance || isLoading) return;
      setIsLoading(true);
      setPendingPreset(presetId);
      try {
        const { data } = await apiSetConversationIconPreset(instance.id, presetId);
        const updated = { ...instance, ...data };
        setInstance(updated);
        onSuccess?.(updated);
        toast({ title: m.updated });
      } catch (err) {
        setPendingPreset(null);
        if (isAxiosError(err)) {
          toast({
            title: t.common.error,
            description: localizeApiMessage(err.response?.data?.detail, m.updateFailed),
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
      setPendingPreset(null);
      apiUploadConversationIcon(instance.id, file)
        .then(({ data }) => {
          const updated = { ...instance, ...data };
          setInstance(updated);
          onSuccess?.(updated);
          toast({ title: m.updated });
          e.target.value = '';
        })
        .catch((err) => {
          if (isAxiosError(err)) {
            toast({
              title: t.common.error,
              description: localizeApiMessage(err.response?.data?.detail, m.uploadFailed),
              variant: 'destructive',
            });
          }
          e.target.value = '';
        })
        .finally(() => setIsLoading(false));
    };

    if (!instance) return null;

    const groupTitle =
      instance.display_name || instance.title || t.conversations.typeGroup;

    return (
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (isLoading) return;
          setIsOpen(open);
        }}
      >
        <DialogContent className="overflow-hidden rounded-2xl border-slate-200 p-0 shadow-[0_16px_48px_rgba(15,23,42,0.14)] dark:border-slate-700 sm:max-w-md">
          <div className="border-b border-slate-100 bg-gradient-to-b from-[#F7F4FF] to-white px-5 pe-12 pb-4 pt-5 dark:border-slate-800 dark:from-[#24183F]/55 dark:to-slate-950">
            <DialogHeader className="space-y-1 text-start">
              <div className="mb-3 flex items-center gap-3">
                <div className="relative">
                  <GroupChatIcon
                    iconUrl={instance.icon_url}
                    iconPresetEmoji={instance.icon_preset_emoji}
                    size="lg"
                    className="h-14 w-14 text-2xl ring-4 ring-white shadow-md dark:ring-slate-900"
                  />
                  {isLoading ? (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70 dark:bg-slate-950/70">
                      <Loader2 className="h-5 w-5 animate-spin text-[#64499D]" />
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-[16px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    {m.title}
                  </DialogTitle>
                  <p className="truncate text-[12.5px] font-medium text-slate-600 dark:text-slate-300">
                    {groupTitle}
                  </p>
                  <DialogDescription className="mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                    {m.description}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-5 py-4">
            <div>
              <div className="mb-2.5 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#64499D]/10 text-[#64499D] dark:bg-[#64499D]/20 dark:text-[#CFC2FF]">
                  <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {m.presets}
                </p>
              </div>

              {iconsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {suggestedIcons.map((icon) => {
                    const selected =
                      !instance.icon_url &&
                      (currentPreset === icon.id || instance.icon_preset_emoji === icon.emoji);
                    const label = presetTitle(icon.id, m, icon.label);
                    return (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => void handlePresetClick(icon.id)}
                        disabled={isLoading}
                        title={label}
                        aria-label={label}
                        aria-pressed={selected}
                        className={cn(
                          'flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border text-2xl transition-all duration-150',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/35',
                          'disabled:pointer-events-none disabled:opacity-50',
                          selected
                            ? 'border-[#64499D] bg-[#64499D]/10 shadow-sm ring-2 ring-[#64499D]/25 dark:bg-[#64499D]/20'
                            : 'border-slate-200 bg-slate-50/80 hover:border-[#64499D]/35 hover:bg-white hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/50 dark:hover:bg-slate-800'
                        )}
                      >
                        <span aria-hidden>{icon.emoji}</span>
                        <span className="max-w-full truncate px-1 text-[9px] font-medium text-slate-500 dark:text-slate-400">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {m.customImage}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                disabled={isLoading}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-5 text-center transition-colors',
                  'border-slate-300 bg-slate-50/70 hover:border-[#64499D]/45 hover:bg-[#F7F4FF]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30',
                  'disabled:pointer-events-none disabled:opacity-50',
                  'dark:border-slate-600 dark:bg-slate-900/40 dark:hover:border-[#8B6FD1]/50 dark:hover:bg-[#64499D]/10'
                )}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#64499D]/12 text-[#64499D] dark:bg-[#64499D]/25 dark:text-[#CFC2FF]">
                  <Upload className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                  {m.uploadImage}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {m.invalidFileDesc}
                </span>
              </button>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 rounded-xl"
                disabled={isLoading}
                onClick={() => setIsOpen(false)}
              >
                {t.common.close}
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
