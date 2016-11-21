/**
 * Created by fp on 2016/11/16.
 */

const Db = require('../libs/db');

const TABLE = "kiosk_wallet_trx";

class WalletTrx{

    addkioskwallettrx(dbc, data) {
        let trxdata = {
            kiosk_wallet_trx_agencyid: data.agencyid,
            kiosk_wallet_trx_kioskid: data.kioskid,
            kiosk_wallet_trx_kiosktype: data.kiosktype,
            kiosk_wallet_trx_type: data.trxtype,
            kiosk_wallet_trx_ptype: data.ptype,
            kiosk_wallet_trx_name: data.name,
            kiosk_wallet_trx_gameid: data.gameid,
            kiosk_wallet_trx_matchid: data.matchid,
            kiosk_wallet_trx_openbal: data.openbal,
            kiosk_wallet_trx_amount: data.amount,
            kiosk_wallet_trx_closebal: data.closebal,
            kiosk_wallet_trx_refund: data.refund,
            kiosk_wallet_trx_jptype: data.jptype,
            kiosk_wallet_trx_created: common.datetimezoneformat(data.created || new Date(), config.envconf().timezone)
        };
        return db.insert(dbc, tablename, trxdata);
    }

    select(dbc, params){
        let cond = _getcond(params);
        return db.select(dbc, tablename, defaultcolumn, cond);
    }

}

module.exports = WalletTrx;