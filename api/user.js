const express = require('express');
const router = express.Router();

//mongodb user model
const User = require('./../models/user');

//mongodb user verification model
const UserVerification = require('./../models/UserVerification');

//mongodb user Password reset model
const PasswordReset = require('./../models/PasswordReset');

//mongodb user OTP verification model
const UserOTPVerification = require('./../models/UserOTPverification');

//email handler
const nodemailer = require("nodemailer");

//unique string
const {v4: uuidv4} = require("uuid");

//env variables
require("dotenv").config();

//Password Handler
const bcrypt = require('bcrypt');

//path for static verified page
const path = require("path");

//nodemailer stuff
let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS,
    }
});

//testing success
transporter.verify((error, success) => {
    if(error){
        console.log(error);
    }else{
        console.log("Ready for messages");
        console.log(success);
    }
});

// setting server url
const development = "http://localhost:5000/";
const production = "https://mywallet-server-rwwk.onrender.com/";
const currentUrl = process.env.NODE_ENV ? production : development;

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
                    verified: false,
                });

                newUser
                    .save()
                    .then(result =>{
                        //handle account verification
                        sendVerificationEmail (result,res);
                    })
                    .catch(err =>{
                        res.json({
                            status: "FAILED",
                            message: "An error occurred while saving user account!"
                        });
                    }
                )

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

});

//send otp verification email

//send verification email
const sendVerificationEmail = ({_id, email}, res) => {
    const uniqueString = uuidv4() + _id;
    
    //mail options
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Verify Your Email",
        html: `<p>Verify your email address to complete the signup and login into your account.</p><p>This link <b>expires in 6 hours</b>.</p><p>Press <a href= ${currentUrl + "user/verify/"+ _id +"/"+ uniqueString}> here</a> to proceed.</p>`,
    };

    // hash the uniquestring
    const saltRounds = 10;
    bcrypt
        .hash(uniqueString, saltRounds)
        .then((hashedUniqueString)=>{
            // set values in the userVerification collection
            const newVerification = new UserVerification({
                userId: _id,
                uniqueString: hashedUniqueString,
                createdAt: Date.now(),
                expiresAt: Date.now() + 21600000,
            });
 
            newVerification
                .save()
                .then(()=>{
                    transporter
                    .sendMail(mailOptions)
                    .then(()=>{
                        //email sent verification record saved
                        res.json({
                            status: "PENDING",
                            message: "Verification email sent",
                            data:{
                                userId: _id,
                                email,
                            }
                        });
                    })
                    .catch((error)=>{
                        console.log(error);
                        res.json({
                            status: "FAILED",
                            message: "Verification email failed to send",
                        }); 
                    })
                })
                .catch((error) =>{
                    console.log(error);
                    res.json({
                        status: "FAILED",
                        message: "Couldn't save verification email data!",
                    });
                })

        })
        .catch(()=>{
            res.json({
                status: "FAILED",
                message: "An error occurred while hashing email data!",
            });
        }
    );

};

//resend verification
router.post("/resendVerificationLink", async (req, res)=>{
   try {
    let { userId, email} = req.body;

    if(!userId || !email){
        throw Error("Empty user details are not allowed");
    }else{
        //delete existing records and resend
        await UserVerification.deleteMany({userId});
        sendVerificationEmail({_id: userId, email}, res);
    }
   } catch (error) {
        res.json({
            status: "FAILED",
            message: `Verification Link Resend Error. ${error.message}`,
        });
   }
});

