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
 * 自分の口座ルーター
 */
const cinerino = require("@cinerino/domain");
const express_1 = require("express");
const http_status_1 = require("http-status");
const moment = require("moment");
const mongoose = require("mongoose");
const permitScopes_1 = require("../../../../middlewares/permitScopes");
const validator_1 = require("../../../../middlewares/validator");
const redis = require("../../../../../redis");
const accountsRouter = express_1.Router();
const pecorinoAuthClient = new cinerino.pecorinoapi.auth.ClientCredentials({
    domain: process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.PECORINO_CLIENT_ID,
    clientSecret: process.env.PECORINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});
/**
 * 口座開設
 */
accountsRouter.post('/:accountType', permitScopes_1.default(['aws.cognito.signin.user.admin']), (req, _, next) => {
    req.checkBody('name', 'invalid name')
        .notEmpty()
        .withMessage('name is required');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const now = new Date();
        const accountNumberRepo = new cinerino.repository.AccountNumber(redis.getClient());
        const accountService = new cinerino.pecorinoapi.service.Account({
            endpoint: process.env.PECORINO_ENDPOINT,
            auth: pecorinoAuthClient
        });
        const account = yield cinerino.service.account.openWithoutOwnershipInfo({
            name: req.body.name,
            accountType: cinerino.factory.accountType.Point
        })({
            accountNumber: accountNumberRepo,
            accountService: accountService
        });
        const ownershipInfoRepo = new cinerino.repository.OwnershipInfo(mongoose.connection);
        // tslint:disable-next-line:max-line-length
        const ownershipInfo = {
            id: '',
            typeOf: 'OwnershipInfo',
            // 十分にユニーク
            identifier: `${cinerino.factory.pecorino.account.TypeOf.Account}-${req.user.username}-${account.accountNumber}`,
            typeOfGood: {
                typeOf: cinerino.factory.ownershipInfo.AccountGoodType.Account,
                accountType: req.params.accountType,
                accountNumber: account.accountNumber
            },
            ownedBy: req.agent,
            ownedFrom: now,
            // tslint:disable-next-line:no-magic-numbers
            ownedThrough: moment(now).add(100, 'years').toDate() // 十分に無期限
        };
        yield ownershipInfoRepo.saveByIdentifier(ownershipInfo);
        res.status(http_status_1.CREATED).json(Object.assign({}, ownershipInfo, { typeOfGood: account }));
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 口座解約
 * 口座の状態を変更するだけで、所有口座リストから削除はしない
 */
accountsRouter.put('/:accountType/:accountNumber/close', permitScopes_1.default(['aws.cognito.signin.user.admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // 口座所有権を検索
        const ownershipInfoRepo = new cinerino.repository.OwnershipInfo(mongoose.connection);
        const accountOwnershipInfos = yield ownershipInfoRepo.search({
            typeOfGood: {
                typeOf: cinerino.factory.ownershipInfo.AccountGoodType.Account,
                accountType: req.params.accountType
            },
            ownedBy: {
                id: req.user.sub
            }
        });
        const accountOwnershipInfo = accountOwnershipInfos.find((o) => o.typeOfGood.accountNumber === req.params.accountNumber);
        if (accountOwnershipInfo === undefined) {
            throw new cinerino.factory.errors.NotFound('Account');
        }
        const accountService = new cinerino.pecorinoapi.service.Account({
            endpoint: process.env.PECORINO_ENDPOINT,
            auth: pecorinoAuthClient
        });
        yield accountService.close({
            accountType: req.params.accountType,
            accountNumber: accountOwnershipInfo.typeOfGood.accountNumber
        });
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 口座取引履歴検索
 */
accountsRouter.get('/actions/moneyTransfer', permitScopes_1.default(['aws.cognito.signin.user.admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const now = new Date();
        // 口座所有権を検索
        const ownershipInfoRepo = new cinerino.repository.OwnershipInfo(mongoose.connection);
        const accountOwnershipInfos = yield ownershipInfoRepo.search({
            typeOfGood: {
                typeOf: cinerino.factory.ownershipInfo.AccountGoodType.Account,
                accountType: req.query.accountType
            },
            ownedBy: {
                id: req.user.sub
            },
            ownedFrom: now,
            ownedThrough: now
        });
        const accountOwnershipInfo = accountOwnershipInfos.find((o) => o.typeOfGood.accountNumber === req.query.accountNumber);
        if (accountOwnershipInfo === undefined) {
            throw new cinerino.factory.errors.NotFound('Account');
        }
        const accountService = new cinerino.pecorinoapi.service.Account({
            endpoint: process.env.PECORINO_ENDPOINT,
            auth: pecorinoAuthClient
        });
        const searchResult = yield accountService.searchMoneyTransferActionsWithTotalCount(req.query);
        res.set('X-Total-Count', searchResult.totalCount.toString());
        res.json(searchResult.data);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = accountsRouter;
