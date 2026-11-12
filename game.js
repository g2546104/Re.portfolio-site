
import { initializeApp } from
    "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


// ========================================
// Firebase設定
// ========================================

const firebaseConfig = {
    apiKey: "AIzaSyB8PswnHZ9Nzluu2icGN_S0pU_ZHpovQtI",
    authDomain: "plan1-89210.firebaseapp.com",
    projectId: "plan1-89210",
    storageBucket: "plan1-89210.firebasestorage.app",
    messagingSenderId: "925554575260",
    appId: "1:925554575260:web:dcf63067d08c5ca028ea59",
    measurementId: "G-XJ51WY4VZL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// 匿名ログイン
const authReady = signInAnonymously(auth)
    .then((result) => {
        console.log("Firebase匿名ログイン成功！");
        return result.user;
    })
    .catch((error) => {
        console.error("Firebaseログインエラー:", error);
        throw error;
    });


// ========================================
// 効果音
// ========================================

let audioContext = null;

const SOUND_VOLUME = 0.5;


// 音声機能の準備
function prepareAudio() {

    if (!audioContext) {

        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return false;

        audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    return true;
}


// 電子音を1つ鳴らす
function playTone(
    frequency = 500,
    duration = 0.08,
    volume = 0.2,
    type = "sine",
    delay = 0
) {

    if (!prepareAudio()) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    const startTime = audioContext.currentTime + delay;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);

    gainNode.gain.setValueAtTime(0, startTime);

    gainNode.gain.linearRampToValueAtTime(
        volume * SOUND_VOLUME,
        startTime + 0.01
    );

    gainNode.gain.setValueAtTime(
        volume * SOUND_VOLUME,
        startTime + duration * 0.6
    );

    gainNode.gain.linearRampToValueAtTime(
        0,
        startTime + duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
}


// ボタンのクリック音
function playClickSound() {
    playTone(650, 0.06, 0.15);
}


// 正解音
function playSuccessSound() {

    playTone(660, 0.12, 0.2, "sine", 0);
    playTone(880, 0.16, 0.2, "sine", 0.12);
}


// 不正解音
function playErrorSound() {

    playTone(280, 0.18, 0.18, "triangle", 0);
    playTone(220, 0.2, 0.15, "triangle", 0.16);
}


// ゲーム終了音
function playEndSound() {

    playTone(520, 0.12, 0.18, "sine", 0);
    playTone(390, 0.2, 0.18, "sine", 0.14);
}


// 合図の音
function playSignalSound() {
    playTone(1000, 0.18, 0.22, "sine");
}


// ========================================
// ゲーム本体
// ========================================

document.addEventListener("DOMContentLoaded", function () {

    const toggle = document.getElementById("game-toggle");
    const panel = document.getElementById("game-panel");
    const close = document.getElementById("game-close");
    const content = document.getElementById("game-content");

    if (!toggle || !panel || !close || !content) return;

    let timer = null;
    let timeout = null;
    let currentGame = null;


    // ========================================
    // ニックネーム
    // ========================================

    function getPlayerName() {
        return localStorage.getItem("playerName") || "";
    }


    function showNameInput(onSave) {

        showScreen(`
            <h3>ニックネームを設定しよう！</h3>

            <p>ランキングに表示する名前を入力してね。</p>

            <input
                type="text"
                id="player-name-input"
                maxlength="20"
                placeholder="ニックネーム（20文字以内）"
            >

            <button id="player-name-save" class="game-action">
                保存してゲームへ
            </button>

            <p id="player-name-message"></p>

            <button class="game-back">
                ← ゲーム選択に戻る
            </button>
        `);

        const nameInput =
            document.getElementById("player-name-input");

        const saveButton =
            document.getElementById("player-name-save");

        const message =
            document.getElementById("player-name-message");

        nameInput.value = getPlayerName();

        saveButton.addEventListener("click", function () {

            playClickSound();

            const name = nameInput.value.trim();

            if (!name) {

                message.textContent =
                    "ニックネームを入力してね！";

                playErrorSound();

                return;
            }

            const playerName = name.slice(0, 20);

            localStorage.setItem("playerName", playerName);

            if (typeof onSave === "function") {
                onSave(playerName);
            }
        });
    }


    // ========================================
    // HTML表示用の文字処理
    // ========================================

    function escapeHTML(value) {

        return String(value).replace(/[&<>"']/g, function (char) {

            const escapeMap = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return escapeMap[char];
        });
    }


    // ========================================
    // タイマー停止
    // ========================================

    function clearGameTimers() {

        clearInterval(timer);
        clearTimeout(timeout);

        timer = null;
        timeout = null;
    }


    // ========================================
    // 画面変更
    // ========================================

    function showScreen(html) {
        content.innerHTML = html;
    }


    // ========================================
    // Firebase：スコア保存
    // ========================================

    async function saveScore(collectionName, score, playerName) {

        try {

            const user = await authReady;

            await addDoc(collection(db, collectionName), {

                uid: user.uid,

                name: playerName,

                score: score,

                createdAt: serverTimestamp()
            });

            console.log(`${collectionName} のスコア保存成功！`);

            return true;

        } catch (error) {

            console.error("スコア保存エラー:", error);

            return false;
        }
    }


    // ========================================
    // Firebase：ランキング取得
    // ========================================

    async function loadRanking(
        collectionName,
        elementId,
        direction,
        scoreLabel
    ) {

        const rankingArea =
            document.getElementById(elementId);

        if (!rankingArea) return;

        rankingArea.textContent = "ランキングを読み込み中...";

        try {

            const rankingQuery = query(
                collection(db, collectionName),
                orderBy("score", direction),
                limit(5)
            );

            const snapshot = await getDocs(rankingQuery);

            if (!rankingArea.isConnected) return;

            rankingArea.replaceChildren();

            const heading = document.createElement("h4");

            heading.textContent = "🏆 オンラインランキング";

            rankingArea.appendChild(heading);

            if (snapshot.empty) {

                const message = document.createElement("p");

                message.textContent =
                    "まだランキングがありません。";

                rankingArea.appendChild(message);

                return;
            }

            const list = document.createElement("ol");

            snapshot.forEach((doc) => {

                const data = doc.data();

                const item = document.createElement("li");

                item.textContent =
                    `${data.name}：${data.score}${scoreLabel}`;

                list.appendChild(item);
            });

            rankingArea.appendChild(list);

        } catch (error) {

            console.error("ランキング取得エラー:", error);

            if (rankingArea.isConnected) {

                rankingArea.textContent =
                    "ランキングを取得できませんでした。";
            }
        }
    }


    // ========================================
    // ゲーム選択画面
    // ========================================

    function showMenu() {

        clearGameTimers();

        currentGame = null;

        showScreen(`
            <p>遊びたいゲームを選んでね！</p>

            <div class="game-menu">

                <button class="game-choice" data-game="click">
                    👆 クリックゲーム
                    <small>10秒間で何回押せる？</small>
                </button>

                <button class="game-choice" data-game="memory">
                    🧠 記憶力ゲーム
                    <small>数字の順番を覚えよう</small>
                </button>

                <button class="game-choice" data-game="reaction">
                    ⚡ 反射神経ゲーム
                    <small>合図が出たらクリック！</small>
                </button>

                <button class="game-choice" data-game="number">
                    🎯 数字当てゲーム
                    <small>1〜100の正解を当てよう</small>
                </button>

            </div>
        `);
    }


    // ========================================
    // ゲーム画面共通部分
    // ========================================

    function gameLayout(title, description, body) {

        return `
            <button class="game-back" type="button">
                ← ゲーム選択に戻る
            </button>

            <h3>${title}</h3>

            <p>${description}</p>

            <div class="game-body">
                ${body}
            </div>
        `;
    }


    // ========================================
    // ① クリックゲーム
    // ========================================

    function startClickGame() {

        clearGameTimers();

        currentGame = "click";

        const playerName = getPlayerName();

        if (!playerName) {
            showNameInput(() => startClickGame());
            return;
        }

        let score = 0;
        let timeLeft = 10;
        let submitted = false;

        showScreen(gameLayout(
            "👆 クリックゲーム",
            "10秒間でできるだけ多くクリックしよう！",

            `
                <p>
                    プレイヤー：
                    <strong>${escapeHTML(playerName)}</strong>
                </p>

                <button id="change-name" class="game-secondary">
                    ニックネームを変更
                </button>

                <p>
                    残り時間：
                    <strong id="click-time">10</strong>秒
                </p>

                <p>
                    スコア：
                    <strong id="click-score">0</strong>回
                </p>

                <button id="click-play" class="game-action">
                    クリック！
                </button>

                <p id="click-result"></p>

                <div id="click-ranking">
                    ランキングを読み込み中...
                </div>

                <button id="click-restart" class="game-secondary">
                    もう一度遊ぶ
                </button>
            `
        ));

        const playButton =
            document.getElementById("click-play");

        const restartButton =
            document.getElementById("click-restart");

        const changeNameButton =
            document.getElementById("change-name");


        loadRanking(
            "clickScores",
            "click-ranking",
            "desc",
            "回"
        );


        changeNameButton.addEventListener("click", function () {

            playClickSound();

            showNameInput(() => startClickGame());
        });


        async function finishGame() {

            if (submitted) return;

            submitted = true;

            clearGameTimers();

            playEndSound();

            playButton.disabled = true;

            playButton.textContent = "終了！";

            const result =
                document.getElementById("click-result");

            result.textContent =
                `結果：${score}回クリック！ 保存中...`;

            const saved =
                await saveScore("clickScores", score, playerName);

            if (saved) {

                result.textContent =
                    `結果：${score}回クリック！ スコアを保存したよ！`;

                await loadRanking(
                    "clickScores",
                    "click-ranking",
                    "desc",
                    "回"
                );

            } else {

                result.textContent =
                    `結果：${score}回クリック！ 保存できなかったよ。`;
            }
        }


        timer = setInterval(function () {

            timeLeft--;

            document.getElementById("click-time").textContent =
                timeLeft;

            if (timeLeft <= 0) {
                finishGame();
            }

        }, 1000);


        playButton.addEventListener("click", function () {

            if (timeLeft <= 0 || submitted) return;

            playClickSound();

            score++;

            document.getElementById("click-score").textContent =
                score;
        });


        restartButton.addEventListener("click", function () {

            playClickSound();

            startClickGame();
        });
    }


    // ========================================
    // ② 記憶力ゲーム
    // ========================================

    function startMemoryGame() {

        clearGameTimers();

        currentGame = "memory";

        const playerName = getPlayerName();

        if (!playerName) {
            showNameInput(() => startMemoryGame());
            return;
        }

        let sequence = [];

        let level = 3;

        let accepting = false;

        let submitted = false;

        showScreen(gameLayout(
            "🧠 記憶力ゲーム",
            "表示された数字を順番どおりに入力しよう！",

            `
                <p id="memory-level">レベル：1</p>

                <p id="memory-display">
                    準備できたらスタート！
                </p>

                <button id="memory-start" class="game-action">
                    スタート
                </button>

                <div id="memory-input"></div>

                <p id="memory-message"></p>

                <div id="memory-ranking">
                    ランキングを読み込み中...
                </div>
            `
        ));

        const display =
            document.getElementById("memory-display");

        const startButton =
            document.getElementById("memory-start");

        const inputArea =
            document.getElementById("memory-input");

        const message =
            document.getElementById("memory-message");


        loadRanking(
            "memoryScores",
            "memory-ranking",
            "desc",
            "レベル"
        );


        async function finishMemoryGame() {

            if (submitted) return;

            submitted = true;

            accepting = false;

            clearGameTimers();

            playErrorSound();

            const finalLevel = level - 2;

            message.textContent =
                `ゲーム終了！到達レベル：${finalLevel}。ランキングに保存中...`;

            const saved = await saveScore(
                "memoryScores",
                finalLevel,
                playerName
            );

            if (saved) {

                message.textContent =
                    `ゲーム終了！到達レベル：${finalLevel}。スコアを保存したよ！`;

                await loadRanking(
                    "memoryScores",
                    "memory-ranking",
                    "desc",
                    "レベル"
                );

            } else {

                message.textContent =
                    `ゲーム終了！到達レベル：${finalLevel}。保存できなかったよ。`;
            }

            const retryButton =
                document.createElement("button");

            retryButton.className = "game-action";

            retryButton.textContent = "もう一度挑戦";

            retryButton.addEventListener("click", function () {

                playClickSound();

                startMemoryGame();
            });

            inputArea.appendChild(retryButton);
        }


        function nextRound() {

            if (submitted) return;

            accepting = false;

            sequence = [];

            for (let i = 0; i < level; i++) {

                sequence.push(
                    Math.floor(Math.random() * 9) + 1
                );
            }

            document.getElementById("memory-level").textContent =
                `レベル：${level - 2}`;

            display.textContent = "数字を覚えてね！";

            inputArea.innerHTML = "";

            message.textContent = "";

            let index = 0;


            function showNextNumber() {

                if (index >= sequence.length) {

                    display.textContent =
                        "順番どおりに入力してね！";

                    accepting = true;

                    inputArea.innerHTML = `
                        <input id="memory-answer"
                            type="text"
                            inputmode="numeric"
                            maxlength="${level}"
                            placeholder="数字を入力">

                        <button id="memory-check"
                            class="game-action">
                            答え合わせ
                        </button>
                    `;

                    document.getElementById("memory-check")
                        .addEventListener("click", checkAnswer);

                    return;
                }

                display.textContent = sequence[index];

                // 数字ごとに少し違う高さの音
                playTone(
                    400 + sequence[index] * 50,
                    0.12,
                    0.18
                );

                index++;

                timeout = setTimeout(function () {

                    display.textContent = "";

                    timeout = setTimeout(showNextNumber, 300);

                }, 1000);
            }

            showNextNumber();
        }


        function checkAnswer() {

            if (!accepting || submitted) return;

            playClickSound();

            accepting = false;

            const answer =
                document.getElementById("memory-answer").value.trim();

            if (answer === sequence.join("")) {

                playSuccessSound();

                message.textContent =
                    "正解！次のレベルに進もう！";

                level++;

                const nextButton =
                    document.createElement("button");

                nextButton.className = "game-action";

                nextButton.textContent = "次の問題";

                nextButton.addEventListener("click", function () {

                    playClickSound();

                    nextRound();
                });

                inputArea.appendChild(nextButton);

            } else {

                finishMemoryGame();
            }
        }


        startButton.addEventListener("click", function () {

            if (submitted) return;

            playClickSound();

            startButton.disabled = true;

            nextRound();
        });
    }


    // ========================================
    // ③ 反射神経ゲーム
    // ========================================

    function startReactionGame() {

        clearGameTimers();

        currentGame = "reaction";

        const playerName = getPlayerName();

        if (!playerName) {
            showNameInput(() => startReactionGame());
            return;
        }

        let startTime = 0;

        let state = "start";

        showScreen(gameLayout(
            "⚡ 反射神経ゲーム",
            "合図が出たらすぐにボタンを押そう！",

            `
                <p id="reaction-message">
                    準備ができたらスタート！
                </p>

                <button id="reaction-start" class="game-action">
                    スタート
                </button>

                <p id="reaction-result"></p>

                <div id="reaction-ranking">
                    ランキングを読み込み中...
                </div>
            `
        ));

        const startButton =
            document.getElementById("reaction-start");

        const message =
            document.getElementById("reaction-message");

        const result =
            document.getElementById("reaction-result");


        loadRanking(
            "reactionScores",
            "reaction-ranking",
            "asc",
            "ミリ秒"
        );


        startButton.addEventListener("click", async function () {

            // ゲーム開始
            if (
                state === "start" ||
                state === "result" ||
                state === "early"
            ) {

                playClickSound();

                clearGameTimers();

                state = "waiting";

                startButton.disabled = false;

                startButton.textContent = "合図を待とう！";

                message.textContent =
                    "合図が出るまで押さないでね！";

                result.textContent = "";


                timeout = setTimeout(function () {

                    state = "ready";

                    startTime = performance.now();

                    message.textContent = "今だ！！";

                    startButton.textContent = "クリック！！";

                    playSignalSound();

                }, 2000 + Math.random() * 3000);

                return;
            }


            // フライング
            if (state === "waiting") {

                clearGameTimers();

                playErrorSound();

                state = "early";

                startButton.textContent = "もう一度挑戦";

                message.textContent =
                    "フライング！合図より早く押したよ！";

                result.textContent =
                    "今回は失敗！もう一度挑戦してね。";

                return;
            }


            // 合図後のクリック
            if (state === "ready") {

                const reactionTime = Math.round(
                    performance.now() - startTime
                );

                state = "result";

                startButton.disabled = true;

                startButton.textContent = "もう一度挑戦";

                message.textContent = "成功！";

                result.textContent =
                    `反応時間：${reactionTime}ミリ秒。ランキングに保存中...`;

                playSuccessSound();

                const saved = await saveScore(
                    "reactionScores",
                    reactionTime,
                    playerName
                );

                if (saved) {

                    result.textContent =
                        `反応時間：${reactionTime}ミリ秒！スコアを保存したよ！`;

                    await loadRanking(
                        "reactionScores",
                        "reaction-ranking",
                        "asc",
                        "ミリ秒"
                    );

                } else {

                    result.textContent =
                        `反応時間：${reactionTime}ミリ秒。保存できなかったよ。`;
                }

                startButton.disabled = false;

                return;
            }
        });
    }


    // ========================================
    // ④ 数字当てゲーム
    // ========================================

    function startNumberGame() {

        clearGameTimers();

        currentGame = "number";

        const playerName = getPlayerName();

        if (!playerName) {
            showNameInput(() => startNumberGame());
            return;
        }

        let answer = Math.floor(Math.random() * 100) + 1;

        let attempts = 0;

        let finished = false;

        showScreen(gameLayout(
            "🎯 数字当てゲーム",
            "1〜100の数字を当ててみよう！",

            `
                <p>
                    入力回数：
                    <strong id="number-count">0</strong>回
                </p>

                <input id="number-input"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="数字を入力">

                <button id="number-check" class="game-action">
                    答え合わせ
                </button>

                <p id="number-message">
                    数字を入力してね！
                </p>

                <button id="number-restart" class="game-secondary">
                    新しい問題
                </button>

                <div id="number-ranking">
                    ランキングを読み込み中...
                </div>
            `
        ));

        const input =
            document.getElementById("number-input");

        const check =
            document.getElementById("number-check");

        const message =
            document.getElementById("number-message");


        loadRanking(
            "numberScores",
            "number-ranking",
            "asc",
            "回"
        );


        check.addEventListener("click", async function () {

            if (finished) return;

            playClickSound();

            const guess = Number(input.value);

            if (
                !Number.isInteger(guess) ||
                guess < 1 ||
                guess > 100
            ) {

                message.textContent =
                    "1〜100の整数を入力してね！";

                playErrorSound();

                return;
            }

            attempts++;

            document.getElementById("number-count").textContent =
                attempts;


            if (guess === answer) {

                finished = true;

                check.disabled = true;

                message.textContent =
                    `${attempts}回で正解！ランキングに保存中...`;

                playSuccessSound();

                const saved = await saveScore(
                    "numberScores",
                    attempts,
                    playerName
                );

                if (saved) {

                    message.textContent =
                        `${attempts}回で正解！スコアを保存したよ！`;

                    await loadRanking(
                        "numberScores",
                        "number-ranking",
                        "asc",
                        "回"
                    );

                } else {

                    message.textContent =
                        `${attempts}回で正解！保存できなかったよ。`;
                }

            } else if (guess < answer) {

                message.textContent =
                    "もっと大きい数字だよ！";

                playTone(350, 0.1, 0.15);

            } else {

                message.textContent =
                    "もっと小さい数字だよ！";

                playTone(350, 0.1, 0.15);
            }

            input.value = "";
        });


        document.getElementById("number-restart")
            .addEventListener("click", function () {

                playClickSound();

                startNumberGame();
            });
    }


    // ========================================
    // ゲーム選択ボタン
    // ========================================

    content.addEventListener("click", function (event) {

        const choice = event.target.closest("[data-game]");

        if (choice) {

            playClickSound();

            const games = {
                click: startClickGame,
                memory: startMemoryGame,
                reaction: startReactionGame,
                number: startNumberGame
            };

            const selectedGame = games[choice.dataset.game];

            if (!selectedGame) return;

            if (!getPlayerName()) {

                showNameInput(() => selectedGame());

            } else {

                selectedGame();
            }

            return;
        }


        if (event.target.closest(".game-back")) {

            playClickSound();

            showMenu();
        }
    });


    // ========================================
    // ゲームアイコンを押す
    // ========================================

    toggle.addEventListener("click", function () {

        prepareAudio();

        playClickSound();

        panel.hidden = false;

        toggle.setAttribute("aria-expanded", "true");

        if (!currentGame) {
            showMenu();
        }
    });


    // ========================================
    // ゲーム画面を閉じる
    // ========================================

    close.addEventListener("click", function () {

        playClickSound();

        clearGameTimers();

        panel.hidden = true;

        toggle.setAttribute("aria-expanded", "false");

        currentGame = null;
    });

});
