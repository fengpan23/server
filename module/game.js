/**
 * Created by fp on 2016/10/14.
 */
const _ = require('underscore');

const Table = require('../model/table');
const Room = require('../model/room');
const Seat = require('../model/seat');
const Game = require('../model/game');
const Agency = require('../model/agency');
const AgencyGame = require('../model/agency_game');
const AgencyPool = require('../model/agency_pool');
const SettingGroup = require('../model/setting_group');
const Setting = require('../model/setting');

const DB = require('./db');

class G{
    constructor(options){
        this._table = {};
        this._seats = {};
        this._db = new DB(_.pick(options, 'cluster', 'nodes'));
    }

    init(opt){
        return this._db.begin().then(dbc =>
            Table.get(dbc, {tableId: opt.tableId})
                .then(table => {
                    return Room.get(dbc, {roomId: table.roomid});
                })
                .then(room => {
                    return Seat.find(dbc, {tableId: opt.tableId});
                })
                .then(seats => {
                    return Game.get(dbc, this._table.gameid);
                })
                .then(() => {
                    return Agency.get(dbc, {agencyId: this._table.topagentid});
                })
                .then(() => {
                    return AgencyGame.find(dbc, this._table.gameid, gameprofile.pool_agentid, 1);
                })
                .then(() => {
                    return SettingGroup.get(dbc, gameprofile.groupid, gameprofile.pool_agentid, 1);
                })
                .then(() => {
                    return Setting.find(dbc, [{game_setting_agencyid: 0}, {game_setting_status: 1}]);
                })
                .then(() => {
                    return  AgencyPool.get(dbc, dbc, this._table.gameid, this.agentid);
                })
                .catch(e => {
                    log.error(e);
                    this._db.rollback(dbc).then(() => {
                        db.destroy(dbc);
                        me._resume();
                        reject(err);
                        if (!reload) process.exit(500);
                    }).catch(err=> {
                        me._resume();
                        reject(err);
                        if (!reload) process.exit(500);
                    });
                })
        ).then(res => {
            this._table = res.table;
            this._seats = res._seats;
        }).catch(e => {
            log.error(e);
        });
    }
}

module.exports = G;