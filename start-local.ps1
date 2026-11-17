# Локальный запуск проекта с Telegram-уведомлениями.
# Токен вводится при запуске и не сохраняется в исходниках.

$ErrorActionPreference = 'Stop'

$token = Read-Host 'Введите НОВЫЙ токен Telegram-бота от @BotFather'
if ([string]::IsNullOrWhiteSpace($token)) {
  Write-Host 'Ошибка: токен не введён.' -ForegroundColor Red
  exit 1
}

$env:BOT_TOKEN = $token.Trim()
$env:ADMIN_CHAT_ID = '5363836876'

Write-Host 'Telegram настроен. Запускаю проект...' -ForegroundColor Green
npm run dev
