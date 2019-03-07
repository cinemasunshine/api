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
 * 上映イベントインポートタスク作成
 */
const cinerino = require("@cinerino/domain");
const cron_1 = require("cron");
const createDebug = require("debug");
const moment = require("moment");
const connectMongo_1 = require("../../../connectMongo");
const singletonProcess = require("../../../singletonProcess");
const debug = createDebug('cinerino-api:jobs');
/**
 * 上映イベントを何週間後までインポートするか
 */
const LENGTH_IMPORT_SCREENING_EVENTS_IN_WEEKS = (process.env.LENGTH_IMPORT_SCREENING_EVENTS_IN_WEEKS !== undefined)
    // tslint:disable-next-line:no-magic-numbers
    ? parseInt(process.env.LENGTH_IMPORT_SCREENING_EVENTS_IN_WEEKS, 10)
    : 1;
let holdSingletonProcess = false;
setInterval(() => __awaiter(this, void 0, void 0, function* () {
    // tslint:disable-next-line:no-magic-numbers
    holdSingletonProcess = yield singletonProcess.lock({ key: 'createImportScreeningEventsTask', ttl: 60 });
}), 
// tslint:disable-next-line:no-magic-numbers
10000);
exports.default = () => __awaiter(this, void 0, void 0, function* () {
    const connection = yield connectMongo_1.connectMongo({ defaultConnection: false });
    const job = new cron_1.CronJob('*/30 * * * *', () => __awaiter(this, void 0, void 0, function* () {
        if (!holdSingletonProcess) {
            return;
        }
        const placeRepo = new cinerino.repository.Place(connection);
        const sellerRepo = new cinerino.repository.Seller(connection);
        const taskRepo = new cinerino.repository.Task(connection);
        // 全劇場組織を取得
        const sellers = yield sellerRepo.search({});
        const movieTheaters = yield placeRepo.searchMovieTheaters({});
        const now = new Date();
        const importFrom = moment(now)
            .add(0, 'weeks')
            .toDate();
        const importThrough = moment(importFrom)
            .add(LENGTH_IMPORT_SCREENING_EVENTS_IN_WEEKS, 'weeks')
            .toDate();
        yield Promise.all(movieTheaters.map((movieTheater) => __awaiter(this, void 0, void 0, function* () {
            try {
                const branchCode = movieTheater.branchCode;
                const seller = sellers.find((m) => {
                    return m.location !== undefined
                        && m.location.branchCode !== undefined
                        && m.location.branchCode === branchCode;
                });
                if (seller !== undefined) {
                    if (Array.isArray(seller.makesOffer)) {
                        yield Promise.all(seller.makesOffer.map((offer) => __awaiter(this, void 0, void 0, function* () {
                            const taskAttributes = {
                                name: cinerino.factory.taskName.ImportScreeningEvents,
                                status: cinerino.factory.taskStatus.Ready,
                                runsAt: now,
                                remainingNumberOfTries: 1,
                                numberOfTried: 0,
                                executionResults: [],
                                data: {
                                    locationBranchCode: offer.itemOffered.reservationFor.location.branchCode,
                                    offeredThrough: offer.offeredThrough,
                                    importFrom: importFrom,
                                    importThrough: importThrough
                                }
                            };
                            yield taskRepo.save(taskAttributes);
                        })));
                    }
                }
            }
            catch (error) {
                // tslint:disable-next-line:no-console
                console.error(error);
            }
        })));
    }), undefined, true);
    debug('job started', job);
});
