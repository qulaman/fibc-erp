'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, User, Scissors, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react"

export default function SewingDetailsDialog({ record }: { record: any }) {

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr?.slice(0, 5) || '—';
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800">
          <Eye size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 text-white border-zinc-800 max-w-2xl">
        <DialogHeader>
          <div className="flex justify-between items-start pr-4">
            <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Scissors className="text-pink-600" size={24} />
                  <span className="text-pink-500">{record.operation_name}</span>
                </DialogTitle>
                <p className="text-sm text-zinc-500 mt-1">
                  {formatDate(record.date)} в {formatTime(record.time)}
                </p>
            </div>
            <Badge
              variant="outline"
              className={`${
                record.status === 'Проведено'
                  ? 'text-green-400 border-green-700'
                  : 'text-zinc-400 border-zinc-700'
              }`}
            >
              {record.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">

          {/* Документ */}
          <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
            <div className="text-xs text-zinc-500 uppercase mb-1">Номер документа</div>
            <div className="font-mono text-sm text-zinc-300">{record.doc_number}</div>
          </div>

          {/* Швея и Мастер */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
              <div className="text-xs text-zinc-500 uppercase mb-2 flex items-center gap-1">
                <User size={12} /> Швея
              </div>
              <div className="font-bold text-white">{record.seamstress}</div>
            </div>
            <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
              <div className="text-xs text-zinc-500 uppercase mb-2 flex items-center gap-1">
                <User size={12} /> Мастер смены
              </div>
              <div className="font-medium text-white">{record.shift_master || '—'}</div>
            </div>
          </div>

          {/* Операция */}
          <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
            <div className="text-xs text-zinc-500 uppercase mb-2">Операция</div>
            <div className="font-bold text-white text-lg">{record.operation_name}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-zinc-400 border-zinc-700 font-mono text-xs">
                {record.operation_code}
              </Badge>
              <span className="text-xs text-zinc-500">{record.operation_category}</span>
            </div>
          </div>

          {/* Количество и Результаты */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-green-950/30 to-zinc-900 p-4 rounded-lg border border-green-900">
              <div className="text-xs text-zinc-500 uppercase mb-2 flex items-center gap-1">
                <CheckCircle size={14} className="text-green-500" /> Годных изделий
              </div>
              <div className="text-3xl font-bold text-green-400">{record.quantity_good}</div>
            </div>
            <div className="bg-gradient-to-br from-red-950/30 to-zinc-900 p-4 rounded-lg border border-red-900">
              <div className="text-xs text-zinc-500 uppercase mb-2 flex items-center gap-1">
                <XCircle size={14} className="text-red-500" /> Брак
              </div>
              <div className="text-3xl font-bold text-red-400">{record.quantity_defect || 0}</div>
            </div>
          </div>

          {/* Время и Оплата */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
              <div className="text-xs text-zinc-500 uppercase mb-2 flex items-center gap-1">
                <Clock size={12} /> Норма времени
              </div>
              <div className="font-mono text-lg text-white">
                {record.time_norm_minutes ? `${record.time_norm_minutes} мин` : '—'}
              </div>
            </div>
            <div className="bg-gradient-to-br from-pink-950/30 to-zinc-900 p-3 rounded-lg border border-pink-900">
              <div className="text-xs text-zinc-500 uppercase mb-2 flex items-center gap-1">
                <DollarSign size={12} /> К оплате
              </div>
              <div className="font-mono text-2xl font-bold text-pink-400">
                {record.amount_kzt?.toLocaleString('ru-RU')} ₸
              </div>
            </div>
          </div>

          {/* Примечания */}
          {record.notes && (
            <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800">
              <div className="text-xs text-zinc-500 uppercase mb-1">Примечания</div>
              <div className="text-sm text-zinc-300 italic">"{record.notes}"</div>
            </div>
          )}

          {/* Метаданные */}
          <div className="border-t border-zinc-800 pt-3 text-xs text-zinc-600">
            <div className="flex justify-between">
              <span>Создано:</span>
              <span>{new Date(record.created_at).toLocaleString('ru-RU')}</span>
            </div>
            {record.updated_at && (
              <div className="flex justify-between mt-1">
                <span>Обновлено:</span>
                <span>{new Date(record.updated_at).toLocaleString('ru-RU')}</span>
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
