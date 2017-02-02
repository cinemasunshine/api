import StockService from "../../domain/default/service/interpreter/stock";
import QueueRepository from "../../domain/default/repository/interpreter/queue";
import QueueStatus from "../../domain/default/model/queueStatus";
import TransactionRepository from "../../domain/default/repository/interpreter/transaction";
import mongoose = require("mongoose");
import COA = require("@motionpicture/coa-service");

mongoose.set('debug', true); // TODO 本番でははずす
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGOLAB_URI);
let count = 0;

setInterval(async () => {
    if (count > 10) return;
    count++;

    try {
        await execute();
    } catch (error) {
        console.error(error.message);
    }

    count--;
}, 500);

async function execute() {
    let queueRepository = QueueRepository(mongoose.connection);

    let option = await queueRepository.findOneDisableTransactionInquiryAndUpdate(
        {
            status: QueueStatus.UNEXECUTED,
            run_at: { $lt: new Date() },
        },
        {
            status: QueueStatus.RUNNING, // 実行中に変更
            last_tried_at: new Date(),
            $inc: { count_tried: 1 } // トライ回数増やす
        }
    );

    if (!option.isEmpty) {
        let queue = option.get();
        console.log("queue is", queue);

        try {
            // 失敗してもここでは戻さない(RUNNINGのまま待機)
            await StockService.disableTransactionInquiry({
                transaction_id: queue.transaction_id.toString()
            })(TransactionRepository(mongoose.connection), COA);
            // 実行済みに変更
            await queueRepository.findOneAndUpdate({ _id: queue._id }, { status: QueueStatus.EXECUTED });
        } catch (error) {
            // 実行結果追加
            await queueRepository.findOneAndUpdate({ _id: queue._id }, {
                $push: {
                    results: error.stack
                }
            });
        }
    }
}