/**
 * 口座決済取引中止
 */
import * as sskts from '@motionpicture/sskts-domain';

import { connectMongo } from '../../../connectMongo';

export default async () => {
    const connection = await connectMongo({ defaultConnection: false });

    let count = 0;

    const MAX_NUBMER_OF_PARALLEL_TASKS = 10;
    const INTERVAL_MILLISECONDS = 200;
    const taskRepo = new sskts.repository.Task(connection);

    const authClient = new sskts.pecorinoapi.auth.ClientCredentials({
        domain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
        clientId: <string>process.env.PECORINO_CLIENT_ID,
        clientSecret: <string>process.env.PECORINO_CLIENT_SECRET,
        scopes: [],
        state: ''
    });

    setInterval(
        async () => {
            if (count > MAX_NUBMER_OF_PARALLEL_TASKS) {
                return;
            }

            count += 1;

            try {
                await sskts.service.task.executeByName(
                    sskts.factory.taskName.CancelAccount
                )({
                    taskRepo: taskRepo,
                    connection: connection,
                    pecorinoEndpoint: <string>process.env.PECORINO_ENDPOINT,
                    pecorinoAuthClient: authClient
                });
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error(error);
            }

            count -= 1;
        },
        INTERVAL_MILLISECONDS
    );
};
