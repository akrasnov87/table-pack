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

// выполняем оценку загрузки
(async function() {
    try {
        //var dir = join(args.output || __dirname, 'json');
        //var dirJson = join(args.output || __dirname, 'json-zip');

        //var dirCsv = join(args.output || __dirname, 'csv');
        var dirCsvCompress = join(args.output || __dirname, 'csv-zip');

        var items = [{ "action": "Domain." + args.table, "method": "Query", "data": [{"limit": 1, "forceLimit": true}], "type": "rpc", "tid": 0 }];
        if(args.sort) {
            var data = args.sort.split(',');
            var sorters = [];
            data.forEach(item => {
                sorters.push({property: item, direction: "ASC"});
            });
            items[0].data[0].sort = sorters;
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

            if(!fs.existsSync(dirCsvCompress)) {
                mkdir.mkdirSync(dirCsvCompress);
            }

            var tableCompressDir = join(dirCsvCompress, args.table, newVersion);


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

            var md5CsvCompressSize = [];

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

            var readmeStr = 'TABLE_NAME|TOTAL_COUNT|VERSION|DATE|FILE_COUNT|PART|SIZE|MD5\n' + args.table + '|' + total + '|' + newVersion + '|' + new Date().toISOString() + '|' + fileCount + '|' + args.size;

            fs.writeFileSync(join(tableCompressDir, 'readme.txt'), readmeStr + '|' + allCsvCompressSize + '|' + md5(md5CsvCompressSize));
            fs.writeFileSync(join(tableCompressDir, 'md5.txt'), md5CsvCompressSize.join('\n'));
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