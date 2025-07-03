# Микросервисы Core + Bitrix

Система микросервисов для управления пользователями с интеграцией Bitrix24, построенная на событийной архитектуре.

## Запуск системы

### 1. Запуск инфраструктуры (Docker)

````bash
# Запуск PostgreSQL, Redis, RabbitMQ
docker-compose up -d

### 2. Запуск микросервисов

```bash
# Терминал 1 - Core сервис
cd core
npm install
npm run start:dev

# Терминал 2 - Bitrix сервис
cd bitrix
npm install
npm run start:dev
````

## Настройка Bitrix24 Webhook

### Webhook URL

```
https://b24-gge6kw.bitrix24.kz/rest/1/sj4byqtjd3p5j3wq/
```

## Примеры API запросов

### 1. Создание пользователя

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Иван Иванов",
    "phone": "+77001112233",
    "stage": "NEW"
  }'
```

**Ответ:**

```json
{
	"id": 1,
	"full_name": "Иван Иванов",
	"phone": "+77001112233",
	"stage": "NEW"
}
```

### 2. Обновление пользователя

```bash
curl -X PATCH http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Иван Петров",
    "phone": "+77001112233",
    "stage": "IN_PROCESS"
  }'
```

### 3. Перемещение пользователя на новый этап

```bash
curl -X POST http://localhost:3000/users/1/move \
  -H "Content-Type: application/json" \
  -d '{
    "stage": "CONVERTED"
  }'
```

## Примеры сообщений в RabbitMQ

### Сообщение для создания карточки

```json
{
	"pattern": "user_created",
	"data": {
		"action": "create_card",
		"user": {
			"id": 123,
			"full_name": "Иван Иванов",
			"phone": "+77001112233",
			"stage": "NEW"
		},
		"replyQueue": "bitrix.responses"
	}
}
```

### Сообщение для обновления карточки

```json
{
	"pattern": "user_updated",
	"data": {
		"action": "update_card",
		"user": {
			"id": 123,
			"full_name": "Иван Петров",
			"phone": "+77001112233",
			"stage": "IN_PROCESS"
		},
		"replyQueue": "bitrix.responses"
	}
}
```

### Сообщение для перемещения карточки

```json
{
	"pattern": "user_moved",
	"data": {
		"action": "move_card",
		"user": {
			"id": 123,
			"full_name": "Иван Петров",
			"phone": "+77001112233",
			"stage": "CONVERTED"
		},
		"replyQueue": "bitrix.responses"
	}
}
```

### Ответные сообщения

**Успешный ответ:**

```json
{
	"status": "success",
	"action": "create_card",
	"user": {
		"id": 123,
		"full_name": "Иван Иванов",
		"phone": "+77001112233",
		"stage": "NEW"
	},
	"bitrix_lead_id": 456
}
```

**Ответ с ошибкой:**

```json
{
	"status": "error",
	"reason": "Missing phone number",
	"user": {
		"id": 123,
		"full_name": "Пользователь без телефона",
		"stage": "NEW"
	}
}
```

## Логирование и отладка

### Логи Core сервиса

```
[Core] Bitrix Response Received: { status: 'success', action: 'create_card', user: {...} }
[Core] Connected to RabbitMQ successfully
[Core] About to emit message to BITRIX_SERVICE: {...}
[Core] Message emitted successfully
```

### Логи Bitrix сервиса

```
[Bitrix] Received user_created event: {...}
[Bitrix] Job added to queue with ID: 123
[Bitrix] Processing bitrix_job: {...}
[Bitrix] Calling Bitrix24 API with action: create_card
[Bitrix] Created lead in Bitrix24: { result: 456, time: {...} }
[Bitrix] Job completed successfully
```

# Микросервисы Core + Bitrix

Система микросервисов для управления пользователями с интеграцией Bitrix24, построенная на событийной архитектуре.

## Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   HTTP Client   │    │   Core Service  │    │  Bitrix Service │
│                 │    │                 │    │                 │
│  POST /users    │───▶│  PostgreSQL     │    │                 │
│  PATCH /users   │    │  RabbitMQ Pub   │───▶│  RabbitMQ Sub   │
│  POST /move     │    │  Reply Listener │◀───│  BullMQ Queue   │
│                 │    │                 │    │  Bitrix24 API   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Запуск системы

### 1. Запуск инфраструктуры (Docker)

```bash
# Запуск PostgreSQL, Redis, RabbitMQ
docker-compose up -d

# Проверка статуса контейнеров
docker-compose ps
```

### 2. Запуск микросервисов

```bash
# Терминал 1 - Core сервис
cd core
npm install
npm run start:dev

# Терминал 2 - Bitrix сервис
cd bitrix
npm install
npm run start:dev
```

### 3. Проверка подключений

- **PostgreSQL**: `http://localhost:5432`
- **Redis**: `http://localhost:6379`
- **RabbitMQ Management**: `http://localhost:15672` (guest/guest)
- **Core API**: `http://localhost:3000`

## Настройка Bitrix24 Webhook

### Получение Webhook URL

1. Войдите в ваш Bitrix24 портал
2. Перейдите в **Приложения** → **Разработчикам** → **Другое** → **Входящий webhook**
3. Нажмите **Создать Webhook**
4. Выберите права доступа:
   - **CRM (crm)** - полный доступ
   - **Списки (lists)** - чтение (опционально)
