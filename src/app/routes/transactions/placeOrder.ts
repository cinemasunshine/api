/**
 * 注文取引ルーター
 */
import * as middlewares from '@motionpicture/express-middleware';
import * as sskts from '@motionpicture/sskts-domain';
import * as createDebug from 'debug';
import { Router } from 'express';
import { CREATED, NO_CONTENT, NOT_FOUND, TOO_MANY_REQUESTS } from 'http-status';
import * as redis from 'ioredis';
import * as moment from 'moment';
import * as request from 'request-promise-native';

import authentication from '../../middlewares/authentication';
import permitScopes from '../../middlewares/permitScopes';
import validator from '../../middlewares/validator';

const placeOrderTransactionsRouter = Router();
const debug = createDebug('sskts-api:placeOrderTransactionsRouter');
const pecorinoAuthClient = new sskts.pecorinoapi.auth.ClientCredentials({
    domain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.PECORINO_API_CLIENT_ID,
    clientSecret: <string>process.env.PECORINO_API_CLIENT_SECRET,
    scopes: [],
    state: ''
});

// tslint:disable-next-line:no-magic-numbers
const AGGREGATION_UNIT_IN_SECONDS = parseInt(<string>process.env.TRANSACTION_RATE_LIMIT_AGGREGATION_UNIT_IN_SECONDS, 10);
// tslint:disable-next-line:no-magic-numbers
const THRESHOLD = parseInt(<string>process.env.TRANSACTION_RATE_LIMIT_THRESHOLD, 10);
/**
 * 進行中取引の接続回数制限ミドルウェア
 * 取引IDを使用して動的にスコープを作成する
 * @const
 */
