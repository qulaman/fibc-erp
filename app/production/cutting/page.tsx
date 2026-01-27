'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface CuttingType {
  id: string;
  code: string;
  category: string;
  name: string;
  material_type: string;
  width_cm: number | null;
  length_cm: number | null;
  consumption_cm: number;
  weight_g: number | null;
}

interface Material {
  roll_number: string;
  material_code: string;
  material_type: string;
  balance_m: number;
}

export default function ProductionCuttingPage() {

  const [materialCategory, setMaterialCategory] = useState<'fabric' | 'strap'>('fabric');
  const [shift, setShift] = useState<'День' | 'Ночь'>('День');
  const [operator, setOperator] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedCuttingType, setSelectedCuttingType] = useState<CuttingType | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [waste, setWaste] = useState<number>(0);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [cuttingTypes, setCuttingTypes] = useState<CuttingType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch available materials based on category
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        let data: Material[] = [];

        if (materialCategory === 'fabric') {
          // Fetch from weaving_rolls (ткацкий цех) and laminated_rolls (ламинация)
          const [weavingRes, laminatedRes] = await Promise.all([
            supabase
              .from('weaving_rolls')
              .select('*, tkan_specifications(kod_tkani, nazvanie_tkani)')
              .eq('status', 'completed'),
            supabase
              .from('laminated_rolls')
              .select('*, weaving_rolls(roll_number, tkan_specifications(kod_tkani, nazvanie_tkani))')
              .eq('status', 'available')
          ]);

          if (weavingRes.error) {
            console.error('Error fetching weaving rolls:', weavingRes.error);
          }
          if (laminatedRes.error) {
            console.error('Error fetching laminated rolls:', laminatedRes.error);
          }

          const weaving = (weavingRes.data || []).map(r => ({
            roll_number: r.roll_number || '',
            material_code: r.tkan_specifications?.kod_tkani || '',
            material_type: 'Ткань',
            balance_m: r.total_length || 0
          }));

          const laminated = (laminatedRes.data || []).map(r => ({
            roll_number: r.roll_number || '',
            material_code: r.weaving_rolls?.tkan_specifications?.kod_tkani || '',
            material_type: 'Ламинат',
            balance_m: r.length || 0
          }));

          data = [...weaving, ...laminated];
        } else {
          // Fetch from straps_warehouse (склад строп)
          const { data: straps, error } = await supabase
            .from('straps_warehouse')
            .select('*, strap_types(code, name)')
            .eq('status', 'available');

          if (error) {
            console.error('Error fetching straps:', error);
          }

          data = (straps || []).map(s => ({
            roll_number: s.roll_number || '',
            material_code: s.strap_types?.code || '',
            material_type: 'Стропа',
            balance_m: s.length_m || 0
          }));
        }

        setMaterials(data.filter(m => m.balance_m > 0));
      } catch (err) {
        console.error('Error fetching materials:', err);
      }
    };

    fetchMaterials();
  }, [materialCategory]);

  // Fetch cutting types based on material category
  useEffect(() => {
    const fetchCuttingTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('cutting_types')
          .select('*')
          .eq('status', 'Активно');

        if (error) throw error;

        // Filter by material category
        const filtered = (data || []).filter(ct => {
          if (materialCategory === 'fabric') {
            return ['Ткань', 'Ткань/Ламинат', 'Ламинат'].includes(ct.material_type);
          } else {
            return ct.material_type === 'Стропа';
          }
        });

        setCuttingTypes(filtered);
      } catch (err) {
        console.error('Error fetching cutting types:', err);
      }
    };

    fetchCuttingTypes();
  }, [materialCategory, supabase]);

  // Calculate consumption in meters
  const calculatedConsumption = selectedCuttingType
    ? (selectedCuttingType.consumption_cm * quantity) / 100
    : 0;

  const totalUsed = calculatedConsumption + waste;
  const totalWeight = selectedCuttingType && selectedCuttingType.weight_g
    ? (selectedCuttingType.weight_g * quantity) / 1000
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!operator || !selectedMaterial || !selectedCuttingType || quantity <= 0) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (totalUsed > selectedMaterial.balance_m) {
      setError(`Недостаточно материала. Доступно: ${selectedMaterial.balance_m.toFixed(2)} м`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');

      // Generate document number
      const { data: lastDoc } = await supabase
        .from('production_cutting')
        .select('doc_number')
        .like('doc_number', `ПРВ-${dateStr}-%`)
        .order('doc_number', { ascending: false })
        .limit(1);

      const lastNum = lastDoc && lastDoc.length > 0
        ? parseInt(lastDoc[0].doc_number.split('-')[2])
        : 0;
      const docNumber = `ПРВ-${dateStr}-${String(lastNum + 1).padStart(4, '0')}`;

      // Insert production record
      const { error: prodError } = await supabase
        .from('production_cutting')
        .insert({
          doc_number: docNumber,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          shift,
          operator,
          roll_number: selectedMaterial.roll_number,
          material_type: selectedMaterial.material_type,
          material_code: selectedMaterial.material_code,
          total_used_m: totalUsed,
          cutting_type_category: selectedCuttingType.category,
          cutting_type_code: selectedCuttingType.code,
          cutting_type_name: selectedCuttingType.name,
          quantity,
          consumption_m: calculatedConsumption,
          waste_m: waste,
          total_weight_kg: totalWeight,
          status: 'Проведено'
        });

      if (prodError) throw prodError;

      // Insert warehouse receipt
      const { error: warehouseError } = await supabase
        .from('cutting_parts_warehouse')
        .insert({
          doc_number: docNumber,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          operation: 'Приход',
          cutting_type_code: selectedCuttingType.code,
          cutting_type_name: selectedCuttingType.name,
          category: selectedCuttingType.category,
          quantity,
          source_number: selectedMaterial.roll_number,
          operator,
          status: 'Проведено'
        });

      if (warehouseError) throw warehouseError;

      // Write off material - update roll length based on type
      if (selectedMaterial.material_type === 'Ткань') {
        // Update weaving_rolls - decrease total_length
        const newLength = selectedMaterial.balance_m - totalUsed;
        const { error: writeOffError } = await supabase
          .from('weaving_rolls')
          .update({
            total_length: newLength > 0 ? newLength : 0,
            status: newLength <= 0 ? 'used' : 'completed'
          })
          .eq('roll_number', selectedMaterial.roll_number);

        if (writeOffError) throw writeOffError;

      } else if (selectedMaterial.material_type === 'Ламинат') {
        // Update laminated_rolls - decrease length
        const newLength = selectedMaterial.balance_m - totalUsed;
        const { error: writeOffError } = await supabase
          .from('laminated_rolls')
          .update({
            length: newLength > 0 ? newLength : 0,
            status: newLength <= 0 ? 'used' : 'available'
          })
          .eq('roll_number', selectedMaterial.roll_number);

        if (writeOffError) throw writeOffError;

      } else {
        // Update straps_warehouse - decrease length
        const newLength = selectedMaterial.balance_m - totalUsed;
        const { error: writeOffError } = await supabase
          .from('straps_warehouse')
          .update({
            length: newLength > 0 ? newLength : 0,
            status: newLength <= 0 ? 'used' : 'available'
          })
          .eq('roll_number', selectedMaterial.roll_number);

        if (writeOffError) throw writeOffError;
      }

      setSuccess(`Операция кроя успешно проведена! Документ: ${docNumber}`);

      // Reset form
      setSelectedMaterial(null);
      setSelectedCuttingType(null);
      setQuantity(0);
      setWaste(0);

    } catch (err: any) {
      setError(`Ошибка при проведении операции: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Производство кроя</h1>
        <p className="text-zinc-400">Раскрой ткани, ламината и строп на детали</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-500">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Material Category Toggle */}
        <div>
          <label className="block text-sm font-medium mb-3">Тип материала</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMaterialCategory('fabric')}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                materialCategory === 'fabric'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Ткань / Ламинат
            </button>
            <button
              type="button"
              onClick={() => setMaterialCategory('strap')}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                materialCategory === 'strap'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Стропа
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shift */}
          <div>
            <label className="block text-sm font-medium mb-2">Смена *</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value as 'День' | 'Ночь')}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="День">День</option>
              <option value="Ночь">Ночь</option>
            </select>
          </div>

          {/* Operator */}
          <div>
            <label className="block text-sm font-medium mb-2">Оператор *</label>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Введите имя оператора"
            />
          </div>

          {/* Material Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Материал *</label>
            <select
              value={selectedMaterial?.roll_number || ''}
              onChange={(e) => {
                const material = materials.find(m => m.roll_number === e.target.value);
                setSelectedMaterial(material || null);
              }}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Выберите материал</option>
              {materials.map(m => (
                <option key={m.roll_number} value={m.roll_number}>
                  {m.roll_number} - {m.material_type} ({m.balance_m.toFixed(2)} м)
                </option>
              ))}
            </select>
          </div>

          {/* Cutting Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Тип детали *</label>
            <select
              value={selectedCuttingType?.code || ''}
              onChange={(e) => {
                const type = cuttingTypes.find(ct => ct.code === e.target.value);
                setSelectedCuttingType(type || null);
              }}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Выберите тип детали</option>
              {cuttingTypes.map(ct => (
                <option key={ct.code} value={ct.code}>
                  {ct.code} - {ct.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium mb-2">Количество (шт) *</label>
            <input
              type="number"
              value={quantity || ''}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              min="1"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          {/* Waste */}
          <div>
            <label className="block text-sm font-medium mb-2">Отходы (м)</label>
            <input
              type="number"
              value={waste || ''}
              onChange={(e) => setWaste(parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Calculations Display */}
        {selectedCuttingType && quantity > 0 && (
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Расчет</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-zinc-400">Расход на деталь</p>
                <p className="text-xl font-semibold">{selectedCuttingType.consumption_cm} см</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Расход материала</p>
                <p className="text-xl font-semibold">{calculatedConsumption.toFixed(2)} м</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Всего израсходовано</p>
                <p className="text-xl font-semibold">{totalUsed.toFixed(2)} м</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Общий вес</p>
                <p className="text-xl font-semibold">{totalWeight.toFixed(2)} кг</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {loading ? 'Проведение...' : 'Провести операцию'}
          </button>
        </div>
      </form>
    </div>
  );
}
