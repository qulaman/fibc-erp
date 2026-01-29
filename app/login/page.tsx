'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(formData.email, formData.password);

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Неверный email или пароль');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Email не подтвержден');
        } else {
          setError(error.message);
        }
      } else {
        // Успешная авторизация - редирект на главную
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError('Ошибка входа. Попробуйте позже.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">

        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-64">
            <Logo className="w-full h-auto" />
          </div>
        </div>

        {/* Login Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-white text-center">
              Вход в систему
            </CardTitle>
            <p className="text-sm text-zinc-400 text-center">
              FIBC ERP - Система управления производством
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm text-zinc-400 flex items-center gap-2">
                  <Mail size={14} />
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                  className="bg-zinc-950 border-zinc-700 text-white"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm text-zinc-400 flex items-center gap-2">
                  <Lock size={14} />
                  Пароль
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="bg-zinc-950 border-zinc-700 text-white"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-[#E60012] hover:bg-[#C00010] text-white font-bold h-11"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Вход...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn size={18} />
                    Войти
                  </span>
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 text-center">
                Нет доступа? Обратитесь к администратору системы
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Version */}
        <p className="text-xs text-zinc-600 text-center">
          FIBC ERP v1.0 • Powered by Supabase
        </p>
      </div>
    </div>
  );
}
