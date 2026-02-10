'use client'

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import Navigation from '@/components/Navigation';
import { Menu } from 'lucide-react';
import { Toaster, toast } from 'sonner';

// Публичные страницы, не требующие авторизации
const PUBLIC_ROUTES = ['/login'];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (loading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    // Если не авторизован и не на публичной странице - редирект на login
    if (!user && !isPublicRoute) {
      router.push('/login');
      return;
    }

    // Если авторизован и на странице логина - редирект на главную
    if (user && isPublicRoute) {
      router.push('/');
      return;
    }

    // Проверка активности профиля
    if (user && profile && !profile.is_active) {
      toast.error('Ваш аккаунт деактивирован. Обратитесь к администратору.');
      router.push('/login');
      return;
    }

    setIsReady(true);
  }, [user, loading, pathname, router, profile]);

  // Показываем загрузку пока проверяем авторизацию
  if (loading || !isReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-zinc-700 border-t-[#E60012] rounded-full animate-spin mx-auto"></div>
          <p className="text-zinc-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  // На публичных страницах не показываем навигацию
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  // На защищенных страницах показываем навигацию
  return (
    <>
      {/* Кнопка гамбургер-меню для мобильных */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-3 bg-[#E60012] rounded-lg text-white shadow-lg hover:bg-[#c50010] transition-colors"
        aria-label="Открыть меню"
      >
        <Menu size={24} />
      </button>

      <Navigation isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <main className="ml-0 lg:ml-72">
        {children}
      </main>
    </>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        {children}
      </AuthGuard>
      <Toaster
        position="top-right"
        richColors
        closeButton
        theme="dark"
        toastOptions={{
          style: {
            background: '#18181b',
            border: '2px solid #3f3f46',
            color: '#fafafa',
            fontSize: '16px',
            padding: '20px 24px',
            minWidth: '420px',
            maxWidth: '600px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          },
          className: 'toast-custom',
        }}
      />
    </AuthProvider>
  );
}
