/**
 * Created by fp on 2016/11/11.
 */

const _ = require('underscore');
const Common = require('common');

const Game = require('../model/game');
const Agency = require('../model/agency');
const AgencyGame = require('../model/agency_game');
const AgencyPool = require('../model/agency_pool');
const AgencySuspend = require('../model/agency_suspend');
const SettingGroup = require('../model/setting_group');
const Setting = require('../model/setting');

class Profile{
    constructor(){
        this._game= {};
        this._setting = {};
    }
    get game(){
        return Object.assign({}, this._game);
    }
    get setting(){
        return Object.assign({}, this._setting);
    }

    init(dbc, options){
        return Game.get(dbc, options.gameid)
            .then(game => {
                this._game = game;
                return Agency.get(dbc, {agencyId: options.topagentid});
            })
            .then(agency => {
                if (options.agentid === 0)
                    this._game.pool_agentid = options.topagentid;

                return AgencyGame.find(dbc, {gameId: options.gameid, agentId: this._game.pool_agentid}, 1);
            })
            .then(a => {
                // console.log(a)
                let params = {
                    groupId: this._game.groupid,
                    agencyId: this._game.pool_agentid,
                    status: 1
                };
                return SettingGroup.get(dbc, params);
            })
            .then(b => {
                this._game.top_agentid = 0;
                return this._loadSetting(dbc, options);
            })
            .then(settings => {
                this._setting = settings;
                return  AgencyPool.get(dbc, options.ptype, options.gameid, options.agentid);
            });
    }

    _loadSetting(dbc, options){
        return Setting.find(dbc, {agencyId: 0, status: 1}).then(settings => {
            let results = {};
            for (let s of settings)
                results[s.name] = formatData(s);

            if (options.topagentid === 0) {
                return Promise.resolve(results);
            } else {
                return Setting.find(dbc, {agencyId: options.topagentid}, {status: 1}).then(_settings => {
                    for (let s of _settings)
                        results[s.name] = formatData(s);

                    return Promise.resolve(results);
                });
            }
        });

        function formatData(obj){
            let res;
            switch (obj.type) {
                case 'boolean':
                    res = !_.isEmpty(obj.data);
                    break;
                case 'number':
                    res = +obj.data;
                    break;
                case 'string':
                    res = String(obj.data);
                    break;
                case 'json':
                    res = Common.safeParse(obj.data);
                    break;
            }
            return res;
        }
    }

    _format(obj){
        let res;
        switch (obj.type) {
            case 'boolean':
                res = !_.isEmpty(obj.data);
                break;
            case 'number':
                res = +obj.data;
                break;
            case 'string':
                res = String(obj.data);
                break;
            case 'json':
                res = Common.safeParse(obj.data);
                break;
        }
        return res;
    }
}

module.exports = Profile;