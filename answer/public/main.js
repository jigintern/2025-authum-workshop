 window.onload = async (event) => {
      // GET /shiritoriを実行
      const response = await fetch("/shiritori", { method: "GET" });
      // responseの中からレスポンスのテキストデータを取得
      const previousWord = await response.text();
      // id: previousWordのタグを取得
      const paragraph = document.querySelector("#previousWord");
      // 取得したタグの中身を書き換える
      paragraph.innerHTML = `前の単語: ${previousWord}`;
      
      // 初期状態ではゲームエリアを非表示にする
      const gameArea = document.querySelector("#gameArea");
      gameArea.style.display = "none";
      
      // タイマー表示を初期化
      const timerDisplay = document.querySelector("#timerDisplay");
      timerDisplay.innerHTML = `残り時間: ${TIMER_DURATION}秒`;
      
      // チェックボックスのラベルを動的に更新
      const timerModeLabel = document.querySelector("label");
      timerModeLabel.innerHTML = `<input type="checkbox" id="timerModeCheckbox"> タイマーモード（${TIMER_DURATION}秒）`;
      
      // ランキングを読み込む
      await loadRanking();
    }

    // グローバル設定
    const TIMER_DURATION = 60; // タイマーの秒数（調整可能）

    // スコア管理
    let wordCount = 0;

    // タイマー管理
    let timerInterval = null;
    let remainingTime = TIMER_DURATION;
    let isTimerMode = false;

    // スコア表示を更新する関数
    function updateScore() {
      const scoreDisplay = document.querySelector("#scoreDisplay");
      scoreDisplay.innerHTML = `スコア: ${wordCount}単語`;
    }

    // タイマー表示を更新する関数
    function updateTimer() {
      const timerDisplay = document.querySelector("#timerDisplay");
      timerDisplay.innerHTML = `残り時間: ${remainingTime}秒`;
    }

    // タイマーを開始する関数
    function startTimer() {
      const timerDisplay = document.querySelector("#timerDisplay");
      timerDisplay.style.display = "block";
      
      timerInterval = setInterval(() => {
        remainingTime--;
        updateTimer();
        
        if (remainingTime <= 0) {
          // 時間切れ
          clearInterval(timerInterval);
          handleTimeUp();
        }
      }, 1000);
    }

    // タイマーを停止する関数
    function stopTimer() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      const timerDisplay = document.querySelector("#timerDisplay");
      timerDisplay.style.display = "none";
    }

    // 時間切れの処理
    async function handleTimeUp() {
      // ゲームオーバー時にスコアをサーバーに送信
      await sendScoreToServer(wordCount, "timer");
      alert(`時間切れ！\n最終スコア: ${wordCount}単語`);
      // ゲームをリセット
      await resetGame();
    }

    // サーバーにスコアを送信する関数
    async function sendScoreToServer(score, gameType = "normal") {
      try {
        const response = await fetch("/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            score: score,
            timestamp: new Date().toISOString(),
            gameType: gameType
          })
        });

        if (response.status === 200) {
          console.log("スコアが正常に送信されました");
          // スコア送信後にランキングを更新
          await loadRanking();
        } else {
          console.log("スコア送信に失敗しました");
        }
      } catch (error) {
        console.error("スコア送信エラー:", error);
      }
    }

    // ランキングをサーバーから取得する関数
    async function loadRanking() {
      try {
        const response = await fetch("/ranking", { method: "GET" });
        if (response.status === 200) {
          const rankings = await response.json();
          displayRanking(rankings);
        } else {
          console.log("ランキング取得に失敗しました");
        }
      } catch (error) {
        console.error("ランキング取得エラー:", error);
      }
    }

    // ランキングを表示する関数
    function displayRanking(rankings) {
      const rankingList = document.querySelector("#rankingList");
      
      if (rankings.length === 0) {
        rankingList.innerHTML = "<li>まだランキングデータがありません</li>";
        return;
      }

      rankingList.innerHTML = "";
      rankings.forEach((ranking, index) => {
        const listItem = document.createElement("li");
        const date = new Date(ranking.timestamp).toLocaleDateString();
        const time = new Date(ranking.timestamp).toLocaleTimeString();
        const gameTypeText = ranking.gameType === "timer" ? " [タイマー]" : " [通常]";
        
        listItem.innerHTML = `
          <strong>${ranking.score}単語</strong>${gameTypeText}
          <small>(${date} ${time})</small>
        `;
        
        // 1位には特別なクラスを追加（CSSで装飾可能）
        if (index === 0) {
          listItem.classList.add("first-place");
        }
        
        rankingList.appendChild(listItem);
      });
    }

    // ゲームリセット関数
    async function resetGame() {
      // サーバーサイドのゲーム状態をリセット（初期化）
      const response = await fetch("/Reset", { method: "GET" });
      const previousWord = await response.text();
      
      // 画面の表示をリセット
      const paragraph = document.querySelector("#previousWord");
      paragraph.innerHTML = `前の単語: ${previousWord}`;
      
      // 入力フィールドをクリア
      const nextWordInput = document.querySelector("#nextWordInput");
      nextWordInput.value = "";
      
      // スコアをリセット
      wordCount = 0;
      updateScore();
      
      // タイマーをリセット
      stopTimer();
      remainingTime = TIMER_DURATION;
      isTimerMode = false;
      
      // ゲームエリアを非表示にする
      const gameArea = document.querySelector("#gameArea");
      gameArea.style.display = "none";
    }

    // 送信ボタンの押下時に実行
    document.querySelector("#nextWordSendButton").onclick = async (event) => {
      // inputタグを取得
      const nextWordInput = document.querySelector("#nextWordInput");
      // inputの中身を取得
      const nextWordInputText = nextWordInput.value;
      
      // 入力された単語が'ん'で終わっているかチェック
      if (nextWordInputText.endsWith('ん')) {
        // ゲームオーバー時にスコアをサーバーに送信
        const gameType = isTimerMode ? "timer" : "normal";
        await sendScoreToServer(wordCount, gameType);
        alert(`ゲームオーバー！「ん」で終わる単語を入力しました。\n最終スコア: ${wordCount}単語`);
        // ゲームをリセット
        await resetGame();
        return;
      }
      
      // POST /shiritoriを実行
      // 次の単語をresponseに格納
      const response = await fetch(
        "/shiritori",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nextWord: nextWordInputText })
        }
      );

      // status: 200以外が返ってきた場合にエラーを表示
      if (response.status !== 200) {
        const errorJson = await response.text();
        const errorObj = JSON.parse(errorJson);
        alert(errorObj["errorMessage"]);
        return;
      }

      const previousWord = await response.text();

      // スコアを増加
      wordCount++;
      updateScore();

      // id: previousWordのタグを取得
      const paragraph = document.querySelector("#previousWord");
      // 取得したタグの中身を書き換える
      paragraph.innerHTML = `前の単語: ${previousWord}`;
      // inputタグの中身を消去する
      nextWordInput.value = "";
    }

    // ゲームスタートボタンの押下時に実行
    document.querySelector("#startGameButton").onclick = async (event) => {
      await resetGame();
      
      // タイマーモードのチェック状態を取得
      const timerModeCheckbox = document.querySelector("#timerModeCheckbox");
      isTimerMode = timerModeCheckbox.checked;
      
      // ゲームエリアを表示する
      const gameArea = document.querySelector("#gameArea");
      gameArea.style.display = "block";
      
      // スコア表示を更新
      updateScore();
      
      // タイマーモードの場合はタイマーを開始
      if (isTimerMode) {
        remainingTime = TIMER_DURATION;
        updateTimer();
        startTimer();
        alert(`タイマーモードでゲームを開始します！\n制限時間: ${TIMER_DURATION}秒`);
      } else {
        alert('ゲームを開始します！');
      }
    }

    // リセットボタンの押下時に実行
    document.querySelector("#resetGameButton").onclick = async (event) => {
      await resetGame();
      alert('ゲームをリセットしました。');
    }

    // ランキング更新ボタンの押下時に実行
    document.querySelector("#refreshRankingButton").onclick = async (event) => {
      await loadRanking();
    }