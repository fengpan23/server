/**
 * Created by fp on 2016/11/21.
 */

const _ = require('underscore');
const KioskWallet = require('../../model/kiosk_wallet');

class Transact {
    constructor() {}

    addtrx(dbc, kioskid, gameprofile, matchid, amount, refund, jptype, trxtype) {
        amount = common.tonumber(amount, 4);
        let result = {
            kiosk: {},
            wallet: {}
        };
        if (amount === 0) {
            return kioskmodel.getkiosk(dbc, {id: kioskid}).then(function (_kiosk) {
                if (common.empty(_kiosk))
                    return Promise.reject(new wrong('error', 'unexpected_error', 'kiosk is empty on kiosktransaction.addTransaction'));
                result.kiosk = common.clone(_kiosk);
                return kioskwalletmodel.getwallet(dbc, {
                    kioskid: _kiosk.kiosk_id,
                    ptype: profile.getptype(),
                    name: profile.getwallettype()
                });
            }).then(function (_wallet) {
                if (common.empty(_wallet))
                    return Promise.reject(new wrong('error', 'insufficient_fund', 'wallet is empty on kiosktransaction.addTransaction'));
                result.wallet = common.clone(_wallet);
                return Promise.resolve(result);
            });
        }
        let me = this;
        matchid = common.tonumber(matchid, 0);
        refund = common.tonumber(refund, 4);
        jptype = common.tonumber(jptype, 0);
        trxtype = common.tonumber(trxtype, 0) || 4;
        //let kiosk = {};
        let ktrxtime = new Date();
        let ptype = profile.getptype();
        let pointname = profile.getpointname(ptype);

        return new Promise(function (resolve, reject) {
            kioskmodel.getkioskforupdate(dbc, kioskid).then(function (_kiosk) {
                if (common.empty(_kiosk)) {
                    return Promise.reject(new wrong('error', 'unexpected_error', 'kiosk is empty on kiosktransaction.addtrx'));
                }
                result.kiosk = common.clone(_kiosk);
                if (amount < 0 && result.kiosk[pointname] + amount < 0)
                    return Promise.reject(new wrong('error', 'insufficient_fund', 'insufficient_fund on kiosktransaction.addtrx'));

                return me.addwallettrx(dbc, result.kiosk, gameprofile, matchid, amount, refund, jptype, trxtype);
            }).then(function (_wallet) {
                result.wallet = common.clone(_wallet);
                return kioskmodel.updatebalance(dbc, result.kiosk, amount);
            }).then(function () {
                let trx_data = {
                    kioskid: result.kiosk.kiosk_id,
                    agencyid: result.kiosk.kiosk_agencyid,
                    ptype: ptype,
                    open_balance: result.kiosk[pointname],
                    amount: amount,
                    balance: common.tonumber(result.kiosk[pointname] + amount),
                    gameid: gameprofile.id,
                    matchid: matchid,
                    device: result.kiosk.kiosk_type,
                    jptype: jptype,
                    refund: refund,
                    trxtype: trxtype,
                    created_date: ktrxtime
                };
                return kiosktrxmodel.addkiosktrx(dbc, trx_data).then(function (res) {
                    result.kiosk[pointname] = trx_data.balance;
                    return Promise.resolve(res.insertId);
                });
            }).then(function (trxid) {
                if (!gameprofile.setting.agency_percentage) {
                    return Promise.resolve();
                }
                return agencymodel.getagency(dbc, {agencyid: result.kiosk.kiosk_agencyid}).then(function (_agency) {
                    let upline_ids = _agency.agency_upline_structure.split(',');
                    upline_ids.reverse();
                    upline_ids.pop();
                    if (common.empty(upline_ids)) {
                        return Promise.reject(new wrong('error', 'unexpected_error', 'upline_structure should not be null on kiosktransaction.addTransaction.'))
                    } else {
                        return agencymodel.getagencypercentage(dbc, upline_ids).then(function (percents) {
                            let datas = [];
                            let percent = {
                                'layer': 0,
                                'last': 0,
                                'current': 0,
                                'agent': 0,
                                'balance': amount,
                                'amount': 0
                            };
                            if (percents.size === upline_ids.length) {
                                for (let agentid of upline_ids) {
                                    percent.layer++;
                                    percent.agentid = agentid;
                                    percent.agent = common.tonumber(percents.get(agentid));
                                    percent.current = percent.agent - percent.last;
                                    percent.amount = percent.current > 0 ? common.tonumber(amount * (percent.current / 100)) : 0;
                                    percent.balance -= percent.amount;
                                    percent.last = common.tonumber(percent.agent);
                                    datas.push([
                                        agentid,
                                        common.datetimezoneformat(ktrxtime, config.envconf().timezone),
                                        trxid,
                                        percent.layer,
                                        percent.agent,
                                        amount,
                                        percent.amount * (-1),
                                        percent.balance * (-1)
                                    ]);
                                }
                                return agencypercentagemodel.addpercentages(dbc, datas);
                            }
                            return Promise.resolve();
                        });
                    }
                });
            }).then(function () {
                resolve(result);
            }).catch(function (err) {
                reject(err);
            });
        });
    }

