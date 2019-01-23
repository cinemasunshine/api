/**
 * error handler
 * エラーハンドラーミドルウェア
 * @module middlewares.errorHandler
 */

import * as sskts from '@motionpicture/sskts-domain';
import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';
import {
    BAD_REQUEST,
    CONFLICT, FORBIDDEN,
    INTERNAL_SERVER_ERROR,
    NOT_FOUND,
    NOT_IMPLEMENTED,
    SERVICE_UNAVAILABLE,
    TOO_MANY_REQUESTS,
    UNAUTHORIZED
} from 'http-status';

import { APIError } from '../error/api';
// import logger from '../logger';

const debug = createDebug('sskts-api:middlewares:errorHandler');

export default (err: any, __: Request, res: Response, next: NextFunction) => {
    debug(err);
    // logger.error('sskts-api:middleware:errorHandler', err);

    if (res.headersSent) {
        next(err);

        return;
    }

    let apiError: APIError;
    if (err instanceof APIError) {
        apiError = err;
    } else {
        // エラー配列が入ってくることもある
        if (Array.isArray(err)) {
            apiError = new APIError(ssktsError2httpStatusCode(err[0]), err);
        } else if (err instanceof sskts.factory.errors.Cinerino) {
            apiError = new APIError(ssktsError2httpStatusCode(err), [err]);
        } else {
            // 500
            apiError = new APIError(INTERNAL_SERVER_ERROR, [new sskts.factory.errors.Cinerino(<any>'InternalServerError', err.message)]);
        }
    }

    res.status(apiError.code).json({
        error: apiError.toObject()
    });
};

/**
 * CinerinoエラーをHTTPステータスコードへ変換する
 * @param err Cinerinoエラー
 */
function ssktsError2httpStatusCode(err: sskts.factory.errors.Cinerino) {
    let statusCode = BAD_REQUEST;

    switch (true) {
        // 401
        case (err instanceof sskts.factory.errors.Unauthorized):
            statusCode = UNAUTHORIZED;
            break;

        // 403
        case (err instanceof sskts.factory.errors.Forbidden):
            statusCode = FORBIDDEN;
            break;

        // 404
        case (err instanceof sskts.factory.errors.NotFound):
            statusCode = NOT_FOUND;
            break;

        // 409
        case (err instanceof sskts.factory.errors.AlreadyInUse):
            statusCode = CONFLICT;
            break;

        // 429
        case (err instanceof sskts.factory.errors.RateLimitExceeded):
            statusCode = TOO_MANY_REQUESTS;
            break;

        // 502
        case (err instanceof sskts.factory.errors.NotImplemented):
            statusCode = NOT_IMPLEMENTED;
            break;

        // 503
        case (err instanceof sskts.factory.errors.ServiceUnavailable):
            statusCode = SERVICE_UNAVAILABLE;
            break;

        // 400
        default:
            statusCode = BAD_REQUEST;
    }

    return statusCode;
}
