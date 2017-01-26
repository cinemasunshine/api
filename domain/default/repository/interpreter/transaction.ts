import mongoose = require("mongoose");
import monapt = require("monapt");
import Transaction from "../../model/transaction";
import * as TransactionFactory from "../../factory/transaction";
import TransactionRepository from "../transaction";
import TransactionModel from "./mongoose/model/transaction";

class TransactionRepositoryInterpreter implements TransactionRepository {
    public connection: mongoose.Connection;

    async find(conditions: Object) {
        let model = this.connection.model(TransactionModel.modelName, TransactionModel.schema);
        let docs = await model.find(conditions)
            .populate("owner").exec();
        await docs.map((doc) => {
            console.log(doc);
        });
        return [];
    }
    async findById(id: string) {
        let model = this.connection.model(TransactionModel.modelName, TransactionModel.schema);
        let doc = await model.findOne({ _id: id })
            .populate("owners").exec();
        if (!doc) return monapt.None;

        let transaction = TransactionFactory.create({
            _id: doc.get("_id"),
            status: doc.get("status"),
            events: doc.get("events"),
            owners: doc.get("owners"),
            authorizations: doc.get("authorizations"),
            emails: doc.get("emails"),
            expired_at: doc.get("expired_at"),
            inquiry_id: doc.get("inquiry_id"),
            inquiry_pass: doc.get("inquiry_pass"),
            queues_imported: doc.get("queues_imported"),
        });

        return monapt.Option(transaction);
    }

    async findOneAndUpdate(conditions: Object, update: Object) {
        let model = this.connection.model(TransactionModel.modelName, TransactionModel.schema);
        let doc = await model.findOneAndUpdate(conditions, update, {
            new: true,
            upsert: false
        }).exec();
        if (!doc) return monapt.None;

        return monapt.Option(TransactionFactory.create({
            _id: doc.get("_id"),
            status: doc.get("status"),
            events: doc.get("events"),
            owners: doc.get("owners"),
            authorizations: doc.get("authorizations"),
            expired_at: doc.get("expired_at"),
            inquiry_id: doc.get("inquiry_id"),
            inquiry_pass: doc.get("inquiry_pass"),
        }));
    }

    async store(transaction: Transaction) {
        let model = this.connection.model(TransactionModel.modelName, TransactionModel.schema);
        await model.findOneAndUpdate({ _id: transaction._id }, transaction, {
            new: true,
            upsert: true
        }).lean().exec();
    }
}

let repo = new TransactionRepositoryInterpreter();

export default (connection: mongoose.Connection) => {
    repo.connection = connection;
    return repo;
}