/**
 * Created by fp on 2016/11/11.
 */

const Game = require('../model/game');
const Agency = require('../model/agency');
const AgencyGame = require('../model/agency_game');
const AgencyPool = require('../model/agency_pool');
const AgencySuspend = require('../model/agency_suspend');
const SettingGroup = require('../model/setting_group');
const Setting = require('../model/setting');

class Profile{
    constructor(){
        this._profile= {};
    }

    init(dbc, opt){
        return Game.get(dbc, opt.gameid)
            .then(game => {
                this._profile = game;

                return Agency.get(dbc, {agencyId: opt.topagentid});
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
                console.log('_profile', this._profile);
                return Setting.find(dbc, [{game_setting_agencyid: 0}, {game_setting_status: 1}]);
            })
            .then(setting => {
                console.log('setting', setting);
                return  AgencyPool.get(dbc, this._table.ptype, this._table.gameid, this._table.agentid);
            })
    }
}

module.exports = Profile;