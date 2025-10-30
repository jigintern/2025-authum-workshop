// server.js
import { serveDir } from "jsr:@std/http/file-server";

// 直前の単語を保持しておく
let previousWord = "しりとり";

// ランキングデータを保存する配列
let rankings = [];

// localhostにDenoのHTTPサーバーを展開
Deno.serve(async (_req) => {
    // パス名を取得する
    // http://localhost:8000/hoge に接続した場合"/hoge"が取得できる
    const pathname = new URL(_req.url).pathname;
    console.log(`pathname: ${pathname}`);

    // GET /shiritori: 直前の単語を返す
    if (_req.method === "GET" && pathname === "/shiritori") {
        return new Response(previousWord);
    }

    // POST /shiritori: 次の単語を受け取って保存する
    if (_req.method === "POST" && pathname === "/shiritori") {
        // リクエストのペイロードを取得
        const requestJson = await _req.json();
        // JSONの中からnextWordを取得
        const nextWord = requestJson["nextWord"].trim();

        // previousWordの末尾文字を取得（「ー」の場合は前の文字を参照）
        function getLastChar(word) {
            if (word.length === 0) return "";
            
            let lastChar = word.slice(-1);
            let index = word.length - 1;
            
            // 末尾が「ー」の場合、前の文字を探す
            while (lastChar === "ー" && index > 0) {
                index--;
                lastChar = word.slice(index, index + 1);
            }
            
            return lastChar;
        }

        // previousWordの末尾とnextWordの先頭が同一か確認
        const lastCharOfPrevious = getLastChar(previousWord);
        const firstCharOfNext = nextWord.slice(0, 1);
        
        if (lastCharOfPrevious === firstCharOfNext) {
            // 同一であれば、previousWordを更新
            previousWord = nextWord;
        }
        // 同一でない単語の入力時に、エラーを返す
        else {
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

        // 現在の単語を返す
        return new Response(previousWord);
    }
    
    // GET Reset : ゲームをリセットする
    if (_req.method === "GET" && pathname === "/Reset"){
        previousWord = "しりとり";
        return new Response(previousWord);
    }

    // POST /score : スコアを受信して保存する
    if (_req.method === "POST" && pathname === "/score") {
        try {
            // リクエストのペイロードを取得
            const requestJson = await _req.json();
            const score = requestJson["score"];
            const timestamp = requestJson["timestamp"];
            const gameType = requestJson["gameType"];

            // スコアをログに出力（実際のアプリではデータベースに保存するなど）
            console.log(`新しいスコアを受信: ${score}単語 (${timestamp}, ${gameType})`);

            // ランキングデータに追加
            rankings.push({
                score: score,
                timestamp: timestamp,
                gameType: gameType,
                id: Date.now() // 簡易的なID
            });

            // スコア降順でソートし、上位10件のみ保持
            rankings.sort((a, b) => b.score - a.score);
            rankings = rankings.slice(0, 10);

            // 成功レスポンスを返す
            return new Response(
                JSON.stringify({
                    "message": "スコアが正常に保存されました",
                    "score": score,
                    "timestamp": timestamp
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                }
            );
        } catch (error) {
            // エラーレスポンスを返す
            return new Response(
                JSON.stringify({
                    "errorMessage": "スコアの保存に失敗しました",
                    "errorCode": "20001"
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                }
            );
        }
    }

    // GET /ranking : ランキングデータを取得する
    if (_req.method === "GET" && pathname === "/ranking") {
        return new Response(
            JSON.stringify(rankings),
            {
                status: 200,
                headers: { "Content-Type": "application/json; charset=utf-8" },
            }
        );
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
