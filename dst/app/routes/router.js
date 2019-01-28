"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ルーター
 */
const express = require("express");
const accounts_1 = require("./accounts");
const actions_1 = require("./actions");
const dev_1 = require("./dev");
const events_1 = require("./events");
const health_1 = require("./health");
const orders_1 = require("./orders");
const organizations_1 = require("./organizations");
const ownershipInfos_1 = require("./ownershipInfos");
const people_1 = require("./people");
const me_1 = require("./people/me");
const places_1 = require("./places");
const programMembership_1 = require("./programMembership");
const sellers_1 = require("./sellers");
const tasks_1 = require("./tasks");
const placeOrder_1 = require("./transactions/placeOrder");
const returnOrder_1 = require("./transactions/returnOrder");
const userPools_1 = require("./userPools");
const router = express.Router();
// middleware that is specific to this router
// router.use((req, res, next) => {
//   debug('Time: ', Date.now())
//   next()
// })
router.use('/health', health_1.default);
router.use('/accounts', accounts_1.default);
router.use('/actions', actions_1.default);
router.use('/organizations', organizations_1.default);
router.use('/orders', orders_1.default);
router.use('/ownershipInfos', ownershipInfos_1.default);
router.use('/people/me', me_1.default);
router.use('/people', people_1.default);
router.use('/places', places_1.default);
router.use('/programMemberships', programMembership_1.default);
router.use('/events', events_1.default);
router.use('/sellers', sellers_1.default);
router.use('/tasks', tasks_1.default);
router.use('/transactions/placeOrder', placeOrder_1.default);
router.use('/transactions/returnOrder', returnOrder_1.default);
router.use('/userPools', userPools_1.default);
// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
if (process.env.NODE_ENV !== 'production') {
    router.use('/dev', dev_1.default);
}
exports.default = router;
