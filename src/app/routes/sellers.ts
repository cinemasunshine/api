/**
 * 販売者ルーター
 */
import * as sskts from '@motionpicture/sskts-domain';
import { Router } from 'express';
// tslint:disable-next-line:no-submodule-imports
import { body } from 'express-validator/check';
import { CREATED, NO_CONTENT } from 'http-status';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const sellersRouter = Router();
sellersRouter.use(authentication);

/**
 * 販売者作成
 */
sellersRouter.post(
    '',
    permitScopes(['admin', 'sellers']),
    ...[
        body('typeOf')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('name.ja')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('name.en')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('parentOrganization.typeOf')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('parentOrganization.name.ja')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('parentOrganization.name.en')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('location.typeOf')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('location.branchCode')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('location.name.ja')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('location.name.en')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('telephone')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('url')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`)
            .isURL(),
        body('paymentAccepted')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`)
            .isArray(),
        body('hasPOS')
            .isArray(),
        body('areaServed')
            .isArray()
    ],
    validator,
    async (req, res, next) => {
        try {
            const attributes: sskts.factory.organization.IAttributes<typeof req.body.typeOf> = {
                typeOf: req.body.typeOf,
                name: req.body.name,
                parentOrganization: req.body.parentOrganization,
                location: req.body.location,
                telephone: req.body.telephone,
                url: req.body.url,
                paymentAccepted: req.body.paymentAccepted,
                hasPOS: req.body.hasPOS,
                areaServed: req.body.areaServed
            };

            const sellerRepo = new sskts.repository.Seller(sskts.mongoose.connection);
            const seller = await sellerRepo.save({ attributes: attributes });

            res.status(CREATED)
                .json(seller);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 販売者検索
 */
sellersRouter.get(
    '',
    permitScopes(['aws.cognito.signin.user.admin', 'sellers', 'sellers.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const searchCoinditions: sskts.factory.organization.ISearchConditions<any> = {
                ...req.query,
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100,
                page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1
            };

            const sellerRepo = new sskts.repository.Seller(sskts.mongoose.connection);
            const sellers = await sellerRepo.search(searchCoinditions);
            const totalCount = await sellerRepo.count(searchCoinditions);

            res.set('X-Total-Count', totalCount.toString());
            res.json(sellers);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * IDで販売者検索
 */
sellersRouter.get(
    '/:id',
    permitScopes(['aws.cognito.signin.user.admin', 'sellers', 'sellers.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const sellerRepo = new sskts.repository.Seller(sskts.mongoose.connection);
            const seller = await sellerRepo.findById({
                id: req.params.id
            });
            res.json(seller);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 販売者更新
 */
sellersRouter.put(
    '/:id',
    permitScopes(['admin', 'sellers']),
    ...[
        body('typeOf')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('name.ja')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('name.en')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('parentOrganization.typeOf')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('parentOrganization.name.ja')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('parentOrganization.name.en')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('location.typeOf')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('location.branchCode')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('location.name.ja')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('location.name.en')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('telephone')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`),
        body('url')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`)
            .isURL(),
        body('paymentAccepted')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`)
            .isArray(),
        body('hasPOS')
            .isArray(),
        body('areaServed')
            .isArray()
    ],
    validator,
    async (req, res, next) => {
        try {
            const attributes: sskts.factory.organization.IAttributes<typeof req.body.typeOf> = {
                typeOf: req.body.typeOf,
                name: req.body.name,
                parentOrganization: req.body.parentOrganization,
                location: req.body.location,
                telephone: req.body.telephone,
                url: req.body.url,
                paymentAccepted: req.body.paymentAccepted,
                hasPOS: req.body.hasPOS,
                areaServed: req.body.areaServed
            };

            const sellerRepo = new sskts.repository.Seller(sskts.mongoose.connection);
            await sellerRepo.save({ id: req.params.id, attributes: attributes });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 販売者削除
 */
sellersRouter.delete(
    '/:id',
    permitScopes(['admin', 'sellers']),
    validator,
    async (req, res, next) => {
        try {
            const sellerRepo = new sskts.repository.Seller(sskts.mongoose.connection);
            await sellerRepo.deleteById({
                id: req.params.id
            });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default sellersRouter;
