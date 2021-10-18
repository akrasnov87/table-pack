/**
 * @file modules/fs-util.js
 * @project table-pack
 * @author Aleksandr Krasnov
 */

 var fs = require('fs');
 var join = require('path').join;
 
 /**
  * получение информации о таблицах в директории
  * @param {string} dir директория
  */
 exports.getTables = async function(dir) {
     return await new Promise((resolve, reject)=>{
         fs.readdir(dir, async function(err, tables) {
             var versions = {};
             if(tables) {
                 for(var i = 0; i < tables.length; i++) {
                     var table = tables[i];
                     versions[table] = await getVersionsByTable(join(dir, table));
                 }
             }
     
             resolve(versions);
         });
     });
 }
 
 exports.getVersionsByTable = getVersionsByTable;
 
 /**
  * Сортировка по версии
  * @param {string} dir директория
  */
 async function getVersionsByTable(dir) {
     return await new Promise((resolve, reject)=>{
         var records = []
         fs.readdir(dir, async function(err, versions) {
             versions.sort((a, b)=> {
                 if(versionToNumber(a) < versionToNumber(b)) {
                     return -1;
                 }
 
                 if(versionToNumber(a) > versionToNumber(b)) {
                     return 1;
                 }
 
                 return 0;
             });
             var array = versions.reverse();
             for(var i in array) {
                 var dDir = join(dir, array[i]);
 
                 var divisions = fs.readdirSync(dDir);
                 if(fs.lstatSync(join(dDir, divisions[0])).isDirectory()) {
                     // значит division
                     for(var i = 0; i < divisions.length; i++) {
                         var division = divisions[i];
                         
                         records.push({
                             division: division,
                             readme: await readReadme(join(dDir, division.toString()))
                         });
                         records[records.length - 1]['MD5'] = await readMD5(join(dDir, division.toString()));
                         records[records.length - 1].equal = function(array) {
                             for(var i = 0; i < array.length; i++) {
                                 var item = array[i];
                                 var data = item.split(':');
                                 if(this.MD5[data[0]] != data[1]) {
                                     console.log('md5 not equal ' + data[0]);
                                     return false;
                                 }
                             }
                             return true;
                         }
                     }     
                 } else {
                     records.push(await readReadme(join(dir, array[i])));
                     records[records.length - 1]['MD5'] = await readMD5(join(dir, array[i]));
                     records[records.length - 1].equal = function(array) {
                         for(var i = 0; i < array.length; i++) {
                             var item = array[i];
                             var data = item.split(':');
                             if(this.MD5[data[0]] != data[1]) {
                                 console.log('md5 not equal ' + data[0]);
                                 return false;
                             }
                         }
                         return true;
                     }
                 }
                      
             }
 
             resolve(records);
         });
     });
 }
 
 exports.versionToNumber = versionToNumber;
 
 /**
  * Преобразовать версию в число
  * @param {string} version версия
  */
 function versionToNumber(version) {
     var data = version.split('.');
     return (parseInt(data[1]) * 24 * 60) + parseInt(data[2]);
 }
 
 /**
  * Чтение readme.txt
  * @param {string} dir директория
  */
 async function readReadme(dir) {
     return await new Promise((resolve, reject) => {
         var file = join(dir, 'readme.txt');
         if(fs.existsSync(file)) {
             fs.readFile(file, function(err, txt) {
                 if(err) {
                     reject(err);
                 } else {
                     resolve(readmeToObject(txt.toString()));
                 }
             });
         } else {
             resolve({});
         }
     });
 }
 
 /**
  * Чтение md5.txt
  * @param {string} dir директория
  */
 async function readMD5(dir) {
     return await new Promise((resolve, reject) => {
         var file = join(dir, 'md5.txt');
         if(fs.existsSync(file)) {
             fs.readFile(file, function(err, txt) {
                 if(err) {
                     reject(err);
                 } else {
                     resolve(md5ToObject(txt.toString()));
                 }
             });
         } else {
             resolve({});
         }
     });
 }
 
 /**
  * преобразование текста в объект
  * @param {string} txt текст
  */
 function md5ToObject(txt) {
     var lines = txt.split('\n');
     var obj = {};
     lines.forEach(line => {
         var data = line.split(':');
         obj[data[0]] = data[1];
     });
 
     return obj;
 }
 
 /**
  * преобразование текста в объект
  * @param {string} txt текст
  */
 function readmeToObject(txt) {
     var lines = txt.split('\n');
     var obj = {};
     var fields = lines[0].split('|');
     var values = lines[1].split('|');
     for(var i = 0; i < fields.length; i++ ) {
         obj[fields[i]] = values[i];
     }
     
     return obj;
 }