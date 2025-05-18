-[x] добавить эндпоинт successor(k)

> Реализовать без finger table,
далее добавлю его отдельно, если успею.

-[x] Реализовать проверку q = q.successor.predecessor
Каждую секунду (конфигурируемо)


# Для подключения

1. Имеем ментора в конфиге
2. Вычисляем хеш от себя и спрашиваем у ментора succ(selfNode.hash), получая n.successor, устанавливаем его
3. selfNode выполняет stabilize: get(n.successor, /predecessor).
4. selfNode просит n.successor обновить n.successor.predecessor = selfNode

У ментора запрашиваем succ(SelfNode) 
context.successor = succ(SelfNode)

# TODO

-[x] Заменить state.successor.url на правильные ссылки
-[x] Заменить коды content-length на 411
-[x] predecessor может быть null
-[x] проверить логику поиска successor
-[x] Срезать лишние тесты, оставить только для join + stabilize
-[x] Сравнение строк это беда! Заменить на bigint
-[x] Тестирование bootstrap + stabilize на 2 узлах