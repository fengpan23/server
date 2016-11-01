/**
 * Created by fp on 2016/11/1.
 */
"use strict";
const http = require('http');
const url = require('url');
const queryString = require('querystring');

const backend = require('./backend.js');
const privatekey = '829c3804401b0727f70f73d4415e162400cbe57b';

function _result(error, msg) {
    let result = {
        status: !!error ? 'error' : 'ok',
        error: !!error ? error : '',
        msg: msg
    };
    return JSON.stringify(result);
}

class API {
    constructor() {
        this._server = http.createServer((req, res) => {
            console.log('req: ', req);
            // me.reqparse(req).then(function (reqmethod) {
            //     return me.router(reqmethod, res);
            // }).then(function (result) {
            //     res.end(_result(null, common.tostring(result)));
            // }).catch(function (err) {
            //     let result;
            //     if (wrong.iswrong(err))
            //         result = _result(err.errcode, err.debug);
            //     else if (err instanceof Error)
            //         result = _result('unexpected_error', common.tostring(err));
            //     else
            //         result = _result(!!err ? common.tostring(err) : 'unexpected_error');
            //     res.end(result);
            // });
        });
    }

    start(port){
        this._server.listen(port, () => {
            console.log('http api server listen on port: ', port);
        });
    }

    reqparse(req) {
        return new Promise(function (resolve, reject) {
            try {
                let result = {};
                let urlobj = url.parse(req.url);
                let urlpath = urlobj.pathname ? urlobj.pathname.split('/') : [];
                if (urlpath.findIndex(val=> val == 'api') !== 1)
                    return reject('invalid_request');
                result.path = 'api';
                result.method = urlpath[2] ? urlpath[2] : '';
                result.query = urlobj.query;
                result.param = querystring.parse(result.query);
                switch (req.method) {
                    case 'GET':
                        result.method += '|GET';
                        //let qry = result.query.substring(0, result.query.indexOf('&signature='));
                        //let signature = common.sha1(privatekey + qry + result.param.publickey);
                        //if (signature === result.param.signature)
                        //    resolve(result);
                        //else
                        //    reject('invalid_request');
                        resolve(result);
                        break;
                    case 'POST':
                        result.method += '|POST';
                        let body = '';
                        req.on('data', function (data) {
                            body += data;
                        }).on('end', function () {
                            result.body = body;
                            if (!common.empty(body))
                                result.param = Object.assign(result.param, JSON.parse(result.body));
                            let signature = common.sha1(privatekey + result.body + req.headers.publickey);
                            if (signature === req.headers.signature)
                                resolve(result);
                            else
                                reject('invalid_request');
                        });
                        break;
                    default :
                        return reject('invalid_request');
                }
            } catch (err) {
                reject('invalid_request');
            }
        });
    }

    router(reqmethod, res) {
        let me = this;
        switch (reqmethod.method) {
            case 'preseat|POST':
                return me.preseat(reqmethod.param);
            case 'kick|POST':
                return me.kick(reqmethod.param);
            case 'lockseats|POST' :
                return this.server.engine.lockseats();
            case 'unlockseats|POST' :
                return this.server.engine.unlockseats();
            case 'dumpsession|POST' :
                return me.dumpsession(reqmethod.param);
            case 'dumptable|POST' :
                return me.dumptable(reqmethod.param);
            case 'dumpconfig|POST' :
                return me.dumpconfig(reqmethod.param);
            case 'altertable|POST' :
                return me.altertable(reqmethod.param);
            case 'test|POST':
                return Promise.resolve();
            case 'backend|GET':
                return backend(res);
            case 'shutdown|POST':
                return me.processkill('SIGPIPE');
            case 'restart|POST':
                return me.processkill('SIGTERM');
            default :
                return Promise.reject('invalid_request');
        }
    }




    preseat(param) {
        if (!common.validate({kiosk_id: 'number+', ip: 'must'}, param))
            return Promise.reject('invalid_request');
        return this.server.engine.setpreseat(param.kiosk_id, param.ip, param.expired);
    }

    kick(param) {
        let me = this;
        if (!common.validate({kiosk_id: 'number+'}, param))
            return Promise.reject('invalid_request');
        return new Promise(function (resolve, reject) {
            let arr = me.server.getusers('array');
            arr.forEach(function (cli) {
                if (cli.kiosk.kiosk_id === param.kiosk_id) {
                    cli.close('unknown_session');
                    return resolve();
                }
            });
            resolve();
        });
    }

    dumpsession(param) {
        try {
            let result;
            let users = this.server.getusers('array');
            if (common.validate({kiosk_id: 'number+'}, param)) {
                let client = users.find((cli)=> {
                    return cli.kiosk.kiosk_id == param.kiosk_id
                });
                result = client ? Object.assign({}, client, {socket: 'socket', server: 'server'}) : {};
            } else {
                result = [];
                users.forEach(function (cli) {
                    result.push({client_id: cli.id, kiosk_id: cli.kiosk.kiosk_id, seatindex: cli.seatindex});
                });
                for (let kid of this.server.engine.preseat.keys())
                    result.push({kiosk_id: kid, seatindex: 'preseat'})
            }
            result = JSON.stringify(result);
            return Promise.resolve(result);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    dumptable(param) {
        try {
            let pause = this.server.engine.pause;
            let table = common.clone(this.server.engine.table);
            let gameprofile = common.clone(this.server.engine.gameprofile);
            let depositbalance = {};
            this.server.engine.depositbalance.forEach(function (bal, kioskid) {
                depositbalance[kioskid] = bal;
            });
            let depositwin = {};
            this.server.engine.depositwin.forEach(function (win, kioskid) {
                depositwin[kioskid] = win;
            });
            let depositstake = {};
            this.server.engine.depositstake.forEach(function (stake, kioskid) {
                depositstake[kioskid] = stake;
            });
            let result = {
                table: table,
                gameprofile: gameprofile,
                preseat: [...this.server.engine.preseat.keys()],
                preout: [...this.server.engine.preout.keys()],
                pause: pause,
                depositbalance: depositbalance,
                depositwin: depositwin,
                depositstake: depositstake
            };
            result = JSON.stringify(result);
            return Promise.resolve(result);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    dumpconfig(param) {
        try {
            if (common.validate({filename: 'must'}, param)) {
                return Promise.resolve(JSON.stringify(config.get(param.filename)));
            } else {
                return Promise.reject('invalid_request');
            }
        } catch (err) {
            return Promise.reject(err);
        }
    }

    altertable(param) {
        let me = this;
        return new Promise(function (resolve, reject) {
            me.server.engine.updatetable(param).then(function () {
                resolve();
                process.kill(process.pid, 'SIGINT');
            }).catch(function (err) {
                reject(err);
            });
        })
    }

    processkill(signal){
        process.kill(process.pid, signal);
        return Promise.resolve();
    }

}

module.exports = API;