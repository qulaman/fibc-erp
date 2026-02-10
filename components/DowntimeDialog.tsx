'use client'

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { AlertTriangle } from "lucide-react";

interface DowntimeDialogProps {
  machineId: string;
  machineName?: string;
  shift?: string;
  date?: string;
  onSuccess?: () => void;
  autoOpen?: boolean;
}

export default function DowntimeDialog({
  machineId,
  machineName,
  shift,
  date,
  onSuccess,
  autoOpen = false
}: DowntimeDialogProps) {
  const [open, setOpen] = useState(autoOpen);
  const [loading, setLoading] = useState(false);

  // Текущее время в формате HH:MM
  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const [formData, setFormData] = useState({
    start_time: getCurrentTime(),
    end_time: getCurrentTime(),
    reason: '',
    notes: ''
  });

  // Вычисление длительности в минутах
  const calculateDuration = () => {
    if (!formData.start_time || !formData.end_time) return 0;

    const [startHour, startMin] = formData.start_time.split(':').map(Number);
    const [endHour, endMin] = formData.end_time.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return Math.max(0, endMinutes - startMinutes);
  };

  const duration = calculateDuration();

  // Список причин простоев
  const reasons = [
    { value: 'thread_break', label: 'Обрыв нити' },
    { value: 'equipment_failure', label: 'Поломка оборудования' },
    { value: 'no_material', label: 'Отсутствие сырья' },
    { value: 'batch_change', label: 'Смена партии/рецептуры' },
    { value: 'maintenance', label: 'Плановое обслуживание' },
    { value: 'quality_check', label: 'Контроль качества' },
    { value: 'operator_break', label: 'Перерыв оператора' },
    { value: 'power_outage', label: 'Отключение электроэнергии' },
    { value: 'other', label: 'Другое' }
  ];

  const handleSubmit = async () => {
    if (!formData.reason) {
      alert('⚠️ Выберите причину простоя!');
      return;
    }

    if (duration <= 0) {
      alert('⚠️ Время окончания должно быть позже времени начала!');
      return;
    }

    setLoading(true);

    try {
      // Формируем timestamp для начала и конца
      const currentDate = date || new Date().toISOString().split('T')[0];
      const startTimestamp = `${currentDate}T${formData.start_time}:00`;
      const endTimestamp = `${currentDate}T${formData.end_time}:00`;

      const { error } = await supabase
        .from('production_downtimes')
        .insert({
          machine_id: machineId,
          start_time: startTimestamp,
          end_time: endTimestamp,
          reason: formData.reason,
          notes: formData.notes || null,
          shift: shift || null,
          date: currentDate
        });

      if (error) throw error;

      alert(`✅ Простой зафиксирован!\nДлительность: ${duration} минут`);

      // Сброс формы
      setFormData({
        start_time: getCurrentTime(),
        end_time: getCurrentTime(),
        reason: '',
        notes: ''
      });

      setOpen(false);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error recording downtime:', err);
      alert('❌ Ошибка при регистрации простоя: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    // Если диалог закрывается и был autoOpen, вызываем onSuccess для сброса состояния
    if (!newOpen && autoOpen && onSuccess) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-red-950 hover:bg-red-900 text-white border-red-800 gap-2"
        >
          <AlertTriangle size={18} />
          Зафиксировать простой
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-zinc-950 text-white border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={24} />
            Регистрация простоя линии
          </DialogTitle>
          {machineName && (
            <p className="text-sm text-zinc-500">Оборудование: {machineName}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Время начала */}
          <div className="space-y-2">
            <Label>Время начала</Label>
            <Input
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="bg-zinc-900 border-zinc-700 text-white"
            />
          </div>

          {/* Время окончания */}
          <div className="space-y-2">
            <Label>Время окончания</Label>
            <Input
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="bg-zinc-900 border-zinc-700 text-white"
            />
          </div>

          {/* Длительность (вычисляется) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <div className="text-sm text-zinc-500">Длительность простоя</div>
            <div className="text-2xl font-bold text-red-400">
              {duration} минут
            </div>
          </div>

          {/* Причина */}
          <div className="space-y-2">
            <Label>Причина простоя *</Label>
            <Select
              value={formData.reason}
              onValueChange={(v) => setFormData({ ...formData, reason: v })}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                <SelectValue placeholder="Выберите причину..." />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Комментарий */}
          <div className="space-y-2">
            <Label>Комментарий (опционально)</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Дополнительные детали..."
              className="bg-zinc-900 border-zinc-700 text-white"
            />
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
            disabled={loading}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.reason || duration <= 0}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Сохранение...' : 'Зафиксировать'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
