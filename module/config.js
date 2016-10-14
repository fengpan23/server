/**
 * Created by fp on 2016/10/14.
 */

"use strict";
const fs = require('fs');
const path = require('path');
const log = require('log');
const common = require('./common.js');

const envname = 'envconf';
const syspath = '../config';
const env = (process.env.NODE_ENV || 'local').toLowerCase();
const appname = (process.env.APP_NAME || 'default').toLowerCase();
const dfreloadtime = 60000;
const configs = new Map();

class Config {
    constructor() {
        me.loadsysconfig();
        let reloadtime = configs.get('commonconf').settimeout.configreload||dfreloadtime;
        me.reload = setInterval(function(){
            me.loadsysconfig();
        }, reloadtime);
    }

    loadsysconfig() {
        let dir = path.join(__dirname, syspath);
        let files = fs.readdirSync(dir);
        files.forEach(function (file) {
            if (file.endsWith('.json')) {
                let filename = file.slice(0, -5);
                let jsonfile = fs.readFileSync(path.join(dir, file), "utf8");
                try {
                    jsonfile = JSON.parse(jsonfile);
                    configs.set(filename, jsonfile);
                } catch (err) {
                    syslog.log(`Error load json file:${filename}, err:(${common.tostring(err)})`);
                }
            }
        });
        this.loadenvconfig();
    }

    loadenvconfig() {
        let filename = path.join(__dirname, syspath, envname, `${env}_${appname}.json`);
        //console.log('config filename: !!!!!!!!!!!!!!! ',  filename);
        let jsonfile = fs.readFileSync(filename, "utf8");
        try {
            jsonfile = JSON.parse(jsonfile);
            configs.set(envname, jsonfile);
        } catch (err) {
            syslog.log(`Error load json file:${filename}, err:(${common.tostring(err)})`);
        }
    }

    loadappconfig(gamecode) {
        this.apppath = gamecode;
        let dir = path.join(__dirname, '../apps', gamecode, 'config');

        //let dir = path.join(__dirname, '../apps', gamecode, `config_${tableid}`);
        //if(!fs.existsSync(dir))
        //    dir = path.join(__dirname, '../apps', gamecode, 'config');

        let files = fs.readdirSync(dir);
        files.forEach(function (file) {
            if (file.endsWith('.json')) {
                let filename = file.slice(0, -5);
                let jsonfile = fs.readFileSync(path.join(dir, file), "utf8");
                try {
                    jsonfile = JSON.parse(jsonfile);
                    configs.set(filename, jsonfile);
                } catch (err) {
                    syslog.log(`Error load json file:${filename}, err:(${common.tostring(err)})`);
                }
            }
        });
    }

    reloadconfig() {
        try {
            this.loadsysconfig();
            this.loadappconfig(this.apppath);
        } catch (err) {
            syslog.log(`Config reload Error(${common.tostring(err)})`);
        }
    }


    /**
     * @param  config file name
     * @param  attribute name
     * @return attribute value
     */
    get(filename) {
        if (configs.has(filename))
            return common.clone(configs.get(filename));
        else
            return null;
    }

    envconf() {
        return common.clone(configs.get(envname));
    }

    commonconf() {
        return common.clone(configs.get('commonconf'));
    }
}

module.exports = new config();

