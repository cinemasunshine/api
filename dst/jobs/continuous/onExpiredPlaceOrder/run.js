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
 * 期限切れ注文取引監視
 */
const sskts = require("@motionpicture/sskts-domain");
const createDebug = require("debug");
const connectMongo_1 = require("../../../connectMongo");
const debug = createDebug('cinerino-api');
exports.default = () => __awaiter(this, void 0, void 0, function* () {
    const connection = yield connectMongo_1.connectMongo({ defaultConnection: false });
    let countExecute = 0;
    const MAX_NUBMER_OF_PARALLEL_TASKS = 10;
    const INTERVAL_MILLISECONDS = 500;
    const taskRepo = new sskts.repository.Task(connection);
    const transactionRepo = new sskts.repository.Transaction(connection);
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        if (countExecute > MAX_NUBMER_OF_PARALLEL_TASKS) {
            return;
        }
        countExecute += 1;
        try {
            debug('exporting tasks...');
            yield sskts.service.transaction.placeOrder.exportTasks(sskts.factory.transactionStatusType.Expired)({
                task: taskRepo,
                transaction: transactionRepo
            });
        }
        catch (error) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
        countExecute -= 1;
    }), INTERVAL_MILLISECONDS);
});
