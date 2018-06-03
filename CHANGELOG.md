# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/).

## Unreleased

### Added

- Pecorino口座開設エンドポイントを追加。
- Pecorino口座検索エンドポイントを追加。
- ユーザーの汎用的な所有権検索エンドポイントを追加。
- 会員プログラム検索エンドポイントを追加。
- 注文取引中止エンドポイントを追加。
- Pecorino口座承認取消エンドポイントを追加。
- 会員プログラムオファー承認エンドポイントを追加。
- Pecorino口座解約エンドポイントを追加。
- Pecorinoインセンティブ承認エンドポイントを追加。
- 会員プログラム登録エンドポイントを追加。
- 会員プログラム登録解除エンドポイントを追加。
- 注文検索エンドポイントを追加。
- pecorino口座入金エンドポイントを追加。

### Changed

- 上映イベント予約の所有権検索時に使用するMongoDBインデックスを追加。
- 'aws.cognito.signin.user.admin'スコープで会員インターフェースを利用可能にするよう対応。
- Pecorino決済を、口座支払取引と口座転送取引の2つに対応。
- 注文取引を、ポイント鑑賞券とPecorino決済で成立させることができるように調整。
- 注文番号発行方法を汎用的に拡張。

### Deprecated

### Removed

### Fixed

- 会員のクレジットカード操作時のGMO会員存在なしエラーをハンドリング。

### Security

## v10.4.2 - 2018-02-28
### Changed
- install sskts-domain@24.0.0.

## v10.4.1 - 2018-02-26
### Added
- Pecorino口座関連のエンドポイントを追加。

## v10.4.0 - 2018-02-20
### Added
- 返品取引ルーターを追加。

### Changed
- マルチトークン発行者に対応。
- アクションと取引に対して潜在アクション属性を定義。
- CORS設定調整。
- 承認アクションのobjectに型を定義し、purposeを取引型に変更。
- 注文の配送前後のステータス遷移を管理するように変更。

## v10.3.1 - 2017-12-13
### Changed
- 承認アクション実行時の外部サービスエラーの標準出力をオフに変更。

## v10.3.0 - 2017-12-13
### Changed
- 注文取引レート制限超過時のステータスコードを429に変更。
- クレジットカード取引レート制限超過時のステータスコードを429に変更。
- ムビチケ着券INのサイトコードバリデーションを池袋の劇場コードに合わせて調整。
- 本番環境でのエラー標準出力をオフに変更。

### Fixed
- 要メガネ上映イベントをムビチケで購入する際のメガネ代金連携バグ修正。

## v10.2.0 - 2017-12-04
### Added
- 進行中取引に対して、取引ごとにレート制限を追加。

### Changed
- 注文取引開始時の流入量コントロールを、WAITERで担保するように変更。
- 注文取引開始時の期限パラメーターをunix timestampとISO 8601形式の両方に対応させる。

### Removed
- loadtestソースをリポジトリーから削除。

## v10.1.0 - 2017-11-21
### Added
- 個々の上映イベントの検索条件にプロパティを追加。

### Removed
- 不要なテストコードを削除。

