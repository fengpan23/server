/**
 * Created by fp on 2016/11/14.
 */

const DB = require('../libs/db');
const Util = require('../libs/util');

const TABLE = "kiosk_wallet";

function getCond(params) {
    let cond = [];
    if (params.kioskid) cond.push({kiosk_wallet_kioskid: params.kioskid});
    if (params.ptype) cond.push({kiosk_wallet_ptype: params.ptype});
    if (params.name) cond.push({kiosk_wallet_name: params.name});
    if (params.agencyid) cond.push({kiosk_wallet_agencyid: params.agencyid});
    return cond;
}

class Wallet{
    /**
     * @param dbc
     * @param params {Object}   {kioskId,  wallet, ptype}
     * @returns {*}
     */
    static getForUpdate(dbc, params) {
        return DB.oneForUpdate(dbc, TABLE, '*', Util.getCond(TABLE, params));
    }

    static update(dbc, data, id){
        data.kiosk_wallet_updated = Util.formatDate(new Date(), process.env.TIMEZONE);
        return DB.update(dbc, TABLE, data, [{kiosk_wallet_id: id}]);
    }

    static get(dbc, params){
        return DB.one(dbc, TABLE, '*', Util.getCond(TABLE, params)).then(wallet => Promise.resolve(Util.format(TABLE, wallet)));
    }
}

module.exports = Wallet;