//verify email
router.get("/verify/:userId/:uniqueString", (req,res)=>{
    let{userId, uniqueString} = req.params;

    UserVerification
        .find({userId})
        .then((result)=>{
            if(result.length > 0){
                //user verification record exists so we proceeed

                const {expiresAt} = result[0];
                const hashedUniqueString = result[0].uniqueString;

                if (expiresAt < Date.now()) {
                    // record has expired so we delete it
                    UserVerification
                        .deleteOne({ userId})
                        .then(result =>{
                            User
                                .deleteOne({_id: userId})
                                .then(()=>{
                                    let message = "Link has expired. Please sign up again.";
                                    res.redirect(`/user/verified/error=true&message=${message}`);
                                })
                                .catch((error)=>{
                                    let message = "Clearing User with Expired unique string failed";
                                    res.redirect(`/user/verified/error=true&message=${message}`);
                                })
                        })
                        .catch((error)=>{
                            console.log(error);
                            let message = "An error occurred while clearing expired user verification record";
                            res.redirect(`/user/verified/error=true&message=${message}`);
                        })
                }else{
                    // valid record exists so we validate the user string
                    //first compare the hashed unique string

                    bcrypt
                        .compare(uniqueString, hashedUniqueString)
                        .then(result =>{
                            if(result){
                                //strings match

                                User
                                    .updateOne({_id: userId}, {verified: true})
                                    .then(()=>{
                                        UserVerification.deleteOne({userId})
                                        .then(()=>{
                                            res.sendFile(path.join(__dirname,"./../views/verified.html"));
                                        })
                                        .catch(error =>{
                                            console.log(error);
                                            let message = "An error occurred while finalizing successful verification ";
                                            res.redirect(`/user/verified/error=true&message=${message}`);
                                        })
                                    })
                                    .catch(error =>{
                                        console.log(error);
                                        let message = "An error occurred while updating user record to show verified";
                                        res.redirect(`/user/verified/error=true&message=${message}`);
                                    })

                            }else{
                                //existing record but incorrect verification details passed
                                let message = "Invalid verification Details passed. Check your Inbox.";
                                res.redirect(`/user/verified/error=true&message=${message}`);
                            }
                        })
                        .catch(error =>{
                            let message = "An error occurred while comparing unique strings.";
                            res.redirect(`/user/verified/error=true&message=${message}`);
                        })

                }

            }else{
                // user verified record doesnt exist
                let message = "Account record doesn't exist or haas been verified already. Please sign up or log in.";
                res.redirect(`/user/verified/error=true&message=${message}`);
            }
        })
        .catch((error)=>{
            console.log(error);
            let message = "An error occurred while checking for existing user verification record";
            res.redirect(`/user/verified/error=true&message=${message}`);
        })
});

//verified page route
router.get("/verified", (req, res) => {
    res.sendFile(path.join(__dirname, "./../views/verified.html"));
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

            //check if user is verified
            if(!data[0].verified){
                res.json({
                    status: "FAILED",
                    message: "Email hasn't been verified yet. Check your inbox.",
                    data: data,
                });
            } else {
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
            }
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
});

//password reset stuff
router.post("/requestPasswordReset", (req,res)=>{
    const {email, redirectUrl} = req.body;

    //check if email exists
    User
        .find({email})
        .then((data)=>{
            if(data.length){
                //user exists

                //check if user is verified
                if(!data[0].verified){
                    res.json({
                        status: "FAILED",
                        message: "Email hasn't been verified yet. Check your inbox",
                    });
                }else{
                    //proceed with email to reset password
                    sendResetEmail(data[0], redirectUrl, res);

                }

            }else{
                res.json({
                    status: "FAILED",
                    message: "No account with the supplied email exists!"
                }); 
            }
        })
        .catch(error=>{
            console.log(error);
            res.json({
                status: "FAILED",
                message: "An error occured while checking for existing user"
            });
        })
})

