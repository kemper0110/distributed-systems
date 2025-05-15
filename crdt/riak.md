# Riak

В качестве примера рассмотрим CRDT в Riak:

Counter: PN-Counter
Set: OR-Set
Map: Update-wins Map of CRDTs
(Boolean) Flag: OR-Set где максимум 1 элемент
Register: пары (value, timestamp)