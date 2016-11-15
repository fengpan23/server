/**
 * Created by fp on 2016/10/14.
 */
const _ = require('underscore');

const Table = require('../model/table');
const Room = require('../model/room');
const Match = require('../model/match');
const Agency = require('../model/agency');
const AgencyGame = require('../model/agency_game');
const AgencySuspend = require('../model/agency_suspend');

const DB = require('./db');
const Seats = require('./seats');
const Profile = require('./profile');

class G{
    constructor(options){
        this._id = null;
        this._table = {};

        this._seats = new Seats();
        this._profile = new Profile();

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

    init(options){
        return this._db.begin().then(dbc =>
            this._init(dbc, options).then(() => {
                if (this._table.curkiosk > 0 || this._table.status === 2) {
                    this._table.curkiosk = 0;
                    this._table.status = 1;
                    return Table.update(dbc, {tableId: this._table.id}, {curkiosk: 0, status: 1});
                }
            }).then(() => {
                return this._db.over(dbc);
            }).catch(e => {
                return this._db.close(dbc).then(() => Promise.reject(e));
            })
        ).then(() => {
            return Promise.resolve(_.pick(this._table, 'ip', 'port'));
        }).catch(e => {
            return Promise.reject(e);
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

    start(players){
        if (this._table.status === 0) {     // 检查桌子是否激活
            return Promise.reject({code: 'system_maintenance', message: 'Table is not active status on game.start'});
        } else if (this._profile.setting['system_maintenance'] !== 0) {    //检查是否系统维护
            return Promise.reject({code: 'system_maintenance', message: 'System Maintenance on game.start'});
        } else if (this._profile.game['status'] !== 1) {            //检查游戏是否关闭
            return Promise.reject({code: 'system_maintenance', message: 'Game is not active status on game.start'});
        }

        return this._db.begin().then(dbc =>
            this._init(dbc, {tableId: this._table.id}).then(() => {
                let params = {agencyId: this._table.top_agentid, gameId: this._profile.game.id, status: 1};
                console.log('params', params);
                return AgencyGame.find(dbc, params);
            }).then(eg => {
                if (_.isEmpty(eg))
                    return Promise.reject({code: 'system_maintenance', message: 'on agency games on Game.start'});

                // let dbnow = common.datetimezoneformat(new Date(), configs.envconf().timezone);
                let params = {tableId: this._table.id, gameId: this._table.gameid};
                let data = {lastmatch: +new Date()};

                return Table.update(dbc, params, data).then(() => {
                    let data = {agentid: this._table.poolagentid, tableid: this._table.tableid, gameid: this._table.gameid, matchstart: +new Date(), state: "open"};
                    return Match.insert(dbc, data)
                });
            }).then(res => {
                if (res.insertId) {
                    this._id = this._table.matchid = res.insertId;
                }else{
                    return Promise.reject({code: 'unexpected_error', message: 'add match error, insert not success'});
                }
                let opt = {
                    walletType: this._profile.game['ptype'],
                    pType: this._table.ptype,
                    agentId: this._table.agentid,
                    topAgentId: this._table.topagentid,
                    poolAgentId: this._table.poolagentid
                };
                return Promise.all(players.map(player => player.load(dbc, opt)));
            }).then(() => {
                return this._db.over(dbc);
            }).catch(e => {
                return this._db.close(dbc).then(() => Promise.reject(e));
            })
        );
    }

    over(players){
        return this._db.begin().then(dbc =>
            Promise.all(players.map(player => player.close(dbc))).then(() => {
                let params = {id: this._id, agentId: this._table.poolAgentId, tableId: this._table.id, gameId: this._table.gameid, state: "open"};
                let data = {
                    kioskCount: gamematchresult.kioskcount,
                    betTotal: common.tonumber(gamematchresult.bettotal, 4),
                    winTotal: common.tonumber(gamematchresult.wintotal, 4),
                    payout: common.tonumber((gamematchresult.wintotal - gamematchresult.bettotal), 4),
                    betDetail: JSON.stringify(common.float2fix(gamematchresult.betdetail)),
                    result: JSON.stringify(common.float2fix(gamematchresult.result)),
                    matchEnd: dbtime,
                    state: "close"
                };
                return Match.update(dbc, params, data);
            }).then(() => {
                return this._db.over(dbc);
            }).catch(e => {
                return this._db.close(dbc).then(() => Promise.reject(e));
            })
        );
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

    _init(dbc, options){
        return Table.get(dbc, {tableId: options.tableId}).then(table => {
                if (_.isEmpty(table)) return Promise.reject({code: 'invalid_params', message: 'table not exits on game.init'});

                this._table = table;
                if(table.roomid) {
                    Room.get(dbc, {roomId: table.roomid}).then(room => {
                        _.extend(table, _.omit(room, 'id'));
                    });
                }

                return this._seats.init(dbc, table);
            }).then(() => {
                return this._profile.init(dbc, _.pick(this._table, 'gameid', 'topagentid', 'agentid', 'ptype', 'agentid'));
            });
    }
}

module.exports = G;