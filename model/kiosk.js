/**
 * Created by fengpan on 2016/10/22.
 */
const DB = require('../libs/db');
const Util = require('../libs/util');

const TABLE = "kiosk";

class Kiosk{
    static get(dbc, params) {
        return DB.one(dbc, TABLE, '*', Util.getCond(TABLE, params)).then(kiosk => Promise.resolve(Util.format(TABLE, kiosk)));
    }

    /**
     * 获取用户状态
     * @param dbc
     * @param id
     */
    static getStatus(dbc, id) {
        return DB.cell(dbc, TABLE, "kiosk_status", [{kiosk_id: id}]);
    }

    /**
     * 锁定用户行(for update)
     * @param dbc
     * @param params    {Object} {kioskId: Number, session: String}
     */
    static getForUpdate(dbc, params) {
        return DB.oneForUpdate(dbc, TABLE, '*', Util.getCond(TABLE, params));
    }


    /**
     * 更新用户余额
     * @param dbc
     * @param kioskId
     * @param data
     */
    static updateBalance(dbc, kioskId, data) {
        return DB.update(dbc, TABLE, Util.format(TABLE, data, true), [{"kiosk_id": kioskId}]);
    }
}

module.exports = Kiosk;