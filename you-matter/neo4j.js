const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver("bolt://137.117.33.210:7687/", neo4j.auth.basic("neo4j", "Neo4j_bd2_tpo"));

const session = driver.session();

module.exports = {
  session,
  driver,
  close: () => {
    session.close();
    driver.close();
  },
}
