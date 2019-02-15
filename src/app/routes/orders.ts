/**
 * 注文ルーター
 */
import * as sskts from '@motionpicture/sskts-domain';
import { Router } from 'express';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import * as mongoose from 'mongoose';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const ordersRouter = Router();
ordersRouter.use(authentication);

/**
 * 確認番号と電話番号で注文照会
 */
ordersRouter.post(
    '/findByOrderInquiryKey',
    permitScopes(['aws.cognito.signin.user.admin', 'orders', 'orders.read-only']),
    (req, _, next) => {
        req.checkBody('theaterCode', 'invalid theaterCode').notEmpty().withMessage('theaterCode is required');
        req.checkBody('confirmationNumber', 'invalid confirmationNumber').notEmpty().withMessage('confirmationNumber is required');
        req.checkBody('telephone', 'invalid telephone').notEmpty().withMessage('telephone is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const phoneUtil = PhoneNumberUtil.getInstance();
            const phoneNumber = phoneUtil.parse(req.body.telephone, 'JP');
            if (!phoneUtil.isValidNumber(phoneNumber)) {
                next(new sskts.factory.errors.Argument('telephone', 'Invalid phone number format'));

                return;
            }

            const key = {
                theaterCode: req.body.theaterCode,
                reservationNumber: req.body.confirmationNumber,
                telephone: phoneUtil.format(phoneNumber, PhoneNumberFormat.E164)
            };
            const repository = new sskts.repository.Order(mongoose.connection);
            const order = await repository.findByLocationBranchCodeAndReservationNumber(key);
            res.json(order);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 注文に対するアクション検索
 */
ordersRouter.get(
    '/:orderNumber/actions',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const actionRepo = new sskts.repository.Action(mongoose.connection);
            const actions = await actionRepo.searchByOrderNumber({
                orderNumber: req.params.orderNumber,
                sort: req.query.sort
            });
            res.json(actions);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 注文検索
 */
ordersRouter.get(
    '',
    permitScopes(['admin']),
    (req, __2, next) => {
        req.checkQuery('orderDateFrom')
            .optional()
            .isISO8601()
            .withMessage('must be ISO8601')
            .toDate();
        req.checkQuery('orderDateThrough')
            .optional()
            .isISO8601()
            .withMessage('must be ISO8601')
            .toDate();
        req.checkQuery('acceptedOffers.itemOffered.reservationFor.inSessionFrom')
            .optional()
            .isISO8601()
            .withMessage('must be ISO8601')
            .toDate();
        req.checkQuery('acceptedOffers.itemOffered.reservationFor.inSessionThrough')
            .optional()
            .isISO8601()
            .withMessage('must be ISO8601')
            .toDate();
        req.checkQuery('acceptedOffers.itemOffered.reservationFor.startFrom')
            .optional()
            .isISO8601()
            .withMessage('must be ISO8601')
            .toDate();
        req.checkQuery('acceptedOffers.itemOffered.reservationFor.startThrough')
            .optional()
            .isISO8601()
            .withMessage('must be ISO8601')
            .toDate();
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const orderRepo = new sskts.repository.Order(mongoose.connection);
            const searchConditions: sskts.factory.order.ISearchConditions = {
                ...req.query,
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100,
                page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1
            };
            const orders = await orderRepo.search(searchConditions);
            const totalCount = await orderRepo.count(searchConditions);
            res.set('X-Total-Count', totalCount.toString());
            res.json(orders);
        } catch (error) {
            next(error);
        }
    }
);

export default ordersRouter;
