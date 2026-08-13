import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Calendar, User, Building, Flag, Clock, UserCheck, CircleDot, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiGetTask, apiUpdateTask } from '@/services/task/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import ServerSelect from '@/components/common/ServerSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskPriority, TaskStatus } from '@/utils/constants';
import { isAxiosError } from 'axios';
import { getRemoteFieldsValidation } from '@/utils/functions';








const EditTask = () => {
  const [activeTab, setActiveTab] = useState('tasks');
  const { toast } = useToast();


  const params = useParams();
  const navigate = useNavigate();
  const taskId = parseInt(params.id as string);
  const [loading, setIsLoading] = useState(false);


  const schema = yup.object({
    title: yup.string().required('Title is required'),
    description: yup.string().required('Description is required'),
    priority: yup.string().required('Priority is required'),
    status: yup.string().required('Status is required'),
    due_date: yup.string().required('Due date is required'),
    estimated_hours: yup.string().optional(),
    assigned_to: yup.string().optional(),
    client: yup.string().optional(),
  });


  const mainForm = useForm<API.TaskUpdateForm>({
    resolver: yupResolver(schema) as unknown as Resolver<API.TaskUpdateForm>
  });




  useEffect(() => {
    if (taskId) {
      apiGetTask(taskId).then((res) => {
        mainForm.reset({
          id: res.data.id,
          title: res.data.title,
          description: res.data.description,
          priority: res.data.priority,
          status: res.data.status,
          due_date: res.data.due_date,
          estimated_hours: res.data.estimated_hours,
          assigned_to: res.data.assigned_to ? res.data.assigned_to.id : null,
          client: res.data.client ? res.data.client.id : null
        });
      })
        .catch((error) => {
          toast({
            title: "Task not found",
            description: "The requested task could not be found.",
            variant: "destructive",
          });
          navigate(-1);
        })
    }
  }, [taskId, navigate, toast]);



  const { handleSubmit } = mainForm;

  const handleCancel = () => {
    navigate('/dashboard/calendar');
  };

  const handleSubmitForm = async (data: API.TaskUpdateForm) => {
    setIsLoading(true);
    await apiUpdateTask({
      ...data,
      id: taskId,
    })
      .then((res) => {
        toast({
          title: "Task updated successfully",
          description: "The task has been updated successfully.",
          variant: "default",
        });
        navigate('/dashboard/calendar');
      })
      .catch((err) => {
        if (isAxiosError(err)) {
          const remoteValidation = getRemoteFieldsValidation(err);
          Object.keys(remoteValidation).forEach((key) => {
            mainForm.setError(key as keyof API.TaskUpdateForm, { message: remoteValidation[key] });
          });
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };


  return (
    <div className="max-w-4xl mx-auto">
            {/* Header Section */}
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Back to Tasks
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Edit Task</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Modify task details and settings</p>
              </div>
            </div>

            {/* Edit Form */}
            <div className="bg-white dark:bg-slate-950 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <form className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Flag size={20} />
                    Basic Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="title">Task Title *</Label>
                      <Input
                        id="title"
                        {...mainForm.register('title')}
                        placeholder="Enter task title"
                        className="mt-1"
                        required
                      /> {
                        mainForm.formState.errors.title && (
                          <p className="text-red-500 text-xs p-1 pb-0">{mainForm.formState.errors.title.message}</p>
                        )
                      }
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        {...mainForm.register('description')}
                        placeholder="Enter task description"
                        className="mt-1 min-h-[100px]"
                        rows={4}
                      /> {
                        mainForm.formState.errors.description && (
                          <p className="text-red-500 text-xs p-1 pb-0">{mainForm.formState.errors.description.message}</p>
                        )
                      }
                    </div>
                  </div>
                </div>

                {/* Task Details */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar size={20} />
                    Task Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="">
                      <label className="text-sm font-medium flex items-center gap-1">
                        <CircleDot className="w-2 h-2 text-slate-700 dark:text-slate-300" />
                        <span>Status </span>
                      </label>
                      <Select value={mainForm.watch('status')} onValueChange={(val: API.TaskStatus) => mainForm.setValue('status', val)} >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                        <SelectContent>
                          {
                            TaskStatus.options.map((status, index) => (
                              <SelectItem key={index} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                      {
                        mainForm.formState.errors.status && (
                          <p className="text-red-500 text-xs p-1 pb-0">{mainForm.formState.errors.status.message}</p>
                        )
                      }
                    </div>

                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={mainForm.watch('priority')} onValueChange={(val: API.TaskPriority) => mainForm.setValue('priority', val)}  >
                        <SelectTrigger >
                          <SelectValue placeholder="Select priority " />
                        </SelectTrigger>
                        <SelectContent>
                          {
                            TaskPriority.options.map((priority, index) => (
                              <SelectItem key={index} value={priority.value}>
                                {priority.label}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        {...mainForm.register('due_date')}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="estimatedHours">Estimated Hours</Label>
                      <Input
                        id="estimatedHours"
                        type="number"
                        min="0.5"
                        step="0.5"
                        {...mainForm.register('estimated_hours')}
                        placeholder="e.g., 2.5"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Assignment */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <User size={20} />
                    Assignment
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="">
                      <label className="text-sm font-medium flex items-center gap-1">
                        <UserCheck className="w-4 h-4  text-slate-700 dark:text-slate-300" />
                        <span>Assigned To</span>
                      </label>
                      <ServerSelect
                        link='/cabinets/members/select_list'
                        value={mainForm.watch('assigned_to')}
                        onChange={(val) => mainForm.setValue('assigned_to', val)}
                        labelKey={'email'}
                        cleanable
                         className="mt-1"
                      />
                      {
                        mainForm.formState.errors.assigned_to && (
                          <p className="text-red-500 text-xs p-1 pb-0">{mainForm.formState.errors.assigned_to.message}</p>
                        )
                      }

                    </div>

                    <div>
                      <Label htmlFor="client">Client</Label>
                      <Input
                        id="client"
                        {...mainForm.register('client')}
                        placeholder="Enter client name"
                        className=""

                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 border-t pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit(handleSubmitForm)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
  );
};

export default EditTask;