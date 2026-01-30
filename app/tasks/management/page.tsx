'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Calendar, Users, AlertCircle, Clock, Trash2, History, Flag, Edit, Factory, Grid3x3, Layers, Scissors, CheckCircle2, Building2 } from "lucide-react";

interface Task {
  id: string;
  department: string;
  task_description: string;
  deadline: string;
  responsible_person: string;
  status: string;
  priority: string;
  progress_percent: number;
  response_comment: string | null;
  failure_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ChangeHistory {
  id: string;
  task_id: string;
  changed_by: string;
  changed_at: string;
  field_name: string;
  old_value: string;
  new_value: string;
  comment: string;
}

export default function ManagementTasksPage() {
  const { user, isAdmin } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [viewingHistory, setViewingHistory] = useState<string | null>(null);
  const [taskHistory, setTaskHistory] = useState<ChangeHistory[]>([]);

  // Форма создания задачи
  const [newTask, setNewTask] = useState({
    department: 'Экструзия',
    task_description: '',
    deadline: '',
    responsible_person: '',
    priority: 'Средний',
  });

  // Форма редактирования задачи
  const [editTask, setEditTask] = useState({
    department: '',
    task_description: '',
    deadline: '',
    responsible_person: '',
    priority: '',
  });

  const departments = ['Экструзия', 'Ткачество', 'Ламинация', 'Стропы', 'Крой', 'Пошив', 'ОТК', 'Офис'];
  const statuses = ['Новая', 'В работе', 'Выполнена', 'Не выполнена'];
  const priorities = ['Высокий', 'Средний', 'Низкий'];

  // Получить минимальную дату (сегодня)
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks_from_management')
      .select('*')
      .order('priority', { ascending: false })
      .order('deadline', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const fetchTaskHistory = async (taskId: string) => {
    const { data, error } = await supabase
      .from('task_change_history')
      .select('*')
      .eq('task_id', taskId)
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
    } else {
      setTaskHistory(data || []);
      setViewingHistory(taskId);
    }
  };

  const logChange = async (taskId: string, fieldName: string, oldValue: any, newValue: any) => {
    if (oldValue === newValue) return;

    try {
      await supabase
        .from('task_change_history')
        .insert([{
          task_id: taskId,
          changed_by: user?.email || 'Руководство',
          field_name: fieldName,
          old_value: String(oldValue || ''),
          new_value: String(newValue || ''),
        }]);
    } catch (err) {
      console.error('Error logging change:', err);
    }
  };

  const handleStartEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTask({
      department: task.department,
      task_description: task.task_description,
      deadline: task.deadline,
      responsible_person: task.responsible_person,
      priority: task.priority,
    });
  };

  const handleCancelEditing = () => {
    setEditingTaskId(null);
  };

