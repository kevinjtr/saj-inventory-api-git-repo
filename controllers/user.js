const jwt = require('jsonwebtoken');

exports.user = async (req,res) => {
  const {edit_rights} = req
  try{
    if(edit_rights){
      jwt.sign({
        level: 'admin',
        editable: edit_rights}, process.env.SECRET_KEY, {expiresIn:'.5hr'}, (err, token) => {
        res.json({
          token: token
        });
      });
      
      return;
    }
  
    return res.status(200).json({
      status: 200,
      level: 'user',
      editable: edit_rights,
      token: ''
    });
  }catch(err){
    return res.status(400).json({
      status: 400,
      level: 'user',
      editable: edit_rights,
      token: ''
    });
  }

}