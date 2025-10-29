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

    // 同一単語禁止モード管理
    let isUniqueWordMode = false;
    let usedWords = new Set(); // 使用済み単語を記録

    // スコア表示を更新する関数
    function updateScore() {
      const scoreDisplay = document.querySelector("#scoreDisplay");
      scoreDisplay.innerHTML = `スコア: ${wordCount}単語`;
    }

    // ゲームタイプを取得する関数
    function getGameType() {
      if (isTimerMode && isUniqueWordMode) {
        return "timer_unique";
      } else if (isTimerMode) {
        return "timer";
      } else if (isUniqueWordMode) {
        return "unique";
      } else {
        return "normal";
      }
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
      const gameType = getGameType();
      await sendScoreToServer(wordCount, gameType);
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
        
        // ゲームタイプの表示テキストを決定
        let gameTypeText = " [通常]";
        switch (ranking.gameType) {
          case "timer":
            gameTypeText = " [タイマー]";
            break;
          case "unique":
            gameTypeText = " [重複禁止]";
            break;
          case "timer_unique":
            gameTypeText = " [タイマー＋重複禁止]";
            break;
          default:
            gameTypeText = " [通常]";
        }
        
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
      
      // 同一単語禁止モードをリセット
      isUniqueWordMode = false;
      usedWords.clear();
      
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
      
      // 同一単語禁止モードでの重複チェック
      if (isUniqueWordMode && usedWords.has(nextWordInputText)) {
        alert(`この単語「${nextWordInputText}」は既に使用されています。\n別の単語を入力してください。`);
        return;
      }
      
      // 入力された単語が'ん'で終わっているかチェック
      if (nextWordInputText.endsWith('ん')) {
        // ゲームオーバー時にスコアをサーバーに送信
        const gameType = getGameType();
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

      // 同一単語禁止モードの場合、使用済み単語に追加
      if (isUniqueWordMode) {
        usedWords.add(nextWordInputText);
      }

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
      
      // 同一単語禁止モードのチェック状態を取得
      const uniqueWordModeCheckbox = document.querySelector("#uniqueWordModeCheckbox");
      isUniqueWordMode = uniqueWordModeCheckbox.checked;
      
      // 同一単語禁止モードの場合、初期単語「しりとり」を使用済みに追加
      if (isUniqueWordMode) {
        usedWords.add("しりとり");
      }
      
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
      }
      
      // 開始メッセージを表示
      let message = 'ゲームを開始します！';
      if (isTimerMode && isUniqueWordMode) {
        message = `タイマー＋同一単語禁止モードでゲームを開始します！\n制限時間: ${TIMER_DURATION}秒`;
      } else if (isTimerMode) {
        message = `タイマーモードでゲームを開始します！\n制限時間: ${TIMER_DURATION}秒`;
      } else if (isUniqueWordMode) {
        message = '同一単語禁止モードでゲームを開始します！';
      }
      alert(message);
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