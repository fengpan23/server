/**
 * Created by fp on 2016/10/14.
 */

"use strict";
const common = require('../../utils/common');
const configs = require('../../utils/config');
const db = require('../../utils/db.js');
const wrong = require('../../utils/wrong');
const syslog = require('../../utils/syslog.js');
const tablemodel = require('../model/gamemultiplayertablemodel');
const roommodel = require('../model/gamemultiplayerroommodel');
const seatmodel = require('../model/gamemultiplayerseatmodel');
const matchmodel = require('../model/gamemultiplayermatchmodel');
const kioskmodel = require('../model/kioskmodel');
const matchdepositmodel = require('../model/matchdepositmodel');
const gpooliomodel = require('../model/gpooliomodel');
const profile = require('./profile.js');
const gameagenttransmodel = require('../model/gameagenttransmodel');
const kioskmembermodel = require('../model/kioskmembermodel');
const kioskmatch = require('../module/kioskmatch.js');
const kiosktransaction = require('../module/kiosktransaction.js');


class gamematch {
    constructor() {

    }

    /**
     * 桌子(游戏)场次初始化
     * @param dbc
     * @param tableid
     * @param seats
     * @param callback
     */
    init(dbc, tableid, seats, reload) {
        let me = this;
        return new Promise(function (resolve, reject) {
            let table;
            tablemodel.gettable(dbc, {tableid: tableid}).then(function (_table) {
                if (common.empty(_table)) {
                    return Promise.reject(new wrong('error', 'system_maintenance', 'table not exits on gamematch.init'));
                }
                table = {
                    tableid: _table.game_multiplayer_table_id,
                    agentid: _table.game_multiplayer_table_agentid,
                    topagentid: _table.game_multiplayer_table_topagentid,
                    gameid: _table.game_multiplayer_table_gameid,
                    roomid: _table.game_multiplayer_table_roomid,
                    status: _table.game_multiplayer_table_status,
                    ptype: _table.game_multiplayer_table_ptype,
                    maxkiosk: _table.game_multiplayer_table_maxkiosk,
                    curkiosk: _table.game_multiplayer_table_curkiosk,
                    ip: _table.game_multiplayer_table_ip,
                    port: _table.game_multiplayer_table_port,
                    updated: _table.game_multiplayer_table_updated,
                    created: _table.game_multiplayer_table_created,
                    index: _table.game_multiplayer_table_index,
                    minbet: _table.game_multiplayer_table_minbet,
                    maxbet: _table.game_multiplayer_table_maxbet,
                    minbuy: _table.game_multiplayer_table_minbuy,
                    maxbuy: _table.game_multiplayer_table_maxbuy,
                    stakes: _table.game_multiplayer_table_stakes,
                    dfstake: _table.game_multiplayer_table_default_stake,
                    ptmultiplier: _table.game_multiplayer_table_ptmultiplier,
                    extend: common.empty(_table.game_multiplayer_table_extend) ? {} : JSON.parse(_table.game_multiplayer_table_extend)
                };
                if (!reload && (table.curkiosk > 0 || table.status === 2)) {
                    table.curkiosk = 0;
                    table.status = 1;
                    return tablemodel.updatetable(dbc, {tableid: tableid}, {curkiosk: 0, status: 1});
                } else {
                    return Promise.resolve();
                }
            }).then(function () {
                if (common.empty(table.roomid)) {
                    return Promise.resolve();
                } else {
                    return roommodel.getroom(dbc, {roomid: table.roomid});
                }

            }).then(function (room) {
                if (!common.empty(room)) {
                    if (room.game_multiplayer_room_topagentid) table.topagentid = room.game_multiplayer_room_topagentid;
                    if (room.game_multiplayer_room_agentid) table.agentid = room.game_multiplayer_room_agentid;
                    if (room.game_multiplayer_room_gameid) table.gameid = room.game_multiplayer_room_gameid;
                    if (room.game_multiplayer_room_status) table.status = room.game_multiplayer_room_status;
                    if (room.game_multiplayer_room_index) table.index = room.game_multiplayer_room_index;
                    if (room.game_multiplayer_room_ptype) table.ptype = room.game_multiplayer_room_ptype;
                    if (room.game_multiplayer_room_minbet) table.minbet = room.game_multiplayer_room_minbet;
                    if (room.game_multiplayer_room_maxbet) table.maxbet = room.game_multiplayer_room_maxbet;
                    if (room.game_multiplayer_room_minbuy) table.minbuy = room.game_multiplayer_room_minbuy;
                    if (room.game_multiplayer_room_maxbuy) table.maxbuy = room.game_multiplayer_room_maxbuy;
                    if (room.game_multiplayer_room_maxkiosk) table.maxkiosk = room.game_multiplayer_room_maxkiosk;
                    if (room.game_multiplayer_room_curkiosk) table.curkiosk = room.game_multiplayer_room_curkiosk;
                    if (room.game_multiplayer_room_stakes) table.stakes = room.game_multiplayer_room_stakes;
                    if (room.game_multiplayer_room_default_stake) table.dfstake = room.game_multiplayer_room_default_stake;
                    if (room.game_multiplayer_room_ptmultiplier) table.ptmultiplier = room.game_multiplayer_room_ptmultiplier;
                }
                if (!common.validate({maxkiosk: 'number+'}, table)) {
                    return Promise.reject(new wrong('error', 'system_maintenance', 'table has no seats on gamematch.init'));
                }
                return seatmodel.getseats(dbc, {tableid: tableid});
            }).then(function (_seats) {
                let updateindex = [];
                let insertindex = [];

                if (reload) {
                    _seats.forEach(function (seat) {
                        if (seats[seat.game_multiplayer_seat_index] == 'empty' && seat.game_multiplayer_seat_state !== 'idle')
                            updateindex.push(seat.game_multiplayer_seat_index);
                    });
                } else {
                    _seats.forEach(function (seat) {
                        if (seat.game_multiplayer_seat_state !== 'idle'
                            || seat.game_multiplayer_seat_kioskid !== null
                            || seat.game_multiplayer_seat_agentid !== table.agentid
                            || seat.game_multiplayer_seat_gameid !== table.gameid
                            || seat.game_multiplayer_seat_roomid !== table.roomid)
                            updateindex.push(seat.game_multiplayer_seat_index);
                        seats[seat.game_multiplayer_seat_index] = 'empty';
                    });
                    for (let i = 1; i <= table.maxkiosk; i++) {
                        if (seats[i] != 'empty') {
                            insertindex.push(i);
                            seats[i] = 'empty';
                        }
                    }
                }

                let allarray = [];
                if (updateindex.length > 0) {//重置座位
                    let data = {
                        agentid: table.agentid,
                        gameid: table.gameid,
                        roomid: table.roomid,
                        state: 'idle',
                        kioskid: null,
                        ip: '0.0.0.0',
                        port: 0
                    };
                    allarray.push(seatmodel.updateseat(dbc, {tableid: tableid, seatindex: {IN: updateindex}}, data));
                }
                if (insertindex.length > 0) {//插入座位
                    let fields = ['game_multiplayer_seat_index', 'game_multiplayer_seat_agentid',
                        'game_multiplayer_seat_gameid', 'game_multiplayer_seat_roomid',
                        'game_multiplayer_seat_tableid', 'game_multiplayer_seat_state',
                        'game_multiplayer_seat_kioskid', 'game_multiplayer_seat_updated',
                        'game_multiplayer_seat_created'];
                    let data = [];
                    let dbnow = common.datetimezoneformat(new Date(), configs.envconf().timezone);
                    insertindex.forEach(function (index) {
                        data.push([index, table.agentid, table.gameid, table.roomid, table.tableid, 'idle', null, dbnow, dbnow]);
                    });
                    allarray.push(seatmodel.insertseats(dbc, fields, data));
                }
                return Promise.all(allarray);
            }).then(function () {
                resolve(Array.of(table, seats));
            }).catch(function (err) {
                reject(err);
            })
        });
    }

