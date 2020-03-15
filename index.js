import {stringify} from 'query-string';
import {fetchUtils} from 'ra-core';

var __assign = (this && this.__assign) || function () {
  __assign = Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
        t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};

function handleFilter(name, value) {
  if (name.includes(',')) {
    let subFilters = name.split(',');
    return {or: subFilters.map(i => handleFilter(i, value))}
  }
  let opMap = {
    'startswith': (val) => val + '%',
    'endswith': (val) => '%' + val,
    'contains': (val) => '%' + val + '%'
  };
  var op = 'eq';
  var field = name;
  field = field.replace('___', '--');
  var field_op = field.split('__');
  if (field_op.length == 2) {

    field = field_op[0];
    op = field_op[1];
    let val_func = opMap[op];
    if (val_func) {
      value = val_func(value);
      op = 'like'
    }
  }
  field = field.replace('--', '__');
  return {name: field, val: value, op: op};
}

export default (function (apiUrl, httpClient) {
  if (httpClient === void 0) {
    httpClient = fetchUtils.fetchJson;
  }
  return ({
    getList: function (resource, params) {
      var _a = params.pagination, page = _a.page, perPage = _a.perPage;
      var _b = params.sort, field = _b.field, order = _b.order;
      var filters = [];
      for (var k in params.filter) {
        filters.push(handleFilter(k, params.filter[k]))
      }
      var query = {
        results_per_page: perPage,
        page: page,
        q: JSON.stringify(
          {
            order_by: [{field: field, direction: order.toLowerCase()}],
            filters: filters,
          }
        )
      };
      var url = apiUrl + "/" + resource + "?" + stringify(query);
      return httpClient(url).then(function (_a) {
        return {
          data: _a.json.objects,
          total: _a.json['num_results'],
        };
      });
    },
    getOne: function (resource, params) {
      return httpClient(apiUrl + "/" + resource + "/" + params.id).then(function (_a) {
        var json = _a.json;
        return ({
          data: json,
        });
      });
    },
    getMany: function (resource, params) {
      var query = {
        q: JSON.stringify({filters: [{name: 'id', val: params.ids, op: 'in'}]}),
      };
      var url = apiUrl + "/" + resource + "?" + stringify(query);
      return httpClient(url).then(function (_a) {
        return ({data: _a.json.objects});
      });
    },
    getManyReference: function (resource, params) {
      var _a;
      var _b = params.pagination, page = _b.page, perPage = _b.perPage;
      var _c = params.sort, field = _c.field, order = _c.order;
      var query = {
        sort: JSON.stringify([field, order]),
        range: JSON.stringify([(page - 1) * perPage, page * perPage - 1]),
        filter: JSON.stringify(__assign(__assign({}, params.filter), (_a = {}, _a[params.target] = params.id, _a))),
      };
      var url = apiUrl + "/" + resource + "?" + stringify(query);
      return httpClient(url).then(function (_a) {
        var headers = _a.headers, json = _a.json;
        if (!headers.has('content-range')) {
          throw new Error('The Content-Range header is missing in the HTTP Response. The simple REST data provider expects responses for lists of resources to contain this header with the total number of results to build the pagination. If you are using CORS, did you declare Content-Range in the Access-Control-Expose-Headers header?');
        }
        return {
          data: json,
          total: parseInt(headers
            .get('content-range')
            .split('/')
            .pop(), 10),
        };
      });
    },
    update: function (resource, params) {
      return httpClient(apiUrl + "/" + resource + "/" + params.id, {
        method: 'PUT',
        body: JSON.stringify(params.data),
      }).then(function (_a) {
        var json = _a.json;
        return ({data: json});
      });
    },
    // simple-rest doesn't handle provide an updateMany route, so we fallback to calling update n times instead
    updateMany: function (resource, params) {
      return Promise.all(params.ids.map(function (id) {
        return httpClient(apiUrl + "/" + resource + "/" + id, {
          method: 'PUT',
          body: JSON.stringify(params.data),
        });
      })).then(function (responses) {
        return ({
          data: responses.map(function (_a) {
            var json = _a.json;
            return json.id;
          })
        });
      });
    },
    create: function (resource, params) {
      return httpClient(apiUrl + "/" + resource, {
        method: 'POST',
        body: JSON.stringify(params.data),
      }).then(function (_a) {
        var json = _a.json;
        return ({
          data: __assign(__assign({}, params.data), {id: json.id}),
        });
      });
    },
    delete: function (resource, params) {
      return httpClient(apiUrl + "/" + resource + "/" + params.id, {
        method: 'DELETE',
      }).then(function (_a) {
        var json = _a.json;
        return ({data: json});
      });
    },
    // simple-rest doesn't handle filters on DELETE route, so we fallback to calling DELETE n times instead
    deleteMany: function (resource, params) {
      return Promise.all(params.ids.map(function (id) {
        return httpClient(apiUrl + "/" + resource + "/" + id, {
          method: 'DELETE',
        });
      })).then(function (responses) {
        return ({
          data: responses.map(function (_a) {
            var json = _a.json;
            return json.id;
          })
        });
      });
    },
  });
});