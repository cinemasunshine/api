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
 * 会員プログラムルーター
 */
const sskts = require("@motionpicture/sskts-domain");
const express_1 = require("express");
const mongoose = require("mongoose");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const ownershipInfosRouter = express_1.Router();
ownershipInfosRouter.use(authentication_1.default);
ownershipInfosRouter.get('/countByRegisterDateAndTheater', permitScopes_1.default(['aws.cognito.signin.user.admin']), (req, __, next) => {
    req.checkQuery('fromDate').notEmpty().isISO8601().withMessage('fromDate must be ISO8601 timestamp');
    req.checkQuery('toDate').notEmpty().isISO8601().withMessage('toDate must be ISO8601 timestamp');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const fromDate = req.query.fromDate;
        const toDate = req.query.toDate;
        const theaterIds = req.query.theaterIds;
        const searchCondition = {
            createdAtFrom: new Date(fromDate),
            createdAtTo: new Date(toDate),
            theaterIds: theaterIds
        };
        const repository = new sskts.repository.OwnershipInfo(mongoose.connection);
        const count = yield repository.countProgramMembership(searchCondition);
        return res.json({ count });
    }
    catch (error) {
        next(error);
        return;
    }
}));
exports.default = ownershipInfosRouter;
