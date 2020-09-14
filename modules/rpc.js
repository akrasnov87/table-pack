var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var util = require('util');
var path = require('path');
var join = path.join;
var json = require('json-parser');

exports.request = async function(baseUrl, token, items) {
    return await new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', baseUrl + '/rpc?token=' + token, true);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    var requestData = json.parse(xhr.responseText);
                    resolve(requestData);
                } else {
                    reject(new Error(xhr.responseText));
                }
            }
        };
        xhr.send(JSON.stringify(items));
    });
}

exports.auth = async function(baseUrl, login, password) {
    return await new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', baseUrl + '/auth?login=' + login + "&password=" + password, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    var requestData = json.parse(xhr.responseText);
                    resolve(requestData);
                } else {
                    reject(new Error(xhr.responseText));
                }
            }
        };
        xhr.send();
    });  
}