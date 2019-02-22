"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 注文取引ルーター
 */
const middlewares = require("@motionpicture/express-middleware");
const sskts = require("@motionpicture/sskts-domain");
const createDebug = require("debug");
const express_1 = require("express");
// tslint:disable-next-line:no-submodule-imports
const check_1 = require("express-validator/check");
const http_status_1 = require("http-status");
const ioredis = require("ioredis");
const moment = require("moment");
const mongoose = require("mongoose");
const authentication_1 = require("../../middlewares/authentication");
const permitScopes_1 = require("../../middlewares/permitScopes");
const validator_1 = require("../../middlewares/validator");
const redis = require("../../../redis");
const debug = createDebug('sskts-api:placeOrderTransactionsRouter');
const pecorinoAuthClient = new sskts.pecorinoapi.auth.ClientCredentials({
    domain: process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.PECORINO_CLIENT_ID,
    clientSecret: process.env.PECORINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});
const WAITER_DISABLED = process.env.WAITER_DISABLED === '1';
// tslint:disable-next-line:no-magic-numbers
const AGGREGATION_UNIT_IN_SECONDS = parseInt(process.env.TRANSACTION_RATE_LIMIT_AGGREGATION_UNIT_IN_SECONDS, 10);
// tslint:disable-next-line:no-magic-numbers
const THRESHOLD = parseInt(process.env.TRANSACTION_RATE_LIMIT_THRESHOLD, 10);
/**
 * 進行中取引の接続回数制限ミドルウェア
 * 取引IDを使用して動的にスコープを作成する
 */
