/**
 * me(今ログイン中のユーザー)ルーター
 */
import * as sskts from '@motionpicture/sskts-domain';
import * as createDebug from 'debug';
import { Router } from 'express';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import { ACCEPTED, BAD_REQUEST, CREATED, FORBIDDEN, NO_CONTENT, NOT_FOUND, TOO_MANY_REQUESTS, UNAUTHORIZED } from 'http-status';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

import ordersRouter from './me/orders';
import profileRouter from './me/profile';

import authentication from '../../middlewares/authentication';
import permitScopes from '../../middlewares/permitScopes';
import requireMember from '../../middlewares/requireMember';
import validator from '../../middlewares/validator';

import * as redis from '../../../redis';

const meRouter = Router();

const debug = createDebug('sskts-api:routes:people:me');
const cognitoIdentityServiceProvider = new sskts.AWS.CognitoIdentityServiceProvider({
    apiVersion: 'latest',
    region: 'ap-northeast-1',
    credentials: new sskts.AWS.Credentials({
        accessKeyId: <string>process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: <string>process.env.AWS_SECRET_ACCESS_KEY
    })
});
const pecorinoAuthClient = new sskts.pecorinoapi.auth.ClientCredentials({
    domain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.PECORINO_API_CLIENT_ID,
    clientSecret: <string>process.env.PECORINO_API_CLIENT_SECRET,
    scopes: [],
    state: ''
});

meRouter.use(authentication);
meRouter.use(requireMember); // 自分のリソースへのアクセスなので、もちろんログイン必須

meRouter.use('/orders', ordersRouter);
meRouter.use('/profile', profileRouter);

/**
 * 連絡先検索
 * @deprecated
 */
