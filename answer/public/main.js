// ゲーム状態管理
let gameState = {
    isPlaying: false,
    currentMode: "normal",
    timerInterval: null
};

// DOM要素の取得
const elements = {
    // 設定エリア
    gameSettings: document.querySelector("#gameSettings"),
    gameModeInputs: document.querySelectorAll("input[name='gameMode']"),
    timeLimitInput: document.querySelector("#timeLimit"),
    startGameButton: document.querySelector("#startGameButton"),
    
    // ゲーム情報
    score: document.querySelector("#score"),
    usedWordsCount: document.querySelector("#usedWordsCount"),
    timer: document.querySelector("#timer"),
    currentMode: document.querySelector("#currentMode"),
    
    // ゲームプレイ
    gameArea: document.querySelector("#gameArea"),
    previousWord: document.querySelector("#previousWord"),
    nextWordInput: document.querySelector("#nextWordInput"),
    nextWordSendButton: document.querySelector("#nextWordSendButton"),
    resetButton: document.querySelector("#resetButton"),
    
    // ランキング
    showRankingButton: document.querySelector("#showRankingButton"),
    rankingList: document.querySelector("#rankingList"),
    
    // ダイアログ
    gameOverDialog: document.querySelector("#gameOverDialog"),
    gameOverMessage: document.querySelector("#gameOverMessage"),
    finalScoreDisplay: document.querySelector("#finalScoreDisplay"),
    playerNameInput: document.querySelector("#playerNameInput"),
    saveScoreButton: document.querySelector("#saveScoreButton"),
    newGameButton: document.querySelector("#newGameButton")
};

// 初期化
window.onload = async () => {
    await updateGameDisplay();
    setupEventListeners();
};

// イベントリスナーの設定
function setupEventListeners() {
    // ゲーム開始ボタン
    elements.startGameButton.onclick = startGame;
    
    // 単語送信ボタン
    elements.nextWordSendButton.onclick = submitWord;
    
    // Enterキーで送信
    elements.nextWordInput.onkeypress = (e) => {
        if (e.key === "Enter") {
            submitWord();
        }
    };
    
    // リセットボタン
    elements.resetButton.onclick = resetGame;
    
    // ランキング表示ボタン
    elements.showRankingButton.onclick = showRanking;
    
    // ダイアログボタン
    elements.saveScoreButton.onclick = saveScore;
    elements.newGameButton.onclick = () => {
        hideGameOverDialog();
        resetGame();
    };
    
    // ゲームモード変更時の表示更新
    elements.gameModeInputs.forEach(input => {
        input.onchange = updateModeDisplay;
    });
}

// ゲーム開始
async function startGame() {
    const selectedMode = document.querySelector("input[name='gameMode']:checked").value;
    const timeLimit = parseInt(elements.timeLimitInput.value);
    
    // モード設定をサーバーに送信
    try {
        const response = await fetch("/mode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                mode: selectedMode,
                timeLimit: timeLimit
            })
        });
        
        if (response.ok) {
            gameState.isPlaying = true;
            gameState.currentMode = selectedMode;
            elements.gameSettings.style.display = "none";
            await updateGameDisplay();
            startTimer();
        }
    } catch (error) {
        console.error("ゲーム開始エラー:", error);
        alert("ゲームの開始に失敗しました");
    }
}

// 単語送信
async function submitWord() {
    if (!gameState.isPlaying) return;
    
    const nextWord = elements.nextWordInput.value.trim();
    if (!nextWord) {
        alert("単語を入力してください");
        return;
    }
    
    // 「ん」で終わるかチェック
    if (nextWord.endsWith('ん')) {
        endGame('ゲームオーバー！「ん」で終わる単語を入力しました。');
        return;
    }
    
    try {
        const response = await fetch("/shiritori", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nextWord: nextWord })
        });
        
        if (response.ok) {
            const data = await response.json();
            updateGameInfo(data);
            elements.nextWordInput.value = "";
            elements.nextWordInput.focus();
        } else {
            const errorData = await response.json();
            
            // エラーコードに応じてゲーム終了判定
            if (errorData.errorCode === "10003") { // 時間切れ
                endGame("時間切れです！");
            } else {
                alert(errorData.errorMessage);
            }
        }
    } catch (error) {
        console.error("単語送信エラー:", error);
        alert("通信エラーが発生しました");
    }
}

