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

Cloudflare Workers の `dev` / `production` 環境に静的アセットを配る前提です。
要件を満たすため、公開先とトリガーを次のように分けます。

| 環境 | Worker | デプロイトリガー | 公開範囲 |
| --- | --- | --- | --- |
| 開発環境 | `nekokenchi-dev` | `main` ブランチへの push | Cloudflare Access で認証を必須化 |
| 本番環境 | `nekokenchi` | `v*` タグへの push | 誰でもアクセス可能 |

GitHub Actions は `main` に入ったコミットをすべて開発環境へリアルタイムにデプロイし、
`v*` タグが付いたコミットだけを本番環境へデプロイします。
GitHub Secrets には `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を設定してください。

開発環境だけ認証を掛けるため、Cloudflare Zero Trust の Access Application を
`nekokenchi-dev` 用ホスト名に作成します。例として、対象ドメインを
`dev.nekokenchi.example.com` または `nekokenchi-dev.<subdomain>.workers.dev` にし、
許可するユーザー・メールドメイン・IdP グループだけを Allow ポリシーに登録します。
本番環境の `nekokenchi` 用ホスト名には Access Application を作らない、または既存ポリシーを
紐づけないことで誰でも使える状態にします。

手動で開発環境へ配る場合は、ビルド後に `deploy:dev` を実行します。
`wrangler versions upload` はバージョンを作るだけで、そのバージョンを配信中のデプロイにはしないため、
開発環境・本番環境とも実際に公開するコマンドは `wrangler deploy` を使います。

```bash
npm run build
npm run deploy:dev
```

本番環境へ手動で配る場合は、タグが付いたコミットだけを即時デプロイする
`deploy:prod` を使います。タグが付いていない HEAD では正常終了し、デプロイはスキップされます。

```bash
npm run build
npm run deploy:prod
```

バージョン番号は Git タグから取得して画面上部に表示します。main ブランチを PR 経由でしか
更新できない場合も、ブランチ保護は外さず、バージョン更新とタグ作成を分けます。

1. リリース用 PR で `npm version --no-git-tag-version` を使い、`package.json` と
   `package-lock.json` だけを更新します。
2. PR を main にマージします。この時点ではタグなしコミットなので、開発環境だけに配られます。
3. main のマージ後コミットに、`package.json` のバージョンと一致する `v*` タグを作成して push します。
   タグ push により本番環境へ配られます。

一連の手順を自動実行するコマンド：
```bash
npm run pre-release
```

`minor` / `major` の場合は引数で指定します。ブランチ名とコミットメッセージは
更新後のバージョン番号から自動で `release/v1.0.2` / `chore: release v1.0.2` のように作られます。

```bash
npm run pre-release -- minor
npm run pre-release -- major
```

実行前に予定されるバージョンとブランチ名だけ確認したい場合は dry run できます。

```bash
npm run pre-release -- --dry-run
```

手動で実行する場合：
```bash
git switch -c release/v1.0.2 origin/main
npm version patch --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: release v1.0.2"
git push origin release/v1.0.2
```

PR マージ後、main の最新コミットにタグを付けます。

```bash
git switch main
git pull --ff-only origin main
git tag v1.0.2
git push origin v1.0.2
```

`minor` や `major` を切る場合は `npm version minor --no-git-tag-version` /
`npm version major --no-git-tag-version` を使います。`deploy:prod` は
`package.json` の `version` と一致する `v*` タグが HEAD にある場合だけ本番環境へデプロイします。
そのため、タグ名と `package.json` のバージョンがずれたリリースは失敗します。

## 判定方法

1. カメラ起動後、良い姿勢の頭の高さを3秒間キャリブレーション
2. 続けて猫背の頭の高さを3秒間キャリブレーション
3. 現在の鼻のY座標が猫背側にどれくらい近づいたかをスコア化
4. 設定した感度以上に猫背へ近づいた状態が一定時間続くと通知
5. 通知後は12秒間のクールダウン

カメラは顔と肩が正面から映る距離で、目線に近い高さに置くと判定しやすくなります。
極端な見下ろしや見上げの画角は避けてください。
