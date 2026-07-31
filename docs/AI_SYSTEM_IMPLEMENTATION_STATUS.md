# Treabo AI: состояние локальной реализации

Дата: 30 июля 2026 года.  
Ветка: `codex/ai-knowledge-lab`.

Этот документ дополняет:

- `AI_KNOWLEDGE_LAB_TZ.md`;
- `AI_REQUEST_ASSISTANT_TZ.md`.

## 1. Что реализовано

### AI Knowledge Lab

- импорт ручного текста, Wordstat/CSV-подобных строк;
- нормализация, дедупликация и удаление PII;
- асинхронный анализ через очередь `knowledge-llm`;
- Structured Outputs для предложений;
- предложения терминов, алиасов, категорий, работ и вопросов;
- ручное принятие, отклонение и массовая модерация;
- термины, варианты терминов, связи с каталогом и документы;
- draft/testing/published/archived-версии базы знаний;
- проверка ссылочной целостности, публикация и rollback;
- versioned lexical retrieval с fallback внутри категории;
- train/validation/test-примеры и offline evaluation;
- админские экраны импорта, предложений, терминов, версий и retrieval-проверки.

### AI Request Assistant

- гостевой и авторизованный черновик;
- recovery token, восстановление после закрытия страницы;
- optimistic locking через `expected_version`;
- идемпотентные создание, ходы диалога и публикация;
- Responses API + строгий Structured Output;
- классификация только по переданным кандидатам каталога;
- извлечение уже сообщённых фактов;
- один вопрос за ход;
- короткий лимит вопросов и лимит AI-вызовов;
- бессмысленный ввод, несколько услуг и ручной fallback;
- исправление категории, работы, города, адреса, заголовка и описания;
- загрузка и пропуск необязательного фото;
- строгий canonical snapshot заявки;
- публикация в `proffi_tasks` и запуск текущего matching;
- логирование токенов, стоимости, latency, prompt/catalog version;
- responsive интерфейс `/request/new`; старый визард сохранён как `?mode=manual`.

### Условные вопросы

- группы вопросов;
- `default_visibility = always | conditional`;
- критичность для безопасности;
- AI-инструкция к вопросу;
- правила `all | any`;
- операции `equals`, `not_equals`, `in`, `not_in`, `contains`, `exists`,
  `not_exists`, `greater_than`, `less_than`;
- действия `show`, `hide`, `require`, `optional`;
- вычисление активных и обязательных вопросов на каждом ходе;
- визуальный редактор «если → то» и интерактивный предпросмотр в админке.

### Контур обучения и качества

- события подтверждения, исправления, fallback, multi-intent и пропуска;
- обезличивание пользовательского текста;
- ручное принятие события в датасет;
- детерминированное разбиение train/validation/test;
- gold/silver quality labels;
- offline top-1 evaluation;
- обратная связь после выполнения заявки от клиента/мастера;
- аналитика завершения, исправлений, fallback, уточнений, latency, токенов и USD.

## 2. Основные API

Пользователь:

- `POST /api/proffi/request-drafts`;
- `GET /api/proffi/request-drafts/latest`;
- `GET /api/proffi/request-drafts/{id}`;
- `POST /api/proffi/request-drafts/{id}/turns`;
- `PATCH /api/proffi/request-drafts/{id}`;
- `POST /api/proffi/request-drafts/{id}/confirm`;
- `POST /api/proffi/tasks/{task}/ai-feedback`.

Knowledge Lab:

- `/api/proffi/admin/ai-lab/imports`;
- `/api/proffi/admin/ai-lab/proposals`;
- `/api/proffi/admin/ai-lab/terms`;
- `/api/proffi/admin/ai-lab/versions`;
- `/api/proffi/admin/ai-lab/retrieve`.

Условная логика:

- `/api/proffi/admin/question-flow`;
- `/api/proffi/admin/question-groups`;
- `/api/proffi/admin/question-rules`;
- `POST /api/proffi/admin/question-flow/preview`.

Качество:

- `/api/proffi/admin/ai-operations/analytics`;
- `/api/proffi/admin/ai-operations/learning-events`;
- `/api/proffi/admin/ai-operations/evaluations`.

## 3. Безопасное «самообучение»

Боевой AI не изменяет сам себя и не публикует знания автоматически.

Поток:

1. Заявка или мастер создаёт обезличенный learning event.
2. Администратор проверяет текст и правильный результат.
3. Событие принимается в датасет либо игнорируется/карантинируется.
4. Новая версия знаний проходит offline evaluation.
5. Только после ручной публикации версия становится доступна диалогу.
6. Rollback возвращает предыдущую published-версию.

Это защищает от отравления данных рекламным трафиком, спама и случайных
исправлений.

## 4. Стоимость OpenAI

В конфигурации используются официальные тарифы `gpt-4.1-mini`:

- input: `$0.40 / 1M` токенов;
- cached input: `$0.10 / 1M`;
- output: `$1.60 / 1M`.

Источник: https://developers.openai.com/api/docs/models/gpt-4.1-mini

Фактический локальный замер:

- 776 input tokens;
- 86 output tokens;
- `$0.000448` за классификацию;
- 3.65 секунды на холодном локальном вызове.

Текущая локальная аналитика полного созданного черновика:

- средняя стоимость: около `$0.00068`;
- линейный прогноз на 1 000 заявок: около `$0.68`.

Плановый диапазон:

| Сценарий | Одна заявка | 1 000 заявок |
|---|---:|---:|
| 1 AI-вызов, ответы по справочнику | `$0.00045–0.0015` | `$0.45–1.50` |
| 3 AI-вызова при неоднозначности | до `$0.003` | до `$3.00` |
| Жёсткий технический предел | `$0.08` | `$80.00` |

Таким образом, продуктовый лимит `$0.10` соблюдается с большим запасом.
Импорт Knowledge Lab имеет отдельный бюджет и не относится к стоимости заявки.

## 5. Локальный запуск

```powershell
cd C:\TREABO_ru\treabo\pixer-api
docker compose -f docker-compose.proffi.yml up -d --build
docker compose -f docker-compose.proffi.yml exec -T app php artisan migrate --force
docker compose -f docker-compose.proffi.yml exec -T app php artisan locations:import-russia
```

```powershell
cd C:\TREABO_ru\treabo\shop
npm run dev -- -p 3000
```

```powershell
cd C:\TREABO_ru\treabo\admin
npm run dev -- -p 3001
```

Проверки:

```powershell
docker compose -f docker-compose.proffi.yml exec -T app `
  php artisan test tests/Feature/Proffi/RequestDraftAssistantTest.php
```

```powershell
docker compose -f docker-compose.proffi.yml exec -T app `
  php artisan test tests/Feature/Proffi/ConditionalQuestionFlowTest.php
```

Тесты используют отдельную БД `marvel_laravel_test`. `RefreshDatabase` больше
не затрагивает локальный каталог `marvel_laravel`.

## 6. Перед production

- прогнать полный regression suite;
- наполнить gold validation/test-набор минимум 300–500 примерами;
- настроить backup и retention для черновиков/learning events;
- проверить rate limit и WAF для публичного создания черновиков;
- утвердить PII retention и пользовательское согласие;
- провести нагрузочный тест очереди Knowledge Lab;
- закрепить snapshot модели и prompt version;
- настроить алерты: стоимость, error rate, fallback rate, latency;
- после локальной приёмки создать commit, push и draft PR.