// ゲームリセット
async function resetGame() {
    try {
        const response = await fetch("/Reset", { method: "GET" });
        if (response.ok) {
            gameState.isPlaying = false;
            stopTimer();
            elements.gameSettings.style.display = "block";
            elements.nextWordInput.value = "";
            await updateGameDisplay();
        }
    } catch (error) {
        console.error("リセットエラー:", error);
    }
}

// ゲーム終了
async function endGame(message) {
    gameState.isPlaying = false;
    stopTimer();
    
    elements.gameOverMessage.textContent = message;
    
    // 最終スコアを表示
    try {
        const response = await fetch("/shiritori", { method: "GET" });
        if (response.ok) {
            const data = await response.json();
            elements.finalScoreDisplay.textContent = `最終スコア: ${data.score}点`;
        }
    } catch (error) {
        console.error("スコア取得エラー:", error);
    }
    
    showGameOverDialog();
}

// ゲーム表示更新
async function updateGameDisplay() {
    try {
        const response = await fetch("/shiritori", { method: "GET" });
        if (response.ok) {
            const data = await response.json();
            updateGameInfo(data);
        }
    } catch (error) {
        console.error("表示更新エラー:", error);
    }
}

// ゲーム情報更新
function updateGameInfo(data) {
    elements.previousWord.textContent = `前の単語: ${data.previousWord}`;
    elements.score.textContent = `スコア: ${data.score}`;
    
    if (data.usedWordsCount !== undefined) {
        elements.usedWordsCount.textContent = `使用単語数: ${data.usedWordsCount}`;
    }
    
    // モード表示更新
    updateModeDisplay();
}

// モード表示更新
function updateModeDisplay() {
    const selectedMode = document.querySelector("input[name='gameMode']:checked").value;
    const modeNames = {
        "normal": "ノーマル",
        "no-duplicate": "重複禁止",
        "time-limit": "制限時間",
        "both": "縛りプレイ"
    };
    elements.currentMode.textContent = `モード: ${modeNames[selectedMode]}`;
}

// ランキング表示
async function showRanking() {
    try {
        const response = await fetch("/ranking", { method: "GET" });
        if (response.ok) {
            const rankings = await response.json();
            displayRanking(rankings);
        }
    } catch (error) {
        console.error("ランキング取得エラー:", error);
        alert("ランキングの取得に失敗しました");
    }
}

// ランキング表示更新
function displayRanking(rankings) {
    if (rankings.length === 0) {
        elements.rankingList.innerHTML = "<p>まだランキングデータがありません</p>";
        return;
    }
    
    const rankingHTML = rankings.map((entry, index) => {
        const modeNames = {
            "normal": "ノーマル",
            "no-duplicate": "重複禁止",
            "time-limit": "制限時間",
            "both": "縛りプレイ"
        };
        
        return `
            <div class="ranking-item">
                <div class="ranking-rank">${index + 1}</div>
                <div class="ranking-name">${entry.playerName}</div>
                <div class="ranking-details">
                    ${entry.score}点<br>
                    ${entry.wordsUsed}語 (${modeNames[entry.mode]})
                </div>
            </div>
        `;
    }).join("");
    
    elements.rankingList.innerHTML = rankingHTML;
}

// スコア保存
async function saveScore() {
    const playerName = elements.playerNameInput.value.trim() || "匿名";
    
    try {
        const response = await fetch("/gameOver", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerName: playerName })
        });
        
        if (response.ok) {
            const data = await response.json();
            alert(`スコアを保存しました！順位: ${data.ranking}位`);
            hideGameOverDialog();
            await showRanking(); // ランキングを更新表示
        }
    } catch (error) {
        console.error("スコア保存エラー:", error);
        alert("スコアの保存に失敗しました");
    }
}

// ゲーム終了ダイアログ表示
function showGameOverDialog() {
    elements.gameOverDialog.style.display = "flex";
    elements.playerNameInput.value = "";
    elements.playerNameInput.focus();
}

// ゲーム終了ダイアログ非表示
function hideGameOverDialog() {
    elements.gameOverDialog.style.display = "none";
}