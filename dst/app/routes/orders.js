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
 * 注文ルーター
 */
const sskts = require("@motionpicture/sskts-domain");
const express_1 = require("express");
const google_libphonenumber_1 = require("google-libphonenumber");
const mongoose = require("mongoose");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const ordersRouter = express_1.Router();
ordersRouter.use(authentication_1.default);
/**
 * 確認番号と電話番号で注文照会
 */
ordersRouter.post('/findByOrderInquiryKey', permitScopes_1.default(['aws.cognito.signin.user.admin', 'orders', 'orders.read-only']), (req, _, next) => {
    req.checkBody('theaterCode', 'invalid theaterCode').notEmpty().withMessage('theaterCode is required');
    req.checkBody('confirmationNumber', 'invalid confirmationNumber').notEmpty().withMessage('confirmationNumber is required');
    req.checkBody('telephone', 'invalid telephone').notEmpty().withMessage('telephone is required');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const phoneUtil = google_libphonenumber_1.PhoneNumberUtil.getInstance();
        const phoneNumber = phoneUtil.parse(req.body.telephone, 'JP');
        if (!phoneUtil.isValidNumber(phoneNumber)) {
            next(new sskts.factory.errors.Argument('telephone', 'Invalid phone number format'));
            return;
        }
        const key = {
            theaterCode: req.body.theaterCode,
            confirmationNumber: req.body.confirmationNumber,
            telephone: phoneUtil.format(phoneNumber, google_libphonenumber_1.PhoneNumberFormat.E164)
        };
        const repository = new sskts.repository.Order(mongoose.connection);
        const order = yield repository.findByLocationBranchCodeAndReservationNumber(key);
        res.json(order);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 注文に対するアクション検索
 */
ordersRouter.get('/:orderNumber/actions', permitScopes_1.default(['admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const actionRepo = new sskts.repository.Action(mongoose.connection);
        const actions = yield actionRepo.searchByOrderNumber({
            orderNumber: req.params.orderNumber,
            sort: req.query.sort
        });
        res.json(actions);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 注文検索
 */
ordersRouter.get('', permitScopes_1.default(['admin']), (req, __2, next) => {
    req.checkQuery('orderDateFrom')
        .optional()
        .isISO8601()
        .withMessage('must be ISO8601')
        .toDate();
    req.checkQuery('orderDateThrough')
        .optional()
        .isISO8601()
        .withMessage('must be ISO8601')
        .toDate();
    req.checkQuery('acceptedOffers.itemOffered.reservationFor.inSessionFrom')
        .optional()
        .isISO8601()
        .withMessage('must be ISO8601')
        .toDate();
    req.checkQuery('acceptedOffers.itemOffered.reservationFor.inSessionThrough')
        .optional()
        .isISO8601()
        .withMessage('must be ISO8601')
        .toDate();
    req.checkQuery('acceptedOffers.itemOffered.reservationFor.startFrom')
        .optional()
        .isISO8601()
        .withMessage('must be ISO8601')
        .toDate();
    req.checkQuery('acceptedOffers.itemOffered.reservationFor.startThrough')
        .optional()
        .isISO8601()
        .withMessage('must be ISO8601')
        .toDate();
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const orderRepo = new sskts.repository.Order(mongoose.connection);
        const searchConditions = Object.assign({}, req.query, { 
            // tslint:disable-next-line:no-magic-numbers
            limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100, page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1, sort: (req.query.sort !== undefined) ? req.query.sort : { orderDate: sskts.factory.sortType.Descending } });
        const orders = yield orderRepo.search(searchConditions);
        const totalCount = yield orderRepo.count(searchConditions);
        res.set('X-Total-Count', totalCount.toString());
        res.json(orders);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = ordersRouter;
