import ObjectId from "../model/objectId";
import GMOAuthorization from "../model/authorization/gmo";
import COASeatReservationAuthorization from "../model/authorization/coaSeatReservation";
import Owner from "../model/owner";
import SeatReservationAsset from "../model/asset/seatReservation";

export function createGMO(args: {
    _id: ObjectId,
    price: number,
    owner_from: Owner,
    owner_to: Owner,
    gmo_shop_id: string,
    gmo_shop_pass: string,
    gmo_order_id: string,
    gmo_amount: number,
    gmo_access_id: string,
    gmo_access_pass: string,
    gmo_job_cd: string,
    gmo_pay_type: string,
}) {
    return new GMOAuthorization(
        args._id,
        args.price,
        args.owner_from,
        args.owner_to,
        args.gmo_shop_id,
        args.gmo_shop_pass,
        args.gmo_order_id,
        args.gmo_amount,
        args.gmo_access_id,
        args.gmo_access_pass,
        args.gmo_job_cd,
        args.gmo_pay_type,
    )
};

export function createCOASeatReservation(args: {
    _id: ObjectId,
    coa_tmp_reserve_num: string,
    price: number,
    owner_from: Owner,
    owner_to: Owner,
    assets: Array<SeatReservationAsset>
}) {
    return new COASeatReservationAuthorization(
        args._id,
        args.coa_tmp_reserve_num,
        args.price,
        args.owner_from,
        args.owner_to,
        args.assets
    )
};