'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { Users, UserPlus, Edit, X, Trash2, Briefcase, UmbrellaIcon, HeartPulse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';

interface Employee {
  id: string;
  full_name: string;
  role: string;
  department?: string;
  birth_date?: string;
  is_active: boolean;
  work_status?: string;
  created_at?: string;
}

interface RoleOption {
  value: string;
  label: string;
}

interface DepartmentPersonnelProps {
  department: string;
  departmentName: string;
  roles: RoleOption[];
  backLink: string;
  bgColor?: string;
}

export default function DepartmentPersonnel({
  department,
  departmentName,
  roles,
  backLink,
  bgColor = 'bg-blue-600'
}: DepartmentPersonnelProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    role: roles[0]?.value || '',
    birth_date: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('department', department)
      .order('full_name');

    if (data) setEmployees(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!formData.full_name || !formData.role) {
      return alert('Введите ФИО и выберите должность');
    }

    const { error } = await supabase.from('employees').insert([{
      full_name: formData.full_name,
      role: formData.role,
      department: department,
      birth_date: formData.birth_date || null,
      is_active: true,
      work_status: 'active'
    }]);

    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      setIsDialogOpen(false);
      setFormData({ full_name: '', role: roles[0]?.value || '', birth_date: '' });
      fetchEmployees();
    }
  };

  const handleUpdateRole = async (id: string, newRole: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ role: newRole })
      .eq('id', id);

    if (error) alert('Ошибка: ' + error.message);
    else fetchEmployees();
  };

  const handleSetStatus = async (id: string, status: 'active' | 'vacation' | 'sick_leave') => {
    const { error } = await supabase
      .from('employees')
      .update({ work_status: status, is_active: true })
      .eq('id', id);

    if (error) alert('Ошибка: ' + error.message);
    else fetchEmployees();
  };

  const handleDismiss = async (id: string, name: string) => {
    if (!confirm(`Уволить сотрудника "${name}"?`)) return;

    const { error } = await supabase
      .from('employees')
      .update({ is_active: false, work_status: null })
      .eq('id', id);

    if (error) alert('Ошибка: ' + error.message);
    else fetchEmployees();
  };

  const handleRestore = async (id: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ is_active: true, work_status: 'active' })
      .eq('id', id);

    if (error) alert('Ошибка: ' + error.message);
    else fetchEmployees();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`⚠️ УДАЛИТЬ сотрудника "${name}" из базы?\n\nЭто действие необратимо!`)) return;

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) alert('Ошибка: ' + error.message);
    else {
      alert('✅ Сотрудник удалён');
      fetchEmployees();
    }
  };

  const getStatusBadge = (emp: Employee) => {
    if (!emp.is_active) {
      return <Badge variant="outline" className="text-red-400 border-red-700 bg-red-900/10 text-xs">Уволен</Badge>;
    }

    switch (emp.work_status) {
      case 'vacation':
        return <Badge variant="outline" className="text-blue-400 border-blue-700 bg-blue-900/10 text-xs">В отпуске</Badge>;
      case 'sick_leave':
        return <Badge variant="outline" className="text-yellow-400 border-yellow-700 bg-yellow-900/10 text-xs">На больничном</Badge>;
      default:
        return <Badge variant="outline" className="text-green-400 border-green-700 bg-green-900/10 text-xs">Активен</Badge>;
    }
  };

  const getRoleLabel = (role: string) => {
    return roles.find(r => r.value === role)?.label || role;
  };

  const activeEmployees = employees.filter(e => e.is_active);
  const dismissedEmployees = employees.filter(e => !e.is_active);

  return (
    <div className="page-container max-w-[100vw] overflow-x-hidden p-3 md:p-6">
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2">
            <div className={`${bgColor} p-1.5 md:p-2 rounded-lg`}>
              <Users size={18} className="text-white md:hidden" />
              <Users size={24} className="text-white hidden md:block" />
            </div>
            <span className="hidden sm:inline">Персонал: {departmentName}</span>
            <span className="sm:hidden">Персонал</span>
          </h1>
          <div className="flex gap-2">
            <Link href={backLink}>
              <Button variant="outline" className="text-xs md:text-sm">
                Назад
              </Button>
            </Link>
            <Button
              onClick={() => { setFormData({ full_name: '', role: roles[0]?.value || '', birth_date: '' }); setIsDialogOpen(true); }}
              className="bg-green-600 hover:bg-green-700 text-white font-medium text-xs md:text-sm flex items-center gap-2"
            >
              <UserPlus size={16} />
              <span className="hidden sm:inline">Добавить</span>
              <span className="sm:hidden">+</span>
            </Button>
          </div>
        </div>
        <p className="text-xs md:text-sm text-zinc-400">Управление сотрудниками цеха</p>
      </div>

      {loading ? (
        <div className="text-zinc-500">Загрузка...</div>
      ) : (
        <>
          {/* Активные сотрудники */}
          <div className="mb-6">
            <h2 className="text-base md:text-lg font-bold mb-3 flex items-center gap-2">
              <Briefcase size={18} className="text-green-500" />
              Активные ({activeEmployees.length})
            </h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-800">
                  <thead className="bg-zinc-950">
                    <tr>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-bold text-zinc-500 uppercase">ФИО</th>
                      {roles.length > 1 && (
                        <th className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-bold text-zinc-500 uppercase hidden sm:table-cell">Роль</th>
                      )}
                      <th className="px-2 md:px-4 py-2 md:py-3 text-center text-[10px] md:text-xs font-bold text-zinc-500 uppercase">Статус</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-center text-[10px] md:text-xs font-bold text-zinc-500 uppercase">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {activeEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={roles.length > 1 ? 4 : 3} className="text-center py-8 text-zinc-500 text-xs md:text-sm">
                          Нет активных сотрудников
                        </td>
                      </tr>
                    ) : (
                      activeEmployees.map(emp => (
                        <tr key={emp.id} className="hover:bg-zinc-800/50 transition-colors">
                          <td className="px-2 md:px-4 py-2 md:py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs md:text-sm text-zinc-400">
                                {emp.full_name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-white font-medium text-xs md:text-sm">{emp.full_name}</div>
                                {roles.length > 1 && (
                                  <div className="sm:hidden text-[10px] text-zinc-500">{getRoleLabel(emp.role)}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          {roles.length > 1 && (
                            <td className="px-2 md:px-4 py-2 md:py-3 hidden sm:table-cell">
                              {editingId === emp.id ? (
                                <Select
                                  value={emp.role}
                                  onValueChange={(v) => handleUpdateRole(emp.id, v)}
                                >
                                  <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white w-36 md:w-48 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {roles.map(role => (
                                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-blue-400 border-blue-700 bg-blue-900/10 text-[10px] md:text-xs">
                                    {getRoleLabel(emp.role)}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingId(editingId === emp.id ? null : emp.id)}
                                    className="h-5 w-5 p-0 text-zinc-500 hover:text-white"
                                  >
                                    <Edit size={10} />
                                  </Button>
                                </div>
                              )}
                            </td>
                          )}
                          <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                            {getStatusBadge(emp)}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSetStatus(emp.id, 'active')}
                                className="h-6 md:h-7 px-1 md:px-2 text-green-400 hover:text-green-300 hover:bg-green-950"
                                title="Активен"
                                disabled={emp.work_status === 'active'}
                              >
                                <Briefcase size={12} className="md:hidden" />
                                <Briefcase size={14} className="hidden md:block" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSetStatus(emp.id, 'vacation')}
                                className="h-6 md:h-7 px-1 md:px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-950"
                                title="В отпуск"
                                disabled={emp.work_status === 'vacation'}
                              >
                                <UmbrellaIcon size={12} className="md:hidden" />
                                <UmbrellaIcon size={14} className="hidden md:block" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSetStatus(emp.id, 'sick_leave')}
                                className="h-6 md:h-7 px-1 md:px-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-950"
                                title="На больничный"
                                disabled={emp.work_status === 'sick_leave'}
                              >
                                <HeartPulse size={12} className="md:hidden" />
                                <HeartPulse size={14} className="hidden md:block" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDismiss(emp.id, emp.full_name)}
                                className="h-6 md:h-7 px-1 md:px-2 text-red-400 hover:text-red-300 hover:bg-red-950"
                                title="Уволить"
                              >
                                <X size={12} className="md:hidden" />
                                <X size={14} className="hidden md:block" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Уволенные сотрудники */}
          {dismissedEmployees.length > 0 && (
            <div>
              <h2 className="text-base md:text-lg font-bold mb-3 flex items-center gap-2 text-zinc-500">
                <X size={18} />
                Уволенные ({dismissedEmployees.length})
              </h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden opacity-60">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-800">
                    <thead className="bg-zinc-950">
                      <tr>
                        <th className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-bold text-zinc-500 uppercase">ФИО</th>
                        <th className="px-2 md:px-4 py-2 md:py-3 text-center text-[10px] md:text-xs font-bold text-zinc-500 uppercase">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {dismissedEmployees.map(emp => (
                        <tr key={emp.id} className="hover:bg-zinc-800/50 transition-colors">
                          <td className="px-2 md:px-4 py-2 md:py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs md:text-sm text-zinc-600">
                                {emp.full_name.charAt(0)}
                              </div>
                              <span className="text-zinc-400 font-medium text-xs md:text-sm">{emp.full_name}</span>
                            </div>
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleRestore(emp.id)}
                                className="bg-green-600 hover:bg-green-700 h-6 md:h-7 text-[10px] md:text-xs px-2"
                              >
                                Восстановить
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(emp.id, emp.full_name)}
                                className="h-6 md:h-7 text-red-400 hover:text-red-300 hover:bg-red-950"
                                title="Удалить из базы"
                              >
                                <Trash2 size={12} className="md:hidden" />
                                <Trash2 size={14} className="hidden md:block" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Диалог добавления сотрудника */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800 max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Новый сотрудник</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs md:text-sm text-zinc-400">ФИО *</label>
              <Input
                value={formData.full_name}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
                placeholder="Иванов Иван Иванович"
                className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm"
              />
            </div>
            {roles.length > 1 && (
              <div>
                <label className="text-xs md:text-sm text-zinc-400">Должность *</label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs md:text-sm text-zinc-400">Дата рождения</label>
              <Input
                type="date"
                value={formData.birth_date}
                onChange={e => setFormData({...formData, birth_date: e.target.value})}
                className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm"
              />
            </div>
            <Button
              onClick={handleAdd}
              className="w-full bg-green-600 hover:bg-green-700 font-medium text-sm"
            >
              Добавить сотрудника
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
