/**
 * Created by fp on 2016/11/14.
 */

const DB = require('../libs/db');
const Util = require('../libs/util');

const TABLE = "kiosk_wallet";

class Wallet{
    /**
     * @param dbc
     * @param params {Object}   {kioskId,  wallet, ptype}
     * @returns {*}
     */
    static getForUpdate(dbc, params) {
        return DB.oneForUpdate(dbc, TABLE, '*', Util.getCond(TABLE, params)).then(res => Promise.resolve(Util.format(TABLE, res)));
    }

    static update(dbc, data, id){
        let wallet = Util.format(TABLE, data, true);
        wallet.kiosk_wallet_updated = Util.formatDate(new Date(), process.env.TIMEZONE);
        return DB.update(dbc, TABLE, wallet, [{kiosk_wallet_id: id}]);
    }

    static get(dbc, params){
        return DB.one(dbc, TABLE, '*', Util.getCond(TABLE, params)).then(wallet => Promise.resolve(Util.format(TABLE, wallet)));
    }
}

module.exports = Wallet;