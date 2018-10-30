require('file?name=[name].[ext]!../node_modules/neo4j-driver/lib/browser/neo4j-web.min.js');
var Movie = require('./models/Movie');
var MovieCast = require('./models/MovieCast');
var _ = require('lodash');

var neo4j = window.neo4j.v1;
var driver = neo4j.driver("http://34.229.68.4:34795/browser/", neo4j.auth.basic("neo4j", "videos-readiness-height"));

function searchMovies(queryString) {
  var session = driver.session();
  return session
    .run(
      'MATCH (movie:Movie) \
      WHERE movie.title =~ {title} \
      RETURN movie',
      {title: '(?i).*' + queryString + '.*'}
    )
    .then(result => {
      session.close();
      return result.records.map(record => {
        return new Movie(record.get('movie'));
      });
    })
    .catch(error => {
      session.close();
      throw error;
    });
}

function getMovie(title) {
  var session = driver.session();
  return session
    .run(
      "MATCH (movie:Movie {title:{title}}) \
      OPTIONAL MATCH (movie)<-[r]-(person:Person) \
      RETURN movie.title AS title, \
      collect([person.name, \
           head(split(lower(type(r)), '_')), r.roles]) AS cast \
      LIMIT 1", {title})
    .then(result => {
      session.close();

      if (_.isEmpty(result.records))
        return null;

      var record = result.records[0];
      return new MovieCast(record.get('title'), record.get('cast'));
    })
    .catch(error => {
      session.close();
      throw error;
    });
}

function getGraph() {
  var session = driver.session();
  return session.run(
    'MATCH (m:Movie)<-[:ACTED_IN]-(a:Person) \
    RETURN m.title AS movie, collect(a.name) AS cast \
    LIMIT {limit}', {limit: 100})
    .then(results => {
      session.close();
      var nodes = [], rels = [], i = 0;
      results.records.forEach(res => {
        nodes.push({title: res.get('movie'), label: 'movie'});
        var target = i;
        i++;

        res.get('cast').forEach(name => {
          var actor = {title: name, label: 'actor'};
          var source = _.findIndex(nodes, actor);
          if (source == -1) {
            nodes.push(actor);
            source = i;
            i++;
          }
          rels.push({source, target})
        })
      });

      return {nodes, links: rels};
    });
}

exports.searchMovies = searchMovies;
exports.getMovie = getMovie;
exports.getGraph = getGraph;

function createUser(queryString) {
  var session = driver.session();
  return session
    .run(
      'MATCH (movie:Movie) \
      WHERE movie.title =~ {title} \
      RETURN movie',
      {title: '(?i).*' + queryString + '.*'}
    )
    .then(result => {
      session.close();
      return result.records.map(record => {
        return new Movie(record.get('movie'));
      });
    })
    .catch(error => {
      session.close();
      throw error;
    });
}

exports.CreateUser = function(username, name, surname, email, password, result, callback) {
  queryDB(
      "MERGE (user : User {username : {uname}, name: {uFirstname}, lastName: {usurname}, email : {uemail}, password : {uhash} }) " +
      "ON MERGE RETURN TRUE", // return true if user already exists
      {
        uname: username,
        uFirstname: name,
        usurname: surname,
        uemail: email,
        uhash: password
      },
      result,
      callback);
};

exports.CreateComment = function(username, rantId, commentText, result, callback) {
  // Fetch comment count
  var commentCount = 0;
  queryDB(
      "OPTIONAL MATCH (r : Rant {id : {rid} })" +
      "-[c : HAS_COMMENT]->" +
      "(:Comment) RETURN count(c) AS count", {
          rid: rantId
      },
      function(res) {
          commentCount = res[0].get("count").toString(); // fetch current rant count

          // Inject main function
          queryDB(
              "MATCH (user : User {username: {uname} }) " +
              "MATCH (rant : Rant {id : {rid} })" +
              "CREATE (com : Comment {id : {cid}, text : {cText} })" +
              "CREATE (rant)-[:HAS_COMMENT {on: {time} }]->(com)" +
              "CREATE (user)-[:COMMENTED]->(com)", {
                  uname: username,
                  rid: rantId,
                  cid: "c" + ++commentCount,
                  cText: commentText,
                  time: Date.now()
              },
              result,
              callback);

      },
      function(err) {
          console.error(err.message);
      });
};