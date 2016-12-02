/**
 * Created by fp on 2016/11/23.
 */

"use strict";
const DB = require('../libs/db');
const Util = require('../libs/util');

const TABLE = 'match_master_current';

class MasterCurrent {
    static add(dbc, data) {
        return DB.insert(dbc, TABLE, data);
    }

    static update(dbc, params, data) {
        let match = Util.format(TABLE, data, true);
        match.updated = Util.formatDate(new Date(), process.env.TIMEZONE);

        return DB.update(dbc, TABLE, match, Util.getCond(TABLE, params));
    }

    select(dbc, params){
        let cond = _getcond(params);
        return db.select(dbc, tablename, defaultcolumn, cond);
    }
}

module.exports = MasterCurrent;