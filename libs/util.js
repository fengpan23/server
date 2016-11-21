/**
 * Created by fp on 2016/10/21.
 */

class Util {
    constructor() {

    }

    static format(str, input, plus) {
        let results = {};
        let start = typeof str === 'number' ? str : str.length + 1;
        for(let key in input){
            let k = plus ? str + '_' + key.toLowerCase() : key.substr(start);
            results[k] = input[key];
        }
        return results;
    }

    static getCond(plus, input){
        let results = [];
        for(let key in input){
            results.push({[plus + '_' + key.toLowerCase()]: input[key]});
        }
        return results;
    }

    /**
     * 获得指定时间的格式化字符串（****-**-** **:**:**）
     * @param date  {Date}
     * @returns {string}    "1970-00-00 00:00:00"
     */
    static dateTime(date) {
        return date.getFullYear() + '-' +
            (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1) + '-' +
            (date.getDate() < 10 ? '0' : '') + date.getDate() + ' ' +
            (date.getHours() < 10 ? '0' : '') + date.getHours() + ':' +
            (date.getMinutes() < 10 ? '0' : '') + date.getMinutes() + ':' +
            (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
    }

    static formatDate(date, timezone) {
        if (date instanceof Date) {
            let options = {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: timezone || 'UTC'};
            try {
                let tz = new Intl.DateTimeFormat('zh-CN', options).format(date);
                return Util.dateTime(new Date(tz));
            } catch (err) {
                return Util.dateTime(date);
            }
        }
    }
}
module.exports = Util;