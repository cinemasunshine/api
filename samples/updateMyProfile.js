"use strict";
/**
 * プロフィール変更サンプル
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
        const auth = new sskts.auth.GoogleToken(
        // tslint:disable-next-line:max-line-length
        'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3MTYzZGFmY2ZjM2FmYWYwYmJmNTc5MTQzMWFlNzE5NDBiMmMwNGQifQ.eyJhenAiOiI5MzI5MzQzMjQ2NzEtNjZrYXN1am50ajJqYTdjNWs0azU1aWo2cGFrcHFpcjQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI5MzI5MzQzMjQ2NzEtNjZrYXN1am50ajJqYTdjNWs0azU1aWo2cGFrcHFpcjQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDgwMTczNzA5ODQ2NDQ2NDkyODgiLCJlbWFpbCI6Imlsb3ZlZ2FkZEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXRfaGFzaCI6InNiSUJ2ajhqbXZLSGhmWHdlejlsLUEiLCJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIiwiaWF0IjoxNTAxNDA4ODk2LCJleHAiOjE1MDE0MTI0OTYsIm5hbWUiOiJUZXRzdSBZYW1hemFraSIsInBpY3R1cmUiOiJodHRwczovL2xoNi5nb29nbGV1c2VyY29udGVudC5jb20vLVRpM29LMmwxNmJzL0FBQUFBQUFBQUFJL0FBQUFBQUFBNjNNL01Dc0JlWWNpWnpJL3M5Ni1jL3Bob3RvLmpwZyIsImdpdmVuX25hbWUiOiJUZXRzdSIsImZhbWlseV9uYW1lIjoiWWFtYXpha2kiLCJsb2NhbGUiOiJlbiJ9.gisUZtWTYs1MdUVVp3A0kpp8T5PasI6hI7apg12E4tVTlOg_XNRQHjzH6RyFoQxBFxfLwOS7bZoaRGB4A8De2KZi8WEQM3wEsFGKDhW5WXyPbJNwOi8pLWjCAfdhCyfihUZ3VfDoJCEYV12bSWtFn41pXzPzKj2O74KUEPOUSroOVfwcw-ixVIpAiDvFIKmGKq0jr49H4h7oFmP3v38kB4hJQhHw6JIT_BpGmPEYcT9rVUtoAznGFanVMCiVyvEPyL8QrdPIK1I-UgMGxIgqS6zBClEjI5Q9stFm4_eeHp2nbkBIlFmho8K2oLy-lkCXy8Egv6LPG5r6X0vOsLdNkg', 'teststate', ['people.profile']);
        let profile = yield sskts.service.person.getMyProfile({
            auth: auth
        });
        debug('profile is', profile);
        yield sskts.service.person.updateMyProfile({
            auth: auth,
            profile: {
                givenName: 'test',
                familyName: 'test',
                telephone: '09012345678'
            }
        });
        debug('profile updated');
        profile = yield sskts.service.person.getMyProfile({
            auth: auth
        });
        debug('profile is', profile);
    });
}
main().then(() => {
    debug('main processed.');
}).catch((err) => {
    console.error(err);
});
