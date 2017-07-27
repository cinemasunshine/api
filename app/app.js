"use strict";
/**
 * Expressアプリケーション
 *
 * @ignore
 */
const sskts = require("@motionpicture/sskts-domain");
const bodyParser = require("body-parser");
const cors = require("cors");
const createDebug = require("debug");
const express = require("express");
const expressValidator = require("express-validator"); // tslint:disable-line:no-require-imports
const helmet = require("helmet");
const i18n = require("i18n");
const mongooseConnectionOptions_1 = require("../mongooseConnectionOptions");
const basicAuth_1 = require("./middlewares/basicAuth");
const errorHandler_1 = require("./middlewares/errorHandler");
const notFoundHandler_1 = require("./middlewares/notFoundHandler");
const dev_1 = require("./routes/dev");
const events_1 = require("./routes/events");
const health_1 = require("./routes/health");
const oauth_1 = require("./routes/oauth");
const organizations_1 = require("./routes/organizations");
const people_1 = require("./routes/people");
const places_1 = require("./routes/places");
const placeOrder_1 = require("./routes/transactions/placeOrder");
const debug = createDebug('sskts-api:*');
const app = express();
app.use(basicAuth_1.default); // ベーシック認証
app.use(cors()); // enable All CORS Requests
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ['\'self\'']
        // styleSrc: ['\'unsafe-inline\'']
    }
}));
app.use(helmet.referrerPolicy({ policy: 'no-referrer' })); // 型定義が非対応のためany
const SIXTY_DAYS_IN_SECONDS = 5184000;
app.use(helmet.hsts({
    maxAge: SIXTY_DAYS_IN_SECONDS,
    includeSubdomains: false
}));
// api version
// tslint:disable-next-line:no-require-imports no-var-requires
const packageInfo = require('../package.json');
debug('packageInfo is', packageInfo);
app.use((__, res, next) => {
    res.setHeader('x-api-verion', packageInfo.version);
    next();
});
if (process.env.NODE_ENV !== 'production') {
    // サーバーエラーテスト
    app.get('/dev/uncaughtexception', (req) => {
        req.on('data', (chunk) => {
            debug(chunk);
        });
        req.on('end', () => {
            throw new Error('uncaughtexception manually');
        });
    });
}
// view engine setup
// app.set('views', `${__dirname}/views`);
// app.set('view engine', 'ejs');
app.use(bodyParser.json());
// The extended option allows to choose between parsing the URL-encoded data
// with the querystring library (when false) or the qs library (when true).
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator({})); // this line must be immediately after any of the bodyParser middlewares!
// 静的ファイル
// app.use(express.static(__dirname + '/../../public'));
// i18n を利用する設定
i18n.configure({
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    directory: `${__dirname}/../../locales`,
    objectNotation: true,
    updateFiles: false // ページのビューで自動的に言語ファイルを更新しない
});
// i18n の設定を有効化
app.use(i18n.init);
// @types/mongooseが古くて、新しいMongoDBクライアントの接続オプションに適合していない
// 型定義の更新待ち
sskts.mongoose.connect(process.env.MONGOLAB_URI, mongooseConnectionOptions_1.default);
// routers
app.use('/health', health_1.default);
app.use('/oauth', oauth_1.default);
app.use('/organizations', organizations_1.default);
app.use('/people', people_1.default);
app.use('/places', places_1.default);
app.use('/events', events_1.default);
app.use('/transactions/placeOrder', placeOrder_1.default);
if (process.env.NODE_ENV !== 'production') {
    app.use('/dev', dev_1.default);
}
// 404
app.use(notFoundHandler_1.default);
// error handlers
app.use(errorHandler_1.default);
module.exports = app;
