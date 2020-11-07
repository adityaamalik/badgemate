const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const fs = require('fs'); 
const path = require('path');
const multer = require('multer');
const passportLocalMongoose = require("passport-local-mongoose");
const https = require('https');

require('dotenv').config();

const app = express();

app.set('view engine','ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true,useUnifiedTopology: true, useFindAndModify: false });
mongoose.set("useCreateIndex", true);


// mongodb://localhost:27017/badgeMateDB
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    name: String,
    isIssuer: Boolean,
    issuerWebsite: String
});



userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());

const badgeSchema = new mongoose.Schema({
    name: String,
    image: {
        data: Buffer,
        contentType: String,
    },
    issuer: String,
    creationDate: Date,
    description: String,
    value: Number,
});

const Badge = mongoose.model("Badge", badgeSchema);

const badgePackSchema = new mongoose.Schema({
    name: String,
    image: {
        data: Buffer,
        contentType: String,
    },
    issuer: String,
    recipient: String,
    issueDate: Date,
    description: String,
    value: Number,
    remark: String,
});

const Badgepack = mongoose.model("Badgepack", badgePackSchema);

const CertificateSchema = new mongoose.Schema({
    name: String,
    image: String,
    issuer: String,
    creationDate: Date,
    description: String,
    recipient:String,
    url: String,
    verified:String
});

const Certificates = mongoose.model("Certificates", CertificateSchema);






const codeforcesSchema = new mongoose.Schema({
    name: String,
    issuer: String,
    recipient: String,
    issueDate: Date,
    description: String,
    value: Number,
    remark: String,
});


const codeforcesBadge= mongoose.model("codeforcesBadge", codeforcesSchema);

passport.serializeUser(function(user, done) {
    done(null, user);
});
  
passport.deserializeUser(function(user, done) {
    done(null, user);
});

const storage = multer.diskStorage({ 
    destination: (req, file, cb) => { 
        cb(null, 'uploads') 
    }, 
    filename: (req, file, cb) => { 
        cb(null, file.fieldname + '-' + Date.now()) 
    } 
}); 

const upload = multer({ storage: storage });

app.get("/",function(req,res){
    res.render("landing");
});

app.get("/register",function(req,res){
    res.render("register");
});

app.get("/login",function(req,res){
    res.render("login");
});

app.post("/register",function(req,res){
    User.register(
        {
            username: req.body.username, 
            name: req.body.name,
            isIssuer: false,
            issuerWebsite: null
        },
        req.body.password,
        function(err,user){
            if(err){
                console.log(err);
                res.redirect("/register");
            }
            else{
                passport.authenticate("local")(req,res, function(){
                    User.findOne({username: req.body.username}, function(err,foundUser){
                        res.redirect(`/${foundUser._id}/dashboard`);
                    })
                })
            }
        }
    )
});

app.post("/login",function(req,res){

    const user = new User({
        username: req.body.username,
        password: req.body.password,
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
            res.redirect("/login");
        }
        else{
            passport.authenticate("local")(req,res, function(){
                User.findOne({username: req.body.username}, function(err,foundUser){
                    res.redirect(`/${foundUser._id}/dashboard`);
                })
            })
        }
    })
});

app.get("/logout",function(req,res){
    req.logout();
    res.redirect("/");
});

app.get("/:user_id/dashboard",function(req,res){

    if(req.isAuthenticated()){
        res.render("dashboard",{user_id: req.params.user_id});
    }
    else{
        res.redirect("/login");
    }
});

app.get("/:user_id/badgepack",function(req,res){

    if(req.isAuthenticated()){
        User.findOne({_id: req.params.user_id}, function(err,foundUser){
            if(!err){
                Badgepack.find({recipient: foundUser.username}, function(err,foundBadges){
                    if(!err){
                        Certificates.find({recipient:foundUser.username},function(err,foundCertificate)
                        {
                            if(!err)
                            { 

                                codeforcesBadge.find({recipient:foundUser.username},function(err,foundCodeforcesbadge)
                                {
                                    if(!err)
                                    {
                                        res.render("badgepack",{user_id: req.params.user_id, foundBadges: foundBadges,foundCertificate:foundCertificate, foundCodeforcesbadge:foundCodeforcesbadge});
                                    }

                                })


                             
                            }
                        })
                    }
                })
            }
        })
    }
    else{
        res.redirect("/login");
    }
});

