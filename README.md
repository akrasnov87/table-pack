### Описание

Информация о таблицах хранится в каталоге ``tables``. В каждом файле требуется описывать RPC запрос в формате JSON.  

```
node index url=http://localhost login=login password=password table=UI_SV_FIAS compress=ZIP output=c:\inetpub\wwwroot\repo\public
```

* url - адрес сервера
* login - логин
* password - пароль
* table - имя таблицы
* compress - способ сжатия
* start - чтение с указаного блока
* version - версия пакета
* output - выходной каталог, по умолчанию корневой приложения

#### readme.txt

* TABLE_NAME - имя таблицы
* TOTAL_COUNT - количество строк
* VERSION - версия пакета
* DATE - дата пакета
* FILE_COUNT - количество файлов
* PART - размер блока
* SIZE - размер данных в байтах

### Примеры

``UI_SV_FIAS``
```
node index url=http://demo.it-serv.ru/armnext/demo_kavkaz login=admin password=admin0 table=UI_SV_FIAS compress=ZIP
```

``ED_Device_Billing``
```
node index url=http://demo.it-serv.ru/armnext/demo_kavkaz login=admin password=admin0 table=ED_Device_Billing compress=ZIP
```

``ED_Network_Routes``
```
node index url=http://demo.it-serv.ru/armnext/demo_kavkaz login=admin password=admin0 table=ED_Network_Routes compress=ZIP
```

``ED_Registr_Pts``
```
node index url=http://demo.it-serv.ru/armnext/demo_kavkaz login=admin password=admin0 table=ED_Registr_Pts compress=ZIP
```