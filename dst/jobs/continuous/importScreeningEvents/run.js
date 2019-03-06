"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 上映イベント在庫仕入れ
 */
const cinerino = require("@cinerino/domain");
const connectMongo_1 = require("../../../connectMongo");
exports.default = () => __awaiter(this, void 0, void 0, function* () {
    const connection = yield connectMongo_1.connectMongo({ defaultConnection: false });
    let count = 0;
    const MAX_NUBMER_OF_PARALLEL_TASKS = 0; // 処理としてCPU使用量が多めなので、並列実行数は少なめにセット
    const INTERVAL_MILLISECONDS = 100;
    const taskRepo = new cinerino.repository.Task(connection);
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        if (count > MAX_NUBMER_OF_PARALLEL_TASKS) {
            return;
        }
        count += 1;
        try {
            yield cinerino.service.task.executeByName(cinerino.factory.taskName.ImportScreeningEvents)({
                taskRepo: taskRepo,
                connection: connection
            });
        }
        catch (error) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
        count -= 1;
    }), INTERVAL_MILLISECONDS);
});
