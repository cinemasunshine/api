/**
 * 注文作成
 */
import * as cinerino from '@cinerino/domain';

import { connectMongo } from '../../../connectMongo';

export default async () => {
    const connection = await connectMongo({ defaultConnection: false });

    let count = 0;

    const MAX_NUBMER_OF_PARALLEL_TASKS = 10;
    const INTERVAL_MILLISECONDS = 200;
    const taskRepo = new cinerino.repository.Task(connection);

    setInterval(
        async () => {
            if (count > MAX_NUBMER_OF_PARALLEL_TASKS) {
                return;
            }

            count += 1;

            try {
                await cinerino.service.task.executeByName(
                    cinerino.factory.taskName.PlaceOrder
                )({
                    taskRepo: taskRepo,
                    connection: connection
                });
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error(error);
            }

            count -= 1;
        },
        INTERVAL_MILLISECONDS
    );

    // 同時実行タスク数監視
    setInterval(
        async () => {
            if (count > MAX_NUBMER_OF_PARALLEL_TASKS) {
                await cinerino.service.notification.report2developers(
                    `[${process.env.PROJECT_ID}] api:connectMongo`,
                    `jobs:placeOrder:taskCount reached MAX_NUBMER_OF_PARALLEL_TASKS. ${count.toString()}`
                )();
            }
        },
        // tslint:disable-next-line:no-magic-numbers
        60000
    );
};
