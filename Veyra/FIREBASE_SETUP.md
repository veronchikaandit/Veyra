# 🔧 Налаштування Firebase для Veyra (обов'язково перед публікацією)

Сайт працює і без Firebase (на localStorage браузера), але для повноцінної роботи (хмарна база, Google-вхід, синхронізація між пристроями) потрібно підключити Firebase.

> ⚠️ Я не можу створити Firebase-проєкт за вас — це робиться у **вашому** Google-акаунті за ~15 хвилин. Код уже готовий: після вставки ключів увесь функціонал увімкнеться автоматично.

---

## Крок 1. Створіть проєкт у Firebase

1. Зайдіть на [https://console.firebase.google.com](https://console.firebase.google.com) (ваш Google-акаунт).
2. Натисніть **"Add project / Додати проєкт"**.
3. Назва: `Veyra` → Continue.
4. Google Analytics — можна вимкнути → **Create project**.

---

## Крок 2. Увімкніть вхід через Google (обов'язково)

Без цього кнопка "Увійти через Google" видаватиме помилку `configuration-not-found`.

1. Зліва у меню: **Build → Authentication → Sign-in method**.
2. Знайдіть **Google** → натисніть → **Enable**.
3. **Support email** — оберіть вашу пошту → **Save**.
4. **Settings → Authorized domains** → **Add domain**:
   - `localhost` (для тестів)
   - `127.0.0.1` (для тестів)
   - Після публікації сайту додайте й свій домен (напр. `veyra.web.app`).

> Якщо Google попросить налаштувати **OAuth consent screen**:
> - Тип: **External**
> - Назва застосунку + ваша email
> - У **Test users** додайте себе (доки застосунок у тестовому режимі)

---

## Крок 3. Увімкніть Email/Password (для адміністратора)

1. У тому ж меню **Sign-in method** увімкніть **Email/Password**.
2. Це потрібно для окремого адміністративного акаунта (не ваш особистий!).

---

## Крок 4. Увімкніть анонімний вхід (для завантаження фото)

1. У меню **Sign-in method** увімкніть **Anonymous**.
2. Це дозволяє завантажувати фото профілів у Firebase Storage навіть без Google-входу.

---

## Крок 5. Створіть Web-застосунок і скопіюйте ключі

1. На головній сторінці проєкту (Project Overview) натисніть іконку **`</>`** (Web).
2. Nickname: `Veyra web` → **Register app** (Hosting не чіпайте).
3. Скопіюйте об'єкт `firebaseConfig` — виглядає так:
   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "veyra-xxx.firebaseapp.com",
     projectId: "veyra-xxx",
     storageBucket: "veyra-xxx.appspot.com",
     messagingSenderId: "123...",
     appId: "1:123...:web:abc..."
   };
   ```

---

## Крок 6. Вставте ключі в проєкт

1. Відкрийте файл **`js/veyra-backend.js`**.
2. Знайдіть `FIREBASE_CONFIG` і замініть значення своїми (з Крок 5).
3. Збережіть файл.

> Файл вже підключено на всіх сторінках перед `script.js`. Без ключів сайт працює на localStorage (локально).

---

## Крок 6б. Створіть окремий акаунт адміністратора

Адмінка (`html/admin.html`) пускає **лише** акаунт зі списку `ADMIN_EMAILS` у `js/script.js` (зараз там `veronchik.and.it@gmail.com`).

1. У Firebase Console → **Authentication → Users** → **Add user**.
2. Введіть **окремий** email (наприклад `admin@veyra-xxx…` — НЕ ваш особистий) і надійний пароль → **Add user**.
3. Відкрийте `html/admin.html` → форма **«Вхід для адміна»** → введіть цей email+пароль.
   - Або увійдіть через Google, якщо цей Google-аккаунт додано в `ADMIN_EMAILS` у коді.

> Локальна реєстрація з email адміна адмінку **не відкриє** — це навмисно, щоб будь-хто не став адміном.

---

## Крок 7. Створіть базу даних (Firestore)

1. Зліва: **Build → Firestore Database → Create database**.
2. Режим: **Start in production mode** → оберіть регіон (наприклад `europe-west1`) → Enable.
3. Вкладка **Rules** → вставте правила → **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /specialists/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /bookings/{docId} {
      allow read, write: if request.auth != null;
    }
    match /messages/{docId} {
      allow read, write: if request.auth != null;
    }
    match /reviews/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /payments/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Крок 8. Фото в хмарі (Storage)

Без цього кроку текст профілів синхронізується, а фото лишаються лише в тому браузері, де їх додано.

1. Зліва: **Build → Storage → Get started → Start in production mode** → той самий регіон.
2. Вкладка **Rules** → вставте → **Publish**:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profiles/{uid}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.uid == uid
                   && request.resource.contentType.matches('image/.*')
                   && request.resource.size < 2 * 1024 * 1024;
    }
  }
}
```

3. Готово — код вже вміє вантажити фото при збереженні профілю.

---

## Перевірка: все працює?

1. Відкрийте сайт через `http://localhost` (або `http://127.0.0.1`).
2. **Увійти** → **Продовжити через Google** → оберіть свій акаунт.
3. Увійдіть як **Спеціаліст** → створіть профіль (`html/create.html`).
4. Відкрийте `html/specialists.html` — ваш профіль має бути в каталозі.
5. Відкрийте `html/stats.html` — має з'явитися статистика з ваших даних.
6. Увійдіть як адміністратор → `html/admin.html` → вкладка **«Адмінка»**.

---

## Розв'язання проблем

| Помилка | Що робити |
|---------|-----------|
| `configuration-not-found` | Крок 2: увімкніть Google-провайдера у Firebase Console |
| `unauthorized-domain` | Крок 2: додайте `localhost` і `127.0.0.1` в Authorized domains |
| `popup-blocked` | Дозвольте спливні вікна для сайту в браузері |
| Фото не завантажуються | Крок 4: увімкніть Anonymous-вхід; Крок 8: налаштуйте Storage Rules |
| Адмінка не пускає | Крок 6б: створіть окремий адмін-акаунт у Firebase |
| Каталог порожній | Нормально — каталог починається порожнім. Зареєструйтеся як спеціаліст і створіть профіль |

---

## Тарифи та оплата

- **Старт** — максимум 1 послуга і 20 записів на місяць (безкоштовно)
- **Професійний / Бізнес** — без лімітів + значок PRO

Оплата реалізована через **заявки**: користувач обирає тариф → створюється заявка → адмін підтверджує в адмінці → тариф вмикається.

Для справих оплат (автоматично) вставте посилання на оплату в `js/veyra-backend.js` у змінну `PAYMENT_LINKS` (наприклад, посилання з LiqPay / WayForPay / Fondy).

---

## Публікація сайту

**Варіант А — Firebase Hosting:**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # оберіть проєкт Veyra, public: .
firebase deploy --only hosting
```
Потім додайте отриманий домен (`veyra-xxx.web.app`) в **Authorized domains**.

**Варіант Б — Docker:**
```bash
docker build -t veyra .
docker run -d -p 8080:80 --name veyra veyra
```

---

## Альтернатива

**Supabase** (Postgres + Auth) — теж безкоштовний, але потребує більше коду. Якщо хочете Supabase — скажіть, перепишу `veyra-backend.js`.
