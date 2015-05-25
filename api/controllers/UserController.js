/**
 * UserController
 *
 * @描述 : 註冊
 * @文件 : Se http://links.sailsjs.org/docs/controllers
 */

var md5 = require('MD5')
var fs = require("fs"); 

module.exports = {    
    //註冊
    create: function(req, res){
        var newuser = {
            email: req.body.email,
            pwd: md5(req.body.pwd),
            th: 13,
        };

        User.create(newuser)
        .exec(function(err, user) {
            if(err){
                res.end(JSON.stringify(err));
            }
            else{
                req.session.userid = user.id;
                req.session.email = req.body.email;
                req.session.pwd = req.body.pwd;
                res.redirect("/profile");
            }
        });
    },
    //檢查信箱是否已存在
    checkEmail: function (req, res) {
        User.findOne({
            email: req.body.email
        })
        .exec(function(err, user) {
            if(err){
                res.end(JSON.stringify(err));
            }
            else{
                //註冊 or 修改信箱
                if(req.body.pwd == undefined){
                    if(user == undefined){
                        res.end("true");
                    }
                    else{
                        //修改信箱
                        if(req.session.email == req.body.email)
                            res.end("true");
                        else
                            res.end("false");
                    }   
                        
                }
                //登入
                else{
                    if(user == undefined){
                        res.end("false");
                    }
                    else
                        res.end("true");
                }
            }
        });
    },
    //檢查密碼是否正確
    checkPwd: function (req, res) {
        User.findOne({
            email: req.body.email
        })
        .exec(function(err, user) {
            if(err){
                res.end(JSON.stringify(err));
            }
            else{
                if(user == undefined){
                    res.end("false");
                }
                else{
                    if(md5(req.body.pwd) != user.pwd){
                        res.end("false");
                    }
                    else
                        res.end("true");
                }
            }
        });
    },
    //登入
    login: function (req, res) {
        User.findOne({
            email: req.body.email
        })
        .exec(function(err, user) {
            if(err){
                res.end(JSON.stringify(err));
            }
            else{
                if(user == undefined){
                    return res.end("使用者不存在");
                }
                if(md5(req.body.pwd) != user.pwd){
                    return res.end("密碼錯誤");
                }

                req.session.userid = user.id;
                req.session.email = req.body.email;
                req.session.pwd = req.body.pwd;
                res.redirect("/profile");
            }
        });
    },
    //登出
    logout: function (req, res) {
        delete(req.session.userid);
        delete(req.session.email);
        delete(req.session.pwd);
        res.redirect("/");
    },
    //大頭貼
    myPhoto: function (req, res) {
        if(req.session.userid){
            User.findOne({
                id: req.session.userid
            })
            .exec(function(err, user) {
                if(!err){
                    var filePath = "assets" + user.photo;
                    var stat = fs.statSync(filePath);

                    res.writeHead(200, {
                        "Content-Type": "application/exe",
                        "Content-Length": stat.size
                    });

                    var readStream = fs.createReadStream(filePath);
                    readStream.pipe(res);
                }
            });
        }
        else{
            var filePath = "assets/images/layout/logo.png";
            var stat = fs.statSync(filePath);

            res.writeHead(200, {
                "Content-Type": "application/exe",
                "Content-Length": stat.size
            });

            var readStream = fs.createReadStream(filePath);
            readStream.pipe(res);
        }
    },
    //個人資料
    profile: function (req, res) {
        if(req.session.userid){
            User.findOne({
                id: req.session.userid
            })
            .exec(function(err, user) {
                if(err){
                    res.end(JSON.stringify(err));
                }
                else{
                    return res.view("frontend/pages/userProfile", {
                        user: user
                    });
                }
            });
        }
        else{
            return res.forbidden();
        }  
    },
    //編輯個人資料
    editProfile: function (req, res) {
        var value = {
            email: req.body.email,
            pwd: md5(req.body.pwd),
            phone: req.body.phone,
            name: req.body.name,
            gender: req.body.gender,
            school: req.body.school,
            grade: req.body.grade,
            reference: req.body.reference,
        };

        if (req.session.userid) {
            req.file('photo').upload({ dirname: sails.config.appPath+'/assets/files/'+req.session.userid}
            , function (err, uploadedFiles) {
                if (err) 
                    return res.end(JSON.stringify(err));
                //有上傳檔案
                if (uploadedFiles.length > 0) {
                    //圖片檔
                    if (uploadedFiles[0].type.substring(0, 5) == "image") {    
                        if (uploadedFiles[0].size > 2 * 1024 * 1024) {
                            return res.end("圖片大小須小於2MB");
                        }
                        var url = uploadedFiles[0].fd;
                        var start = url.search("files") - 1;
                        url = url.slice(start);
                        url = url.replace(/\\/g, "/");
                        value.photo = url;
                    }
                    //非圖片檔
                    else {
                        fs.unlink(uploadedFiles[0].fd, function (err) {  
                            if (err) 
                                console.error(err) 
                        });  
                        return res.end(JSON.stringify("檔案格式錯誤"));
                    }      

                    //取得舊照片位址
                    User.findOne({
                        id: req.session.userid
                    })
                    .exec(function (err, data) {
                        if (err) {
                            res.end(JSON.stringify(err));
                        }
                        else {
                            var oldPhoto = data.photo;

                            User.update({id: req.session.userid}, value)
                            .exec(function (err, datas) {
                                if (err) {
                                    //刪除上傳檔案
                                    if (uploadedFiles.length > 0) {
                                        fs.unlink(uploadedFiles[0].fd, function (err) {  
                                            if (err) 
                                                console.error(err) 
                                        });  
                                    }
                                    res.end(JSON.stringify(err));
                                }
                                else {
                                    //刪除原始檔案
                                    if (uploadedFiles.length > 0 && oldPhoto != '/images/layout/logo.png') {
                                        var imagePath = sails.config.appPath + '/assets' + oldPhoto;

                                        fs.unlink(imagePath, function (err) {  
                                            if (err) 
                                                console.error(err) 
                                        });  
                                    }
                                    req.session.email = req.body.email;
                                    req.session.pwd = req.body.pwd;
                                    res.redirect("/profile");
                                }
                            });
                        }
                    });             
                }
                //沒上傳檔案
                else{
                    User.update({id: req.session.userid}, value)
                    .exec(function (err, datas) {
                        if (err) {
                            res.end(JSON.stringify(err));
                        }
                        else {
                            req.session.email = req.body.email;
                            req.session.pwd = req.body.pwd;
                            res.redirect("/profile");
                        }     
                    });
                }
            });
        }
        else{
            return res.forbidden();
        }  
    },
};
