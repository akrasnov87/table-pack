/**
 * Распаковка / Упаковка
 * @file modules/zip.js
 * @project table-pack
 * @author Aleksandr Krasnov
 */

var AdmZip = require('adm-zip');
var zlib = require('zlib');

/**
 * Создание архива
 * @param {string} name имя файла
 * @param {any} data Buffer
 * @param {string} type тип сжатия
 * @returns {Buffer} буффер
 */
exports.encode = function(name, data, type) {
    if(type == 'ZIP') {
        var zip = new AdmZip();
        zip.addFile(name, data);
        return zip.toBuffer();
    } else {
        return zlib.deflateSync(data);
    }
}

/**
 * Распаковка архива
 * @param {any} buf BUFFER
 * @param {string} type тип сжатия
 * @returns {string|Error} если Error, то ошибка
 */
exports.decode = function(buf, type) {
    if(type == 'ZIP') {
        var zip = new AdmZip(buf);
        var zipEntries = zip.getEntries();
        var str;
        zipEntries.forEach(function(zipEntry) {
            str = zipEntry.getData().toString('utf8');
        });
        if(!str)
            return new Error('Ошибка распаковки данных (ZIP)');
        return str;
    } else {
        var str = zlib.inflateSync(buf);
        return str.toString('utf8');
    }
}