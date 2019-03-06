// tslint:disable:no-useless-files
/**
 * 映画作品インポート
 */
// import * as cinerino from '@cinerino/domain';
// import { CronJob } from 'cron';
// import * as createDebug from 'debug';
// import { connectMongo } from '../../../connectMongo';
// import * as singletonProcess from '../../../singletonProcess';
// const debug = createDebug('cinerino-api:jobs');
// let holdSingletonProcess = false;
// setInterval(
//     async () => {
//         // tslint:disable-next-line:no-magic-numbers
//         holdSingletonProcess = await singletonProcess.lock({ key: 'importMovies', ttl: 60 });
//     },
//     // tslint:disable-next-line:no-magic-numbers
//     10000
// );
// export default async () => {
//     const connection = await connectMongo({ defaultConnection: false });
//     const job = new CronJob(
//         '10 * * * *',
//         async () => {
//             if (!holdSingletonProcess) {
//                 return;
//             }
//             const creativeWorkRepo = new cinerino.repository.CreativeWork(connection);
//             const sellerRepo = new cinerino.repository.Seller(connection);
//             // 全劇場組織を取得
//             const sellers = await sellerRepo.search({});
//             // 劇場ごとに映画作品をインポート
//             for (const seller of sellers) {
//                 if (seller.location !== undefined && seller.location.branchCode !== undefined) {
//                     try {
//                         const branchCode = seller.location.branchCode;
//                         debug('importing movies...', branchCode);
//                         await cinerino.service.masterSync.importMovies(branchCode)({ creativeWork: creativeWorkRepo });
//                         debug('movies imported', branchCode);
//                     } catch (error) {
//                         // tslint:disable-next-line:no-console
//                         console.error(error);
//                     }
//                 }
//             }
//         },
//         undefined,
//         true
//     );
//     debug('job started', job);
// };
