const jwt = require('jsonwebtoken');

exports.verifyJWT = (req, res, next) => {
    var token = req.headers["authorization"]
    if(!token){
        res.status(401).send();
    }else{
        token = token.replace("Bearer ", "")

        if(token == process.env.ADMIN_API_KEY){
            next()
        }else{
            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if(err) res.status(403).send();
                else{
                    try {
                        req.user = decoded;
                    }catch(err){
                        res.status(401).send();
                    }
                    
                    next();
                }
            })
        }
    }
}