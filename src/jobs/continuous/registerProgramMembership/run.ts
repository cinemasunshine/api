/**
 * 会員プログラム登録タスク
 */
import * as sskts from '@motionpicture/sskts-domain';

import { connectMongo } from '../../../connectMongo';

export default async () => {
    const connection = await connectMongo({ defaultConnection: false });

    const redisClient = sskts.redis.createClient({
        host: <string>process.env.REDIS_HOST,
        // tslint:disable-next-line:no-magic-numbers
        port: parseInt(<string>process.env.REDIS_PORT, 10),
        password: <string>process.env.REDIS_KEY,
        tls: (process.env.REDIS_TLS_SERVERNAME !== undefined) ? { servername: process.env.REDIS_TLS_SERVERNAME } : undefined
    });

    const pecorinoAuthClient = new sskts.pecorinoapi.auth.ClientCredentials({
        domain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
        clientId: <string>process.env.PECORINO_CLIENT_ID,
        clientSecret: <string>process.env.PECORINO_CLIENT_SECRET,
        scopes: [],
        state: ''
    });

    // pecorino転送取引サービスクライアントを生成
    const depositService = new sskts.pecorinoapi.service.transaction.Deposit({
        endpoint: <string>process.env.PECORINO_ENDPOINT,
        auth: pecorinoAuthClient
    });

    let count = 0;

    const MAX_NUBMER_OF_PARALLEL_TASKS = 10;
    const INTERVAL_MILLISECONDS = 200;
    const taskRepo = new sskts.repository.Task(connection);
    const cognitoIdentityServiceProvider = new sskts.AWS.CognitoIdentityServiceProvider({
        apiVersion: 'latest',
        region: 'ap-northeast-1',
        credentials: new sskts.AWS.Credentials({
            accessKeyId: <string>process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: <string>process.env.AWS_SECRET_ACCESS_KEY
        })
    });

    setInterval(
        async () => {
            if (count > MAX_NUBMER_OF_PARALLEL_TASKS) {
                return;
            }

            count += 1;

            try {
                await sskts.service.task.executeByName(
                    sskts.factory.taskName.RegisterProgramMembership
                )({
                    taskRepo: taskRepo,
                    connection: connection,
                    redisClient: redisClient,
                    cognitoIdentityServiceProvider: cognitoIdentityServiceProvider,
                    depositService: depositService
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
