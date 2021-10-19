/**
 * @file /index.js
 * @project table-pack
 * @author Aleksandr Krasnov
 */

var rpc = require('./modules/rpc')
var args = require("args-parser")(process.argv);
var fs = require('fs');
var join = require('path').join;
var mkdir = require('mkdir-recursive');
var compress = require('./modules/zip');
var pkg = require('./package.json');
var md5 = require('hash-sum');
var fsUtil = require('./modules/fs-util');

var divisions = [null];

// выполняем оценку загрузки
(async function() {
    try {
        var csvZip = join(args.output || __dirname, 'csv-zip');
        var csvZipItems = await fsUtil.getTables(csvZip);

        var dirCsvCompress = join(args.output || __dirname, 'csv-zip');

        var tablePath = join(__dirname, 'tables', args.table + '.json');
        if(!fs.existsSync(tablePath)) {
            return console.log("table " + args.table + " not found");
        }
        
        var authResult = await rpc.auth(args.url, args.login, args.password);

        var b_division = args.division;

        if(b_division) {
            var divisionTablePath = join(__dirname, 'tables', 'SD_Divisions.json');
            if(!fs.existsSync(divisionTablePath)) {
                return console.log("table SD_Divisions not found");
            }

            var divisionItems = JSON.parse(fs.readFileSync(divisionTablePath).toString());
            var divisionResults = await rpc.request(args.url, authResult.token, divisionItems);
            if(!Array.isArray(divisionResults)) {
                return console.error(divisionResults.details);
            } else {
                divisions = divisionResults[0].result.records;
            }
        }

        var birthday = pkg.birthday;
        var version = pkg.version.split('.');
        var newVersion = args.version || version[0] + '.' + Math.floor(Math.abs(new Date().getTime() - new Date(birthday).getTime()) / (1000 * 3600 * 24)) + '.'
                                            + ((new Date().getHours() * 60) + new Date().getMinutes());

        for(var d = 0; d < divisions.length; d++) {
            var division = divisions[d];

            var items = JSON.parse(fs.readFileSync(tablePath).toString());
            var size = items[0].data[0].limit;
            if(division != null) {
                items[0].data[0].filter = [{ "property": "F_Division", "value": division.LINK }];
            }
            items[0].data[0].limit = 1;

            var results = await rpc.request(args.url, authResult.token, items);
            if(!Array.isArray(results)) {
                console.error(results.details);
            } else {
                                                    
                var total = results[0].result.total;
                console.log(total);

                if(!fs.existsSync(dirCsvCompress)) {
                    mkdir.mkdirSync(dirCsvCompress);
                }

                var record = results[0].result.records[0];
                var headers = [];
                if(items[0].data[0].select) {
                    headers = items[0].data[0].select.split(',');
                } else {
                    for(var i in record) {
                        headers.push(i);
                    }
                }
                var rows = [headers.join('|')];
            
                var tableCompressDir = null;
                var division = divisions[d];
                if(division == null) {
                    tableCompressDir = join(dirCsvCompress, args.table, newVersion);
                } else {
                    tableCompressDir = join(dirCsvCompress, args.table, newVersion, division.LINK.toString());
                }

                if(!fs.existsSync(tableCompressDir)) {
                    mkdir.mkdirSync(tableCompressDir);
                }

                var allJson = 0;
                var allJsonCompress = 0;
                var allCsv = 0;
                var allCsvCompressSize = 0;

                var md5CsvCompressSize = [];

                var fileCount = 0;
                var start = args.start || 0;

                for(var i = start; i < total; i += size) {
                    try {
                        var item = items[0];
                        item.data[0].limit = size;
                        item.data[0].start = i;

                        if(division != null) {
                            item.data[0].filter = [{ "property": "F_Division", "value": division.LINK }];
                        }
                        
                        results = await rpc.request(args.url, authResult.token, items);
                        if(!Array.isArray(results)) {
                            i -= size;
                            console.error(results.details);
                        } else {
                            var inner = [];
                            var records = results[0].result.records;
                            // выполняем преобразование
                            for(var j = 0; j < records.length; j++) {
                                var r = records[j];
                                
                                for(var k = 0; k < headers.length; k++) {
                                    var line = r[headers[k]];
                                    if(line == undefined || line == null) {
                                        line = '';
                                    }
                                    line = line.toString();
                                    if(line.indexOf('|') >= 0) {
                                        line = line.replace(/\|/gi, '/');
                                    }
                                    if(line.indexOf('\n') >= 0) {
                                        line = line.replace(/\n/gi, '');
                                    }
                                    if(line.indexOf('\r') >= 0) {
                                        line = line.replace(/\r/gi, '');
                                    }
                                    inner.push(line.trim());
                                }
                                rows.push(inner.join('|'));
                                inner = [];
                            }

                            var fileName = i + '-' + (i+size);

                            var jsonStr = JSON.stringify(records);
                            var buffer = Buffer.from(jsonStr,'utf8');
                            allJson += buffer.byteLength;

                            var bufferJsonCompress = compress.encode(fileName, buffer, args.compress);
                            allJsonCompress += bufferJsonCompress.byteLength;
                            
                            var rowsStr = rows.join('\n');
                            var bufferCsv = Buffer.from(rowsStr,'utf8');
                            allCsv += bufferCsv.byteLength;

                            var bufferCsvCompress = compress.encode(fileName, bufferCsv, args.compress);
                            md5CsvCompressSize.push(fileName + ':' + md5(rowsStr));
                            fs.writeFileSync(join(tableCompressDir, fileName + '.zip'), bufferCsvCompress);
                            allCsvCompressSize += bufferCsvCompress.byteLength;

                            fileCount++;

                            rows = [headers.join('|')]
                            console.log(i + '/' + total + " | json: " + toMb(allJson) + "; json-zip: " + toMb(allJsonCompress) + "(" + toPercent(allJson, allJsonCompress) + "%)" + "; csv: " + toMb(allCsv) + "("+toPercent(allJson, allCsv)+"%)" + "; csv-zip: " + toMb(allCsvCompressSize) + "("+ toPercent(allJsonCompress, allCsvCompressSize) + " - " + toPercent(allCsv, allCsvCompressSize) + " - " + toPercent(allJson, allCsvCompressSize)+"%)");
                        }
                    } catch(e) {
                        i -= size;
                        console.error(i + ': ' + e.message);
                    }
                }

                var readmeStr = 'TABLE_NAME' + (division == null ? '' : '|DIVISION') + '|TOTAL_COUNT|VERSION|DATE|FILE_COUNT|PART|SIZE\n' + args.table + '|' + (division == null ? '' : division.LINK + '|') + total + '|' + newVersion + '|' + new Date().toISOString() + '|' + fileCount + '|' + size;

                fs.writeFileSync(join(tableCompressDir, 'readme.txt'), readmeStr + '|' + allCsvCompressSize);
                fs.writeFileSync(join(tableCompressDir, 'md5.txt'), md5CsvCompressSize.join('\n'));

                if(csvZipItems[args.table] && csvZipItems[args.table].length > 0) {
                    var item = null;

                    if(division == null) {
                        item = csvZipItems[args.table][0];
                    } else {
                        item = csvZipItems[args.table].filter((i)=>{ return i.DIVISION == division.LINK.toString(); })[0];
                    }
                    
                    if(item.equal(md5CsvCompressSize)) {
                        console.log("remove because exists");
                        deleteFolderRecursive(tableCompressDir);
                    }
                }
            }
        }

        var versionFolder = join(dirCsvCompress, args.table, newVersion);
        var folders = fs.readdirSync(versionFolder);
        if(folders.length == 0) {
            console.log(versionFolder + " remove because empty");
            deleteFolderRecursive(versionFolder);
        }
    } catch(e) {
        console.error(e);
    }
})();


function toMb(num) {
    return (num / 1024 / 1024).toFixed(2);
}

function toPercent(i, j) {
    return (100 - ((j * 100) / i)).toFixed(2);
}

function deleteFolderRecursive(path) {
    var files = [];
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        files.forEach(function(file,index) {
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}