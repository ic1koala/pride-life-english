# 動作検証環境の構築メモ: Render と Netlify の比較 & デプロイ手順

本プロジェクト「SO ENGLISH! (Pride Life English)」の動作検証用として、本環境をクラウド上にデプロイ・公開するための比較メモおよび手順書です。

---

## 📊 Render と Netlify の比較

本アプリは、**React（フロントエンド）と Express（バックエンドサーバー）が密結合したフルスタック構成**であり、データベース（TiDB Cloud）と常時通信を行います。これを踏まえた各プラットフォームの特性比較です。

| 比較項目 | **Render (採用・推奨)** | **Netlify** |
| :--- | :--- | :--- |
| **主な用途** | 常時起動サーバー、フルスタック、DB | 静的サイト（React単体、HTMLなど）、サーバーレス |
| **Expressサーバーの起動**| **〇 可能**（`node dist/index.js` が常時起動） | **× 不可**（常時起動するサーバーは置けません） |
| **データベース接続** | **〇 容易**（Express経由でTiDBへ直接常時接続） | **△ 制限あり**（サーバーレス関数経由のみ） |
| **構築難易度（今回）** | **★☆☆（非常に簡単）**<br>コードの書き換えが一切不要でそのまま動きます。 | **★★★（困難・コード書き換え必須）**<br>Expressを「サーバーレス関数」に分解する必要があります。 |
| **無料枠** | **〇 あり**（Webサービス・静的サイトが無料） | **〇 あり**（静的サイトホスティングが非常に強力） |

### 💡 結論
Netlifyは静的サイトホスティングとしては非常に優秀ですが、常時起動サーバーをサポートしていません。データベース連携、ユーザー認証、Q&A投稿といったバックエンド機能を有する本システムを一切のコード修正なしでデプロイするためには、**常時起動サーバーをサポートする Render が最適**です。

---

## 🚀 Render でのデプロイ設定手順

### 1. サインアップ
1. [Render.com](https://render.com/) にアクセスし、**「Sign Up」** をクリックします。
2. **「Sign up with GitHub（GitHubで登録）」** を選択して、GitHubアカウントでログインします。これにより、先ほどプッシュしたリポジトリに自動でアクセスできるようになります。

### 2. Web Service の作成
1. ダッシュボードの右上にある **「New +」** ボタンをクリック ＞ **「Web Service」** を選択します。
2. リポジトリ一覧から **`pride-life-english`** を選択し、**「Connect」** をクリックします。

### 3. 基本情報の設定
以下の通り、設定パラメータを入力します。

*   **Name**: `so-english` (任意。公開URLのプレフィックスになります)
*   **Region**: `Singapore` (アジア圏に近く最速)
*   **Branch**: `main`
*   **Root Directory**: (空欄 / デフォルトのままでOK) 💡 **（※コード構成の整理により、設定不要となりました）**
*   **Runtime**: `Node`
*   **Build Command**: `npm install && npm run build`
*   **Start Command**: `node dist/index.js`

### 4. 環境変数（Environment Variables）の設定
画面下部の **「Advanced」** をクリックし、**「Add Environment Variable」** で以下の環境変数をすべて正確に追加します。これらは `.project-config.json` にて定義されている秘匿接続値と同等です。

| Key | Value |
| :--- | :--- |
| **`NODE_ENV`** | `production` |
| **`DATABASE_URL`** | `mysql://3He9Kr6rE3YXuJN.root:jMbUqDSX0n4213Aq2JYl@gateway06.us-east-1.prod.aws.tidbcloud.com:4000/BVjbDoYv3dVNtWtmbAeKMV?ssl={\"rejectUnauthorized\":true}` |
| **`DRIZZLE_DATABASE_URL`** | `mysql://3He9Kr6rE3YXuJN.root:jMbUqDSX0n4213Aq2JYl@gateway06.us-east-1.prod.aws.tidbcloud.com:4000/BVjbDoYv3dVNtWtmbAeKMV?ssl={\"rejectUnauthorized\":true}` |
| **`JWT_SECRET`** | `QhX8r6ahPtPYRzScHFBE3a` |
| **`STRIPE_SECRET_KEY`** | `sk_test_51TM6ZlBcr6ykdroKsMtXI7dQX0hbPkJkPRVZz0QKdBbjeA2XMWVEbHOWraOFhCno376pWKBfPJd16ZjiFoimYXGE00alBOsXsL` |
| **`STRIPE_WEBHOOK_SECRET`** | `whsec_tAyK3DXz8PplKCoVg8C3mCvmnlvBAGTu` |

### 5. デプロイの実行
最下部の **「Create Web Service」** をクリックします。自動でビルドおよび公開環境への接続が開始されます。
