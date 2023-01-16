const express=require('express');
const app=express();
//socket.io setting
const http=require('http').createServer(app);
const {Server}=require('socket.io')
const io = new Server(http);
const db_config=require('./config/db_config.json')
const bodyParser=require('body-parser');

app.use(bodyParser.urlencoded({extended : true}));
const MongoClient=require('mongodb').MongoClient;
const methodOverride=require('method-override');
app.use(methodOverride('_method'));

app.set('view engine','ejs');

app.use('/public',express.static('public')); 

app.use('/',require('./routes/shop'));

const { ObjectId }=require('mongodb');
//이미지 업로드
let multer =require('multer');
var storage=multer.diskStorage({ //memoryStorage 는 메모리에 disk는 하드에
    destination: function(req,file,cb){ 
        cb(null,'./public/image') // save path
    },
    filename: function(req,file,cb){
        cb(null,file.originalname) // save 시 name file의 원래이름으로 save
    },
    filefilter: function(req,file,cb){ // file 업로드 제한 규칙
    },
    limit: function(){ //file 최대 업로드 제한 규칙
    }
})

var upload=multer({storage: storage});



//db 변수
var db;
MongoClient.connect('mongodb+srv://vanni_mongodb:'+db_config.pw+'@cluster0.yah0zmu.mongodb.net/?retryWrites=true&w=majority',function(err,client){
    
    //error 시 에러 출력
    if(err){return console.log(err)}
    //todoapp 이라는 데이터 베이스에 연결
    db=client.db('todoapp');


    //연결시 서버 listen
    http.listen(8080,function(){ //app.listen -> http.listen 하면 socket.io사용
        console.log('listening on 8080 port open !')
    });
})

// app.get('경로',function(요청,응답){
//     응답.send('   ');
// });
app.get('/',function(req,res){
    res.render('index.ejs');
});
app.get('/write',function(req,res){
    res.render('write.ejs');
});



// 목록 보여주기

app.get('/list',function(req,res){
    db.collection('post').find().toArray(function(err,result){
        // if(err){return console.log(err)}
        console.log(result);
        res.render('list.ejs',{ posts : result });
    });
});


app.get('/detail/:id',function(req,res){ // : 아무 문자열이나 id 로 입력하면  req로 인자를 받으면 
    var ID =parseInt(req.params.id);
    
    db.collection('post').findOne({_id : ID },function(err,result){ //받은 인자로 값을 찾으면 result에 담는다 
        // if(err){return console.log(err)}
        // console.log(result);
        res.render('detail.ejs',{ data: result})
    })

})
//edit  1원하는 정보 클릭 2그정보 표시 3값 업데이트
app.get('/edit/:id',function(req,res){
    var ID =parseInt(req.params.id);
    console.log(req.params.id);
    db.collection('post').findOne({_id :ID },function(err,result){
        // console.log(result);
        res.render('edit.ejs',{mod : result});
    })
})
app.put('/edit',function(req,res){
    var ID=parseInt(req.body.id);
    console.log(ID)
    db.collection('post').updateOne( {_id: ID  },{$set: {TITLE: req.body.title, DATE: req.body.date }},function(err,result){
        // if(err){return console.log(err)}
        console.log(result);
        // res.redirect('/detail/'+ID)
        res.redirect('/detail/'+ID);
    })
})


//미들웨어 요청과 응답 사이에 실행 되는 코드 app.use 로 수행 시킨다
const passport=require('passport');
const LocalStrategy=require('passport-local').Strategy;
const session=require('express-session');
app.use(session({secret: '비밀코드',resave:true,saveUninitialized:false}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/login',function(req,res){
    res.render('login.ejs');
})
//authenticate 인증 하다
app.post('/login',passport.authenticate('local',{
    failureRedirect : '/fail' // 로그인 실페시 /fail 로 리다이렉트
}),function(req,res){
    res.redirect('/');
})

// user register
app.get('/register',(req,res)=>{
    res.render('register.ejs')
})
app.post('/register',(req,res)=>{
    //찾기
    db.collection('login').find({id:req.body.new_id}).toArray((err,result)=>{
        console.log(result)
        console.log(typeof(result))
        // if(!result) { // 찾아서 중복이 없다면 
            db.collection('login').insertOne({id:req.body.new_id,pw:req.body.new_pw},(err,result)=>{ // insert user
                console.log('가입')
                res.render('login.ejs');
            })
        // } 
    })
})

