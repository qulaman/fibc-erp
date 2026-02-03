'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scroll, ArrowLeft, ArrowRight, Package } from "lucide-react";

interface CuttingRoll {
  id: string;
  roll_number: string;
  balance_m: number;
  balance_kg: number;
  fabric_code: string;
  fabric_name: string;
  fabric_width_cm: number;
  status: string;
  created_at: string;
  material_type?: 'Ткань' | 'Ламинат';
  location?: string;
}

export default function CuttingRollsPage() {
  const [rolls, setRolls] = useState<CuttingRoll[]>([]);
  const [availableRolls, setAvailableRolls] = useState<CuttingRoll[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRolls();
    fetchAvailableRolls();
  }, []);

  const fetchRolls = async () => {
    // Загружаем рулоны ткани в крое
    const { data: fabricRolls } = await supabase
      .from('cutting_rolls_available')
      .select('*')
      .order('created_at', { ascending: false });

    // Загружаем ламинированные рулоны, которые уже в крое
    const { data: laminatedRolls } = await supabase
      .from('laminated_rolls')
      .select('*')
      .eq('status', 'available')
      .eq('location', 'cutting') // Только те, что уже в крое
      .gt('length', 0)
      .order('created_at', { ascending: false });

    const fabricData = (fabricRolls || []).map(r => ({
      ...r,
      material_type: 'Ткань' as const
    }));

    const laminatedData = (laminatedRolls || []).map((r: any) => ({
      id: r.id,
      roll_number: r.roll_number,
      balance_m: r.length,
      balance_kg: r.weight,
      fabric_code: r.material_code || '',
      fabric_name: 'Ламинированная ткань',
      fabric_width_cm: 0,
      status: r.status,
      created_at: r.created_at,
      location: 'available',
      material_type: 'Ламинат' as const
    }));

    setRolls([...fabricData, ...laminatedData]);
  };

  const fetchAvailableRolls = async () => {
    // 1. Рулоны ткани на складе ткачества (готовые к переносу)
    const { data: weavingData } = await supabase
      .from('weaving_rolls')
      .select('*, tkan_specifications(kod_tkani, nazvanie_tkani, shirina_polotna_sm)')
      .eq('location', 'weaving')
      .eq('status', 'completed')
      .gt('total_length', 0)
      .order('created_at', { ascending: false });

    // 2. Ламинированные рулоны на складе ламинации (готовые к переносу)
    const { data: laminatedData } = await supabase
      .from('laminated_rolls')
      .select('*')
      .eq('location', 'lamination') // Только со склада ламинации
      .eq('status', 'available')
      .gt('length', 0)
      .order('created_at', { ascending: false });

    const fabricRolls = (weavingData || []).map((r: any) => ({
      id: r.id,
      roll_number: r.roll_number,
      balance_m: r.total_length,
      balance_kg: r.total_weight,
      fabric_code: r.tkan_specifications?.kod_tkani || '',
      fabric_name: r.tkan_specifications?.nazvanie_tkani || '',
      fabric_width_cm: r.tkan_specifications?.shirina_polotna_sm || 0,
      status: r.status,
      created_at: r.created_at,
      material_type: 'Ткань' as const
    }));

    const laminatedRolls = (laminatedData || []).map((r: any) => ({
      id: r.id,
      roll_number: r.roll_number,
      balance_m: r.length,
      balance_kg: r.weight,
      fabric_code: r.material_code || '',
      fabric_name: 'Ламинированная ткань',
      fabric_width_cm: 0,
      status: r.status,
      created_at: r.created_at,
      material_type: 'Ламинат' as const
    }));

    setAvailableRolls([...fabricRolls, ...laminatedRolls]);
  };

  const moveRollToCutting = async (rollId: string) => {
    setLoading(true);
    try {
      // Определяем тип рулона (ткань или ламинат)
      const roll = availableRolls.find(r => r.id === rollId);
      if (!roll) {
        throw new Error('Рулон не найден');
      }

      const rpcFunction = roll.material_type === 'Ламинат'
        ? 'move_laminated_roll_to_cutting'
        : 'move_roll_to_cutting';

      const { data, error } = await supabase
        .rpc(rpcFunction, { p_roll_id: rollId });

      if (error) throw error;

      if (data.success) {
        alert(`✅ ${data.message}\nРулон: ${data.roll_number}`);
        fetchRolls();
        fetchAvailableRolls();
      } else {
        alert(`❌ ${data.error}`);
      }
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const returnRollToWarehouse = async (rollId: string, rollType: 'Ткань' | 'Ламинат') => {
    const warehouseName = rollType === 'Ткань' ? 'склад ткачества' : 'склад ламинации';
    if (!confirm(`Вернуть рулон на ${warehouseName}?`)) return;

    setLoading(true);
    try {
      const rpcFunction = rollType === 'Ламинат'
        ? 'return_laminated_roll_to_lamination'
        : 'return_roll_to_weaving';

      const { data, error } = await supabase
        .rpc(rpcFunction, { p_roll_id: rollId });

      if (error) throw error;

      if (data.success) {
        alert('✅ ' + data.message);
        fetchRolls();
        fetchAvailableRolls();
      } else {
        alert('❌ ' + data.error);
      }
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="h1-bold flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Package size={24} className="text-white" />
            </div>
            Рулоны в кроечном цехе
          </h1>
          <p className="page-description">
            Управление рулонами ткани в кроечном цехе
          </p>
        </div>
      </div>

      {/* Рулоны в крое */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Текущие рулоны в крое ({rolls.length})
        </h2>

        {rolls.length === 0 ? (
          <div className="text-center py-12 bg-zinc-800/30 rounded-lg border border-zinc-700">
            <Scroll size={48} className="mx-auto mb-4 text-zinc-500" />
            <p className="text-zinc-400 text-lg">Нет рулонов в кроечном цехе</p>
            <p className="text-zinc-500 text-sm mt-2">
              Перенесите рулоны из ткачества, используя кнопки ниже
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rolls.map(roll => (
              <Card key={roll.id} className="bg-blue-900/20 border-blue-700 hover:border-blue-600 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Scroll className="text-blue-400" size={20} />
                    <span className="font-mono">{roll.roll_number}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-xs text-zinc-400">Ткань:</span>
                    <div className="font-semibold text-white mt-1">{roll.fabric_name}</div>
                    <div className="text-xs text-zinc-500 font-mono">{roll.fabric_code}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-zinc-800/50 p-2 rounded">
                      <span className="text-zinc-400 text-xs">Остаток:</span>
                      <div className="font-bold text-green-400">
                        {roll.balance_m.toFixed(2)} м
                      </div>
                    </div>
                    <div className="bg-zinc-800/50 p-2 rounded">
                      <span className="text-zinc-400 text-xs">Вес:</span>
                      <div className="font-bold text-white">
                        {roll.balance_kg.toFixed(2)} кг
                      </div>
                    </div>
                  </div>

                  {roll.fabric_width_cm > 0 && (
                    <div className="text-xs text-zinc-400">
                      Ширина: {roll.fabric_width_cm} см
                    </div>
                  )}

                  {/* Кнопка "Вернуть на склад" для всех типов рулонов */}
                  {(roll.material_type === 'Ткань' || roll.material_type === 'Ламинат') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 border-blue-700 hover:bg-blue-950"
                      onClick={() => returnRollToWarehouse(roll.id, roll.material_type as 'Ткань' | 'Ламинат')}
                      disabled={loading}
                    >
                      <ArrowLeft size={16} className="mr-2" />
                      Вернуть на склад
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Доступные рулоны для переноса */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Доступно на складе ткачества ({availableRolls.length})
        </h2>

        {availableRolls.length === 0 ? (
          <div className="text-center py-12 bg-zinc-800/30 rounded-lg border border-zinc-700">
            <p className="text-zinc-400">Нет доступных рулонов на складе ткачества</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableRolls.map(roll => (
              <Card key={roll.id} className="bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Scroll className="text-zinc-400" size={20} />
                    <span className="font-mono">{roll.roll_number}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-xs text-zinc-400">Ткань:</span>
                    <div className="font-semibold text-white mt-1">{roll.fabric_name}</div>
                    <div className="text-xs text-zinc-500 font-mono">{roll.fabric_code}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-zinc-900/50 p-2 rounded">
                      <span className="text-zinc-400 text-xs">Доступно:</span>
                      <div className="font-bold text-white">
                        {roll.balance_m.toFixed(2)} м
                      </div>
                    </div>
                    <div className="bg-zinc-900/50 p-2 rounded">
                      <span className="text-zinc-400 text-xs">Вес:</span>
                      <div className="font-bold text-white">
                        {roll.balance_kg.toFixed(2)} кг
                      </div>
                    </div>
                  </div>

                  {roll.fabric_width_cm > 0 && (
                    <div className="text-xs text-zinc-400">
                      Ширина: {roll.fabric_width_cm} см
                    </div>
                  )}

                  <Button
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                    onClick={() => moveRollToCutting(roll.id)}
                    disabled={loading}
                  >
                    <ArrowRight size={16} className="mr-2" />
                    Взять в крой
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
