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
    getkioskwalletforupdate(dbc, kioskid, wallet, ptype) {
        return new Promise(function (resolve, reject) {
            let sql = `select * from ${tablename} where kiosk_wallet_kioskid=${kioskid} `;
            sql += ` and kiosk_wallet_ptype='${ptype}' `;
            sql += ` and kiosk_wallet_name='${wallet}' `;
            sql += "limit 1 for update";
            DB.query(dbc, sql).then(function (res) {
                resolve(res[0]);
            }).catch(function(err){
                reject(err);
            });
        });
    }

    static update(dbc, data, id){
        data.kiosk_wallet_updated = common.datetimezoneformat(new Date(), config.envconf().timezone);
        return DB.update(dbc, TABLE, data, [{kiosk_wallet_id: id}]);
    }

    static get(dbc, params){
        return DB.one(dbc, TABLE, '*', Util.getCond(TABLE, params)).then(wallet => Promise.resolve(Util.format(TABLE, wallet)));
    }
}

module.exports = Wallet;