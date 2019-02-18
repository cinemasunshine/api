/**
 * 映画作品インポート
 */
import * as sskts from '@motionpicture/sskts-domain';
import { CronJob } from 'cron';
import * as createDebug from 'debug';

import { connectMongo } from '../../../connectMongo';

const debug = createDebug('cinerino-api:jobs');

export default async () => {
    const connection = await connectMongo({ defaultConnection: false });

    const job = new CronJob(
        '10 * * * *',
        async () => {
            const creativeWorkRepo = new sskts.repository.CreativeWork(connection);
            const sellerRepo = new sskts.repository.Seller(connection);

            // 全劇場組織を取得
            const sellers = await sellerRepo.search({});

            // 劇場ごとに映画作品をインポート
            for (const seller of sellers) {
                if (seller.location !== undefined && seller.location.branchCode !== undefined) {
                    try {
                        const branchCode = seller.location.branchCode;
                        debug('importing movies...', branchCode);
                        await sskts.service.masterSync.importMovies(branchCode)({ creativeWork: creativeWorkRepo });
                        debug('movies imported', branchCode);
                    } catch (error) {
                        // tslint:disable-next-line:no-console
                        console.error(error);
                    }
                }
            }
        },
        undefined,
        true
    );
    debug('job started', job);
};
