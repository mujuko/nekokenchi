# ねこ検知

Webカメラと MediaPipe Pose Landmarker を使い、頭の高さの変化から猫背を見守るWebアプリです。

## 起動

```bash
npm install
npm run dev
```

開発サーバーは `http://localhost:5187` で起動します。

別端末やスマホからLAN経由でカメラを使う場合は、HTTPSで起動してください。初回だけ
`mkcert` が必要です。

```bash
brew install mkcert
mkcert -install
npm run dev:https
```

起動ログに表示される `https://<IPアドレス>:5187` を端末側のブラウザで開きます。
IPアドレスが変わった場合は、次回起動時に `.cert` の開発用証明書を作り直します。

カメラ映像と姿勢ランドマークは端末内で処理され、サーバーには送信しません。

## ライセンス

このプロジェクト本体は MIT License です。

同梱している MediaPipe Tasks Vision の WASM ファイルと Pose Landmarker Lite モデルは
Apache License 2.0 で提供されています。第三者ライセンス表記は
`public/THIRD_PARTY_NOTICES.txt` を参照してください。

同梱している通知音の一部は [ポケットサウンド](https://pocket-se.info/) の効果音素材です。
利用規約に基づき、アプリ内と第三者ライセンス表記にクレジットリンクを掲載しています。

## プロダクションビルド

```bash
npm run build
npm run preview
```

プレビューは `http://localhost:5188` で起動します。

LAN経由でプレビューする場合は `npm run preview:https` を使ってください。

`dist/index.html` は直接開いても画面を確認できますが、ブラウザのセキュリティ制約により
`file://` ではカメラを利用できません。カメラを使う場合は `npm run dev` または
`npm run preview` で表示される localhost のURLを開いてください。

## デプロイとリリース

Cloudflare Pages / Workers で公開する前提です。

prod のデプロイコマンドは、タグが付いたコミットだけをアップロードするために
`npm run deploy:tagged` を使います。タグが付いていない HEAD では正常終了し、
デプロイはスキップされます。

```bash
npm run deploy:tagged
```

dev 環境は、通常の Wrangler upload のままにしておけば、タグなしコミットも
都度デプロイされます。

```bash
npx wrangler versions upload
```

バージョン番号は Git タグから取得して画面上部に表示します。リリースは main に
マージした後、main 上で `npm version` を使って package.json / package-lock.json
と Git タグをまとめて更新します。

```bash
git switch main
git pull --ff-only origin main
npm version patch
git push origin main --follow-tags
```

`minor` や `major` を切る場合は `npm version minor` / `npm version major` を使います。
タグなしの main HEAD は prod にはデプロイされないため、リリース時は必ず
`npm version` 後のタグ付きコミットを push してください。

## 判定方法

1. カメラ起動後、良い姿勢の頭の高さを3秒間キャリブレーション
2. 続けて猫背の頭の高さを3秒間キャリブレーション
3. 現在の鼻のY座標が猫背側にどれくらい近づいたかをスコア化
4. 設定した感度以上に猫背へ近づいた状態が一定時間続くと通知
5. 通知後は12秒間のクールダウン

カメラは顔と肩が正面から映る距離で、目線に近い高さに置くと判定しやすくなります。
極端な見下ろしや見上げの画角は避けてください。
