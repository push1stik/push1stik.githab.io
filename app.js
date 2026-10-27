import {
    initializeApp
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";


import {
    getDatabase,
    ref,
    set,
    onValue,
    onDisconnect,
    serverTimestamp
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


// ======================================================
// FIREBASE
// ======================================================
//
// ВСТАВЬ СЮДА ДАННЫЕ СВОЕГО FIREBASE ПРОЕКТА
//

const firebaseConfig = {

    apiKey: "ВСТАВЬ_API_KEY",

    authDomain: "ВСТАВЬ_AUTH_DOMAIN",

    databaseURL: "ВСТАВЬ_DATABASE_URL",

    projectId: "ВСТАВЬ_PROJECT_ID",

    storageBucket: "ВСТАВЬ_STORAGE_BUCKET",

    messagingSenderId:
        "ВСТАВЬ_MESSAGING_SENDER_ID",

    appId: "ВСТАВЬ_APP_ID"
};


const app =
    initializeApp(firebaseConfig);


const db =
    getDatabase(app);


// ======================================================
// ЭЛЕМЕНТЫ
// ======================================================

const video =
    document.getElementById("video");

const onlineCount =
    document.getElementById("onlineCount");

const syncStatus =
    document.getElementById("syncStatus");


// ======================================================
// УНИКАЛЬНЫЙ ID ПОЛЬЗОВАТЕЛЯ
// ======================================================

const userId =
    crypto.randomUUID();


// ======================================================
// ССЫЛКИ FIREBASE
// ======================================================

const videoStateRef =
    ref(db, "videoState");


const usersRef =
    ref(db, "users/" + userId);


// ======================================================
// ПОДКЛЮЧЕНИЕ ПОЛЬЗОВАТЕЛЯ
// ======================================================

async function connectUser() {

    await set(usersRef, {
        connected: true,
        joinedAt: serverTimestamp()
    });


    onDisconnect(usersRef).remove();
}


connectUser();


// ======================================================
// КОЛИЧЕСТВО ОНЛАЙН
// ======================================================

const allUsersRef =
    ref(db, "users");


onValue(allUsersRef, (snapshot) => {

    const users =
        snapshot.val() || {};

    const count =
        Object.keys(users).length;

    onlineCount.textContent =
        count;
});


// ======================================================
// ЛОКАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ======================================================

let changingFromRemote = false;

let lastRemoteTime = 0;


// ======================================================
// ПОЛУЧЕНИЕ СОСТОЯНИЯ ВИДЕО
// ======================================================

onValue(videoStateRef, (snapshot) => {

    const state =
        snapshot.val();


    if (!state) {

        syncStatus.textContent =
            "Готово к просмотру";

        return;
    }


    changingFromRemote = true;


    // ------------------------------
    // ВРЕМЯ
    // ------------------------------

    if (
        typeof state.currentTime ===
        "number"
    ) {

        const difference =
            Math.abs(
                video.currentTime -
                state.currentTime
            );


        /*
         * Не делаем резкий скачок,
         * если пользователь уже находится
         * практически в нужном месте.
         */

        if (difference > 0.7) {

            video.currentTime =
                state.currentTime;
        }


        lastRemoteTime =
            state.currentTime;
    }


    // ------------------------------
    // PLAY / PAUSE
    // ------------------------------

    if (state.playing === true) {

        video.play()
            .catch(() => {

                /*
                 * Некоторые браузеры
                 * блокируют автоматический
                 * запуск видео.
                 */
            });

    } else {

        video.pause();
    }


    syncStatus.textContent =
        "Синхронизировано";


    setTimeout(() => {

        changingFromRemote =
            false;

    }, 100);

});


// ======================================================
// ОТПРАВКА СОСТОЯНИЯ
// ======================================================

function updateVideoState() {

    if (changingFromRemote) {
        return;
    }


    set(videoStateRef, {

        currentTime:
            video.currentTime,

        playing:
            !video.paused,

        updatedAt:
            serverTimestamp(),

        user:
            userId
    });
}


// ======================================================
// PLAY
// ======================================================

video.addEventListener(
    "play",
    () => {

        updateVideoState();
    }
);


// ======================================================
// PAUSE
// ======================================================

video.addEventListener(
    "pause",
    () => {

        updateVideoState();
    }
);


// ======================================================
// ПЕРЕМОТКА
// ======================================================

video.addEventListener(
    "seeked",
    () => {

        updateVideoState();
    }
);


// ======================================================
// ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ
// ======================================================
//
// Если видео идёт у одного пользователя,
// остальные периодически корректируют позицию.
//

setInterval(() => {

    if (
        !video.paused &&
        !changingFromRemote
    ) {

        set(videoStateRef, {

            currentTime:
                video.currentTime,

            playing: true,

            updatedAt:
                serverTimestamp(),

            user:
                userId
        });
    }

}, 2000);