    checkmatch(dbc, table, gameprofile) {
        let me = this;
        return new Promise(function (resolve, reject) {
            me.cancelall(dbc, table).then(function () {
                return kioskmatch.cancelall(dbc, table);
            }).then(function () {
                return matchdepositmodel.select(dbc, {tableid: table.tableid, gameid: table.gameid});
            }).then(function (list) {
                if (list.length === 0)
                    return Promise.resolve();
                let all = [];
                for (let deposit of list) {
                    all.push(me.refund(dbc, table, gameprofile, deposit.match_deposit_kioskid, true));
                }
                return Promise.all(all);
            }).then(function () {
                resolve();
            }).catch(function (err) {
                reject(err);
            });
        });
    }


    /**
     * 桌子(游戏)场次开始
     * @param dbc
     * @param table
     * @param callback
     */
    open(dbc, table) {
        if (!common.validate({poolagentid: 'number+', tableid: 'number+', gameid: 'number+'}, table)) {
            return Promise.reject(new wrong('error', 'invalid_params', 'invalid param on gamematch.open'));
        }
        return new Promise(function (resolve, reject) {
            let dbnow = common.datetimezoneformat(new Date(), configs.envconf().timezone);
            Promise.resolve().then(function () {
                let params = {
                    tableid: table.tableid,
                    gameid: table.gameid
                };
                let data = {lastmatch: dbnow};
                return tablemodel.updatetable(dbc, params, data);
            }).then(function () {
                let data = {
                    agentid: table.poolagentid,
                    tableid: table.tableid,
                    gameid: table.gameid,
                    matchstart: dbnow,
                    state: "open"
                };
                return matchmodel.insert(dbc, data)
            }).then(function (result) {
                if (common.validate({insertId: 'number+'}, result)) {
                    resolve(result.insertId);
                } else {
                    reject(new wrong('critical', 'unexpected_error', 'addMatch error, insertid no return on gamematch.open'));
                }
            }).catch(function (err) {
                reject(err);
            })
        });
    }

