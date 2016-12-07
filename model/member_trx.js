"use strict";
const DB = require('../libs/db');
const Util = require('../libs/util');

class MemberTrx {
    constructor(){}

    add(dbc, data){
        console.log('data: ', data);
        let trx = Util.format('member_trx_', data, true);
        trx.status = 1;
        trx.created_time = Util.formatDate(new Date(), process.env.TIMEZONE);
        trx.memberusername = kiosk.username;
        trx.memberid = kioskmember.kiosk_member_memberid;
        trx.affiliateid = !common.empty(kioskmember.kiosk_member_affiliateid) ? kioskmember.kiosk_member_affiliateid : 1;
        trx.type = 4;
        trx.totalbet = common.isfloat(bettotal) ? common.float2fix(bettotal) : bettotal;
        trx.totalwin = common.isfloat(totalwin) ? common.float2fix(totalwin) : totalwin;
        trx.totalrefund = common.isfloat(totalrefund) ? common.float2fix(totalrefund) : totalrefund;
        trx.jptype = jptype;
        trx.jpamt = jpamt;
        trx.comission = common.isfloat(comission) ? common.float2fix(comission) : comission;
        trx.gameid = game.id;
        trx.gametypeid = 0;
        trx.matchid = matchmasterid;

        let TABLE;
        if (data.isp2p) {
            TABLE = `${thirdpartydb}.member_trx_p2p`;
            trx.comission = common.isfloat(comission) ? common.float2fix(comission) : comission;
        } else {
            TABLE = `${thirdpartydb}.member_trx`;
            trx.result = JSON.stringify(matchresult);
            trx.gamename = game.name_eng;
            trx.gametype = game.type;
            trx.process = 'raw';
        }
        this._add(dbc, TABLE, trx);
    }

    _add(dbc, table, data){
        return DB.insert(dbc, table, data);
    }
}

module.exports = new MemberTrx();