'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Edit, Power, Search, ShieldCheck, Mail } from "lucide-react";

const ROLES = [
  { value: 'admin', label: 'Администратор', color: 'text-red-400 border-red-900' },
  { value: 'manager', label: 'Менеджер', color: 'text-blue-400 border-blue-900' },
  { value: 'operator', label: 'Оператор', color: 'text-green-400 border-green-900' },
  { value: 'warehouse', label: 'Кладовщик', color: 'text-yellow-400 border-yellow-900' },
  { value: 'qc', label: 'ОТК', color: 'text-purple-400 border-purple-900' },
  { value: 'accountant', label: 'Бухгалтер', color: 'text-cyan-400 border-cyan-900' },
];

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    employee_id: '',
    role: 'operator'
  });

  useEffect(() => {
    if (!isAdmin) {
      alert('Доступ запрещен. Требуются права администратора.');
      window.location.href = '/';
      return;
    }
    fetchUsers();
    fetchEmployees();
  }, [isAdmin]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles_with_employee')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, full_name, role')
      .eq('is_active', true)
      .order('full_name');

    setEmployees(data || []);
  };

  const handleCreateUser = async () => {
    if (!formData.email || !formData.password) {
      return alert('Введите email и пароль');
    }

    try {
      // Создание пользователя через API endpoint
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          employee_id: formData.employee_id || null,
          role: formData.role
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert('Ошибка создания пользователя: ' + (result.error || 'Неизвестная ошибка'));
        return;
      }

      alert('Пользователь успешно создан!');
      setIsDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      alert('Ошибка создания пользователя: ' + error.message);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editingUserId) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        employee_id: formData.employee_id || null,
        role: formData.role
      })
      .eq('id', editingUserId);

    if (error) {
      alert('Ошибка обновления: ' + error.message);
    } else {
      alert('Профиль обновлен');
      setIsDialogOpen(false);
      resetForm();
      fetchUsers();
    }
  };

  const startEdit = (user: any) => {
    setEditingUserId(user.id);
    setIsCreateMode(false);
    setFormData({
      email: user.email || '',
      password: '',
      employee_id: user.employee_id || '',
      role: user.role
    });
    setIsDialogOpen(true);
  };

  const startCreate = () => {
    setIsCreateMode(true);
    setEditingUserId(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ email: '', password: '', employee_id: '', role: 'operator' });
  };

  const toggleStatus = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: !currentStatus })
      .eq('id', userId);

    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleInfo = (role: string) => {
    return ROLES.find(r => r.value === role) || ROLES[2];
  };

  return (
    <div className="page-container">

      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Users size={24} className="text-white" />
            </div>
            Управление Пользователями
          </h1>
          <p className="page-description">Администрирование доступа к системе</p>
        </div>
        <Button onClick={startCreate} className="bg-white text-black hover:bg-zinc-200 font-bold gap-2">
          <Plus size={18} /> Создать пользователя
        </Button>
      </div>

      <div className="search-container">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
        <Input
          placeholder="Поиск по email или имени..."
          className="pl-10 bg-zinc-900 border-zinc-800 text-white"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? <div className="text-zinc-500">Загрузка...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const roleInfo = getRoleInfo(user.role);

            return (
              <Card key={user.id} className={`border-zinc-800 bg-zinc-900 transition-all ${!user.is_active ? 'opacity-50 grayscale' : ''}`}>
                <CardHeader className="flex flex-row justify-between items-start pb-2">
                  <div className="h-10 w-10 rounded-full bg-[#E60012] flex items-center justify-center font-bold text-lg text-white">
                    {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={roleInfo.color}>
                      {roleInfo.label}
                    </Badge>
                    <Badge variant="outline" className={user.is_active ? "text-green-400 border-green-900" : "text-red-400 border-red-900"}>
                      {user.is_active ? 'Активен' : 'Неактивен'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="font-bold text-lg text-white">
                      {user.full_name || 'Не привязан'}
                    </div>
                    {user.position && (
                      <div className="text-sm text-zinc-400">{user.position}</div>
                    )}
                    <div className="text-xs text-zinc-500 flex items-center gap-1 font-mono">
                      <Mail size={12} />
                      {user.email}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-zinc-950 border-zinc-800 hover:bg-zinc-800"
                      onClick={() => startEdit(user)}
                    >
                      <Edit size={14} className="mr-2"/> Изменить
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={user.is_active ? "text-red-500 hover:text-red-400 hover:bg-red-950" : "text-green-500 hover:text-green-400 hover:bg-green-950"}
                      onClick={() => toggleStatus(user.id, user.is_active)}
                      title={user.is_active ? "Деактивировать" : "Активировать"}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck size={20} />
              {isCreateMode ? 'Создать нового пользователя' : 'Редактировать пользователя'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">

            {isCreateMode && (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="user@example.com"
                    className="bg-zinc-900 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Пароль</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    placeholder="Минимум 6 символов"
                    className="bg-zinc-900 border-zinc-700"
                  />
                  <p className="text-xs text-zinc-600">Пользователь сможет изменить пароль после входа</p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Сотрудник (опционально)</label>
              <Select
                value={formData.employee_id || 'NONE'}
                onValueChange={v => setFormData({...formData, employee_id: v === 'NONE' ? '' : v})}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Не привязывать к сотруднику" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Не привязывать</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Роль</label>
              <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={isCreateMode ? handleCreateUser : handleUpdateProfile}
              className="w-full bg-blue-600 hover:bg-blue-700 font-bold mt-4"
            >
              {isCreateMode ? 'Создать пользователя' : 'Сохранить изменения'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