app.get("/:user_id/earnbadge",function(req,res){

    if(req.isAuthenticated()){
        res.render("earnbadge",{user_id: req.params.user_id});
    }
    else{
        res.redirect("/login");
    }
});

app.get("/:user_id/issuer",function(req,res){

    if(req.isAuthenticated()){
        User.findOne({_id: req.params.user_id}, function(err,foundUser){
            Badge.find({issuer: foundUser.username}, function(err,foundBadges){
                res.render("issuer" ,
                    { 
                    user_id: foundUser._id,
                    foundUser: foundUser, 
                    foundBadges: foundBadges 
                    }
                );
            })
        })
    }
    else{
        res.redirect("/login");
    }
});



app.get("/:user_id/codeforces",function(req,res){

    if(req.isAuthenticated()){
        User.findOne({_id: req.params.user_id}, function(err,foundUser){
            
                res.render("codeforces",
                    { 
                    user_id: foundUser._id,
                    foundUser: foundUser, 
                    }
                );
         
        })
    }
    else{
        res.redirect("/login");
    }
});




app.get("/:user_id/certificate",function(req,res){

    if(req.isAuthenticated()){
        User.findOne({_id: req.params.user_id}, function(err,foundUser){
            
                res.render("certificate",
                    { 
                    user_id: foundUser._id,
                    foundUser: foundUser, 
                    }
                );
         
        })
    }
    else{
        res.redirect("/login");
    }
});


app.post("/:user_id/newissuer",function(req,res){
    if(req.isAuthenticated()){
        User.findByIdAndUpdate(
            {_id: req.params.user_id},
            {isIssuer: true, issuerWebsite: req.body.issuerWebsite},
            function(err,result){
                if(err){
                    res.redirect(`/${req.params.user_id}/issuer`);
                }
                else{
                    res.redirect(`/${req.params.user_id}/issuer`);
                }
            }
        )
    }else{
        res.redirect("/login");
    }
});

app.post("/:user_id/createbadge", upload.single('image'), function(req,res){

    if(req.isAuthenticated()){
        const badge = new Badge({
            name: req.body.name,
            issuer: req.body.issuer,
            description: req.body.description,
            value: req.body.value,
            creationDate: new Date(),
            image: {
                data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)), 
			    contentType: 'image/png'
            }
        });

        badge.save();

        res.redirect(`/${req.params.user_id}/issuer`);
    }else{
        res.redirect("/login");
    }
});

app.post("/:user_id/issuebadge",function(req,res){


    
    if(req.isAuthenticated()){

        Badge.findById(req.body.badgeId,function(err,foundbadge){

            const badge = new Badgepack({
                name: req.body.name,
                issuer: req.body.issuer,
                recipient: req.body.recipient,
                description: req.body.description,
                value: req.body.value,
                issueDate: new Date(),
                image: foundbadge.image,
                remark: req.body.remark,
            });
    
            badge.save();
        })

        res.redirect(`/${req.params.user_id}/issuer`);
    }else {
        res.redirect("/login");
    }

});

app.post("/:user_id/:badge_id/delete", function(req,res){
    if(req.isAuthenticated()){
        Badgepack.findByIdAndDelete(req.params.badge_id, function(err,deletedBadge){
            if(!err){
                console.log("Deleted Badge : " + deletedBadge);
            }
            else {
                console.log(err);
                console.log("Badge could not be deleted !");
            }

            res.redirect(`/${req.params.user_id}/badgepack`);
        });
    }else {
        res.redirect('/login');
    }
});

