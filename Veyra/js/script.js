// ========================================
// VEYRA — ONE MAIN SCRIPT
// AUTH + LOGIN + MOBILE MENU + CALENDAR
// PRICE + CONTACT + CREATE/EDIT PROFILE
// SPECIALISTS FEED + FILTERS + PUBLIC PROFILE
// ========================================



(() => {
    "use strict";

    // ========================================
    // STORAGE
    // ========================================

    const USERS_KEY = "veyraUsers";
    const CURRENT_USER_KEY = "veyraCurrentUserId";
    const SPECIALISTS_KEY = "veyraSpecialists";

    // ========================================
    // ROUTES
    // ========================================

    function isInsideHtmlFolder() {
        return window.location.pathname.includes("/html/");
    }

    function goToHtml(fileName) {
        window.location.href = isInsideHtmlFolder()
            ? fileName
            : `html/${fileName}`;
    }

    function goToHome() {
        window.location.href = isInsideHtmlFolder()
            ? "../index.html"
            : "index.html";
    }

    // ========================================
    // HELPERS
    // ========================================

    function safeParse(value, fallback = []) {
        try {
            const parsed = JSON.parse(value);
            return parsed ?? fallback;
        } catch {
            return fallback;
        }
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function generateId(prefix = "item") {
        return `${prefix}_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`;
    }

    // ========================================
    // USERS / AUTH STORAGE
    // ========================================

    function getUsers() {
        const users = safeParse(
            localStorage.getItem(USERS_KEY) || "[]",
            []
        );

        return Array.isArray(users) ? users : [];
    }

    function saveUsers(users) {
        localStorage.setItem(
            USERS_KEY,
            JSON.stringify(users)
        );
    }

    function getCurrentUser() {
        const currentUserId =
            localStorage.getItem(CURRENT_USER_KEY);

        if (!currentUserId) {
            return null;
        }

        return (
            getUsers().find(
                user => user.id === currentUserId
            ) || null
        );
    }

    function setCurrentUser(userId) {
        localStorage.setItem(
            CURRENT_USER_KEY,
            userId
        );
    }

    function logout() {
        localStorage.removeItem(
            CURRENT_USER_KEY
        );

        window.location.reload();
    }

    function requireRole(role) {
        const user = getCurrentUser();

        if (!user) {
            alert(
                "Спочатку потрібно увійти або зареєструватися."
            );

            openAuthModal();

            return null;
        }

        if (user.role !== role) {
            alert(
                role === "specialist"
                    ? "Ця функція доступна лише спеціалістам."
                    : "Ця функція доступна лише клієнтам."
            );

            return null;
        }

        return user;
    }

    // ========================================
    // SPECIALISTS STORAGE
    // ========================================

    function getSpecialists() {
        const specialists = safeParse(
            localStorage.getItem(SPECIALISTS_KEY) || "[]",
            []
        );

        return Array.isArray(specialists)
            ? specialists
            : [];
    }

    function saveSpecialists(specialists) {
        try {
            localStorage.setItem(
                SPECIALISTS_KEY,
                JSON.stringify(specialists)
            );

            // Хмарна копія (якщо підключено Firebase — див. FIREBASE_SETUP.md)
            try {
                if (
                    window.VeyraBackend &&
                    window.VeyraBackend.configured
                ) {
                    window.VeyraBackend.pushSpecialists(
                        specialists
                    );
                }
            } catch (backendError) {
                console.error(backendError);
            }

            return true;
        } catch (error) {
            console.error(
                "Не вдалося зберегти профіль:",
                error
            );

            alert(
                "Не вдалося зберегти профіль. Можливо, фотографії займають забагато пам'яті."
            );

            return false;
        }
    }

    // ========================================
    // ТАРИФИ ТА ЛІМІТИ
    // ========================================

    const ADMIN_EMAILS = [
        "veronchik.and.it@gmail.com"
    ];

    const PLANS = {
        start: {
            name: "Старт",
            services: 1,
            bookingsPerMonth: 20
        },
        pro: {
            name: "Професійний",
            services: Infinity,
            bookingsPerMonth: Infinity
        },
        business: {
            name: "Бізнес",
            services: Infinity,
            bookingsPerMonth: Infinity
        }
    };

    const BOOKINGS_KEY = "veyraBookings";

    const PAYMENTS_KEY = "veyraPayments";

    function getPayments() {
        const list = safeParse(
            localStorage.getItem(
                PAYMENTS_KEY
            ) || "[]",
            []
        );

        return Array.isArray(list)
            ? list
            : [];
    }

    function savePayments(list) {
        try {
            localStorage.setItem(
                PAYMENTS_KEY,
                JSON.stringify(list)
            );

            try {
                if (
                    window.VeyraBackend &&
                    window.VeyraBackend
                        .configured
                ) {
                    list.forEach(item => {
                        if (item && item.id) {
                            window.VeyraBackend.pushDoc(
                                "payments",
                                item.id,
                                item
                            );
                        }
                    });
                }
            } catch (backendError) {
                console.error(
                    backendError
                );
            }

            return true;
        } catch (error) {
            console.error(error);

            return false;
        }
    }

    const DAY_SLOTS = [
        "09:00",
        "10:00",
        "11:00",
        "12:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
        "18:00"
    ];

    function getBookings() {
        const list = safeParse(
            localStorage.getItem(
                BOOKINGS_KEY
            ) || "[]",
            []
        );

        return Array.isArray(list)
            ? list
            : [];
    }

    function saveBookings(list) {
        try {
            localStorage.setItem(
                BOOKINGS_KEY,
                JSON.stringify(list)
            );

            return true;
        } catch (error) {
            console.error(error);

            return false;
        }
    }

    function getUserPlan(user) {
        return user &&
            user.plan &&
            PLANS[user.plan]
            ? user.plan
            : "start";
    }

    function getPlanForSpecialist(
        specialist
    ) {
        if (!specialist) {
            return "start";
        }

        const owner = getUsers().find(
            item =>
                item.id ===
                specialist.ownerId
        );

        // Демо-профілі без власника — без лімітів
        if (!owner) {
            return "pro";
        }

        return getUserPlan(owner);
    }

    // PRO-бейдж — лише реальним платним (у сідів без власника нема)
    function isProSpecialist(
        specialist
    ) {
        if (!specialist) {
            return false;
        }

        const owner = getUsers().find(
            item =>
                item.id ===
                specialist.ownerId
        );

        return (
            !!owner &&
            getUserPlan(owner) !==
                "start"
        );
    }

    function currentMonthKey() {
        const now = new Date();

        return (
            now.getFullYear() +
            "-" +
            String(
                now.getMonth() + 1
            ).padStart(2, "0")
        );
    }

    function countBookingsThisMonth(
        specialistId
    ) {
        const prefix =
            currentMonthKey();

        return getBookings().filter(
            item =>
                item.specialistId ===
                    specialistId &&
                String(
                    item.date || ""
                ).indexOf(prefix) ===
                    0 &&
                item.status !==
                    "cancelled"
        ).length;
    }

    function isSlotTaken(
        specialistId,
        date,
        time
    ) {
        return getBookings().some(
            item =>
                item.specialistId ===
                    specialistId &&
                item.date === date &&
                item.time === time &&
                item.status !==
                    "cancelled"
        );
    }

    function formatCardDate(iso) {
        try {
            return new Date(
                iso
            ).toLocaleDateString(
                "uk-UA",
                {
                    day: "numeric",
                    month: "long"
                }
            );
        } catch {
            return "";
        }
    }

    function plural(n, one, few, many) {
        const lastTwo = n % 100;
        const last = n % 10;

        if (
            lastTwo >= 11 &&
            lastTwo <= 14
        ) {
            return `${n} ${many}`;
        }

        if (last === 1) {
            return `${n} ${one}`;
        }

        if (last >= 2 && last <= 4) {
            return `${n} ${few}`;
        }

        return `${n} ${many}`;
    }

    // ========================================
    // ОБРАНЕ (спільне: каталог + акаунт)
    // ========================================

        const FAVORITES_KEY = "veyraFavorites";

        function getFavorites() {
            try {
                const raw =
                    localStorage.getItem(
                        FAVORITES_KEY
                    );

                const parsed =
                    JSON.parse(raw || "[]");

                return Array.isArray(parsed)
                    ? parsed
                    : [];
            } catch {
                return [];
            }
        }

        function isFavorite(id) {
            return getFavorites().includes(
                id
            );
        }

        function toggleFavorite(id) {
            const favs =
                getFavorites();

            const at =
                favs.indexOf(id);

            if (at === -1) {
                favs.push(id);
            } else {
                favs.splice(at, 1);
            }

            try {
                localStorage.setItem(
                    FAVORITES_KEY,
                    JSON.stringify(favs)
                );
            } catch (error) {
                console.error(error);
            }

            return at === -1;
        }

    // ========================================
    // ДЕМО-РЕЖИМ ВИМКНЕНО
    // Каталог починається порожнім. Фахівці з'являються після
    // реєстрації та створення профілю у create.html.
    // ========================================

    // ========================================
    // HEADER LOGIN + MOBILE MENU
    // ========================================

    const loginBtn =
        document.querySelector("#loginBtn");

    const loginMenu =
        document.querySelector("#loginMenu");

    const burgerBtn =
        document.querySelector("#burgerBtn");

    const mobileMenu =
        document.querySelector("#mobileMenu");

    const mobileLoginBtn =
        document.querySelector("#mobileLoginBtn");

    if (loginBtn) {
        loginBtn.addEventListener(
            "click",
            event => {
                event.preventDefault();
                event.stopPropagation();

                const user =
                    getCurrentUser();

                if (user) {
                    goToHtml(
                        "account.html"
                    );
                    return;
                }

                if (loginMenu) {
                    loginMenu.classList.toggle(
                        "active"
                    );
                } else {
                    openAuthModal();
                }
            }
        );
    }

    if (burgerBtn && mobileMenu) {
        burgerBtn.addEventListener(
            "click",
            () => {
                burgerBtn.classList.toggle(
                    "active"
                );

                mobileMenu.classList.toggle(
                    "active"
                );

                if (
                    !mobileMenu.classList.contains(
                        "active"
                    )
                ) {
                    loginMenu?.classList.remove(
                        "active"
                    );
                }
            }
        );
    }

    if (mobileLoginBtn) {
        mobileLoginBtn.addEventListener(
            "click",
            () => {
                loginMenu?.classList.remove(
                    "active"
                );

                mobileMenu?.classList.remove(
                    "active"
                );

                burgerBtn?.classList.remove(
                    "active"
                );

                if (getCurrentUser()) {
                    goToHtml(
                        "account.html"
                    );
                } else {
                    openAuthModal();
                }
            }
        );
    }

    document.addEventListener(
        "click",
        event => {
            if (
                loginMenu &&
                loginBtn &&
                !loginMenu.contains(
                    event.target
                ) &&
                !loginBtn.contains(
                    event.target
                )
            ) {
                loginMenu.classList.remove(
                    "active"
                );
            }
        }
    );

    // ========================================
    // LOGIN MENU ROLE BUTTONS
    // ========================================

    // Роль, яку користувач обрав у меню "Увійти як".
    // Запам'ятовуємо і підставляємо після реєстрації,
    // щоб не питати двічі.
    let pendingRole = null;

    const specialistLogin =
        document.querySelector(
            "#specialistLogin"
        );

    const clientLogin =
        document.querySelector(
            "#clientLogin"
        );

    function openAuthFromRoleButton(
        role,
        event
    ) {
        event?.preventDefault();
        event?.stopPropagation();

        loginMenu?.classList.remove(
            "active"
        );

        const user = getCurrentUser();

        if (user) {
            if (!user.role) {
                pendingRole = role;
                openAuthModal();
                showRoleSelection();
                return;
            }

            openAccountModal();
            return;
        }

        pendingRole = role;
        openAuthModal();
        showRegisterForm();
    }

    // Слухаємо кліки і на кнопках, і на вкладених span —
    // щоб працювала вся площа кнопки, а не лише текст.
    document
        .querySelectorAll(".login-option")
        .forEach((button, index) => {
            const role =
                button.querySelector(
                    "#specialistLogin"
                )
                    ? "specialist"
                    : button.querySelector(
                            "#clientLogin"
                        )
                      ? "client"
                      : index === 0
                        ? "specialist"
                        : "client";

            button.addEventListener(
                "click",
                event =>
                    openAuthFromRoleButton(
                        role,
                        event
                    )
            );
        });

    // ========================================
    // AUTH MODAL
    // ========================================

    function createAuthModal() {
        if (
            document.querySelector(
                "#veyraAuthModal"
            )
        ) {
            return;
        }

        const modal =
            document.createElement("div");

        modal.id = "veyraAuthModal";

        modal.innerHTML = `
            <div class="veyra-auth-overlay">
                <div class="veyra-auth-modal">
                    <button
                        type="button"
                        class="veyra-auth-close"
                        id="authClose"
                        aria-label="Закрити"
                    >
                        ×
                    </button>

                    <div id="authContent"></div>
                </div>
            </div>
        `;

        document.body.appendChild(
            modal
        );

        document
            .querySelector("#authClose")
            ?.addEventListener(
                "click",
                closeAuthModal
            );

        const overlay =
            modal.querySelector(
                ".veyra-auth-overlay"
            );

        overlay?.addEventListener(
            "click",
            event => {
                if (
                    event.target ===
                    overlay
                ) {
                    closeAuthModal();
                }
            }
        );

        showLoginForm();
    }

    function openAuthModal() {
        createAuthModal();

        document
            .querySelector(
                "#veyraAuthModal"
            )
            ?.classList.add("active");

        document.body.style.overflow =
            "hidden";
    }

    function closeAuthModal() {
        document
            .querySelector(
                "#veyraAuthModal"
            )
            ?.classList.remove("active");

        document.body.style.overflow =
            "";
    }

    // Бейджі меню — оновлювати при наведенні (бронювання могли змінитись)
    document
        .querySelector(
            ".header__button"
        )
        ?.addEventListener(
            "mouseenter",
            () =>
                refreshUserMenu(
                    getCurrentUser()
                )
        );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                document.querySelector(
                    "#veyraAuthModal.active"
                )
            ) {
                closeAuthModal();
            }

            if (
                event.key === "Escape" &&
                document.querySelector(
                    "#veyraBookingModal"
                )
            ) {
                closeBookingModal();
            }

            if (
                event.key === "Escape" &&
                document.querySelector(
                    "#veyraChatModal"
                )
            ) {
                closeChatModal();
            }
        }
    );

    // ========================================
    // LOGIN FORM
    // ========================================

    function showLoginForm() {
        const content =
            document.querySelector(
                "#authContent"
            );

        if (!content) {
            return;
        }

        content.innerHTML = `
            <div class="veyra-auth-header">
                <h2>Увійти</h2>
                <p>Увійдіть у свій акаунт Veyra</p>
            </div>

            <button
                type="button"
                class="veyra-google-btn"
                id="googleLogin"
            >
                <span>G</span>
                Продовжити через Google
            </button>

            <div class="veyra-auth-divider">
                <span>або</span>
            </div>

            <form id="loginForm">
                <label>
                    Email

                    <input
                        type="email"
                        id="loginEmail"
                        placeholder="you@example.com"
                        required
                    >
                </label>

                <label>
                    Пароль

                    <input
                        type="password"
                        id="loginPassword"
                        placeholder="••••••••"
                        required
                    >
                </label>

                <button
                    type="submit"
                    class="veyra-auth-submit"
                >
                    Увійти
                </button>
            </form>

            <p class="veyra-auth-switch">
                Немає акаунта?

                <button
                    type="button"
                    id="showRegister"
                >
                    Зареєструватися
                </button>
            </p>
        `;

        document
            .querySelector("#loginForm")
            ?.addEventListener(
                "submit",
                loginUser
            );

        document
            .querySelector(
                "#showRegister"
            )
            ?.addEventListener(
                "click",
                showRegisterForm
            );

        document
            .querySelector("#googleLogin")
            ?.addEventListener(
                "click",
                handleGoogleSignIn
            );
    }

    // ========================================
    // REGISTER FORM
    // ========================================

    function showRegisterForm() {
        const content =
            document.querySelector(
                "#authContent"
            );

        if (!content) {
            return;
        }

        content.innerHTML = `
            <div class="veyra-auth-header">
                <h2>Створити акаунт</h2>
                <p>Зареєструйтеся у Veyra</p>
            </div>

            ${
                pendingRole
                    ? `
                        <p class="veyra-auth-hint">
                            Реєстрація як:
                            ${
                                pendingRole ===
                                "specialist"
                                    ? "Спеціаліст"
                                    : "Клієнт"
                            }
                            · <button
                                type="button"
                                id="changeRole"
                                style="border:0;background:transparent;color:#66528b;font:inherit;font-weight:600;cursor:pointer;padding:0"
                            >змінити</button>
                        </p>
                    `
                    : ""
            }

            <button
                type="button"
                class="veyra-google-btn"
                id="googleRegister"
            >
                <span>G</span>
                Зареєструватися через Google
            </button>

            <div class="veyra-auth-divider">
                <span>або</span>
            </div>

            <form id="registerForm">
                <label>
                    Ім'я

                    <input
                        type="text"
                        id="registerName"
                        placeholder="Ваше ім'я"
                        required
                    >
                </label>

                <label>
                    Email

                    <input
                        type="email"
                        id="registerEmail"
                        placeholder="you@example.com"
                        required
                    >
                </label>

                <label>
                    Пароль

                    <input
                        type="password"
                        id="registerPassword"
                        placeholder="Мінімум 6 символів"
                        minlength="6"
                        required
                    >
                </label>

                <button
                    type="submit"
                    class="veyra-auth-submit"
                >
                    Продовжити
                </button>
            </form>

            <p class="veyra-auth-switch">
                Вже маєте акаунт?

                <button
                    type="button"
                    id="showLogin"
                >
                    Увійти
                </button>
            </p>
        `;

        document
            .querySelector(
                "#registerForm"
            )
            ?.addEventListener(
                "submit",
                registerUser
            );

        document
            .querySelector("#showLogin")
            ?.addEventListener(
                "click",
                showLoginForm
            );

        document
            .querySelector(
                "#changeRole"
            )
            ?.addEventListener(
                "click",
                () => {
                    pendingRole = null;
                    showRoleSelection();
                }
            );

        document
            .querySelector(
                "#googleRegister"
            )
            ?.addEventListener(
                "click",
                handleGoogleSignIn
            );
    }

    // ========================================
    // GOOGLE SIGN-IN (через Firebase, див. FIREBASE_SETUP.md)
    // ========================================

    function handleGoogleSignIn() {
        if (
            window.VeyraBackend &&
            window.VeyraBackend.configured
        ) {
            window.VeyraBackend.googleSignIn()
                .then(handleGoogleCredential)
                .catch(error => {
                    console.error(error);

                    alert(
                        googleErrorText(
                            error
                        )
                    );
                });

            return;
        }

        alert(
            "Google-вхід ще не підключено. Додайте ключі Firebase у js/veyra-backend.js — кроки у файлі FIREBASE_SETUP.md."
        );
    }

    function googleErrorText(error) {
        const code = String(
            (error && error.code) || ""
        );

        if (
            code ===
                "auth/configuration-not-found" ||
            code ===
                "auth/operation-not-allowed"
        ) {
            return "Google-вхід вимкнено в Firebase-консолі. Увімкніть: Authentication → Sign-in method → Google → Enable (і додайте Support email).";
        }

        if (
            code ===
            "auth/unauthorized-domain"
        ) {
            return "Цей домен не дозволено. Додайте його: Authentication → Settings → Authorized domains → Add domain (наприклад 127.0.0.1 або ваш сайт).";
        }

        if (
            code === "auth/popup-blocked"
        ) {
            return "Браузер заблокував спливне вікно входу. Дозвольте спливні вікна для цього сайту і спробуйте ще.";
        }

        if (
            code ===
                "auth/popup-closed-by-user" ||
            code ===
                "auth/cancelled-popup-request"
        ) {
            return "Вікно входу закрито. Спробуйте ще раз.";
        }

        if (
            code ===
            "auth/network-request-failed"
        ) {
            return "Немає з'єднання з Google. Перевірте інтернет і спробуйте ще.";
        }

        if (
            code ===
            "auth/account-exists-with-different-credential"
        ) {
            return "Цей email уже прив'язано до іншого способу входу. Увійдіть тим способом.";
        }

        return (
            "Не вдалося увійти через Google" +
            (code
                ? ` (${code}).`
                : ".") +
            " Спробуйте ще раз."
        );
    }

    function handleGoogleCredential(credential) {
        const email = String(
            credential.email || ""
        )
            .trim()
            .toLowerCase();

        if (!email) {
            alert(
                "Google не повернув email. Спробуйте інший акаунт."
            );
            return;
        }

        const users = getUsers();

        let user = users.find(
            item => item.email === email
        );

        if (!user) {
            user = {
                id: generateId("user"),
                name:
                    credential.name ||
                    email,
                email,
                password: "",
                googleUid:
                    credential.uid || "",
                role: pendingRole || null,
                createdAt:
                    new Date().toISOString()
            };

            users.push(user);
            saveUsers(users);
        } else if (
            credential.uid &&
            !user.googleUid
        ) {
            user.googleUid =
                credential.uid;

            saveUsers(users);
        }

        setCurrentUser(user.id);

        if (pendingRole && !user.role) {
            user.role = pendingRole;

            saveUsers(users);

            pendingRole = null;
        } else {
            pendingRole = null;
        }

        closeAuthModal();
        updateLoginButton();

        if (!user.role) {
            openAuthModal();
            showRoleSelection();
            return;
        }

        goToHome();
    }

    function registerUser(event) {
        event.preventDefault();

        const name =
            document
                .querySelector(
                    "#registerName"
                )
                ?.value.trim();

        const email =
            document
                .querySelector(
                    "#registerEmail"
                )
                ?.value.trim()
                .toLowerCase();

        const password =
            document.querySelector(
                "#registerPassword"
            )?.value;

        if (
            !name ||
            !email ||
            !password
        ) {
            return;
        }

        const users = getUsers();

        if (
            users.some(
                user =>
                    user.email === email
            )
        ) {
            alert(
                "Акаунт з таким email вже існує."
            );
            return;
        }

        const user = {
            id: generateId("user"),
            name,
            email,
            password,
            role: pendingRole || null,
            createdAt:
                new Date().toISOString()
        };

        users.push(user);

        saveUsers(users);
        setCurrentUser(user.id);

        if (pendingRole) {
            pendingRole = null;

            closeAuthModal();
            updateLoginButton();
            goToHome();

            return;
        }

        showRoleSelection();
    }

    // ========================================
    // ROLE SELECTION
    // ========================================

    function showRoleSelection() {
        const content =
            document.querySelector(
                "#authContent"
            );

        if (!content) {
            return;
        }

        content.innerHTML = `
            <div class="veyra-auth-header">
                <h2>Оберіть тип акаунта</h2>

                <p>
                    Це визначить, які функції Veyra вам доступні
                </p>
            </div>

            <div class="veyra-role-options">
                <button
                    type="button"
                    class="veyra-role-card"
                    id="chooseSpecialist"
                >
                    <div class="veyra-role-icon">
                        ✦
                    </div>

                    <div>
                        <strong>
                            Я спеціаліст
                        </strong>

                        <p>
                            Створювати свою сторінку,
                            додавати послуги та керувати записами
                        </p>
                    </div>
                </button>

                <button
                    type="button"
                    class="veyra-role-card"
                    id="chooseClient"
                >
                    <div class="veyra-role-icon">
                        ♡
                    </div>

                    <div>
                        <strong>
                            Я клієнт
                        </strong>

                        <p>
                            Знаходити спеціалістів,
                            переглядати послуги та бронювати
                        </p>
                    </div>
                </button>
            </div>
        `;

        document
            .querySelector(
                "#chooseSpecialist"
            )
            ?.addEventListener(
                "click",
                () =>
                    selectRole(
                        "specialist"
                    )
            );

        document
            .querySelector(
                "#chooseClient"
            )
            ?.addEventListener(
                "click",
                () =>
                    selectRole(
                        "client"
                    )
            );
    }

    function selectRole(role) {
        const user =
            getCurrentUser();

        if (!user) {
            return;
        }

        const users =
            getUsers();

        const userIndex =
            users.findIndex(
                item =>
                    item.id === user.id
            );

        if (userIndex === -1) {
            return;
        }

        users[userIndex].role =
            role;

        saveUsers(users);

        pendingRole = null;

        closeAuthModal();
        updateLoginButton();
        goToHome();
    }

    // ========================================
    // LOGIN USER
    // ========================================

    function loginUser(event) {
        event.preventDefault();

        const email =
            document
                .querySelector(
                    "#loginEmail"
                )
                ?.value.trim()
                .toLowerCase();

        const password =
            document.querySelector(
                "#loginPassword"
            )?.value;

        const user =
            getUsers().find(
                item =>
                    item.email === email &&
                    item.password ===
                        password
            );

        if (!user) {
            alert(
                "Неправильний email або пароль."
            );
            return;
        }

        setCurrentUser(user.id);

        pendingRole = null;

        closeAuthModal();
        updateLoginButton();

        if (!user.role) {
            openAuthModal();
            showRoleSelection();
            return;
        }

        goToHome();
    }

    // ========================================
    // ACCOUNT MODAL
    // ========================================

    function openAccountModal() {
        const user =
            getCurrentUser();

        if (!user) {
            openAuthModal();
            return;
        }

        createAuthModal();
        openAuthModal();

        const content =
            document.querySelector(
                "#authContent"
            );

        if (!content) {
            return;
        }

        // Акаунт без ролі (реєстрацію не завершено) —
        // повертаємо на вибір ролі замість "фантомного клієнта".
        if (!user.role) {
            showRoleSelection();
            return;
        }

        const roleName =
            user.role === "specialist"
                ? "Спеціаліст"
                : user.role === "client"
                  ? "Клієнт"
                  : "Роль не обрано";

        content.innerHTML = `
            <div class="veyra-auth-header">
                <h2>
                    ${escapeHtml(user.name)}
                </h2>

                <p>
                    ${escapeHtml(user.email)}
                </p>
            </div>

            <div class="veyra-account-role">
                ${roleName}
            </div>

            <button
                type="button"
                class="veyra-auth-submit"
                id="accountBtn"
            >
                Мій акаунт
            </button>

            ${
                user.role === "specialist"
                    ? `
                        <button
                            type="button"
                            class="veyra-auth-submit"
                            id="myProfileBtn"
                        >
                            Моя сторінка
                        </button>

                        <button
                            type="button"
                            class="veyra-auth-submit"
                            id="allSpecialistsBtn"
                        >
                            Переглянути спеціалістів
                        </button>
                    `
                    : `
                        <button
                            type="button"
                            class="veyra-auth-submit"
                            id="browseBtn"
                        >
                            Знайти спеціаліста
                        </button>
                    `
            }

            <button
                type="button"
                class="veyra-logout"
                id="logoutBtn"
            >
                Вийти з акаунта
            </button>
        `;

        document
            .querySelector("#logoutBtn")
            ?.addEventListener(
                "click",
                logout
            );

        document
            .querySelector(
                "#myProfileBtn"
            )
            ?.addEventListener(
                "click",
                () =>
                    goToHtml(
                        "create.html"
                    )
            );

        document
            .querySelector(
                "#allSpecialistsBtn"
            )
            ?.addEventListener(
                "click",
                () =>
                    goToHtml(
                        "specialists.html"
                    )
            );

        document
            .querySelector("#browseBtn")
            ?.addEventListener(
                "click",
                () =>
                    goToHtml(
                        "specialists.html"
                    )
            );

        document
            .querySelector("#accountBtn")
            ?.addEventListener(
                "click",
                () =>
                    goToHtml(
                        "account.html"
                    )
            );
    }

    function updateLoginButton() {
        const user =
            getCurrentUser();

        document.body.classList.toggle(
            "logged-in",
            !!user
        );

        if (!loginBtn) {
            return;
        }

        loginBtn.textContent =
            user
                ? user.name
                : "Увійти";

        refreshUserMenu(user);
    }

    // Випадаюче меню нікнейма: бронювання / замовлення / обране
    function refreshUserMenu(user) {
        const menu =
            document.querySelector(
                "#userMenu"
            );

        if (!menu || !user) {
            return;
        }

        const specialists =
            getSpecialists();

        const myProfile =
            specialists.find(
                item =>
                    item.ownerId ===
                    user.id
            ) || null;

        const myBookings = getBookings()
            .filter(
                item =>
                    item.clientId ===
                    user.id
            );

        const incoming = myProfile
            ? getBookings().filter(
                  item =>
                      item.specialistId ===
                      myProfile.id
              )
            : [];

        const favs = getFavorites();

        const setBadge = (id, value) => {
            const el =
                document.querySelector(
                    id
                );

            if (el) {
                el.textContent =
                    String(value);
            }
        };

        setBadge(
            "#umBookings",
            myBookings.length
        );

        setBadge(
            "#umOrders",
            incoming.length
        );

        setBadge(
            "#umFavs",
            favs.length
        );

        const ordersItem =
            document.querySelector(
                "#umOrdersItem"
            );

        if (ordersItem) {
            ordersItem.hidden =
                user.role !==
                "specialist";
        }
    }

    document.addEventListener(
        "click",
        event => {
            const goBtn =
                event.target.closest(
                    "[data-ugo]"
                );

            if (goBtn) {
                event.preventDefault();

                document
                    .querySelector(
                        "#userMenu"
                    )
                    ?.classList.remove(
                        "active"
                    );

                goToHtml(
                    goBtn.getAttribute(
                        "data-ugo"
                    )
                );

                return;
            }

            if (
                event.target.closest(
                    "#umLogout"
                )
            ) {
                event.preventDefault();

                logout();
            }

            if (
                event.target.closest(
                    "#umChangeAccount"
                )
            ) {
                event.preventDefault();

                logout();

                openAuthModal();
            }
        }
    );

    updateLoginButton();

    // ========================================
    // CALENDAR
    // ========================================

    const calendarDays =
        document.querySelector(
            "#calendarDays"
        );

    const monthName =
        document.querySelector(
            "#monthName"
        );

    const yearElement =
        document.querySelector("#year");

    const prevMonth =
        document.querySelector(
            "#prevMonth"
        );

    const nextMonth =
        document.querySelector(
            "#nextMonth"
        );

    let currentDate =
        new Date();

    const months = [
        "Січень",
        "Лютий",
        "Березень",
        "Квітень",
        "Травень",
        "Червень",
        "Липень",
        "Серпень",
        "Вересень",
        "Жовтень",
        "Листопад",
        "Грудень"
    ];

    const bookedDays = [
        5,
        12,
        17,
        19
    ];

    function renderCalendar() {
        if (!calendarDays) {
            return;
        }

        calendarDays.innerHTML =
            "";

        const month =
            currentDate.getMonth();

        const year =
            currentDate.getFullYear();

        if (monthName) {
            monthName.textContent =
                months[month];
        }

        if (yearElement) {
            yearElement.textContent =
                year;
        }

        const firstDay =
            new Date(
                year,
                month,
                1
            );

        let firstDayIndex =
            firstDay.getDay();

        firstDayIndex =
            firstDayIndex === 0
                ? 6
                : firstDayIndex - 1;

        const daysInMonth =
            new Date(
                year,
                month + 1,
                0
            ).getDate();

        for (
            let i = 0;
            i < firstDayIndex;
            i++
        ) {
            const emptyDay =
                document.createElement(
                    "div"
                );

            emptyDay.classList.add(
                "calendar__day",
                "empty"
            );

            calendarDays.appendChild(
                emptyDay
            );
        }

        for (
            let day = 1;
            day <= daysInMonth;
            day++
        ) {
            const dayElement =
                document.createElement(
                    "div"
                );

            dayElement.classList.add(
                "calendar__day"
            );

            dayElement.textContent =
                day;

            const today =
                new Date();

            if (
                day ===
                    today.getDate() &&
                month ===
                    today.getMonth() &&
                year ===
                    today.getFullYear()
            ) {
                dayElement.classList.add(
                    "today"
                );
            }

            if (
                bookedDays.includes(day)
            ) {
                dayElement.classList.add(
                    "busy"
                );

                dayElement.style.pointerEvents =
                    "none";
            } else {
                dayElement.classList.add(
                    "available"
                );

                dayElement.addEventListener(
                    "click",
                    () => {
                        console.log(
                            `Обрано ${day} число`
                        );
                    }
                );
            }

            calendarDays.appendChild(
                dayElement
            );
        }
    }

    prevMonth?.addEventListener(
        "click",
        () => {
            currentDate.setMonth(
                currentDate.getMonth() -
                    1
            );

            renderCalendar();
        }
    );

    nextMonth?.addEventListener(
        "click",
        () => {
            currentDate.setMonth(
                currentDate.getMonth() +
                    1
            );

            renderCalendar();
        }
    );

    if (calendarDays) {
        renderCalendar();
    }

    // ========================================
    // HOMEPAGE CREATE BUTTONS
    // (усі .btn1 поза модалкою ведуть на створення)
    // ========================================

    const createPageButtons =
        Array.from(
            document.querySelectorAll(
                ".btn1"
            )
        ).filter(
            button =>
                !button.closest(
                    "#veyraAuthModal"
                )
        );

    createPageButtons.forEach(
        createPageBtn => {
            createPageBtn.addEventListener(
                "click",
                event => {
                    event.preventDefault();

                    const user =
                        getCurrentUser();

                    if (!user) {
                        pendingRole =
                            "specialist";

                        alert(
                            "Спочатку увійдіть або зареєструйтесь як спеціаліст."
                        );

                        openAuthModal();
                        showRegisterForm();
                        return;
                    }

                    if (
                        user.role !==
                        "specialist"
                    ) {
                        if (!user.role) {
                            pendingRole =
                                "specialist";
                            openAuthModal();
                            showRoleSelection();
                            return;
                        }

                        alert(
                            "Ця функція доступна лише спеціалістам."
                        );
                        return;
                    }

                    goToHtml("create.html");
                }
            );
        }
    );

    // ========================================
    // BROWSE SPECIALISTS BUTTONS
    // ========================================

    const browseButtons =
        document.querySelectorAll(
            ".btn2"
        );

    browseButtons.forEach(
        button => {
            if (
                button.closest(
                    "#veyraAuthModal"
                )
            ) {
                return;
            }

            const text =
                button.textContent
                    .toLowerCase();

            if (
                text.includes(
                    "спеціаліст"
                ) ||
                text.includes(
                    "фахів"
                ) ||
                text.includes(
                    "каталог"
                ) ||
                text.includes(
                    "досліджувати"
                ) ||
                text.includes(
                    "знайти"
                )
            ) {
                button.addEventListener(
                    "click",
                    event => {
                        event.preventDefault();

                        goToHtml(
                            "specialists.html"
                        );
                    }
                );
            }
        }
    );

    // ========================================
    // PRICE PAGE — TARIFF BUTTONS
    // ========================================

    document
        .querySelectorAll("[data-plan]")
        .forEach(button => {
            button.addEventListener(
                "click",
                event => {
                    event.preventDefault();

                    const plan =
                        button.getAttribute(
                            "data-plan"
                        );

                    if (!PLANS[plan]) {
                        return;
                    }

                    const user =
                        getCurrentUser();

                    if (!user) {
                        pendingRole =
                            "specialist";

                        alert(
                            "Щоб обрати тариф, спочатку зареєструйтесь як спеціаліст."
                        );

                        openAuthModal();
                        showRegisterForm();
                        return;
                    }

                    if (
                        user.role !==
                        "specialist"
                    ) {
                        if (!user.role) {
                            pendingRole =
                                "specialist";
                            openAuthModal();
                            showRoleSelection();
                            return;
                        }

                        alert(
                            "Тарифи доступні лише спеціалістам."
                        );
                        return;
                    }

                    const users =
                        getUsers();

                    const at =
                        users.findIndex(
                            item =>
                                item.id ===
                                user.id
                        );

                    const payLinks =
                        (window.VeyraBackend &&
                            window.VeyraBackend
                                .PAYMENT_LINKS) ||
                        {};

                    const payLink =
                        payLinks[plan];

                    // Є посилання на оплату → заявка + перехід на оплату.
                    // Підтверджує адмін в адмінці.
                    if (payLink) {
                        const pays =
                            getPayments();

                        pays.push({
                            id: generateId(
                                "pay"
                            ),
                            userId: user.id,
                            userEmail:
                                user.email,
                            userName:
                                user.name,
                            plan,
                            status: "pending",
                            createdAt:
                                new Date().toISOString()
                        });

                        savePayments(pays);

                        try {
                            window.open(
                                payLink,
                                "_blank"
                            );
                        } catch (openError) {
                            console.error(
                                openError
                            );
                        }

                        alert(
                            `Заявку на тариф «${PLANS[plan].name}» створено. Після оплати адмін підтвердить її — статус видно в «Моєму акаунті».`
                        );

                        goToHome();
                        return;
                    }

                    // Демо-режим (посилань немає): вмикаємо одразу.
                    if (at !== -1) {
                        users[at].plan =
                            plan;

                        saveUsers(users);
                    }

                    alert(
                        `Тариф «${PLANS[plan].name}» активовано (демо — без оплати).`
                    );

                    goToHome();
                }
            );
        });

    // ========================================
    // PRICE
    // ========================================

    const priceLink =
        document.querySelector(
            "#priceLink"
        );

    if (priceLink) {
        priceLink.addEventListener(
            "click",
            event => {
                const user =
                    getCurrentUser();

                if (!user) {
                    event.preventDefault();

                    alert(
                        "Спочатку потрібно увійти або зареєструватися."
                    );

                    openAuthModal();
                    return;
                }

                if (
                    user.role !==
                    "specialist"
                ) {
                    event.preventDefault();

                    alert(
                        "Ця функція доступна лише спеціалістам."
                    );
                }
            }
        );
    }

    // ========================================
    // CONTACT FORM
    // ========================================

    const contactForm =
        document.getElementById(
            "contactForm"
        );

    const formStatus =
        document.getElementById(
            "formStatus"
        );

    if (
        contactForm &&
        formStatus
    ) {
        contactForm.addEventListener(
            "submit",
            async event => {
                event.preventDefault();

                const formData =
                    new FormData(
                        contactForm
                    );

                formStatus.textContent =
                    "Відправляємо...";

                formStatus.className =
                    "form__status";

                try {
                    const response =
                        await fetch(
                            "https://formspree.io/f/meaqzbee",
                            {
                                method:
                                    "POST",
                                body:
                                    formData,
                                headers: {
                                    Accept:
                                        "application/json"
                                }
                            }
                        );

                    if (!response.ok) {
                        throw new Error(
                            "Помилка відправки"
                        );
                    }

                    formStatus.textContent =
                        "Повідомлення успішно відправлено!";

                    formStatus.classList.add(
                        "success"
                    );

                    contactForm.reset();
                } catch (error) {
                    console.error(
                        error
                    );

                    formStatus.textContent =
                        "Не вдалося відправити повідомлення. Спробуйте ще раз.";

                    formStatus.classList.add(
                        "error"
                    );
                }
            }
        );
    }

    // ========================================
    // CREATE.HTML
    // CREATE / EDIT SPECIALIST PROFILE
    // ========================================

    const specialistForm =
        document.querySelector(
            "#specialistForm"
        );

    if (specialistForm) {
        initSpecialistEditor();
    }

    function initSpecialistEditor() {
        const currentUser =
            getCurrentUser();

        if (!currentUser) {
            pendingRole =
                "specialist";

            openAuthModal();
            showRegisterForm();

            return;
        }

        if (
            currentUser.role !==
            "specialist"
        ) {
            alert(
                "Ця сторінка доступна лише спеціалістам."
            );

            goToHome();
            return;
        }

        const nameInput =
            document.querySelector(
                "#name"
            );

        const professionInput =
            document.querySelector(
                "#profession"
            );

        const cityInput =
            document.querySelector(
                "#city"
            );

        const workplaceInput =
            document.querySelector(
                "#workplace"
            );

        const addressInput =
            document.querySelector(
                "#address"
            );

        const phoneInput =
            document.querySelector(
                "#phone"
            );

        const descriptionInput =
            document.querySelector(
                "#description"
            );

        const profilePhotoInput =
            document.querySelector(
                "#profilePhoto"
            );

        const profilePhotoPreview =
            document.querySelector(
                "#profilePhotoPreview"
            );

        const servicesContainer =
            document.querySelector(
                "#servicesContainer"
            );

        const addServiceBtn =
            document.querySelector(
                "#addServiceBtn"
            );

        const portfolioInput =
            document.querySelector(
                "#portfolioInput"
            );

        const portfolioPreview =
            document.querySelector(
                "#portfolioPreview"
            );

        const visibleInput =
            document.querySelector(
                "#visible"
            );

        const deleteProfileBtn =
            document.querySelector(
                "#deleteProfileBtn"
            );

        const saveButtonText =
            document.querySelector(
                "#saveButtonText"
            );

        let profilePhoto = "";
        let portfolio = [];

        let existingProfile =
            getSpecialists().find(
                specialist =>
                    specialist.ownerId ===
                    currentUser.id
            ) || null;

        function fileToDataUrl(file) {
            return new Promise(
                (resolve, reject) => {
                    const reader =
                        new FileReader();

                    reader.onload =
                        () =>
                            resolve(
                                reader.result
                            );

                    reader.onerror =
                        reject;

                    reader.readAsDataURL(
                        file
                    );
                }
            );
        }

        // ========================================
        // PROFILE PHOTO
        // ========================================

        function renderProfilePhoto() {
            if (!profilePhotoPreview) {
                return;
            }

            profilePhotoPreview.innerHTML =
                profilePhoto
                    ? `
                        <img
                            src="${profilePhoto}"
                            alt="Фото профілю"
                        >
                    `
                    : `
                        <span>
                            Додайте фото
                        </span>
                    `;
        }

        // ========================================
        // PORTFOLIO
        // ========================================

        function renderPortfolio() {
            if (!portfolioPreview) {
                return;
            }

            portfolioPreview.innerHTML =
                "";

            portfolio.forEach(
                (image, index) => {
                    const item =
                        document.createElement(
                            "div"
                        );

                    item.className =
                        "portfolio-preview__item";

                    item.innerHTML = `
                        <img
                            src="${image}"
                            alt="Робота"
                        >

                        <button
                            type="button"
                            class="portfolio-remove"
                            data-index="${index}"
                            aria-label="Видалити фото"
                        >
                            ×
                        </button>
                    `;

                    portfolioPreview.appendChild(
                        item
                    );
                }
            );

            portfolioPreview
                .querySelectorAll(
                    ".portfolio-remove"
                )
                .forEach(
                    button => {
                        button.addEventListener(
                            "click",
                            () => {
                                const index =
                                    Number(
                                        button.dataset
                                            .index
                                    );

                                portfolio.splice(
                                    index,
                                    1
                                );

                                renderPortfolio();
                            }
                        );
                    }
                );
        }

        // ========================================
        // SERVICES
        // ========================================

        function createServiceRow(
            service = {}
        ) {
            if (!servicesContainer) {
                return;
            }

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "service-item";

            row.innerHTML = `
                <input
                    type="text"
                    class="service-name"
                    placeholder="Назва послуги"
                    value="${escapeHtml(
                        service.name || ""
                    )}"
                    required
                >

                <input
                    type="number"
                    class="service-price"
                    placeholder="Ціна"
                    min="0"
                    value="${escapeHtml(
                        service.price ?? ""
                    )}"
                    required
                >

                <input
                    type="number"
                    class="service-duration"
                    placeholder="Хв"
                    min="0"
                    value="${escapeHtml(
                        service.duration ?? ""
                    )}"
                >

                <button
                    type="button"
                    class="remove-service"
                >
                    ×
                </button>
            `;

            row.querySelector(
                ".remove-service"
            )?.addEventListener(
                "click",
                () => {
                    if (
                        servicesContainer.children
                            .length > 1
                    ) {
                        row.remove();
                    } else {
                        row.querySelector(
                            ".service-name"
                        ).value = "";

                        row.querySelector(
                            ".service-price"
                        ).value = "";

                        row.querySelector(
                            ".service-duration"
                        ).value = "";
                    }
                }
            );

            servicesContainer.appendChild(
                row
            );
        }

        function getServicesFromForm() {
            if (!servicesContainer) {
                return [];
            }

            return Array.from(
                servicesContainer.querySelectorAll(
                    ".service-item"
                )
            )
                .map(row => {
                    const name =
                        row.querySelector(
                            ".service-name"
                        )?.value.trim();

                    const price =
                        Number(
                            row.querySelector(
                                ".service-price"
                            )?.value
                        );

                    const duration =
                        Number(
                            row.querySelector(
                                ".service-duration"
                            )?.value
                        );

                    if (
                        !name ||
                        !Number.isFinite(
                            price
                        )
                    ) {
                        return null;
                    }

                    return {
                        id:
                            generateId(
                                "service"
                            ),
                        name,
                        price,
                        duration:
                            Number.isFinite(
                                duration
                            )
                                ? duration
                                : 0
                    };
                })
                .filter(Boolean);
        }

        // ========================================
        // LOAD EXISTING PROFILE
        // ========================================

        function loadProfile() {
            if (servicesContainer) {
                servicesContainer.innerHTML =
                    "";
            }

            if (!existingProfile) {
                createServiceRow();

                renderProfilePhoto();
                renderPortfolio();

                return;
            }

            document.title =
                "Редагувати профіль — Veyra";

            if (saveButtonText) {
                saveButtonText.textContent =
                    "Зберегти зміни";
            }

            if (deleteProfileBtn) {
                deleteProfileBtn.hidden =
                    false;
            }

            if (nameInput) {
                nameInput.value =
                    existingProfile.name ||
                    "";
            }

            if (professionInput) {
                professionInput.value =
                    existingProfile.profession ||
                    "";
            }

            if (cityInput) {
                cityInput.value =
                    existingProfile.city ||
                    "";
            }

            if (workplaceInput) {
                workplaceInput.value =
                    existingProfile.workplace
                        ?.name || "";
            }

            if (addressInput) {
                addressInput.value =
                    existingProfile.workplace
                        ?.address || "";
            }

            if (phoneInput) {
                phoneInput.value =
                    existingProfile.phone ||
                    "";
            }

            if (descriptionInput) {
                descriptionInput.value =
                    existingProfile.description ||
                    "";
            }

            if (visibleInput) {
                visibleInput.checked =
                    existingProfile.visible !==
                    false;
            }

            profilePhoto =
                existingProfile.photo ||
                "";

            portfolio =
                Array.isArray(
                    existingProfile.portfolio
                )
                    ? [
                          ...existingProfile.portfolio
                      ]
                    : [];

            const services =
                Array.isArray(
                    existingProfile.services
                )
                    ? existingProfile.services
                    : [];

            if (services.length) {
                services.forEach(
                    createServiceRow
                );
            } else {
                createServiceRow();
            }

            renderProfilePhoto();
            renderPortfolio();
        }

        // ========================================
        // PHOTO INPUT
        // ========================================

        profilePhotoInput?.addEventListener(
            "change",
            async event => {
                const file =
                    event.target.files?.[0];

                if (!file) {
                    return;
                }

                if (
                    !file.type.startsWith(
                        "image/"
                    )
                ) {
                    alert(
                        "Оберіть зображення."
                    );

                    return;
                }

                if (
                    file.size >
                    1_000_000
                ) {
                    alert(
                        "Фото профілю має бути до 1 МБ."
                    );

                    return;
                }

                profilePhoto =
                    await fileToDataUrl(
                        file
                    );

                renderProfilePhoto();
            }
        );

        // ========================================
        // PORTFOLIO INPUT
        // ========================================

        portfolioInput?.addEventListener(
            "change",
            async event => {
                const files =
                    Array.from(
                        event.target.files ||
                            []
                    );

                for (const file of files) {
                    if (
                        !file.type.startsWith(
                            "image/"
                        )
                    ) {
                        continue;
                    }

                    if (
                        file.size >
                        1_000_000
                    ) {
                        alert(
                            `Файл "${file.name}" більший за 1 МБ і не буде доданий.`
                        );

                        continue;
                    }

                    const image =
                        await fileToDataUrl(
                            file
                        );

                    portfolio.push(image);
                }

                renderPortfolio();

                portfolioInput.value =
                    "";
            }
        );

        // ========================================
        // ADD SERVICE
        // ========================================

        addServiceBtn?.addEventListener(
            "click",
            () => {
                const plan = getUserPlan(
                    currentUser
                );

                const limit =
                    PLANS[plan].services;

                if (
                    servicesContainer.children
                        .length >= limit
                ) {
                    alert(
                        `Тариф «${PLANS[plan].name}»: максимум ${limit} послуга. Оберіть вищий тариф, щоб додати більше.`
                    );

                    return;
                }

                createServiceRow();
            }
        );

        // ========================================
        // SAVE PROFILE
        // ========================================

        specialistForm.addEventListener(
            "submit",
            async event => {
                event.preventDefault();

                const name =
                    nameInput?.value.trim();

                const profession =
                    professionInput?.value.trim();

                const city =
                    cityInput?.value.trim();

                const description =
                    descriptionInput?.value.trim();

                const phone =
                    phoneInput?.value.trim() ||
                    "";

                const services =
                    getServicesFromForm();

                if (
                    !name ||
                    !profession ||
                    !city ||
                    !description
                ) {
                    alert(
                        "Заповніть усі обов'язкові поля."
                    );

                    return;
                }

                if (!services.length) {
                    alert(
                        "Додайте хоча б одну послугу."
                    );

                    return;
                }

                const planLimit =
                    PLANS[
                        getUserPlan(
                            currentUser
                        )
                    ].services;

                if (
                    services.length >
                    planLimit
                ) {
                    alert(
                        `Ваш тариф дозволяє максимум ${planLimit} послугу. Приберіть зайві або змініть тариф.`
                    );

                    return;
                }

                // Фото в хмару (Firebase Storage), якщо підключено.
                // Без бекенда або при помилці — лишаються локально.
                let photoNote = "";

                if (
                    window.VeyraBackend &&
                    window.VeyraBackend.configured
                ) {
                    const saveBtn =
                        specialistForm.querySelector(
                            '[type="submit"]'
                        );

                    const saveBtnText =
                        saveBtn
                            ? saveBtn.textContent
                            : "";

                    if (saveBtn) {
                        saveBtn.disabled = true;
                        saveBtn.textContent =
                            "Завантаження фото…";
                    }

                    try {
                        await window.VeyraBackend.ensureAuth().catch(
                            () => {}
                        );

                        if (
                            profilePhoto &&
                            profilePhoto.startsWith(
                                "data:"
                            )
                        ) {
                            profilePhoto =
                                await window.VeyraBackend.uploadImage(
                                    profilePhoto,
                                    "avatar.jpg"
                                );
                        }

                        const uploaded = [];

                        for (
                            let i = 0;
                            i < portfolio.length;
                            i++
                        ) {
                            const image =
                                portfolio[i];

                            uploaded.push(
                                image &&
                                image.startsWith(
                                    "data:"
                                )
                                    ? await window.VeyraBackend.uploadImage(
                                          image,
                                          `work_${Date.now()}_${i}.jpg`
                                      )
                                    : image
                            );
                        }

                        portfolio = uploaded;
                    } catch (uploadError) {
                        console.error(
                            "[photos]",
                            uploadError
                        );

                        photoNote =
                            " Увага: фото збережено лише в цьому браузері — перевірте Storage і правила у Firebase-консолі.";
                    } finally {
                        if (saveBtn) {
                            saveBtn.disabled = false;
                            saveBtn.textContent =
                                saveBtnText;
                        }
                    }
                }

                const specialists =
                    getSpecialists();

                // ========================================
                // EDIT PROFILE
                // ========================================

                if (existingProfile) {
                    const index =
                        specialists.findIndex(
                            item =>
                                item.id ===
                                    existingProfile.id &&
                                item.ownerId ===
                                    currentUser.id
                        );

                    if (index === -1) {
                        alert(
                            "Профіль не знайдено."
                        );

                        return;
                    }

                    const updatedProfile = {
                        ...specialists[index],

                        name,
                        profession,
                        city,
                        description,
                        phone,

                        photo:
                            profilePhoto,

                        services,
                        portfolio,

                        workplace: {
                            name:
                                workplaceInput
                                    ?.value.trim() ||
                                "",

                            address:
                                addressInput
                                    ?.value.trim() ||
                                ""
                        },

                        visible:
                            visibleInput
                                ? visibleInput.checked
                                : true,

                        updatedAt:
                            new Date().toISOString()
                    };

                    specialists[index] =
                        updatedProfile;

                    if (
                        !saveSpecialists(
                            specialists
                        )
                    ) {
                        return;
                    }

                    existingProfile =
                        updatedProfile;

                    alert(
                        "Профіль збережено." +
                            photoNote
                    );

                    goToHtml(
                        "specialists.html"
                    );

                    return;
                }

                // ========================================
                // CREATE PROFILE
                // ========================================

                const newProfile = {
                    id:
                        generateId(
                            "specialist"
                        ),

                    ownerId:
                        currentUser.id,

                    name,
                    profession,
                    city,
                    description,
                    phone,

                    photo:
                        profilePhoto,

                    services,
                    portfolio,

                    workplace: {
                        name:
                            workplaceInput
                                ?.value.trim() ||
                            "",

                        address:
                            addressInput
                                ?.value.trim() ||
                            ""
                    },

                    visible:
                        visibleInput
                            ? visibleInput.checked
                            : true,

                    rating: null,
                    reviewsCount: 0,

                    createdAt:
                        new Date().toISOString(),

                    updatedAt:
                        new Date().toISOString()
                };

                specialists.push(
                    newProfile
                );

                if (
                    !saveSpecialists(
                        specialists
                    )
                ) {
                    return;
                }

                alert(
                    "Профіль успішно створено." +
                        photoNote
                );

                goToHtml(
                    "specialists.html"
                );
            }
        );

        // ========================================
        // DELETE PROFILE
        // ========================================

        deleteProfileBtn?.addEventListener(
            "click",
            () => {
                if (!existingProfile) {
                    return;
                }

                const shouldDelete =
                    confirm(
                        "Видалити профіль?"
                    );

                if (!shouldDelete) {
                    return;
                }

                const specialists =
                    getSpecialists().filter(
                        item =>
                            !(
                                item.id ===
                                    existingProfile.id &&
                                item.ownerId ===
                                    currentUser.id
                            )
                    );

                if (
                    !saveSpecialists(
                        specialists
                    )
                ) {
                    return;
                }

                alert(
                    "Профіль видалено."
                );

                goToHome();
            }
        );

        loadProfile();
    }

    // ========================================
    // SPECIALISTS.HTML
    // FEED + SEARCH + FILTERS + SORT
    // ========================================

    const specialistsList =
        document.querySelector(
            "#specialistsList"
        );

    if (specialistsList) {
        initSpecialistsFeed();
    }

    function initSpecialistsFeed() {
        const searchInput =
            document.querySelector(
                "#searchInput"
            );

        const professionFilter =
            document.querySelector(
                "#professionFilter"
            );

        const categoryFilter =
            document.querySelector(
                "#categoryFilter"
            );

        const cityFilter =
            document.querySelector(
                "#cityFilter"
            );

        const sortFilter =
            document.querySelector(
                "#sortFilter"
            );

        const favOnlyCheckbox =
            document.querySelector(
                "#favOnly"
            );

        const noResults =
            document.querySelector(
                "#noResults"
            );

        const specialistsCount =
            document.querySelector(
                "#specialistsCount"
            );

        // ========================================
        // MIN PRICE
        // ========================================

        function getMinimumPrice(
            specialist
        ) {
            if (
                !Array.isArray(
                    specialist.services
                ) ||
                !specialist.services
                    .length
            ) {
                return 0;
            }

            const prices =
                specialist.services
                    .map(service =>
                        Number(
                            service.price
                        )
                    )
                    .filter(price =>
                        Number.isFinite(
                            price
                        )
                    );

            return prices.length
                ? Math.min(...prices)
                : 0;
        }

        function getServicesText(
            specialist
        ) {
            if (
                !Array.isArray(
                    specialist.services
                )
            ) {
                return "";
            }

            return specialist.services
                .map(
                    service =>
                        service.name ||
                        ""
                )
                .join(" ")
                .toLowerCase();
        }

        // ========================================
        // BUILD FILTERS
        // ========================================

        function buildFilters() {
            const specialists =
                getSpecialists().filter(
                    specialist =>
                        specialist.visible !==
                        false
                );

            if (professionFilter) {
                professionFilter.innerHTML = `
                    <option value="">
                        Усі професії
                    </option>
                `;

                const professions = [
                    ...new Set(
                        specialists
                            .map(
                                item =>
                                    item.profession
                                        ?.trim()
                            )
                            .filter(Boolean)
                    )
                ].sort((a, b) =>
                    a.localeCompare(
                        b,
                        "uk"
                    )
                );

                professions.forEach(
                    profession => {
                        const option =
                            document.createElement(
                                "option"
                            );

                        option.value =
                            profession;

                        option.textContent =
                            profession;

                        professionFilter.appendChild(
                            option
                        );
                    }
                );
            }

            if (cityFilter) {
                cityFilter.innerHTML = `
                    <option value="">
                        Усі міста
                    </option>
                `;

                const cities = [
                    ...new Set(
                        specialists
                            .map(
                                item =>
                                    item.city?.trim()
                            )
                            .filter(Boolean)
                    )
                ].sort((a, b) =>
                    a.localeCompare(
                        b,
                        "uk"
                    )
                );

                cities.forEach(city => {
                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        city;

                    option.textContent =
                        city;

                    cityFilter.appendChild(
                        option
                    );
                });
            }
        }

        // ========================================
        // CREATE SPECIALIST CARD (OLX-style)
        // ========================================

        function pluralServices(count) {
            const lastTwo = count % 100;
            const last = count % 10;

            if (
                lastTwo >= 11 &&
                lastTwo <= 14
            ) {
                return `${count} послуг`;
            }

            if (last === 1) {
                return `${count} послуга`;
            }

            if (
                last >= 2 &&
                last <= 4
            ) {
                return `${count} послуги`;
            }

            return `${count} послуг`;
        }

        function formatPrice(value) {
            return `${Number(value).toLocaleString("uk-UA")} ₴`;
        }

        function createSpecialistCard(
            specialist
        ) {
            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "specialist-card";

            const minPrice =
                getMinimumPrice(
                    specialist
                );

            const profileUrl =
                `specialist.html?id=${encodeURIComponent(
                    specialist.id
                )}`;

            const photoHtml =
                specialist.photo
                    ? `
                        <img
                            src="${specialist.photo}"
                            alt="${escapeHtml(
                                specialist.name
                            )}"
                            loading="lazy"
                        >
                    `
                    : `
                        <div
                            class="specialist-card__placeholder"
                        >
                            <span>
                                ${escapeHtml(
                                    (
                                        specialist.name ||
                                        "✦"
                                    ).trim()[0] ||
                                        "✦"
                                ).toUpperCase()}
                            </span>
                        </div>
                    `;

            const priceText =
                minPrice > 0
                    ? `від ${formatPrice(minPrice)}`
                    : "Ціну уточнюйте";

            const servicesCount = Array.isArray(
                specialist.services
            )
                ? specialist.services.length
                : 0;

            const dateText = formatCardDate(
                specialist.createdAt
            );

            const metaText = [
                specialist.city,
                dateText
            ]
                .filter(Boolean)
                .map(escapeHtml)
                .join(" • ");

            const favActive = isFavorite(
                specialist.id
            );

            const showPro =
                isProSpecialist(
                    specialist
                );

            const popularBadge =
                Number(
                    specialist.reviewsCount
                ) >= 15
                    ? `
                        <span
                            class="specialist-card__badge"
                        >
                            Популярний
                        </span>
                    `
                    : "";

            card.innerHTML = `
                <a
                    class="specialist-card__photo"
                    href="${profileUrl}"
                    aria-label="${escapeHtml(
                        specialist.name
                    )} — переглянути профіль"
                >
                    ${photoHtml}
                    ${popularBadge}
                </a>

                <div
                    class="specialist-card__body"
                >
                    <div
                        class="specialist-card__main"
                    >
                        <div
                            class="specialist-card__top"
                        >
                            <h2
                                class="specialist-card__name"
                            >
                                <a
                                    href="${profileUrl}"
                                >
                                    ${escapeHtml(
                                        specialist.name
                                    )}
                                </a>
                            </h2>

                            ${
                                showPro
                                    ? `
                                        <span
                                            class="pro-badge"
                                            title="PRO-тариф"
                                        >
                                            PRO
                                        </span>
                                    `
                                    : ""
                            }

                            <button
                                type="button"
                                class="fav-btn${favActive ? " active" : ""}"
                                data-fav="${escapeHtml(
                                    specialist.id
                                )}"
                                aria-pressed="${favActive ? "true" : "false"}"
                                aria-label="Додати в обране"
                                title="В обране"
                            >
                                ♥
                            </button>                        </div>

                        <p
                            class="specialist-card__profession"
                        >
                            ${escapeHtml(
                                specialist.profession
                            )}
                        </p>

                        ${
                            Number(
                                specialist.reviewsCount
                            ) > 0 &&
                            Number(
                                specialist.rating
                            ) > 0
                                ? `
                                    <p
                                        class="specialist-card__rating"
                                    >
                                        ★ ${Number(
                                            specialist.rating
                                        ).toFixed(
                                            1
                                        )} · ${plural(
                                            Number(
                                                specialist.reviewsCount
                                            ),
                                            "відгук",
                                            "відгуки",
                                            "відгуків"
                                        )}
                                    </p>
                                `
                                : ""
                        }

                        <p
                            class="specialist-card__meta"
                        >
                            ${metaText}
                        </p>

                        <p
                            class="specialist-card__description"
                        >
                            ${escapeHtml(
                                specialist.description
                            )}
                        </p>
                    </div>

                    <div
                        class="specialist-card__side"
                    >
                        <p
                            class="specialist-card__price"
                        >
                            ${escapeHtml(priceText)}
                        </p>

                        <p
                            class="specialist-card__count"
                        >
                            ${pluralServices(servicesCount)}
                        </p>

                        <a
                            href="${profileUrl}"
                            class="specialist-card__button"
                        >
                            Переглянути
                        </a>
                    </div>
                </div>
            `;

            return card;
        }

        // ========================================
        // RENDER SPECIALISTS
        // ========================================

        function renderSpecialists() {
            const search =
                (
                    searchInput?.value ||
                    ""
                )
                    .trim()
                    .toLowerCase();

            const profession =
                professionFilter?.value ||
                categoryFilter?.value ||
                "";

            const city =
                cityFilter?.value || "";

            const sort =
                sortFilter?.value ||
                "new";

            const favOnly =
                !!favOnlyCheckbox?.checked;

            const favorites =
                getFavorites();

            let specialists =
                getSpecialists().filter(
                    specialist =>
                        specialist.visible !==
                        false
                );

            if (favOnly) {
                specialists =
                    specialists.filter(
                        specialist =>
                            favorites.includes(
                                specialist.id
                            )
                    );
            }

            specialists =
                specialists.filter(
                    specialist => {
                        const name =
                            (
                                specialist.name ||
                                ""
                            ).toLowerCase();

                        const specialistProfession =
                            (
                                specialist.profession ||
                                ""
                            ).toLowerCase();

                        const description =
                            (
                                specialist.description ||
                                ""
                            ).toLowerCase();

                        const services =
                            getServicesText(
                                specialist
                            );

                        const matchesSearch =
                            !search ||
                            name.includes(
                                search
                            ) ||
                            specialistProfession.includes(
                                search
                            ) ||
                            description.includes(
                                search
                            ) ||
                            services.includes(
                                search
                            );

                        const matchesProfession =
                            !profession ||
                            specialist.profession ===
                                profession;

                        const matchesCity =
                            !city ||
                            specialist.city ===
                                city;

                        return (
                            matchesSearch &&
                            matchesProfession &&
                            matchesCity
                        );
                    }
                );

            // SORT BY NAME
            if (sort === "name") {
                specialists.sort(
                    (a, b) =>
                        (
                            a.name || ""
                        ).localeCompare(
                            b.name || "",
                            "uk"
                        )
                );
            }

            // PRICE LOW
            else if (
                sort === "price-low"
            ) {
                specialists.sort(
                    (a, b) =>
                        getMinimumPrice(a) -
                        getMinimumPrice(b)
                );
            }

            // PRICE HIGH
            else if (
                sort ===
                "price-high"
            ) {
                specialists.sort(
                    (a, b) =>
                        getMinimumPrice(b) -
                        getMinimumPrice(a)
                );
            }

            // NEWEST
            else {
                specialists.sort(
                    (a, b) =>
                        new Date(
                            b.createdAt || 0
                        ).getTime() -
                        new Date(
                            a.createdAt || 0
                        ).getTime()
                );
            }

            specialistsList.innerHTML =
                "";

            if (specialistsCount) {
                specialistsCount.textContent =
                    specialists.length;
            }

            if (!specialists.length) {
                if (noResults) {
                    noResults.hidden =
                        false;

                    noResults.style.display =
                        "block";
                }

                return;
            }

            if (noResults) {
                noResults.hidden =
                    true;

                noResults.style.display =
                    "none";
            }

            specialists.forEach(
                specialist => {
                    specialistsList.appendChild(
                        createSpecialistCard(
                            specialist
                        )
                    );
                }
            );
        }

        buildFilters();

        try {
            const params =
                new URLSearchParams(
                    window.location.search
                );

            if (
                params.get("fav") ===
                    "1" &&
                favOnlyCheckbox
            ) {
                favOnlyCheckbox.checked =
                    true;
            }
        } catch {
            // без query — звичайний каталог
        }

        renderSpecialists();

        searchInput?.addEventListener(
            "input",
            renderSpecialists
        );

        professionFilter?.addEventListener(
            "change",
            renderSpecialists
        );

        categoryFilter?.addEventListener(
            "change",
            renderSpecialists
        );

        cityFilter?.addEventListener(
            "change",
            renderSpecialists
        );

        sortFilter?.addEventListener(
            "change",
            renderSpecialists
        );

        favOnlyCheckbox?.addEventListener(
            "change",
            renderSpecialists
        );

        // Хмара підтягнула профілі (Firebase) — перемалювати список
        window.addEventListener(
            "veyra:cloud-sync",
            renderSpecialists
        );

        // Обране — один делегований слухач на весь список
        specialistsList.addEventListener(
            "click",
            event => {
                const favBtn =
                    event.target.closest(
                        "[data-fav]"
                    );

                if (!favBtn) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                const id =
                    favBtn.getAttribute(
                        "data-fav"
                    );

                const nowActive =
                    toggleFavorite(id);

                favBtn.classList.toggle(
                    "active",
                    nowActive
                );

                favBtn.setAttribute(
                    "aria-pressed",
                    nowActive
                        ? "true"
                        : "false"
                );

                if (
                    favOnlyCheckbox?.checked
                ) {
                    renderSpecialists();
                }
            }
        );
    }

    // ========================================
    // REVIEWS (рейтинг фахівця)
    // ========================================

    const REVIEWS_KEY = "veyraReviews";

    function getReviews() {
        const list = safeParse(
            localStorage.getItem(
                REVIEWS_KEY
            ) || "[]",
            []
        );

        return Array.isArray(list)
            ? list
            : [];
    }

    function saveReviews(list) {
        try {
            localStorage.setItem(
                REVIEWS_KEY,
                JSON.stringify(list)
            );

            return true;
        } catch (error) {
            console.error(error);

            return false;
        }
    }

    function reviewsFor(
        specialistId
    ) {
        return getReviews()
            .filter(
                item =>
                    item.specialistId ===
                    specialistId
            )
            .sort(
                (a, b) =>
                    String(
                        b.createdAt || ""
                    ).localeCompare(
                        String(
                            a.createdAt || ""
                        )
                    )
            );
    }

    function recalcSpecialistRating(
        specialistId
    ) {
        const specialists =
            getSpecialists();

        const specialist =
            specialists.find(
                item =>
                    item.id ===
                    specialistId
            );

        if (!specialist) {
            return;
        }

        const mine = getReviews().filter(
            item =>
                item.specialistId ===
                specialistId
        );

        if (!mine.length) {
            specialist.rating = null;
            specialist.reviewsCount = 0;
        } else {
            const sum = mine.reduce(
                (acc, item) =>
                    acc +
                    Number(item.stars),
                0
            );

            specialist.rating =
                Math.round(
                    (sum / mine.length) *
                        10
                ) / 10;

            specialist.reviewsCount =
                mine.length;
        }

        saveSpecialists(specialists);
    }

    function submitReview(
        specialistId,
        stars,
        text
    ) {
        const user =
            getCurrentUser();

        if (!user) {
            return {
                ok: false,
                error: "login"
            };
        }

        const specialists =
            getSpecialists();

        const specialist =
            specialists.find(
                item =>
                    item.id ===
                    specialistId
            );

        if (!specialist) {
            return {
                ok: false,
                error: "noprofile"
            };
        }

        if (
            user.id ===
            specialist.ownerId
        ) {
            return {
                ok: false,
                error: "self"
            };
        }

        const cleanStars = Math.min(
            5,
            Math.max(
                1,
                Number(stars) || 0
            )
        );

        if (!cleanStars) {
            return {
                ok: false,
                error: "stars"
            };
        }

        const cleanText = String(
            text || ""
        )
            .trim()
            .slice(0, 500);

        if (!cleanText) {
            return {
                ok: false,
                error: "empty"
            };
        }

        const all = getReviews();

        const at = all.findIndex(
            item =>
                item.specialistId ===
                    specialistId &&
                item.clientId ===
                    user.id
        );

        const record = {
            id:
                at === -1
                    ? generateId(
                          "review"
                      )
                    : all[at].id,
            specialistId,
            clientId: user.id,
            clientName: user.name,
            stars: cleanStars,
            text: cleanText,
            createdAt:
                new Date().toISOString()
        };

        if (at === -1) {
            all.push(record);
        } else {
            all[at] = record;
        }

        saveReviews(all);

        recalcSpecialistRating(
            specialistId
        );

        try {
            if (
                window.VeyraBackend &&
                window.VeyraBackend
                    .configured
            ) {
                window.VeyraBackend.pushDoc(
                    "reviews",
                    record.id,
                    record
                );
            }
        } catch (backendError) {
            console.error(
                backendError
            );
        }

        return { ok: true };
    }

    function starsRow(avg) {
        const full = Math.round(
            Number(avg) || 0
        );

        return "★★★★★"
            .slice(0, full)
            .padEnd(5, "☆");
    }

    function reviewsSectionHtml(
        specialist
    ) {
        const list = reviewsFor(
            specialist.id
        );

        const user =
            getCurrentUser();

        const mine = user
            ? list.find(
                  item =>
                      item.clientId ===
                      user.id
              )
            : null;

        const avg = list.length
            ? list.reduce(
                  (acc, item) =>
                      acc +
                      Number(
                          item.stars
                      ),
                  0
              ) / list.length
            : 0;

        const canReview =
            user &&
            user.id !==
                specialist.ownerId;

        return `
            <section
                class="profile-section"
            >
                <h2>
                    Відгуки${
                        list.length
                            ? ` · ${avg.toFixed(1)} ★ (${plural(
                                  list.length,
                                  "відгук",
                                  "відгуки",
                                  "відгуків"
                              )})`
                            : ""
                    }
                </h2>

                ${
                    list.length
                        ? `
                            <div
                                class="reviews-list"
                            >
                                ${list
                                    .map(
                                        item => `
                                    <div
                                        class="review-item"
                                    >
                                        <div
                                            class="review-item__top"
                                        >
                                            <strong>
                                                ${escapeHtml(
                                                    item.clientName ||
                                                        "Клієнт"
                                                )}
                                            </strong>

                                            <span
                                                class="review-item__stars"
                                            >
                                                ${"★".repeat(
                                                    Number(
                                                        item.stars
                                                    ) || 0
                                                )}${"☆".repeat(
                                                    5 -
                                                        (Number(
                                                            item.stars
                                                        ) ||
                                                            0)
                                                )}
                                            </span>
                                        </div>

                                        <p>
                                            ${escapeHtml(
                                                item.text
                                            )}
                                        </p>

                                        <span
                                            class="review-item__date"
                                        >
                                            ${escapeHtml(
                                                formatCardDate(
                                                    item.createdAt
                                                )
                                            )}
                                        </span>
                                    </div>
                                `
                                    )
                                    .join("")}
                            </div>
                        `
                        : `
                            <p
                                class="account-empty"
                            >
                                Відгуків поки немає — станьте першим!
                            </p>
                        `
                }

                ${
                    canReview
                        ? `
                            <form
                                id="reviewForm"
                                class="review-form"
                            >
                                <div
                                    class="stars-input"
                                    id="starsInput"
                                >
                                    ${[1, 2, 3, 4, 5]
                                        .map(
                                            n => `
                                        <button
                                            type="button"
                                            data-star="${n}"
                                            aria-label="Оцінка ${n}"
                                        >
                                            ★
                                        </button>
                                    `
                                        )
                                        .join("")}
                                </div>

                                <textarea
                                    id="reviewText"
                                    rows="3"
                                    maxlength="500"
                                    placeholder="Розкажіть про свій досвід…"
                                    required
                                >${mine ? escapeHtml(mine.text) : ""}</textarea>

                                <button
                                    type="submit"
                                    class="specialist-card__button"
                                >
                                    ${mine ? "Оновити відгук" : "Залишити відгук"}
                                </button>
                            </form>
                        `
                        : !user
                          ? `
                            <p
                                class="account-empty"
                            >
                                Увійдіть, щоб залишити відгук.
                            </p>
                        `
                          : ""
                }
            </section>
        `;
    }

    function wireReviewForm(
        specialist
    ) {
        const form =
            document.querySelector(
                "#reviewForm"
            );

        if (!form) {
            return;
        }

        const user =
            getCurrentUser();

        const existing = user
            ? reviewsFor(
                  specialist.id
              ).find(
                  item =>
                      item.clientId ===
                      user.id
              )
            : null;

        let stars = existing
            ? existing.stars
            : 5;

        const paint = () =>
            form
                .querySelectorAll(
                    "#starsInput button"
                )
                .forEach(button =>
                    button.classList.toggle(
                        "lit",
                        Number(
                            button.dataset
                                .star
                        ) <= stars
                    )
                );

        paint();

        form
            .querySelector(
                "#starsInput"
            )
            .addEventListener(
                "click",
                event => {
                    const starBtn =
                        event.target.closest(
                            "[data-star]"
                        );

                    if (!starBtn) {
                        return;
                    }

                    stars = Number(
                        starBtn.dataset
                            .star
                    );

                    paint();
                }
            );

        form.addEventListener(
            "submit",
            event => {
                event.preventDefault();

                const text = form.querySelector(
                    "#reviewText"
                ).value;

                const result =
                    submitReview(
                        specialist.id,
                        stars,
                        text
                    );

                if (!result.ok) {
                    if (
                        result.error ===
                        "login"
                    ) {
                        openAuthModal();
                        return;
                    }

                    alert(
                        "Не вдалося зберегти відгук."
                    );
                    return;
                }

                initPublicSpecialistProfile();
            }
        );
    }

    // ========================================
    // SPECIALIST.HTML
    // PUBLIC SPECIALIST PROFILE
    // ========================================

    const publicProfile =
        document.querySelector(
            "#publicProfile"
        );

    if (publicProfile) {
        initPublicSpecialistProfile();
    }

    function initPublicSpecialistProfile() {
        const profileNotFound =
            document.querySelector(
                "#profileNotFound"
            );

        const params =
            new URLSearchParams(
                window.location.search
            );

        const specialistId =
            params.get("id");

        const specialist =
            getSpecialists().find(
                item =>
                    item.id ===
                        specialistId &&
                    item.visible !==
                        false
            );

        if (!specialist) {
            publicProfile.hidden =
                true;

            if (profileNotFound) {
                profileNotFound.hidden =
                    false;
            }

            return;
        }

        document.title =
            `${specialist.name} — Veyra`;

        const photoHtml =
            specialist.photo
                ? `
                    <img
                        src="${specialist.photo}"
                        alt="${escapeHtml(
                            specialist.name
                        )}"
                    >
                `
                : `
                    <div
                        class="public-profile__placeholder"
                    >
                        ✦
                    </div>
                `;

        const services =
            Array.isArray(
                specialist.services
            )
                ? specialist.services
                : [];

        function maskPhone(phone) {
            const digits =
                String(phone || "").trim();

            if (digits.length < 7) {
                return digits;
            }

            const visibleStart =
                digits.slice(0, 5);

            const visibleEnd =
                digits.slice(-2);

            return `${visibleStart} •• ••• •• ${visibleEnd}`;
        }

        const servicesHtml =
            services.length
                ? services
                      .map(
                          service => `
                            <div
                                class="service-row"
                            >
                                <div
                                    class="service-row__main"
                                >
                                    <p
                                        class="service-row__name"
                                    >
                                        ${escapeHtml(
                                            service.name
                                        )}
                                    </p>

                                    ${
                                        Number(
                                            service.duration
                                        ) > 0
                                            ? `
                                                <span
                                                    class="service-row__duration"
                                                >
                                                    ~${Number(
                                                        service.duration
                                                    )} хв
                                                </span>
                                            `
                                            : ""
                                    }
                                </div>

                                <p
                                    class="service-row__price"
                                >
                                    ${Number(
                                        service.price
                                    ).toLocaleString(
                                        "uk-UA"
                                    )} ₴
                                </p>
                            </div>
                        `
                      )
                      .join("")
                : `
                    <p>
                        Послуги ще не додані.
                    </p>
                `;

        const portfolio =
            Array.isArray(
                specialist.portfolio
            )
                ? specialist.portfolio
                : [];

        const portfolioHtml =
            portfolio
                .map(
                    image => `
                        <img
                            src="${image}"
                            alt="Робота спеціаліста"
                        >
                    `
                )
                .join("");

        const workplaceName =
            specialist.workplace
                ?.name || "";

        const workplaceAddress =
            specialist.workplace
                ?.address || "";

        const sellerInitial = (
            specialist.name || "✦"
        )
            .trim()[0]
            .toUpperCase();

        const sellerAvatar = specialist.photo
            ? `
                <img
                    src="${specialist.photo}"
                    alt="${escapeHtml(
                        specialist.name
                    )}"
                >
            `
            : `
                <span>
                    ${escapeHtml(sellerInitial)}
                </span>
            `;

        const memberSince = (() => {
            try {
                return new Date(
                    specialist.createdAt
                ).getFullYear();
            } catch {
                return "";
            }
        })();

        const phone = String(
            specialist.phone || ""
        ).trim();

        const showSellerPro =
            isProSpecialist(
                specialist
            );

        const isOwner = !!(
            getCurrentUser() &&
            getCurrentUser().id ===
                specialist.ownerId
        );

        publicProfile.innerHTML = `
            ${
                isOwner
                    ? `
                        <div
                            class="owner-banner"
                        >
                            <span>
                                Це ваше оголошення
                            </span>

                            <span
                                class="owner-banner__links"
                            >
                                <a href="create.html">
                                    Редагувати
                                </a>

                                <a href="account.html">
                                    В акаунт
                                </a>
                            </span>
                        </div>
                    `
                    : ""
            }

            <nav
                class="breadcrumbs"
                aria-label="Хлібні крихти"
            >
                <a href="../index.html">
                    Головна
                </a>

                <span>/</span>

                <a href="specialists.html">
                    Фахівці
                </a>

                <span>/</span>

                <span>
                    ${escapeHtml(
                        specialist.profession
                    )}
                </span>
            </nav>

            <div
                class="profile-layout"
            >
                <div
                    class="profile-main"
                >
                    <section
                        class="public-profile__hero"
                    >
                        <div
                            class="public-profile__photo"
                        >
                            ${photoHtml}
                        </div>

                        <div
                            class="public-profile__info"
                        >
                            <p
                                class="public-profile__profession"
                            >
                                ${escapeHtml(
                                    specialist.profession
                                )}
                            </p>

                            <h1>
                                ${escapeHtml(
                                    specialist.name
                                )}
                            </h1>

                            <p
                                class="public-profile__city"
                            >
                                ⌖
                                ${escapeHtml(
                                    specialist.city
                                )}
                            </p>

                            <p
                                class="public-profile__description"
                            >
                                ${escapeHtml(
                                    specialist.description
                                )}
                            </p>
                        </div>
                    </section>

                    <section
                        class="profile-section"
                    >
                        <h2>
                            Послуги та ціни
                        </h2>

                        <div
                            class="services-list"
                        >
                            ${servicesHtml}
                        </div>
                    </section>

                    ${
                        workplaceName ||
                        workplaceAddress
                            ? `
                                <section
                                    class="profile-section"
                                >
                                    <h2>
                                        Місце роботи
                                    </h2>

                                    <p
                                        class="workplace-text"
                                    >
                                        ${
                                            workplaceName
                                                ? escapeHtml(
                                                      workplaceName
                                                  )
                                                : ""
                                        }

                                        ${
                                            workplaceName &&
                                            workplaceAddress
                                                ? "<br>"
                                                : ""
                                        }

                                        ${
                                            workplaceAddress
                                                ? escapeHtml(
                                                      workplaceAddress
                                                  )
                                                : ""
                                        }
                                    </p>
                                </section>
                            `
                            : ""
                    }

                    ${
                        portfolio.length
                            ? `
                                <section
                                    class="profile-section"
                                >
                                    <h2>
                                        Роботи
                                    </h2>

                                    <div
                                        class="portfolio-grid"
                                    >
                                        ${portfolioHtml}
                                    </div>
                                </section>
                            `
                            : ""
                    }

                    ${reviewsSectionHtml(
                        specialist
                    )}
                </div>

                <aside
                    class="seller-card"
                    aria-label="Картка продавця"
                >
                    <div
                        class="seller-card__top"
                    >
                        <div
                            class="seller-card__avatar"
                        >
                            ${sellerAvatar}
                        </div>

                        <div>
                            <p
                                class="seller-card__name"
                            >
                                ${escapeHtml(
                                    specialist.name
                                )}
                            </p>

                            <p
                                class="seller-card__type"
                            >
                                Приватний фахівець
                            </p>

                            ${
                                showSellerPro
                                    ? `
                                        <p
                                            class="seller-card__pro"
                                        >
                                            ★ PRO-фахівець
                                        </p>
                                    `
                                    : ""
                            }
                        </div>
                    </div>

                    ${
                        phone
                            ? `
                                <button
                                    type="button"
                                    class="seller-card__phone"
                                    id="sellerPhoneBtn"
                                    data-phone="${escapeHtml(
                                        phone
                                    )}"
                                >
                                    ${escapeHtml(
                                        maskPhone(phone)
                                    )}
                                </button>

                                <p
                                    class="seller-card__hint"
                                >
                                    Натисніть, щоб показати номер
                                </p>
                            `
                            : `
                                <p
                                    class="seller-card__hint"
                                >
                                    Телефон не вказано — напишіть фахівцю після бронювання
                                </p>
                            `
                    }

                    <button
                        type="button"
                        class="seller-card__msg"
                        id="sellerMsgBtn"
                    >
                        Написати
                    </button>

                    <p
                        class="seller-card__meta"
                    >
                        ${escapeHtml(
                            specialist.city
                        )}${
                            memberSince
                                ? ` • на Veyra з ${memberSince}`
                                : ""
                        }
                    </p>
                </aside>
            </div>
        `;

        wireReviewForm(specialist);
    }

    // ========================================
    // BOOKING (запис на послугу + місячний ліміт тарифу)
    // ========================================

    function openBookingModal(
        specialistId
    ) {
        closeBookingModal();

        const specialist =
            getSpecialists().find(
                item =>
                    item.id ===
                        specialistId &&
                    item.visible !==
                        false
            );

        if (!specialist) {
            alert(
                "Профіль не знайдено."
            );
            return;
        }

        const user =
            getCurrentUser();

        if (!user) {
            pendingRole = "client";

            alert(
                "Щоб записатися, увійдіть або зареєструйтесь як клієнт."
            );

            openAuthModal();
            showRegisterForm();
            return;
        }

        if (
            user.id ===
            specialist.ownerId
        ) {
            alert(
                "Це ваше оголошення — запис собі не потрібен."
            );
            return;
        }

        const services = Array.isArray(
            specialist.services
        )
            ? specialist.services
            : [];

        if (!services.length) {
            alert(
                "У фахівця поки немає послуг для запису."
            );
            return;
        }

        const today = new Date();

        const isoDay = date =>
            date.toISOString().slice(0, 10);

        const maxDay = new Date(
            today.getTime() +
                30 * 86400000
        );

        const overlay =
            document.createElement(
                "div"
            );

        overlay.id =
            "veyraBookingModal";

        overlay.innerHTML = `
            <div class="veyra-auth-overlay">
                <div class="veyra-auth-modal">
                    <button
                        type="button"
                        class="veyra-auth-close"
                        id="bookingClose"
                        aria-label="Закрити"
                    >
                        ×
                    </button>

                    <div class="veyra-auth-header">
                        <h2>
                            Запис на послугу
                        </h2>

                        <p>
                            ${escapeHtml(
                                specialist.name
                            )} • ${escapeHtml(
                                specialist.profession ||
                                    ""
                            )}
                        </p>
                    </div>

                    <form id="bookingForm">
                        <label>
                            Послуга

                            <select id="bkService">
                                ${services
                                    .map(
                                        (
                                            service,
                                            index
                                        ) => `
                                        <option
                                            value="${index}"
                                        >
                                            ${escapeHtml(
                                                service.name
                                            )} — ${Number(
                                                service.price
                                            ).toLocaleString(
                                                "uk-UA"
                                            )} ₴
                                        </option>
                                    `
                                    )
                                    .join("")}
                            </select>
                        </label>

                        <label>
                            Дата

                            <input
                                type="date"
                                id="bkDate"
                                min="${isoDay(today)}"
                                max="${isoDay(maxDay)}"
                                value="${isoDay(today)}"
                                required
                            >
                        </label>

                        <label>
                            Час

                            <select id="bkTime">
                                ${DAY_SLOTS.map(
                                    slot => `
                                    <option>
                                        ${slot}
                                    </option>
                                `
                                ).join("")}
                            </select>
                        </label>

                        <button
                            type="submit"
                            class="veyra-auth-submit"
                        >
                            Підтвердити запис
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(
            overlay
        );

        document.body.style.overflow =
            "hidden";

        overlay
            .querySelector(
                "#bookingClose"
            )
            .addEventListener(
                "click",
                closeBookingModal
            );

        overlay
            .querySelector(
                ".veyra-auth-overlay"
            )
            .addEventListener(
                "click",
                event => {
                    if (
                        event.target.classList.contains(
                            "veyra-auth-overlay"
                        )
                    ) {
                        closeBookingModal();
                    }
                }
            );

        overlay
            .querySelector("#bookingForm")
            .addEventListener(
                "submit",
                event => {
                    event.preventDefault();

                    const service =
                        services[
                            Number(
                                overlay.querySelector(
                                    "#bkService"
                                ).value
                            )
                        ];

                    const date =
                        overlay.querySelector(
                            "#bkDate"
                        ).value;

                    const time =
                        overlay.querySelector(
                            "#bkTime"
                        ).value;

                    if (
                        !service ||
                        !date ||
                        !time
                    ) {
                        return;
                    }

                    if (
                        isSlotTaken(
                            specialist.id,
                            date,
                            time
                        )
                    ) {
                        alert(
                            "Цей час уже зайнято. Оберіть інший слот."
                        );
                        return;
                    }

                    const plan =
                        getPlanForSpecialist(
                            specialist
                        );

                    const limit =
                        PLANS[plan]
                            .bookingsPerMonth;

                    if (
                        countBookingsThisMonth(
                            specialist.id
                        ) >= limit
                    ) {
                        alert(
                            `У фахівця вичерпано ліміт записів на цей місяць (тариф «${PLANS[plan].name}»). Спробуйте наступного місяця.`
                        );
                        return;
                    }

                    const booking = {
                        id: generateId(
                            "booking"
                        ),
                        specialistId:
                            specialist.id,
                        ownerId:
                            specialist.ownerId,
                        clientId: user.id,
                        clientName:
                            user.name,
                        serviceName:
                            service.name,
                        price:
                            Number(
                                service.price
                            ) || 0,
                        date,
                        time,
                        status: "new",
                        createdAt:
                            new Date().toISOString()
                    };

                    const all =
                        getBookings();

                    all.push(booking);

                    if (
                        !saveBookings(all)
                    ) {
                        return;
                    }

                    try {
                        if (
                            window.VeyraBackend &&
                            window.VeyraBackend
                                .configured
                        ) {
                            window.VeyraBackend.pushDoc(
                                "bookings",
                                booking.id,
                                booking
                            );
                        }
                    } catch (backendError) {
                        console.error(
                            backendError
                        );
                    }

                    closeBookingModal();

                    alert(
                        "Записано! Деталі — у розділі «Мій акаунт»."
                    );
                }
            );
    }

    function closeBookingModal() {
        document
            .querySelector(
                "#veyraBookingModal"
            )
            ?.remove();

        if (
            !document.querySelector(
                "#veyraAuthModal.active"
            )
        ) {
            document.body.style.overflow =
                "";
        }
    }

    // ========================================
    // CHAT (повідомлення фахівець ↔ клієнт)
    // ========================================

    const THREADS_KEY = "veyraThreads";
    const MESSAGES_KEY = "veyraMessages";

    function getThreads() {
        const list = safeParse(
            localStorage.getItem(
                THREADS_KEY
            ) || "[]",
            []
        );

        return Array.isArray(list)
            ? list
            : [];
    }

    function saveThreads(list) {
        try {
            localStorage.setItem(
                THREADS_KEY,
                JSON.stringify(list)
            );

            return true;
        } catch (error) {
            console.error(error);

            return false;
        }
    }

    function getMessages(threadId) {
        const all = safeParse(
            localStorage.getItem(
                MESSAGES_KEY
            ) || "[]",
            []
        );

        const list = Array.isArray(all)
            ? all
            : [];

        return list
            .filter(
                item =>
                    item &&
                    item.threadId ===
                        threadId
            )
            .sort(
                (a, b) =>
                    String(
                        a.createdAt || ""
                    ).localeCompare(
                        String(
                            b.createdAt || ""
                        )
                    )
            );
    }

    function saveMessage(message) {
        const all = safeParse(
            localStorage.getItem(
                MESSAGES_KEY
            ) || "[]",
            []
        );

        const list = Array.isArray(all)
            ? all
            : [];

        list.push(message);

        try {
            localStorage.setItem(
                MESSAGES_KEY,
                JSON.stringify(list)
            );
        } catch (error) {
            console.error(error);

            return false;
        }

        try {
            if (
                window.VeyraBackend &&
                window.VeyraBackend
                    .configured
            ) {
                window.VeyraBackend.pushDoc(
                    "messages",
                    message.id,
                    message
                );
            }
        } catch (backendError) {
            console.error(
                backendError
            );
        }

        return true;
    }

    function upsertThread(thread) {
        const threads = getThreads();

        const at = threads.findIndex(
            item =>
                item.id === thread.id
        );

        if (at === -1) {
            threads.push(thread);
        } else {
            threads[at] = {
                ...threads[at],
                ...thread
            };
        }

        saveThreads(threads);
    }

    function openChatWith(
        specialistId
    ) {
        const specialist =
            getSpecialists().find(
                item =>
                    item.id ===
                        specialistId &&
                    item.visible !==
                        false
            );

        if (!specialist) {
            alert(
                "Профіль не знайдено."
            );
            return;
        }

        const user =
            getCurrentUser();

        if (!user) {
            pendingRole = "client";

            alert(
                "Щоб написати, увійдіть або зареєструйтесь."
            );

            openAuthModal();
            showRegisterForm();
            return;
        }

        if (
            user.id ===
            specialist.ownerId
        ) {
            alert(
                "Це ваш профіль — писати собі не можна."
            );
            return;
        }

        upsertThread({
            id: `${specialist.id}__${user.id}`,
            specialistId:
                specialist.id,
            clientId: user.id,
            clientName: user.name,
            updatedAt:
                new Date().toISOString()
        });

        openThread(
            `${specialist.id}__${user.id}`
        );
    }

    function openThread(threadId) {
        closeChatModal();

        const thread = getThreads().find(
            item =>
                item.id === threadId
        );

        if (!thread) {
            return;
        }

        const user =
            getCurrentUser();

        if (
            !user ||
            (user.id !==
                thread.clientId &&
                !isOwnThread(thread, user))
        ) {
            alert(
                "Спочатку увійдіть в акаунт."
            );
            openAuthModal();
            return;
        }

        const specialist =
            getSpecialists().find(
                item =>
                    item.id ===
                    thread.specialistId
            );

        const peerName = isOwnThread(
            thread,
            user
        )
            ? thread.clientName ||
              "Клієнт"
            : (specialist &&
                  specialist.name) ||
              "Фахівець";

        const overlay =
            document.createElement(
                "div"
            );

        overlay.id =
            "veyraChatModal";

        overlay.innerHTML = `
            <div class="veyra-auth-overlay">
                <div class="veyra-auth-modal chat-modal">
                    <button
                        type="button"
                        class="veyra-auth-close"
                        id="chatClose"
                        aria-label="Закрити"
                    >
                        ×
                    </button>

                    <div class="veyra-auth-header">
                        <h2>
                            ${escapeHtml(peerName)}
                        </h2>

                        <p>
                            Чат Veyra
                        </p>
                    </div>

                    <div
                        class="chat-list"
                        id="chatList"
                    ></div>

                    <form
                        id="chatForm"
                        class="chat-form"
                    >
                        <input
                            type="text"
                            id="chatInput"
                            placeholder="Написати повідомлення…"
                            maxlength="500"
                            autocomplete="off"
                            required
                        >

                        <button
                            type="submit"
                            class="veyra-auth-submit chat-send"
                        >
                            ➤
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(
            overlay
        );

        document.body.style.overflow =
            "hidden";

        const list = overlay.querySelector(
            "#chatList"
        );

        const renderMessages = () => {
            const messages =
                getMessages(thread.id);

            list.innerHTML = messages.length
                ? messages
                      .map(
                          message => `
                        <div
                            class="chat-msg${message.fromId === user.id ? " chat-msg--mine" : ""}"
                        >
                            <p>
                                ${escapeHtml(
                                    message.text
                                )}
                            </p>

                            <span>
                                ${escapeHtml(
                                    formatCardDate(
                                        message.createdAt
                                    )
                                )}
                            </span>
                        </div>
                    `
                      )
                      .join("")
                : `
                    <p
                        class="chat-empty"
                    >
                        Поки що тихо. Напишіть першим!
                    </p>
                `;

            list.scrollTop =
                list.scrollHeight;
        };

        renderMessages();

        overlay
            .querySelector("#chatClose")
            .addEventListener(
                "click",
                closeChatModal
            );

        overlay
            .querySelector(
                ".veyra-auth-overlay"
            )
            .addEventListener(
                "click",
                event => {
                    if (
                        event.target.classList.contains(
                            "veyra-auth-overlay"
                        )
                    ) {
                        closeChatModal();
                    }
                }
            );

        overlay
            .querySelector("#chatForm")
            .addEventListener(
                "submit",
                event => {
                    event.preventDefault();

                    const input =
                        overlay.querySelector(
                            "#chatInput"
                        );

                    const text =
                        input.value.trim();

                    if (!text) {
                        return;
                    }

                    saveMessage({
                        id: generateId(
                            "msg"
                        ),
                        threadId:
                            thread.id,
                        fromId: user.id,
                        text: text.slice(
                            0,
                            500
                        ),
                        createdAt:
                            new Date().toISOString()
                    });

                    upsertThread({
                        ...thread,
                        updatedAt:
                            new Date().toISOString()
                    });

                    input.value = "";

                    renderMessages();
                }
            );
    }

    function isOwnThread(thread, user) {
        const specialist =
            getSpecialists().find(
                item =>
                    item.id ===
                    thread.specialistId
            );

        return (
            !!specialist &&
            specialist.ownerId ===
                user.id
        );
    }

    function closeChatModal() {
        document
            .querySelector(
                "#veyraChatModal"
            )
            ?.remove();

        if (
            !document.querySelector(
                "#veyraAuthModal.active"
            ) &&
            !document.querySelector(
                "#veyraBookingModal"
            )
        ) {
            document.body.style.overflow =
                "";
        }
    }

    // ========================================
    // ACCOUNT.HTML
    // МІЙ АКАУНТ (як в OLX: кабінет окремо від оголошення)
    // ========================================

    const accountRoot =
        document.querySelector(
            "#accountRoot"
        );

    if (accountRoot) {
        initAccountPage();
    }

    function accountAvatar(name) {
        return (
            String(name || "✦")
                .trim()[0] || "✦"
        ).toUpperCase();
    }

    function initAccountPage() {
        const user =
            getCurrentUser();

        if (!user) {
            accountRoot.innerHTML = `
                <div
                    class="account-card account-card--center"
                >
                    <div
                        class="account-avatar"
                    >
                        ✦
                    </div>

                    <h1>
                        Ви не увійшли
                    </h1>

                    <p>
                        Увійдіть або зареєструйтесь,
                        щоб побачити свій акаунт.
                    </p>

                    <button
                        type="button"
                        class="specialist-card__button"
                        id="accLoginBtn"
                    >
                        Увійти
                    </button>
                </div>
            `;

            document
                .querySelector(
                    "#accLoginBtn"
                )
                ?.addEventListener(
                    "click",
                    () => openAuthModal()
                );

            return;
        }

        const specialists =
            getSpecialists();

        const myProfile =
            specialists.find(
                item =>
                    item.ownerId ===
                    user.id
            ) || null;

        const favorites = getFavorites()
            .map(id =>
                specialists.find(
                    item =>
                        item.id === id &&
                        item.visible !==
                            false
                )
            )
            .filter(Boolean);

        const roleName =
            user.role === "specialist"
                ? "Спеціаліст"
                : user.role === "client"
                  ? "Клієнт"
                  : "Роль не обрано";

        let memberSince = "";

        try {
            memberSince = new Date(
                user.createdAt
            ).getFullYear();
        } catch {
            memberSince = "";
        }

        const myPlan = getUserPlan(user);

        const myPlanLimits =
            PLANS[myPlan];

        const myServicesCount =
            myProfile &&
            Array.isArray(
                myProfile.services
            )
                ? myProfile.services.length
                : 0;

        const myBookingsThisMonth =
            myProfile
                ? countBookingsThisMonth(
                      myProfile.id
                  )
                : 0;

        function usageText(used, limit) {
            return Number.isFinite(limit)
                ? `${used} / ${limit}`
                : `${used} / ∞`;
        }

        function usagePercent(
            used,
            limit
        ) {
            if (
                !Number.isFinite(limit) ||
                limit <= 0
            ) {
                return 0;
            }

            return Math.min(
                100,
                Math.round(
                    (used / limit) * 100
                )
            );
        }

        const incomingBookings = myProfile
            ? getBookings()
                  .filter(
                      item =>
                          item.specialistId ===
                          myProfile.id
                  )
                  .sort(
                      (a, b) =>
                          String(
                              a.date || ""
                          ).localeCompare(
                              String(
                                  b.date || ""
                              )
                          ) ||
                          String(
                              a.time || ""
                          ).localeCompare(
                              String(
                                  b.time || ""
                              )
                          )
                  )
            : [];

        const myBookings = getBookings()
            .filter(
                item =>
                    item.clientId ===
                    user.id
            )
            .sort(
                (a, b) =>
                    String(
                        a.date || ""
                    ).localeCompare(
                        String(b.date || "")
                    ) ||
                    String(
                        a.time || ""
                    ).localeCompare(
                        String(b.time || "")
                    )
            );

        const myThreads = getThreads()
            .filter(
                item =>
                    item.clientId ===
                        user.id ||
                    isOwnThread(item, user)
            )
            .sort(
                (a, b) =>
                    String(
                        b.updatedAt || ""
                    ).localeCompare(
                        String(
                            a.updatedAt || ""
                        )
                    )
            );

        function threadRow(thread) {
            const spec = specialists.find(
                entry =>
                    entry.id ===
                    thread.specialistId
            );

            const peer = isOwnThread(
                thread,
                user
            )
                ? thread.clientName ||
                  "Клієнт"
                : (spec && spec.name) ||
                  "Фахівець";

            const messages = getMessages(
                thread.id
            );

            const last = messages.length
                ? messages[
                      messages.length - 1
                  ]
                : null;

            return `
                <button
                    type="button"
                    class="account-thread"
                    data-thread="${escapeHtml(
                        thread.id
                    )}"
                >
                    <span
                        class="account-thread__avatar"
                    >
                        ${escapeHtml(
                            accountAvatar(peer)
                        )}
                    </span>

                    <span
                        class="account-thread__info"
                    >
                        <strong>
                            ${escapeHtml(peer)}
                        </strong>

                        <span>
                            ${escapeHtml(
                                last
                                    ? last.text
                                    : "Поки що тихо"
                            )}
                        </span>
                    </span>
                </button>
            `;
        }

        function bookingRow(item) {
            const spec = specialists.find(
                entry =>
                    entry.id ===
                    item.specialistId
            );

            return `
                <div
                    class="account-booking"
                >
                    <div
                        class="account-booking__date"
                    >
                        <strong>
                            ${escapeHtml(
                                item.date || ""
                            )}
                        </strong>

                        <span>
                            ${escapeHtml(
                                item.time || ""
                            )}
                        </span>
                    </div>

                    <div
                        class="account-booking__info"
                    >
                        <strong>
                            ${escapeHtml(
                                item.serviceName ||
                                    "Послуга"
                            )}
                        </strong>

                        <span>
                            ${escapeHtml(
                                spec
                                    ? spec.name
                                    : ""
                            )}${spec ? " • " : ""}${escapeHtml(
                                item.clientName ||
                                    ""
                            )}
                        </span>
                    </div>

                    <button
                        type="button"
                        class="fav-btn"
                        data-cancel-booking="${escapeHtml(
                            item.id
                        )}"
                        aria-label="Скасувати запис"
                        title="Скасувати"
                    >
                        ×
                    </button>
                </div>
            `;
        }

        accountRoot.innerHTML = `
            <div
                class="account-card"
            >
                <div
                    class="account-top"
                >
                    <div
                        class="account-avatar"
                    >
                        ${escapeHtml(
                            accountAvatar(
                                user.name
                            )
                        )}
                    </div>

                    <div>
                        <h1>
                            ${escapeHtml(
                                user.name
                            )}
                        </h1>

                        <p
                            class="account-email"
                        >
                            ${escapeHtml(
                                user.email
                            )}
                        </p>

                        <span
                            class="account-role"
                        >
                            ${roleName}${
                                memberSince
                                    ? ` • з ${memberSince}`
                                    : ""
                            }
                        </span>
                    </div>
                </div>

                ${
                    !user.role
                        ? `
                            <div
                                class="account-norole"
                            >
                                <p>
                                    Оберіть тип акаунта,
                                    щоб користуватись Veyra.
                                </p>

                                <button
                                    type="button"
                                    class="specialist-card__button"
                                    id="accRoleBtn"
                                >
                                    Обрати роль
                                </button>
                            </div>
                        `
                        : ""
                }

                <div
                    class="account-actions"
                >
                    ${
                        user.role ===
                        "specialist"
                            ? `
                                <button
                                    type="button"
                                    class="specialist-card__button"
                                    data-go="create.html"
                                >
                                    ${myProfile ? "Редагувати сторінку" : "Створити сторінку"}
                                </button>

                                ${
                                    myProfile
                                        ? `
                                            <button
                                                type="button"
                                                class="specialist-card__button specialist-card__button--ghost"
                                                data-go="specialist.html?id=${encodeURIComponent(
                                                    myProfile.id
                                                )}"
                                            >
                                                Моє оголошення
                                            </button>
                                        `
                                        : ""
                                }
                            `
                            : `
                                <button
                                    type="button"
                                    class="specialist-card__button"
                                    data-go="specialists.html"
                                >
                                    Знайти фахівця
                                </button>
                            `
                    }

                    <button
                        type="button"
                        class="specialist-card__button specialist-card__button--ghost"
                        data-go="specialists.html?fav=1"
                    >
                        Обрані (${favorites.length})
                    </button>

                    <button
                        type="button"
                        class="specialist-card__button specialist-card__button--ghost"
                        data-go="price.html"
                    >
                        Тарифи
                    </button>

                    ${
                        isAdmin(user)
                            ? `
                                <button
                                    type="button"
                                    class="specialist-card__button specialist-card__button--ghost"
                                    data-go="admin.html"
                                >
                                    Адмінка
                                </button>
                            `
                            : ""
                    }

                    <button
                        type="button"
                        class="veyra-logout"
                        id="accLogoutBtn"
                    >
                        Вийти з акаунта
                    </button>
                </div>
            </div>

            ${
                user.role ===
                "specialist"
                    ? `
                        <div
                            class="account-card"
                        >
                            <h2>
                                Тариф «${myPlanLimits.name}»
                            </h2>

                            <div
                                class="usage"
                            >
                                <div
                                    class="usage__row"
                                >
                                    <span>
                                        Послуги
                                    </span>

                                    <strong>
                                        ${usageText(
                                            myServicesCount,
                                            myPlanLimits.services
                                        )}
                                    </strong>
                                </div>

                                <div
                                    class="usage__bar"
                                >
                                    <span
                                        style="width: ${usagePercent(
                                            myServicesCount,
                                            myPlanLimits.services
                                        )}%"
                                    ></span>
                                </div>

                                <div
                                    class="usage__row"
                                >
                                    <span>
                                        Записи цього місяця
                                    </span>

                                    <strong>
                                        ${usageText(
                                            myBookingsThisMonth,
                                            myPlanLimits.bookingsPerMonth
                                        )}
                                    </strong>
                                </div>

                                <div
                                    class="usage__bar"
                                >
                                    <span
                                        style="width: ${usagePercent(
                                            myBookingsThisMonth,
                                            myPlanLimits.bookingsPerMonth
                                        )}%"
                                    ></span>
                                </div>
                            </div>

                            <button
                                type="button"
                                class="specialist-card__button specialist-card__button--ghost"
                                data-go="price.html"
                            >
                                Змінити тариф
                            </button>
                        </div>

                        <div
                            class="account-card"
                            id="accIncoming"
                        >
                            <h2>
                                Записи до мене
                            </h2>

                            ${
                                incomingBookings.length
                                    ? `
                                        <div
                                            class="account-bookings"
                                        >
                                            ${incomingBookings
                                                .map(
                                                    bookingRow
                                                )
                                                .join(
                                                    ""
                                                )}
                                        </div>
                                    `
                                    : `
                                        <p
                                            class="account-empty"
                                        >
                                            Записів поки немає.
                                        </p>
                                    `
                            }
                        </div>
                    `
                    : ""
            }

            ${
                myBookings.length
                    ? `
                        <div
                            class="account-card"
                            id="accMyBookings"
                        >
                            <h2>
                                Мої записи
                            </h2>

                            <div
                                class="account-bookings"
                            >
                                ${myBookings
                                    .map(bookingRow)
                                    .join("")}
                            </div>
                        </div>
                    `
                    : ""
            }

            <div
                class="account-card"
                id="accMessages"
            >
                <h2>
                    Повідомлення
                </h2>

                ${
                    myThreads.length
                        ? `
                            <div
                                class="account-threads"
                            >
                                ${myThreads
                                    .map(threadRow)
                                    .join("")}
                            </div>
                        `
                        : `
                            <p
                                class="account-empty"
                            >
                                Поки що тихо. Напишіть фахівцю
                                з його сторінки.
                            </p>
                        `
                }
            </div>

            <div
                class="account-card"
                id="accFavs"
            >
                <h2>
                    Обране
                </h2>
                ${
                    favorites.length
                        ? `
                            <div
                                class="account-favs"
                            >
                                ${favorites
                                    .map(
                                        item => `
                                    <div
                                        class="account-fav"
                                    >
                                        <a
                                            href="specialist.html?id=${encodeURIComponent(
                                                item.id
                                            )}"
                                            class="account-fav__link"
                                        >
                                            <span
                                                class="account-fav__thumb"
                                            >
                                                ${
                                                    item.photo
                                                        ? `
                                                            <img
                                                                src="${item.photo}"
                                                                alt=""
                                                                loading="lazy"
                                                            >
                                                        `
                                                        : escapeHtml(
                                                              accountAvatar(
                                                                  item.name
                                                              )
                                                          )
                                                }
                                            </span>

                                            <span
                                                class="account-fav__info"
                                            >
                                                <strong>
                                                    ${escapeHtml(
                                                        item.name
                                                    )}
                                                </strong>

                                                <span>
                                                    ${escapeHtml(
                                                        item.profession ||
                                                            ""
                                                    )} • ${escapeHtml(
                                                        item.city ||
                                                            ""
                                                    )}
                                                </span>
                                            </span>
                                        </a>

                                        <button
                                            type="button"
                                            class="fav-btn active"
                                            data-unfav="${escapeHtml(
                                                item.id
                                            )}"
                                            aria-label="Прибрати з обраного"
                                        >
                                            ♥
                                        </button>
                                    </div>
                                `
                                    )
                                    .join("")}
                            </div>
                        `
                        : `
                            <p
                                class="account-empty"
                            >
                                Поки що порожньо. Натискайте ♥
                                на картках фахівців.
                            </p>
                        `
                }
            </div>

            <div
                class="account-card account-danger"
            >
                <h2>
                    Небезпечна зона
                </h2>

                <p>
                    Повністю видаляє акаунт: профіль,
                    оголошення, записи, відгуки,
                    повідомлення та заявки — і локально,
                    і в базі даних. Дію не скасувати.
                </p>

                <button
                    type="button"
                    class="admin-del"
                    id="accDeleteBtn"
                >
                    Видалити акаунт повністю
                </button>
            </div>
        `;

        document
            .querySelector(
                "#accRoleBtn"
            )
            ?.addEventListener(
                "click",
                () => {
                    openAuthModal();
                    showRoleSelection();
                }
            );

        document
            .querySelector(
                "#accLogoutBtn"
            )
            ?.addEventListener(
                "click",
                () => logout()
            );

        document
            .querySelector(
                "#accDeleteBtn"
            )
            ?.addEventListener(
                "click",
                async () => {
                    if (
                        !confirm(
                            "Точно видалити акаунт і ВСІ пов'язані дані?"
                        )
                    ) {
                        return;
                    }

                    if (
                        !confirm(
                            "Останнє підтвердження: дані зникнуть і з бази даних. Продовжити?"
                        )
                    ) {
                        return;
                    }

                    const result =
                        await deleteAccountCompletely(
                            user.id
                        );

                    if (!result.ok) {
                        alert(
                            "Не вдалося видалити акаунт."
                        );
                        return;
                    }

                    alert(
                        result.cloudAuthDeleted
                            ? "Акаунт повністю видалено."
                            : "Акаунт і дані видалено. Якщо входили через Google — вийдіть з нього окремо, а Firebase-запис при потребі видаліть у консолі (Authentication → Users)."
                    );

                    goToHome();
                }
            );

        accountRoot
            .querySelectorAll(
                "[data-go]"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        goToHtml(
                            button.getAttribute(
                                "data-go"
                            )
                        )
                );
            });

        accountRoot.onclick = event => {
            const unfav =
                event.target.closest(
                    "[data-unfav]"
                );

            if (unfav) {
                toggleFavorite(
                    unfav.getAttribute(
                        "data-unfav"
                    )
                );

                initAccountPage();
                return;
            }

            const cancelBtn =
                event.target.closest(
                    "[data-cancel-booking]"
                );

            if (cancelBtn) {
                const id =
                    cancelBtn.getAttribute(
                        "data-cancel-booking"
                    );

                saveBookings(
                    getBookings().filter(
                        item =>
                            item.id !== id
                    )
                );

                initAccountPage();
                return;
            }

            const threadBtn =
                event.target.closest(
                    "[data-thread]"
                );

            if (threadBtn) {
                openThread(
                    threadBtn.getAttribute(
                        "data-thread"
                    )
                );
            }
        };
    }

    // ========================================
    // АДМІНКА
    // ========================================

    function isAdmin(user) {
        // Адмін — це ОКРЕМИЙ Firebase-акаунт (email+пароль або Google),
        // а не будь-хто, хто вказав email у локальній реєстрації.
        try {
            var backend =
                window.VeyraBackend;

            if (
                backend &&
                backend.configured &&
                backend.currentUser &&
                backend.currentUser.email
            ) {
                return ADMIN_EMAILS.includes(
                    String(
                        backend.currentUser
                            .email
                    ).toLowerCase()
                );
            }
        } catch (identityError) {
            console.error(
                identityError
            );
        }

        return false;
    }

    const adminRoot =
        document.querySelector(
            "#adminRoot"
        );

    let adminTab = "specialists";

    let adminAuthResolved = false;

    let adminRetries = 0;

    const ADMIN_MAX_RETRIES = 5;

    if (adminRoot) {
        initAdminPage();
    }

    try {
        if (
            window.VeyraBackend &&
            window.VeyraBackend.onAuth
        ) {
            window.VeyraBackend.onAuth(
                () => {
                    adminAuthResolved = true;

                    if (adminRoot) {
                        initAdminPage();
                    }

                    if (accountRoot) {
                        initAccountPage();
                    }
                }
            );
        }
    } catch (authSubError) {
        console.error(authSubError);
    }

    function initAdminPage() {
        const user =
            getCurrentUser();

        const backendReady = !!(
            window.VeyraBackend &&
            window.VeyraBackend
                .configured
        );

        const firebaseUser =
            backendReady &&
            window.VeyraBackend
                .currentUser &&
            window.VeyraBackend
                .currentUser.email
                ? window.VeyraBackend
                      .currentUser
                : null;

        // Бекенд ще вантажиться (CDN повільно) — чекаємо з повтором.
        // Показуємо реальну помилку, якщо SDK вже впав.
        if (!backendReady) {
            const lastError =
                window.VeyraBackend &&
                window.VeyraBackend
                    .lastError;

            const canRetry =
                adminRetries <
                ADMIN_MAX_RETRIES;

            adminRoot.innerHTML = `
                <div
                    class="account-card account-card--center"
                >
                    <h1>
                        Адмінка
                    </h1>

                    <p>
                        ${
                            canRetry
                                ? "З'єднуємось із Firebase…"
                                : "Не вдалося з'єднатись із Firebase."
                        }
                    </p>

                    ${
                        lastError
                            ? `
                                <p
                                    class="admin-error"
                                >
                                    Помилка: ${escapeHtml(
                                        String(
                                            lastError
                                        )
                                    )}
                                </p>
                            `
                            : ""
                    }

                    ${
                        !canRetry
                            ? `
                                <button
                                    type="button"
                                    class="specialist-card__button"
                                    id="adminRetryBtn"
                                >
                                    Спробувати ще раз
                                </button>

                                <p
                                    class="account-empty"
                                >
                                    Перевірте інтернет і що файл
                                    js/veyra-backend.js підключено
                                    перед js/script.js.
                                </p>
                            `
                            : ""
                    }
                </div>
            `;

            document
                .querySelector(
                    "#adminRetryBtn"
                )
                ?.addEventListener(
                    "click",
                    () => {
                        adminRetries = 0;
                        initAdminPage();
                    }
                );

            if (canRetry) {
                adminRetries++;

                setTimeout(() => {
                    if (
                        document.querySelector(
                            "#adminRoot"
                        )
                    ) {
                        initAdminPage();
                    }
                }, 2500);
            }

            return;
        }

        // Немає Firebase-сесії — окремий вхід адміна.
        if (!firebaseUser) {
            adminRoot.innerHTML = `
                <div
                    class="account-card"
                    style="max-width: 440px;"
                >
                    <h1>
                        Вхід для адміна
                    </h1>

                    <p>
                        ${
                            backendReady
                                ? "Увійдіть окремим акаунтом адміністратора (email + пароль або Google)."
                                : "Спочатку підключіть Firebase (див. FIREBASE_SETUP.md) — без нього адмінку не відкрити."
                        }
                    </p>

                    ${
                        backendReady
                            ? `
                                <form id="adminLoginForm">
                                    <label>
                                        Email адміна

                                        <input
                                            type="email"
                                            id="adminEmail"
                                            placeholder="admin@example.com"
                                            required
                                        >
                                    </label>

                                    <label>
                                        Пароль

                                        <input
                                            type="password"
                                            id="adminPassword"
                                            placeholder="••••••••"
                                            required
                                        >
                                    </label>

                                    <button
                                        type="submit"
                                        class="veyra-auth-submit"
                                    >
                                        Увійти як адмін
                                    </button>
                                </form>

                                <button
                                    type="button"
                                    class="veyra-google-btn"
                                    id="adminGoogleBtn"
                                    style="margin-top: 12px;"
                                >
                                    <span>G</span>
                                    Увійти через Google
                                </button>
                            `
                            : ""
                    }
                </div>
            `;

            document
                .querySelector(
                    "#adminLoginForm"
                )
                ?.addEventListener(
                    "submit",
                    event => {
                        event.preventDefault();

                        const email =
                            document.querySelector(
                                "#adminEmail"
                            ).value;

                        const password =
                            document.querySelector(
                                "#adminPassword"
                            ).value;

                        window.VeyraBackend.signInEmail(
                            email,
                            password
                        )
                            .then(() => {
                                adminAuthResolved = true;
                                initAdminPage();
                            })
                            .catch(error => {
                                console.error(
                                    error
                                );

                                alert(
                                    "Не вдалося увійти. Перевірте email і пароль."
                                );
                            });
                    }
                );

            document
                .querySelector(
                    "#adminGoogleBtn"
                )
                ?.addEventListener(
                    "click",
                    () => {
                        window.VeyraBackend.googleSignIn()
                            .then(() => {
                                adminAuthResolved = true;
                                initAdminPage();
                            })
                            .catch(error => {
                                console.error(
                                    error
                                );

                                alert(
                                    "Не вдалося увійти через Google."
                                );
                            });
                    }
                );

            return;
        }

        if (!isAdmin(user)) {
            adminRoot.innerHTML = `
                <div
                    class="account-card account-card--center"
                >
                    <h1>
                        Немає доступу
                    </h1>

                    <p>
                        Цей акаунт (${escapeHtml(
                            firebaseUser.email ||
                                ""
                        )}) не є адміністратором.
                    </p>

                    <button
                        type="button"
                        class="specialist-card__button"
                        data-go="index.html"
                    >
                        На головну
                    </button>
                </div>
            `;

            adminRoot
                .querySelector("[data-go]")
                .addEventListener(
                    "click",
                    event => {
                        event.preventDefault();
                        goToHome();
                    }
                );

            return;
        }

        const specialists =
            getSpecialists();

        const users = getUsers();

        const bookings = getBookings();

        const reviews = getReviews();

        const payments = getPayments();

        const tabs = [
            ["specialists", `Оголошення (${specialists.length})`],
            ["users", `Користувачі (${users.length})`],
            ["bookings", `Записи (${bookings.length})`],
            ["reviews", `Відгуки (${reviews.length})`],
            [
                "payments",
                `Оплати (${
                    payments.filter(
                        item =>
                            item.status ===
                            "pending"
                    ).length
                })`
            ]
        ];

        let body = "";

        if (adminTab === "specialists") {
            body = specialists.length
                ? `
                    <div
                        class="admin-list"
                    >
                        ${specialists
                            .map(
                                item => `
                            <div
                                class="admin-row"
                            >
                                <div
                                    class="admin-row__info"
                                >
                                    <strong>
                                        ${escapeHtml(
                                            item.name
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHtml(
                                            item.profession ||
                                                ""
                                        )} • ${escapeHtml(
                                            item.city ||
                                                ""
                                        )}
                                    </span>
                                </div>

                                <label
                                    class="admin-check"
                                >
                                    <input
                                        type="checkbox"
                                        data-admin-visible="${escapeHtml(
                                            item.id
                                        )}"
                                        ${item.visible !== false ? "checked" : ""}
                                    >

                                    <span>
                                        Видно
                                    </span>
                                </label>

                                <button
                                    type="button"
                                    class="admin-del"
                                    data-admin-del-spec="${escapeHtml(
                                        item.id
                                    )}"
                                >
                                    Видалити
                                </button>
                            </div>
                        `
                            )
                            .join("")}
                    </div>
                `
                : `<p class="account-empty">Оголошень немає.</p>`;
        }

        if (adminTab === "users") {
            body = users.length
                ? `
                    <div
                        class="admin-list"
                    >
                        ${users
                            .map(
                                item => `
                            <div
                                class="admin-row"
                            >
                                <div
                                    class="admin-row__info"
                                >
                                    <strong>
                                        ${escapeHtml(
                                            item.name
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHtml(
                                            item.email
                                        )} • ${
                                            item.role ===
                                            "specialist"
                                                ? "Спеціаліст"
                                                : item.role ===
                                                    "client"
                                                  ? "Клієнт"
                                                  : "Без ролі"
                                        }
                                    </span>
                                </div>

                                <select
                                    class="admin-select"
                                    data-admin-plan="${escapeHtml(
                                        item.id
                                    )}"
                                >
                                    ${Object.keys(
                                        PLANS
                                    )
                                        .map(
                                            key => `
                                        <option
                                            value="${key}"
                                            ${
                                                getUserPlan(
                                                    item
                                                ) === key
                                                    ? "selected"
                                                    : ""
                                            }
                                        >
                                            ${PLANS[key].name}
                                        </option>
                                    `
                                        )
                                        .join("")}
                                </select>

                                ${
                                    item.id !==
                                    user.id
                                        ? `
                                            <button
                                                type="button"
                                                class="admin-del"
                                                data-admin-del-user="${escapeHtml(
                                                    item.id
                                                )}"
                                            >
                                                Видалити
                                            </button>
                                        `
                                        : ""
                                }
                            </div>
                        `
                            )
                            .join("")}
                    </div>
                `
                : `<p class="account-empty">Користувачів немає.</p>`;
        }

        if (adminTab === "bookings") {
            body = bookings.length
                ? `
                    <div
                        class="admin-list"
                    >
                        ${bookings
                            .map(
                                item => `
                            <div
                                class="admin-row"
                            >
                                <div
                                    class="admin-row__info"
                                >
                                    <strong>
                                        ${escapeHtml(
                                            item.date ||
                                                ""
                                        )} ${escapeHtml(
                                            item.time ||
                                                ""
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHtml(
                                            item.serviceName ||
                                                ""
                                        )} • ${escapeHtml(
                                            item.clientName ||
                                                ""
                                        )}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    class="admin-del"
                                    data-admin-del-booking="${escapeHtml(
                                        item.id
                                    )}"
                                >
                                    Видалити
                                </button>
                            </div>
                        `
                            )
                            .join("")}
                    </div>
                `
                : `<p class="account-empty">Записів немає.</p>`;
        }

        if (adminTab === "reviews") {
            body = reviews.length
                ? `
                    <div
                        class="admin-list"
                    >
                        ${reviews
                            .map(
                                item => `
                            <div
                                class="admin-row"
                            >
                                <div
                                    class="admin-row__info"
                                >
                                    <strong>
                                        ${"★".repeat(
                                            Number(
                                                item.stars
                                            ) || 0
                                        )} ${escapeHtml(
                                            item.clientName ||
                                                ""
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHtml(
                                            item.text ||
                                                ""
                                        )}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    class="admin-del"
                                    data-admin-del-review="${escapeHtml(
                                        item.id
                                    )}"
                                >
                                    Видалити
                                </button>
                            </div>
                        `
                            )
                            .join("")}
                    </div>
                `
                : `<p class="account-empty">Відгуків немає.</p>`;
        }

        if (adminTab === "payments") {
            body = payments.length
                ? `
                    <div
                        class="admin-list"
                    >
                        ${payments
                            .map(
                                item => `
                            <div
                                class="admin-row"
                            >
                                <div
                                    class="admin-row__info"
                                >
                                    <strong>
                                        ${escapeHtml(
                                            (PLANS[
                                                item.plan
                                            ] || {})
                                                .name ||
                                                item.plan
                                        )} • ${escapeHtml(
                                            item.status
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHtml(
                                            item.userName ||
                                                ""
                                        )} (${escapeHtml(
                                            item.userEmail ||
                                                ""
                                        )})
                                    </span>
                                </div>

                                ${
                                    item.status ===
                                    "pending"
                                        ? `
                                            <button
                                                type="button"
                                                class="specialist-card__button"
                                                data-admin-pay-ok="${escapeHtml(
                                                    item.id
                                                )}"
                                            >
                                                Підтвердити
                                            </button>

                                            <button
                                                type="button"
                                                class="admin-del"
                                                data-admin-pay-no="${escapeHtml(
                                                    item.id
                                                )}"
                                            >
                                                Відхилити
                                            </button>
                                        `
                                        : ""
                                }
                            </div>
                        `
                            )
                            .join("")}
                    </div>
                `
                : `<p class="account-empty">Заявок на оплату немає.</p>`;
        }

        adminRoot.innerHTML = `
            <div
                class="account-card"
            >
                <h1>
                    Адмінка
                </h1>

                <p>
                    ${escapeHtml(
                        (user && user.email) ||
                            (firebaseUser &&
                                firebaseUser.email) ||
                            ""
                    )}
                </p>

                <div
                    class="admin-tabs"
                >
                    ${tabs
                        .map(
                            ([key, label]) => `
                            <button
                                type="button"
                                class="admin-tab${adminTab === key ? " active" : ""}"
                                data-admin-tab="${key}"
                            >
                                ${label}
                            </button>
                        `
                        )
                        .join("")}
                </div>

                ${body}
            </div>
        `;

        adminRoot.onclick = async event => {
            const tabBtn =
                event.target.closest(
                    "[data-admin-tab]"
                );

            if (tabBtn) {
                adminTab =
                    tabBtn.getAttribute(
                        "data-admin-tab"
                    );

                initAdminPage();
                return;
            }

            const visBox =
                event.target.closest(
                    "[data-admin-visible]"
                );

            if (visBox) {
                const list =
                    getSpecialists();

                const item = list.find(
                    entry =>
                        entry.id ===
                        visBox.getAttribute(
                            "data-admin-visible"
                        )
                );

                if (item) {
                    item.visible =
                        visBox.checked;

                    item.updatedAt =
                        new Date().toISOString();

                    saveSpecialists(list);
                }

                return;
            }

            const delUser =
                event.target.closest(
                    "[data-admin-del-user]"
                );

            if (delUser) {
                const id =
                    delUser.getAttribute(
                        "data-admin-del-user"
                    );

                if (
                    !confirm(
                        "Видалити користувача і ВСІ його дані (з бази також)?"
                    )
                ) {
                    return;
                }

                await deleteAccountCompletely(
                    id
                );

                initAdminPage();
                return;
            }

            const delSpec =
                event.target.closest(
                    "[data-admin-del-spec]"
                );

            if (delSpec) {
                if (
                    !confirm(
                        "Видалити оголошення?"
                    )
                ) {
                    return;
                }

                const id =
                    delSpec.getAttribute(
                        "data-admin-del-spec"
                    );

                saveSpecialists(
                    getSpecialists().filter(
                        item =>
                            item.id !== id
                    )
                );

                cloudDelete(
                    "specialists",
                    id
                );

                initAdminPage();
                return;
            }

            const delBooking =
                event.target.closest(
                    "[data-admin-del-booking]"
                );

            if (delBooking) {
                saveBookings(
                    getBookings().filter(
                        item =>
                            item.id !==
                            delBooking.getAttribute(
                                "data-admin-del-booking"
                            )
                    )
                );

                cloudDelete(
                    "bookings",
                    delBooking.getAttribute(
                        "data-admin-del-booking"
                    )
                );

                initAdminPage();
                return;
            }

            const delReview =
                event.target.closest(
                    "[data-admin-del-review]"
                );

            if (delReview) {
                const id =
                    delReview.getAttribute(
                        "data-admin-del-review"
                    );

                const target =
                    getReviews().find(
                        item =>
                            item.id === id
                    );

                saveReviews(
                    getReviews().filter(
                        item =>
                            item.id !== id
                    )
                );

                if (target) {
                    recalcSpecialistRating(
                        target.specialistId
                    );
                }

                cloudDelete(
                    "reviews",
                    id
                );

                initAdminPage();
                return;
            }

            const payOk =
                event.target.closest(
                    "[data-admin-pay-ok]"
                );

            if (payOk) {
                const id =
                    payOk.getAttribute(
                        "data-admin-pay-ok"
                    );

                const pays =
                    getPayments();

                const pay = pays.find(
                    item =>
                        item.id === id
                );

                if (pay) {
                    const allUsers =
                        getUsers();

                    const owner =
                        allUsers.find(
                            item =>
                                item.id ===
                                pay.userId
                        );

                    if (owner) {
                        owner.plan =
                            pay.plan;

                        saveUsers(
                            allUsers
                        );
                    }

                    pay.status = "done";

                    savePayments(pays);
                }

                initAdminPage();
                return;
            }

            const payNo =
                event.target.closest(
                    "[data-admin-pay-no]"
                );

            if (payNo) {
                const id =
                    payNo.getAttribute(
                        "data-admin-pay-no"
                    );

                const pays =
                    getPayments();

                const pay = pays.find(
                    item =>
                        item.id === id
                );

                if (pay) {
                    pay.status =
                        "rejected";

                    savePayments(pays);
                }

                initAdminPage();
                return;
            }
        };

        adminRoot.onchange = event => {
            const planSelect =
                event.target.closest(
                    "[data-admin-plan]"
                );

            if (!planSelect) {
                return;
            }

            const users = getUsers();

            const item = users.find(
                entry =>
                    entry.id ===
                    planSelect.getAttribute(
                        "data-admin-plan"
                    )
            );

            if (
                item &&
                PLANS[planSelect.value]
            ) {
                item.plan =
                    planSelect.value;

                saveUsers(users);
            }
        };
    }

    function cloudDelete(collection, id) {
        try {
            if (
                window.VeyraBackend &&
                window.VeyraBackend
                    .configured &&
                window.VeyraBackend
                    .deleteDoc
            ) {
                window.VeyraBackend.deleteDoc(
                    collection,
                    id
                );
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Повне видалення акаунта: локально + хмара + спроба видалити
    // Firebase-юзера. Повертає {ok, cloudAuthDeleted}.
    async function deleteAccountCompletely(
        userId
    ) {
        const users = getUsers();

        const user = users.find(
            item => item.id === userId
        );

        if (!user) {
            return {
                ok: false,
                error: "nouser"
            };
        }

        let cloudAuthDeleted = false;

        try {
            if (
                window.VeyraBackend &&
                window.VeyraBackend
                    .configured &&
                window.VeyraBackend
                    .currentUser &&
                String(
                    window.VeyraBackend
                        .currentUser.email ||
                        ""
                ).toLowerCase() ===
                    String(
                        user.email || ""
                    ).toLowerCase()
            ) {
                await window.VeyraBackend.deleteAuthUser();
                cloudAuthDeleted = true;
            }
        } catch (authDeleteError) {
            console.error(
                authDeleteError
            );
        }

        const ownedSpecIds =
            getSpecialists()
                .filter(
                    item =>
                        item.ownerId ===
                        userId
                )
                .map(item => item.id);

        saveSpecialists(
            getSpecialists().filter(
                item =>
                    item.ownerId !==
                    userId
            )
        );

        ownedSpecIds.forEach(id =>
            cloudDelete(
                "specialists",
                id
            )
        );

        const doomedBookings =
            getBookings().filter(
                item =>
                    item.clientId ===
                        userId ||
                    ownedSpecIds.includes(
                        item.specialistId
                    )
            );

        saveBookings(
            getBookings().filter(
                item =>
                    item.clientId !==
                        userId &&
                    !ownedSpecIds.includes(
                        item.specialistId
                    )
            )
        );

        doomedBookings.forEach(item =>
            cloudDelete(
                "bookings",
                item.id
            )
        );

        const doomedReviews =
            getReviews().filter(
                item =>
                    item.clientId ===
                    userId
            );

        const affectedSpecs = [
            ...new Set(
                doomedReviews.map(
                    item =>
                        item.specialistId
                )
            )
        ];

        saveReviews(
            getReviews().filter(
                item =>
                    item.clientId !==
                    userId
            )
        );

        doomedReviews.forEach(item =>
            cloudDelete(
                "reviews",
                item.id
            )
        );

        affectedSpecs.forEach(
            recalcSpecialistRating
        );

        const doomedThreads =
            getThreads().filter(
                item =>
                    item.clientId ===
                        userId ||
                    ownedSpecIds.includes(
                        item.specialistId
                    )
            );

        const doomedThreadIds = new Set(
            doomedThreads.map(
                item => item.id
            )
        );

        const doomedMessages = safeParse(
            localStorage.getItem(
                MESSAGES_KEY
            ) || "[]",
            []
        ).filter(
            item =>
                item &&
                doomedThreadIds.has(
                    item.threadId
                )
        );

        try {
            const remainingMessages =
                safeParse(
                    localStorage.getItem(
                        MESSAGES_KEY
                    ) || "[]",
                    []
                ).filter(
                    item =>
                        !item ||
                        !doomedThreadIds.has(
                            item.threadId
                        )
                );

            localStorage.setItem(
                MESSAGES_KEY,
                JSON.stringify(
                    remainingMessages
                )
            );
        } catch (messagesError) {
            console.error(
                messagesError
            );
        }

        doomedMessages.forEach(item =>
            cloudDelete(
                "messages",
                item.id
            )
        );

        saveThreads(
            getThreads().filter(
                item =>
                    item.clientId !==
                        userId &&
                    !ownedSpecIds.includes(
                        item.specialistId
                    )
            )
        );

        try {
            const favs = getFavorites();

            const doomedFavIds = new Set([
                ...ownedSpecIds
            ]);

            localStorage.setItem(
                FAVORITES_KEY,
                JSON.stringify(
                    favs.filter(
                        id =>
                            !doomedFavIds.has(
                                id
                            )
                    )
                )
            );
        } catch (favError) {
            console.error(favError);
        }

        const doomedPays = getPayments()
            .filter(
                item =>
                    item.userId ===
                    userId
            );

        savePayments(
            getPayments().filter(
                item =>
                    item.userId !==
                    userId
            )
        );

        doomedPays.forEach(item =>
            cloudDelete(
                "payments",
                item.id
            )
        );

        saveUsers(
            users.filter(
                item =>
                    item.id !== userId
            )
        );

        if (
            localStorage.getItem(
                CURRENT_USER_KEY
            ) === userId
        ) {
            localStorage.removeItem(
                CURRENT_USER_KEY
            );
        }

        return {
            ok: true,
            cloudAuthDeleted
        };
    }

    // ========================================
    // GLOBAL FUNCTIONS
    // ========================================

    window.getCurrentUser =
        getCurrentUser;

    window.requireRole =
        requireRole;

    window.openAuthModal =
        openAuthModal;

    window.closeAuthModal =
        closeAuthModal;

    window.bookSpecialist =
        openBookingModal;

    window.openChatWith =
        openChatWith;

    window.isAdminUser = isAdmin;

    window.VeyraTest = {
        PLANS,
        DAY_SLOTS,
        getUserPlan,
        getPlanForSpecialist,
        isProSpecialist,
        countBookingsThisMonth,
        getBookings,
        isSlotTaken,
        openBookingModal,
        openChatWith,
        openThread,
        getThreads,
        getMessages,
        submitReview,
        reviewsFor,
        googleErrorText,
        isAdminUser
    };

})();