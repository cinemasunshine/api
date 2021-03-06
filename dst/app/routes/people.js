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
 * 会員ルーター
 */
const cinerino = require("@cinerino/domain");
const express_1 = require("express");
const http_status_1 = require("http-status");
const moment = require("moment");
const mongoose = require("mongoose");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const cognitoIdentityServiceProvider = new cinerino.AWS.CognitoIdentityServiceProvider({
    apiVersion: 'latest',
    region: 'ap-northeast-1',
    credentials: new cinerino.AWS.Credentials({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    })
});
const pecorinoAuthClient = new cinerino.pecorinoapi.auth.ClientCredentials({
    domain: process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.PECORINO_CLIENT_ID,
    clientSecret: process.env.PECORINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const peopleRouter = express_1.Router();
peopleRouter.use(authentication_1.default);
/**
 * 会員検索
 */
peopleRouter.get('', permitScopes_1.default(['admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const personRepo = new cinerino.repository.Person(cognitoIdentityServiceProvider);
        const people = yield personRepo.search({
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
    }
    catch (error) {
        next(error);
    }
}));
/**
 * IDで検索
 */
peopleRouter.get('/:id', permitScopes_1.default(['admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const personRepo = new cinerino.repository.Person(cognitoIdentityServiceProvider);
        const person = yield personRepo.findById({
            userPooId: USER_POOL_ID,
            userId: req.params.id
        });
        res.json(person);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 所有権検索
 */
peopleRouter.get('/:id/ownershipInfos', permitScopes_1.default(['admin']), (_1, _2, next) => {
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const query = req.query;
        const typeOfGood = query.typeOfGood;
        let ownershipInfos;
        const searchConditions = {
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
        const totalCount = yield ownershipInfoRepo.count(searchConditions);
        ownershipInfos = yield ownershipInfoRepo.search(searchConditions);
        switch (searchConditions.typeOfGood.typeOf) {
            case cinerino.factory.ownershipInfo.AccountGoodType.Account:
                const accountService = new cinerino.pecorinoapi.service.Account({
                    endpoint: process.env.PECORINO_ENDPOINT,
                    auth: pecorinoAuthClient
                });
                const accounts = yield accountService.search({
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
                    return Object.assign({}, o, { typeOfGood: account });
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
    }
    catch (error) {
        next(error);
    }
}));
/**
 * クレジットカード検索
 */
peopleRouter.get('/:id/ownershipInfos/creditCards', permitScopes_1.default(['admin']), (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const personRepo = new cinerino.repository.Person(cognitoIdentityServiceProvider);
        const person = yield personRepo.findById({
            userPooId: USER_POOL_ID,
            userId: req.params.id
        });
        if (person.memberOf === undefined) {
            throw new cinerino.factory.errors.NotFound('Person');
        }
        const searchCardResults = yield cinerino.service.person.creditCard.find(person.memberOf.membershipNumber)();
        res.json(searchCardResults);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * クレジットカード検索
 * @deprecated Use /:id/ownershipInfos/creditCards
 */
peopleRouter.get('/:id/creditCards', permitScopes_1.default(['admin']), (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const personRepo = new cinerino.repository.Person(cognitoIdentityServiceProvider);
        const person = yield personRepo.findById({
            userPooId: USER_POOL_ID,
            userId: req.params.id
        });
        if (person.memberOf === undefined) {
            throw new cinerino.factory.errors.NotFound('Person');
        }
        const searchCardResults = yield cinerino.service.person.creditCard.find(person.memberOf.membershipNumber)();
        res.json(searchCardResults);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * ポイント口座検索
 * @deprecated
 */
peopleRouter.get('/:id/accounts', permitScopes_1.default(['admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const now = new Date();
        // 口座所有権を検索
        const ownershipInfoRepo = new cinerino.repository.OwnershipInfo(mongoose.connection);
        const accountOwnershipInfos = yield ownershipInfoRepo.search({
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
        let accounts = [];
        if (accountOwnershipInfos.length > 0) {
            const accountService = new cinerino.pecorinoapi.service.Account({
                endpoint: process.env.PECORINO_ENDPOINT,
                auth: pecorinoAuthClient
            });
            accounts = yield accountService.search({
                accountType: cinerino.factory.accountType.Point,
                accountNumbers: accountOwnershipInfos.map((o) => o.typeOfGood.accountNumber),
                statuses: [],
                limit: 100
            });
        }
        res.json(accounts);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * プロフィール検索
 */
peopleRouter.get('/:id/profile', permitScopes_1.default(['admin']), (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const personRepo = new cinerino.repository.Person(cognitoIdentityServiceProvider);
        const person = yield personRepo.findById({
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
        const profile = yield personRepo.getUserAttributes({
            userPooId: USER_POOL_ID,
            username: username
        });
        res.json(profile);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * プロフィール更新
 */
peopleRouter.patch('/:id/profile', permitScopes_1.default(['admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const personRepo = new cinerino.repository.Person(cognitoIdentityServiceProvider);
        const person = yield personRepo.findById({
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
        yield personRepo.updateProfile({
            userPooId: USER_POOL_ID,
            username: username,
            profile: req.body
        });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
exports.default = peopleRouter;
