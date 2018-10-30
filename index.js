// Cargar modulos y crear nueva aplicacion
var express = require("express");
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // soporte para bodies codificados en jsonsupport
app.use(bodyParser.urlencoded({ extended: true })); // soporte para bodies codificados

const neo4j = require('neo4j-driver').v1;

var driver = neo4j.driver("http://34.229.68.4:34795/browser/", neo4j.auth.basic("neo4j", "videos-readiness-height"));
const session = driver.session();

const personName = 'Alice';
const resultPromise = session.run(
  'CREATE (a:Person {name: $name}) RETURN a',
  {name: personName}
);

//Ejemplo: GET http://localhost:8080/items
app.get('/items', function(req, res, next) {
  if(req.query.filter) {
   next();
   return;
  }
  resultPromise.then(result => {
    session.close();

    const singleRecord = result.records[0];
    const node = singleRecord.get(0);

    console.log(res.send(node.properties.name));

    // on application exit:
    driver.close();
  });
});

//Ejemplo: GET http://localhost:8080/items?filter=ABC
app.get('/items', function(req, res) {
  var filter = req.query.filter;
  res.send('Get filter ' + filter);
});

//Ejemplo: GET http://localhost:8080/items/10
app.get('/items/:id', function(req, res, next) {
  var itemId = req.params.id;
  res.send('Get ' + req.params.id);
});

//Ejemplo: POST http://localhost:8080/items
app.post('/items', function(req, res) {
   var data = req.body.data;
   res.send('Add ' + data);
});

//Ejemplo: PUT http://localhost:8080/items
app.put('/items', function(req, res) {
   var itemId = req.body.id;
   var data = req.body.data;
   res.send('Update ' + itemId + ' with ' + data);
});

//Ejemplo: DELETE http://localhost:8080/items
app.delete('/items/:id', function(req, res) {
   var itemId = req.params.id;
   res.send('Delete ' + itemId);
});

var server = app.listen(8080, function () {
    console.log('Server is running..');
});

