/**
 * Created by fp on 2016/10/13.
 */

const _ = require('underscore');
const Events = require('events');

const Log = require('log');
const Engine = require('engine');

const Game = require('./module/game');
const Config = require('./module/config');

class Index extends Events{
    /**
     * init game server
     * @param options  {object}   {api: {join: Func， seat: Func, ....}}
     */
    constructor(options) {
        super();

        new Log({env: 'develop', singleton: true});       //create singleton log

        this._config = new Config();            //create config file module

        this._engine = new Engine();
        this._engine.on('request', request => {     //request.content => json {event: String, data: Obj}
            if(options.api){
                let api = options.api[request.getParams('event')];
                api ? api(request) : request.close('unknown_action');
            }else{
                this.emit('request', request);
            }
        }).on('reconnect', request => {

        });

        let opt = {
            nodes: this._config.get('db.nodes'),
            cluster: this._config.get('cluster')
        };
        this._game = new Game(opt);
        this._game.init(_.pick(options, 'tableId')).then(() => {
            this._engine.start(_.pick(options, 'port', 'ip'));      //port and ip to create socket server  default port:2323, ip:localhost
        }).catch(e => {
            Log.error('Game init error server.game.init: ', e);
        });

        this.players = new Map();   //join game players
    };

    open(){
        if (this._game.id){        // 校验 ‘游戏是否正在暂停’ ||  ‘游戏是否已开场’
            return Promise.reject("match is already opened on engine.open");
        }

        // step 1 : 初始化引擎
        this._game.init(this.table.id, true).then(() => {
            players = me.getplayers();
            players.forEach(function (cli) {
                kioskssnapshot.set(cli.kiosk.kiosk_id, common.clone(cli.kiosk));
            });

            let maintenance = false;
            let error = null;
            if (common.tonumber(me.table.status, 0) === 0) {// 检查桌子是否激活
                maintenance = true;
                error = new wrong('error', 'system_maintenance', 'table is not active status on engine.matchopen');
                error.setignore(true);
            } else if (common.tonumber(me.gameprofile.setting.system_maintenance, 0) !== 0) {//检查是否系统维护
                maintenance = true;
                error = new wrong('error', 'system_maintenance', 'System Maintenance on engine.matchopen');
            } else if (common.tonumber(me.gameprofile.status, 0) !== 1) {//检查游戏是否关闭
                maintenance = true;
                error = new wrong('error', 'system_maintenance', 'game is not active status on engine.matchopen');
                }
                if (maintenance) {
                    players.forEach(function (client) {
                        client.close('system_maintenance');
                    });
                    return Promise.reject(error);
                } else {
                    return Promise.resolve();
                }
            }).then(function () {
                return db.begin();
            }).then(function (_dbc) {
                dbc = _dbc;
                // step 2 : 校验游戏是否有代理
                return game.checkagencygame(dbc, me.gameprofile);
            }).then(function () {
                // step 3 : 游戏开场
                return gamematch.open(dbc, me.table);
            }).then(function (_matchid) {
                me.gamematchresult.id = _matchid;
                me.table.matchid = _matchid;
                // step 4 : 重载在场玩家信息
                return new Promise(function (_res, _rej) {
                    let idx = 0;
                    let error = false;

                    function kioskreload() {
                        if (idx < players.length) {
                            let client = players[idx];
                            idx++;
                            if (client.closed)
                                return kioskreload();
                            kiosk.reload(dbc, client, me.table).then(function () {
                                playersmap.set(client.kiosk.kiosk_id, client);
                                kioskreload();
                            }).catch(function (err) {
                                (!error) && (error = err);
                                kioskreload();
                            })
                        } else {
                            return !!error ? _rej(error) : _res();
                        }
                    }

                    kioskreload();
                });
            }).then(function () {
                if (me.options.deposit) {
                    _cleardepositmap(me);
                    return gamematch.depositmatchopen(dbc, playersmap, me.table, me.depositbalance);
                } else
                    return Promise.resolve();
            }).then(function () {
                return db.commit(dbc);
            }).then(function () {
                db.destroy(dbc);
                me._resume();
                resolve({players: players});
            }).catch(function (err) {
                db.rollback(dbc).then(function () {
                    db.destroy(dbc);
                    wrong.wronghandler(err, function (type, code, debug) {
                        me.kickplayers();
                        me.server.errorlog(type, code, debug);
                    }, function () {
                        me.kickplayers();
                        me.server.errorlog('error', 'unexpected_error', err);
                    }, function (type, code, debug) {
                        me.server.errorlog(type, code, debug);
                    });
                    _initgameresult(me);
                    players.forEach(function (cli) {
                        kioskssnapshot.has(cli.kiosk.kiosk_id) && (cli.kiosk = kioskssnapshot.get(cli.kiosk.kiosk_id));
                    });
                    me._resume();
                    reject(err);
                }).catch(_err=> {
                    wrong.wronghandler(_err, function (type, code, debug) {
                        me.kickplayers();
                        me.server.errorlog(type, code, debug);
                    }, function () {
                        me.kickplayers();
                        me.server.errorlog('error', 'unexpected_error', _err);
                    }, function (type, code, debug) {
                        me.server.errorlog(type, code, debug);
                    });
                    _initgameresult(me);
                    players.forEach(function (cli) {
                        kioskssnapshot.has(cli.kiosk.kiosk_id) && (cli.kiosk = kioskssnapshot.get(cli.kiosk.kiosk_id));
                    });
                    me._resume();
                    reject(_err);
                });
            });
        };

