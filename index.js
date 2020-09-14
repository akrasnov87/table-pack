var rpc = require('./modules/rpc')
var args = require("args-parser")(process.argv);
var fs = require('fs');
var join = require('path').join;
var mkdir = require('mkdir-recursive');
var compress = require('./modules/zip');
var pkg = require('./package.json');
const { resolve4 } = require('dns');

// выполняем оценку загрузки
(async function() {
    try {
        var dir = join(__dirname, 'json');
        var dirCsv = join(__dirname, 'csv');
        var dirCompress = join(__dirname, 'zip');

        var items = [{ "action": "Domain." + args.table, "method": "Query", "data": [{"limit": 1, "forceLimit": true}], "type": "rpc", "tid": 0 }];
        if(args.sort) {
            items[0].data[0].sort = [{property: args.sort, direction: "ASC"}];
        }
        
        var authResult = await rpc.auth(args.url, args.login, args.password);
        await timeout();
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

            if(!fs.existsSync(dirCsv)) {
                mkdir.mkdirSync(dirCsv);
            }

            if(!fs.existsSync(dirCompress)) {
                mkdir.mkdirSync(dirCompress);
            }

            var tableDir = join(dir, args.table, newVersion);
            var tableCsvDir = join(dirCsv, args.table, newVersion);
            var tableCompressDir = join(dirCompress, args.table, newVersion);

            if(!fs.existsSync(tableDir)) {
                mkdir.mkdirSync(tableDir);
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
            for(var i in record) {
                headers.push(i);
            }
            var rows = [headers.join('|')];

            var allSize = 0;
            var allCsvSize = 0;
            var allCsvCompressSize = 0;
            var fileCount = 0;
            var start = args.start || 0;

            for(var i = start; i < total; i+=size) {
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
                                
                                if(line.indexOf('|') >= 0) {
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
                        allSize+=buffer.byteLength;

                        var rowsStr = rows.join('\n');
                        var bufferCsv = Buffer.from(rowsStr,'utf8');
                        fs.writeFileSync(join(tableCsvDir, fileName + '.csv'), bufferCsv);
                        allCsvSize += bufferCsv.byteLength;

                        var bufferCsvCompress = compress.encode(fileName, bufferCsv, args.compress);
                        allCsvCompressSize += bufferCsvCompress.byteLength;
                        fs.writeFileSync(join(tableCompressDir, fileName + '.zip'), bufferCsvCompress);
                        fileCount++;

                        rows = [headers.join('|')]
                        console.log(i + '/' + total + " | " + toMb(allSize) + ";" + toMb(allCsvSize) + "("+toPercent(allSize, allCsvSize)+"%)" + ";" + toMb(allCsvCompressSize) + "("+toPercent(allCsvSize, allCsvCompressSize) + " - " + toPercent(allSize, allCsvCompressSize)+"%)");
                    }
                } catch(e) {
                    i -= size;
                    console.error(i + ': ' + e.message);
                }
            }

            var readmeStr = 'TABLE_NAME|TOTAL_COUNT|VERSION|DATE|FILE_COUNT|PART|SIZE\n' + args.table + '|' + total + '|' + newVersion + '|' + new Date().toISOString() + '|' + fileCount + '|' + args.size;

            fs.writeFileSync(join(tableDir, 'readme.txt'), readmeStr + '|' + allSize);
            fs.writeFileSync(join(tableCsvDir, 'readme.txt'), readmeStr + '|' + allCsvSize);
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

async function timeout() {
    return await new Promise((resolve, reject) => {
        setTimeout(function() {
            resolve();
        }, 1000);
    });
}