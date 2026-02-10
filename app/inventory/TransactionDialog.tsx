'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select"

// Принимаем ID и Имя материала, с которым работаем
export default function TransactionDialog({ materialId, materialName, currentBatch }: { materialId: string, materialName: string, currentBatch?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<'in' | 'out'>('in') // 'in' = Приход, 'out' = Расход
  const [quantity, setQuantity] = useState('')
  const [batch, setBatch] = useState(currentBatch || '')
  const [counterparty, setCounterparty] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Генерируем номер документа (как у тебя в скрипте: PRH-2025... или PCX-...)
    const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '') // 250120
    const docPrefix = type === 'in' ? 'PRH' : 'PCX'
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const docNumber = `${docPrefix}-${datePrefix}-${randomSuffix}`

    const { error } = await supabase
      .from('inventory_transactions')
      .insert([{
        material_id: materialId,
        type: type,
        quantity: Number(quantity),
        batch_number: batch,
        doc_number: docNumber,
        counterparty: counterparty || (type === 'in' ? 'Поставщик' : 'Производство'),
      }])

    if (error) {
      toast.error(error.message)
    } else {
      setIsOpen(false)
      setQuantity('')
      router.refresh() // Обновляем остатки на странице
    }
    setLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
          {/* Иконка +/- */}
          ⚖️ Движение
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 text-white border-zinc-800">
        <DialogHeader>
          <DialogTitle>Движение: {materialName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Выбор операции */}
          <div className="flex gap-2 p-1 bg-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => setType('in')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${type === 'in' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              📥 Приход (Закуп)
            </button>
            <button
              type="button"
              onClick={() => setType('out')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${type === 'out' ? 'bg-[#E60012] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              📤 Расход (В цех)
            </button>
          </div>

          <div className="grid gap-2">
            <Label>Количество (кг)</Label>
            <Input 
              type="number" 
              className="bg-white text-black text-lg font-bold" 
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>Партия (LOT)</Label>
            <Input 
              className="bg-zinc-800 border-zinc-700" 
              value={batch} 
              onChange={(e) => setBatch(e.target.value)}
              placeholder={type === 'in' ? "Новый номер партии" : "Из какой партии списываем?"}
            />
          </div>

          <div className="grid gap-2">
            <Label>{type === 'in' ? 'Поставщик' : 'Куда списали (Цех)'}</Label>
             <Input 
              className="bg-zinc-800 border-zinc-700" 
              value={counterparty} 
              onChange={(e) => setCounterparty(e.target.value)}
              placeholder={type === 'in' ? "ООО Полимер" : "Экструзия №1"}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-white text-black hover:bg-gray-200">
            {loading ? 'Проводка...' : 'Провести документ'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}