# Weather Catan (Weathering)

OpenWeatherMap APIを利用した、実際の天候データがゲームプレイに影響を与えるCatan風ボードゲームです。

## プロジェクト概要
- **Backend**: PHP (Vanilla) + SQLite
    - APIエンドポイントの提供
    - ゲーム状態の管理
    - 天候データの取得とバフ/デバフの計算
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
    - ゲームボードの描画
    - ユーザーアクションの受付 (ダイスロール、建設など)

## セットアップ手順

### 前提条件
- XAMPP (または PHP と Webサーバー環境)
- Node.js (Frontend用)

### Backend (XAMPP root: `c:\xampp\htdocs\weathering`)
1. `.env` ファイルの設定
    - `backend/.env` に OpenWeatherMap APIキーを設定してください。
    - `DB_DATABASE` のパスなどの設定を確認してください。
2. データベースのマイグレーション
    ```bash
    php backend/scripts/migrate.php
    ```
    これにより `backend/database.sqlite` が作成されます。

### Frontend (`frontend` ディレクトリ)
1. 依存関係のインストール
    ```bash
    cd frontend
    npm install
    ```
2. 開発サーバーの起動
    ```bash
    npm run dev
    ```
    Local: http://localhost:5173 等でアクセス可能になります。

## 主な機能 (実装済み)
- **ゲーム作成**: 新しいゲームセッションを作成し、初期盤面を生成します。
- **天候連動**: 設定された都市のリアルタイム天候を取得し、資源生産にバフ/デバフを与えます (例: 雨なら木材生産量UPなど)。
- **ダイスロール**: ダイスを振って資源を獲得します。
- **ターン進行**: ターン終了機能。

## 今後の実装予定
- 建設機能 (道、開拓地、都市)
- 勝利条件の判定
- 複数プレイヤー対応 (ホットシートまたはオンライン)
