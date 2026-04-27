# Connpass Reception

connpassのイベント受付をセルフ化するための、Hono（Cloudflare Workers/Node.js）ベースのWebアプリケーションです。

## 🚀 特徴
* **高速なQR読み取り**: [qr-scanner](https://github.com/nimiq/qr-scanner) を採用し、ブラウザ上での爆速なデコードを実現。
* **エッジ対応**: [Hono](https://hono.dev/) フレームワークにより、Cloudflare Workers 等の低レイテンシ環境で動作。
* **セッションプロキシ**: 管理者ログイン済みのCookieをサーバー側で保持し、参加者の代わりに受付URLへアクセス。

## 🛠 技術スタック
* **Framework**: [Hono](https://hono.dev/)
* **Frontend Library**: [qr-scanner](https://github.com/nimiq/qr-scanner) (Worker版)
* **Runtime**: Cloudflare Workers / Node.js / Bun

## 📋 受付フロー

1.  **管理者ログイン**:
    サーバーのブラウザに、connpassの管理者アカウントでログインする。
2.  **QRスキャン (Client)**:
    `qr-scanner` を用いて、参加者が提示した `https://connpass.com/checkin/code/...` を読み取る。
3.  **プロキシ実行 (Server)**:
    読み取ったURLをエンドポイント `POST /api/checkin` へ送信。サーバーサイドがそのURLでブラウザを開き、受付を行う。
4.  **結果判定**:
    connpassからのレスポンスを解析し、成功（200 OK または すでに受付済み）をクライアントに返す。

## 💻 セットアップ

### 1. 依存関係のインストール
```bash
bun install
```

### 2. 起動
```bash
bun run dev
```


## ⚠️ 注意点
* **セキュリティ**: `qr-scanner` で読み取ったURLが `https://connpass.com/` で始まっているか、正規表現等で厳密にバリデーションしてください。
* **UI/UX**: `qr-scanner` の `highlightScanRegion` オプションを有効にすると、読み取り範囲が可視化され、ユーザーが迷わなくなります。
* **セッション維持**: Connpassのセッション有効期限に注意し、定期的にCookieを更新する運用を検討してください。
