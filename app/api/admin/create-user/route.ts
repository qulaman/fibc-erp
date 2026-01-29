import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Создаем клиент с service role key для Admin API
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  try {
    const { email, password, employee_id, role } = await request.json();

    // Валидация
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны' },
        { status: 400 }
      );
    }

    // Создаем пользователя через Admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Автоматически подтверждаем email
    });

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    if (!userData.user) {
      return NextResponse.json(
        { error: 'Не удалось создать пользователя' },
        { status: 500 }
      );
    }

    // Обновляем профиль пользователя
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        employee_id: employee_id || null,
        role: role || 'operator'
      })
      .eq('id', userData.user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
      return NextResponse.json(
        { error: 'Пользователь создан, но не удалось обновить профиль: ' + profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: userData.user
    });

  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
