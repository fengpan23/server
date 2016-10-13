/**
 * Created by fp on 2016/10/13.
 */

const _ = require('underscore');
const Events = require('events');
const Engine = require('engine');

const Table = require('./module/table');

class Index extends Events{
    /**
     * init game server
     * @param options  {object}   {api: {join: Func， seat: Func, ....}}
     */
    constructor(options) {
        this._engine = new Engine();
        this._engine.on('request', request => {     //request.content => json {event: String, data: Obj}
            if(options.api){
                let api = options.api[request.getAttribute('event')];
                api ? api(request) : request.close('unknown_action');
            }else{
                this.emit('request', request);
            }
        }).on('reconnect', request => {

        });
        // options.tableId
        //TODO: load table mess => init game => start engine
        this._engine.start(_.pick(options, 'port', 'ip'));      //port and ip to create socket server  default port:2323, ip:localhost
    };

    _init(){
        // loadDB.then()

    }

    _wait(client) {
        return new Promise(function (resolve, reject) {
            if (typeof client === 'object') {
                if (me.pause) {
                    me.clientwait.push({resolve: resolve, reject: reject});
                } else {
                    client.operating = true;
                    resolve();
                }
            } else {
                let players = me.server.getusers('array');
                if (me.pause || players.some(cli=>cli.operating === true)) {
                    me.enginewait.push({resolve: resolve, reject: reject});
                } else {
                    me.pause = true;
                    resolve();
                }
            }

            //if (engine) {
            //    let players = me.server.getusers('array');
            //    if (me.pause || players.some(cli=>cli.operating === true)) {
            //        me.enginewait.push({resolve: resolve, reject: reject});
            //    } else {
            //        me.pause = true;
            //        resolve();
            //    }
            //} else {
            //    if (me.pause)
            //        me.clientwait.push({resolve: resolve, reject: reject});
            //    else
            //        resolve();
            //}
        });
    }


    init(request) {
        console.log('api init');
        let players = this._engine.getClients();
        request.response('game', {s: 122112, c: 2132323, id: players[0].id});
        request.close();
    };

    seat(request) {

    };

    win(request) {
    };

    quit(request){

    };

    reconnect(request){

    };

    disconnect(request) {
        if(!request.seatindex())return request.close();
        console.info(request.seatindex() + ' client disconnect !!!');
        this.userquit(request);
    };

    exit() {
    };
}

new Index();
