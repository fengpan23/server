/**
 * Created by fp on 2016/11/18.
 */
const _ = require('underscore');
const Deposit = require('../../model/deposit');
const Transact = require('./transact');

class Handle{
    constructor(){};

    buy(dbc, options){
        return Deposit.one(dbc, _.pick(options, 'gameId', 'kioskId')).then(res => {
            if (_.isEmpty(res)) {
                let data = _.pick(options, 'gameId', 'tableId', 'agencyId', 'kioskId',  'pType', 'amount');
                data.status = 0;

                return Deposit.insert(dbc, data);
            } else if (res.tableid !== options.tableId) {
                return Promise.reject({code: 'invalid_action', message: 'There is deposit in other table on deposit.buy'});
            } else if (res.status === 2) {
                return Promise.reject({code: 'invalid_params', message: 'deposit status is 2 on deposit.buy'});
            } else {
                let cond = _.pick(options, 'tableId', 'gameId', 'kioskId');
                return Deposit.update(dbc, cond, {amount: options.amount || 0}).then(balance => {
                    return Promise.resolve(balance);
                });
            }
        }).then(() => {
            let amount = +options.amount;
            return Transact.addTransaction(dbc, client.kiosk.kiosk_id, gameprofile, 0, (-1) * amount, 0, 0, 9);
        }).then(function (trx) {
            if (!common.empty(trx.kiosk)) client.kiosk = common.clone(trx.kiosk);
            if (!common.empty(trx.wallet)) client.wallet = common.clone(trx.wallet);
            return kioskmembermodel.getkioskmember(dbc, client.kiosk);
        }).then(function (kioskmember) {
            if (common.empty(kioskmember))
                kioskmember = {
                    kiosk_member_memberid: 0,
                    kiosk_member_affiliateid: 0
                };
            let data = {
                agentid: client.kiosk.kiosk_agencyid,
                kioskid: client.kiosk.kiosk_id,
                gameid: table.gameid,
                matchid: 0,
                gamematchid: table.matchid || 0,
                memberid: kioskmember.kiosk_member_memberid,
                affiliateid: kioskmember.kiosk_member_affiliateid,
                ptype: profile.getptype(),
                trxtype: 1,
                total: amount,
                current: amount,
                protect: 0,
                balance: depositbalance,
                created: ktrxtime
            };
            return gameagenttransmodel.addtrans(dbc, data);
        }).then(function () {
            resolve(depositbalance);
        }).catch(function (err) {
            console.error(err);
        });
    }
}

module.exports = new Handle();