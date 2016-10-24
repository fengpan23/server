/**
 * Created by fengpan on 2016/10/22.
 */

const Kiosk = require('../model/kiosk');

class Player {
    constructor() {
    }

    init(dbc, session){
        //TODO: remove test
        return Kiosk.get(dbc, {id: session}).then(kiosk => {
        // return Kiosk.get(dbc, {session: session}).then(kiosk => {
            if(kiosk){
                if(kiosk.status !== 1)
                    return Promise.reject('invalid_user, kiosk is not active on player.init');

                return Promise.resolve(this._kiosk = kiosk);
            }
            return Promise.reject('unknown_session, cat not get kiosk by session on player.init');
        });
    }

    set(key, value){
        this[key] = value;
    }

    get(key){
        switch (key){
            case 'username':
                return this._kiosk.username;
            case 'kiosk':
                break;
        }
        return this['_' + key];
    }
}

module.exports = Player;