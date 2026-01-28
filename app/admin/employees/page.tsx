'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { Users, UserPlus, Cake } from "lucide-react";
import EmployeesDataTable, { Employee } from './EmployeesDataTable';

// Справочник ролей
const DEFAULT_ROLES = [
  { value: 'admin', label: 'Администратор' },
  { value: 'manager_warehouse', label: 'Зав. Складом' },
  { value: 'operator_extruder', label: 'Оператор Экструзии' },
  { value: 'operator_winder', label: 'Намотчик (Экструзия)' },
  { value: 'operator_weaver', label: 'Ткач' },
  { value: 'operator_lamination', label: 'Оператор Ламинации' },
  { value: 'operator_straps', label: 'Оператор Строп' },
  { value: 'operator_cutting', label: 'Оператор Резки' },
  { value: 'operator_sewing', label: 'Швея' },
];

// Справочник цехов
const DEPARTMENTS = [
  { value: 'extrusion', label: 'Экструзия' },
  { value: 'weaving', label: 'Ткачество' },
  { value: 'lamination', label: 'Ламинация' },
  { value: 'straps', label: 'Стропы' },
  { value: 'cutting', label: 'Крой' },
  { value: 'sewing', label: 'Пошив' },
  { value: 'warehouse', label: 'Склад' },
  { value: 'admin', label: 'Администрация' },
  { value: 'other', label: 'Другое' },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Динамический список ролей
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [showCustomRole, setShowCustomRole] = useState(false);
  const [customRoleValue, setCustomRoleValue] = useState('');
  const [customRoleLabel, setCustomRoleLabel] = useState('');

  // Состояние диалога
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    role: '',
    department: '',
    birth_date: '',
    is_active: true
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('*').order('full_name');
    if (data) {
      setEmployees(data);

      // Собираем уникальные роли
      const uniqueRoles = new Set(data.map(e => e.role).filter(Boolean));
      const combinedRoles = [...DEFAULT_ROLES];

      uniqueRoles.forEach(roleValue => {
        if (!combinedRoles.find(r => r.value === roleValue)) {
          combinedRoles.push({
            value: roleValue,
            label: roleValue.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          });
        }
      });

      setRoles(combinedRoles);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.full_name || !formData.role) {
      return alert('Введите ФИО и Роль');
    }

    const payload = {
      full_name: formData.full_name,
      role: formData.role,
      department: formData.department || null,
      birth_date: formData.birth_date || null,
      is_active: formData.is_active
    };

    const { error } = await supabase.from('employees').insert([payload]);

    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      setIsDialogOpen(false);
      resetForm();
      fetchEmployees();
    }
  };

  const handleUpdate = async (id: string, data: Partial<Employee>) => {
    const { error } = await supabase
      .from('employees')
      .update(data)
      .eq('id', id);

    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      fetchEmployees();
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('employees')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchEmployees();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Вы уверены, что хотите удалить сотрудника "${name}"?\n\n⚠️ Это действие необратимо!`)) {
      return;
    }

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      alert('✅ Сотрудник удалён');
      fetchEmployees();
    }
  };

  const resetForm = () => {
    setFormData({ full_name: '', role: '', department: '', birth_date: '', is_active: true });
    setShowCustomRole(false);
    setCustomRoleValue('');
    setCustomRoleLabel('');
  };

  const handleAddCustomRole = () => {
    if (!customRoleValue || !customRoleLabel) {
      return alert('Заполните код и название роли');
    }

    const newRole = { value: customRoleValue, label: customRoleLabel };
    setRoles([...roles, newRole]);
    setFormData({ ...formData, role: customRoleValue });
    setShowCustomRole(false);
    setCustomRoleValue('');
    setCustomRoleLabel('');
  };

  return (
    <div className="page-container">

      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-green-600 p-2 rounded-lg">
              <Users size={24} className="text-white" />
            </div>
            Управление Персоналом
          </h1>
          <p className="page-description">База сотрудников с ролями и цехами</p>
        </div>
        <Button
          onClick={() => { resetForm(); setIsDialogOpen(true); }}
          className="bg-white text-black hover:bg-zinc-200 font-bold gap-2"
        >
          <UserPlus size={18} /> Добавить сотрудника
        </Button>
      </div>

      {loading ? (
        <div className="text-zinc-500">Загрузка...</div>
      ) : (
        <EmployeesDataTable
          employees={employees}
          roles={roles}
          onUpdate={handleUpdate}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
        />
      )}

      {/* Модальное окно создания */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Новый сотрудник</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">ФИО *</label>
              <Input
                value={formData.full_name}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
                placeholder="Иванов Иван Иванович"
                className="bg-zinc-900 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-400">Должность (Роль) *</label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCustomRole(!showCustomRole)}
                  className="text-xs text-blue-400 hover:text-blue-300 h-6"
                >
                  {showCustomRole ? 'Выбрать из списка' : '+ Новая роль'}
                </Button>
              </div>

              {!showCustomRole ? (
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Выберите роль..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-700">
                  <div>
                    <label className="text-xs text-zinc-500">Код роли (латиница)</label>
                    <Input
                      value={customRoleValue}
                      onChange={e => setCustomRoleValue(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                      placeholder="operator_lamination"
                      className="bg-zinc-900 border-zinc-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Название роли (на русском)</label>
                    <Input
                      value={customRoleLabel}
                      onChange={e => setCustomRoleLabel(e.target.value)}
                      placeholder="Оператор Ламинации"
                      className="bg-zinc-900 border-zinc-700 text-white mt-1"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomRole}
                    className="w-full bg-green-600 hover:bg-green-700 text-xs"
                  >
                    Добавить роль
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Цех</label>
              <Select value={formData.department} onValueChange={v => setFormData({...formData, department: v})}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Выберите цех..." />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(dept => (
                    <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400 flex items-center gap-2">
                <Cake size={14} className="text-pink-400" />
                Дата рождения
              </label>
              <Input
                type="date"
                value={formData.birth_date}
                onChange={e => setFormData({...formData, birth_date: e.target.value})}
                className="bg-zinc-900 border-zinc-700 text-white"
              />
            </div>

            <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 font-bold mt-4">
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
