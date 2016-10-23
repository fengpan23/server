/**
 * Created by fengpan on 2016/10/22.
 */

const Kiosk = require('../model/kiosk');

class Player {
    static verify(session){
            Kiosk.get(dbc, {session: session}).then(kiosk => {
                if (kiosk){
                    if (kiosk.kiosk_status !== 1)
                        return Promise.reject(new wrong('error', 'invalid_user', 'kiosk is not active on kiosk.load'));

                }
                return Promise.reject(new wrong('error', 'unknown_session', 'cat not get kiosk by session on kiosk.load'));

    }

    constructor() {

    }

    init(){

            return agencymodel.getagency(request.dbc, {agencyid: _kiosk.kiosk_agencyid});
        }).then(function (_agency) {
            request.propertyset('agency', _agency);
            let poolagentid = _agency.agency_follow_top_agentpool === 'Y' ?
                (_agency.agency_top_agencyid <= 0 ? _agency.agency_id : _agency.agency_top_agencyid) : _agency.agency_id;
            let topagentid = _agency.agency_top_agencyid;

            if ((table.agentid === 0 && table.topagentid === topagentid) || poolagentid === table.poolagentid) {
                let agentstructure = (typeof _agency.agency_upline_structure === 'string') ?
                    _agency.agency_upline_structure.split(",") : [];
                agentstructure.push(_agency.agency_id);
                return agencysuspendmodel.getsuspendcount(request.dbc, agentstructure);
            } else
                return Promise.reject(new wrong('error', 'agent_suppended', 'agency is not active on kiosk.load'));
        }).then(function (count) {
            if (count > 0)
                reject(new wrong('error', 'agent_suppended', 'there are agency suspend on kiosk.load'));
            else
                resolve();
        }).catch(function (err) {
            reject(err);
        });
    });
    return Kiosk.get();
    }
}


module.exports = Player;