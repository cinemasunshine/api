/**
 * performanceルーター
 *
 * @ignore
 */
import { Router } from 'express';
const router = Router();

import * as sskts from '@motionpicture/sskts-domain';
import * as httpStatus from 'http-status';
import * as mongoose from 'mongoose';

import authentication from '../middlewares/authentication';
import validator from '../middlewares/validator';

router.use(authentication);

router.get(
    '/:id',
    (_1, _2, next) => {
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const option = await sskts.service.master.findPerformance(req.params.id)(sskts.adapter.performance(mongoose.connection));
            option.match({
                Some: (performance) => {
                    res.json({
                        data: {
                            type: 'performances',
                            id: performance.id,
                            attributes: performance
                        }
                    });
                },
                None: () => {
                    res.status(httpStatus.NOT_FOUND);
                    res.json({
                        data: null
                    });
                }
            });
        } catch (error) {
            next(error);
        }
    });

router.get(
    '',
    (req, _, next) => {
        req.checkQuery('theater', 'invalid theater').notEmpty().withMessage('theater is required');
        req.checkQuery('day', 'invalid day').notEmpty().withMessage('day is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const performances = await sskts.service.master.searchPerformances({
                day: req.query.day,
                theater: req.query.theater
            })(sskts.adapter.performance(mongoose.connection));

            const data = performances.map((performance) => {
                return {
                    type: 'performances',
                    id: performance.id,
                    attributes: performance
                };
            });

            res.json({
                data: data
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
