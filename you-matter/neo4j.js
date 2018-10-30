const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver("bolt://18.206.232.226:32979/", neo4j.auth.basic("neo4j", "donor-elections-jets"));

const session = driver.session();
module.exports = {
  session,
  driver,
  close: () => {
    session.close();
    driver.close();
  },
}
