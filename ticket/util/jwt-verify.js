const jwt = require('jsonwebtoken');

exports.verifyJWT = (req, res, next) => {
    var token = req.headers["authorization"]

    console.log("Auth Time");
    
    if(!token){
        console.log("No Token");
        res.status(401).send();
    }else{
        console.log("Token: "+token);
        token = token.replace("Bearer ", "")

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if(err) res.status(403).send();
            else{
                try {
                    req.user = decoded;
                    console.log("Good To GO");
                }catch(err){
                    console.log("Nope");
                    res.status(401).send();
                }
                
                next();
            }
        })
    }
}