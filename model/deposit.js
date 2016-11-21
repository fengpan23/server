/**
 * Created by fp on 2016/11/15.
 */

const DB = require('../libs/db');
const Util = require('../libs/util');

const TABLE = "match_deposit";

function _getcond(params) {
    let cond = [];
    if (params.gameid) cond.push({match_deposit_gameid: params.gameid});
    if (params.tableid) cond.push({match_deposit_tableid: params.tableid});
    if (params.kioskid) cond.push({match_deposit_kioskid: params.kioskid});
    if (params.status) cond.push({match_deposit_status: params.status});
    return cond;
}

class Deposit {


    /**
     *
     * @param dbc
     * @param params {Object} {tableDd: Number, gameId: Number. kioskId: Number}
     * @returns {*|Promise.<TResult>}
     */
    static getBalance(dbc, params) {
        let cond = Util.getCond(TABLE, params);
        cond[TABLE + '_status'] = `{DB_NE}2`;

        return DB.one(dbc, TABLE, '*', cond).then(res =>
            Promise.resolve(res.match_deposit_amount)
        );
    }


    refund(dbc, tableid, gameid, kioskid) {
        return new Promise(function (resolve, reject) {
            let deposit = {};
            let sql = `select * from ${tablename} where match_deposit_tableid= ${tableid} `
                + ` and match_deposit_gameid='${gameid}' `
                + ` and match_deposit_kioskid='${kioskid}' `
                + " limit 1 for update ";
            DB.query(dbc, sql).then(function (res) {
                if (common.empty(res[0]))
                    return Promise.reject(new wrong('error', 'unexpected_error', `kioskid:${kioskid} has on deposit on matchdeopsitmodel.refund`));
                else
                    deposit = res[0];
                let cond = [{match_deposit_id: deposit.match_deposit_id},
                    {match_deposit_tableid: tableid},
                    {match_deposit_gameid: gameid},
                    {match_deposit_kioskid: kioskid}];
                return db.delete(dbc, tablename, cond);
            }).then(function () {
                resolve(deposit);
            }).catch(function (err) {
                reject(err);
            });
        });
    }

    static one(dbc, params) {
        return DB.one(dbc, TABLE, '*', Util.getCond(TABLE, params));
    }

    static select(dbc, params) {
        return DB.select(dbc, TABLE, '*', Util.getCond(TABLE, params));
    }

    static insert(dbc, data) {
        return DB.insert(dbc, TABLE, Util.format(TABLE, data, true));
    }

    static update(dbc, params, data) {
        return DB.update(dbc, TABLE, Util.format(TABLE, data, true), Util.getCond(params));
    }
}

module.exports = Deposit;