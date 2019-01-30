"use strict";
/**
 * 組織ルーター
 *
 * @ignore
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const organizationsRouter = express_1.Router();
const sskts = require("@motionpicture/sskts-domain");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
organizationsRouter.use(authentication_1.default);
organizationsRouter.get('/movieTheater/:branchCode', permitScopes_1.default(['aws.cognito.signin.user.admin', 'organizations', 'organizations.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const repository = new sskts.repository.Organization(sskts.mongoose.connection);
        const movieTheater = yield repository.findMovieTheaterByBranchCode(req.params.branchCode);
        // 互換性維持のためgmoInfoをpaymentAcceptedから情報追加
        if (Array.isArray(movieTheater.paymentAccepted)) {
            const creditCardPaymentAccepted = movieTheater.paymentAccepted.find((p) => {
                return p.paymentMethodType === sskts.factory.paymentMethodType.CreditCard;
            });
            if (creditCardPaymentAccepted !== undefined) {
                movieTheater.gmoInfo = creditCardPaymentAccepted.gmoInfo;
            }
        }
        res.json(movieTheater);
    }
    catch (error) {
        next(error);
    }
}));
organizationsRouter.get('/movieTheater', permitScopes_1.default(['aws.cognito.signin.user.admin', 'organizations', 'organizations.read-only']), validator_1.default, (__, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const repository = new sskts.repository.Organization(sskts.mongoose.connection);
        const movieTheaters = yield repository.searchMovieTheaters({});
        movieTheaters.forEach((movieTheater) => {
            // 互換性維持のためgmoInfoをpaymentAcceptedから情報追加
            if (Array.isArray(movieTheater.paymentAccepted)) {
                const creditCardPaymentAccepted = movieTheater.paymentAccepted.find((p) => {
                    return p.paymentMethodType === sskts.factory.paymentMethodType.CreditCard;
                });
                if (creditCardPaymentAccepted !== undefined) {
                    movieTheater.gmoInfo = creditCardPaymentAccepted.gmoInfo;
                }
            }
        });
        res.json(movieTheaters);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = organizationsRouter;
