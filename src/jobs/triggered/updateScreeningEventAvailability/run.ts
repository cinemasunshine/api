/**
 * パフォーマンス空席状況を更新する
 * COA空席情報から空席状況を生成してredisに保管する
 */
import * as sskts from '@motionpicture/sskts-domain';
import { CronJob } from 'cron';
import * as createDebug from 'debug';
import * as moment from 'moment';

import { connectMongo } from '../../../connectMongo';

const debug = createDebug('cinerino-api:jobs');

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
        '* * * * *',
        async () => {
            const redisClient = sskts.redis.createClient({
                host: <string>process.env.REDIS_HOST,
                // tslint:disable-next-line:no-magic-numbers
                port: parseInt(<string>process.env.REDIS_PORT, 10),
                password: <string>process.env.REDIS_KEY,
                tls: (process.env.REDIS_TLS_SERVERNAME !== undefined) ? { servername: process.env.REDIS_TLS_SERVERNAME } : undefined
            });

            const itemAvailabilityRepo = new sskts.repository.itemAvailability.ScreeningEvent(redisClient);
            const sellerRepo = new sskts.repository.Seller(connection);

            // update by branchCode
            const sellers = await sellerRepo.search({});
            const startFrom = moment()
                .toDate();
            const startThrough = moment()
                .add(LENGTH_IMPORT_SCREENING_EVENTS_IN_WEEKS, 'weeks')
                .toDate();
            await Promise.all(sellers.map(async (seller) => {
                try {
                    if (seller.location !== undefined && seller.location.branchCode !== undefined) {
                        await sskts.service.itemAvailability.updateIndividualScreeningEvents(
                            seller.location.branchCode,
                            startFrom,
                            startThrough
                        )({ itemAvailability: itemAvailabilityRepo });
                        debug('item availability updated');
                    }
                } catch (error) {
                    // tslint:disable-next-line:no-console
                    console.error(error);
                }
            }));

            redisClient.quit();
        },
        undefined,
        true
    );
    debug('job started', job);
};