meRouter.get(
    '/contacts',
    permitScopes(['aws.cognito.signin.user.admin', 'people.contacts', 'people.contacts.read-only']),
    async (req, res, next) => {
        try {
            const personRepo = new sskts.repository.Person(cognitoIdentityServiceProvider);
            const contact = await personRepo.getUserAttributesByAccessToken(req.accessToken);

            // format a phone number to a Japanese style
            const phoneUtil = PhoneNumberUtil.getInstance();
            const phoneNumber = phoneUtil.parse(contact.telephone, 'JP');
            contact.telephone = phoneUtil.format(phoneNumber, PhoneNumberFormat.NATIONAL);

            res.json(contact);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 会員プロフィール更新
 * @deprecated
 */
meRouter.put(
    '/contacts',
    permitScopes(['aws.cognito.signin.user.admin', 'people.contacts']),
    validator,
    async (req, res, next) => {
        try {
            // 日本語フォーマットで電話番号が渡される想定なので変換
            let formatedPhoneNumber: string;
            try {
                const phoneUtil = PhoneNumberUtil.getInstance();
                const phoneNumber = phoneUtil.parse(req.body.telephone, 'JP');
                if (!phoneUtil.isValidNumber(phoneNumber)) {
                    throw new Error('Invalid phone number format.');
                }

                formatedPhoneNumber = phoneUtil.format(phoneNumber, PhoneNumberFormat.E164);
            } catch (error) {
                next(new sskts.factory.errors.Argument('telephone', 'invalid phone number format'));

                return;
            }

            const personRepo = new sskts.repository.Person(cognitoIdentityServiceProvider);
            await personRepo.updateProfileByAccessToken({
                accessToken: req.accessToken,
                profile: {
                    ...req.body,
                    telephone: formatedPhoneNumber
                }
            });
            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 会員クレジットカード検索
 */
meRouter.get(
    '/creditCards',
    permitScopes(['aws.cognito.signin.user.admin', 'people.creditCards', 'people.creditCards.read-only']),
    async (req, res, next) => {
        try {
            const searchCardResults = await sskts.service.person.creditCard.find(<string>req.user.username)();
            debug('searchCardResults:', searchCardResults);
            res.json(searchCardResults);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 会員クレジットカード追加
 */
meRouter.post(
    '/creditCards',
    permitScopes(['aws.cognito.signin.user.admin', 'people.creditCards']),
    (__1, __2, next) => {
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const creditCard = await sskts.service.person.creditCard.save(<string>req.user.username, req.body)();
            res.status(CREATED).json(creditCard);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 会員クレジットカード削除
 */
meRouter.delete(
    '/creditCards/:cardSeq',
    permitScopes(['aws.cognito.signin.user.admin', 'people.creditCards']),
    validator,
    async (req, res, next) => {
        try {
            await sskts.service.person.creditCard.unsubscribe(<string>req.user.username, req.params.cardSeq)();
            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Pecorino口座開設
 */
meRouter.post(
    '/accounts',
    permitScopes(['aws.cognito.signin.user.admin', 'people.accounts']),
    (req, _, next) => {
        req.checkBody('name', 'invalid name').notEmpty().withMessage('name is required');
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const now = new Date();
            const accountNumberRepo = new sskts.repository.AccountNumber(redis.getClient());
            const accountService = new sskts.pecorinoapi.service.Account({
                endpoint: <string>process.env.PECORINO_API_ENDPOINT,
                auth: pecorinoAuthClient
            });
            const account = await sskts.service.account.open({
                name: req.body.name
            })({
                accountNumber: accountNumberRepo,
                accountService: accountService
            });
            const ownershipInfoRepo = new sskts.repository.OwnershipInfo(mongoose.connection);
            const ownershipInfo: sskts.factory.ownershipInfo.IOwnershipInfo<sskts.factory.pecorino.account.TypeOf> = {
                typeOf: 'OwnershipInfo',
                // 十分にユニーク
                identifier: `${sskts.factory.pecorino.account.TypeOf.Account}-${req.user.username}-${account.accountNumber}`,
                typeOfGood: {
                    typeOf: sskts.factory.pecorino.account.TypeOf.Account,
                    accountType: sskts.factory.accountType.Point,
                    accountNumber: account.accountNumber
                },
                ownedBy: req.agent,
                ownedFrom: now,
                // tslint:disable-next-line:no-magic-numbers
                ownedThrough: moment(now).add(100, 'years').toDate() // 十分に無期限
            };
            await ownershipInfoRepo.saveByIdentifier(ownershipInfo);
            res.status(CREATED).json(account);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Pecorino口座解約
 * 口座の状態を変更するだけで、所有口座リストから削除はしない
 */
meRouter.put(
    '/accounts/:accountNumber/close',
    permitScopes(['aws.cognito.signin.user.admin', 'people.accounts']),
    validator,
    async (req, res, next) => {
        try {
            // 口座所有権を検索
            const ownershipInfoRepo = new sskts.repository.OwnershipInfo(mongoose.connection);
            const accountOwnershipInfos = await ownershipInfoRepo.search4cinemasunshine({
                goodType: sskts.factory.pecorino.account.TypeOf.Account,
                ownedBy: req.user.username
            });
            const accountOwnershipInfo = accountOwnershipInfos.find((o) => o.typeOfGood.accountNumber === req.params.accountNumber);
            if (accountOwnershipInfo === undefined) {
                throw new sskts.factory.errors.NotFound('Account');
            }

            const accountService = new sskts.pecorinoapi.service.Account({
                endpoint: <string>process.env.PECORINO_API_ENDPOINT,
                auth: pecorinoAuthClient
            });
            await accountService.close({
                accountType: sskts.factory.accountType.Point,
                accountNumber: accountOwnershipInfo.typeOfGood.accountNumber
            });
            res.status(NO_CONTENT).end();
        } catch (error) {
            // PecorinoAPIのレスポンスステータスコードが4xxであればクライアントエラー
            if (error.name === 'PecorinoRequestError') {
                // Pecorino APIのステータスコード4xxをハンドリング
                const message = `${error.name}:${error.message}`;
                switch (error.code) {
                    case BAD_REQUEST: // 400
                        error = new sskts.factory.errors.Argument('accountNumber', message);
                        break;
                    case UNAUTHORIZED: // 401
                        error = new sskts.factory.errors.Unauthorized(message);
                        break;
                    case FORBIDDEN: // 403
                        error = new sskts.factory.errors.Forbidden(message);
                        break;
                    case NOT_FOUND: // 404
                        error = new sskts.factory.errors.NotFound(message);
                        break;
                    case TOO_MANY_REQUESTS: // 429
                        error = new sskts.factory.errors.RateLimitExceeded(message);
                        break;
                    default:
                        error = new sskts.factory.errors.ServiceUnavailable(message);
                }
            }

            next(error);
        }
    }
);

/**
 * Pecorino口座削除
 */
meRouter.delete(
    '/accounts/:accountNumber',
    permitScopes(['aws.cognito.signin.user.admin', 'people.accounts']),
    validator,
    async (req, res, next) => {
        try {
            const now = new Date();
            // 口座所有権を検索
            const ownershipInfoRepo = new sskts.repository.OwnershipInfo(mongoose.connection);
            const accountOwnershipInfos = await ownershipInfoRepo.search4cinemasunshine({
                goodType: sskts.factory.pecorino.account.TypeOf.Account,
                ownedBy: req.user.username,
                ownedAt: now
            });
            const accountOwnershipInfo = accountOwnershipInfos.find((o) => o.typeOfGood.accountNumber === req.params.accountNumber);
            if (accountOwnershipInfo === undefined) {
                throw new sskts.factory.errors.NotFound('Account');
            }

            // 所有期限を更新
            await ownershipInfoRepo.ownershipInfoModel.findOneAndUpdate(
                { identifier: accountOwnershipInfo.identifier },
                { ownedThrough: now }
            ).exec();
            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Pecorino口座検索
 */
meRouter.get(
    '/accounts',
    permitScopes(['aws.cognito.signin.user.admin', 'people.accounts.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const now = new Date();
            if (req.user.username === undefined) {
                throw new sskts.factory.errors.Forbidden('Login required');
            }

            // 口座所有権を検索
            const ownershipInfoRepo = new sskts.repository.OwnershipInfo(mongoose.connection);
            const accountOwnershipInfos = await ownershipInfoRepo.search4cinemasunshine({
                goodType: sskts.factory.pecorino.account.TypeOf.Account,
                ownedBy: req.user.username,
                ownedAt: now
            });
            let accounts: sskts.factory.pecorino.account.IAccount<sskts.factory.accountType.Point>[] = [];
            if (accountOwnershipInfos.length > 0) {
                const accountService = new sskts.pecorinoapi.service.Account({
                    endpoint: <string>process.env.PECORINO_API_ENDPOINT,
                    auth: pecorinoAuthClient
                });

                accounts = await accountService.search({
                    accountType: sskts.factory.accountType.Point,
                    accountNumbers: accountOwnershipInfos.map((o) => o.typeOfGood.accountNumber),
                    statuses: [],
                    limit: 100
                });
            }
            res.json(accounts);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Pecorino取引履歴検索
 */
meRouter.get(
    '/accounts/:accountNumber/actions/moneyTransfer',
    permitScopes(['aws.cognito.signin.user.admin', 'people.accounts.actions.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const now = new Date();
            // 口座所有権を検索
            const ownershipInfoRepo = new sskts.repository.OwnershipInfo(mongoose.connection);
            const accountOwnershipInfos = await ownershipInfoRepo.search4cinemasunshine({
                goodType: sskts.factory.pecorino.account.TypeOf.Account,
                ownedBy: req.user.username,
                ownedAt: now
            });
            const accountOwnershipInfo = accountOwnershipInfos.find((o) => o.typeOfGood.accountNumber === req.params.accountNumber);
            if (accountOwnershipInfo === undefined) {
                throw new sskts.factory.errors.NotFound('Account');
            }

            const accountService = new sskts.pecorinoapi.service.Account({
                endpoint: <string>process.env.PECORINO_API_ENDPOINT,
                auth: pecorinoAuthClient
            });
            const actions = await accountService.searchMoneyTransferActions({
                accountType: sskts.factory.accountType.Point,
                accountNumber: accountOwnershipInfo.typeOfGood.accountNumber
            });
            res.json(actions);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ユーザーの所有権検索
 */
meRouter.get(
    '/ownershipInfos/:goodType',
    permitScopes(['aws.cognito.signin.user.admin', 'people.ownershipInfos', 'people.ownershipInfos.read-only']),
    (_1, _2, next) => {
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const repository = new sskts.repository.OwnershipInfo(mongoose.connection);
            const ownershipInfos = await repository.search4cinemasunshine({
                goodType: req.params.goodType,
                ownedBy: req.user.username,
                ownedAt: new Date()
            });
            res.json(ownershipInfos);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 会員プログラム登録
 */
meRouter.put(
    '/ownershipInfos/programMembership/register',
    permitScopes(['aws.cognito.signin.user.admin', 'people.ownershipInfos']),
    (_1, _2, next) => {
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const task = await sskts.service.programMembership.createRegisterTask({
                agent: req.agent,
                seller: {
                    typeOf: req.body.sellerType,
                    id: req.body.sellerId
                },
                programMembershipId: req.body.programMembershipId,
                offerIdentifier: req.body.offerIdentifier
            })({
                seller: new sskts.repository.Seller(mongoose.connection),
                programMembership: new sskts.repository.ProgramMembership(mongoose.connection),
                task: new sskts.repository.Task(mongoose.connection)
            });
            // 会員登録タスクとして受け入れられたのでACCEPTED
            res.status(ACCEPTED).json(task);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 会員プログラム登録解除
 * 所有権のidentifierをURLで指定
 */
meRouter.put(
    '/ownershipInfos/programMembership/:identifier/unRegister',
    permitScopes(['aws.cognito.signin.user.admin', 'people.ownershipInfos']),
    (_1, _2, next) => {
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const task = await sskts.service.programMembership.createUnRegisterTask({
                agent: req.agent,
                ownershipInfoIdentifier: req.params.identifier
            })({
                ownershipInfo: new sskts.repository.OwnershipInfo(mongoose.connection),
                task: new sskts.repository.Task(mongoose.connection)
            });
            // 会員登録解除タスクとして受け入れられたのでACCEPTED
            res.status(ACCEPTED).json(task);
        } catch (error) {
            next(error);
        }
    }
);

export default meRouter;
