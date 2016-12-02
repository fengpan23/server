/**
 * Created by fp on 2016/12/2.
 */

const _ = require('underscore');
const db = require('../libs/db');
const Util = require('../libs/util');

const TABLE = 'match_result_current';

class MatchResult{
    static add(dbc, data) {
        let match = Util.format(TABLE, data, true);
        match.created = Util.formatDate(new Date(), process.env.TIMEZONE);

        return db.insert(dbc, TABLE, data);
    }
}

module.exports = MatchResult;