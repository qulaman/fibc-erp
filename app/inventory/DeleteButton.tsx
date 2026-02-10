'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { toast } from 'sonner';
import { Trash2 } from "lucide-react" // Популярная библиотека иконок

export default function DeleteButton({ id }: { id: string }) {
  const router = useRouter()

  const handleDelete = async () => {
    if (confirm('Вы уверены, что хотите удалить эту позицию?')) {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', id)

      if (error) {
        toast.error('Ошибка при удалении: ' + error.message)
      } else {
        router.refresh() // Обновляем страницу, чтобы строка исчезла
      }
    }
  }

  return (
    <Button 
      variant="ghost" 
      onClick={handleDelete}
      className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10 p-2"
    >
      <Trash2 size={18} />
    </Button>
  )
}