//send password reset email
const sendResetEmail = ({_id, email}, redirectUrl,res)=>{
    const resetString = uuidv4() + _id;

    //first, we clear all existing reset records
    PasswordReset
        .deleteMany({userId: _id})
        .then(result =>{
            //reset records deleted successfully
            //Now we send the email
            // Mail options
            const mailOptions = {
                from: process.env.AUTH_EMAIL,
                to: email,
                subject: "Password Reset",
                html: `<p>Having challenges remembering your password .</p> <p>Don't worry we got your back, use the link below to reset it</p> <p>This link <b>expires in 1 hour</b>.</p><p>Press <a href= ${redirectUrl + "/"+ _id +"/"+ resetString}> here</a> to proceed.</p>`,
            };

            //hash the reset string
            const saltRounds = 10;
            bcrypt
                .hash(resetString, saltRounds)
                .then(hashedResetString => {
                    // set values in password reset collection
                    const newPasswordReset = new PasswordReset({
                        userId: _id,
                        resetString: hashedResetString,
                        createdAt: Date.now(),
                        expiresAt: Date.now() + 3600000,
                    });

                    newPasswordReset
                        .save()
                        .then(()=>{
                            transporter
                                .sendMail(mailOptions)
                                .then(()=>{
                                    //reset email sent and password reset record saved
                                    res.json({
                                        status: "PENDING",
                                        message: "Password reset email sent",
                                   });
                                })
                                .catch(error =>{
                                    console.log(error);
                                    res.json({
                                        status: "FAILED",
                                        message: "Password reset email failed to send",
                                   });
                                })
                        })
                        .catch(error =>{
                            console.log(error);
                            res.json({
                                status: "FAILED",
                                message: "Couldn't save password reset data!",
                           });
                        })
                })
                .catch(error =>{
                    console.log(error);
                    res.json({
                        status: "FAILED",
                        message: "An error occurred while hashing the password reset data!",
                   });
                })

        })
        .catch(error =>{
           // error while clearing existing records
           console.log(error);
           res.json({
                status: "FAILED",
                message: "Clearing existing password reset records failed",
           });
        })
}

//Actually reseting password
router.post("/resetPassword",(req,res)=>{
    let {userId, resetString, newPassword} = req.body;
   

    PasswordReset
        .find({userId})
        .then(result =>{
            if(result.length > 0){
                //password reset record exists so we proceed
                
                const {expiresAt} = result[0];
                const hashedResetString = result[0].resetString

                // checking for expired reset string
                if(expiresAt < Date.now()){
                    PasswordReset
                    .deleteOne({_id: userId})
                    .then(()=>{
                        // reset record deleted successfully
                        res.json({
                            status: "FAILED",
                            message: "Password reset link has expired",
                       });
                    })
                    .catch(error =>{
                        //deletion failed
                        console.log(error)
                        res.json({
                            status: "FAILED",
                            message: "Password reset record delete failed",
                       });
                    })
                }else {
                    // valid reset exists so we validate the reset string
                    //First compare the hashed reset string

                    bcrypt
                    .compare(resetString, hashedResetString)
                    .then((result)=>{
                        if (result) {
                            //strings matched
                            //hash password again

                            const saltRounds = 10;
                            bcrypt
                                .hash(newPassword,saltRounds)
                                .then(hashedNewPassword =>{
                                    //update user Password
                                    User
                                        .updateOne({_id: userId},{password: hashedNewPassword})
                                        .then(()=>{
                                            //user update was successful
                                            //Now we delete the password reset record
                                            PasswordReset
                                            .deleteOne({userId})
                                            .then(()=>{
                                                //both user record and reset record updated 

                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Password Reset Completed Successfully!!!",
                                                });
                                            })
                                            .catch(error=>{
                                                console.log(error);
                                                res.json({
                                                    status: "FAILED",
                                                    message: "An error occurred while finalizing password reset",
                                                });
                                            })
                                        })
                                        .catch(error =>{
                                            console.log(error);
                                            res.json({
                                                status: "FAILED",
                                                message: "An error occurred while updating the user",
                                            });
                                        })
                                })
                                .catch(error=>{
                                    console.log(error);
                                    res.json({
                                        status: "FAILED",
                                        message: "An error occurred while hashing the new password",
                                    });
                                })

                        }else{
                            //existing record but incorrect reset string passed
                            res.json({
                                status: "FAILED",
                                message: "Invalid password reset details passed",
                            });
                        }
                    })
                    .catch(error=>{
                        console.log(error);
                        res.json({
                            status: "FAILED",
                            message: "Comparing password reset strings failed!",
                       });
                    })
                }

            }else {
                // password reset doesnt exist
                res.json({
                    status: "FAILED",
                    message: "Password reset request not found",
               });
            }
        })
        .catch(error =>{
            console.log(error);
            res.json({
                status: "FAILED",
                message: "checking for existing password reset record failed",
           });
        })
})

module.exports = router;