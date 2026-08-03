import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Search,
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  FileText,
  Video,
  Image,
  Archive,
  File,
  Radio,
  Calendar,
  HardDrive,
  ChevronUp,
  ChevronDown,
  FolderTree,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getFileType } from '@/utils/functions';
import { DocumentCategory } from '@/utils/constants';
import { apiGetDocuments } from '@/services/library/api';
import DocumentCreateModal, {
  DocumentCreateModalRef,
} from '@/components/document/DocumentCreateModal';
import DocumentUpdateModal, {
  DocumentUpdateModalRef,
} from '@/components/document/DocumentUpdateModal';
import DocumentDeleteModal, {
  DocumentDeleteModalRef,
} from '@/components/document/DocumentDeleteModal';
import LibraryFolderTree, {
  buildFolderTreeFromDocuments,
} from '@/components/library/LibraryFolderTree';
import DocumentDetailDrawer, {
  DocumentDetailDrawerRef,
} from '@/components/library/DocumentDetailDrawer';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { devError } from '@/utils/devLog';

const Library = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [folderSheetOpen, setFolderSheetOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState<API.Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  const createModalRef = useRef<DocumentCreateModalRef>(null);
  const updateModalRef = useRef<DocumentUpdateModalRef>(null);
  const deleteModalRef = useRef<DocumentDeleteModalRef>(null);
  const detailDrawerRef = useRef<DocumentDetailDrawerRef>(null);

  const fetchDocuments = () => {
    setLoading(true);
    apiGetDocuments({ all: true })
      .then((response) => {
        let documents: API.Document[] = [];
        if (Array.isArray(response.data)) {
          documents = response.data;
        } else if (
          response.data &&
          typeof response.data === 'object' &&
          'results' in response.data
        ) {
          documents = Array.isArray(response.data.results)
            ? response.data.results
            : [];
        } else {
          documents = Array.isArray(response.data) ? response.data : [];
        }
        setLibraryItems(Array.isArray(documents) ? documents : []);
      })
      .catch((error) => {
        devError('Error fetching documents:', error);
        apiGetDocuments()
          .then((response) => {
            let documents: API.Document[] = [];
            if (Array.isArray(response.data)) {
              documents = response.data;
            } else if (
              response.data &&
              typeof response.data === 'object' &&
              'results' in response.data
            ) {
              documents = Array.isArray(response.data.results)
                ? response.data.results
                : [];
            } else {
              documents = Array.isArray(response.data) ? response.data : [];
            }
            setLibraryItems(Array.isArray(documents) ? documents : []);
          })
          .catch((fallbackError) => {
            devError('Fallback fetch also failed:', fallbackError);
            setLibraryItems([]);
            const errorMessage =
              fallbackError.response?.data?.detail ||
              fallbackError.response?.data?.message ||
              fallbackError.message ||
              'Failed to load documents.';
            toast({
              title: 'Error Loading Library',
              description: errorMessage,
              variant: 'destructive',
            });
          });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const getFileSizeLabel = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    if (size < 1024 * 1024 * 1024)
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getFileIcon = (fileName: string) => {
    const fileType = getFileType(fileName);
    switch (fileType) {
      case 'archive':
        return <Archive size={16} className="text-slate-500 shrink-0" />;
      case 'document':
        return <FileText size={16} className="text-slate-500 shrink-0" />;
      case 'image':
        return <Image size={16} className="text-slate-500 shrink-0" />;
      case 'video':
        return <Video size={16} className="text-slate-500 shrink-0" />;
      case 'audio':
        return <Radio size={16} className="text-slate-500 shrink-0" />;
      default:
        return <File size={16} className="text-slate-500 shrink-0" />;
    }
  };

  const safeLibraryItems = Array.isArray(libraryItems) ? libraryItems : [];
  const filteredItems = safeLibraryItems
    .filter((item) => {
      if (!item || typeof item !== 'object') return false;
      const matchesSearch =
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(item.tags) &&
          item.tags.some((tag) =>
            tag?.toLowerCase().includes(searchTerm.toLowerCase())
          )) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison =
          new Date(a.modified || 0).getTime() -
          new Date(b.modified || 0).getTime();
      } else if (sortBy === 'name') {
        comparison = (a.title || '').localeCompare(b.title || '');
      } else if (sortBy === 'size') {
        comparison = (a.size || 0) - (b.size || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleRowClick = (item: API.Document) => {
    detailDrawerRef.current?.open(item);
  };

  const handleEdit = (e: React.MouseEvent, item: API.Document) => {
    e.stopPropagation();
    updateModalRef.current?.show(item);
  };

  const handleDownload = (e: React.MouseEvent, item: API.Document) => {
    e.stopPropagation();
    toast({
      title: 'Download Started',
      description: `Downloading ${item.title}...`,
    });
  };

  const handleDelete = (e: React.MouseEvent, item: API.Document) => {
    e.stopPropagation();
    deleteModalRef.current?.show(item);
  };

  const handleAddNew = () => createModalRef.current?.show();
  const handleCreateSuccess = (document: API.Document) => {
    toast({
      title: 'Success',
      description: `Document "${document.title}" created successfully`,
    });
    fetchDocuments();
  };
  const handleUpdateSuccess = (document: API.Document) => {
    toast({
      title: 'Success',
      description: `Document "${document.title}" updated successfully`,
    });
    fetchDocuments();
  };
  const handleDeleteSuccess = (document: API.Document) => {
    toast({
      title: 'Success',
      description: `Document "${document.title}" deleted successfully`,
    });
    fetchDocuments();
  };

  const toggleSort = (newSortBy: 'date' | 'name' | 'size') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const folderTreeItems = buildFolderTreeFromDocuments(
    libraryItems,
    DocumentCategory.options
  );

  return (
    <>
      <div className="flex h-full min-h-0 overflow-hidden">
        {/* Folder Tree Sidebar — desktop */}
        <aside
          className={cn(
            'hidden md:flex w-56 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800',
            'bg-[#F8FAFC] dark:bg-[#0F172A]'
          )}
        >
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-[13px] font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Library
            </h2>
          </div>
          <div className="p-2 flex-1 overflow-y-auto">
            <LibraryFolderTree
              selectedId={selectedCategory}
              onSelect={setSelectedCategory}
              items={folderTreeItems}
            />
          </div>
        </aside>

        {/* Mobile folder sheet */}
        <Sheet open={folderSheetOpen} onOpenChange={setFolderSheetOpen}>
          <SheetContent side="left" className="w-[min(100vw,18rem)] p-0 sm:max-w-xs md:hidden">
            <SheetHeader className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <SheetTitle className="text-sm">Folders</SheetTitle>
            </SheetHeader>
            <div className="p-2 overflow-y-auto h-[calc(100%-3.5rem)]">
              <LibraryFolderTree
                selectedId={selectedCategory}
                onSelect={(id) => {
                  setSelectedCategory(id);
                  setFolderSheetOpen(false);
                }}
                items={folderTreeItems}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="md:hidden h-11 w-11 shrink-0"
                onClick={() => setFolderSheetOpen(true)}
                aria-label="Open folders"
              >
                <FolderTree className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-[13px] font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  Document Library
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {filteredItems.length} documents
                </p>
              </div>
            </div>
            <Button
              onClick={handleAddNew}
              className="h-11 sm:h-8 w-full sm:w-auto text-[13px] bg-[#0F172A] dark:bg-[#F8FAFC] text-[#F8FAFC] dark:text-[#0F172A] hover:opacity-90 border-0"
            >
              <Plus size={14} className="mr-2" />
              Add Document
            </Button>
          </div>

          {/* Search & Sort */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  'w-full pl-9 pr-3 py-2 text-[13px] rounded-md',
                  'border border-slate-200 dark:border-slate-800',
                  'bg-[#F8FAFC] dark:bg-[#0F172A]',
                  'text-[#0F172A] dark:text-[#F8FAFC]',
                  'placeholder:text-slate-400',
                  'focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-0'
                )}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 mr-2">Sort:</span>
              {(['name', 'date', 'size'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-md border transition-colors',
                    'border-slate-200 dark:border-slate-800',
                    sortBy === key
                      ? 'bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-[#F8FAFC]'
                      : 'bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  )}
                >
                  {key === 'name' && 'Name'}
                  {key === 'date' && 'Date'}
                  {key === 'size' && 'Size'}
                  {sortBy === key &&
                    (sortOrder === 'asc' ? (
                      <ChevronUp size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    ))}
                </button>
              ))}
            </div>
          </div>

          {/* High-Density Data Table */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-8">
                <div className="animate-pulse space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="h-9 bg-slate-200 dark:bg-slate-800 rounded"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto min-w-0">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="h-9 px-4 text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Name
                    </TableHead>
                    <TableHead className="h-9 px-4 text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">
                      Category
                    </TableHead>
                    <TableHead className="h-9 px-4 text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">
                      Size
                    </TableHead>
                    <TableHead className="h-9 px-4 text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-28">
                      Modified
                    </TableHead>
                    <TableHead className="h-9 px-4 w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const categoryLabel =
                      DocumentCategory.options.find(
                        (c) => c.value === item.category
                      )?.label || item.category;
                    return (
                      <TableRow
                        key={item.id}
                        onClick={() => handleRowClick(item)}
                        className={cn(
                          'border-slate-200 dark:border-slate-800',
                          'cursor-pointer transition-colors duration-150',
                          'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        )}
                      >
                        <TableCell className="py-2 px-4">
                          <div className="flex items-center gap-3">
                            {getFileIcon(item.file)}
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-[#0F172A] dark:text-[#F8FAFC] truncate">
                                {item.title}
                              </p>
                              {item.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-4 text-[11px] text-slate-600 dark:text-slate-300">
                          {categoryLabel}
                        </TableCell>
                        <TableCell className="py-2 px-4 text-[11px] text-slate-500 dark:text-slate-400">
                          {getFileSizeLabel(item.size)}
                        </TableCell>
                        <TableCell className="py-2 px-4 text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(item.modified).toLocaleDateString(
                            undefined,
                            { month: 'short', day: 'numeric', year: 'numeric' }
                          )}
                        </TableCell>
                        <TableCell className="py-2 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-500 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-slate-800"
                              onClick={() => handleRowClick(item)}
                              title="View"
                            >
                              <Eye size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-500 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-slate-800"
                              onClick={(e) => handleEdit(e, item)}
                              title="Edit"
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-500 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-slate-800"
                              onClick={(e) => handleDownload(e, item)}
                              title="Download"
                            >
                              <Download size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={(e) => handleDelete(e, item)}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            )}

            {!loading && filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4 border-t border-slate-200 dark:border-slate-800">
                <FileText
                  size={40}
                  className="text-slate-300 dark:text-slate-600 mb-4"
                />
                <h3 className="text-[13px] font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  No documents found
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 text-center">
                  {searchTerm || selectedCategory !== 'all'
                    ? 'Try adjusting your search or filter'
                    : 'Add your first document to get started'}
                </p>
                {!searchTerm && selectedCategory === 'all' && (
                  <Button
                    onClick={handleAddNew}
                    className="h-8 text-[13px] bg-[#0F172A] dark:bg-[#F8FAFC] text-[#F8FAFC] dark:text-[#0F172A] hover:opacity-90"
                  >
                    <Plus size={14} className="mr-2" />
                    Add Document
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <DocumentCreateModal ref={createModalRef} onSuccess={handleCreateSuccess} />
      <DocumentUpdateModal ref={updateModalRef} onSuccess={handleUpdateSuccess} />
      <DocumentDeleteModal ref={deleteModalRef} onSuccess={handleDeleteSuccess} />
      <DocumentDetailDrawer
        ref={detailDrawerRef}
        onSuccess={(doc) => {
          setLibraryItems((prev) =>
            prev.map((d) => (d.id === doc.id ? doc : d))
          );
        }}
      />
    </>
  );
};

export default Library;
