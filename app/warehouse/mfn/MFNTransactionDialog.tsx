'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select"

export default function MFNTransactionDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [operationType, setOperationType] = useState<'Приход' | 'Расход' | 'Возврат'>('Приход')
  const [materialCode, setMaterialCode] = useState('')
  const [materialName, setMaterialName] = useState('')
  const [denier, setDenier] = useState('')
  const [color, setColor] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [supplier, setSupplier] = useState('')
  const [destination, setDestination] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [existingMaterials, setExistingMaterials] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      fetchExistingMaterials()
    }
  }, [isOpen])

  const fetchExistingMaterials = async () => {
    const { data } = await supabase
      .from('view_mfn_balance')
      .select('*')
      .order('material_name')

    if (data) setExistingMaterials(data)
  }

  const handleMaterialSelect = (value: string) => {
    const material = existingMaterials.find(m => m.material_code === value)
    if (material) {
      setMaterialCode(material.material_code)
      setMaterialName(material.material_name)
      setDenier(material.denier?.toString() || '')
      setColor(material.color || '')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Генерация номера документа
    const now = new Date()
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '') // 260129
    const timeStr = now.toTimeString().slice(0, 8) // HH:MM:SS
    let docPrefix = 'MFN-IN'
    if (operationType === 'Расход') docPrefix = 'MFN-OUT'
    if (operationType === 'Возврат') docPrefix = 'MFN-RET'

    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const docNumber = `${docPrefix}-${dateStr}-${randomSuffix}`

    const totalAmount = price ? Number(price) * Number(quantity) : null

    const { error } = await supabase
      .from('mfn_warehouse')
      .insert([{
        doc_number: docNumber,
        operation_date: now.toISOString().split('T')[0],
        operation_time: timeStr,
        operation_type: operationType,
        material_code: materialCode,
        material_name: materialName,
        material_type: 'МФН',
        denier: denier ? Number(denier) : null,
        color: color || null,
        quantity_kg: Number(quantity),
        price_per_kg: price ? Number(price) : null,
        total_amount: totalAmount,
        supplier_name: operationType === 'Приход' ? supplier || null : null,
        invoice_number: operationType === 'Приход' ? invoiceNumber || null : null,
        destination: operationType === 'Расход' ? destination || null : null,
        notes: notes || null,
        status: 'Активно'
      }])

    if (error) {
      alert(`Ошибка: ${error.message}`)
    } else {
      // Сброс формы
      setIsOpen(false)
      setMaterialCode('')
      setMaterialName('')
      setDenier('')
      setColor('')
      setQuantity('')
      setPrice('')
      setSupplier('')
      setDestination('')
      setInvoiceNumber('')
      setNotes('')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 text-white hover:bg-purple-700">
          ➕ Добавить операцию
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 text-white border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Движение МФН нити</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Выбор операции */}
          <div className="flex gap-2 p-1 bg-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => setOperationType('Приход')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                operationType === 'Приход' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              📥 Приход
            </button>
            <button
              type="button"
              onClick={() => setOperationType('Расход')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                operationType === 'Расход' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              📤 Расход
            </button>
            <button
              type="button"
              onClick={() => setOperationType('Возврат')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                operationType === 'Возврат' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              🔄 Возврат
            </button>
          </div>

          {/* Выбор существующего материала или ручной ввод */}
          {operationType === 'Расход' && existingMaterials.length > 0 && (
            <div className="grid gap-2">
              <Label>Выбрать из имеющихся МФН</Label>
              <Select onValueChange={handleMaterialSelect}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Выберите МФН..." />
                </SelectTrigger>
                <SelectContent>
                  {existingMaterials.map((m) => (
                    <SelectItem key={m.material_code} value={m.material_code}>
                      {m.material_name} {m.denier ? `(${m.denier}D)` : ''} {m.color ? `- ${m.color}` : ''} [Ост: {Number(m.balance_kg).toFixed(2)} кг]
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Код материала */}
          <div className="grid gap-2">
            <Label>Код материала *</Label>
            <Input
              className="bg-zinc-800 border-zinc-700"
              value={materialCode}
              onChange={(e) => setMaterialCode(e.target.value)}
              placeholder="MFN-001"
              required
            />
          </div>

          {/* Название */}
          <div className="grid gap-2">
            <Label>Название *</Label>
            <Input
              className="bg-zinc-800 border-zinc-700"
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              placeholder="МФН нить белая"
              required
            />
          </div>

          {/* Денье и Цвет в одну строку */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Денье (D)</Label>
              <Input
                type="number"
                step="0.01"
                className="bg-zinc-800 border-zinc-700"
                value={denier}
                onChange={(e) => setDenier(e.target.value)}
                placeholder="1100"
              />
            </div>
            <div className="grid gap-2">
              <Label>Цвет</Label>
              <Input
                className="bg-zinc-800 border-zinc-700"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Белый"
              />
            </div>
          </div>

          {/* Количество */}
          <div className="grid gap-2">
            <Label>Количество (кг) *</Label>
            <Input
              type="number"
              step="0.001"
              className="bg-white text-black text-lg font-bold"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          {/* Цена (только для прихода) */}
          {operationType === 'Приход' && (
            <div className="grid gap-2">
              <Label>Цена за кг (₽)</Label>
              <Input
                type="number"
                step="0.01"
                className="bg-zinc-800 border-zinc-700"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1500.00"
              />
            </div>
          )}

          {/* Поставщик и номер накладной (для прихода) */}
          {operationType === 'Приход' && (
            <>
              <div className="grid gap-2">
                <Label>Поставщик</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="ООО Полимер"
                />
              </div>
              <div className="grid gap-2">
                <Label>Номер накладной</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-12345"
                />
              </div>
            </>
          )}

          {/* Назначение (для расхода) */}
          {operationType === 'Расход' && (
            <div className="grid gap-2">
              <Label>Куда списано</Label>
              <Input
                className="bg-zinc-800 border-zinc-700"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Цех Строп"
              />
            </div>
          )}

          {/* Примечание */}
          <div className="grid gap-2">
            <Label>Примечание</Label>
            <Textarea
              className="bg-zinc-800 border-zinc-700"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация..."
              rows={3}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white hover:bg-purple-700"
          >
            {loading ? 'Проводка...' : 'Провести документ'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
