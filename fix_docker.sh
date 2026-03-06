#!/bin/bash
set -e
systemctl stop docker || true
rsync -a /var/lib/docker/ /home/docker-data/ --exclude overlay2/*/.mergerd --exclude overlay2/*/.tmp
mv /var/lib/docker /var/lib/docker.old
ln -s /home/docker-data /var/lib/docker
systemctl start docker
rm -rf /var/lib/docker.old
df -h /var
systemctl restart nginx postgresql gunicorn || true
echo "SUCCESS"
