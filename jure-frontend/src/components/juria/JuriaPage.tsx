import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AlertCircle, Menu, MessageSquare, PanelLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { JuriaProjectSidebar } from '@/components/juria/JuriaProjectSidebar';
import { JuriaCreateProjectModal } from '@/components/juria/JuriaCreateProjectModal';
import { JuriaArchiveView } from '@/components/juria/JuriaArchiveView';
import { JuriaProjectHeader } from '@/components/juria/JuriaProjectHeader';
import { JuriaContextBar } from '@/components/juria/JuriaContextBar';
import { JuriaChat } from '@/components/juria/JuriaChat';
import { JuriaDocumentPanel } from '@/components/juria/JuriaDocumentPanel';
import { JuriaTeamPanel } from '@/components/juria/JuriaTeamPanel';
import { JuriaArtifactEditor } from '@/components/juria/JuriaArtifactEditor';
import { JuriaActivityPanel } from '@/components/juria/JuriaActivityPanel';
import { JuriaProjectSettings } from '@/components/juria/JuriaProjectSettings';
import { JuriaSourceList } from '@/components/juria/JuriaSourceList';
import { JuriaCaseHub } from '@/components/juria/JuriaCaseHub';
import { JuriaOverview } from '@/components/juria/JuriaOverview';
import useJuriaStore from '@/stores/juriaStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import type { JuriaLang } from '@/types/juria';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';

function resolveQuickChatLang(appLang: string): JuriaLang {
  try {
    const stored = localStorage.getItem('jure.juria.askLang');
    if (stored === 'fr' || stored === 'en' || stored === 'ar' || stored === 'darija') return stored;
  } catch {
    /* ignore */
  }
  if (appLang === 'en' || appLang === 'ar' || appLang === 'fr') return appLang;
  return 'fr';
}

