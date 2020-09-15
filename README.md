### Описание

```
node index url=http://localhost login=login password=password table=UI_SV_FIAS size=10000 sort=C_Full_Address compress=ZIP output=c:\inetpub\wwwroot\repo\public
```

* url - адрес сервера
* login - логин
* password - пароль
* table - имя таблицы
* size - размер блока
* sort - поле для сотрировки
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
node index url=http://demo.it-serv.ru/armnext/demo_kavkaz login=admin password=admin0 table=UI_SV_FIAS size=10000 sort="C_Full_Address,LINK" compress=ZIP select="LINK,C_Full_Address,C_House_Number,F_Structure,F_Municipality,F_Town"
```

``ED_Device_Billing``
```
node index url=http://demo.it-serv.ru/armnext/demo_kavkaz login=admin password=admin0 table=ED_Device_Billing size=10000 compress=ZIP disabled=0 sort="LINK,F_Registr_Pts___LINK" select="LINK,F_Registr_Pts___LINK,C_Serial_Number,B_EE"
```

``ED_Network_Routes``
```
node index url=http://demo.it-serv.ru/armnext/demo_kavkaz login=admin password=admin0 table=ED_Network_Routes size=10000 compress=ZIP sort="LINK,F_Parent" select="LINK,F_Parent,C_Network_Path,F_Prev_Item_Types"
```

``ED_Registr_Pts``
```
node index url=http://demo.it-serv.ru/armnext/demo_kavkaz login=admin password=admin0 table=ED_Registr_Pts size=10000 disabled=0 compress=ZIP sort="LINK,C_Name" select="LINK,C_Name,N_Code,B_EE"
```