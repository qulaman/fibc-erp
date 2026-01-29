'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Package, Users, Calendar } from "lucide-react";
import Link from 'next/link';
import { Separator } from "@/components/ui/separator";

interface SewnProduct {
  product_code: string;
  product_name: string;
  product_type: string;
  balance: number;
}

interface Inspector {
  full_name: string;
}

export default function QCPage() {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [sewnProducts, setSewnProducts] = useState<SewnProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // Форма
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [inspector, setInspector] = useState('');
  const [productCode, setProductCode] = useState('');
  const [quantityGood, setQuantityGood] = useState('');
  const [quantityDefect, setQuantityDefect] = useState('0');
  const [defectCategory, setDefectCategory] = useState('');
  const [defectReason, setDefectReason] = useState('');
  const [decision, setDecision] = useState('Принято');
  const [notes, setNotes] = useState('');

  // Информация о выбранном изделии
  const [selectedProduct, setSelectedProduct] = useState<SewnProduct | null>(null);

  useEffect(() => {
    fetchInspectors();
    fetchSewnProducts();
  }, []);

  const fetchInspectors = async () => {
    const { data } = await supabase
      .from('employees')
      .select('full_name')
      .eq('department', 'qc')
      .eq('is_active', true)
      .order('full_name');

    if (data && data.length > 0) {
      setInspectors(data);
    } else {
      // Если нет контролеров ОТК, показываем всех активных
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('full_name')
        .eq('is_active', true)
        .order('full_name');
      if (allEmployees) setInspectors(allEmployees);
    }
  };

  const fetchSewnProducts = async () => {
    const { data } = await supabase
      .from('view_sewn_products_balance')
      .select('*')
      .order('product_name');

    if (data) {
      setSewnProducts(data);
    }
  };

  const handleProductChange = (code: string) => {
    setProductCode(code);
    const product = sewnProducts.find(p => p.product_code === code);
    setSelectedProduct(product || null);
  };

  const handleSubmit = async () => {
    // Валидация
    if (!inspectionDate || !inspector || !productCode) {
      alert('Заполните все обязательные поля!');
      return;
    }

    const qtyGood = parseInt(quantityGood) || 0;
    const qtyDefect = parseInt(quantityDefect) || 0;

    if (qtyGood <= 0 && qtyDefect <= 0) {
      alert('Количество годных или брака должно быть больше 0!');
      return;
    }

    const totalQty = qtyGood + qtyDefect;

    // Проверка остатков на складе отшитой продукции
    if (selectedProduct && totalQty > selectedProduct.balance) {
      alert(`❌ Недостаточно продукции на складе!\n\nНа складе: ${selectedProduct.balance} шт\nПопытка проверить: ${totalQty} шт`);
      return;
    }

    if (qtyDefect > 0 && !defectReason) {
      alert('Укажите причину брака!');
      return;
    }

    setLoading(true);

    try {
      // 1. Генерируем номер документа ОТК
      const { data: lastDoc } = await supabase
        .from('qc_journal')
        .select('doc_number')
        .order('created_at', { ascending: false })
        .limit(1);

      let docNumber = 'QC-00001';
      if (lastDoc && lastDoc.length > 0) {
        const lastNumber = parseInt(lastDoc[0].doc_number.split('-')[1]);
        docNumber = `QC-${String(lastNumber + 1).padStart(5, '0')}`;
      }

      // 2. Запись в журнал ОТК
      const { error: qcError } = await supabase.from('qc_journal').insert([{
        doc_number: docNumber,
        inspection_date: inspectionDate,
        inspector_name: inspector,
        product_code: selectedProduct?.product_code,
        product_name: selectedProduct?.product_name,
        product_type: selectedProduct?.product_type,
        quantity_good: qtyGood,
        quantity_defect: qtyDefect,
        defect_reason: qtyDefect > 0 ? defectReason : null,
        defect_category: qtyDefect > 0 ? defectCategory : null,
        decision: decision,
        notes: notes,
        status: 'Активно'
      }]);

      if (qcError) throw qcError;

      // 3. Списание со склада отшитой продукции
      const { data: lastSewnDoc } = await supabase
        .from('sewn_products_warehouse')
        .select('doc_number')
        .order('created_at', { ascending: false })
        .limit(1);

      let sewnDocNumber = 'SP-OUT-00001';
      if (lastSewnDoc && lastSewnDoc.length > 0) {
        const lastNum = parseInt(lastSewnDoc[0].doc_number.split('-')[2]);
        sewnDocNumber = `SP-OUT-${String(lastNum + 1).padStart(5, '0')}`;
      }

      const { error: sewnOutError } = await supabase.from('sewn_products_warehouse').insert([{
        doc_number: sewnDocNumber,
        operation_date: inspectionDate,
        operation_type: 'Расход',
        product_code: selectedProduct?.product_code,
        product_name: selectedProduct?.product_name,
        product_type: selectedProduct?.product_type,
        quantity: totalQty,
        source_doc_number: docNumber,
        source_doc_type: 'ОТК',
        employee_name: inspector,
        notes: `ОТК: ${qtyGood} годных, ${qtyDefect} брак`,
        status: 'Активно'
      }]);

      if (sewnOutError) throw sewnOutError;

      // 4. Если есть годные - оприходовать на склад готовой продукции
      if (qtyGood > 0) {
        const { data: lastFGDoc } = await supabase
          .from('finished_goods_warehouse')
          .select('doc_number')
          .order('created_at', { ascending: false })
          .limit(1);

        let fgDocNumber = 'FG-IN-00001';
        if (lastFGDoc && lastFGDoc.length > 0) {
          const parts = lastFGDoc[0].doc_number.split('-');
          const lastNum = parseInt(parts[parts.length - 1]);
          fgDocNumber = `FG-IN-${String(lastNum + 1).padStart(5, '0')}`;
        }

        const { error: fgError } = await supabase.from('finished_goods_warehouse').insert([{
          doc_number: fgDocNumber,
          date: inspectionDate,
          operation: 'Приход',
          product_code: selectedProduct?.product_code,
          product_name: selectedProduct?.product_name,
          quantity: qtyGood,
          source_doc: docNumber,
          notes: `Принято ОТК: ${docNumber}, контролер: ${inspector}`,
          status: 'Проведено'
        }]);

        if (fgError) throw fgError;
      }

      alert(`✅ Приёмка ОТК успешно проведена!\n\nДокумент: ${docNumber}\nИзделие: ${selectedProduct?.product_name}\nГодных: ${qtyGood} шт\nБрак: ${qtyDefect} шт`);

      // Очистка формы
      setProductCode('');
      setQuantityGood('');
      setQuantityDefect('0');
      setDefectCategory('');
      setDefectReason('');
      setNotes('');
      setSelectedProduct(null);
      fetchSewnProducts();

    } catch (error: any) {
      console.error('Error:', error);
      alert('Ошибка: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 font-sans bg-black min-h-screen text-white">
      {/* Заголовок */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#E60012] flex items-center gap-2">
            <CheckCircle2 size={32} /> ОТК и Приёмка
          </h1>
          <p className="text-zinc-400 text-sm">Контроль качества готовых изделий</p>
        </div>
        <div className="flex gap-2">
          <Link href="/production/qc/history">
            <Button variant="outline" className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800">
              Журнал ОТК
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Форма приёмки */}
        <div className="lg:col-span-2">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Приёмка ОТК</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Дата и контролер */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2 text-zinc-400">
                    <Calendar size={16} /> Дата проверки
                  </Label>
                  <Input
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    className="bg-zinc-950 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2 text-zinc-400">
                    <Users size={16} /> Контролер ОТК
                  </Label>
                  <Select value={inspector} onValueChange={setInspector}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white">
                      <SelectValue placeholder="Выберите контролера" />
                    </SelectTrigger>
                    <SelectContent>
                      {inspectors.map((emp) => (
                        <SelectItem key={emp.full_name} value={emp.full_name}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Изделие */}
              <div>
                <Label className="flex items-center gap-2 text-zinc-400">
                  <Package size={16} /> Изделие
                </Label>
                <Select value={productCode} onValueChange={handleProductChange}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white">
                    <SelectValue placeholder="Выберите изделие из склада" />
                  </SelectTrigger>
                  <SelectContent>
                    {sewnProducts.map((product) => (
                      <SelectItem key={product.product_code} value={product.product_code}>
                        {product.product_name} (на складе: {product.balance} шт)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Количество годных и брак */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 size={16} /> Годных (шт)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={quantityGood}
                    onChange={(e) => setQuantityGood(e.target.value)}
                    placeholder="0"
                    className="bg-zinc-950 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2 text-red-400">
                    <XCircle size={16} /> Брак (шт)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={quantityDefect}
                    onChange={(e) => setQuantityDefect(e.target.value)}
                    placeholder="0"
                    className="bg-zinc-950 border-zinc-700 text-white"
                  />
                </div>
              </div>

              {/* Брак - причина и категория */}
              {parseInt(quantityDefect) > 0 && (
                <div className="space-y-3 p-4 bg-red-950/20 border border-red-900/30 rounded-lg">
                  <Label className="flex items-center gap-2 text-red-300">
                    <AlertTriangle size={16} /> Информация о браке
                  </Label>
                  <div>
                    <Label className="text-zinc-400 text-sm">Категория брака</Label>
                    <Select value={defectCategory} onValueChange={setDefectCategory}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white">
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Шов">Шов</SelectItem>
                        <SelectItem value="Материал">Материал</SelectItem>
                        <SelectItem value="Размер">Размер</SelectItem>
                        <SelectItem value="Загрязнение">Загрязнение</SelectItem>
                        <SelectItem value="Прочее">Прочее</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-sm">Причина брака</Label>
                    <Input
                      value={defectReason}
                      onChange={(e) => setDefectReason(e.target.value)}
                      placeholder="Опишите причину брака"
                      className="bg-zinc-950 border-zinc-700 text-white"
                    />
                  </div>
                </div>
              )}

              {/* Решение */}
              <div>
                <Label className="text-zinc-400">Решение</Label>
                <Select value={decision} onValueChange={setDecision}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Принято">✅ Принято</SelectItem>
                    <SelectItem value="Отклонено">❌ Отклонено</SelectItem>
                    <SelectItem value="На доработку">🔄 На доработку</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Примечание */}
              <div>
                <Label className="text-zinc-400">Примечание</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Дополнительная информация"
                  className="bg-zinc-950 border-zinc-700 text-white"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-[#E60012] hover:bg-red-700 text-white font-bold text-lg py-6"
              >
                {loading ? 'Обработка...' : '✅ Провести приёмку ОТК'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Информация о выбранном изделии */}
        <div>
          {selectedProduct ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Информация о изделии</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-zinc-500">Код</p>
                  <p className="text-white font-mono">{selectedProduct.product_code}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Наименование</p>
                  <p className="text-white font-medium">{selectedProduct.product_name}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Тип</p>
                  <Badge variant="outline" className="border-blue-700 text-blue-400 bg-blue-900/10">
                    {selectedProduct.product_type}
                  </Badge>
                </div>
                <Separator className="bg-zinc-800" />
                <div>
                  <p className="text-xs text-zinc-500">Остаток на складе отшитой продукции</p>
                  <p className="text-2xl font-bold text-[#E60012]">{selectedProduct.balance} шт</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-12 text-center">
                <Package size={48} className="mx-auto text-zinc-700 mb-3" />
                <p className="text-zinc-600">Выберите изделие для просмотра информации</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
