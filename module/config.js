/**
 * Created by fp on 2016/10/14.
 */
"use strict";
const _ = require('underscore');
const fs = require('fs');
const path = require('path');

const Log = require('log')();

const PATH = '../config';
const ENV = 'env';
const NODE_ENV = (process.env.NODE_ENV || 'local').toLowerCase();

class Config {
    constructor() {
        this.setting = new Map();

        this.load(PATH, 'common.json');
        this.load(path.join(PATH, ENV), NODE_ENV + '.json');
    }

    load(dir, fileName) {
        // Log.info('config file path: ', path.join(dir, fileName));
        let file = fs.readFileSync(path.join(__dirname, dir, fileName), "utf8");
        try {
            file = JSON.parse(file);
            for(let key in file){
                this.setting.set(key, file[key]);
            }
        } catch (err) {
            Log.error(`Error load file:${fileName}, err:${err}`);
        }
    }

    /**
     * @return key {string}     eg: common.cluster
     */
    get(key) {
        let keys = key.split('.');
        let results = {};
        for(let k of keys){
            if (this.setting.has(k) ||  results.hasOwnProperty(k))
                results = this.setting.get(k) || results[k];
            else
                break;
        }
        return _.isEmpty(results) ? null : results;
    }
}
module.exports = Config;