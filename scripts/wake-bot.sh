#!/usr/bin/env bash
# scripts/wake-bot.sh
# ────────────────────────────────────────────────────────────────────
# Запускается при включении ПК и при выходе из спящего режима.
# 1. Проверяет, не запущен ли уже bot/index.js — если запущен, второй
#    раз не стартует (используется PID-файл + сверка команды процесса).
# 2. Если бот не был запущен — запускает его в фоне.
# 3. В любом случае затем запускает scripts/deploy-yandex.mjs.
#
# Как подключить — см. scripts/README-autostart.md рядом с этим файлом.
# ────────────────────────────────────────────────────────────────────

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOT_DIR="$PROJECT_ROOT/bot"
BOT_ENTRY="$BOT_DIR/index.js"
PID_FILE="$BOT_DIR/bot.pid"
BOT_LOG="$BOT_DIR/bot.log"
DEPLOY_SCRIPT="$PROJECT_ROOT/scripts/deploy-yandex.mjs"
DEPLOY_LOG="$PROJECT_ROOT/scripts/deploy.log"
WAKE_LOG="$PROJECT_ROOT/scripts/wake-bot.log"

# Пытаемся найти node даже если скрипт запущен из cron/systemd, где
# PATH обычно урезан и node из nvm может быть не виден.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  source "$NVM_DIR/nvm.sh" >/dev/null 2>&1
fi
NODE_BIN="${NODE_BIN:-$(command -v node || echo /usr/bin/node)}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$WAKE_LOG"
}

is_bot_running() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      # PID существует — проверим, что это правда наш процесс,
      # а не другая программа, которой ОС успела переиспользовать этот PID
      if ps -p "$pid" -o args= 2>/dev/null | grep -q "bot/index.js\|bot[/\\\\]index.js"; then
        return 0
      fi
    fi
  fi
  return 1
}

start_bot() {
  log "Бот не запущен — стартую..."
  if [[ ! -f "$BOT_ENTRY" ]]; then
    log "ОШИБКА: не найден $BOT_ENTRY"
    return 1
  fi
  # Запускаем с абсолютным путём к файлу (а не "cd bot && node index.js") —
  # так в командной строке процесса всегда виден полный путь "bot/index.js",
  # и следующая проверка is_bot_running надёжно его находит.
  nohup "$NODE_BIN" "$BOT_ENTRY" >> "$BOT_LOG" 2>&1 &
  local new_pid=$!
  disown "$new_pid" 2>/dev/null || true
  echo "$new_pid" > "$PID_FILE"
  sleep 1
  if kill -0 "$new_pid" 2>/dev/null; then
    log "Бот запущен, PID $new_pid"
  else
    log "ОШИБКА: бот сразу же завершился — смотрите $BOT_LOG"
  fi
}

run_deploy() {
  if [[ ! -f "$DEPLOY_SCRIPT" ]]; then
    log "ОШИБКА: не найден $DEPLOY_SCRIPT"
    return 1
  fi
  log "Запускаю деплой (scripts/deploy-yandex.mjs)..."
  cd "$PROJECT_ROOT" || return 1
  if "$NODE_BIN" "$DEPLOY_SCRIPT" >> "$DEPLOY_LOG" 2>&1; then
    log "Деплой завершён успешно."
  else
    log "ОШИБКА: деплой завершился с ошибкой — смотрите $DEPLOY_LOG"
  fi
}

log "── Проверка после включения/пробуждения ──"

if is_bot_running; then
  log "Бот уже работает (PID $(cat "$PID_FILE")), повторно не запускаю."
else
  start_bot
fi

run_deploy

log "── Готово ──"
