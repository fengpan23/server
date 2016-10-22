/**
 * Created by fp on 2016/10/14.
 */
const _ = require('underscore');
const log = require('log')();

const Table = require('../model/table');
const Room = require('../model/room');
const Game = require('../model/game');
const Agency = require('../model/agency');
const AgencyGame = require('../model/agency_game');
const AgencyPool = require('../model/agency_pool');
const SettingGroup = require('../model/setting_group');
const Setting = require('../model/setting');

const DB = require('./db');
const Seats = require('./seats');

class G{
    constructor(options){
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
                    console.log('bbb', b);
                    return Setting.find(dbc, [{game_setting_agencyid: 0}, {game_setting_status: 1}]);
                })
                .then(c => {
                    console.log('ccc', this._table);
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
            log.error('eeee');
            log.error(e.stack);
        });
    }
}

module.exports = G;