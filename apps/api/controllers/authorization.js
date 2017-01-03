"use strict";
// import * as AssetModel from "../../common/models/asset";
const AuthorizationModel = require("../../common/models/authorization");
const PerformanceModel = require("../../common/models/performance");
const COA = require("../../common/utils/coa");
/**
 * 資産の承認をとる
 */
function create4reservation(args) {
    // 本来は以下順序
    // 1.authorizationを非アクティブで作成
    // 2.assetにauthorizationが作成済みでないかどうか確認
    // 3.authorizationをアクティブにする
    // 今回は、COA連携なのでassetを確認せずに、アクティブな承認を作成
    return new Promise((resolve, reject) => {
        // 今回は、COA連携なのでまずCOAAPIで確認
        // パフォーマンス情報を取得
        PerformanceModel.default.findOne({
            _id: args.performance
        })
            .populate('film', 'film_group film_branch_code')
            .exec((err, performance) => {
            if (err)
                return reject(err);
            if (!performance)
                return reject(new Error("performance not found."));
            COA.reserveSeatsTemporarilyInterface.call({
                theater_code: performance.get("theater"),
                date_jouei: performance.get("day"),
                title_code: performance.get("film").get("film_group"),
                title_branch_num: performance.get("film").get("film_branch_code"),
                time_begin: performance.get("time_start"),
                list_seat: args.reservations.map((reservation) => {
                    return {
                        seat_section: reservation.section,
                        seat_num: reservation.seat_code,
                    };
                })
            }, (err, result) => {
                if (err)
                    return reject(err);
                let authorizations = result.list_tmp_reserve.map((reservation) => {
                    return {
                        transaction: args.transaction,
                        owner: args.owner,
                        coa_tmp_reserve_num: result.tmp_reserve_num,
                        performance: args.performance,
                        section: reservation.seat_section,
                        seat_code: reservation.seat_num,
                        active: true
                    };
                });
                AuthorizationModel.default.create(authorizations, (err, authorizations) => {
                    if (err)
                        return reject(err);
                    let results = authorizations.map((authorization) => {
                        return {
                            _id: authorization.get("_id"),
                            transaction: authorization.get("transaction"),
                            owner: authorization.get("owner"),
                            coa_tmp_reserve_num: authorization.get("coa_tmp_reserve_num"),
                            performance: authorization.get("performance"),
                            section: authorization.get("section"),
                            seat_code: authorization.get("seat_code"),
                        };
                    });
                    resolve(results);
                });
            });
        });
    });
}
exports.create4reservation = create4reservation;
