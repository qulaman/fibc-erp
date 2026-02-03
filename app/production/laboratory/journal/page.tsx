'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Filter } from 'lucide-react';

interface LabTest {
  id: string;
  created_at: string;
  doc_number: string;
  test_type: string;
  operator: string;
  result: string;
  notes: string;
  test_data: Record<string, string | number>;
}

const TEST_TYPES = [
  { value: 'yarn', label: 'Нить' },
  { value: 'extruder', label: 'Экструдер' },
  { value: 'machine', label: 'Станки КТС' },
  { value: 'fabric', label: 'Ткань КТС' },
  { value: 'strap', label: 'Стропы ПТС' },
  { value: 'lamination', label: 'Ламинация' },
  { value: 'mfi', label: 'ПТР Сырья' },
];

const LABELS: Record<string, string> = {
  yarn_code: 'Код нити', batch: 'Партия', denier: 'Денье',
  strength: 'Прочность', elasticity: 'Эластичность', width: 'Ширина',
  shift: 'Смена', machine: 'Станок',
  temp1: 'Т°1', temp2: 'Т°2', temp3: 'Т°3', temp4: 'Т°4', temp5: 'Т°5',
  annealing: 'Отжиг',
  d1: 'Дозатор 1', d2: 'Дозатор 2', d3: 'Дозатор 3', d4: 'Дозатор 4', d5: 'Дозатор 5', d6: 'Дозатор 6',
  machine_number: '№ станка', visual_check: 'Визуальный осмотр', defects: 'Дефекты',
  roll_number: '№ рулона', fabric_code: 'Код ткани',
  warp_strength_kg: 'Осн. прочн. кг', warp_strength_n: 'Осн. прочн. Н', warp_elasticity: 'Осн. эласт.',
  weft_strength_kg: 'Уток прочн. кг', weft_strength_n: 'Уток прочн. Н', weft_elasticity: 'Уток эласт.',
  density: 'Плотность',
  batch_number: '№ партии', strap_type: 'Тип стропы',
  tension_kg: 'Натяжение кг', tension_n: 'Натяжение Н',
  roll_info: 'Информация рулона', adhesion: 'Адгезия',
  material_type: 'Тип материала', material_code: 'Код материала',
  mfi: 'ПТР', temperature: 'Температура', load: 'Нагрузка',
};

export default function LaboratoryJournalPage() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [filterType, setFilterType] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    fetchTests();
  }, [filterType, filterResult, filterDateFrom, filterDateTo]);

  const fetchTests = async () => {
    let query = supabase
      .from('lab_tests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (filterType) query = query.eq('test_type', filterType);
    if (filterResult) query = query.eq('result', filterResult);
    if (filterDateFrom) query = query.gte('created_at', filterDateFrom);
    if (filterDateTo) query = query.lte('created_at', filterDateTo + 'T23:59:59');

    const { data } = await query;
    setTests(data || []);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить запись?')) return;
    await supabase.from('lab_tests').delete().eq('id', id);
    fetchTests();
  };

  const getTestTypeLabel = (value: string) => TEST_TYPES.find((t) => t.value === value)?.label || value;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Журнал испытаний</h1>

      {/* Filters */}
      <Card className="mb-6 bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Тип испытания</Label>
              <Select value={filterType || undefined} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Все типы" />
                </SelectTrigger>
                <SelectContent>
                  {TEST_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filterType && (
                <Button variant="ghost" size="sm" onClick={() => setFilterType('')} className="mt-1 h-6 text-xs">Сбросить</Button>
              )}
            </div>
            <div>
              <Label>Результат</Label>
              <Select value={filterResult || undefined} onValueChange={setFilterResult}>
                <SelectTrigger>
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Годен">Годен</SelectItem>
                  <SelectItem value="Брак">Брак</SelectItem>
                </SelectContent>
              </Select>
              {filterResult && (
                <Button variant="ghost" size="sm" onClick={() => setFilterResult('')} className="mt-1 h-6 text-xs">Сбросить</Button>
              )}
            </div>
            <div>
              <Label>Дата с</Label>
              <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>Дата по</Label>
              <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journal table */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardContent className="pt-6">
          {tests.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">Нет записей</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="text-left py-3 pr-4 font-medium">№ Документа</th>
                    <th className="text-left py-3 pr-4 font-medium">Дата</th>
                    <th className="text-left py-3 pr-4 font-medium">Тип</th>
                    <th className="text-left py-3 pr-4 font-medium">Оператор</th>
                    <th className="text-left py-3 pr-4 font-medium">Параметры</th>
                    <th className="text-left py-3 pr-4 font-medium">Результат</th>
                    <th className="text-left py-3 font-medium">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((entry) => (
                    <tr key={entry.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 pr-4 text-blue-400 font-medium whitespace-nowrap">{entry.doc_number}</td>
                      <td className="py-3 pr-4 text-zinc-400 whitespace-nowrap">{new Date(entry.created_at).toLocaleDateString('ru-RU')}</td>
                      <td className="py-3 pr-4 text-zinc-300 whitespace-nowrap">{getTestTypeLabel(entry.test_type)}</td>
                      <td className="py-3 pr-4 text-zinc-400">{entry.operator || '—'}</td>
                      <td className="py-3 pr-4 text-zinc-300 max-w-[280px]">
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {Object.entries(entry.test_data).map(
                            ([key, value]) =>
                              value !== '' && value !== 0 && (
                                <span key={key}>
                                  <span className="text-zinc-500">{LABELS[key] || key}:</span>{' '}
                                  <span>{value}</span>
                                </span>
                              ),
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-zinc-500 mt-0.5">{entry.notes}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entry.result === 'Годен' ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300'}`}>
                          {entry.result}
                        </span>
                      </td>
                      <td className="py-3">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)} className="text-red-400 hover:text-red-300 p-1 h-auto">
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
