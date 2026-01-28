'use client'

import { useState } from 'react';
import { Search, ArrowUp, ArrowDown, Edit, Save, X, Power, Cake, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";

export interface Employee {
  id: string;
  full_name: string;
  role: string;
  department?: string; // Цех
  birth_date?: string;
  is_active: boolean;
  created_at?: string;
}

interface RoleOption {
  value: string;
  label: string;
}

type SortField = 'name' | 'role' | 'department' | 'birthday';
type SortDirection = 'asc' | 'desc' | null;

interface EmployeesDataTableProps {
  employees: Employee[];
  roles: RoleOption[];
  onUpdate: (id: string, data: Partial<Employee>) => Promise<void>;
  onToggleStatus: (id: string, currentStatus: boolean) => Promise<void>;
  onDelete: (id: string, name: string) => Promise<void>;
}

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

export default function EmployeesDataTable({
  employees,
  roles,
  onUpdate,
  onToggleStatus,
  onDelete
}: EmployeesDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Employee>>({});

  // Функция обработки сортировки
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Вычисляем дни до дня рождения
  const getDaysUntilBirthday = (birthDate: string | null | undefined) => {
    if (!birthDate) return null;

    const today = new Date();
    const birth = new Date(birthDate);
    const thisYearBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());

    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(today.getFullYear() + 1);
    }

    const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil;
  };

  // Логика фильтрации и сортировки
  const filteredEmployees = employees
    .filter(item => {
      // 1. Фильтр по поиску
      const roleLabel = roles.find(r => r.value === item.role)?.label || item.role;
      const matchesSearch = item.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            roleLabel.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Фильтр по роли
      let matchesRole = true;
      if (roleFilter !== 'all') matchesRole = item.role === roleFilter;

      // 3. Фильтр по цеху
      let matchesDepartment = true;
      if (departmentFilter !== 'all') matchesDepartment = item.department === departmentFilter;

      // 4. Фильтр по статусу
      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = item.is_active === true;
      if (statusFilter === 'inactive') matchesStatus = item.is_active === false;

      return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
    })
    .sort((a, b) => {
      if (!sortField || !sortDirection) return 0;

      const direction = sortDirection === 'asc' ? 1 : -1;

      switch (sortField) {
        case 'name':
          return direction * a.full_name.localeCompare(b.full_name);
        case 'role':
          const roleA = roles.find(r => r.value === a.role)?.label || a.role;
          const roleB = roles.find(r => r.value === b.role)?.label || b.role;
          return direction * roleA.localeCompare(roleB);
        case 'department':
          const deptA = DEPARTMENTS.find(d => d.value === a.department)?.label || '';
          const deptB = DEPARTMENTS.find(d => d.value === b.department)?.label || '';
          return direction * deptA.localeCompare(deptB);
        case 'birthday':
          const daysA = getDaysUntilBirthday(a.birth_date) ?? 999;
          const daysB = getDaysUntilBirthday(b.birth_date) ?? 999;
          return direction * (daysA - daysB);
        default:
          return 0;
      }
    });

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditData({
      full_name: emp.full_name,
      role: emp.role,
      department: emp.department,
      birth_date: emp.birth_date,
      is_active: emp.is_active,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editData.full_name?.trim() || !editData.role) {
      alert('ФИО и роль обязательны');
      return;
    }

    await onUpdate(editingId, editData);
    setEditingId(null);
    setEditData({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  // Получаем уникальные роли из списка сотрудников
  const uniqueRoles = Array.from(new Set(employees.map(e => e.role)))
    .map(roleValue => roles.find(r => r.value === roleValue) || { value: roleValue, label: roleValue });

  // Получаем уникальные цеха
  const uniqueDepartments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)))
    .map(deptValue => DEPARTMENTS.find(d => d.value === deptValue) || { value: deptValue!, label: deptValue! });

  return (
    <div className="space-y-6">

      {/* --- ПАНЕЛЬ УПРАВЛЕНИЯ --- */}
      <div className="flex flex-col gap-4 bg-zinc-900 p-4 rounded-xl border border-zinc-800">

        {/* Первая строка: Поиск */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
          <Input
            placeholder="Поиск по имени или должности..."
            className="pl-10 bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 focus:ring-[#E60012]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Вторая строка: Фильтры */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Фильтр по роли */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-sm font-medium">Должность:</span>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48 bg-zinc-950 border-zinc-700 text-white">
                <SelectValue placeholder="Все" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {uniqueRoles.map(role => (
                  <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Фильтр по цеху */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-sm font-medium">Цех:</span>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-48 bg-zinc-950 border-zinc-700 text-white">
                <SelectValue placeholder="Все" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {uniqueDepartments.map(dept => (
                  <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Фильтр по статусу */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-sm font-medium">Статус:</span>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className={statusFilter === 'all'
                  ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                  : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }
              >
                Все
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
                className={statusFilter === 'active'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }
              >
                Активные
              </Button>
              <Button
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('inactive')}
                className={statusFilter === 'inactive'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }
              >
                Неактивные
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* --- ТАБЛИЦА --- */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-950">
              <tr>
                <th
                  className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs tracking-wider cursor-pointer hover:bg-zinc-900 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    <span>ФИО</span>
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs tracking-wider cursor-pointer hover:bg-zinc-900 transition-colors"
                  onClick={() => handleSort('role')}
                >
                  <div className="flex items-center gap-2">
                    <span>Должность</span>
                    {sortField === 'role' && (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs tracking-wider cursor-pointer hover:bg-zinc-900 transition-colors"
                  onClick={() => handleSort('department')}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>Цех</span>
                    {sortField === 'department' && (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs tracking-wider">
                  Статус
                </th>
                <th
                  className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs tracking-wider cursor-pointer hover:bg-zinc-900 transition-colors"
                  onClick={() => handleSort('birthday')}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Cake size={14} />
                    <span>День рождения</span>
                    {sortField === 'birthday' && (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-500">
                    Ничего не найдено
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isEditing = editingId === emp.id;
                  const roleLabel = roles.find(r => r.value === emp.role)?.label || emp.role;
                  const deptLabel = DEPARTMENTS.find(d => d.value === emp.department)?.label;
                  const daysUntilBirthday = getDaysUntilBirthday(emp.birth_date);
                  const isBirthdaySoon = daysUntilBirthday !== null && daysUntilBirthday <= 7;
                  const isBirthdayToday = daysUntilBirthday === 0;

                  return (
                    <tr
                      key={emp.id}
                      className={`group hover:bg-zinc-800/50 transition-all duration-200 ${
                        !emp.is_active ? 'opacity-50' : ''
                      } ${isBirthdayToday ? 'bg-pink-950/20' : ''}`}
                    >
                      {/* ФИО */}
                      <td className="px-4 py-4">
                        {isEditing ? (
                          <Input
                            value={editData.full_name || ''}
                            onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                            className="bg-zinc-950 border-zinc-700 text-white"
                            placeholder="ФИО"
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              isBirthdayToday ? 'bg-pink-600 text-white animate-pulse' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {emp.full_name.charAt(0)}
                            </div>
                            <span className="text-white font-medium">{emp.full_name}</span>
                          </div>
                        )}
                      </td>

                      {/* Должность */}
                      <td className="px-4 py-4">
                        {isEditing ? (
                          <Select
                            value={editData.role || emp.role}
                            onValueChange={(v) => setEditData({ ...editData, role: v })}
                          >
                            <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white">
                              <SelectValue placeholder="Выберите роль" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map(role => (
                                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="border-blue-700 text-blue-400 bg-blue-900/10">
                            {roleLabel}
                          </Badge>
                        )}
                      </td>

                      {/* Цех */}
                      <td className="px-4 py-4 text-center">
                        {isEditing ? (
                          <Select
                            value={editData.department || emp.department || ''}
                            onValueChange={(v) => setEditData({ ...editData, department: v })}
                          >
                            <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white">
                              <SelectValue placeholder="Выберите цех" />
                            </SelectTrigger>
                            <SelectContent>
                              {DEPARTMENTS.map(dept => (
                                <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : deptLabel ? (
                          <Badge variant="outline" className="border-orange-700 text-orange-400 bg-orange-900/10">
                            {deptLabel}
                          </Badge>
                        ) : (
                          <span className="text-zinc-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Статус */}
                      <td className="px-4 py-4 text-center">
                        {isEditing ? (
                          <Select
                            value={editData.is_active !== undefined ? String(editData.is_active) : String(emp.is_active)}
                            onValueChange={(v) => setEditData({ ...editData, is_active: v === 'true' })}
                          >
                            <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white w-32 mx-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Активен</SelectItem>
                              <SelectItem value="false">Уволен</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant="outline"
                            className={emp.is_active
                              ? "text-green-400 border-green-700 bg-green-900/10"
                              : "text-red-400 border-red-700 bg-red-900/10"
                            }
                          >
                            {emp.is_active ? 'Активен' : 'Уволен'}
                          </Badge>
                        )}
                      </td>

                      {/* День рождения */}
                      <td className="px-4 py-4 text-center">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editData.birth_date || ''}
                            onChange={(e) => setEditData({ ...editData, birth_date: e.target.value })}
                            className="bg-zinc-950 border-zinc-700 text-white"
                          />
                        ) : emp.birth_date ? (
                          <div className={`inline-flex items-center gap-2 text-xs px-2 py-1 rounded ${
                            isBirthdayToday
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                              : isBirthdaySoon
                              ? 'bg-pink-500/10 text-pink-400'
                              : 'text-zinc-400'
                          }`}>
                            {isBirthdayToday ? (
                              <span className="font-bold">🎉 Сегодня!</span>
                            ) : daysUntilBirthday === 1 ? (
                              <span>Завтра</span>
                            ) : isBirthdaySoon ? (
                              <span>Через {daysUntilBirthday} д.</span>
                            ) : (
                              <span>{new Date(emp.birth_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Действия */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                className="h-8 bg-green-600 hover:bg-green-700"
                                title="Сохранить изменения"
                              >
                                <Save size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                className="h-8 text-zinc-400 hover:text-white"
                                title="Отменить"
                              >
                                <X size={14} />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEdit(emp)}
                                className="h-8 text-blue-400 hover:text-blue-300 hover:bg-blue-950"
                                title="Редактировать"
                              >
                                <Edit size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDelete(emp.id, emp.full_name)}
                                className="h-8 text-red-400 hover:text-red-300 hover:bg-red-950"
                                title="Удалить"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Футер таблицы */}
        <div className="bg-zinc-950 p-3 text-center text-xs text-zinc-600 border-t border-zinc-800">
          Показано {filteredEmployees.length} из {employees.length} сотрудников
        </div>
      </div>
    </div>
  );
}
