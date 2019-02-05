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
const sskts = require("@motionpicture/sskts-domain");
const express_1 = require("express");
const mongoose = require("mongoose");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const cognitoIdentityServiceProvider = new sskts.AWS.CognitoIdentityServiceProvider({
    apiVersion: 'latest',
    region: 'ap-northeast-1',
    credentials: new sskts.AWS.Credentials({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    })
});
const pecorinoAuthClient = new sskts.pecorinoapi.auth.ClientCredentials({
    domain: process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.PECORINO_API_CLIENT_ID,
    clientSecret: process.env.PECORINO_API_CLIENT_SECRET,
    scopes: [],
    state: ''
});
const peopleRouter = express_1.Router();
peopleRouter.use(authentication_1.default);
/**
 * 会員検索
 */
peopleRouter.get('', permitScopes_1.default(['admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const personRepo = new sskts.repository.Person(cognitoIdentityServiceProvider);
        const people = yield personRepo.search({
            userPooId: process.env.COGNITO_USER_POOL_ID,
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
        const personRepo = new sskts.repository.Person(cognitoIdentityServiceProvider);
        const person = yield personRepo.findById({
            userPooId: process.env.COGNITO_USER_POOL_ID,
            userId: req.params.id
        });
        res.json(person);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * クレジットカード検索
 */
peopleRouter.get('/:id/creditCards', permitScopes_1.default(['admin']), (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const personRepo = new sskts.repository.Person(cognitoIdentityServiceProvider);
        const person = yield personRepo.findById({
            userPooId: process.env.COGNITO_USER_POOL_ID,
            userId: req.params.id
        });
        if (person.memberOf === undefined) {
            throw new sskts.factory.errors.NotFound('Person');
        }
        const searchCardResults = yield sskts.service.person.creditCard.find(person.memberOf.membershipNumber)();
        res.json(searchCardResults);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * ポイント口座検索
 */
peopleRouter.get('/:id/accounts', permitScopes_1.default(['admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const personRepo = new sskts.repository.Person(cognitoIdentityServiceProvider);
        const person = yield personRepo.findById({
            userPooId: process.env.COGNITO_USER_POOL_ID,
            userId: req.params.id
        });
        if (person.memberOf === undefined) {
            throw new sskts.factory.errors.NotFound('Person');
        }
        // 口座所有権を検索
        const ownershipInfoRepo = new sskts.repository.OwnershipInfo(mongoose.connection);
        const accountOwnershipInfos = yield ownershipInfoRepo.search4cinemasunshine({
            goodType: sskts.factory.pecorino.account.TypeOf.Account,
            ownedBy: person.memberOf.membershipNumber,
            ownedAt: new Date()
        });
        let accounts = [];
        if (accountOwnershipInfos.length > 0) {
            const accountService = new sskts.pecorinoapi.service.Account({
                endpoint: process.env.PECORINO_API_ENDPOINT,
                auth: pecorinoAuthClient
            });
            accounts = yield accountService.search({
                accountType: sskts.factory.accountType.Point,
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
exports.default = peopleRouter;
