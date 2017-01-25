import mongoose = require("mongoose");
import monapt = require("monapt");
import Transaction from "../../model/transaction";
import * as TransactionFactory from "../../factory/transaction";
import TransactionRepository from "../transaction";
import TransactionModel from "./mongoose/model/transaction";

let db = mongoose.createConnection(process.env.MONGOLAB_URI);
let transactionModel = db.model(TransactionModel.modelName, TransactionModel.schema);

namespace interpreter {
    export async function find(conditions: Object) {
        let docs = await transactionModel.find(conditions).exec();
        await docs.map((doc) => {
            console.log(doc);
        });
        return [];
    }
    export async function findById(id: string) {
        let doc = await transactionModel.findOne({ _id: id }).exec();
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

    export async function findOneAndUpdate(conditions: Object, update: Object) {
        let doc = await transactionModel.findOneAndUpdate(conditions, update, {
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

    export async function store(transaction: Transaction) {
        await transactionModel.findOneAndUpdate({ _id: transaction._id }, transaction, {
            new: true,
            upsert: true
        }).lean().exec();
    }
}

let i: TransactionRepository = interpreter;
export default i;