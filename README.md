# TechShop — Техническая документация

## Содержание

1. [Обзор проекта](#1-обзор-проекта)
2. [Архитектура](#2-архитектура)
3. [Установка и запуск](#3-установка-и-запуск)
4. [API Reference](#4-api-reference)
5. [База данных](#5-база-данных)
6. [Аутентификация](#6-аутентификация)
7. [Бизнес-логика](#7-бизнес-логика)
8. [Тестовые данные](#8-тестовые-данные)

---

## 1. Обзор проекта

**TechShop** — интернет-магазин электроники и аксессуаров.

### Технологический стек

| Компонент | Технология |
|-----------|------------|
| Backend | Node.js + Express.js |
| Frontend | Vanilla JavaScript, HTML5, CSS3 |
| База данных | In-memory (JavaScript objects) |
| Аутентификация | JWT (JSON Web Tokens) |
| Хеширование паролей | bcrypt.js |

### Основной функционал

- **Каталог товаров** — просмотр, поиск, фильтрация, сортировка
- **Аутентификация** — регистрация и вход пользователей
- **Корзина** — добавление товаров, изменение количества
- **Оформление заказа** — ввод адреса, оплата тестовой картой
- **Личный кабинет** — просмотр истории заказов
- **Админ-панель** — управление товарами и заказами

---

## 2. Архитектура

### Структура проекта
qa-training-shop/
├── backend/
│ ├── server.js # Основной файл сервера
│ └── package.json # Зависимости
├── frontend/
│ ├── index.html # Главная страница (каталог)
│ ├── css/
│ │ └── style.css # Стили
│ ├── js/
│ │ ├── app.js # Общая логика, аутентификация
│ │ ├── products.js # Логика каталога
│ │ ├── cart.js # Логика корзины
│ │ └── admin.js # Логика админ-панели
│ └── pages/
│ ├── login.html # Страница входа
│ ├── register.html # Страница регистрации
│ ├── product.html # Карточка товара
│ ├── cart.html # Корзина
│ ├── checkout.html # Оформление заказа
│ ├── orders.html # Мои заказы
│ └── admin/
│ ├── dashboard.html # Дашборд админа
│ └── products.html # Управление товарами
└── DOCUMENTATION.md # Этот файл

text


### Схема взаимодействия
┌─────────────┐ HTTP/REST ┌─────────────┐
│ Browser │ ◄─────────────────► │ Express │
│ (Frontend) │ │ Server │
└─────────────┘ └──────┬──────┘
│
▼
┌─────────────┐
│ In-Memory │
│ Database │
└─────────────┘

text


---

## 3. Установка и запуск

### Системные требования

- Node.js 18.x или выше
- npm 9.x или выше
- Современный браузер (Chrome, Firefox, Edge, Safari)

### Локальный запуск

```bash
# 1. Перейти в папку backend
cd backend

# 2. Установить зависимости
npm install

# 3. Запустить сервер
npm start

# Сервер запустится на http://localhost:3000
Переменные окружения
Переменная	По умолчанию	Описание
PORT	3000	Порт сервера
JWT_SECRET	qa-training-secret-2024	Секрет для подписи JWT
4. API Reference
Базовый URL
text

http://localhost:3000/api
Формат ответов
Успешный ответ:

JSON

{
  "data": { ... },
  "message": "Описание"
}
Ошибка:

JSON

{
  "error": "Описание ошибки"
}
4.1 Аутентификация
POST /api/auth/register
Регистрация нового пользователя.

Request Body:

JSON

{
  "email": "user@example.com",
  "password": "password123",
  "name": "Иван Иванов"
}
Response 200:

JSON

{
  "message": "Регистрация успешна",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 3,
    "email": "user@example.com",
    "name": "Иван Иванов",
    "role": "user"
  }
}
Возможные ошибки:

400: "Email обязателен"
400: "Пользователь с таким email уже существует"
POST /api/auth/login
Авторизация пользователя.

Request Body:

JSON

{
  "email": "user@example.com",
  "password": "password123"
}
Response 200:

JSON

{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 2,
    "email": "user@example.com",
    "name": "Test User",
    "role": "user"
  }
}
Возможные ошибки:

401: "Неверный email или пароль"
GET /api/auth/me
Получение данных текущего пользователя.

Headers:

text

Authorization: Bearer <token>
Response 200:

JSON

{
  "id": 2,
  "email": "user@example.com",
  "name": "Test User",
  "role": "user"
}
4.2 Товары
GET /api/products
Получение списка товаров.

Query Parameters:

Параметр	Тип	Описание
category	string	Фильтр по категории
search	string	Поиск по названию/описанию
sort	string	Сортировка: price_asc, price_desc, name
Пример запроса:

text

GET /api/products?category=Electronics&sort=price_asc
Response 200:

JSON

[
  {
    "id": 1,
    "name": "Wireless Bluetooth Headphones",
    "description": "High-quality wireless headphones...",
    "price": 79.99,
    "stock": 50,
    "category": "Electronics",
    "image": "https://images.unsplash.com/...",
    "active": 1,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
]
GET /api/products/:id
Получение одного товара по ID.

Response 200:

JSON

{
  "id": 1,
  "name": "Wireless Bluetooth Headphones",
  "description": "High-quality wireless headphones...",
  "price": 79.99,
  "stock": 50,
  "category": "Electronics",
  "image": "https://images.unsplash.com/...",
  "active": 1,
  "created_at": "2024-01-15T10:30:00.000Z"
}
Возможные ошибки:

404: "Товар не найден"
GET /api/products/meta/categories
Получение списка категорий.

Response 200:

JSON

["Electronics", "Accessories", "Clothing", "Footwear", "Sports", "Home"]
4.3 Корзина
⚠️ Все эндпоинты требуют авторизации (заголовок Authorization: Bearer <token>)

GET /api/cart
Получение содержимого корзины.

Response 200:

JSON

{
  "items": [
    {
      "id": 1,
      "product_id": 5,
      "name": "Power Bank 20000mAh",
      "price": 39.99,
      "quantity": 2,
      "image": "https://...",
      "stock": 100
    }
  ],
  "total": 79.98
}
POST /api/cart/add
Добавление товара в корзину.

Request Body:

JSON

{
  "productId": 5,
  "quantity": 1
}
Response 200:

JSON

{
  "message": "Товар добавлен в корзину"
}
Возможные ошибки:

404: "Товар не найден"
400: "Недостаточно товара на складе. Доступно: X, в корзине: Y"
PUT /api/cart/:id
Изменение количества товара в корзине.

Request Body:

JSON

{
  "quantity": 3
}
Response 200:

JSON

{
  "message": "Корзина обновлена"
}
Возможные ошибки:

404: "Товар не найден в корзине"
400: "Недостаточно товара на складе. Доступно: X"
DELETE /api/cart/:id
Удаление товара из корзины.

Response 200:

JSON

{
  "message": "Товар удалён из корзины"
}
4.4 Заказы
POST /api/orders/checkout
Оформление заказа.

Request Body:

JSON

{
  "shippingAddress": "г. Москва, ул. Примерная, д. 1, кв. 1",
  "cardNumber": "4242 4242 4242 4242",
  "cardExpiry": "12/25",
  "cardCvc": "123"
}
Response 200:

JSON

{
  "message": "Заказ успешно оформлен",
  "orderId": 1,
  "total": 79.98
}
Возможные ошибки:

400: "Введите полный адрес доставки (минимум 10 символов)"
400: "Номер карты должен содержать 16 цифр"
400: "Используйте тестовую карту: 4242 4242 4242 4242"
400: "Введите срок действия в формате MM/YY"
400: "Срок действия карты истёк"
400: "CVC должен содержать 3 цифры"
400: "Корзина пуста"
400: "Недостаточно товара на складе"
GET /api/orders
Получение списка заказов текущего пользователя.

Response 200:

JSON

[
  {
    "id": 1,
    "user_id": 2,
    "total": 79.98,
    "status": "pending",
    "shipping_address": "г. Москва...",
    "payment_method": "card",
    "card_last4": "4242",
    "created_at": "2024-01-15T12:00:00.000Z",
    "items": [
      {
        "product_id": 5,
        "product_name": "Power Bank",
        "quantity": 2,
        "price": 39.99
      }
    ]
  }
]
4.5 Админ-панель
⚠️ Все эндпоинты требуют авторизации с ролью admin

GET /api/admin/stats
Получение статистики.

Response 200:

JSON

{
  "totalProducts": 12,
  "totalOrders": 5,
  "totalRevenue": 459.95,
  "totalUsers": 3,
  "lowStockProducts": 1,
  "outOfStockProducts": 1,
  "ordersByStatus": {
    "pending": 2,
    "processing": 1,
    "shipped": 1,
    "delivered": 1
  }
}
GET /api/admin/products
Получение всех товаров (включая неактивные).

POST /api/admin/products
Создание нового товара.

Request Body:

JSON

{
  "name": "Новый товар",
  "description": "Описание товара",
  "price": 99.99,
  "stock": 50,
  "category": "Electronics",
  "image": "https://..."
}
PUT /api/admin/products/:id
Обновление товара.

DELETE /api/admin/products/:id
Удаление товара (мягкое удаление, устанавливает active: 0).

GET /api/admin/orders
Получение всех заказов.

PUT /api/admin/orders/:id/status
Изменение статуса заказа.

Request Body:

JSON

{
  "status": "shipped"
}
Допустимые статусы: pending, processing, shipped, delivered, cancelled

5. База данных
Схема данных
Users (Пользователи)
Поле	Тип	Описание
id	integer	Уникальный идентификатор
email	string	Email (уникальный)
password	string	Хеш пароля (bcrypt)
name	string	Имя пользователя
role	string	Роль: user или admin
created_at	datetime	Дата регистрации
Products (Товары)
Поле	Тип	Описание
id	integer	Уникальный идентификатор
name	string	Название товара
description	string	Описание
price	float	Цена в рублях
stock	integer	Остаток на складе
category	string	Категория
image	string	URL изображения
active	integer	1 = активен, 0 = удалён
created_at	datetime	Дата создания
Cart (Корзина)
Поле	Тип	Описание
id	integer	Уникальный идентификатор
user_id	integer	ID пользователя
product_id	integer	ID товара
quantity	integer	Количество
Orders (Заказы)
Поле	Тип	Описание
id	integer	Номер заказа
user_id	integer	ID пользователя
total	float	Сумма заказа
status	string	Статус заказа
shipping_address	string	Адрес доставки
payment_method	string	Способ оплаты
card_last4	string	Последние 4 цифры карты
created_at	datetime	Дата заказа
Order Items (Позиции заказа)
Поле	Тип	Описание
order_id	integer	ID заказа
product_id	integer	ID товара
product_name	string	Название (на момент заказа)
quantity	integer	Количество
price	float	Цена (на момент заказа)
6. Аутентификация
JWT Token
Используется JWT (JSON Web Token) для аутентификации.

Структура токена:

JSON

{
  "id": 2,
  "email": "user@example.com",
  "role": "user",
  "iat": 1705312800,
  "exp": 1705399200
}
Время жизни: 24 часа

Использование:

text

Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Хранение на клиенте
Токен хранится в localStorage:

JavaScript

localStorage.getItem('authToken')
7. Бизнес-логика
7.1 Регистрация
Проверка наличия email
Проверка уникальности email
Хеширование пароля (bcrypt, 10 rounds)
Создание пользователя
Генерация JWT токена
Автоматический вход
7.2 Добавление в корзину
Проверка авторизации
Проверка существования товара
Проверка наличия на складе
Если товар уже в корзине — увеличение количества
Иначе — создание новой записи
7.3 Оформление заказа
Валидация адреса доставки (≥10 символов)
Валидация номера карты (16 цифр, тестовая карта)
Валидация срока действия (MM/YY, не истёк)
Валидация CVC (3 цифры)
Проверка наличия товаров на складе
Расчёт итоговой суммы
Создание заказа
Сохранение позиций заказа
Уменьшение остатков товаров
Очистка корзины
7.4 Статусы заказов
Статус	Описание
pending	Ожидает обработки
processing	В обработке
shipped	Отправлен
delivered	Доставлен
cancelled	Отменён
8. Тестовые данные
Тестовые аккаунты
Роль	Email	Пароль
Администратор	admin@shop.com	admin123
Пользователь	user@test.com	user123
Тестовые банковские карты
Номер	Бренд	Результат
4242 4242 4242 4242	Visa	Успешная оплата
5555 5555 5555 4444	Mastercard	Успешная оплата
4000 0000 0000 0002	Visa	Успешная оплата
Срок действия: любой в будущем (например, 12/25)
CVC: любые 3 цифры (например, 123)

Категории товаров
Electronics (Электроника)
Accessories (Аксессуары)
Clothing (Одежда)
Footwear (Обувь)
Sports (Спорт)
Home (Для дома)
Особые товары для тестирования
ID	Товар	Особенность
9	Super Ultra Premium...	Очень длинное название
11	Wireless Earbuds Pro	Низкий остаток (3 шт.)
12	Desk Lamp LED	Нет в наличии (0 шт.)
Приложения
HTTP Status Codes
Код	Значение
200	Успешный запрос
400	Ошибка валидации
401	Требуется авторизация
403	Доступ запрещён
404	Ресурс не найден
500	Внутренняя ошибка сервера
Контакты поддержки
При возникновении технических проблем обращайтесь к ментору.
