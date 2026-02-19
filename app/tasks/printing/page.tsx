'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Users, AlertCircle, MessageSquare, TrendingUp, History, Flag } from "lucide-react";

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

export default function PrintingTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [viewingHistory, setViewingHistory] = useState<string | null>(null);
  const [taskHistory, setTaskHistory] = useState<ChangeHistory[]>([]);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    progress_percent: 0,
    response_comment: '',
    failure_reason: '',
  });

  const statuses = ['Новая', 'В работе', 'Выполнена', 'Не выполнена'];

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks_from_management')
      .select('*')
      .eq('department', 'Печать')
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
    try {
      await supabase
        .from('task_change_history')
        .insert([{
          task_id: taskId,
          changed_by: user?.email || 'Цех Печати',
          field_name: fieldName,
          old_value: String(oldValue || ''),
          new_value: String(newValue || ''),
        }]);
    } catch (err) {
      console.error('Error logging change:', err);
    }
  };

  const handleStartEditing = (task: Task) => {
    setEditingTask(task.id);
    setUpdateForm({
      status: task.status,
      progress_percent: task.progress_percent,
      response_comment: task.response_comment || '',
      failure_reason: task.failure_reason || '',
    });
  };

  const handleCancelEditing = () => {
    setEditingTask(null);
    setUpdateForm({
      status: '',
      progress_percent: 0,
      response_comment: '',
      failure_reason: '',
    });
  };

  const handleUpdateTask = async (task: Task) => {
    try {
      const updateData: any = {
        status: updateForm.status,
        progress_percent: updateForm.progress_percent,
        response_comment: updateForm.response_comment || null,
        updated_at: new Date().toISOString(),
      };

      // Добавляем причину невыполнения только если статус "Не выполнена"
      if (updateForm.status === 'Не выполнена') {
        updateData.failure_reason = updateForm.failure_reason || null;
      } else {
        updateData.failure_reason = null;
      }

      // Логируем изменения
      if (task.status !== updateForm.status) {
        await logChange(task.id, 'status', task.status, updateForm.status);
      }
      if (task.progress_percent !== updateForm.progress_percent) {
        await logChange(task.id, 'progress_percent', task.progress_percent, updateForm.progress_percent);
      }
      if (task.response_comment !== updateForm.response_comment) {
        await logChange(task.id, 'response_comment', task.response_comment, updateForm.response_comment);
      }
      if (updateForm.status === 'Не выполнена' && task.failure_reason !== updateForm.failure_reason) {
        await logChange(task.id, 'failure_reason', task.failure_reason, updateForm.failure_reason);
      }

      const { error } = await supabase
        .from('tasks_from_management')
        .update(updateData)
        .eq('id', task.id);

      if (error) throw error;

      alert('Задача успешно обновлена');
      setEditingTask(null);
      fetchTasks();
    } catch (err: any) {
      console.error('Error updating task:', err);
      alert('Ошибка обновления: ' + err.message);
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

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date() && new Date(deadline).toDateString() !== new Date().toDateString();
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getFieldNameRu = (fieldName: string) => {
    const names: { [key: string]: string } = {
      'status': 'Статус',
      'progress_percent': 'Прогресс',
      'response_comment': 'Комментарий',
      'failure_reason': 'Причина невыполнения',
      'priority': 'Приоритет',
    };
    return names[fieldName] || fieldName;
  };

  if (loading) return <div className="text-white p-8">Загрузка...</div>;

  return (
    <div className="page-container">
      {/* Заголовок */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link href="/production/printing">
            <Button variant="outline" size="icon" className="text-black bg-white hover:bg-gray-200">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="h1-bold">
              <div className="bg-purple-600 p-2 rounded-lg inline-block">
                <MessageSquare size={24} className="text-white" />
              </div>
              {' '}Задачи цеха Печати
            </h1>
            <p className="page-description">Задачи от руководства для цеха печати</p>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 uppercase mb-1">Всего задач</div>
          <div className="text-2xl font-bold text-white">{tasks.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 uppercase mb-1">Высокий приоритет</div>
          <div className="text-2xl font-bold text-red-400">
            {tasks.filter(t => t.priority === 'Высокий').length}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 uppercase mb-1">Новые</div>
          <div className="text-2xl font-bold text-blue-400">
            {tasks.filter(t => t.status === 'Новая').length}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 uppercase mb-1">В работе</div>
          <div className="text-2xl font-bold text-yellow-400">
            {tasks.filter(t => t.status === 'В работе').length}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 uppercase mb-1">Выполнено</div>
          <div className="text-2xl font-bold text-green-400">
            {tasks.filter(t => t.status === 'Выполнена').length}
          </div>
        </div>
      </div>

      {/* Список задач */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
            Нет задач для цеха печати
          </div>
        ) : (
          tasks.map((task) => {
            const isEditing = editingTask === task.id;
            const daysLeft = getDaysUntilDeadline(task.deadline);

            return (
              <div
                key={task.id}
                className={`bg-zinc-900 border rounded-xl p-6 transition-all ${
                  isEditing ? 'border-purple-500' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={`${getPriorityColor(task.priority)} border font-bold`}>
                        <Flag size={12} className="mr-1" />
                        {task.priority}
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
                      {!isOverdue(task.deadline) && daysLeft <= 3 && task.status !== 'Выполнена' && (
                        <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/50">
                          <AlertCircle size={12} className="mr-1" />
                          {daysLeft === 0 ? 'Сегодня' : `Осталось ${daysLeft} дн.`}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-white text-lg font-medium mb-3">{task.task_description}</h3>
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        Ответственный: {task.responsible_person}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        Срок: {new Date(task.deadline).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => fetchTaskHistory(task.id)}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-950 rounded transition-colors ml-4"
                    title="История изменений"
                  >
                    <History size={16} />
                  </button>
                </div>

                {/* Прогресс */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span className="text-zinc-400">Прогресс выполнения</span>
                    <span className="text-white font-bold">{isEditing ? updateForm.progress_percent : task.progress_percent}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        (isEditing ? updateForm.progress_percent : task.progress_percent) === 100
                          ? 'bg-green-500'
                          : (isEditing ? updateForm.progress_percent : task.progress_percent) >= 50
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${isEditing ? updateForm.progress_percent : task.progress_percent}%` }}
                    />
                  </div>
                </div>

                {!isEditing ? (
                  <>
                    {/* Текущий комментарий */}
                    {task.response_comment && (
                      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 mb-2">
                        <p className="text-xs text-zinc-500 uppercase mb-1">Ваш комментарий</p>
                        <p className="text-white">{task.response_comment}</p>
                      </div>
                    )}

                    {/* Причина невыполнения */}
                    {task.failure_reason && (
                      <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4 mb-4">
                        <p className="text-xs text-red-500 uppercase mb-1">Причина невыполнения</p>
                        <p className="text-red-300">{task.failure_reason}</p>
                      </div>
                    )}

                    {/* Кнопка обновления */}
                    <Button
                      onClick={() => handleStartEditing(task)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2"
                    >
                      <TrendingUp size={16} />
                      Обновить статус
                    </Button>
                  </>
                ) : (
                  /* Форма обновления */
                  <div className="space-y-4 bg-zinc-800/30 border border-purple-500/30 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Статус</label>
                        <select
                          value={updateForm.status}
                          onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          {statuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Прогресс (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={updateForm.progress_percent}
                          onChange={(e) => setUpdateForm({ ...updateForm, progress_percent: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Комментарий</label>
                      <textarea
                        value={updateForm.response_comment}
                        onChange={(e) => setUpdateForm({ ...updateForm, response_comment: e.target.value })}
                        placeholder="Комментарий о ходе выполнения..."
                        rows={3}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    {updateForm.status === 'Не выполнена' && (
                      <div>
                        <label className="block text-sm font-medium mb-2 text-red-400">Причина невыполнения</label>
                        <textarea
                          value={updateForm.failure_reason}
                          onChange={(e) => setUpdateForm({ ...updateForm, failure_reason: e.target.value })}
                          placeholder="Укажите причину, по которой задача не может быть выполнена..."
                          rows={3}
                          className="w-full px-4 py-2 bg-zinc-800 border border-red-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleUpdateTask(task)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                      >
                        Сохранить
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
                {viewingHistory === task.id && (
                  <div className="mt-4 bg-zinc-800/30 border border-zinc-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <History size={16} className="text-blue-400" />
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
                      <div className="space-y-2">
                        {taskHistory.map((change) => (
                          <div key={change.id} className="text-sm border-l-2 border-purple-500 pl-3 py-1">
                            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                              <span>{new Date(change.changed_at).toLocaleString('ru-RU')}</span>
                              <span>•</span>
                              <span>{change.changed_by}</span>
                            </div>
                            <p className="text-white">
                              <span className="text-purple-400">{getFieldNameRu(change.field_name)}</span>:{' '}
                              <span className="line-through text-zinc-500">{change.old_value || '—'}</span>
                              {' → '}
                              <span className="text-green-400">{change.new_value || '—'}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Информация о задаче */}
                <div className="mt-4 pt-4 border-t border-zinc-800 text-xs text-zinc-500">
                  <div className="flex justify-between">
                    <span>Создано: {new Date(task.created_at).toLocaleString('ru-RU')}</span>
                    <span>Обновлено: {new Date(task.updated_at).toLocaleString('ru-RU')}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
