/**
 * Created by fp on 2016/10/23.
 */
const db = require('../libs/db');

const TABLE = 'agency_suspend';

class Suspend{
    constructor() {

    }

    static getCount(dbc, agentstructure) {
        let cond = [
            {"agency_suspend_agencyid": {"IN": agentstructure}},
            {"agency_suspend_status": 1}
        ];
        return db.count(dbc, TABLE, '*', cond);
    }
}

module.exports = Suspend;
