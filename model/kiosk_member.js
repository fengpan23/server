/**
 * Created by fp on 2016/11/17.
 */

const DB = require('../libs/db');
const Util = require('../libs/util');

const TABLE = 'kiosk_member';

class Member {
    constructor() {}

    static get(dbc, params) {
        return DB.one(dbc, TABLE, "*", Util.getCond(TABLE, params));
    }
}

module.exports = Member;