    /**
     * 桌子(游戏)场次结束
     * @param dbc
     * @param table
     * @param gamematchResult
     * @param callback
     */
    close(dbc, table, gamematchresult, dbtime) {
        return new Promise(function (resolve, reject) {
            if (common.validate({id: 'number+'}, gamematchresult)) {
                let params = {
                    id: gamematchresult.id,
                    agentid: table.poolagentid,
                    tableid: table.tableid,
                    gameid: table.gameid,
                    state: "open"
                };
                let data = {
                    kioskcount: gamematchresult.kioskcount,
                    bettotal: common.tonumber(gamematchresult.bettotal, 4),
                    wintotal: common.tonumber(gamematchresult.wintotal, 4),
                    payout: common.tonumber((gamematchresult.wintotal - gamematchresult.bettotal), 4),
                    betdetail: JSON.stringify(common.float2fix(gamematchresult.betdetail)),
                    result: JSON.stringify(common.float2fix(gamematchresult.result)),
                    matchend: !!dbtime ? dbtime : common.datetimezoneformat(new Date(), configs.envconf().timezone),
                    state: "close"
                };

                matchmodel.update(dbc, params, data).then(function () {
                    resolve();
                }).catch(function (err) {
                    reject(err);
                });
            } else {
                resolve();
            }
        });
    }

    cancelall(dbc, table) {
        return matchmodel.update(dbc, {
            gameid: table.gameid,
            tableid: table.tableid,
            state: "open"
        }, {state: 'cancel'});
    }

    /**
     * 用户加入桌子(游戏)
     * @param request
     * @param table
     * @param seatindex
     * @param curkiosk
     * @param callback
     */
    join(request, table, seatindex, curkiosk) {
        return new Promise(function (resolve, reject) {
            if (!common.validate({gameid: "number+", tableid: "number+"}, table)) {
                return reject(new wrong('error', 'invalid_params', 'invalid param on gamematch.join'));
            }
            let params = {
                gameid: table.gameid,
                tableid: table.tableid,
                seatindex: seatindex
            };
            let data = {
                kioskid: request.propertyget('kiosk').kiosk_id,
                state: "seating",
                ip: request.client.socket.remote.ip,
                port: request.client.socket.remote.port
            };
            seatmodel.updateseat(request.dbc, params, data).then(function () {
                let _params = {
                    tableid: table.tableid,
                    gameid: table.gameid
                };
                let data = {curkiosk: curkiosk};
                return tablemodel.updatetable(request.dbc, _params, data);
            }).then(function () {
                resolve();
            }).catch(function (err) {
                reject(err);
            });
        });
    }


