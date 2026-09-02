import { memo } from 'react';
import {
  BookmarkPlus,
  Download,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Landmark,
  MoreHorizontal,
  Star,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import { formatRelativeTime } from '@/i18n';

type ViewMode = 'grid' | 'list';

type Props = {
  document: API.Document;
  view?: ViewMode;
  onOpen: (doc: API.Document) => void;
  onPreview: (doc: API.Document) => void;
  onDownload: (doc: API.Document) => void;
  onFavorite: (doc: API.Document) => void;
  onEdit?: (doc: API.Document) => void;
  onDelete?: (doc: API.Document) => void;
  onAddToMyLibrary?: (doc: API.Document) => void;
};

function recentLabel(doc: API.Document, tf: (t: string, v: Record<string, string | number>) => string, hub: AppHubMessages) {
  if (!doc.is_recent) return null;
  const days = doc.days_since_added ?? 0;
  const left = doc.days_remaining_as_new ?? 0;
  if (days <= 0) return hub.addedToday;
  if (left > 0) return tf(hub.newDaysLeft, { count: left });
  return tf(hub.addedDaysAgo, { count: days });
}

type AppHubMessages = {
  newBadge: string;
  addedToday: string;
  addedDaysAgo: string;
  newDaysLeft: string;
  open: string;
  preview: string;
  download: string;
  favorite: string;
  unfavorite: string;
  edit: string;
  delete: string;
  addToMy: string;
  moreActions: string;
};

const ResourceCard = memo(function ResourceCard({
  document: doc,
  view = 'grid',
  onOpen,
  onPreview,
  onDownload,
  onFavorite,
  onEdit,
  onDelete,
  onAddToMyLibrary,
}: Props) {
  const { t, tf, enumLabel, lang } = useAppTranslation();
  const hub = t.library.hub;
  const typeLabel = enumLabel('libraryResourceType', doc.resource_type || 'other');
  const categoryLabel = enumLabel('documentCategory', doc.category);
  const added = recentLabel(doc, tf, hub);
  const dateLabel = doc.created
    ? formatRelativeTime(doc.created_at || doc.created, lang)
    : '';
  const isList = view === 'list';

  return (
    <article
      className={cn(
        'group relative rounded-xl border border-slate-200/90 bg-white shadow-sm transition-all',
        'hover:border-[#64499D]/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-950',
        'focus-within:ring-2 focus-within:ring-[#64499D]/25',
        'min-w-0 overflow-hidden',
        isList ? 'flex items-stretch gap-3 p-3 sm:p-3.5' : 'flex flex-col p-4'
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(doc)}
        className={cn(
          'flex min-w-0 flex-1 text-start',
          isList ? 'items-start gap-3' : 'flex-col gap-3 pe-14'
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg bg-[#64499D]/10 text-[#64499D] dark:bg-[#64499D]/20 dark:text-[#CFC2FF]',
            isList ? 'h-10 w-10' : 'h-11 w-11'
          )}
          aria-hidden
        >
          {doc.scope === 'INTERNATIONAL' ? (
            <Globe className="h-5 w-5" />
          ) : doc.scope === 'LOCAL' ? (
            <Landmark className="h-5 w-5" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="min-w-0 truncate text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">
              {doc.title}
            </h3>
            {doc.is_recent ? (
              <span className="rounded-full bg-[#64499D] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white">
                {hub.newBadge}
              </span>
            ) : null}
          </div>
          {doc.description ? (
            <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-slate-500 dark:text-slate-400">
              {doc.description}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            {typeLabel ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-900">
                {typeLabel}
              </span>
            ) : null}
            {categoryLabel ? <span>{categoryLabel}</span> : null}
            {doc.jurisdiction_name ? <span>{doc.jurisdiction_name}</span> : null}
            {doc.country ? <span>{doc.country}</span> : null}
            {doc.language ? <span className="uppercase">{doc.language}</span> : null}
            {doc.source ? <span>{doc.source}</span> : null}
            {doc.created_by_name ? <span>{doc.created_by_name}</span> : null}
            {dateLabel ? <span>{dateLabel}</span> : null}
          </div>
          {doc.source_library ? (
            <p className="mt-1 text-[11px] font-medium text-[#64499D] dark:text-[#CFC2FF]">
              {doc.source_library}
            </p>
          ) : null}
          {added ? (
            <p className="mt-1 text-[11px] text-slate-400">{added}</p>
          ) : null}
          {doc.tags?.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {doc.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-1.5 py-px text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </button>

      <div className={cn('flex shrink-0 items-start gap-0.5', isList ? '' : 'absolute end-3 top-3')}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-[#64499D]"
          aria-label={doc.is_favorited ? hub.unfavorite : hub.favorite}
          onClick={() => onFavorite(doc)}
        >
          <Star className={cn('h-4 w-4', doc.is_favorited && 'fill-[#64499D] text-[#64499D]')} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400"
              aria-label={hub.moreActions}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onOpen(doc)}>
              <Eye className="me-2 h-4 w-4" />
              {hub.open}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPreview(doc)}>
              <FileText className="me-2 h-4 w-4" />
              {hub.preview}
            </DropdownMenuItem>
            {doc.file || doc.external_url ? (
              <DropdownMenuItem onClick={() => onDownload(doc)}>
                {doc.external_url && !doc.file ? (
                  <ExternalLink className="me-2 h-4 w-4" />
                ) : (
                  <Download className="me-2 h-4 w-4" />
                )}
                {hub.download}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => onFavorite(doc)}>
              <Star className="me-2 h-4 w-4" />
              {doc.is_favorited ? hub.unfavorite : hub.favorite}
            </DropdownMenuItem>
            {onAddToMyLibrary && !doc.is_owned ? (
              <DropdownMenuItem onClick={() => onAddToMyLibrary(doc)}>
                <BookmarkPlus className="me-2 h-4 w-4" />
                {hub.addToMy}
              </DropdownMenuItem>
            ) : null}
            {onEdit ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit(doc)}>
                  <Edit className="me-2 h-4 w-4" />
                  {hub.edit}
                </DropdownMenuItem>
              </>
            ) : null}
            {onDelete ? (
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => onDelete(doc)}
              >
                <Trash2 className="me-2 h-4 w-4" />
                {hub.delete}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
});

export default ResourceCard;
