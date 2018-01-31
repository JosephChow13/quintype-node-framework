var assert = require('assert');

const { registerServiceWorker, setupServiceWorkerUpdates, checkForServiceWorkerUpdates } = require("../../client/impl/load-service-worker")
const { createQtStore } = require("../../store/create-store")

function syncPromise(value) {
  return {
    then: f => f(value)
  }
}

const NAVIGATOR_STUB = {
  serviceWorker: {
    register(location) {
      var updateCount = 0;

      return Promise.resolve({
        location: location,
        update: () => {updateCount = updateCount + 1; return syncPromise(null)},
        getUpdateCount: () => updateCount,
      })
    }
  }
}

describe('LoadServiceWorker', function() {
  describe('registerServiceWorker', function() {
    it("registers a service worker", function(done) {
      registerServiceWorker({enableServiceWorker: true, navigator: NAVIGATOR_STUB})
        .then(worker => assert.equal("/service-worker.js", worker.location))
        .then(done);
    });

    it("does not register a service worker if enableServiceWorker is false", function(done) {
      registerServiceWorker({enableServiceWorker: false})
        .then(worker => assert.equal(null, worker))
        .then(done);
    });

    it("does not register a service worker if serviceworker is not supported", function(done) {
      registerServiceWorker({enableServiceWorker: true, navigator: {}})
        .then(worker => assert.equal(null, worker))
        .then(done);
    });
  });


  describe("updating ServiceWorker", function() {
    it("updates the service worker if the page's appVersion is more than the app's version", function(done) {
      const serviceWorkerPromise = registerServiceWorker({enableServiceWorker: true, navigator: NAVIGATOR_STUB});
      const store = createQtStore({}, {}, {location: {pathname: "/"}});
      setupServiceWorkerUpdates(serviceWorkerPromise, {getAppVersion: () => 1}, store, {pageType: "home-page", appVersion: 2})
        .then((registration) => {
          assert.equal(true, store.getState().serviceWorkerStatus.updated);
          assert.equal(1, registration.getUpdateCount());
        })
        .then(done);
    });

    it("doesn't update the service worker if the page's app version and the main app version are the same", function(done) {
      const serviceWorkerPromise = registerServiceWorker({enableServiceWorker: true, navigator: NAVIGATOR_STUB});
      const store = createQtStore({}, {}, {location: {pathname: "/"}});
      setupServiceWorkerUpdates(serviceWorkerPromise, {getAppVersion: () => 2}, store, {pageType: "home-page", appVersion: 2})
        .then((registration) => {
          assert.equal(false, store.getState().serviceWorkerStatus.updated);
          assert.equal(0, registration.getUpdateCount());
        })
        .then(done);
    });

    it("does nothing if the service worker promise is null", function(done) {
      const store = createQtStore({}, {}, {location: {pathname: "/"}});
      setupServiceWorkerUpdates(null, {getAppVersion: () => 2}, store, {pageType: "home-page", appVersion: 2})
        .then((registration) => {
          assert.equal(false, store.getState().serviceWorkerStatus.updated);
        })
        .then(done);
    });

    it("does nothing if the service worker promise resolves to null", function(done) {
      const store = createQtStore({}, {}, {location: {pathname: "/"}});
      setupServiceWorkerUpdates(Promise.resolve(null), {getAppVersion: () => 2}, store, {pageType: "home-page", appVersion: 2})
        .then((registration) => {
          assert.equal(false, store.getState().serviceWorkerStatus.updated);
        })
        .then(done);
    });

    it("does nothing if the service worker promise has no update", function(done) {
      const store = createQtStore({}, {}, {location: {pathname: "/"}});
      setupServiceWorkerUpdates(Promise.resolve({}), {getAppVersion: () => 2}, store, {pageType: "home-page", appVersion: 2})
        .then((registration) => {
          assert.equal(false, store.getState().serviceWorkerStatus.updated);
        })
        .then(done);
    });

    it("updates if a later page has a higher version", function(done) {
      const serviceWorkerPromise = registerServiceWorker({enableServiceWorker: true, navigator: NAVIGATOR_STUB});
      const store = createQtStore({}, {}, {location: {pathname: "/"}});
      const app = {getAppVersion: () => 1};
      setupServiceWorkerUpdates(serviceWorkerPromise, app, store, {pageType: "home-page", appVersion: 1})
        .then((registration) => {
          assert.equal(false, store.getState().serviceWorkerStatus.updated);
          assert.equal(0, registration.getUpdateCount());
          checkForServiceWorkerUpdates(app, {pageType: "home-page", appVersion: 2});
          assert.equal(true, store.getState().serviceWorkerStatus.updated);
          assert.equal(1, registration.getUpdateCount());
        })
        .then(done);
    });
  });
});
