import React, { useRef, useState, useEffect } from 'react';
import {
  ChevronDown, User, Settings, LogOut,
  Mail, Calendar, Search, Briefcase, FileText, CheckSquare, X, Loader2,
  Sun, Moon, Coins, Menu, MoreHorizontal,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import LogoutModal, { LogoutModalRef } from './layout/LogoutModal';
import useUserStore from '@/stores/userStore';
import useChatStore from '@/stores/chatStore';
import { useDebounce } from '@/hooks/use-debounce';
import { apiGetCases } from '@/services/case/api';
import { apiGetClients } from '@/services/client/api';
import { apiGetTasks } from '@/services/task/api';
import { useAppTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import GroupChatIcon from '@/components/chat/GroupChatIcon';
import { apiListConversations } from '@/services/conversations/api';
import { useCabinetMemberDirectory } from '@/hooks/useCabinetMemberDirectory';
import { devError } from '@/utils/devLog';
import { cn } from '@/lib/utils';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useMobileNav } from '@/context/MobileNavContext';

const pickFirstNonEmpty = (...values: Array<string | null | undefined>) =>
  values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();

interface ChatMessage {
  id: number;
  sender: { id: number; first_name: string; last_name: string; email: string; full_name: string };
  body: string;
  created: string;
  unread: boolean;
  conversation_id: number;
}

const Header = () => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<{
    cases: API.Case[];
    clients: API.Client[];
    tasks: API.Task[];
  }>({ cases: [], clients: [], tasks: [] });
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const logoutModalRef = useRef<LogoutModalRef>(null);
  const { user } = useUserStore();
  const chatStore = useChatStore();
  const { t } = useAppTranslation();
  const { themeChoice, setTheme } = useTheme();
  const { toggle: toggleMobileNav } = useMobileNav();
  const lookupCabinet = useCabinetMemberDirectory();
  /** When opening messages popover, map conversation id → group icon + title for correct avatars. */
  const [conversationMetaById, setConversationMetaById] = useState<
    Map<
      number,
      {
        type: API.Conversation['type'];
        icon_url?: string | null;
        icon_preset_emoji?: string | null;
        title: string;
        display_name?: string;
      }
    >
  >(new Map());

  const debouncedSearchValue = useDebounce(searchValue, 300);
  
  const recentMessages: ChatMessage[] = (chatStore.notifications || []).filter((m: any) => m.is_message);

  // Format message time: today = time only, else date + time
  const formatMessageTime = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    if (isToday) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined }) +
      ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  // Group messages by conversation_id; keep latest message per conversation, count unread only
  type GroupedMessage = { lastMessage: ChatMessage; unreadCount: number; hasUnread: boolean };
  const groupedMessages = React.useMemo(() => {
    const byConv = new Map<number, ChatMessage[]>();
    for (const m of recentMessages) {
      const convId = (m as any).conversation_id ?? (m as any).conversationId;
      if (!byConv.has(convId)) byConv.set(convId, []);
      byConv.get(convId)!.push(m);
    }
    const result: GroupedMessage[] = [];
    byConv.forEach((msgs) => {
      msgs.sort((a, b) => new Date((b as any).created).getTime() - new Date((a as any).created).getTime());
      const last = msgs[0];
      const unreadCount = msgs.filter((m) => (m as any).unread).length;
      const hasUnread = unreadCount > 0;
      result.push({ lastMessage: last, unreadCount, hasUnread });
    });
    result.sort((a, b) => new Date((b.lastMessage as any).created).getTime() - new Date((a.lastMessage as any).created).getTime());
    return result;
  }, [recentMessages]);
  
  // const recentMessages = [
  //   { 
  //     id: 1, 
  //     sender: "John Smith", 
  //     message: "Thanks for the contract review. When can we schedule the next meeting?", 
  //     time: "2 min ago", 
  //     unread: true,
  //     avatar: "JS",
  //     conversationId: 1
  //   },
  //   { 
  //     id: 2, 
  //     sender: "Sarah Johnson", 
  //     message: "I have some questions about the legal documents.", 
  //     time: "1 hour ago", 
  //     unread: true,
  //     avatar: "SJ",
  //     conversationId: 2
  //   },
  //   { 
  //     id: 3, 
  //     sender: "Michael Brown", 
  //     message: "Could you please send me the updated terms?", 
  //     time: "2 hours ago", 
  //     unread: false,
  //     avatar: "MB",
  //     conversationId: 3
  //   },
  //   { 
  //     id: 4, 
  //     sender: "Emily Davis", 
  //     message: "The meeting went well. I'll send you the notes.", 
  //     time: "3 hours ago", 
  //     unread: false,
  //     avatar: "ED",
  //     conversationId: 4
  //   },
  //   { 
  //     id: 5, 
  //     sender: "Robert Wilson", 
  //     message: "Can we reschedule our appointment for tomorrow?", 
  //     time: "1 day ago", 
  //     unread: false,
  //     avatar: "RW",
  //     conversationId: 5
  //   }
  // ];

  const unreadMessagesCount = recentMessages.filter(m => m.unread).length;
  const { authorized: canAccessFinance } = useFinanceAccess();

  const ROUTE_LABELS: Record<string, string> = {
    '': t.sidebar.dashboard,
    dashboard: t.sidebar.dashboard,
    team: t.sidebar.team,
    'team-member': t.sidebar.team,
    'team-members': t.sidebar.team,
    profile: t.sidebar.myProfile,
    cases: t.sidebar.cases,
    clients: t.sidebar.clients,
    'client-profile': t.sidebar.clients,
    'client-update': t.sidebar.clients,
    'case-files': t.sidebar.cases,
    'case-update': t.sidebar.cases,
    'legal-ai': t.sidebar.legalAi,
    juria: t.sidebar.legalAi,
    library: t.sidebar.library,
    tasks: t.sidebar.calendar,
    calendar: t.sidebar.calendar,
    settings: t.sidebar.settings,
    conversations: t.sidebar.conversations,
    me: t.sidebar.myProfile,
    documents: 'Documents',
    reports: 'Reports',
    finance: 'Finance',
    notifications: 'Notifications',
  };

  const formatSegment = (segment: string, index: number, segments: string[]) => {
    const key = segment.toLowerCase();
    if (ROUTE_LABELS[key]) return ROUTE_LABELS[key];
    if (/^\d+$/.test(segment)) {
      const prev = segments[index - 1];
      if (prev && ['case', 'cases'].includes(prev.toLowerCase())) {
        return `Case #${segment}`;
      }
      if (prev && ['client', 'clients'].includes(prev.toLowerCase())) {
        return `Client #${segment}`;
      }
      return `#${segment}`;
    }
    return segment
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const buildBreadcrumbs = (pathname: string) => {
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => ({
      name: formatSegment(segment, index, segments),
      path: '/' + segments.slice(0, index + 1).join('/'),
    }));
  };

  const breadcrumbs = buildBreadcrumbs(location.pathname);
  const organizationName = pickFirstNonEmpty(
    user?.trade_name,
    user?.firm_name,
    (user as any)?.cabinet_name,
    (user as any)?.company_name,
    (user as any)?.organization?.name,
    (user as any)?.cabinet?.name,
  );
  const getPageTitle = () => {
    if (organizationName) return organizationName;
    if (breadcrumbs.length === 0) return ROUTE_LABELS[''] || t.sidebar.dashboard;
    return breadcrumbs.map(crumb => crumb.name).join(' • ');
  };

  const handleMessageClick = (message: ChatMessage) => {
    setMessagesOpen(false);
    navigate(`/dashboard/conversations?selected=${message.conversation_id}`);
  };

  const handleSearchToggle = () => {
    setSearchExpanded(!searchExpanded);
    if (searchExpanded) {
      setSearchValue('');
      setSearchResults({ cases: [], clients: [], tasks: [] });
    }
  };

  // Ensure WebSocket connection for notifications
  useEffect(() => {
    const chatState = chatStore;
    const userState = useUserStore.getState();
    if (!chatState.isConnected && !chatState.isConnecting && userState.isLoggedIn) {
      chatState.connect();
    }
  }, [chatStore.isConnected, chatStore.isConnecting]);

  useEffect(() => {
    if (!messagesOpen) return;
    let cancelled = false;
    apiListConversations()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        const m = new Map<
          number,
          {
            type: API.Conversation['type'];
            icon_url?: string | null;
            icon_preset_emoji?: string | null;
            title: string;
            display_name?: string;
          }
        >();
        for (const c of list) {
          m.set(c.id, {
            type: c.type,
            icon_url: (c as API.Conversation).icon_url,
            icon_preset_emoji: (c as API.Conversation).icon_preset_emoji,
            title: c.title,
            display_name: (c as API.Conversation).display_name,
          });
        }
        if (!cancelled) setConversationMetaById(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [messagesOpen]);

  useEffect(() => {
    const c = chatStore.lastConversationUpdated;
    if (!c?.id) return;
    setConversationMetaById((prev) => {
      const next = new Map(prev);
      next.set(c.id, {
        type: c.type,
        icon_url: (c as API.Conversation).icon_url,
        icon_preset_emoji: (c as API.Conversation).icon_preset_emoji,
        title: c.title,
        display_name: (c as API.Conversation).display_name,
      });
      return next;
    });
  }, [chatStore.lastConversationUpdated]);

  // Search functionality
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchValue.trim() || debouncedSearchValue.length < 2) {
        setSearchResults({ cases: [], clients: [], tasks: [] });
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const query = debouncedSearchValue.trim().toLowerCase();

      try {
        // Search cases (has built-in search parameter)
        const casesPromise = apiGetCases({ search: query, page_size: 5 });
        
        // Search clients and tasks (fetch all and filter client-side)
        const clientsPromise = apiGetClients();
        const tasksPromise = apiGetTasks();

        const [casesRes, clientsRes, tasksRes] = await Promise.all([
          casesPromise,
          clientsPromise,
          tasksPromise,
        ]);

        // Filter clients client-side
        const filteredClients = clientsRes.data.results.filter((client: API.Client) => {
          const fullName = `${client.first_name || ''} ${client.last_name || ''}`.toLowerCase();
          const email = (client.email || '').toLowerCase();
          return fullName.includes(query) || email.includes(query);
        }).slice(0, 5);

        // Filter tasks client-side
        const filteredTasks = tasksRes.data.results.filter((task: API.Task) => {
          const title = (task.title || '').toLowerCase();
          const description = (task.description || '').toLowerCase();
          return title.includes(query) || description.includes(query);
        }).slice(0, 5);

        setSearchResults({
          cases: casesRes.data.results,
          clients: filteredClients,
          tasks: filteredTasks,
        });
      } catch (error) {
        devError('Search error:', error);
        setSearchResults({ cases: [], clients: [], tasks: [] });
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchValue]);

  const handleSearchResultClick = (type: 'case' | 'client' | 'task', id: number) => {
    setSearchExpanded(false);
    setSearchValue('');
    setSearchResults({ cases: [], clients: [], tasks: [] });
    
    if (type === 'case') {
      navigate(`/dashboard/cases`);
    } else if (type === 'client') {
      navigate(`/dashboard/clients`);
    } else if (type === 'task') {
      navigate(`/dashboard/tasks`);
    }
  };

  const totalResults = searchResults.cases.length + searchResults.clients.length + searchResults.tasks.length;

  const navigateTo = (path: string) => {
    setProfileOpen(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-sm border-b border-border px-3 py-2 sm:px-6 sm:py-3 lg:px-8 pt-[max(0.5rem,env(safe-area-inset-top))] transition-all duration-300">
      <div className="flex items-center justify-between gap-2 min-h-12 sm:h-16">
        {/* Left side - Menu, Title and Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0 h-11 w-11 text-muted-foreground hover:text-foreground"
            onClick={toggleMobileNav}
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {organizationName && user?.logo && (
                <img 
                  key={user.logo_version || user.logo}
                  src={user.logo_version ? `${user.logo}${user.logo.includes('?') ? '&' : '?'}t=${user.logo_version}` : user.logo}
                  alt={`${organizationName} logo`}
                  className="h-7 w-7 sm:h-8 sm:w-8 object-contain rounded shrink-0"
                />
              )}
              <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight truncate">{getPageTitle()}</h1>
            </div>
            {breadcrumbs.length > 0 && (
              <nav className="hidden sm:flex items-center text-sm text-muted-foreground mt-1 overflow-hidden">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <span className="mx-2 text-muted-foreground/50">/</span>}
                    <button
                      onClick={() => navigate(crumb.path)}
                      className={`hover:text-primary transition-colors truncate ${index === breadcrumbs.length - 1 ? "font-medium text-foreground" : ""}`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
          {/* Theme + Finance: desktop / tablet only; mobile via More */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex text-muted-foreground hover:text-foreground h-10 w-10"
            onClick={() => setTheme(themeChoice === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {themeChoice === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          {canAccessFinance && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'hidden md:inline-flex text-muted-foreground hover:text-foreground h-10 w-10',
                location.pathname.startsWith('/dashboard/finance') &&
                  'text-jure-600 dark:text-jure-400 bg-jure-50 dark:bg-jure-950/40'
              )}
              onClick={() => navigate('/dashboard/finance')}
              aria-label="Finance"
              title="Finance"
            >
              <Coins size={18} />
            </Button>
          )}
          {/* Search - Icon only that expands */}
          <Popover open={searchExpanded} onOpenChange={setSearchExpanded}>
            <PopoverTrigger asChild>
              <div className={`flex items-center transition-all duration-300 ${searchExpanded ? 'w-[min(100vw-8rem,16rem)] sm:w-64' : 'w-10'}`}>
                {searchExpanded ? (
                  <div className="relative w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
                    <Input
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      placeholder={t.header.searchPlaceholder}
                      className="pl-10 pr-10 py-2 text-sm rounded-lg focus-visible:ring-primary h-10"
                      autoFocus
                    />
                    {isSearching && (
                      <Loader2 size={16} className="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={handleSearchToggle}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground h-11 w-11 sm:h-10 sm:w-10"
                    onClick={handleSearchToggle}
                    aria-label="Search"
                  >
                    <Search size={18} />
                  </Button>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent 
              className="w-[min(100vw-1.5rem,400px)] p-0 rounded-xl shadow-lg border" 
              align="end"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="p-2">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">{t.header.searchSearching}</span>
                  </div>
                ) : searchValue.trim().length < 2 ? (
                  <div className="py-8 text-center">
                    <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">{t.header.searchTypeMore}</p>
                  </div>
                ) : totalResults === 0 ? (
                  <div className="py-8 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">{t.header.searchNoResults}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.header.searchNoResultsHint}</p>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {searchResults.cases.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background">
                          {t.header.searchCasesLabel} ({searchResults.cases.length})
                        </div>
                        {searchResults.cases.map((caseItem) => (
                          <div
                            key={caseItem.id}
                            onClick={() => handleSearchResultClick('case', caseItem.id)}
                            className="flex items-start gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors rounded-lg group"
                          >
                            <div className="mt-0.5 p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                              <Briefcase size={14} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary">
                                {caseItem.title}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {caseItem.reference || caseItem.summary}
                              </p>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {searchResults.clients.length > 0 && (
                      <>
                        {searchResults.cases.length > 0 && <div className="h-px bg-border my-1" />}
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background">
                          {t.header.searchClientsLabel} ({searchResults.clients.length})
                        </div>
                        {searchResults.clients.map((client) => (
                          <div
                            key={client.id}
                            onClick={() => handleSearchResultClick('client', client.id)}
                            className="flex items-start gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors rounded-lg group"
                          >
                            <div className="mt-0.5 p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                              <User size={14} className="text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary">
                                {client.first_name} {client.last_name}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {client.email}
                              </p>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {searchResults.tasks.length > 0 && (
                      <>
                        {(searchResults.cases.length > 0 || searchResults.clients.length > 0) && (
                          <div className="h-px bg-border my-1" />
                        )}
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background">
                          {t.header.searchTasksLabel} ({searchResults.tasks.length})
                        </div>
                        {searchResults.tasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => handleSearchResultClick('task', task.id)}
                            className="flex items-start gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors rounded-lg group"
                          >
                            <div className="mt-0.5 p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                              <CheckSquare size={14} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary">
                                {task.title}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {task.description || t.header.searchNoDescription}
                              </p>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Messages — hide on very small screens; available in More */}
          <Popover open={messagesOpen} onOpenChange={setMessagesOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative hidden xs:inline-flex sm:inline-flex text-muted-foreground hover:text-foreground h-11 w-11 sm:h-10 sm:w-10 max-[379px]:hidden"
                aria-label="Messages"
              >
                <Mail size={18} />
                {unreadMessagesCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-blue-500 text-white">
                    {unreadMessagesCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(100vw-1.5rem,20rem)] p-0 rounded-xl shadow-lg border" align="end">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-sm">{t.header.messagesTitle}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                      {unreadMessagesCount} {t.header.messagesUnreadSuffix}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setMessagesOpen(false);
                        navigate('/dashboard/conversations');
                      }}
                      className="text-xs text-primary hover:text-primary/80"
                    >
                      {t.header.messagesViewAll}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {groupedMessages.map(({ lastMessage, unreadCount, hasUnread }) => {
                  const sender = (lastMessage as any).sender as Record<string, unknown> | undefined;
                  const sid = typeof sender?.id === 'number' ? sender.id : undefined;
                  const cab = sid != null ? lookupCabinet(sid) : undefined;
                  const imageUrl = (sender && getPersonImage(sender)) ?? cab?.image;
                  const firstName = (sender?.first_name as string | undefined) ?? cab?.first_name;
                  const lastName = (sender?.last_name as string | undefined) ?? cab?.last_name;
                  const email = (sender?.email as string | undefined) ?? cab?.email;
                  const displayName =
                    (sender?.full_name as string | undefined)?.trim() ||
                    `${firstName ?? ''} ${lastName ?? ''}`.trim() ||
                    email ||
                    'Unknown';
                  const convId =
                    (lastMessage as any).conversation_id ?? (lastMessage as any).conversationId;
                  const meta = typeof convId === 'number' ? conversationMetaById.get(convId) : undefined;
                  const isGroup = meta?.type === 'group';
                  const groupHeading =
                    (meta?.display_name ?? meta?.title)?.trim() || '';
                  return (
                  <div
                    key={`${(lastMessage as any).conversation_id ?? lastMessage.id}`}
                    className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${hasUnread ? 'bg-primary/5' : ''}`}
                    onClick={() => handleMessageClick(lastMessage)}
                  >
                    <div className="flex items-start gap-3">
                      {isGroup && meta ? (
                        <GroupChatIcon
                          iconUrl={meta.icon_url}
                          iconPresetEmoji={meta.icon_preset_emoji}
                          size="sm"
                          className="h-8 w-8 shrink-0"
                        />
                      ) : (
                        <UserAvatar
                          size="sm"
                          className="flex-shrink-0"
                          image={imageUrl}
                          firstName={firstName}
                          lastName={lastName}
                          email={email}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <h4 className="text-xs font-medium text-foreground truncate">
                            {isGroup && groupHeading ? groupHeading : displayName}
                          </h4>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatMessageTime((lastMessage as any).created)}
                            {unreadCount > 1 && (
                              <span className="ml-1">· {unreadCount} messages</span>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{lastMessage.body}</p>
                        {hasUnread && (
                          <div className="flex items-center justify-between mt-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              <div className="p-2 border-t">
                <Button 
                  variant="ghost" 
                  className="w-full text-primary hover:bg-primary/10 text-sm"
                  onClick={() => {
                    setMessagesOpen(false);
                    navigate('/dashboard/conversations');
                  }}
                >
                  {t.header.messagesOpenConversations}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <NotificationBell />

          {/* Mobile More menu — theme, finance, messages, calendar shortcuts */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-11 w-11 text-muted-foreground hover:text-foreground"
                aria-label="More actions"
              >
                <MoreHorizontal size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => setTheme(themeChoice === 'dark' ? 'light' : 'dark')}
                className="min-h-11"
              >
                {themeChoice === 'dark' ? <Sun size={16} className="mr-2" /> : <Moon size={16} className="mr-2" />}
                {themeChoice === 'dark' ? 'Light mode' : 'Dark mode'}
              </DropdownMenuItem>
              {canAccessFinance && (
                <DropdownMenuItem
                  onClick={() => navigate('/dashboard/finance')}
                  className="min-h-11"
                >
                  <Coins size={16} className="mr-2" />
                  Finance
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => navigate('/dashboard/conversations')}
                className="min-h-11"
              >
                <Mail size={16} className="mr-2" />
                Messages
                {unreadMessagesCount > 0 && (
                  <Badge className="ml-auto h-5 min-w-5 px-1.5 bg-blue-500 text-white">
                    {unreadMessagesCount}
                  </Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/dashboard/calendar')}
                className="min-h-11"
              >
                <Calendar size={16} className="mr-2" />
                Calendar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate('/dashboard/settings')}
                className="min-h-11"
              >
                <Settings size={16} className="mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile */}
          <Popover open={profileOpen} onOpenChange={setProfileOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-11 w-11 sm:h-10 sm:w-auto sm:px-2 rounded-full hover:bg-muted p-0 sm:p-2">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.image} className='object-cover' />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white font-medium">
                      {user?.first_name?.charAt(0)}
                      {user?.last_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline-flex text-sm font-medium text-foreground">
                    {user?.first_name} {user?.last_name}
                  </span>
                  <ChevronDown size={16} className="hidden lg:block text-muted-foreground" />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 rounded-xl shadow-lg border" align="end">
              <div className="p-4 border-b">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.image} className='object-cover' />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white font-medium">MA</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {user?.first_name} {user?.last_name}
                    </h3>
                    <p className="text-xs text-muted-foreground">Partner Attorney</p>
                  </div>
                </div>
              </div>
              <div className="py-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start px-4 py-2 text-sm font-medium min-h-11"
                  onClick={() => navigateTo('/dashboard/profile')}
                >
                  <User size={16} className="mr-3 text-muted-foreground" />
                  My Profile
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-4 py-2 text-sm font-medium min-h-11"
                  onClick={() => navigateTo('/dashboard/conversations')}
                >
                  <Mail size={16} className="mr-3 text-muted-foreground" />
                  Messages
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-4 py-2 text-sm font-medium min-h-11"
                  onClick={() => navigateTo('/dashboard/calendar')}
                >
                  <Calendar size={16} className="mr-3 text-muted-foreground" />
                  My Calendar
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-4 py-2 text-sm font-medium min-h-11"
                  onClick={() => navigateTo('/dashboard/settings')}
                >
                  <Settings size={16} className="mr-3 text-muted-foreground" />
                  Settings
                </Button>
              </div>
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  className="w-full justify-start px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 min-h-11"
                  onClick={() => {
                    logoutModalRef.current?.show();
                  }}
                >
                  <LogOut size={16} className="mr-3 text-destructive" />
                  Sign Out
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <LogoutModal ref={logoutModalRef} />
    </header>
  );
};

export default Header;