/**
 * 会員ルーター
 */
import * as cinerino from '@cinerino/domain';
import { Router } from 'express';
import { NO_CONTENT } from 'http-status';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const cognitoIdentityServiceProvider = new cinerino.AWS.CognitoIdentityServiceProvider({
    apiVersion: 'latest',
    region: 'ap-northeast-1',
    credentials: new cinerino.AWS.Credentials({
        accessKeyId: <string>process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: <string>process.env.AWS_SECRET_ACCESS_KEY
    })
});
const pecorinoAuthClient = new cinerino.pecorinoapi.auth.ClientCredentials({
    domain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.PECORINO_CLIENT_ID,
    clientSecret: <string>process.env.PECORINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});

const USER_POOL_ID = <string>process.env.COGNITO_USER_POOL_ID;

const peopleRouter = Router();
peopleRouter.use(authentication);
/**
 * 会員検索
 */
peopleRouter.get(
    '',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const personRepo = new cinerino.repository.Person(cognitoIdentityServiceProvider);
            const people = await personRepo.search({
                userPooId: USER_POOL_ID,
                id: req.query.id,
                username: req.query.username,
                email: req.query.email,
                telephone: req.query.telephone,
                givenName: req.query.givenName,
                familyName: req.query.familyName
            });
            res.set('X-Total-Count', people.length.toString());
            res.json(people);
        } catch (error) {
            next(error);
        }
    }
);
/**
 * IDで検索
 */
