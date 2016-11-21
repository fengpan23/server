/**
 * Created by fengpan on 2016/10/22.
 */
const db = require('../libs/db');
const Util = require('../libs/util');

const TABLE = "kiosk";

function getCond(params) {
    let cond = [];
    if (params.id) cond.push({kiosk_id: params.id});
    if (params.session) cond.push({kiosk_session: params.session});
    return cond;
}

class Kiosk{
    constructor(){}

    static get(dbc, params) {
        return db.one(dbc, TABLE, '*', getCond(params)).then(kiosk => Promise.resolve(Util.format(TABLE, kiosk)));
    }

    /**
     * 获取用户状态
     * @param dbc
     * @param id
     */
    static getStatus(dbc, id) {
        return db.cell(dbc, TABLE, "kiosk_status", [{kiosk_id: id}]);
    }

    /**
     * 锁定用户行(for update)
     * @param dbc
     * @param params    {Object} {kioskId: Number, session: String}
     */
    static getForUpdate(dbc, params) {
        return db.oneForUpdate(dbc, TABLE, '*', Util.getCond(TABLE, params));
    }


    /**
     * 更新用户余额
     * @param dbc
     * @param kioskId
     * @param data
     */
    static updateBalance(dbc, kioskId, data) {
        return db.update(dbc, TABLE, Util.format(TABLE, data, true), [{"kiosk_id": kioskId}]);
    }
}

module.exports = Kiosk;