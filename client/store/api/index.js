// import _book from './book'
import tag from './tag'
import post from './post'
import sellpost from './sellpost'
import auth from './auth'
// import _general from './general'
// import _dashboard from './dashboard'

// helper methods for rendering, we should import {helper} instead of * as api
// import _helper from './helper'

// we compose all api for each category here as single entry point
// api will be an single entry point for all frame methods
// this is where common functions are put
export default {
  auth,
  tag,
  post,
  sellpost,
}