    /**
     * 用户离开桌子(游戏)
     * @param request
     * @param table
     * @param curkiosk
     * @param callback
     */
    out(request, table, curkiosk) {
        return new Promise(function (resolve, reject) {
            if (!common.validate({kiosk_id: "number+"}, request.propertyget('kiosk')) || !common.validate({
                    gameid: "number+",
                    tableid: "number+"
                }, table)) {
                return reject(new wrong('error', 'invalid_params', 'invalid parameters on gamematch.out'));
            }
            Promise.resolve().then(function () {
                let params = {
                    tableid: table.tableid,
                    gameid: table.gameid,
                    kioskid: request.propertyget('kiosk').kiosk_id
                };
                let data = {
                    state: 'idle',
                    kioskid: null,
                    ip: '0.0.0.0',
                    port: 0
                };
                return seatmodel.updateseat(request.dbc, params, data);
            }).then(function () {
                let params = {
                    tableid: table.tableid,
                    gameid: table.gameid
                };
                let data = {curkiosk: curkiosk};
                return tablemodel.updatetable(request.dbc, params, data);
            }).then(function () {
                resolve();
            }).catch(function (err) {
                reject(err);
            });
        });
    }

    /**
     * 玩家更换座位
     * @param request
     * @param table
     * @param seatindex
     * @param callback
     */
    moveseat(request, table, seatindex) {
        return new Promise(function (resolve, reject) {
            if (!common.validate({gameid: "number+", tableid: "number+"}, table)) {
                return reject(new wrong('error', 'invalid_params', 'common.validate failed on gamematch.moveseat'));
            }
            if (!common.validate_value(request.seatindex(), 'number+')) {
                return reject(new wrong('error', 'seatindex_occupied_moveseat', `request.seatindex is not a number on gamematch.moveseat`));
            }


            Promise.resolve().then(function () {
                let params = {
                    gameid: table.gameid,
                    tableid: table.tableid,
                    seatindex: request.seatindex()
                };
                let data = {
                    kioskid: null,
                    state: "idle",
                    ip: '0.0.0.0',
                    port: 0
                };
                return seatmodel.updateseat(request.dbc, params, data);
            }).then(function () {
                let params = {
                    gameid: table.gameid,
                    tableid: table.tableid,
                    seatindex: seatindex
                };
                let data = {
                    kioskid: request.propertyget('kiosk').kiosk_id,
                    state: "seating",
                    ip: request.client.socket.socket.remoteAddress,
                    port: request.client.socket.socket.remotePort
                };
                return seatmodel.updateseat(request.dbc, params, data);
            }).then(function () {
                resolve();
            }).catch(function (err) {
                reject(err);
            });
        });
    }

    updatepreseat(dbc, table, curkiosk) {
        if (!common.validate({
                gameid: "number+",
                tableid: "number+"
            }, table)) {
            return Promise.reject(new wrong('error', 'invalid_params', 'invalid parameters on gamematch.updatepreseat'));
        }

        let params = {
            tableid: table.tableid,
            gameid: table.gameid
        };
        let data = {curkiosk: curkiosk};
        return tablemodel.updatetable(dbc, params, data);
    }

    updatetable(dbc, table, data) {
        if (!common.validate({
                tableid: "number+"
            }, table)) {
            return Promise.reject(new wrong('error', 'invalid_params', 'invalid parameters on gamematch.updatepreseat'));
        }

        let params = {
            tableid: table.tableid
        };

        return tablemodel.updatetable(dbc, params, data);
    }