    addwallettrx(dbc, kiosk, gameprofile, matchid, amount, refund, jptype, trxtype) {
        amount = common.tonumber(amount, 4);
        if (!common.validate({kiosk_id: "number+"}, kiosk))
            return Promise.reject(new wrong('error', 'invalid_params', 'invalid kiosk params on kiosktransaction.addwallettrx'));
        if (amount === 0) {
            return kioskwalletmodel.getwallet(dbc, {
                kioskid: kiosk.kiosk_id,
                ptype: profile.getptype(),
                name: profile.getwallettype()
            }).then(function (_wallet) {
                if (common.empty(_wallet))
                    return Promise.reject(new wrong('error', 'insufficient_fund', 'cat not get wallet on kiosktransaction.addwallettrx'));
                return Promise.resolve(_wallet);
            });
        }

        refund = common.tonumber(refund, 4);
        jptype = common.tonumber(jptype, 0);
        let ptype = profile.getptype();
        let wallet = profile.getwallettype();
        return new Promise(function (resolve, reject) {
            let subwallet = {};
            let orisubwallet = {};
            kioskwalletmodel.getkioskwalletforupdate(dbc, kiosk.kiosk_id, wallet, ptype).then(function (_subwallet) {
                if (common.empty(_subwallet)) {
                    return Promise.reject(new wrong('error', 'insufficient_fund', 'cat not get wallet on kiosktransaction.addwallettrx'));
                }
                subwallet = common.clone(_subwallet);
                orisubwallet = common.clone(_subwallet);
                let balance = common.tonumber(subwallet['kiosk_wallet_balance'] + amount);
                if (balance < 0)
                    return Promise.reject(new wrong('error', 'insufficient_fund', 'insufficient_fund on kiosktransaction.addwallettrx'));
                subwallet['kiosk_wallet_balance'] = balance;
                let clearrolling = balance < (common.tonumber(gameprofile.setting.wallet_clearrolling_minamt) || 10);
                if (clearrolling)
                    subwallet['kiosk_wallet_rolling'] = 0;
                if (amount < 0 && trxtype === 4) {//rolling
                    subwallet['kiosk_wallet_rolling'] = subwallet['kiosk_wallet_rolling'] > Math.abs(amount) ? subwallet['kiosk_wallet_rolling'] + amount : 0;
                } else {//pass rolling
                    return Promise.resolve();
                }

                //update main rolling
                return new Promise(function (res, rej) {
                    if (wallet === 'main')
                        return res();

                    kioskwalletmodel.getkioskwalletforupdate(dbc, kiosk.kiosk_id, 'main', ptype).then(function (_mainwallet) {
                        if (common.empty(_mainwallet))
                            return Promise.reject(new wrong('error', 'insufficient_fund', 'cat not get mainwallet on kiosktransaction.addwallettrx'));

                        if (_mainwallet['kiosk_wallet_rolling'] > 0) {
                            _mainwallet['kiosk_wallet_rolling'] = _mainwallet['kiosk_wallet_rolling'] > Math.abs(amount) ? _mainwallet['kiosk_wallet_rolling'] + amount : 0;
                            return kioskwalletmodel.update(dbc, _mainwallet, _mainwallet['kiosk_wallet_id']);
                            //if (clearrolling) {
                            //    _mainwallet['kiosk_wallet_rolling'] = 0;
                            //    return kioskwalletmodel.update(dbc, _mainwallet, _mainwallet['kiosk_wallet_id']);
                            //}
                            //if (amount < 0 && trxtype === 4) {
                            //    _mainwallet['kiosk_wallet_rolling'] = _mainwallet['kiosk_wallet_rolling'] > Math.abs(amount) ? _mainwallet['kiosk_wallet_rolling'] + amount : 0;
                            //    return kioskwalletmodel.update(dbc, _mainwallet, _mainwallet['kiosk_wallet_id']);
                            //}
                        }
                        return Promise.resolve();
                    }).then(function () {
                        res();
                    }).catch(function (err) {
                        rej(err);
                    });
                });
            }).then(function () {
                return kioskwalletmodel.update(dbc, subwallet, subwallet['kiosk_wallet_id']);
            }).then(function () {
                let data = {
                    agencyid: kiosk.kiosk_agencyid,
                    kioskid: kiosk.kiosk_id,
                    ptype: ptype,
                    name: wallet,
                    gameid: gameprofile.id,
                    matchid: matchid,
                    openbal: orisubwallet['kiosk_wallet_balance'],
                    amount: amount,
                    closebal: subwallet['kiosk_wallet_balance'],
                    refund: refund,
                    jptype: jptype
                };
                return kioskwallettrxmodel.addkioskwallettrx(dbc, data);
            }).then(function () {
                resolve(subwallet);
            }).catch(function (err) {
                reject(err);
            });
        });
    }

