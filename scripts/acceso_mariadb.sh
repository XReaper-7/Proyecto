#!/bin/bash
echo "Introduce la contraseña para mariadb: "
kubectl run client -it --rm --tty --image=mariadb:latest -- \
mariadb -h mariadb-service -u root -p
