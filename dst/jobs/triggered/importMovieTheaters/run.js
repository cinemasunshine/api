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
 * 劇場インポート
 */
const cinerino = require("@cinerino/domain");
const cron_1 = require("cron");
const createDebug = require("debug");
const connectMongo_1 = require("../../../connectMongo");
const singletonProcess = require("../../../singletonProcess");
const debug = createDebug('cinerino-api:jobs');
exports.default = () => __awaiter(this, void 0, void 0, function* () {
    let holdSingletonProcess = false;
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line:no-magic-numbers
        holdSingletonProcess = yield singletonProcess.lock({ key: 'importMovieTheaters', ttl: 60 });
    }), 
    // tslint:disable-next-line:no-magic-numbers
    10000);
    const connection = yield connectMongo_1.connectMongo({ defaultConnection: false });
    const job = new cron_1.CronJob('*/10 * * * *', () => __awaiter(this, void 0, void 0, function* () {
        if (!holdSingletonProcess) {
            return;
        }
        const sellerRepo = new cinerino.repository.Seller(connection);
        const placeRepo = new cinerino.repository.Place(connection);
        // 全劇場組織を取得
        const sellers = yield sellerRepo.search({});
        for (const seller of sellers) {
            if (seller.location !== undefined && seller.location.branchCode !== undefined) {
                try {
                    const branchCode = seller.location.branchCode;
                    debug('importing movieTheater...', branchCode);
                    yield cinerino.service.masterSync.importMovieTheater(branchCode)({
                        seller: sellerRepo,
                        place: placeRepo
                    });
                    debug('movieTheater imported', branchCode);
                }
                catch (error) {
                    // tslint:disable-next-line:no-console
                    console.error(error);
                }
            }
        }
    }), undefined, true);
    debug('job started', job);
});