    addTransaction(dbc, options) {
        // let ptype = profile.getptype();
        // let wallet = profile.getwallettype();

        // if (amount === 0) {
        //     return kioskmodel.getkiosk(dbc, {id: kioskid}).then(function (_kiosk) {
        //         if (common.empty(_kiosk))
        //             return Promise.reject(new wrong('error', 'unexpected_error', 'kiosk is empty on kiosktransaction.addtransaction'));
        //         result.kiosk = common.clone(_kiosk);
        //         return kioskwalletmodel.getwallet(dbc, {
        //             kioskid: kioskid,
        //             ptype: ptype,
        //             name: wallet
        //         });
        //     }).then(function (_wallet) {
        //         if (common.empty(_wallet))
        //             return Promise.reject(new wrong('error', 'insufficient_fund', 'wallet is empty on kiosktransaction.addtransaction'));
        //         result.wallet = common.clone(_wallet);
        //         return Promise.resolve(result);
        //     });
        // }

        // if (trxtype === 4 && common.empty(matchid))
        //     return Promise.reject(new wrong('error', 'invalid_params', 'no MatchID on kiosktransaction.addtransaction'));
        //
        // let balance = 0;
        return KioskWallet.getForUpdate(dbc, _.pick(options, 'kioskId', 'wallet', 'ptype'))
            .then(wallet => {
                console.log('wallet: ', wallet);
                let balance = common.tonumber(_wallet['kiosk_wallet_balance'] + amount);
                if (balance < 0)
                    return Promise.reject(new wrong('error', 'insufficient_fund', 'insufficient_fund on kiosktransaction.addtransaction'));

                if (amount < 0 && trxtype === 4) {//rolling
                    let subrolling = Math.abs(amount);
                    result.wallet['kiosk_wallet_rolling'] = result.wallet['kiosk_wallet_rolling'] > subrolling ? result.wallet['kiosk_wallet_rolling'] - subrolling : 0;
                    if (result.wallet['kiosk_wallet_name'] !== 'main')
                        result.wallet['kiosk_wallet_rolledout'] += subrolling;
                }
                let wallettrx = {
                    agencyid: result.kiosk.kiosk_agencyid,
                    kioskid: kioskid,
                    kiosktype: result.kiosk.kiosk_type,
                    trxtype: trxtype,
                    ptype: ptype,
                    name: wallet,
                    gameid: gameprofile.id,
                    matchid: matchid,
                    openbal: result.wallet['kiosk_wallet_balance'],
                    amount: amount,
                    closebal: balance,
                    refund: refund,
                    jptype: jptype
                };
                return kioskwallettrxmodel.addkioskwallettrx(dbc, wallettrx);
            }).then(function () {
                //if (balance < (common.tonumber(gameprofile.setting.wallet_clearrolling_minamt) || 10))
                //    result.wallet['kiosk_wallet_rolling'] = 0;
                result.wallet['kiosk_wallet_balance'] = balance;
                return kioskwalletmodel.update(dbc, result.wallet, result.wallet['kiosk_wallet_id']);
            }).then(function () {
                resolve(result);
            });
    }

