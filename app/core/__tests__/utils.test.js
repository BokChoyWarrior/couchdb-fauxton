// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy of
// the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations under
// the License.

import utils from "../utils";

describe('Utils', () => {

  describe('getDocTypeFromId', () => {

    it('returns doc if id not given', () => {
      const res = utils.getDocTypeFromId();
      expect(res).toBe('doc');
    });

    it('returns design doc for design docs', () => {
      const res = utils.getDocTypeFromId('_design/foobar');
      expect(res).toBe('design doc');
    });

    it('returns doc for all others', () => {
      const res = utils.getDocTypeFromId('blerg');
      expect(res).toBe('doc');
    });
  });

  describe('getSafeIdForDoc', () => {

    it('keeps _design/ intact', () => {
      const res = utils.getSafeIdForDoc('_design/foo/do');
      expect(res).toBe('_design/foo%2Fdo');
    });

    it('encodes all other', () => {
      const res = utils.getSafeIdForDoc('_redesign/foobar');
      expect(res).toBe('_redesign%2Ffoobar');
    });
  });

  describe('safeURLName', () => {

    it('encodes special chars', () => {
      expect(utils.safeURLName('foo-bar/baz')).toBe('foo-bar%2Fbaz');
    });

    it('encodes an encoded doc', () => {
      expect(utils.safeURLName('foo-bar%2Fbaz')).toBe('foo-bar%252Fbaz');
    });
  });

  describe('isSystemDatabase', () => {

    it('detects system databases', () => {
      expect(utils.isSystemDatabase('_replicator')).toBeTruthy();
    });

    it('ignores other dbs', () => {
      expect(utils.isSystemDatabase('foo')).toBeFalsy();
    });
  });

  describe('localStorage', () => {

    it('Should get undefined when getting a non-existent key', () => {
      expect(utils.localStorageGet('qwerty')).not.toBeDefined();
    });

    it('Should get value after setting it', () => {
      const key = 'key1';
      utils.localStorageSet(key, 1);
      expect(utils.localStorageGet(key)).toBe(1);
    });

    it('Set and retrieve complex object', () => {
      const key = 'key2',
            obj = {
              one: 1,
              two: ['1', 'string', 3]
            };
      utils.localStorageSet(key, obj);
      expect(utils.localStorageGet(key)).toEqual(obj);
    });

    it('stripHTML removes HTML', () => {
      [
        { html: '<span>okay</span>', text: 'okay' },
        { html: 'test <span>before</span> and after', text: 'test before and after' },
        { html: 'testing <a href="#whatever">attributes</span>', text: 'testing attributes' },
        { html: '<span>testing</span> multiple <p>elements</p>', text: 'testing multiple elements' }
      ].forEach(function (item) {
        expect(utils.stripHTML(item.html)).toBe(item.text);
      });
    });
  });

  describe('queryParams', () => {
    it('builds query string from an object', () => {
      expect(utils.queryParams({
        startkey: JSON.stringify('_design/app'),
        endkey: JSON.stringify('_design/app\u9999'),
        limit:30
      })).toBe(
        'startkey=%22_design%2Fapp%22&endkey=%22_design%2Fapp%E9%A6%99%22&limit=30'
      );
    });
  });

  describe("urlHasSameHost", () => {
    const basicDbName = "abc";
    const basicUrlString = `https://helloabc.company.co.uk:1234/${basicDbName}`;
    const basicUrl = new URL(basicUrlString);
    const basicUrlHost = basicUrl.host;

    it("returns true when URL host matches host", () => {
      expect(utils.urlHasSameHost(basicUrlHost, basicUrl)).toBe(true);
    });

    it("returns false when URL host does not match", () => {
      expect(utils.urlHasSameHost("http://remote.example.com:5984/mydb", basicUrl)).toBe(false);
      expect(utils.urlHasSameHost("http://192.168.1.10:5984/mydb", basicUrl)).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(utils.urlHasSameHost(null, basicUrl)).toBe(false);
      expect(utils.urlHasSameHost("dev", null)).toBe(false);
      expect(utils.urlHasSameHost(undefined, basicUrl)).toBe(false);
      expect(utils.urlHasSameHost("dev", undefined)).toBe(false);
      expect(utils.urlHasSameHost(undefined, undefined)).toBe(false);
      expect(utils.urlHasSameHost(null, null)).toBe(false);
    });

    it("returns false for non-URLs", () => {
      expect(utils.urlHasSameHost("dev.com", 1)).toBe(false);
      expect(utils.urlHasSameHost("dev.com", "dev.com")).toBe(false);
    });

    it("does not false-positive on host substring matches", () => {
      expect(utils.urlHasSameHost("notes", new URL("http://notes.example.com:5984/mydb")), ).toBe(false);
      expect(utils.urlHasSameHost("dev-server", new URL("http://dev-server.example.com:5984/mydb")), ).toBe(false);
      expect(utils.urlHasSameHost("dev", new URL("http://staging-dev.example.com:5984/mydb"))).toBe(false);
    });

    it("handles localhost correctly", () => {
      expect(utils.urlHasSameHost("localhost:1234", new URL("http://localhost:1234/mydb"))).toBe(true);
      expect(utils.urlHasSameHost("localhost", new URL("http://localhost:5984/mydb"))).toBe(false);
      expect(utils.urlHasSameHost("localhost", new URL("http://127.0.0.1:5984/mydb"))).toBe(false);
    });

    it("handles IPV4 correctly", () => {
      expect(utils.urlHasSameHost("192.168.1.23", new URL("http://192.168.1.23/mydb"))).toBe(true);
      expect(utils.urlHasSameHost("192.168.1.23", new URL("http://192.168.1.23:5984/mydb"))).toBe(false);
      // doesn't mistake a url starting with what looks like an IPV4 address with a host
      expect(utils.urlHasSameHost("1.1.1.1", new URL("http://1.1.1.1.com:5984/mydb")), ).toBe(false);
      expect(utils.urlHasSameHost( "couchdb", new URL("http://couchdb-prod.example.com:5984/mydb"), "couchdb")).toBe(false);
    });

    it("does not match different hosts with similar substrings", () => {
      expect(utils.urlHasSameHost("couchdb", new URL("http://couchdb:5984/mydb"), "couchdb")).toBe(false);
      expect(utils.urlHasSameHost("couchdb", new URL("http://my-couchdb.example.com:5984/mydb"))).toBe(false);
      expect(utils.urlHasSameHost("couchdb", new URL("http://couchdb-prod.example.com:5984/mydb"))).toBe(false);
    });
  });
});
