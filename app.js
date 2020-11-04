const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const https = require('https');
const { Certificate } = require("crypto");
const { NODATA } = require("dns");
require('dotenv').config();

const app = express();

app.set('view engine','ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
// mongodb+srv://admin-aditya:Mathematics@01@cluster0.x5vhu.mongodb.net/badgeMateDB
app.use(session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true,useUnifiedTopology: true, useFindAndModify: false });
mongoose.set("useCreateIndex", true);

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
    image: String,
    issuer: String,
    creationDate: Date,
    description: String,
    value: Number,
});

const Badge = mongoose.model("Badge", badgeSchema);

const badgePackSchema = new mongoose.Schema({
    name: String,
    image: String,
    issuer: String,
    recipient: String,
    issueDate: Date,
    description: String,
    value: Number,
    remark: String,
});

const Badgepack = mongoose.model("Badgepack", badgePackSchema);

passport.serializeUser(function(user, done) {
    done(null, user);
});
  
passport.deserializeUser(function(user, done) {
    done(null, user);
});

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
                        res.render("badgepack",{user_id: req.params.user_id, foundBadges: foundBadges});
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
        res.render("codeforces",{user_id: req.params.user_id
            });
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

app.post("/:user_id/createbadge",function(req,res){

    if(req.isAuthenticated()){
        const badge = new Badge({
            name: req.body.name,
            issuer: req.body.issuer,
            description: req.body.description,
            value: req.body.value,
            creationDate: new Date(),
            image: null
        });

        badge.save();

        res.redirect(`/${req.params.user_id}/issuer`);
    }else{
        res.redirect("/login");
    }
});

app.post("/:user_id/issuebadge",function(req,res){

    if(req.isAuthenticated()){
        console.log(req.body);
        const badge = new Badgepack({
            name: req.body.name,
            issuer: req.body.issuer,
            recipient: req.body.recipient,
            description: req.body.description,
            value: req.body.value,
            issueDate: new Date(),
            image: null,
            remark: req.body.remark,
        });

        badge.save();

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




app.post("/:user_id/codeforces",function(req,res){

    if(req.isAuthenticated()){
        const city=req.body.cityName;
        // const url="https://api.openweathermap.org/data/2.5/weather?q="+city+"&appid=69cb52b745ebce73c94c4e0097996f68&units=metric"
        const url="https://codeforces.com/api/user.info?handles="+city
        https.get(url, (response) => {
         console.log(response);
         
        
          response.on('data', (data) => {
            const weatherdata=JSON.parse(data)
        console.log(weatherdata);
            const temp=weatherdata.result[0].maxRank
            // const weatherd=weatherdata.weather[0].description
            // const icon=weatherdata.weather[0].icon
            // const image="http://openweathermap.org/img/wn/"+icon+"@2x.png"
            // res.write("Badge added to backpack");
        
            // res.send();
            const fname=weatherdata.result[0].handle

            const maxrating=weatherdata.result[0].maxRating
 
            console.log(maxrating);
let val=0

if(maxrating>=3000)
val=10
if(maxrating<3000)
val=9
else
val=7



            console.log(req.body);
            // const badge = new Badge({
            //     name: "Codechef user"+fname,
            //     issuer: "BadgeMate",
            //     description: "Codechef badge",
            //     value: val,
            //     creationDate: new Date(),
            //     image: null
            // });

            const badge = new Badgepack({
                name: "Codechef user"+fname,
                issuer: "BadgeMate",
                recipient: "altamashkhan59@gmail.com",
                description: "Codechef badge",
                value: val,
                issueDate: new Date(),
                image: null,
                remark: "Codechef badge",
            });
    
            badge.save();
    
            
    
           



            console.log(badge);
          });
        
        }
        );








        res.redirect(`/${req.params.user_id}/badgepack`);

       
    }
    
    
    
    else {
        res.redirect("/login");
    }

});


app.listen(process.env.PORT || "3000",function(){
    console.log("Server has started !");
});



// name of Certificate
// isseued by 
// url of proff:
// cerified by badgePackSchema; NO;