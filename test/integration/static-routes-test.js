var assert = require('assert');
const express = require("express");

const { isomorphicRoutes } = require("../../server/routes");
const supertest = require("supertest");

function getClientStub(hostname) {
  return {
    getHostname: () => "demo.quintype.io",
    getConfig: () => Promise.resolve({foo: "bar"})
  }
}

function createApp(loadData, staticRoutes, opts = {}) {
  const app = express();
  isomorphicRoutes(app, Object.assign({
    assetHelper: {assetHash: (file) => file == "app.js" ? "abcdef" : null},
    getClient: getClientStub,
    staticRoutes: staticRoutes,
    generateRoutes: () => [],
    loadData: loadData,
    appVersion: 42
  }, opts));

  return app;
}

describe('Static Routes', function() {
  it("Loads the data for the static route", function(done) {
    const app = createApp((pageType, params, config, client) => Promise.resolve({data: {pageType, params}}), [{path: "/about-us", pageType: 'about-us', renderParams: {contentTemplate: "./about-us"}}]);

    supertest(app)
      .get("/route-data.json?path=%2Fabout-us")
      .expect("Content-Type", /json/)
      .expect(200)
      .then(res => {
        const response = JSON.parse(res.text);
        assert.equal("about-us", response.data.pageType);
        assert.equal(true, response.disableIsomorphicComponent);
      }).then(done);
  });
});