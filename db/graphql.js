var fetch = require('node-fetch');
var https = require('https');
require('dotenv').config();

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

const config = {
    endpointUrl: process.env.HASURA_URL,
    headers: {
        'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET
    }
};

async function fetchGraphQL(query, variables, customConfig) {
    const url = customConfig?.endpointUrl ?? config.endpointUrl
    const headers = customConfig?.headers ?? config.headers;
    const opts = {
        method: "POST",
        headers,
        body: JSON.stringify({
            query: query,
            variables: variables,
        }),
        agent: url.startsWith('https') ? httpsAgent : undefined
    };
    let result, jsonResult;
    try {
        result = await fetch(url, opts);
        jsonResult = await result.json();
    } catch (e) {
        console.log('graphql fetch failed: ', url, result, e);
        jsonResult = null;
    }
    // console.debug((jsonResult.data) ? 'gql got data' : 'gql response had no data');
    return jsonResult;
}

const updatePk = async (config, table, id, set) => {
    const UPDATE_PK = `
    mutation ($id: uuid!, $set: ${table}_set_input!) {
      update_${table}_by_pk(pk_columns: {id: $id}, _set: $set) {
        id
      }
    }
    `;
    return await fetchGraphQL(UPDATE_PK, {id, set});
}

const insertOne = async (config, table, input) => {
    const INSERT_ONE = `
    mutation ($input: ${table}_insert_input!) {
      insert_${table}_one(object: $input) {
        id
      }
    }   
    `;
    const fetchResult = await fetchGraphQL(INSERT_ONE, {input});
    if (fetchResult?.data?.[`insert_${table}_one`])
        return fetchResult.data[`insert_${table}_one`]?.id;
    console.log('GqlError insertOne', table, input, fetchResult);
    return null;
}

const queryWhere = async (config, table, where, columns) => {
    const QUERY_WHERE = `
        query ($where: ${table}_bool_exp!) {
          ${table}(where: $where) {
            ${columns.join('\n')}
          }
        }
    `;
    const fetchResult = await fetchGraphQL(QUERY_WHERE, {where})
    if (fetchResult?.data?.[`${table}`])
        return fetchResult.data[`${table}`];
    console.log('GqlError queryWhere', table, where, fetchResult);
    return [];
}

const deleteWhere = async (table, where) => {
    const WHERE = `
        mutation ($where: ${table}_bool_exp = {}) {
          delete_${table}(where: $where) {
            affected_rows
          }
        }
    `;
    const fetchResult = await fetchGraphQL(WHERE, {where})
    if (fetchResult?.data?.[`delete_${table}`])
        return fetchResult.data[`delete_${table}`];
    console.log('GqlError deleteWhere', table, where, fetchResult);
    return null;
}

const deleteId = async (table, id) => {
    const Q = `
        mutation ($id: uuid!) {
          delete_${table}_by_pk(id: $id) {
            id
          }
        }
    `;
    const fetchResult = await fetchGraphQL(Q, {id})
    if (fetchResult?.data?.[`delete_${table}_by_pk`])
        return fetchResult.data[`delete_${table}_by_pk`];
    console.log('GqlError deleteId', table, id, fetchResult);
    return null;
}

const queryPk = async (config, table, id, columns) => {
    if (!id) console.trace();
    const QUERY_PK = `
        query ($id: uuid!) {
          ${table}_by_pk(id: $id) {
            ${columns.join('\n')}
          }
        }
    `;
    const fetchResult = await fetchGraphQL(QUERY_PK, {id})
    if (fetchResult?.data?.[`${table}_by_pk`])
        return fetchResult.data[`${table}_by_pk`];
    console.log('GqlError queryPk', table, id, fetchResult);
    return null;
}

const queryRaw = async (query, variables, customConfig) => {
    const fetchResult = await fetchGraphQL(query, variables, customConfig);
    if (fetchResult?.data)
        return fetchResult.data;
    console.log('GqlError queryRaw', query, fetchResult);
    return null;
}

module.exports = {
    queryRaw,
    queryPk,
    queryWhere,
    insertOne,
    updatePk,
    deleteWhere,
    deleteId 
};