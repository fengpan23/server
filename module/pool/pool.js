/**
 * Created by fp on 2016/11/18.
 */

class Pool {
    constructor() {
        this.ptmultiplier = 100;
        this.ptype = "pointa";
        this.agentid = 0;
        this.lastupdate = 0;
        this.game = {};
        this.pool = {
            avaliable: 0,
            real: 0,
            current: 0,
            total: 0,
            protect: 0,
            progjp: 0
        };
    }

    /**
     * 游戏水池初始化
     * @param dbc
     * @param game
     * @param agentid
     */
    init(dbc, game, amount, reserve) {
        let me = this;
        me.game = game;
        me.agentid = profile.getpoolagentid();
        me.ptype = profile.getptype();
        me.reserve = reserve;
        return me.gpoolupdate(dbc, amount);
    }



    /**
     * 获取当前可用水池(真实水池)
     * @param dbc
     * @param amount
     * @returns {*}
     */
    gpoolupdate(dbc, _amount) {
        let me = this;
        if (Date.now() - me.lastupdate < 1000)// cache for per sec
            return Promise.resolve(me.pool);
        let amount = common.empty(_amount) ? 0 : _amount;
        return new Promise(function (resolve, reject) {
            gameagentpoolmodel.getagentpool(dbc, me.game.id, me.game.pool_agentid, me.game.groupid).then(function (pool) {
                if (pool) {
                    return Promise.resolve(pool);
                } else {
                    return Promise.resolve({id: 0, pool: 0});
                    //return gameagentpoolmodel.addnewagentpool(dbc, me.game.id, me.game.pool_agentid, me.game.groupid).then(function (result) {
                    //    return Promise.resolve({id: result.insertId, pool: 0});
                    //}).catch(function (err) {
                    //    return Promise.reject(err);
                    //})
                }
            }).then(function (pool) {
                pool.id = common.tonumber(pool.id, 0);
                pool.pool = common.tonumber(pool.pool);
                if (me.reserve) {
                    amount = common.tonumber(amount);
                    pool.real = common.tonumber(pool.pool - amount * 0.5);
                    pool.avaliable = pool.real < 0 ? 0 : pool.real;
                } else {
                    pool.real = common.tonumber(pool.pool + me.game.initfund);
                    pool.avaliable = pool.real < 0 ? 0 : pool.real;
                }
                me.pool = {
                    real: pool.real,
                    avaliable: pool.avaliable,
                    current: pool.current,
                    total: pool.total,
                    protect: pool.protect,
                    progjp: pool.progjp
                };
                me.lastupdate = Date.now();
                resolve(me.pool);
            }).catch(function (err) {
                reject(err);
            })
        });
    }


    /**
     * 游戏水池检查(同时检查winratio)
     * @param request
     * @param amount
     * @param multiplier
     * @returns {boolean}
     */
    gpoolchk(request, amount, multiplier) {
        let me = this;
        if (!profile.getwinratio(request))
            return false;

        amount = common.tonumber(amount);
        if (multiplier)
            amount = profile.ptconvertion(amount);

        if (me.pool.avaliable > amount)
            return true;
        else
            return false;
    }


    /**
     * 用户流水(加钱)
     * @param request
     * @param amount
     * @param multiplier
     * @param callback
     * @constructor
     */
    gpoolcsubpt(request, amount, multiplier) {
        let me = this;
        amount = -1 * common.tonumber(amount, 4, true);
        if (multiplier)
            amount = profile.ptconvertion(amount);

        if (amount)
            return gpooliomodel.addpoolsubptio(request.dbc, request.propertyget('kiosk').kiosk_id, me.game, me.agentid, amount);
        else
            return Promise.resolve();
    }


    /**
     * 用户流水(减钱)
     * @param request
     * @param amount
     * @param multiplier
     */
    gpooladdstake(request, amount, multiplier) {
        let me = this;
        amount = common.tonumber(amount, 4, true);
        if (multiplier)
            amount = profile.ptconvertion(amount);

        if (amount)
            return gpooliomodel.addpoolbetio(request.dbc, request.propertyget('kiosk').kiosk_id, me.game, me.agentid, amount);
        else
            return Promise.resolve();
    }

    ;

    /**
     * 返回水池的金额(计算用户的winratio)
     * @param request
     * @param multiplier
     * @returns {{current: number, total: number, protect: number, progjp: number,avaliable:number,real:number}}
     * @constructor
     */
    gpoolamount(request, multiplier, initfund) {
        let me = this;
        if (!profile.getwinratio(request))
            return {
                avaliable: 0,
                real: 0,
                current: 0,
                total: 0,
                protect: 0,
                progjp: 0
            };
        return me.pool;
    }

    gpooldelaychk(dbc) {
        let me = this;
        let curdelay = 0;
        let maxdelay = 0;
        let error = null;
        return new Promise(function (resolve, reject) {
            gpooliomodel.getdelay(dbc, me.game.groupcode).then(function (delaysec) {
                let curdelay = delaysec;
                let maxdelay = me.game.setting.gpool_external_max_delay ? common.tonumber(me.game.setting.gpool_external_max_delay, 0, true) : 60;
                let overpay = me.game.setting.gpool_max_overpay ? common.tonumber(me.game.setting.gpool_max_overpay, 0, true) : 1000;

                if (me.game.setting.gpool_external_check && curdelay > maxdelay
                    && common.tonumber(me.game.setting.status, 0) === 0) {//检查水池是否存在delay
                    sms.errormsg('SMS_POOL_NOTICS', common.now(), me.game.flash_game, me.game.id, curdelay);
                    error = new wrong('error', 'game_maintenance', 'gpool is delay on gamepool.gpooldelaychk');
                    return gamemodel.updatestatus(null, me.game.id, 2, "maintainance");
                } else if (me.pool.real < 0 && me.pool.real < -1 * overpay && common.tonumber(me.game.status, 0) === 1) {//检查水池是否overpay
                    sms.errormsg('SMS_POOL_OVERPAY', common.now(), me.game.flash_game, me.game.id, me.pool.real.toFixed(4));
                    error = new wrong('error', 'game_maintenance', 'gpool is overpay on gamepool.gpooldelaychk');
                    return gamemodel.updatestatus(null, me.game.id, 2, "maintainance");
                } else {
                    return Promise.resolve();
                }
            }).then(function () {
                if (error === null) {
                    resolve();
                } else {
                    reject(error);
                }
            }).catch(function (err) {
                reject(err);
            });
        });
    }
}
module.exports = new Pool();