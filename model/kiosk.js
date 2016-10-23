/**
 * Created by fengpan on 2016/10/22.
 */

"use strict";
const db = require('../libs/db');

const TABLE = "kiosk";

function Cond(params) {
    let cond = [];
    if (params.id) cond.push({kiosk_id: params.id});
    if (params.session) cond.push({kiosk_session: params.session});
    return cond;
}

class Kiosk{
    constructor(){

    }

    get(dbc, params) {
        return db.one(dbc, TABLE, '*', Cond(params));
    }

    /**
     * 获取用户状态
     * @param dbc
     * @param kiosk_id
     */
    getStatus(dbc, id) {
        return db.cell(dbc, TABLE, "kiosk_status", [{kiosk_id: id}]);
    }

    /**
     * 锁定用户行(for update)
     * @param dbc
     * @param client
     */
    getkioskforupdate(dbc, kioskid, session) {
        return new Promise(function (resolve, reject) {
            let sql = `select * from ${tablename} where kiosk_id= ${kioskid} `;
            if (!!session)
                sql += ` and kiosk_session='${session}' `;
            sql += "limit 1 for update";
            db.query(dbc, sql).then(function (res) {
                return Promise.resolve(res);
            }).then(function (res) {
                if (common.empty(res[0])) {
                    return db.query(dbc, sql)
                } else {
                    return Promise.resolve(res);
                }
            }).then(function (res) {
                if (common.empty(res[0])) {
                    return db.query(dbc, sql)
                } else {
                    return Promise.resolve(res);
                }
            }).then(function (res) {
                resolve(res[0]);
            }).catch(function (err) {
                reject(err);
            });
        });
    }


    /**
     * 更新用户余额
     * @param dbc
     * @param kiosk
     * @param amount
     */
    updatebalance(dbc, kiosk, amount, ptype) {
        let cond = [{"kiosk_id": kiosk.kiosk_id}];
        let data = {};
        let pointname = ptype ? profile.getpointname(ptype) : profile.getpointname();
        data[pointname] = kiosk[pointname] + amount;
        return db.update(dbc, tablename, data, cond);
    }
}

module.exports = new Kiosk();