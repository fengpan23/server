/**
 * Created by fengpan on 2016/10/22.
 */
const Kiosk = require('../model/kiosk');

class Player {
    constructor(clientId) {
        this.clientId = clientId;
        this.status = 'init';
    }

    init(dbc, session){
        //TODO: if this._kiosk had id ???
        // return Kiosk.get(dbc, {session: session}).then(kiosk => {
        return Kiosk.get(dbc, {id: 205}).then(kiosk => {
            this.status = 'login';
            if(kiosk){
                if(kiosk.status !== 1)
                    return Promise.reject('invalid_user, kiosk is not active on player.init');

                return Promise.resolve(this._kiosk = kiosk);
            }
            return Promise.reject('unknown_session, cat not get kiosk by session on player.init');
        });
    }

    // /**
    //  * set value to client
    //  * @param key   {String}
    //  * @param value {*}
    //  * @return Boolean
    //  */
    // set(key, value){
    //     if(key){
    //         if(typeof key === 'object'){
    //             for(let k in key){
    //                 this.set(k, key[k]);
    //             }
    //         }else{
    //             this._client[key] = value;
    //         }
    //         return true;
    //     }
    //     return false;
    // }
    //
    // /**
    //  * get before set value
    //  * @param key   {String}
    //  */
    // get(key){
    //     return this._client[key];
    // }

    set(key, value){
        this[key] = value;
    }

    get(key){
        switch (key){
            case 'username':
                return this._kiosk.username;
            case 'kiosk':
                return this._kiosk;
                break;
            case 'point':
                return this._kiosk['balance_a'];
                break;
        }
        return this['_' + key];
    }

    lock(){
        this.status = 'operating';
    }
}

module.exports = Player;