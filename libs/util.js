/**
 * Created by fp on 2016/10/21.
 */

const _ = require('underscore');

class Util {
    /**
     * 字符串的拼接|截取
     * @param  input {Object}
     * @param  {[type]}
     * @param  {[type]}
     * @return {[type]}
     */
    static format(input, str, plus) {
        let results = {};
        let start = typeof str === 'number' ? str : str.length + 1;
        let st = str ?　str + '_' : '';
        for(let key in input){
            let k = plus ? st + key : key.substr(start);
            results[k] = input[key];
        }
        return results;
    }

    /**
     * 获取查询条件 
     * @param  input {Array}
     * @param  plus {String}
     * @return {[Array]}
     */
    static getCond(input, plus){
        let results = [];
        for(let key in _.omit(input, v => !v)){
            results.push({[plus ?　plus + '_' + key : key]: input[key]});
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