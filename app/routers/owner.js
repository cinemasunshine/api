"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const express = require("express");
let router = express.Router();
const owner_1 = require("../../domain/default/repository/interpreter/owner");
const transaction_1 = require("../../domain/default/service/interpreter/transaction");
const mongoose = require("mongoose");
router.post("/anonymous", (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    let validatorResult = yield req.getValidationResult();
    if (!validatorResult.isEmpty())
        return next(new Error(validatorResult.array()[0].msg));
    try {
        let owner = yield transaction_1.default.createAnonymousOwner()(owner_1.default(mongoose.connection));
        res.status(201);
        res.setHeader("Location", `https://${req.headers["host"]}/owners/${owner._id}`);
        res.json({
            data: {
                type: "owners",
                _id: owner._id,
            }
        });
    }
    catch (error) {
        next(error);
    }
}));
router.patch("/anonymous/:id", (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    let validatorResult = yield req.getValidationResult();
    if (!validatorResult.isEmpty())
        return next(new Error(validatorResult.array()[0].msg));
    try {
        yield transaction_1.default.updateAnonymousOwner({
            _id: req.params.id,
            name_first: req.body.name_first,
            name_last: req.body.name_last,
            tel: req.body.tel,
            email: req.body.email,
        })(owner_1.default(mongoose.connection));
        res.status(204).end();
    }
    catch (error) {
        next(error);
    }
}));
router.get("/administrator", (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    let validatorResult = yield req.getValidationResult();
    if (!validatorResult.isEmpty())
        return next(new Error(validatorResult.array()[0].msg));
    try {
        let owner = yield transaction_1.default.getAdministratorOwner()(owner_1.default(mongoose.connection));
        res.json({
            data: {
                type: "owners",
                _id: owner._id,
                attributes: owner
            }
        });
    }
    catch (error) {
        next(error);
    }
}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = router;
