"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const mongoose = require("mongoose");
const transactionEvent_1 = require("../../model/transactionEvent");
const transactionStatus_1 = require("../../model/transactionStatus");
const transactionEventGroup_1 = require("../../model/transactionEventGroup");
const queueStatus_1 = require("../../model/queueStatus");
const AuthorizationFactory = require("../../factory/authorization");
const TransactionFactory = require("../../factory/transaction");
const TransactionEventFactory = require("../../factory/transactionEvent");
const QueueFactory = require("../../factory/queue");
const EmailFactory = require("../../factory/email");
var interpreter;
(function (interpreter) {
    function getDetails(args) {
        return (transactionRepository) => __awaiter(this, void 0, void 0, function* () {
            return yield transactionRepository.findById(args.transaction_id);
        });
    }
    interpreter.getDetails = getDetails;
    function start(args) {
        return (ownerRepository, transactionRepository) => __awaiter(this, void 0, void 0, function* () {
            let owners = [];
            let promises = args.owner_ids.map((ownerId) => __awaiter(this, void 0, void 0, function* () {
                let option = yield ownerRepository.findById(ownerId);
                if (option.isEmpty)
                    throw new Error("owner not found.");
                owners.push(option.get());
            }));
            yield Promise.all(promises);
            let event = TransactionEventFactory.create({
                _id: mongoose.Types.ObjectId().toString(),
                group: transactionEventGroup_1.default.START,
            });
            let transaction = TransactionFactory.create({
                _id: mongoose.Types.ObjectId().toString(),
                status: transactionStatus_1.default.PROCESSING,
                events: [event],
                owners: owners,
                expired_at: args.expired_at
            });
            yield transactionRepository.store(transaction);
            return transaction;
        });
    }
    interpreter.start = start;
    function pushAuthorization(args) {
        return (transactionRepository) => __awaiter(this, void 0, void 0, function* () {
            let event = TransactionEventFactory.createAuthorize({
                _id: mongoose.Types.ObjectId().toString(),
                authorization: args.authorization,
            });
            let option = yield transactionRepository.findOneAndUpdate({
                _id: args.transaction_id,
                status: transactionStatus_1.default.PROCESSING,
            }, {
                $set: {},
                $push: {
                    events: event,
                },
                $addToSet: {
                    authorizations: args.authorization,
                }
            });
            if (option.isEmpty)
                throw new Error("processing transaction not found.");
        });
    }
    function addAssetAuthorization(args) {
        return (assetAuthorizationRepository, transactionRepository) => __awaiter(this, void 0, void 0, function* () {
            let option = yield assetAuthorizationRepository.findById(args.authorization_id);
            if (option.isEmpty)
                throw new Error("authorization not found.");
            yield pushAuthorization({
                transaction_id: args.transaction_id,
                authorization: option.get()
            })(transactionRepository);
            return option.get();
        });
    }
    interpreter.addAssetAuthorization = addAssetAuthorization;
    function addGMOAuthorization(args) {
        return (ownerRepository, transactionRepository) => __awaiter(this, void 0, void 0, function* () {
            let optionTransaction = yield transactionRepository.findById(args.transaction_id);
            if (optionTransaction.isEmpty)
                throw new Error(`transaction[${args.transaction_id}] not found.`);
            let transaction = optionTransaction.get();
            let ownerIds = transaction.owners.map((owner) => {
                return owner._id.toString();
            });
            if (ownerIds.indexOf(args.owner_id_from) < 0)
                throw new Error(`transaction[${args.transaction_id}] does not contain a owner[${args.owner_id_from}].`);
            if (ownerIds.indexOf(args.owner_id_to) < 0)
                throw new Error(`transaction[${args.transaction_id}] does not contain a owner[${args.owner_id_to}].`);
            let optionOwnerFrom = yield ownerRepository.findById(args.owner_id_from);
            if (optionOwnerFrom.isEmpty)
                throw new Error(`owner[${args.owner_id_from}] not found.`);
            let optionOwnerTo = yield ownerRepository.findById(args.owner_id_to);
            if (optionOwnerTo.isEmpty)
                throw new Error(`owner[${args.owner_id_to}] not found.`);
            let authorization = AuthorizationFactory.createGMO({
                _id: mongoose.Types.ObjectId().toString(),
                order_id: args.gmo_order_id,
                price: parseInt(args.gmo_amount),
                owner_from: optionOwnerFrom.get(),
                owner_to: optionOwnerTo.get(),
            });
            yield pushAuthorization({
                transaction_id: args.transaction_id,
                authorization: authorization
            })(transactionRepository);
            return authorization;
        });
    }
    interpreter.addGMOAuthorization = addGMOAuthorization;
    function addCOASeatReservationAuthorization(args) {
        return (ownerRepository, transactionRepository) => __awaiter(this, void 0, void 0, function* () {
            let optionTransaction = yield transactionRepository.findById(args.transaction_id);
            if (optionTransaction.isEmpty)
                throw new Error(`transaction[${args.transaction_id}] not found.`);
            let transaction = optionTransaction.get();
            let ownerIds = transaction.owners.map((owner) => {
                return owner._id.toString();
            });
            if (ownerIds.indexOf(args.owner_id_from) < 0)
                throw new Error(`transaction[${args.transaction_id}] does not contain a owner[${args.owner_id_from}].`);
            if (ownerIds.indexOf(args.owner_id_to) < 0)
                throw new Error(`transaction[${args.transaction_id}] does not contain a owner[${args.owner_id_to}].`);
            let optionOwnerFrom = yield ownerRepository.findById(args.owner_id_from);
            if (optionOwnerFrom.isEmpty)
                throw new Error(`owner[${args.owner_id_from}] not found.`);
            let optionOwnerTo = yield ownerRepository.findById(args.owner_id_to);
            if (optionOwnerTo.isEmpty)
                throw new Error(`owner[${args.owner_id_to}] not found.`);
            let authorization = AuthorizationFactory.createCOASeatReservation({
                _id: mongoose.Types.ObjectId().toString(),
                coa_tmp_reserve_num: args.coa_tmp_reserve_num,
                price: args.price,
                owner_from: optionOwnerFrom.get(),
                owner_to: optionOwnerTo.get(),
                seats: args.seats
            });
            yield pushAuthorization({
                transaction_id: args.transaction_id,
                authorization: authorization
            })(transactionRepository);
            return authorization;
        });
    }
    interpreter.addCOASeatReservationAuthorization = addCOASeatReservationAuthorization;
    function removeAuthorization(args) {
        return (transactionRepository) => __awaiter(this, void 0, void 0, function* () {
            let event = TransactionEventFactory.createUnauthorize({
                _id: mongoose.Types.ObjectId().toString(),
                authorization_id: args.authorization_id,
            });
            let option = yield transactionRepository.findOneAndUpdate({
                _id: args.transaction_id,
                status: transactionStatus_1.default.PROCESSING
            }, {
                $set: {},
                $push: {
                    events: event,
                },
                $pull: {
                    authorizations: {
                        _id: args.authorization_id
                    },
                }
            });
            if (option.isEmpty)
                throw new Error("processing transaction not found.");
        });
    }
    interpreter.removeAuthorization = removeAuthorization;
    function enableInquiry(args) {
        return (transactionRepository) => __awaiter(this, void 0, void 0, function* () {
            let option = yield transactionRepository.findOneAndUpdate({
                _id: args.transaction_id,
                status: transactionStatus_1.default.PROCESSING
            }, {
                $set: {
                    inquiry_id: args.inquiry_id,
                    inquiry_pass: args.inquiry_pass,
                },
            });
            if (option.isEmpty)
                throw new Error("processing transaction not found.");
        });
    }
    interpreter.enableInquiry = enableInquiry;
    function close(args) {
        return (transactionRepository) => __awaiter(this, void 0, void 0, function* () {
            let event = new transactionEvent_1.default(mongoose.Types.ObjectId().toString(), transactionEventGroup_1.default.CLOSE);
            let option = yield transactionRepository.findOneAndUpdate({
                _id: args.transaction_id,
                status: transactionStatus_1.default.PROCESSING
            }, {
                $set: {
                    status: transactionStatus_1.default.CLOSED
                },
                $push: {
                    events: event
                }
            });
            if (option.isEmpty)
                throw new Error("processing transaction not found.");
        });
    }
    interpreter.close = close;
    function expire(args) {
        return (transactionRepository) => __awaiter(this, void 0, void 0, function* () {
            let event = TransactionEventFactory.create({
                _id: mongoose.Types.ObjectId().toString(),
                group: transactionEventGroup_1.default.EXPIRE,
            });
            let option = yield transactionRepository.findOneAndUpdate({
                _id: args.transaction_id,
                status: transactionStatus_1.default.PROCESSING
            }, {
                $set: {
                    status: transactionStatus_1.default.EXPIRED
                },
                $push: {
                    events: event
                }
            });
            if (option.isEmpty)
                throw new Error("processing transaction not found.");
        });
    }
    interpreter.expire = expire;
    function cancel(args) {
        return (transactionRepository) => __awaiter(this, void 0, void 0, function* () {
            let event = new transactionEvent_1.default(mongoose.Types.ObjectId().toString(), transactionEventGroup_1.default.CANCEL);
            let option = yield transactionRepository.findOneAndUpdate({
                _id: args.transaction_id,
                status: transactionStatus_1.default.CLOSED
            }, {
                $set: {
                    status: transactionStatus_1.default.CANCELED
                },
                $push: {
                    events: event
                }
            });
            if (option.isEmpty)
                throw new Error("closed transaction not found.");
        });
    }
    interpreter.cancel = cancel;
    function enqueue() {
        return (transactionRepository, queueRepository) => __awaiter(this, void 0, void 0, function* () {
            let option = yield transactionRepository.findOneAndUpdate({
                status: { $in: [transactionStatus_1.default.CLOSED, transactionStatus_1.default.EXPIRED] },
                queues_imported: false
            }, {
                queues_imported: false
            });
            if (option.isEmpty)
                return;
            let transaction = option.get();
            console.log("transaction is", transaction);
            let promises = [];
            switch (transaction.status) {
                case transactionStatus_1.default.CLOSED:
                    promises = promises.concat(transaction.authorizations.map((authorization) => __awaiter(this, void 0, void 0, function* () {
                        let queue = QueueFactory.createSettleAuthorization({
                            status: queueStatus_1.default.UNEXECUTED,
                            executed_at: new Date(),
                            count_try: 0,
                            authorization: authorization
                        });
                        yield queueRepository.store(queue);
                    })));
                    break;
                case transactionStatus_1.default.EXPIRED:
                    break;
                default:
                    break;
            }
            yield Promise.all(promises);
            console.log("queues created.");
            yield transactionRepository.findOneAndUpdate({
                _id: transaction._id
            }, {
                queues_imported: true
            });
        });
    }
    interpreter.enqueue = enqueue;
    function addEmail(args) {
        return (transactionRepository) => __awaiter(this, void 0, void 0, function* () {
            let email = EmailFactory.create({
                _id: mongoose.Types.ObjectId().toString(),
                from: args.from,
                to: args.to,
                subject: args.subject,
                body: args.body,
            });
            let option = yield transactionRepository.findOneAndUpdate({
                _id: args.transaction_id,
                status: transactionStatus_1.default.PROCESSING
            }, {
                $set: {},
                $addToSet: {
                    emails: email,
                }
            });
            if (option.isEmpty)
                throw new Error("processing transaction not found.");
            return email;
        });
    }
    interpreter.addEmail = addEmail;
    function removeEmail(args) {
        return (transactionRepository) => __awaiter(this, void 0, void 0, function* () {
            let option = yield transactionRepository.findOneAndUpdate({
                _id: args.transaction_id,
                status: transactionStatus_1.default.PROCESSING
            }, {
                $set: {},
                $pull: {
                    emails: {
                        _id: args.email_id
                    },
                }
            });
            if (option.isEmpty)
                throw new Error("processing transaction not found.");
        });
    }
    interpreter.removeEmail = removeEmail;
})(interpreter || (interpreter = {}));
let i = interpreter;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = i;
