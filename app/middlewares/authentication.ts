/**
 * oauthミドルウェア
 *
 * @module middlewares/authentication
 */

import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';
// import * as jwt from 'express-jwt';
// import * as fs from 'fs';
import { UNAUTHORIZED } from 'http-status';

import * as jwt from 'jsonwebtoken';
// const jwkToPem = require('jwk-to-pem');

const debug = createDebug('sskts-api:middlewares:authentication');

// export default [
//     jwt(
//         {
//             secret: <string>process.env.SSKTS_API_SECRET
//         }
//     ),
//     (req: Request, __: Response, next: NextFunction) => {
//         debug('req.user:', req.user);

//         // アクセストークンにはscopeとして定義されているので、scopesに変換
//         if (req.user.scopes === undefined) {
//             req.user.scopes = (typeof req.user.scope === 'string') ? (<string>req.user.scope).split((' ')) : [];
//         }

//         // todo getUserメソッドを宣言する場所はここでよい？
//         // oauthを通過した場合のみ{req.user}を使用するはずなので、これで問題ないはず。
//         req.getUser = () => req.user;

//         next();
//     }
// ];

export interface IOpenIdConfiguration {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    jwks_uri: string;
    response_types_supported: string[];
    subject_types_supported: string[];
    version: string;
    id_token_signing_alg_values_supported: string[];
    x509_url: string;
}

export interface IPems {
    [key: string]: string;
}

export interface IJwk {
    kty: string;
    alg: string;
    use: string;
    kid: string;
    n: string;
    e: string;
}

export type IPayload = any;

// tslint:disable-next-line:max-line-length
// const ISSUER = 'https://cognito-identity.amazonaws.com';
const ISSUER = 'https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_zThi0j1fe';
// const permittedAudiences = [
//     '4flh35hcir4jl73s3puf7prljq',
//     '6figun12gcdtlj9e53p2u3oqvl'
// ];

// tslint:disable-next-line:no-require-imports no-var-requires
const pemsFromJson: IPems = require('./pems.json');

export default async (req: Request, res: Response, next: NextFunction) => {
    try {
        let token: string | null = null;
        if (req.headers.authorization && (<string>req.headers.authorization).split(' ')[0] === 'Bearer') {
            token = (<string>req.headers.authorization).split(' ')[1];
        }

        if (token === null) {
            throw new Error('authorization required');
        }

        const payload = await validateToken(pemsFromJson, token);
        debug('verified! payload:', payload);
        req.user = payload;

        // アクセストークンにはscopeとして定義されているので、scopesに変換
        if (req.user.scopes === undefined) {
            req.user.scopes = (typeof req.user.scope === 'string') ? (<string>req.user.scope).split((' ')) : [];
        }

        // todo getUserメソッドを宣言する場所はここでよい？
        // oauthを通過した場合のみ{req.user}を使用するはずなので、これで問題ないはず。
        req.getUser = () => req.user;

        next();
    } catch (error) {
        console.error(error);
        res.status(UNAUTHORIZED).end('Unauthorized');
    }
};

// export async function createPems() {
//     const openidConfiguration: IOpenIdConfiguration = await request({
//         url: `${ISSUER}/.well-known/openid-configuration`,
//         json: true
//     }).then((body) => body);

//     const pems = await request({
//         url: openidConfiguration.jwks_uri,
//         json: true
//     }).then((body) => {
//         console.log('got jwks_uri', body);
//         const pemsByKid: IPems = {};
//         (<any[]>body['keys']).forEach((key) => {
//             pemsByKid[key.kid] = jwkToPem(key);
//         });

//         return pemsByKid;
//     });

//     await fs.writeFile(`${__dirname}/pems.json`, JSON.stringify(pems));

//     return pems;
// };

export async function validateToken(pems: IPems, token: string): Promise<IPayload> {
    debug('validating token...');
    const decodedJwt = <any>jwt.decode(token, { complete: true });
    if (!decodedJwt) {
        throw new Error('invalid JWT token');
    }
    debug('decodedJwt:', decodedJwt);

    // if (decodedJwt.payload.aud !== AUDIENCE) {
    //     throw new Error('invalid audience');
    // }

    // Get the kid from the token and retrieve corresponding PEM
    const pem = pems[decodedJwt.header.kid];
    if (!pem) {
        throw new Error(`corresponding pem undefined. kid:${decodedJwt.header.kid}`);
    }

    return new Promise<IPayload>((resolve, reject) => {
        // Verify the signature of the JWT token to ensure it's really coming from your User Pool
        jwt.verify(
            token,
            pem,
            {
                issuer: ISSUER
                // audience: pemittedAudiences
            },
            (err, payload) => {
                if (err !== null) {
                    reject(err);
                } else {
                    // sub is UUID for a user which is never reassigned to another user.
                    resolve(payload);
                }
            });
    });
}
