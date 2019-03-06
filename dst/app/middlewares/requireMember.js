"use strict";
/**
 * 会員必須ミドルウェア
 * @module middlewares.requireMember
 */
Object.defineProperty(exports, "__esModule", { value: true });
const cinerino = require("@cinerino/domain");
const createDebug = require("debug");
const debug = createDebug('cinerino-api:middlewares:requireMember');
exports.default = (req, __, next) => {
    // 会員としてログイン済みであればOK
    if (isMember(req.user)) {
        debug('logged in as', req.user.sub);
        next();
    }
    else {
        next(new cinerino.factory.errors.Forbidden('login required'));
    }
};
function isMember(user) {
    return (user.username !== undefined);
}
