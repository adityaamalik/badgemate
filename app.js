const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

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

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    name: String
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());

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
            name: req.body.name
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
                        res.redirect(`/dashboard/${foundUser._id}`);
                    })
                })
            }
        }
    )
});

app.post("/login",function(req,res){

    const doc = new Doc({
        username: req.body.username,
        password: req.body.password,
    });

    req.login(doc, function(err){
        if(err){
            console.log(err);
            res.redirect("/login");
        }
        else{
            passport.authenticate("local")(req,res, function(){
                User.findOne({username: req.body.username}, function(err,foundUser){
                    res.redirect(`/dashboard/${foundUser._id}`);
                })
            })
        }
    })
});

app.get("/logout",function(req,res){
    req.logout();
    res.redirect("/");
});

app.get("/dashboard/:user_id",function(req,res){

    if(req.isAuthenticated()){
        res.render("dashboard",{user_id: req.params.user_id});
    }
    else{
        res.redirect("/login");
    }
});

app.listen(process.env.PORT || "3000",function(){
    console.log("Server has started !");
});