import mongoose = require('mongoose');
import * as AssetModel from "../../common/models/asset";
import * as TransactionModel from "../../common/models/transaction";
import * as COA from "../../common/utils/coa";

interface Create4reservationArgs {
    transaction: string,
    assets: Array<string>,
    // owner: string,
    // performance: string,
    // reservations: Array<{
    //     section: string,
    //     seat_code: string
    // }>
}
/**
 * 資産の承認をとる
 */
export function create4reservation(args: Create4reservationArgs) {
    interface result {
        _id: string,
        transaction: string,
        asset: string,
        owner: string,
        coa_tmp_reserve_num: string,
    }

    return new Promise((resolveAll: (results: Array<result>) => void, rejectAll: (err: Error) => void) => {
        // 今回は、COA連携なのでまずCOAAPIで確認
        AssetModel.default.find({
            _id: {$in: args.assets}
        }).populate({
            path: "performance",
            populate: {
                path: "film"
            }
        }).exec((err, assets) => {
            if (err) return rejectAll(err);

            COA.reserveSeatsTemporarilyInterface.call({
                theater_code: assets[0].get("performance").get("theater"),
                date_jouei: assets[0].get("performance").get("day"),
                title_code: assets[0].get("performance").get("film").get("film_group"),
                title_branch_num: assets[0].get("performance").get("film").get("film_branch_code"),
                time_begin: assets[0].get("performance").get("time_start"),
                list_seat: assets.map((asset) => {
                    return {
                        seat_section: asset.get("section"),
                        seat_num: asset.get("seat_code"),
                    };
                })
            }, (err, result) => {
                if (err) return rejectAll(err);

                // 本来は以下順序
                // 1.authorizationを非アクティブで作成
                // 2.assetにauthorizationが作成済みでないかどうか確認(今回は、COA連携なのでassetを確認せずに、アクティブな承認を作成)
                // 3.authorizationをアクティブにする

                TransactionModel.default.findOne({
                    _id: args.transaction
                }, (err, transaction) => {
                    if (err) return rejectAll(err);
                    if (!transaction) return rejectAll(new Error("transaction not found."));

                    // 取引と資産に対して、承認情報をセット
                    assets.forEach((asset) => {
                        transaction.get("authorizations").push({
                            asset: asset.get("_id"),
                            owner: asset.get("owner"),
                            coa_tmp_reserve_num: result.tmp_reserve_num.toString(),
                            active: false
                        });
                    });
                    transaction.save((err, transaction) => {
                        if (err) rejectAll(err);

                        let promises = assets.map((asset) => {
                            return new Promise((resolve, reject) => {
                                asset.get("transactions").push(transaction.get("_id"));
                                asset.save((err, asset) => {
                                    if (err) return reject(err);
                                    resolve();
                                });
                            });
                        });

                        Promise.all(promises).then(() => {
                            // 資産の承認確認が全てとれたら承認をアクティブ化
                            transaction.get("authorizations").forEach((authorization: mongoose.Document) => {
                                if (authorization.get("coa_tmp_reserve_num") !== result.tmp_reserve_num.toString()) return;
                                authorization.set("active", true);
                            });
                            transaction.save((err, transaction) => {
                                if (err) rejectAll(err);

                                resolveAll(transaction.get("authorizations"));
                            });
                        }, (err) => {
                            rejectAll(err);
                        });
                    });
                });
            });
        });
    });
}

/**
 * 資産承認取消
 */
export function removeByCoaTmpReserveNum(tmpReserveNum: string) {
    return new Promise((resolve: () => void, reject: (err: Error) => void) => {
        // 承認を非アクティブに変更
        TransactionModel.default.findOne({
            "authorizations": { $elemMatch: { coa_tmp_reserve_num: tmpReserveNum } }
        }).exec((err, transaction) => {
            if (err) return reject(err);
            if (!transaction) return reject(new Error("transaction not found."));

            let assetIds: Array<string> = [];
            transaction.get("authorizations").forEach((authorization: mongoose.Document) => {
                if (authorization.get("coa_tmp_reserve_num") !== tmpReserveNum) return; 
                authorization.set("active", false);
                assetIds.push(authorization.get("asset"));
            });

            transaction.save((err, transaction) => {
                // 資産から承認IDを削除
                AssetModel.default.update({
                    _id: {$in: assetIds}
                }, {
                    $pullAll: { transactions: [transaction.get("_id")] }
                }, {
                    multi: true
                }, (err, raw) => {
                    if (err) return reject(err);

                    // TODO COA座席仮予約削除
                    AssetModel.default.findOne({
                        _id: assetIds[0]
                    }).populate({
                        path: "performance",
                        populate: {
                            path: "film"
                        }
                    }).exec((err, asset) => {
                        COA.deleteTmpReserveInterface.call({
                            theater_code: asset.get("performance").get("theater"),
                            date_jouei: asset.get("performance").get("day"),
                            title_code: asset.get("performance").get("film").get("film_group"),
                            title_branch_num: asset.get("performance").get("film").get("film_branch_code"),
                            time_begin: asset.get("performance").get("time_start"),
                            tmp_reserve_num: tmpReserveNum,
                        }, (err, success) => {
                            if (err) return reject(err);

                            resolve();
                        });
                    });
                });
            });
        });
    });
}