app.get("/:badge_id/share", function(req,res){
    
    Badgepack.findById(req.params.badge_id, function(err, foundbadge){
        res.render("sharebadge", {badge: foundbadge});
    })
});

app.post("/extensionIssue", function(req,res){
    User.find({username: req.body.username}, function(err,foundUser){
        if(!err){
            Badge.findOne({name: req.body.badgename , issuer: req.body.username}, function(err,foundBadge){
                const badge = new Badgepack({
                    name: req.body.badgename,
                    issuer: req.body.username,
                    recipient: req.body.recipient,
                    description: foundBadge.description,
                    value: foundBadge.value,
                    issueDate: new Date(),
                    image: foundBadge.image,
                    remark: req.body.remark
                });

                badge.save();
            })
        }else{
            console.log(err);
        }
    });
});



app.post("/:user_id/:certificate_id/remove", function(req,res){
    if(req.isAuthenticated()){
        Certificates.findByIdAndDelete(req.params.certificate_id, function(err,deletedcertificate){
            if(!err){
                console.log("Deleted certificate : " + deletedcertificate);
            }
            else {
                console.log(err);
                console.log("certificate could not be deleted !");
            }

            res.redirect(`/${req.params.user_id}/badgepack`);
        });
    }else {
        res.redirect('/login');
    }
});


app.post("/:user_id/:badge_id/removeotherbadge", function(req,res){
    if(req.isAuthenticated()){
        codeforcesBadge.findByIdAndDelete(req.params.badge_id, function(err,deletedBadge){
            if(!err){
                console.log("Deleted badges : " + deletedBadge);
            }
            else {
                console.log(err);
                console.log("badge could not be deleted !");
            }

            res.redirect(`/${req.params.user_id}/badgepack`);
        });
    }else {
        res.redirect('/login');
    }
});


app.post("/:user_id/codeforces",function(req,res){

    if(req.isAuthenticated()){
        const username=req.body.userName;
        const reciver=req.body.reciver;
        const url="https://codeforces.com/api/user.info?handles="+username
        https.get(url, (response) => {
        
          response.on('data', (data) => {
            const userdata=JSON.parse(data)
            const fname=userdata.result[0].handle
            const maxrating=userdata.result[0].maxRating
             let valueBadge=0;
              if(maxrating>=3000)
              valueBadge=10
              else if(maxrating< 3000 && maxrating>=2700 )
              valueBadge=9
              else if(maxrating< 2700 && maxrating>=2400 )
              valueBadge=8
              else if(maxrating< 2400 && maxrating>=2200 )
              valueBadge=7
              else if(maxrating< 2200 && maxrating>= 1800)
              valueBadge=6
              else if(maxrating< 1800 && maxrating>=1600 )
              valueBadge=5
              else if(maxrating<1600  && maxrating>= 1400)
              valueBadge=4
              else if(maxrating< 1400 && maxrating>= 1200)
              valueBadge=3
              else if(maxrating<1200  && maxrating>= 0)
              valueBadge=2
        
            const badge = new codeforcesBadge({
                name: "Codeforces user "+fname,
                issuer: "BadgeMate",
                recipient: reciver,
                description: "Codeforces badge",
                value: valueBadge,
                issueDate: new Date(),
               
                remark: "Codeforces badge",
            });
            badge.save();
          });
        });
        res.redirect(`/${req.params.user_id}/dashboard`);
    }
    else
     {
       res.redirect("/login");
     }
});





app.post("/:user_id/certificate",function(req,res){

    if(req.isAuthenticated()){
        const Certificate= new Certificates({
          name: req.body.name,
          image: null,
          issuer: req.body.issuedby,
          recipient: req.body.reciver,
          creationDate: new Date(),
          description: req.body.description,
          url:req.body.url,
          verified:"Not by badgemate"
        });

       Certificate.save();
       res.redirect(`/${req.params.user_id}/badgepack`);
    }
    else
     {
       res.redirect("/login");
     }
});

app.listen(process.env.PORT || "3000",function(){
    console.log("Server has started !");
});

