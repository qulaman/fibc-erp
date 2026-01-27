'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Users, UserPlus, Shield, UserCog, Power, Search, Cake } from "lucide-react";

// Справочник ролей (можно добавлять новые через интерфейс)
const DEFAULT_ROLES = [
  { value: 'admin', label: 'Администратор' },
  { value: 'manager_warehouse', label: 'Зав. Складом' },
  { value: 'operator_extruder', label: 'Оператор Экструзии' },
  { value: 'operator_winder', label: 'Намотчик (Экструзия)' },
  { value: 'operator_weaver', label: 'Ткач' },
  { value: 'operator_lamination', label: 'Оператор Ламинации' },
  { value: 'operator_cutting', label: 'Оператор Резки' },
  { value: 'operator_sewing', label: 'Швея' },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Динамический список ролей (загружается из существующих сотрудников)
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [showCustomRole, setShowCustomRole] = useState(false);
  const [customRoleValue, setCustomRoleValue] = useState('');
  const [customRoleLabel, setCustomRoleLabel] = useState('');

  // Состояние диалога (формы)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    role: '',
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

      // Собираем уникальные роли из БД и добавляем в список
      const uniqueRoles = new Set(data.map(e => e.role).filter(Boolean));
      const combinedRoles = [...DEFAULT_ROLES];

      uniqueRoles.forEach(roleValue => {
        if (!combinedRoles.find(r => r.value === roleValue)) {
          // Если роль не в списке по умолчанию - добавляем
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
    if (!formData.full_name || !formData.role) return alert('Введите ФИО и Роль');

    const payload = {
       full_name: formData.full_name,
       role: formData.role,
       birth_date: formData.birth_date || null,
       is_active: formData.is_active
    };

    let error;
    if (editingId) {
       // Обновление
       const { error: updateError } = await supabase
         .from('employees')
         .update(payload)
         .eq('id', editingId);
       error = updateError;
    } else {
       // Создание
       const { error: insertError } = await supabase
         .from('employees')
         .insert([payload]);
       error = insertError;
    }

    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      setIsDialogOpen(false);
      resetForm();
      fetchEmployees();
    }
  };

  const startEdit = (emp: any) => {
    setEditingId(emp.id);
    setFormData({
      full_name: emp.full_name,
      role: emp.role,
      birth_date: emp.birth_date || '',
      is_active: emp.is_active
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ full_name: '', role: '', birth_date: '', is_active: true });
    setShowCustomRole(false);
    setCustomRoleValue('');
    setCustomRoleLabel('');
  };

  const handleAddCustomRole = () => {
    if (!customRoleValue || !customRoleLabel) {
      return alert('Заполните код и название роли');
    }

    // Добавляем новую роль в список
    const newRole = { value: customRoleValue, label: customRoleLabel };
    setRoles([...roles, newRole]);
    setFormData({ ...formData, role: customRoleValue });
    setShowCustomRole(false);
    setCustomRoleValue('');
    setCustomRoleLabel('');
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('employees').update({ is_active: !currentStatus }).eq('id', id);
    fetchEmployees();
  };

  // Вычисляем дни до дня рождения
  const getDaysUntilBirthday = (birthDate: string | null) => {
    if (!birthDate) return null;

    const today = new Date();
    const birth = new Date(birthDate);
    const thisYearBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());

    // Если день рождения уже прошел в этом году, берем следующий год
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(today.getFullYear() + 1);
    }

    const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil;
  };

  // Фильтрация
  const filteredEmployees = employees.filter(e =>
     e.full_name.toLowerCase().includes(search.toLowerCase()) ||
     roles.find(r => r.value === e.role)?.label.toLowerCase().includes(search.toLowerCase())
  );

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
          <p className="page-description">База сотрудников и роли доступа</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-white text-black hover:bg-zinc-200 font-bold gap-2">
          <UserPlus size={18} /> Добавить сотрудника
        </Button>
      </div>

      <div className="search-container">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
        <Input
          placeholder="Поиск по имени или должности..."
          className="pl-10 bg-zinc-900 border-zinc-800 text-white"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? <div className="text-zinc-500">Загрузка...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
           {filteredEmployees.map((emp) => {
             const roleLabel = roles.find(r => r.value === emp.role)?.label || emp.role;
             const daysUntilBirthday = getDaysUntilBirthday(emp.birth_date);
             const isBirthdaySoon = daysUntilBirthday !== null && daysUntilBirthday <= 7;
             const isBirthdayToday = daysUntilBirthday === 0;

             return (
               <Card key={emp.id} className={`border-zinc-800 bg-zinc-900 transition-all ${!emp.is_active ? 'opacity-50 grayscale' : ''} ${isBirthdayToday ? 'border-pink-500/50 shadow-lg shadow-pink-500/10' : ''}`}>
                 <CardHeader className="flex flex-row justify-between items-start pb-2">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg ${isBirthdayToday ? 'bg-pink-600 text-white animate-pulse' : 'bg-zinc-800 text-zinc-400'}`}>
                       {emp.full_name.charAt(0)}
                    </div>
                    <Badge variant="outline" className={emp.is_active ? "text-green-400 border-green-900 bg-green-900/10" : "text-red-400 border-red-900"}>
                       {emp.is_active ? 'Активен' : 'Уволен/Скрыт'}
                    </Badge>
                 </CardHeader>
                 <CardContent>
                    <div className="font-bold text-lg text-white mb-1">{emp.full_name}</div>
                    <div className="text-sm text-zinc-400 flex items-center gap-1 mb-2">
                       <Shield size={12}/> {roleLabel}
                    </div>

                    {/* День рождения */}
                    {emp.birth_date && (
                      <div className={`flex items-center gap-2 text-xs mb-3 px-2 py-1.5 rounded-md ${
                        isBirthdayToday
                          ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                          : isBirthdaySoon
                          ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                          : 'bg-zinc-800/50 text-zinc-500'
                      }`}>
                        <Cake size={14} className={isBirthdaySoon ? 'text-pink-400' : 'text-zinc-600'} />
                        {isBirthdayToday ? (
                          <span className="font-bold">🎉 Сегодня день рождения!</span>
                        ) : daysUntilBirthday === 1 ? (
                          <span>Завтра день рождения</span>
                        ) : isBirthdaySoon ? (
                          <span>Через {daysUntilBirthday} {daysUntilBirthday === 2 ? 'дня' : 'дней'}</span>
                        ) : (
                          <span>{new Date(emp.birth_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                       <Button variant="outline" size="sm" className="flex-1 bg-zinc-950 border-zinc-800 hover:bg-zinc-800" onClick={() => startEdit(emp)}>
                          <UserCog size={14} className="mr-2"/> Изменить
                       </Button>
                       <Button
                         variant="ghost"
                         size="icon"
                         className={emp.is_active ? "text-red-500 hover:text-red-400 hover:bg-red-950" : "text-green-500 hover:text-green-400 hover:bg-green-950"}
                         onClick={() => toggleStatus(emp.id, emp.is_active)}
                         title={emp.is_active ? "Уволить/Скрыть" : "Восстановить"}
                       >
                          <Power size={16} />
                       </Button>
                    </div>
                 </CardContent>
               </Card>
             )
           })}
        </div>
      )}

      {/* Модальное окно создания/редактирования */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
            <DialogHeader>
               <DialogTitle>{editingId ? 'Редактировать сотрудника' : 'Новый сотрудник'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
               <div className="space-y-2">
                  <label className="text-sm text-zinc-400">ФИО</label>
                  <Input
                    value={formData.full_name}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                    placeholder="Иванов Иван Иванович"
                    className="bg-zinc-900 border-zinc-700"
                  />
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

               <div className="space-y-2">
                  <div className="flex items-center justify-between">
                     <label className="text-sm text-zinc-400">Должность (Роль)</label>
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

               <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 font-bold mt-4">
                  Сохранить
               </Button>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}