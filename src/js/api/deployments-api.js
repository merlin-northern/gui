var request = require('superagent-use')(require('superagent'));
var Promise = require('es6-promise').Promise;
import cookie from 'react-cookie';
import { unauthorizedRedirect } from '../auth';

request.use(unauthorizedRedirect);

const Api = {
  get: url => {
    var token = cookie.load('JWT');
    return new Promise((resolve, reject) => {
      request
        .get(url)
        .authBearer(token)
        .timeout({
          response: 30000, // wait 10 seconds for server to start sending
          deadline: 60000 // allow one minute to finish loading
        })
        .end((err, res) => {
          if (err || !res.ok) {
            reject({ error: err, res: res });
          } else {
            resolve(res);
          }
        });
    });
  },
  getText: url => {
    var token = cookie.load('JWT');
    return new Promise((resolve, reject) => {
      request
        .get(url)
        .authBearer(token)
        .set('Content-Type', 'application/text')
        .end((err, res) => {
          if (err || !res.ok) {
            reject({ error: err, res: res });
          } else {
            resolve(res.text);
          }
        });
    });
  },
  post: (url, data) => {
    var token = cookie.load('JWT');
    return new Promise((resolve, reject) => {
      request
        .post(url)
        .authBearer(token)
        .set('Content-Type', 'application/json')
        .send(data)
        .end((err, res) => {
          if (err || !res.ok) {
            reject({ error: err, res: res });
          } else {
            resolve(res.header);
          }
        });
    });
  },
  put: (url, data) => {
    var token = cookie.load('JWT');
    return new Promise((resolve, reject) => {
      request
        .put(url)
        .authBearer(token)
        .set('Content-Type', 'application/json')
        .send(data)
        .end((err, res) => {
          if (err || !res.ok) {
            reject({ error: err, res: res });
          } else {
            resolve(res.body);
          }
        });
    });
  }
};

export default Api;