export default function JuriaPage() {
  const [params, setParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [tabletOpen, setTabletOpen] = useState(true);
  const [quickBusy, setQuickBusy] = useState(false);
  const [projectsNavOpen, setProjectsNavOpen] = useState(() => {
    try {
      return localStorage.getItem('jure.juria.projectsNav') !== '0';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('jure.juria.projectsNav', projectsNavOpen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [projectsNavOpen]);

  /** Skip one URL→store sync after an intentional UI navigation (create / sidebar click). */
  const skipUrlReadRef = useRef(false);
  const { t, lang, dir } = useAppTranslation();
  const { toast } = useToast();
  const w = t.juria.workspace;

  const loadInitial = useJuriaStore((s) => s.loadInitial);
  const juriaUnavailable = useJuriaStore((s) => s.juriaUnavailable);
  const clearJuriaUnavailable = useJuriaStore((s) => s.clearJuriaUnavailable);
  const projects = useJuriaStore((s) => s.projects);
  const archived = useJuriaStore((s) => s.archivedProjects);
  const activeId = useJuriaStore((s) => s.activeProjectId);
  const setActive = useJuriaStore((s) => s.setActiveProject);
  const archiveView = useJuriaStore((s) => s.archiveView);
  const tab = useJuriaStore((s) => s.activeTab);
  const setTab = useJuriaStore((s) => s.setActiveTab);
  const createQuickChat = useJuriaStore((s) => s.createQuickChat);

  const project =
    projects.find((p) => p.id === activeId) || archived.find((p) => p.id === activeId) || null;
  const projectParam = params.get('p');

  const openProject = useCallback(
    (id: string | null) => {
      skipUrlReadRef.current = true;
      setActive(id);
      setParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          if (id) n.set('p', id);
          else n.delete('p');
          n.delete('c');
          return n;
        },
        { replace: true }
      );
      window.setTimeout(() => {
        skipUrlReadRef.current = false;
      }, 300);
    },
    [setActive, setParams]
  );

  const startQuickChat = useCallback(async () => {
    if (quickBusy) return;
    setQuickBusy(true);
    try {
      const id = await createQuickChat({ language: resolveQuickChatLang(lang) });
      openProject(id);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t.juria.toasts.createFailed,
        description: getJuriaErrorMessage(err),
      });
    } finally {
      setQuickBusy(false);
    }
  }, [createQuickChat, lang, openProject, quickBusy, t.juria.toasts.createFailed, toast]);

  // Simple chats are chat-only
  useEffect(() => {
    if (project?.is_simple && tab !== 'chat') setTab('chat');
  }, [project?.is_simple, tab, setTab]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  // URL → store (browser back/forward only; ignore right after openProject)
  useEffect(() => {
    if (skipUrlReadRef.current) return;
    if (!projectParam) return;
    const current = useJuriaStore.getState().activeProjectId;
    if (projectParam !== current) setActive(projectParam);
  }, [projectParam, setActive]);

  // Store → URL (backup if openProject wasn't used)
  useEffect(() => {
    setParams(
      (prev) => {
        const cur = prev.get('p');
        if (activeId === cur || (!activeId && !cur)) return prev;
        const n = new URLSearchParams(prev);
        if (activeId) n.set('p', activeId);
        else n.delete('p');
        n.delete('c');
        return n;
      },
      { replace: true }
    );
    setMobileOpen(false);
  }, [activeId, setParams]);

  if (juriaUnavailable) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-amber-600" />
        <h2 className="text-lg font-semibold">{w.unavailableTitle}</h2>
        <p className="max-w-md text-sm text-slate-600">{w.unavailableBody}</p>
        <Button
          variant="outline"
          onClick={() => {
            clearJuriaUnavailable();
            void loadInitial();
          }}
        >
          {w.retry}
        </Button>
      </div>
    );
  }

  return (
    <div
      dir={dir}
      className="relative flex h-full min-h-0 w-full overflow-hidden bg-transparent"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(100,73,157,0.08),_transparent_50%)]" />
      {projectsNavOpen ? (
        <div className={cn('relative z-[1]', tabletOpen ? 'hidden md:contents' : 'hidden lg:contents')}>
          <JuriaProjectSidebar
            onNewProject={() => setCreateOpen(true)}
            onQuickChat={() => void startQuickChat()}
            quickBusy={quickBusy}
            onOpenProject={openProject}
            onCollapse={() => setProjectsNavOpen(false)}
          />
        </div>
      ) : (
        <JuriaProjectSidebar
          variant="rail"
          onNewProject={() => setCreateOpen(true)}
          onQuickChat={() => void startQuickChat()}
          quickBusy={quickBusy}
          onOpenProject={openProject}
          onExpand={() => setProjectsNavOpen(true)}
        />
      )}


      <Sheet open={isMobile && mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="start" dir={dir} className="w-[min(100vw,20rem)] p-0 sm:max-w-sm">
          <SheetHeader className="sr-only">
            <SheetTitle>{w.projectsSheet}</SheetTitle>
          </SheetHeader>
          <JuriaProjectSidebar
            onNewProject={() => setCreateOpen(true)}
            onQuickChat={() => void startQuickChat()}
            quickBusy={quickBusy}
            onOpenProject={openProject}
          />
        </SheetContent>
      </Sheet>

      <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-1 border-b border-slate-100 px-2 py-1 dark:border-slate-800 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 md:inline-flex lg:hidden"
            onClick={() => setTabletOpen((v) => !v)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <span className="truncate text-sm font-medium">
            {project ? project.name || t.juria.workspace.untitledChat : t.juria.name}
          </span>
        </div>

        {archiveView && !project ? (
          <JuriaArchiveView onOpenProject={openProject} />
        ) : !project ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center">
            <img
              src="/images/juria-icon.png"
              alt=""
              className="mb-4 h-14 w-14 rounded-2xl ring-1 ring-[#64499D]/20"
            />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{w.emptyTitle}</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500">{w.emptyHint}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button
                className="gap-1.5 bg-[#64499D] hover:bg-[#4D3680]"
                disabled={quickBusy}
                onClick={() => void startQuickChat()}
              >
                <MessageSquare className="h-4 w-4" />
                {quickBusy ? w.quickChatCreating : w.quickChat}
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                {w.newProject}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <JuriaProjectHeader project={project} tab={tab} onTab={setTab} />
            {!project.is_simple && tab === 'overview' && <JuriaOverview project={project} />}
            {tab === 'chat' && !project.is_simple && (
              <JuriaContextBar project={project} context={project.context} />
            )}
            {tab === 'chat' && <JuriaChat project={project} />}
            {!project.is_simple && tab === 'sources' && <JuriaSourceList project={project} />}
            {!project.is_simple && tab === 'documents' && <JuriaDocumentPanel projectId={project.id} />}
            {!project.is_simple && tab === 'case' && <JuriaCaseHub project={project} />}
            {!project.is_simple && tab === 'calendar' && <JuriaCaseHub project={project} surface="calendar" />}
            {!project.is_simple && tab === 'tasks' && <JuriaCaseHub project={project} surface="tasks" />}
            {!project.is_simple && tab === 'team' && <JuriaTeamPanel project={project} />}
            {!project.is_simple && tab === 'artifacts' && <JuriaArtifactEditor projectId={project.id} />}
            {!project.is_simple && tab === 'activity' && <JuriaActivityPanel />}
            {!project.is_simple && tab === 'instructions' && <JuriaProjectSettings project={project} />}
          </>
        )}
      </div>

      <JuriaCreateProjectModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => openProject(id)}
      />
    </div>
  );
}
