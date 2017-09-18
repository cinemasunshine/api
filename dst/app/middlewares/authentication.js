"use strict";
/**
 * oauthミドルウェア
 *
 * @module middlewares/authentication
 * @see https://aws.amazon.com/blogs/mobile/integrating-amazon-cognito-user-pools-with-api-gateway/
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const sskts = require("@motionpicture/sskts-domain");
const createDebug = require("debug");
// import * as jwt from 'express-jwt';
// import * as fs from 'fs';
const jwt = require("jsonwebtoken");
// tslint:disable-next-line:no-require-imports no-var-requires
const jwkToPem = require('jwk-to-pem');
const request = require("request-promise-native");
const debug = createDebug('sskts-api:middlewares:authentication');
const ISSUER = process.env.TOKEN_ISSUER;
// const permittedAudiences = [
//     '4flh35hcir4jl73s3puf7prljq',
//     '6figun12gcdtlj9e53p2u3oqvl'
// ];
// tslint:disable-next-line:no-require-imports no-var-requires
// const pemsFromJson: IPems = require('../../../certificate/pems.json');
exports.default = (req, __, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        let token = null;
        if (typeof req.headers.authorization === 'string' && req.headers.authorization.split(' ')[0] === 'Bearer') {
            token = req.headers.authorization.split(' ')[1];
        }
        if (token === null) {
            throw new Error('authorization required');
        }
        const pems = yield createPems();
        const payload = yield validateToken(pems, token);
        debug('verified! payload:', payload);
        req.user = Object.assign({}, payload, {
            // アクセストークンにはscopeとして定義されているので、scopesに変換
            scopes: (typeof payload.scope === 'string') ? payload.scope.split((' ')) : []
        });
        req.accessToken = token;
        next();
    }
    catch (error) {
        next(new sskts.factory.errors.Unauthorized(error.message));
    }
});
function createPems() {
    return __awaiter(this, void 0, void 0, function* () {
        const openidConfiguration = yield request({
            url: `${ISSUER}/.well-known/openid-configuration`,
            json: true
        }).then((body) => body);
        return yield request({
            url: openidConfiguration.jwks_uri,
            json: true
        }).then((body) => {
            debug('got jwks_uri', body);
            const pemsByKid = {};
            body.keys.forEach((key) => {
                pemsByKid[key.kid] = jwkToPem(key);
            });
            return pemsByKid;
        });
        // await fs.writeFile(`${__dirname}/pems.json`, JSON.stringify(pems));
    });
}
exports.createPems = createPems;
function validateToken(pems, token) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('validating token...');
        const decodedJwt = jwt.decode(token, { complete: true });
        if (!decodedJwt) {
            throw new Error('invalid JWT token');
        }
        debug('decodedJwt:', decodedJwt);
        // if (decodedJwt.payload.aud !== AUDIENCE) {
        //     throw new Error('invalid audience');
        // }
        // Reject the jwt if it's not an 'Access Token'
        if (decodedJwt.payload.token_use !== 'access') {
            throw new Error('not an access token');
        }
        // Get the kid from the token and retrieve corresponding PEM
        const pem = pems[decodedJwt.header.kid];
        if (pem === undefined) {
            throw new Error(`corresponding pem undefined. kid:${decodedJwt.header.kid}`);
        }
        return new Promise((resolve, reject) => {
            // Verify the signature of the JWT token to ensure it's really coming from your User Pool
            jwt.verify(token, pem, {
                issuer: ISSUER
                // audience: pemittedAudiences
            }, (err, payload) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    // Always generate the policy on value of 'sub' claim and not for 'username' because username is reassignable
                    // sub is UUID for a user which is never reassigned to another user
                    resolve(payload);
                }
            });
        });
    });
}
exports.validateToken = validateToken;
