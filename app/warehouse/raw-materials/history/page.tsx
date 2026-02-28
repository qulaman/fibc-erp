'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Trash2, CheckSquare, Square, XSquare } from "lucide-react";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export default function HistoryPage() {
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select(`
        *,
        raw_materials (name, unit)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Ошибка загрузки: ' + error.message);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Удалить ${selectedIds.size} операций?\n\nЭто действие нельзя отменить! Остатки на складе будут пересчитаны.`)) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('inventory_transactions')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`Удалено операций: ${selectedIds.size}`);
      setSelectedIds(new Set());
      fetchTransactions();
    } catch (err: any) {
      toast.error('Ошибка удаления: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const allSelected = transactions.length > 0 && selectedIds.size === transactions.length;

  return (
    <div className="page-container max-w-[100vw] overflow-x-hidden p-3 md:p-6">
      <div className="page-header">
        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/warehouse/raw-materials">
            <Button variant="outline" size="icon" className="text-black bg-white hover:bg-gray-200 h-9 w-9 md:h-10 md:w-10">
              <ArrowLeft size={18} className="md:hidden" />
              <ArrowLeft size={20} className="hidden md:block" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2 md:gap-3">
              <div className="bg-green-600 p-1.5 md:p-2 rounded-lg">
                <FileText size={18} className="text-white md:hidden" />
                <FileText size={24} className="text-white hidden md:block" />
              </div>
              <span className="hidden sm:inline">Журнал операций склада сырья</span>
              <span className="sm:hidden">Журнал операций</span>
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 mt-1">Полная история движений по складу</p>
          </div>
        </div>
      </div>

      {/* Панель действий при выделении */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-red-950/50 border border-red-800 rounded-lg px-4 py-3">
          <span className="text-sm text-red-300 font-medium">
            Выбрано: {selectedIds.size}
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Снять выделение
          </button>
          <div className="flex-grow" />
          <Button
            onClick={handleDeleteSelected}
            disabled={isDeleting}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 size={14} className="mr-1" />
            {isDeleting ? 'Удаление...' : 'Удалить выбранные'}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-zinc-400">Загрузка...</div>
      ) : (
        <div className="bg-zinc-900 text-white shadow-xl rounded-lg overflow-hidden border border-zinc-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800">
              <thead className="bg-zinc-800">
                <tr>
                  {isAdmin && (
                    <th className="px-2 md:px-3 py-3 md:py-4 text-center w-10">
                      <button onClick={toggleAll} className="text-zinc-400 hover:text-white transition-colors">
                        {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </th>
                  )}
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-bold text-zinc-400 uppercase">Дата</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-bold text-zinc-400 uppercase hidden sm:table-cell">Документ</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-bold text-zinc-400 uppercase">Тип</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-bold text-zinc-400 uppercase">Сырье</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-right text-[10px] md:text-xs font-bold text-zinc-400 uppercase">Кол-во</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-bold text-zinc-400 uppercase hidden lg:table-cell">Партия</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-bold text-zinc-400 uppercase hidden md:table-cell">Контрагент</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-xs md:text-sm">
                {transactions.map((item: any) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-zinc-800/50 transition-colors ${isSelected ? 'bg-red-950/30' : ''}`}
                      onClick={() => isAdmin && toggleSelect(item.id)}
                    >
                      {isAdmin && (
                        <td className="px-2 md:px-3 py-2.5 md:py-4 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                            className="text-zinc-500 hover:text-white transition-colors"
                          >
                            {isSelected ? <CheckSquare size={16} className="text-red-400" /> : <Square size={16} />}
                          </button>
                        </td>
                      )}
                      <td className="px-3 md:px-6 py-2.5 md:py-4 whitespace-nowrap text-zinc-300 text-[11px] md:text-sm">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-3 md:px-6 py-2.5 md:py-4 whitespace-nowrap font-mono text-[10px] md:text-xs text-zinc-500 hidden sm:table-cell">
                        {item.doc_number}
                      </td>
                      <td className="px-3 md:px-6 py-2.5 md:py-4 whitespace-nowrap">
                        {item.type === 'in' ? (
                          <span className="inline-flex items-center px-1.5 md:px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-green-900 text-green-200">
                            <span className="hidden md:inline">📥 </span>Приход
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 md:px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-red-900 text-red-200">
                            <span className="hidden md:inline">📤 </span>Расход
                          </span>
                        )}
                      </td>
                      <td className="px-3 md:px-6 py-2.5 md:py-4 font-medium text-[11px] md:text-sm max-w-[120px] md:max-w-none truncate">
                        {item.raw_materials?.name || 'Удалено'}
                      </td>
                      <td className={`px-3 md:px-6 py-2.5 md:py-4 whitespace-nowrap text-right font-bold text-[11px] md:text-sm ${item.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                        {item.type === 'in' ? '+' : '-'}{item.quantity} {item.raw_materials?.unit}
                      </td>
                      <td className="px-3 md:px-6 py-2.5 md:py-4 whitespace-nowrap text-zinc-400 font-mono text-[10px] md:text-xs hidden lg:table-cell">
                        {item.batch_number || '-'}
                      </td>
                      <td className="px-3 md:px-6 py-2.5 md:py-4 whitespace-nowrap text-zinc-300 text-[11px] md:text-sm hidden md:table-cell">
                        {item.counterparty}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
