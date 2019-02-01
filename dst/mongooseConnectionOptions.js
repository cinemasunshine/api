"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * mongoose接続オプション
 * @see http://mongoosejs.com/docs/api.html#index_Mongoose-connect
 */
const mongooseConnectionOptions = {
    autoReconnect: true,
    keepAlive: true,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 0,
    reconnectTries: 30,
    reconnectInterval: 1000,
    useNewUrlParser: true
};
exports.default = mongooseConnectionOptions;
