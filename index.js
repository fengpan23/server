/**
 * Created by fp on 2016/10/13.
 */
const Events = require('events');
const Engine = require('engine');

class Index extends Events{
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

        this._engine.start();
    };

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
