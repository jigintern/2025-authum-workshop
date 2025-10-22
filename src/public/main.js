 window.onload = async (event) => {
      // GET /shiritoriを実行
      const response = await fetch("/shiritori", { method: "GET" });
      // responseの中からレスポンスのテキストデータを取得
      const previousWord = await response.text();
      // id: previousWordのタグを取得
      const paragraph = document.querySelector("#previousWord");
      // 取得したタグの中身を書き換える
      paragraph.innerHTML = `前の単語: ${previousWord}`;
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
    }

    // 送信ボタンの押下時に実行
    document.querySelector("#nextWordSendButton").onclick = async (event) => {
      // inputタグを取得
      const nextWordInput = document.querySelector("#nextWordInput");
      // inputの中身を取得
      const nextWordInputText = nextWordInput.value;
      
      // 入力された単語が'ん'で終わっているかチェック
      if (nextWordInputText.endsWith('ん')) {
        alert('ゲームオーバー！「ん」で終わる単語を入力しました。');
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

      // id: previousWordのタグを取得
      const paragraph = document.querySelector("#previousWord");
      // 取得したタグの中身を書き換える
      paragraph.innerHTML = `前の単語: ${previousWord}`;
      // inputタグの中身を消去する
      nextWordInput.value = "";
    }