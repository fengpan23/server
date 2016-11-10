/**
 * Created by fp on 2016/10/14.
 */
const _ = require('underscore');

const Table = require('../model/table');
const Room = require('../model/room');
const Game = require('../model/game');
const Match = require('../model/match');
const Agency = require('../model/agency');
const AgencyGame = require('../model/agency_game');
const AgencyPool = require('../model/agency_pool');
const AgencySuspend = require('../model/agency_suspend');
const SettingGroup = require('../model/setting_group');
const Setting = require('../model/setting');

const DB = require('./db');
const Seats = require('./seats');

class G{
    constructor(options){
        this._id = null;
        this._table = {};
        this._profile = {};

        this._seats = new Seats();
        this._db = new DB(_.pick(options, 'cluster', 'nodes'));
    }

    get id(){
        return this._id;
    }
    get table(){
        return Object.assign({}, this._table);
    }
    get profile(){
        return Object.assign({}, this._profile);
    }

    init(opt){
        return this._db.begin().then(dbc =>
            Table.get(dbc, {tableId: opt.tableId})
                .then(table => {
                    if (_.isEmpty(table)) return Promise.reject('table not exits on game.init');

                    this._table = table;
                    if (!opt.reload && (table.curkiosk > 0 || table.status === 2)) {
                        table.curkiosk = 0;
                        table.status = 1;
                        return Table.update(dbc, {tableId: table.id}, {curkiosk: 0, status: 1});
                    }
                    return Promise.resolve();
                })
                .then(() => {
                    if(this._table.roomid) {
                        Room.get(dbc, {roomId: this._table.roomid}).then(room => {
                            _.extend(this._table, _.omit(room, 'id'));
                        });
                    }

                    return this._seats.init(dbc, this._table);
                })
                .then(() => {
                    return Game.get(dbc, this._table.gameid);
                })
                .then(game => {
                    this._profile = game;

                    return Agency.get(dbc, {agencyId: this._table.topagentid});
                })
                .then(agency => {
                    if (this._table.agentid === 0)
                        this._profile.pool_agentid = this._table.topagentid;

                    return AgencyGame.find(dbc, {gameId: this._table.gameid, agentId: this._profile.pool_agentid}, 1);
                })
                .then(a => {
                    // console.log(a)
                    return SettingGroup.get(dbc, this._profile.groupid, this._profile.pool_agentid, 1);
                })
                .then(b => {
                    // console.log('bbb', b);
                    return Setting.find(dbc, [{game_setting_agencyid: 0}, {game_setting_status: 1}]);
                })
                .then(c => {
                    // console.log('ccc', this._table);
                    return  AgencyPool.get(dbc, this._table.ptype, this._table.gameid, this._table.agentid);
                })
                .catch(e => {
                    // dbc.rollback(dbc).then(() => {
                    //     db.destroy(dbc);
                    //     me._resume();
                    //     reject(err);
                    //     if (!reload) process.exit(500);
                    // }).catch(err=> {
                    //     me._resume();
                    //     reject(err);
                    //     if (!reload) process.exit(500);
                    // });
                    return Promise.reject(e);
                })
        ).then(res => {
            // console.log('res', res);
            return Promise.resolve(_.pick(this._table, 'ip', 'port'));
        }).catch(e => {
            return Promise.reject(e);
        });
    }

    start(opt){
        if (this._table.status === 0) {     // 检查桌子是否激活
            return Promise.reject({code: 'system_maintenance', message: 'Table is not active status on game.start'});
        } else if (this._profile.setting['system_maintenance'] !== 0) {    //检查是否系统维护
            return Promise.reject({code: 'system_maintenance', message: 'System Maintenance on game.start'});
        } else if (this._profile.status !== 1) {            //检查游戏是否关闭
            return Promise.reject({code: 'system_maintenance', message: 'Game is not active status on game.start'});
        }

        this.init({reload: true}).then(() => {
            let params = {agencyId: this._profile.top_agentid, gameId: this._profile.id, status: 1};
            return AgencyGame.find(dbc, params)
        }).then(eg => {
            if (_.isEmpty(eg))
                return Promise.reject({code: 'system_maintenance', message: 'on agency games on Game.start'});

            // let dbnow = common.datetimezoneformat(new Date(), configs.envconf().timezone);
            let params = {tableId: this._table.id, gameId: this._table.gameid};
            let data = {lastmatch: dbnow};

            return Table.update(dbc, params, data).then(() => {
                        let data = {agentid: table.poolagentid, tableid: table.tableid, gameid: table.gameid, matchstart: dbnow, state: "open"};
                        return Match.insert(dbc, data)
                    });
        }).then(res => {
            if (res.insertId) {
                this._id = this._table.matchid = res.insertId;
            }else{
                return Promise.reject({code: 'unexpected_error', message: 'add match error, insert not success'});
            }
            let idx = 0;
            let error = false;
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
        }).then(() => {
            if (opt.deposit) {
                // _cleardepositmap(me);
                // return gamematch.depositmatchopen(dbc, playersmap, me.table, me.depositbalance);
            } else
                return Promise.resolve();
        }).then(() => {
            return this._db.over(dbc);
        }).catch(function (err) {
            this._db.close(dbc).then(() => reject(e)).catch(reject)
        });
    }

