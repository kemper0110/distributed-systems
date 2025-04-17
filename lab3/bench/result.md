# One Node (local read)

## PC Windows 11

|     scenario      | speed MB/s |
|:-----------------:|:----------:|
|  upload-block.sh  |    1312    |
| download-block.sh |    1156    |
|  upload-file.sh   |    1060    |
| download-file.sh  |    1660    |


# Two Nodes (local+remote read)

## PC Windows 11

|     scenario      | speed MB/s |
|:-----------------:|:----------:|
|  upload-file.sh   |    880     |
| download-file.sh  |    980     |

## Docker Windows 11

|     scenario      | speed MB/s |
|:-----------------:|:----------:|
|  upload-file.sh   |    880     |
| download-file.sh  |    980     |


# Two Nodes (local+remote read)

## PC Windows 11

|     scenario      | speed MB/s |
|:-----------------:|:----------:|
|  upload-block.sh  |    1156    |
| download-block.sh |    1312    |

## Docker Windows 11

|     scenario      | speed MB/s |
|:-----------------:|:----------:|
|  upload-block.sh  |     93     |
| download-block.sh |     65     |


# 4 Nodes

## Docker Windows 11

> Даже в докере перемотка видео назад работает с ощутимо меньшими задержками, чем просмотр через windows. 

|     scenario      | speed MB/s |
|:-----------------:|:----------:|
|  upload-block.sh  |     97     |
| download-block.sh |     65     |
