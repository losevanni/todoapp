
var router=require('express').Router(); // express lib에서 Router 을 사용하겠다

router.get('/shop/shirts',(req,res)=>{
    console.log("셔츠를 팝니다");
})


router.get('/shop/pants',(req,res)=>{
    console.log("셔츠를 팝니다");
})

module.exports=router; // module.exports 는 이파일에서 router이란 변수를 내보내겠다 