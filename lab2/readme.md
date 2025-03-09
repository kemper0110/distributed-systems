# РАЗРАБОТКА ЦЕНТРАЛИЗОВАННОЙ РАСПРЕДЕЛЕННОЙ СИСТЕМЫ ХРАНЕНИЯ ИНФОРМАЦИИ

- сохранение файла с именем;
- получение файла по имени или любой его последовательности состоящей из подряд идущих блоков;
- замена любого блока файла на новый;
[x] проверка наличия файла по имени;
- удаление файла по имени

Помоги спроектировать такую же систему хранения данных.
На мастер ноде будут храниться имена файлов и расположение блоков.
На дата нодах будут храниться сами блоки с данными. Блок я хочу сделать фиксированным 1 МБ. 
Хотелось бы добавить репликацию на несколько дата нод.
Как распределять блоки по дата нодам? Какую систему хранения использовать? Реляционную базу данных? Напрямую на диск
писать сложно.

Сделать http api для получения файлов.
Поддержать Range запросы для просмотра середины видео.

стримим блоки в ответе
HTTP GET /file/path/to/file/video.mp4



# ССЫЛОЧКИ

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

fastify
https://fastify.dev/docs/latest/Reference/Routes/#url-building
https://backend.cafe/how-to-implement-video-streaming-with-fastify
