'use client'

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import Navigation from '@/components/Navigation';

// Публичные страницы, не требующие авторизации
const PUBLIC_ROUTES = ['/login'];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

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
      alert('Ваш аккаунт деактивирован. Обратитесь к администратору.');
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
      <Navigation />
      <main className="ml-72">
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
    </AuthProvider>
  );
}