    depositbuyin(dbc, client, table, gameprofile, amount) {
        if (!common.validate({gameid: 'number+', tableid: 'number+'}, table))
            return Promise.reject(new wrong('error', 'invalid_params', 'invalid_params on gamematch.depositbuyin'));
        amount = common.tonumber(amount, 4, true);
        if (amount <= 0)
            return matchdepositmodel.getdepositbalance(dbc, table.tableid, table.gameid, client.kiosk.kiosk_id);

        return new Promise(function (resolve, reject) {
            let ktrxtime = new Date();
            let depositbalance = 0;
            let params = {
                gameid: table.gameid,
                kioskid: client.kiosk.kiosk_id
            };

            matchdepositmodel.one(dbc, params).then(function (res) {
                if (common.empty(res)) {
                    let data = {
                        agencyid: client.kiosk.kiosk_agencyid,
                        gameid: table.gameid,
                        tableid: table.tableid,
                        kioskid: client.kiosk.kiosk_id,
                        amount: amount,
                        ptype: profile.getptype(),
                        status: 0
                    };
                    depositbalance = amount;
                    return matchdepositmodel.insert(dbc, data);
                } else if (res.match_deposit_tableid !== table.tableid) {
                    client.close("invalid_action");
                    return Promise.reject(new wrong('error', 'invalid_action', 'There is deposit in other table on gamematch.depositbuyin'));
                } else if (res.match_deposit_status === 2) {
                    return Promise.reject(new wrong('error', 'invalid_params', 'deposit status is 2 on gamematch.depositbuyin'));
                } else {
                    return matchdepositmodel.updateamount(dbc, table.tableid, table.gameid, client.kiosk.kiosk_id, amount).then(function (balance) {
                        depositbalance = balance;
                        return Promise.resolve();
                    });
                }
            }).then(function () {
                return kiosktransaction.addtransaction(dbc, client.kiosk.kiosk_id, gameprofile, 0, (-1) * amount, 0, 0, 9);
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
                reject(err);
            });
        });
    }

    depositmatchopen(dbc, playersmap, table, balancemap) {
        if (!common.validate({gameid: 'number+', tableid: 'number+'}, table))
            return Promise.reject(new wrong('error', 'invalid_params', 'invalid_params on kiosktransaction.deposit'));
        return new Promise(function (resolve, reject) {
            let selparams = {
                gameid: table.gameid,
                tableid: table.tableid
            };
            matchdepositmodel.select(dbc, selparams).then(function (list) {
                let depositmap = new Map();
                list.forEach(function (dep) {
                    depositmap.set(dep.match_deposit_kioskid, dep);
                });
                let nopassarr = [];
                playersmap.forEach(function (client, kioskid) {
                    if (depositmap.has(kioskid)) {
                        let dep = depositmap.get(kioskid);
                        balancemap.set(kioskid, common.tonumber(dep.match_deposit_amount));
                        if (profile.ptconvertion(dep.match_deposit_amount, false, true) < table.maxbet ||
                            dep.match_deposit_status === 2) {
                            nopassarr.push(kioskid);
                            client.close("insufficient_deposit");
                        }
                    } else {
                        nopassarr.push(kioskid);
                        client.close("insufficient_deposit");
                    }
                });
                if (nopassarr.length > 0) {
                    reject(new wrong('error', 'insufficient_deposit', `kiosk:${nopassarr} depositbalance is not enough on gamematch.depositmatchopen`));
                } else {
                    resolve();
                }
            }).catch(function (err) {
                reject(err);
            });
        });
    }


    depositkioskmatchopen(dbc, client, table, balancemap) {
        if (!common.validate({gameid: 'number+', tableid: 'number+'}, table))
            return Promise.reject(new wrong('error', 'invalid_params', 'invalid_params on kiosktransaction.deposit'));
        return new Promise(function (resolve, reject) {
            let params = {
                gameid: table.gameid,
                tableid: table.tableid,
                kioskid: client.kiosk.kiosk_id
            };
            matchdepositmodel.one(dbc, params).then(function (res) {
                if (common.empty(res)) {
                    client.close("insufficient_deposit");
                    return Promise.reject(new wrong('error', 'insufficient_deposit', `kioskid:${client.kiosk.kiosk_id} depositbalance is not enough on gamematch.depositmatchopen`));
                } else if (profile.ptconvertion(res.match_deposit_amount, false, true) < table.maxbet ||
                    res.match_deposit_status === 2) {
                    client.close("insufficient_deposit");
                    return Promise.reject(new wrong('error', 'insufficient_deposit', `kioskid:${client.kiosk.kiosk_id} depositbalance is not enough on gamematch.depositmatchopen`));
                } else {
                    balancemap.set(client.kiosk.kiosk_id, common.tonumber(res.match_deposit_amount));
                    return matchdepositmodel.update(dbc, {status: 1}, params);
                }
            }).then(function () {
                resolve();
            }).catch(function (err) {
                reject(err);
            });
        });
    }


