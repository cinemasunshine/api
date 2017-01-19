"use strict";
const authorizationGroup_1 = require("../authorizationGroup");
const authorization_1 = require("../authorization");
class COAAuthorization extends authorization_1.default {
    constructor(_id, coa_tmp_reserve_num, price) {
        super(_id, authorizationGroup_1.default.COA_SEAT_RESERVATION, price);
        this._id = _id;
        this.coa_tmp_reserve_num = coa_tmp_reserve_num;
        this.price = price;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = COAAuthorization;