/**
 * 上映イベントインポートタスク作成
 */
import * as cinerino from '@cinerino/domain';
import { CronJob } from 'cron';
import * as createDebug from 'debug';
import * as moment from 'moment';

import { connectMongo } from '../../../connectMongo';
import * as singletonProcess from '../../../singletonProcess';

const debug = createDebug('cinerino-api:jobs');

/**
 * 上映イベントを何週間後までインポートするか
 */
const LENGTH_IMPORT_SCREENING_EVENTS_IN_WEEKS = (process.env.LENGTH_IMPORT_SCREENING_EVENTS_IN_WEEKS !== undefined)
    // tslint:disable-next-line:no-magic-numbers
    ? parseInt(process.env.LENGTH_IMPORT_SCREENING_EVENTS_IN_WEEKS, 10)
    : 1;

let holdSingletonProcess = false;
setInterval(
    async () => {
        // tslint:disable-next-line:no-magic-numbers
        holdSingletonProcess = await singletonProcess.lock({ key: 'createImportScreeningEventsTask', ttl: 60 });
    },
    // tslint:disable-next-line:no-magic-numbers
    10000
);

export default async () => {
    const connection = await connectMongo({ defaultConnection: false });

    const job = new CronJob(
        '*/30 * * * *',
        async () => {
            if (!holdSingletonProcess) {
                return;
            }

            const placeRepo = new cinerino.repository.Place(connection);
            const sellerRepo = new cinerino.repository.Seller(connection);
            const taskRepo = new cinerino.repository.Task(connection);

            // 全劇場組織を取得
            const sellers = await sellerRepo.search({});
            const movieTheaters = await placeRepo.searchMovieTheaters({});

            const now = new Date();
            const importFrom = moment(now)
                .add(0, 'weeks')
                .toDate();
            const importThrough = moment(importFrom)
                .add(LENGTH_IMPORT_SCREENING_EVENTS_IN_WEEKS, 'weeks')
                .toDate();

            await Promise.all(movieTheaters.map(async (movieTheater) => {
                try {
                    const branchCode = movieTheater.branchCode;
                    const seller = sellers.find((m) => {
                        return m.location !== undefined
                            && m.location.branchCode !== undefined
                            && m.location.branchCode === branchCode;
                    });

                    if (seller !== undefined) {
                        if (Array.isArray(seller.makesOffer)) {
                            await Promise.all(seller.makesOffer.map(async (offer) => {
                                const taskAttributes: cinerino.factory.task.IAttributes<cinerino.factory.taskName.ImportScreeningEvents> = {
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
                                await taskRepo.save(taskAttributes);
                            }));
                        }
                    }
                } catch (error) {
                    // tslint:disable-next-line:no-console
                    console.error(error);
                }
            }));
        },
        undefined,
        true
    );
    debug('job started', job);
};
