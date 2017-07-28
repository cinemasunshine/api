/**
 * 注文取引プロセスサンプル
 *
 * @ignore
 */

import { COA } from '@motionpicture/sskts-domain';
import * as createDebug from 'debug';
import * as moment from 'moment';
import * as util from 'util';

import * as sskts from '../lib/sskts-api';

const debug = createDebug('sskts-api:samples');

// tslint:disable-next-line:max-func-body-length
async function main() {
    const auth = new sskts.auth.OAuth2(
        'motionpicture',
        'motionpicture',
        'teststate',
        [
            'transactions',
            'events.read-only',
            'organizations.read-only'
        ]
    );

    // 上映イベント検索
    const individualScreeningEvents = await sskts.service.event.searchIndividualScreeningEvent({
        auth: auth,
        searchConditions: {
            theater: '118',
            day: moment().add(1, 'day').format('YYYYMMDD')
        }
    });

    // イベント情報取得
    const individualScreeningEvent = await sskts.service.event.findIndividualScreeningEvent({
        auth: auth,
        identifier: individualScreeningEvents[0].identifier
    });

    // 劇場ショップ検索
    const movieTheaters = await sskts.service.organization.searchMovieTheaters({
        auth: auth
    });

    const theaterCode = individualScreeningEvent.coaInfo.theaterCode;
    const dateJouei = individualScreeningEvent.coaInfo.dateJouei;
    const titleCode = individualScreeningEvent.coaInfo.titleCode;
    const titleBranchNum = individualScreeningEvent.coaInfo.titleBranchNum;
    const timeBegin = individualScreeningEvent.coaInfo.timeBegin;
    const screenCode = individualScreeningEvent.coaInfo.screenCode;

    // 劇場のショップを検索
    const seller = movieTheaters.find((movieTheater) => movieTheater.location.branchCode === theaterCode);
    debug('seller is', seller);
    if (seller === undefined) {
        throw new Error('劇場ショップはまだオープンしていません');
    }

    // 取引開始
    // 1分後のunix timestampを送信する場合
    // https://ja.wikipedia.org/wiki/UNIX%E6%99%82%E9%96%93
    debug('注文取引を開始します...');
    const transaction = await sskts.service.transaction.placeOrder.start({
        auth: auth,
        expires: moment().add(1, 'minutes').toDate(),
        sellerId: seller.id
    });

    // 販売可能チケット検索
    const salesTicketResult = await COA.services.reserve.salesTicket({
        theaterCode: theaterCode,
        dateJouei: dateJouei,
        titleCode: titleCode,
        titleBranchNum: titleBranchNum,
        timeBegin: timeBegin,
        flgMember: COA.services.reserve.FlgMember.NonMember
    });
    debug('販売可能チケットは', salesTicketResult);

    // COA空席確認
    const getStateReserveSeatResult = await COA.services.reserve.stateReserveSeat({
        theaterCode: theaterCode,
        dateJouei: dateJouei,
        titleCode: titleCode,
        titleBranchNum: titleBranchNum,
        timeBegin: timeBegin,
        screenCode: screenCode
    });
    debug('空席情報は', getStateReserveSeatResult);
    const sectionCode = getStateReserveSeatResult.listSeat[0].seatSection;
    const freeSeatCodes = getStateReserveSeatResult.listSeat[0].listFreeSeat.map((freeSeat) => {
        return freeSeat.seatNum;
    });
    if (getStateReserveSeatResult.cntReserveFree === 0) {
        throw new Error('空席がありません');
    }

    // 座席仮予約
    debug('座席を仮予約します...');
    let seatReservationAuthorization = await sskts.service.transaction.placeOrder.createSeatReservationAuthorization({
        auth: auth,
        transactionId: transaction.id,
        eventIdentifier: individualScreeningEvent.identifier,
        offers: [
            {
                seatSection: sectionCode,
                seatNumber: freeSeatCodes[0],
                ticket: {
                    ticketCode: salesTicketResult[0].ticketCode,
                    stdPrice: salesTicketResult[0].stdPrice,
                    addPrice: salesTicketResult[0].addPrice,
                    disPrice: 0,
                    salePrice: salesTicketResult[0].salePrice,
                    mvtkAppPrice: 0,
                    ticketCount: 1,
                    seatNum: freeSeatCodes[0],
                    addGlasses: 0,
                    kbnEisyahousiki: '00',
                    mvtkNum: '',
                    mvtkKbnDenshiken: '00',
                    mvtkKbnMaeuriken: '00',
                    mvtkKbnKensyu: '00',
                    mvtkSalesPrice: 0
                }
            }
        ]
    });
    debug('座席を仮予約しました', seatReservationAuthorization);

    // 座席仮予約取消
    debug('座席仮予約を取り消します...');
    await sskts.service.transaction.placeOrder.cancelSeatReservationAuthorization({
        auth: auth,
        transactionId: transaction.id,
        authorizationId: seatReservationAuthorization.id
    });

    // 再度座席仮予約
    debug('座席を仮予約します...');
    seatReservationAuthorization = await sskts.service.transaction.placeOrder.createSeatReservationAuthorization({
        auth: auth,
        transactionId: transaction.id,
        eventIdentifier: individualScreeningEvent.identifier,
        offers: [
            {
                seatSection: sectionCode,
                seatNumber: freeSeatCodes[0],
                ticket: {
                    ticketCode: salesTicketResult[1].ticketCode,
                    stdPrice: salesTicketResult[1].stdPrice,
                    addPrice: salesTicketResult[1].addPrice,
                    disPrice: 0,
                    salePrice: salesTicketResult[1].salePrice,
                    mvtkAppPrice: 0,
                    ticketCount: 1,
                    seatNum: freeSeatCodes[0],
                    addGlasses: 0,
                    kbnEisyahousiki: '00',
                    mvtkNum: '',
                    mvtkKbnDenshiken: '00',
                    mvtkKbnMaeuriken: '00',
                    mvtkKbnKensyu: '00',
                    mvtkSalesPrice: 0
                }
            }
        ]
    });
    debug('座席を仮予約しました', seatReservationAuthorization);

    const amount = seatReservationAuthorization.price;

    // クレジットカードオーソリ取得
    let orderId = util.format(
        '%s%s%s%s',
        moment().format('YYYYMMDD'),
        theaterCode,
        // tslint:disable-next-line:no-magic-numbers
        `00000000${seatReservationAuthorization.result.tmpReserveNum}`.slice(-8),
        '01'
    );
    debug('クレジットカードのオーソリをとります...');
    let creditCardAuthorization = await sskts.service.transaction.placeOrder.authorizeGMOCard({
        auth: auth,
        transactionId: transaction.id,
        orderId: orderId,
        amount: amount,
        creditCard: {
            method: '1',
            cardNo: '4111111111111111',
            expire: '2012',
            securityCode: '123'
        }
    });
    debug('クレジットカードのオーソリがとれました', creditCardAuthorization);

    // クレジットカードオーソリ取消
    debug('クレジットカードのオーソリを取り消します...');
    await sskts.service.transaction.placeOrder.cancelCreditCardAuthorization({
        auth: auth,
        transactionId: transaction.id,
        authorizationId: creditCardAuthorization.id
    });

    // 再度クレジットカードオーソリ
    orderId = util.format(
        '%s%s%s%s',
        moment().format('YYYYMMDD'),
        theaterCode,
        // tslint:disable-next-line:no-magic-numbers
        `00000000${seatReservationAuthorization.result.tmpReserveNum}`.slice(-8),
        '02'
    );
    debug('クレジットカードのオーソリをとります...');
    creditCardAuthorization = await sskts.service.transaction.placeOrder.authorizeGMOCard({
        auth: auth,
        transactionId: transaction.id,
        orderId: orderId,
        amount: amount,
        creditCard: {
            method: '1',
            cardNo: '4111111111111111',
            expire: '2012',
            securityCode: '123'
        }
    });
    debug('クレジットカードのオーソリがとれました', creditCardAuthorization);

    // 購入者情報登録
    debug('購入者情報を登録します...');
    const profile = {
        givenName: 'てつ',
        familyName: 'やまざき',
        telephone: '09012345678',
        email: <string>process.env.SSKTS_DEVELOPER_EMAIL
    };
    await sskts.service.transaction.placeOrder.setAgentProfile({
        auth: auth,
        transactionId: transaction.id,
        profile: profile
    });
    debug('購入者情報を登録しました');

    // メール追加
    //     const content = `
    // sskts-api:samples 様\n
    // -------------------------------------------------------------------\n
    // この度はご購入いただき誠にありがとうございます。\n
    // -------------------------------------------------------------------\n
    // ◆購入番号 ：${seatReservationAuthorization.result.tmpReserveNum}\n
    // ◆電話番号 ${profile.telephone}\n
    // ◆合計金額 ：${amount}円\n
    // -------------------------------------------------------------------\n
    // `;
    // debug('adding email...');
    // response = await request.post({
    //     url: `${API_ENDPOINT}/transactions/${transactionId}/notifications/email`,
    //     auth: { bearer: accessToken },
    //     body: {
    //         from: 'noreply@example.com',
    //         to: process.env.SSKTS_DEVELOPER_EMAIL,
    //         subject: '購入完了',
    //         content: content
    //     },
    //     json: true,
    //     simple: false,
    //     resolveWithFullResponse: true
    // });
    // debug('addEmail result:', response.statusCode, response.body);
    // if (response.statusCode !== httpStatus.OK) {
    //     throw new Error(response.body.message);
    // }
    // const notificationId = response.body.data.id;

    // メール削除
    // debug('removing email...');
    // response = await request.del({
    //     url: `${API_ENDPOINT}/transactions/${transactionId}/notifications/${notificationId}`,
    //     auth: { bearer: accessToken },
    //     body: {
    //     },
    //     json: true,
    //     simple: false,
    //     resolveWithFullResponse: true
    // });
    // debug('removeEmail result:', response.statusCode, response.body);
    // if (response.statusCode !== httpStatus.NO_CONTENT) {
    //     throw new Error(response.body.message);
    // }

    // 取引確定
    debug('注文取引を確定します...');
    const order = await sskts.service.transaction.placeOrder.confirm({
        auth: auth,
        transactionId: transaction.id
    });
    debug('注文が作成されました', order);
}

main().then(() => {
    debug('main processed.');
}).catch((err) => {
    console.error(err.message);
});
