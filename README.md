# ねこ検知

Webカメラと MediaPipe Pose Landmarker を使い、頭の高さの変化から猫背を見守るWebアプリです。

## 起動

```bash
npm install
npm run dev
```

開発サーバーは `http://localhost:5187` で起動します。過去に別のPWAが使用した
`localhost:5173` の Service Worker と衝突しないよう、専用ポートに固定しています。

カメラ映像と姿勢ランドマークはブラウザ内で処理され、サーバーには送信しません。

## プロダクションビルド

```bash
npm run build
npm run preview
```

プレビューは `http://localhost:5188` で起動します。

`dist/index.html` は直接開いても画面を確認できますが、ブラウザのセキュリティ制約により
`file://` ではカメラを利用できません。カメラを使う場合は `npm run dev` または
`npm run preview` で表示される localhost のURLを開いてください。

## 判定方法

1. カメラ起動後、良い姿勢を3秒間キャリブレーション
2. 鼻のY座標を基準値として保存
3. 設定した差分以上に頭が下がった状態が一定時間続くと通知
4. 通知後は12秒間のクールダウン

カメラは顔と肩が映る距離で、横から斜め横に置くと判定しやすくなります。
