@echo off
echo Применяем миграцию для добавления is_final_shift...
supabase db push
echo.
echo Готово! Миграция применена.
pause
