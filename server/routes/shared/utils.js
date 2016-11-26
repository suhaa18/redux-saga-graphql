import { v4 } from 'uuid'
import fse from 'fs-extra'
import path from 'path'
import { filePath } from 'config/constants'
import { decodeBase64Image } from 'data/decoder/image'
import authorize from 'passport/authorize'

export const getPagingRouter = (model, attributes) => (req, res)=> {
  const {page=1, limit=10} = req.query  
  const maxLimit = Math.min(+limit, 10)
  const offset = (page-1) * limit
  model.findAndCount({
    limit: maxLimit,
    offset,
    attributes,
  }).then(result => {
    res.send({...result, offset})
  })
}

export const getDetailRouter = (model, attributes) => (req, res) => {
  // tag is public
  const {id} = req.params
  model.findById(id,{
    attributes,
  }).then( item => {
    // logout passport to end access token immediately
    // convert back to base64 string
    res.send(item)
  })   
}

export const getDeleteRouter = (model) => (req, res) => {
  authorize(req)
  const {id} = req.params
  model.destroy({
    where:{id}
  })
  .then(deletedNumber => res.send({deletedNumber}))
}

export const uploadImage = (field, folder, setter) => {
  const imageDecode = decodeBase64Image(field)
  // delete old one
  if(imageDecode.buffer) {
    const imagePath = path.join(filePath, folder)
    // delete folder, by default we treat the whole folder like a collection of files, including thumb.v..v
    // for later
    fse.removeSync(imagePath)   
    // update new image
    const filename = v4() + '.png'  
    // must save done then return   
    fse.outputFileSync(path.join(imagePath, filename), imageDecode.buffer)    
    // return file upload path ? not always return, so use setter method
    setter && setter(`/uploads/${folder}/${filename}`) 
  }  
  
}