    depositrolling(dbc, kiosk, amount) {
        amount = common.tonumber(amount, 4, true);
        if (amount === 0)
            return Promise.resolve();

        if (!common.validate({kiosk_id: "number+"}, kiosk))
            return Promise.reject(new wrong('error', 'invalid_params', 'invalid kiosk params on kiosktransaction.addwallettrx'));

        let ptype = profile.getptype();
        let wallet = profile.getwallettype();
        return new Promise(function (resolve, reject) {
            let kioskwallet = {};
            kioskwalletmodel.getkioskwalletforupdate(dbc, kiosk.kiosk_id, wallet, ptype).then(function (_wallet) {
                if (common.empty(_wallet)) {
                    return Promise.reject(new wrong('error', 'insufficient_fund', 'cat not get wallet on kiosktransaction.addwallettrx'));
                }
                kioskwallet = common.clone(_wallet);
                if (kioskwallet['kiosk_wallet_rolling'] > 0)
                    kioskwallet['kiosk_wallet_rolling'] = kioskwallet['kiosk_wallet_rolling'] > amount ? kioskwallet['kiosk_wallet_rolling'] - amount : 0;
                if (wallet !== 'main')
                    kioskwallet['kiosk_wallet_rolledout'] += amount;
                return kioskwalletmodel.update(dbc, kioskwallet, kioskwallet['kiosk_wallet_id']);
            }).then(function () {
                resolve(kioskwallet);
            }).catch(function (err) {
                reject(err);
            });
        });
    }

    clearrolling(dbc, kioskid, gameprofile, depositbal) {
        return new Promise(function (resolve, reject) {
            let ptype = profile.getptype();
            let wallet = profile.getwallettype();
            depositbal = common.tonumber(depositbal);
            kioskwalletmodel.getkioskwalletforupdate(dbc, kioskid, wallet, ptype).then(function (wallet) {
                let minamt = common.tonumber(gameprofile.setting.wallet_clearrolling_minamt) || 10;
                if (common.tonumber(wallet['kiosk_wallet_balance'] + depositbal) < minamt) {
                    wallet['kiosk_wallet_rolling'] = 0;
                    return kioskwalletmodel.update(dbc, wallet, wallet['kiosk_wallet_id']);
                } else {
                    return Promise.resolve();
                }
            }).then(function () {
                resolve();
            }).catch(function (err) {
                reject(err);
            });
        });
    }
}

module.exports = new Transact();
