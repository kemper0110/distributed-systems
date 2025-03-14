# РАЗРАБОТКА ЦЕНТРАЛИЗОВАННОЙ РАСПРЕДЕЛЕННОЙ СИСТЕМЫ ХРАНЕНИЯ ИНФОРМАЦИИ

- сохранение файла с именем;
- получение файла по имени или любой его последовательности состоящей из подряд идущих блоков;
- проверка наличия файла по имени;
- удаление файла по имени

На нейм-ноде хранятся имена файлов и расположение блоков.
На дата-нодах хранятся сами блоки с данными. Блок 1 МБ и более. Блоки пишутся на диск, как обычные файлы. 
При загрузке файла нейм-нода распределяет входной файл блоками на множество дата-нод. 
При скачивании нейм-нода качает с каждой ноды по блоку и возвращает целостный файл. 
1 запрос = 1 блок, но на дата-ноду может быть много запросов.

> **Важное замечание !!**
> 
> Нейм-нода почти не хавает память!
> Все потому, что при загрузке и скачивании файлов, нейм-нода не собирает весь файл в память.
> Более того, в памяти не собирается даже ни один целый блок. 
> Максимум накапливается до двух node:stream чанков (~32-64 КБ), не более.

GET запрос на файл поддерживает Range запросы.
Можно смотреть кино в браузере из любого места в видео.



# ССЫЛОЧКИ

Лишь некоторые ссылки, использованные для разработки проекта. Схавано намного больше.

http
https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Ranges
https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range
https://http.dev/range-request
https://http.dev/accept-ranges
https://http.dev/range

node js
https://nodejs.org/en/learn/modules/how-to-use-streams#stream-types
https://nodejs.org/en/learn/modules/anatomy-of-an-http-transaction
https://dev.to/bsorrentino/how-to-stream-data-over-http-using-node-and-fetch-api-4ij2
https://betterstack.com/community/guides/scaling-nodejs/nodejs-streams-vs-web-streams-api/#transitioning-from-node-js-streams-to-web-streams

web streams
https://developer.mozilla.org/en-US/docs/Web/API/Streams_API

docker
https://docs.docker.com/reference/api/engine/version/v1.48/#tag/System/operation/SystemEvents

fastify ~ удалил из проекта ибо лишь мешает
https://fastify.dev/docs/latest/Reference/Routes/#url-building
https://backend.cafe/how-to-implement-video-streaming-with-fastify