const rateLimit4transactionInProgress =
    middlewares.rateLimit({
        redisClient: new redis({
            host: <string>process.env.RATE_LIMIT_REDIS_HOST,
            // tslint:disable-next-line:no-magic-numbers
            port: parseInt(<string>process.env.RATE_LIMIT_REDIS_PORT, 10),
            password: <string>process.env.RATE_LIMIT_REDIS_KEY,
            tls: <any>{ servername: <string>process.env.RATE_LIMIT_REDIS_HOST }
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

placeOrderTransactionsRouter.use(authentication);

placeOrderTransactionsRouter.post(
    '/start',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (req, _, next) => {
        // expires is unix timestamp (in seconds)
        req.checkBody('expires', 'invalid expires').notEmpty().withMessage('expires is required');
        req.checkBody('sellerId', 'invalid sellerId').notEmpty().withMessage('sellerId is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            let passportToken = req.body.passportToken;

            // 許可証トークンパラメーターがなければ、WAITERで許可証を取得
            if (passportToken === undefined) {
                const organizationRepo = new sskts.repository.Organization(sskts.mongoose.connection);
                const seller = await organizationRepo.findMovieTheaterById(req.body.sellerId);

                try {
                    passportToken = await request.post(
                        `${process.env.WAITER_ENDPOINT}/passports`,
                        {
                            body: {
                                scope: `placeOrderTransaction.${seller.identifier}`
                            },
                            json: true
                        }
                    ).then((body) => body.token);
                } catch (error) {
                    if (error.statusCode === NOT_FOUND) {
                        throw new sskts.factory.errors.NotFound('sellerId', 'Seller does not exist.');
                    } else if (error.statusCode === TOO_MANY_REQUESTS) {
                        throw new sskts.factory.errors.RateLimitExceeded('PlaceOrder transactions rate limit exceeded.');
                    } else {
                        throw new sskts.factory.errors.ServiceUnavailable('Waiter service temporarily unavailable.');
                    }
                }
            }

            // パラメーターの形式をunix timestampからISO 8601フォーマットに変更したため、互換性を維持するように期限をセット
            const expires = (/^\d+$/.test(req.body.expires))
                // tslint:disable-next-line:no-magic-numbers
                ? moment.unix(parseInt(req.body.expires, 10)).toDate()
                : moment(req.body.expires).toDate();
            const transaction = await sskts.service.transaction.placeOrderInProgress.start({
                expires: expires,
                agentId: req.user.sub,
                sellerId: req.body.sellerId,
                clientUser: req.user,
                passportToken: passportToken
            })({
                organization: new sskts.repository.Organization(sskts.mongoose.connection),
                transaction: new sskts.repository.Transaction(sskts.mongoose.connection)
            });

            // tslint:disable-next-line:no-string-literal
            // const host = req.headers['host'];
            // res.setHeader('Location', `https://${host}/transactions/${transaction.id}`);
            res.json(transaction);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 購入者情報を変更する
 */
placeOrderTransactionsRouter.put(
    '/:transactionId/customerContact',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (req, _, next) => {
        req.checkBody('familyName').notEmpty().withMessage('required');
        req.checkBody('givenName').notEmpty().withMessage('required');
        req.checkBody('telephone').notEmpty().withMessage('required');
        req.checkBody('email').notEmpty().withMessage('required');

        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            const contact = await sskts.service.transaction.placeOrderInProgress.setCustomerContact(
                req.user.sub,
                req.params.transactionId,
                {
                    familyName: req.body.familyName,
                    givenName: req.body.givenName,
                    email: req.body.email,
                    telephone: req.body.telephone
                }
            )({
                transaction: new sskts.repository.Transaction(sskts.mongoose.connection)
            });

            res.status(CREATED).json(contact);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 座席仮予約
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/seatReservation',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (__1, __2, next) => {
        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            const action = await sskts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(
                req.user.sub,
                req.params.transactionId,
                req.body.eventIdentifier,
                req.body.offers
            )({
                action: new sskts.repository.Action(sskts.mongoose.connection),
                transaction: new sskts.repository.Transaction(sskts.mongoose.connection),
                event: new sskts.repository.Event(sskts.mongoose.connection)
            });

            res.status(CREATED).json(action);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 座席仮予約削除
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/seatReservation/:actionId',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            await sskts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.cancel(
                req.user.sub,
                req.params.transactionId,
                req.params.actionId
            )({
                action: new sskts.repository.Action(sskts.mongoose.connection),
                transaction: new sskts.repository.Transaction(sskts.mongoose.connection)
            });

            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 座席仮予へ変更(券種変更)
 */
placeOrderTransactionsRouter.patch(
    '/:transactionId/actions/authorize/seatReservation/:actionId',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (__1, __2, next) => {
        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            const action = await sskts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.changeOffers(
                req.user.sub,
                req.params.transactionId,
                req.params.actionId,
                req.body.eventIdentifier,
                req.body.offers
            )({
                action: new sskts.repository.Action(sskts.mongoose.connection),
                transaction: new sskts.repository.Transaction(sskts.mongoose.connection),
                event: new sskts.repository.Event(sskts.mongoose.connection)
            });

            res.json(action);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 会員プログラムオファー承認アクション
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/offer/programMembership',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (__1, __2, next) => {
        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (_, res, next) => {
        try {
            // tslint:disable-next-line:no-suspicious-comment
            // TODO 実装
            res.status(CREATED).json({});
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 会員プログラムオファー承認アクション取消
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/offer/programMembership/:actionId',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (__1, __2, next) => {
        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (_, res, next) => {
        try {
            // tslint:disable-next-line:no-suspicious-comment
            // TODO 実装
            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/creditCard',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (req, __2, next) => {
        req.checkBody('orderId', 'invalid orderId').notEmpty().withMessage('orderId is required');
        req.checkBody('amount', 'invalid amount').notEmpty().withMessage('amount is required');
        req.checkBody('method', 'invalid method').notEmpty().withMessage('method is required');
        req.checkBody('creditCard', 'invalid creditCard').notEmpty().withMessage('creditCard is required');

        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            // 会員IDを強制的にログイン中の人物IDに変更
            const creditCard: sskts.service.transaction.placeOrderInProgress.action.authorize.creditCard.ICreditCard4authorizeAction = {
                ...req.body.creditCard,
                ...{
                    memberId: (req.user.username !== undefined) ? req.user.sub : undefined
                }
            };
            debug('authorizing credit card...', creditCard);

            debug('authorizing credit card...', req.body.creditCard);
            const action = await sskts.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
                req.user.sub,
                req.params.transactionId,
                req.body.orderId,
                req.body.amount,
                req.body.method,
                creditCard
            )({
                action: new sskts.repository.Action(sskts.mongoose.connection),
                transaction: new sskts.repository.Transaction(sskts.mongoose.connection),
                organization: new sskts.repository.Organization(sskts.mongoose.connection)
            });

            res.status(CREATED).json({
                id: action.id
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * クレジットカードオーソリ取消
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/creditCard/:actionId',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            await sskts.service.transaction.placeOrderInProgress.action.authorize.creditCard.cancel(
                req.user.sub,
                req.params.transactionId,
                req.params.actionId
            )({
                action: new sskts.repository.Action(sskts.mongoose.connection),
                transaction: new sskts.repository.Transaction(sskts.mongoose.connection)
            });

            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ムビチケ追加
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/mvtk',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (__1, __2, next) => {
        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            const authorizeObject = {
                typeOf: sskts.factory.action.authorize.mvtk.ObjectType.Mvtk,
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
            const action = await sskts.service.transaction.placeOrderInProgress.action.authorize.mvtk.create(
                req.user.sub,
                req.params.transactionId,
                authorizeObject
            )({
                action: new sskts.repository.Action(sskts.mongoose.connection),
                transaction: new sskts.repository.Transaction(sskts.mongoose.connection)
            });

            res.status(CREATED).json({
                id: action.id
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ムビチケ取消
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/mvtk/:actionId',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            await sskts.service.transaction.placeOrderInProgress.action.authorize.mvtk.cancel(
                req.user.sub,
                req.params.transactionId,
                req.params.actionId
            )({
                action: new sskts.repository.Action(sskts.mongoose.connection),
                transaction: new sskts.repository.Transaction(sskts.mongoose.connection)
            });

            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Pecorino口座確保
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/pecorino',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (req, __, next) => {
        req.checkBody('amount', 'invalid amount').notEmpty().withMessage('amount is required').isInt();
        req.checkBody('fromAccountNumber', 'invalid fromAccountNumber').notEmpty().withMessage('fromAccountNumber is required');
        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            // pecorino転送取引サービスクライアントを生成
            const transferTransactionService = new sskts.pecorinoapi.service.transaction.Transfer({
                endpoint: <string>process.env.PECORINO_API_ENDPOINT,
                auth: pecorinoAuthClient
            });
            const action = await sskts.service.transaction.placeOrderInProgress.action.authorize.pecorino.create({
                transactionId: req.params.transactionId,
                amount: parseInt(req.body.amount, 10),
                fromAccountNumber: req.body.fromAccountNumber,
                notes: req.body.notes
            })({
                action: new sskts.repository.Action(sskts.mongoose.connection),
                organization: new sskts.repository.Organization(sskts.mongoose.connection),
                transaction: new sskts.repository.Transaction(sskts.mongoose.connection),
                transferTransactionService: transferTransactionService
            });
            res.status(CREATED).json(action);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Pecorino口座承認取消
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/pecorino/:actionId',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            // pecorino転送取引サービスクライアントを生成
            const transferTransactionService = new sskts.pecorinoapi.service.transaction.Transfer({
                endpoint: <string>process.env.PECORINO_API_ENDPOINT,
                auth: pecorinoAuthClient
            });
            await sskts.service.transaction.placeOrderInProgress.action.authorize.pecorino.cancel({
                agentId: req.user.sub,
                transactionId: req.params.transactionId,
                actionId: req.params.actionId
            })({
                action: new sskts.repository.Action(sskts.mongoose.connection),
                transaction: new sskts.repository.Transaction(sskts.mongoose.connection),
                transferTransactionService: transferTransactionService
            });
            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

placeOrderTransactionsRouter.post(
    '/:transactionId/confirm',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            let incentives = [];
            if (Array.isArray(req.body.incentives)) {
                // tslint:disable-next-line:no-suspicious-comment
                // TODO バックエンドでインセンティブのバリデーションを実装
                incentives = req.body.incentives.map((i: any) => {
                    return {
                        // tslint:disable-next-line:no-suspicious-comment
                        amount: parseInt(i.amount, 10),
                        toAccountNumber: i.toAccountNumber,
                        pecorinoEndpoint: <string>process.env.PECORINO_API_ENDPOINT
                    };
                });
            }

            const order = await sskts.service.transaction.placeOrderInProgress.confirm({
                agentId: req.user.sub,
                transactionId: req.params.transactionId,
                sendEmailMessage: (req.body.sendEmailMessage === true) ? true : false,
                incentives: incentives
            })({
                action: new sskts.repository.Action(sskts.mongoose.connection),
                transaction: new sskts.repository.Transaction(sskts.mongoose.connection),
                organization: new sskts.repository.Organization(sskts.mongoose.connection)
            });
            debug('transaction confirmed', order);

            res.status(CREATED).json(order);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 取引を明示的に中止
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/cancel',
    permitScopes(['admin', 'aws.cognito.signin.user.admin', 'transactions']),
    validator,
    async (req, res, next) => {
        try {
            const transactionRepo = new sskts.repository.Transaction(sskts.mongoose.connection);
            await transactionRepo.cancel(sskts.factory.transactionType.PlaceOrder, req.params.transactionId);
            debug('transaction canceled.');
            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

placeOrderTransactionsRouter.post(
    '/:transactionId/tasks/sendEmailNotification',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    async (req, res, next) => {
        try {
            const task = await sskts.service.transaction.placeOrder.sendEmail(
                req.params.transactionId,
                {
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
                }
            )({
                task: new sskts.repository.Task(sskts.mongoose.connection),
                transaction: new sskts.repository.Transaction(sskts.mongoose.connection)
            });

            res.status(CREATED).json(task);
        } catch (error) {
            next(error);
        }
    }
);

export default placeOrderTransactionsRouter;
