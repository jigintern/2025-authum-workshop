// server.js
import { serveDir } from "jsr:@std/http/file-server";

// ゲーム状態を管理するオブジェクト
let gameState = {
    previousWord: "しりとり",
    usedWords: new Set(["しりとり"]), // 使用済み単語
    score: 0,
    startTime: null,
    timeLimit: 60, // 秒
    mode: "normal", // "normal", "no-duplicate", "time-limit", "both"
    gameActive: false
};

// ランキングデータ（実際のアプリでは永続化が必要）
let rankings = [];

// localhostにDenoのHTTPサーバーを展開
Deno.serve(async (_req) => {
    // パス名を取得する
    // http://localhost:8000/hoge に接続した場合"/hoge"が取得できる
    const pathname = new URL(_req.url).pathname;
    console.log(`pathname: ${pathname}`);

    // GET /shiritori: 直前の単語を返す
    if (_req.method === "GET" && pathname === "/shiritori") {
        return new Response(JSON.stringify({
            previousWord: gameState.previousWord,
            score: gameState.score,
            timeRemaining: gameState.mode.includes("time-limit") && gameState.startTime 
                ? Math.max(0, gameState.timeLimit - Math.floor((Date.now() - gameState.startTime) / 1000))
                : null,
            gameActive: gameState.gameActive,
            mode: gameState.mode
        }), {
            headers: { "Content-Type": "application/json; charset=utf-8" }
        });
    }

    // POST /shiritori: 次の単語を受け取って保存する
    if (_req.method === "POST" && pathname === "/shiritori") {
        // リクエストのペイロードを取得
        const requestJson = await _req.json();
        // JSONの中からnextWordを取得
        const nextWord = requestJson["nextWord"];

        // 時間制限チェック
        if (gameState.mode.includes("time-limit") && gameState.startTime) {
            const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
            if (elapsed > gameState.timeLimit) {
                return new Response(
                    JSON.stringify({
                        "errorMessage": "時間切れです！",
                        "errorCode": "10003"
                    }),
                    {
                        status: 400,
                        headers: { "Content-Type": "application/json; charset=utf-8" },
                    }
                );
            }
        }

        // previousWordの末尾とnextWordの先頭が同一か確認
        if (gameState.previousWord.slice(-1) !== nextWord.slice(0, 1)) {
            return new Response(
                JSON.stringify({
                    "errorMessage": "前の単語に続いていません",
                    "errorCode": "10001"
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                }
            );
        }

        // 重複禁止モードでの重複チェック
        if (gameState.mode.includes("no-duplicate") && gameState.usedWords.has(nextWord)) {
            return new Response(
                JSON.stringify({
                    "errorMessage": "その単語は既に使用されています",
                    "errorCode": "10002"
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                }
            );
        }

        // 単語を受け入れ、状態を更新
        gameState.previousWord = nextWord;
        gameState.usedWords.add(nextWord);
        gameState.score += nextWord.length; // 文字数分スコア加算
        gameState.gameActive = true;

    }
    
    // GET Reset : ゲームをリセットする
    if (_req.method === "GET" && pathname === "/Reset"){
        gameState = {
            previousWord: "しりとり",
            usedWords: new Set(["しりとり"]),
            score: 0,
            startTime: null,
            timeLimit: 60,
            mode: "normal",
            gameActive: false
        };
        return new Response(JSON.stringify({
            previousWord: gameState.previousWord,
            score: gameState.score,
            message: "ゲームがリセットされました"
        }), {
            headers: { "Content-Type": "application/json; charset=utf-8" }
        });
    }

    // POST /mode: ゲームモードを設定
    if (_req.method === "POST" && pathname === "/mode") {
        const requestJson = await _req.json();
        const mode = requestJson["mode"];
        const timeLimit = requestJson["timeLimit"] || 60;
        
        gameState.mode = mode;
        gameState.timeLimit = timeLimit;
        
        return new Response(JSON.stringify({
            mode: gameState.mode,
            timeLimit: gameState.timeLimit,
            message: "モードが設定されました"
        }), {
            headers: { "Content-Type": "application/json; charset=utf-8" }
        });
    }

    // POST /gameOver: ゲーム終了時のスコア記録
    if (_req.method === "POST" && pathname === "/gameOver") {
        const requestJson = await _req.json();
        const playerName = requestJson["playerName"] || "匿名";
        
        // ランキングに追加
        rankings.push({
            playerName: playerName,
            score: gameState.score,
            wordsUsed: gameState.usedWords.size,
            mode: gameState.mode,
            date: new Date().toISOString()
        });
        
        // スコア順でソート（降順）
        rankings.sort((a, b) => b.score - a.score);
        
        // トップ10のみ保持
        if (rankings.length > 10) {
            rankings = rankings.slice(0, 10);
        }
        
        return new Response(JSON.stringify({
            finalScore: gameState.score,
            ranking: rankings.findIndex(r => r.playerName === playerName && r.score === gameState.score) + 1,
            message: "スコアを記録しました"
        }), {
            headers: { "Content-Type": "application/json; charset=utf-8" }
        });
    }

    // GET /ranking: ランキングを取得
    if (_req.method === "GET" && pathname === "/ranking") {
        return new Response(JSON.stringify(rankings), {
            headers: { "Content-Type": "application/json; charset=utf-8" }
        });
    }

    // ./public以下のファイルを公開
    return serveDir(
        _req,
        {
            /*
            - fsRoot: 公開するフォルダを指定
            - urlRoot: フォルダを展開するURLを指定。今回はlocalhost:8000/に直に展開する
            - enableCors: CORSの設定を付加するか
            */
            fsRoot: "./public/",
            urlRoot: "",
            enableCors: true,
        }
    );
});
