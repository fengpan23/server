/**
 * Created by fp on 2016/11/17.
 */

const db = require('../libs/db');
const Util = require('../libs/util');

const TABLE = 'kiosk_trx_current';

class Transact{
    static add(dbc, data) {
        let obj = {};
        obj.kiosk_trx_wallet_type = data.ptype;
        obj.kiosk_trx_open_balance = data.open_balance;
        obj.kiosk_trx_amt = data.amount;
        obj.kiosk_trx_status = 1;
        obj.kiosk_trx_type = data.trxtype || 4;
        obj.kiosk_trx_game_desc = '';
        obj.kiosk_trx_gsn = 0;
        obj.kiosk_trx_trxid = 0;
        obj.kiosk_trx_created_by = 0;
        obj.kiosk_trx_created_date = Util.formatDate(new Date(), process.env.TIMEZONE);

        return db.insert(dbc, TABLE, Object.assign(obj, Util.format('kiosk_trx_', data, true)));
    }
}

module.exports = Transact;