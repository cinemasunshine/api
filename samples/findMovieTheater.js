"use strict";
/**
 * 劇場取得サンプル
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
const sskts = require("./lib/sskts-api");
const debug = createDebug('sskts-api:samples');
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const auth = new sskts.auth.ClientCredentials(process.env.TEST_CLIENT_ID, process.env.TEST_CLIENT_SECRET, 'teststate', [
            'https://sskts-api-development.azurewebsites.net/places.read-only'
        ]);
        const credentials = yield auth.refreshAccessToken();
        debug('credentials:', credentials);
        // 劇場情報取得
        const movieTheater = yield sskts.service.place.findMovieTheater({
            auth: auth,
            branchCode: '118'
        });
        debug('movieTheater is', movieTheater);
    });
}
main().then(() => {
    debug('main processed.');
}).catch((err) => {
    console.error(err.message);
});
