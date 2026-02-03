'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  id?: string;  // Добавить ID для связи
  roll_number: string;
  material_code: string;
  material_type: string;
  balance_m: number;
}

interface Employee {
  id: string;
  full_name: string;
  role: string;
}

export default function ProductionCuttingPage() {

  const [materialCategory, setMaterialCategory] = useState<'fabric' | 'strap'>('fabric');
  const [shift, setShift] = useState<'День' | 'Ночь'>('День');
  const [operator, setOperator] = useState('');  // Старое поле для совместимости
  const [operatorId, setOperatorId] = useState('');  // Новое поле - ID оператора
  const [operators, setOperators] = useState<Employee[]>([]);  // Список операторов
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedCuttingType, setSelectedCuttingType] = useState<CuttingType | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [waste, setWaste] = useState<number>(0);

  // Режим выбора размеров
  const [sizeMode, setSizeMode] = useState<'catalog' | 'custom'>('catalog');
  const [customWidth, setCustomWidth] = useState('');
  const [customLength, setCustomLength] = useState('');
  const [customConsumption, setCustomConsumption] = useState('');

  const [materials, setMaterials] = useState<Material[]>([]);
  const [cuttingTypes, setCuttingTypes] = useState<CuttingType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Загрузка операторов кроя
  useEffect(() => {
    const fetchOperators = async () => {
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('role', 'operator_cutting')
        .eq('is_active', true)
        .order('full_name');
      if (data) setOperators(data);
    };
    fetchOperators();
  }, []);

  // Fetch available materials based on category
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        let data: Material[] = [];

        if (materialCategory === 'fabric') {
          // Загружаем ВСЕ доступные рулоны ткани (и на ткачестве, и в крое)
          const { data: weavingRolls } = await supabase
            .from('weaving_rolls')
            .select('*, tkan_specifications(kod_tkani, nazvanie_tkani)')
            .eq('status', 'completed')
            .in('location', ['weaving', 'cutting'])  // Доступны рулоны на ткачестве и в крое
            .gt('total_length', 0)
            .order('created_at', { ascending: false });

          const fabricData = (weavingRolls || []).map(r => ({
            id: r.id,
            roll_number: r.roll_number || '',
            material_code: r.tkan_specifications?.kod_tkani || '',
            material_type: 'Ткань',
            balance_m: r.total_length || 0
          }));

          // Загружаем ламинированные рулоны (доступные на складе или уже в крое)
          const { data: laminatedRolls } = await supabase
            .from('laminated_rolls')
            .select('*')
            .eq('status', 'available')
            .in('location', ['lamination', 'cutting']) // Берем со склада ламинации или уже в крое
            .gt('length', 0)
            .order('created_at', { ascending: false });

          const laminatedData = (laminatedRolls || []).map(r => ({
            id: r.id,
            roll_number: r.roll_number || '',
            material_code: r.material_code || '',
            material_type: 'Ламинат',
            balance_m: r.length || 0
          }));

          data = [...fabricData, ...laminatedData];
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

    // Валидация в зависимости от режима
    if (!operator || !selectedMaterial || quantity <= 0) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (sizeMode === 'catalog' && !selectedCuttingType) {
      setError('Пожалуйста, выберите тип кроя из справочника');
      return;
    }

    if (sizeMode === 'custom') {
      if (!customLength || !customConsumption || parseFloat(customLength) <= 0 || parseFloat(customConsumption) <= 0) {
        setError('Пожалуйста, укажите корректные размеры');
        return;
      }
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

      // Определяем значения в зависимости от режима
      const cuttingTypeCategory = sizeMode === 'catalog' && selectedCuttingType ? selectedCuttingType.category : 'Произвольный';
      const cuttingTypeCode = sizeMode === 'catalog' && selectedCuttingType ? selectedCuttingType.code : 'CUSTOM';
      const cuttingTypeName = sizeMode === 'catalog' && selectedCuttingType ? selectedCuttingType.name : 'Произвольные размеры';

      // Insert production record с новыми полями
      const { data: prodData, error: prodError } = await supabase
        .from('production_cutting')
        .insert({
          doc_number: docNumber,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          shift,
          operator,
          operator_id: operatorId || null,  // Новое поле UUID
          roll_number: selectedMaterial.roll_number,
          roll_id: selectedMaterial.material_type === 'Ткань' ? (selectedMaterial.id || null) : null,  // UUID только для ткани
          material_type: selectedMaterial.material_type,
          material_code: selectedMaterial.material_code,
          total_used_m: totalUsed,
          cutting_type_category: cuttingTypeCategory,
          cutting_type_code: cuttingTypeCode,
          cutting_type_name: cuttingTypeName,
          quantity,
          consumption_m: calculatedConsumption,
          waste_m: waste,
          total_weight_kg: totalWeight,
          is_custom_size: sizeMode === 'custom',  // Новое поле
          status: 'Проведено'
        })
        .select()
        .single();

      if (prodError) throw prodError;

      // Если произвольные размеры - сохранить в custom_cutting_sizes
      if (sizeMode === 'custom' && prodData) {
        const { error: customError } = await supabase
          .from('custom_cutting_sizes')
          .insert({
            production_cutting_id: prodData.id,
            width_cm: customWidth ? parseFloat(customWidth) : null,
            length_cm: parseFloat(customLength),
            consumption_cm: parseFloat(customConsumption)
          });

        if (customError) throw customError;
      }

      // Insert warehouse receipt
      const { error: warehouseError } = await supabase
        .from('cutting_parts_warehouse')
        .insert({
          doc_number: docNumber,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          operation: 'Приход',
          cutting_type_code: cuttingTypeCode,
          cutting_type_name: cuttingTypeName,
          category: cuttingTypeCategory,
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

        // Проверяем, применена ли миграция (есть ли поле location)
        const { data: testRoll } = await supabase
          .from('weaving_rolls')
          .select('location')
          .eq('id', selectedMaterial.id)
          .single();

        const updateData: any = {
          total_length: newLength > 0 ? newLength : 0,
          status: newLength <= 0 ? 'used' : 'completed'
        };

        // Если поле location существует, обновляем его
        if (testRoll && 'location' in testRoll) {
          updateData.location = newLength <= 0 ? 'used' : 'cutting';
        }

        const { error: writeOffError } = await supabase
          .from('weaving_rolls')
          .update(updateData)
          .eq('id', selectedMaterial.id);

        if (writeOffError) throw writeOffError;

      } else if (selectedMaterial.material_type === 'Ламинат') {
        // Update laminated_rolls - decrease length and update location
        const newLength = selectedMaterial.balance_m - totalUsed;
        const { error: writeOffError } = await supabase
          .from('laminated_rolls')
          .update({
            length: newLength > 0 ? newLength : 0,
            status: newLength <= 0 ? 'used' : 'available',
            location: newLength <= 0 ? 'used' : 'cutting' // Рулон остается в крое или помечается как использованный
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
      setCustomWidth('');
      setCustomLength('');
      setCustomConsumption('');

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
            <Select value={operatorId} onValueChange={(value) => {
              setOperatorId(value);
              // Найти имя оператора для совместимости
              const selectedOp = operators.find(op => op.id === value);
              setOperator(selectedOp?.full_name || '');
            }}>
              <SelectTrigger className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                <SelectValue placeholder="Выберите оператора..." />
              </SelectTrigger>
              <SelectContent>
                {operators.map(op => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Режим выбора размеров */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-3">Режим выбора размеров</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSizeMode('catalog');
                  setCustomWidth('');
                  setCustomLength('');
                  setCustomConsumption('');
                }}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  sizeMode === 'catalog'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
              >
                📋 Из справочника
              </button>
              <button
                type="button"
                onClick={() => {
                  setSizeMode('custom');
                  setSelectedCuttingType(null);
                }}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  sizeMode === 'custom'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
              >
                ✏️ Произвольные размеры
              </button>
            </div>
          </div>

          {/* Cutting Type (только если режим справочника) */}
          {sizeMode === 'catalog' && (
            <div className="col-span-2">
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
          )}

          {/* Произвольные размеры (только если режим custom) */}
          {sizeMode === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Длина детали (см) *</label>
                <input
                  type="number"
                  value={customLength}
                  onChange={(e) => {
                    setCustomLength(e.target.value);
                    // Автоматический расчет: расход = длина + 3 см запас
                    if (e.target.value) {
                      const calculated = parseFloat(e.target.value) + 3;
                      setCustomConsumption(calculated.toString());
                    }
                  }}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Например: 150"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ширина детали (см) *</label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Например: 80"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Расход на 1 деталь (см) *
                  <span className="text-xs text-zinc-500 ml-2">(длина + 3 см запас)</span>
                </label>
                <input
                  type="number"
                  value={customConsumption}
                  onChange={(e) => setCustomConsumption(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Рассчитывается автоматически"
                />
              </div>
            </>
          )}

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
