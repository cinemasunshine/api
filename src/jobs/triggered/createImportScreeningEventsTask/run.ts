/**
 * 上映イベントインポートタスク作成
 */
import * as sskts from '@motionpicture/sskts-domain';
import { CronJob } from 'cron';
import * as createDebug from 'debug';
import * as moment from 'moment';

import { connectMongo } from '../../../connectMongo';

const debug = createDebug('sskts-api:jobs');

/**
 * 上映イベントを何週間後までインポートするか
 */
const LENGTH_IMPORT_SCREENING_EVENTS_IN_WEEKS = (process.env.LENGTH_IMPORT_SCREENING_EVENTS_IN_WEEKS !== undefined)
    // tslint:disable-next-line:no-magic-numbers
    ? parseInt(process.env.LENGTH_IMPORT_SCREENING_EVENTS_IN_WEEKS, 10)
    : 1;

export default async () => {
    const connection = await connectMongo({ defaultConnection: false });

    const job = new CronJob(
        '*/10 * * * *',
        async () => {
            const placeRepo = new sskts.repository.Place(connection);
            const sellerRepo = new sskts.repository.Seller(connection);
            const taskRepo = new sskts.repository.Task(connection);

            // 全劇場組織を取得
            const sellers = await sellerRepo.search({});
            const movieTheaters = await placeRepo.searchMovieTheaters({});
            const importFrom = moment()
                .toDate();
            const importThrough = moment(importFrom)
                .add(LENGTH_IMPORT_SCREENING_EVENTS_IN_WEEKS, 'weeks')
                .toDate();
            const runsAt = new Date();

            await Promise.all(movieTheaters.map(async (movieTheater) => {
                try {
                    const branchCode = movieTheater.branchCode;
                    const seller = sellers.find((m) => {
                        return m.location !== undefined
                            && m.location.branchCode !== undefined
                            && m.location.branchCode === branchCode;
                    });

                    if (seller !== undefined) {
                        const taskAttributes: sskts.factory.task.IAttributes<sskts.factory.taskName.ImportScreeningEvents> = {
                            name: sskts.factory.taskName.ImportScreeningEvents,
                            status: sskts.factory.taskStatus.Ready,
                            runsAt: runsAt,
                            remainingNumberOfTries: 1,
                            numberOfTried: 0,
                            executionResults: [],
                            data: {
                                locationBranchCode: branchCode,
                                importFrom: importFrom,
                                importThrough: importThrough
                            }
                        };
                        await taskRepo.save(taskAttributes);
                        debug('task saved', movieTheater.branchCode);
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
