/**
 * 自分の口座ルーター
 */
import * as sskts from '@motionpicture/sskts-domain';
import { Router } from 'express';
import { CREATED, NO_CONTENT } from 'http-status';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

import permitScopes from '../../../../middlewares/permitScopes';
import validator from '../../../../middlewares/validator';

import * as redis from '../../../../../redis';

const accountsRouter = Router();
const pecorinoAuthClient = new sskts.pecorinoapi.auth.ClientCredentials({
    domain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.PECORINO_CLIENT_ID,
    clientSecret: <string>process.env.PECORINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});
/**
 * 口座開設
 */
accountsRouter.post(
    '/:accountType',
    permitScopes(['aws.cognito.signin.user.admin']),
    (req, _, next) => {
        req.checkBody('name', 'invalid name')
            .notEmpty()
            .withMessage('name is required');
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const now = new Date();
            const accountNumberRepo = new sskts.repository.AccountNumber(redis.getClient());
            const accountService = new sskts.pecorinoapi.service.Account({
                endpoint: <string>process.env.PECORINO_ENDPOINT,
                auth: pecorinoAuthClient
            });
            const account = await sskts.service.account.open({
                name: req.body.name
            })({
                accountNumber: accountNumberRepo,
                accountService: accountService
            });
            const ownershipInfoRepo = new sskts.repository.OwnershipInfo(mongoose.connection);
            // tslint:disable-next-line:max-line-length
            const ownershipInfo: sskts.factory.ownershipInfo.IOwnershipInfo<sskts.factory.ownershipInfo.IGood<sskts.factory.ownershipInfo.AccountGoodType.Account>>
                = {
                id: '',
                typeOf: 'OwnershipInfo',
                // 十分にユニーク
                identifier: `${sskts.factory.pecorino.account.TypeOf.Account}-${req.user.username}-${account.accountNumber}`,
                typeOfGood: {
                    typeOf: sskts.factory.ownershipInfo.AccountGoodType.Account,
                    accountType: req.params.accountType,
                    accountNumber: account.accountNumber
                },
                ownedBy: req.agent,
                ownedFrom: now,
                // tslint:disable-next-line:no-magic-numbers
                ownedThrough: moment(now).add(100, 'years').toDate() // 十分に無期限
            };
            await ownershipInfoRepo.saveByIdentifier(ownershipInfo);
            res.status(CREATED).json({
                ...ownershipInfo,
                typeOfGood: account
            });
        } catch (error) {
            next(error);
        }
    }
);
/**
 * 口座解約
 * 口座の状態を変更するだけで、所有口座リストから削除はしない
 */
accountsRouter.put(
    '/:accountType/:accountNumber/close',
    permitScopes(['aws.cognito.signin.user.admin']),
    validator,
    async (req, res, next) => {
        try {
            // 口座所有権を検索
            const ownershipInfoRepo = new sskts.repository.OwnershipInfo(mongoose.connection);
            const accountOwnershipInfos = await ownershipInfoRepo.search<sskts.factory.ownershipInfo.AccountGoodType.Account>({
                typeOfGood: {
                    typeOf: sskts.factory.ownershipInfo.AccountGoodType.Account,
                    accountType: req.params.accountType
                },
                ownedBy: {
                    id: req.user.sub
                }
            });
            const accountOwnershipInfo = accountOwnershipInfos.find((o) => o.typeOfGood.accountNumber === req.params.accountNumber);
            if (accountOwnershipInfo === undefined) {
                throw new sskts.factory.errors.NotFound('Account');
            }

            const accountService = new sskts.pecorinoapi.service.Account({
                endpoint: <string>process.env.PECORINO_ENDPOINT,
                auth: pecorinoAuthClient
            });
            await accountService.close({
                accountType: req.params.accountType,
                accountNumber: accountOwnershipInfo.typeOfGood.accountNumber
            });
            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);
/**
 * 口座取引履歴検索
 */
accountsRouter.get(
    '/actions/moneyTransfer',
    permitScopes(['aws.cognito.signin.user.admin']),
    validator,
    async (req, res, next) => {
        try {
            const now = new Date();
            // 口座所有権を検索
            const ownershipInfoRepo = new sskts.repository.OwnershipInfo(mongoose.connection);
            const accountOwnershipInfos = await ownershipInfoRepo.search<sskts.factory.ownershipInfo.AccountGoodType.Account>({
                typeOfGood: {
                    typeOf: sskts.factory.ownershipInfo.AccountGoodType.Account,
                    accountType: req.query.accountType
                },
                ownedBy: {
                    id: req.user.sub
                },
                ownedFrom: now,
                ownedThrough: now
            });
            const accountOwnershipInfo = accountOwnershipInfos.find((o) => o.typeOfGood.accountNumber === req.query.accountNumber);
            if (accountOwnershipInfo === undefined) {
                throw new sskts.factory.errors.NotFound('Account');
            }

            const accountService = new sskts.pecorinoapi.service.Account({
                endpoint: <string>process.env.PECORINO_ENDPOINT,
                auth: pecorinoAuthClient
            });
            const searchResult = await accountService.searchMoneyTransferActionsWithTotalCount(req.query);
            res.set('X-Total-Count', searchResult.totalCount.toString());
            res.json(searchResult.data);
        } catch (error) {
            next(error);
        }
    }
);
export default accountsRouter;
