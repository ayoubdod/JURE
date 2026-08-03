import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import useChatStore from '@/stores/chatStore'
import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { TVAThresholdNotification } from '@/components/finance/tva/TVAThresholdNotification'
import { NotificationProvider } from '@/context/NotificationContext'
import { NotificationToastStack } from '@/components/notifications/NotificationToastStack'
import { JuriaFloatingAssistant } from '@/components/juria/JuriaFloatingAssistant'
import { JURIA_ENABLED } from '@/config/features'

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
    const isCockpit = isDashboardIndex(location.pathname)
    const isConversations = isConversationsPage(location.pathname)
    const isWorkspace = isWorkspacePage(location.pathname)
    const isTeam = isTeamPage(location.pathname)
    const isCases = isCasesPage(location.pathname)
    const isFinance = isFinancePage(location.pathname)
    const isJuria = isJuriaPage(location.pathname)
    useChatStore.getState().connect()

    return (
        <NotificationProvider>
        <div className={isCockpit || isConversations || isWorkspace || isTeam || isCases || isFinance || isJuria ? 'h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex' : 'min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col'}>
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className={`flex-1 flex flex-col lg:ml-16 ${isCockpit || isConversations || isCases || isFinance || isJuria ? 'min-h-0 overflow-hidden' : 'pb-10 lg:pb-0'}`}>
                <Header />

                <TVAThresholdNotification />

                <NotificationToastStack />

                {JURIA_ENABLED ? <JuriaFloatingAssistant /> : null}

                <main className={
                    isCockpit
                        ? 'flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-8'
                        : isConversations
                        ? 'flex-1 min-h-0 overflow-hidden pt-0'
                        : isWorkspace
                        ? 'flex-1 min-h-0 overflow-hidden pt-0'
                        : isTeam
                        ? 'flex-1 min-h-0 overflow-hidden p-4 sm:p-6 lg:p-8 pt-24'
                        : isCases
                        ? 'flex-1 min-h-0 overflow-hidden p-4 sm:p-6 lg:p-8 pt-24'
                        : isFinance
                        ? 'flex-1 min-h-0 overflow-hidden p-4 sm:p-6 lg:p-8 pt-24'
                        : isJuria
                        ? 'flex-1 min-h-0 overflow-hidden p-4 sm:p-6 lg:p-8 pt-24'
                        : 'flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 pt-24'
                }>
                    <Outlet />
                </main>
            </div>
        </div>
        </NotificationProvider>
    )
}

export default DashboardLayout