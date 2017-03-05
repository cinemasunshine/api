"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * devルーター
 *
 * @ignore
 */
const express = require("express");
const router = express.Router();
const createDebug = require("debug");
const HTTPStatus = require("http-status");
const mongoose = require("mongoose");
const debug = createDebug('sskts-api:*');
router.get('/environmentVariables', (req, res) => {
    debug('ip:', req.ip);
    res.json({
        data: {
            type: 'envs',
            attributes: process.env
        }
    });
});
router.get('/mongoose/connect', (req, res, next) => {
    debug('ip:', req.ip);
    mongoose.connect(process.env.MONGOLAB_URI, (err) => {
        if (err) {
            return next(err);
        }
        res.status(HTTPStatus.NO_CONTENT).end();
    });
});
router.get('/mongoose/disconnect', (req, res, next) => {
    debug('ip:', req.ip);
    mongoose.disconnect((err) => {
        if (err) {
            return next(err);
        }
        res.status(HTTPStatus.NO_CONTENT).end();
    });
});
exports.default = router;
