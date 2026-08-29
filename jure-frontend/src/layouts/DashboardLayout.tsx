import Header from '@/components/Header'
import Sidebar, {
  SIDEBAR_EXPANDED_STORAGE_KEY,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_RAIL_WIDTH,
} from '@/components/Sidebar'
import useChatStore from '@/stores/chatStore'
import useCallsWsStore from '@/stores/callsWsStore'
import React, { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { TVAThresholdNotification } from '@/components/finance/tva/TVAThresholdNotification'
import { NotificationProvider } from '@/context/NotificationContext'
import { MobileNavProvider } from '@/context/MobileNavContext'
import { NotificationToastStack } from '@/components/notifications/NotificationToastStack'
import { JuriaFloatingAssistant } from '@/components/juria/JuriaFloatingAssistant'
import CallShell from '@/components/conversations/call/CallShell'
import { JURIA_ENABLED } from '@/config/features'
import { cn } from '@/lib/utils'
import { ShortcutsProvider } from '@/context/ShortcutsContext'
import CommandPalette from '@/components/shortcuts/CommandPalette'
import ShortcutsHelpDialog from '@/components/shortcuts/ShortcutsHelpDialog'
import QuickCreateHost from '@/components/shortcuts/QuickCreateHost'
import { useIdleLogout } from '@/hooks/useIdleLogout'
import AuroraBackground, { auroraForAppPath } from '@/components/common/AuroraBackground'

const isDashboardIndex = (path: string) =>
  path === '/dashboard' || path === '/dashboard/'

const isConversationsPage = (path: string) =>
  path.startsWith('/dashboard/conversations') || path.startsWith('/dashboard/messages')

const isWorkspacePage = (path: string) =>
  path.startsWith('/dashboard/calendar')

const isTasksPage = (path: string) =>
  path.startsWith('/dashboard/tasks')

const isAppointmentsPage = (path: string) =>
  path.startsWith('/dashboard/appointments') || path.startsWith('/dashboard/appointment')

const isTeamPage = (path: string) =>
  path.startsWith('/dashboard/team')

const isCasesPage = (path: string) =>
  path.startsWith('/dashboard/cases')

const isClientsPage = (path: string) =>
  path.startsWith('/dashboard/clients')

const isFinancePage = (path: string) =>
  path.startsWith('/dashboard/finance')

const isJuriaPage = (path: string) =>
  path.startsWith('/dashboard/juria') || path.startsWith('/dashboard/legal-ai')

const isLibraryPage = (path: string) =>
  path.startsWith('/dashboard/library')

function readSidebarExpanded(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY)
    if (stored === null) return false
    return stored === '1'
  } catch {
    return false
  }
}

const DashboardLayout = () => {
  useIdleLogout()
  const [activeTab, setActiveTab] = useState('')
  const [sidebarExpanded, setSidebarExpanded] = useState(readSidebarExpanded)
  const location = useLocation()
  const isCockpit = isDashboardIndex(location.pathname)
  const isConversations = isConversationsPage(location.pathname)
  const isWorkspace = isWorkspacePage(location.pathname)
  const isTeam = isTeamPage(location.pathname)
  const isCases = isCasesPage(location.pathname)
  const isClients = isClientsPage(location.pathname)
  const isFinance = isFinancePage(location.pathname)
  const isJuria = isJuriaPage(location.pathname)
  const isLibrary = isLibraryPage(location.pathname)
  const isTasks = isTasksPage(location.pathname)
  const isAppointments = isAppointmentsPage(location.pathname)

  useEffect(() => {
    useChatStore.getState().connect()
    void useCallsWsStore.getState().connect().catch(() => {})
    // Keep calls socket warm so backgrounded PWA still receives ringing events.
    const ping = window.setInterval(() => {
      void useCallsWsStore.getState().connect().catch(() => {})
    }, 45_000)
    return () => {
      window.clearInterval(ping)
      useChatStore.getState().disconnect()
      // Keep /ws/calls/ open across dashboard routes; CallShell owns call lifecycle.
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, sidebarExpanded ? '1' : '0')
    } catch {
      // ignore quota / private mode
    }
  }, [sidebarExpanded])

  const fillViewport =
    isCockpit ||
    isConversations ||
    isWorkspace ||
    isTeam ||
    isCases ||
    isClients ||
    isFinance ||
    isJuria ||
    isLibrary ||
    isTasks ||
    isAppointments

  const sidebarWidth = sidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_RAIL_WIDTH

  return (
    <NotificationProvider>
      <MobileNavProvider>
        <ShortcutsProvider onToggleSidebar={() => setSidebarExpanded((v) => !v)}>
        <div
          className={
            fillViewport
              ? 'relative flex h-screen overflow-hidden bg-background'
              : 'relative flex min-h-screen flex-col bg-background'
          }
          style={{ ['--sidebar-rail-width' as string]: sidebarWidth }}
        >
          <AuroraBackground intensity={auroraForAppPath(location.pathname)} />
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            expanded={sidebarExpanded}
            onExpandedChange={setSidebarExpanded}
          />

          <div
            className={cn(
              'relative z-[1] flex min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-in-out lg:ms-[var(--sidebar-rail-width)]',
              fillViewport && 'min-h-0 overflow-hidden',
            )}
          >
            <Header />

            <TVAThresholdNotification />

            <NotificationToastStack />

            {JURIA_ENABLED ? <JuriaFloatingAssistant /> : null}

            <CallShell />

            <CommandPalette />
            <ShortcutsHelpDialog />
            <QuickCreateHost />

            <main
              className={
                isCockpit
                  ? 'flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2.5 sm:p-4 lg:p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]'
                  : isConversations
                    ? 'flex-1 min-h-0 overflow-hidden pt-0'
                    : isWorkspace
                      ? 'flex-1 min-h-0 overflow-hidden pt-0'
                      : isTeam || isClients || isCases || isTasks || isAppointments
                        ? 'flex-1 min-h-0 overflow-hidden overflow-x-hidden p-1.5 sm:p-2.5 lg:p-3 pt-1.5 sm:pt-2.5'
                        : isFinance
                          ? 'flex-1 min-h-0 overflow-hidden overflow-x-hidden p-2.5 sm:p-4 lg:p-5 pt-3 sm:pt-4'
                          : isJuria
                            ? 'flex-1 min-h-0 overflow-hidden overflow-x-hidden p-0'
                            : isLibrary
                              ? 'flex-1 min-h-0 overflow-hidden overflow-x-hidden p-0'
                              : 'flex-1 overflow-x-hidden p-2.5 sm:p-4 lg:p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 sm:pt-4'
              }
            >
              <Outlet />
            </main>
          </div>
        </div>
        </ShortcutsProvider>
      </MobileNavProvider>
    </NotificationProvider>
  )
}

export default DashboardLayout
