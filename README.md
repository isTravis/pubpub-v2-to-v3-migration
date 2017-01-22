```
mkdir backup
cd backup
mongodump -h ds045121-a0.mongolab.com:45121 -d pubpub_v2_production -u <user> -p <password>
mongorestore
mongod

cd ~migration
npm start
```