// src/pages/Calendar.tsx
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Filter, 
  RefreshCw, 
  Calendar as CalendarIcon, 
  List, 
  LayoutDashboard,
  Clock,
  CheckSquare,
  AlertCircle,
  Users,
  FileText,
  CalendarDays,
  TrendingUp,
  UserCheck,
  Timer,
  ChevronDown
} from 'lucide-react';
import TaskCreateModal, { TaskCreateModalRef } from '@/components/task/TaskCreateModal';
import TaskUpdateModal, { TaskUpdateModalRef } from '@/components/task/TaskUpdateModal';
import ScheduleAppointmentDialog, { ScheduleAppointmentDialogRef } from '@/components/ScheduleAppointmentDialog';
import { useToast } from '@/hooks/use-toast';
import { apiGetCalendarEvents } from '@/services/calendar/api';
import { devError } from '@/utils/devLog';
import { eventBus } from '@/utils/eventBus';

type CalendarEvent = {
  id: string; // "task-12" | "appt-3"
  type: 'task' | 'appointment';
  title: string;
  start: string;
  end?: string | null;
  allDay?: boolean;
  status?: string;
  priority?: string;
  assigned_to?: { id: number; email: string; first_name: string; last_name: string } | null;
  case_id?: number | null;
  case_title?: string;
  client?: string | {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
};

const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeLayout, setActiveLayout] = useState<'calendar' | 'tasks' | 'dashboard'>('dashboard');
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Filters
  const [types, setTypes] = useState<'both' | 'tasks' | 'appointments'>('both');
  const [status, setStatus] = useState<string>('all');
  const [priority, setPriority] = useState<string>('all');
  const [assignedTo, setAssignedTo] = useState<string>('all');
  const [caseId, setCaseId] = useState<string>('all');
  const [client, setClient] = useState<string>('');

  const calendarRef = useRef<FullCalendar | null>(null);
  const taskCreateRef = useRef<TaskCreateModalRef>(null);
  const taskUpdateRef = useRef<TaskUpdateModalRef>(null);
  const appointmentCreateRef = useRef<ScheduleAppointmentDialogRef>(null);

  const { toast } = useToast();

  const loadEvents = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        start: start.toISOString(),
        end: end.toISOString(),
        types: types === 'both' ? 'tasks,appointments' : types,
      };
      if (status !== 'all') params.status = status;
      if (priority !== 'all') params.priority = priority;
      if (assignedTo !== 'all') params.assigned_to = assignedTo;
      if (caseId !== 'all') params.case = caseId;
      if (client) params.client = client;

      const res = await apiGetCalendarEvents(params);
      setEvents(res.data);
    } catch (error) {
      devError('Error loading events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [types, status, priority, assignedTo, caseId, client]);

  // Listen for appointment creation events
  useEffect(() => {
    const handleAppointmentCreated = () => {
      // Refresh calendar when appointment is created
      const api = calendarRef.current?.getApi();
      if (api) {
        loadEvents(api.view.currentStart, api.view.currentEnd);
      }
    };

    eventBus.on('appointment-created', handleAppointmentCreated);

    return () => {
      eventBus.off('appointment-created', handleAppointmentCreated);
    };
  }, [loadEvents]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAddDropdown) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setShowAddDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddDropdown]);

  const handleDatesSet = (arg: { start: Date; end: Date }) => {
    loadEvents(arg.start, arg.end);
  };

  const onEventClick = (info: any) => {
    const evt = info.event;
    const ext = evt.extendedProps as any;
    if (ext.type === 'task') {
      // fetch the task and open update modal; we can map minimal props
      taskUpdateRef.current?.show({
        id: parseInt(String(evt.id).replace('task-', '')),
        title: evt.title,
        description: '',
        priority: ext.priority,
        status: ext.status,
        due_date: evt.startStr?.slice(0, 10),
        estimated_hours: '',
        assigned_to: ext.assigned_to,
        client: ext.client,
        case: ext.case_id,
        case_title: ext.case_title,
      } as unknown as API.Task);
    } else {
      // appointments — for now show a simple alert or open a dedicated modal if you add it
      toast({ title: 'Appointment', description: evt.title });
    }
  };

  const headerToolbar = useMemo(() => ({
    start: 'title',
    center: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
    end: 'today prev,next',
  }), []);

  // Calculate statistics
  const stats = useMemo(() => {
    const tasks = events.filter(e => e.type === 'task');
    const appointments = events.filter(e => e.type === 'appointment');
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter(e => e.start.startsWith(today));
    const overdueTasks = tasks.filter(t => t.start < today && t.status !== 'done');
    const upcomingAppointments = appointments.filter(a => a.start >= today);

    return {
      totalTasks: tasks.length,
      totalAppointments: appointments.length,
      todayEvents: todayEvents.length,
      overdueTasks: overdueTasks.length,
      upcomingAppointments: upcomingAppointments.length,
      completedTasks: tasks.filter(t => t.status === 'done').length,
      inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
    };
  }, [events]);

  // Filter events for tasks/appointments view
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (types === 'tasks' && event.type !== 'task') return false;
      if (types === 'appointments' && event.type !== 'appointment') return false;
      if (status !== 'all' && event.status !== status) return false;
      if (priority !== 'all' && event.priority !== priority) return false;
      if (assignedTo !== 'all' && event.assigned_to?.id?.toString() !== assignedTo) return false;
      if (caseId !== 'all' && event.case_id?.toString() !== caseId) return false;
      if (client && event.client) {
        const clientName = typeof event.client === 'string' 
          ? event.client 
          : (event.client && typeof event.client === 'object' 
            ? `${event.client.first_name || ''} ${event.client.last_name || ''}`.trim() || event.client.email || ''
            : '');
        if (!clientName.toLowerCase().includes(client.toLowerCase())) return false;
      }
      return true;
    });
  }, [events, types, status, priority, assignedTo, caseId, client]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl shadow-lg">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-purple-600 bg-clip-text text-transparent">
                    Calendar
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">Manage your schedule, tasks, and appointments</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Button 
                  onClick={() => setShowAddDropdown(!showAddDropdown)}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 px-6 py-3 rounded-xl font-semibold"
                >
                  <Plus className="h-4 w-4" /> 
                  Add
                  <ChevronDown className="h-4 w-4" />
                </Button>
                {showAddDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowAddDropdown(false);
                          taskCreateRef.current?.show();
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 hover:text-purple-700 flex items-center gap-3 transition-all duration-200 font-medium"
                      >
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <CheckSquare className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-semibold">Add Task</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Create a new task</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowAddDropdown(false);
                          appointmentCreateRef.current?.show();
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 hover:text-purple-700 flex items-center gap-3 transition-all duration-200 font-medium"
                      >
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CalendarIcon className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-semibold">Add Appointment</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Schedule a meeting</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modern Layout Switcher */}
        <Tabs value={activeLayout} onValueChange={(value: any) => setActiveLayout(value)} className="w-full">
          <div className="mb-8">
            <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700/50">
              <TabsTrigger 
                value="dashboard" 
                className="flex items-center gap-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl py-3 px-6 font-semibold transition-all duration-300"
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger 
                value="calendar" 
                className="flex items-center gap-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl py-3 px-6 font-semibold transition-all duration-300"
              >
                <CalendarIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Calendar</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tasks" 
                className="flex items-center gap-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl py-3 px-6 font-semibold transition-all duration-300"
              >
                <List className="h-5 w-5" />
                <span className="hidden sm:inline">Tasks & Appointments</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Dashboard View */}
          <TabsContent value="dashboard" className="space-y-8">
            {/* Key Metrics Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg">
                      <CheckSquare className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Tasks</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalTasks}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg">
                      <CalendarIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Appointments</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalAppointments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Today's Events</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.todayEvents}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Overdue Tasks</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.overdueTasks}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Task Status Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 p-6">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900 dark:text-white">
                    <div className="p-2 bg-purple-600 rounded-xl">
                      <CheckSquare className="h-5 w-5 text-white" />
                    </div>
                    Task Status Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Completed</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                          <div className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500" style={{ width: `${stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0}%` }}></div>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white min-w-[2rem]">{stats.completedTasks}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">In Progress</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-3 rounded-full transition-all duration-500" style={{ width: `${stats.totalTasks > 0 ? (stats.inProgressTasks / stats.totalTasks) * 100 : 0}%` }}></div>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white min-w-[2rem]">{stats.inProgressTasks}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">To Do</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                          <div className="bg-gradient-to-r from-gray-400 to-gray-500 h-3 rounded-full transition-all duration-500" style={{ width: `${stats.totalTasks > 0 ? ((stats.totalTasks - stats.completedTasks - stats.inProgressTasks) / stats.totalTasks) * 100 : 0}%` }}></div>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white min-w-[2rem]">{stats.totalTasks - stats.completedTasks - stats.inProgressTasks}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 p-6">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900 dark:text-white">
                    <div className="p-2 bg-green-600 rounded-xl">
                      <CalendarIcon className="h-5 w-5 text-white" />
                    </div>
                    Upcoming Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {events.filter(e => e.type === 'appointment' && e.start >= new Date().toISOString()).slice(0, 5).map((appointment) => (
                      <div key={appointment.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100/50 transition-all duration-200 group">
                        <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md group-hover:shadow-lg transition-all duration-200">
                          <CalendarIcon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-green-700 transition-colors duration-200">{appointment.title}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {new Date(appointment.start).toLocaleDateString()} at {appointment.start.includes('T') && new Date(appointment.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {stats.upcomingAppointments === 0 && (
                      <div className="text-center py-8">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl inline-block mb-3">
                          <CalendarIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No upcoming appointments</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 p-6">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900 dark:text-white">
                  <div className="p-2 bg-blue-600 rounded-xl">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {events.slice(0, 10).map((event) => (
                    <div key={event.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100/50 transition-all duration-200 group">
                      <div className={`p-3 rounded-xl shadow-md group-hover:shadow-lg transition-all duration-200 ${event.type === 'task' ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 'bg-gradient-to-br from-green-500 to-green-600'}`}>
                        {event.type === 'task' ? <CheckSquare className="h-4 w-4 text-white" /> : <CalendarIcon className="h-4 w-4 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-700 transition-colors duration-200">{event.title}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {event.type === 'task' ? 'Task' : 'Appointment'} • {new Date(event.start).toLocaleDateString()}
                        </p>
                      </div>
                      {event.status && (
                        <Badge variant="outline" className="text-xs font-medium px-3 py-1 rounded-full">{event.status}</Badge>
                      )}
                    </div>
                  ))}
                  {events.length === 0 && (
                    <div className="text-center py-8">
                      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl inline-block mb-3">
                        <Clock className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar View */}
          <TabsContent value="calendar" className="space-y-6">
            {/* Top Filters */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Filter className="w-4 h-4 text-purple-600" />
                    </div>
                    Filters
                  </div>
                  <div className="flex flex-wrap gap-4 items-center">
                    <Select value={types} onValueChange={(v: any) => setTypes(v)}>
                      <SelectTrigger className="w-[160px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-0 shadow-xl">
                        <SelectItem value="both">All Events</SelectItem>
                        <SelectItem value="tasks">Tasks Only</SelectItem>
                        <SelectItem value="appointments">Appointments Only</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="w-[140px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-0 shadow-xl">
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="w-[120px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-0 shadow-xl">
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input 
                      className="w-[180px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200" 
                      placeholder="Search by client..." 
                      value={client} 
                      onChange={(e) => setClient(e.target.value)} 
                    />

                    <Input 
                      className="w-[120px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200" 
                      placeholder="Assignee ID" 
                      value={assignedTo} 
                      onChange={(e) => setAssignedTo(e.target.value || 'all')} 
                    />

                    <Input 
                      className="w-[120px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200" 
                      placeholder="Case ID" 
                      value={caseId} 
                      onChange={(e) => setCaseId(e.target.value || 'all')} 
                    />

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const api = calendarRef.current?.getApi();
                        if (api) {
                          const view = api.view;
                          loadEvents(view.currentStart, view.currentEnd);
                        }
                      }}
                      disabled={loading}
                      className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 font-semibold"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendar */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-0 overflow-hidden">
              <FullCalendar
                ref={calendarRef as any}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  start: 'prev,next today',
                  center: 'title',
                  end: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                }}
                buttonText={{
                  today: 'Today',
                  month: 'Month',
                  week: 'Week',
                  day: 'Day',
                  list: 'List'
                }}
                titleFormat={{ // nicer long month
                  year: 'numeric',
                  month: 'long'
                }}
                height="auto"
                events={events as any}
                eventClick={onEventClick}
                datesSet={handleDatesSet}
                nowIndicator
                selectable={false}
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
                eventClassNames={(event) => {
                  const ext = (event as any).extendedProps;
                  if (ext && ext.type === 'task') {
                    return ['task-event', `task-${ext.priority || 'low'}`];
                  } else if (ext && ext.type === 'appointment') {
                    return ['appointment-event'];
                  }
                  return [];
                }}
                dayMaxEvents={3}
                moreLinkClick="popover"
                eventDisplay="block"
                dayHeaderContent={(arg) => {
                  return arg.text.toUpperCase();
                }}
                dayCellContent={(arg) => {
                  return arg.dayNumberText;
                }}
                eventContent={(arg) => {
                  const event = arg.event;
                  const time = event.start ? new Date(event.start).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  }) : '';
                  
                  return {
                    html: `
                      <div class="fc-event-main-frame">
                        <div class="fc-event-title-container">
                          <div class="fc-event-title fc-sticky">${event.title}</div>
                        </div>
                        ${time ? `<div class="fc-event-time">${time}</div>` : ''}
                      </div>
                    `
                  };
                }}
              />
            </div>
          </TabsContent>

          {/* Tasks & Appointments View */}
          <TabsContent value="tasks" className="space-y-6">
            {/* Filters */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 p-6">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900 dark:text-white">
                  <div className="p-2 bg-purple-600 rounded-xl">
                    <Filter className="h-5 w-5 text-white" />
                  </div>
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Select value={types} onValueChange={(v: any) => setTypes(v)}>
                    <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-xl">
                      <SelectItem value="both">Tasks + Appointments</SelectItem>
                      <SelectItem value="tasks">Tasks Only</SelectItem>
                      <SelectItem value="appointments">Appointments Only</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-xl">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-xl">
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input placeholder="Search by client..." value={client} onChange={(e) => setClient(e.target.value)} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200" />
                </div>
              </CardContent>
            </Card>

            {/* Events List */}
            <div className="grid gap-6">
              {filteredEvents.length === 0 ? (
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
                  <CardContent className="p-12 text-center">
                    <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-2xl inline-block mb-6">
                      <CalendarDays className="h-16 w-16 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">No events found</h3>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Try adjusting your filters or create a new task.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredEvents.map((event) => (
                  <Card key={event.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer rounded-2xl overflow-hidden group" onClick={() => onEventClick({ event: { id: event.id, title: event.title, startStr: event.start, extendedProps: event } } as any)}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`p-4 rounded-2xl shadow-md group-hover:shadow-lg transition-all duration-300 ${event.type === 'task' ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 'bg-gradient-to-br from-green-500 to-green-600'}`}>
                            {event.type === 'task' ? <CheckSquare className="h-5 w-5 text-white" /> : <CalendarIcon className="h-5 w-5 text-white" />}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-purple-700 transition-colors duration-200">{event.title}</h3>
                            <div className="flex items-center gap-6 mt-2 text-sm text-slate-600 dark:text-slate-400">
                              <span className="flex items-center gap-2 font-medium">
                                <Clock className="h-4 w-4" />
                                {new Date(event.start).toLocaleDateString()} {event.start.includes('T') && new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {event.type === 'task' && event.priority && (
                                <Badge variant={event.priority === 'high' ? 'destructive' : event.priority === 'medium' ? 'default' : 'secondary'} className="font-semibold px-3 py-1 rounded-full">
                                  {event.priority}
                                </Badge>
                              )}
                              {event.status && (
                                <Badge variant="outline" className="font-semibold px-3 py-1 rounded-full">{event.status}</Badge>
                              )}
                            </div>
                            {event.client && (
                              <div className="flex items-center gap-2 mt-3 text-sm text-slate-500 dark:text-slate-400">
                                <Users className="h-4 w-4" />
                                <span className="font-medium">
                                  {typeof event.client === 'string' 
                                    ? event.client 
                                    : (event.client && typeof event.client === 'object' 
                                      ? `${event.client.first_name || ''} ${event.client.last_name || ''}`.trim() || event.client.email || 'Client'
                                      : 'Client')
                                  }
                                </span>
                              </div>
                            )}
                            {event.case_title && (
                              <div className="flex items-center gap-2 mt-2 text-sm text-slate-500 dark:text-slate-400">
                                <FileText className="h-4 w-4" />
                                <span className="font-medium">{event.case_title}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {event.type === 'task' && event.status === 'done' && (
                            <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>
                          )}
                          {event.type === 'task' && event.status === 'in_progress' && (
                            <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-sm"></div>
                          )}
                          {event.type === 'task' && event.status === 'todo' && (
                            <div className="w-3 h-3 bg-gray-400 rounded-full shadow-sm"></div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <TaskCreateModal 
          ref={taskCreateRef} 
          onSuccess={() => {
            const api = calendarRef.current?.getApi();
            if (!api) return;
            loadEvents(api.view.currentStart, api.view.currentEnd);
          }} 
        />

        <TaskUpdateModal 
          ref={taskUpdateRef} 
          onSuccess={() => {
            const api = calendarRef.current?.getApi();
            if (!api) return;
            loadEvents(api.view.currentStart, api.view.currentEnd);
          }} 
        />

        {/* Appointment Dialog */}
        <ScheduleAppointmentDialog 
          ref={appointmentCreateRef}
          onSuccess={() => {
            const api = calendarRef.current?.getApi();
            if (api) {
              loadEvents(api.view.currentStart, api.view.currentEnd);
            }
          }}
        />
      </div>
    </div>
  );
};

export default CalendarPage;


