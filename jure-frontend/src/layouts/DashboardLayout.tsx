import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import useChatStore from '@/stores/chatStore'
import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { TVAThresholdNotification } from '@/components/finance/tva/TVAThresholdNotification'
import { NotificationProvider } from '@/context/NotificationContext'
import { MobileNavProvider } from '@/context/MobileNavContext'
import { NotificationToastStack } from '@/components/notifications/NotificationToastStack'
import { JuriaFloatingAssistant } from '@/components/juria/JuriaFloatingAssistant'
import { JURIA_ENABLED } from '@/config/features'
import { useAppTranslation } from '@/i18n'

const isDashboardIndex = (path: string) =>
  path === '/dashboard' || path === '/dashboard/'

const isConversationsPage = (path: string) =>
  path.startsWith('/dashboard/conversations') || path.startsWith('/dashboard/messages')

const isWorkspacePage = (path: string) =>
  path.startsWith('/dashboard/tasks') || path.startsWith('/dashboard/calendar')

const isTeamPage = (path: string) =>
  path.startsWith('/dashboard/team')

const isCasesPage = (path: string) =>
  path.startsWith('/dashboard/cases')

const isFinancePage = (path: string) =>
  path.startsWith('/dashboard/finance')

const isJuriaPage = (path: string) =>
  path.startsWith('/dashboard/juria') || path.startsWith('/dashboard/legal-ai')

const DashboardLayout = () => {
    const [activeTab, setActiveTab] = useState('')
    const location = useLocation()
    const { dir } = useAppTranslation()
    const isRTL = dir === 'rtl'
    const isCockpit = isDashboardIndex(location.pathname)
    const isConversations = isConversationsPage(location.pathname)
    const isWorkspace = isWorkspacePage(location.pathname)
    const isTeam = isTeamPage(location.pathname)
    const isCases = isCasesPage(location.pathname)
    const isFinance = isFinancePage(location.pathname)
    const isJuria = isJuriaPage(location.pathname)
    useChatStore.getState().connect()

    const fillViewport = isCockpit || isConversations || isWorkspace || isTeam || isCases || isFinance || isJuria

    return (
        <NotificationProvider>
        <MobileNavProvider>
        <div className={fillViewport ? 'h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex' : 'min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col'}>
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className={`flex-1 flex flex-col min-w-0 ${isRTL ? 'lg:mr-16' : 'lg:ml-16'} ${isCockpit || isConversations || isCases || isFinance || isJuria ? 'min-h-0 overflow-hidden' : ''}`}>
                <Header />

                <TVAThresholdNotification />

                <NotificationToastStack />

                {JURIA_ENABLED ? <JuriaFloatingAssistant /> : null}

                <main className={
                    isCockpit
                        ? 'flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8 pb-[max(2rem,env(safe-area-inset-bottom))]'
                        : isConversations
                        ? 'flex-1 min-h-0 overflow-hidden pt-0'
                        : isWorkspace
                        ? 'flex-1 min-h-0 overflow-hidden pt-0'
                        : isTeam
                        ? 'flex-1 min-h-0 overflow-hidden overflow-x-hidden p-3 sm:p-6 lg:p-8 pt-4 sm:pt-6'
                        : isCases
                        ? 'flex-1 min-h-0 overflow-hidden overflow-x-hidden p-3 sm:p-6 lg:p-8 pt-4 sm:pt-6'
                        : isFinance
                        ? 'flex-1 min-h-0 overflow-hidden overflow-x-hidden p-3 sm:p-6 lg:p-8 pt-4 sm:pt-6'
                        : isJuria
                        ? 'flex-1 min-h-0 overflow-hidden overflow-x-hidden p-2 sm:p-4 lg:p-8 pt-2 sm:pt-4'
                        : 'flex-1 overflow-x-hidden p-3 sm:p-6 lg:p-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 sm:pt-6'
                }>
                    <Outlet />
                </main>
            </div>
        </div>
        </MobileNavProvider>
        </NotificationProvider>
    )
}

export default DashboardLayout