### Fixed
- COAの認証エラーが頻出するバグ対応として[sskts-domain](https://www.npmjs.com/package/@motionpicture/sskts-domain)をアップデート。

## v10.0.1 - 2017-11-01
### Changed
- COA仮予約時とGMOオーソリ取得時のエラーメッセージを承認アクション結果に追加するように調整。

## v10.0.0 - 2017-10-31
### Added
- eventsルーターを追加。
- placesルーターを追加。
- peopleルーターを追加。
- organizationsルーターを追加。

### Changed
- 認可サーバーをcognito user poolへ移行。
- Amazon Cognitoでの会員管理に対応。

### Removed
- films,screens,theaters,performancesルーターを削除。
- adminスコープを削除。


## v9.4.0 - 2017-07-07

### Added
- パスワード認可タイプを追加。ユーザーネームとパスワードでアクセストークンを取得可能なように対応。
- 会員ログイン必須ミドルウェアを追加。
- 会員プロフィール取得エンドポイントを追加。
- 会員プロフィール更新エンドポイントを追加。
- 会員カード検索エンドポイントを追加。
- 会員カード追加エンドポイントを追加。
- 会員カード削除エンドポイントを追加。
- 会員座席予約資産検索エンドポイントを追加。
- レスポンスヘッダーにx-api-versionを追加。

### Changed
- パフォーマンス在庫状況表現を空席率(%)に変更。
- 会員としても取引を開始できるように、取引開始サービスを拡張。
- クライアントユーザー情報を取引に保管するように変更。
- 各エンドポイントのスコープを具体的に調整。
- 取引GMO承認追加のパラメーターをdataで括るように変更(互換性は維持)
- 取引COA座席予約承認追加のパラメーターをdataで括るように変更(互換性は維持)
- 取引ムビチけ承認追加のパラメーターをdataで括るように変更(互換性は維持)
- 取引メール通知追加のパラメーターをdataで括るように変更(互換性は維持)

### Security
- update package [tslint@5.5.0](https://www.npmjs.com/package/tslint)
- update package [tslint-microsoft-contrib@5.0.1](https://github.com/Microsoft/tslint-microsoft-contrib)
- update package [snyk@1.36.2](https://www.npmjs.com/package/snyk)
- update package [nyc@11.0.3](https://www.npmjs.com/package/nyc)
- update package [typescript@2.4.1](https://www.npmjs.com/package/typescript)

## v9.3.0 - 2017-06-28
### Changed
- パフォーマンス在庫状況表現を空席率(%)に変更。

## v9.2.0 - 2017-06-25
### Changed
- ヘルスチェックにredis接続確認を追加。
- ヘルスチェックにおけるmongodbとredisの接続確認をpingコマンドで行うように変更。
- [@motionpicture/sskts-domain@19.3.0]へアップデート。
- 取引スコープをルーターロジック内で作成するように変更。
- package-lock=true

### Fixed
- redisクライアント取得モジュールにおいて、再生成時にクライアントを使えなくなるバグを修正。
- sskts-domainの依存パッケージをうまくアップデートできない問題を解消。mongoose,redis,coa-service,gmo-serviceをsskts-domainの内部モジュールを使用するように変更。

### Security
- [tslint](https://github.com/palantir/tslint)を5.4.3にアップデート。
- [typescript@2.4.0](https://github.com/Microsoft/TypeScript)にアップデート。
- 依存パッケージをアップデート。
- update package [@motionpicture/sskts-domain@^20.1.0](https://www.npmjs.com/package/@motionpicture/sskts-domain)

## v9.1.0 - 2017-06-12
### Added
- Redis Cache接続クライアントを追加。
- パフォーマンス検索結果に空席状況情報を追加。
- パフォーマンス検索結果に作品上映時間情報を追加。
- 劇場検索ルート(GET /theaters)を追加。
- 一般購入シナリオテストを追加。
- パッケージロックを一時的に無効化(.npmrcに設定を追加)。
```shell
package-lock=false
```
- スコープ許可ミドルウェアを追加。
- クライアント情報認可タイプを追加。

### Changed
- 取引開始サービスを、取引数制限をRedis Cacheでチェックする仕様に変更(api使用側から見た互換性は維持)。

### Removed
- 使用していないので、強制的に取引を開始するサービスを削除。

### Security
- [typescript](https://github.com/Microsoft/TypeScript)を2.3.4にアップデート。
- [tslint](https://github.com/palantir/tslint)を5.4.2にアップデート。
- 依存パッケージをアップデート。
- npm@^5.0.0の導入。

## v9.0.0 - 2017-06-03
### Added
- COA本予約にムビチケ情報を連携するために、COA仮予約承認追加のパラメータを変更。

### Changed
- sskts-domainにて資産所有権認証記録スキーマが加わったことによる影響箇所を対応。

## v8.0.3 - 2017-05-17
### Fixed
- tslintオプションを変更。
```shell
"no-use-before-declare": true,
"object-literal-shorthand": true,
```

## v8.0.2 - 2017-05-17
### Fixed
- [tslint](https://github.com/palantir/tslint)を^5.2.0にアップデート。
- パッケージ依存関係を全体的にアップデート。
- npm testスクリプトを修正。

## v8.0.1 - 2017-04-17
### Added
- ファーストリリース
