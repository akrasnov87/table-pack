/**
 * @file modules/rpc.js
 * @project table-pack
 * @author Aleksandr Krasnov
 */

var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var json = require('json-parser');

/**
 * выполнение RPC запросов
 * @param {*} baseUrl адрес скрвера
 * @param {*} token токен
 * @param {*} items rpc объект
 */
exports.request = async function(baseUrl, token, items) {
    return await new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', baseUrl + '/rpc?token=' + encodeURIComponent(token), true);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    try {
                        var requestData = json.parse(xhr.responseText);
                        resolve(requestData);
                    } catch(e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(xhr.responseText));
                }
            }
        };
        xhr.send(JSON.stringify(items));
    });
}

/**
 * Авторизация
 * @param {*} baseUrl адрес сервера
 * @param {*} login логин
 * @param {*} password пароль
 */
exports.auth = async function(baseUrl, login, password) {
    return await new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        
        xhr.open('GET', baseUrl + '/auth?login=' + login + "&password=" + password, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    var requestData = json.parse(xhr.responseText);
                    console.log(requestData.token);
                    resolve(requestData);
                } else {
                    reject(new Error(xhr.responseText));
                }
            }
        };
        xhr.send();
    });  
}