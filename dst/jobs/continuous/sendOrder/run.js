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
 * 注文配送
 */
const sskts = require("@motionpicture/sskts-domain");
const connectMongo_1 = require("../../../connectMongo");
exports.default = () => __awaiter(this, void 0, void 0, function* () {
    const connection = yield connectMongo_1.connectMongo({ defaultConnection: false });
    const redisClient = sskts.redis.createClient({
        host: process.env.REDIS_HOST,
        // tslint:disable-next-line:no-magic-numbers
        port: parseInt(process.env.REDIS_PORT, 10),
        password: process.env.REDIS_KEY,
        tls: (process.env.REDIS_TLS_SERVERNAME !== undefined) ? { servername: process.env.REDIS_TLS_SERVERNAME } : undefined
    });
    let count = 0;
    const MAX_NUBMER_OF_PARALLEL_TASKS = 10;
    const INTERVAL_MILLISECONDS = 200;
    const taskRepo = new sskts.repository.Task(connection);
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        if (count > MAX_NUBMER_OF_PARALLEL_TASKS) {
            return;
        }
        count += 1;
        try {
            yield sskts.service.task.executeByName(sskts.factory.taskName.SendOrder)({
                taskRepo: taskRepo,
                connection: connection,
                redisClient: redisClient
            });
        }
        catch (error) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
        count -= 1;
    }), INTERVAL_MILLISECONDS);
});
