/**
 * 期限切れ注文返品取引監視
 */
import * as sskts from '@motionpicture/sskts-domain';
import * as createDebug from 'debug';

import { connectMongo } from '../../../connectMongo';

const debug = createDebug('sskts-api');

export default async () => {
    const connection = await connectMongo({ defaultConnection: false });

    let countExecute = 0;

    const MAX_NUBMER_OF_PARALLEL_TASKS = 10;
    const INTERVAL_MILLISECONDS = 500;
    const taskRepo = new sskts.repository.Task(connection);
    const transactionRepo = new sskts.repository.Transaction(connection);

    setInterval(
        async () => {
            if (countExecute > MAX_NUBMER_OF_PARALLEL_TASKS) {
                return;
            }

            countExecute += 1;

            try {
                debug('exporting tasks...');
                await sskts.service.transaction.returnOrder.exportTasks(
                    sskts.factory.transactionStatusType.Expired
                )({
                    task: taskRepo,
                    transaction: transactionRepo
                });
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error(error);
            }

            countExecute -= 1;
        },
        INTERVAL_MILLISECONDS
    );
};
