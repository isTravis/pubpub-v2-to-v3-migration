```
mkdir backup
cd backup
mongodump -h ds045121-a0.mongolab.com:45121 -d pubpub_v2_production -u <user> -p <password>
mongorestore
mongod

cd ~migration
npm start
```

You will likely have to increase the number of files Node is allowed to have open to facilitate the docJSON file writes:
```
sudo launchctl limit maxfiles 524288 524288 && ulimit -n 524288
```