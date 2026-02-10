'use client'

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Database, Trash2, AlertTriangle, Shield,
  Factory, Scissors, Package, Warehouse, Calendar
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function DataManagementPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  // Проверка прав доступа
  if (!isAdmin) {
    return (
      <div className="page-container">
        <Card className="bg-red-900/20 border-red-800">
          <CardContent className="pt-6">
            <div className="text-center text-red-400">
              <Shield size={48} className="mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Доступ запрещен</h2>
              <p className="text-sm">Только администраторы могут управлять данными</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialog({
      open: true,
      title,
      description,
      onConfirm
    });
  };

  // Очистка данных экструзии
  const clearExtrusionData = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('production_extrusion').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;

      toast.success('Данные экструзии удалены');
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Очистка данных ткачества
  const clearWeavingData = async () => {
    setLoading(true);
    try {
      // Удаляем записи производства
      await supabase.from('production_weaving').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Удаляем рулоны
      const { error } = await supabase.from('weaving_rolls').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;

      toast.success('Данные ткачества удалены');
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Очистка данных строп
  const clearStrapsData = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('production_straps').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;

      toast.success('Данные строп удалены');
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Очистка склада сырья
  const clearRawMaterialsData = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('inventory_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;

      toast.success('Журнал склада сырья очищен');
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Очистка склада МФН
  const clearMfnWarehouseData = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('mfn_warehouse').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;

      toast.success('Склад МФН очищен');
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Очистка склада нити (yarn_inventory)
  const clearYarnInventoryData = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('yarn_inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;

      toast.success('Склад нити очищен');
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Очистка всех данных до определенной даты
  const clearDataBeforeDate = async () => {
    if (!selectedDate) {
      toast.warning('Выберите дату');
      return;
    }

    setLoading(true);
    try {
      // Удаляем из всех таблиц производства
      await supabase.from('production_extrusion').delete().lt('date', selectedDate);
      await supabase.from('production_weaving').delete().lt('date', selectedDate);
      await supabase.from('production_straps').delete().lt('date', selectedDate);

      toast.success(`Все данные до ${new Date(selectedDate).toLocaleDateString('ru-RU')} удалены`);
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ОПАСНАЯ ЗОНА: Удалить ВСЁ
  const clearAllData = async () => {
    setLoading(true);
    try {
      // Производство
      await supabase.from('production_extrusion').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('production_weaving').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('weaving_rolls').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('production_straps').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Склады
      await supabase.from('inventory_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('mfn_warehouse').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('yarn_inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      toast.success('ВСЕ ДАННЫЕ УДАЛЕНЫ!', {
        description: 'База данных очищена',
        duration: 5000
      });
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-red-600 p-2 rounded-lg">
              <Database size={24} className="text-white"/>
            </div>
            Управление Данными
          </h1>
          <p className="page-description">
            Инструменты для очистки тестовых данных и управления базой данных
          </p>
        </div>
      </div>

      {/* ПРЕДУПРЕЖДЕНИЕ */}
      <Card className="bg-red-900/20 border-red-800 mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={24} className="text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-red-400 font-bold mb-2">⚠️ ВНИМАНИЕ!</h3>
              <p className="text-sm text-red-300">
                Удаление данных <strong>необратимо</strong>. Убедитесь, что вы точно хотите удалить выбранные данные.
                Рекомендуется создать резервную копию перед массовым удалением.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ОЧИСТКА ПО МОДУЛЯМ */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white mb-4">Очистка по модулям</h2>

          {/* Экструзия */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Factory size={18} className="text-red-500"/>
                Экструзия
              </CardTitle>
              <CardDescription className="text-xs">
                Удалить все записи производства экструзии
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => showConfirm(
                  'Удалить данные экструзии?',
                  'Это удалит ВСЕ записи производства экструзии. Действие необратимо!',
                  clearExtrusionData
                )}
                disabled={loading}
              >
                <Trash2 size={16} className="mr-2"/>
                Очистить экструзию
              </Button>
            </CardContent>
          </Card>

          {/* Ткачество */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Scissors size={18} className="text-amber-500"/>
                Ткачество
              </CardTitle>
              <CardDescription className="text-xs">
                Удалить все рулоны и записи производства ткачества
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => showConfirm(
                  'Удалить данные ткачества?',
                  'Это удалит ВСЕ рулоны и записи производства ткачества. Действие необратимо!',
                  clearWeavingData
                )}
                disabled={loading}
              >
                <Trash2 size={16} className="mr-2"/>
                Очистить ткачество
              </Button>
            </CardContent>
          </Card>

          {/* Стропы */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package size={18} className="text-blue-500"/>
                Стропы
              </CardTitle>
              <CardDescription className="text-xs">
                Удалить все записи производства строп
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => showConfirm(
                  'Удалить данные строп?',
                  'Это удалит ВСЕ записи производства строп. Действие необратимо!',
                  clearStrapsData
                )}
                disabled={loading}
              >
                <Trash2 size={16} className="mr-2"/>
                Очистить стропы
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ОЧИСТКА СКЛАДОВ И ПО ДАТЕ */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white mb-4">Склады и фильтры</h2>

          {/* Склад сырья */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Warehouse size={18} className="text-green-500"/>
                Склад сырья
              </CardTitle>
              <CardDescription className="text-xs">
                Очистить журнал операций склада сырья
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => showConfirm(
                  'Очистить склад сырья?',
                  'Это удалит ВСЕ записи операций со склада сырья. Действие необратимо!',
                  clearRawMaterialsData
                )}
                disabled={loading}
              >
                <Trash2 size={16} className="mr-2"/>
                Очистить журнал
              </Button>
            </CardContent>
          </Card>

          {/* Склад МФН */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Warehouse size={18} className="text-purple-500"/>
                Склад МФН
              </CardTitle>
              <CardDescription className="text-xs">
                Очистить склад мультифиламентной нити
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => showConfirm(
                  'Очистить склад МФН?',
                  'Это удалит ВСЕ записи со склада МФН. Действие необратимо!',
                  clearMfnWarehouseData
                )}
                disabled={loading}
              >
                <Trash2 size={16} className="mr-2"/>
                Очистить МФН
              </Button>
            </CardContent>
          </Card>

          {/* Склад нити */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Warehouse size={18} className="text-cyan-500"/>
                Склад нити (ПП)
              </CardTitle>
              <CardDescription className="text-xs">
                Очистить склад полипропиленовой нити
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => showConfirm(
                  'Очистить склад нити?',
                  'Это удалит ВСЕ партии нити со склада. Действие необратимо!',
                  clearYarnInventoryData
                )}
                disabled={loading}
              >
                <Trash2 size={16} className="mr-2"/>
                Очистить нить
              </Button>
            </CardContent>
          </Card>

          {/* Удаление по дате */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar size={18} className="text-yellow-500"/>
                Удаление по дате
              </CardTitle>
              <CardDescription className="text-xs">
                Удалить все данные производства до указанной даты
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-zinc-400">Удалить всё до даты (не включительно)</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-2 bg-zinc-950 border-zinc-700"
                />
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => showConfirm(
                  'Удалить данные до выбранной даты?',
                  `Это удалит ВСЕ данные производства до ${selectedDate ? new Date(selectedDate).toLocaleDateString('ru-RU') : '...'}. Действие необратимо!`,
                  clearDataBeforeDate
                )}
                disabled={loading || !selectedDate}
              >
                <Trash2 size={16} className="mr-2"/>
                Удалить до даты
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ОПАСНАЯ ЗОНА */}
      <Card className="bg-red-950/20 border-red-900 mt-6">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <AlertTriangle size={20}/>
            ОПАСНАЯ ЗОНА
          </CardTitle>
          <CardDescription className="text-red-300/80">
            Эти действия удалят большие объемы данных и не могут быть отменены
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            className="w-full bg-red-600 hover:bg-red-700"
            onClick={() => showConfirm(
              '⚠️ УДАЛИТЬ ВСЕ ДАННЫЕ?',
              'Это удалит АБСОЛЮТНО ВСЕ данные из системы: производство, склады, операции. Это действие НЕОБРАТИМО и не может быть отменено!',
              clearAllData
            )}
            disabled={loading}
          >
            <Trash2 size={16} className="mr-2"/>
            УДАЛИТЬ ВСЁ (КРАЙНЕ ОПАСНО!)
          </Button>
        </CardContent>
      </Card>

      {/* Диалог подтверждения */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        variant="destructive"
        confirmText="Удалить"
        cancelText="Отмена"
      />
    </div>
  );
}