peopleRouter.get(
    '/:id',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const personRepo = new cinerino.repository.Person(cognitoIdentityServiceProvider);
            const person = await personRepo.findById({
                userPooId: USER_POOL_ID,
                userId: req.params.id
            });
            res.json(person);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 所有権検索
 */
peopleRouter.get(
    '/:id/ownershipInfos',
    permitScopes(['admin']),
    (_1, _2, next) => {
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const query = <cinerino.factory.ownershipInfo.ISearchConditions<any>>req.query;
            const typeOfGood = query.typeOfGood;
            let ownershipInfos: cinerino.factory.ownershipInfo.IOwnershipInfo<any>[];
            const searchConditions: cinerino.factory.ownershipInfo.ISearchConditions<any> = {
                // tslint:disable-next-line:no-magic-numbers
                limit: (query.limit !== undefined) ? Math.min(query.limit, 100) : 100,
                page: (query.page !== undefined) ? Math.max(query.page, 1) : 1,
                sort: query.sort,
                ownedBy: { id: req.params.id },
                ownedFrom: (query.ownedFrom !== undefined) ? moment(query.ownedFrom)
                    .toDate() : undefined,
                ownedThrough: (query.ownedThrough !== undefined) ? moment(query.ownedThrough)
                    .toDate() : undefined,
                typeOfGood: typeOfGood
            };

            const ownershipInfoRepo = new cinerino.repository.OwnershipInfo(mongoose.connection);
            const totalCount = await ownershipInfoRepo.count(searchConditions);
            ownershipInfos = await ownershipInfoRepo.search(searchConditions);

            switch (searchConditions.typeOfGood.typeOf) {
                case cinerino.factory.ownershipInfo.AccountGoodType.Account:
                    const accountService = new cinerino.pecorinoapi.service.Account({
                        endpoint: <string>process.env.PECORINO_ENDPOINT,
                        auth: pecorinoAuthClient
                    });

                    const accounts = await accountService.search({
                        accountType: searchConditions.typeOfGood.accountType,
                        accountNumbers: ownershipInfos.map((o) => o.typeOfGood.accountNumber),
                        statuses: [],
                        limit: 100
                    });
                    ownershipInfos = ownershipInfos.map((o) => {
                        const account = accounts.find((a) => a.accountNumber === o.typeOfGood.accountNumber);
                        if (account === undefined) {
                            throw new cinerino.factory.errors.NotFound('Account');
                        }

                        return { ...o, typeOfGood: account };
                    });

                    break;

                case cinerino.factory.chevre.reservationType.EventReservation:
                    // typeOfGoodに予約内容がすべて含まれているので、外部サービスに問い合わせ不要
                    // const reservationService = new cinerino.chevre.service.Reservation({
                    //     endpoint: <string>process.env.CHEVRE_ENDPOINT,
                    //     auth: chevreAuthClient
                    // });
                    // ownershipInfos = await cinerino.service.reservation.searchScreeningEventReservations(
                    //     { ...searchConditions, typeOfGood: typeOfGood }
                    // )({
                    //     ownershipInfo: ownershipInfoRepo,
                    //     reservationService: reservationService
                    // });
                    break;

                default:
                // no op
                // throw new cinerino.factory.errors.Argument('typeOfGood.typeOf', 'Unknown good type');
            }

            res.set('X-Total-Count', totalCount.toString());
            res.json(ownershipInfos);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * クレジットカード検索
 */
peopleRouter.get(
    '/:id/ownershipInfos/creditCards',
    permitScopes(['admin']),
    async (req, res, next) => {
        try {
            const personRepo = new cinerino.repository.Person(cognitoIdentityServiceProvider);
            const person = await personRepo.findById({
                userPooId: USER_POOL_ID,
                userId: req.params.id
            });
            if (person.memberOf === undefined) {
                throw new cinerino.factory.errors.NotFound('Person');
            }
            const searchCardResults = await cinerino.service.person.creditCard.find(<string>person.memberOf.membershipNumber)();
            res.json(searchCardResults);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * クレジットカード検索
 * @deprecated Use /:id/ownershipInfos/creditCards
 */
peopleRouter.get(
    '/:id/creditCards',
    permitScopes(['admin']),
    async (req, res, next) => {
        try {
            const personRepo = new cinerino.repository.Person(cognitoIdentityServiceProvider);
            const person = await personRepo.findById({
                userPooId: USER_POOL_ID,
                userId: req.params.id
            });
            if (person.memberOf === undefined) {
                throw new cinerino.factory.errors.NotFound('Person');
            }
            const searchCardResults = await cinerino.service.person.creditCard.find(<string>person.memberOf.membershipNumber)();
            res.json(searchCardResults);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ポイント口座検索
 * @deprecated
 */
peopleRouter.get(
    '/:id/accounts',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const now = new Date();

            // 口座所有権を検索
            const ownershipInfoRepo = new cinerino.repository.OwnershipInfo(mongoose.connection);
            const accountOwnershipInfos = await ownershipInfoRepo.search<cinerino.factory.ownershipInfo.AccountGoodType.Account>({
                typeOfGood: {
                    typeOf: cinerino.factory.ownershipInfo.AccountGoodType.Account,
                    accountType: cinerino.factory.accountType.Point
                },
                ownedBy: {
                    id: req.params.id
                },
                ownedFrom: now,
                ownedThrough: now
            });
            let accounts: cinerino.factory.pecorino.account.IAccount<cinerino.factory.accountType.Point>[] = [];
            if (accountOwnershipInfos.length > 0) {
                const accountService = new cinerino.pecorinoapi.service.Account({
                    endpoint: <string>process.env.PECORINO_ENDPOINT,
                    auth: pecorinoAuthClient
                });
                accounts = await accountService.search({
                    accountType: cinerino.factory.accountType.Point,
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
 * プロフィール検索
 */
peopleRouter.get(
    '/:id/profile',
    permitScopes(['admin']),
    async (req, res, next) => {
        try {
            const personRepo = new cinerino.repository.Person(cognitoIdentityServiceProvider);
            const person = await personRepo.findById({
                userPooId: USER_POOL_ID,
                userId: req.params.id
            });

            if (person.memberOf === undefined) {
                throw new cinerino.factory.errors.NotFound('Person.memberOf');
            }

            const username = person.memberOf.membershipNumber;
            if (username === undefined) {
                throw new cinerino.factory.errors.NotFound('Person.memberOf.membershipNumber');
            }

            const profile = await personRepo.getUserAttributes({
                userPooId: USER_POOL_ID,
                username: username
            });

            res.json(profile);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * プロフィール更新
 */
peopleRouter.patch(
    '/:id/profile',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const personRepo = new cinerino.repository.Person(cognitoIdentityServiceProvider);
            const person = await personRepo.findById({
                userPooId: USER_POOL_ID,
                userId: req.params.id
            });

            if (person.memberOf === undefined) {
                throw new cinerino.factory.errors.NotFound('Person.memberOf');
            }

            const username = person.memberOf.membershipNumber;
            if (username === undefined) {
                throw new cinerino.factory.errors.NotFound('Person.memberOf.membershipNumber');
            }

            await personRepo.updateProfile({
                userPooId: USER_POOL_ID,
                username: username,
                profile: req.body
            });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default peopleRouter;