5. Сохраните webhook

### Пример Webhook URL

```
https://your-domain.bitrix24.ru/rest/USER_ID/WEBHOOK_CODE/
```

### Конфигурация в .env файле

```env
# bitrix/.env
BITRIX_WEBHOOK_URL=https://your-domain.bitrix24.ru/rest/USER_ID/WEBHOOK_CODE
```

## Примеры API запросов

### 1. Создание пользователя

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Иван Иванов",
    "phone": "+77001112233",
    "stage": "NEW"
  }'
```

**Ответ:**

```json
{
	"id": 1,
	"full_name": "Иван Иванов",
	"phone": "+77001112233",
	"stage": "NEW"
}
```

### 2. Обновление пользователя

```bash
curl -X PATCH http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Иван Петров",
    "phone": "+77001112233",
    "stage": "IN_PROCESS"
  }'
```

### 3. Перемещение пользователя на новый этап

```bash
curl -X POST http://localhost:3000/users/1/move \
  -H "Content-Type: application/json" \
  -d '{
    "stage": "CONVERTED"
  }'
```

### 4. Тестирование обработки ошибок

```bash
# Пользователь без телефона - должен быть отклонен
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Пользователь без телефона",
    "stage": "NEW"
  }'
```

## Примеры сообщений в RabbitMQ

### Сообщение для создания карточки

```json
{
	"pattern": "user_created",
	"data": {
		"action": "create_card",
		"user": {
			"id": 123,
			"full_name": "Иван Иванов",
			"phone": "+77001112233",
			"stage": "NEW"
		},
		"replyQueue": "bitrix.responses"
	}
}
```

### Сообщение для обновления карточки

```json
{
	"pattern": "user_updated",
	"data": {
		"action": "update_card",
		"user": {
			"id": 123,
			"full_name": "Иван Петров",
			"phone": "+77001112233",
			"stage": "IN_PROCESS"
		},
		"replyQueue": "bitrix.responses"
	}
}
```

### Сообщение для перемещения карточки

```json
{
	"pattern": "user_moved",
	"data": {
		"action": "move_card",
		"user": {
			"id": 123,
			"full_name": "Иван Петров",
			"phone": "+77001112233",
			"stage": "CONVERTED"
		},
		"replyQueue": "bitrix.responses"
	}
}
```

### Ответные сообщения

**Успешный ответ:**

```json
{
	"status": "success",
	"action": "create_card",
	"user": {
		"id": 123,
		"full_name": "Иван Иванов",
		"phone": "+77001112233",
		"stage": "NEW"
	},
	"bitrix_lead_id": 456
}
```

**Ответ с ошибкой:**

```json
{
	"status": "error",
	"reason": "Missing phone number",
	"user": {
		"id": 123,
		"full_name": "Пользователь без телефона",
		"stage": "NEW"
	}
}
```

## Логирование и отладка

### Логи Core сервиса

```
[Core] 📩 Bitrix Response Received: { status: 'success', action: 'create_card', user: {...} }
[Core] ✅ Connected to RabbitMQ successfully
[Core] About to emit message to BITRIX_SERVICE: {...}
[Core] Message emitted successfully
```

### Логи Bitrix сервиса

```
[Bitrix] 🎉 Received user_created event: {...}
[Bitrix] ✅ Job added to queue with ID: 123
[Bitrix] 🔄 Processing bitrix_job: {...}
[Bitrix] 📞 Calling Bitrix24 API with action: create_card
[Bitrix] ✅ Created lead in Bitrix24: { result: 456, time: {...} }
[Bitrix] ✅ Job completed successfully
```

## Retry Logic в BullMQ

Система автоматически повторяет неудачные попытки с экспоненциальной задержкой:

### Конфигурация в bitrix/src/app.module.ts

```typescript
BullModule.registerQueue({
  name: 'bitrix_jobs',
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 10,
    removeOnFail: 5,
  },
}),
```

### Логика повторов:

- **1-я попытка**: немедленно
- **2-я попытка**: через 2 секунды
- **3-я попытка**: через 4 секунды
- **После 3 неудачных попыток**: отправка финального сообщения об ошибке

### Пример логов retry механизма:

```
Processing bitrix_job (attempt 1/3)
Calling Bitrix24 API with action: create_card (attempt 1)
Error processing job (attempt 1/3): getaddrinfo ENOTFOUND...
Will retry in 2000ms

Processing bitrix_job (attempt 2/3)
Calling Bitrix24 API with action: create_card (attempt 2)
Error processing job (attempt 2/3): getaddrinfo ENOTFOUND...
Will retry in 4000ms

Processing bitrix_job (attempt 3/3)
Calling Bitrix24 API with action: create_card (attempt 3)
Error processing job (attempt 3/3): getaddrinfo ENOTFOUND...
All retry attempts exhausted, sending error reply
Reply sent to queue: bitrix.responses
```

### Мониторинг заданий BullMQ:

```typescript
this.queue.on('failed', (job, err) => {
	console.log(`🔥 Job ${job.id} failed: ${err.message}`)
})

this.queue.on('completed', (job, result) => {
	console.log(
		`✅ Job ${job.id} completed after ${job.attemptsMade + 1} attempt(s)`
	)
})

this.queue.on('stalled', job => {
	console.log(`⏰ Job ${job.id} stalled`)
})
```
