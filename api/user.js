const express = require('express');
const router = express.Router();

//mongodb user model
const User = require('./../models/user');

//Password Handler
const bcrypt = require('bcrypt');

//Signup
router.post('/signup', (req,res) =>{
   let {name, email, dateOfBirth, password} = req.body;
   name = name.trim();
   email = email.trim();
   dateOfBirth = dateOfBirth.trim();
   password = password.trim();

   if(name == "" ||email == "" || dateOfBirth == "" || password == "" ){
        res.json({
            status: "FAILED",
            message: "Empty input fields!"
        });
   } else if(!/^[a-zA-Z ]*$/.test(name)){
        res.json({
            status: "FAILED",
            message: "Invalid name entered"
        });
   } else if(!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)){
        res.json({
            status: "FAILED",
            message: "Invalid email entered"
        });
   }else if(isNaN(new Date(dateOfBirth).getTime())){
        res.json({
            status: "FAILED",
            message: "Invalid date of Birth entered"
        });
   } else if(password.length<8){
        res.json({
            status: "FAILED",
            message: "Password is too short!"
        });
   } else{
     //checking if user already exists
      User.find({email}).then(result =>{
         if(result.length){
            // A user already exists
            res.json({
                status: "FAILED",
                message: "User with provided email already exists"
            }); 
         }else{
            //Try to create the user

            //password handling
            const saltRounds = 10;
            bcrypt.hash(password, saltRounds).then(hashedPassword =>{
                const newUser = new User({
                    name,
                    email,
                    dateOfBirth,
                    password:hashedPassword,
                });

                newUser.save().then(result =>{
                    res.json({
                        status: "SUCCESFUL",
                        message: "Signup successful",
                        data: result,
                    });
                })
                .catch(err =>{
                    res.json({
                        status: "FAILED",
                        message: "An error occurred while saving user account!"
                    });
                })

            })
            .catch(err =>{
                res.json({
                    status: "FAILED",
                    message: "An error occurred while hashing password"
                });
            })
         }
      }).catch(err =>{
            console.log(err);
            res.json({
                status: "FAILED",
                message: "An error occurred while checking for existing user!"
            });
      })
   }

})

//Sign in
router.post('/signin', (req,res)=>{
   let { email, password} = req.body;
   email = email.trim();
   password = password.trim();

   if(email == "" || password == ""){
        res.json({
            status: "FAILED",
            message: "Empty credentials supplied!"
        });
   }else{
      //check if user exists
      User.find({email}).then(data => {
        if(data.length){
            //user exists

            const hashedPassword = data[0].password;
            bcrypt.compare(password, hashedPassword).then(result =>{
                if(result){
                  //Password Match
                    res.json({
                        status: "SUCCESFUL",
                        message: "Signin successful",
                        data: data,
                    });
                }else {
                    res.json({
                        status: "FAILED",
                        message: "Invalid password entered!"
                    });
                }
            })
            .catch(err =>{
                res.json({
                    status: "FAILED",
                    message: "An error occurred while comparing!"
                });
            })
        }else {
            res.json({
                status: "FAILED",
                message: "Invalid credentials entered!"
            });
        }
        
      })
      .catch(err =>{
            res.json({
                status: "FAILED",
                message: "An error occured while checking for existing user"
            });
      })
   }
})

module.exports = router;