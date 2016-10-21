/**
 * Created by fp on 2016/10/21.
 */

class Util {
    constructor() {

    }

    format(sub, input) {
        let results = {};
        let start = typeof sub === 'number' ? sub : sub.length + 1;
        for(let key in input){
            results[key.substr(start)] = input[key];
        }
        return results;
    }
}
module.exports = new Util();