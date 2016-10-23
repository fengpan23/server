/**
 * Created by fp on 2016/10/14.
 */
const _ = require('underscore');
const Log = require('log')();

const Table = require('../model/table');
const Room = require('../model/room');
const Game = require('../model/game');
const Agency = require('../model/agency');
const AgencyGame = require('../model/agency_game');
const AgencyPool = require('../model/agency_pool');
const AgencySuspend = require('../model/agency_suspend');
const SettingGroup = require('../model/setting_group');
const Setting = require('../model/setting');

const DB = require('./db');
const Seats = require('./seats');
const Player = require('./player');

class G{
    constructor(options){
        this.id = null;
        this._table = {};
        this._seats = new Seats();
        this._profile = {};

        this._db = new DB(_.pick(options, 'cluster', 'nodes'));
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
            console.log('res', res);
            // this._table = res.table;
            // this._seats = res._seats;
        }).catch(e => {
            Log.error('eeee');
            Log.error(e.stack);
        });
    }

    /**
     * verify player
     * @param session
     * @returns {Promise.<T>}
     */
    login(session){
        return this._db.begin().then(dbc =>
            new Promise((resolve, reject) => {
                let player = new Player();

                player.init(dbc, session).then(kiosk => {
                    return Agency.get(dbc, {agencyId: kiosk.agencyid});
                }).then(agency => {
                    let poolAgentId = agency.follow_top_agentpool === 'Y' ? (agency.top_agencyid <= 0 ? agency.id : agency.top_agencyid) : agency.id;
                    if ((this._table.agentid === 0 && this._table.topagentid === agency.top_agencyid) || poolAgentId === this._table.poolagentid) {

                        let structure = (typeof agency.upline_structure === 'string') ? agency.upline_structure.split(",") : [];
                        structure.push(agency.id);
                        return AgencySuspend.getCount(dbc, structure);
                    } else
                        return reject('agency is not active on game.login');
                }).then(count => {
                    if (count > 0)
                        return reject('agent_suspended, there are agency suspend on game.login');
                    else
                        return this._db.over(dbc).then(() => {
                            player.set('status', 'login');
                            resolve(player)
                        });
                }).catch(e => {
                    this._db.close(dbc).then(() => reject(e)).catch(reject)
                });
            })
        );
    }


    /**
     *
     * @param player
     * @param index
     * @return {Promise.<TResult>}
     */
    seat(player, index){
        return this._db.begin().then(dbc =>
            new Promise((resolve, reject) => {
                let opt = {
                    index: index,
                    tableId: this._table.id,
                    gameId: this._table.gameid,
                    kioskId: player.get('kiosk.id'),
                    ip: 12,
                    port: 123
                };
                this._seats.choose(dbc, opt).then(curKiosk => {
                    console.log('curkiosk: ', curKiosk);

                    return Table.update(dbc, _.pick(opt, 'tableId', 'gameId'), {curkiosk: curKiosk});
                }).then(() => {
                    return this._db.over(dbc).then(() => {
                        player.set('status', 'seat');
                        resolve(player)
                    });
                }).catch(e => {
                    this._db.close(dbc).then(() => reject(e)).catch(reject)
                });
        }).then(palyer => {

            return Promise.resolve(palyer);
        }))
    }
}

module.exports = G;