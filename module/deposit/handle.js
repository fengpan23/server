/**
 * Created by fp on 2016/11/18.
 */
const _ = require('underscore');
const Deposit = require('../../model/deposit');
const Member = require('../../model/kiosk_member');
const AgencyTrx = require('../../model/agency_trx');
const Transact = require('./transact');

class Handle{
    constructor(){};

    buy(dbc, options){
        return Deposit.one(dbc, _.pick(options, 'gameId', 'kioskId')).then(res => {
            if (_.isEmpty(res)) {
                let data = _.pick(options, 'gameId', 'tableId', 'agencyId', 'kioskId',  'pType', 'amount');
                data.status = 0;

                return Deposit.insert(dbc, data).then(() => Promise.resolve(options.amount));
            } else if (res.tableid !== options.tableId) {
                return Promise.reject({code: 'invalid_action', message: 'There is deposit in other table on deposit.buy'});
            } else if (res.status === 2) {
                return Promise.reject({code: 'invalid_params', message: 'deposit status is 2 on deposit.buy'});
            } else {
                let cond = _.pick(options, 'tableId', 'gameId', 'kioskId');
                let balance = res.amount + options.amount;
                return Deposit.update(dbc, cond, {amount: balance}).then(() => Promise.resolve(balance));
            }
        }).then(balance => {
            let opt = {trxType: 9, balance: balance, amount: (-1) * options.amount};
            return this._tran(dbc, _.extend(options, opt)).then(() => Promise.resolve(balance));
        });
    }

    refund(dbc, options){
        return Deposit.one(dbc, _.pick(options, 'gameId', 'kioskId', 'tableId')).then(deposit => {
            if(_.isEmpty(deposit)){
                return Promise.resolve();
            }else if(deposit.status !== 1){
                return Deposit.remove(dbc, {id: deposit.id}).then(() => {
                    let opt = {amount: -deposit.amount, trxType: 10, balance: 0};
                    return this._tran(dbc, _.extend(options, opt));
                });
            }
        });
    }

    check(dbc, players, options){
        return Deposit.select(dbc, _.pick(options, 'gameId', 'tableId')).then(list => {
            let reject = [], pass = [];
            players.forEach(player => {
                if (list.has(player.id)) {
                    let deposit = list.get(player.id);
                    if (deposit.amount < options.maxBet || deposit.status === 2) {
                        return reject.push({kioskId: player.id, amount: deposit.amount, mess: 'insufficient deposit'});
                    }
                    pass.push({kioskId: player.id, amount: deposit.amount});
                } else {
                    reject.push({kioskId: player.id, mess: 'not in deposit'});
                }
            });

            return Promise.resolve({reject: reject, pass: pass});
        });
    }

    _tran(dbc, options){
        let opt = _.pick(options, 'kioskId', 'gameId', 'name', 'pType', 'trxType');
        opt.jpType = opt.refund = opt.matchId = 0;
        return Transact.addTransaction(dbc, opt).then(wallet => {
            // console.log('wallet: ', wallet);
            return Member.get(dbc, {kioskId: options.kioskId});
        }).then(member => {
            let opt = _.pick(options, 'agentId', 'kioskId', 'gameId', 'pType', 'trxType', 'balance', 'protect');
            opt.agentid = options.agencyId;
            opt.matchid = 0;
            opt.gamematchid = options.matchId || 0;
            opt.memberid = member.memberid || 0;
            opt.affiliateid = member.affiliateid || 0;
            opt.total = opt.current = options.amount;
            opt.protect = opt.protect || 0;

            return AgencyTrx.add(dbc, opt);
        });
    }
}


module.exports = new Handle();