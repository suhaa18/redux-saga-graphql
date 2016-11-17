import { 
  GraphQLInt, 
  GraphQLString, 
} from 'graphql'

import {   
  connectionArgs, 
  connectionFromArraySlice,
  offsetToCursor,
} from 'graphql-relay'

import getPagingParameters from './getPagingParameters'
import getGraphqlFields from 'graphql/utils/getGraphqlFields'

import models from 'models'

// we also define number paging model for simple paging with limit and offset
export const paggableConnectionArgs = {
  ...connectionArgs,
  // for jumping by offset instead of cursor
  offset: {
    type: GraphQLInt,
  },
  order: {
    type: GraphQLString,
  },
}

/**
 *
 * with number paging model, we will not use cursor, because item can change the page it belongs to
 *
 */
export const getPagingModelPromise = ({limit, offset, order}, info, model, resolvers={}, optionsResolver) => {
  // by default, we only get field from node as child of edges
  const {edges: {node: graphFields}} = getGraphqlFields(info)
  const resolverAttributes = Object.keys(resolvers)
  // good enough
  let attributes = Object.keys(graphFields)

  if(resolverAttributes.length > 0)
    attributes = attributes.filter(x => resolverAttributes.indexOf(x) < 0)  

  // now we select database, by default we use fieldName to get from models
  model = model || models[info.fieldName]          
  let options = { 
    attributes, 
    limit, offset,     
  }

  // add order argument
  if(order){
    options.order = order.split(/\s*,\s*/).map(c=>c.split(/\s+/))
  }

  // add something more, no return, because we will not clone this
  optionsResolver && optionsResolver(options, resolverAttributes)

  return model.findAndCountAll(options)
    .then(result=>{    

      if(resolverAttributes.length === 0)
        return result    

      let {rows, count} = result

      // resolve items
      rows = rows.map(row=>{
        
        resolverAttributes.forEach(attr=>
          graphFields[attr] && // if we send tag graph fields
            (row[attr] = resolvers[attr](row, Object.keys(graphFields[attr])))
        )

        return row  
      })
      
      return {
        rows,
        count,
      }
      
    })        
}


/**
 *
 * Paging with cursor
 *
 */

export const getScrollPagingModel = async (args, ...left) => {

  // by default, we only get field from node as child of edges  
  const { limit, offset } = getPagingParameters(args)       
  const { rows, count } = await getPagingModelPromise({ 
    limit, 
    offset, 
    order: args.order 
  }, ...left)

  return connectionFromArraySlice(
      rows,
      args, 
      {
          sliceStart: offset,
          arrayLength: count,
      }
  )                      
  
}

/**
 *
 * Simple paging
 *
 */

export const getNumberPagingModel = async (args, ...left) => {
  if(args.offset === undefined)
    return getScrollPagingModel(args, ...left)
  // simple paging with offset and limit
  const { first: limit, offset, order } = args
  const { rows, count } = await getPagingModelPromise({
    limit, 
    offset, 
    order
  }, ...left)

  const startOffset = offset + 1
  const edges = rows.map((value, index) => ({    
    node: value,
    cursor: offsetToCursor(startOffset + index),
  }))

  const firstEdge = edges[0]
  const lastEdge = edges[edges.length - 1]
  const hasPreviousPage = false // because we only move forward using offset
  const hasNextPage = offset + limit < count

  // just for testing
  // require('sleep').sleep(6)

  // just give enough information, forget about cursor
  return {
    edges,
    pageInfo: {
      startCursor: firstEdge ? firstEdge.cursor : null,
      endCursor: lastEdge ? lastEdge.cursor : null,
      hasPreviousPage,
      hasNextPage,
    }
  }
}