// 로그인 기능 passport.authenticate('local',{ failureRedirect : '/fail' }) 이구문 실행시 passprot.use밑에 구문 동작
passport.use(new LocalStrategy({
    usernameField: 'user_id',// form 의 name 값 과 같아야한다
    passwordField: 'user_pw',
    session: true,
    passReqToCallback: false,
},function(input_id,input_pw,done){ //input_id pw 는 입력한 값이다 
    console.log(input_id,input_pw);
    db.collection('login').findOne({id: input_id },function(err,result){
        console.log(result);
        if(err) return done(err) // err가 있으면 
        if(!result) return done(null,false,{message: '존재하지 않는 아이디요'}) //result 가 null이면 
        if(input_pw == result.pw){ // 찾은 정보의 비번이랑 입력 한 비번이 다르면
            return  done(null,result)
        } else{
            return done(null,false, {message: 'password error'})
        }
    })
}));

app.get('/mypage',can_login,function(req,res){
    console.log(req.user);// user 에는 세션이 저장되어있고 deserializeUser 통해서 관련된 정보를 담고있다
    res.render('mypage.ejs',{사용자: req.user})
})

function can_login(req,res,next){
    if(req.user){ // 유저 정보가 없으면
        next() // 통과 ㄱㄱ 구문
    }else{ //정보가 없으면 실행
        res.send('로그인 필요 합니다')
    }
}

app.get('/test',can_login,(req,res)=>{
    console.log(typeof(req.user._id))
    console.log(req.user._id)
})

// req.body == {title: '' , date: ' '} object 
// app.post('/add',function(req,res){
//     // res.send('전송 완료')
//     res.sendFile(__dirname+'/index.html');
//     db.collection('post').insertOne({TITLE : req.body.title ,DATE : req.body.date},function(err,result){
//         console.log('저장 완료'+result);
        
//     });
// });

//게시물 번호를 직접 넘버링 count 에 있는 총 게시물수를 가져와서 1더해서 새로운 게시물 생서 후 총게시물 갯수 도 +1 해서 저장

app.post('/add',function(req,res){
    db.collection('count').findOne({name:'게시물갯수'},function(err,result){
        console.log(result.totalPost);
        var 총게시물=result.totalPost;
        var save_data={_id:총게시물+1,user_id: req.user._id,TITLE: req.body.title,DATE:req.body.date} //작성자 정보도 같이 저장
        //req.user._id 는 user 은 로그인 시 정보를 저장하는 변수 
        console.log('총게시물 '+ 총게시물);
        db.collection('post').insertOne(save_data,function(err,result){
            console.log('저장 완료');
            db.collection('count').updateOne({name:'게시물갯수'},{ $inc : {totalPost:1}},function(err,result){//{$set: {pra: 변경값}} , {$inc: {pra: 승수 증가할값}}
                res.render('index.ejs');
            });
        });
    });
});
app.get('/upload',function(req,res){
    res.render('upload.ejs')
})
app.post('/upload',upload.single('pciture'),(req,res)=>{ //upload.single('form 의 name 값 입력')
    res.send('이미지 업로드 완료')
})
// app.post('/upload',upload.array('pciture',10),(req,res)=>{ //upload.array('form_name',최대저장할파일갯수)
// })
app.get('/image/:imageName',function(req,res){ // image 전송 
    res.sendFile(__dirname+'/public/image'+req.params.imageName) 
}) // <img src='/image/:name.jpg'> html 에 이미지 전송 

app.delete('/delete',function(req,res){
    console.log(req.body);
    req.body._id=parseInt(req.body._id)
    var delete_data={_id: req.body._id, user_id:req.user._id} // user_id:req.user._id 작성자가 일치 하는경우삭제
    db.collection('post').deleteOne(delete_data,function(err,ressult){
        // if(err){return console.log(err)}
        //  count  감소 하는 구문 만들기db.collection('count').
        db.collection('count').updateOne({name: '게시물갯수'},{$inc : {totalPost:-1}},function(){
        })
        console.log('delete');
        res.status(400).send({message: '성공했습니다'});
        
    });
});



//세션 저장  user.id 로 세션 생성 후 저장 한다 user변수에 로그인 기능에서의 result가 들어간다
passport.serializeUser(function(user,done){
    done(null,user.id) // 세션 값생성후 사용자 브라우저의 쿠키에 값을 전송 한다
});
// 마이페이지 접속시 사용 세션 확인 구문  **user.id 가 아이디 변수에 들어간다**
passport.deserializeUser(function(아이디,done){ //세션 정보가 있다면 해당 유저의 추가 정보를 찯아 {} 반환
    db.collection('login').findOne({id: 아이디},function(err,result){
        if(err) return console.log(err)  
        done(null,result) //찾은 정보를 전달
    })
});//done(server err, 성시 데사용자 데이터 반환, 메시지)