    /**
     * verify player
     * @param player  {Player}
     * @param opt   {object}
     *          session: String
     *          clientId: String
     * @returns {Promise.<T>}
     */
    login(player){
        if(player.status !== 'auth')
            return Promise.reject(`player status ${player.status} error on game.login`);

        return this._db.begin().then(dbc =>
            new Promise((resolve, reject) => {
                Agency.get(dbc, {agencyId: player.get('kiosk').agencyid}).then(agency => {
                    let poolAgentId = agency.follow_top_agentpool === 'Y' ? (agency.top_agencyid <= 0 ? agency.id : agency.top_agencyid) : agency.id;
                    if ((this._table.agentid === 0 && this._table.topagentid === agency.top_agencyid) || poolAgentId === this._table.poolagentid) {

                        let structure = (typeof agency.upline_structure === 'string') ? agency.upline_structure.split(",") : [];
                        structure.push(agency.id);
                        return AgencySuspend.getCount(dbc, structure);
                    } else
                        reject('agency is not active on game.login');
                }).then(count => {
                    if (count > 0)
                        reject('agent_suspended, there are agency suspend on game.login');
                    else
                        return this._db.over(dbc).then(() => {
                            resolve(player);
                        });
                }).catch(e => {
                    this._db.close(dbc).then(() => reject(e)).catch(reject)
                });
            })
        );
    }

    /**
     *  player have seat
     * @param player
     * @param opt
     * @return {Promise.<TResult>}
     */
    seat(player, opt){
        if(player.status !== 'login')
            return Promise.reject(`player status ${player.status} error on game.seat`);

        return this._db.begin().then(dbc =>
            new Promise((resolve, reject) => {
                let options = _.extend({
                    tableId: this._table.id,
                    gameId: this._table.gameid,
                    kioskId: player.id
                }, _.pick(opt, 'index', 'ip', 'port'));

                let seatIndex = options.index;
                this._seats.choose(dbc, options).then(res => {
                    seatIndex = res.index;
                    return Table.update(dbc, _.pick(options, 'tableId', 'gameId'), {curkiosk: res.cur});
                }).then(() => {
                    return this._db.over(dbc).then(() => {
                        resolve(seatIndex);
                    });
                }).catch(e => {
                    this._db.close(dbc).then(() => reject(e)).catch(reject)
                });
            }
        ).then(seatIndex => {
            return Promise.resolve(seatIndex);
        }));
    }

    leave(player){
        return this._db.begin().then(dbc =>
            new Promise((resolve, reject) => {
                let params = {tableId: this._table.id, gameId: this._table.gameid, kioskId: player.id, seatIndex: player.index};
                this._seats.leave(dbc, params).then(cur => {
                    return Table.update(dbc, _.pick(params, 'tableId', 'gameId'), {curkiosk: cur});
                }).then(() => {
                    return this._db.over(dbc).then(() => {
                        resolve(player);
                    });
                }).catch(e => {
                    this._db.close(dbc).then(() => reject(e)).catch(reject);
                });
            })
        ).then(p => {
            return Promise.resolve(p);
        });
    }

    /**
     * auth player
     * @param player
     * @param opt   {Object}    {session: String, id: Number}
     * @returns {*}
     */
    auth(player, opt){
        if(player.id)return Promise.resolve({status: 'ok'});

        return this._db.begin().then(dbc =>
            new Promise((resolve, reject) => {
                player.init(dbc, opt)
                .then(kiosk => this._db.over(dbc).then(() => resolve({status: 'ok', repeat: this._seats.has(player.id)})))
                .catch(e => this._db.close(dbc).then(() => reject(e)).catch(reject))
            })
        );
    }
}

module.exports = G;