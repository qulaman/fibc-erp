'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Scissors, Scale, Calendar, Scroll, User } from "lucide-react";

export default function WeavingHistoryPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    // Новый запрос, соответствующий структуре Parent-Child
    const { data, error } = await supabase
      .from('production_weaving')
      .select(`
        *,
        employees (full_name),
        weaving_rolls (
          roll_number,
          status,
          total_length,
          total_weight,
          equipment (name),
          tkan_specifications (nazvanie_tkani, kod_tkani)
        )
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
        console.error("Ошибка загрузки истории:", error);
    }

    if (data) setRecords(data);
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-amber-600 p-2 rounded-lg">
              <History size={24} className="text-white"/>
            </div>
            Журнал Ткачества
          </h1>
          <p className="page-description">Журнал сменных отчетов (Shift Log)</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-zinc-500 py-10">Загрузка данных...</div>
      ) : (
        <div className="grid gap-4">
          {records.length === 0 ? (
             <div className="text-zinc-500">История пуста</div>
          ) : (
             records.map(record => {
               // Для удобства сократим доступ к вложенным объектам
               const roll = record.weaving_rolls;
               const loomName = roll?.equipment?.name || 'Неизвестный станок';
               const fabricName = roll?.tkan_specifications?.nazvanie_tkani || 'Неизвестная ткань';

               return (
                <Card key={record.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                          <Scissors size={18} className="text-blue-500"/>
                          {fabricName}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1 text-sm text-zinc-400">
                           <Calendar size={14}/> 
                           <span>{new Date(record.date).toLocaleDateString('ru-RU')}</span>
                           <span className="text-zinc-600">|</span>
                           <span>{record.shift === 'День' ? '☀️ День' : '🌙 Ночь'}</span>
                           <span className="text-zinc-600">|</span>
                           <span className="text-zinc-300 font-medium">{record.doc_number}</span>
                        </div>
                      </div>
                      {roll && (
                        <Badge variant="outline" className={roll.status === 'completed' ? 'text-green-400 border-green-900 bg-green-900/10' : 'text-blue-400 border-blue-900 bg-blue-900/10'}>
                          {roll.status === 'completed' ? 'Рулон Завершен' : 'В работе'}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8 text-sm bg-zinc-950/50 p-4 rounded-lg border border-zinc-800/50">
                      
                      {/* 1. Станок */}
                      <div>
                        <p className="text-zinc-500 flex items-center gap-1 mb-1"><Scroll size={12}/> Станок</p>
                        <p className="text-white font-bold">{loomName}</p>
                      </div>

                      {/* 2. Оператор */}
                      <div>
                        <p className="text-zinc-500 flex items-center gap-1 mb-1"><User size={12}/> Ткач</p>
                        <p className="text-white">{record.employees?.full_name || '-'}</p>
                      </div>

                      {/* 3. Выработка за смену */}
                      <div>
                        <p className="text-zinc-500 mb-1 text-blue-400">Выработка за смену</p>
                        <p className="text-white font-mono text-lg font-bold">
                           +{record.produced_length} м
                        </p>
                        {record.produced_weight > 0 && <span className="text-xs text-zinc-500">({record.produced_weight} кг)</span>}
                      </div>

                      {/* 4. Инфо о рулоне */}
                      <div>
                        <p className="text-zinc-500 mb-1">Рулон (Накопительно)</p>
                        <div className="flex flex-col">
                           <span className="text-white font-mono font-medium">{roll?.roll_number}</span>
                           <span className="text-xs text-zinc-500">Всего: {roll?.total_length} м</span>
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>
               )
             })
          )}
        </div>
      )}
    </div>
  );
}