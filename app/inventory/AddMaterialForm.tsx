'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AddMaterialForm() {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('kg')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Записываем новое сырье в базу
    const { error } = await supabase
      .from('raw_materials')
      .insert([{ name, unit }])

    if (error) {
      alert(error.message)
    } else {
      setName('')
      router.refresh() // Обновляет данные на странице без перезагрузки
    }
    setLoading(false)
  }

  // ... остальной код выше

    return (
  <form onSubmit={handleSubmit} className="flex gap-4 items-end bg-zinc-900 p-6 rounded-xl mb-8 border border-zinc-800">
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="name" className="text-zinc-400">Название сырья</Label>
      <Input 
        id="name" 
        className="bg-white text-black placeholder:text-gray-400" // Белый фон, черный текст
        value={name} 
        onChange={(e) => setName(e.target.value)} 
        placeholder="Напр: ПП Марка 030" 
        required 
      />
    </div>
    <div className="grid w-24 items-center gap-1.5">
      <Label htmlFor="unit" className="text-zinc-400">Ед. изм.</Label>
      <Input 
        id="unit" 
        className="bg-white text-black" // Белый фон, черный текст
        value={unit} 
        onChange={(e) => setUnit(e.target.value)} 
        required 
      />
    </div>
    <Button type="submit" disabled={loading} className="bg-[#E60012] hover:bg-red-700 text-white font-bold">
      {loading ? 'Ждите...' : 'Добавить'}
    </Button>
  </form>
    )
}