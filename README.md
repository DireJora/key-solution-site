# klyuchevoe-reshenie.ru — deployment bundle

Состав:
- `site/` — статический сайт; основной файл переименован в `index.html`.
- `backend/` — API формы `/api/lead`, healthcheck `/api/health`, конфигурация Метрики `/api/site-config`.
- `deploy/` — шаблоны Nginx, systemd, env и актуальная конфигурация n8n.

## Что делает форма
Заявка валидируется, вложения ограничены 5 файлами / 10 МБ каждый / 20 МБ суммарно, есть honeypot и rate-limit. Каждая заявка сохраняется в `/var/lib/key-solution/leads/YYYY-MM-DD.jsonl`, вложения — в `/var/lib/key-solution/uploads/`. Если задан `N8N_WEBHOOK_URL`, метаданные заявки дополнительно отправляются в n8n. Даже при недоступности n8n заявка остается сохраненной локально.

## Что нужно перед запуском
1. VPS Ubuntu 24.04 LTS с публичным IPv4. Для сайта достаточно 1 vCPU / 2 ГБ, но если n8n будет на том же VPS — рекомендуется 2 vCPU / 4 ГБ RAM.
2. Установить Node.js 22 LTS, Nginx, Certbot. Для n8n — Docker + Docker Compose plugin.
3. Скопировать `site/*` в `/var/www/klyuchevoe/`.
4. Скопировать проект в `/opt/klyuchevoe/key-solution-site-deployable/`, затем в `backend/` выполнить `npm ci --omit=dev`.
5. Создать `/var/lib/key-solution/{leads,uploads}` с ограниченными правами для API.
6. Скопировать `deploy/key-solution.env.example` в `/etc/key-solution.env` и заполнить значения.
7. Установить systemd unit и Nginx config, проверить `nginx -t` и `/api/health`.
8. Только после серверной проверки менять DNS REG.RU.
9. После DNS выпустить сертификат: `certbot --nginx -d klyuchevoe-reshenie.ru -d www.klyuchevoe-reshenie.ru`.

DNS не включен в этот пакет и не должен меняться без отдельного подтверждения.

## Текущее production-состояние

- Домен и `www` направлены на VDS `135.106.210.158`.
- HTTPS, Nginx, статический сайт и `key-solution-api` проверены после перезагрузки VDS.
- n8n `2.38.7` запущен через Docker Compose на `127.0.0.1:5678` и доступен через `https://n8n.klyuchevoe-reshenie.ru`.
- Рабочие заявки и вложения находятся только на сервере и намеренно не входят в Git.