    depositmatchclose(dbc, table, gameprofile, stakemap, winmap, balancemap, matchmastermap) {
        if (!common.validate({
                gameid: 'number+',
                tableid: 'number+',
                matchid: 'number+'
            }, table) || !common.validate({poolratio: 'must', flash_game: 'must'}, gameprofile))
            return Promise.reject(new wrong('error', 'invalid_params', 'invalid_params on kiosktransaction.refund'));
        let me = this;

        if (common.typeof(stakemap) !== 'map')
            stakemap = new Map();
        if (common.typeof(winmap) !== 'map')
            winmap = new Map();
        if (common.typeof(balancemap) !== 'map')
            balancemap = new Map();
        if (common.typeof(matchmastermap) !== 'map')
            matchmastermap = new Map();

        let tmpbalancemap = new Map();
        let refundlist = [];
        let protectmap = new Map();

        return new Promise(function (resolve, reject) {
            let params = {
                gameid: table.gameid,
                tableid: table.tableid
            };
            matchdepositmodel.select(dbc, params).then(function (list) {
                let len = list.length;
                if (len === 0)
                    return Promise.resolve();
                let idx = 0;
                let error = null;
                let ratio = gameprofile.poolratio;

                return new Promise(function (_res, _rej) {
                    function kioskdepositcount() {
                        if (idx >= len || error !== null) {
                            return error !== null ? _rej(error) : _res();
                        }
                        let item = list[idx];
                        idx++;
                        let kioskid = item.match_deposit_kioskid;
                        if (item.match_deposit_status === 2)
                            refundlist.push(kioskid);
                        let stake = profile.ptconvertion(common.tonumber(stakemap.get(kioskid), 4, true));
                        let win = profile.ptconvertion(common.tonumber(winmap.get(kioskid), 4, true));

                        let kiosk = null;
                        let ktrxtime = new Date();
                        let kioskmember = {
                            kiosk_member_memberid: 0,
                            kiosk_member_affiliateid: 0
                        };

                        kioskmodel.getkiosk(dbc, {id: kioskid}).then(function (_kiosk) {
                            if (common.empty(_kiosk))
                                return Promise.reject(new wrong('error', 'invalid_params', `can not get kiosk by id:${kioskid} on kiosktransaction.refund`));
                            kiosk = _kiosk;
                            return kioskmembermodel.getkioskmember(dbc, _kiosk);
                        }).then(function (_kioskmember) {
                            if (!common.empty(_kioskmember))
                                kioskmember = _kioskmember;
                            //-------------下注---------------------
                            if (stake === 0)
                                return Promise.resolve();
                            else
                                return gpooliomodel.addpoolbetio(dbc, kioskid, gameprofile, gameprofile.pool_agentid, stake).then(function () {
                                    let protect = (stake / 100) * ratio.protect;
                                    let data = {
                                        agentid: kiosk.kiosk_agencyid,
                                        kioskid: kiosk.kiosk_id,
                                        gameid: table.gameid,
                                        matchid: matchmastermap.get(kiosk.kiosk_id) || 0,
                                        gamematchid: table.matchid,
                                        memberid: kioskmember.kiosk_member_memberid,
                                        affiliateid: kioskmember.kiosk_member_affiliateid,
                                        ptype: profile.getptype(),
                                        trxtype: 4,
                                        total: (-1) * stake,
                                        current: (-1) * (stake / 100) * ratio.current,
                                        protect: (-1) * protect,
                                        balance: common.tonumber(item.match_deposit_amount - stake),
                                        created: ktrxtime
                                    };
                                    if (protectmap.has(kiosk.kiosk_id)) {
                                        protectmap.set(kiosk.kiosk_id, common.tonumber(protectmap.get(kiosk.kiosk_id) + protect));
                                    } else {
                                        protectmap.set(kiosk.kiosk_id, protect);
                                    }
                                    return gameagenttransmodel.addtrans(dbc, data);
                                }).then(function(){
                                    return kiosktransaction.depositrolling(dbc, kiosk, stake);
                                });
                        }).then(function () {
                            //-------------赢钱---------------------
                            if (win === 0)
                                return Promise.resolve();
                            else
                                return gpooliomodel.addpoolsubptio(dbc, kioskid, gameprofile, gameprofile.pool_agentid, (-1) * win).then(function () {
                                    let data = {
                                        agentid: kiosk.kiosk_agencyid,
                                        kioskid: kiosk.kiosk_id,
                                        gameid: table.gameid,
                                        matchid: matchmastermap.get(kiosk.kiosk_id) || 0,
                                        gamematchid: table.matchid,
                                        memberid: kioskmember.kiosk_member_memberid,
                                        affiliateid: kioskmember.kiosk_member_affiliateid,
                                        ptype: profile.getptype(),
                                        trxtype: 3,
                                        total: win,
                                        current: win,
                                        protect: 0,
                                        balance: common.tonumber(item.match_deposit_amount - stake + win),
                                        created: ktrxtime
                                    };
                                    return gameagenttransmodel.addtrans(dbc, data);
                                });
                        }).then(function () {
                            let amount = common.tonumber(win - stake);
                            if (amount === 0)
                                return matchdepositmodel.getdepositbalance(dbc, table.tableid, table.gameid, kioskid);
                            else
                                return matchdepositmodel.updateamount(dbc, table.tableid, table.gameid, kioskid, amount);
                        }).then(function (balance) {
                            if (item.match_deposit_status !== 2)
                                tmpbalancemap.set(kioskid, balance);
                            kioskdepositcount();
                        }).catch(function (err) {
                            error = err;
                            kioskdepositcount();
                        });
                    }
                    kioskdepositcount();
                });
            }).then(function () {
                let params = {
                    tableid: table.tableid,
                    gameid: table.gameid,
                    status: 1
                };
                return matchdepositmodel.update(dbc, {status: 0}, params);
            }).then(function () {
                balancemap.clear();
                tmpbalancemap.forEach(function (v, k) {
                    balancemap.set(k, v);
                });
                resolve(protectmap);
                //已退出用户返还
                Promise.all(refundlist.map(function (kioskid) {
                    return me.refund(null, table, gameprofile, kioskid);
                })).catch(function (err) {
                    syslog.log(err);
                });
            }).catch(function (err) {
                reject(err);
            })
        });
    }


