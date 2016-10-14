/**
 * Created by fp on 2016/10/14.
 */
"use strict";
const _ = require('underscore');
const db = require('../libs/db');
const TABLE = 'agency';

class Agency{
    constructor() {
    }

    /**
     * 获取代理信息
     * @param dbc
     * @param params
     */
    get(dbc, params) {
        let cond = [{"agency_id": params.agencyid}];
        if (params && params.agencySite) {
            cond.push({agency_site: params.agencySite});
        }
        return db.one(dbc, TABLE, '*', cond);
    }

    /**
     * 获取上线代理的分成记录
     * @param dbc
     * @param ids {String} up line ids
     */
    getPercentage(dbc, ids) {
        return new Promise((resolve, reject) => {
            db.select(dbc, TABLE, ['agency_id', 'agency_percentage'], [{"agency_id": {"IN": ids}}], {agency_id: "DESC"}).then(result => {
                let map = new Map();
                for (let ap of result) {
                    map.set(ap.agency_id, ap.agency_percentage)
                }
                resolve(map);
            }).catch(reject)
        });
    }

    /**
     * 获取上级代理的id
     * @param dbc
     * @param status    agency status
     * @param id    agency top agency id
     * @return array|bool|null
     */
    getTopAgentId(dbc, status, id) {
        let filter = [{"agency_status": status}, {"agency_top_agencyid": "{DB_NE}0"}];

        if (_.isArray(id) && id.length > 0) {
            filter.push({'agency_id': {'LIST': id}});
        }
        return db.onerow(dbc, TABLE, "{DB_DISTINCT}agency_top_agencyid", filter, "agency_top_agencyid");
    }
}
module.exports = new Agency();