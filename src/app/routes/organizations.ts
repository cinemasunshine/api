/**
 * 組織ルーター
 */
import { Router } from 'express';
const organizationsRouter = Router();

import * as cinerino from '@cinerino/domain';
import * as mongoose from 'mongoose';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

type ICreditCardPaymentAccepted = cinerino.factory.seller.IPaymentAccepted<cinerino.factory.paymentMethodType.CreditCard>;

organizationsRouter.use(authentication);

organizationsRouter.get(
    '/movieTheater/:branchCode',
    permitScopes(['aws.cognito.signin.user.admin', 'organizations', 'organizations.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const sellerRepo = new cinerino.repository.Seller(mongoose.connection);
            const movieTheaters = await sellerRepo.search({
                location: { branchCodes: [req.params.branchCode] }
            });
            const movieTheater = movieTheaters.shift();
            if (movieTheater === undefined) {
                throw new cinerino.factory.errors.NotFound('Organization');
            }

            // 互換性維持のためgmoInfoをpaymentAcceptedから情報追加
            if (Array.isArray(movieTheater.paymentAccepted)) {
                const creditCardPaymentAccepted = <ICreditCardPaymentAccepted>movieTheater.paymentAccepted.find((p) => {
                    return p.paymentMethodType === cinerino.factory.paymentMethodType.CreditCard;
                });
                if (creditCardPaymentAccepted !== undefined) {
                    (<any>movieTheater).gmoInfo = creditCardPaymentAccepted.gmoInfo;
                }
            }

            res.json(movieTheater);
        } catch (error) {
            next(error);
        }
    });

organizationsRouter.get(
    '/movieTheater',
    permitScopes(['aws.cognito.signin.user.admin', 'organizations', 'organizations.read-only']),
    validator,
    async (__, res, next) => {
        try {
            const repository = new cinerino.repository.Seller(mongoose.connection);
            const movieTheaters = await repository.search({});

            movieTheaters.forEach((movieTheater) => {
                // 互換性維持のためgmoInfoをpaymentAcceptedから情報追加
                if (Array.isArray(movieTheater.paymentAccepted)) {
                    const creditCardPaymentAccepted = <ICreditCardPaymentAccepted>movieTheater.paymentAccepted.find((p) => {
                        return p.paymentMethodType === cinerino.factory.paymentMethodType.CreditCard;
                    });
                    if (creditCardPaymentAccepted !== undefined) {
                        (<any>movieTheater).gmoInfo = creditCardPaymentAccepted.gmoInfo;
                    }
                }
            });

            res.json(movieTheaters);
        } catch (error) {
            next(error);
        }
    }
);

export default organizationsRouter;
