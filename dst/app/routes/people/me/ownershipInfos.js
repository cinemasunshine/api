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
 * 自分の所有権ルーター
 */
const cinerino = require("@cinerino/domain");
const express_1 = require("express");
const moment = require("moment");
const mongoose = require("mongoose");
const permitScopes_1 = require("../../../middlewares/permitScopes");
const validator_1 = require("../../../middlewares/validator");
// import * as redis from '../../../../redis';
const accounts_1 = require("./ownershipInfos/accounts");
const creditCards_1 = require("./ownershipInfos/creditCards");
const reservations_1 = require("./ownershipInfos/reservations");
// const CODE_EXPIRES_IN_SECONDS = Number(process.env.CODE_EXPIRES_IN_SECONDS);
// const chevreAuthClient = new cinerino.chevre.auth.ClientCredentials({
//     domain: <string>process.env.CHEVRE_AUTHORIZE_SERVER_DOMAIN,
//     clientId: <string>process.env.CHEVRE_CLIENT_ID,
//     clientSecret: <string>process.env.CHEVRE_CLIENT_SECRET,
//     scopes: [],
//     state: ''
// });
const pecorinoAuthClient = new cinerino.pecorinoapi.auth.ClientCredentials({
    domain: process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.PECORINO_CLIENT_ID,
    clientSecret: process.env.PECORINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});
const ownershipInfosRouter = express_1.Router();
ownershipInfosRouter.use('/accounts', accounts_1.default);
ownershipInfosRouter.use('/creditCards', creditCards_1.default);
ownershipInfosRouter.use('/reservations', reservations_1.default);
/**
 * 所有権検索
 */
ownershipInfosRouter.get('', permitScopes_1.default(['aws.cognito.signin.user.admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const query = req.query;
        const typeOfGood = query.typeOfGood;
        let ownershipInfos;
        const searchConditions = {
            // tslint:disable-next-line:no-magic-numbers
            limit: (query.limit !== undefined) ? Math.min(query.limit, 100) : 100,
            page: (query.page !== undefined) ? Math.max(query.page, 1) : 1,
            sort: query.sort,
            ownedBy: { id: req.user.sub },
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
exports.default = ownershipInfosRouter;
