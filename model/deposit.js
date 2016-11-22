/**
 * Created by fp on 2016/11/15.
 */
const DB = require('../libs/db');
const Util = require('../libs/util');

const TABLE = "match_deposit";

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
            Promise.resolve(res['match_deposit_amount'])
        );
    }

    static remove(dbc, params){
        return DB.delete(dbc, TABLE, Util.getCond(TABLE, params));
    }

    static one(dbc, params) {
        return DB.one(dbc, TABLE, '*', Util.getCond(TABLE, params)).then(res => Promise.resolve(Util.format(TABLE, res)));
    }

    static select(dbc, params) {
        return DB.select(dbc, TABLE, '*', Util.getCond(TABLE, params));
    }

    static insert(dbc, data) {
        return DB.insert(dbc, TABLE, Util.format(TABLE, data, true));
    }

    static update(dbc, params, data) {
        return DB.update(dbc, TABLE, Util.format(TABLE, data, true), Util.getCond(TABLE, params));
    }
}

module.exports = Deposit;