/**
 * Created by fp on 2016/12/2.
 */

const _ = require('underscore');
const DB = require('../libs/db');
const Util = require('../libs/util');

const TABLE = 'match_result_current';

class MatchResult{
    static add(dbc, data) {
        let match = Util.format('', data, true);
        match.created = Util.formatDate(new Date(), process.env.TIMEZONE);

        return DB.insert(dbc, TABLE, match);
    }
}

module.exports = MatchResult;