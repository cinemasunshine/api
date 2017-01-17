"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const COA = require("@motionpicture/coa-service");
var interpreter;
(function (interpreter) {
    function importTheater(code) {
        return (repository) => __awaiter(this, void 0, void 0, function* () {
            yield COA.findTheaterInterface.call({
                theater_code: code
            }).then(repository.storeFromCOA);
        });
    }
    interpreter.importTheater = importTheater;
    function importFilms(theaterCode) {
        return (theaterRepository, filmRepository) => __awaiter(this, void 0, void 0, function* () {
            let optionTheater = yield theaterRepository.findById(theaterCode);
            if (optionTheater.isEmpty)
                throw new Error("theater not found.");
            let films = yield COA.findFilmsByTheaterCodeInterface.call({
                theater_code: theaterCode
            });
            yield Promise.all(films.map((filmByCOA) => __awaiter(this, void 0, void 0, function* () {
                yield filmRepository.storeFromCOA(filmByCOA)(optionTheater.get());
            })));
        });
    }
    interpreter.importFilms = importFilms;
    function importScreens(theaterCode) {
        return (theaterRepository, screenRepository) => __awaiter(this, void 0, void 0, function* () {
            let optionTheater = yield theaterRepository.findById(theaterCode);
            if (optionTheater.isEmpty)
                throw new Error("theater not found.");
            let screens = yield COA.findScreensByTheaterCodeInterface.call({
                theater_code: theaterCode
            });
            yield Promise.all(screens.map((screenByCOA) => __awaiter(this, void 0, void 0, function* () {
                yield screenRepository.storeFromCOA(screenByCOA)(optionTheater.get());
            })));
        });
    }
    interpreter.importScreens = importScreens;
    function importPerformances(theaterId, dayStart, dayEnd) {
        return (filmRepository, screenRepository, performanceRepository) => __awaiter(this, void 0, void 0, function* () {
            let screens = yield screenRepository.findByTheater(theaterId);
            let performances = yield COA.findPerformancesByTheaterCodeInterface.call({
                theater_code: theaterId,
                begin: dayStart,
                end: dayEnd,
            });
            yield Promise.all(performances.map((performanceByCOA) => __awaiter(this, void 0, void 0, function* () {
                let screenId = `${theaterId}${performanceByCOA.screen_code}`;
                let filmId = `${theaterId}${performanceByCOA.title_code}${performanceByCOA.title_branch_num}`;
                let _screen = screens.find((screen) => { return (screen._id === screenId); });
                if (!_screen)
                    throw new Error(("screen not found."));
                let optionFilm = yield filmRepository.findById(filmId);
                if (optionFilm.isEmpty)
                    throw new Error("film not found.");
                yield performanceRepository.storeFromCOA(performanceByCOA)(_screen, optionFilm.get());
            })));
        });
    }
    interpreter.importPerformances = importPerformances;
})(interpreter || (interpreter = {}));
let i = interpreter;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = i;
