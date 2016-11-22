/**
 * Created by fp on 2016/10/13.
 */

const Server = require('./server');
const STATUS = {exit: -1, init: 1, opened: 3, closed: 5, unlock: 9, locked: 10};

class Index extends Server{
    /**
     * init game server
     * @param options  {object}   {api: {join: Func， seat: Func, ....}}
     */
    constructor(options) {
        super(options);

        this._status = 'init';
    }

    /**
     * player login game
     * @param player   {object}
     * @param options   {object}    {session: String}
     * @returns {Promise}
     */
    login(player, options){
        return this._lock(player, 'login').then(() =>
            this._game.login(player, options).then(pla => {
                player.status = 'login';
                return this._unlock(pla, 'login');
            }).catch(e => {
                this._unlock(player, 'login');
                return Promise.reject(e);
            })
        );
    }

    /**
     * player have seat
     * @param player
     * @param seatIndex
     * @returns {Promise}
     */
    seat(player, seatIndex) {
        return this._lock(player, 'seat').then(() => {
            let client = this._engine.getClients(player.clientId);
           return this._game.seat(player, Object.assign({index: seatIndex}, client.remote)).then(index => {
                player.set('index', index);
                player.status = 'seat';
                return this._unlock(player, 'seat').then(() => Promise.resolve(index));
            }).catch(e => {
                this._unlock(player, 'seat');
                return Promise.reject(e);
            });
        });
    }

    /**
     * start game
     * @returns {*}
     */
    open(){
        if(this._status === STATUS.locked)
            return Promise.reject({code: 'invalid_call', message: 'server id locked on open'});
        if (this._game.id)       // 校验 ‘游戏是否正在暂停’ ||  ‘游戏是否已开场’
            return Promise.reject({code: 'invalid_call', message: 'match is already opened on engine.open'});

        this._status = STATUS.locked;
        return this._game.start([...this._players.values()]).then(() => {
            this._status = STATUS.opened;
        }).catch(e => {
            let clients = this._engine.getClients(this.players.keys());
            clients.forEach(client => {
                client.close('system_maintenance');
            });
            this._status = STATUS.unlock;
            return Promise.reject(e);
        });
    }

    /**
     * player quit  玩家退出游戏，返回玩家买入金额，释放座位（如果已经坐下）
     * @param player
     */
    quit(player){
        return this._lock(player, 'quit').then(() =>
            this._game.leave(player).then(() => {
                this._players.delete(player.clientId);
                if (this._game.id) {
                    // return player.leave(request, me.gameprofile, me.table, me.depositbalance.get(kiosk.kiosk_id) || 0);
                } else {
                    return Promise.resolve();
                }
            }).then(() => {
                return this._unlock(player, 'seat');
            })
        ).catch(e => {
            this._unlock(player, 'seat');
            return Promise.reject(e);
        });
    };

    /**
     * close this server
     * @returns {*}
     */
    close(){
        // if (this.options.deposit && me.getdepositstake() !== me.getdepositwin()) {
        //     return Promise.reject(new wrong("error", "invalid_action", 'staketotal is not equal wintotal on engine.MatchClose'));
        // }
        if(this._status === STATUS.locked)
            return Promise.reject({code: 'invalid_call', message: 'server id locked on close'});

        this._status = STATUS.locked;
        let players = [...this._players.values()];
        return this._game.over(players).then(() => {
            this._status = STATUS.closed;
            this._unlock('close');
        }).catch(e => {
            this._status = STATUS.unlock;
            return Promise.reject(e);
        });
    }

    exit() {
        this._status = STATUS.exit;
    };

    get(name){
        return this._game[name];
    }

    /**
     * lock player
     * @param player
     * @param action
     * @returns {*}
     * @private
     */
    _lock(player, action){
        if(this._status === STATUS.exit)
            return Promise.reject({code: 'lock_fail', message: 'server is exit !'});

        return player.verify(action).then(() => {
            return player.lock(action);
        });
    }

    /**
     * unlock player operate
     * @param player
     * @param action    unlock action
     * @private
     */
    _unlock(player, action){
        if(this._status === STATUS.exit)
            return Promise.reject({code: 'unlock_fail', message: 'server is exit !'});
        return player.unlock(action);
    }
}

module.exports = Index;