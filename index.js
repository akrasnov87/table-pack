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
        var dir = join(__dirname, 'data');
        var dirCompress = join(__dirname, 'archive');

        var items = [{ "action": "Domain." + args.table, "method": "Query", "data": [{"limit": 1, "forceLimit": true}], "type": "rpc", "tid": 0 }];
        if(args.sort) {
            items[0].data[0].sort = [{property: args.sort, direction: "ASC"}];
        }
        
        var authResult = await rpc.auth(args.url, args.login, args.password);
        var results = await rpc.request(args.url, authResult.token, items);
        if(!Array.isArray(results)) {
            console.error(results.details);
        } else {
            var birthday = pkg.birthday;
            var version = pkg.version.split('.');
            var newVersion = version[0] + '.' + Math.floor(Math.abs(new Date().getTime() - new Date(birthday).getTime()) / (1000 * 3600 * 24)) + '.'
                                                  + ((new Date().getHours() * 60) + new Date().getMinutes());
                                                  
            var total = results[0].result.total;
            console.log(total);

            if(!fs.existsSync(dir)) {
                mkdir.mkdirSync(dir);
            }

            if(!fs.existsSync(dirCompress)) {
                mkdir.mkdirSync(dirCompress);
            }

            var tableDir = join(dir, args.table, newVersion);
            var tableCompressDir = join(dirCompress, args.table, newVersion);

            if(!fs.existsSync(tableDir)) {
                mkdir.mkdirSync(tableDir);
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
            var allCompressSize = 0;
            var fileCount = 0;

            for(var i = 0; i < total; i+=size) {
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
                    fs.writeFileSync(join(tableDir, fileName), rows.join('\n'));
                    var buffer = Buffer.from(rows.join('\n'),'utf8');
                    allSize += buffer.byteLength;
                    var bufferCompress = compress.encode(fileName, buffer, args.compress);
                    allSize += bufferCompress.byteLength;
                    fs.writeFileSync(join(tableCompressDir, fileName + '.zip'), bufferCompress);
                    fileCount++;
                    rows = [headers.join('|')]
                    console.log(i + '/' + total);
                }
            }

            var readmeStr = 'TABLE_NAME|TOTAL_COUNT|VERSION|DATE|FILE_COUNT|PART|SIZE\n' + args.table + '|' + total + '|' + newVersion + '|' + new Date().toISOString() + '|' + args.size + '|' + fileCount;

            fs.writeFileSync(join(tableDir, 'readme.txt'), readmeStr + '|' + allSize);
            fs.writeFileSync(join(tableCompressDir, 'readme.txt'), readmeStr + '|' + allCompressSize);
        }
    } catch(e) {
        console.error(e);
    }
})();