    close(){
        let me = this;
        //if (me.pause) {
        //    me.server.errorlog("error", "system_maintenance", 'engine is paused on engine.MatchClose');
        //    return Promise.reject(new wrong("error", "system_maintenance", 'engine is paused on engine.MatchClose'));
        //}
        if (me.options.deposit && me.getdepositstake() !== me.getdepositwin()) {
            return Promise.reject(new wrong("error", "invalid_action", 'staketotal is not equal wintotal on engine.MatchClose'));
        }
        let players = me.getplayers();
        return new Promise(function (resolve, reject) {
            let dbc = null;
            me._wait().then(function () {
                return db.begin();
            }).then(function (_dbc) {
                dbc = _dbc;
                profile.setdbtime();
                if (me.options.deposit)
                    return gamematch.depositmatchclose(dbc, me.table, me.gameprofile, me.depositstake, me.depositwin, me.depositbalance, me.depositmatchmaster);
                else
                    return Promise.resolve();
            }).then(function (protectmap) {
                if (common.typeof(protectmap) !== 'map')
                    protectmap = new Map();

                //玩家个人关场
                return new Promise(function (_res, _rej) {
                    let idx = 0;
                    let error = false;
                    let reqarr = [];

                    function kioskmatchclose() {
                        if (idx < players.length) {
                            let client = players[idx];
                            idx++;
                            if (client.closed || common.empty(client.match.master.id))
                                return kioskmatchclose();
                            let req = client.createreq('matchclose', dbc);
                            req.reqtimeout(0);
                            req.snapshotsync();
                            reqarr.push(req);
                            let depositbal = 0;
                            let comission = 0;
                            if (me.options.deposit) {
                                depositbal = me.depositbalance.get(client.kiosk.kiosk_id) || 0;
                                comission = protectmap.get(client.kiosk.kiosk_id) || 0;
                            }
                            kioskmatch.close(req, me.gameprofile, me.table, depositbal, comission).then(function () {
                                return gamepromise(req);
                            }).then(function () {
                                kioskmatchclose();
                            }).catch(function (err) {
                                (!error) && (error = err);
                                kioskmatchclose();
                            });
                        } else {
                            reqarr.forEach(function (_req) {
                                if (!!error) _req.snapshotrevert();
                                _req.destroy();
                            });
                            return !!error ? _rej(error) : _res();
                        }
                    }

                    kioskmatchclose();
                });
            }).then(function () {
                //整体游戏关场
                return gamematch.close(dbc, me.table, me.gamematchresult);
            }).then(function () {
                return db.commit(dbc);
            }).then(function () {
                db.destroy(dbc);
                _clearplayersmatch(players);
                _initgameresult(me);
                me._resume();
                return me.init(me.table.tableid, true);
            }, function (err) {
                return db.rollback(dbc).then(function () {
                    db.destroy(dbc);
                    wrong.wronghandler(err, (type, code, debug)=>me.server.errorlog(type, code, debug),
                        ()=>me.server.errorlog('error', 'unexpected_error', err));
                    me.kickplayers();
                    me._resume();
                    return Promise.reject(err);
                }).catch(function (_err) {
                    wrong.wronghandler(_err, (type, code, debug)=>me.server.errorlog(type, code, debug),
                        ()=>me.server.errorlog('error', 'unexpected_error', _err));
                    me.kickplayers();
                    me._resume();
                    return Promise.reject(_err);
                });
            }).then(function () {
                resolve();
            }).catch(function (err) {
                reject(err);
            });
        });
    }

    /**
     * player login game
     * @param session
     * @returns {Promise}
     */
    login(request){
        if (this.closed)
            return Promise.reject("engine is closed on engine.init");

        let session = request.getParams('session');

        return this._game.login(session).then(res => {
            request.set({status: 'login', kiosk: res.kiosk, agency: res.agency});      //login success update player status


            return Promise.resolve(this._engine.getClients());
        }).catch(err => {
            return Promise.reject(err);
        });
    };

    /**
     * player have seat
     * @param request
     * @returns {Promise}
     */
    seat(request) {
        if (this.status)
            return Promise.reject("engine is closed on engine.seat");
        if (request.get('status') !== 'login')
            return Promise.reject('player seat to the table on engine.seat error status: ' + request.status());

        let opt = {kiosk: request.get('kiosk'), index: request.getParams('seatindex')};
        this._game.seat(opt).then(player => {

            this.players.set(player, player);
            request.set('status', 'seat');

            return Promise.resolve(player);
        }).catch(err => {
            return Promise.reject(err);
        });
    };

    win(request) {

    };

    quit(request){

    };

    reconnect(request){

    };

    disconnect(request) {
        if(!request.seatindex())return request.close();
        console.info(request.seatindex() + ' client disconnect !!!');
        this.userquit(request);
    };

    exit() {
    };
}

module.exports = Index;

new Index({tableId: 67, api: {}});
