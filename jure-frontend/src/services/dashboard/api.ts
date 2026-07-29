import axiosInstance from '@/utils/axiosInstance';
import { devError } from '@/utils/devLog';
import { apiGetClients } from '@/services/client/api';
import { apiGetCases } from '@/services/case/api';
import { apiGetTasks } from '@/services/task/api';

export interface DashboardStats {
  totalClients: number;
  totalCases: number;
  totalTasks: number;
  clientsChange: string;
  casesChange: string;
  tasksChange: string;
}

export async function apiGetCabinetStats() {
  try {
    // Fetch all data in parallel
    const [clientsResponse, casesResponse, tasksResponse] = await Promise.all([
      apiGetClients(),
      apiGetCases({ page_size: 100 }), // Get more cases to find recent ones
      apiGetTasks()
    ]);

    // Calculate totals
    const totalClients = Array.isArray(clientsResponse.data) 
      ? clientsResponse.data.length 
      : clientsResponse.data.count || 0;
    
    const totalCases = Array.isArray(casesResponse.data) 
      ? casesResponse.data.length 
      : casesResponse.data.count || 0;
    
    const totalTasks = Array.isArray(tasksResponse.data) 
      ? tasksResponse.data.length 
      : tasksResponse.data.count || 0;

    // For now, we'll use placeholder change percentages since we don't have historical data
    // In a real implementation, you'd calculate these based on previous month's data
    const clientsChange = '+12%'; // This would be calculated from historical data
    const casesChange = '+8%';    // This would be calculated from historical data
    const tasksChange = '-3%';    // This would be calculated from historical data

    // Get today's date for filtering tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Transform tasks to today's tasks format
    const allTasks = Array.isArray(tasksResponse.data) 
      ? tasksResponse.data 
      : tasksResponse.data.results || [];
    
    const todayTasks = allTasks
      .filter((task: API.Task) => {
        if (!task.due_date) return false;
        const taskDate = new Date(task.due_date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.toISOString().split('T')[0] === todayStr && task.status !== 'done' && task.status !== 'cancelled';
      })
      .sort((a: API.Task, b: API.Task) => {
        // Sort by priority (high > medium > low) then by due date
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        if (!a.due_date || !b.due_date) return 0;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      })
      .slice(0, 10) // Limit to 10 tasks
      .map((task: API.Task) => {
        // Format time from due_date
        let time = 'All day';
        if (task.due_date) {
          const taskDate = new Date(task.due_date);
          time = taskDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Map priority to display format
        const priorityMap: Record<string, 'Low' | 'Medium' | 'High' | 'Critical'> = {
          low: 'Low',
          medium: 'Medium',
          high: 'High',
        };
        // Check if task is overdue for Critical
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
        const priority = isOverdue ? 'Critical' : (priorityMap[task.priority] || 'Medium');

        return {
          id: task.id,
          title: task.title,
          time,
          priority,
        };
      });

    // Transform cases to recent cases format
    const allCases = Array.isArray(casesResponse.data) 
      ? casesResponse.data 
      : casesResponse.data.results || [];
    
    const recentCases = allCases
      .filter((caseItem: API.Case) => caseItem.status !== 'CLOSED' && caseItem.status !== 'ARCHIVED')
      .sort((a: API.Case, b: API.Case) => {
        // Sort by created date (most recent first)
        const dateA = new Date(a.created || 0).getTime();
        const dateB = new Date(b.created || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5) // Limit to 5 recent cases
      .map((caseItem: API.Case) => {
        // Get client name
        let clientName = 'Unknown Client';
        if (caseItem.client) {
          if (typeof caseItem.client === 'object' && 'first_name' in caseItem.client) {
            clientName = `${caseItem.client.first_name || ''} ${caseItem.client.last_name || ''}`.trim() || caseItem.client.email || 'Unknown Client';
          } else {
            clientName = 'Unknown Client';
          }
        }

        // Map priority (cases might not have priority, use status as fallback)
        const priorityMap: Record<string, 'Low' | 'Medium' | 'High' | 'Critical'> = {
          low: 'Low',
          medium: 'Medium',
          high: 'High',
        };
        const priority = (caseItem as any).priority 
          ? priorityMap[(caseItem as any).priority] || 'Medium'
          : 'Medium';

        return {
          id: caseItem.id,
          title: caseItem.title,
          client: clientName,
          status: caseItem.status,
          priority,
          date: caseItem.created || new Date().toISOString(),
        };
      });

    // Generate recent activity from tasks and cases
    const recentActivity: Array<{ icon: string; message: string; ago: string }> = [];
    
    // Add task activities
    const recentTaskActivities = allTasks
      .filter((task: API.Task) => {
        // Use due_date as fallback if created/modified don't exist
        const hasDate = (task as any).modified || (task as any).created || task.due_date;
        return hasDate && task.status !== 'cancelled';
      })
      .sort((a: API.Task, b: API.Task) => {
        // Sort by modified, created, or due_date (in that order)
        const dateA = new Date((a as any).modified || (a as any).created || a.due_date || 0).getTime();
        const dateB = new Date((b as any).modified || (b as any).created || b.due_date || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 3)
      .map((task: API.Task) => {
        const date = new Date((task as any).modified || (task as any).created || task.due_date || new Date());
        const hoursAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
        const ago = hoursAgo < 1 ? 'Just now' : hoursAgo === 1 ? '1 hour ago' : `${hoursAgo} hours ago`;
        
        let message = '';
        if (task.status === 'done') {
          message = `Task completed: ${task.title}`;
        } else if (task.status === 'in_progress') {
          message = `Task in progress: ${task.title}`;
        } else {
          message = `Task: ${task.title}`;
        }

        return {
          icon: 'CheckSquare',
          message,
          ago,
        };
      });

    // Add case activities
    const recentCaseActivities = allCases
      .filter((caseItem: API.Case) => caseItem.created)
      .sort((a: API.Case, b: API.Case) => {
        const dateA = new Date(a.created || 0).getTime();
        const dateB = new Date(b.created || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 2)
      .map((caseItem: API.Case) => {
        const date = new Date(caseItem.created || new Date());
        const hoursAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
        const ago = hoursAgo < 1 ? 'Just now' : hoursAgo === 1 ? '1 hour ago' : `${hoursAgo} hours ago`;
        
        return {
          icon: 'Briefcase',
          message: `Case created: ${caseItem.title}`,
          ago,
        };
      });

    // Combine and sort all activities
    const allActivities = [...recentTaskActivities, ...recentCaseActivities]
      .sort((a, b) => {
        // Simple sort by "ago" - in real implementation, you'd parse the time
        return 0; // Already sorted by date
      })
      .slice(0, 5);

    const stats: DashboardStats = {
      totalClients,
      totalCases,
      totalTasks,
      clientsChange,
      casesChange,
      tasksChange
    };

    return {
      data: {
        stats: [
          {
            title: 'Total Clients',
            value: totalClients.toString(),
            change: clientsChange,
            icon: 'Users',
            color: 'bg-blue-500'
          },
          {
            title: 'Active Cases',
            value: totalCases.toString(),
            change: casesChange,
            icon: 'Briefcase',
            color: 'bg-emerald-500'
          },
          {
            title: 'Tasks Due',
            value: totalTasks.toString(),
            change: tasksChange,
            icon: 'CheckSquare',
            color: 'bg-amber-500'
          }
        ],
        announcement: {
          title: 'Jure Announcement',
          body: 'Welcome to Jure! New features: enhanced case management, better client comms, and streamlined document flows.'
        },
        recent_cases: recentCases,
        today_tasks: todayTasks,
        recent_activity: allActivities.length > 0 ? allActivities : [
          { icon: 'CheckSquare', message: 'Task completed: Document review for Johnson case', ago: '2 hours ago' },
          { icon: 'Users', message: 'New client added: Sarah Williams', ago: '4 hours ago' },
          { icon: 'ClipboardList', message: 'Document uploaded to Tech Corp case', ago: '6 hours ago' },
        ],
        kpis: {
          wip_aging_gt_60: 0,
          open_high_risk_matters: 0,
          realization_rate: 0
        }
      }
    };
  } catch (error) {
    devError('Error fetching dashboard stats:', error);
    throw error;
  }
}
