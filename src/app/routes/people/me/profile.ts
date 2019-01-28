/**
 * 自分のプロフィールルーター
 */
import * as sskts from '@motionpicture/sskts-domain';
import { Router } from 'express';
import { NO_CONTENT } from 'http-status';

import permitScopes from '../../../middlewares/permitScopes';
import validator from '../../../middlewares/validator';

const cognitoIdentityServiceProvider = new sskts.AWS.CognitoIdentityServiceProvider({
    apiVersion: 'latest',
    region: 'ap-northeast-1',
    credentials: new sskts.AWS.Credentials({
        accessKeyId: <string>process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: <string>process.env.AWS_SECRET_ACCESS_KEY
    })
});

const profileRouter = Router();

/**
 * プロフィール検索
 */
profileRouter.get(
    '',
    permitScopes(['aws.cognito.signin.user.admin']),
    async (req, res, next) => {
        try {
            const personRepo = new sskts.repository.Person(cognitoIdentityServiceProvider);
            const profile = await personRepo.getUserAttributesByAccessToken(req.accessToken);
            res.json(profile);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * プロフィール更新
 */
profileRouter.patch(
    '',
    permitScopes(['aws.cognito.signin.user.admin']),
    validator,
    async (req, res, next) => {
        try {
            const personRepo = new sskts.repository.Person(cognitoIdentityServiceProvider);
            await personRepo.updateProfileByAccessToken({
                accessToken: req.accessToken,
                profile: req.body
            });
            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default profileRouter;
