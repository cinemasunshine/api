/**
 * 会員ルーター
 */
import * as sskts from '@motionpicture/sskts-domain';
import { Router } from 'express';
import * as mongoose from 'mongoose';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

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
            const personRepo = new sskts.repository.Person(cognitoIdentityServiceProvider);
            const people = await personRepo.search({
                userPooId: <string>process.env.COGNITO_USER_POOL_ID,
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
            const personRepo = new sskts.repository.Person(cognitoIdentityServiceProvider);
            const person = await personRepo.findById({
                userPooId: <string>process.env.COGNITO_USER_POOL_ID,
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
            const personRepo = new sskts.repository.Person(cognitoIdentityServiceProvider);
            const person = await personRepo.findById({
                userPooId: <string>process.env.COGNITO_USER_POOL_ID,
                userId: req.params.id
            });
            if (person.memberOf === undefined) {
                throw new sskts.factory.errors.NotFound('Person');
            }

            const query = req.query;
            const goodType = query.typeOfGood.typeOf;
            let ownershipInfos: sskts.factory.ownershipInfo.IOwnershipInfo<typeof goodType>[];
            const searchConditions: sskts.factory.ownershipInfo.ISearchConditions<typeof goodType> = {
                // tslint:disable-next-line:no-magic-numbers
                // limit: (query.limit !== undefined) ? Math.min(query.limit, 100) : 100,
                // page: (query.page !== undefined) ? Math.max(query.page, 1) : 1,
                // sort: (query.sort !== undefined) ? query.sort : { ownedFrom: cinerino.factory.sortType.Descending },
                ownedBy: person.memberOf.membershipNumber,
                ownedAt: new Date(),
                // ownedFrom: (query.ownedFrom !== undefined) ? moment(query.ownedFrom)
                //     .toDate() : undefined,
                // ownedThrough: (query.ownedThrough !== undefined) ? moment(query.ownedThrough)
                //     .toDate() : undefined,
                goodType: goodType
            };

            const ownershipInfoRepo = new sskts.repository.OwnershipInfo(mongoose.connection);
            // const totalCount = await ownershipInfoRepo.count(searchConditions);
            ownershipInfos = await ownershipInfoRepo.search4cinemasunshine<typeof goodType>(searchConditions);
            const totalCount = ownershipInfos.length;

            switch (goodType) {
                case sskts.factory.pecorino.account.TypeOf.Account:
                    const accountService = new sskts.pecorinoapi.service.Account({
                        endpoint: <string>process.env.PECORINO_API_ENDPOINT,
                        auth: pecorinoAuthClient
                    });

                    const accounts = await accountService.search({
                        accountType: sskts.factory.accountType.Point,
                        accountNumbers: ownershipInfos.map((o) => (<any>o.typeOfGood).accountNumber),
                        statuses: [],
                        limit: 100
                    });
                    ownershipInfos = ownershipInfos.map((o) => {
                        const account = accounts.find((a) => a.accountNumber === (<any>o.typeOfGood).accountNumber);
                        if (account === undefined) {
                            throw new sskts.factory.errors.NotFound('Account');
                        }

                        return { ...o, typeOfGood: account };
                    });

                    break;
                // case sskts.factory.chevre.reservationType.EventReservation:
                //     const reservationService = new cinerino.chevre.service.Reservation({
                //         endpoint: <string>process.env.CHEVRE_ENDPOINT,
                //         auth: chevreAuthClient
                //     });
                //     ownershipInfos = await cinerino.service.reservation.searchScreeningEventReservations(
                //         { ...searchConditions, typeOfGood: typeOfGood }
                //     )({
                //         ownershipInfo: ownershipInfoRepo,
                //         reservationService: reservationService
                //     });
                //     break;

                default:
                    throw new sskts.factory.errors.Argument('typeOfGood.typeOf', 'Unknown good type');
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
            const personRepo = new sskts.repository.Person(cognitoIdentityServiceProvider);
            const person = await personRepo.findById({
                userPooId: <string>process.env.COGNITO_USER_POOL_ID,
                userId: req.params.id
            });
            if (person.memberOf === undefined) {
                throw new sskts.factory.errors.NotFound('Person');
            }
            const searchCardResults = await sskts.service.person.creditCard.find(<string>person.memberOf.membershipNumber)();
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
            const personRepo = new sskts.repository.Person(cognitoIdentityServiceProvider);
            const person = await personRepo.findById({
                userPooId: <string>process.env.COGNITO_USER_POOL_ID,
                userId: req.params.id
            });
            if (person.memberOf === undefined) {
                throw new sskts.factory.errors.NotFound('Person');
            }
            const searchCardResults = await sskts.service.person.creditCard.find(<string>person.memberOf.membershipNumber)();
            res.json(searchCardResults);
        } catch (error) {
            next(error);
        }
    }
);
/**
 * ポイント口座検索
 */
peopleRouter.get(
    '/:id/accounts',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const personRepo = new sskts.repository.Person(cognitoIdentityServiceProvider);
            const person = await personRepo.findById({
                userPooId: <string>process.env.COGNITO_USER_POOL_ID,
                userId: req.params.id
            });
            if (person.memberOf === undefined) {
                throw new sskts.factory.errors.NotFound('Person');
            }
            // 口座所有権を検索
            const ownershipInfoRepo = new sskts.repository.OwnershipInfo(mongoose.connection);
            const accountOwnershipInfos = await ownershipInfoRepo.search4cinemasunshine({
                goodType: sskts.factory.pecorino.account.TypeOf.Account,
                ownedBy: person.memberOf.membershipNumber,
                ownedAt: new Date()
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
export default peopleRouter;