  const handleUpdateTask = async (task: Task) => {
    try {
      // Логируем изменения
      if (task.department !== editTask.department) {
        await logChange(task.id, 'department', task.department, editTask.department);
      }
      if (task.task_description !== editTask.task_description) {
        await logChange(task.id, 'task_description', task.task_description, editTask.task_description);
      }
      if (task.deadline !== editTask.deadline) {
        await logChange(task.id, 'deadline', task.deadline, editTask.deadline);
      }
      if (task.responsible_person !== editTask.responsible_person) {
        await logChange(task.id, 'responsible_person', task.responsible_person, editTask.responsible_person);
      }
      if (task.priority !== editTask.priority) {
        await logChange(task.id, 'priority', task.priority, editTask.priority);
      }

      const { error } = await supabase
        .from('tasks_from_management')
        .update({
          ...editTask,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (error) throw error;

      alert('Задача успешно обновлена');
      setEditingTaskId(null);
      fetchTasks();
    } catch (err: any) {
      console.error('Error updating task:', err);
      alert('Ошибка обновления: ' + err.message);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTask.task_description || !newTask.deadline || !newTask.responsible_person) {
      alert('Заполните все поля');
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks_from_management')
        .insert([{
          ...newTask,
          created_by: user?.email || 'Руководство',
          status: 'Новая',
          progress_percent: 0,
        }]);

      if (error) throw error;

      alert('Задача успешно создана');
      setShowCreateForm(false);
      setNewTask({
        department: 'Экструзия',
        task_description: '',
        deadline: '',
        responsible_person: '',
        priority: 'Средний',
      });
      fetchTasks();
    } catch (err: any) {
      console.error('Error creating task:', err);
      alert('Ошибка создания задачи: ' + err.message);
    }
  };

  const handleDeleteTask = async (id: string, description: string) => {
    if (!isAdmin) {
      alert('Только администраторы могут удалять задачи');
      return;
    }

    if (!confirm(`Удалить задачу "${description.substring(0, 50)}..."?\n\nЭто действие нельзя отменить!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks_from_management')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Задача успешно удалена');
      fetchTasks();
    } catch (err: any) {
      console.error('Error deleting task:', err);
      alert('Ошибка удаления: ' + err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Новая':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/50';
      case 'В работе':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50';
      case 'Выполнена':
        return 'bg-green-500/10 text-green-400 border-green-500/50';
      case 'Не выполнена':
        return 'bg-red-500/10 text-red-400 border-red-500/50';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Высокий':
        return 'bg-red-500/20 text-red-300 border-red-500';
      case 'Средний':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500';
      case 'Низкий':
        return 'bg-green-500/20 text-green-300 border-green-500';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/50';
    }
  };

  const getDepartmentColor = (department: string) => {
    const colors: { [key: string]: string } = {
      'Экструзия': 'bg-purple-500/10 text-purple-400 border-purple-500/50',
      'Ткачество': 'bg-blue-500/10 text-blue-400 border-blue-500/50',
      'Ламинация': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/50',
      'Стропы': 'bg-orange-500/10 text-orange-400 border-orange-500/50',
      'Крой': 'bg-pink-500/10 text-pink-400 border-pink-500/50',
      'Пошив': 'bg-rose-500/10 text-rose-400 border-rose-500/50',
      'ОТК': 'bg-red-500/10 text-red-400 border-red-500/50',
      'Офис': 'bg-slate-500/10 text-slate-400 border-slate-500/50',
    };
    return colors[department] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/50';
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date() && new Date(deadline).toDateString() !== new Date().toDateString();
  };

  const getFieldNameRu = (fieldName: string) => {
    const names: { [key: string]: string } = {
      'status': 'Статус',
      'progress_percent': 'Прогресс',
      'response_comment': 'Комментарий',
      'failure_reason': 'Причина невыполнения',
      'priority': 'Приоритет',
      'department': 'Цех',
      'task_description': 'Описание задачи',
      'deadline': 'Срок',
      'responsible_person': 'Ответственный',
    };
    return names[fieldName] || fieldName;
  };

  const filteredTasks = tasks.filter(task => {
    const matchesDepartment = filterDepartment === 'all' || task.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    return matchesDepartment && matchesStatus && matchesPriority;
  });

  // Компонент выбора приоритета кнопками
  const PrioritySelector = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange('Высокий')}
        className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-all ${
          value === 'Высокий'
            ? 'bg-red-500 border-red-500 text-white'
            : 'bg-red-500/10 border-red-500/50 text-red-300 hover:bg-red-500/20'
        }`}
      >
        <Flag size={16} className="inline mr-1" />
        Высокий
      </button>
      <button
        type="button"
        onClick={() => onChange('Средний')}
        className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-all ${
          value === 'Средний'
            ? 'bg-yellow-500 border-yellow-500 text-white'
            : 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/20'
        }`}
      >
        <Flag size={16} className="inline mr-1" />
        Средний
      </button>
      <button
        type="button"
        onClick={() => onChange('Низкий')}
        className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-all ${
          value === 'Низкий'
            ? 'bg-green-500 border-green-500 text-white'
            : 'bg-green-500/10 border-green-500/50 text-green-300 hover:bg-green-500/20'
        }`}
      >
        <Flag size={16} className="inline mr-1" />
        Низкий
      </button>
    </div>
  );

  // Компонент выбора цеха с иконками
  const getDepartmentIcon = (dept: string) => {
    switch (dept) {
      case 'Экструзия': return <Factory size={20} />;
      case 'Ткачество': return <Grid3x3 size={20} />;
      case 'Ламинация': return <Layers size={20} />;
      case 'Стропы': return <Scissors size={20} />;
      case 'Крой': return <Scissors size={20} />;
      case 'Пошив': return <Scissors size={20} />;
      case 'ОТК': return <CheckCircle2 size={20} />;
      case 'Офис': return <Building2 size={20} />;
      default: return <Factory size={20} />;
    }
  };

  const DepartmentSelector = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {departments.map((dept) => {
        const isSelected = value === dept;
        const colorClass = getDepartmentColor(dept);

        return (
          <button
            key={dept}
            type="button"
            onClick={() => onChange(dept)}
            className={`px-4 py-3 rounded-lg border-2 font-medium transition-all flex flex-col items-center gap-2 ${
              isSelected
                ? colorClass.replace('/10', '').replace('/50', '') + ' text-white'
                : colorClass + ' hover:opacity-80'
            }`}
          >
            {getDepartmentIcon(dept)}
            <span className="text-sm">{dept}</span>
          </button>
        );
      })}
    </div>
  );

  if (loading) return <div className="text-white p-8">Загрузка...</div>;

  return (
    <div className="page-container">
      {/* Заголовок */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon" className="text-black bg-white hover:bg-gray-200">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="h1-bold flex items-center gap-2">
              <Users size={32} className="text-blue-500" />
              Задачи от Руководства
            </h1>
            <p className="page-description">Управление задачами для цехов</p>
          </div>
        </div>

        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2"
        >
          <Plus size={18} /> Новая задача
        </Button>
      </div>

      {/* Форма создания задачи */}
      {showCreateForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Plus size={20} className="text-blue-500" />
            Создать новую задачу
          </h2>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Цех *</label>
              <DepartmentSelector
                value={newTask.department}
                onChange={(department) => setNewTask({ ...newTask, department })}
              />
            </div>

            <div className="max-w-md">
              <label className="block text-sm font-medium mb-2">Ответственный *</label>
              <input
                type="text"
                value={newTask.responsible_person}
                onChange={(e) => setNewTask({ ...newTask, responsible_person: e.target.value })}
                placeholder="ФИО ответственного"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Приоритет *</label>
              <PrioritySelector
                value={newTask.priority}
                onChange={(priority) => setNewTask({ ...newTask, priority })}
              />
            </div>

            <div className="max-w-xs">
              <label className="block text-sm font-medium mb-2">Срок исполнения *</label>
              <input
                type="date"
                value={newTask.deadline}
                onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                min={getTodayDate()}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Описание задачи *</label>
              <textarea
                value={newTask.task_description}
                onChange={(e) => setNewTask({ ...newTask, task_description: e.target.value })}
                placeholder="Подробное описание задачи..."
                rows={4}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Создать задачу
              </Button>
              <Button
                type="button"
                onClick={() => setShowCreateForm(false)}
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800"
              >
                Отмена
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Фильтры */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Цех</label>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все цеха</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Приоритет</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все приоритеты</option>
            {priorities.map(priority => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Статус</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все статусы</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 uppercase mb-1">Всего задач</div>
          <div className="text-2xl font-bold text-white">{filteredTasks.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 uppercase mb-1">Высокий приоритет</div>
          <div className="text-2xl font-bold text-red-400">
            {filteredTasks.filter(t => t.priority === 'Высокий').length}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 uppercase mb-1">В работе</div>
          <div className="text-2xl font-bold text-yellow-400">
            {filteredTasks.filter(t => t.status === 'В работе').length}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 uppercase mb-1">Выполнено</div>
          <div className="text-2xl font-bold text-green-400">
            {filteredTasks.filter(t => t.status === 'Выполнена').length}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 uppercase mb-1">Просрочено</div>
          <div className="text-2xl font-bold text-red-400">
            {filteredTasks.filter(t => isOverdue(t.deadline) && t.status !== 'Выполнена').length}
          </div>
        </div>
      </div>

      {/* Список задач */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
            Нет задач
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isEditing = editingTaskId === task.id;

            return (
              <div
                key={task.id}
                className={`bg-zinc-900 border rounded-xl p-6 transition-all ${
                  isEditing ? 'border-blue-500' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {!isEditing ? (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={`${getPriorityColor(task.priority)} border font-bold`}>
                            <Flag size={12} className="mr-1" />
                            {task.priority}
                          </Badge>
                          <Badge className={`${getDepartmentColor(task.department)} border`}>
                            {task.department}
                          </Badge>
                          <Badge className={`${getStatusColor(task.status)} border`}>
                            {task.status}
                          </Badge>
                          {isOverdue(task.deadline) && task.status !== 'Выполнена' && (
                            <Badge className="bg-red-500/10 text-red-400 border border-red-500/50">
                              <AlertCircle size={12} className="mr-1" />
                              Просрочено
                            </Badge>
                          )}
                        </div>
                        <p className="text-white text-lg font-medium mb-2">{task.task_description}</p>
                        <div className="flex items-center gap-4 text-sm text-zinc-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            {task.responsible_person}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            До {new Date(task.deadline).toLocaleDateString('ru-RU')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            Создано {new Date(task.created_at).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleStartEditing(task)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-950 rounded transition-colors"
                          title="Редактировать задачу"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => fetchTaskHistory(task.id)}
                          className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-950 rounded transition-colors"
                          title="История изменений"
                        >
                          <History size={16} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteTask(task.id, task.task_description)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950 rounded transition-colors"
                            title="Удалить задачу"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Прогресс */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <span className="text-zinc-400">Прогресс выполнения</span>
                        <span className="text-white font-bold">{task.progress_percent}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            task.progress_percent === 100
                              ? 'bg-green-500'
                              : task.progress_percent >= 50
                              ? 'bg-yellow-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${task.progress_percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Ответ от цеха */}
                    {task.response_comment && (
                      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 mb-2">
                        <p className="text-xs text-zinc-500 uppercase mb-1">Комментарий от цеха</p>
                        <p className="text-white">{task.response_comment}</p>
                      </div>
                    )}

                    {/* Причина невыполнения */}
                    {task.failure_reason && (
                      <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4">
                        <p className="text-xs text-red-500 uppercase mb-1">Причина невыполнения</p>
                        <p className="text-red-300">{task.failure_reason}</p>
                      </div>
                    )}
                  </>
                ) : (
                  /* Форма редактирования */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Edit size={20} className="text-blue-400" />
                        Редактирование задачи
                      </h3>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Цех</label>
                      <DepartmentSelector
                        value={editTask.department}
                        onChange={(department) => setEditTask({ ...editTask, department })}
                      />
                    </div>

                    <div className="max-w-md">
                      <label className="block text-sm font-medium mb-2">Ответственный</label>
                      <input
                        type="text"
                        value={editTask.responsible_person}
                        onChange={(e) => setEditTask({ ...editTask, responsible_person: e.target.value })}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Приоритет</label>
                      <PrioritySelector
                        value={editTask.priority}
                        onChange={(priority) => setEditTask({ ...editTask, priority })}
                      />
                    </div>

                    <div className="max-w-xs">
                      <label className="block text-sm font-medium mb-2">Срок исполнения</label>
                      <input
                        type="date"
                        value={editTask.deadline}
                        onChange={(e) => setEditTask({ ...editTask, deadline: e.target.value })}
                        min={getTodayDate()}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Описание задачи</label>
                      <textarea
                        value={editTask.task_description}
                        onChange={(e) => setEditTask({ ...editTask, task_description: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleUpdateTask(task)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Сохранить изменения
                      </Button>
                      <Button
                        onClick={handleCancelEditing}
                        variant="outline"
                        className="border-zinc-700 hover:bg-zinc-800"
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                )}

                {/* История изменений */}
                {viewingHistory === task.id && !isEditing && (
                  <div className="mt-4 bg-zinc-800/30 border border-zinc-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <History size={16} className="text-purple-400" />
                        История изменений
                      </h3>
                      <button
                        onClick={() => setViewingHistory(null)}
                        className="text-xs text-zinc-500 hover:text-white"
                      >
                        Закрыть
                      </button>
                    </div>
                    {taskHistory.length === 0 ? (
                      <p className="text-sm text-zinc-500">Нет изменений</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {taskHistory.map((change) => (
                          <div key={change.id} className="text-sm border-l-2 border-purple-500 pl-3 py-1">
                            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                              <span>{new Date(change.changed_at).toLocaleString('ru-RU')}</span>
                              <span>•</span>
                              <span>{change.changed_by}</span>
                            </div>
                            <p className="text-white">
                              <span className="text-purple-400 font-medium">{getFieldNameRu(change.field_name)}</span>:{' '}
                              <span className="line-through text-zinc-500">{change.old_value || '—'}</span>
                              {' → '}
                              <span className="text-green-400 font-medium">{change.new_value || '—'}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
