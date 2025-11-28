# Як розгорнути цей проект на Hugging Face Spaces

Цей проект є React-додатком, який використовує TypeScript. Для розгортання на Hugging Face Spaces найкраще використовувати **Docker Space**, оскільки це дозволяє налаштувати середовище Node.js для збірки та запуску додатку.

## Крок 1: Створіть Space

1. Зайдіть на [huggingface.co/spaces](https://huggingface.co/spaces).
2. Натисніть **"Create new Space"**.
3. Введіть назву (наприклад, `orcid-analytics-agent`).
4. Виберіть ліцензію (наприклад, `MIT`).
5. У полі **Space SDK** виберіть **Docker**.
6. Виберіть **"Blank"** (порожній шаблон).
7. Натисніть **"Create Space"**.

## Крок 2: Налаштуйте змінні середовища (API Key)

Оскільки додаток використовує Gemini API, вам потрібно додати ключ:

1. У вашому Space перейдіть на вкладку **Settings**.
2. Прокрутіть до секції **"Variables and secrets"**.
3. Натисніть **"New secret"**.
4. Name: `API_KEY`
5. Value: Ваш ключ від Google Gemini API (отримати можна на [aistudio.google.com](https://aistudio.google.com)).
6. Натисніть **Save**.

## Крок 3: Додайте файли проекту

Вам потрібно завантажити ваші файли (`App.tsx`, `index.tsx`, `metadata.json`, папки `components`, `services`, `types.ts`) у Space. Це можна зробити через веб-інтерфейс (Files -> Add file) або через `git clone` локально.

**Важливо:** Оскільки поточний код використовує CDN (`importmap` в `index.html`), для стабільного розгортання в Docker ми змінимо підхід на використання `npm`.

Вам потрібно створити (або замінити) наступні **4 конфігураційні файли** у корені вашого Space:

### 1. `Dockerfile`
Цей файл відповідає за збірку та запуск серверу.

```dockerfile
# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
# Expose port 7860 (Hugging Face default)
EXPOSE 7860
CMD ["serve", "-s", "dist", "-l", "7860"]
```

### 2. `package.json`
Визначає залежності.

```json
{
  "name": "orcid-analytics-agent",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@google/genai": "^1.30.0",
    "lucide-react": "^0.344.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.4"
  }
}
```

### 3. `vite.config.ts`
Налаштування збирача Vite. Це дозволяє використовувати `process.env.API_KEY` у клієнтському коді завдяки `define`.

```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    server: {
      port: 7860,
    },
  };
});
```

### 4. `index.html` (Замініть існуючий!)
Нам потрібно прибрати `importmap`, оскільки ми тепер використовуємо npm та Vite.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ORCID Analytics Agent</title>
    <!-- Tailwind CSS CDN is fine for simple setup, or setup via PostCSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      body {
        font-family: 'Inter', sans-serif;
        background-color: #f8fafc;
      }
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>
```

## Крок 4: Структура файлів
Переконайтеся, що ваша структура файлів у Space виглядає так:

```
/
├── components/
│   ├── AnalysisCharts.tsx
│   └── ChatBot.tsx
├── services/
│   └── orcidService.ts
├── App.tsx
├── index.tsx
├── types.ts
├── index.html       (Оновлений)
├── package.json     (Новий)
├── vite.config.ts   (Новий)
└── Dockerfile       (Новий)
```

Після завантаження цих файлів Hugging Face автоматично запустить білд ("Building"), і за кілька хвилин ваш додаток стане доступним!