    refund(dbc, table, gameprofile, kioskid, ignorestatus) {
        ignorestatus = !!ignorestatus;
        let isnewdbc = false;
        return new Promise(function (resolve, reject) {
            new Promise(function (res, rej) {
                if (typeof (dbc) === 'object' && dbc !== null && typeof (dbc.query) === 'function')
                    return res();
                db.begin().then(function (_dbc) {
                    isnewdbc = true;
                    dbc = _dbc;
                    res();
                }).catch(function (err) {
                    rej(err)
                });
            }).then(function () {
                return matchdepositmodel.one(dbc, {gameid: table.gameid, tableid: table.tableid, kioskid: kioskid});
            }).then(function (dep) {
                if (common.empty(dep)) {
                    //deposit为空跳过
                    return Promise.resolve();
                } else if (ignorestatus || dep.match_deposit_status !== 1) {
                    //返还deposit
                    return new Promise(function (res, rej) {
                        let kiosk = {};
                        let deposit = {};
                        let ktrxtime = new Date();
                        matchdepositmodel.refund(dbc, table.tableid, table.gameid, kioskid).then(function (_deposit) {
                            deposit = _deposit;
                            return kiosktransaction.addtransaction(dbc, kioskid, gameprofile, 0, deposit.match_deposit_amount, 0, 0, 10);
                        }).then(function (trx) {
                            if (!common.empty(trx.kiosk)) kiosk = common.clone(trx.kiosk);
                            return kioskmembermodel.getkioskmember(dbc, kiosk);
                        }).then(function (kioskmember) {
                            if (common.empty(kioskmember)) {
                                kioskmember = {
                                    kiosk_member_memberid: 0,
                                    kiosk_member_affiliateid: 0
                                };
                            }
                            //game_agent_trx
                            let data = {
                                agentid: kiosk.kiosk_agencyid,
                                kioskid: kiosk.kiosk_id,
                                gameid: gameprofile.id,
                                matchid: 0,
                                gamematchid: 0,
                                memberid: kioskmember.kiosk_member_memberid,
                                affiliateid: kioskmember.kiosk_member_affiliateid,
                                ptype: profile.getptype(),
                                trxtype: 2,
                                total: (-1) * deposit.match_deposit_amount,
                                current: (-1) * deposit.match_deposit_amount,
                                protect: 0,
                                balance: 0,
                                created: ktrxtime
                            };
                            return gameagenttransmodel.addtrans(dbc, data);
                        }).then(function () {
                            res();
                        }).catch(function (err) {
                            rej(err);
                        })
                    });
                } else if (dep.match_deposit_status === 1) {
                    //游戏中更改状态不退还
                    return matchdepositmodel.update(dbc, {status: 2}, {
                        gameid: table.gameid,
                        tableid: table.tableid,
                        kioskid: kioskid
                    });
                }
                return Promise.resolve();
            }).then(function () {
                if (isnewdbc) {
                    db.commit(dbc).then(function () {
                        db.destroy(dbc);
                        resolve();
                    });
                } else {
                    resolve();
                }
            }).catch(function (err) {
                if (isnewdbc) {
                    db.rollback(dbc).then(function () {
                        db.destroy(dbc);
                        reject(err);
                    }).catch(_err=> {
                        reject(_err);
                    });
                } else {
                    resolve(err);
                }
            });
        });
    }


