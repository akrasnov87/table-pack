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

// выполняем оценку загрузки
(async function() {
    try {
        var dir = join(args.output || __dirname, 'json');
        var dirJson = join(args.output || __dirname, 'json-zip');

        var dirCsv = join(args.output || __dirname, 'csv');
        var dirCsvCompress = join(args.output || __dirname, 'csv-zip');

        var items = [{ "action": "Domain." + args.table, "method": "Query", "data": [{"limit": 1, "forceLimit": true}], "type": "rpc", "tid": 0 }];
        if(args.sort) {
            items[0].data[0].sort = [{property: args.sort, direction: "ASC"}];
        }

        if(args.select) {
            items[0].data[0].select = args.select;
        }

        if(args.disabled) {
            items[0].data[0].filter = [{ property: "B_Disabled", value: args.disabled }];
        }
        
        var authResult = await rpc.auth(args.url, args.login, args.password);
        var results = await rpc.request(args.url, authResult.token, items);
        if(!Array.isArray(results)) {
            console.error(results.details);
        } else {
            var birthday = pkg.birthday;
            var version = pkg.version.split('.');
            var newVersion = args.version || version[0] + '.' + Math.floor(Math.abs(new Date().getTime() - new Date(birthday).getTime()) / (1000 * 3600 * 24)) + '.'
                                                  + ((new Date().getHours() * 60) + new Date().getMinutes());
                                                  
            var total = results[0].result.total;
            console.log(total);

            if(!fs.existsSync(dir)) {
                mkdir.mkdirSync(dir);
            }

            if(!fs.existsSync(dirJson)) {
                mkdir.mkdirSync(dirJson);
            }

            if(!fs.existsSync(dirCsv)) {
                mkdir.mkdirSync(dirCsv);
            }

            if(!fs.existsSync(dirCsvCompress)) {
                mkdir.mkdirSync(dirCsvCompress);
            }

            var tableDir = join(dir, args.table, newVersion);
            var tableJsonDir = join(dirJson, args.table, newVersion);
            var tableCsvDir = join(dirCsv, args.table, newVersion);
            var tableCompressDir = join(dirCsvCompress, args.table, newVersion);

            if(!fs.existsSync(tableDir)) {
                mkdir.mkdirSync(tableDir);
            }

            if(!fs.existsSync(tableJsonDir)) {
                mkdir.mkdirSync(tableJsonDir);
            }

            if(!fs.existsSync(tableCsvDir)) {
                mkdir.mkdirSync(tableCsvDir);
            }

            if(!fs.existsSync(tableCompressDir)) {
                mkdir.mkdirSync(tableCompressDir);
            }

            var size = args.size;

            var record = results[0].result.records[0];
            var headers = [];
            if(args.select) {
                headers = args.select.split(',');
            } else {
                for(var i in record) {
                    headers.push(i);
                }
            }
            var rows = [headers.join('|')];

            var allJson = 0;
            var allJsonCompress = 0;
            var allCsv = 0;
            var allCsvCompressSize = 0;
            var fileCount = 0;
            var start = args.start || 0;

            for(var i = start; i < total; i += size) {
                try {
                    var item = items[0];
                    item.data[0].limit = size;
                    item.data[0].start = i;
                    
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
                                
                                if(line.toString().indexOf('|') >= 0) {
                                    line = line.replace(/|/gi, '/');
                                }
                                inner.push(line);
                            }
                            rows.push(inner.join('|'));
                            inner = [];
                        }
                        var fileName = i + '-' + (i+size);

                        var jsonStr = JSON.stringify(records);
                        var buffer = Buffer.from(jsonStr,'utf8');
                        fs.writeFileSync(join(tableDir, fileName + '.json'), buffer);
                        allJson+=buffer.byteLength;

                        var bufferJsonCompress = compress.encode(fileName, buffer, args.compress);
                        fs.writeFileSync(join(tableJsonDir, fileName + '.zip'), bufferJsonCompress);
                        allJsonCompress+=bufferJsonCompress.byteLength;

                        var rowsStr = rows.join('\n');
                        var bufferCsv = Buffer.from(rowsStr,'utf8');
                        fs.writeFileSync(join(tableCsvDir, fileName + '.csv'), bufferCsv);
                        allCsv += bufferCsv.byteLength;

                        var bufferCsvCompress = compress.encode(fileName, bufferCsv, args.compress);
                        allCsvCompressSize += bufferCsvCompress.byteLength;
                        fs.writeFileSync(join(tableCompressDir, fileName + '.zip'), bufferCsvCompress);
                        fileCount++;

                        rows = [headers.join('|')]
                        console.log(i + '/' + total + " | " + toMb(allJson) + "; " + toMb(allJsonCompress) + "(" + toPercent(allJson, allJsonCompress) + "%)" + "; " + toMb(allCsv) + "("+toPercent(allJson, allCsv)+"%)" + "; " + toMb(allCsvCompressSize) + "("+ toPercent(allJsonCompress, allCsvCompressSize) + " - " + toPercent(allCsv, allCsvCompressSize) + " - " + toPercent(allJson, allCsvCompressSize)+"%)");
                    }
                } catch(e) {
                    i -= size;
                    console.error(i + ': ' + e.message);
                }
            }

            var readmeStr = 'TABLE_NAME|TOTAL_COUNT|VERSION|DATE|FILE_COUNT|PART|SIZE\n' + args.table + '|' + total + '|' + newVersion + '|' + new Date().toISOString() + '|' + fileCount + '|' + args.size;

            fs.writeFileSync(join(tableDir, 'readme.txt'), readmeStr + '|' + allJson);
            fs.writeFileSync(join(tableJsonDir, 'readme.txt'), readmeStr + '|' + allJsonCompress);
            fs.writeFileSync(join(tableCsvDir, 'readme.txt'), readmeStr + '|' + allCsv);
            fs.writeFileSync(join(tableCompressDir, 'readme.txt'), readmeStr + '|' + allCsvCompressSize);
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