const rateLimit4transactionInProgress = middlewares.rateLimit({
    redisClient: new ioredis({
        host: process.env.REDIS_HOST,
        // tslint:disable-next-line:no-magic-numbers
        port: parseInt(process.env.REDIS_PORT, 10),
        password: process.env.REDIS_KEY,
        tls: (process.env.REDIS_TLS_SERVERNAME !== undefined) ? { servername: process.env.REDIS_TLS_SERVERNAME } : undefined
    }),
    aggregationUnitInSeconds: AGGREGATION_UNIT_IN_SECONDS,
    threshold: THRESHOLD,
    // 制限超過時の動作をカスタマイズ
    limitExceededHandler: (__0, __1, res, next) => {
        res.setHeader('Retry-After', AGGREGATION_UNIT_IN_SECONDS);
        const message = `Retry after ${AGGREGATION_UNIT_IN_SECONDS} seconds for your transaction.`;
        next(new sskts.factory.errors.RateLimitExceeded(message));
    },
    // スコープ生成ロジックをカスタマイズ
    scopeGenerator: (req) => `placeOrderTransaction.${req.params.transactionId}`
});
const placeOrderTransactionsRouter = express_1.Router();
placeOrderTransactionsRouter.use(authentication_1.default);
placeOrderTransactionsRouter.post('/start', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (req, _, next) => {
    // expires is unix timestamp (in seconds)
    req.checkBody('expires', 'invalid expires').notEmpty().withMessage('expires is required');
    req.checkBody('sellerId', 'invalid sellerId').notEmpty().withMessage('sellerId is required');
    if (!WAITER_DISABLED) {
        req.checkBody('passportToken', 'invalid passport token')
            .notEmpty()
            .withMessage('passportToken is required');
    }
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // パラメーターの形式をunix timestampからISO 8601フォーマットに変更したため、互換性を維持するように期限をセット
        const expires = (/^\d+$/.test(req.body.expires))
            // tslint:disable-next-line:no-magic-numbers
            ? moment.unix(parseInt(req.body.expires, 10)).toDate()
            : moment(req.body.expires).toDate();
        const transaction = yield sskts.service.transaction.placeOrderInProgress.start({
            expires: expires,
            customer: req.agent,
            seller: {
                typeOf: sskts.factory.organizationType.MovieTheater,
                id: req.body.sellerId
            },
            clientUser: req.user,
            passportToken: req.body.passportToken
        })({
            seller: new sskts.repository.Seller(mongoose.connection),
            transaction: new sskts.repository.Transaction(mongoose.connection)
        });
        // tslint:disable-next-line:no-string-literal
        // const host = req.headers['host'];
        // res.setHeader('Location', `https://${host}/transactions/${transaction.id}`);
        res.json(transaction);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 購入者情報を変更する
 */
placeOrderTransactionsRouter.put('/:transactionId/customerContact', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (req, _, next) => {
    req.checkBody('familyName').notEmpty().withMessage('required');
    req.checkBody('givenName').notEmpty().withMessage('required');
    req.checkBody('telephone').notEmpty().withMessage('required');
    req.checkBody('email').notEmpty().withMessage('required');
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const contact = yield sskts.service.transaction.placeOrderInProgress.setCustomerContact({
            agentId: req.user.sub,
            transactionId: req.params.transactionId,
            contact: {
                familyName: req.body.familyName,
                givenName: req.body.givenName,
                email: req.body.email,
                telephone: req.body.telephone
            }
        })({
            transaction: new sskts.repository.Transaction(mongoose.connection)
        });
        res.status(http_status_1.CREATED).json(contact);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 座席仮予約
 */
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/seatReservation', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (__1, __2, next) => {
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const action = yield sskts.service.transaction.placeOrderInProgress.action.authorize.offer.seatReservation.create({
            agentId: req.user.sub,
            transactionId: req.params.transactionId,
            eventIdentifier: req.body.eventIdentifier,
            offers: req.body.offers
        })({
            action: new sskts.repository.Action(mongoose.connection),
            transaction: new sskts.repository.Transaction(mongoose.connection),
            event: new sskts.repository.Event(mongoose.connection)
        });
        res.status(http_status_1.CREATED).json(action);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 座席仮予約削除
 */
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/seatReservation/:actionId', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield sskts.service.transaction.placeOrderInProgress.action.authorize.offer.seatReservation.cancel({
            agentId: req.user.sub,
            transactionId: req.params.transactionId,
            actionId: req.params.actionId
        })({
            action: new sskts.repository.Action(mongoose.connection),
            transaction: new sskts.repository.Transaction(mongoose.connection)
        });
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 座席仮予へ変更(券種変更)
 */
placeOrderTransactionsRouter.patch('/:transactionId/actions/authorize/seatReservation/:actionId', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (__1, __2, next) => {
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const action = yield sskts.service.transaction.placeOrderInProgress.action.authorize.offer.seatReservation.changeOffers({
            agentId: req.user.sub,
            transactionId: req.params.transactionId,
            actionId: req.params.actionId,
            eventIdentifier: req.body.eventIdentifier,
            offers: req.body.offers
        })({
            action: new sskts.repository.Action(mongoose.connection),
            transaction: new sskts.repository.Transaction(mongoose.connection),
            event: new sskts.repository.Event(mongoose.connection)
        });
        res.json(action);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 会員プログラムオファー承認アクション
 */
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/offer/programMembership', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (__1, __2, next) => {
    next();
}, validator_1.default, rateLimit4transactionInProgress, (_, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // tslint:disable-next-line:no-suspicious-comment
        // TODO 実装
        res.status(http_status_1.CREATED).json({});
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 会員プログラムオファー承認アクション取消
 */
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/offer/programMembership/:actionId', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (__1, __2, next) => {
    next();
}, validator_1.default, rateLimit4transactionInProgress, (_, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // tslint:disable-next-line:no-suspicious-comment
        // TODO 実装
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * クレジットカード有効性チェック
 */
// placeOrderTransactionsRouter.post(
//     '/:transactionId/actions/validate/creditCard',
//     permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
//     (req, __2, next) => {
//         req.checkBody('orderId', 'invalid orderId').notEmpty().withMessage('orderId is required');
//         req.checkBody('amount', 'invalid amount').notEmpty().withMessage('amount is required');
//         req.checkBody('method', 'invalid method').notEmpty().withMessage('method is required');
//         req.checkBody('creditCard', 'invalid creditCard').notEmpty().withMessage('creditCard is required');
//         next();
//     },
//     validator,
//     rateLimit4transactionInProgress,
//     async (req, res, next) => {
//         try {
//             // 会員IDを強制的にログイン中の人物IDに変更
//             type ICreditCard4authorizeAction =
//                 sskts.service.transaction.placeOrderInProgress.action.authorize.paymentMethod.creditCard.ICreditCard4authorizeAction;
//             const creditCard: ICreditCard4authorizeAction = {
//                 ...req.body.creditCard,
//                 ...{
//                     memberId: (req.user.username !== undefined) ? req.user.username : undefined
//                 }
//             };
//             debug('authorizing credit card...', creditCard);
//             debug('authorizing credit card...', req.body.creditCard);
//             const action = await sskts.service.transaction.placeOrderInProgress.action.authorize.paymentMethod.creditCard.check({
//                 agentId: req.user.sub,
//                 transactionId: req.params.transactionId,
//                 orderId: req.body.orderId,
//                 amount: req.body.amount,
//                 method: req.body.method,
//                 creditCard: creditCard
//             })({
//                 action: new sskts.repository.Action(mongoose.connection),
//                 transaction: new sskts.repository.Transaction(mongoose.connection),
//                 organization: new sskts.repository.Seller(mongoose.connection)
//             });
//             res.status(ACCEPTED).json({
//                 id: action.id
//             });
//         } catch (error) {
//             next(error);
//         }
//     }
// );
/**
 * クレジットカードオーソリ
 */
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/creditCard', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (req, __2, next) => {
    req.checkBody('orderId', 'invalid orderId').notEmpty().withMessage('orderId is required');
    req.checkBody('amount', 'invalid amount').notEmpty().withMessage('amount is required');
    req.checkBody('method', 'invalid method').notEmpty().withMessage('method is required');
    req.checkBody('creditCard', 'invalid creditCard').notEmpty().withMessage('creditCard is required');
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const creditCard = Object.assign({}, req.body.creditCard, {
            memberId: (req.user.username !== undefined) ? req.user.username : undefined
        });
        debug('authorizing credit card...', creditCard);
        debug('authorizing credit card...', req.body.creditCard);
        const action = yield sskts.service.transaction.placeOrderInProgress.action.authorize.paymentMethod.creditCard.create({
            agent: { id: req.user.sub },
            transaction: { id: req.params.transactionId },
            object: {
                typeOf: sskts.factory.paymentMethodType.CreditCard,
                orderId: req.body.orderId,
                amount: req.body.amount,
                method: req.body.method,
                creditCard: creditCard
            }
        })({
            action: new sskts.repository.Action(mongoose.connection),
            transaction: new sskts.repository.Transaction(mongoose.connection),
            seller: new sskts.repository.Seller(mongoose.connection)
        });
        res.status(http_status_1.CREATED).json({
            id: action.id
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * クレジットカードオーソリ取消
 */
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/creditCard/:actionId', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield sskts.service.transaction.placeOrderInProgress.action.authorize.paymentMethod.creditCard.cancel({
            agentId: req.user.sub,
            transactionId: req.params.transactionId,
            actionId: req.params.actionId
        })({
            action: new sskts.repository.Action(mongoose.connection),
            transaction: new sskts.repository.Transaction(mongoose.connection)
        });
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * ムビチケ追加
 */
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/mvtk', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (__1, __2, next) => {
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const authorizeObject = {
            typeOf: sskts.factory.action.authorize.discount.mvtk.ObjectType.Mvtk,
            // tslint:disable-next-line:no-magic-numbers
            price: parseInt(req.body.price, 10),
            transactionId: req.params.transactionId,
            seatInfoSyncIn: {
                kgygishCd: req.body.seatInfoSyncIn.kgygishCd,
                yykDvcTyp: req.body.seatInfoSyncIn.yykDvcTyp,
                trkshFlg: req.body.seatInfoSyncIn.trkshFlg,
                kgygishSstmZskyykNo: req.body.seatInfoSyncIn.kgygishSstmZskyykNo,
                kgygishUsrZskyykNo: req.body.seatInfoSyncIn.kgygishUsrZskyykNo,
                jeiDt: req.body.seatInfoSyncIn.jeiDt,
                kijYmd: req.body.seatInfoSyncIn.kijYmd,
                stCd: req.body.seatInfoSyncIn.stCd,
                screnCd: req.body.seatInfoSyncIn.screnCd,
                knyknrNoInfo: req.body.seatInfoSyncIn.knyknrNoInfo,
                zskInfo: req.body.seatInfoSyncIn.zskInfo,
                skhnCd: req.body.seatInfoSyncIn.skhnCd
            }
        };
        const action = yield sskts.service.transaction.placeOrderInProgress.action.authorize.discount.mvtk.create({
            agentId: req.user.sub,
            transactionId: req.params.transactionId,
            authorizeObject: authorizeObject
        })({
            action: new sskts.repository.Action(mongoose.connection),
            transaction: new sskts.repository.Transaction(mongoose.connection)
        });
        res.status(http_status_1.CREATED).json({
            id: action.id
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * ムビチケ取消
 */
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/mvtk/:actionId', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield sskts.service.transaction.placeOrderInProgress.action.authorize.discount.mvtk.cancel({
            agentId: req.user.sub,
            transactionId: req.params.transactionId,
            actionId: req.params.actionId
        })({
            action: new sskts.repository.Action(mongoose.connection),
            transaction: new sskts.repository.Transaction(mongoose.connection)
        });
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * ポイント口座確保
 */
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/paymentMethod/pecorino', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (req, __, next) => {
    req.checkBody('amount', 'invalid amount').notEmpty().withMessage('amount is required').isInt();
    req.checkBody('fromAccountNumber', 'invalid fromAccountNumber').notEmpty().withMessage('fromAccountNumber is required');
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // pecorino転送取引サービスクライアントを生成
        const transferService = new sskts.pecorinoapi.service.transaction.Transfer({
            endpoint: process.env.PECORINO_ENDPOINT,
            auth: pecorinoAuthClient
        });
        const action = yield sskts.service.transaction.placeOrderInProgress.action.authorize.paymentMethod.account.create({
            agent: { id: req.user.sub },
            transaction: { id: req.params.transactionId },
            object: {
                typeOf: sskts.factory.paymentMethodType.Account,
                amount: Number(req.body.amount),
                fromAccount: {
                    accountType: sskts.factory.accountType.Point,
                    accountNumber: req.body.fromAccountNumber
                },
                notes: req.body.notes
            }
        })({
            action: new sskts.repository.Action(mongoose.connection),
            seller: new sskts.repository.Seller(mongoose.connection),
            ownershipInfo: new sskts.repository.OwnershipInfo(mongoose.connection),
            transaction: new sskts.repository.Transaction(mongoose.connection),
            transferTransactionService: transferService
        });
        res.status(http_status_1.CREATED).json(action);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * ポイント口座承認取消
 */
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/paymentMethod/pecorino/:actionId', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // pecorino転送取引サービスクライアントを生成
        const transferService = new sskts.pecorinoapi.service.transaction.Transfer({
            endpoint: process.env.PECORINO_ENDPOINT,
            auth: pecorinoAuthClient
        });
        yield sskts.service.transaction.placeOrderInProgress.action.authorize.paymentMethod.account.cancel({
            id: req.params.actionId,
            agent: { id: req.user.sub },
            transaction: { id: req.params.transactionId }
        })({
            action: new sskts.repository.Action(mongoose.connection),
            transaction: new sskts.repository.Transaction(mongoose.connection),
            transferTransactionService: transferService
        });
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * Pecorino賞金承認アクション
 */
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/award/pecorino', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (req, __2, next) => {
    req.checkBody('amount', 'invalid amount').notEmpty().withMessage('amount is required').isInt();
    req.checkBody('toAccountNumber', 'invalid toAccountNumber').notEmpty().withMessage('toAccountNumber is required');
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // pecorino転送取引サービスクライアントを生成
        const depositService = new sskts.pecorinoapi.service.transaction.Deposit({
            endpoint: process.env.PECORINO_ENDPOINT,
            auth: pecorinoAuthClient
        });
        const action = yield sskts.service.transaction.placeOrderInProgress.action.authorize.award.point.create({
            agentId: req.user.sub,
            transactionId: req.params.transactionId,
            amount: parseInt(req.body.amount, 10),
            toAccountNumber: req.body.toAccountNumber,
            notes: req.body.notes
        })({
            action: new sskts.repository.Action(mongoose.connection),
            transaction: new sskts.repository.Transaction(mongoose.connection),
            ownershipInfo: new sskts.repository.OwnershipInfo(mongoose.connection),
            depositTransactionService: depositService
        });
        res.status(http_status_1.CREATED).json(action);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * Pecorino賞金承認アクション取消
 */
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/award/pecorino/:actionId', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (__1, __2, next) => {
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const depositService = new sskts.pecorinoapi.service.transaction.Deposit({
            endpoint: process.env.PECORINO_ENDPOINT,
            auth: pecorinoAuthClient
        });
        yield sskts.service.transaction.placeOrderInProgress.action.authorize.award.point.cancel({
            agentId: req.user.sub,
            transactionId: req.params.transactionId,
            actionId: req.params.actionId
        })({
            action: new sskts.repository.Action(mongoose.connection),
            transaction: new sskts.repository.Transaction(mongoose.connection),
            depositTransactionService: depositService
        });
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.post('/:transactionId/confirm', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const orderDate = new Date();
        const order = yield sskts.service.transaction.placeOrderInProgress.confirm({
            agentId: req.user.sub,
            transactionId: req.params.transactionId,
            sendEmailMessage: (req.body.sendEmailMessage === true) ? true : false,
            orderDate: orderDate
        })({
            action: new sskts.repository.Action(mongoose.connection),
            transaction: new sskts.repository.Transaction(mongoose.connection),
            orderNumber: new sskts.repository.OrderNumber(redis.getClient()),
            seller: new sskts.repository.Seller(mongoose.connection)
        });
        debug('transaction confirmed', order);
        res.status(http_status_1.CREATED).json(order);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 取引を明示的に中止
 */
placeOrderTransactionsRouter.post('/:transactionId/cancel', permitScopes_1.default(['admin', 'aws.cognito.signin.user.admin', 'transactions']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const transactionRepo = new sskts.repository.Transaction(mongoose.connection);
        yield transactionRepo.cancel({
            typeOf: sskts.factory.transactionType.PlaceOrder,
            id: req.params.transactionId
        });
        debug('transaction canceled.');
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.post('/:transactionId/tasks/sendEmailNotification', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const task = yield sskts.service.transaction.placeOrder.sendEmail(req.params.transactionId, {
            typeOf: sskts.factory.creativeWorkType.EmailMessage,
            sender: {
                name: req.body.sender.name,
                email: req.body.sender.email
            },
            toRecipient: {
                name: req.body.toRecipient.name,
                email: req.body.toRecipient.email
            },
            about: req.body.about,
            text: req.body.text
        })({
            task: new sskts.repository.Task(mongoose.connection),
            transaction: new sskts.repository.Transaction(mongoose.connection)
        });
        res.status(http_status_1.CREATED).json(task);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 取引検索
 */
placeOrderTransactionsRouter.get('', permitScopes_1.default(['admin']), ...[
    check_1.query('startFrom').optional().isISO8601().toDate(),
    check_1.query('startThrough').optional().isISO8601().toDate(),
    check_1.query('endFrom').optional().isISO8601().toDate(),
    check_1.query('endThrough').optional().isISO8601().toDate()
], validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const transactionRepo = new sskts.repository.Transaction(mongoose.connection);
        const searchConditions = Object.assign({}, req.query, { 
            // tslint:disable-next-line:no-magic-numbers
            limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100, page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1 });
        const transactions = yield transactionRepo.search(searchConditions);
        const totalCount = yield transactionRepo.count(searchConditions);
        res.set('X-Total-Count', totalCount.toString());
        res.json(transactions);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 取引に対するアクション検索
 */
placeOrderTransactionsRouter.get('/:transactionId/actions', permitScopes_1.default(['admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const actionRepo = new sskts.repository.Action(mongoose.connection);
        const actions = yield actionRepo.searchByPurpose({
            purpose: {
                typeOf: sskts.factory.transactionType.PlaceOrder,
                id: req.params.transactionId
            },
            sort: req.query.sort
        });
        res.json(actions);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = placeOrderTransactionsRouter;
