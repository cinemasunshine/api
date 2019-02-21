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
 * 映画作品インポート
 */
const sskts = require("@motionpicture/sskts-domain");
const cron_1 = require("cron");
const createDebug = require("debug");
const connectMongo_1 = require("../../../connectMongo");
const debug = createDebug('sskts-api:jobs');
exports.default = () => __awaiter(this, void 0, void 0, function* () {
    const connection = yield connectMongo_1.connectMongo({ defaultConnection: false });
    const job = new cron_1.CronJob('10 * * * *', () => __awaiter(this, void 0, void 0, function* () {
        const creativeWorkRepo = new sskts.repository.CreativeWork(connection);
        const sellerRepo = new sskts.repository.Seller(connection);
        // 全劇場組織を取得
        const sellers = yield sellerRepo.search({});
        // 劇場ごとに映画作品をインポート
        for (const seller of sellers) {
            if (seller.location !== undefined && seller.location.branchCode !== undefined) {
                try {
                    const branchCode = seller.location.branchCode;
                    debug('importing movies...', branchCode);
                    yield sskts.service.masterSync.importMovies(branchCode)({ creativeWork: creativeWorkRepo });
                    debug('movies imported', branchCode);
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