    //refundflag(dbc, tableid, gameid, kioskid) {
    //    let params = {
    //        tableid: tableid,
    //        gameid: gameid,
    //        kioskid: kioskid
    //    };
    //
    //    return matchdepositmodel.update(dbc, {status: 1}, params);
    //
    //}

    /**
     * 退还部分
     * @param dbc                           {object}    数据库连接
     * @param table                         {object}    桌子信息
     * @param kioskid                       {number}    终端id
     * @param balancemap                    {Map}       存款的map
     * @param stakemap                      {Map}       下注的map
     * @param minamount                     {number}    游戏中最多输的钱
     * @returns {*}
     */
    //refundpart(dbc, table, kioskid, balancemap, stakemap, minamount) {
    //    if (!common.validate({gameid: 'number+', tableid: 'number+', matchid: 'number+'}, table))
    //        return Promise.reject(new wrong('error', 'invalid_params', 'invalid_params on kiosktransaction.refundpart'));
    //    if (common.typeof(stakemap) !== 'map')
    //        stakemap = new Map();
    //    let amount = common.empty(minamount) ? stakemap.has(kioskid) ? stakemap.get(kioskid) : 0 : minamount;     // 扣留的钱
    //    let refund = balancemap.get(kioskid) - amount;                                                            // 返回的钱
    //    let params = {
    //        match_deposit_gameid : params.gameid,
    //        match_deposit_tableid : params.tableid,
    //        match_deposit_matchid : params.matchid,
    //        match_deposit_kioskid : params.kioskid
    //    }
    //    return matchdepositmodel.update(dbc, params, amount).then(function (result) {
    //        if (common.validate({insertId: 'number+'}, result))
    //            return kioskmodel.getkioskforupdate(dbc, kioskid);
    //        else
    //            return Promise.reject(new wrong('error', 'invalid_params', `can not get deposit by id:${kioskid} on kiosktransaction.refundpart`));
    //    }).then(function (kiosk) {
    //        if (common.empty(kiosk))
    //            return Promise.reject(new wrong('error', 'invalid_params', `can not get kiosk by id:${kioskid} on kiosktransaction.refundpart`));
    //        return kioskmodel.updatebalance(dbc, kiosk, refund);
    //    }).then(function (result) {
    //        if (common.validate({updateId: 'number+'}, result))
    //            return Promise.reject(new wrong('error', 'unexpected_error', `can not update balance of kiosk whose id:${kioskid} on kiosktransaction.refundpart`));
    //        else {
    //            balancemap.set(kioskid, amount);
    //            return;
    //        }
    //    }).catch(function (err) {
    //        return Promise.reject(err);
    //    })
    //}
}

module.exports = new gamematch();
