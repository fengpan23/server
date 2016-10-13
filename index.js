/**
 * Created by fp on 2016/10/13.
 */

const Engine = require('engine');

class Index {
    constructor() {
        this._engine = new Engine({tableId: 67});
        this._engine.start();

        this._engine.on('request', request => {     //request.content => json {event: String, data: Obj}
            let action = request.getAttribute('event');
            if(this[action]){
                this[action](request);
            }else{
                console.error('can not find action： ' + action);
                console.log(request);
            }
        });
    };

    init(request) {
        console.log('api init');
        let players = this._engine.getPlayers();
        request.response('game', {s: 122112, c: 2132323, id: players[0].id});
        request.close();
    };

    /**
     * api user join game and have sit
     * @param request
     */
    seat(request) {

    };

    /**
     * api player win game
     */
    win(request) {
    };

    /**
     * api user quit
     * @param request
     */
    quit(request){

    };

    /**
     * api reconnect
     */
    reconnect(request){

    };

    disconnect(request) {
        if(!request.seatindex())return request.close();
        console.info(request.seatindex() + ' client disconnect !!!');
        this.userquit(request);
    };

    exit() {
    };

    exceptionhandle(err) {
    };
}

new Index();
