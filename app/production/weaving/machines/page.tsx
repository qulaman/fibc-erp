'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Factory, CheckCircle2, PlayCircle, PlusCircle, Scroll, Ruler, Weight, User, Calendar, Clock, RefreshCw } from 'lucide-react';

interface MachineStatus {
  id: string;
  name: string;
  code: string;
  status: 'free' | 'busy';
  activeRoll?: {
    id: string;
    roll_number: string;
    total_length: number;
    total_weight: number;
    fabric_name: string;
    fabric_code: string;
    started_at: string;
  };
  lastOperator?: {
    name: string;
    shift: string;
  };
}

export default function WeavingMachinesPage() {
  const [machines, setMachines] = useState<MachineStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchMachinesStatus = async () => {
    try {
      // Загружаем все станки ткацкого цеха
      const { data: looms, error: loomsError } = await supabase
        .from('equipment')
        .select('*')
        .or('type.eq.loom,type.eq.weaving,type.eq.loom_round')
        .order('name');

      if (loomsError) throw loomsError;

      // Для каждого станка проверяем есть ли активный рулон
      const machinesStatus: MachineStatus[] = await Promise.all(
        (looms || []).map(async (loom) => {
          // Ищем активный рулон на этом станке
          const { data: activeRoll } = await supabase
            .from('weaving_rolls')
            .select(`
              id,
              roll_number,
              total_length,
              total_weight,
              created_at,
              tkan_specifications (
                nazvanie_tkani,
                kod_tkani
              )
            `)
            .eq('loom_id', loom.id)
            .eq('status', 'active')
            .maybeSingle();

          // Пока убираем получение данных об операторе
          // (можно добавить позже, когда будет нужная таблица)
          let lastOperator = undefined;

          return {
            id: loom.id,
            name: loom.name,
            code: loom.code || '',
            status: activeRoll ? 'busy' : 'free',
            activeRoll: activeRoll ? {
              id: activeRoll.id,
              roll_number: activeRoll.roll_number,
              total_length: activeRoll.total_length,
              total_weight: activeRoll.total_weight,
              fabric_name: (activeRoll.tkan_specifications as any)?.nazvanie_tkani || 'Не указано',
              fabric_code: (activeRoll.tkan_specifications as any)?.kod_tkani || '',
              started_at: activeRoll.created_at
            } : undefined,
            lastOperator
          };
        })
      );

      setMachines(machinesStatus);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching machines status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachinesStatus();

    // Автообновление каждые 60 секунд (снижает нагрузку)
    const interval = setInterval(() => {
      fetchMachinesStatus();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const busyCount = machines.filter(m => m.status === 'busy').length;
  const freeCount = machines.filter(m => m.status === 'free').length;

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
              <div className="bg-amber-600 p-2 rounded-lg">
                <Factory size={24} className="text-white" />
              </div>
              Ткацкий Цех
            </h1>
            <p className="text-zinc-400">Выберите станок для начала работы</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchMachinesStatus()}
              disabled={loading}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors text-white flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Обновить
            </button>
            <div className="text-right">
              <div className="text-xs text-zinc-500 mb-1">Последнее обновление</div>
              <div className="text-sm text-zinc-300 flex items-center gap-2 justify-end">
                <Clock size={14} />
                {lastUpdate.toLocaleTimeString('ru-RU')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* СТАТИСТИКА */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400 mb-1">Всего станков</p>
          <p className="text-3xl font-bold text-white">{machines.length}</p>
        </div>
        <div className="bg-zinc-900 border border-blue-800/50 rounded-lg p-4">
          <p className="text-sm text-blue-400 mb-1">В работе</p>
          <p className="text-3xl font-bold text-blue-400">{busyCount}</p>
        </div>
        <div className="bg-zinc-900 border border-emerald-800/50 rounded-lg p-4">
          <p className="text-sm text-emerald-400 mb-1">Свободны</p>
          <p className="text-3xl font-bold text-emerald-400">{freeCount}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400 mb-1">Загрузка</p>
          <p className="text-3xl font-bold text-amber-400">
            {machines.length > 0 ? Math.round((busyCount / machines.length) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* СЕТКА КАРТОЧЕК СТАНКОВ */}
      {loading ? (
        <div className="text-center py-12 text-zinc-400">
          Загрузка данных...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map((machine) => (
            <div
              key={machine.id}
              className={`
                rounded-xl border-2 overflow-hidden transition-all hover:scale-105
                ${machine.status === 'busy'
                  ? 'bg-gradient-to-br from-blue-950 to-blue-900 border-blue-800 shadow-lg shadow-blue-900/20'
                  : 'bg-gradient-to-br from-emerald-950 to-emerald-900 border-emerald-800 shadow-lg shadow-emerald-900/20'
                }
              `}
            >
              {/* HEADER КАРТОЧКИ */}
              <div className={`p-4 border-b-2 ${machine.status === 'busy' ? 'border-blue-800/50' : 'border-emerald-800/50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      machine.status === 'busy' ? 'bg-blue-600' : 'bg-emerald-600'
                    }`}>
                      <Factory size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{machine.name}</h3>
                      {machine.code && (
                        <p className="text-xs text-zinc-400">{machine.code}</p>
                      )}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${
                    machine.status === 'busy'
                      ? 'bg-blue-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {machine.status === 'busy' ? (
                      <>
                        <PlayCircle size={14} />
                        ЗАНЯТ
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        СВОБОДЕН
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ТЕЛО КАРТОЧКИ */}
              <div className="p-4 space-y-3">
                {machine.status === 'busy' && machine.activeRoll ? (
                  <>
                    {/* Номер рулона */}
                    <div className="flex items-center gap-3 p-3 bg-blue-900/30 rounded-lg border border-blue-800/30">
                      <Scroll size={20} className="text-blue-400" />
                      <div className="flex-1">
                        <div className="text-xs text-blue-300">Рулон в работе</div>
                        <div className="text-base font-bold text-white">{machine.activeRoll.roll_number}</div>
                      </div>
                    </div>

                    {/* Ткань */}
                    <div className="p-3 bg-zinc-900/50 rounded-lg">
                      <div className="text-xs text-zinc-400 mb-1">Ткань</div>
                      <div className="text-sm font-medium text-white">{machine.activeRoll.fabric_name}</div>
                      <div className="text-xs text-zinc-500 mt-1">Код: {machine.activeRoll.fabric_code}</div>
                    </div>

                    {/* Накоплено */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-zinc-900/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Ruler size={14} className="text-zinc-400" />
                          <div className="text-xs text-zinc-400">Длина</div>
                        </div>
                        <div className="text-lg font-bold text-white">{machine.activeRoll.total_length} м</div>
                      </div>
                      <div className="p-3 bg-zinc-900/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Weight size={14} className="text-zinc-400" />
                          <div className="text-xs text-zinc-400">Вес</div>
                        </div>
                        <div className="text-lg font-bold text-white">{machine.activeRoll.total_weight} кг</div>
                      </div>
                    </div>

                    {/* Оператор */}
                    {machine.lastOperator && (
                      <div className="p-3 bg-zinc-900/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <User size={14} className="text-zinc-400" />
                          <div className="text-xs text-zinc-400">Последний оператор</div>
                        </div>
                        <div className="text-sm font-medium text-white">{machine.lastOperator.name}</div>
                        <div className="text-xs text-zinc-500 mt-1">Смена: {machine.lastOperator.shift}</div>
                      </div>
                    )}

                    {/* Начало производства */}
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Calendar size={12} />
                      Начат: {new Date(machine.activeRoll.started_at).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 size={48} className="text-emerald-600 mx-auto mb-3" />
                    <div className="text-lg font-bold text-white mb-1">Станок свободен</div>
                    <div className="text-sm text-zinc-400">Готов к запуску нового рулона</div>
                  </div>
                )}
              </div>

              {/* FOOTER КАРТОЧКИ */}
              <div className="px-4 pb-4">
                <Link
                  href={`/production/weaving/production?machine_id=${machine.id}`}
                  className={`block w-full text-center py-3 text-white font-bold rounded-lg transition-all hover:scale-105 ${
                    machine.status === 'busy'
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/30'
                  }`}
                >
                  {machine.status === 'busy' ? (
                    <span className="flex items-center justify-center gap-2">
                      <PlayCircle size={18} />
                      Продолжить работу
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <PlusCircle size={18} />
                      Начать производство
                    </span>
                  )}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
