/* ==========================================================================
   VEYRA BACKEND (Firebase: Auth + Firestore)
   --------------------------------------------------------------------------
   Як увімкнути — покроково див. FIREBASE_SETUP.md (корінь проєкту).

   Коротко:
     1. Створіть проєкт у https://console.firebase.google.com
     2. Увімкніть Authentication → Google, створіть Web-застосунок,
        створіть Firestore Database.
     3. Вставте свій конфіг нижче замість "PASTE_ME".
     4. Підключіть цей файл ПЕРЕД js/script.js на кожній сторінці:
          <script src="../js/veyra-backend.js"></script>
          <script src="../js/script.js"></script>

   Без конфіга файл нічого не робить: сайт працює як раніше
   на localStorage. Після вставки ключів умикаються:
     • вхід через Google (кнопки в модалці),
     • хмарна копія профілів фахівців (читання + запис),
     • localStorage лишається як кеш/фолбек.
   ========================================================================== */

(function () {
    "use strict";

    // ↓↓↓ ВСТАВТЕ СВІЙ КОНФІГ СЮДИ (Firebase Console → Project settings → Your apps) ↓↓↓
    var FIREBASE_CONFIG = {
        apiKey: "AIzaSyDr8FGs3B7O7mbfim5k-CDEkrxkYsxbs44",
        authDomain: "veyra-661f8.firebaseapp.com",
        projectId: "veyra-661f8",
        storageBucket: "veyra-661f8.firebasestorage.app",
        messagingSenderId: "862102935305",
        appId: "1:862102935305:web:be66bfa8ec0591474ee5d8"
       
    };
    // ↑↑↑ ВСТАВТЕ СВІЙ КОНФІГ СЮДИ ↑↑↑

    // Посилання на оплату тарифів (вставте свої, коли будуть).
    // Порожньо = демо-режим: тариф вмикається одразу без оплати.
    // Наприклад: pro: "https://www.liqpay.ua/checkout/...",
    var PAYMENT_LINKS = {
        start: "",
        pro: "",
        business: ""
    };

    var SPECIALISTS_COLLECTION = "specialists";
    var SDK_VERSION = "10.12.2";

    var authCbs = [];

    var api = {
        configured: false,
        lastError: null,
        auth: null,
        db: null,
        storage: null,
        currentUser: null,

        googleSignIn: function () {
            return Promise.reject(
                new Error("Backend не налаштовано")
            );
        },

        pushSpecialists: function () {
            return Promise.resolve();
        },

        pushDoc: function () {
            return Promise.resolve();
        },

        deleteDoc: function () {
            return Promise.resolve();
        },

        lastError: null,

        uploadImage: function () {
            return Promise.reject(
                new Error("Backend не налаштовано")
            );
        },

        ensureAuth: function () {
            return Promise.resolve();
        },

        signInEmail: function () {
            return Promise.reject(
                new Error("Backend не налаштовано")
            );
        },

        signOut: function () {
            return Promise.resolve();
        },

        deleteAuthUser: function () {
            return Promise.reject(
                new Error("Backend не налаштовано")
            );
        },

        onAuth: function () {
            return function () {};
        }
    };

    window.VeyraBackend = api;

    api.PAYMENT_LINKS = PAYMENT_LINKS;

    function isConfigured() {
        return Object.keys(FIREBASE_CONFIG).every(function (key) {
            var value = FIREBASE_CONFIG[key];
            return value && value !== "PASTE_ME";
        });
    }

    if (!isConfigured()) {
        return;
    }

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var el = document.createElement("script");
            el.src = src;
            el.onload = resolve;
            el.onerror = function () {
                reject(new Error("Не завантажився " + src));
            };
            document.head.appendChild(el);
        });
    }

    function mergeIntoLocalStorage(cloudDocs) {
        try {
            var KEY = "veyraSpecialists";
            var local = JSON.parse(
                window.localStorage.getItem(KEY) || "[]"
            );

            if (!Array.isArray(local)) {
                local = [];
            }

            var byId = {};
            local.forEach(function (item) {
                if (item && item.id) {
                    byId[item.id] = item;
                }
            });

            var changed = false;

            cloudDocs.forEach(function (doc) {
                var existing = byId[doc.id];

                if (
                    !existing ||
                    String(doc.updatedAt || "") >
                        String(existing.updatedAt || "")
                ) {
                    byId[doc.id] = doc;
                    changed = true;
                }
            });

            if (changed) {
                window.localStorage.setItem(
                    KEY,
                    JSON.stringify(Object.values(byId))
                );

                window.dispatchEvent(
                    new Event("veyra:cloud-sync")
                );
            }
        } catch (error) {
            console.error("[backend] merge:", error);
        }
    }

    function pullSpecialists() {
        if (!api.db) {
            return Promise.resolve();
        }

        return api.db
            .collection(SPECIALISTS_COLLECTION)
            .where("visible", "==", true)
            .limit(100)
            .get()
            .then(function (snapshot) {
                var docs = [];
                snapshot.forEach(function (doc) {
                    var data = doc.data() || {};
                    data.id = doc.id;
                    docs.push(data);
                });
                mergeIntoLocalStorage(docs);
            })
            .catch(function (error) {
                console.error("[backend] pull:", error);
            });
    }

    function pushSpecialists(specialists) {
        if (!api.db) {
            return Promise.resolve();
        }

        try {
            var batch = api.db.batch();

            (specialists || []).forEach(function (item) {
                if (!item || !item.id) {
                    return;
                }

                // У хмару — лише текст і ГОТОВІ http-посилання на фото.
                // Свіжі base64-кадри вантажаться через uploadImage()
                // і на момент push вже замінені на URL.
                var copy = {};
                Object.keys(item).forEach(function (key) {
                    var value = item[key];

                    if (
                        (key === "photo" ||
                            key === "portfolio") &&
                        typeof value === "string" &&
                        value.indexOf("data:") === 0
                    ) {
                        return;
                    }

                    if (
                        key === "portfolio" &&
                        Array.isArray(value)
                    ) {
                        value = value.filter(function (
                            entry
                        ) {
                            return (
                                typeof entry !==
                                    "string" ||
                                entry.indexOf(
                                    "data:"
                                ) !== 0
                            );
                        });
                    }

                    copy[key] = value;
                });

                batch.set(
                    api.db
                        .collection(SPECIALISTS_COLLECTION)
                        .doc(String(item.id)),
                    copy,
                    { merge: true }
                );
            });

            return batch.commit().catch(function (error) {
                console.error("[backend] push:", error);
            });
        } catch (error) {
            console.error("[backend] push:", error);
            return Promise.resolve();
        }
    }

    function uploadImage(dataUrl, subPath) {
        if (
            !api.storage ||
            !api.auth ||
            !api.auth.currentUser
        ) {
            return Promise.reject(
                new Error(
                    "Потрібен вхід через Google для завантаження фото"
                )
            );
        }

        var fullPath =
            "profiles/" +
            api.auth.currentUser.uid +
            "/" +
            subPath;

        return api.storage
            .ref(fullPath)
            .putString(dataUrl, "data_url")
            .then(function (snapshot) {
                return snapshot.ref.getDownloadURL();
            });
    }

    Promise.all([
        loadScript(
            "https://www.gstatic.com/firebasejs/" +
                SDK_VERSION +
                "/firebase-app-compat.js"
        ),
        loadScript(
            "https://www.gstatic.com/firebasejs/" +
                SDK_VERSION +
                "/firebase-auth-compat.js"
        ),
        loadScript(
            "https://www.gstatic.com/firebasejs/" +
                SDK_VERSION +
                "/firebase-firestore-compat.js"
        ),
        loadScript(
            "https://www.gstatic.com/firebasejs/" +
                SDK_VERSION +
                "/firebase-storage-compat.js"
        )
    ])
        .then(function () {
            /* global firebase */
            try {
                firebase.initializeApp(
                    FIREBASE_CONFIG
                );
            } catch (initError) {
                api.lastError =
                    "initializeApp: " +
                    (initError &&
                        initError.message);

                console.error(
                    "[backend] init:",
                    initError
                );

                return;
            }

            api.auth = firebase.auth();
            api.db = firebase.firestore();

            try {
                api.storage = firebase.storage();
            } catch (storageError) {
                console.error(
                    "[backend] storage:",
                    storageError
                );
            }

            api.configured = true;

            api.googleSignIn = function () {
                var provider =
                    new firebase.auth.GoogleAuthProvider();

                return api.auth
                    .signInWithPopup(provider)
                    .then(function (result) {
                        var profile =
                            result.additionalUserInfo &&
                            result.additionalUserInfo.profile;

                        return {
                            uid: result.user.uid,
                            email: result.user.email,
                            name:
                                (profile &&
                                    profile.name) ||
                                result.user.displayName ||
                                result.user.email
                        };
                    });
            };

            api.pushSpecialists = pushSpecialists;

            api.pushDoc = function (
                collection,
                id,
                data
            ) {
                if (!api.db || !id) {
                    return Promise.resolve();
                }

                return api.db
                    .collection(collection)
                    .doc(String(id))
                    .set(data || {}, {
                        merge: true
                    })
                    .catch(function (error) {
                        console.error(
                            "[backend] pushDoc:",
                            error
                        );
                    });
            };

            api.deleteDoc = function (
                collection,
                id
            ) {
                if (!api.db || !id) {
                    return Promise.resolve();
                }

                return api.db
                    .collection(collection)
                    .doc(String(id))
                    .delete()
                    .catch(function (error) {
                        console.error(
                            "[backend] deleteDoc:",
                            error
                        );
                    });
            };

            api.uploadImage = uploadImage;

            api.auth.onAuthStateChanged(function (user) {
                api.currentUser = user || null;

                authCbs.forEach(function (cb) {
                    try {
                        cb(api.currentUser);
                    } catch (cbError) {
                        console.error(cbError);
                    }
                });

                // Анонімна сесія як фолбек для завантаження фото.
                // Якщо адміністратор вимкнув анонімний вхід у Firebase Console,
                // просто ігноруємо це — фото будуть лише локально.
                if (
                    !user &&
                    api.auth.signInAnonymously
                ) {
                    api.auth
                        .signInAnonymously()
                        .catch(function (error) {
                            // Не виводимо помилку в консоль, якщо це обмеження адміністратора
                            if (
                                error &&
                                error.code ===
                                    "auth/admin-restricted-operation"
                            ) {
                                return;
                            }
                            console.error(
                                "[backend] anon:",
                                error
                            );
                        });
                }
            });

            api.onAuth = function (cb) {
                if (typeof cb === "function") {
                    authCbs.push(cb);
                }

                return function () {
                    var at = authCbs.indexOf(cb);

                    if (at !== -1) {
                        authCbs.splice(at, 1);
                    }
                };
            };

            api.signInEmail = function (
                email,
                password
            ) {
                return api.auth
                    .signInWithEmailAndPassword(
                        email,
                        password
                    )
                    .then(function (cred) {
                        return {
                            uid: cred.user.uid,
                            email: cred.user.email
                        };
                    });
            };

            api.signOut = function () {
                return api.auth.signOut();
            };

            api.deleteAuthUser = function () {
                var user = api.auth.currentUser;

                if (!user) {
                    return Promise.reject(
                        new Error("Немає сесії")
                    );
                }

                return user.delete();
            };

            api.ensureAuth = function () {
                if (api.auth.currentUser) {
                    return Promise.resolve();
                }

                return new Promise(function (
                    resolve,
                    reject
                ) {
                    var done = false;

                    var timer = setTimeout(
                        function () {
                            if (!done) {
                                done = true;
                                reject(
                                    new Error(
                                        "Auth timeout"
                                    )
                                );
                            }
                        },
                        6000
                    );

                    var off =
                        api.auth.onAuthStateChanged(
                            function (user) {
                                if (
                                    user &&
                                    !done
                                ) {
                                    done = true;
                                    clearTimeout(
                                        timer
                                    );

                                    if (
                                        typeof off ===
                                        "function"
                                    ) {
                                        off();
                                    }

                                    resolve();
                                }
                            }
                        );
                });
            };

            pullSpecialists();
        })
        .catch(function (error) {
            api.lastError =
                "SDK: " +
                (error &&
                    error.message);

            console.error(
                "[backend] init:",
                error
            );
        });
})();
