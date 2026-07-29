import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import AddTaskDialog from '../components/task/TaskCreateModal';
import TaskDialog from '../components/task/TaskUpdateModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Filter, Calendar, Clock, CheckSquare, Flag, Eye, Edit, Trash2, Users, AlertCircle, TrendingUp, Loader2, Sparkles, Target, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { devError } from '@/utils/devLog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { apiGetTasks, apiUpdateTask } from '@/services/task/api';
import { TaskPriority, TaskStatus } from '@/utils/constants';
import TaskCreateModal, { TaskCreateModalRef } from '@/components/task/TaskCreateModal';
import TaskDeleteModal, { TaskDeleteModalRef } from '@/components/task/TaskDeleteModal';


interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  assignee: string;
  client: string;
  estimatedHours: number;
}

const Tasks = () => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<API.Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<API.Task[]>([]);
  const [tasksIsLoading, setTasksIsLoading] = useState(false);

  const taskCreateModalRef = useRef<TaskCreateModalRef>(null);
  const taskDeleteModalRef = useRef<TaskDeleteModalRef>(null);

  const fetchTasks = async () => {
    setTasksIsLoading(true);
    await apiGetTasks().then((res) => {
      setTasks(res.data.results);
    })
      .finally(() => {
        setTasksIsLoading(false);
      });
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case TaskPriority.LOW: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case TaskPriority.MEDIUM: return 'bg-amber-50 text-amber-700 border-amber-200';
      case TaskPriority.HIGH: return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case TaskStatus.TODO: return 'bg-blue-50 text-blue-700 border-blue-200';
      case TaskStatus.IN_PROGRESS: return 'bg-amber-50 text-amber-700 border-amber-200';
      case TaskStatus.DONE: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelled': return 'bg-slate-50 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const todo = tasks.filter(t => t.status === 'todo').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const done = tasks.filter(t => t.status === 'done').length;
    const cancelled = tasks.filter(t => t.status === 'cancelled').length;
    const today = new Date().toISOString().split('T')[0];
    const overdue = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done').length;
    const highPriority = tasks.filter(t => t.priority === TaskPriority.HIGH && t.status !== 'done').length;

    return {
      total: tasks.length,
      todo,
      inProgress,
      done,
      cancelled,
      overdue,
      highPriority,
    };
  }, [tasks]);

  const handleView = (task: API.Task) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleEdit = (task: API.Task) => {
    navigate(`/dashboard/tasks/${task.id}/edit`);
  };

  const handleComplete = async (task: API.Task) => {
    try {

      await apiUpdateTask({
        ...task, status: 'done',
        assigned_to: task.assigned_to.id,
        client: task.client?.id ?? null,
      });


      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === task.id ? { ...t, status: 'done' } : t
        )
      );


      toast({
        title: "Task Completed",
        description: `"${task.title}" marked as completed`,
      });

    } catch (error) {
      devError("Failed to mark task as done", error);
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive",
      });
    }
  };


  const handleDelete = (task: API.Task) => {
    setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
    toast({
      title: "Task Deleted",
      description: `"${task.title}" has been permanently deleted`,
      variant: "destructive",
    });
  };

  const handleAddTask = () => {
    setIsAddTaskDialogOpen(true);
  };

  // Filter tasks based on status and search query
  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesSearch = searchQuery === '' ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())
    // task.client.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Modern Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl blur-lg opacity-50"></div>
                  <div className="relative p-4 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 rounded-2xl shadow-xl transform hover:scale-105 transition-transform duration-300">
                    <CheckSquare className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-extrabold bg-gradient-to-r from-gray-900 via-purple-800 to-purple-600 bg-clip-text text-transparent tracking-tight">
                    Tasks
                  </h1>
                  <p className="text-gray-600 font-medium mt-1 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    Manage your assignments and deadlines
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={taskCreateModalRef.current?.show}
                className="group relative bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 hover:from-purple-700 hover:via-purple-800 hover:to-purple-900 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <Plus className="h-4 w-4 relative z-10" />
                <span className="relative z-10">Add Task</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <Card className="group relative bg-white/90 backdrop-blur-md border border-purple-100/50 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total</p>
                  <p className="text-3xl font-extrabold text-gray-900">{stats.total}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative p-3 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl shadow-lg">
                    <CheckSquare className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative bg-white/90 backdrop-blur-md border border-blue-100/50 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">To Do</p>
                  <p className="text-3xl font-extrabold text-gray-900">{stats.todo}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative bg-white/90 backdrop-blur-md border border-amber-100/50 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">In Progress</p>
                  <p className="text-3xl font-extrabold text-gray-900">{stats.inProgress}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative bg-white/90 backdrop-blur-md border border-emerald-100/50 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Done</p>
                  <p className="text-3xl font-extrabold text-gray-900">{stats.done}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                    <CheckSquare className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative bg-white/90 backdrop-blur-md border border-red-100/50 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden hover:-translate-y-1 col-span-2 md:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Overdue</p>
                  <p className="text-3xl font-extrabold text-gray-900">{stats.overdue}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-600 rounded-xl blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative bg-white/90 backdrop-blur-md border border-orange-100/50 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden hover:-translate-y-1 col-span-2 md:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">High Priority</p>
                  <p className="text-3xl font-extrabold text-gray-900">{stats.highPriority}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Filters */}
        <Card className="bg-white/90 backdrop-blur-md border border-purple-100/50 shadow-xl rounded-2xl overflow-hidden mb-6 hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center">
              <div className="flex items-center gap-3 text-sm font-bold text-gray-800">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-200 rounded-xl blur-sm opacity-50"></div>
                  <div className="relative p-2.5 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                    <Filter className="w-4 h-4 text-purple-700" />
                  </div>
                </div>
                <span className="uppercase tracking-wider">Filters</span>
              </div>
              <div className="flex flex-wrap gap-4 items-center flex-1">
                <div className="relative flex-1 min-w-[250px]">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
                  <Input
                    type="text"
                    placeholder="Search tasks by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white/80 border-gray-200 rounded-xl shadow-sm hover:shadow-md focus:shadow-lg focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition-all duration-200"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[200px] bg-white/80 border-gray-200 rounded-xl shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200 font-medium">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-2xl">
                    <SelectItem value="all" className="font-medium">All Tasks ({tasks.length})</SelectItem>
                    <SelectItem value="todo" className="font-medium">To Do ({stats.todo})</SelectItem>
                    <SelectItem value="in_progress" className="font-medium">In Progress ({stats.inProgress})</SelectItem>
                    <SelectItem value="done" className="font-medium">Done ({stats.done})</SelectItem>
                    <SelectItem value="cancelled" className="font-medium">Cancelled ({stats.cancelled})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced No tasks message */}
        {filteredTasks.length === 0 && !tasksIsLoading && (
          <Card className="bg-white/90 backdrop-blur-md border border-purple-100/50 shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="p-16 text-center">
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-200 to-purple-300 rounded-3xl blur-2xl opacity-50"></div>
                <div className="relative p-8 bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl">
                  <CheckSquare className="h-20 w-20 text-purple-400" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-3">No tasks found</h3>
              <p className="text-gray-600 font-medium mb-8 text-lg">
                {searchQuery || filterStatus !== 'all'
                  ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
                  : 'Get started by creating your first task and stay organized!'}
              </p>
              {!searchQuery && filterStatus === 'all' && (
                <Button
                  onClick={taskCreateModalRef.current?.show}
                  className="group relative bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 hover:from-purple-700 hover:via-purple-800 hover:to-purple-900 text-white shadow-xl hover:shadow-2xl transition-all duration-300 px-8 py-4 rounded-xl font-semibold text-base overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <Plus className="h-5 w-5 mr-2 relative z-10" />
                  <span className="relative z-10">Add Your First Task</span>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Enhanced Loading State */}
        {tasksIsLoading && (
          <Card className="bg-white/90 backdrop-blur-md border border-purple-100/50 shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="p-16 text-center">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-purple-200 rounded-full blur-xl opacity-30 animate-pulse"></div>
                <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto relative z-10" />
              </div>
              <p className="text-gray-700 font-semibold text-lg">Loading tasks...</p>
              <p className="text-gray-500 text-sm mt-2">Please wait while we fetch your tasks</p>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Tasks Grid */}
        {!tasksIsLoading && filteredTasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => {
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
              return (
                <Card
                  key={task.id}
                  className="group relative bg-white/90 backdrop-blur-md border border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer rounded-2xl overflow-hidden hover:-translate-y-2"
                >
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50/0 via-purple-50/0 to-purple-50/0 group-hover:from-purple-50/30 group-hover:via-purple-50/20 group-hover:to-purple-50/10 transition-all duration-500 pointer-events-none"></div>
                  
                  {/* Priority indicator bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    task.priority === TaskPriority.HIGH ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    task.priority === TaskPriority.MEDIUM ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                    'bg-gradient-to-r from-emerald-500 to-emerald-600'
                  }`}></div>

                  <CardContent className="p-6 relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-purple-800 transition-colors duration-300 line-clamp-2 mb-2">
                          {task.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{task.description}</p>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-5">
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 ${getPriorityColor(task.priority)} shadow-sm`}
                      >
                        <Flag className="h-3 w-3 mr-1" />
                        {task.priority}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 ${getStatusColor(task.status)} shadow-sm`}
                      >
                        {task.status.replace('_', ' ')}
                      </Badge>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs font-bold px-3 py-1.5 rounded-full border-2 shadow-sm animate-pulse">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Overdue
                        </Badge>
                      )}
                    </div>

                    {/* Task Details */}
                    <div className="space-y-3 mb-5 pb-5 border-b border-gray-200/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-sm text-gray-700">
                          <div className="p-1.5 bg-purple-100 rounded-lg">
                            <Calendar className="h-4 w-4 text-purple-700" />
                          </div>
                          <span className="font-semibold">
                            {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            }) : 'No due date'}
                          </span>
                        </div>
                        {task.estimated_hours && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <div className="p-1.5 bg-purple-100 rounded-lg">
                              <Clock className="h-4 w-4 text-purple-700" />
                            </div>
                            <span className="font-semibold">{task.estimated_hours}h</span>
                          </div>
                        )}
                      </div>
                      {(task.client_details || task.assigned_to_details) && (
                        <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
                          {task.client_details && (
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                              <Users className="h-3.5 w-3.5 text-gray-500" />
                              <span className="truncate max-w-[140px] font-medium">{task.client_details.email}</span>
                            </div>
                          )}
                          {task.assigned_to_details && (
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                              <Users className="h-3.5 w-3.5 text-gray-500" />
                              <span className="truncate max-w-[140px] font-medium">{task.assigned_to_details.email}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(task);
                        }}
                        className="flex-1 text-xs font-semibold rounded-xl border-gray-300 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        View
                      </Button>
                      {task.status !== 'done' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleComplete(task);
                          }}
                          className="text-xs font-semibold rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-all duration-200 shadow-sm hover:shadow-md px-4"
                        >
                          <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                          Done
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(task);
                        }}
                        className="text-xs font-semibold rounded-xl border-gray-300 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 shadow-sm hover:shadow-md px-3"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          taskDeleteModalRef.current?.show(task);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200 px-3 shadow-sm hover:shadow-md"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <TaskCreateModal
        ref={taskCreateModalRef}
        onSuccess={fetchTasks}
      />
      {/* Add Task Dialog */}
      <AddTaskDialog
        open={isAddTaskDialogOpen}
        onOpenChange={setIsAddTaskDialogOpen}
      />

      {/* Task Details Dialog */}
      <TaskDialog
        task={selectedTask}
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        onEdit={handleEdit}
        onComplete={handleComplete}
      />
      <TaskDeleteModal
        ref={taskDeleteModalRef}
        onSuccess={fetchTasks}
      />
    </div>
  );
};

export default Tasks;