//search 기능
app.get('/search',(req,res)=>{
    // console.log(req)// 사용자의 요청 전부
    // console.log(req.query) // 사용자의 get 요청 전부
    // console.log(req.query.value) //사용자의 get 요청중 이름이 value 인것들 
    var search_data=req.query.value;
    // new Date()
    // /abc/ 으로하면 abc가 포함되어있는 문자 모두 indexing 검색법 {$text: {$search: 원하는 문자 }}

    var 검색조건=[{
            $search:{
                index: 'titleSearch',//만든 search index 
                text:{
                    query: req.query.value, // 입력값 
                    path: 'TITLE' // 속성 제목 날짜 다하고 싶으면 ['TITLE','DATE']
                }
            }
        },
        {$project : {TITLE: 1, _id: 0 , score:{$meta: "searchScore"}}}, //  검색 검열 1은 가져오고 0은 안가져온다 $meta: "searchScore"} scroe(관련성)가져온다
        { $sort: {_id:1}}, // 찾은 결과를 _id값으로  오름차순 정렬 내림 차순
        { $limit : 10}, // 검색 갯수 제한
    ]
    db.collection('post').aggregate(검색조건).toArray((err,result) => {
        // console.log(result)
        res.render('list.ejs',{ posts : result })
    })
})

app.post('/chatroom',can_login,(req,res)=>{
    var save_data={
        TITLE: 'chatroom',
        DATE: new Date(),
        member: [ ObjectId(req.body.h_id) ,req.user._id ] // host guest
    }
    db.collection('chatroom').insertOne(save_data).then(function(ressult){
        res.render('chat.ejs',{chat_data: ressult})
        
    })
})

app.get('/chat',can_login,function(req,res){
    db.collection('chatroom').find({member: req.user._id}).toArray().then((result)=>{
        res.render('chat.ejs',{data:result})
    })

})

app.post('/message',can_login,function(req,res){
    var save_data={
        parent: req.body.parent ,
        content: req.body.content ,
        userid: req.user._id,
        date: new Date(),
    }
    db.collection('message').insertOne(save_data).then(()=>{
        console.log('message send com')
    })
})
//실시간으로 db에 전송
//기존거 db에서 실시간으로 가져오기
app.get('/message/:id',can_login,(req,res)=>{
    res.writeHead(200,{
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
    })
    db.collection('message').find({parent: req.params.id}).toArray().then((result)=>{
        res.write('event: test\n'); 
        res.write('data:'+JSON.stringify(result)+'\n\n'); // result 는 object 자료형이기에 이를 string으로 바꾸어 주어야한다 JSON.stringfy()사용
    })
    //db가 업데이트 되면 실시간으로 갱신
    const pipeline=[ // 다큐먼트 감시 필드 조건 
        {$match:{'fullDocument.parent': req.params.id}} //fullDocument.을 붙여주어야한다 그럼 CRUD 가 발생할때마다 밑의 코드가 실행
    ];
//전송 버튼 누르면 db에 저장하고 다시 message 가져와 출력
    const clloection=db.collection('message');
    const changeStream=clloection.watch(pipeline); //watch db 가 message감
    changeStream.on('change',(result)=>{ //변경 감지 되면 실행 되는 코드
        //result.fullDocument 추가된 doucument을 출력하려면 .fullDocument 쓰는이유 그냥 result는 변경 삭제했는지등 다양한 정보들 존재 doucument만 보려면 사용
        req.write('event: test\n');
        req.write('data: '+JSON.stringify([result.fullDcument])+'\n\n');
    });
});

app.get('/socket',function(req,res){
    res.render('socket.ejs')
})
io.on('connection',function(socket){ // client에서 socket.emit한 값을 socket에 넣고  <- 이게 접속자의 소켓 정보가 같이있다
    console.log('user connection')

    socket.on('room1-send',function(data){
        io.to('room1').emit('broadcast',data) // message send 는 room1에 있는 사람 만 가능하다
    })
    
    socket.on('joinroom',function(data){ // user가 joinroom 이란 값을 보내면 조인 할 방 생성
        socket.join('room1');  // cahting room create room1에서 만 chat가능 

    })

    socket.on('user-send',function(data){// 내용에 user-send가 있으면 안에 있는 코드를 실행 data는 유저가 보낸 값
        console.log(data);
        io.emit('broadcast',data) //server-> client 전달 io.emit은 접속자 모두에게 전달 data전달할 값 
        // io.to(socket.id).emit('broadcast',data) // 해당 socket.id를 가진 사람에게만 전송 socket.id <-그중 id값을 목적지로
    })
})

