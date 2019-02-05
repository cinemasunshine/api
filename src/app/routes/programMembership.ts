/**
 * 会員プログラムルーター
 */
import * as sskts from '@motionpicture/sskts-domain';
import { Router } from 'express';
import * as mongoose from 'mongoose';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const programMembershipsRouter = Router();

programMembershipsRouter.use(authentication);

programMembershipsRouter.get(
    '',
    permitScopes(['aws.cognito.signin.user.admin', 'programMemberships', 'programMemberships.read-only']),
    validator,
    async (__, res, next) => {
        try {
            const repository = new sskts.repository.ProgramMembership(mongoose.connection);
            const programMemberships = await repository.search({});
            res.json(programMemberships);
        } catch (error) {
            next(error);
        }
    }
);

export default programMembershipsRouter;
