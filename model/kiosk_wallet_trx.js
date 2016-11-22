/**
 * Created by fp on 2016/11/16.
 */

const DB = require('../libs/db');
const Util = require('../libs/util');

const TABLE = "kiosk_wallet_trx";

class WalletTrx{
    static add(dbc, data) {
        let d = Util.format(TABLE, data, true);
        d.kiosk_wallet_trx_created = Util.formatDate(new Date(), process.env.TIMEZONE);

        return DB.insert(dbc, TABLE, d);
    }

    select(dbc, params){
        let cond = _getcond(params);
        return db.select(dbc, tablename, defaultcolumn, cond);
    }

}

module.exports = WalletTrx;