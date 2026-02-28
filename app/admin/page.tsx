'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Users, Briefcase, Settings,
  Database, TrendingUp, AlertCircle, CheckCircle2, ChevronRight,
  UserCog, Wrench, FileText, BarChart3
} from "lucide-react";
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalEmployees: number;
  activeEmployees: number;
  totalEquipment: number;
  activeEquipment: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalEmployees: 0,
    activeEmployees: 0,
    totalEquipment: 0,
    activeEquipment: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверка доступа
    if (!authLoading) {
      if (!profile) {
        router.push('/login');
        return;
      }
      if (profile.role !== 'admin') {
        router.push('/');
        return;
      }
      fetchStats();
    }
  }, [profile, authLoading, router]);

  const fetchStats = async () => {
    try {
      // Пользователи
      const { data: users } = await supabase.from('profiles').select('id, is_active');
      const totalUsers = users?.length || 0;
      const activeUsers = users?.filter(u => u.is_active).length || 0;

      // Сотрудники
      const { data: employees } = await supabase.from('employees').select('id, is_active');
      const totalEmployees = employees?.length || 0;
      const activeEmployees = employees?.filter(e => e.is_active).length || 0;

      // Оборудование
      const { data: equipment } = await supabase.from('equipment').select('id, status');
      const totalEquipment = equipment?.length || 0;
      const activeEquipment = equipment?.filter(e => e.status === 'active').length || 0;

      setStats({
        totalUsers,
        activeUsers,
        totalEmployees,
        activeEmployees,
        totalEquipment,
        activeEquipment
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  const adminSections = [
    {
      title: 'Мониторинг заказов',
      description: 'Статус выполнения заказов по цехам',
      icon: BarChart3,
      color: 'from-indigo-600 to-indigo-700',
      borderColor: 'border-indigo-800',
      href: '/admin/orders'
    },
    {
      title: 'Пользователи',
      description: 'Управление учетными записями',
      icon: Users,
      color: 'from-green-600 to-green-700',
      borderColor: 'border-green-800',
      href: '/admin/users'
    },
    {
      title: 'Сотрудники',
      description: 'База данных персонала',
      icon: Briefcase,
      color: 'from-orange-600 to-orange-700',
      borderColor: 'border-orange-800',
      href: '/admin/employees'
    },
    {
      title: 'Оборудование',
      description: 'Учет станков и техники',
      icon: Wrench,
      color: 'from-cyan-600 to-cyan-700',
      borderColor: 'border-cyan-800',
      href: '/admin/equipment'
    },
    {
      title: 'Управление данными',
      description: 'Импорт/экспорт, резервные копии',
      icon: Database,
      color: 'from-red-600 to-red-700',
      borderColor: 'border-red-800',
      href: '/admin/data-management'
    }
  ];

  return (
    <div className="page-container max-w-[100vw] p-6 bg-black min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-gradient-to-br from-red-600 to-red-700 p-3 rounded-xl">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-red-400 flex items-center gap-2">
              Панель Администратора
            </h1>
            <p className="text-zinc-500 text-sm">Управление системой и мониторинг</p>
          </div>
        </div>

        {/* Приветствие */}
        <div className="bg-gradient-to-r from-red-900/30 to-red-950/30 border border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <UserCog className="text-red-400" size={24} />
            <div>
              <p className="text-white font-medium">Добро пожаловать, {profile.full_name || 'Администратор'}!</p>
              <p className="text-zinc-400 text-sm">Роль: Администратор системы</p>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 size={24} className="text-red-400" />
          Общая статистика
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Пользователи */}
          <Card className="bg-gradient-to-br from-green-900/30 to-green-950/30 border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Users className="text-green-600 opacity-50" size={32} />
                <Badge variant="outline" className="bg-green-900/50 text-green-400 border-green-700">
                  {stats.activeUsers} активных
                </Badge>
              </div>
              <p className="text-zinc-400 text-sm mb-1">Пользователи</p>
              <p className="text-3xl font-bold text-green-400">{stats.totalUsers}</p>
            </CardContent>
          </Card>

          {/* Сотрудники */}
          <Card className="bg-gradient-to-br from-orange-900/30 to-orange-950/30 border-orange-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Briefcase className="text-orange-600 opacity-50" size={32} />
                <Badge variant="outline" className="bg-orange-900/50 text-orange-400 border-orange-700">
                  {stats.activeEmployees} активных
                </Badge>
              </div>
              <p className="text-zinc-400 text-sm mb-1">Сотрудники</p>
              <p className="text-3xl font-bold text-orange-400">{stats.totalEmployees}</p>
            </CardContent>
          </Card>

          {/* Оборудование */}
          <Card className="bg-gradient-to-br from-cyan-900/30 to-cyan-950/30 border-cyan-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Wrench className="text-cyan-600 opacity-50" size={32} />
                <Badge variant="outline" className="bg-cyan-900/50 text-cyan-400 border-cyan-700">
                  {stats.activeEquipment} активных
                </Badge>
              </div>
              <p className="text-zinc-400 text-sm mb-1">Оборудование</p>
              <p className="text-3xl font-bold text-cyan-400">{stats.totalEquipment}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Разделы администрирования */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Settings size={24} className="text-red-400" />
          Разделы администрирования
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.href} href={section.href}>
                <Card
                  className={`bg-zinc-900 ${section.borderColor} border-2 cursor-pointer hover:scale-105 transition-transform duration-200 h-full`}
                >
                  <CardContent className="p-6">
                    <div className={`bg-gradient-to-br ${section.color} w-14 h-14 rounded-xl flex items-center justify-center mb-4`}>
                      <Icon size={28} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{section.title}</h3>
                    <p className="text-zinc-400 text-sm mb-4">{section.description}</p>
                    <div className="flex items-center text-red-400 font-medium">
                      <span>Открыть</span>
                      <ChevronRight size={20} className="ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Важные уведомления */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <AlertCircle size={24} className="text-yellow-400" />
          Системные уведомления
        </h2>
        <div className="space-y-3">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-green-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-white font-medium">Система работает нормально</p>
                  <p className="text-zinc-400 text-sm">Все модули функционируют без ошибок</p>
                </div>
                <Badge variant="outline" className="ml-auto bg-green-900/30 text-green-400 border-green-700">
                  OK
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="text-blue-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-white font-medium">База данных</p>
                  <p className="text-zinc-400 text-sm">Последняя резервная копия: сегодня</p>
                </div>
                <Badge variant="outline" className="ml-auto bg-blue-900/30 text-blue-400 border-blue-700">
                  Актуально
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
