"use strict";
/**
 * クレジットカード追加サンプル
 *
 * @ignore
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
const createDebug = require("debug");
const sskts = require("../lib/sskts-api");
const debug = createDebug('sskts-api:samples');
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const auth = new sskts.auth.GoogleToken(
        // tslint:disable-next-line:max-line-length
        'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3ODU2OGM4YWRiMmVjYzA3ZDE0M2RiNTE0Y2M3YTk5NTIwN2RmMzYifQ.eyJhenAiOiI5MzI5MzQzMjQ2NzEtNjZrYXN1am50ajJqYTdjNWs0azU1aWo2cGFrcHFpcjQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI5MzI5MzQzMjQ2NzEtNjZrYXN1am50ajJqYTdjNWs0azU1aWo2cGFrcHFpcjQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDgwMTczNzA5ODQ2NDQ2NDkyODgiLCJlbWFpbCI6Imlsb3ZlZ2FkZEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXRfaGFzaCI6IlpnSlRDT3o1TGxrM25IcjNIanBmV0EiLCJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIiwiaWF0IjoxNTAxNDYzODk5LCJleHAiOjE1MDE0Njc0OTksIm5hbWUiOiJUZXRzdSBZYW1hemFraSIsInBpY3R1cmUiOiJodHRwczovL2xoNi5nb29nbGV1c2VyY29udGVudC5jb20vLVRpM29LMmwxNmJzL0FBQUFBQUFBQUFJL0FBQUFBQUFBNjNNL01Dc0JlWWNpWnpJL3M5Ni1jL3Bob3RvLmpwZyIsImdpdmVuX25hbWUiOiJUZXRzdSIsImZhbWlseV9uYW1lIjoiWWFtYXpha2kiLCJsb2NhbGUiOiJlbiJ9.uUt2S79e33NkwiHhJb7YoVAHO3x5ItG3pQbIVKn7RIHlFAehEqa8yPjEmYEDTbp355qGM4AaqMNgd8R8ersSlljyu2b1TLp-QaT6j7xlIPm-z9ynq-wwtuWcBcG7lFBaRuH7S1nsPeD7B1Lcn3_2Zevk7Ed4e2PtLHsP6We-M0lVDa6Bx7WFUZyB-5Bfv7xrR7je7tk31dZJi7sfA2B-CcnMvLasPoYuwoUdKDB9feUWkkCaHPe3iJC3_UPOWIhszqS7dzI_IuTL3sTSto7BxAEMJ9-Bx_BbDabYVFMjnevkyek6bSvaF_ZCJhw-Bf2VTjMENVj_8S-7RP87R4x8ew', 'teststate', ['people.creditCards']);
        let creditCards = yield sskts.service.person.findMyCreditCards({
            auth: auth
        });
        debug('creditCards are', creditCards);
        yield sskts.service.person.addMyCreditCard({
            auth: auth,
            creditCard: {
                cardNo: '4111111111111111',
                // cardPass: '111',
                expire: '2018',
                holderName: 'AA BB'
            }
        });
        debug('creditCard added');
        creditCards = yield sskts.service.person.findMyCreditCards({
            auth: auth
        });
        debug('creditCards are', creditCards);
    });
}
main().then(() => {
    debug('main processed.');
}).catch((err) => {
    console.error(err);
});
