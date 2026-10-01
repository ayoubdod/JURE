import { memo } from 'react';
import {
  BookmarkPlus,
  Download,
  Edit,
  ExternalLink,
  Eye,
  Heart,
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
import DocumentCover from '@/components/library/hub/DocumentCover';

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
  const authorLine =
    doc.author ||
    doc.issuing_authority ||
    doc.source ||
    doc.created_by_name ||
    doc.source_library ||
    typeLabel ||
    '';

  const actionsMenu = (overlay?: boolean) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8',
            overlay
              ? 'bg-black/35 text-white hover:bg-black/50 hover:text-white'
              : 'text-slate-400'
          )}
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
  );

  if (!isList) {
    return (
      <article className="group relative flex min-w-0 flex-col">
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl shadow-[0_10px_28px_rgba(15,23,42,0.18)]',
            'ring-1 ring-black/5 transition-transform duration-200',
            'group-hover:-translate-y-1 group-hover:shadow-[0_16px_36px_rgba(15,23,42,0.22)]'
          )}
        >
          <div className="aspect-[2/3] w-full">
            <DocumentCover
              document={doc}
              typeLabel={typeLabel}
              categoryLabel={categoryLabel}
            />
          </div>

          {/* Hover scrub: preview in app reader */}
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex justify-center bg-gradient-to-t from-black/70 via-black/35 to-transparent px-3 pb-3 pt-12',
              'opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
            )}
          >
            <Button
              type="button"
              size="sm"
              className="pointer-events-auto h-8 w-full max-w-[11rem] rounded-full bg-white text-slate-900 shadow-md hover:bg-white/95"
              onClick={() => onPreview(doc)}
            >
              <Eye className="me-1.5 h-3.5 w-3.5" />
              {hub.preview}
            </Button>
          </div>

          {doc.is_recent ? (
            <span className="absolute bottom-3 end-3 z-[1] rounded-full bg-white/95 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[#64499D] shadow-sm group-hover:opacity-0">
              {hub.newBadge}
            </span>
          ) : null}

          <div className="absolute end-2 top-2 z-10 flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-black/35 text-white hover:bg-black/50 hover:text-white"
              aria-label={doc.is_favorited ? hub.unfavorite : hub.favorite}
              onClick={() => onFavorite(doc)}
            >
              <Heart
                className={cn(
                  'h-4 w-4',
                  doc.is_favorited && 'fill-rose-400 text-rose-400'
                )}
              />
            </Button>
            {actionsMenu(true)}
          </div>
        </div>

        <div className="mt-2.5 min-w-0 px-0.5">
          <button
            type="button"
            onClick={() => onPreview(doc)}
            className="w-full text-start focus-visible:outline-none"
          >
            <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900 dark:text-slate-50">
              {doc.title}
            </h3>
          </button>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[11.5px] text-slate-500 dark:text-slate-400">
              {authorLine}
            </p>
            <button
              type="button"
              onClick={() => onFavorite(doc)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 text-[11px] font-medium',
                doc.is_favorited
                  ? 'text-rose-500'
                  : 'text-slate-400 hover:text-rose-500'
              )}
              aria-label={doc.is_favorited ? hub.unfavorite : hub.favorite}
            >
              <Heart className={cn('h-3 w-3', doc.is_favorited && 'fill-current')} />
            </button>
          </div>
          {added ? (
            <p className="mt-0.5 text-[10.5px] text-slate-400">{added}</p>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'group relative flex min-w-0 items-stretch gap-3 overflow-hidden rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm transition-all sm:p-3.5',
        'hover:border-[#64499D]/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-950',
        'focus-within:ring-2 focus-within:ring-[#64499D]/25'
      )}
    >
      <button
        type="button"
        onClick={() => onPreview(doc)}
        className="flex min-w-0 flex-1 items-start gap-3 text-start"
      >
        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg shadow-sm ring-1 ring-black/5">
          <DocumentCover
            document={doc}
            typeLabel={typeLabel}
            categoryLabel={categoryLabel}
            compact
          />
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
            {authorLine ? <span>{authorLine}</span> : null}
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

      <div className="flex shrink-0 items-start gap-0.5">
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
        {actionsMenu(false)}
      </div>
    </article>
  );
});

export default ResourceCard;
