const express = require('express');
const router = express.Router();

//mongodb user model
const User = require('../models/user/user');

//mongodb user verification model
const UserVerification = require('../models/user/UserVerification');

//mongodb user Password reset model
const PasswordReset = require('../models/user/PasswordReset');

//mongodb user OTP verification model
const UserOTPVerification = require('../models/user/UserOTPverification');

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
   password = password.trim();

   if(name == "" ||email == "" ||  password == "" ){
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
                    password:hashedPassword,
                    verified: false,
                });

                newUser
                    .save()
                    .then(result =>{
                        //handle account verification
                        // sendVerificationEmail (result,res);
                        sendOTPVerificationEmail(result,res);
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
const sendOTPVerificationEmail = async ({_id, email}, res)=>{
    try {
        const otp  = `${Math.floor(1000 + Math.random()*9000)}`;

        // mail options
        const mailOptions ={
            from: process.env.AUTH_EMAIL,
            to: email,
            subject: "Verify Your Email",
            html : `<p> Enter <b>${otp}</b> in the app to verify your email address and complete the signup process. </p><p> This code <b>expires in 1 hour</b>.<p> `
        };

        // hash the otp
        const saltRounds = 10;
   
        const hashedOTP = await bcrypt.hash(otp, saltRounds);
        const newOTPVerification = await new UserOTPVerification({
            userId: _id,
            otp: hashedOTP,
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000,
        });

        //save otp record
        await newOTPVerification.save();
        await transporter.sendMail(mailOptions);
        res.json({
            status: "PENDING",
            message: "Verification otp email sent",
            data:{
                userId: _id,
                email,
            }
        })

    } catch (error) {
        res.json({
            status:"FAILED",
            message: "Verification email failed to send",
        })
    } 
};

//Verify otp email
router.post("/verifyOTP", async (req, res) =>{
    try {
        let { userId, otp} = req.body;
        if(!userId || !otp){
            throw Error("Empty otp details are not allowed");
        }else{
            const UserOTPVerificationRecords = await UserOTPVerification.find({
               userId,
            });
            if(UserOTPVerificationRecords.length <= 0){
                //no record found
                throw new Error(
                   "Account record doesnt exist or has been verified already. Please sign up or log in." 
                );
            }else{
                //user otp record exists
                const {expiresAt} = UserOTPVerificationRecords[0];
                const hashedOTP = UserOTPVerificationRecords[0].otp;

                if(expiresAt < Date.now()){
                    //user otp record has expired
                    await UserOTPVerification.deleteMany({ userId});
                    throw new Error("Code has expired. Please Request again");
                }else{
                    const validOTP = await bcrypt.compare(otp, hashedOTP);

                    if(!validOTP){
                        //supplied otp is wrong
                        throw new Error("Invalid code passed. Check your Inbox");   
                    }else{
                        //success
                        await User.updateOne({_id: userId},{ verified: true});
                        await UserOTPVerification.deleteMany({ userId});
                        res.json({
                            status: "VERIFIED",
                            message: "User email verified successfully.",
                        });
                    }
                }
            }
        }
    } catch (error) {
        res.json({
            status: "FAILED",
            message: error.message,
        });
    }
});

//resend otp verification email
router.post("/resendOTPVerificationCode", async (req,res) =>{
    try {
        let { userId, email} = req.body;
    
        if(!userId || !email){
            throw Error("Empty user details are not allowed");
        }else{
            //delete existing records and resend
            await UserOTPVerification.deleteMany({userId});
            sendOTPVerificationEmail({_id: userId, email}, res);
        }
       } catch (error) {
            res.json({
                status: "FAILED",
                message: `Verification OTP Resend Error. ${error.message}`,
            });
       }
});

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
                            message: error.message,
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

router.post('/updatePassword', async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;

    if (!userId || !oldPassword || !newPassword) {
        return res.json({
            status: "FAILED",
            message: "Empty input fields!"
        });
    }

    if (newPassword.length < 8) {
        return res.json({
            status: "FAILED",
            message: "Password is too short!"
        });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.json({
                status: "FAILED",
                message: "User not found"
            });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.json({
                status: "FAILED",
                message: "Old password is incorrect"
            });
        }

        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
        user.password = hashedNewPassword;
        await user.save();

        res.json({
            status: "SUCCESS",
            message: "Password updated successfully"
        });
    } catch (error) {
        console.log(error);
        res.json({
            status: "FAILED",
            message: "An error occurred while updating the password"
        });
    }
});

// Update user profile
router.post('/updateProfile', (req, res) => {
    let { userId, name, email } = req.body;
    name = name.trim();
    email = email.trim();

    if (name === "" || email === "") {
        res.json({
            status: "FAILED",
            message: "Empty input fields!"
        });
    } else {
        User.findOneAndUpdate({ _id: userId }, { name, email }, { new: true })
            .then(updatedUser => {
                res.json({
                    status: "SUCCESS",
                    message: "Profile updated successfully",
                    data: updatedUser
                });
            })
            .catch(err => {
                res.json({
                    status: "FAILED",
                    message: "An error occurred while updating profile"
                });
            });
    }
});

// Get user profile
router.post('/getProfile', (req, res) => {
    let { userId } = req.body;

    User.findOne({ _id: userId })
        .then(user => {
            if (user) {
                res.json({
                    status: "SUCCESS",
                    message: "User profile fetched successfully",
                    data: user
                });
            } else {
                res.json({
                    status: "FAILED",
                    message: "User not found"
                });
            }
        })
        .catch(err => {
            res.json({
                status: "FAILED",
                message: "An error occurred while fetching user profile"
            });
        });
});

router.delete('/delete/:userId', (req, res) => {
    const { userId } = req.params;
  
    User.findByIdAndDelete(userId)
      .then(deletedUser => {
        if (!deletedUser) {
          return res.json({
            status: "FAILED",
            message: "User record not found"
          });
        }
        res.json({
          status: "SUCCESS",
          message: "User record deleted successfully",
          data: deletedUser
        });
      })
      .catch(error => {
        res.json({
          status: "FAILED",
          message: "An error occurred while deleting the User record",
          error: error.message
        });
      });
  });


module.exports = router;