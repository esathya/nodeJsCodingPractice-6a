const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running At http://localhost:3000");
    });
  } catch (error) {
    console.log(`DB Error:${error.message}`);
  }
};

initializeDBAndServer();

const convertStateArrayObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

// API 1 Returns a list of all states in the state table

app.get("/states/", async (Request, Response) => {
  const getListOfStateQuery = `
    SELECT * FROM state;`;
  const statesArray = await db.all(getListOfStateQuery);
  Response.send(statesArray.map((each) => convertStateArrayObject(each)));
});

// API 2 Returns a state based on the state ID

app.get("/states/:stateId/", async (Request, Response) => {
  const { stateId } = Request.params;
  const getstateQuery = `
  SELECT * FROM state
  WHERE state_id = '${stateId}';`;
  const state = await db.get(getstateQuery);
  Response.send(convertStateArrayObject(state));
});

//API 3 Create a district in the district table, `district_id` is auto-incremented

app.post("/districts/", async (Request, Response) => {
  const districtDetails = Request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictQuery = `
    INSERT INTO
    district(district_name,state_id,cases,cured,active,deaths)
    VALUES(
      '${districtName}',
      '${stateId}',
      '${cases}',
      '${cured}',
      '${active}',
      '${deaths}');`;
  await db.run(addDistrictQuery);
  Response.send("District Successfully Added");
});

//API 4 Returns a district based on the district ID

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
  SELECT * FROM district WHERE district_id = ${districtId};`;
  const district = await db.get(getDistrictQuery);
  response.send(convertDistrictObject(district));
});

//API 5 Deletes a district from the district table based on the district ID

app.delete("/districts/:districtId/", async (Request, Response) => {
  const { districtId } = Request.params;
  const deleteDistrictQuery = `
    DELETE FROM district
    WHERE district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  Response.send("District Removed");
});

// API 6 Updates the details of a specific district based on the district ID

app.put("/districts/:districtId/", async (Request, Response) => {
  const { districtId } = Request.params;
  const districtDetails = Request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateQuery = `
  UPDATE district
  SET
    district_name = '${districtName}',
    state_id = '${stateId}',
    cases = '${cases}',
    cured = '${cured}',
    active = '${active}',
    deaths = '${deaths}'
  WHERE district_id = ${districtId};`;
  await db.run(updateQuery);
  Response.send("District Details Updated");
});

// API 7 Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID

app.get("/states/:stateId/stats/", async (Request, Response) => {
  const { stateId } = Request.params;
  const getTotalActiveCaseAndDeaths = `
    SELECT
        SUM(cases),
        SUM(cured),
        SUM(active),
        SUM(deaths)
    FROM
        district
    WHERE 
        state_id = ${stateId};`;

  const state = await db.get(getTotalActiveCaseAndDeaths);
  Response.send({
    totalCases: state["SUM(cases)"],
    totalCured: state["SUM(cured)"],
    totalActive: state["SUM(active)"],
    totalDeaths: state["SUM(deaths)"],
  });
});

// API 8 Returns an object containing the state name of a district based on the district ID

app.get("/districts/:districtId/details/", async (Request, Response) => {
  const { districtId } = Request.params;
  const getDistrictIdQuery = `
    SELECT
        state_name AS stateName
    FROM
        district INNER JOIN state ON district.state_id = state.state_id
    WHERE
        district_id = ${districtId};`;
  const getStateName = await db.get(getDistrictIdQuery);
  Response.send(getStateName);

  //const getStateNameQuery = `
  //SELECT state_name AS stateName FROM state
  //WHERE state_id = ${getDistrictIdQueryResponse.state_id}`;
  //const getStateNameQueryResponse = await db.get(getStateNameQuery);
  //Response.send(getDistrictIdQueryResponse);
});

module.exports = app;
