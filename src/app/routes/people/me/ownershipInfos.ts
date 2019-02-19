/**
 * 自分の所有権ルーター
 */
import * as sskts from '@motionpicture/sskts-domain';
import { Router } from 'express';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

import permitScopes from '../../../middlewares/permitScopes';
import validator from '../../../middlewares/validator';

// import * as redis from '../../../../redis';

import accountsRouter from './ownershipInfos/accounts';
import creditCardsRouter from './ownershipInfos/creditCards';
import reservationsRouter from './ownershipInfos/reservations';

// const CODE_EXPIRES_IN_SECONDS = Number(process.env.CODE_EXPIRES_IN_SECONDS);
// const chevreAuthClient = new sskts.chevre.auth.ClientCredentials({
//     domain: <string>process.env.CHEVRE_AUTHORIZE_SERVER_DOMAIN,
//     clientId: <string>process.env.CHEVRE_CLIENT_ID,
//     clientSecret: <string>process.env.CHEVRE_CLIENT_SECRET,
//     scopes: [],
//     state: ''
// });
const pecorinoAuthClient = new sskts.pecorinoapi.auth.ClientCredentials({
    domain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.PECORINO_CLIENT_ID,
    clientSecret: <string>process.env.PECORINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});
const ownershipInfosRouter = Router();
ownershipInfosRouter.use('/accounts', accountsRouter);
ownershipInfosRouter.use('/creditCards', creditCardsRouter);
ownershipInfosRouter.use('/reservations', reservationsRouter);

/**
 * 所有権検索
 */
ownershipInfosRouter.get(
    '',
    permitScopes(['aws.cognito.signin.user.admin']),
    validator,
    async (req, res, next) => {
        try {
            const query = <sskts.factory.ownershipInfo.ISearchConditions<any>>req.query;
            const typeOfGood = query.typeOfGood;
            let ownershipInfos: sskts.factory.ownershipInfo.IOwnershipInfo<any>[];
            const searchConditions: sskts.factory.ownershipInfo.ISearchConditions<any> = {
                // tslint:disable-next-line:no-magic-numbers
                limit: (query.limit !== undefined) ? Math.min(query.limit, 100) : 100,
                page: (query.page !== undefined) ? Math.max(query.page, 1) : 1,
                sort: query.sort,
                ownedBy: { id: req.user.sub },
                ownedFrom: (query.ownedFrom !== undefined) ? moment(query.ownedFrom)
                    .toDate() : undefined,
                ownedThrough: (query.ownedThrough !== undefined) ? moment(query.ownedThrough)
                    .toDate() : undefined,
                typeOfGood: typeOfGood
            };

            const ownershipInfoRepo = new sskts.repository.OwnershipInfo(mongoose.connection);
            const totalCount = await ownershipInfoRepo.count(searchConditions);
            ownershipInfos = await ownershipInfoRepo.search(searchConditions);

            switch (searchConditions.typeOfGood.typeOf) {
                case sskts.factory.ownershipInfo.AccountGoodType.Account:
                    const accountService = new sskts.pecorinoapi.service.Account({
                        endpoint: <string>process.env.PECORINO_ENDPOINT,
                        auth: pecorinoAuthClient
                    });

                    const accounts = await accountService.search({
                        accountType: searchConditions.typeOfGood.accountType,
                        accountNumbers: ownershipInfos.map((o) => o.typeOfGood.accountNumber),
                        statuses: [],
                        limit: 100
                    });
                    ownershipInfos = ownershipInfos.map((o) => {
                        const account = accounts.find((a) => a.accountNumber === o.typeOfGood.accountNumber);
                        if (account === undefined) {
                            throw new sskts.factory.errors.NotFound('Account');
                        }

                        return { ...o, typeOfGood: account };
                    });

                    break;

                case sskts.factory.chevre.reservationType.EventReservation:
                    // typeOfGoodに予約内容がすべて含まれているので、外部サービスに問い合わせ不要
                    // const reservationService = new cinerino.chevre.service.Reservation({
                    //     endpoint: <string>process.env.CHEVRE_ENDPOINT,
                    //     auth: chevreAuthClient
                    // });
                    // ownershipInfos = await cinerino.service.reservation.searchScreeningEventReservations(
                    //     { ...searchConditions, typeOfGood: typeOfGood }
                    // )({
                    //     ownershipInfo: ownershipInfoRepo,
                    //     reservationService: reservationService
                    // });
                    break;

                default:
                // no op
                // throw new sskts.factory.errors.Argument('typeOfGood.typeOf', 'Unknown good type');
            }

            res.set('X-Total-Count', totalCount.toString());
            res.json(ownershipInfos);
        } catch (error) {
            next(error);
        }
    }
);

export default ownershipInfosRouter;
