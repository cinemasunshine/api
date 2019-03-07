/**
 * 劇場インポート
 */
import * as cinerino from '@cinerino/domain';
import { CronJob } from 'cron';
import * as createDebug from 'debug';

import { connectMongo } from '../../../connectMongo';
import * as singletonProcess from '../../../singletonProcess';

const debug = createDebug('cinerino-api:jobs');

export default async () => {
    let holdSingletonProcess = false;
    setInterval(
        async () => {
            // tslint:disable-next-line:no-magic-numbers
            holdSingletonProcess = await singletonProcess.lock({ key: 'importMovieTheaters', ttl: 60 });
        },
        // tslint:disable-next-line:no-magic-numbers
        10000
    );

    const connection = await connectMongo({ defaultConnection: false });

    const job = new CronJob(
        '*/10 * * * *',
        async () => {
            if (!holdSingletonProcess) {
                return;
            }

            const sellerRepo = new cinerino.repository.Seller(connection);
            const placeRepo = new cinerino.repository.Place(connection);

            // 全劇場組織を取得
            const sellers = await sellerRepo.search({});

            for (const seller of sellers) {
                if (seller.location !== undefined && seller.location.branchCode !== undefined) {
                    try {
                        const branchCode = seller.location.branchCode;
                        debug('importing movieTheater...', branchCode);
                        await cinerino.service.masterSync.importMovieTheater(branchCode)({
                            seller: sellerRepo,
                            place: placeRepo
                        });
                        debug('movieTheater imported', branchCode);
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
